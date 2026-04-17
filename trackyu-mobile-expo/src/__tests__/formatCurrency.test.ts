/**
 * @jest-environment node
 *
 * Tests unitaires — src/utils/formatCurrency.ts
 * Couverture : formatCurrency — valeurs nominales, edge cases, devises multiples
 */
import { formatCurrency, DEFAULT_CURRENCY } from '../utils/formatCurrency';

describe('DEFAULT_CURRENCY', () => {
  it('vaut XOF', () => {
    expect(DEFAULT_CURRENCY).toBe('XOF');
  });
});

describe('formatCurrency', () => {
  // ── Valeurs valides ────────────────────────────────────────────────────────

  it('formate un entier positif en XOF fr-FR', () => {
    const result = formatCurrency(150000);
    expect(result).not.toBe('—');
    expect(result).toMatch(/150[\s\u00a0]?000/); // espace fin ou NBSP possible
    expect(result).toMatch(/XOF|FCFA|F\s*CFA/i);
  });

  it('formate zéro', () => {
    const result = formatCurrency(0);
    expect(result).not.toBe('—');
    expect(result).toMatch(/0/);
  });

  it('formate un nombre négatif (remboursement / avoir)', () => {
    const result = formatCurrency(-50000);
    expect(result).not.toBe('—');
    expect(result).toMatch(/-/);
  });

  it('formate une chaîne numérique valide', () => {
    const result = formatCurrency('75000');
    expect(result).not.toBe('—');
    expect(result).toMatch(/75[\s\u00a0]?000/);
  });

  it('formate un grand montant (millions)', () => {
    const result = formatCurrency(1_500_000);
    expect(result).not.toBe('—');
    expect(result).toMatch(/1[\s\u00a0.]?500[\s\u00a0.]?000|1,5M/i);
  });

  // ── Edge cases — retour "—" ───────────────────────────────────────────────

  // Number(null) = 0 → formaté comme "0 XOF" (comportement JavaScript normal)
  it('formate null comme 0 (Number(null) = 0)', () => {
    const result = formatCurrency(null);
    expect(result).not.toBe('—');
    expect(result).toMatch(/0/);
  });

  it('retourne "—" pour undefined (Number(undefined) = NaN)', () => {
    expect(formatCurrency(undefined)).toBe('—');
  });

  it('retourne "—" pour NaN', () => {
    expect(formatCurrency(NaN)).toBe('—');
  });

  it('retourne "—" pour les chaînes non numériques (abc, N/A)', () => {
    expect(formatCurrency('abc')).toBe('—');
    expect(formatCurrency('N/A')).toBe('—');
  });

  // Number('') = 0 → formaté comme "0 XOF"
  it('formate la chaîne vide comme 0 (Number("") = 0)', () => {
    const result = formatCurrency('');
    expect(result).not.toBe('—');
    expect(result).toMatch(/0/);
  });

  // Infinity et -Infinity sont corrigés dans l'implémentation (isFinite guard)
  it('retourne "—" pour Infinity', () => {
    expect(formatCurrency(Infinity)).toBe('—');
  });

  it('retourne "—" pour -Infinity', () => {
    expect(formatCurrency(-Infinity)).toBe('—');
  });

  // ── Devise personnalisée ───────────────────────────────────────────────────

  it('formate en EUR si spécifié', () => {
    const result = formatCurrency(1000, 'EUR');
    expect(result).not.toBe('—');
    expect(result).toMatch(/€|EUR/);
  });

  it('formate en USD si spécifié', () => {
    const result = formatCurrency(1000, 'USD');
    expect(result).not.toBe('—');
    expect(result).toMatch(/\$|USD/);
  });

  // ── maximumFractionDigits = 0 ─────────────────────────────────────────────

  it("ne doit pas afficher de décimales (XOF n'a pas de centimes)", () => {
    const result = formatCurrency(1000.99);
    // maximumFractionDigits: 0 → pas de virgule dans la partie numérique
    // On vérifie que le résultat ne contient pas ",XX" après le nombre
    expect(result).not.toMatch(/,\d{2}\s*XOF/);
  });

  // ── Conversions de type implicites ─────────────────────────────────────────

  it('convertit correctement une chaîne "0"', () => {
    const result = formatCurrency('0');
    expect(result).not.toBe('—');
  });

  it('convertit correctement la chaîne "1500000"', () => {
    const result = formatCurrency('1500000');
    expect(result).not.toBe('—');
    expect(result).toMatch(/1[\s\u00a0.]?500[\s\u00a0.]?000/);
  });
});
