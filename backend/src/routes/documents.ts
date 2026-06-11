import { Router } from 'express';
import db from '../db';
import { verifyToken } from '../auth';
import crypto from 'crypto';

const router = Router();

router.use(verifyToken);

router.get('/', async (req, res) => {
  try {
    const [docs]: any = await db.query('SELECT * FROM documents ORDER BY created_at DESC');
    
    // Pour simplifier et ne pas faire N requêtes, on va récupérer tous les items de tous les docs.
    // Dans une API plus robuste, on ferait ça plus proprement avec des jointures ou de la pagination.
    const [items]: any = await db.query('SELECT * FROM document_items');
    
    const documentsWithItems = docs.map((doc: any) => ({
      ...doc,
      items: items.filter((item: any) => item.document_id === doc.id)
    }));

    res.json(documentsWithItems);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const connection = await (db as any).getConnection();
  try {
    await connection.beginTransaction();

    const id = req.body.id || crypto.randomUUID();
    const { type, reference, date, status, notes, tenant, items } = req.body;
    const company_id = req.body.company_id || req.body.companyId;
    const due_date = req.body.due_date || req.body.dueDate || date;
    const sub_total = req.body.sub_total || req.body.subtotal || 0;
    const tax_total = req.body.tax_total || req.body.vatAmount || 0;
    const total_amount = req.body.total_amount || req.body.totalAmount || 0;
    const stamp_amount = req.body.stamp_amount || req.body.stampAmount || 0;
    const fiscal_year = req.body.fiscal_year || req.body.fiscalYear || new Date().getFullYear().toString();
    
    await connection.query(
      `INSERT INTO documents (id, type, reference, company_id, date, due_date, status, sub_total, tax_total, total_amount, notes, stamp_amount, fiscal_year, tenant) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, type, reference, company_id, date, due_date, status || 'draft', sub_total, tax_total, total_amount, notes, stamp_amount, fiscal_year, tenant || 'katamine']
    );

    if (items && Array.isArray(items)) {
      for (const item of items) {
        const itemId = item.id || crypto.randomUUID();
        await connection.query(
          `INSERT INTO document_items (id, document_id, product_id, quantity, unit_price, vat_rate, discount)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [itemId, id, item.product_id || item.productId, item.quantity, item.unit_price || item.unitPrice, item.vat_rate || item.vatRate || 19, item.discount || 0]
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
    const docId = req.params.id;

    await connection.query(
      `UPDATE documents SET type=?, reference=?, company_id=?, date=?, due_date=?, status=?, sub_total=?, tax_total=?, total_amount=?, notes=?, stamp_amount=? WHERE id=?`,
      [type, reference, company_id, date, due_date, status, sub_total, tax_total, total_amount, notes, stamp_amount, docId]
    );

    // Simplification: on supprime tous les items et on les recrée
    await connection.query('DELETE FROM document_items WHERE document_id=?', [docId]);

    if (items && Array.isArray(items)) {
      for (const item of items) {
        const itemId = item.id || crypto.randomUUID();
        await connection.query(
          `INSERT INTO document_items (id, document_id, product_id, quantity, unit_price, vat_rate, discount)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [itemId, docId, item.product_id || item.productId, item.quantity, item.unit_price || item.unitPrice, item.vat_rate || item.vatRate || 19, item.discount || 0]
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
  try {
    // La suppression en cascade supprimera aussi les document_items et payments liés
    await db.query('DELETE FROM documents WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
