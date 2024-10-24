import { Hono } from 'hono';
import api from '@/routes/api/index.ts';
import demo from '@/routes/demo/index.tsx';

const router = new Hono();

router.route('/api', api);
router.route('/demo', demo);

export default router;
