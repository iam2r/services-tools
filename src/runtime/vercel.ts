import { app } from '@/app.js';
import { handle } from 'hono/vercel';

export const config = {
	runtime: 'edge',
};

export default handle(app);
