import { Response } from 'express';
import crypto from 'crypto';
import { AuthenticatedRequest } from '../middlewares/authMiddleware.js';

export const getZegoToken = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userID = req.user?.userId;

    if (!userID) {
      res.status(401).json({ error: 'Identification de l\'utilisateur impossible via le jeton.' });
      return;
    }

    const appID = Number(process.env.ZEGO_APP_ID);
    const serverSecret = process.env.ZEGO_SERVER_SECRET;

    if (!appID || !serverSecret) {
      res.status(500).json({ error: "Configuration Zego manquante sur le serveur." });
      return;
    }

    const effectiveTimeInSeconds = 7200; // 2 heures
    const createTime = Math.floor(Date.now() / 1000);
    const expireTime = createTime + effectiveTimeInSeconds;

    // 1. Structure JSON exigée par Zego (Token04)
    const tokenInfo = {
      app_id: appID,
      user_id: userID,
      nonce: Math.floor(Math.random() * 2147483647),
      ctime: createTime,
      expire: expireTime,
      payload: ''
    };

    const tokenJson = JSON.stringify(tokenInfo);

    // 2. Chiffrer en AES-128-CBC avec le ServerSecret
    const iv = crypto.randomBytes(16);
    // Le ServerSecret de Zego fait exactement 32 caractères
    const key = Buffer.from(serverSecret, 'utf8'); 
    
    if (key.length !== 32) {
      res.status(500).json({ error: "Le ZEGO_SERVER_SECRET doit faire exactement 32 caractères." });
      return;
    }

    const cipher = crypto.createCipheriv('aes-128-cbc', key, iv);
    let encrypted = cipher.update(tokenJson, 'utf8', 'binary');
    encrypted += cipher.final('binary');

    // 3. Assemblage du buffer binaire final au format Zego
    const bVersion = Buffer.from([2]); // Version 2 / Token04
    const bIv = Buffer.from(iv);
    const bEncrypted = Buffer.from(encrypted, 'binary');

    const bIvLen = Buffer.alloc(2);
    bIvLen.writeUInt16BE(bIv.length, 0);

    const bEncryptedLen = Buffer.alloc(2);
    bEncryptedLen.writeUInt16BE(bEncrypted.length, 0);

    const finalBuffer = Buffer.concat([
      bVersion,
      bIvLen,
      bIv,
      bEncryptedLen,
      bEncrypted
    ]);

    const token = finalBuffer.toString('base64');

    res.status(200).json({ token });
  } catch (error) {
    console.error('Erreur lors de la génération du token Zego:', error);
    res.status(500).json({ error: 'Erreur interne du serveur lors du traitement vidéo.' });
  }
};