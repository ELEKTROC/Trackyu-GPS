/**
 * Tests for useDateRange hook
 * 
 * Tests date range calculation for all period presets.
 */
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useDateRange } from '../../hooks/useDateRange';

describe('useDateRange', () => {
  // Fix "now" to 2026-06-15 (Monday) for deterministic tests
  const FIXED_NOW = new Date('2026-06-15T12:00:00Z');
  
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('defaults to THIS_YEAR preset', () => {
    const { result } = renderHook(() => useDateRange());
    expect(result.current.periodPreset).toBe('THIS_YEAR');
    expect(result.current.dateRange).toEqual({
      start: '2026-01-01',
      end: '2026-06-15',
    });
  });

  it('TODAY returns current date for both start and end', () => {
    const { result } = renderHook(() => useDateRange('TODAY'));
    expect(result.current.dateRange).toEqual({
      start: '2026-06-15',
      end: '2026-06-15',
    });
  });

  it('YESTERDAY returns previous day', () => {
    const { result } = renderHook(() => useDateRange('YESTERDAY'));
    expect(result.current.dateRange).toEqual({
      start: '2026-06-14',
      end: '2026-06-14',
    });
  });

  it('THIS_MONTH returns first day of month to today', () => {
    const { result } = renderHook(() => useDateRange('THIS_MONTH'));
    expect(result.current.dateRange).toEqual({
      start: '2026-06-01',
      end: '2026-06-15',
    });
  });

  it('LAST_MONTH returns full previous month', () => {
    const { result } = renderHook(() => useDateRange('LAST_MONTH'));
    expect(result.current.dateRange).toEqual({
      start: '2026-05-01',
      end: '2026-05-31',
    });
  });

  it('LAST_YEAR returns full previous year', () => {
    const { result } = renderHook(() => useDateRange('LAST_YEAR'));
    expect(result.current.dateRange).toEqual({
      start: '2025-01-01',
      end: '2025-12-31',
    });
  });

  it('ALL returns null (no filtering)', () => {
    const { result } = renderHook(() => useDateRange('ALL'));
    expect(result.current.dateRange).toBeNull();
  });

  it('CUSTOM returns custom date range', () => {
    const { result } = renderHook(() => useDateRange('CUSTOM'));
    // The custom range defaults are month start to today
    expect(result.current.dateRange).toBeDefined();
    expect(result.current.dateRange!.start).toBeTruthy();
    expect(result.current.dateRange!.end).toBeTruthy();
  });

  it('allows changing preset via setPeriodPreset', () => {
    const { result } = renderHook(() => useDateRange('TODAY'));
    expect(result.current.periodPreset).toBe('TODAY');

    act(() => {
      result.current.setPeriodPreset('LAST_YEAR');
    });
    expect(result.current.periodPreset).toBe('LAST_YEAR');
    expect(result.current.dateRange).toEqual({
      start: '2025-01-01',
      end: '2025-12-31',
    });
  });

  it('allows setting custom date range', () => {
    const { result } = renderHook(() => useDateRange('CUSTOM'));

    act(() => {
      result.current.setCustomDateRange({ start: '2026-03-01', end: '2026-03-31' });
    });

    expect(result.current.dateRange).toEqual({
      start: '2026-03-01',
      end: '2026-03-31',
    });
  });
});
