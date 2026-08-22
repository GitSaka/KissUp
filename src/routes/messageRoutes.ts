import { Router } from 'express';
import { verifyJwt } from '../middlewares/authMiddleware.js';
import { getConversation } from '../controllers/messageController.js';


const router = Router();

router.get('/:userId', verifyJwt, getConversation);

export default router;