import { Router } from 'express';
import { verifyJwt } from '../middlewares/authMiddleware.js';
import { getHomeUsers, getUserProfileById } from '../controllers/userController.js';


const router = Router();

router.get('/', verifyJwt, getHomeUsers);
router.get('/:id', verifyJwt, getUserProfileById);

export default router;
