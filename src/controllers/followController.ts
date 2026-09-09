import { Response } from 'express';
import { prisma } from '../config/prisma.js';
import { AuthenticatedRequest } from '../middlewares/authMiddleware.js';

// 1. Liker / S'abonner (ou Annuler si déjà fait - Toggle)
export const toggleFollow = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const followerId = req.user?.userId;
    const { targetUserId } = req.body;

    if (!followerId) {
      res.status(401).json({ error: 'Non authentifié' });
      return;
    }

    if (!targetUserId) {
      res.status(400).json({ error: "L'ID de l'utilisateur ciblé est requis." });
      return;
    }

    if (followerId === targetUserId) {
      res.status(400).json({ error: "Vous ne pouvez pas vous auto-suivre/liker." });
      return;
    }

    // Vérifier si la relation existe déjà dans la table follows
    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: followerId,
          followingId: targetUserId,
        },
      },
    });

    if (existingFollow) {
      // Si elle existe, on la supprime (Unlike / Unfollow)
      await prisma.follow.delete({
        where: { id: existingFollow.id },
      });
      res.status(200).json({ success: true, isLiked: false, message: "Like retiré." });
      return;
    } else {
      // Si elle n'existe pas, on la crée (Like / Follow)
      await prisma.follow.create({
        data: {
          followerId: followerId,
          followingId: targetUserId,
        },
      });

      // Vérifier si c'est un match (si l'autre nous suit aussi en retour)
      const reverseFollow = await prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: targetUserId,
            followingId: followerId,
          },
        },
      });

      const isMatch = !!reverseFollow;

      res.status(201).json({ 
        success: true, 
        isLiked: true, 
        isMatch: isMatch, 
        message: isMatch ? "C'est un Match !" : "Utilisateur liké avec succès." 
      });
      return;
    }
  } catch (error) {
    console.error("Erreur toggleFollow:", error);
    res.status(500).json({ error: "Erreur interne du serveur." });
  }
};

// 2. Récupérer les utilisateurs (avec l'état isLiked pour l'utilisateur connecté)
export const getUsersWithLikeStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const currentUserId = req.user?.userId;

    if (!currentUserId) {
      res.status(401).json({ error: 'Non authentifié' });
      return;
    }

    // Récupérer tous les utilisateurs sauf soi-même
    const users = await prisma.user.findMany({
      where: {
        NOT: { id: currentUserId },
      },
      select: {
        id: true,
        nickname: true,
        avatar: true,
        isOnline: true,
        activeCall: true,
        // On récupère les lignes où nous sommes le "follower" et l'autre est le "following"
        following: {
          where: { followingId: currentUserId }, // Ajuste selon le nom de ta relation inverse dans le schema Prisma
        },
      },
    });

    // Transformer les données pour injecter un booléen simple "isLiked"
    const formattedUsers = users.map((user) => {
      // Si le tableau following / followers contient une entrée, c'est que c'est liké
      const isLiked = user.following.length > 0;
      const { following, ...rest } = user;
      return {
        ...rest,
        isLiked,
      };
    });

    res.status(200).json(formattedUsers);
  } catch (error) {
    console.error("Erreur getUsersWithLikeStatus:", error);
    res.status(500).json({ error: "Erreur interne du serveur." });
  }
};