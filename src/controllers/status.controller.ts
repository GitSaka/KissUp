import { Request, Response } from 'express';

const FEDAPAY_BASE_URL =
  process.env.FEDAPAY_ENV === "live"
    ? "https://api.fedapay.com/v1"
    : "https://sandbox-api.fedapay.com/v1";

export async function checkPaymentStatus(req: Request, res: Response): Promise<any> {
  try {
    const transactionId = req.query.id;

    if (!transactionId) {
      return res.status(400).json({ error: "Paramètre 'id' manquant." });
    }

    const response = await fetch(
      `${FEDAPAY_BASE_URL}/transactions/${transactionId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.FEDAPAY_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }
    );

    const data: any = await response.json();

    if (!response.ok || !data["v1/transaction"]) {
      return res.status(404).json({ error: "Transaction introuvable." });
    }

    const transaction = data["v1/transaction"];

    return res.status(200).json({
      success: true,
      status: transaction.status, // "pending", "approved", "declined", "canceled"
      transactionId: transaction.id,
    });

  } catch (error: any) {
    return res.status(500).json({ error: "Erreur interne du serveur." });
  }
}