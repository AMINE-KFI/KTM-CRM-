// Seed minimal pour un environnement de dev local vide : crée un compte admin.
// Usage: npx ts-node seed.ts
import dotenv from 'dotenv';
dotenv.config();

import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

async function seed() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'katamine_crm',
    port: Number(process.env.DB_PORT) || 3306,
  });

  const email = 'admin@katamine.dz';
  const password = 'admin123';

  const [existing]: any = await connection.query('SELECT id FROM users WHERE email = ?', [email]);
  if (existing.length > 0) {
    console.log(`Un utilisateur existe déjà avec l'email ${email}, rien à faire.`);
    await connection.end();
    return;
  }

  const hashed = await bcrypt.hash(password, 10);
  await connection.query(
    `INSERT INTO users (id, email, password, name, role, tenant, permissions) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [crypto.randomUUID(), email, hashed, 'Direction Katamine', 'admin', null, JSON.stringify([])]
  );

  console.log(`Compte admin créé : ${email} / ${password}`);
  await connection.end();
}

seed().catch(err => {
  console.error('Erreur de seed:', err);
  process.exit(1);
});
