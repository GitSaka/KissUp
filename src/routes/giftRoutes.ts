import { Router } from 'express';
import { sendGift, getGiftsCatalog } from '../controllers/giftController.js';
import { verifyJwt } from '../middlewares/authMiddleware.js';

const router = Router();

// 📋 GET /api/gifts -> Récupérer le catalogue
router.get('/', verifyJwt, getGiftsCatalog);

// 🎁 POST /api/gifts/send -> Envoyer un cadeau
router.post('/send', verifyJwt, sendGift);

export default router;
