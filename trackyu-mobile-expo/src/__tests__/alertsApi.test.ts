/**
 * @jest-environment node
 *
 * Tests unitaires de alertsApi.
 *
 * Vérifie :
 *  - getPage    : pagination (offset = (page-1)*limit), normalisation format backend
 *  - getAll     : GET avec limit=500, deux formats backend (raw.alerts vs tableau nu)
 *  - getUnreadCount : filtre isRead:false, comptage côté client, retourne 0 sur erreur
 *  - markAsRead     : PUT vers /alerts/:id/read
 *  - markAllAsRead  : PUT vers /alerts/read-all
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
import { alertsApi } from '../api/alerts';
import type { Alert, AlertsPage } from '../api/alerts';

const mockGet = apiClient.get as jest.Mock;
const mockPut = apiClient.put as jest.Mock;

// ── Fixtures ───────────────────────────────────────────────────────────────────

const ALERT_UNREAD: Alert = {
  id: 'alert-001',
  type: 'speed',
  severity: 'warning',
  title: 'Excès de vitesse',
  message: '120 km/h sur la RN3',
  vehicleId: 'v-001',
  vehicleName: 'Camion 01',
  vehiclePlate: 'CI-001-AB',
  isRead: false,
  createdAt: '2026-04-10T08:00:00.000Z',
};

const ALERT_READ: Alert = { ...ALERT_UNREAD, id: 'alert-002', isRead: true };

beforeEach(() => jest.clearAllMocks());

// ═══════════════════════════════════════════════════════════════════════════════
// alertsApi.getPage
// ═══════════════════════════════════════════════════════════════════════════════

describe('alertsApi.getPage', () => {
  it('envoie un GET vers /monitoring/alerts avec offset calculé depuis page', async () => {
    mockGet.mockResolvedValueOnce({ data: { alerts: [], total: 0 } });

    await alertsApi.getPage(2, 20);

    expect(mockGet).toHaveBeenCalledWith('/monitoring/alerts', { params: { limit: 20, offset: 20 } });
  });

  it('page 1 → offset 0', async () => {
    mockGet.mockResolvedValueOnce({ data: [] });
    await alertsApi.getPage(1, 10);
    expect(mockGet).toHaveBeenCalledWith('/monitoring/alerts', { params: { limit: 10, offset: 0 } });
  });

  it('normalise le format backend { alerts, total } correctement', async () => {
    mockGet.mockResolvedValueOnce({
      data: { alerts: [ALERT_UNREAD, ALERT_READ], total: 50 },
    });

    const result: AlertsPage = await alertsApi.getPage(1, 20);

    expect(result.data).toHaveLength(2);
    expect(result.total).toBe(50);
    expect(result.page).toBe(1);
    expect(result.hasMore).toBe(true); // 0 + 2 < 50
  });

  it('hasMore = false quand toutes les alertes sont chargées', async () => {
    mockGet.mockResolvedValueOnce({
      data: { alerts: [ALERT_UNREAD], total: 1 },
    });

    const result = await alertsApi.getPage(1, 20);
    expect(result.hasMore).toBe(false);
  });

  it('normalise le format tableau nu (fallback)', async () => {
    mockGet.mockResolvedValueOnce({ data: [ALERT_UNREAD, ALERT_READ] });

    const result = await alertsApi.getPage(1, 20);

    expect(result.data).toHaveLength(2);
    expect(result.total).toBe(2);
    expect(result.hasMore).toBe(false);
  });

  it('retourne une page vide si le backend retourne null', async () => {
    mockGet.mockResolvedValueOnce({ data: null });
    const result = await alertsApi.getPage(1, 20);
    expect(result.data).toEqual([]);
    expect(result.total).toBe(0);
  });

  it('propage une erreur réseau sous forme ApiError NETWORK', async () => {
    mockGet.mockRejectedValueOnce({ request: {}, message: 'Network Error' });
    await expect(alertsApi.getPage()).rejects.toMatchObject({ code: 'NETWORK' });
  });

  it('propage une erreur 401 sous forme ApiError AUTH', async () => {
    mockGet.mockRejectedValueOnce({ response: { status: 401, data: { message: 'Unauthorized' } } });
    await expect(alertsApi.getPage()).rejects.toMatchObject({ code: 'AUTH' });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// alertsApi.getAll
// ═══════════════════════════════════════════════════════════════════════════════

describe('alertsApi.getAll', () => {
  it('envoie un GET avec limit=500 et offset=0', async () => {
    mockGet.mockResolvedValueOnce({ data: [] });

    await alertsApi.getAll();

    expect(mockGet).toHaveBeenCalledWith('/monitoring/alerts', {
      params: { limit: 500, offset: 0 },
    });
  });

  it('retourne raw.alerts si présent', async () => {
    mockGet.mockResolvedValueOnce({ data: { alerts: [ALERT_UNREAD], total: 1 } });
    const result = await alertsApi.getAll();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('alert-001');
  });

  it('retourne le tableau nu si pas de raw.alerts', async () => {
    mockGet.mockResolvedValueOnce({ data: [ALERT_UNREAD, ALERT_READ] });
    const result = await alertsApi.getAll();
    expect(result).toHaveLength(2);
  });

  it('retourne [] si le backend retourne une structure inconnue', async () => {
    mockGet.mockResolvedValueOnce({ data: { total: 0 } });
    const result = await alertsApi.getAll();
    expect(result).toEqual([]);
  });

  it('propage une erreur 500 sous forme ApiError SERVER', async () => {
    mockGet.mockRejectedValueOnce({ response: { status: 500, data: { message: 'Internal Server Error' } } });
    await expect(alertsApi.getAll()).rejects.toMatchObject({ code: 'SERVER' });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// alertsApi.getUnreadCount
// ═══════════════════════════════════════════════════════════════════════════════

describe('alertsApi.getUnreadCount', () => {
  it('envoie un GET avec isRead:false, limit:500, offset:0', async () => {
    mockGet.mockResolvedValueOnce({ data: [] });

    await alertsApi.getUnreadCount();

    expect(mockGet).toHaveBeenCalledWith('/monitoring/alerts', {
      params: { isRead: false, limit: 500, offset: 0 },
    });
  });

  it('compte les alertes non lues côté client', async () => {
    mockGet.mockResolvedValueOnce({ data: { alerts: [ALERT_UNREAD, ALERT_UNREAD, ALERT_READ] } });
    const count = await alertsApi.getUnreadCount();
    expect(count).toBe(2);
  });

  it('retourne 0 si toutes les alertes sont lues', async () => {
    mockGet.mockResolvedValueOnce({ data: { alerts: [ALERT_READ] } });
    const count = await alertsApi.getUnreadCount();
    expect(count).toBe(0);
  });

  it('retourne 0 sur erreur réseau (résilient)', async () => {
    mockGet.mockRejectedValueOnce(new Error('Network Error'));
    const count = await alertsApi.getUnreadCount();
    expect(count).toBe(0);
  });

  it('retourne 0 sur erreur 500 (résilient)', async () => {
    mockGet.mockRejectedValueOnce({ response: { status: 500 } });
    const count = await alertsApi.getUnreadCount();
    expect(count).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// alertsApi.markAsRead
// ═══════════════════════════════════════════════════════════════════════════════

describe('alertsApi.markAsRead', () => {
  it('envoie un PUT vers /monitoring/alerts/:id/read', async () => {
    mockPut.mockResolvedValueOnce({ data: {} });

    await alertsApi.markAsRead('alert-001');

    expect(mockPut).toHaveBeenCalledTimes(1);
    expect(mockPut).toHaveBeenCalledWith('/monitoring/alerts/alert-001/read');
  });

  it('retourne void en cas de succès', async () => {
    mockPut.mockResolvedValueOnce({ data: {} });
    const result = await alertsApi.markAsRead('alert-001');
    expect(result).toBeUndefined();
  });

  it('propage une erreur réseau sous forme ApiError NETWORK', async () => {
    mockPut.mockRejectedValueOnce({ request: {}, message: 'Network Error' });
    await expect(alertsApi.markAsRead('alert-001')).rejects.toMatchObject({ code: 'NETWORK' });
  });

  it('propage une erreur 404 sous forme ApiError NOT_FOUND', async () => {
    mockPut.mockRejectedValueOnce({ response: { status: 404, data: { message: 'Not found' } } });
    await expect(alertsApi.markAsRead('alert-inexistant')).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// alertsApi.markAllAsRead
// ═══════════════════════════════════════════════════════════════════════════════

describe('alertsApi.markAllAsRead', () => {
  it('envoie un PUT vers /monitoring/alerts/read-all', async () => {
    mockPut.mockResolvedValueOnce({ data: {} });

    await alertsApi.markAllAsRead();

    expect(mockPut).toHaveBeenCalledTimes(1);
    expect(mockPut).toHaveBeenCalledWith('/monitoring/alerts/read-all');
  });

  it('retourne void en cas de succès', async () => {
    mockPut.mockResolvedValueOnce({ data: {} });
    const result = await alertsApi.markAllAsRead();
    expect(result).toBeUndefined();
  });

  it('propage une erreur 401 sous forme ApiError AUTH', async () => {
    mockPut.mockRejectedValueOnce({ response: { status: 401, data: {} } });
    await expect(alertsApi.markAllAsRead()).rejects.toMatchObject({ code: 'AUTH' });
  });
});
