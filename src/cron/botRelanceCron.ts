import cron from 'node-cron';
import { prisma } from '../config/prisma.js';
import { connectedUsers, getIO } from '../socket.js';


export function initBotRelanceCron() {
  // ⏱️ Exécution toutes les 4 heures par exemple : '0 */4 * * *'
  cron.schedule('0 */4 * * *', async () => {
    console.log('🔄 [CRON] Vérification des utilisateurs inactifs pour relance bot...');
    try {
      // 1. Trouver des utilisateurs humains (isBot: false) qui n'ont pas reçu de message de bot depuis 24h
      // ou qui sont inactifs. Simplifions : on cherche des utilisateurs en ligne ou récemment vus.
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const humanUsers = await prisma.user.findMany({
        where: {
          isBot: false,
          // Optionnel : s'assurer qu'ils ont au moins une interaction ou un compte créé
        },
        take: 20 // Traitement par lots pour éviter de surcharger
      });

      for (const user of humanUsers) {
        // Vérifier si un bot lui a déjà écrit ces dernières 24h via botTrigger
        const recentTriggers = await prisma.botTrigger.count({
          where: {
            userId: user.id,
            createdAt: { gte: twentyFourHoursAgo }
          }
        });

        // S'il a déjà reçu 2 déclenchements aujourd'hui, on ne le spamme pas
        if (recentTriggers >= 2) continue;

        // Trouver un bot du sexe opposé avec qui il n'a PAS de conversation active récente
        const targetBotGender = user.gender === 'MALE' ? 'FEMALE' : 'MALE';
        
        // 1. Récupérer TOUS les bots disponibles pour ce genre
            const availableBots = await prisma.user.findMany({
                where: {
                    isBot: true,
                    gender: targetBotGender
                }
                });

                // S'il n'y a aucun bot, on arrête
      if (availableBots.length === 0) continue;

      // 2. Choisir un bot au hasard dans le tableau avec JavaScript
      const availableBot = availableBots[Math.floor(Math.random() * availableBots.length)];

        if (!availableBot) continue;

        // Phrases de relance accrocheuses
        const relances = [
          "Coucou ! Tu as disparu de la plateforme, tout va bien ? 😊",
          "Hey ! On s'était bien parlé, tu fais quoi de beau ? ✨",
          "Dis donc, tu m'oublies déjà ? 😉",
          "Un petit coucou en passant, j'espère que ta journée se passe bien !"
        ];
        const randomText = relances[Math.floor(Math.random() * relances.length)];

        // Création du message en base
        const botMessage = await prisma.message.create({
          data: {
            senderId: availableBot.id,
            receiverId: user.id,
            content: randomText,
            type: 'TEXT'
          }
        });

        // Enregistrement dans botTrigger pour respecter le quota journalier
        await prisma.botTrigger.create({
          data: {
            userId: user.id,
            botId: availableBot.id
          }
        });

        // Envoi temps réel si l'utilisateur est connecté
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