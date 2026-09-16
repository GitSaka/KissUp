import { Response } from 'express';
import { prisma } from '../config/prisma.js';
import { AuthenticatedRequest } from '../middlewares/authMiddleware.js';

export const sendGift = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // On récupère l'ID de l'expéditeur directement depuis le token d'authentification pour plus de sécurité
    const senderId = req.user?.userId;
    const { receiverId, giftId, momentId, quantity = 1 } = req.body;

    if (!senderId) {
      res.status(401).json({ error: 'Non authentifié' });
      return;
    }

    if (!receiverId || !giftId) {
      res.status(400).json({ error: 'Paramètres manquants (receiverId ou giftId requis).' });
      return;
    }

    // 1. Récupérer le cadeau pour connaître son prix
    const gift = await prisma.gift.findUnique({
      where: { id: giftId },
    });

    if (!gift || !gift.isActive) {
      res.status(404).json({ error: "Cadeau introuvable ou inactif." });
      return;
    }

    const totalCoinsNeeded = gift.priceInCoins * quantity;
    // Règle de conversion : 1 coin dépensé = 0.5 diamant reversé
    const totalDiamondsEarned = Math.floor(totalCoinsNeeded * 0.5); 

    // 2. Vérifier le solde de l'expéditeur
    const sender = await prisma.user.findUnique({
      where: { id: senderId },
      select: { coins: true },
    });

    if (!sender || sender.coins < totalCoinsNeeded) {
      res.status(400).json({ error: "Solde de coins insuffisant." });
      return;
    }

    // 3. Exécuter la transaction financière sécurisée
    const result = await prisma.$transaction(async (tx) => {
      // A. Débiter l'expéditeur
      const updatedSender = await tx.user.update({
        where: { id: senderId },
        data: { coins: { decrement: totalCoinsNeeded } },
      });

      // B. Créditer le receveur en diamants
      const updatedReceiver = await tx.user.update({
        where: { id: receiverId },
        data: { diamonds: { increment: totalDiamondsEarned } },
      });

      // C. Enregistrer la GiftTransaction (avec liaison optionnelle au post via momentId)
      const giftTransaction = await tx.giftTransaction.create({
         data: {
          senderId: String(senderId),
          receiverId: String(receiverId),
          giftId: String(giftId),
          momentId: momentId ? String(momentId) : null,
          quantity: Number(quantity) || 1,
          totalCoins: Number(totalCoinsNeeded),
          totalDiamonds: Number(totalDiamondsEarned), // 🚀 REPLACÉ ET TYPÉ EN NUMBER !
        },
      });

      // D. Créer les traces dans le grand livre des transactions (Transactions Ledger)
      await tx.transaction.create({
        data: {
          userId: senderId,
          targetUserId: receiverId,
          type: 'GIFT_SEND',
          amountCoins: -totalCoinsNeeded,
          description: `Envoi de ${quantity}x ${gift.name}`,
          status: 'SUCCESS',
        },
      });

      await tx.transaction.create({
        data: {
          userId: receiverId,
          targetUserId: senderId,
          type: 'GIFT_RECEIVE',
          amountDiamonds: totalDiamondsEarned,
          description: `Réception de ${quantity}x ${gift.name}`,
          status: 'SUCCESS',
        },
      });

      return { giftTransaction, updatedSender, updatedReceiver };
    });

    res.status(200).json({
      message: "Cadeau envoyé avec succès !",
      data: result,
    });
  } catch (error) {
    console.error("Erreur lors de l'envoi du cadeau:", error);
    res.status(500).json({ error: "Erreur interne du serveur." });
  }
};


// 🚀 RENVOYER LE CATALOGUE DES CADEAUX RÉELS DE LA BASE NEON
export const getGiftsCatalog = async (req: any, res: any): Promise<void> => {
  try {
    const gifts = await prisma.gift.findMany({
      where: { isActive: true },
      orderBy: { priceInCoins: 'asc' } // Trie du moins cher au plus cher
    });

    res.status(200).json(gifts);
  } catch (error) {
    console.error("Erreur lors de la récupération des cadeaux:", error);
    res.status(500).json({ error: "Impossible de récupérer le catalogue des cadeaux." });
  }
};
