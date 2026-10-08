import { Router } from 'express';
import { verifyJwt } from '../../middlewares/authMiddleware.js';
import { LivekitController } from './livekit.controller.js';
const router = Router();
// POST /api/livekit/token
router.post('/token', verifyJwt, LivekitController.getToken);
export default router;
