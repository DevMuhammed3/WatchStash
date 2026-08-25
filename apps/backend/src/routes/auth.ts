import { Router } from 'express';
import { Register, Login, Refresh, Logout, Me } from '../controllers/auth.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { registerSchema, loginSchema, refreshSchema, logoutSchema } from '../validations/auth.js';

const router = Router();

router.post('/register', validate(registerSchema), Register);
router.post('/login', validate(loginSchema), Login);
router.post('/refresh', validate(refreshSchema), Refresh);
router.post('/logout', authenticate, validate(logoutSchema), Logout);
router.get('/me', authenticate, Me);

export default router;
