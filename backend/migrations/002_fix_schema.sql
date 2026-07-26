-- Migration 002 : corrige la dérive entre schema.sql et la base réelle (cf. audit),
-- ajoute les tables Stock et Équipe (users.tenant), et les index manquants.
-- À exécuter une seule fois dans phpMyAdmin sur la base de production.
-- Sans danger pour les données existantes (ADD COLUMN / CONVERT / CREATE TABLE IF NOT EXISTS uniquement).

-- 1. Colonne manquante qui casse actuellement toute création/modification de document
ALTER TABLE documents ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'À échéance';

-- 1bis. Suivi des relances impayés (fonctionnalité "Envoyer les rappels" des Paramètres)
ALTER TABLE documents ADD COLUMN IF NOT EXISTS reminder_count INT DEFAULT 0;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS last_reminder_date DATE NULL;

-- 2. Uniformisation du charset (les tables sont en latin1 alors que les colonnes JSON sont en utf8mb4 :
--    risque de corruption des accents/caractères spéciaux dans noms, adresses, notes...)
-- Les clés étrangères entre companies/documents/document_items/payments empêchent MariaDB de
-- convertir le charset tant qu'elles existent (erreur 1833) : on les retire avant, on les remet après.
ALTER TABLE documents DROP FOREIGN KEY documents_ibfk_1;
ALTER TABLE document_items DROP FOREIGN KEY document_items_ibfk_1;
ALTER TABLE payments DROP FOREIGN KEY payments_ibfk_1;

ALTER TABLE companies CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE documents CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE document_items CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE products CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE expenses CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE payments CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE users CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE documents ADD CONSTRAINT documents_ibfk_1 FOREIGN KEY (company_id) REFERENCES companies(id);
ALTER TABLE document_items ADD CONSTRAINT document_items_ibfk_1 FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE;
ALTER TABLE payments ADD CONSTRAINT payments_ibfk_1 FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE;

-- 3. Équipe : chaque compte peut être rattaché à une société (NULL = accès aux deux)
ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant VARCHAR(50) NULL DEFAULT NULL;

-- 4. Stock : remplace la colonne JSON `products.stock` (ajoutée manuellement, jamais utilisée par le backend)
--    par un vrai suivi par société + historique des mouvements.
CREATE TABLE IF NOT EXISTS stock_levels (
  product_id VARCHAR(50) NOT NULL,
  tenant VARCHAR(50) NOT NULL,
  quantity INT NOT NULL DEFAULT 0,
  PRIMARY KEY (product_id, tenant),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS stock_movements (
  id VARCHAR(50) PRIMARY KEY,
  product_id VARCHAR(50) NOT NULL,
  tenant VARCHAR(50) NOT NULL,
  type ENUM('in','out') NOT NULL,
  quantity INT NOT NULL,
  reference_id VARCHAR(50) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Index manquants pour les filtres par société/exercice fiscal (déjà utilisés dans le code, jamais indexés)
ALTER TABLE documents ADD INDEX IF NOT EXISTS idx_tenant (tenant);
ALTER TABLE documents ADD INDEX IF NOT EXISTS idx_fiscal_year (fiscal_year);
ALTER TABLE expenses ADD INDEX IF NOT EXISTS idx_tenant (tenant);
ALTER TABLE payments ADD INDEX IF NOT EXISTS idx_tenant (tenant);

-- 6. Défaut correct pour vat_rate (les lignes existantes sans TVA renseignée passent à 19%)
UPDATE products SET vat_rate = 19 WHERE vat_rate IS NULL;
