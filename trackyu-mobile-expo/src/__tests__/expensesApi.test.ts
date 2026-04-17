/**
 * @jest-environment node
 *
 * Tests unitaires de expensesApi.
 *
 * Vérifie :
 *  - getAll       : GET /vehicle-expenses, normalisation null → []
 *  - getByVehicle : GET /vehicle-expenses?vehicleId=:id (query string)
 *  - create       : POST /vehicle-expenses avec payload
 *  - update       : PUT /vehicle-expenses/:id avec données partielles
 *  - delete       : DELETE /vehicle-expenses/:id, retourne void
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
import { expensesApi } from '../api/expensesApi';
import type { VehicleExpense, CreateExpenseRequest } from '../api/expensesApi';

const mockGet = apiClient.get as jest.Mock;
const mockPost = apiClient.post as jest.Mock;
const mockPut = apiClient.put as jest.Mock;
const mockDelete = apiClient.delete as jest.Mock;

// ── Fixtures ───────────────────────────────────────────────────────────────────

const EXPENSE: VehicleExpense = {
  id: 'exp-001',
  vehicleId: 'v-001',
  category: 'Carburant',
  amount: 45_000,
  currency: 'XOF',
  date: '2026-04-08',
  description: 'Plein station Shell Plateau',
  tenantId: 'tenant-01',
};

const PAYLOAD: CreateExpenseRequest = {
  vehicleId: 'v-002',
  category: 'Réparation',
  amount: 120_000,
  currency: 'XOF',
  date: '2026-04-09',
  description: 'Remplacement plaquettes de frein',
  tenantId: 'tenant-01',
};

beforeEach(() => jest.clearAllMocks());

// ═══════════════════════════════════════════════════════════════════════════════
// expensesApi.getAll
// ═══════════════════════════════════════════════════════════════════════════════

describe('expensesApi.getAll', () => {
  it('envoie un GET vers /vehicle-expenses', async () => {
    mockGet.mockResolvedValueOnce({ data: [] });
    await expensesApi.getAll();
    expect(mockGet).toHaveBeenCalledWith('/vehicle-expenses');
  });

  it('retourne la liste des dépenses', async () => {
    mockGet.mockResolvedValueOnce({ data: [EXPENSE] });
    const result = await expensesApi.getAll();
    expect(result).toHaveLength(1);
    expect(result[0].category).toBe('Carburant');
    expect(result[0].amount).toBe(45_000);
  });

  it('retourne [] si le backend retourne null', async () => {
    mockGet.mockResolvedValueOnce({ data: null });
    const result = await expensesApi.getAll();
    expect(result).toEqual([]);
  });

  it('retourne [] si le backend retourne un objet non-tableau', async () => {
    mockGet.mockResolvedValueOnce({ data: { total: 0 } });
    const result = await expensesApi.getAll();
    expect(result).toEqual([]);
  });

  it('retourne la liste complète avec plusieurs catégories', async () => {
    const expenses: VehicleExpense[] = [
      EXPENSE,
      { ...EXPENSE, id: 'exp-002', category: 'Péage', amount: 1_500 },
      { ...EXPENSE, id: 'exp-003', category: 'Assurance', amount: 250_000 },
    ];
    mockGet.mockResolvedValueOnce({ data: expenses });
    const result = await expensesApi.getAll();
    expect(result).toHaveLength(3);
    expect(result.map((e) => e.category)).toEqual(['Carburant', 'Péage', 'Assurance']);
  });

  it('propage une erreur réseau sous forme ApiError NETWORK', async () => {
    mockGet.mockRejectedValueOnce({ request: {}, message: 'Network Error' });
    await expect(expensesApi.getAll()).rejects.toMatchObject({ code: 'NETWORK' });
  });

  it('propage une erreur 401 sous forme ApiError AUTH', async () => {
    mockGet.mockRejectedValueOnce({ response: { status: 401, data: {} } });
    await expect(expensesApi.getAll()).rejects.toMatchObject({ code: 'AUTH' });
  });

  it('propage une erreur 500 sous forme ApiError SERVER', async () => {
    mockGet.mockRejectedValueOnce({ response: { status: 500, data: {} } });
    await expect(expensesApi.getAll()).rejects.toMatchObject({ code: 'SERVER' });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// expensesApi.getByVehicle
// ═══════════════════════════════════════════════════════════════════════════════

describe('expensesApi.getByVehicle', () => {
  it('envoie un GET vers /vehicle-expenses?vehicleId=:id', async () => {
    mockGet.mockResolvedValueOnce({ data: [EXPENSE] });
    await expensesApi.getByVehicle('v-001');
    expect(mockGet).toHaveBeenCalledWith('/vehicle-expenses?vehicleId=v-001');
  });

  it('retourne les dépenses filtrées pour le véhicule', async () => {
    mockGet.mockResolvedValueOnce({ data: [EXPENSE] });
    const result = await expensesApi.getByVehicle('v-001');
    expect(result).toHaveLength(1);
    expect(result[0].vehicleId).toBe('v-001');
  });

  it('retourne [] si aucune dépense pour ce véhicule', async () => {
    mockGet.mockResolvedValueOnce({ data: [] });
    const result = await expensesApi.getByVehicle('v-999');
    expect(result).toEqual([]);
  });

  it('retourne [] si le backend retourne null', async () => {
    mockGet.mockResolvedValueOnce({ data: null });
    const result = await expensesApi.getByVehicle('v-001');
    expect(result).toEqual([]);
  });

  it('propage une erreur réseau sous forme ApiError NETWORK', async () => {
    mockGet.mockRejectedValueOnce({ request: {}, message: 'Network Error' });
    await expect(expensesApi.getByVehicle('v-001')).rejects.toMatchObject({ code: 'NETWORK' });
  });

  it('propage une erreur 403 sous forme ApiError AUTH', async () => {
    mockGet.mockRejectedValueOnce({ response: { status: 403, data: {} } });
    await expect(expensesApi.getByVehicle('v-001')).rejects.toMatchObject({ code: 'AUTH' });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// expensesApi.create
// ═══════════════════════════════════════════════════════════════════════════════

describe('expensesApi.create', () => {
  it('envoie un POST vers /vehicle-expenses avec le payload', async () => {
    mockPost.mockResolvedValueOnce({ data: { ...PAYLOAD, id: 'exp-new' } });
    await expensesApi.create(PAYLOAD);
    expect(mockPost).toHaveBeenCalledWith('/vehicle-expenses', PAYLOAD);
  });

  it('retourne la dépense créée', async () => {
    const newExpense = { ...EXPENSE, id: 'exp-new', ...PAYLOAD };
    mockPost.mockResolvedValueOnce({ data: newExpense });
    const result = await expensesApi.create(PAYLOAD);
    expect(result.id).toBe('exp-new');
    expect(result.category).toBe('Réparation');
    expect(result.amount).toBe(120_000);
  });

  it('propage une erreur réseau sous forme ApiError NETWORK', async () => {
    mockPost.mockRejectedValueOnce({ request: {}, message: 'Network Error' });
    await expect(expensesApi.create(PAYLOAD)).rejects.toMatchObject({ code: 'NETWORK' });
  });

  it('propage une erreur 422 sous forme ApiError UNKNOWN', async () => {
    mockPost.mockRejectedValueOnce({ response: { status: 422, data: { message: 'Validation Error' } } });
    await expect(expensesApi.create(PAYLOAD)).rejects.toMatchObject({ code: 'UNKNOWN' });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// expensesApi.update
// ═══════════════════════════════════════════════════════════════════════════════

describe('expensesApi.update', () => {
  it('envoie un PUT vers /vehicle-expenses/:id avec les données partielles', async () => {
    mockPut.mockResolvedValueOnce({ data: { ...EXPENSE, amount: 50_000 } });
    await expensesApi.update('exp-001', { amount: 50_000 });
    expect(mockPut).toHaveBeenCalledWith('/vehicle-expenses/exp-001', { amount: 50_000 });
  });

  it('retourne la dépense mise à jour', async () => {
    const updated = { ...EXPENSE, amount: 55_000, description: 'Plein total' };
    mockPut.mockResolvedValueOnce({ data: updated });
    const result = await expensesApi.update('exp-001', { amount: 55_000, description: 'Plein total' });
    expect(result.amount).toBe(55_000);
    expect(result.description).toBe('Plein total');
  });

  it('propage une erreur réseau sous forme ApiError NETWORK', async () => {
    mockPut.mockRejectedValueOnce({ request: {}, message: 'Network Error' });
    await expect(expensesApi.update('exp-001', {})).rejects.toMatchObject({ code: 'NETWORK' });
  });

  it('propage une erreur 404 sous forme ApiError NOT_FOUND', async () => {
    mockPut.mockRejectedValueOnce({ response: { status: 404, data: { message: 'Not found' } } });
    await expect(expensesApi.update('exp-inexistant', {})).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// expensesApi.delete
// ═══════════════════════════════════════════════════════════════════════════════

describe('expensesApi.delete', () => {
  it('envoie un DELETE vers /vehicle-expenses/:id', async () => {
    mockDelete.mockResolvedValueOnce({ data: {} });
    await expensesApi.delete('exp-001');
    expect(mockDelete).toHaveBeenCalledWith('/vehicle-expenses/exp-001');
  });

  it('retourne void en cas de succès', async () => {
    mockDelete.mockResolvedValueOnce({ data: {} });
    const result = await expensesApi.delete('exp-001');
    expect(result).toBeUndefined();
  });

  it('propage une erreur 404 sous forme ApiError NOT_FOUND', async () => {
    mockDelete.mockRejectedValueOnce({ response: { status: 404, data: { message: 'Not found' } } });
    await expect(expensesApi.delete('exp-inexistant')).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('propage une erreur réseau sous forme ApiError NETWORK', async () => {
    mockDelete.mockRejectedValueOnce({ request: {}, message: 'Network Error' });
    await expect(expensesApi.delete('exp-001')).rejects.toMatchObject({ code: 'NETWORK' });
  });

  it('propage une erreur 500 sous forme ApiError SERVER', async () => {
    mockDelete.mockRejectedValueOnce({ response: { status: 500, data: {} } });
    await expect(expensesApi.delete('exp-001')).rejects.toMatchObject({ code: 'SERVER' });
  });
});
