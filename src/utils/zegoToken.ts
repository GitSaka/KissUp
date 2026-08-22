import crypto from 'crypto';

interface TokenResult {
  token: string;
}

export function generateZegoToken(
  appID: number,
  serverSecret: string,
  userID: string,
  effectiveTimeInSeconds: number
): string {
  if (!appID || !serverSecret || !userID) {
    throw new Error('Paramètres manquants pour générer le token Zego');
  }

  // 1. Définir le temps d'expiration (Heure actuelle + durée de validité)
  const createTime = Math.floor(Date.now() / 1000);
  const expireTime = createTime + effectiveTimeInSeconds;

  // 2. Construire l'objet de configuration JSON requis par Zego
  const tokenInfo = {
    app_id: appID,
    user_id: userID,
    nonce: Math.floor(Math.random() * 2147483647), // Nombre aléatoire de sécurité
    ctime: createTime,
    expire: expireTime,
    payload: '' // Optionnel : tu peux stocker des infos pièces ici plus tard
  };

  // 3. Convertir en chaîne de caractères et chiffrer avec le ServerSecret en utilisant l'algorithme AES-128-CBC
  const tokenJson = JSON.stringify(tokenInfo);
  
  // Générer une clé d'initialisation aléatoire (IV) de 16 octets
  const iv = crypto.randomBytes(16);
  
  // Utiliser les 16 premiers octets du serverSecret hashé en MD5 comme clé de chiffrement
  const hash = crypto.createHash('md5').update(serverSecret).digest();
  const cipher = crypto.createCipheriv('aes-128-cbc', hash, iv);
  
  let encrypted = cipher.update(tokenJson, 'utf8', 'binary');
  encrypted += cipher.final('binary');

  // 4. Assembler le jeton final au format attendu par le SDK mobile (Version 2)
  const version = Buffer.from([2]); // Identifiant de version du Token Zego
  
  // Rassembler la version, l'IV et le bloc encrypté dans un seul tampon binaire
  const bVersion = Buffer.from(version);
  const bIv = Buffer.from(iv);
  const bEncrypted = Buffer.from(encrypted, 'binary');
  
  const bIvLen = Buffer.alloc(2);
  bIvLen.writeUInt16BE(bIv.length, 0);
  
  const bEncryptedLen = Buffer.alloc(2);
  bEncryptedLen.writeUInt16BE(bEncrypted.length, 0);

  const finalBuffer = Buffer.concat([
    bVersion,
    bIvLen,
    bIv,
    bEncryptedLen,
    bEncrypted
  ]);

  // Retourner le token encodé en Base64 pour qu'il voyage proprement via l'API HTTP
  return finalBuffer.toString('base64');
}
