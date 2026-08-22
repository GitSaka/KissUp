import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';

// Table de hachage en mémoire : Associe un userId Prisma à son identifiant de socket en direct
const connectedUsers = new Map<string, string>();

export function initSocketServer(server: HttpServer) {
  const io = new Server(server, {
    cors: {
      origin: "*", // Autorise les connexions depuis n'importe quel appareil mobile
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket: Socket) => {
    console.log(`🔌 Nouveau téléphone connecté au réseau : ${socket.id}`);

    // 👤 1. ENREGISTREMENT : Le smartphone signale qui il est dès qu'il s'allume
    socket.on('register_user', (userId: string) => {
      if (userId) {
        connectedUsers.set(userId, socket.id);
        console.log(`🟢 Utilisateur SUGO en ligne : [ID: ${userId}] -> [Socket: ${socket.id}]`);
      }
    });

    // 📞 2. DÉCLENCHEMENT DE L'APPEL : Saka demande à appeler Élodie
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

    // ❌ 3. ANNULATION / REJET : Élodie refuse l'appel ou Saka raccroche avant qu'elle ne décroche
    socket.on('reject_call', (data: { receiverId: string; callerId: string }) => {
      const callerSocketId = connectedUsers.get(data.callerId);
      if (callerSocketId) {
        io.to(callerSocketId).emit('call_rejected_by_user');
        console.log(`🔴 Appel refusé. Notification renvoyée à l'appelant : ${data.callerId}`);
      }
    });

    // 🔥 4. NOUVEAU : GESTION DU CHAT EN TEMPS RÉEL (1v1 ou Salon Public)
    // Les utilisateurs rejoignent une "Room" virtuelle Socket.io basée sur l'ID du salon (callID ou roomID)
    socket.on('join_room_chat', (roomID: string) => {
      socket.join(roomID);
      console.log(`💬 Le canal ${socket.id} a rejoint le salon de discussion : ${roomID}`);
    });

    // Interception et redistribution instantanée du message textuel (ou du cadeau !)
    socket.on('send_room_message', (data: { roomID: string; senderName: string; text: string; isGift?: boolean }) => {
      // .to(roomID) envoie le message à TOUT LE MONDE dans le salon sauf à celui qui l'a écrit
      socket.to(data.roomID).emit('receive_room_message', {
        id: Date.now().toString(),
        sender: data.senderName,
        text: data.text,
        isGift: data.isGift || false
      });
      console.log(`📩 Message de [${data.senderName}] relayé dans le salon [${data.roomID}]`);
    });

    // 🚪 5. NETTOYAGE : L'utilisateur ferme l'application
    socket.on('disconnect', () => {
      for (const [userId, socketId] of connectedUsers.entries()) {
        if (socketId === socket.id) {
          connectedUsers.delete(userId);
          console.log(`❌ Utilisateur hors-ligne : ${userId}`);
          break;
        }
      }
    });
  });

  return io;
}
