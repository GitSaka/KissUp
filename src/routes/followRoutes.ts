import { Router } from 'express';
import { toggleFollow, getUsersWithLikeStatus } from '../controllers/followController.js';
import { verifyJwt } from '../middlewares/authMiddleware.js';


const router = Router();

router.post('/like', verifyJwt, toggleFollow);
router.get('/users-feed', verifyJwt, getUsersWithLikeStatus);

export default router;