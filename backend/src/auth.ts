import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import db from './db';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-katamine-crm';

// Middleware pour vérifier le token JWT
export const verifyToken = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Accès refusé. Token manquant.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    (req as any).user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token invalide ou expiré.' });
  }
};

// Simple hachage pour remplacer bcrypt et éviter les soucis de compilation native
export const hashPassword = (password: string) => {
  return crypto.createHash('sha256').update(password).digest('hex');
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const [rows]: any = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    const user = rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect.' });
    }

    const hashedInput = hashPassword(password);
    
    if (hashedInput !== user.password) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect.' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        permissions: user.permissions
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur lors de la connexion' });
  }
};
