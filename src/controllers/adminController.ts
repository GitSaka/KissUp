import { Response } from 'express';
import { prisma } from '../config/prisma.js';
import { AuthenticatedRequest } from '../middlewares/authMiddleware.js';
import { sendSystemMessage } from '../utils/systemChat.js';

// ✍️ Envoyer un message personnalisé à TOUS les utilisateurs inscrits de la plateforme (Annonce Globale)
export const broadcastAdminMessage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { text } = req.body;

    if (!text || text.trim() === '') {
      res.status(400).json({ error: 'Le contenu du message ne peut pas être vide.' });
      return;
    }

    // 1. Sécurité Admin : Vérifie si le compte qui initie la requête est un vrai administrateur
    // (Tu peux ajuster selon ton système de rôles, par exemple si req.user.role === 'ADMIN' ou isVip)
    const adminId = req.user?.userId;
    if (!adminId) {
      res.status(401).json({ error: 'Non authentifié.' });
      return;
    }

    // 2. On récupère la liste de TOUS les vrais utilisateurs (On exclut le bot système lui-même)
    const allUsers = await prisma.user.findMany({
      where: {
        NOT: { id: 'system_kissme_team' }
      },
      select: { id: true }
    });

    // 3. Boucle d'envoi massive et asynchrone (Promise.all garantit la rapidité sans bloquer le serveur)
    await Promise.all(
      allUsers.map((user) => sendSystemMessage(user.id, text.trim()))
    );

    res.status(200).json({ 
      success: true, 
      message: `Annonce globale envoyée avec succès à ${allUsers.length} utilisateurs.` 
    });
  } catch (error) {
    console.error('Erreur dans broadcastAdminMessage:', error);
    res.status(500).json({ error: 'Une erreur est survenue lors de la diffusion de l\'annonce.' });
  }
};
