/**
 * @jest-environment node
 *
 * Tests unitaires — helpers de src/api/geofencesApi.ts
 * (non couverts par geofencesApi.test.ts qui teste uniquement les endpoints HTTP)
 *
 * Couverture :
 *  - isCircle  : type guard différenciant CIRCLE vs POLYGON/ROUTE
 *  - toLatLng  : transformation { lat, lng } → { latitude, longitude }
 */

(globalThis as unknown as Record<string, unknown>).__DEV__ = false;

jest.mock('../api/client', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

import { isCircle, toLatLng } from '../api/geofencesApi';
import type { Geofence, CircleCoords } from '../api/geofencesApi';

// ── Fixtures ───────────────────────────────────────────────────────────────────

function makeGeofence(overrides: Partial<Geofence>): Geofence {
  return {
    id: 'gf-1',
    tenant_id: 'tenant-1',
    name: 'Zone Test',
    type: 'POLYGON',
    coordinates: [
      { lat: 5.36, lng: -4.01 },
      { lat: 5.37, lng: -4.02 },
      { lat: 5.35, lng: -4.0 },
    ],
    is_active: true,
    created_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

const circleCoords: CircleCoords = {
  center: { lat: 5.3599, lng: -4.0083 },
  radius: 500,
};

// ── isCircle ───────────────────────────────────────────────────────────────────

describe('isCircle', () => {
  it('retourne true pour une géofence de type CIRCLE', () => {
    const g = makeGeofence({ type: 'CIRCLE', coordinates: circleCoords });
    expect(isCircle(g)).toBe(true);
  });

  it('retourne false pour une géofence de type POLYGON', () => {
    const g = makeGeofence({ type: 'POLYGON' });
    expect(isCircle(g)).toBe(false);
  });

  it('retourne false pour une géofence de type ROUTE', () => {
    const g = makeGeofence({ type: 'ROUTE' });
    expect(isCircle(g)).toBe(false);
  });

  it("permet d'accéder à coordinates.center et coordinates.radius après guard", () => {
    const g = makeGeofence({ type: 'CIRCLE', coordinates: circleCoords });
    if (isCircle(g)) {
      // TypeScript doit typer g.coordinates comme CircleCoords
      expect(g.coordinates.center.lat).toBe(5.3599);
      expect(g.coordinates.center.lng).toBe(-4.0083);
      expect(g.coordinates.radius).toBe(500);
    } else {
      fail('isCircle devrait retourner true');
    }
  });

  it('est un type guard (TypeScript) : utilisable comme branchement', () => {
    const geofences = [
      makeGeofence({ type: 'CIRCLE', coordinates: circleCoords }),
      makeGeofence({ type: 'POLYGON' }),
      makeGeofence({ type: 'ROUTE' }),
    ];
    const circles = geofences.filter(isCircle);
    const polygons = geofences.filter((g) => !isCircle(g));
    expect(circles).toHaveLength(1);
    expect(polygons).toHaveLength(2);
  });
});

// ── toLatLng ───────────────────────────────────────────────────────────────────

describe('toLatLng', () => {
  it('transforme un tableau de {lat, lng} en {latitude, longitude}', () => {
    const coords = [
      { lat: 5.36, lng: -4.01 },
      { lat: 5.37, lng: -4.02 },
      { lat: 5.35, lng: -4.0 },
    ];
    const result = toLatLng(coords);
    expect(result).toEqual([
      { latitude: 5.36, longitude: -4.01 },
      { latitude: 5.37, longitude: -4.02 },
      { latitude: 5.35, longitude: -4.0 },
    ]);
  });

  it('retourne un tableau vide pour une liste vide', () => {
    expect(toLatLng([])).toEqual([]);
  });

  it("préserve l'ordre des points", () => {
    const coords = [
      { lat: 1, lng: 1 },
      { lat: 2, lng: 2 },
      { lat: 3, lng: 3 },
    ];
    const result = toLatLng(coords);
    expect(result[0]).toEqual({ latitude: 1, longitude: 1 });
    expect(result[1]).toEqual({ latitude: 2, longitude: 2 });
    expect(result[2]).toEqual({ latitude: 3, longitude: 3 });
  });

  it('gère les coordonnées négatives (hémisphère sud / ouest)', () => {
    const coords = [{ lat: -4.32, lng: 15.32 }]; // Brazzaville
    const result = toLatLng(coords);
    expect(result[0]).toEqual({ latitude: -4.32, longitude: 15.32 });
  });

  it('gère les coordonnées nulles (Golfe de Guinée)', () => {
    const coords = [{ lat: 0, lng: 0 }];
    const result = toLatLng(coords);
    expect(result[0]).toEqual({ latitude: 0, longitude: 0 });
  });

  it('produit un format compatible avec react-native-maps Polygon coordinates', () => {
    const coords = [
      { lat: 5.36, lng: -4.01 },
      { lat: 5.37, lng: -4.02 },
      { lat: 5.38, lng: -4.0 },
    ];
    const result = toLatLng(coords);
    // react-native-maps attend { latitude: number; longitude: number }
    result.forEach((point) => {
      expect(typeof point.latitude).toBe('number');
      expect(typeof point.longitude).toBe('number');
      expect(Object.keys(point).sort()).toEqual(['latitude', 'longitude']);
    });
  });
});
