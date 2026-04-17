/**
 * @jest-environment node
 *
 * Tests unitaires de reportsApi (programmation des rapports).
 *
 * Vérifie :
 *  - createSchedule : appel POST correct, retour ScheduledReport, propagation erreurs
 *  - getSchedules   : appel GET correct, normalisation tableau vide, propagation erreurs
 *  - deleteSchedule : appel DELETE correct, propagation erreurs
 *
 * L'API HTTP (apiClient) est entièrement mockée.
 * normalizeError n'est pas mocké : il est testé séparément (normalizeError.test.ts).
 */

// __DEV__ n'existe pas en environnement node — normalizeError le lit pour console.log
(globalThis as unknown as Record<string, unknown>).__DEV__ = false;

// ── Mock apiClient ────────────────────────────────────────────────────────────

jest.mock('../api/client', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
    get: jest.fn(),
    delete: jest.fn(),
    put: jest.fn(),
  },
}));

// ── Imports ───────────────────────────────────────────────────────────────────

import apiClient from '../api/client';
import { reportsApi } from '../api/reportsApi';
import type { ScheduledReport } from '../api/reportsApi';

const mockPost = apiClient.post as jest.Mock;
const mockGet = apiClient.get as jest.Mock;
const mockDelete = apiClient.delete as jest.Mock;

// ── Fixtures ──────────────────────────────────────────────────────────────────

const VALID_PAYLOAD: Omit<ScheduledReport, 'id' | 'createdAt' | 'nextRunAt'> = {
  reportModule: 'activity',
  reportSubId: 'trajets',
  reportTitle: 'Trajets détaillés',
  frequency: 'weekly',
  format: 'PDF',
  recipients: ['responsable@flotte.ci', 'dg@entreprise.ci'],
  active: true,
};

const STORED_SCHEDULE: ScheduledReport = {
  id: 'sched-abc-001',
  reportModule: 'activity',
  reportSubId: 'trajets',
  reportTitle: 'Trajets détaillés',
  frequency: 'weekly',
  format: 'PDF',
  recipients: ['responsable@flotte.ci', 'dg@entreprise.ci'],
  active: true,
  nextRunAt: '2026-04-17T06:00:00.000Z',
  createdAt: '2026-04-10T08:00:00.000Z',
};

// ── Réinitialise les mocks entre chaque test ──────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
});

// ═════════════════════════════════════════════════════════════════════════════
// reportsApi.createSchedule
// ═════════════════════════════════════════════════════════════════════════════

describe('reportsApi.createSchedule', () => {
  it('envoie un POST vers /reports/scheduled avec le payload complet', async () => {
    mockPost.mockResolvedValueOnce({ data: STORED_SCHEDULE });

    await reportsApi.createSchedule(VALID_PAYLOAD);

    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(mockPost).toHaveBeenCalledWith('/reports/scheduled', VALID_PAYLOAD);
  });

  it('retourne le ScheduledReport créé par le backend (avec id + nextRunAt)', async () => {
    mockPost.mockResolvedValueOnce({ data: STORED_SCHEDULE });

    const result = await reportsApi.createSchedule(VALID_PAYLOAD);

    expect(result.id).toBe('sched-abc-001');
    expect(result.nextRunAt).toBe('2026-04-17T06:00:00.000Z');
    expect(result.createdAt).toBe('2026-04-10T08:00:00.000Z');
    expect(result.recipients).toEqual(VALID_PAYLOAD.recipients);
  });

  it('accepte une programmation avec filtres optionnels', async () => {
    const payloadWithFilters = {
      ...VALID_PAYLOAD,
      filters: { vehicleIds: ['v-001', 'v-002'], client: 'TOTAL CI' },
    };
    mockPost.mockResolvedValueOnce({ data: { ...STORED_SCHEDULE, filters: payloadWithFilters.filters } });

    const result = await reportsApi.createSchedule(payloadWithFilters);

    expect(mockPost).toHaveBeenCalledWith('/reports/scheduled', payloadWithFilters);
    expect(result.filters).toEqual(payloadWithFilters.filters);
  });

  it('propage une erreur 500 backend sous forme TrackYuError de type SERVER', async () => {
    mockPost.mockRejectedValueOnce({
      response: { status: 500, data: { message: 'Internal Server Error' } },
    });

    await expect(reportsApi.createSchedule(VALID_PAYLOAD)).rejects.toMatchObject({
      code: 'SERVER',
    });
  });

  it('propage une erreur 401 backend sous forme TrackYuError de type AUTH', async () => {
    mockPost.mockRejectedValueOnce({
      response: { status: 401, data: { message: 'Unauthorized' } },
    });

    await expect(reportsApi.createSchedule(VALID_PAYLOAD)).rejects.toMatchObject({
      code: 'AUTH',
    });
  });

  it('propage une erreur réseau sous forme TrackYuError de type NETWORK', async () => {
    mockPost.mockRejectedValueOnce({
      request: {},
      message: 'Network Error',
    });

    await expect(reportsApi.createSchedule(VALID_PAYLOAD)).rejects.toMatchObject({
      code: 'NETWORK',
    });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// reportsApi.getSchedules
// ═════════════════════════════════════════════════════════════════════════════

describe('reportsApi.getSchedules', () => {
  it('envoie un GET vers /reports/scheduled', async () => {
    mockGet.mockResolvedValueOnce({ data: [] });

    await reportsApi.getSchedules();

    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(mockGet).toHaveBeenCalledWith('/reports/scheduled');
  });

  it('retourne la liste des programmations', async () => {
    const list: ScheduledReport[] = [STORED_SCHEDULE, { ...STORED_SCHEDULE, id: 'sched-002', reportSubId: 'synthese' }];
    mockGet.mockResolvedValueOnce({ data: list });

    const result = await reportsApi.getSchedules();

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('sched-abc-001');
    expect(result[1].id).toBe('sched-002');
  });

  it('retourne un tableau vide si le backend renvoie null', async () => {
    mockGet.mockResolvedValueOnce({ data: null });

    const result = await reportsApi.getSchedules();

    expect(result).toEqual([]);
  });

  it('retourne un tableau vide si le backend renvoie undefined', async () => {
    mockGet.mockResolvedValueOnce({ data: undefined });

    const result = await reportsApi.getSchedules();

    expect(result).toEqual([]);
  });

  it('retourne un tableau vide si le backend renvoie un objet non-tableau', async () => {
    mockGet.mockResolvedValueOnce({ data: { total: 0 } });

    const result = await reportsApi.getSchedules();

    expect(result).toEqual([]);
  });

  it('propage une erreur réseau', async () => {
    mockGet.mockRejectedValueOnce({ request: {}, message: 'Network Error' });

    await expect(reportsApi.getSchedules()).rejects.toMatchObject({ code: 'NETWORK' });
  });

  it('propage une erreur 403 Forbidden', async () => {
    mockGet.mockRejectedValueOnce({
      response: { status: 403, data: { message: 'Forbidden' } },
    });

    await expect(reportsApi.getSchedules()).rejects.toMatchObject({ code: 'AUTH' });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// reportsApi.deleteSchedule
// ═════════════════════════════════════════════════════════════════════════════

describe('reportsApi.deleteSchedule', () => {
  it('envoie un DELETE vers /reports/scheduled/:id', async () => {
    mockDelete.mockResolvedValueOnce({ data: {} });

    await reportsApi.deleteSchedule('sched-abc-001');

    expect(mockDelete).toHaveBeenCalledTimes(1);
    expect(mockDelete).toHaveBeenCalledWith('/reports/scheduled/sched-abc-001');
  });

  it('retourne void en cas de succès', async () => {
    mockDelete.mockResolvedValueOnce({ data: {} });

    const result = await reportsApi.deleteSchedule('sched-abc-001');

    expect(result).toBeUndefined();
  });

  it("construit l'URL correctement avec différents IDs", async () => {
    mockDelete.mockResolvedValue({ data: {} });

    await reportsApi.deleteSchedule('id-with-dashes-and-chars_123');
    expect(mockDelete).toHaveBeenCalledWith('/reports/scheduled/id-with-dashes-and-chars_123');
  });

  it("propage une erreur 404 si la programmation n'existe pas", async () => {
    mockDelete.mockRejectedValueOnce({
      response: { status: 404, data: { message: 'Not found' } },
    });

    await expect(reportsApi.deleteSchedule('sched-inexistant')).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('propage une erreur réseau', async () => {
    mockDelete.mockRejectedValueOnce({ request: {}, message: 'Network Error' });

    await expect(reportsApi.deleteSchedule('sched-abc-001')).rejects.toMatchObject({
      code: 'NETWORK',
    });
  });

  it('propage une erreur 500 backend', async () => {
    mockDelete.mockRejectedValueOnce({
      response: { status: 500, data: { message: 'Internal Server Error' } },
    });

    await expect(reportsApi.deleteSchedule('sched-abc-001')).rejects.toMatchObject({
      code: 'SERVER',
    });
  });
});
