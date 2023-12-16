require('dotenv').config();
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');

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
			target: targetFun(process.env.OPENAI_API_REVERSE_PROXY_URL),
			changeOrigin: true,
			onProxyReq: (proxyReq) => {
				if (proxyReq.getHeader('Authorization') === `Bearer ${process.env.ACCESS_CODE}`) {
					proxyReq.setHeader('Authorization', `Bearer ${process.env.OPENAI_API_ACCESS_TOKEN}`);
				}
			},
		})(req, res, next);
	};

app.post('/v1/chat/completions', createOpenAIHandle());
app.post(
	'/backend-api/conversation',
	createOpenAIHandle((OPENAI_API_REVERSE_PROXY_URL) => {
		return `${OPENAI_API_REVERSE_PROXY_URL}${OPENAI_API_REVERSE_PROXY_URL.endsWith('/') ? '' : '/'}backend-api/conversation`;
	})
);

// 启动服务器
app.listen(port, () => {
	console.log(`Server is running at http://localhost:${port}`);
});
