import { Router } from 'express';
import { verifyJwt } from '../middlewares/authMiddleware.js';
import { getConversationsList } from '../controllers/messageController.js';


const router = Router();

router.get('/:userId', verifyJwt, getConversationsList);

export default router;