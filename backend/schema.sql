-- Base de données pour Katamine CRM
-- Fichier à importer dans phpMyAdmin sur cPanel

CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(50) PRIMARY KEY,
  `email` VARCHAR(100) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `role` ENUM('admin', 'user') DEFAULT 'user',
  `permissions` JSON,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `companies` (
  `id` VARCHAR(50) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `role` ENUM('client', 'supplier', 'both') DEFAULT 'client',
  `email` VARCHAR(100),
  `phone` VARCHAR(50),
  `address` TEXT,
  `rc` VARCHAR(100),
  `nif` VARCHAR(100),
  `nis` VARCHAR(100),
  `ai` VARCHAR(100),
  `contacts` JSON,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

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
);

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
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`)
);

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
);

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
  FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON DELETE CASCADE
);

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
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
