/**
 * @jest-environment node
 *
 * Tests snapshot — src/utils/portalColors.ts
 *
 * Objectif : détecter un drift silencieux si une constante est modifiée,
 * un statut ajouté/supprimé, ou un label renommé sans mise à jour des
 * écrans qui l'affichent.
 *
 * Ces tests ne valident pas une logique — ils figent l'état actuel des
 * constantes et alertent lors d'un changement inattendu.
 */
import {
  INVOICE_STATUS_COLORS,
  INVOICE_STATUS_LABELS,
  CONTRACT_STATUS_COLORS,
  CONTRACT_STATUS_LABELS,
  SUBSCRIPTION_STATUS_COLORS,
  SUBSCRIPTION_STATUS_LABELS,
  TICKET_STATUS_COLORS,
  TICKET_STATUS_LABELS,
  TICKET_PRIORITY_COLORS,
  TICKET_PRIORITY_LABELS,
  NEW_TICKET_PRIORITIES,
} from '../utils/portalColors';

// ── Snapshots ──────────────────────────────────────────────────────────────────

describe('portalColors — snapshots', () => {
  it('INVOICE_STATUS_COLORS correspond au snapshot', () => {
    expect(INVOICE_STATUS_COLORS).toMatchSnapshot();
  });

  it('INVOICE_STATUS_LABELS correspond au snapshot', () => {
    expect(INVOICE_STATUS_LABELS).toMatchSnapshot();
  });

  it('CONTRACT_STATUS_COLORS correspond au snapshot', () => {
    expect(CONTRACT_STATUS_COLORS).toMatchSnapshot();
  });

  it('CONTRACT_STATUS_LABELS correspond au snapshot', () => {
    expect(CONTRACT_STATUS_LABELS).toMatchSnapshot();
  });

  it('SUBSCRIPTION_STATUS_COLORS correspond au snapshot', () => {
    expect(SUBSCRIPTION_STATUS_COLORS).toMatchSnapshot();
  });

  it('SUBSCRIPTION_STATUS_LABELS correspond au snapshot', () => {
    expect(SUBSCRIPTION_STATUS_LABELS).toMatchSnapshot();
  });

  it('TICKET_STATUS_COLORS correspond au snapshot', () => {
    expect(TICKET_STATUS_COLORS).toMatchSnapshot();
  });

  it('TICKET_STATUS_LABELS correspond au snapshot', () => {
    expect(TICKET_STATUS_LABELS).toMatchSnapshot();
  });

  it('TICKET_PRIORITY_COLORS correspond au snapshot', () => {
    expect(TICKET_PRIORITY_COLORS).toMatchSnapshot();
  });

  it('TICKET_PRIORITY_LABELS correspond au snapshot', () => {
    expect(TICKET_PRIORITY_LABELS).toMatchSnapshot();
  });

  it('NEW_TICKET_PRIORITIES correspond au snapshot', () => {
    expect(NEW_TICKET_PRIORITIES).toMatchSnapshot();
  });
});

// ── Cohérence structurelle (vérifications rapides) ────────────────────────────

describe('portalColors — cohérence', () => {
  it('chaque statut de facture a une couleur ET un libellé', () => {
    const statusKeys = Object.keys(INVOICE_STATUS_LABELS);
    statusKeys.forEach((key) => {
      expect(INVOICE_STATUS_COLORS[key]).toBeDefined();
      expect(typeof INVOICE_STATUS_COLORS[key]).toBe('string');
      expect(INVOICE_STATUS_COLORS[key]).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });

  it('chaque statut de contrat a une couleur ET un libellé', () => {
    const statusKeys = Object.keys(CONTRACT_STATUS_LABELS);
    statusKeys.forEach((key) => {
      expect(CONTRACT_STATUS_COLORS[key]).toBeDefined();
      expect(CONTRACT_STATUS_COLORS[key]).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });

  it("chaque statut d'abonnement a une couleur ET un libellé", () => {
    const statusKeys = Object.keys(SUBSCRIPTION_STATUS_LABELS);
    statusKeys.forEach((key) => {
      expect(SUBSCRIPTION_STATUS_COLORS[key]).toBeDefined();
      expect(SUBSCRIPTION_STATUS_COLORS[key]).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });

  it('chaque statut de ticket a une couleur ET un libellé', () => {
    const statusKeys = Object.keys(TICKET_STATUS_LABELS);
    statusKeys.forEach((key) => {
      expect(TICKET_STATUS_COLORS[key]).toBeDefined();
      expect(TICKET_STATUS_COLORS[key]).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });

  it('chaque priorité de ticket a une couleur ET un libellé', () => {
    const priorityKeys = Object.keys(TICKET_PRIORITY_LABELS);
    priorityKeys.forEach((key) => {
      expect(TICKET_PRIORITY_COLORS[key]).toBeDefined();
      expect(TICKET_PRIORITY_COLORS[key]).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });

  it('toutes les couleurs sont des hex valides (#RRGGBB)', () => {
    const allColors = [
      ...Object.values(INVOICE_STATUS_COLORS),
      ...Object.values(CONTRACT_STATUS_COLORS),
      ...Object.values(SUBSCRIPTION_STATUS_COLORS),
      ...Object.values(TICKET_STATUS_COLORS),
      ...Object.values(TICKET_PRIORITY_COLORS),
    ];
    allColors.forEach((color) => {
      expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });

  it('NEW_TICKET_PRIORITIES contient LOW, MEDIUM, HIGH dans le bon ordre', () => {
    expect(NEW_TICKET_PRIORITIES.map((p) => p.value)).toEqual(['LOW', 'MEDIUM', 'HIGH']);
  });

  it('NEW_TICKET_PRIORITIES référence les couleurs de TICKET_PRIORITY_COLORS', () => {
    NEW_TICKET_PRIORITIES.forEach((p) => {
      expect(p.color).toBe(TICKET_PRIORITY_COLORS[p.value]);
    });
  });

  it('tous les libellés sont des chaînes non vides en français', () => {
    const allLabels = [
      ...Object.values(INVOICE_STATUS_LABELS),
      ...Object.values(CONTRACT_STATUS_LABELS),
      ...Object.values(SUBSCRIPTION_STATUS_LABELS),
      ...Object.values(TICKET_STATUS_LABELS),
      ...Object.values(TICKET_PRIORITY_LABELS),
    ];
    allLabels.forEach((label) => {
      expect(typeof label).toBe('string');
      expect(label.length).toBeGreaterThan(0);
    });
  });
});
