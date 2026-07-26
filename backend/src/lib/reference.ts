const TYPE_PREFIX: Record<string, string> = {
  invoice: 'FAC',
  proforma: 'PRO',
  delivery_note: 'BL',
  purchase_order: 'BC',
  supplier_invoice: 'FACF',
  receipt_note: 'BR',
};

// Numérotation atomique côté serveur (FAC-KTM-2026-0001, ...). `document_counters` est incrémenté
// via INSERT ... ON DUPLICATE KEY UPDATE, qui verrouille la ligne du compteur concerné le temps de
// l'incrément : deux validations concurrentes du même type/société/exercice ne peuvent jamais
// recevoir le même numéro (contrairement à l'ancien calcul côté navigateur, à partir de ce qui
// était déjà chargé en mémoire).
export async function getNextReference(connection: any, type: string, tenant: string, fiscalYear: string): Promise<string> {
  const prefixCode = TYPE_PREFIX[type] || 'DOC';
  const tenantCode = tenant === 'kltools' ? 'KLT' : 'KTM';
  const year = fiscalYear || new Date().getFullYear().toString();
  const counterKey = `${prefixCode}-${tenantCode}-${year}`;

  await connection.query(
    `INSERT INTO document_counters (counter_key, counter) VALUES (?, 1)
     ON DUPLICATE KEY UPDATE counter = LAST_INSERT_ID(counter + 1)`,
    [counterKey]
  );
  const [rows]: any = await connection.query('SELECT LAST_INSERT_ID() as counter');
  const counter = Number(rows[0].counter);

  return `${counterKey}-${counter.toString().padStart(4, '0')}`;
}
