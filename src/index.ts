import '../config.cjs';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import router from './routes/index.ts';
import { scheduleTasks } from './utils/schedule-tasks.ts';

const app = new Hono();
app
	.use(logger())
	.use('*', cors())
	.use('/static/*', serveStatic({ root: './', rewriteRequestPath: (path) => path.replace(/^\/static/, '/public') }))
	.get('/ping', (c) => {
		return c.json({ status: 'pong' });
	})
	.route('/', router);

const port = 3000;
console.log('📝 Author: Razo');
console.log('🌍 GitHub Repository: https://github.com/iam2r/openai-tools');
console.log(`💖 Don't forget to star the repository if you like this project!`);
console.log();
console.log(`Server is running at http://localhost:${port}`);

serve({
	fetch: app.fetch,
	port,
});

scheduleTasks();
