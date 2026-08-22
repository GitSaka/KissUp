import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import zegoRoutes from './routes/index.js'; // 👈 1. Importe tes routes zego
import userRoutes from './routes/userRoutes.js';
import { prisma } from './config/prisma.js';
import { createServer } from 'http';


dotenv.config();


const app = express();
const httpServer = createServer(app); // 👈 Crée le serveur HTTP requis pour les WebSockets
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Routes API
app.use('/api/auth', authRoutes);
app.use('/api/zego', zegoRoutes); // 👈 2. Branche la route ici (accessible via /api/zego/token)
app.use('/api/users', userRoutes); // 👈 ajoute cette ligne

// Route de test
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Serveur SUGO prêt !' });
});

// ☕ NEON KEEP-ALIVE
setInterval(async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log("☕ Neon Keep-Alive : Base de données maintenue éveillée avec succès.");
  } catch (err) {
    console.log("⚠️ Neon Keep-Alive : Échec du ping.");
  }
}, 120000);

app.listen(Number(PORT), () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
});