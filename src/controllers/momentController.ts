import { Response } from 'express';
import { prisma } from '../config/prisma.js';
import { AuthenticatedRequest } from '../middlewares/authMiddleware.js';

// 📝 Créer une publication
export const createMoment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId; // Corrigé de authorId à userId
    const { type, content, mediaUrls, duration, isSponsored } = req.body;

    if (!userId) {
      res.status(401).json({ error: 'Non authentifié' });
      return;
    }

    const moment = await prisma.moment.create({
      data: {
        userId, // Clé étrangère Prisma correcte
        type,
        content: content !== undefined && content !== null ? String(content).trim() : "",
        mediaUrls: mediaUrls || [],
        duration: duration || null,
        isSponsored: isSponsored || false,
      },
    });

    res.status(201).json(moment);
  } catch (error) {
    console.error('Erreur createMoment:', error);
    res.status(500).json({ error: 'Erreur lors de la création de la publication' });
  }
};

export const getMomentsFeed = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const currentUserId = req.user?.userId;
    const limit = parseInt(req.query.limit as string) || 10;
    const before = req.query.before as string | undefined;
    const tabCategory = (req.query.tabCategory as string) || 'RECOMMENDED'; // 'RECOMMENDED' | 'NEW' | 'FOLLOWING'

    let whereClause: any = {};

    if (before && before !== 'undefined' && before !== 'null') {
      const pivot = await prisma.moment.findUnique({ where: { id: String(before) }, select: { createdAt: true } });
      if (pivot) whereClause.createdAt = { lt: pivot.createdAt };
    }

    // Gestion du filtre par onglet
    if (tabCategory === 'FOLLOWING' && currentUserId) {
      // Récupérer la liste des utilisateurs que l'utilisateur courant suit
      const followingList = await prisma.follow.findMany({
        where: { followerId: currentUserId },
        select: { followingId: true },
      });
      const followingIds = followingList.map((f) => f.followingId);
      
      // On filtre pour n'afficher que les posts des gens qu'il suit
      whereClause.userId = { in: [...followingIds, currentUserId] };
    }

    // Définition de l'ordre de tri selon l'onglet
    let orderByCondition: any = [];
    if (tabCategory === 'NEW') {
      orderByCondition = [{ createdAt: 'desc' }];
    } else {
      // Pour 'RECOMMENDED' : Priorité aux sponsorisés, puis tri par date
      orderByCondition = [
        { isSponsored: 'desc' },
        { createdAt: 'desc' },
      ];
    }

    const moments = await prisma.moment.findMany({
      where: whereClause,
      orderBy: orderByCondition,
      take: limit,
      include: {
        user: {
          select: { id: true, nickname: true, avatar: true, isVerified: true, distance: true, isVip: true },
        },
        _count: { select: { likes: true, comments: true } },
        likes: currentUserId ? { where: { userId: currentUserId } } : false,
        giftTransactions: {
          select: { totalCoins: true },
        },
      },
    });

    // 🚀 LE FIX EN OR : Utilisation de Promise.all pour résoudre les requêtes asynchrones proprement
    const formatted = await Promise.all(
      moments.map(async (m) => {
        const totalCoinsReceived = m.giftTransactions.reduce(
          (sum, tx) => sum + tx.totalCoins,
          0
        );

        let isMutualFollow = false;
        // Si le post appartient à quelqu'un d'autre et que l'utilisateur est connecté, on calcule l'amitié
        if (currentUserId && m.userId !== currentUserId) {
          // 1. Est-ce que je suis l'auteur ?
          const iFollowAuthor = await prisma.follow.findUnique({
            where: { followerId_followingId: { followerId: currentUserId, followingId: m.userId } }
          });

          // 2. Est-ce que l'auteur me suit en retour ?
          const authorFollowsMe = await prisma.follow.findUnique({
            where: { followerId_followingId: { followerId: m.userId, followingId: currentUserId } }
          });

          isMutualFollow = !!(iFollowAuthor && authorFollowsMe);
        }

        return {
          id: m.id,
          authorId: m.userId, // Clé racine indispensable pour ton application mobile
          author: {
            ...m.user,
            isMutualFollow 
          },
          type: m.type,
          content: m.content,
          mediaUrls: m.mediaUrls,
          duration: m.duration,
          isSponsored: m.isSponsored,
          totalCoinsReceived,
          likesCount: m._count.likes,
          commentsCount: m._count.comments,
          hasLiked: currentUserId ? m.likes.length > 0 : false,
          createdAt: m.createdAt,
        };
      })
    ); // 🚀 Fin propre de la résolution Promise.all

    res.status(200).json({ moments: formatted, hasMore: moments.length === limit });
  } catch (error) {
    console.error('Erreur getMomentsFeed:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des publications' });
  }
};


// 🔍 Récupérer un post précis avec ses commentaires réels peuplés (Fix 0 commentaire)
export const getMomentById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const currentUserId = req.user?.userId;
    const momentId = req.params.id as string;

    const moment = await prisma.moment.findUnique({
      where: { id: momentId },
      include: {
        user: {
          select: { id: true, nickname: true, avatar: true, isVerified: true, distance: true, isVip: true },
        },
        _count: { select: { likes: true, comments: true } },
        likes: currentUserId ? { where: { userId: currentUserId } } : false,
        giftTransactions: { select: { totalCoins: true } },
        // 🚀 LE FIX EN OR : On va chercher tous les commentaires liés, triés du plus ancien au plus récent
        comments: {
          orderBy: { createdAt: 'asc' },
          include: {
            user: { select: { id: true, nickname: true, avatar: true } }
          }
        }
      },
    });

    if (!moment) {
      res.status(404).json({ error: 'Publication introuvable' });
      return;
    }

    const totalCoinsReceived = moment.giftTransactions.reduce(
      (sum, tx) => sum + tx.totalCoins,
      0
    );

    // Calcul du suivi réciproque pour ton bouton d'appel mobile SUGO
    let isMutualFollow = false;
    if (currentUserId && moment.userId !== currentUserId) {
      const iFollowAuthor = await prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: currentUserId, followingId: moment.userId } }
      });
      const authorFollowsMe = await prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: moment.userId, followingId: currentUserId } }
      });
      isMutualFollow = !!(iFollowAuthor && authorFollowsMe);
    }

    res.status(200).json({
      id: moment.id,
      authorId: moment.userId, // Clé racine indispensable pour les conditions d'affichage mobile
      author: {
        ...moment.user,
        isMutualFollow
      },
      type: moment.type,
      content: moment.content,
      mediaUrls: moment.mediaUrls,
      duration: moment.duration,
      isSponsored: moment.isSponsored,
      totalCoinsReceived,
      likesCount: moment._count.likes,
      commentsCount: moment._count.comments,
      hasLiked: currentUserId ? moment.likes.length > 0 : false,
      createdAt: moment.createdAt,
      // 🚀 TRANSMISSION VERS L'APPLI MOBILE : On convertit les lignes Prisma au format attendu par ton design
      comments: moment.comments.map(c => ({
        id: c.id,
        author: c.user?.nickname || 'Utilisateur',
        avatar: c.user?.avatar,
        text: c.text,
        createdAt: c.createdAt
      }))
    });
  } catch (error) {
    console.error('Erreur getMomentById:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de la publication' });
  }
};


// ❤️ Toggle like
export const toggleMomentLike = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const momentId = req.params.id as string;

    if (!userId) {
      res.status(401).json({ error: 'Non authentifié' });
      return;
    }

    const existing = await prisma.momentLike.findUnique({
      where: { momentId_userId: { momentId, userId } },
    });

    if (existing) {
      await prisma.momentLike.delete({ where: { id: existing.id } });
      res.status(200).json({ hasLiked: false });
    } else {
      await prisma.momentLike.create({ data: { momentId, userId } });
      res.status(201).json({ hasLiked: true });
    }
  } catch (error) {
    console.error('Erreur toggleMomentLike:', error);
    res.status(500).json({ error: 'Erreur lors du like' });
  }
};

// 💬 Ajouter un commentaire
export const addMomentComment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId; // Remplacé authorId par userId pour correspondre au modèle MomentComment si besoin, ou on garde authorId si le modèle utilise authorId.
    const momentId = req.params.id as string;
    const { text } = req.body;

    if (!userId) {
      res.status(401).json({ error: 'Non authentifié' });
      return;
    }
    if (!text || !text.trim()) {
      res.status(400).json({ error: 'Le commentaire ne peut pas être vide' });
      return;
    }

    const comment = await prisma.momentComment.create({
      data: { momentId, userId, text: text.trim() },
      include: {
        user: { select: { id: true, nickname: true, avatar: true } },
      },
    });

    res.status(201).json(comment);
  } catch (error) {
    console.error('Erreur addMomentComment:', error);
    res.status(500).json({ error: "Erreur lors de l'ajout du commentaire" });
  }
};

// 📋 Récupérer les commentaires
export const getMomentComments = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const momentId = req.params.id as string;

    const comments = await prisma.momentComment.findMany({
      where: { momentId },
      orderBy: { createdAt: 'asc' },
      include: {
        user: { select: { id: true, nickname: true, avatar: true } },
      },
    });

    res.status(200).json(comments);
  } catch (error) {
    console.error('Erreur getMomentComments:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des commentaires' });
  }
};

// 🗑️ Supprimer une publication
export const deleteMoment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const momentId = req.params.id as string;

    if (!userId) {
      res.status(401).json({ error: 'Non authentifié' });
      return;
    }

    // Vérifier si le moment existe et appartient bien à l'utilisateur connecté
    const moment = await prisma.moment.findUnique({
      where: { id: momentId },
      select: { userId: true },
    });

    if (!moment) {
      res.status(404).json({ error: 'Publication introuvable' });
      return;
    }

    if (moment.userId !== userId) {
      res.status(403).json({ error: 'Action non autorisée. Vous n\'êtes pas l\'auteur de cette publication.' });
      return;
    }

    // Suppression (les likes, commentaires et liens cadeaux s'effaceront en cascade grâce au schéma Prisma)
    await prisma.moment.delete({
      where: { id: momentId },
    });

    res.status(200).json({ message: 'Publication supprimée avec succès' });
  } catch (error) {
    console.error('Erreur deleteMoment:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de la publication' });
  }
};