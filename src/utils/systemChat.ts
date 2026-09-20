import { prisma } from '../config/prisma.js';

/**
 * 🤖 Envoie un message automatique ou une notification officielle de la part de la KissMe Team
 * @param receiverId ID de l'utilisateur qui doit recevoir le message
 * @param content Texte du message officiel
 * @param type Optionnel : Le type de message (TEXT, IMAGE, etc.)
 */
export const sendSystemMessage = async (
  receiverId: string, 
  content: string, 
  type: 'TEXT' | 'IMAGE' | 'VIDEO' = 'TEXT'
): Promise<any> => {
  try {
    const SYSTEM_BOT_ID = 'system_kissme_team';

    // 1. Double Sécurité : On s'assure que le compte virtuel KissMe Team existe bien en base
    let systemUser = await prisma.user.findUnique({ where: { id: SYSTEM_BOT_ID } });
    
    if (!systemUser) {
      systemUser = await prisma.user.create({
        data: {
          id: SYSTEM_BOT_ID,
          nickname: 'KissMe Team',
          avatar: 'https://placeholder.com', // Mets l'URL de ton logo officiel
          password: 'system_secret_secure_password_never_used_by_humans',
          isVerified: true,
          isBot: true,
          coins: 0,
        }
      });
    }

    // 2. On insère le message officiel dans la table Prisma Message
    const message = await prisma.message.create({
      data: {
        senderId: SYSTEM_BOT_ID,
        receiverId,
        type,
        content,
        isRead: false
      }
    });

    // 🚀 NOTE : Plus tard, c'est ici qu'on ajoutera la ligne du push token Firebase 
    // pour réveiller le téléphone si l'application de l'utilisateur est fermée !

    return message;
  } catch (error) {
    console.error('Erreur dans sendSystemMessage:', error);
    return null;
  }
};
