require('dotenv').config();
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const path = require('path');
const app = express();
const port = 3000;
const tokens = (process.env.TOKENS || '').split(' ').map((token) => token);
const tokensMap = new Map();
const maxRetries = 1;
const baseURL = process.env.OPENAI_API_REVERSE_PROXY_URL || 'http://localhost:8181';
const proxyApiPrefix = process.env.PROXY_API_PREFIX || '';
const apiProxyBaseURL = path.join(baseURL, proxyApiPrefix);

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
				const apiUrl = path.join(apiProxyBaseURL, proxyApiPrefix ? 'api' : '', '/auth/login');
				console.log(apiUrl);
				const formData = new URLSearchParams();
				formData.append('username', username);
				formData.append('password', password);
				const response = await fetchWithTimeout(apiUrl, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/x-www-form-urlencoded',
					},
					body: formData,
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

const createOpenAIHandle = () => async (req, res, next) => {
	const needAuth = req.originalUrl.includes(proxyApiPrefix);
	const token = tokens[Math.floor(Math.random() * tokens.length)];
	const { authorization = '' } = req.headers;
	const autoSetAccessToken = needAuth && authorization === `Bearer ${process.env.ACCESS_CODE}`;
	if (autoSetAccessToken) {
		const accessToken = process.env.OPENAI_API_ACCESS_TOKEN || (await getAccessToken(token));
		req.headers.authorization = `Bearer ${accessToken}`;
	}
	req.retryCount = req.retryCount || 0;
	createProxyMiddleware({
		target: baseURL,
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
			const exchange = `[PROXY DEBUG] ${req.method} ${req.path} -> ${proxyRes.req.protocol}//${proxyRes.req.host}${
				proxyRes.req.path
			} [${statusCode}] \n${JSON.stringify(req.headers, null, 2)}`;
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
	})(req, res, next);
};

app.use('*', createOpenAIHandle());

app.listen(port, () => {
	console.log(`Server is running at http://localhost:${port}`);
});
