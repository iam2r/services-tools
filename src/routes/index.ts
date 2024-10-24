import { Hono } from 'hono';
import api from './api/index.ts';
import demo from './demo/index.tsx';

const router = new Hono();

router.route('/api', api);
router.route('/demo', demo);

export default router;
