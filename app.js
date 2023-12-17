require('dotenv').config();
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const defaultBaseURL = 'https://api.openai.com/';
const app = express();
const port = 3000;

// 使用 CORS 中间件允许跨域请求
app.use(cors());

const createOpenAIHandle =
	(
		targetFun = (OPENAI_API_REVERSE_PROXY_URL) => {
			return OPENAI_API_REVERSE_PROXY_URL;
		}
	) =>
	async (req, res, next) => {
		createProxyMiddleware({
			target: targetFun(`${process.env.OPENAI_API_REVERSE_PROXY_URL || 'http://localhost:8181'}` || defaultBaseURL),
			changeOrigin: true,
			onProxyReq: (proxyReq) => {
				if (proxyReq.getHeader('Authorization') === `Bearer ${process.env.ACCESS_CODE}`) {
					proxyReq.setHeader('Authorization', `Bearer ${process.env.OPENAI_API_ACCESS_TOKEN}`);
				}
			},
			onError: () => {
				createProxyMiddleware({
					target: targetFun(defaultBaseURL),
					changeOrigin: true,
					onProxyReq: (proxyReq) => {
						if (proxyReq.getHeader('Authorization') === `Bearer ${process.env.ACCESS_CODE}`) {
							proxyReq.setHeader('Authorization', `Bearer ${process.env.OPENAI_API_ACCESS_TOKEN}`);
						}
					},
				})(req, res, next);
			},
		})(req, res, next);
	};
// health
app.get('/health', (req, res) => {
	res.status(200).json({ status: 'OK' });
});

app.use(
	'*',
	createOpenAIHandle(() => `http://localhost:8181/`)
);

// 启动服务器
app.listen(port, () => {
	console.log(`Server is running at http://localhost:${port}`);
});
