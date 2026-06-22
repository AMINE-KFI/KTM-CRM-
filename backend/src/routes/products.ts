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

    const [rows]: any = await db.query('SELECT * FROM products ORDER BY name ASC LIMIT ? OFFSET ?', [limit, offset]);
    const [countResult]: any = await db.query('SELECT COUNT(*) as total FROM products');
    const total = countResult[0].total;

    res.json({ data: rows, total, page, limit });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const id = req.body.id || crypto.randomUUID();
    const { name, description, price, purchase_price, vat_rate, prices, stock_quantity } = req.body;
    
    await db.query(
      `INSERT INTO products (id, name, description, price, purchase_price, vat_rate, prices, stock_quantity) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, name, description, price, purchase_price, vat_rate, JSON.stringify(prices || []), stock_quantity || 0]
    );
    res.status(201).json({ id, ...req.body });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, description, price, purchase_price, vat_rate, prices, stock_quantity } = req.body;
    await db.query(
      `UPDATE products SET name=?, description=?, price=?, purchase_price=?, vat_rate=?, prices=?, stock_quantity=? WHERE id=?`,
      [name, description, price, purchase_price, vat_rate, JSON.stringify(prices || []), stock_quantity, req.params.id]
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM products WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
