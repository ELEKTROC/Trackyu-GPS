/**
 * @jest-environment node
 *
 * Tests de la source canonique des statuts véhicule.
 * Valide les couleurs fixes, les libellés et les fonctions utilitaires.
 */

import {
  VEHICLE_STATUS_COLORS,
  VEHICLE_STATUS_LABELS,
  vehicleStatusColor,
  vehicleStatusLabel,
} from '../utils/vehicleStatus';

// ── Couleurs ───────────────────────────────────────────────────────────────────

describe('VEHICLE_STATUS_COLORS — valeurs fixes', () => {
  it('moving = vert #22C55E', () => {
    expect(VEHICLE_STATUS_COLORS.moving).toBe('#22C55E');
  });

  it('idle = orange #F97316', () => {
    expect(VEHICLE_STATUS_COLORS.idle).toBe('#F97316');
  });

  it('stopped = rouge #EF4444', () => {
    expect(VEHICLE_STATUS_COLORS.stopped).toBe('#EF4444');
  });

  it('offline = gris #6B7280', () => {
    expect(VEHICLE_STATUS_COLORS.offline).toBe('#6B7280');
  });

  it('contient exactement 4 statuts', () => {
    expect(Object.keys(VEHICLE_STATUS_COLORS)).toHaveLength(4);
  });
});

// ── Libellés ───────────────────────────────────────────────────────────────────

describe('VEHICLE_STATUS_LABELS — libellés français', () => {
  it('moving → "En route"', () => {
    expect(VEHICLE_STATUS_LABELS.moving).toBe('En route');
  });

  it('idle → "Ralenti"', () => {
    expect(VEHICLE_STATUS_LABELS.idle).toBe('Ralenti');
  });

  it('stopped → "Arrêté"', () => {
    expect(VEHICLE_STATUS_LABELS.stopped).toBe('Arrêté');
  });

  it('offline → "Hors ligne"', () => {
    expect(VEHICLE_STATUS_LABELS.offline).toBe('Hors ligne');
  });

  it('contient exactement 4 libellés', () => {
    expect(Object.keys(VEHICLE_STATUS_LABELS)).toHaveLength(4);
  });
});

// ── vehicleStatusColor ─────────────────────────────────────────────────────────

describe('vehicleStatusColor — retourne la bonne couleur', () => {
  it('moving → #22C55E', () => {
    expect(vehicleStatusColor('moving')).toBe('#22C55E');
  });

  it('idle → #F97316', () => {
    expect(vehicleStatusColor('idle')).toBe('#F97316');
  });

  it('stopped → #EF4444', () => {
    expect(vehicleStatusColor('stopped')).toBe('#EF4444');
  });

  it('offline → #6B7280', () => {
    expect(vehicleStatusColor('offline')).toBe('#6B7280');
  });

  it('statut inconnu → fallback offline #6B7280', () => {
    expect(vehicleStatusColor('unknown')).toBe('#6B7280');
  });

  it('chaîne vide → fallback offline', () => {
    expect(vehicleStatusColor('')).toBe('#6B7280');
  });

  it('casse différente → fallback (pas de normalisation)', () => {
    expect(vehicleStatusColor('MOVING')).toBe('#6B7280');
  });
});

// ── vehicleStatusLabel ─────────────────────────────────────────────────────────

describe('vehicleStatusLabel — retourne le bon libellé', () => {
  it('moving → "En route"', () => {
    expect(vehicleStatusLabel('moving')).toBe('En route');
  });

  it('idle → "Ralenti"', () => {
    expect(vehicleStatusLabel('idle')).toBe('Ralenti');
  });

  it('stopped → "Arrêté"', () => {
    expect(vehicleStatusLabel('stopped')).toBe('Arrêté');
  });

  it('offline → "Hors ligne"', () => {
    expect(vehicleStatusLabel('offline')).toBe('Hors ligne');
  });

  it('statut inconnu → retourne le statut brut', () => {
    expect(vehicleStatusLabel('parked')).toBe('parked');
  });

  it('chaîne vide → retourne chaîne vide', () => {
    expect(vehicleStatusLabel('')).toBe('');
  });
});

// ── Cohérence croisée ──────────────────────────────────────────────────────────

describe('cohérence COLORS / LABELS / fonctions', () => {
  const statuts = ['moving', 'idle', 'stopped', 'offline'] as const;

  statuts.forEach((s) => {
    it(`vehicleStatusColor('${s}') === VEHICLE_STATUS_COLORS.${s}`, () => {
      expect(vehicleStatusColor(s)).toBe(VEHICLE_STATUS_COLORS[s]);
    });

    it(`vehicleStatusLabel('${s}') === VEHICLE_STATUS_LABELS.${s}`, () => {
      expect(vehicleStatusLabel(s)).toBe(VEHICLE_STATUS_LABELS[s]);
    });
  });
});
