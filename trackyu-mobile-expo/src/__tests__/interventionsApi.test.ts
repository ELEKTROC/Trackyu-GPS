/**
 * @jest-environment node
 *
 * Tests unitaires de interventionsApi.
 *
 * Vérifie :
 *  - getPage       : pagination, normalisation des deux formats de réponse
 *  - getAll        : tableau plat, filtre technicienId
 *  - getById       : chemin + retour
 *  - getStats      : chemin + retour
 *  - update        : PUT avec données partielles
 *  - updateStatus  : délègue à update, injecte timestamps selon le statut
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
import interventionsApi from '../api/interventions';
import type { Intervention, InterventionStats } from '../api/interventions';

const mockGet = apiClient.get as jest.Mock;
const mockPut = apiClient.put as jest.Mock;

// ── Fixtures ───────────────────────────────────────────────────────────────────

const INTERVENTION: Intervention = {
  id: 'int-001',
  tenantId: 'tenant-01',
  clientId: 'c-001',
  clientName: 'TOTAL CI',
  technicianId: 'tech-01',
  type: 'INSTALLATION',
  nature: 'Installation',
  status: 'SCHEDULED',
  scheduledDate: '2026-04-15T08:00:00.000Z',
  duration: 0,
  location: 'Abidjan, Plateau',
  createdAt: '2026-04-10T08:00:00.000Z',
};

const STATS: InterventionStats = {
  byStatus: [
    { status: 'COMPLETED', count: '42' },
    { status: 'PENDING', count: '8' },
  ],
  byTechnician: [{ id: 'tech-01', name: 'Diallo Ibrahim', total_interventions: '20', completed: '18' }],
};

beforeEach(() => jest.clearAllMocks());

// ═══════════════════════════════════════════════════════════════════════════════
// interventionsApi.getPage
// ═══════════════════════════════════════════════════════════════════════════════

describe('interventionsApi.getPage', () => {
  it('envoie un GET vers /tech/interventions avec les paramètres par défaut', async () => {
    mockGet.mockResolvedValueOnce({ data: [] });
    await interventionsApi.getPage();
    expect(mockGet).toHaveBeenCalledWith('/tech/interventions', {
      params: { technicianId: undefined, page: 1, limit: 20 },
    });
  });

  it('inclut le technicianId si fourni', async () => {
    mockGet.mockResolvedValueOnce({ data: [] });
    await interventionsApi.getPage({ technicianId: 'tech-01', page: 2, limit: 10 });
    expect(mockGet).toHaveBeenCalledWith('/tech/interventions', {
      params: { technicianId: 'tech-01', page: 2, limit: 10 },
    });
  });

  it('normalise le format paginé { data, total, page, hasMore }', async () => {
    mockGet.mockResolvedValueOnce({
      data: { data: [INTERVENTION], total: 42, page: 1, hasMore: true },
    });
    const result = await interventionsApi.getPage();
    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(42);
    expect(result.hasMore).toBe(true);
  });

  it('normalise le format tableau nu (fallback)', async () => {
    mockGet.mockResolvedValueOnce({ data: [INTERVENTION] });
    const result = await interventionsApi.getPage();
    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.hasMore).toBe(false);
  });

  it('propage une erreur réseau sous forme ApiError NETWORK', async () => {
    mockGet.mockRejectedValueOnce({ request: {}, message: 'Network Error' });
    await expect(interventionsApi.getPage()).rejects.toMatchObject({ code: 'NETWORK' });
  });

  it('propage une erreur 401 sous forme ApiError AUTH', async () => {
    mockGet.mockRejectedValueOnce({ response: { status: 401, data: {} } });
    await expect(interventionsApi.getPage()).rejects.toMatchObject({ code: 'AUTH' });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// interventionsApi.getAll
// ═══════════════════════════════════════════════════════════════════════════════

describe('interventionsApi.getAll', () => {
  it('envoie un GET vers /tech/interventions sans filtre', async () => {
    mockGet.mockResolvedValueOnce({ data: [] });
    await interventionsApi.getAll();
    expect(mockGet).toHaveBeenCalledWith('/tech/interventions');
  });

  it('ajoute le paramètre technicianId en query string si fourni', async () => {
    mockGet.mockResolvedValueOnce({ data: [INTERVENTION] });
    await interventionsApi.getAll({ technicianId: 'tech-01' });
    expect(mockGet).toHaveBeenCalledWith('/tech/interventions?technicianId=tech-01');
  });

  it('retourne [] si le backend retourne null', async () => {
    mockGet.mockResolvedValueOnce({ data: null });
    const result = await interventionsApi.getAll();
    expect(result).toEqual([]);
  });

  it('retourne la liste des interventions', async () => {
    mockGet.mockResolvedValueOnce({ data: [INTERVENTION] });
    const result = await interventionsApi.getAll();
    expect(result).toHaveLength(1);
    expect(result[0].nature).toBe('Installation');
  });

  it('propage une erreur 500 sous forme ApiError SERVER', async () => {
    mockGet.mockRejectedValueOnce({ response: { status: 500, data: { message: 'Internal Server Error' } } });
    await expect(interventionsApi.getAll()).rejects.toMatchObject({ code: 'SERVER' });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// interventionsApi.getById
// ═══════════════════════════════════════════════════════════════════════════════

describe('interventionsApi.getById', () => {
  it('envoie un GET vers /tech/interventions/:id', async () => {
    mockGet.mockResolvedValueOnce({ data: INTERVENTION });
    await interventionsApi.getById('int-001');
    expect(mockGet).toHaveBeenCalledWith('/tech/interventions/int-001');
  });

  it("retourne l'intervention", async () => {
    mockGet.mockResolvedValueOnce({ data: INTERVENTION });
    const result = await interventionsApi.getById('int-001');
    expect(result.type).toBe('INSTALLATION');
  });

  it('propage une erreur 404 sous forme ApiError NOT_FOUND', async () => {
    mockGet.mockRejectedValueOnce({ response: { status: 404, data: { message: 'Not found' } } });
    await expect(interventionsApi.getById('id-inexistant')).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// interventionsApi.getStats
// ═══════════════════════════════════════════════════════════════════════════════

describe('interventionsApi.getStats', () => {
  it('envoie un GET vers /tech/interventions/stats', async () => {
    mockGet.mockResolvedValueOnce({ data: STATS });
    await interventionsApi.getStats();
    expect(mockGet).toHaveBeenCalledWith('/tech/interventions/stats');
  });

  it('retourne les statistiques', async () => {
    mockGet.mockResolvedValueOnce({ data: STATS });
    const result = await interventionsApi.getStats();
    expect(result.byStatus).toHaveLength(2);
    expect(result.byTechnician?.[0].name).toBe('Diallo Ibrahim');
  });

  it('propage une erreur réseau', async () => {
    mockGet.mockRejectedValueOnce({ request: {}, message: 'Network Error' });
    await expect(interventionsApi.getStats()).rejects.toMatchObject({ code: 'NETWORK' });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// interventionsApi.update
// ═══════════════════════════════════════════════════════════════════════════════

describe('interventionsApi.update', () => {
  it('envoie un PUT vers /tech/interventions/:id avec les données partielles', async () => {
    mockPut.mockResolvedValueOnce({ data: { ...INTERVENTION, status: 'COMPLETED', duration: 90 } });
    await interventionsApi.update('int-001', { status: 'COMPLETED', duration: 90 });
    expect(mockPut).toHaveBeenCalledWith('/tech/interventions/int-001', {
      status: 'COMPLETED',
      duration: 90,
    });
  });

  it("retourne l'intervention mise à jour", async () => {
    const updated = { ...INTERVENTION, status: 'IN_PROGRESS' as const };
    mockPut.mockResolvedValueOnce({ data: updated });
    const result = await interventionsApi.update('int-001', { status: 'IN_PROGRESS' });
    expect(result.status).toBe('IN_PROGRESS');
  });

  it('propage une erreur réseau', async () => {
    mockPut.mockRejectedValueOnce({ request: {}, message: 'Network Error' });
    await expect(interventionsApi.update('int-001', { status: 'CANCELLED' })).rejects.toMatchObject({
      code: 'NETWORK',
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// interventionsApi.updateStatus
// ═══════════════════════════════════════════════════════════════════════════════

describe('interventionsApi.updateStatus', () => {
  it('délègue à update avec le statut', async () => {
    mockPut.mockResolvedValueOnce({ data: { ...INTERVENTION, status: 'COMPLETED' } });
    await interventionsApi.updateStatus('int-001', 'COMPLETED');
    expect(mockPut).toHaveBeenCalledWith(
      '/tech/interventions/int-001',
      expect.objectContaining({ status: 'COMPLETED' })
    );
  });

  it('injecte enRouteTime si statut = EN_ROUTE', async () => {
    mockPut.mockResolvedValueOnce({ data: { ...INTERVENTION, status: 'EN_ROUTE' } });
    await interventionsApi.updateStatus('int-001', 'EN_ROUTE');
    const payload = mockPut.mock.calls[0][1] as any;
    expect(payload.enRouteTime).toBeDefined();
    expect(new Date(payload.enRouteTime).getFullYear()).toBe(new Date().getFullYear());
  });

  it('injecte startTime si statut = IN_PROGRESS', async () => {
    mockPut.mockResolvedValueOnce({ data: { ...INTERVENTION, status: 'IN_PROGRESS' } });
    await interventionsApi.updateStatus('int-001', 'IN_PROGRESS');
    const payload = mockPut.mock.calls[0][1] as any;
    expect(payload.startTime).toBeDefined();
  });

  it('injecte endTime si statut = COMPLETED', async () => {
    mockPut.mockResolvedValueOnce({ data: { ...INTERVENTION, status: 'COMPLETED' } });
    await interventionsApi.updateStatus('int-001', 'COMPLETED');
    const payload = mockPut.mock.calls[0][1] as any;
    expect(payload.endTime).toBeDefined();
  });

  it("n'injecte aucun timestamp pour CANCELLED ou POSTPONED", async () => {
    mockPut.mockResolvedValueOnce({ data: { ...INTERVENTION, status: 'CANCELLED' } });
    await interventionsApi.updateStatus('int-001', 'CANCELLED');
    const payload = mockPut.mock.calls[0][1] as any;
    expect(payload.startTime).toBeUndefined();
    expect(payload.endTime).toBeUndefined();
    expect(payload.enRouteTime).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// countByStatus (helper)
// ═══════════════════════════════════════════════════════════════════════════════

describe('countByStatus (helper)', () => {
  const { countByStatus } = require('../api/interventions');

  it('retourne le count pour un statut donné', () => {
    expect(countByStatus(STATS, 'COMPLETED')).toBe(42);
  });

  it('additionne plusieurs statuts', () => {
    expect(countByStatus(STATS, 'COMPLETED', 'PENDING')).toBe(50);
  });

  it('retourne 0 si stats est undefined', () => {
    expect(countByStatus(undefined, 'COMPLETED')).toBe(0);
  });

  it("retourne 0 si le statut n'est pas dans la liste", () => {
    expect(countByStatus(STATS, 'IN_PROGRESS')).toBe(0);
  });
});
