import { Hono } from 'hono';
import edgetunnels from './edgetunnels.js';
import web from './web.js';
import sharps from './sharps.js';
const api = new Hono();
api.route('/edgetunnels', edgetunnels).route('/web', web).route('/sharps', sharps);
export default api;
