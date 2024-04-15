require('./config');
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const multer = require('multer');
const cors = require('cors');
const mysql = require('mysql2/promise');
const lodash = require('lodash');
const app = express();
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const port = process.env.PORT_MAIN;

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

async function getStoredAccessToken(token) {
	try {
		const selectQuery = `SELECT access_token FROM ${dbTablename} WHERE token = ? LIMIT 1`;
		const [rows] = await dbConnection.execute(selectQuery, [token]);
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

[
	{
		prefix: 'gemini2chatgpt',
		target: 'http://localhost:8080',
		authorizationHandler: (req) => {
			req.headers['openai-tools-proxy-by'] = 'gemini2chatgpt';
		},
	},
	{
		prefix: 'chatgpt',
		target: 'http://localhost:3040',
		authorizationHandler: (req) => {},
	},
].forEach(({ prefix, target, authorizationHandler, needAuth }) => {
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
		getStoredAccessToken('db-keepalive');
	}, 3600 * 1000 * 24);
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
