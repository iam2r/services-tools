import { app } from '../app2.js';
import { handle } from 'hono/vercel';

export const config = {
	runtime: 'edge',
};

export default handle(app);
