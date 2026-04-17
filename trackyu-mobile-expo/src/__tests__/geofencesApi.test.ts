/**
 * @jest-environment node
 *
 * Tests unitaires de geofencesApi.
 *
 * Vérifie :
 *  - getAll   : GET /monitoring/geofences, normalisation null → []
 *  - getById  : GET /monitoring/geofences/:id, erreur 404 → NOT_FOUND
 */

(globalThis as unknown as Record<string, unknown>).__DEV__ = false;

// ── Mock apiClient ─────────────────────────────────────────────────────────────

jest.mock('../api/client', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
    get: jest.fn(),
    delete: jest.fn(),
    put: jest.fn(),
  },
}));

// ── Imports ────────────────────────────────────────────────────────────────────

import apiClient from '../api/client';
import { geofencesApi } from '../api/geofencesApi';
import type { Geofence } from '../api/geofencesApi';

const mockGet = apiClient.get as jest.Mock;

// ── Fixtures ───────────────────────────────────────────────────────────────────

const CIRCLE_GEO: Geofence = {
  id: 'geo-001',
  tenant_id: 'tenant-01',
  name: "Zone Port d'Abidjan",
  type: 'CIRCLE',
  coordinates: { center: { lat: 5.3167, lng: -4.0167 }, radius: 500 },
  color: '#FF5733',
  is_active: true,
  created_at: '2026-01-15T08:00:00.000Z',
};

const POLYGON_GEO: Geofence = {
  id: 'geo-002',
  tenant_id: 'tenant-01',
  name: 'Zone Industrie Yopougon',
  type: 'POLYGON',
  coordinates: [
    { lat: 5.35, lng: -4.07 },
    { lat: 5.36, lng: -4.06 },
    { lat: 5.355, lng: -4.05 },
    { lat: 5.345, lng: -4.06 },
  ],
  is_active: true,
  created_at: '2026-02-10T10:00:00.000Z',
};

beforeEach(() => jest.clearAllMocks());

// ═══════════════════════════════════════════════════════════════════════════════
// geofencesApi.getAll
// ═══════════════════════════════════════════════════════════════════════════════

describe('geofencesApi.getAll', () => {
  it('envoie un GET vers /monitoring/geofences', async () => {
    mockGet.mockResolvedValueOnce({ data: [] });
    await geofencesApi.getAll();
    expect(mockGet).toHaveBeenCalledWith('/monitoring/geofences');
  });

  it('retourne la liste des géofences', async () => {
    mockGet.mockResolvedValueOnce({ data: [CIRCLE_GEO, POLYGON_GEO] });
    const result = await geofencesApi.getAll();
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("Zone Port d'Abidjan");
    expect(result[0].type).toBe('CIRCLE');
    expect(result[1].type).toBe('POLYGON');
  });

  it('retourne [] si le backend retourne null', async () => {
    mockGet.mockResolvedValueOnce({ data: null });
    const result = await geofencesApi.getAll();
    expect(result).toEqual([]);
  });

  it('retourne [] si le backend retourne un objet non-tableau', async () => {
    mockGet.mockResolvedValueOnce({ data: { total: 0 } });
    const result = await geofencesApi.getAll();
    expect(result).toEqual([]);
  });

  it('retourne [] si le backend retourne un tableau vide', async () => {
    mockGet.mockResolvedValueOnce({ data: [] });
    const result = await geofencesApi.getAll();
    expect(result).toEqual([]);
  });

  it('propage une erreur réseau sous forme ApiError NETWORK', async () => {
    mockGet.mockRejectedValueOnce({ request: {}, message: 'Network Error' });
    await expect(geofencesApi.getAll()).rejects.toMatchObject({ code: 'NETWORK' });
  });

  it('propage une erreur 401 sous forme ApiError AUTH', async () => {
    mockGet.mockRejectedValueOnce({ response: { status: 401, data: {} } });
    await expect(geofencesApi.getAll()).rejects.toMatchObject({ code: 'AUTH' });
  });

  it('propage une erreur 403 sous forme ApiError AUTH', async () => {
    mockGet.mockRejectedValueOnce({ response: { status: 403, data: {} } });
    await expect(geofencesApi.getAll()).rejects.toMatchObject({ code: 'AUTH' });
  });

  it('propage une erreur 500 sous forme ApiError SERVER', async () => {
    mockGet.mockRejectedValueOnce({ response: { status: 500, data: { message: 'Internal Server Error' } } });
    await expect(geofencesApi.getAll()).rejects.toMatchObject({ code: 'SERVER' });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// geofencesApi.getById
// ═══════════════════════════════════════════════════════════════════════════════

describe('geofencesApi.getById', () => {
  it('envoie un GET vers /monitoring/geofences/:id', async () => {
    mockGet.mockResolvedValueOnce({ data: CIRCLE_GEO });
    await geofencesApi.getById('geo-001');
    expect(mockGet).toHaveBeenCalledWith('/monitoring/geofences/geo-001');
  });

  it('retourne la géofence CIRCLE avec ses coordonnées', async () => {
    mockGet.mockResolvedValueOnce({ data: CIRCLE_GEO });
    const result = await geofencesApi.getById('geo-001');
    expect(result.id).toBe('geo-001');
    expect(result.type).toBe('CIRCLE');
    const coords = result.coordinates as { center: { lat: number; lng: number }; radius: number };
    expect(coords.center.lat).toBe(5.3167);
    expect(coords.radius).toBe(500);
  });

  it('retourne la géofence POLYGON avec ses coordonnées', async () => {
    mockGet.mockResolvedValueOnce({ data: POLYGON_GEO });
    const result = await geofencesApi.getById('geo-002');
    expect(result.type).toBe('POLYGON');
    const coords = result.coordinates as { lat: number; lng: number }[];
    expect(coords).toHaveLength(4);
  });

  it('propage une erreur 404 sous forme ApiError NOT_FOUND', async () => {
    mockGet.mockRejectedValueOnce({ response: { status: 404, data: { message: 'Not found' } } });
    await expect(geofencesApi.getById('geo-inexistant')).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('propage une erreur réseau sous forme ApiError NETWORK', async () => {
    mockGet.mockRejectedValueOnce({ request: {}, message: 'Network Error' });
    await expect(geofencesApi.getById('geo-001')).rejects.toMatchObject({ code: 'NETWORK' });
  });

  it('propage une erreur 500 sous forme ApiError SERVER', async () => {
    mockGet.mockRejectedValueOnce({ response: { status: 500, data: {} } });
    await expect(geofencesApi.getById('geo-001')).rejects.toMatchObject({ code: 'SERVER' });
  });
});
