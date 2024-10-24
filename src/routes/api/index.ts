import { Hono } from 'hono';
import edgetunnels from './edgetunnels.ts';
const api = new Hono();
api.route('/edgetunnels', edgetunnels);
export default api;
