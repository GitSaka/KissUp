import { Response } from 'express';
import { prisma } from '../config/prisma.js'; // Ajustez selon votre chemin d'import Prisma
import { AuthenticatedRequest } from '../middlewares/authMiddleware.js';



export const getHomeUsers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { category } = req.query; // 'Recommandés', 'Nouveaux', 'En vedette'
    const currentUserId = req.user?.userId;

    // 🚀 FONCTION MIROIR CHIRURGICALE : Définir le filtre par défaut
    let whereClause: any = {
      ...(currentUserId && { NOT: { id: currentUserId } }),
    };

    // Si un utilisateur est authentifié, on adapte l'accueil selon son profil
    if (currentUserId) {
      const currentUser = await prisma.user.findUnique({
        where: { id: currentUserId },
        select: { gender: true }
      });

      if (currentUser) {
        // 🎯 RÈGLE METIER COEUR : Si c'est un Homme (MALE), il ne voit QUE des Femmes (FEMALE), et inversement !
        const inverseGender = currentUser.gender === 'MALE' ? 'FEMALE' : 'MALE';
        
        whereClause = {
          NOT: { id: currentUserId },
          gender: inverseGender // ⚡️ Seuls les profils du sexe opposé (vrais + robots) s'affichent !
        };
      }
    }

    let orderBy: any = {};

    // ⚡️ Logique dynamique selon l'onglet sélectionné sur l'application mobile
    if (category === 'Nouveaux') {
      orderBy = { createdAt: 'desc' };
    } 
    else if (category === 'En vedette') {
      orderBy = [
        { isVip: 'desc' },
        { charmLevel: 'desc' },
        { wealthLevel: 'desc' }
      ];
    } 
    else {
      // 'Recommandés' (Par défaut) : D'abord ceux qui sont en ligne, puis une activité récente
      orderBy = [
        { isOnline: 'desc' },
        { updatedAt: 'desc' }
      ];
    }

    // Récupération des profils depuis Neon via Prisma
    const users = await prisma.user.findMany({
      where: whereClause,
      orderBy: orderBy,
      take: 30,
      select: {
        id: true,
        nickname: true,
        avatar: true,
        gender: true,
        coins: true,
        diamonds: true,
        distance: true,
        isOnline: true,
        bio: true,
        activeCall: true,
        isVerified: true,
        charmLevel: true,
        wealthLevel: true,
        isVip: true,
        createdAt: true,
        followers: {
          where: { followerId: currentUserId || '' },
        },
      }
    });

    // Transformation pour injecter proprement le booléen isLiked attendu par ton front-end
    const formattedUsers = users.map((user) => {
      const isLiked = user.followers.length > 0;
      const { followers, ...rest } = user;
      return {
        ...rest,
        isLiked,
      };
    });

    res.status(200).json(formattedUsers);
  } catch (error) {
    console.error('Erreur getHomeUsers dynamique:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des profils' });
  }
};

export const getUserProfileById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const currentUserId = req.user?.userId; // Celui qui clique pour regarder
    const id = req.params.id as string; // Le profil qui est regardé

    if (!currentUserId) {
      res.status(401).json({ error: 'Non authentifié' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        nickname: true,
        avatar: true,
        gender: true,
        interestedIn: true,
        coins: true,
        diamonds: true,
        distance: true,
        isOnline: true,
        age: true,          
        height: true,       
        city: true,         
        country: true,      
        continent: true,    
        maritalStatus: true,
        relationGoal: true, 
        primarySchool: true,
        highSchool: true,
        university: true,
        favoriteFood: true,
        passion: true,
        futureMotivation: true,
        idealPartner: true,
        bio: true,
        wealthLevel: true,
        charmLevel: true,
        activeCall: true,   
        isVerified: true,
        isBot: true, // ⚡️ Ajouté pour s'assurer d'avoir l'information du bot dans l'objet user récupéré
        
        // 🔍 C'est ICI qu'on vérifie si le visiteur s'abonne à ce profil
        followers: {
          where: { followerId: currentUserId },
          select: { followerId: true }
        },

        photos: {
          select: {
            id: true,
            imageUrl: true,
            createdAt: true,
          }
        },
        _count: {
          select: {
            followers: true,
            following: true,
            receivedGifts: true,
          }
        }
      }
    });

    if (!user) {
      res.status(404).json({ error: 'Utilisateur introuvable' });
      return;
    }

    // 🚀 GESTION INTELLIGENTE DE LA VISITE DU PROFIL (Uniquement si ce n'est pas un bot et que ce n'est pas son propre profil)
    if (currentUserId !== id && !user.isBot) {
      const nameOfVisitor = req.user?.nickname || 'Un utilisateur';
      
      // 1. Définir une limite de temps (ex: 12 heures)
      const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);

      // 2. Vérifier s'il existe déjà une notification de visite récente de CETTE personne
      const existingVisit = await prisma.notification.findFirst({
        where: {
          receiverId: id,           // Propriétaire du profil
          senderId: currentUserId,  // Visiteur
          type: 'VISIT',
          createdAt: {
            gte: twelveHoursAgo,    // Créée il y a moins de 12h
          },
        },
      });

      if (existingVisit) {
        // 3A. Si elle existe déjà : on met juste à jour sa date et on la repasse en non lue
        await prisma.notification.update({
          where: { id: existingVisit.id },
          data: {
            createdAt: new Date(), // Actualise l'heure pour la faire remonter en haut de la liste
            isRead: false,         // Remet en non-lu pour l'alerte
          },
        });
      } else {
        // 3B. Sinon : on crée une toute nouvelle notification de visite
        await prisma.notification.create({
          data: {
            receiverId: id,            
            senderId: currentUserId,   
            type: 'VISIT',
            title: 'Nouvelle visite ! 👀',
            content: `${nameOfVisitor} a visité votre profil.`,
            actionUrl: `/profile/${currentUserId}`, 
            isRead: false,
          },
        });
      }

      // (Optionnel) Émission WebSockets si configurée
    }

    // On vérifie si le tableau followers contient quelqu'un
    const isFollowing = user.followers && user.followers.length > 0;

    // On retire le tableau followers brut (et éventuellement isBot si tu ne veux pas l'exposer au front, ou laisse-le si besoin) et on ajoute le booléen
    const { followers, ...safeUser } = user;
    const finalUserData = {
      ...safeUser,
      isFollowing,
    };

    res.status(200).json(finalUserData);
  } catch (error) {
    console.error('Erreur getUserProfileById:', error);
    res.status(500).json({ error: 'Erreur lors du chargement du profil' });
  }
};



export const updateUserProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const targetUserId = req.params.id as string;
    const authenticatedUserId = req.user?.userId;

    if (authenticatedUserId && targetUserId !== authenticatedUserId) {
      res.status(403).json({ error: 'Action non autorisée.' });
      return;
    }

    const {
      nickname,
      bio,
      gender,
      interestedIn,
      age,
      height,
      city,
      country,
      continent,
      maritalStatus,
      relationGoal,
      primarySchool,
      highSchool,
      university,
      favoriteFood,
      passion,
      futureMotivation,
      idealPartner,
    } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: {
        ...(nickname !== undefined && { nickname }),
        ...(bio !== undefined && { bio }),
        ...(gender !== undefined && { gender: gender as any }),
        ...(interestedIn !== undefined && { interestedIn: interestedIn as any }),
        ...(age !== undefined && { age: age ? Number(age) : null }),
        ...(height !== undefined && { height }),
        ...(city !== undefined && { city }),
        ...(country !== undefined && { country }),
        ...(continent !== undefined && { continent }),
        ...(maritalStatus !== undefined && { maritalStatus }),
        ...(relationGoal !== undefined && { relationGoal: relationGoal as any }),
        ...(primarySchool !== undefined && { primarySchool }),
        ...(highSchool !== undefined && { highSchool }),
        ...(university !== undefined && { university }),
        ...(favoriteFood !== undefined && { favoriteFood }),
        ...(passion !== undefined && { passion }),
        ...(futureMotivation !== undefined && { futureMotivation }),
        ...(idealPartner !== undefined && { idealPartner }),
      },
      select: {
        id: true,
        nickname: true,
        bio: true,
        gender: true,
        interestedIn: true,
        age: true,
        height: true,
        city: true,
        country: true,
        continent: true,
        maritalStatus: true,
        relationGoal: true,
        lifeStory: true,
        studyPath: true,
        idealPartner: true,
      }
    });

    res.status(200).json({
      message: 'Profil mis à jour avec succès',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Erreur updateUserProfile:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du profil' });
  }
};


export const addUserPhoto = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId; 
    
    console.log("Données reçues pour l'ajout de photo - userId:", userId, "body:", req.body);

    // On accepte soit req.body.url, soit req.body.imageUrl pour éviter le plantage 400
    const imageUrl = req.body.url || req.body.imageUrl;

    if (!userId || !imageUrl) {
      res.status(400).json({ error: "Données manquantes (userId ou URL de l'image)." });
      return;
    }

    // Vérification de la limite des 8 photos
    const count = await prisma.userPhoto.count({ where: { userId } });
    if (count >= 8) {
      res.status(400).json({ error: "Limite de 8 photos atteinte." });
      return;
    }

    const newPhoto = await prisma.userPhoto.create({
      data: { userId, imageUrl },
    });

    res.status(201).json({ message: "Photo ajoutée avec succès", photo: newPhoto });
  } catch (error) {
    console.error("Erreur addUserPhoto détaillée:", error);
    res.status(500).json({ error: "Erreur serveur lors de l'ajout de la photo." });
  }
};


export const updateProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId; // Utilise userId selon ton middleware verifyJwt
    if (!userId) {
      res.status(401).json({ error: "Non autorisé." });
      return;
    }

    // Récupère les champs que l'on souhaite autoriser à modifier (ici l'avatar, mais tu pourras y ajouter la bio, l'âge, etc.)
    const { avatar, bio, age, height, city, country, continent, maritalStatus, relationGoal } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(avatar && { avatar }),
        ...(bio !== undefined && { bio }),
        ...(age !== undefined && { age }),
        ...(height !== undefined && { height }),
        ...(city !== undefined && { city }),
        ...(country !== undefined && { country }),
        ...(continent !== undefined && { continent }),
        ...(maritalStatus !== undefined && { maritalStatus }),
        ...(relationGoal !== undefined && { relationGoal }),
      },
    });

    res.status(200).json({ message: "Profil mis à jour avec succès", user: updatedUser });
  } catch (error) {
    console.error("Erreur updateProfile:", error);
    res.status(500).json({ error: "Erreur serveur lors de la mise à jour du profil." });
  }
};


//delete photo
export const deleteUserPhoto = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const rawPhotoId = req.params.photoId;
    const photoId = Array.isArray(rawPhotoId) ? rawPhotoId[0] : rawPhotoId;

    if (!userId || !photoId) {
      res.status(400).json({ error: "Paramètres manquants ou non valides." });
      return;
    }

    const photo = await prisma.userPhoto.findUnique({ where: { id: photoId } });

    if (!photo) {
      res.status(404).json({ error: "Photo introuvable." });
      return;
    }

    if (photo.userId !== userId) {
      res.status(403).json({ error: "Action non autorisée." });
      return;
    }

    await prisma.userPhoto.delete({ where: { id: photoId } });

    res.status(200).json({ message: "Photo supprimée avec succès." });
  } catch (error) {
    console.error("Erreur deleteUserPhoto:", error);
    res.status(500).json({ error: "Erreur serveur lors de la suppression." });
  }
};