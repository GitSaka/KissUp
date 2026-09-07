import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const FEDAPAY_BASE_URL =
  process.env.FEDAPAY_ENV === "live"
    ? "https://api.fedapay.com/v1"
    : "https://sandbox-api.fedapay.com/v1";

export async function initiateDirectPayment(req: any, res: Response): Promise<any> {
  try {
    const userId = req.user?.userId; // Via ton middleware JWT
    const { amountCoins, totalPaid, clientPhone, network, clientName } = req.body;

    if (!userId || !totalPaid || !clientPhone || !network || !amountCoins) {
      return res.status(400).json({ error: "Paramètres de paiement manquants." });
    }

    // Nettoyage et formatage du numéro (indicatif 229 pour le Bénin)
    const telephoneNettoye = clientPhone.replace(/\s+/g, "").replace("+", "");
    const telephoneComplet = telephoneNettoye.startsWith("229")
      ? telephoneNettoye
      : `229${telephoneNettoye}`;

    const modePaiement = network.toLowerCase(); // "mtn" ou "moov"
    const methodesDisponibles: Record<string, string> = {
      mtn: "mtn_open",
      moov: "moov",
    };

    const methodePaiement = methodesDisponibles[modePaiement];
    if (!methodePaiement) {
      return res.status(422).json({ error: "Réseau non supporté. Utilisez mtn ou moov." });
    }

    // 1. Initialisation de la transaction chez FedaPay
    const creationResponse = await fetch(`${FEDAPAY_BASE_URL}/transactions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.FEDAPAY_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: Number(totalPaid),
        currency: { iso: "XOF" },
        description: `Achat de ${amountCoins} pièces`,
        customer: {
          firstname: clientName || "Client",
          lastname: "Dating",
          email: `${telephoneComplet}@dating-app.com`,
          phone_number: {
            number: telephoneComplet,
            country: "bj",
          },
        },
      }),
    });

    const creationData: any = await creationResponse.json();
    const transaction = creationData["v1/transaction"];

    if (!creationResponse.ok || !transaction) {
      console.error("❌ Erreur FedaPay Création:", creationData);
      return res.status(400).json({ error: "Impossible d'initialiser la transaction FedaPay." });
    }

    const fedapayTransactionId = transaction.id;
    const paymentToken = transaction.payment_token;
    const transactionReference = transaction.reference;

    // 2. Enregistrement en base de données avec Prisma (Statut PENDING)
    await prisma.transaction.create({
      data: {
        userId: userId,
        type: "TOPUP",
        amountCoins: Number(amountCoins),
        fiatAmount: Number(totalPaid),
        fiatCurrency: "XOF",
        gateway: "fedapay",
        status: "PENDING",
        gatewayReference: transactionReference,
        description: `Recharge de ${amountCoins} pièces via ${network.toUpperCase()}`,
      },
    });

    // 3. Déclenchement du push de paiement direct sur le mobile
    const chargeResponse = await fetch(
      `${FEDAPAY_BASE_URL}/${methodePaiement}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.FEDAPAY_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: paymentToken,
          phone_number: {
            number: telephoneComplet,
            country: "bj",
          },
        }),
      }
    );

    const chargeText = await chargeResponse.text();
    const chargeData = chargeText ? JSON.parse(chargeText) : {};

    if (!chargeResponse.ok) {
      console.error("❌ Erreur FedaPay Direct Charge:", chargeData);
      return res.status(400).json({ error: "L'opérateur Mobile Money a rejeté la demande." });
    }

    return res.status(200).json({
      success: true,
      message: "Demande de paiement envoyée sur votre téléphone.",
      transactionId: fedapayTransactionId,
      transactionRef: transactionReference,
    });

  } catch (error: any) {
    console.error("💥 Erreur serveur Checkout:", error);
    return res.status(500).json({ error: "Erreur interne du serveur de paiement." });
  }
}