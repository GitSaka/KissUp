// À remplacer dans src/modules/livekit/livekit.controller.ts
// Ajoute check FULL + passage ACTIVE

import { Request, Response } from 'express';
import { prisma } from '../../config/prisma.js';
import { tokenService } from './token.service.js';

export class LivekitController {
  static async getToken(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { roomId } = req.body; // roomId = id DB (uuid), pas livekitName

      if (!roomId) {
        return res.status(400).json({ message: 'roomId manquant' });
      }

      const room = await prisma.kissUpRoom.findUnique({
        where: { id: roomId },
        include: { participants: true },
      });

      if (!room) {
        return res.status(404).json({ message: 'Room not found' });
      }

      if (room.status === 'FINISHED') {
        return res.status(403).json({ message: 'Salon fermé' });
      }

      // Check FULL avant upsert
      const isAlreadyIn = room.participants.some(p => p.userId === userId);
      if (!isAlreadyIn && room.participants.length >= room.maxParticipants) {
        return res.status(403).json({ message: 'Room pleine (4 max)' });
      }

      // Upsert participant
      await prisma.roomParticipant.upsert({
        where: {
          roomId_userId: { roomId: room.id, userId },
        },
        create: { roomId: room.id, userId },
        update: {},
      });

      // Passe en ACTIVE dès qu'il y a 1 participant
      if (room.status === 'WAITING') {
        await prisma.kissUpRoom.update({
          where: { id: room.id },
          data: { status: 'ACTIVE' },
        });
      }

      const user = await prisma.user.findUnique({ where: { id: userId } });

      const result = await tokenService.generate(
        room.livekitName, // on envoie livekitName à LiveKit, pas l'id DB
        userId,
        user?.nickname || 'Player'
      );

      // On renvoie aussi livekitName et url pour CallManager
      return res.json({
        ...result,
        livekitName: room.livekitName,
        roomId: room.id,
      });
    } catch (error) {
      console.error('[LiveKit getToken]', error);
      return res.status(500).json({ message: 'Erreur token LiveKit' });
    }
  }
}
