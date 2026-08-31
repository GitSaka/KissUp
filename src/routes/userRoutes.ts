import { Router } from 'express';
import { verifyJwt } from '../middlewares/authMiddleware.js';
import { addUserPhoto, deleteUserPhoto, getHomeUsers, getUserProfileById, updateProfile, updateUserProfile } from '../controllers/userController.js';

const router = Router();

router.get('/', verifyJwt, getHomeUsers);

// ⚡️ Place tes routes spécifiques (/profile, /photos) AVANT les routes avec des paramètres dynamiques (/:id)
router.put('/profile', verifyJwt, updateProfile);

router.post('/photos', verifyJwt, addUserPhoto);
router.delete('/photos/:photoId', verifyJwt, deleteUserPhoto);

// Les routes dynamiques en dessous
router.get('/:id', verifyJwt, getUserProfileById);
router.put('/:id', verifyJwt, updateUserProfile);

export default router;