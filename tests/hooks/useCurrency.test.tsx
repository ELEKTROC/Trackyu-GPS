/**
 * Tests for useCurrency hook
 * 
 * Tests currency formatting, symbol resolution, and decimal handling.
 * Mocks useAuth and useDataContext to control the resolved currency.
 */
import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

// Mock the auth & data contexts
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: { id: '1', name: 'Test User', role: 'ADMIN', tenantId: 't1', currency: 'XOF' },
    isAuthenticated: true,
    hasPermission: () => true,
  })),
}));

vi.mock('../../contexts/DataContext', () => ({
  useDataContext: vi.fn(() => ({
    users: [{ id: '0', role: 'SUPERADMIN', currency: 'XOF' }],
    vehicles: [],
    clients: [],
  })),
}));

import { useCurrency } from '../../hooks/useCurrency';

describe('useCurrency', () => {
  it('resolves default currency to XOF', () => {
    const { result } = renderHook(() => useCurrency());
    expect(result.current.currency).toBe('XOF');
  });

  it('formatPrice formats XOF amounts without decimals', () => {
    const { result } = renderHook(() => useCurrency());
    const formatted = result.current.formatPrice(150000);
    // Should contain "150" and "000" and "FCFA"
    expect(formatted).toContain('FCFA');
    expect(formatted).toContain('150');
  });

  it('formatPrice handles undefined/null gracefully', () => {
    const { result } = renderHook(() => useCurrency());
    expect(result.current.formatPrice(undefined)).toBe('--');
    expect(result.current.formatPrice(null)).toBe('--');
  });

  it('formatPrice handles string amounts', () => {
    const { result } = renderHook(() => useCurrency());
    const formatted = result.current.formatPrice('250000');
    expect(formatted).toContain('250');
    expect(formatted).toContain('FCFA');
  });

  it('formatPrice with override currency (EUR)', () => {
    const { result } = renderHook(() => useCurrency());
    const formatted = result.current.formatPrice(1500, 'EUR');
    expect(formatted).toContain('€');
  });

  it('formatPrice with override currency (USD)', () => {
    const { result } = renderHook(() => useCurrency());
    const formatted = result.current.formatPrice(1500, 'USD');
    expect(formatted).toContain('$');
  });

  it('getSymbol returns FCFA for XOF', () => {
    const { result } = renderHook(() => useCurrency());
    expect(result.current.getSymbol()).toBe('FCFA');
  });

  it('getSymbol returns € for EUR', () => {
    const { result } = renderHook(() => useCurrency());
    expect(result.current.getSymbol('EUR')).toBe('€');
  });

  it('getDecimals returns 0 for XOF, 2 for EUR', () => {
    const { result } = renderHook(() => useCurrency());
    expect(result.current.getDecimals()).toBe(0);
    expect(result.current.getDecimals('EUR')).toBe(2);
  });

  it('currencyConfig has correct structure', () => {
    const { result } = renderHook(() => useCurrency());
    expect(result.current.currencyConfig).toEqual(
      expect.objectContaining({
        code: 'XOF',
        symbol: 'FCFA',
        decimals: 0,
      })
    );
  });

  it('CURRENCIES array is exposed', () => {
    const { result } = renderHook(() => useCurrency());
    expect(result.current.CURRENCIES).toBeInstanceOf(Array);
    expect(result.current.CURRENCIES.length).toBeGreaterThan(0);
    expect(result.current.CURRENCIES.find(c => c.code === 'EUR')).toBeDefined();
  });
});
