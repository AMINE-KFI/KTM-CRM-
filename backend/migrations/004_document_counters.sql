-- Migration 004 : numérotation des documents (FAC/PRO/BL/BC/...) calculée côté serveur, de façon
-- atomique. Avant, le prochain numéro était calculé côté navigateur à partir des documents déjà
-- chargés en mémoire : si deux personnes valident un document en même temps depuis deux postes,
-- rien n'empêchait deux factures de recevoir le même numéro.
-- À exécuter une seule fois, après 002 et 003.

CREATE TABLE IF NOT EXISTS document_counters (
  counter_key VARCHAR(100) PRIMARY KEY,
  counter INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Reprend la numérotation là où elle en était à partir des références déjà attribuées, pour ne
-- jamais redistribuer un numéro déjà utilisé sur une facture/BL/BC existant(e).
INSERT INTO document_counters (counter_key, counter)
SELECT
  SUBSTRING(reference, 1, LENGTH(reference) - LENGTH(SUBSTRING_INDEX(reference, '-', -1)) - 1) AS counter_key,
  MAX(CAST(SUBSTRING_INDEX(reference, '-', -1) AS UNSIGNED)) AS counter
FROM documents
WHERE reference REGEXP '^[A-Z]+-[A-Z]+-[0-9]{4}-[0-9]+$'
GROUP BY counter_key
ON DUPLICATE KEY UPDATE counter = GREATEST(counter, VALUES(counter));
