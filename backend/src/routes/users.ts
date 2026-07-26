import { Router } from 'express';
import db from '../db';
import { verifyToken, requireAdmin, hashPassword } from '../auth';
import { asyncHandler } from '../lib/http';
import crypto from 'crypto';

const router = Router();

router.use(verifyToken, requireAdmin);

const toPublicUser = (row: any) => ({
  id: row.id,
  email: row.email,
  name: row.name,
  role: row.role,
  tenant: row.tenant ?? null,
  permissions: row.permissions,
  createdAt: row.created_at
});

router.get('/', asyncHandler(async (req, res) => {
  const [rows]: any = await db.query('SELECT * FROM users ORDER BY created_at DESC');
  res.json({ data: rows.map(toPublicUser) });
}));

router.post('/', asyncHandler(async (req, res) => {
  const { email, password, name, role, tenant, permissions } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'email, password et name sont requis.' });
  }

  const [existing]: any = await db.query('SELECT id FROM users WHERE email = ?', [email]);
  if (existing.length > 0) {
    return res.status(409).json({ error: 'Un utilisateur avec cet email existe déjà.' });
  }

  const id = req.body.id || crypto.randomUUID();
  const hashed = await hashPassword(password);

  await db.query(
    `INSERT INTO users (id, email, password, name, role, tenant, permissions) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, email, hashed, name, role || 'user', tenant || null, JSON.stringify(permissions || [])]
  );

  res.status(201).json(toPublicUser({ id, email, name, role: role || 'user', tenant: tenant || null, permissions: permissions || [], created_at: new Date() }));
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const { email, password, name, role, tenant, permissions } = req.body;

  if (password) {
    const hashed = await hashPassword(password);
    await db.query(
      `UPDATE users SET email=?, password=?, name=?, role=?, tenant=?, permissions=? WHERE id=?`,
      [email, hashed, name, role, tenant || null, JSON.stringify(permissions || []), req.params.id]
    );
  } else {
    await db.query(
      `UPDATE users SET email=?, name=?, role=?, tenant=?, permissions=? WHERE id=?`,
      [email, name, role, tenant || null, JSON.stringify(permissions || []), req.params.id]
    );
  }

  res.json({ success: true });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const user = (req as any).user;
  if (user.id === req.params.id) {
    return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte.' });
  }
  await db.query('DELETE FROM users WHERE id=?', [req.params.id]);
  res.json({ success: true });
}));

export default router;
