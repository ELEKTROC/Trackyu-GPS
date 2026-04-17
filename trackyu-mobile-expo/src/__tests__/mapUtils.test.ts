/**
 * Tests unitaires — src/utils/mapUtils.ts
 * Logique pure du module carte : type de véhicule, position GPS, filtrage, stats.
 */
import { getTypeChar, hasRealPosition, buildFilteredMarkers, computeStatusCounts } from '../utils/mapUtils';
import type { MapMarker } from '../api/vehicles';

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeMarker(overrides: Partial<MapMarker> = {}): MapMarker {
  return {
    id: 'v1',
    name: 'Véhicule Test',
    plate: 'AB123CD',
    type: 'car',
    status: 'moving',
    lat: 5.36,
    lng: -4.01,
    speed: 60,
    lastUpdate: new Date().toISOString(),
    hasGps: true,
    ...overrides,
  };
}

// ── getTypeChar ────────────────────────────────────────────────────────────────

describe('getTypeChar', () => {
  test.each([
    // getTypeChar = getTypeKey().toUpperCase()
    ['car', 'CAR'],
    ['CAR', 'CAR'],
    ['voiture', 'CAR'],
    ['sedan', 'CAR'],
    ['truck', 'TRUCK'],
    ['TRUCK', 'TRUCK'],
    ['camion', 'TRUCK'],
    ['bus', 'BUS'],
    ['BUS', 'BUS'],
    ['autobus', 'BUS'],
    ['autocar', 'BUS'],
    ['motorcycle', 'MOTO'],
    ['moto', 'MOTO'],
    ['bike', 'MOTO'],
    ['van', 'VAN'],
    ['utilitaire', 'VAN'],
    ['fourgon', 'VAN'],
    ['tractor', 'AGR'],
    ['tracteur', 'AGR'],
    ['engin', 'ENG'],
    ['machine', 'ENG'],
    // Fallback
    ['unknown', 'CAR'],
    ['', 'CAR'],
    // Chaine contenant le mot-clé (type composé)
    ['PICKUP_TRUCK', 'TRUCK'],
    ['MINI_BUS', 'BUS'],
  ])('getTypeChar("%s") → "%s"', (input, expected) => {
    expect(getTypeChar(input)).toBe(expected);
  });

  it('traite undefined/null comme chaîne vide → CAR', () => {
    // @ts-expect-error test de robustesse
    expect(getTypeChar(null)).toBe('CAR');
    // @ts-expect-error test de robustesse
    expect(getTypeChar(undefined)).toBe('CAR');
  });
});

// ── hasRealPosition ────────────────────────────────────────────────────────────

describe('hasRealPosition', () => {
  it('retourne false pour (0, 0) — Golfe de Guinée', () => {
    expect(hasRealPosition(0, 0)).toBe(false);
  });

  it("retourne false pour les coordonnées proches de l'origine (< 0.5°)", () => {
    expect(hasRealPosition(0.4, 0.3)).toBe(false);
    expect(hasRealPosition(-0.4, -0.4)).toBe(false);
    expect(hasRealPosition(0.001, 0.001)).toBe(false);
  });

  it("retourne true dès qu'une coordonnée dépasse ±0.5°", () => {
    expect(hasRealPosition(0.6, 0)).toBe(true); // lat > 0.5
    expect(hasRealPosition(0, 0.6)).toBe(true); // lng > 0.5
    expect(hasRealPosition(-0.6, 0)).toBe(true); // lat < -0.5
  });

  it('retourne true pour des positions réelles (Abidjan, Paris…)', () => {
    expect(hasRealPosition(5.3599, -4.0083)).toBe(true); // Abidjan
    expect(hasRealPosition(48.8566, 2.3522)).toBe(true); // Paris
    expect(hasRealPosition(-4.3217, 15.3224)).toBe(true); // Brazzaville
  });

  it('retourne false pour NaN et Infinity', () => {
    expect(hasRealPosition(NaN, 5)).toBe(false);
    expect(hasRealPosition(5, NaN)).toBe(false);
    expect(hasRealPosition(Infinity, 5)).toBe(false);
    expect(hasRealPosition(5, -Infinity)).toBe(false);
  });
});

// ── buildFilteredMarkers ───────────────────────────────────────────────────────

describe('buildFilteredMarkers', () => {
  const fleet: MapMarker[] = [
    makeMarker({ id: '1', status: 'moving', clientName: 'ACME', groupName: 'Nord' }),
    makeMarker({ id: '2', status: 'stopped', clientName: 'ACME', groupName: 'Sud' }),
    makeMarker({ id: '3', status: 'idle', clientName: 'BETA', groupName: 'Nord' }),
    makeMarker({ id: '4', status: 'offline', clientName: 'BETA', groupName: 'Sud' }),
    makeMarker({ id: '5', status: 'moving', clientName: undefined, groupName: undefined }),
  ];

  it('statusFilter=all retourne tous les marqueurs', () => {
    expect(buildFilteredMarkers(fleet, 'all', null, null)).toHaveLength(5);
  });

  it('filtre par statut moving', () => {
    const result = buildFilteredMarkers(fleet, 'moving', null, null);
    expect(result).toHaveLength(2);
    expect(result.every((m) => m.status === 'moving')).toBe(true);
  });

  it('filtre par statut stopped', () => {
    const result = buildFilteredMarkers(fleet, 'stopped', null, null);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('2');
  });

  it('filtre par statut idle', () => {
    const result = buildFilteredMarkers(fleet, 'idle', null, null);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('3');
  });

  it('filtre par statut offline', () => {
    const result = buildFilteredMarkers(fleet, 'offline', null, null);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('4');
  });

  it('filtre par client', () => {
    const result = buildFilteredMarkers(fleet, 'all', 'ACME', null);
    expect(result).toHaveLength(2);
    expect(result.every((m) => m.clientName === 'ACME')).toBe(true);
  });

  it('filtre par branche', () => {
    const result = buildFilteredMarkers(fleet, 'all', null, 'Nord');
    expect(result).toHaveLength(2);
    expect(result.every((m) => m.groupName === 'Nord')).toBe(true);
  });

  it('filtre combiné statut + client (ET logique)', () => {
    const result = buildFilteredMarkers(fleet, 'moving', 'ACME', null);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('filtre combiné statut + client + branche (ET logique)', () => {
    const result = buildFilteredMarkers(fleet, 'idle', 'BETA', 'Nord');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('3');
  });

  it('retourne tableau vide si aucune correspondance', () => {
    expect(buildFilteredMarkers(fleet, 'moving', 'INEXISTANT', null)).toHaveLength(0);
  });

  it('retourne tableau vide pour une flotte vide', () => {
    expect(buildFilteredMarkers([], 'all', null, null)).toHaveLength(0);
  });

  it('filtre par client exclut les véhicules sans client défini', () => {
    // Le véhicule id=5 a clientName=undefined → exclu du filtre ACME
    const result = buildFilteredMarkers(fleet, 'all', 'ACME', null);
    expect(result.find((m) => m.id === '5')).toBeUndefined();
  });
});

// ── computeStatusCounts ───────────────────────────────────────────────────────

describe('computeStatusCounts', () => {
  it('calcule correctement les 4 compteurs et le total', () => {
    const fleet = [
      { status: 'moving' as const },
      { status: 'moving' as const },
      { status: 'stopped' as const },
      { status: 'idle' as const },
      { status: 'offline' as const },
      { status: 'offline' as const },
      { status: 'offline' as const },
    ];
    const counts = computeStatusCounts(fleet);
    expect(counts.moving).toBe(2);
    expect(counts.stopped).toBe(1);
    expect(counts.idle).toBe(1);
    expect(counts.offline).toBe(3);
    expect(counts.total).toBe(7);
  });

  it('retourne tous les compteurs à 0 pour une flotte vide', () => {
    const counts = computeStatusCounts([]);
    expect(counts).toEqual({ moving: 0, stopped: 0, idle: 0, offline: 0, total: 0 });
  });

  it('total = somme de tous les statuts', () => {
    const fleet = Array.from({ length: 1841 }, (_, i) => ({
      status: (['moving', 'stopped', 'idle', 'offline'] as const)[i % 4],
    }));
    const counts = computeStatusCounts(fleet);
    expect(counts.total).toBe(1841);
    expect(counts.moving + counts.stopped + counts.idle + counts.offline).toBe(1841);
  });

  it('fonctionne avec uniquement des véhicules offline', () => {
    const fleet = [{ status: 'offline' as const }, { status: 'offline' as const }];
    const counts = computeStatusCounts(fleet);
    expect(counts.offline).toBe(2);
    expect(counts.moving).toBe(0);
  });
});
