import cron from 'node-cron';
import { prisma } from '../config/prisma.js';
import { connectedUsers, getIO } from '../socket.js';

export function initBotRelanceCron() {
  // ⏱️ MODIFICATION TEMPORAIRE : Exécution toutes les minutes ('* * * * *') pour tester.
  // Remet '0 */4 * * *' plus tard quand tu seras prêt pour la production.
  cron.schedule('* * * * *', async () => {
    console.log('🔄 [CRON] Vérification des utilisateurs inactifs pour relance bot...');
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const humanUsers = await prisma.user.findMany({
        where: {
          isBot: false,
        },
        take: 20
      });

      for (const user of humanUsers) {
        const recentTriggers = await prisma.botTrigger.count({
          where: {
            userId: user.id,
            createdAt: { gte: twentyFourHoursAgo }
          }
        });

        if (recentTriggers >= 2) continue;

        const targetBotGender = user.gender === 'MALE' ? 'FEMALE' : 'MALE';
        
        const availableBots = await prisma.user.findMany({
          where: {
            isBot: true,
            gender: targetBotGender
          }
        });

        if (availableBots.length === 0) continue;

        const availableBot = availableBots[Math.floor(Math.random() * availableBots.length)];
        if (!availableBot) continue;

        const relances = [
          "Coucou ! Tu as disparu de la plateforme, tout va bien ? 😊",
          "Hey ! On s'était bien parlé, tu fais quoi de beau ? ",
          "Dis donc, tu m'oublies déjà ? 😉",
          "Un petit coucou en passant, j'espère que ta journée se passe bien !"
        ];
        const randomText = relances[Math.floor(Math.random() * relances.length)];

        const botMessage = await prisma.message.create({
          data: {
            senderId: availableBot.id,
            receiverId: user.id,
            content: randomText,
            type: 'TEXT'
          }
        });

        await prisma.botTrigger.create({
          data: {
            userId: user.id,
            botId: availableBot.id
          }
        });

        const targetSocketId = connectedUsers.get(user.id);
        if (targetSocketId) {
          const io = getIO();
          if (io) {
            io.to(targetSocketId).emit('receive_private_message', botMessage);
          }
        }

        console.log(`🚀 [CRON RELANCE] ${availableBot.nickname} a relancé l'utilisateur ${user.nickname || user.id}`);
      }
    } catch (error) {
      console.error('Erreur dans le cron de relance bot:', error);
    }
  });

  console.log('⏰ Service Cron de relance bot initialisé avec succès.');
}