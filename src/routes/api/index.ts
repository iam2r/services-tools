import { Hono } from 'hono';
import edgetunnels from '@/routes/api/edgetunnels.js';
import web from '@/routes/api/web.js';
import sharps from '@/routes/api/sharps.js';
const api = new Hono();
api.route('/edgetunnels', edgetunnels).route('/web', web).route('/sharps', sharps);
export default api;
