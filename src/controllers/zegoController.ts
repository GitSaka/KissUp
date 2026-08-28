import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/authMiddleware.js';
import { generateZegoToken } from '../utils/zegoToken.js';

export const getZegoToken = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userID = req.user?.userId;

    if (!userID) {
      res.status(401).json({ error: "Identification de l'utilisateur impossible via le jeton." });
      return;
    }

    const appID = Number(process.env.ZEGO_APP_ID);
    const serverSecret = process.env.ZEGO_SERVER_SECRET;

    if (!appID || !serverSecret) {
      res.status(500).json({ error: 'Configuration Zego manquante sur le serveur.' });
      return;
    }

    const token = generateZegoToken(appID, serverSecret, userID, 7200); // valide 2h

    res.status(200).json({ token });
  } catch (error) {
    console.error('Erreur lors de la génération du token Zego:', error);
    res.status(500).json({ error: 'Erreur interne du serveur lors du traitement vidéo.' });
  }
};