require('./config');
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const path = require('path');
const lodash = require('lodash');
const app = express();
const port = process.env.PORT_MAIN;
const tokens = (process.env.TOKENS || '').split(' ').map((token) => token);
const tokensMap = new Map();
const maxRetries = 1;
const baseURLGemini2ChatGPT = `http://localhost:8080`;
const baseURLPandora = process.env.BASE_URL_PANDORA || `http://localhost:${process.env.PORT_PANDORA}`;
const proxyApiPrefixPandora = process.env.PROXY_API_PREFIX || '';
const apiProxyBaseURLPandora = path.join(baseURLPandora, proxyApiPrefixPandora);

const HTTP_STATUS = {
	OK: 200,
	UNAUTHORIZED: 401,
	ACCESS_DENIED: 403,
	TOO_MANY_REQUESTS: 429,
};

function createDebouncedRequestMerger() {
	const requestMap = new Map();
	return function mergeRequests(key, requestFunction) {
		if (!requestMap.has(key)) {
			const requestPromise = requestFunction().finally(() => {
				requestMap.delete(key);
			});
			requestMap.set(key, requestPromise);
		}

		return requestMap.get(key);
	};
}

function fetchWithTimeout(url, options, timeout = 10000) {
	return Promise.race([fetch(url, options), new Promise((_, reject) => setTimeout(() => reject(new Error('Request timeout')), timeout))]);
}

app.use(cors());

const mergeLoginRequests = createDebouncedRequestMerger();

async function getAccessToken(token) {
	const [username, password] = token.split(',') || [];
	if (username && password) {
		return (
			tokensMap.get(token) ||
			(await mergeLoginRequests(token, async () => {
				const apiUrl = path.join(apiProxyBaseURLPandora, '/auth/login');
				const body = new URLSearchParams();
				body.append('username', username);
				body.append('password', password);
				const headers = new Headers();
				headers.append('Content-Type', 'application/x-www-form-urlencoded');
				const response = await fetchWithTimeout(apiUrl, {
					method: 'POST',
					headers,
					body,
				}).catch((error) => ({ ok: false, message: error?.message }));
				if (!response.ok) {
					console.log(response);
					return token;
				}
				const data = await response.json();
				const access_token = data.access_token;
				tokensMap.set(token, access_token);
				return access_token;
			}))
		);
	}
	return token;
}

const createOpenAIHandle =
	(options = {}) =>
	async (req, res, next) => {
		req.retryCount = req.retryCount || 0;
		const { authorizationHandler, proxyOptions } = lodash.merge(
			{
				authorizationHandler: async (req, { accessCodePassed } = {}) => {
					console.log('pandora-next authorizationHandler');
					const needAuth = req.originalUrl.includes(proxyApiPrefixPandora);
					const token = tokens[Math.floor(Math.random() * tokens.length)];
					const autoSetAccessToken = needAuth && accessCodePassed;
					const accessToken = process.env.OPENAI_API_ACCESS_TOKEN || (await getAccessToken(token));
					if (autoSetAccessToken) {
						req.headers.authorization = `Bearer ${accessToken}`;
					}
				},
				proxyOptions: {
					target: baseURLPandora,
					changeOrigin: true,
					ws: true,
					onError: () => {
						if (req.retryCount < maxRetries) {
							req.retryCount++;
							console.log(`Retrying (${req.retryCount}/${maxRetries})...`);
							createOpenAIHandle()(req, res, next);
						} else {
							console.error('Max retries reached. Giving up.');
							res.status(500).send('Internal Server Error');
						}
					},
					onProxyRes: (proxyRes, req) => {
						const statusCode = proxyRes.statusCode;
						if (statusCode === HTTP_STATUS.OK) return;
						const exchange = `[PROXY DEBUG] ${req.method} ${req.path} -> ${proxyRes.req.protocol}//${proxyRes.req.host}${proxyRes.req.path} [${statusCode}]}`;
						console.log(exchange);
						switch (statusCode) {
							case HTTP_STATUS.ACCESS_DENIED:
							case HTTP_STATUS.UNAUTHORIZED:
								if (autoSetAccessToken) {
									tokensMap.delete(token);
								}
								break;
							case HTTP_STATUS.TOO_MANY_REQUESTS:
								console.log('Too Many Requests');
								break;

							default:
								break;
						}
					},
				},
			},
			options
		);
		await authorizationHandler(req, {
			accessCodePassed: lodash.get(req, 'headers.authorization') === `Bearer ${process.env.ACCESS_CODE}`,
		});
		createProxyMiddleware(proxyOptions)(req, res, next);
	};

[
	//gemini2chatgpt
	{
		prefix: 'gemini2chatgpt',
		target: baseURLGemini2ChatGPT,
	},
].forEach(({ prefix, target }) => {
	app.use(
		`/${prefix}`,
		createOpenAIHandle({
			authorizationHandler: (req) => {
				req.headers['openai-tools-proxy-by'] = 'gemini2chatgpt';
			},
			proxyOptions: {
				target,
				pathRewrite: {
					[`^/${prefix}`]: '',
				},
			},
		})
	);
});

app.get('/healthcheck', (req, res) => {
	res.status(200).json({ status: 'OK' });
});

//pandora-next
app.use('*', createOpenAIHandle());

app.listen(port, () => {
	console.log(`Server is running at http://localhost:${port}`);
});
