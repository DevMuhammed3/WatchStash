import { Router } from 'express';
import {
  Register,
  Login,
  Refresh,
  Logout,
  Me,
  UpdateMe,
  ChangePassword,
  LogoutOtherSessions,
  DeleteMe,
} from '../controllers/auth.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { requireSameOrigin } from '../middleware/requireSameOrigin.js';
import {
  registerSchema,
  loginSchema,
  refreshSchema,
  logoutSchema,
  updateProfileSchema,
  changePasswordSchema,
  deleteAccountSchema,
} from '../validations/auth.js';

const router: Router = Router();

router.post('/register', requireSameOrigin, validate(registerSchema), Register);
router.post('/login', requireSameOrigin, validate(loginSchema), Login);
router.post('/refresh', requireSameOrigin, validate(refreshSchema), Refresh);
// Logout intentionally skips `authenticate`: the caller may be logging out
// with an expired access token, and rejecting that request would leave the
// refresh token unrevoked (it stays valid for up to 7 days).
router.post('/logout', requireSameOrigin, validate(logoutSchema), Logout);
router.get('/me', authenticate, Me);
router.patch('/me', requireSameOrigin, authenticate, validate(updateProfileSchema), UpdateMe);
router.delete('/me', requireSameOrigin, authenticate, validate(deleteAccountSchema), DeleteMe);
router.post(
  '/change-password',
  requireSameOrigin,
  authenticate,
  validate(changePasswordSchema),
  ChangePassword,
);
router.post('/logout-others', requireSameOrigin, authenticate, LogoutOtherSessions);

export default router;
