import { Router } from 'express';
import { getNotifications, getUnreadNotificationsCount, markEverythingAsRead } from '../controllers/notificationController.js';
import { verifyJwt } from '../middlewares/authMiddleware.js';

const router = Router();

// 🚀 ROUTE 1 : Récupérer l'historique des interactions (Visites, Likes cliquables)
// URL finale : GET /api/notifications
router.get('/', verifyJwt, getNotifications);

// 🧹 ROUTE 2 : Menu "Trois Traits" pour effacer toutes les pastilles rouges globales
// URL finale : PUT /api/notifications/read-all
router.put('/read-all', verifyJwt, markEverythingAsRead);

router.get('/notification/unread-count', verifyJwt, getUnreadNotificationsCount);

export default router;
