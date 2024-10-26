import { Hono } from 'hono';
import edgetunnels from '@/routes/api/edgetunnels.ts';
import web from '@/routes/api/web.ts';
import sharps from '@/routes/api/sharps.ts';
const api = new Hono();
api.route('/edgetunnels', edgetunnels).route('/web', web).route('/sharps', sharps);
export default api;
