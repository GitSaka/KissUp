import { Request, Response } from 'express';
import { prisma } from '../../config/prisma.js';
import { tokenService } from './token.service.js';

export class LivekitController {
  static async getToken(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const { roomId } = req.body;

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

      // Check FULL - 4 max, mais si déjà dedans on le laisse re-rentrer
      const isAlreadyIn = room.participants.some(p => p.userId === userId);
      if (!isAlreadyIn && room.participants.length >= room.maxParticipants) {
        return res.status(403).json({ message: 'Room pleine (4 max)' });
      }

      // Upsert participant
      await prisma.roomParticipant.upsert({
        where: { roomId_userId: { roomId: room.id, userId } },
        create: { roomId: room.id, userId },
        update: {},
      });

      // WAITING -> ACTIVE dès 1 participant
      if (room.status === 'WAITING') {
        await prisma.kissUpRoom.update({
          where: { id: room.id },
          data: { status: 'ACTIVE' },
        });
      }

      const user = await prisma.user.findUnique({ where: { id: userId } });

      // Génère token avec livekitName (pas id DB)
      const result = await tokenService.generate(
        room.livekitName,
        userId,
        user?.nickname || 'Player'
      );

      return res.json({
        token: (result as any).token || result,
        livekitName: room.livekitName,
        roomId: room.id,
      });
    } catch (error: any) {
      console.error('[LiveKit getToken] FULL ERROR:', error);
      return res.status(500).json({ 
        message: 'Erreur token LiveKit', 
        error: error.message,
        details: String(error)
      });
    }
  }
}