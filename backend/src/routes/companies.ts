import { Router } from 'express';
import db from '../db';
import { verifyToken } from '../auth';
import { asyncHandler, paginate } from '../lib/http';
import crypto from 'crypto';

const router = Router();

// Appliquer le middleware de sécurité sur toutes les routes
router.use(verifyToken);

router.get('/', asyncHandler(async (req, res) => {
  const { page, limit, offset } = paginate(req);

  const [rows]: any = await db.query('SELECT * FROM companies ORDER BY created_at DESC LIMIT ? OFFSET ?', [limit, offset]);
  const [countResult]: any = await db.query('SELECT COUNT(*) as total FROM companies');
  const total = countResult[0].total;

  res.json({ data: rows, total, page, limit });
}));

router.post('/', asyncHandler(async (req, res) => {
  const id = req.body.id || crypto.randomUUID();
  const { name, role, email, phone, address, rc, nif, nis, contacts } = req.body;
  const legal_form = req.body.legal_form || req.body.legalForm;
  const website = req.body.website;
  const city = req.body.city;
  const postal_code = req.body.postal_code || req.body.postalCode;
  const country = req.body.country;
  const art = req.body.art;
  const capital = req.body.capital;
  const fiscal_year = req.body.fiscal_year || req.body.fiscalYear;

  await db.query(
    `INSERT INTO companies (id, name, legal_form, role, email, website, phone, address, city, postal_code, country, rc, nif, nis, art, capital, fiscal_year, contacts)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, name, legal_form, role || 'client', email, website, phone, address, city, postal_code, country, rc, nif, nis, art, capital, fiscal_year, JSON.stringify(contacts || [])]
  );
  res.status(201).json({ id, ...req.body });
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const { name, role, email, phone, address, rc, nif, nis, contacts } = req.body;
  const legal_form = req.body.legal_form || req.body.legalForm;
  const website = req.body.website;
  const city = req.body.city;
  const postal_code = req.body.postal_code || req.body.postalCode;
  const country = req.body.country;
  const art = req.body.art;
  const capital = req.body.capital;
  const fiscal_year = req.body.fiscal_year || req.body.fiscalYear;

  await db.query(
    `UPDATE companies SET name=?, legal_form=?, role=?, email=?, website=?, phone=?, address=?, city=?, postal_code=?, country=?, rc=?, nif=?, nis=?, art=?, capital=?, fiscal_year=?, contacts=? WHERE id=?`,
    [name, legal_form, role, email, website, phone, address, city, postal_code, country, rc, nif, nis, art, capital, fiscal_year, JSON.stringify(contacts || []), req.params.id]
  );
  res.json({ success: true });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  try {
    await db.query('DELETE FROM companies WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (err: any) {
    if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.errno === 1451) {
      return res.status(409).json({ error: "Impossible de supprimer : ce client/fournisseur a des documents (factures, BL, BC...) liés." });
    }
    throw err;
  }
}));

export default router;
