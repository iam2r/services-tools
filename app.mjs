import './config.js';
import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import cors from 'cors';
import lodash from 'lodash';
import axios from 'axios';
import url from 'url';
import cron from 'node-cron';

const app = express();
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

[
	{
		prefix: 'cohere',
		target: 'https://cohere2openai.iamrazo.workers.dev',
		apiKey: process.env.COHERE_TOKEN,
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

/**
 * 获取地址列表 API
 *
 * @param {object} req - 请求对象
 * @param {object} res - 响应对象
 *
 * @example
 * ```
 * curl http://localhost:3000/cf/addressesapi?path=sub.xf.free.hr/auto&type=original&security=
 * ```
 */
app.get('/cf/addressesapi', async (req, res) => {
	try {
		/**
		 * 请求参数
		 * @type {object}ßß
		 * @property {string} path - 地址列表路径
		 * @property {string} type - 地址类型，可选值为 'original' 或 'custom' 或 ‘pure’
		 * @property {string} security - 安全类型，可选值为 'tls'
		 */
		const { path = 'sub.xf.free.hr/sub', type = 'pure', security = '', autoQuery = 'true' } = req.query;
		const _url = /^http(s?):\/\//.test(path) ? path : `https://${path}`;
		const config = {
			method: 'get',
			url: _url,
			params: autoQuery === 'true' ? { host: 'my.host', uuid: '56ddc8b9-5343-41e7-8500-4ff79f5deb92' } : {},
		};

		const isPureMode = type === 'pure';
		const isCustom = type === 'custom';
		const getHost = ({ formattedString, port }) => `${formattedString.split('#')?.[0]}:${port}`;
		const uniqueByHost = (item, index, array) => {
			return array.map((it) => getHost(it)).indexOf(getHost(item)) === index;
		};
		const response = await axios(config);

		res.send(
			(() => {
				const result = Buffer.from(response.data, 'base64')
					.toString()
					.split('\n')
					.filter(Boolean)
					.map((vlessUrl) => {
						const { host, hash, query, hostname, port = 443 } = url.parse(vlessUrl, true);
						const name = decodeURI((hash || '').replace(/^\#/, ''));
						const [, area] =
							name.match(
								isCustom
									? /(移动|联通|电信|狮城|新加坡|香港|台湾|日本|韩国|美国|英国|法国|荷兰|波兰|芬兰|德国|都柏林|瑞典|西班牙|加拿大|澳洲|US|DE|NL|KR|SG|AU|HK|JP|TW|DE|GB|SE|ES|CA|HKG|TOKYO|SINGAPORE|TAIPEI|PL|FR)/i
									: /.*/
							) || [];
						const rules = [
							/**
							 * 存在 host 和 name
							 */
							Boolean(host) && Boolean(name),
							/**
							 * hash 和 name 都不含 undefined error
							 */
							[hash, name].every((it) => !/(undefined|error)/i.test(it || '')),
							/**
							 * 纯净模式时不可以包含一些推广关键字
							 */
							...(isPureMode || (isCustom && !area) ? [!/(tg|更新|教程|channel|频道|收费|群组|Author)/i.test(name)] : []),

							/**
							 * 开启 https 筛选时必须开启tlsß
							 */
							...(security === 'tls' ? [query.security === 'tls'] : []),
						];

						const formattedString = rules.every(Boolean)
							? `${host}#${area ? `${hostname}:${port} - ${area.toLocaleUpperCase()}` : name}`
							: '';

						return {
							formattedString,
							port,
						};
					})
					.filter((item) => item.formattedString)
					.filter(uniqueByHost)
					.map((it) => it.formattedString)
					.join('\n');
				res.setHeader('Content-Type', 'text/plain');
				return result;
			})()
		);
	} catch (error) {
		console.log(error);
		res.setHeader('Content-Type', 'text/plain');
		res.send('Error');
	}
});

app.get('/healthcheck', (req, res) => {
	res.status(200).json({ status: 'OK' });
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
		let job = null;
		// 每天重新生成随机时间并创建新的 cron 任务
		const scheduleJob = () => {
			if (job) {
				job.stop(); // 停止上一次的 cron 任务
			}
			const randomHour = Math.floor(Math.random() * 24);
			const randomMinute = Math.floor(Math.random() * 60);
			const cronString = `0 ${randomMinute} ${randomHour} * * *`;
			console.log(`${process.env.KEEP_ALIVE_URLS} is keepalive with ${cronString}!`);
			job = cron.schedule(cronString, () => {
				Promise.all(urls.map((url) => fetch(url)))
					.then(() => console.log('Keep-alive requests sent successfully'))
					.catch((error) => console.error('Error sending keep-alive requests:', error));
			});

			job.start();

			// 每天重新创建任务
			setTimeout(scheduleJob, 24 * 60 * 60 * 1000); // 24 小时后重新创建任务
		};

		scheduleJob();
	}
};

keepAlive();
