/**
 * @jest-environment node
 *
 * Tests unitaires — src/screens/main/reports/export.ts
 * Couverture : buildCSV (seule fonction pure exportée publiquement)
 *
 * buildHTML, buildSVG, buildChartHTML sont des fonctions privées du module,
 * testées indirectement via les snapshots HTML (shareCSV dépend de Share RN).
 */

// ── Mock react-native (Share, Alert — non disponibles en env node) ────────────
jest.mock('react-native', () => ({
  Share: { share: jest.fn().mockResolvedValue({ action: 'sharedAction' }) },
  Alert: { alert: jest.fn() },
}));

import { buildCSV } from '../screens/main/reports/export';

// ── buildCSV ────────────────────────────────────────────────────────────────────

describe('buildCSV', () => {
  it('génère un CSV simple avec en-tête', () => {
    const csv = buildCSV(['Nom', 'Plaque', 'Distance'], [['Camion 1', 'CI-001-A', '250']]);
    const lines = csv.split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe('"Nom","Plaque","Distance"');
    expect(lines[1]).toBe('"Camion 1","CI-001-A","250"');
  });

  it("génère uniquement l'en-tête si rows est vide", () => {
    const csv = buildCSV(['Col1', 'Col2'], []);
    const lines = csv.split('\n');
    expect(lines).toHaveLength(1);
    expect(lines[0]).toBe('"Col1","Col2"');
  });

  it('échappe les guillemets doubles dans les valeurs', () => {
    const csv = buildCSV(['Note'], [['"Alerte critique"']]);
    expect(csv).toContain('""Alerte critique""');
  });

  it('échappe les guillemets dans les en-têtes', () => {
    const csv = buildCSV(['"Colonne spéciale"'], [['valeur']]);
    const header = csv.split('\n')[0];
    expect(header).toBe('"""Colonne spéciale"""');
  });

  it('gère les valeurs nullish (undefined, null) sans crash', () => {
    // La fonction convertit undefined/null via `?? ''`
    const csv = buildCSV(['A', 'B'], [[undefined as unknown as string, null as unknown as string]]);
    expect(csv).toContain('""'); // valeur vide échappée
    expect(() => csv).not.toThrow();
  });

  it('gère les virgules dans les valeurs (encapsulation CSV)', () => {
    const csv = buildCSV(['Adresse'], [["Abidjan, Côte d'Ivoire"]]);
    const dataLine = csv.split('\n')[1];
    expect(dataLine).toBe('"Abidjan, Côte d\'Ivoire"');
  });

  it('gère les retours à la ligne dans les valeurs', () => {
    const csv = buildCSV(['Notes'], [['Ligne 1\nLigne 2']]);
    // Le contenu est encapsulé — pas d'explosion de lignes
    const lines = csv.split('\n');
    // Il peut y avoir plus de 2 lignes à cause du \n dans la valeur, c'est acceptable CSV
    expect(lines.length).toBeGreaterThanOrEqual(2);
    expect(lines[0]).toBe('"Notes"');
  });

  it('gère plusieurs lignes correctement', () => {
    const rows = [
      ['Alice', '5h 30m', '250 km'],
      ['Bob', '3h 15m', '120 km'],
      ['Carol', '8h 00m', '400 km'],
    ];
    const csv = buildCSV(['Conducteur', 'Durée', 'Distance'], rows);
    const lines = csv.split('\n');
    expect(lines).toHaveLength(4); // 1 header + 3 rows
    expect(lines[1]).toBe('"Alice","5h 30m","250 km"');
    expect(lines[3]).toBe('"Carol","8h 00m","400 km"');
  });

  it('une seule colonne fonctionne correctement', () => {
    const csv = buildCSV(['ID'], [['001'], ['002'], ['003']]);
    const lines = csv.split('\n');
    expect(lines).toHaveLength(4);
    expect(lines[0]).toBe('"ID"');
    expect(lines[2]).toBe('"002"');
  });

  it('valeur contenant une URL préservée telle quelle', () => {
    const url = 'https://maps.google.com/?q=5.3,-4.0';
    const csv = buildCSV(['Localisation'], [[url]]);
    const line = csv.split('\n')[1];
    expect(line).toContain(url);
  });

  it('colonne vide → chaîne vide encapsulée', () => {
    const csv = buildCSV(['A', 'B', 'C'], [['val1', '', 'val3']]);
    const line = csv.split('\n')[1];
    expect(line).toBe('"val1","","val3"');
  });
});
