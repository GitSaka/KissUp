import { prisma } from '../config/prisma.js';
// 🚀 BLOC ÉTAPE PAR ÉTAPE : toggleFollow connecté au système de notifications cliquables Neon
export const toggleFollow = async (req, res) => {
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
        }
        else {
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
                    receiverId: targetUserId, // La fille ou l'homme ciblé qui reçoit la pastille rouge
                    senderId: followerId, // Toi (l'expéditeur de l'action)
                    type: isMatch ? 'SYSTEM' : 'LIKE', // Si c'est un match, on le traite en alerte système premium
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
    }
    catch (error) {
        console.error("Erreur toggleFollow:", error);
        res.status(500).json({ error: "Erreur interne du serveur." });
    }
};
// 2. Récupérer les utilisateurs avec l'état isLiked + filtre genre + pagination
export const getUsersWithLikeStatus = async (req, res) => {
    try {
        const currentUserId = req.user?.userId;
        if (!currentUserId) {
            res.status(401).json({ error: 'Non authentifié' });
            return;
        }
        // --- 1. Pagination et catégorie depuis l'URL ---
        const { page = '1', limit = '20', category } = req.query;
        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 20));
        const skip = (pageNum - 1) * limitNum;
        // --- 2. Mapping Recommandés / Nouveaux / En vedette -> Enum Prisma ---
        const categoryMap = {
            'Recommandés': 'RECOMMENDED',
            'Nouveaux': 'NEW',
            'En vedette': 'FEATURED',
            'RECOMMENDED': 'RECOMMENDED',
            'NEW': 'NEW',
            'FEATURED': 'FEATURED',
        };
        const tabCategoryFilter = category ? categoryMap[category] : undefined;
        // --- 3. Qui est connecté et qui il veut voir ---
        const currentUser = await prisma.user.findUnique({
            where: { id: currentUserId },
            select: { gender: true, interestedIn: true },
        });
        if (!currentUser) {
            res.status(404).json({ error: 'Utilisateur introuvable' });
            return;
        }
        let targetGender = undefined;
        if (currentUser.interestedIn) {
            // Si il a choisi "Je cherche", on respecte son choix
            targetGender = currentUser.interestedIn;
        }
        else if (currentUser.gender === 'MALE') {
            targetGender = 'FEMALE';
        }
        else if (currentUser.gender === 'FEMALE') {
            targetGender = 'MALE';
        }
        // Si OTHER et pas de interestedIn -> on ne filtre pas, on montre tout
        // --- 4. Requête optimisée ---
        const users = await prisma.user.findMany({
            where: {
                NOT: { id: currentUserId },
                ...(targetGender ? { gender: targetGender } : {}),
                ...(tabCategoryFilter ? { tabCategory: tabCategoryFilter } : {}),
                // Optionnel: si tu ne veux pas montrer les bots, décommente :
                // isBot: false,
            },
            select: {
                id: true,
                nickname: true,
                avatar: true,
                coins: true,
                isOnline: true,
                activeCall: true,
                distance: true,
                isVerified: true,
                bio: true,
                followers: {
                    where: { followerId: currentUserId },
                    select: { followerId: true }
                },
                _count: {
                    select: {
                        followers: true,
                        following: true,
                        receivedGifts: true,
                    }
                }
            },
            skip,
            take: limitNum,
            orderBy: tabCategoryFilter === 'NEW' ? { createdAt: 'desc' } : { lastSeen: 'desc' },
        });
        const formattedUsers = users.map((user) => {
            const isLiked = user.followers.length > 0;
            const { followers, ...rest } = user;
            return { ...rest, isLiked };
        });
        res.status(200).json(formattedUsers);
    }
    catch (error) {
        console.error("Erreur getUsersWithLikeStatus:", error);
        res.status(500).json({ error: "Erreur interne du serveur." });
    }
};
