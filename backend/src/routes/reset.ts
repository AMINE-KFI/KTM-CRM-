import express from 'express';
import db from '../db';

const router = express.Router();

router.post('/', async (req, res) => {
  const connection = await (db as any).getConnection();
  try {
    await connection.beginTransaction();

    // Disable foreign key checks to truncate/delete safely
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');

    // Delete all data from tables
    await connection.query('DELETE FROM document_items');
    await connection.query('DELETE FROM payments');
    await connection.query('DELETE FROM documents');
    await connection.query('DELETE FROM expenses');
    await connection.query('DELETE FROM products');
    await connection.query('DELETE FROM companies');

    // Re-enable foreign key checks
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');

    await connection.commit();
    res.json({ success: true, message: 'Base de données réinitialisée avec succès.' });
  } catch (err: any) {
    await connection.rollback();
    await connection.query('SET FOREIGN_KEY_CHECKS = 1').catch(() => {});
    console.error('Reset DB Error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
});

export default router;
