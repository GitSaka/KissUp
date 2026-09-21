import { Router } from 'express';
import { verifyJwt } from '../middlewares/authMiddleware.js';
import { getConversationsList,cleanupEmptyConversations,getConversation } from '../controllers/messageController.js';


const router = Router();

router.get('/conversations', verifyJwt, getConversationsList);
// 🚀 LE FIX : Change .get par .delete pour s'aligner à 100% avec l'apiClient du téléphone !
router.delete('/cleanup', verifyJwt, cleanupEmptyConversations);

router.get('/:userId', verifyJwt, getConversation); 



export default router;