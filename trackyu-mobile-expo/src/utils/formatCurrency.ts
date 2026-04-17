/**
 * TrackYu Mobile — Currency Formatter
 *
 * Centralise le formatage monétaire. Défaut : XOF (FCFA).
 * Lorsque le backend expose la devise par tenant, passer `currency` dynamiquement.
 */
export const DEFAULT_CURRENCY = 'XOF';

export function formatCurrency(
  amount: number | string | null | undefined,
  currency: string = DEFAULT_CURRENCY
): string {
  const n = Number(amount);
  if (!isFinite(n) || isNaN(n)) return '—';
  return n.toLocaleString('fr-FR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  });
}
