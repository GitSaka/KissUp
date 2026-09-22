import { Response } from 'express';
import { prisma } from '../config/prisma.js';
import { AuthenticatedRequest } from '../middlewares/authMiddleware.js';

// 🔔 1. Récupérer l'historique des interactions cliquables (Visites, Likes)
export const getNotifications = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const myId = req.user?.userId;
    if (!myId) {
      res.status(401).json({ error: 'Non authentifié' });
      return;
    }

    const notifications = await prisma.notification.findMany({
      where: { receiverId: myId },
      include: {
        sender: {
          select: {
            id: true,
            nickname: true,
            avatar: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 40,
    });

    res.status(200).json({ notifications });
  } catch (error) {
    console.error('Erreur getNotifications:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des alertes.' });
  }
};

// 🧹 2. Route Flash "Trois Traits" : Marquer toutes les notifications ET les messages comme lus d'un coup
export const markEverythingAsRead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const myId = req.user?.userId;
    if (!myId) {
      res.status(401).json({ error: 'Non authentifié' });
      return;
    }

    // A. On passe toutes les alertes passives à lues
    await prisma.notification.updateMany({
      where: { receiverId: myId, isRead: false },
      data: { isRead: true }
    });

    // B. On passe tous les messages de chat à lus
    await prisma.message.updateMany({
      where: { receiverId: myId, isRead: false },
      data: { isRead: true }
    });

    res.status(200).json({ success: true, message: 'Tout a été marqué comme lu.' });
  } catch (error) {
    console.error('Erreur markEverythingAsRead:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour globale.' });
  }
};

// 🔢 Compter uniquement les notifications non lues
export const getUnreadNotificationsCount = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const myId = req.user?.userId;
    if (!myId) {
      res.status(401).json({ error: 'Non authentifié' });
      return;
    }

    const count = await prisma.notification.count({
      where: { 
        receiverId: myId, 
        isRead: false 
      },
    });

    res.status(200).json({ count });
  } catch (error) {
    console.error('Erreur getUnreadNotificationsCount:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};
