import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const FEDAPAY_BASE_URL =
  process.env.FEDAPAY_ENV === "live"
    ? "https://api.fedapay.com/v1"
    : "https://sandbox-api.fedapay.com/v1";

export async function handleFedaPayWebhook(req: Request, res: Response): Promise<any> {
  try {
    const body: any = req.body;
    const eventType = body.event;
    const transactionData = body.entity;

    if (eventType === "transaction.approved" && transactionData) {
      const transactionId = transactionData.id;
      const reference = transactionData.reference;

      // Double vérification anti-fraude auprès de l'API FedaPay
      const verifResponse = await fetch(
        `${FEDAPAY_BASE_URL}/transactions/${transactionId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${process.env.FEDAPAY_SECRET_KEY}`,
            "Content-Type": "application/json",
          },
          cache: "no-store",
        }
      );

      const verifData: any = await verifResponse.json();
      const transaction = verifData["v1/transaction"];

      if (!verifResponse.ok || transaction?.status !== "approved") {
        console.warn(`⚠️ Fraude suspectée ou transaction non approuvée — ID : ${transactionId}`);
        return res.status(400).json({ error: "Vérification de sécurité échouée." });
      }

      // Recherche de la transaction en base
      const dbTransaction = await prisma.transaction.findFirst({
        where: { gatewayReference: reference },
      });

      if (!dbTransaction) {
        return res.status(404).json({ error: "Transaction introuvable en base." });
      }

      if (dbTransaction.status === "SUCCESS") {
        return res.status(200).json({ received: true, message: "Déjà traité." });
      }

     // Transaction atomique Prisma : Validation de la commande + Crédit des pièces
      await prisma.$transaction([
        prisma.transaction.update({
          where: { id: dbTransaction.id },
          data: { status: "SUCCESS" },
        }),
        prisma.user.update({
          where: { id: dbTransaction.userId },
          data: {
            coins: {
              increment: dbTransaction.amountCoins ?? 0, // Sécurité si amountCoins est null
            },
          },
        }),
      ]);

      console.log(`💾 Succès : ${dbTransaction.amountCoins} pièces créditées à l'utilisateur ${dbTransaction.userId}`);
    }

    return res.status(200).json({ received: true });

  } catch (error: any) {
    console.error("💥 Erreur serveur Webhook :", error);
    return res.status(500).json({ error: "Erreur interne du webhook." });
  }
}