import { Request, Response } from 'express';
import { prisma } from '../../config/prisma.js';
import { tokenService } from './token.service.js';


export class LivekitController {
  static async getToken(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id; // vient de ton middleware auth
      const { roomId } = req.body;

      if (!roomId) {
        return res.status(400).json({ message: 'roomId manquant' });
      }

      // 1. On cherche la room KissUp
      const room = await prisma.kissUpRoom.findUnique({
        where: { id: roomId },
      });

      if (!room) {
        return res.status(404).json({ message: 'Room not found' });
      }

      // 2. On ajoute le user comme participant si pas déjà dedans
      await prisma.roomParticipant.upsert({
        where: {
          roomId_userId: {
            roomId: room.id,
            userId: userId,
          },
        },
        create: {
          roomId: room.id,
          userId: userId,
        },
        update: {},
      });

      // 3. On récupère le pseudo du user
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      // 4. On génère le token LiveKit
      const result = await tokenService.generate(
        room.livekitName,
        userId,
        user?.nickname || 'Player'
      );

      return res.json(result);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Erreur token LiveKit' });
    }
  }
}