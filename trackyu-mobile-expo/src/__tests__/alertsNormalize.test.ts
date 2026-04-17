/**
 * @jest-environment node
 *
 * Tests unitaires — src/api/alerts.ts
 * Couverture : normalizeAlert (via alertsApi.getAll), inferTypeFromMessage,
 *              parseImmobilizationStatus, TYPE_MAP, SEVERITY_MAP, setAlertLocale
 */

jest.mock('../api/client', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    put: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
  },
}));

import apiClient from '../api/client';
import { alertsApi, setAlertLocale } from '../api/alerts';
import type { Alert } from '../api/alerts';

const mockGet = apiClient.get as jest.MockedFunction<typeof apiClient.get>;

// Helper : simuler une réponse { alerts: [...] }
function mockAlerts(rawAlerts: Record<string, unknown>[]) {
  mockGet.mockResolvedValueOnce({
    data: { alerts: rawAlerts, total: rawAlerts.length },
  } as never);
}

beforeEach(() => {
  jest.clearAllMocks();
  setAlertLocale('fr'); // locale fr par défaut
});

// ── TYPE_MAP ────────────────────────────────────────────────────────────────────

describe('normalizeAlert — TYPE_MAP (types DB → types mobile)', () => {
  const cases: [string, Alert['type']][] = [
    ['EXCESSIVE_IDLING', 'idle'],
    ['IDLE', 'idle'],
    ['SPEEDING', 'speed'],
    ['SPEED', 'speed'],
    ['OVER_SPEED', 'speed'],
    ['GEOFENCE', 'geofence'],
    ['GEOFENCE_ENTER', 'geofence'],
    ['GEOFENCE_EXIT', 'geofence'],
    ['FUEL_THEFT', 'fuel'],
    ['FUEL_LOSS', 'fuel'],
    ['FUEL', 'fuel'],
    ['MAINTENANCE', 'maintenance'],
    ['SOS', 'sos'],
    ['PANIC', 'sos'],
    ['TAMPER', 'sos'],
    ['BATTERY_LOW', 'battery'],
    ['BATTERY', 'battery'],
    ['OFFLINE', 'offline'],
    ['DISCONNECT', 'offline'],
    ['IMMOBILIZATION', 'immobilization'],
  ];

  it.each(cases)('DB type %s → mobile type %s', async (dbType, expected) => {
    mockAlerts([
      {
        id: '1',
        type: dbType,
        severity: 'MEDIUM',
        message: 'test',
        vehicle_id: 'v1',
        vehicle_name: 'VH-001',
        vehicle_plate: 'CI-0001-A',
        is_read: false,
        created_at: new Date().toISOString(),
      },
    ]);
    const alerts = await alertsApi.getAll();
    expect(alerts[0].type).toBe(expected);
  });
});

// ── SEVERITY_MAP ────────────────────────────────────────────────────────────────

describe('normalizeAlert — SEVERITY_MAP', () => {
  const cases: [string, Alert['severity']][] = [
    ['CRITICAL', 'critical'],
    ['HIGH', 'critical'],
    ['MEDIUM', 'warning'],
    ['WARNING', 'warning'],
    ['LOW', 'info'],
    ['INFO', 'info'],
    ['NORMAL', 'info'],
    ['UNKNOWN', 'info'], // fallback
  ];

  it.each(cases)('DB severity %s → mobile severity %s', async (dbSeverity, expected) => {
    mockAlerts([
      {
        id: '1',
        type: 'SPEED',
        severity: dbSeverity,
        message: 'test',
        vehicle_id: 'v1',
        vehicle_name: 'VH',
        vehicle_plate: 'CI-0001-A',
        is_read: false,
        created_at: new Date().toISOString(),
      },
    ]);
    const alerts = await alertsApi.getAll();
    expect(alerts[0].severity).toBe(expected);
  });
});

// ── inferTypeFromMessage ────────────────────────────────────────────────────────

describe('normalizeAlert — inferTypeFromMessage (via RULE_VIOLATION)', () => {
  async function alertWithMsg(msg: string): Promise<Alert> {
    mockAlerts([
      {
        id: '1',
        type: 'RULE_VIOLATION',
        severity: 'MEDIUM',
        message: msg,
        vehicle_id: 'v1',
        vehicle_name: 'VH',
        vehicle_plate: 'CI-0001-A',
        is_read: false,
        created_at: new Date().toISOString(),
      },
    ]);
    const alerts = await alertsApi.getAll();
    return alerts[0];
  }

  it('infers idle from "ralenti"', async () =>
    expect((await alertWithMsg('Alerte ralenti excessif')).type).toBe('idle'));
  it('infers idle from "idling"', async () =>
    expect((await alertWithMsg('Excessive idling detected')).type).toBe('idle'));
  it('infers immobilization from relay', async () =>
    expect((await alertWithMsg('relay command sent')).type).toBe('immobilization'));
  it('infers speed from km/h', async () => expect((await alertWithMsg('Vitesse: 120 km/h')).type).toBe('speed'));
  it('infers fuel from carburant', async () =>
    expect((await alertWithMsg('Perte de carburant détectée')).type).toBe('fuel'));
  it('infers geofence from zone', async () => expect((await alertWithMsg('Zone franchie')).type).toBe('geofence'));
  it('infers maintenance from entretien', async () =>
    expect((await alertWithMsg('Entretien requis')).type).toBe('maintenance'));
  it('infers sos from urgence', async () => expect((await alertWithMsg('Urgence signalée')).type).toBe('sos'));
  it('infers battery from battery', async () => expect((await alertWithMsg('Low battery level')).type).toBe('battery'));
  it('infers offline from hors ligne', async () =>
    expect((await alertWithMsg('Véhicule hors ligne')).type).toBe('offline'));
  it('defaults to idle for unknown msg', async () =>
    expect((await alertWithMsg('Alerte générique')).type).toBe('idle'));
});

// ── parseImmobilizationStatus ───────────────────────────────────────────────────

describe('normalizeAlert — parseImmobilizationStatus (via immobilization type)', () => {
  async function immoAlert(msg: string): Promise<Alert> {
    mockAlerts([
      {
        id: '1',
        type: 'IMMOBILIZATION',
        severity: 'CRITICAL',
        message: msg,
        title: null, // forcer la génération du titre
        vehicle_id: 'v1',
        vehicle_name: 'VH',
        vehicle_plate: 'AB-123-CD',
        is_read: false,
        created_at: new Date().toISOString(),
      },
    ]);
    const alerts = await alertsApi.getAll();
    return alerts[0];
  }

  it('titre contient "En attente" si message hors ligne (fr)', async () => {
    const a = await immoAlert('Véhicule hors ligne');
    expect(a.title).toMatch(/En attente/);
  });

  it('titre contient "Envoyé" si commande envoyée (fr)', async () => {
    const a = await immoAlert('Commande envoyée au boîtier');
    expect(a.title).toMatch(/Envoy/);
  });

  it('titre contient "Succès" si succès (fr)', async () => {
    const a = await immoAlert('Immobilisation succès confirmée');
    expect(a.title).toMatch(/Succ/);
  });

  it('titre contient "Échec" si échec (fr)', async () => {
    const a = await immoAlert('Immobilisation échec timeout');
    expect(a.title).toMatch(/chec/);
  });

  it('titre contient "Débloqué" si released (fr)', async () => {
    const a = await immoAlert('Véhicule released débloqué');
    expect(a.title).toMatch(/bloqu/);
  });
});

// ── i18n setAlertLocale ─────────────────────────────────────────────────────────

describe('setAlertLocale — labels traduits dans le titre', () => {
  async function speedAlert(locale: string): Promise<Alert> {
    setAlertLocale(locale);
    mockAlerts([
      {
        id: '1',
        type: 'SPEEDING',
        severity: 'HIGH',
        message: 'Vitesse excessive 90km/h',
        title: null,
        vehicle_id: 'v1',
        vehicle_name: 'VH',
        vehicle_plate: 'CI-001-A',
        is_read: false,
        created_at: new Date().toISOString(),
      },
    ]);
    const alerts = await alertsApi.getAll();
    return alerts[0];
  }

  it('titre en français par défaut', async () => {
    const a = await speedAlert('fr');
    expect(a.title).toMatch(/vitesse/i);
  });

  it('titre en anglais après setAlertLocale("en")', async () => {
    const a = await speedAlert('en');
    expect(a.title).toMatch(/speed/i);
  });

  it('locale en-US normalisée en "en"', async () => {
    const a = await speedAlert('en-US');
    expect(a.title).toMatch(/speed/i);
  });
});

// ── Champs snake_case → camelCase ──────────────────────────────────────────────

describe('normalizeAlert — mapping champs', () => {
  it('mappe snake_case vers camelCase', async () => {
    mockAlerts([
      {
        id: 'alert-1',
        type: 'SPEED',
        severity: 'HIGH',
        title: 'Alerte vitesse',
        message: 'Vitesse 120 km/h',
        vehicle_id: 'v-42',
        vehicle_name: 'Camion Béton',
        vehicle_plate: 'AB-1234-C',
        is_read: true,
        created_at: '2026-04-16T10:00:00.000Z',
        push_sent: true,
        email_sent: false,
        sms_sent: true,
        latitude: 5.36,
        longitude: -4.0,
        custom_message: 'Message op',
      },
    ]);
    const [a] = await alertsApi.getAll();
    expect(a.id).toBe('alert-1');
    expect(a.type).toBe('speed');
    expect(a.severity).toBe('critical');
    expect(a.title).toBe('Alerte vitesse');
    expect(a.message).toBe('Vitesse 120 km/h');
    expect(a.vehicleId).toBe('v-42');
    expect(a.vehicleName).toBe('Camion Béton');
    expect(a.vehiclePlate).toBe('AB-1234-C');
    expect(a.isRead).toBe(true);
    expect(a.createdAt).toBe('2026-04-16T10:00:00.000Z');
    expect(a.pushSent).toBe(true);
    expect(a.emailSent).toBe(false);
    expect(a.smsSent).toBe(true);
    expect(a.latitude).toBeCloseTo(5.36);
    expect(a.longitude).toBeCloseTo(-4.0);
    expect(a.customMessage).toBe('Message op');
  });

  it('latitude/longitude absent → undefined', async () => {
    mockAlerts([
      {
        id: '2',
        type: 'IDLE',
        severity: 'LOW',
        message: 'test',
        vehicle_id: 'v1',
        vehicle_name: 'VH',
        vehicle_plate: 'X',
        is_read: false,
        created_at: new Date().toISOString(),
      },
    ]);
    const [a] = await alertsApi.getAll();
    expect(a.latitude).toBeUndefined();
    expect(a.longitude).toBeUndefined();
  });

  it('custom_message absent → customMessage undefined', async () => {
    mockAlerts([
      {
        id: '3',
        type: 'SOS',
        severity: 'CRITICAL',
        message: 'SOS',
        vehicle_id: 'v1',
        vehicle_name: 'VH',
        vehicle_plate: 'X',
        is_read: false,
        created_at: new Date().toISOString(),
      },
    ]);
    const [a] = await alertsApi.getAll();
    expect(a.customMessage).toBeUndefined();
  });
});

// ── Idle title generation ───────────────────────────────────────────────────────

describe('normalizeAlert — génération titre idle avec durée', () => {
  it('extrait la durée du message idle', async () => {
    setAlertLocale('fr');
    mockAlerts([
      {
        id: '1',
        type: 'EXCESSIVE_IDLING',
        severity: 'MEDIUM',
        message: 'Ralenti excessif > 30 min',
        title: null,
        vehicle_id: 'v1',
        vehicle_name: 'VH',
        vehicle_plate: 'CI-001-A',
        is_read: false,
        created_at: new Date().toISOString(),
      },
    ]);
    const [a] = await alertsApi.getAll();
    expect(a.title).toMatch(/30 min/);
  });

  it('titre sans durée si message non parseable', async () => {
    mockAlerts([
      {
        id: '2',
        type: 'IDLE',
        severity: 'LOW',
        message: 'Ralenti signalé',
        title: null,
        vehicle_id: 'v1',
        vehicle_name: 'VH',
        vehicle_plate: 'CI-001-A',
        is_read: false,
        created_at: new Date().toISOString(),
      },
    ]);
    const [a] = await alertsApi.getAll();
    expect(a.title).not.toBe('—');
    expect(a.title.length).toBeLessThanOrEqual(80);
  });
});

// ── alertsApi.getPage pagination ───────────────────────────────────────────────

describe('alertsApi.getPage', () => {
  it('calcule hasMore correctement', async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        alerts: Array(20)
          .fill(null)
          .map((_, i) => ({
            id: String(i),
            type: 'SPEED',
            severity: 'MEDIUM',
            message: 'test',
            vehicle_id: 'v',
            vehicle_name: 'V',
            vehicle_plate: 'X',
            is_read: false,
            created_at: new Date().toISOString(),
          })),
        total: 45,
      },
    } as never);
    const page = await alertsApi.getPage(1, 20);
    expect(page.data).toHaveLength(20);
    expect(page.total).toBe(45);
    expect(page.hasMore).toBe(true); // offset 0 + 20 < 45
  });

  it('hasMore false quand dernière page', async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        alerts: Array(5)
          .fill(null)
          .map((_, i) => ({
            id: String(i),
            type: 'FUEL',
            severity: 'LOW',
            message: 'test',
            vehicle_id: 'v',
            vehicle_name: 'V',
            vehicle_plate: 'X',
            is_read: false,
            created_at: new Date().toISOString(),
          })),
        total: 25,
      },
    } as never);
    const page = await alertsApi.getPage(2, 20); // offset = 20, 20+5 = 25 = total
    expect(page.hasMore).toBe(false);
  });
});
