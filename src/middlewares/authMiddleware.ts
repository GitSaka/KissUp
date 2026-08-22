import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Étendre l'interface Request d'Express pour y ajouter l'utilisateur décodé
export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    [key: string]: any;
  };
}

export const verifyJwt = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  try {
    // 1. Récupérer le header d'autorisation
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Accès refusé. Jeton d\'authentification manquant.' });
      return;
    }

    // 2. Extraire le token (en enlevant "Bearer ")
    const token = authHeader.split(' ')[1];

    // 3. Vérifier et décoder le token avec ta clé secrète JWT
    const secret = process.env.JWT_SECRET || 'ta_cle_secrete_par_defaut';
    
    const decoded = jwt.verify(token, secret) as { userId: string };

    // 4. Attacher l'utilisateur à la requête pour l'utiliser dans les contrôleurs suivants
    req.user = decoded;

    // 5. Tout est bon, on passe au contrôleur suivant
    next();
  } catch (error) {
    res.status(403).json({ error: 'Jeton invalide ou expiré.' });
    return;
  }
};