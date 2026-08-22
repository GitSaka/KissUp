import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import zegoRoutes from './routes/index.js';
import userRoutes from './routes/userRoutes.js';
import messageRoutes from './routes/messageRoutes.js'; // 👈 nouveau
import { prisma } from './config/prisma.js';
import { createServer } from 'http';
import { initSocketServer } from './socket.js';


dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/zego', zegoRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes); // 👈 nouveau

app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Serveur SUGO prêt !' });
});

setInterval(async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log("☕ Neon Keep-Alive : Base de données maintenue éveillée avec succès.");
  } catch (err) {
    console.log("⚠️ Neon Keep-Alive : Échec du ping.");
  }
}, 120000);

// 🔌 Active Socket.io sur le même serveur HTTP
const io = initSocketServer(httpServer);

// ⚠️ IMPORTANT : on écoute maintenant via httpServer, plus via app directement
httpServer.listen(Number(PORT), () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT} (HTTP + WebSocket)`);
});