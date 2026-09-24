import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma.js';
import { getIO,connectedUsers } from '../socket.js';


// 🤖 FONCTION EN ARRIÈRE-PLAN : Déclenche l'hameçon d'un faux profil si le quota le permet
const triggerWelcomeBotMessage = async (userId: string, userGender: 'MALE' | 'FEMALE' | 'OTHER') => {
  try {
    // 1. Définir le genre de la cible (un robot du sexe opposé)
    const targetBotGender = userGender === 'MALE' ? 'FEMALE' : 'MALE';

    // 2. Vérifier le quota : Compter combien de robots lui ont écrit ces dernières 24 heures
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const sentTodayCount = await prisma.botTrigger.count({
      where: {
        userId: userId,
        createdAt: { gte: oneDayAgo }
      }
    });

    // 🛑 LIMITE STRICTE SUGO : Si le garçon a déjà reçu 2 messages aujourd'hui, on bloque le spam !
    if (sentTodayCount >= 2) return;

    // 3. Trouver un robot du sexe opposé qui ne lui a encore JAMAIS écrit
    const alreadyTriggeredBotIds = await prisma.botTrigger.findMany({
      where: { userId: userId },
      select: { botId: true }
    });
    const excludedBotIds = alreadyTriggeredBotIds.map(t => t.botId);

    const availableBot = await prisma.user.findFirst({
      where: {
        isBot: true,
        gender: targetBotGender,
        id: { notIn: excludedBotIds }
      }
    });

    // S'il n'y a plus de robot disponible, on s'arrête
    if (!availableBot) return;

    // 4. Lancer le minuteur : simule un temps de réflexion (ex: 2 minutes pour faire réel)
    setTimeout(async () => {
      try {
        const phrasesAccroche = [
          "Coucou ! Tu es nouveau ici ? 😊",
          "Salut toi, j'adore ta photo de profil ! ✨",
          "Hey ! Tu es de quel quartier ? 😉",
          "Coucou, ça va ? Tu as l'air sympa ! Let's chat ?"
        ];
        const messageAleatoire = phrasesAccroche[Math.floor(Math.random() * phrasesAccroche.length)];

        // Création du message officiel dans la base Neon
        const botSavedMessage = await prisma.message.create({
          data: {
            senderId: availableBot.id,
            receiverId: userId,
            content: messageAleatoire,
            type: 'TEXT'
          }
        });

        // Enregistrement dans l'historique pour incrémenter le compteur journalier de l'utilisateur
        await prisma.botTrigger.create({
          data: {
            userId: userId,
            botId: availableBot.id
          }
        });

        // 🚀 ENVOI EN DIRECT VIA SOCKET.IO SI L'UTILISATEUR EST CONNECTÉ
        const targetSocketId = connectedUsers.get(userId);
        if (targetSocketId) {
          const io = getIO();
          if (io) {
            io.to(targetSocketId).emit('receive_private_message', botSavedMessage);
          }
        }

        console.log(`🚀 [WELCOME BOT] ${availableBot.nickname} (${availableBot.gender}) a écrit à l'utilisateur ${userId}`);
      } catch (err) {
        console.error("Erreur lors de la distribution du message automatique du bot:", err);
      }
    }, 120000); // ⏱️ 2 minutes d'attente (120 000 ms) pour un réalisme absolu

  } catch (error) {
    console.error("Erreur dans le moteur triggerWelcomeBotMessage:", error);
  }
};

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, nickname, gender } = req.body;

    if (!email || !password || !nickname) {
      res.status(400).json({ error: 'Champs obligatoires manquants' });
      return;
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(400).json({ error: 'Cet email est déjà utilisé' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        nickname,
        gender: gender || 'MALE',
      },
    });

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    // 🤖 DÉCLENCHEMENT DE L'HAMEÇON EN ARRIÈRE-PLAN (0ms d'impact sur la réponse HTTP)
    triggerWelcomeBotMessage(user.id, user.gender);

    res.status(201).json({
      message: 'Utilisateur créé avec succès',
      token,
      user: {
        id: user.id,
        nickname: user.nickname,
        email: user.email,
        coins: user.coins,
        diamonds: user.diamonds,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur lors de l inscription' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, identifier, password } = req.body;
    const userIdentifier = email || identifier;

    const user = await prisma.user.findUnique({ where: { email: userIdentifier } });
    if (!user) {
      res.status(400).json({ error: 'Identifiants invalides' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(400).json({ error: 'Identifiants invalides' });
      return;
    }

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    // 🤖 DÉCLENCHEMENT ÉGALEMENT À LA CONNEXION : Le serveur vérifie s'il reste du quota pour la journée !
    triggerWelcomeBotMessage(user.id, user.gender);

    res.json({
      message: 'Connexion réussie',
      token,
      user: {
        id: user.id,
        nickname: user.nickname,
        email: user.email,
        coins: user.coins,
        diamonds: user.diamonds,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur lors de la connexion' });
  }
};