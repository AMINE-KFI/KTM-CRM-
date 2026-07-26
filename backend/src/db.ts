import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Create a connection pool for MySQL
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'katamine_crm',
  port: Number(process.env.DB_PORT) || 8889,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // Sans ça, mysql2 renvoie les colonnes DATE/DATETIME/TIMESTAMP en objets Date JS, convertis
  // en horodatage UTC avec décalage de fuseau horaire au (dé)sérialisation JSON. Une date stockée
  // décalait alors d'un jour à chaque aller-retour (fetch → renvoi au serveur), et MariaDB rejetait
  // ensuite ce format complet (avec heure) sur les colonnes DATE.
  dateStrings: true
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
