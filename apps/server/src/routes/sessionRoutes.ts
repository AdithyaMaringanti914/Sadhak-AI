import { Router } from 'express';
import { createSession, getSessionByCode } from '../controllers/SessionController';

const router = Router();

router.post('/create', createSession);
router.get('/:code', getSessionByCode);

export default router;
