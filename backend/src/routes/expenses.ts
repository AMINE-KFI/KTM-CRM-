import { Router } from 'express';
import db from '../db';
import { verifyToken } from '../auth';
import { asyncHandler, paginate } from '../lib/http';
import crypto from 'crypto';

const router = Router();

router.use(verifyToken);

router.get('/', asyncHandler(async (req, res) => {
  const { page, limit, offset } = paginate(req);
  const tenant = req.query.tenant as string;

  let query = 'SELECT * FROM expenses';
  const params: any[] = [];
  if (tenant) {
    query += ' WHERE tenant = ?';
    params.push(tenant);
  }
  query += ' ORDER BY date DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const [rows]: any = await db.query(query, params);

  let countQuery = 'SELECT COUNT(*) as total FROM expenses';
  const countParams: any[] = [];
  if (tenant) {
    countQuery += ' WHERE tenant = ?';
    countParams.push(tenant);
  }
  const [countResult]: any = await db.query(countQuery, countParams);
  const total = countResult[0].total;

  res.json({ data: rows, total, page, limit });
}));

router.post('/', asyncHandler(async (req, res) => {
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
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const { amount, category, date, description, reference } = req.body;
  const payment_method = req.body.payment_method || req.body.paymentMethod;
  await db.query(
    `UPDATE expenses SET amount=?, category=?, date=?, description=?, payment_method=?, reference=? WHERE id=?`,
    [amount, category, date, description, payment_method, reference, req.params.id]
  );
  res.json({ success: true });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  await db.query('DELETE FROM expenses WHERE id=?', [req.params.id]);
  res.json({ success: true });
}));

export default router;
