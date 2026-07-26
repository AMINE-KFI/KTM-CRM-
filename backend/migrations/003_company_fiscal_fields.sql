-- Migration 003 : le formulaire client collecte forme juridique, ville, code postal, pays,
-- capital, exercice fiscal et ART, mais ces colonnes n'existaient pas dans `companies` — ces
-- champs étaient saisis puis silencieusement perdus (jamais envoyés à la base par le backend).
-- `ai` est renommé en `art` pour correspondre au nom utilisé partout côté frontend.

ALTER TABLE companies CHANGE COLUMN ai art VARCHAR(100);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS legal_form VARCHAR(100) NULL AFTER name;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS city VARCHAR(100) NULL AFTER address;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20) NULL AFTER city;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS country VARCHAR(100) NULL AFTER postal_code;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS capital VARCHAR(100) NULL AFTER art;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS fiscal_year VARCHAR(50) NULL AFTER capital;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS website VARCHAR(255) NULL AFTER email;
