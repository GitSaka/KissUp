import { PrismaClient } from '@prisma/client';
import { tokenService } from '../modules/livekit/token.service.js';


const prisma = new PrismaClient();

async function main() {
  // 1. On prend le premier user de ta DB comme host
  const user = await prisma.user.findFirst();
  if (!user) {
    console.log('❌ Aucun user en DB, crée un user d\'abord');
    return;
  }
  console.log('USER TROUVÉ:', user.id, user.nickname);

  // 2. On crée une room KissUp de test
  const room = await prisma.kissUpRoom.create({
    data: {
      livekitName: `kissup_test_${Date.now()}`,
      maxParticipants: 4,
      betAmount: 0,
      hostId: user.id,
      status: 'WAITING',
    },
  });
  console.log('✅ ROOM CRÉÉE:', room.id);
  console.log('   livekitName:', room.livekitName);

  // 3. On génère le token LiveKit direct
  const result = await tokenService.generate(room.livekitName, user.id, user.nickname || 'Test');
  
  console.log('\n🎉 CA MARCHE ! Voilà ce que doit rendre ton API:');
  console.log(JSON.stringify(result, null, 2));
  console.log('\nTu peux copier ce room.id pour tester la route plus tard:', room.id);
}

main();