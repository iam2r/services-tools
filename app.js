require('./config');
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const lodash = require('lodash');
const app = express();
const mysql = require('mysql2/promise');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
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
const dbTablename = 'openai_tools_tokens';
let dbConnection;

async function initializeDatabase() {
	try {
		const [_, user, password, host, database] = (process.env.SQL_DSN || '').match(/^(.*?):(.*?)@tcp\((.*?)\)\/(.*?)\?(.*)$/) || [];
		const config = {
			host,
			user,
			password,
			database,
			ssl: {
				rejectUnauthorized: true,
			},
		};
		dbConnection = await mysql.createConnection(config);
		await dbConnection.execute(`
		create table if not exists ${dbTablename} (
			token varchar(255) primary key,
			access_token varchar(2048),
			created_at timestamp default current_timestamp on update current_timestamp
		);		
		  `);
	} catch (error) {
		console.log(error);
	}
}

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

const mergeLoginRequests = createDebouncedRequestMerger();

async function storeAccessToken(token, accessToken) {
	try {
		const insertQuery = `REPLACE INTO ${dbTablename} (token, access_token) VALUES (?, ?)`;
		await dbConnection.execute(insertQuery, [token, accessToken]);
	} catch (error) {
		console.log(error);
	}
}

async function getStoredAccessToken(token) {
	try {
		const selectQuery = `SELECT access_token FROM ${dbTablename} WHERE token = ? LIMIT 1`;
		const [rows] = await dbConnection.execute(selectQuery, [token]);
		return rows.length > 0 ? rows[0].access_token : null;
	} catch (error) {
		console.log(error);
	}
}

async function deleteStoredAccessToken(token) {
	try {
		const deleteQuery = `DELETE FROM ${dbTablename} WHERE token = ?`;
		await dbConnection.execute(deleteQuery, [token]);
	} catch (error) {
		console.log(error);
	}
}

async function getAccessToken(token) {
	const [username, password] = token.split(',') || [];
	if (username && password) {
		return (
			tokensMap.get(token) ||
			(await mergeLoginRequests(token, async () => {
				let access_token;
				access_token = await getStoredAccessToken(token);
				if (access_token) return access_token;
				const apiUrl = path.join(apiProxyBaseURLPandora, 'api/auth/login');
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
				access_token = data.access_token;
				storeAccessToken(token, access_token);
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
		const accessCodePassed = lodash.get(req, 'headers.authorization') === `Bearer ${process.env.ACCESS_CODE}`;
		const { authorizationHandler, proxyOptions } = lodash.merge(
			{
				authorizationHandler: async (req) => {
					const needAuth = req.originalUrl.includes(proxyApiPrefixPandora);
					const token = tokens[Math.floor(Math.random() * tokens.length)];
					const autoSetAccessToken = needAuth && accessCodePassed;
					const accessToken = process.env.OPENAI_API_ACCESS_TOKEN || (await getAccessToken(token));
					if (autoSetAccessToken) {
						req.tokenReset = () => {
							tokensMap.delete(token);
							deleteStoredAccessToken(token);
						};
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
								req?.tokenReset();
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
		await authorizationHandler(req);
		createProxyMiddleware(proxyOptions)(req, res, next);
	};

app.use(cors());

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

async function fileToGenerativePart(file) {
	return {
		inlineData: {
			data: file.buffer.toString('base64'),
			mimeType: file.mimetype,
		},
	};
}

app.post('/recognize', upload.single('file'), async (req, res) => {
	const file = req.file;
	const { prompt } = req.body;
	try {
		let apiKey = '';
		const { GOOGLE_GEMININ_API_KEY } = process.env;
		const authorization = lodash.get(req, 'headers.authorization');
		if (authorization === `Bearer ${process.env.ACCESS_CODE}`) {
			apiKey = GOOGLE_GEMININ_API_KEY;
		} else {
			apiKey = authorization.replace('Bearer ', '');
		}
		const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({
			model: 'gemini-pro-vision',
		});
		const imageParts = await Promise.all([fileToGenerativePart(file)]);
		const result = await model.generateContent([prompt || '请描述并提取一下图片内容', ...imageParts]);
		const response = result.response;
		const text = response.text();
		res.status(200).json({
			text,
		});
	} catch (error) {
		console.error('Error generateContent:', error);
		res.status(500).json({ error: 'Error generateContent' });
	}
});
//pandora-next
app.use('*', createOpenAIHandle());

initializeDatabase().then(() => {
	app.listen(port, () => {
		console.log(`Server is running at http://localhost:${port}`);
	});
});

const keepAlive = () => {
	if (!process.env.KEEP_ALIVE_URLS) return;
	const urls = (process.env.KEEP_ALIVE_URLS || '').split(',');
	if (urls.length) {
		console.log(`${process.env.KEEP_ALIVE_URLS} is keepalive !`);
		setInterval(() => {
			Promise.all(urls.map((url) => fetch(url)));
		}, 60 * 1000 * 1);
	}
};

keepAlive();
