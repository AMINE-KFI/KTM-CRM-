// Droit de timbre algérien (paiements en espèces) : par tranches de 100 DA ou fraction de tranche,
// taux progressif selon le montant, minimum 5 DA dès qu'il est dû, plafonné à 10 000 DA.
export function calculateStampDuty(amount: number): number {
  if (!amount || amount <= 300) return 0;

  const rate = amount <= 30000 ? 1 : amount <= 100000 ? 1.5 : 2;
  const brackets = Math.ceil(amount / 100);
  const duty = Math.round(brackets * rate);

  return Math.min(Math.max(duty, 5), 10000);
}
