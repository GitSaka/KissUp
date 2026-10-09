import { Request, Response } from 'express';
import { prisma } from '../../config/prisma.js';

export class KissUpRoomController {
  // POST /api/kissup-rooms
  static async create(req: Request, res: Response) {
    try {
      const hostId = (req as any).user.userId;
      if (!hostId) {
        return res.status(401).json({ message: 'Non authentifié' });
      }

      // Anti 10 salons : réutilise seulement si vraiment WAITING/ACTIVE et pas vieux test
      const existing = await prisma.kissUpRoom.findFirst({
        where: {
          hostId,
          status: { in: ['WAITING', 'ACTIVE'] },
          NOT: { livekitName: { startsWith: 'kissup_test_' } },
        },
        include: {
          host: { select: { id: true, nickname: true, avatar: true } },
          participants: {
            include: { user: { select: { id: true, nickname: true, avatar: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (existing) {
        return res.json(existing);
      }

      // Génère livekitName unique côté backend
      const livekitName = `kissup_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      const room = await prisma.kissUpRoom.create({
        data: {
          livekitName,
          hostId,
          maxParticipants: 4,
          status: 'WAITING',
        },
        include: {
          host: { select: { id: true, nickname: true, avatar: true } },
          participants: {
            include: { user: { select: { id: true, nickname: true, avatar: true } } },
          },
        },
      });

      return res.status(201).json(room);
    } catch (e: any) {
      console.error('[KissUpRoom create] ERREUR:', e);
      return res.status(500).json({
        message: 'Erreur création salon',
        error: e.message,
        details: String(e)
      });
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

      const openRooms = rooms.filter(r => r.participants.length < r.maxParticipants);
      return res.json(openRooms);
    } catch (e: any) {
      console.error('[KissUpRoom listOpen]', e);
      return res.status(500).json({ message: 'Erreur liste salons', error: e.message });
    }
  }

  // GET /api/kissup-rooms/my/open
  static async myOpen(req: Request, res: Response) {
    try {
      const hostId = (req as any).user.userId;
      const room = await prisma.kissUpRoom.findFirst({
        where: { hostId, status: { in: ['WAITING', 'ACTIVE'] } },
        include: {
          host: { select: { id: true, nickname: true, avatar: true } },
          participants: {
            include: { user: { select: { id: true, nickname: true, avatar: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      return res.json(room || null);
    } catch (e: any) {
      console.error('[KissUpRoom myOpen]', e);
      return res.status(500).json({ message: 'Erreur check salon', error: e.message });
    }
  }

  // POST /api/kissup-rooms/:id/leave
  static async leave(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const roomId = req.params.id as string;

      if (!roomId) {
        return res.status(400).json({ message: 'roomId manquant' });
      }

      await prisma.roomParticipant.deleteMany({
        where: { roomId, userId },
      });

      const remaining = await prisma.roomParticipant.findMany({
        where: { roomId },
        orderBy: { joinedAt: 'asc' },
      });

      if (remaining.length === 0) {
        await prisma.kissUpRoom.update({
          where: { id: roomId },
          data: { status: 'FINISHED' },
        });
      } else {
        const room = await prisma.kissUpRoom.findUnique({ where: { id: roomId } });
        if (room && room.hostId === userId) {
          await prisma.kissUpRoom.update({
            where: { id: roomId },
            data: { hostId: remaining[0].userId },
          });
        }
      }

      return res.json({ success: true });
    } catch (e: any) {
      console.error('[KissUpRoom leave]', e);
      return res.status(500).json({ message: 'Erreur leave', error: e.message });
    }
  }
}