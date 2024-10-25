import 'config.js';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { prettyJSON } from 'hono/pretty-json';
import router from '@/routes/index.ts';
import { scheduleTasks } from '@/utils/schedule-tasks.ts';
import { startLog } from '@/utils/start-log.ts';

const app = new Hono();
app
	.use(logger())
	.use(prettyJSON())
	.use('*', cors())
	.use('/static/*', serveStatic({ root: './', rewriteRequestPath: (path) => path.replace(/^\/static/, '/public') }))
	.get('/ping', (c) => {
		return c.json({ status: 'pong' });
	})
	.route('/', router);

const port = 3000;

serve({
	fetch: app.fetch,
	port,
});
startLog(port);
scheduleTasks();
