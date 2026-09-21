import { Response } from 'express';
import { prisma } from '../config/prisma.js';
import { AuthenticatedRequest } from '../middlewares/authMiddleware.js';

/**
 * 📡 1. RESTAURÉE : Récupère l'historique de conversation entre l'utilisateur connecté et un autre
 * Indispensable pour ouvrir un salon de discussion privé 1-à-1
 */
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

/**
 * 📡 2. Récupérer la liste complète des conversations d'un utilisateur (Style SUGO)
 */
export const getConversationsList = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const myId = req.user?.userId;

    if (!myId) {
      res.status(401).json({ error: 'Non authentifié' });
      return;
    }

    const allMessages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: myId },
          { receiverId: myId }
        ]
      },
      orderBy: { createdAt: 'desc' },
      include: {
        sender: { select: { id: true, nickname: true, avatar: true, isOnline: true } },
        receiver: { select: { id: true, nickname: true, avatar: true, isOnline: true } }
      }
    });

    const conversationMap = new Map<string, any>();

    allMessages.forEach((msg) => {
      const otherUser = msg.senderId === myId ? msg.receiver : msg.sender;
      if (!otherUser || otherUser.id === myId) return;

      if (!conversationMap.has(otherUser.id)) {
        conversationMap.set(otherUser.id, {
          id: otherUser.id,
          name: otherUser.nickname,
          avatar: otherUser.avatar,
          isOnline: otherUser.isOnline,
          lastMessage: msg.type === 'TEXT' ? msg.content : `[${msg.type.toLowerCase()}]`,
          time: msg.createdAt,
          unreadCount: 0,
          isSpecial: otherUser.id === 'system_kissme_team',
        });
      }

      if (msg.receiverId === myId && !msg.isRead) {
        const currentConv = conversationMap.get(otherUser.id);
        if (currentConv) {
          currentConv.unreadCount += 1;
        }
      }
    });

    const conversationsList = Array.from(conversationMap.values());
    conversationsList.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

    const formattedConversations = conversationsList.map((conv) => {
      const date = new Date(conv.time);
      const now = new Date();
      
      let formattedTime = "";
      if (date.toDateString() === now.toDateString()) {
        formattedTime = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      } else {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        formattedTime = `${day}/${month}`;
      }

      return {
        ...conv,
        time: formattedTime
      };
    });

    res.status(200).json({ conversations: formattedConversations });
  } catch (error) {
    console.error('Erreur getConversationsList:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de la liste des conversations' });
  }
};

/**
 * 🗑️ 3. Route "Trois Traits" numéro 2 : Nettoyer les fils inactifs et unilatéraux
 */
export const cleanupEmptyConversations = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const myId = req.user?.userId;

    if (!myId) {
      res.status(401).json({ error: 'Non authentifié' });
      return;
    }

    const delayThreshold = new Date(Date.now() - 48 * 60 * 60 * 1000);

    const result = await prisma.message.deleteMany({
      where: {
        OR: [
          { senderId: myId, createdAt: { lt: delayThreshold } },
          { receiverId: myId, createdAt: { lt: delayThreshold }, isRead: false }
        ]
      }
    });

    console.log(`🧹 Nettoyage accompli : ${result.count} messages inactifs supprimés.`);

    res.status(200).json({ 
      success: true, 
      message: 'Le fil de discussion a été nettoyé et allégé avec succès.' 
    });
  } catch (error) {
    console.error('Erreur cleanupEmptyConversations:', error);
    res.status(500).json({ error: 'Erreur lors du nettoyage des discussions.' });
  }
};
