import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma.js';

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
     const userIdentifier = email || identifier; // Permet de capturer l'un ou l'autre

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