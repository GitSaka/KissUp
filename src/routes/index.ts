import { Router } from 'express';
import { getZegoToken } from '../controllers/zegoController.js';
import { verifyJwt } from '../middlewares/authMiddleware.js'; // 👈 Importe ton middleware

const router = Router();

// Route sécurisée : Le middleware verifyJwt s'exécute en premier pour bloquer les non-connectés
router.get('/token', verifyJwt, getZegoToken);

export default router;