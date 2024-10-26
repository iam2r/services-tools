import { serve } from '@hono/node-server';
import { scheduleTasks } from '@/utils/schedule-tasks.ts';
import { startLog } from '@/utils/start-log.ts';
import { app } from '@/app.ts';
const port = 3000;
serve({
	fetch: app.fetch,
	port,
});
startLog(port);
scheduleTasks();
