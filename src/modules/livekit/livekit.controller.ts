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

      // 1. Room + participants
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

      // Check FULL - 4 max, mais si déjà dedans on laisse re-rentrer
      const isAlreadyIn = room.participants.some((p) => p.userId === userId);
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

      // 2. Host séparé (évite l'erreur 'never')
      const host = await prisma.user.findUnique({
        where: { id: room.hostId },
        select: {
          id: true,
          nickname: true,
          avatar: true,
          coins: true,
          diamonds: true,
          coinsEarned: true,
        },
      });

      // 3. Current user
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { 
            id: true, 
            nickname: true, 
            avatar: true, 
            coins: true, 
            diamonds: true 
          },
      });

      // 4. Token LiveKit
      const result = await tokenService.generate(
        room.livekitName,
        userId,
        user?.nickname || 'Player'
      );

      // 5. Return token + vrai host (fini Luna)
      return res.json({
        token: (result as any).token || result,
        livekitName: room.livekitName,
        roomId: room.id,
        host: host, // { nickname, avatar, coins, diamonds } -> pour TopBar
        me: {
            id: user!.id,
            nickname: user!.nickname,
            avatar: user!.avatar,
            coins: user!.coins,
            diamonds: user!.diamonds,
          },
        room: {
          id: room.id,
          status: room.status,
          betAmount: room.betAmount,
          maxParticipants: room.maxParticipants,
        },


      });
    } catch (error: any) {
      console.error('[LiveKit getToken] FULL ERROR:', error);
      return res.status(500).json({
        message: 'Erreur token LiveKit',
        error: error.message,
        details: String(error),
      });
    }
  }
}