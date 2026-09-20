import { Response } from 'express';
import { prisma } from '../config/prisma.js';
import { AuthenticatedRequest } from '../middlewares/authMiddleware.js';

// Récupère l'historique de conversation entre l'utilisateur connecté et un autre
// 📡 Récupérer la liste complète des conversations d'un utilisateur (Style SUGO)
export const getConversationsList = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const myId = req.user?.userId;

    if (!myId) {
      res.status(401).json({ error: 'Non authentifié' });
      return;
    }

    // 1. On récupère tous les messages où l'utilisateur est soit l'expéditeur, soit le destinataire
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

    // 2. Map locale pour regrouper les messages par identifiant d'interlocuteur unique
    const conversationMap = new Map<string, any>();

    allMessages.forEach((msg) => {
      // Déterminer qui est l'autre personne dans la discussion
      const otherUser = msg.senderId === myId ? msg.receiver : msg.sender;
      
      // Sécurité : Si l'utilisateur s'écrit à lui-même ou si le compte est corrompu, on ignore
      if (!otherUser || otherUser.id === myId) return;

      // Si nous n'avons pas encore enregistré cette conversation dans notre Map, c'est que c'est le message le plus récent
      if (!conversationMap.has(otherUser.id)) {
        conversationMap.set(otherUser.id, {
          id: otherUser.id,
          name: otherUser.nickname,
          avatar: otherUser.avatar,
          isOnline: otherUser.isOnline,
          lastMessage: msg.type === 'TEXT' ? msg.content : `[${msg.type.toLowerCase()}]`,
          time: msg.createdAt,
          unreadCount: 0,
          isSpecial: otherUser.id === 'system_kissme_team', // Détection automatique du robot admin !
        });
      }

      // 3. Calcul dynamique des messages non lus : si le message m'est destiné et qu'il n'est pas lu
      if (msg.receiverId === myId && !msg.isRead) {
        const currentConv = conversationMap.get(otherUser.id);
        if (currentConv) {
          currentConv.unreadCount += 1;
        }
      }
    });
    // 4. Conversion de la Map en tableau indexable pour l'application mobile
    const conversationsList = Array.from(conversationMap.values());

    // 5. Tri chronologique strict : les messages les plus récents passent en premier
    conversationsList.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

    // 6. Formatage final des objets conversations (Conversion des dates pour ton design)
    const formattedConversations = conversationsList.map((conv) => {
      const date = new Date(conv.time);
      const now = new Date();
      
      let formattedTime = "";
      if (date.toDateString() === now.toDateString()) {
        // Si c'est aujourd'hui -> "14:32"
        formattedTime = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      } else {
        // Si c'est un autre jour -> "18/09"
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        formattedTime = `${day}/${month}`;
      }

      return {
        ...conv,
        time: formattedTime // Devient "14:32" ou "18/09" selon le jour
      };
    });

    res.status(200).json({ conversations: formattedConversations });
  } catch (error) {
    console.error('Erreur getConversationsList:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de la liste des conversations' });
  }
};

// 🧹 Route flash "Trois Traits" : Marquer l'ensemble des discussions privées comme lues d'un coup
export const markAllAsRead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const myId = req.user?.userId;

    if (!myId) {
      res.status(401).json({ error: 'Non authentifié' });
      return;
    }

    // On passe à true tous les messages non lus destinés à l'utilisateur connecté
    await prisma.message.updateMany({
      where: { receiverId: myId, isRead: false },
      data: { isRead: true }
    });

    res.status(200).json({ success: true, message: 'Toutes les conversations ont été marquées comme lues.' });
  } catch (error) {
    console.error('Erreur markAllAsRead:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour des messages.' });
  }
};

// 🗑️ Route "Trois Traits" numéro 2 : Supprimer les conversations fantômes (sans message)
export const cleanupEmptyConversations = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const myId = req.user?.userId;

    if (!myId) {
      res.status(401).json({ error: 'Non authentifié' });
      return;
    }

    // 1. On cherche toutes les interactions de follow ou de match (les canaux ouverts)
    // mais qui n'ont AUCUN message enregistré dans la table Message entre ces deux personnes.
    // Pour nettoyer, on supprime simplement les lignes d'interactions vides liées à mon ID.
    
    // Note technique : Dans ton architecture, les conversations apparaissent parce qu'il y a un message.
    // Si tu veux offrir à l'utilisateur la possibilité de masquer ou supprimer un fil entier,
    // on peut aussi supprimer l'historique des messages reçus pour cet utilisateur.
    
    await prisma.message.deleteMany({
      where: {
        OR: [
          { senderId: myId, content: null, mediaUrl: null },
          { receiverId: myId, content: null, mediaUrl: null }
        ]
      }
    });

    res.status(200).json({ success: true, message: 'Le fil de discussion a été nettoyé avec succès.' });
  } catch (error) {
    console.error('Erreur cleanupEmptyConversations:', error);
    res.status(500).json({ error: 'Erreur lors du nettoyage des discussions.' });
  }
};

