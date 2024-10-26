import { Hono } from 'hono';
import api from './api/index.js';
import demo from './demo/index.jsx';

const router = new Hono();

router.route('/api', api);
router.route('/demo', demo);

export default router;
