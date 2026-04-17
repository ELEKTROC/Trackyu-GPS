/**
 * @jest-environment node
 *
 * Tests unitaires — src/screens/main/reports/types.ts
 * Couverture : getPeriodRange, formatPeriodLabel, DEFAULT_FILTERS,
 *              fmtNum, matchText
 */
import { getPeriodRange, formatPeriodLabel, DEFAULT_FILTERS, fmtNum, matchText } from '../screens/main/reports/types';
import type { ReportFilters } from '../screens/main/reports/types';

// ── getPeriodRange ──────────────────────────────────────────────────────────────

describe('getPeriodRange', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-04-16T12:00:00.000Z'));
  });

  afterEach(() => jest.useRealTimers());

  const f = (overrides: Partial<ReportFilters>): ReportFilters => ({
    ...DEFAULT_FILTERS,
    ...overrides,
  });

  it('period "7" → start = 7 jours en arrière, end = now', () => {
    const { start, end } = getPeriodRange(f({ period: '7' }));
    const diff = end.getTime() - start.getTime();
    expect(diff).toBe(7 * 86400000);
    expect(end.getTime()).toBe(new Date('2026-04-16T12:00:00.000Z').getTime());
  });

  it('period "30" → 30 jours d\'écart', () => {
    const { start, end } = getPeriodRange(f({ period: '30' }));
    const diffDays = (end.getTime() - start.getTime()) / 86400000;
    expect(diffDays).toBe(30);
  });

  it('period "90" → 90 jours d\'écart', () => {
    const { start, end } = getPeriodRange(f({ period: '90' }));
    const diffDays = (end.getTime() - start.getTime()) / 86400000;
    expect(diffDays).toBe(90);
  });

  it('period "0" (aujourd\'hui) → start = minuit, end = now', () => {
    const { start, end } = getPeriodRange(f({ period: '0' }));
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
    expect(start.getSeconds()).toBe(0);
    // end = now (12:00 UTC)
    expect(end.getTime()).toBe(new Date('2026-04-16T12:00:00.000Z').getTime());
  });

  it('period "custom" avec customStart et customEnd', () => {
    const { start, end } = getPeriodRange(
      f({
        period: 'custom',
        customStart: '2026-03-01',
        customEnd: '2026-03-31',
      })
    );
    expect(start.getFullYear()).toBe(2026);
    expect(start.getMonth()).toBe(2); // 0-indexed March
    expect(start.getDate()).toBe(1);
    // end = 2026-03-31T23:59:59
    expect(end.getDate()).toBe(31);
    expect(end.getHours()).toBe(23);
    expect(end.getMinutes()).toBe(59);
    expect(end.getSeconds()).toBe(59);
  });

  it('period "custom" sans dates → fallback sur parseInt (NaN = 0ms en arrière)', () => {
    // customStart/End vides → branche period === 'custom' non prise → parseInt('custom') = NaN
    // Date.now() - NaN * 86400000 = NaN → new Date(NaN)
    const { start } = getPeriodRange(f({ period: 'custom', customStart: '', customEnd: '' }));
    // Pas de crash est l'essentiel ici
    expect(start).toBeInstanceOf(Date);
  });

  it('start < end dans tous les cas nominaux', () => {
    const periods: Array<ReportFilters['period']> = ['0', '7', '30', '90'];
    for (const period of periods) {
      const { start, end } = getPeriodRange(f({ period }));
      expect(start.getTime()).toBeLessThanOrEqual(end.getTime());
    }
  });
});

// ── formatPeriodLabel ───────────────────────────────────────────────────────────

describe('formatPeriodLabel', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-04-16T12:00:00.000Z'));
  });

  afterEach(() => jest.useRealTimers());

  const f = (overrides: Partial<ReportFilters>): ReportFilters => ({
    ...DEFAULT_FILTERS,
    ...overrides,
  });

  it('period "0" → "Aujourd\'hui"', () => {
    expect(formatPeriodLabel(f({ period: '0' }))).toBe("Aujourd'hui");
  });

  it('period "custom" avec dates → contient "Du" et "au"', () => {
    const label = formatPeriodLabel(
      f({
        period: 'custom',
        customStart: '2026-03-01',
        customEnd: '2026-03-31',
      })
    );
    expect(label).toMatch(/^Du .+ au .+/);
  });

  it('period "7" → commence par "Du"', () => {
    const label = formatPeriodLabel(f({ period: '7' }));
    expect(label).toMatch(/^Du .+ au .+/);
  });

  it('period "30" → contient l\'année 2026', () => {
    const label = formatPeriodLabel(f({ period: '30' }));
    expect(label).toMatch(/2026/);
  });

  it('period "custom" sans dates → ne retourne pas "Aujourd\'hui"', () => {
    const label = formatPeriodLabel(f({ period: 'custom', customStart: '', customEnd: '' }));
    expect(label).not.toBe("Aujourd'hui");
  });
});

// ── DEFAULT_FILTERS ─────────────────────────────────────────────────────────────

describe('DEFAULT_FILTERS', () => {
  it('period par défaut = "30"', () => {
    expect(DEFAULT_FILTERS.period).toBe('30');
  });

  it('listes vides par défaut', () => {
    expect(DEFAULT_FILTERS.vehicleIds).toEqual([]);
    expect(DEFAULT_FILTERS.alertTypes).toEqual([]);
  });

  it('chaînes vides par défaut', () => {
    expect(DEFAULT_FILTERS.client).toBe('');
    expect(DEFAULT_FILTERS.branche).toBe('');
    expect(DEFAULT_FILTERS.revendeur).toBe('');
    expect(DEFAULT_FILTERS.interventionType).toBe('');
    expect(DEFAULT_FILTERS.technicianName).toBe('');
    expect(DEFAULT_FILTERS.customStart).toBe('');
    expect(DEFAULT_FILTERS.customEnd).toBe('');
  });
});

// ── fmtNum ──────────────────────────────────────────────────────────────────────

describe('fmtNum', () => {
  it('formate des entiers en locale fr-FR', () => {
    const result = fmtNum(1500000);
    // fr-FR utilise des espaces comme séparateurs de milliers (peut être NBSP)
    expect(result).toMatch(/1[\s\u00a0]?500[\s\u00a0]?000/);
  });

  it('formate 0', () => {
    expect(fmtNum(0)).toBe('0');
  });

  it('tronque les décimales (maximumFractionDigits: 0)', () => {
    expect(fmtNum(123.99)).not.toMatch(/[.,]\d+$/);
  });
});

// ── matchText ───────────────────────────────────────────────────────────────────

describe('matchText', () => {
  it('retourne true si filtre vide (pas de filtrage)', () => {
    expect(matchText('Alice', '')).toBe(true);
    expect(matchText(undefined, '')).toBe(true);
  });

  it('match insensible à la casse', () => {
    expect(matchText('Alice Martin', 'alice')).toBe(true);
    expect(matchText('Alice Martin', 'MARTIN')).toBe(true);
    expect(matchText('Alice Martin', 'Alice Martin')).toBe(true);
  });

  it('retourne false si la valeur ne contient pas le filtre', () => {
    expect(matchText('Alice', 'Bob')).toBe(false);
    expect(matchText('', 'quelque chose')).toBe(false);
  });

  it('retourne false si valeur undefined et filtre non vide', () => {
    expect(matchText(undefined, 'test')).toBe(false);
  });

  it('match partiel (sous-chaîne)', () => {
    expect(matchText('Camion bétonnière 12T', 'béton')).toBe(true);
    expect(matchText('CI-0044-AB', '0044')).toBe(true);
  });
});
