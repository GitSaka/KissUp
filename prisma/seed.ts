import { PrismaClient, Gender, RelationshipGoal, TabCategory } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Démarrage du peuplement des 30 faux profils (20 Femmes / 10 Hommes)...');

  const hashedDefaultPassword = await bcrypt.hash('Password123!', 10);

  // Listes de prénoms africains diversifiés et réalistes
  const femaleNames = [
    'Aïcha', 'Fatou', 'Aminata', 'Koumba', 'Mariam', 'Naya', 'Kafui', 'Adjoa', 
    'Folashade', 'Zena', 'Imane', 'Chantal', 'Prisca', 'Miriam', 'Diane', 'Kenza', 
    'Sandrine', 'Oumy', 'Mouna', 'Vanessa'
  ];

  const maleNames = [
    'Kofi', 'Idrissa', 'Junior', 'Yao', 'Abdoulaye', 'Mamadou', 'Cedric', 'Stephane', 
    'Tidiany', 'Boubacar'
  ];

  // Pool d'images de profils et galeries (sélection afro-descendante esthétique)
  const femaleAvatars = [
    'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=500',
    'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=500',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=500',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500',
    'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=500',
    'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=500',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500',
    'https://images.unsplash.com/photo-1534751516642-a1af1ed26a56?w=500',
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=500'
  ];

  const maleAvatars = [
    'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=500',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500',
    'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=500',
    'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=500',
    'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=500'
  ];

  const cities = ['Cotonou', 'Porto-Novo', 'Dakar', 'Abidjan', 'Lomé', 'Douala', 'Accra'];
  const countries = ['Bénin', 'Sénégal', 'Côte d\'Ivoire', 'Togo', 'Cameroun', 'Ghana'];
  const passions = ['La cuisine locale', 'Les voyages', 'Le fitness', 'La musique Afrobeat', 'Le cinéma', 'L’entrepreneuriat'];

  // --- 1. CRÉATION DES 20 PROFILS FÉMININS ---
  for (let i = 0; i < 20; i++) {
    const name = femaleNames[i % femaleNames.length];
    const email = `bot.femme.${i + 1}@kissup.ai`;
    const avatar = femaleAvatars[i % femaleAvatars.length];

    const galleryPhotos = [
      { imageUrl: femaleAvatars[(i + 1) % femaleAvatars.length] },
      { imageUrl: femaleAvatars[(i + 2) % femaleAvatars.length] },
      { imageUrl: femaleAvatars[(i + 3) % femaleAvatars.length] }
    ];

    const existing = await prisma.user.findUnique({ where: { email } });
    if (!existing) {
      await prisma.user.create({
        data: {
          email,
          password: hashedDefaultPassword,
          nickname: name,
          avatar,
          gender: Gender.FEMALE,
          interestedIn: Gender.MALE,
          bio: `Coucou ! J'adore ${passions[i % passions.length].toLowerCase()} et faire de nouvelles rencontres. Viens on discute ! ✨`,
          age: 20 + (i % 7),
          city: cities[i % cities.length],
          country: countries[i % countries.length],
          continent: 'Afrique',
          relationGoal: RelationshipGoal.LONG_TERM,
          coins: 1000,
          wealthLevel: 1,
          charmLevel: 2,
          isOnline: i % 2 === 0,
          isVerified: true,
          isBot: true,
          // Utilisation d'une catégorie valide du schéma (FEATURED ou RECOMMENDED)
          tabCategory: i < 5 ? TabCategory.FEATURED : TabCategory.RECOMMENDED,
          photos: {
            create: galleryPhotos
          }
        }
      });
      console.log(`🤖 Bot Femme créé : ${name} (${email}) avec ${galleryPhotos.length} photos en galerie.`);
    }
  }

  // --- 2. CRÉATION DES 10 PROFILS MASCULINS ---
  for (let i = 0; i < 10; i++) {
    const name = maleNames[i % maleNames.length];
    const email = `bot.homme.${i + 1}@kissup.ai`;
    const avatar = maleAvatars[i % maleAvatars.length];

    const galleryPhotos = [
      { imageUrl: maleAvatars[(i + 1) % maleAvatars.length] },
      { imageUrl: maleAvatars[(i + 2) % maleAvatars.length] }
    ];

    const existing = await prisma.user.findUnique({ where: { email } });
    if (!existing) {
      await prisma.user.create({
        data: {
          email,
          password: hashedDefaultPassword,
          nickname: `${name}_${i + 1}`,
          avatar,
          gender: Gender.MALE,
          interestedIn: Gender.FEMALE,
          bio: `Entrepreneur & passionné par ${passions[i % passions.length].toLowerCase()}. Toujours partant pour un bon verre ! 🥂`,
          age: 22 + (i % 6),
          city: cities[i % cities.length],
          country: countries[i % countries.length],
          continent: 'Afrique',
          relationGoal: RelationshipGoal.CASUAL,
          coins: 1000,
          wealthLevel: 2,
          charmLevel: 1,
          isOnline: i % 3 === 0,
          isVerified: true,
          isBot: true,
          tabCategory: TabCategory.RECOMMENDED,
          photos: {
            create: galleryPhotos
          }
        }
      });
      console.log(`🤖 Bot Homme créé : ${name}_${i + 1} (${email}) avec ${galleryPhotos.length} photos en galerie.`);
    }
  }

  console.log('✨ Base de données peuplée avec succès : 30 bots prêts à l\'action !');
}

main()
  .catch((e) => {
    console.error('Erreur critique lors du seeding des bots :', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });