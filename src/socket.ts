import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { prisma } from './config/prisma.js';

const connectedUsers = new Map<string, string>();

export function initSocketServer(server: HttpServer) {
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket: Socket) => {
    console.log(`🔌 Nouveau téléphone connecté au réseau : ${socket.id}`);

    socket.on('register_user', (userId: string) => {
      if (userId) {
        connectedUsers.set(userId, socket.id);
        console.log(`🟢 Utilisateur SUGO en ligne : [ID: ${userId}] -> [Socket: ${socket.id}]`);
      }
    });

    socket.on('initiate_call', (data: { callerId: string; callerName: string; receiverId: string; callID: string }) => {
      const targetSocketId = connectedUsers.get(data.receiverId);
      if (targetSocketId) {
        io.to(targetSocketId).emit('incoming_call_request', {
          callerId: data.callerId,
          callerName: data.callerName,
          callID: data.callID
        });
        console.log(`🔕 Signal envoyé à ${data.receiverId} pour l'appel de ${data.callerName}`);
      } else {
        socket.emit('call_error', { message: "L'utilisateur est actuellement hors ligne ou occupé." });
      }
    });

    socket.on('reject_call', (data: { receiverId: string; callerId: string }) => {
      const callerSocketId = connectedUsers.get(data.callerId);
      if (callerSocketId) {
        io.to(callerSocketId).emit('call_rejected_by_user');
        console.log(`🔴 Appel refusé. Notification renvoyée à l'appelant : ${data.callerId}`);
      }
    });

    socket.on('join_room_chat', (roomID: string) => {
      socket.join(roomID);
      console.log(`💬 Le canal ${socket.id} a rejoint le salon de discussion : ${roomID}`);
    });

    socket.on('send_room_message', (data: { roomID: string; senderName: string; text: string; isGift?: boolean }) => {
      socket.to(data.roomID).emit('receive_room_message', {
        id: Date.now().toString(),
        sender: data.senderName,
        text: data.text,
        isGift: data.isGift || false
      });
      console.log(`📩 Message de [${data.senderName}] relayé dans le salon [${data.roomID}]`);
    });

        // 💬 CHAT PRIVÉ 1-À-1 (persistant en base de données)
    socket.on('send_private_message', async (data: { 
      senderId: string; 
      receiverId: string; 
      content: string | null; 
      type?: 'TEXT' | 'IMAGE' | 'VIDEO'; 
      mediaUrl?: string; 
    }) => {
      try {
        const savedMessage = await prisma.message.create({
          data: {
            senderId: data.senderId,
            receiverId: data.receiverId,
            content: data.content,
            type: data.type || 'TEXT',
            mediaUrl: data.mediaUrl || null,
          },
        });

        const targetSocketId = connectedUsers.get(data.receiverId);
        if (targetSocketId) {
          io.to(targetSocketId).emit('receive_private_message', savedMessage);
        }

        socket.emit('message_sent_confirmation', savedMessage);
      } catch (error) {
        console.error('Erreur lors de la sauvegarde du message privé:', error);
        socket.emit('message_error', { message: "Erreur lors de l'envoi du message." });
      }
    });

    // ✅ ACCUSÉS DE LECTURE : marque tous les messages d'une conversation comme lus
    // 👇 Bien à l'intérieur de io.on('connection', ...) maintenant, sinon "socket" n'existe pas ici
    socket.on('mark_as_read', async (data: { readerId: string; otherUserId: string }) => {
      try {
        await prisma.message.updateMany({
          where: {
            senderId: data.otherUserId,
            receiverId: data.readerId,
            isRead: false,
          },
          data: { isRead: true },
        });

        const senderSocketId = connectedUsers.get(data.otherUserId);
        if (senderSocketId) {
          io.to(senderSocketId).emit('messages_marked_read', { readerId: data.readerId });
        }
      } catch (error) {
        console.error('Erreur lors du marquage des messages comme lus:', error);
      }
    });

    // 🚪 NETTOYAGE : L'utilisateur ferme l'application
    socket.on('disconnect', () => {
      for (const [userId, socketId] of connectedUsers.entries()) {
        if (socketId === socket.id) {
          connectedUsers.delete(userId);
          console.log(`❌ Utilisateur hors-ligne : ${userId}`);
          break;
        }
      }
    });

        // ✏️ 8. INDICATEUR "EN TRAIN D'ÉCRIRE..."
    socket.on('typing_start', (data: { senderId: string; receiverId: string }) => {
      const targetSocketId = connectedUsers.get(data.receiverId);
      if (targetSocketId) {
        io.to(targetSocketId).emit('user_typing', { userId: data.senderId });
      }
    });

    socket.on('typing_stop', (data: { senderId: string; receiverId: string }) => {
      const targetSocketId = connectedUsers.get(data.receiverId);
      if (targetSocketId) {
        io.to(targetSocketId).emit('user_stopped_typing', { userId: data.senderId });
      }
    });
  }); // 👈 fin de io.on('connection', ...)

  

  return io;
}