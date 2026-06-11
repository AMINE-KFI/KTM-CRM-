import { Router } from 'express';
import db from '../db';
import { verifyToken } from '../auth';
import crypto from 'crypto';

const router = Router();

router.use(verifyToken);

router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM payments ORDER BY date DESC');
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const id = req.body.id || crypto.randomUUID();
    const { amount, date, method, reference, notes, tenant } = req.body;
    const document_id = req.body.document_id || req.body.documentId;
    const fiscal_year = req.body.fiscal_year || req.body.fiscalYear || new Date().getFullYear().toString();
    
    await db.query(
      `INSERT INTO payments (id, document_id, amount, date, method, reference, notes, fiscal_year, tenant) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, document_id, amount, date, method, reference, notes, fiscal_year, tenant || 'katamine']
    );
    res.status(201).json({ id, ...req.body });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM payments WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
