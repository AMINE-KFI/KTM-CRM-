import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import db from './db';
import crypto from 'crypto';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET manquant dans .env — le serveur ne peut pas démarrer sans secret configuré.');
}

interface AuthPayload {
  id: string;
  email: string;
  role: 'admin' | 'user';
  name: string;
  tenant?: string | null;
  permissions?: string[];
}

// Middleware pour vérifier le token JWT
export const verifyToken = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Accès refusé. Token manquant.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET as string) as AuthPayload;
    (req as any).user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token invalide ou expiré.' });
  }
};

// À utiliser après verifyToken sur les routes réservées aux gérants
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user as AuthPayload | undefined;
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Accès réservé aux administrateurs.' });
  }
  next();
};

const isLegacySha256Hash = (hash: string) => /^[a-f0-9]{64}$/i.test(hash);

const legacyHashPassword = (password: string) => {
  return crypto.createHash('sha256').update(password).digest('hex');
};

export const hashPassword = async (password: string) => {
  return bcrypt.hash(password, 10);
};

// Vérifie un mot de passe contre un hash bcrypt OU l'ancien hash sha256.
// Retourne { valid, needsUpgrade } pour permettre une migration transparente au login.
const verifyPassword = async (passwordInput: string, storedHash: string) => {
  if (isLegacySha256Hash(storedHash)) {
    const valid = legacyHashPassword(passwordInput) === storedHash;
    return { valid, needsUpgrade: valid };
  }
  const valid = await bcrypt.compare(passwordInput, storedHash);
  return { valid, needsUpgrade: false };
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const [rows]: any = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    const user = rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect.' });
    }

    const { valid, needsUpgrade } = await verifyPassword(password, user.password);

    if (!valid) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect.' });
    }

    if (needsUpgrade) {
      // Migration transparente : on ré-encode l'ancien hash sha256 en bcrypt, sans rien casser pour l'utilisateur.
      const upgradedHash = await hashPassword(password);
      db.query('UPDATE users SET password = ? WHERE id = ?', [upgradedHash, user.id]).catch(err => {
        console.error('Échec de la mise à niveau du hash de mot de passe:', err);
      });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name, tenant: user.tenant ?? null, permissions: user.permissions },
      JWT_SECRET as string,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenant: user.tenant ?? null,
        permissions: user.permissions
      }
    });
  } catch (error) {
    console.error('Erreur de connexion:', error);
    res.status(500).json({ error: 'Erreur lors de la connexion' });
  }
};
