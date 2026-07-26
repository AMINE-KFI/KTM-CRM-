import { Router } from 'express';
import db from '../db';
import { verifyToken } from '../auth';
import { asyncHandler, paginate } from '../lib/http';
import { applyStockMovement } from '../lib/stock';
import { getNextReference } from '../lib/reference';
import crypto from 'crypto';

const router = Router();
router.use(verifyToken);

// Types de documents dont la validation impacte le stock
const STOCK_OUT_TYPES = ['invoice', 'delivery_note'];

router.get('/', asyncHandler(async (req, res) => {
  const { page, limit, offset } = paginate(req);
  const tenant = req.query.tenant as string;

  let query = 'SELECT * FROM documents';
  const params: any[] = [];
  if (tenant) {
    query += ' WHERE tenant = ?';
    params.push(tenant);
  }
  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const [docs]: any = await db.query(query, params);

  let countQuery = 'SELECT COUNT(*) as total FROM documents';
  const countParams: any[] = [];
  if (tenant) {
    countQuery += ' WHERE tenant = ?';
    countParams.push(tenant);
  }
  const [countResult]: any = await db.query(countQuery, countParams);
  const total = countResult[0].total;

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
}));

router.post('/', asyncHandler(async (req, res) => {
  const connection = await (db as any).getConnection();
  try {
    await connection.beginTransaction();

    const id = req.body.id || crypto.randomUUID();
    const { type, date, status, notes, items } = req.body;
    const company_id = req.body.company_id || req.body.companyId;
    const due_date = req.body.due_date || req.body.dueDate || date;
    const sub_total = req.body.sub_total || req.body.subtotal || 0;
    const tax_total = req.body.tax_total || req.body.vatAmount || 0;
    const total_amount = req.body.total_amount || req.body.totalAmount || 0;
    const stamp_amount = req.body.stamp_amount || req.body.stampAmount || 0;
    const payment_method = req.body.payment_method || req.body.paymentMethod || 'À échéance';
    const tenant = req.body.tenant || 'katamine';
    const fiscal_year = req.body.fiscal_year || req.body.fiscalYear || new Date().getFullYear().toString();
    const finalStatus = status || 'draft';

    // La numérotation officielle (FAC-KTM-2026-0001...) n'est attribuée qu'à la validation, de façon
    // atomique côté serveur — sinon on garde la référence provisoire envoyée par le client (brouillon).
    const reference = finalStatus === 'validated'
      ? await getNextReference(connection, type, tenant, fiscal_year)
      : req.body.reference;

    await connection.query(
      `INSERT INTO documents (id, type, reference, company_id, date, due_date, status, sub_total, tax_total, total_amount, notes, stamp_amount, fiscal_year, tenant, payment_method)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, type, reference, company_id, date, due_date, finalStatus, sub_total, tax_total, total_amount, notes, stamp_amount, fiscal_year, tenant, payment_method]
    );

    if (items && Array.isArray(items)) {
      for (const item of items) {
        const itemId = item.id || crypto.randomUUID();
        const productId = item.product_id || item.productId || null;
        const quantity = item.quantity;
        await connection.query(
          `INSERT INTO document_items (id, document_id, product_id, description, quantity, unit_price, vat_rate, discount)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [itemId, id, productId, item.description || item.name || null, quantity, item.unit_price || item.unitPrice, item.vat_rate || item.vatRate || 19, item.discount || 0]
        );

        if (finalStatus === 'validated' && STOCK_OUT_TYPES.includes(type) && productId) {
          await applyStockMovement(connection, { productId, tenant, type: 'out', quantity, referenceId: id });
        }
      }
    }

    await connection.commit();
    res.status(201).json({ id, ...req.body, reference });
  } catch (err: any) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const connection = await (db as any).getConnection();
  try {
    await connection.beginTransaction();

    const docId = req.params.id;
    const [existingRows]: any = await connection.query('SELECT * FROM documents WHERE id = ?', [docId]);
    const oldDoc = existingRows[0];

    const { type, date, status, notes, items } = req.body;
    const company_id = req.body.company_id || req.body.companyId;
    const due_date = req.body.due_date || req.body.dueDate || date;
    const sub_total = req.body.sub_total || req.body.subtotal || 0;
    const tax_total = req.body.tax_total || req.body.vatAmount || 0;
    const total_amount = req.body.total_amount || req.body.totalAmount || 0;
    const stamp_amount = req.body.stamp_amount || req.body.stampAmount || 0;
    const payment_method = req.body.payment_method || req.body.paymentMethod || 'À échéance';
    const tenant = req.body.tenant || oldDoc?.tenant || 'katamine';
    const fiscal_year = req.body.fiscal_year || req.body.fiscalYear || oldDoc?.fiscal_year || new Date().getFullYear().toString();
    // reminderCount (camelCase) prime sur reminder_count : le frontend renvoie l'objet complet du
    // document (avec le snake_case brut hérité du dernier fetch) fusionné avec la mise à jour voulue
    // en camelCase — le snake_case brut ne doit jamais écraser la valeur explicitement mise à jour.
    const reminder_count = req.body.reminderCount ?? req.body.reminder_count ?? oldDoc?.reminder_count ?? 0;
    const last_reminder_date = req.body.last_reminder_date || req.body.lastReminderDate || oldDoc?.last_reminder_date || null;

    const becomesValidated = oldDoc && oldDoc.status !== 'validated' && status === 'validated';
    const becomesReceived = oldDoc && oldDoc.type === 'purchase_order' && oldDoc.status !== 'received' && status === 'received';

    // Numérotation officielle attribuée une seule fois, à la validation, de façon atomique côté
    // serveur — sinon on garde la référence déjà en base (brouillon ou déjà validé).
    const reference = becomesValidated
      ? await getNextReference(connection, type, tenant, fiscal_year)
      : (oldDoc?.reference || req.body.reference);

    await connection.query(
      `UPDATE documents SET type=?, reference=?, company_id=?, date=?, due_date=?, status=?, sub_total=?, tax_total=?, total_amount=?, notes=?, stamp_amount=?, payment_method=?, reminder_count=?, last_reminder_date=? WHERE id=?`,
      [type, reference, company_id, date, due_date, status, sub_total, tax_total, total_amount, notes, stamp_amount, payment_method, reminder_count, last_reminder_date, docId]
    );

    // Simplification: on supprime tous les items et on les recrée
    await connection.query('DELETE FROM document_items WHERE document_id=?', [docId]);

    if (items && Array.isArray(items)) {
      for (const item of items) {
        const itemId = item.id || crypto.randomUUID();
        const productId = item.product_id || item.productId || null;
        const quantity = item.quantity;
        await connection.query(
          `INSERT INTO document_items (id, document_id, product_id, description, quantity, unit_price, vat_rate, discount)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [itemId, docId, productId, item.description || item.name || null, quantity, item.unit_price || item.unitPrice, item.vat_rate || item.vatRate || 19, item.discount || 0]
        );

        if (productId) {
          if (becomesValidated && STOCK_OUT_TYPES.includes(type)) {
            await applyStockMovement(connection, { productId, tenant, type: 'out', quantity, referenceId: String(docId) });
          } else if (becomesReceived) {
            await applyStockMovement(connection, { productId, tenant, type: 'in', quantity, referenceId: String(docId) });
          }
        }
      }
    }

    await connection.commit();
    res.json({ success: true, reference });
  } catch (err: any) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}));

router.delete('/:id', asyncHandler(async (req, res) => {
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
    throw err;
  } finally {
    connection.release();
  }
}));

export default router;
