import { Router } from 'express';
import db from '../db';
import { verifyToken } from '../auth';
import crypto from 'crypto';

const router = Router();

// Appliquer le middleware de sécurité sur toutes les routes
router.use(verifyToken);

router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;

    const [rows]: any = await db.query('SELECT * FROM companies ORDER BY created_at DESC LIMIT ? OFFSET ?', [limit, offset]);
    const [countResult]: any = await db.query('SELECT COUNT(*) as total FROM companies');
    const total = countResult[0].total;

    res.json({ data: rows, total, page, limit });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const id = req.body.id || crypto.randomUUID();
    const { name, role, email, phone, address, rc, nif, nis, ai, contacts } = req.body;
    
    await db.query(
      `INSERT INTO companies (id, name, role, email, phone, address, rc, nif, nis, ai, contacts) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, name, role || 'client', email, phone, address, rc, nif, nis, ai, JSON.stringify(contacts || [])]
    );
    res.status(201).json({ id, ...req.body });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, role, email, phone, address, rc, nif, nis, ai, contacts } = req.body;
    await db.query(
      `UPDATE companies SET name=?, role=?, email=?, phone=?, address=?, rc=?, nif=?, nis=?, ai=?, contacts=? WHERE id=?`,
      [name, role, email, phone, address, rc, nif, nis, ai, JSON.stringify(contacts || []), req.params.id]
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM companies WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
