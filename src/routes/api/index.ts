import { Hono } from 'hono';
import edgetunnels from '@/routes/api/edgetunnels.ts';
const api = new Hono();
api.route('/edgetunnels', edgetunnels);
export default api;
