import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import url from 'url';

const edgetunnels = new Hono();

edgetunnels.get(
	'/sub',
	zValidator(
		'query',
		z.object({
			path: z.string().default('sub.xf.free.hr/sub').optional(),
			type: z.enum(['original', 'custom', 'pure']).default('pure'),
			security: z.enum(['tls']).optional(),
			autoQuery: z.enum(['true', 'false']).default('true'),
		}),
	),
	async (c) => {
		try {
			const { path = 'sub.xf.free.hr/sub', type = 'pure', security = '', autoQuery = 'true' } = c.req.valid('query');
			const _url = /^http(s?):\/\//.test(path) ? path : `https://${path}`;
			const params = autoQuery === 'true' ? new URLSearchParams({ host: 'my.host', uuid: '56ddc8b9-5343-41e7-8500-4ff79f5deb92' }) : '';
			const isPureMode = type === 'pure';
			const isCustom = type === 'custom';
			const isOriginal = type === 'original';
			const response = await fetch(`${_url}${params ? `?${params}` : ''}`);
			if (!response.ok) {
				throw new Error('Network response was not ok');
			}
			const data = await response.text();
			const getHost = ({ formattedString, port }: { formattedString: string; port: string | number | null }) =>
				`${formattedString.split('#')?.[0]}:${port}`;
			const result = Buffer.from(data, 'base64')
				.toString()
				.split('\n')
				.filter(Boolean)
				.map((vlessUrl) => {
					const { host, hash, query, hostname, port = 443 } = url.parse(vlessUrl, true);
					const name = decodeURI((hash || '').replace(/^\#/, ''));
					const needMatchArea = isCustom || isPureMode;
					const [, area] =
						name.match(
							needMatchArea
								? /(移动|联通|电信|狮城|新加坡|香港|台湾|日本|韩国|美国|英国|法国|荷兰|波兰|芬兰|德国|都柏林|瑞典|西班牙|加拿大|澳洲|US|DE|NL|KR|SG|AU|HK|JP|TW|DE|GB|SE|ES|CA|HKG|TOKYO|SINGAPORE|TAIPEI|PL|FR)/i
								: /.*/,
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
						...(needMatchArea && !area ? [!/(tg|更新|教程|channel|频道|收费|免费|群组|被骗|维护|Author|127\.0\.0\.1)/i.test(name)] : []),

						/**
						 * 开启 https 筛选时必须开启tls
						 */
						...(security === 'tls' ? [query.security === 'tls'] : []),
					];

					const formattedString = rules.every(Boolean)
						? `${host}#${area ? `${hostname}:${port} - ${area.toLocaleUpperCase()}` : isOriginal ? name : name.replace(/【?请勿测速】?/, '🤫')}`
						: '';

					return {
						formattedString,
						port,
					};
				})
				.filter((item) => item.formattedString)
				.filter((item, index, array) => {
					return array.map((it) => getHost(it)).indexOf(getHost(item)) === index;
				})
				.map((it) => it.formattedString)
				.join('\n');
			return c.text(result);
		} catch (error) {
			return c.text('Error');
		}
	},
);

export default edgetunnels;
