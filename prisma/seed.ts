import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Début du remplissage du catalogue de cadeaux (Style SUGO / Étendu)...');

  // 1. Nettoyage de sécurité pour éviter les doublons d'ID
  await prisma.gift.deleteMany({});

  // 2. Le catalogue officiel enrichi (Avec iconUrl généré automatiquement pour le design)
  const giftsRaw = [
    // --- 🎭 PETITES ATTENTIONS & FUN ---
    { name: 'Brosse à dents 🪥', priceInCoins: 2, category: 'fun', isActive: true },
    { name: 'Tomate fraîche 🍅', priceInCoins: 5, category: 'fun', isActive: true },
    { name: 'Marmite de sauce 🍲', priceInCoins: 10, category: 'fun', isActive: true },
    { name: 'Piment Rouge 🔥', priceInCoins: 12, category: 'fun', isActive: true },
    { name: 'Casquette Stylée 🧢', priceInCoins: 20, category: 'fun', isActive: true },

    // --- 💖 CLASSIQUES & ROMANTISME ---
    { name: 'Rose Royale 🌹', priceInCoins: 15, category: 'standard', isActive: true },
    { name: 'Chocolat Fondant 🍫', priceInCoins: 25, category: 'standard', isActive: true },
    { name: 'Cœur Éclatant ❤️', priceInCoins: 30, category: 'standard', isActive: true },
    { name: 'Ours en peluche géant 🧸', priceInCoins: 75, category: 'standard', isActive: true },
    { name: 'Parfum de Luxe 🌸', priceInCoins: 100, category: 'standard', isActive: true },

    // --- ⚡ HIGH-TECH & GADGETS ---
    { name: 'Écouteurs Sans Fil 🎧', priceInCoins: 90, category: 'tech', isActive: true },
    { name: 'Smartphone Pro 📱', priceInCoins: 150, category: 'tech', isActive: true },
    { name: 'Console de Jeux 🎮', priceInCoins: 220, category: 'tech', isActive: true },
    { name: 'Ordinateur Gamer 💻', priceInCoins: 300, category: 'tech', isActive: true },

    // --- 🚀 PRESTIGE & ÉVASION ---
    { name: 'Bague en Diamant 💍', priceInCoins: 500, category: 'premium', isActive: true },
    { name: 'Moto Cross 🏍️', priceInCoins: 800, category: 'premium', isActive: true },
    { name: 'Montre de Luxe ⌚', priceInCoins: 1200, category: 'premium', isActive: true },
    { name: 'Voyage à Dubaï ✈️', priceInCoins: 1500, category: 'premium', isActive: true },

    // --- 💎 GRAND LUXE & VIP ---
    { name: 'Yacht Impérial 🛥️', priceInCoins: 3000, category: 'luxury', isActive: true },
    { name: 'Supercar Sport 🏎️', priceInCoins: 5000, category: 'luxury', isActive: true },
    { name: 'Hélicoptère Privé 🚁', priceInCoins: 7500, category: 'luxury', isActive: true },
    { name: 'Château Royal 🏰', priceInCoins: 10000, category: 'luxury', isActive: true },

    // --- 👑 MYTHIQUE & LÉGENDAIRE (ULTRA-VIP) ---
    { name: 'Île Privée Tropicale 🏝️', priceInCoins: 25000, category: 'mythic', isActive: true },
    { name: 'Fusée Spatiale VIP 🚀', priceInCoins: 50000, category: 'mythic', isActive: true },
  ];

  // 3. Transformation automatique pour inclure l'iconUrl obligatoire réclamé par Prisma
  for (const gift of giftsRaw) {
    // Crée une image textuelle propre (ex: un carré avec écrit "Tomate") pour tes tests mobiles
    const cleanName = encodeURIComponent(gift.name.split(' ')[0]);
    
    await prisma.gift.create({
      data: {
        name: gift.name,
        priceInCoins: gift.priceInCoins,
        category: gift.category,
        isActive: gift.isActive,
        // 🚀 L'ASTUCE : Un lien d'image valide, propre et temporaire généré à la volée !
        iconUrl: `https://placehold.co{cleanName}`
      },
    });
    console.log(`✅ Cadeau injecté : ${gift.name} -> [${gift.priceInCoins} coins]`);
  }

  console.log('\n✨ [BOUTIQUE MISE À JOUR] Tout le catalogue étendu est maintenant enregistré sur ta base Neon !');
}

main()
  .catch((e) => {
    console.error('❌ Erreur critique lors du Seed :', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
