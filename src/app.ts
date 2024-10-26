import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { prettyJSON } from 'hono/pretty-json';
import router from '@/routes/index.js';

export const app = new Hono()
	.use(logger())
	.use(prettyJSON())
	.use(cors())
	.use('/static/*', serveStatic({ root: './', rewriteRequestPath: (path) => path.replace(/^\/static/, '/public') }))
	.get('/ping', (c) => {
		return c.json({ status: 'pong' });
	})
	.route('/', router);
