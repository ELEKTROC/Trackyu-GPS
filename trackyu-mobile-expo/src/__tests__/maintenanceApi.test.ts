/**
 * @jest-environment node
 *
 * Tests unitaires de maintenanceApi.
 *
 * Vérifie :
 *  - getAll   : GET /maintenance-rules, normalisation null → []
 *  - create   : POST /maintenance-rules avec payload
 *  - update   : PUT /maintenance-rules/:id avec données partielles
 *  - delete   : DELETE /maintenance-rules/:id, retourne void
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
import { maintenanceApi } from '../api/maintenanceApi';
import type { MaintenanceRule, CreateMaintenanceRuleRequest } from '../api/maintenanceApi';

const mockGet = apiClient.get as jest.Mock;
const mockPost = apiClient.post as jest.Mock;
const mockPut = apiClient.put as jest.Mock;
const mockDelete = apiClient.delete as jest.Mock;

// ── Fixtures ───────────────────────────────────────────────────────────────────

const RULE: MaintenanceRule = {
  id: 'mr-001',
  nom: 'Vidange 5 000 km',
  category: 'Maintenance Mécanique',
  type: 'Kilométrage',
  intervalle: 5000,
  unit: 'km',
  reminderValue: 500,
  reminderUnit: 'km',
  isRecurring: true,
  vehicleIds: ['v-001', 'v-002'],
  notifyEmail: true,
  notifySms: false,
  notifyPush: true,
  statut: 'Actif',
  tenantId: 'tenant-01',
};

const PAYLOAD: CreateMaintenanceRuleRequest = {
  nom: 'Contrôle technique annuel',
  category: 'Visite technique',
  type: 'Date',
  isRecurring: true,
  notifyEmail: true,
  notifySms: false,
  notifyPush: false,
  statut: 'Actif',
};

beforeEach(() => jest.clearAllMocks());

// ═══════════════════════════════════════════════════════════════════════════════
// maintenanceApi.getAll
// ═══════════════════════════════════════════════════════════════════════════════

describe('maintenanceApi.getAll', () => {
  it('envoie un GET vers /maintenance-rules', async () => {
    mockGet.mockResolvedValueOnce({ data: [] });
    await maintenanceApi.getAll();
    expect(mockGet).toHaveBeenCalledWith('/maintenance-rules');
  });

  it('retourne la liste des règles', async () => {
    mockGet.mockResolvedValueOnce({ data: [RULE] });
    const result = await maintenanceApi.getAll();
    expect(result).toHaveLength(1);
    expect(result[0].nom).toBe('Vidange 5 000 km');
    expect(result[0].type).toBe('Kilométrage');
  });

  it('retourne [] si le backend retourne null', async () => {
    mockGet.mockResolvedValueOnce({ data: null });
    const result = await maintenanceApi.getAll();
    expect(result).toEqual([]);
  });

  it('retourne [] si le backend retourne un objet non-tableau', async () => {
    mockGet.mockResolvedValueOnce({ data: { total: 0 } });
    const result = await maintenanceApi.getAll();
    expect(result).toEqual([]);
  });

  it('retourne la liste complète avec plusieurs règles', async () => {
    const rules: MaintenanceRule[] = [
      RULE,
      { ...RULE, id: 'mr-002', nom: 'Assurance annuelle', category: 'Assurance', type: 'Date' },
      { ...RULE, id: 'mr-003', nom: 'Patente', category: 'Patente', type: 'Date' },
    ];
    mockGet.mockResolvedValueOnce({ data: rules });
    const result = await maintenanceApi.getAll();
    expect(result).toHaveLength(3);
    expect(result.map((r) => r.category)).toEqual(['Maintenance Mécanique', 'Assurance', 'Patente']);
  });

  it('propage une erreur réseau sous forme ApiError NETWORK', async () => {
    mockGet.mockRejectedValueOnce({ request: {}, message: 'Network Error' });
    await expect(maintenanceApi.getAll()).rejects.toMatchObject({ code: 'NETWORK' });
  });

  it('propage une erreur 401 sous forme ApiError AUTH', async () => {
    mockGet.mockRejectedValueOnce({ response: { status: 401, data: {} } });
    await expect(maintenanceApi.getAll()).rejects.toMatchObject({ code: 'AUTH' });
  });

  it('propage une erreur 403 sous forme ApiError AUTH', async () => {
    mockGet.mockRejectedValueOnce({ response: { status: 403, data: {} } });
    await expect(maintenanceApi.getAll()).rejects.toMatchObject({ code: 'AUTH' });
  });

  it('propage une erreur 500 sous forme ApiError SERVER', async () => {
    mockGet.mockRejectedValueOnce({ response: { status: 500, data: { message: 'Internal Server Error' } } });
    await expect(maintenanceApi.getAll()).rejects.toMatchObject({ code: 'SERVER' });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// maintenanceApi.create
// ═══════════════════════════════════════════════════════════════════════════════

describe('maintenanceApi.create', () => {
  it('envoie un POST vers /maintenance-rules avec le payload', async () => {
    mockPost.mockResolvedValueOnce({ data: { ...RULE, ...PAYLOAD, id: 'mr-new' } });
    await maintenanceApi.create(PAYLOAD);
    expect(mockPost).toHaveBeenCalledWith('/maintenance-rules', PAYLOAD);
  });

  it('retourne la règle créée', async () => {
    const newRule = { ...RULE, id: 'mr-new', nom: PAYLOAD.nom };
    mockPost.mockResolvedValueOnce({ data: newRule });
    const result = await maintenanceApi.create(PAYLOAD);
    expect(result.id).toBe('mr-new');
    expect(result.nom).toBe('Contrôle technique annuel');
  });

  it('propage une erreur réseau sous forme ApiError NETWORK', async () => {
    mockPost.mockRejectedValueOnce({ request: {}, message: 'Network Error' });
    await expect(maintenanceApi.create(PAYLOAD)).rejects.toMatchObject({ code: 'NETWORK' });
  });

  it('propage une erreur 422 sous forme ApiError UNKNOWN', async () => {
    mockPost.mockRejectedValueOnce({ response: { status: 422, data: { message: 'Validation Error' } } });
    await expect(maintenanceApi.create(PAYLOAD)).rejects.toMatchObject({ code: 'UNKNOWN' });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// maintenanceApi.update
// ═══════════════════════════════════════════════════════════════════════════════

describe('maintenanceApi.update', () => {
  it('envoie un PUT vers /maintenance-rules/:id avec les données partielles', async () => {
    mockPut.mockResolvedValueOnce({ data: { ...RULE, statut: 'Inactif' } });
    await maintenanceApi.update('mr-001', { statut: 'Inactif' });
    expect(mockPut).toHaveBeenCalledWith('/maintenance-rules/mr-001', { statut: 'Inactif' });
  });

  it('retourne la règle mise à jour', async () => {
    const updated = { ...RULE, intervalle: 10000, reminderValue: 1000 };
    mockPut.mockResolvedValueOnce({ data: updated });
    const result = await maintenanceApi.update('mr-001', { intervalle: 10000 });
    expect(result.intervalle).toBe(10000);
    expect(result.id).toBe('mr-001');
  });

  it('propage une erreur réseau sous forme ApiError NETWORK', async () => {
    mockPut.mockRejectedValueOnce({ request: {}, message: 'Network Error' });
    await expect(maintenanceApi.update('mr-001', { statut: 'Inactif' })).rejects.toMatchObject({ code: 'NETWORK' });
  });

  it('propage une erreur 404 sous forme ApiError NOT_FOUND', async () => {
    mockPut.mockRejectedValueOnce({ response: { status: 404, data: { message: 'Not found' } } });
    await expect(maintenanceApi.update('mr-inexistant', {})).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// maintenanceApi.delete
// ═══════════════════════════════════════════════════════════════════════════════

describe('maintenanceApi.delete', () => {
  it('envoie un DELETE vers /maintenance-rules/:id', async () => {
    mockDelete.mockResolvedValueOnce({ data: {} });
    await maintenanceApi.delete('mr-001');
    expect(mockDelete).toHaveBeenCalledWith('/maintenance-rules/mr-001');
  });

  it('retourne void en cas de succès', async () => {
    mockDelete.mockResolvedValueOnce({ data: {} });
    const result = await maintenanceApi.delete('mr-001');
    expect(result).toBeUndefined();
  });

  it('propage une erreur 404 sous forme ApiError NOT_FOUND', async () => {
    mockDelete.mockRejectedValueOnce({ response: { status: 404, data: { message: 'Not found' } } });
    await expect(maintenanceApi.delete('mr-inexistant')).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('propage une erreur réseau sous forme ApiError NETWORK', async () => {
    mockDelete.mockRejectedValueOnce({ request: {}, message: 'Network Error' });
    await expect(maintenanceApi.delete('mr-001')).rejects.toMatchObject({ code: 'NETWORK' });
  });
});
