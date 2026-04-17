/**
 * @jest-environment node
 *
 * Tests unitaires de ecoDrivingApi.
 *
 * Vérifie :
 *  - getAll  : GET /eco-driving-profiles, normalisation null → []
 *  - create  : POST /eco-driving-profiles avec payload
 *  - update  : PUT /eco-driving-profiles/:id avec données partielles
 *  - delete  : DELETE /eco-driving-profiles/:id, retourne void
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
import { ecoDrivingApi } from '../api/ecoDrivingApi';
import type { EcoDrivingProfile, CreateEcoDrivingProfileRequest } from '../api/ecoDrivingApi';

const mockGet = apiClient.get as jest.Mock;
const mockPost = apiClient.post as jest.Mock;
const mockPut = apiClient.put as jest.Mock;
const mockDelete = apiClient.delete as jest.Mock;

// ── Fixtures ───────────────────────────────────────────────────────────────────

const PROFILE: EcoDrivingProfile = {
  id: 'eco-001',
  tenantId: 'tenant-01',
  name: 'Profil Standard Flotte',
  targetScore: 80,
  maxSpeedLimit: 120,
  maxSpeedPenalty: 5,
  harshAccelerationSensitivity: 'MEDIUM',
  harshAccelerationPenalty: 3,
  harshBrakingSensitivity: 'MEDIUM',
  harshBrakingPenalty: 3,
  harshCorneringSensitivity: 'LOW',
  harshCorneringPenalty: 2,
  maxIdlingDuration: 10,
  idlingPenalty: 1,
  vehicleIds: ['v-001', 'v-002'],
  allVehicles: false,
  status: 'ACTIVE',
};

const PAYLOAD: CreateEcoDrivingProfileRequest = {
  name: 'Profil Urbain Strict',
  targetScore: 90,
  maxSpeedLimit: 80,
  maxSpeedPenalty: 8,
  harshAccelerationSensitivity: 'HIGH',
  harshAccelerationPenalty: 5,
  harshBrakingSensitivity: 'HIGH',
  harshBrakingPenalty: 5,
  maxIdlingDuration: 5,
  idlingPenalty: 2,
  allVehicles: true,
  status: 'ACTIVE',
};

beforeEach(() => jest.clearAllMocks());

// ═══════════════════════════════════════════════════════════════════════════════
// ecoDrivingApi.getAll
// ═══════════════════════════════════════════════════════════════════════════════

describe('ecoDrivingApi.getAll', () => {
  it('envoie un GET vers /eco-driving-profiles', async () => {
    mockGet.mockResolvedValueOnce({ data: [] });
    await ecoDrivingApi.getAll();
    expect(mockGet).toHaveBeenCalledWith('/eco-driving-profiles');
  });

  it('retourne la liste des profils', async () => {
    mockGet.mockResolvedValueOnce({ data: [PROFILE] });
    const result = await ecoDrivingApi.getAll();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Profil Standard Flotte');
    expect(result[0].targetScore).toBe(80);
    expect(result[0].status).toBe('ACTIVE');
  });

  it('retourne [] si le backend retourne null', async () => {
    mockGet.mockResolvedValueOnce({ data: null });
    const result = await ecoDrivingApi.getAll();
    expect(result).toEqual([]);
  });

  it('retourne [] si le backend retourne un objet non-tableau', async () => {
    mockGet.mockResolvedValueOnce({ data: { total: 0 } });
    const result = await ecoDrivingApi.getAll();
    expect(result).toEqual([]);
  });

  it('retourne la liste complète avec plusieurs profils', async () => {
    const profiles: EcoDrivingProfile[] = [
      PROFILE,
      { ...PROFILE, id: 'eco-002', name: 'Profil Longue Distance', status: 'ACTIVE' },
      { ...PROFILE, id: 'eco-003', name: 'Profil Archivé', status: 'INACTIVE' },
    ];
    mockGet.mockResolvedValueOnce({ data: profiles });
    const result = await ecoDrivingApi.getAll();
    expect(result).toHaveLength(3);
    expect(result.map((p) => p.status)).toEqual(['ACTIVE', 'ACTIVE', 'INACTIVE']);
  });

  it('propage une erreur réseau sous forme ApiError NETWORK', async () => {
    mockGet.mockRejectedValueOnce({ request: {}, message: 'Network Error' });
    await expect(ecoDrivingApi.getAll()).rejects.toMatchObject({ code: 'NETWORK' });
  });

  it('propage une erreur 401 sous forme ApiError AUTH', async () => {
    mockGet.mockRejectedValueOnce({ response: { status: 401, data: {} } });
    await expect(ecoDrivingApi.getAll()).rejects.toMatchObject({ code: 'AUTH' });
  });

  it('propage une erreur 403 sous forme ApiError AUTH', async () => {
    mockGet.mockRejectedValueOnce({ response: { status: 403, data: {} } });
    await expect(ecoDrivingApi.getAll()).rejects.toMatchObject({ code: 'AUTH' });
  });

  it('propage une erreur 500 sous forme ApiError SERVER', async () => {
    mockGet.mockRejectedValueOnce({ response: { status: 500, data: { message: 'Internal Server Error' } } });
    await expect(ecoDrivingApi.getAll()).rejects.toMatchObject({ code: 'SERVER' });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ecoDrivingApi.create
// ═══════════════════════════════════════════════════════════════════════════════

describe('ecoDrivingApi.create', () => {
  it('envoie un POST vers /eco-driving-profiles avec le payload', async () => {
    mockPost.mockResolvedValueOnce({ data: { ...PROFILE, ...PAYLOAD, id: 'eco-new' } });
    await ecoDrivingApi.create(PAYLOAD);
    expect(mockPost).toHaveBeenCalledWith('/eco-driving-profiles', PAYLOAD);
  });

  it('retourne le profil créé', async () => {
    const newProfile = { ...PROFILE, id: 'eco-new', name: PAYLOAD.name };
    mockPost.mockResolvedValueOnce({ data: newProfile });
    const result = await ecoDrivingApi.create(PAYLOAD);
    expect(result.id).toBe('eco-new');
    expect(result.name).toBe('Profil Urbain Strict');
  });

  it('propage une erreur réseau sous forme ApiError NETWORK', async () => {
    mockPost.mockRejectedValueOnce({ request: {}, message: 'Network Error' });
    await expect(ecoDrivingApi.create(PAYLOAD)).rejects.toMatchObject({ code: 'NETWORK' });
  });

  it('propage une erreur 422 sous forme ApiError UNKNOWN', async () => {
    mockPost.mockRejectedValueOnce({ response: { status: 422, data: { message: 'Validation Error' } } });
    await expect(ecoDrivingApi.create(PAYLOAD)).rejects.toMatchObject({ code: 'UNKNOWN' });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ecoDrivingApi.update
// ═══════════════════════════════════════════════════════════════════════════════

describe('ecoDrivingApi.update', () => {
  it('envoie un PUT vers /eco-driving-profiles/:id avec les données partielles', async () => {
    mockPut.mockResolvedValueOnce({ data: { ...PROFILE, maxSpeedLimit: 100 } });
    await ecoDrivingApi.update('eco-001', { maxSpeedLimit: 100 });
    expect(mockPut).toHaveBeenCalledWith('/eco-driving-profiles/eco-001', { maxSpeedLimit: 100 });
  });

  it('retourne le profil mis à jour', async () => {
    const updated = { ...PROFILE, status: 'INACTIVE' as const, targetScore: 85 };
    mockPut.mockResolvedValueOnce({ data: updated });
    const result = await ecoDrivingApi.update('eco-001', { status: 'INACTIVE', targetScore: 85 });
    expect(result.status).toBe('INACTIVE');
    expect(result.targetScore).toBe(85);
  });

  it('propage une erreur réseau sous forme ApiError NETWORK', async () => {
    mockPut.mockRejectedValueOnce({ request: {}, message: 'Network Error' });
    await expect(ecoDrivingApi.update('eco-001', {})).rejects.toMatchObject({ code: 'NETWORK' });
  });

  it('propage une erreur 404 sous forme ApiError NOT_FOUND', async () => {
    mockPut.mockRejectedValueOnce({ response: { status: 404, data: { message: 'Not found' } } });
    await expect(ecoDrivingApi.update('eco-inexistant', {})).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ecoDrivingApi.delete
// ═══════════════════════════════════════════════════════════════════════════════

describe('ecoDrivingApi.delete', () => {
  it('envoie un DELETE vers /eco-driving-profiles/:id', async () => {
    mockDelete.mockResolvedValueOnce({ data: {} });
    await ecoDrivingApi.delete('eco-001');
    expect(mockDelete).toHaveBeenCalledWith('/eco-driving-profiles/eco-001');
  });

  it('retourne void en cas de succès', async () => {
    mockDelete.mockResolvedValueOnce({ data: {} });
    const result = await ecoDrivingApi.delete('eco-001');
    expect(result).toBeUndefined();
  });

  it('propage une erreur 404 sous forme ApiError NOT_FOUND', async () => {
    mockDelete.mockRejectedValueOnce({ response: { status: 404, data: { message: 'Not found' } } });
    await expect(ecoDrivingApi.delete('eco-inexistant')).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('propage une erreur réseau sous forme ApiError NETWORK', async () => {
    mockDelete.mockRejectedValueOnce({ request: {}, message: 'Network Error' });
    await expect(ecoDrivingApi.delete('eco-001')).rejects.toMatchObject({ code: 'NETWORK' });
  });

  it('propage une erreur 500 sous forme ApiError SERVER', async () => {
    mockDelete.mockRejectedValueOnce({ response: { status: 500, data: {} } });
    await expect(ecoDrivingApi.delete('eco-001')).rejects.toMatchObject({ code: 'SERVER' });
  });
});
