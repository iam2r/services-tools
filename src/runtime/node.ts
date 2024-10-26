import { serve } from '@hono/node-server';
import { scheduleTasks } from '@/utils/schedule-tasks.js';
import { startLog } from '@/utils/start-log.js';
import { app } from '@/app.js';
const port = 3000;
serve({
	fetch: app.fetch,
	port,
});
startLog(port);
scheduleTasks();
