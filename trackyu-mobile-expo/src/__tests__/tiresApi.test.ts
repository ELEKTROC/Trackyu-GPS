/**
 * @jest-environment node
 *
 * Tests unitaires de tiresApi.
 *
 * Vérifie :
 *  - getAll       : GET /fleet-tires, normalisation null → []
 *  - getByVehicle : GET /fleet-tires?vehicleId=:id (query string)
 *  - create       : POST /fleet-tires avec payload
 *  - update       : PUT /fleet-tires/:id avec données partielles
 *  - delete       : DELETE /fleet-tires/:id, retourne void
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
import { tiresApi } from '../api/tiresApi';
import type { Tire, CreateTireRequest } from '../api/tiresApi';

const mockGet = apiClient.get as jest.Mock;
const mockPost = apiClient.post as jest.Mock;
const mockPut = apiClient.put as jest.Mock;
const mockDelete = apiClient.delete as jest.Mock;

// ── Fixtures ───────────────────────────────────────────────────────────────────

const TIRE: Tire = {
  id: 'tire-001',
  vehicleId: 'v-001',
  serialNumber: 'MIC-2024-AV-G-001',
  brand: 'Michelin',
  position: 'AV.G',
  mountDate: '2024-06-01',
  mileageAtMount: 85_000,
  targetMileage: 45_000,
  currentMileage: 110_000,
  status: 'Actif',
  notes: 'Pneu neuf, bon état',
  tenantId: 'tenant-01',
};

const PAYLOAD: CreateTireRequest = {
  vehicleId: 'v-001',
  serialNumber: 'MIC-2024-AV-D-002',
  brand: 'Michelin',
  position: 'AV.D',
  mountDate: '2024-06-01',
  mileageAtMount: 85_000,
  targetMileage: 45_000,
  status: 'Actif',
  tenantId: 'tenant-01',
};

beforeEach(() => jest.clearAllMocks());

// ═══════════════════════════════════════════════════════════════════════════════
// tiresApi.getAll
// ═══════════════════════════════════════════════════════════════════════════════

describe('tiresApi.getAll', () => {
  it('envoie un GET vers /fleet-tires', async () => {
    mockGet.mockResolvedValueOnce({ data: [] });
    await tiresApi.getAll();
    expect(mockGet).toHaveBeenCalledWith('/fleet-tires');
  });

  it('retourne la liste des pneus', async () => {
    mockGet.mockResolvedValueOnce({ data: [TIRE] });
    const result = await tiresApi.getAll();
    expect(result).toHaveLength(1);
    expect(result[0].brand).toBe('Michelin');
    expect(result[0].position).toBe('AV.G');
    expect(result[0].status).toBe('Actif');
  });

  it('retourne [] si le backend retourne null', async () => {
    mockGet.mockResolvedValueOnce({ data: null });
    const result = await tiresApi.getAll();
    expect(result).toEqual([]);
  });

  it('retourne [] si le backend retourne un objet non-tableau', async () => {
    mockGet.mockResolvedValueOnce({ data: { total: 0 } });
    const result = await tiresApi.getAll();
    expect(result).toEqual([]);
  });

  it('retourne la liste complète avec plusieurs positions', async () => {
    const tires: Tire[] = [
      TIRE,
      { ...TIRE, id: 'tire-002', position: 'AV.D', serialNumber: 'MIC-AV-D' },
      { ...TIRE, id: 'tire-003', position: 'AR.G', serialNumber: 'MIC-AR-G', status: 'Remplacé' },
      { ...TIRE, id: 'tire-004', position: 'AR.D', serialNumber: 'MIC-AR-D' },
    ];
    mockGet.mockResolvedValueOnce({ data: tires });
    const result = await tiresApi.getAll();
    expect(result).toHaveLength(4);
    expect(result.map((t) => t.position)).toEqual(['AV.G', 'AV.D', 'AR.G', 'AR.D']);
  });

  it('propage une erreur réseau sous forme ApiError NETWORK', async () => {
    mockGet.mockRejectedValueOnce({ request: {}, message: 'Network Error' });
    await expect(tiresApi.getAll()).rejects.toMatchObject({ code: 'NETWORK' });
  });

  it('propage une erreur 401 sous forme ApiError AUTH', async () => {
    mockGet.mockRejectedValueOnce({ response: { status: 401, data: {} } });
    await expect(tiresApi.getAll()).rejects.toMatchObject({ code: 'AUTH' });
  });

  it('propage une erreur 403 sous forme ApiError AUTH', async () => {
    mockGet.mockRejectedValueOnce({ response: { status: 403, data: {} } });
    await expect(tiresApi.getAll()).rejects.toMatchObject({ code: 'AUTH' });
  });

  it('propage une erreur 500 sous forme ApiError SERVER', async () => {
    mockGet.mockRejectedValueOnce({ response: { status: 500, data: { message: 'Internal Server Error' } } });
    await expect(tiresApi.getAll()).rejects.toMatchObject({ code: 'SERVER' });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// tiresApi.getByVehicle
// ═══════════════════════════════════════════════════════════════════════════════

describe('tiresApi.getByVehicle', () => {
  it('envoie un GET vers /fleet-tires?vehicleId=:id', async () => {
    mockGet.mockResolvedValueOnce({ data: [TIRE] });
    await tiresApi.getByVehicle('v-001');
    expect(mockGet).toHaveBeenCalledWith('/fleet-tires?vehicleId=v-001');
  });

  it('retourne les pneus du véhicule', async () => {
    const vehicleTires = [TIRE, { ...TIRE, id: 'tire-002', position: 'AV.D' as const }];
    mockGet.mockResolvedValueOnce({ data: vehicleTires });
    const result = await tiresApi.getByVehicle('v-001');
    expect(result).toHaveLength(2);
    expect(result.every((t) => t.vehicleId === 'v-001')).toBe(true);
  });

  it('retourne [] si aucun pneu enregistré pour ce véhicule', async () => {
    mockGet.mockResolvedValueOnce({ data: [] });
    const result = await tiresApi.getByVehicle('v-999');
    expect(result).toEqual([]);
  });

  it('retourne [] si le backend retourne null', async () => {
    mockGet.mockResolvedValueOnce({ data: null });
    const result = await tiresApi.getByVehicle('v-001');
    expect(result).toEqual([]);
  });

  it('propage une erreur réseau sous forme ApiError NETWORK', async () => {
    mockGet.mockRejectedValueOnce({ request: {}, message: 'Network Error' });
    await expect(tiresApi.getByVehicle('v-001')).rejects.toMatchObject({ code: 'NETWORK' });
  });

  it('propage une erreur 403 sous forme ApiError AUTH', async () => {
    mockGet.mockRejectedValueOnce({ response: { status: 403, data: {} } });
    await expect(tiresApi.getByVehicle('v-001')).rejects.toMatchObject({ code: 'AUTH' });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// tiresApi.create
// ═══════════════════════════════════════════════════════════════════════════════

describe('tiresApi.create', () => {
  it('envoie un POST vers /fleet-tires avec le payload', async () => {
    mockPost.mockResolvedValueOnce({ data: { ...PAYLOAD, id: 'tire-new' } });
    await tiresApi.create(PAYLOAD);
    expect(mockPost).toHaveBeenCalledWith('/fleet-tires', PAYLOAD);
  });

  it('retourne le pneu créé', async () => {
    const newTire = { ...TIRE, id: 'tire-new', position: PAYLOAD.position, serialNumber: PAYLOAD.serialNumber };
    mockPost.mockResolvedValueOnce({ data: newTire });
    const result = await tiresApi.create(PAYLOAD);
    expect(result.id).toBe('tire-new');
    expect(result.position).toBe('AV.D');
    expect(result.serialNumber).toBe('MIC-2024-AV-D-002');
  });

  it('propage une erreur réseau sous forme ApiError NETWORK', async () => {
    mockPost.mockRejectedValueOnce({ request: {}, message: 'Network Error' });
    await expect(tiresApi.create(PAYLOAD)).rejects.toMatchObject({ code: 'NETWORK' });
  });

  it('propage une erreur 422 sous forme ApiError UNKNOWN', async () => {
    mockPost.mockRejectedValueOnce({ response: { status: 422, data: { message: 'Validation Error' } } });
    await expect(tiresApi.create(PAYLOAD)).rejects.toMatchObject({ code: 'UNKNOWN' });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// tiresApi.update
// ═══════════════════════════════════════════════════════════════════════════════

describe('tiresApi.update', () => {
  it('envoie un PUT vers /fleet-tires/:id avec les données partielles', async () => {
    mockPut.mockResolvedValueOnce({ data: { ...TIRE, status: 'Remplacé' } });
    await tiresApi.update('tire-001', { status: 'Remplacé' });
    expect(mockPut).toHaveBeenCalledWith('/fleet-tires/tire-001', { status: 'Remplacé' });
  });

  it('retourne le pneu mis à jour', async () => {
    const updated = { ...TIRE, status: 'Remplacé' as const, notes: 'Remplacé après crevaison' };
    mockPut.mockResolvedValueOnce({ data: updated });
    const result = await tiresApi.update('tire-001', { status: 'Remplacé', notes: 'Remplacé après crevaison' });
    expect(result.status).toBe('Remplacé');
    expect(result.notes).toBe('Remplacé après crevaison');
  });

  it('propage une erreur réseau sous forme ApiError NETWORK', async () => {
    mockPut.mockRejectedValueOnce({ request: {}, message: 'Network Error' });
    await expect(tiresApi.update('tire-001', {})).rejects.toMatchObject({ code: 'NETWORK' });
  });

  it('propage une erreur 404 sous forme ApiError NOT_FOUND', async () => {
    mockPut.mockRejectedValueOnce({ response: { status: 404, data: { message: 'Not found' } } });
    await expect(tiresApi.update('tire-inexistant', {})).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// tiresApi.delete
// ═══════════════════════════════════════════════════════════════════════════════

describe('tiresApi.delete', () => {
  it('envoie un DELETE vers /fleet-tires/:id', async () => {
    mockDelete.mockResolvedValueOnce({ data: {} });
    await tiresApi.delete('tire-001');
    expect(mockDelete).toHaveBeenCalledWith('/fleet-tires/tire-001');
  });

  it('retourne void en cas de succès', async () => {
    mockDelete.mockResolvedValueOnce({ data: {} });
    const result = await tiresApi.delete('tire-001');
    expect(result).toBeUndefined();
  });

  it('propage une erreur 404 sous forme ApiError NOT_FOUND', async () => {
    mockDelete.mockRejectedValueOnce({ response: { status: 404, data: { message: 'Not found' } } });
    await expect(tiresApi.delete('tire-inexistant')).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('propage une erreur réseau sous forme ApiError NETWORK', async () => {
    mockDelete.mockRejectedValueOnce({ request: {}, message: 'Network Error' });
    await expect(tiresApi.delete('tire-001')).rejects.toMatchObject({ code: 'NETWORK' });
  });

  it('propage une erreur 500 sous forme ApiError SERVER', async () => {
    mockDelete.mockRejectedValueOnce({ response: { status: 500, data: {} } });
    await expect(tiresApi.delete('tire-001')).rejects.toMatchObject({ code: 'SERVER' });
  });
});
