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

  let query = 'SELECT * FROM payments';
  const params: any[] = [];
  if (tenant) {
    query += ' WHERE tenant = ?';
    params.push(tenant);
  }
  query += ' ORDER BY date DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const [rows]: any = await db.query(query, params);

  let countQuery = 'SELECT COUNT(*) as total FROM payments';
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
  const { amount, date, method, reference, notes, tenant } = req.body;
  const document_id = req.body.document_id || req.body.documentId;
  const fiscal_year = req.body.fiscal_year || req.body.fiscalYear || new Date().getFullYear().toString();

  await db.query(
    `INSERT INTO payments (id, document_id, amount, date, method, reference, notes, fiscal_year, tenant)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, document_id, amount, date, method, reference, notes, fiscal_year, tenant || 'katamine']
  );
  res.status(201).json({ id, ...req.body });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  await db.query('DELETE FROM payments WHERE id=?', [req.params.id]);
  res.json({ success: true });
}));

export default router;
