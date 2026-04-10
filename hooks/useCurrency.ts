import { useAuth } from '../contexts/AuthContext';
import { useDataContext } from '../contexts/DataContext';
import { formatCurrency as formatCurrencyLib, getCurrencyConfig, CURRENCIES, DEFAULT_CURRENCY } from '../lib/currencies';
import type { CurrencyConfig } from '../lib/currencies';

export { CURRENCIES };
export type { CurrencyConfig };

/**
 * Hook multi-devises pour le formatage des montants.
 * 
 * Résolution de la devise par défaut :
 *   user.currency → admin (SUPERADMIN).currency → 'XOF'
 * 
 * Usage basique (devise du tenant) :
 *   const { formatPrice, currency } = useCurrency();
 *   formatPrice(150000); // "150 000 FCFA"
 * 
 * Usage avec devise spécifique (ex: facture en EUR) :
 *   formatPrice(1500, 'EUR'); // "1 500,00 €"
 */
export const useCurrency = () => {
  const { user } = useAuth();
  const { users } = useDataContext();

  // Hierarchy: User > Admin (Organization) > Default
  const admin = users.find(u => u.role === 'SUPERADMIN');
  const currency = user?.currency || admin?.currency || DEFAULT_CURRENCY;
  const currencyConfig = getCurrencyConfig(currency);

  /**
   * Formate un montant en devise.
   * @param amount - Montant à formater
   * @param overrideCurrency - Devise spécifique (ex: pour une facture en EUR)
   */
  const formatPrice = (amount: number | string | undefined | null, overrideCurrency?: string): string => {
    return formatCurrencyLib(amount, overrideCurrency || currency);
  };

  /**
   * Retourne le symbole de la devise courante (ou spécifiée)
   */
  const getSymbol = (code?: string): string => {
    return getCurrencyConfig(code || currency).symbol;
  };

  /**
   * Retourne le nombre de décimales de la devise courante (ou spécifiée)
   */
  const getDecimals = (code?: string): number => {
    return getCurrencyConfig(code || currency).decimals;
  };

  return { 
    currency, 
    currencyConfig,
    formatPrice, 
    getSymbol,
    getDecimals,
    CURRENCIES,
  };
};
