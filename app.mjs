import './config.js';
import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { GoogleGenerativeAI } from '@google/generative-ai';
import multer from 'multer';
import cors from 'cors';
import lodash from 'lodash';
import axios from 'axios';
import url from 'url';

const app = express();
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const port = process.env.PORT_MAIN;

const createOpenAIHandle =
	(options = {}) =>
	async (req, res, next) => {
		req.retryCount = req.retryCount || 0;
		const { authorizationHandler, proxyOptions } = lodash.merge(
			{
				authorizationHandler: createBaseAuthorizationHandler(options.apiKey),
				proxyOptions: {
					changeOrigin: true,
					ws: true,
				},
			},
			options
		);
		authorizationHandler(req);
		createProxyMiddleware(proxyOptions)(req, res, next);
	};

app.use(cors());
app.use(express.json());

const createBaseAuthorizationHandler = (token) => (req) => {
	if (req.headers.authorization === `Bearer ${process.env.ACCESS_CODE}` && token) {
		req.headers.authorization = `Bearer ${token}`;
	}
};

const createBaseBodyModified =
	(callback = (originalBody) => originalBody) =>
	(proxyReq, req) => {
		const originalBody = req.body;
		const modifiedParamsString = JSON.stringify(
			callback({
				...originalBody,
			})
		);
		proxyReq.setHeader('Content-Type', 'application/json');
		proxyReq.setHeader('Content-Length', Buffer.byteLength(modifiedParamsString));
		proxyReq.write(modifiedParamsString);
		proxyReq.end();
	};

const createKimiOptions = (useSearch = false) => {
	return {
		apiKey: process.env.KIMI_TOKEN,
		onProxyReq: createBaseBodyModified((originalBody) => {
			return {
				...originalBody,
				use_search: useSearch,
			};
		}),
	};
};

[
	{
		prefix: 'cohere',
		target: 'https://cohere2openai.iamrazo.workers.dev',
		apiKey: process.env.COHERE_TOKEN,
	},
	{
		prefix: 'kimi',
		target: 'https://kimi-free-api-o85q.onrender.com',
		...createKimiOptions(),
	},
	{
		prefix: 'kimi-search',
		target: 'https://kimi-free-api-o85q.onrender.com',
		...createKimiOptions(true),
	},
].forEach(({ prefix, target, authorizationHandler, onProxyReq, apiKey = '' }) => {
	const options = lodash.merge(
		{},
		{
			apiKey,
			proxyOptions: {
				target,
				pathRewrite: {
					[`^/${prefix}`]: '',
				},
				...(onProxyReq ? { onProxyReq } : {}),
			},
		},
		authorizationHandler ? { authorizationHandler } : {}
	);
	app.use(`/${prefix}`, createOpenAIHandle(options));
});

app.get('/healthcheck', (req, res) => {
	res.status(200).json({ status: 'OK' });
});

app.get('/cf/get_optimization_ip', (req, res) => {
	const { format = 'normal', type = 'v4' } = req.query;
	const config = {
		method: 'post',
		url: 'https://api.hostmonit.com/get_optimization_ip',
		headers: {
			accept: 'application/json, text/plain, */*',
			'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
			'content-type': 'application/json',
			origin: 'https://stock.hostmonit.com',
			priority: 'u=1, i',
			referer: 'https://stock.hostmonit.com/',
			'sec-ch-ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
			'sec-ch-ua-mobile': '?0',
			'sec-ch-ua-platform': '"Windows"',
			'sec-fetch-dest': 'empty',
			'sec-fetch-mode': 'cors',
			'sec-fetch-site': 'same-site',
			'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
		},
		data: { key: 'iDetkOys', type },
	};
	axios(config)
		.then(function (response) {
			if (response.data?.code === 200) {
				format === 'small'
					? res.send(
							(() => {
								const result = (response.data.info || [])
									.map(({ ip, node }, i) => {
										return `${type === 'v6' ? `[${ip}]` : ip}#${node} - IP${type} - ${i + 1}`;
									})
									.join('\n');
								res.setHeader('Content-Type', 'text/plain');
								return result;
							})()
					  )
					: res.json(response.data.info);
			}
		})
		.catch(function (error) {
			console.log(error);
		});
});

app.get('/cf/addressesapi', (req, res) => {
	const { path = 'moistr.freenods.sbs/free', type = 'original' } = req.query;
	const config = {
		method: 'get',
		url: `https://${path}`,
		params: { host: 'my.host', uuid: 'my-uuid' },
	};
	axios(config)
		.then(function (response) {
			res.send(
				(() => {
					const result = Buffer.from(response.data, 'base64')
						.toString()
						.split('\n')
						.map((vlessUrl) => {
							const { host, hash, query, hostname, port = 443 } = url.parse(vlessUrl, true);
							const [name, area] =
								decodeURI((hash || '').replace(/^\#/, '')).match(
									type === 'custom'
										? /(狮城|新加坡|香港|台湾|日本|韩国|美国|英国|德国|瑞典|西班牙|加拿大|澳洲|US|DE|NL|KR|SG|AU|HK|JP|TW|DE|GB|SE|ES|CA)/i
										: /.*/
								) || [];
							const formattedString =
								host && name && query.security === 'tls' && !/(tg|更新)/i.test(name)
									? `${host}#${area ? `${hostname}:${port} - ${area}` : name}`
									: '';
							return formattedString;
						})
						.filter(Boolean)
						.join('\n');
					res.setHeader('Content-Type', 'text/plain');
					return result;
				})()
			);
		})
		.catch(function (error) {
			console.log(error);
			res.setHeader('Content-Type', 'text/plain');
			res.send('Error');
		});
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
	console.log('📝 Author: Razo');
	console.log('🌍 GitHub Repository: https://github.com/iam2r/openai-tools');
	console.log(`💖 Don't forget to star the repository if you like this project!`);
	console.log();
	console.log(`Server is running at http://localhost:${port}`);
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
