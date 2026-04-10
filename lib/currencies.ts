/**
 * Currencies Configuration
 * 
 * Source de vérité pour toutes les devises supportées par la plateforme.
 * Utilisé par le frontend (useCurrency, OrganizationPanel) et le backend (pdfService, financeController).
 */

export interface CurrencyConfig {
  /** ISO 4217 code (XOF, EUR, USD, etc.) */
  code: string;
  /** Nom complet pour affichage dans les selects */
  name: string;
  /** Symbole court (FCFA, €, $, DH, GNF) */
  symbol: string;
  /** Position du symbole: 'suffix' (1 500 FCFA) ou 'prefix' (€1 500,00) */
  symbolPosition: 'prefix' | 'suffix';
  /** Nombre de décimales (0 pour XOF/XAF/GNF, 2 pour EUR/USD/MAD) */
  decimals: number;
  /** Locale pour Intl.NumberFormat */
  locale: string;
  /** Séparateur de milliers pour affichage (espace pour FR, virgule pour US) */
  thousandsSeparator?: string;
}

export const CURRENCIES: CurrencyConfig[] = [
  { code: 'XOF', name: 'Franc CFA (BCEAO)',  symbol: 'FCFA', symbolPosition: 'suffix', decimals: 0, locale: 'fr-FR' },
  { code: 'XAF', name: 'Franc CFA (BEAC)',   symbol: 'FCFA', symbolPosition: 'suffix', decimals: 0, locale: 'fr-FR' },
  { code: 'EUR', name: 'Euro',               symbol: '€',    symbolPosition: 'suffix', decimals: 2, locale: 'fr-FR' },
  { code: 'USD', name: 'Dollar US',          symbol: '$',     symbolPosition: 'prefix', decimals: 2, locale: 'en-US' },
  { code: 'MAD', name: 'Dirham Marocain',    symbol: 'DH',   symbolPosition: 'suffix', decimals: 2, locale: 'fr-FR' },
  { code: 'GNF', name: 'Franc Guinéen',      symbol: 'GNF',  symbolPosition: 'suffix', decimals: 0, locale: 'fr-FR' },
];

/** Map rapide code → config */
export const CURRENCY_MAP: Record<string, CurrencyConfig> = Object.fromEntries(
  CURRENCIES.map(c => [c.code, c])
);

/** Devise par défaut */
export const DEFAULT_CURRENCY = 'XOF';

/**
 * Formate un montant selon la devise spécifiée.
 * 
 * @param amount - Montant à formater
 * @param currencyCode - Code devise ISO (XOF, EUR, USD, etc.)
 * @returns Chaîne formatée (ex: "1 500 000 FCFA", "1 500,00 €", "$1,500.00")
 */
export function formatCurrency(
  amount: number | string | undefined | null,
  currencyCode?: string
): string {
  if (amount === undefined || amount === null) return '--';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '--';

  const config = CURRENCY_MAP[currencyCode || DEFAULT_CURRENCY];
  
  if (!config) {
    // Fallback: format basique avec code devise
    return `${num.toLocaleString('fr-FR')} ${currencyCode || ''}`.trim();
  }

  return num.toLocaleString(config.locale, {
    minimumFractionDigits: config.decimals,
    maximumFractionDigits: config.decimals,
  });
}

/**
 * Retourne la config d'une devise par son code
 */
export function getCurrencyConfig(code?: string): CurrencyConfig {
  return CURRENCY_MAP[code || DEFAULT_CURRENCY] || CURRENCY_MAP[DEFAULT_CURRENCY];
}
