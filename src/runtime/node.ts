import 'config.js';
import { serve } from '@hono/node-server';
import { scheduleTasks } from '@/utils/schedule-tasks.js';
import { startLog } from '@/utils/start-log.js';
import { serveStatic } from '@hono/node-server/serve-static';
import { app } from '@/app.js';
app.use('/static/*', serveStatic({ root: './', rewriteRequestPath: (path) => path.replace(/^\/static/, '/public') }));
const port = 3000;
serve({
	fetch: app.fetch,
	port,
});
startLog(port);
scheduleTasks();
