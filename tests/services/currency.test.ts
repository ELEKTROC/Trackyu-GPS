/**
 * Multi-Currency Tests - Sprint 5
 *
 * Tests for the centralized currency system:
 * - Currency config registry (CURRENCIES, CURRENCY_MAP)
 * - formatCurrency() with all supported currencies
 * - getCurrencyConfig() lookup
 * - Edge cases (null, undefined, NaN, unknown currencies)
 */

import { describe, it, expect } from 'vitest';
import {
  CURRENCIES,
  CURRENCY_MAP,
  DEFAULT_CURRENCY,
  formatCurrency,
  getCurrencyConfig,
} from '../../lib/currencies';
import type { CurrencyConfig } from '../../lib/currencies';

// ═════════════════════════════════════════════════════════════════════
// Currency Registry
// ═════════════════════════════════════════════════════════════════════
describe('Currency Registry', () => {
  it('has 6 supported currencies', () => {
    expect(CURRENCIES).toHaveLength(6);
  });

  it('includes XOF, XAF, EUR, USD, MAD, GNF', () => {
    const codes = CURRENCIES.map(c => c.code);
    expect(codes).toContain('XOF');
    expect(codes).toContain('XAF');
    expect(codes).toContain('EUR');
    expect(codes).toContain('USD');
    expect(codes).toContain('MAD');
    expect(codes).toContain('GNF');
  });

  it('default currency is XOF', () => {
    expect(DEFAULT_CURRENCY).toBe('XOF');
  });

  it('CURRENCY_MAP has all currencies indexed by code', () => {
    expect(Object.keys(CURRENCY_MAP)).toHaveLength(6);
    expect(CURRENCY_MAP['XOF']).toBeDefined();
    expect(CURRENCY_MAP['EUR']).toBeDefined();
    expect(CURRENCY_MAP['USD']).toBeDefined();
  });

  it('each currency has required fields', () => {
    for (const currency of CURRENCIES) {
      expect(currency.code).toBeTruthy();
      expect(currency.name).toBeTruthy();
      expect(currency.symbol).toBeTruthy();
      expect(['prefix', 'suffix']).toContain(currency.symbolPosition);
      expect(typeof currency.decimals).toBe('number');
      expect(currency.decimals).toBeGreaterThanOrEqual(0);
      expect(currency.locale).toBeTruthy();
    }
  });
});

// ═════════════════════════════════════════════════════════════════════
// Currency Decimals
// ═════════════════════════════════════════════════════════════════════
describe('Currency Decimals', () => {
  it('XOF has 0 decimals (integer currency)', () => {
    expect(CURRENCY_MAP['XOF'].decimals).toBe(0);
  });

  it('XAF has 0 decimals', () => {
    expect(CURRENCY_MAP['XAF'].decimals).toBe(0);
  });

  it('GNF has 0 decimals', () => {
    expect(CURRENCY_MAP['GNF'].decimals).toBe(0);
  });

  it('EUR has 2 decimals', () => {
    expect(CURRENCY_MAP['EUR'].decimals).toBe(2);
  });

  it('USD has 2 decimals', () => {
    expect(CURRENCY_MAP['USD'].decimals).toBe(2);
  });

  it('MAD has 2 decimals', () => {
    expect(CURRENCY_MAP['MAD'].decimals).toBe(2);
  });
});

// ═════════════════════════════════════════════════════════════════════
// Symbol Position
// ═════════════════════════════════════════════════════════════════════
describe('Currency Symbol Position', () => {
  it('XOF uses suffix (1 500 FCFA)', () => {
    expect(CURRENCY_MAP['XOF'].symbolPosition).toBe('suffix');
  });

  it('EUR uses suffix (1 500,00 €)', () => {
    expect(CURRENCY_MAP['EUR'].symbolPosition).toBe('suffix');
  });

  it('USD uses prefix ($1,500.00)', () => {
    expect(CURRENCY_MAP['USD'].symbolPosition).toBe('prefix');
  });

  it('MAD uses suffix (1 500,00 DH)', () => {
    expect(CURRENCY_MAP['MAD'].symbolPosition).toBe('suffix');
  });
});

// ═════════════════════════════════════════════════════════════════════
// formatCurrency()
// ═════════════════════════════════════════════════════════════════════
describe('formatCurrency()', () => {
  // XOF (no decimals, suffix FCFA)
  it('formats XOF correctly', () => {
    const result = formatCurrency(1500000, 'XOF');
    expect(result).toContain('FCFA');
    expect(result).toContain('1');
    expect(result).toContain('500');
    expect(result).toContain('000');
    // Should NOT have decimals
    expect(result).not.toMatch(/\.\d{2}/);
  });

  // EUR (2 decimals, suffix €)
  it('formats EUR correctly', () => {
    const result = formatCurrency(1500.50, 'EUR');
    expect(result).toContain('€');
    // Should contain 2 decimal digits
    expect(result).toMatch(/50/);
  });

  // USD (2 decimals, prefix $)
  it('formats USD correctly', () => {
    const result = formatCurrency(1500.99, 'USD');
    expect(result).toContain('$');
    expect(result).toMatch(/99/);
  });

  // MAD (2 decimals, suffix DH)
  it('formats MAD correctly', () => {
    const result = formatCurrency(2500.75, 'MAD');
    expect(result).toContain('DH');
  });

  // GNF (no decimals, suffix GNF)
  it('formats GNF correctly', () => {
    const result = formatCurrency(50000, 'GNF');
    expect(result).toContain('GNF');
    expect(result).not.toMatch(/\.\d{2}/);
  });

  // Default currency (XOF)
  it('uses XOF as default when no currency specified', () => {
    const result = formatCurrency(1000);
    expect(result).toContain('FCFA');
  });

  it('uses XOF when undefined currency passed', () => {
    const result = formatCurrency(1000, undefined);
    expect(result).toContain('FCFA');
  });

  // Zero amount
  it('formats zero correctly', () => {
    const result = formatCurrency(0, 'XOF');
    expect(result).toContain('0');
    expect(result).toContain('FCFA');
  });

  // Negative amount
  it('formats negative amounts', () => {
    const result = formatCurrency(-5000, 'XOF');
    expect(result).toContain('FCFA');
  });

  // Large amounts
  it('formats large amounts with thousands separators', () => {
    const result = formatCurrency(1500000000, 'XOF');
    expect(result).toContain('FCFA');
    // Should have separator for readability
    expect(result.length).toBeGreaterThan(10);
  });

  // String amounts
  it('handles string amounts', () => {
    const result = formatCurrency('42000', 'XOF');
    expect(result).toContain('FCFA');
    expect(result).toContain('42');
  });

  // Edge cases
  it('returns "--" for null', () => {
    expect(formatCurrency(null, 'XOF')).toBe('--');
  });

  it('returns "--" for undefined', () => {
    expect(formatCurrency(undefined, 'XOF')).toBe('--');
  });

  it('returns "--" for NaN string', () => {
    expect(formatCurrency('not-a-number', 'XOF')).toBe('--');
  });

  // Unknown currency fallback
  it('falls back to basic format for unknown currency', () => {
    const result = formatCurrency(1000, 'ZZZ');
    expect(result).toContain('ZZZ');
    expect(result).toContain('1');
  });
});

// ═════════════════════════════════════════════════════════════════════
// getCurrencyConfig()
// ═════════════════════════════════════════════════════════════════════
describe('getCurrencyConfig()', () => {
  it('returns config for valid currency code', () => {
    const config = getCurrencyConfig('EUR');
    expect(config.code).toBe('EUR');
    expect(config.symbol).toBe('€');
    expect(config.decimals).toBe(2);
  });

  it('returns XOF config for undefined', () => {
    const config = getCurrencyConfig(undefined);
    expect(config.code).toBe('XOF');
  });

  it('returns XOF config for unknown currency', () => {
    const config = getCurrencyConfig('ZZZ');
    expect(config.code).toBe('XOF');
  });

  it('returns correct config for each currency', () => {
    for (const currency of CURRENCIES) {
      const config = getCurrencyConfig(currency.code);
      expect(config.code).toBe(currency.code);
      expect(config.symbol).toBe(currency.symbol);
    }
  });
});
