import demo from './demo/index.jsx';
import api from './api/index.js';
import { Hono } from 'hono';

const router = new Hono();

router.route('/api', api);
router.route('/demo', demo);

export default router;
