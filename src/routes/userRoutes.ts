import { Router } from 'express';
import { verifyJwt } from '../middlewares/authMiddleware.js';
import { getHomeUsers, getUserProfileById, updateUserProfile } from '../controllers/userController.js';


const router = Router();

router.get('/', verifyJwt, getHomeUsers);
router.get('/:id', verifyJwt, getUserProfileById);

router.put('/:id', verifyJwt, updateUserProfile);

export default router;
