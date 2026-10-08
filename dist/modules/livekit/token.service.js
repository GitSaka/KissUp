import { AccessToken } from 'livekit-server-sdk';
export class TokenService {
    // Cette fonction crée le ticket d'entrée pour l'appel vidéo
    async generate(roomName, userId, nickname) {
        const apiKey = process.env.LIVEKIT_API_KEY;
        const apiSecret = process.env.LIVEKIT_API_SECRET;
        const livekitUrl = process.env.LIVEKIT_URL;
        if (!apiKey || !apiSecret || !livekitUrl) {
            throw new Error('LIVEKIT_URL / API_KEY / SECRET manquant dans .env');
        }
        const token = new AccessToken(apiKey, apiSecret, {
            identity: userId,
            name: nickname,
            ttl: '2h',
        });
        token.addGrant({
            room: roomName,
            roomJoin: true,
            canPublish: true,
            canSubscribe: true,
            canPublishData: true,
        });
        const jwt = await token.toJwt();
        return {
            url: livekitUrl,
            token: jwt,
        };
    }
}
export const tokenService = new TokenService();
