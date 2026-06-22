import { Router } from 'express';
import db from '../db';
import { verifyToken } from '../auth';
import crypto from 'crypto';

const router = Router();

router.use(verifyToken);

router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;

    const [rows]: any = await db.query('SELECT * FROM expenses ORDER BY date DESC LIMIT ? OFFSET ?', [limit, offset]);
    const [countResult]: any = await db.query('SELECT COUNT(*) as total FROM expenses');
    const total = countResult[0].total;

    res.json({ data: rows, total, page, limit });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const id = req.body.id || crypto.randomUUID();
    const { amount, category, date, description, reference, tenant } = req.body;
    const payment_method = req.body.payment_method || req.body.paymentMethod;
    const fiscal_year = req.body.fiscal_year || req.body.fiscalYear || new Date().getFullYear().toString();
    
    await db.query(
      `INSERT INTO expenses (id, amount, category, date, description, payment_method, reference, fiscal_year, tenant) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, amount, category, date, description, payment_method, reference, fiscal_year, tenant || 'katamine']
    );
    res.status(201).json({ id, ...req.body });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { amount, category, date, description, reference } = req.body;
    const payment_method = req.body.payment_method || req.body.paymentMethod;
    await db.query(
      `UPDATE expenses SET amount=?, category=?, date=?, description=?, payment_method=?, reference=? WHERE id=?`,
      [amount, category, date, description, payment_method, reference, req.params.id]
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM expenses WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
