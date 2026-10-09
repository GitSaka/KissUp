import { Request, Response } from 'express';
import { prisma } from '../../config/prisma.js';

export class KissUpRoomController {
  // POST /api/kissup-rooms
  static async create(req: Request, res: Response) {
    try {
      const hostId = (req as any).user.id;

      // 1. Anti 10 salons : si j'ai déjà WAITING ou ACTIVE, je le réutilise
      const existing = await prisma.kissUpRoom.findFirst({
        where: {
          hostId,
          status: { in: ['WAITING', 'ACTIVE'] },
        },
        include: {
          host: { select: { id: true, nickname: true, avatar: true } },
          participants: true,
        },
      });

      if (existing) {
        return res.json(existing);
      }

      // 2. Génère livekitName unique côté backend (pas mobile)
      const livekitName = `kissup_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      const room = await prisma.kissUpRoom.create({
        data: {
          livekitName,
          hostId,
          maxParticipants: 4,
          status: 'WAITING',
          gameType: 'NONE',
          betAmount: 0,
        },
        include: {
          host: { select: { id: true, nickname: true, avatar: true } },
          participants: true,
        },
      });

      return res.status(201).json(room);
    } catch (e) {
      console.error('[KissUpRoom create]', e);
      return res.status(500).json({ message: 'Erreur création salon' });
    }
  }

  // GET /api/kissup-rooms/open
  static async listOpen(req: Request, res: Response) {
    try {
      const rooms = await prisma.kissUpRoom.findMany({
        where: {
          status: { in: ['WAITING', 'ACTIVE'] },
        },
        include: {
          host: { select: { id: true, nickname: true, avatar: true } },
          participants: {
            include: { user: { select: { id: true, nickname: true, avatar: true } } },
          },
          _count: { select: { participants: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Filtre les pleins (4/4) côté JS - simple et sûr
      const openRooms = rooms.filter(r => r.participants.length < r.maxParticipants);

      return res.json(openRooms);
    } catch (e) {
      console.error('[KissUpRoom listOpen]', e);
      return res.status(500).json({ message: 'Erreur liste salons' });
    }
  }

  // GET /api/kissup-rooms/my/open
  static async myOpen(req: Request, res: Response) {
    try {
      const hostId = (req as any).user.id;

      const room = await prisma.kissUpRoom.findFirst({
        where: { hostId, status: { in: ['WAITING', 'ACTIVE'] } },
        include: {
          host: { select: { id: true, nickname: true, avatar: true } },
          participants: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      return res.json(room || null);
    } catch (e) {
      console.error('[KissUpRoom myOpen]', e);
      return res.status(500).json({ message: 'Erreur check salon' });
    }
  }

  // POST /api/kissup-rooms/:id/leave
  static async leave(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const roomId = req.params.id as string;

      // Supprime ma ligne participant
      await prisma.roomParticipant.deleteMany({
        where: { roomId, userId },
      });

      const remaining = await prisma.roomParticipant.findMany({
        where: { roomId },
        orderBy: { joinedAt: 'asc' },
      });

      if (remaining.length === 0) {
        // Plus personne -> FINISHED
        await prisma.kissUpRoom.update({
          where: { id: roomId },
          data: { status: 'FINISHED' },
        });
      } else {
        // Si c'était le host qui part, transfère au plus ancien
        const room = await prisma.kissUpRoom.findUnique({ where: { id: roomId } });
        if (room && room.hostId === userId) {
          await prisma.kissUpRoom.update({
            where: { id: roomId },
            data: { hostId: remaining[0].userId },
          });
        }
      }

      return res.json({ success: true });
    } catch (e) {
      console.error('[KissUpRoom leave]', e);
      return res.status(500).json({ message: 'Erreur leave' });
    }
  }
}
