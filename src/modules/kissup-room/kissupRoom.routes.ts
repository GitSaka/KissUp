import { Router } from 'express';
import { verifyJwt } from '../../middlewares/authMiddleware.js';
import { KissUpRoomController } from './kissupRoom.controller.js';

const router = Router();

// Toutes les routes nécessitent JWT (comme ton livekit)
router.use(verifyJwt);

// POST /api/kissup-rooms -> créer mon salon (anti 10 salons inclus)
router.post('/', KissUpRoomController.create);

// GET /api/kissup-rooms/open -> lister salons ouverts pour (tabs)/live.tsx
router.get('/open', KissUpRoomController.listOpen);

// GET /api/kissup-rooms/my/open -> est-ce que j'ai déjà un salon ouvert ?
router.get('/my/open', KissUpRoomController.myOpen);

// POST /api/kissup-rooms/:id/leave -> quitter + FINISHED si vide
router.post('/:id/leave', KissUpRoomController.leave);

export default router;
