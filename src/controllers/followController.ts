import { Response } from 'express';
import { prisma } from '../config/prisma.js';
import { AuthenticatedRequest } from '../middlewares/authMiddleware.js';

// 🚀 BLOC ÉTAPE PAR ÉTAPE : toggleFollow connecté au système de notifications cliquables Neon
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

      // 🚀 INSERTION ÉTAPE 1 : Création de la notification dans ta table Prisma
      const myNickname = req.user?.nickname || 'Quelqu\'un';
      const notificationTitle = isMatch ? "C'est un Match ! 💘" : "Nouveau coup de foudre ! ⚡";
      const notificationContent = isMatch 
        ? `Vous et ${myNickname} vous aimez mutuellement ! Discutez maintenant.` 
        : `${myNickname} a aimé votre profil.`;

      await prisma.notification.create({
        data: {
          receiverId: targetUserId,            // La fille ou l'homme ciblé qui reçoit la pastille rouge
          senderId: followerId,               // Toi (l'expéditeur de l'action)
          type: isMatch ? 'SYSTEM' : 'LIKE',  // Si c'est un match, on le traite en alerte système premium
          title: notificationTitle,
          content: notificationContent,
          actionUrl: isMatch ? `/chat/${followerId}` : `/profile/${followerId}`, // 🚀 Malin : Si Match, redirige direct sur le chat ! Si simple like, sur le profil.
          isRead: false
        }
      });

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


// 2. Récupérer les utilisateurs avec l'état isLiked exact pour l'utilisateur connecté
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
        distance: true,
        isVerified: true,
        // On vérifie si l'utilisateur connecté (currentUserId) fait partie de ceux qui suivent ce profil,
        // OU plus exactement : est-ce que l'utilisateur connecté a créé un follow vers cet utilisateur ?
        // On interroge la liste des "followers" de cet utilisateur pour voir si "currentUserId" y est.
        followers: {
          where: { followerId: currentUserId },
        },
      },
    });

    // Transformer les données pour injecter un booléen simple "isLiked"
    const formattedUsers = users.map((user) => {
      // Si le tableau des followers contient l'ID de l'utilisateur connecté, c'est qu'il l'a liké
      const isLiked = user.followers.length > 0;
      const { followers, ...rest } = user;
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