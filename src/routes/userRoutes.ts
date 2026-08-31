import { Router } from 'express';
import { verifyJwt } from '../middlewares/authMiddleware.js';
import { addUserPhoto, deleteUserPhoto, getHomeUsers, getUserProfileById, updateUserProfile } from '../controllers/userController.js';


const router = Router();

router.get('/', verifyJwt, getHomeUsers);
router.get('/:id', verifyJwt, getUserProfileById);

router.put('/:id', verifyJwt, updateUserProfile);

router.post('/photos', verifyJwt, addUserPhoto);

router.delete('/photos/:photoId', verifyJwt, deleteUserPhoto);

export default router;
