import 'config.js';
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { prettyJSON } from 'hono/pretty-json';
import router from './routes/index.js';
import { serveStatic } from '@hono/node-server/serve-static';
import { serve } from '@hono/node-server';
import { startLog } from './utils/start-log.js';
import { scheduleTasks } from './utils/schedule-tasks.js';

export const app = new Hono()
	.use(logger())
	.use(prettyJSON())
	.use(cors())
	.get('/ping', (c) => {
		return c.json({ status: 'pong' });
	})
	.route('/', router)
	.use('/static/*', serveStatic({ root: './', rewriteRequestPath: (path) => path.replace(/^\/static/, '/public') }));

const port = 3000;
serve({
	fetch: app.fetch,
	port,
});
startLog(port);
scheduleTasks();
