import { Router } from 'express';
import db from '../db';
import { verifyToken } from '../auth';
import { asyncHandler } from '../lib/http';
import { applyStockMovement } from '../lib/stock';

const router = Router();

router.use(verifyToken);

// Niveaux de stock actuels, éventuellement filtrés par société
router.get('/', asyncHandler(async (req, res) => {
  const tenant = req.query.tenant as string;
  const query = tenant
    ? 'SELECT * FROM stock_levels WHERE tenant = ?'
    : 'SELECT * FROM stock_levels';
  const params = tenant ? [tenant] : [];

  const [rows]: any = await db.query(query, params);
  res.json({ data: rows });
}));

router.get('/movements', asyncHandler(async (req, res) => {
  const tenant = req.query.tenant as string;
  const productId = req.query.productId as string;

  const conditions: string[] = [];
  const params: any[] = [];
  if (tenant) { conditions.push('tenant = ?'); params.push(tenant); }
  if (productId) { conditions.push('product_id = ?'); params.push(productId); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const [rows]: any = await db.query(`SELECT * FROM stock_movements ${where} ORDER BY created_at DESC LIMIT 200`, params);
  res.json({ data: rows });
}));

// Mouvement manuel (correction d'inventaire, entrée initiale...). Les mouvements liés à la
// validation d'un document (facture, BL, réception de BC) sont gérés directement dans documents.ts.
router.post('/movements', asyncHandler(async (req, res) => {
  const { productId, tenant, type, quantity, referenceId } = req.body;

  if (!productId || !tenant || !['in', 'out'].includes(type) || !quantity || quantity <= 0) {
    return res.status(400).json({ error: 'productId, tenant, type (in/out) et quantity (>0) sont requis.' });
  }

  const connection = await (db as any).getConnection();
  try {
    await connection.beginTransaction();
    await applyStockMovement(connection, { productId, tenant, type, quantity, referenceId });
    await connection.commit();
    res.status(201).json({ success: true });
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}));

export default router;
