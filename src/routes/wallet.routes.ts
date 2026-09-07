import { Router } from 'express';
import { initiateDirectPayment } from '../controllers/payment.controller.js';
import { checkPaymentStatus } from '../controllers/status.controller.js';
import { handleFedaPayWebhook } from '../controllers/webhook.controller.js';
import { verifyJwt } from '../middlewares/authMiddleware.js';
// Ton middleware d'authentification

const router = Router();

// 1. Initialiser le paiement direct (Mobile App -> Backend)
router.post('/wallet/checkout', verifyJwt, initiateDirectPayment);

// 2. Vérifier le statut en temps réel (Mobile App -> Backend -> FedaPay)
router.get('/wallet/status', verifyJwt, checkPaymentStatus);

// 3. Webhook de confirmation (FedaPay Server -> Backend) - Route publique
router.post('/webhooks/fedapay', handleFedaPayWebhook);

export default router;