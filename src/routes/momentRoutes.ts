import { Router } from 'express';
import { verifyJwt } from '../middlewares/authMiddleware.js';
import { 
  createMoment, 
  getMomentsFeed, 
  getMomentById, 
  deleteMoment, // <--- À ajouter 
  toggleMomentLike, 
  addMomentComment, 
  getMomentComments 
} from '../controllers/momentController.js';

const router = Router();

router.get('/', verifyJwt, getMomentsFeed);
router.post('/', verifyJwt, createMoment);
router.get('/:id', verifyJwt, getMomentById);
router.delete('/:id', verifyJwt, deleteMoment); // <--- À ajouter
router.post('/:id/like', verifyJwt, toggleMomentLike);
router.get('/:id/comments', verifyJwt, getMomentComments);
router.post('/:id/comments', verifyJwt, addMomentComment);

export default router;