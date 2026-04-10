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
    // Symbols are intentionally hidden — only number is shown
    expect(formatted).toContain('150');
    expect(formatted).not.toMatch(/\.\d{2}/);
  });

  it('formatPrice handles undefined/null gracefully', () => {
    const { result } = renderHook(() => useCurrency());
    expect(result.current.formatPrice(undefined)).toBe('--');
    expect(result.current.formatPrice(null)).toBe('--');
  });

  it('formatPrice handles string amounts', () => {
    const { result } = renderHook(() => useCurrency());
    const formatted = result.current.formatPrice('250000');
    // Symbols intentionally hidden
    expect(formatted).toContain('250');
  });

  it('formatPrice with override currency (EUR)', () => {
    const { result } = renderHook(() => useCurrency());
    const formatted = result.current.formatPrice(1500, 'EUR');
    // Symbols hidden — check decimal format instead
    expect(formatted).toMatch(/1\s?500[,.]00/);
  });

  it('formatPrice with override currency (USD)', () => {
    const { result } = renderHook(() => useCurrency());
    const formatted = result.current.formatPrice(1500, 'USD');
    // Symbols hidden — check decimal format instead
    expect(formatted).toMatch(/1[,.]500\.00|1,500\.00/);
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
