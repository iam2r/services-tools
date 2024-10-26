import { Hono } from 'hono';
import api from '@/routes/api/index.js';
import demo from '@/routes/demo/index.jsx';

const router = new Hono();

router.route('/api', api);
router.route('/demo', demo);

export default router;
