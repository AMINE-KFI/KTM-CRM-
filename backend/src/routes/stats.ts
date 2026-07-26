import { Router } from 'express';
import db from '../db';
import { verifyToken } from '../auth';
import { asyncHandler } from '../lib/http';

const router = Router();

router.use(verifyToken);

router.get('/', asyncHandler(async (req, res) => {
  const tenant = req.query.tenant as string;
  const fiscalYear = req.query.fiscalYear as string;

  const conditions: string[] = [];
  const params: any[] = [];
  if (tenant) { conditions.push('tenant = ?'); params.push(tenant); }
  if (fiscalYear) { conditions.push('fiscal_year = ?'); params.push(fiscalYear); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [companiesResult]: any = await db.query(
    'SELECT COUNT(*) as total FROM companies WHERE role="client" OR role="both" OR role IS NULL OR role=""'
  );
  const totalCompanies = companiesResult[0].total;

  const [docsResult]: any = await db.query(`SELECT type, status, total_amount FROM documents ${where}`, params);

  let totalInvoices = 0;
  let unpaidInvoices = 0;
  let pendingQuotes = 0;
  let totalSales = 0;
  let totalPurchases = 0;

  docsResult.forEach((doc: any) => {
    if (doc.type === 'invoice') {
      totalInvoices++;
      if (doc.status !== 'cancelled') {
        totalSales += Number(doc.total_amount || 0);
        if (doc.status !== 'paid') unpaidInvoices++;
      }
    } else if (doc.type === 'supplier_invoice') {
      if (doc.status !== 'cancelled') totalPurchases += Number(doc.total_amount || 0);
    } else if (doc.type === 'proforma') {
      if (doc.status === 'draft' || doc.status === 'validated') pendingQuotes++;
    }
  });

  const [expensesResult]: any = await db.query(`SELECT amount FROM expenses ${where}`, params);
  const totalExpenses = expensesResult.reduce((sum: number, exp: any) => sum + Number(exp.amount || 0), 0);

  const paymentConditions: string[] = [];
  const paymentParams: any[] = [];
  if (tenant) { paymentConditions.push('p.tenant = ?'); paymentParams.push(tenant); }
  if (fiscalYear) { paymentConditions.push('p.fiscal_year = ?'); paymentParams.push(fiscalYear); }
  const paymentWhere = paymentConditions.length ? `WHERE ${paymentConditions.join(' AND ')}` : '';

  const [paymentsResult]: any = await db.query(
    `SELECT p.amount, d.type as document_type FROM payments p
     JOIN documents d ON d.id = p.document_id
     ${paymentWhere}`,
    paymentParams
  );
  const totalCollected = paymentsResult
    .filter((p: any) => p.document_type === 'invoice')
    .reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
  const totalPaidToSuppliers = paymentsResult
    .filter((p: any) => p.document_type === 'supplier_invoice')
    .reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);

  const netProfit = totalSales - totalPurchases - totalExpenses;

  res.json({
    stats: {
      totalCompanies,
      totalInvoices,
      unpaidInvoices,
      pendingQuotes
    },
    financialStats: {
      totalSales,
      totalPurchases,
      totalExpenses,
      netProfit,
      receivables: totalSales - totalCollected,
      payables: totalPurchases - totalPaidToSuppliers
    }
  });
}));

export default router;
