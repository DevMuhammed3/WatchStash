import { Router } from 'express';
import { Register, Login, Refresh, Logout, Me } from '../controllers/auth';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { registerSchema, loginSchema, refreshSchema, logoutSchema } from '../validations/auth';

const router = Router();

router.post('/register', validate(registerSchema), Register);
router.post('/login', validate(loginSchema), Login);
router.post('/refresh', validate(refreshSchema), Refresh);
router.post('/logout', validate(logoutSchema), Logout);
router.get('/me', authenticate, Me);

export default router;
