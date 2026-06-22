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
    const tenant = req.query.tenant as string;

    let query = 'SELECT * FROM documents';
    let params: any[] = [];
    if (tenant) {
      query += ' WHERE tenant = ?';
      params.push(tenant);
    }
    
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [docs]: any = await db.query(query, params);
    
    let countQuery = 'SELECT COUNT(*) as total FROM documents';
    let countParams: any[] = [];
    if (tenant) {
      countQuery += ' WHERE tenant = ?';
      countParams.push(tenant);
    }
    const [countResult]: any = await db.query(countQuery, countParams);
    const total = countResult[0].total;
    
    // Si la liste est vide, on retourne vide sans fetcher les items
    if (docs.length === 0) {
      return res.json({ data: [], total, page, limit });
    }

    const docIds = docs.map((d: any) => d.id);
    const [items]: any = await db.query('SELECT * FROM document_items WHERE document_id IN (?)', [docIds]);
    
    const documentsWithItems = docs.map((doc: any) => ({
      ...doc,
      items: items.filter((item: any) => item.document_id === doc.id)
    }));

    res.json({ data: documentsWithItems, total, page, limit });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const connection = await (db as any).getConnection();
  try {
    await connection.beginTransaction();

    const id = req.body.id || crypto.randomUUID();
    const { type, reference, date, status, notes, items } = req.body;
    const company_id = req.body.company_id || req.body.companyId;
    const due_date = req.body.due_date || req.body.dueDate || date;
    const sub_total = req.body.sub_total || req.body.subtotal || 0;
    const tax_total = req.body.tax_total || req.body.vatAmount || 0;
    const total_amount = req.body.total_amount || req.body.totalAmount || 0;
    const stamp_amount = req.body.stamp_amount || req.body.stampAmount || 0;
    const payment_method = req.body.payment_method || req.body.paymentMethod || 'À échéance';
    const tenant = req.body.tenant || 'katamine';
    const fiscal_year = req.body.fiscal_year || req.body.fiscalYear || new Date().getFullYear().toString();
    
    await connection.query(
      `INSERT INTO documents (id, type, reference, company_id, date, due_date, status, sub_total, tax_total, total_amount, notes, stamp_amount, fiscal_year, tenant, payment_method) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, type, reference, company_id, date, due_date, status || 'draft', sub_total, tax_total, total_amount, notes, stamp_amount, fiscal_year, tenant, payment_method]
    );

    if (items && Array.isArray(items)) {
      for (const item of items) {
        const itemId = item.id || crypto.randomUUID();
        await connection.query(
          `INSERT INTO document_items (id, document_id, product_id, description, quantity, unit_price, vat_rate, discount)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [itemId, id, item.product_id || item.productId || null, item.description || item.name || null, item.quantity, item.unit_price || item.unitPrice, item.vat_rate || item.vatRate || 19, item.discount || 0]
        );
      }
    }



    await connection.commit();
    res.status(201).json({ id, ...req.body });
  } catch (err: any) {
    await connection.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
});

router.put('/:id', async (req, res) => {
  const connection = await (db as any).getConnection();
  try {
    await connection.beginTransaction();

    const { type, reference, date, status, notes, items } = req.body;
    const company_id = req.body.company_id || req.body.companyId;
    const due_date = req.body.due_date || req.body.dueDate || date;
    const sub_total = req.body.sub_total || req.body.subtotal || 0;
    const tax_total = req.body.tax_total || req.body.vatAmount || 0;
    const total_amount = req.body.total_amount || req.body.totalAmount || 0;
    const stamp_amount = req.body.stamp_amount || req.body.stampAmount || 0;
    const payment_method = req.body.payment_method || req.body.paymentMethod || 'À échéance';
    const docId = req.params.id;



    await connection.query(
      `UPDATE documents SET type=?, reference=?, company_id=?, date=?, due_date=?, status=?, sub_total=?, tax_total=?, total_amount=?, notes=?, stamp_amount=?, payment_method=? WHERE id=?`,
      [type, reference, company_id, date, due_date, status, sub_total, tax_total, total_amount, notes, stamp_amount, payment_method, docId]
    );

    // Simplification: on supprime tous les items et on les recrée
    await connection.query('DELETE FROM document_items WHERE document_id=?', [docId]);

    if (items && Array.isArray(items)) {
      for (const item of items) {
        const itemId = item.id || crypto.randomUUID();
        await connection.query(
          `INSERT INTO document_items (id, document_id, product_id, description, quantity, unit_price, vat_rate, discount)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [itemId, docId, item.product_id || item.productId || null, item.description || item.name || null, item.quantity, item.unit_price || item.unitPrice, item.vat_rate || item.vatRate || 19, item.discount || 0]
        );
      }
    }



    await connection.commit();
    res.json({ success: true });
  } catch (err: any) {
    await connection.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
});

router.delete('/:id', async (req, res) => {
  const connection = await (db as any).getConnection();
  try {
    await connection.beginTransaction();
    const docId = req.params.id;



    // La suppression en cascade supprimera aussi les document_items et payments liés
    await connection.query('DELETE FROM documents WHERE id=?', [docId]);
    
    await connection.commit();
    res.json({ success: true });
  } catch (err: any) {
    await connection.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
});

export default router;
