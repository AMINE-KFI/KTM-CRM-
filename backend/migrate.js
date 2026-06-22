const mysql = require('mysql2/promise');
require('dotenv').config({ path: './.env' });

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'katamine_crm',
    multipleStatements: true
  });

  try {
    console.log('Altering document_items table...');
    await connection.query(`
      ALTER TABLE document_items MODIFY COLUMN product_id VARCHAR(50) NULL;
    `);
    console.log('product_id is now nullable');
  } catch (e) {
    console.log('Error altering product_id:', e.message);
  }

  try {
    await connection.query(`
      ALTER TABLE document_items ADD COLUMN description VARCHAR(255) NULL;
    `);
    console.log('description column added');
  } catch (e) {
    console.log('Error adding description:', e.message);
  }

  try {
    await connection.query(`
      ALTER TABLE documents ADD COLUMN payment_method VARCHAR(50) DEFAULT 'À échéance';
    `);
    console.log('payment_method column added');
  } catch (e) {
    console.log('Error adding payment_method:', e.message);
  }

  console.log('Migration done.');
  process.exit(0);
}

migrate();
