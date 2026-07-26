-- Base de données pour Katamine CRM / KL Tools ERP
-- Fichier à importer dans phpMyAdmin sur cPanel pour une INSTALLATION NEUVE.
-- Si une base existe déjà en production, utilisez plutôt migrations/002_fix_schema.sql.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(50) PRIMARY KEY,
  `email` VARCHAR(100) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `role` ENUM('admin', 'user') DEFAULT 'user',
  `tenant` VARCHAR(50) DEFAULT NULL, -- NULL = accès aux deux sociétés (Katamine + KL Tools)
  `permissions` JSON,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `companies` (
  `id` VARCHAR(50) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `legal_form` VARCHAR(100),
  `role` ENUM('client', 'supplier', 'both') DEFAULT 'client',
  `email` VARCHAR(100),
  `website` VARCHAR(255),
  `phone` VARCHAR(50),
  `address` TEXT,
  `city` VARCHAR(100),
  `postal_code` VARCHAR(20),
  `country` VARCHAR(100),
  `rc` VARCHAR(100),
  `nif` VARCHAR(100),
  `nis` VARCHAR(100),
  `art` VARCHAR(100),
  `capital` VARCHAR(100),
  `fiscal_year` VARCHAR(50),
  `contacts` JSON,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `products` (
  `id` VARCHAR(50) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `price` DECIMAL(15, 2) NOT NULL,
  `purchase_price` DECIMAL(15, 2),
  `vat_rate` DECIMAL(5, 2) DEFAULT 19,
  `prices` JSON,
  `stock_quantity` INT DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `documents` (
  `id` VARCHAR(50) PRIMARY KEY,
  `type` ENUM('invoice', 'proforma', 'delivery_note', 'purchase_order', 'supplier_invoice', 'receipt_note') NOT NULL,
  `reference` VARCHAR(50) NOT NULL,
  `company_id` VARCHAR(50) NOT NULL,
  `date` DATE NOT NULL,
  `due_date` DATE NOT NULL,
  `status` VARCHAR(20) DEFAULT 'draft',
  `sub_total` DECIMAL(15, 2) NOT NULL,
  `tax_total` DECIMAL(15, 2) NOT NULL,
  `total_amount` DECIMAL(15, 2) NOT NULL,
  `notes` TEXT,
  `stamp_amount` DECIMAL(10, 2) DEFAULT 0,
  `fiscal_year` VARCHAR(10) NOT NULL,
  `tenant` VARCHAR(50) DEFAULT 'katamine',
  `payment_method` VARCHAR(50) DEFAULT 'À échéance',
  `reminder_count` INT DEFAULT 0,
  `last_reminder_date` DATE NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`),
  INDEX `idx_tenant` (`tenant`),
  INDEX `idx_fiscal_year` (`fiscal_year`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `document_items` (
  `id` VARCHAR(50) PRIMARY KEY,
  `document_id` VARCHAR(50) NOT NULL,
  `product_id` VARCHAR(50) NULL,
  `description` VARCHAR(255) NULL,
  `quantity` INT NOT NULL,
  `unit_price` DECIMAL(15, 2) NOT NULL,
  `vat_rate` DECIMAL(5, 2) NOT NULL,
  `discount` DECIMAL(15, 2) DEFAULT 0,
  FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `payments` (
  `id` VARCHAR(50) PRIMARY KEY,
  `document_id` VARCHAR(50) NOT NULL,
  `amount` DECIMAL(15, 2) NOT NULL,
  `date` DATE NOT NULL,
  `method` VARCHAR(50) NOT NULL,
  `reference` VARCHAR(100),
  `notes` TEXT,
  `fiscal_year` VARCHAR(10) NOT NULL,
  `tenant` VARCHAR(50) DEFAULT 'katamine',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON DELETE CASCADE,
  INDEX `idx_tenant` (`tenant`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `expenses` (
  `id` VARCHAR(50) PRIMARY KEY,
  `amount` DECIMAL(15, 2) NOT NULL,
  `category` VARCHAR(100) NOT NULL,
  `date` DATE NOT NULL,
  `description` TEXT,
  `payment_method` VARCHAR(50),
  `reference` VARCHAR(100),
  `fiscal_year` VARCHAR(10) NOT NULL,
  `tenant` VARCHAR(50) DEFAULT 'katamine',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_tenant` (`tenant`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Stock partagé par produit, mais suivi séparément par société (katamine / kltools)
CREATE TABLE IF NOT EXISTS `stock_levels` (
  `product_id` VARCHAR(50) NOT NULL,
  `tenant` VARCHAR(50) NOT NULL,
  `quantity` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`product_id`, `tenant`),
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `stock_movements` (
  `id` VARCHAR(50) PRIMARY KEY,
  `product_id` VARCHAR(50) NOT NULL,
  `tenant` VARCHAR(50) NOT NULL,
  `type` ENUM('in', 'out') NOT NULL,
  `quantity` INT NOT NULL,
  `reference_id` VARCHAR(50) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
