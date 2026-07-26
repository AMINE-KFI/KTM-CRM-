import { Router } from 'express';
import db from '../db';
import { verifyToken } from '../auth';
import { asyncHandler, paginate } from '../lib/http';
import crypto from 'crypto';

const router = Router();

router.use(verifyToken);

router.get('/', asyncHandler(async (req, res) => {
  const { page, limit, offset } = paginate(req);

  const [rows]: any = await db.query('SELECT * FROM products ORDER BY name ASC LIMIT ? OFFSET ?', [limit, offset]);
  const [countResult]: any = await db.query('SELECT COUNT(*) as total FROM products');
  const total = countResult[0].total;

  res.json({ data: rows, total, page, limit });
}));

router.post('/', asyncHandler(async (req, res) => {
  const id = req.body.id || crypto.randomUUID();
  const { name, description, price, purchase_price, prices, stock_quantity } = req.body;
  const vat_rate = req.body.vat_rate ?? req.body.vatRate ?? 19;

  await db.query(
    `INSERT INTO products (id, name, description, price, purchase_price, vat_rate, prices, stock_quantity)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, name, description, price, purchase_price, vat_rate, JSON.stringify(prices || []), stock_quantity || 0]
  );
  res.status(201).json({ id, ...req.body, vat_rate });
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const { name, description, price, purchase_price, prices, stock_quantity } = req.body;
  const vat_rate = req.body.vat_rate ?? req.body.vatRate ?? 19;

  await db.query(
    `UPDATE products SET name=?, description=?, price=?, purchase_price=?, vat_rate=?, prices=?, stock_quantity=? WHERE id=?`,
    [name, description, price, purchase_price, vat_rate, JSON.stringify(prices || []), stock_quantity, req.params.id]
  );
  res.json({ success: true });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  await db.query('DELETE FROM products WHERE id=?', [req.params.id]);
  res.json({ success: true });
}));

export default router;
