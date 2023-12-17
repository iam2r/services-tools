require('dotenv').config();
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const defaultBaseURL = 'https://api.openai.com/';
const app = express();
const port = 3000;
const tokens = (process.env.TOKENS || '').split(' ').map((token) => token);
const tokensMap = new Map();
const whitelist = ['/health', ...['/api/auth'].map((it) => `/${process.env.PROXY_API_PREFIX}${it}`)];

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

app.use(cors());

async function loginUser(username, password) {
	const apiUrl = `http://localhost:8181/${process.env.PROXY_API_PREFIX}/api/auth/login`;
	const formData = new URLSearchParams();
	formData.append('username', username);
	formData.append('password', password);
	const response = await fetch(apiUrl, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
		},
		body: formData,
	});
	if (!response.ok) {
		throw new Error(`HTTP error! Status: ${response.status}`);
	}
	const data = await response.json();
	return data.access_token;
}

const mergeLoginRequests = createDebouncedRequestMerger();

async function getAccessToken(token) {
	const [username, password] = token.split(',') || [];
	if (username && password) {
		return (
			tokensMap.get(token) ||
			(await mergeLoginRequests(token, async () => {
				const access_token = await loginUser(username, password);
				tokensMap.set(token, access_token);
				return access_token;
			}))
		);
	}
	return token;
}

const createOpenAIHandle =
	(
		targetFun = (OPENAI_API_REVERSE_PROXY_URL) => {
			return OPENAI_API_REVERSE_PROXY_URL;
		}
	) =>
	async (req, res, next) => {
		const needCheck = !whitelist.some((prefix) => req.originalUrl.includes(prefix));
		if (needCheck && req.headers['authorization'] === `Bearer ${process.env.ACCESS_CODE}`) {
			req.headers['authorization'] = `Bearer ${
				process.env.OPENAI_API_ACCESS_TOKEN || (await getAccessToken(tokens[Math.floor(Math.random() * tokens.length)]))
			}`;
		}
		createProxyMiddleware({
			target: targetFun(`${process.env.OPENAI_API_REVERSE_PROXY_URL || 'http://localhost:8181'}` || defaultBaseURL),
			changeOrigin: true,
			ws: true,
		})(req, res, next);
	};

// health
app.get('/health', (req, res) => {
	res.status(200).json({ status: 'OK' });
});

app.use('*', createOpenAIHandle());

// 启动服务器
app.listen(port, () => {
	console.log(`Server is running at http://localhost:${port}`);
});
