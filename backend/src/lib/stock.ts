import crypto from 'crypto';

interface StockMovementInput {
  productId: string;
  tenant: string;
  type: 'in' | 'out';
  quantity: number;
  referenceId?: string | null;
}

// Enregistre un mouvement de stock et met à jour le niveau courant, dans la transaction fournie.
// Utilisé à la fois par la validation de documents (sortie sur facture/BL, entrée sur réception) et par l'ajustement manuel.
export const applyStockMovement = async (connection: any, movement: StockMovementInput) => {
  const { productId, tenant, type, quantity, referenceId } = movement;
  if (!productId || !tenant || quantity <= 0) return;

  const id = crypto.randomUUID();

  await connection.query(
    `INSERT INTO stock_movements (id, product_id, tenant, type, quantity, reference_id) VALUES (?, ?, ?, ?, ?, ?)`,
    [id, productId, tenant, type, quantity, referenceId || null]
  );

  const delta = type === 'in' ? quantity : -quantity;

  await connection.query(
    `INSERT INTO stock_levels (product_id, tenant, quantity) VALUES (?, ?, GREATEST(0, ?))
     ON DUPLICATE KEY UPDATE quantity = GREATEST(0, quantity + ?)`,
    [productId, tenant, delta, delta]
  );
};
