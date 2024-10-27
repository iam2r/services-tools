import edgetunnels from './edgetunnels.js';
import sharps from './sharps.js';
import { Hono } from 'hono';
import web from './web.js';
const api = new Hono();
api.route('/edgetunnels', edgetunnels).route('/web', web).route('/sharps', sharps);
export default api;
