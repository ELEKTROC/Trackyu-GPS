/**
 * @jest-environment node
 *
 * Tests unitaires — src/utils/dateUtils.ts
 * Couverture : safeFmtDate, safeFmtDateTime, daysFromNow, fmtDuration
 */
import { safeFmtDate, safeFmtDateTime, daysFromNow, fmtDuration } from '../utils/dateUtils';

// ── safeFmtDate ────────────────────────────────────────────────────────────────

describe('safeFmtDate', () => {
  it('formate une date ISO valide en fr-FR', () => {
    const result = safeFmtDate('2026-04-16T00:00:00.000Z');
    // Le résultat exact dépend de la locale système, on vérifie la structure
    expect(result).toMatch(/2026/);
    expect(result).not.toBe('—');
  });

  it('retourne le fallback pour null', () => {
    expect(safeFmtDate(null)).toBe('—');
  });

  it('retourne le fallback pour undefined', () => {
    expect(safeFmtDate(undefined)).toBe('—');
  });

  it('retourne le fallback pour une chaîne vide', () => {
    expect(safeFmtDate('')).toBe('—');
  });

  it('retourne le fallback pour une date invalide', () => {
    expect(safeFmtDate('not-a-date')).toBe('—');
    expect(safeFmtDate('2026-13-45')).toBe('—');
    expect(safeFmtDate('invalid')).toBe('—');
  });

  it('utilise un fallback personnalisé', () => {
    expect(safeFmtDate(null, undefined, 'N/A')).toBe('N/A');
    expect(safeFmtDate('bad', undefined, 'Inconnu')).toBe('Inconnu');
  });

  it('accepte des options Intl personnalisées', () => {
    const result = safeFmtDate('2026-04-16', { year: 'numeric' });
    expect(result).toMatch(/2026/);
  });

  it('gère les timestamps epoch 0 (1970-01-01) comme une date valide', () => {
    const result = safeFmtDate('1970-01-01T00:00:00.000Z');
    expect(result).toMatch(/1970/);
    expect(result).not.toBe('—');
  });
});

// ── safeFmtDateTime ────────────────────────────────────────────────────────────

describe('safeFmtDateTime', () => {
  it('formate une date+heure ISO valide en fr-FR', () => {
    const result = safeFmtDateTime('2026-04-16T10:30:00.000Z');
    expect(result).toMatch(/2026/);
    expect(result).not.toBe('—');
  });

  it('retourne le fallback pour null', () => {
    expect(safeFmtDateTime(null)).toBe('—');
  });

  it('retourne le fallback pour undefined', () => {
    expect(safeFmtDateTime(undefined)).toBe('—');
  });

  it('retourne le fallback pour une chaîne vide', () => {
    expect(safeFmtDateTime('')).toBe('—');
  });

  it('retourne le fallback pour une date invalide', () => {
    expect(safeFmtDateTime('not-a-date')).toBe('—');
    expect(safeFmtDateTime('INVALID')).toBe('—');
  });

  it('utilise un fallback personnalisé', () => {
    expect(safeFmtDateTime(undefined, 'Non défini')).toBe('Non défini');
  });

  it('inclut les heures et minutes dans le résultat', () => {
    // On vérifie qu'il y a un séparateur heure:minute (format fr-FR : "10:30")
    const result = safeFmtDateTime('2026-04-16T10:30:00.000Z');
    expect(result).toMatch(/\d{2}[h:]\d{2}/);
  });
});

// ── daysFromNow ────────────────────────────────────────────────────────────────

describe('daysFromNow', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-04-16T12:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("retourne 0 pour aujourd'hui", () => {
    expect(daysFromNow('2026-04-16T12:00:00.000Z')).toBe(0);
  });

  it('retourne une valeur positive pour une date future', () => {
    const result = daysFromNow('2026-04-20T12:00:00.000Z');
    expect(result).toBe(4);
  });

  it('retourne une valeur négative pour une date passée', () => {
    const result = daysFromNow('2026-04-10T12:00:00.000Z');
    expect(result).toBe(-6);
  });

  it('retourne null pour null', () => {
    expect(daysFromNow(null)).toBeNull();
  });

  it('retourne null pour undefined', () => {
    expect(daysFromNow(undefined)).toBeNull();
  });

  it('retourne null pour une chaîne vide', () => {
    expect(daysFromNow('')).toBeNull();
  });

  it('retourne null pour une date invalide', () => {
    expect(daysFromNow('not-a-date')).toBeNull();
  });

  it('retourne 30 pour une date dans 30 jours', () => {
    expect(daysFromNow('2026-05-16T12:00:00.000Z')).toBe(30);
  });
});

// ── fmtDuration ────────────────────────────────────────────────────────────────

describe('fmtDuration', () => {
  it("formate moins d'une heure en minutes", () => {
    expect(fmtDuration(0)).toBe('0 min');
    expect(fmtDuration(60_000)).toBe('1 min');
    expect(fmtDuration(30 * 60_000)).toBe('30 min');
    expect(fmtDuration(59 * 60_000)).toBe('59 min');
  });

  it('formate exactement 1 heure sans minutes', () => {
    expect(fmtDuration(60 * 60_000)).toBe('1h');
  });

  it('formate des heures entières sans minutes', () => {
    expect(fmtDuration(2 * 60 * 60_000)).toBe('2h');
    expect(fmtDuration(8 * 60 * 60_000)).toBe('8h');
    expect(fmtDuration(24 * 60 * 60_000)).toBe('24h');
  });

  it('formate heures + minutes quand les minutes sont non nulles', () => {
    expect(fmtDuration(90 * 60_000)).toBe('1h 30m');
    expect(fmtDuration(125 * 60_000)).toBe('2h 5m');
    expect(fmtDuration(61 * 60_000)).toBe('1h 1m');
  });

  it('arrondit à la minute la plus proche (Math.round)', () => {
    // 89 500 ms = 1.491 min → Math.round → 1 min
    expect(fmtDuration(89_500)).toBe('1 min');
    // 90 000 ms = 1.5 min → Math.round → 2 min
    expect(fmtDuration(90_000)).toBe('2 min');
    // 30 400 ms = 0.506 min → Math.round → 1 min
    expect(fmtDuration(30_400)).toBe('1 min');
    // 29 999 ms = 0.499 min → Math.round → 0 min
    expect(fmtDuration(29_999)).toBe('0 min');
  });

  it('gère les durées de voyage typiques', () => {
    // Trajet 1h30
    expect(fmtDuration(5_400_000)).toBe('1h 30m');
    // Journée de travail 8h
    expect(fmtDuration(28_800_000)).toBe('8h');
    // Sprint court 15 min
    expect(fmtDuration(900_000)).toBe('15 min');
  });
});
