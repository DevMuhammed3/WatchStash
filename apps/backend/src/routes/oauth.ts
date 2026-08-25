import { Router } from 'express';
import { Authorize, Callback } from '../controllers/oauth.js';

const router = Router();

router.get('/:provider/authorize', Authorize);
router.get('/:provider/callback', Callback);

export default router;
