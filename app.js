require('./config');
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const multer = require('multer');
const cors = require('cors');
const postgres = require('postgres');
const lodash = require('lodash');
const app = express();
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const port = process.env.PORT_MAIN;

const dbTablename = 'openai_tools_tokens';
let dbConnection;

async function initializeDatabase() {
	try {
		const [_, user, password, host, , port, database] =
			(process.env.SQL_DSN || '').match(/^postgres:\/\/(.*?):(.*?)@(.*?)(:(.*?))?\/(.*?)$/) || [];

		const config = {
			user,
			password,
			host,
			port,
			database,
			ssl: 'require',
		};
		dbConnection = postgres(config);
		// await dbConnection`
		// 	create table if not exists ${dbTablename} (
		// 		token varchar(255) primary key,
		// 		access_token varchar(2048),
		// 		created_at timestamp default current_timestamp on update current_timestamp
		// 	);
		// `;
	} catch (error) {
		console.log(error);
	}
}

async function getStoredAccessToken(token) {
	try {
		const selectQuery = `SELECT access_token FROM ${dbTablename} WHERE token = \$1 LIMIT 1`;
		const { rows } = await dbConnection.query(selectQuery, [token]);
		return rows.length > 0 ? rows[0].access_token : null;
	} catch (error) {
		console.log(error);
	}
}

const createOpenAIHandle =
	(options = {}) =>
	async (req, res, next) => {
		req.retryCount = req.retryCount || 0;
		const { authorizationHandler, proxyOptions } = lodash.merge(
			{
				authorizationHandler: async (req) => {
					/**
					 *
					 */
				},
				proxyOptions: {
					changeOrigin: true,
					ws: true,
				},
			},
			options
		);
		await authorizationHandler(req);
		createProxyMiddleware(proxyOptions)(req, res, next);
	};

app.use(cors());
app.use(express.json());

[
	{
		prefix: 'chatgpt',
		target: 'http://localhost:3040',
		authorizationHandler: (req) => {},
	},
	{
		prefix: 'coze',
		target: 'http://localhost:3042',
		authorizationHandler: (req) => {},
	},
	{
		prefix: 'kimi',
		target: 'https://kimi-free-api-2zpo.onrender.com/',
		authorizationHandler: (req) => {
			if (req.headers.authorization === `Bearer ${process.env.ACCESS_CODE}`) {
				req.headers.authorization = `Bearer ${process.env.KIMI_TOKEN}`;
			}
		},
	},
	{
		prefix: 'kimi-search',
		target: 'https://kimi-free-api-2zpo.onrender.com/',
		authorizationHandler: (req) => {
			if (req.headers.authorization === `Bearer ${process.env.ACCESS_CODE}`) {
				req.headers.authorization = `Bearer ${process.env.KIMI_TOKEN}`;
			}
		},
		onProxyReq: (proxyReq, req) => {
			const originalBody = req.body;
			const modifiedParamsString = JSON.stringify({
				...originalBody,
				use_search: true,
			});
			proxyReq.setHeader('Content-Type', 'application/json');
			proxyReq.setHeader('Content-Length', Buffer.byteLength(modifiedParamsString));
			proxyReq.write(modifiedParamsString);
			proxyReq.end();
		},
	},
].forEach(({ prefix, target, authorizationHandler, needAuth, onProxyReq }) => {
	app.use(
		`/${prefix}`,
		createOpenAIHandle(
			Object.assign(
				{},
				{
					proxyOptions: {
						target,
						pathRewrite: {
							[`^/${prefix}`]: '',
						},
						...(onProxyReq ? { onProxyReq } : {}),
					},
				},
				authorizationHandler ? { authorizationHandler } : {},
				needAuth ? { needAuth } : {}
			)
		)
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
		const { GOOGLE_GEMININ_API_KEY } = process.env;
		let apiKey = '';
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

app.listen(port, () => {
	console.log(`Server is running at http://localhost:${port}`);
});

/**
 * 数据库保活
 */
initializeDatabase().then(() => {
	setInterval(() => {
		// getStoredAccessToken('db-keepalive');
	}, 3600 * 1000 * 24);
});

const keepAlive = () => {
	if (!process.env.KEEP_ALIVE_URLS) return;
	const urls = (process.env.KEEP_ALIVE_URLS || '').split(',');
	if (urls.length) {
		console.log(`${process.env.KEEP_ALIVE_URLS} is keepalive !`);
		setInterval(() => {
			Promise.all(urls.map((url) => fetch(url)));
		}, 60 * 1000 * 5);
	}
};

keepAlive();
