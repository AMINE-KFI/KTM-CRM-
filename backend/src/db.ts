import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Create a connection pool for MySQL
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'katamine_crm',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// We can test the connection here
pool.getConnection()
  .then(conn => {
    console.log('✅ Connected to MySQL Database!');
    conn.release();
  })
  .catch(err => {
    console.error('❌ Failed to connect to MySQL Database:', err.message);
  });

export default pool;
