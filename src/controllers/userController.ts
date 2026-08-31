import { Response } from 'express';
import { prisma } from '../config/prisma.js'; // Ajustez selon votre chemin d'import Prisma
import { AuthenticatedRequest } from '../middlewares/authMiddleware.js';


export const getHomeUsers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { category } = req.query; // 'Recommandés', 'Nouveaux', 'En vedette'

    // Traduction automatique des onglets frontend vers vos énumérations Prisma (TabCategory)
    let dbCategory = 'RECOMMENDED';
    if (category === 'Nouveaux') dbCategory = 'NEW';
    if (category === 'En vedette') dbCategory = 'FEATURED';

    // Récupération des profils en direct depuis Neon
    const users = await prisma.user.findMany({
      where: {
        tabCategory: dbCategory as any,
      },
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
         activeCall: true,   // 👈 ajouté
        isVerified: true,   // 👈 ajouté (tu en auras besoin pour le badge vérifié)
        charmLevel: true,   // 👈 ajouté (pour le levelKey/badge niveau)
        wealthLevel: true,
      }
    });

    res.status(200).json(users);
  } catch (error) {
    console.error('Erreur getHomeUsers:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des profils réels' });
  }
};

export const getUserProfileById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // 🔒 LE CORRECTIF : On force TypeScript à comprendre que l'ID est une chaîne pure
    const id = req.params.id as string;

    const user = await prisma.user.findUnique({
      where: { id }, // La ligne rouge s'efface immédiatement !
      select: {
        id: true,
        nickname: true,
        avatar: true,
        gender: true,
        coins: true,
        diamonds: true,
        distance: true,
        isOnline: true,
        age: true,          
        height: true,       // 👈 Indispensable
        city: true,         // 👈 Indispensable
        country: true,      // 👈 Indispensable
        continent: true,    // 👈 Indispensable
        maritalStatus: true,// 👈 Indispensable
        relationGoal: true, // 👈 Indispensable
        lifeStory:true,
      studyPath:true,
      idealPartner:true,
        bio: true,
        wealthLevel: true,
        charmLevel: true,
        activeCall: true,   // 👈 ajouté
        isVerified: true,   // 👈 ajouté (tu en auras besoin pour le badge vérifié)
       
      }
    });

    if (!user) {
      res.status(404).json({ error: 'Utilisateur introuvable' });
      return;
    }

    res.status(200).json(user);
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
      lifeStory,
      studyPath,
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
        ...(lifeStory !== undefined && { lifeStory }),
        ...(studyPath !== undefined && { studyPath }),
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
