import crypto from 'crypto';

/**
 * 🚀 ALGORITHME OFFICIEL ZEGOCLOUD : Génère un jeton d'appel sécurisé et temporaire
 */
export function generateZegoToken(
  appID: number, 
  serverSecret: string, 
  userID: string, 
  effectiveTimeInSeconds?: number
): string {
    if (!appID || !serverSecret || !userID) {
        throw new Error("Paramètres manquants pour la génération du jeton ZegoCloud.");
    }

    const createTime = Math.floor(Date.now() / 1000);
    const expireTime = createTime + (effectiveTimeInSeconds || 7200);

    // 1. Structure de l'objet de sécurité attendu par les serveurs Zego
    const tokenInfo = {
        app_id: Number(appID),
        user_id: String(userID),
        nonce: crypto.randomBytes(8).readBigUInt64BE(0).toString(),
        create_time: createTime,
        expire_time: expireTime,
        privilege: {
            1: 1, // Autorise la connexion (Login)
            2: 1  // Autorise la publication de flux audio/vidéo (Publish)
        }
    };

    // 2. Conversion au format JSON chaîné
    const tokenJson = JSON.stringify(tokenInfo);

    // 3. Génération d'un vecteur d'initialisation aléatoire de 16 octets (IV)
    const iv = crypto.randomBytes(16);

    // 4. Chiffrement AES-128-CBC en utilisant les 16 premiers octets du Server Secret
    const cipher = crypto.createCipheriv('aes-128-cbc', serverSecret.substring(0, 16), iv);
    let encrypted = cipher.update(tokenJson, 'utf8', 'binary');
    encrypted += cipher.final('binary');

    // 5. Assemblage final du paquet binaire (IV + Texte chiffré)
    const packedBuffer = Buffer.concat([iv, Buffer.from(encrypted, 'binary')]);

    // 6. Encodage final en Base64 URL-Safe pour le transit réseau
    return packedBuffer.toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}
