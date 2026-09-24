import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { prisma } from './config/prisma.js';

export const connectedUsers = new Map<string, string>();

// 🌍 Variable globale pour exporter l'instance io partout où tu en as besoin
let ioInstance: Server | null = null;
export const getIO = () => ioInstance;

export function initSocketServer(server: HttpServer) {
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    },
    pingInterval: 4000, // Le serveur envoie un ping toutes les 4 secondes
    pingTimeout: 7000,
  });
  ioInstance = io;

  io.on('connection', (socket: Socket) => {
    console.log(`🔌 Nouveau téléphone connecté au réseau : ${socket.id}`);

      socket.on('initiate_call', (data: { callerId: string; callerName: string; receiverId: string; callID: string; callType?: string }) => {
        console.log(`\n📞 [DEMANDE D'APPEL] De: ${data.callerName} Vers: ${data.receiverId} Type: ${data.callType}`);
        
        const cleanReceiverId = String(data.receiverId).trim();
        const targetSocketId = connectedUsers.get(cleanReceiverId);

        if (targetSocketId) {
          // 🚀 ON RELAIE TOUT LE PAQUET DONT LE CALL TYPE POUR ÉVITER LE CRASH FRONTEND
          io.to(targetSocketId).emit('incoming_call_request', {
            callerId: data.callerId,
            callerName: data.callerName,
            callID: data.callID,
            callType: data.callType || 'VIDEO' // Sécurité par défaut
          });
          console.log(`🚀 [SONNERIE EN COURS] Signal envoyé au socket : ${targetSocketId}`);
        } else {
          socket.emit('call_error', { message: "L'utilisateur n'est pas connecté." });
        }
      });



        socket.on('reject_call', (data: { receiverId: string; callerId: string }) => {
          const callerSocketId = connectedUsers.get(data.callerId);
          if (callerSocketId) {
            io.to(callerSocketId).emit('call_rejected_by_user');
            console.log(`🔴 Appel refusé. Notification renvoyée à l'appelant : ${data.callerId}`);
          }
        });

                // 🎁 MODULE DE CADEAUX EN DIRECT (STYLE SUGO) : RETRANSMISSION DE L'ANIMATION
        socket.on('send_live_gift', (data: { senderName: string; receiverId: string; giftIconUrl: string; giftName: string }) => {
          console.log(`\n🎁 [CADEAU REÇU EN DIRECT] De: ${data.senderName} Vers l'ID: ${data.receiverId} Gift: ${data.giftName}`);
          
          const cleanReceiverId = String(data.receiverId).trim();
          const targetSocketId = connectedUsers.get(cleanReceiverId);

          // Si la fille est en ligne sur l'application, on lui envoie l'animation en direct !
          if (targetSocketId) {
            io.to(targetSocketId).emit('incoming_gift_animation', {
              senderName: data.senderName,
              giftIconUrl: data.giftIconUrl,
              giftName: data.giftName
            });
            console.log(`🚀 Animation de cadeau propulsée en direct sur le socket : ${targetSocketId}`);
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

      socket.on('send_private_message', async (data: { 
        senderId: string; 
        receiverId: string; 
        content: string | null; 
        type?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'STICKER'; 
        mediaUrl?: string; 
        durationSeconds?: number;
      }) => {
        try {
          // 1. Sauvegarde et envoi immédiat du message envoyé par l'humain
          const savedMessage = await prisma.message.create({
            data: {
              senderId: data.senderId,
              receiverId: data.receiverId,
              content: data.content,
              type: data.type || 'TEXT',
              mediaUrl: data.mediaUrl || null,
              durationSeconds: data.durationSeconds || null,
            },
          });

          // Confirmation à l'envoyeur et relais si le destinataire est en ligne
          const targetSocketId = connectedUsers.get(data.receiverId);
          if (targetSocketId) {
            io.to(targetSocketId).emit('receive_private_message', savedMessage);
          }
          socket.emit('message_sent_confirmation', savedMessage);

          // 🤖 2. INTERCEPTEUR DE ROBOT IA FLUIDE ET SYNCHRONISÉ (ZÉRO PHOTO)
          const recipient = await prisma.user.findUnique({
            where: { id: data.receiverId },
            select: { isBot: true, nickname: true, age: true, bio: true }
          });

          if (recipient && recipient.isBot && data.type === 'TEXT' && data.content) {
            
            // ⏱️ Temps de réflexion initial (L'écran reste silencieux 1 à 2.5 secondes pour simuler la lecture du SMS)
            const readingDelay = Math.floor(Math.random() * 1500) + 1000; 

            setTimeout(async () => {
              try {
                // Appel unique de ton IA Gemini adaptative
                const { generateBotResponse } = await import('./utils/aiService.js');
                
                const aiReplyText = await generateBotResponse(
                  recipient.nickname,
                  recipient.age || 22,
                  recipient.bio || "Chaleureuse et souriante",
                  data.content || ""
                );

                // Sauvegarde de la réponse de l'IA dans Prisma
                const botSavedMessage = await prisma.message.create({
                  data: {
                    senderId: data.receiverId,
                    receiverId: data.senderId,
                    content: aiReplyText,
                    type: 'TEXT',
                  },
                });

                // 📊 TYPING DYNAMIQUE : Plus la phrase de l'IA est longue, plus elle met du temps à taper !
                const typingDuration = Math.max(1500, Math.min(4500, aiReplyText.length * 65));

                // On allume l'indicateur "En train d'écrire..." uniquement APRÈS le délai de lecture !
                io.to(socket.id).emit('user_typing', { userId: data.receiverId });

                // On attend la fin de l'écriture simulée pour distribuer la réponse
                setTimeout(() => {
                  io.to(socket.id).emit('user_stopped_typing', { userId: data.receiverId });
                  io.to(socket.id).emit('receive_private_message', botSavedMessage);
                  console.log(`🤖 [BOT AI LIVE] ${recipient.nickname} a répondu : "${aiReplyText}"`);
                }, typingDuration);

              } catch (err) {
                console.error("Erreur lors de la génération de la réponse du bot:", err);
                io.to(socket.id).emit('user_stopped_typing', { userId: data.receiverId });
              }
            }, readingDelay);
          }

        } catch (error) {
          console.error('Erreur lors de la sauvegarde du message privé ou traitement IA:', error);
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

    socket.on('check_user_online', (userId: string, callback: (isOnline: boolean) => void) => {
      callback(connectedUsers.has(userId));
    });

        //  disconnect asynchrone connecté à Prisma
    socket.on('disconnect', async () => {
      for (const [userId, socketId] of connectedUsers.entries()) {
        if (socketId === socket.id) {
          connectedUsers.delete(userId);
          console.log(`❌ Utilisateur hors-ligne : ${userId}`);
          
          try {
            // 1. Mise à jour persistante dans ta base Neon (Statut + Heure de dernière connexion)
            await prisma.user.update({
              where: { id: userId },
              data: { 
                isOnline: false,
                lastSeen: new Date() 
              }
            });
          } catch (prismaErr) {
            console.error(`Erreur Prisma isOnline false pour l'user ${userId}:`, prismaErr);
          }

          // 2. Alerte immédiate envoyée à toute l'application pour éteindre le point vert
          io.emit('user_status_changed', { userId, isOnline: false });
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
        // register_user asynchrone et connecté à Prisma
    socket.on('register_user', async (userId: string) => {
      if (userId) {
        connectedUsers.set(userId, socket.id);
        console.log(`🟢 Utilisateur en ligne : [ID: ${userId}] -> [Socket: ${socket.id}]`);
        
        try {
          // 1. Mise à jour en base de données Neon pour que l'API HTTP lise le bon statut
          await prisma.user.update({
            where: { id: userId },
            data: { isOnline: true }
          });
        } catch (prismaErr) {
          console.error(`Erreur Prisma isOnline true pour l'user ${userId}:`, prismaErr);
        }

        // 2. Alerte immédiate envoyée à tous les téléphones pour allumer le point vert (🟢)
        io.emit('user_status_changed', { userId, isOnline: true });
      }
    });
;
  }); // 👈 fin de io.on('connection', ...)

  

  return io;
}