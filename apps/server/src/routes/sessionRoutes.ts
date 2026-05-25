import { Router } from 'express';
import {
  createSession,
  getSessionByCode,
  updateSessionPermissions,
  updateSessionStatus,
} from '../controllers/SessionController';
import { rateLimit } from 'express-rate-limit';

const router = Router();

const joinSessionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 15 : 300,
  message: { success: false, error: 'Too many attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/create', createSession);
router.get('/:code', joinSessionLimiter, getSessionByCode);
router.patch('/:id/permissions', updateSessionPermissions);
router.patch('/:id/status', updateSessionStatus);

export default router;
