/**
 * @jest-environment node
 */
import { generateSubjectAndDesc, isValidDate, isValidTime, toISO } from '../utils/ticketHelpers';

// ── generateSubjectAndDesc ────────────────────────────────────────────────────

describe('generateSubjectAndDesc', () => {
  it('uses subCategory when provided', () => {
    const { subject } = generateSubjectAndDesc('Support technique', 'GPS défaillant', 'AB-123-CD');
    expect(subject).toBe('GPS défaillant - AB-123-CD');
  });

  it('falls back to category when no subCategory', () => {
    const { subject } = generateSubjectAndDesc('Support technique', '', 'AB-123-CD');
    expect(subject).toBe('Support technique - AB-123-CD');
  });

  it('omits plate from subject when empty', () => {
    const { subject } = generateSubjectAndDesc('Réclamation', 'Facturation incorrecte', '');
    expect(subject).toBe('Facturation incorrecte');
  });

  it('generates Réclamation description with plate', () => {
    const { description } = generateSubjectAndDesc('Réclamation', 'Facturation incorrecte', 'AB-123-CD');
    expect(description).toBe('Réclamation client concernant: Facturation incorrecte - Véhicule: AB-123-CD.');
  });

  it('generates Réclamation description without plate', () => {
    const { description } = generateSubjectAndDesc('Réclamation client', 'Délai de réponse', '');
    expect(description).toBe('Réclamation client concernant: Délai de réponse.');
  });

  it('generates Support technique description with plate', () => {
    const { description } = generateSubjectAndDesc('Support technique', 'GPS défaillant', 'XY-456-ZZ');
    expect(description).toBe('Support technique requis: GPS défaillant - Véhicule concerné: XY-456-ZZ.');
  });

  it('generates Support et assistance description', () => {
    const { description } = generateSubjectAndDesc('Support et assistance', 'Connexion', '');
    expect(description).toBe('Support technique requis: Connexion.');
  });

  it('generates generic description for other categories', () => {
    const { description } = generateSubjectAndDesc('Autre', 'Demande', 'PL-001');
    expect(description).toBe('Demande - Véhicule: PL-001.');
  });
});

// ── isValidDate ───────────────────────────────────────────────────────────────

describe('isValidDate', () => {
  it('accepts valid ISO dates', () => {
    expect(isValidDate('2026-04-07')).toBe(true);
    expect(isValidDate('2000-01-01')).toBe(true);
  });

  it('rejects wrong format', () => {
    expect(isValidDate('07/04/2026')).toBe(false);
    expect(isValidDate('2026-4-7')).toBe(false);
    expect(isValidDate('')).toBe(false);
  });

  it('rejects invalid calendar dates', () => {
    expect(isValidDate('2026-13-01')).toBe(false);
    expect(isValidDate('2026-02-30')).toBe(false);
  });
});

// ── isValidTime ───────────────────────────────────────────────────────────────

describe('isValidTime', () => {
  it('accepts valid HH:MM times', () => {
    expect(isValidTime('00:00')).toBe(true);
    expect(isValidTime('23:59')).toBe(true);
    expect(isValidTime('12:30')).toBe(true);
  });

  it('rejects out-of-range hours', () => {
    expect(isValidTime('24:00')).toBe(false);
    expect(isValidTime('25:00')).toBe(false);
  });

  it('rejects out-of-range minutes', () => {
    expect(isValidTime('12:60')).toBe(false);
  });

  it('rejects wrong format', () => {
    expect(isValidTime('9:00')).toBe(false);
    expect(isValidTime('12:5')).toBe(false);
    expect(isValidTime('')).toBe(false);
  });
});

// ── toISO ─────────────────────────────────────────────────────────────────────

describe('toISO', () => {
  it('combines date and time into ISO 8601 string', () => {
    expect(toISO('2026-04-07', '08:30')).toBe('2026-04-07T08:30:00');
    expect(toISO('2026-12-31', '23:59')).toBe('2026-12-31T23:59:00');
  });
});
