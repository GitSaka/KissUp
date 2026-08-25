import { Response } from 'express';
import { prisma } from '../config/prisma.js';
import { AuthenticatedRequest } from '../middlewares/authMiddleware.js';

// Récupère l'historique de conversation entre l'utilisateur connecté et un autre
export const getConversation = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const myId = req.user?.userId;
    const otherUserId = req.params.userId as string;
    const limit = parseInt(req.query.limit as string) || 30;
    const before = req.query.before as string | undefined;

    if (!myId) {
      res.status(401).json({ error: 'Non authentifié' });
      return;
    }

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: myId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: myId },
        ],
        ...(before ? { createdAt: { lt: new Date(before) } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    res.status(200).json({
      messages: messages.reverse(),
      hasMore: messages.length === limit,
    });
  } catch (error) {
    console.error('Erreur getConversation:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des messages' });
  }
};