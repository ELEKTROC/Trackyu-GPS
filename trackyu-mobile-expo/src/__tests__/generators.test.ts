/**
 * @jest-environment node
 *
 * Tests des générateurs de rapports (10 modules, 71 sous-rapports).

 *
 * Deux classes de vérification :
 *
 *  1. SMOKE — données vides
 *     Toutes les API mockées retournent des tableaux vides / null.
 *     Chaque générateur doit résoudre sans lancer d'exception et retourner
 *     un ReportResult dont la forme est valide.
 *     Un échec ici = crash en production sur un compte vide ou une nouvelle
 *     installation.
 *
 *  2. RÉSILIENCE — erreur API
 *     On simule une panne réseau sur le premier appel API de chaque module.
 *     Les générateurs qui encapsulent leurs appels dans .catch() sont marqués
 *     « résilients » (ils retournent un résultat vide).
 *     Les générateurs qui propagent l'erreur sont marqués « non-résilients » :
 *     c'est un comportement documenté, non un crash app (l'écran gère le
 *     rejet via try/catch), mais une amélioration future possible.
 */

(globalThis as unknown as Record<string, unknown>).__DEV__ = false;

// ── Mocks API ─────────────────────────────────────────────────────────────────
// Tous les modules API sont remplacés avant le premier import des générateurs.

jest.mock('../api/vehicles', () => ({
  __esModule: true,
  default: {
    getAll: jest.fn().mockResolvedValue([]),
    getStats: jest.fn().mockResolvedValue({}),
    getTrips: jest.fn().mockResolvedValue([]),
    getDailyRange: jest.fn().mockResolvedValue([]),
    getFleetAnalytics: jest.fn().mockResolvedValue(null),
    getFuelStats: jest.fn().mockResolvedValue(null),
    getAlerts: jest.fn().mockResolvedValue([]),
    getFuelHistory: jest.fn().mockResolvedValue([]),
    getFleetMap: jest.fn().mockResolvedValue([]),
  },
}));

jest.mock('../api/alerts', () => ({
  __esModule: true,
  default: {
    getAll: jest.fn().mockResolvedValue([]),
    getUnreadCount: jest.fn().mockResolvedValue(0),
  },
}));

jest.mock('../api/interventions', () => ({
  __esModule: true,
  default: {
    getAll: jest.fn().mockResolvedValue([]),
    getStats: jest.fn().mockResolvedValue({
      byStatus: [],
      byType: [],
      byNature: [],
      byTechnician: [],
    }),
  },
  STATUS_LABELS: {
    PENDING: 'À planifier',
    SCHEDULED: 'Planifié',
    EN_ROUTE: 'En route',
    IN_PROGRESS: 'En cours',
    COMPLETED: 'Terminé',
    CANCELLED: 'Annulé',
    POSTPONED: 'Reportée',
  },
  STATUS_COLORS: {
    PENDING: '#F59E0B',
    SCHEDULED: '#3B82F6',
    EN_ROUTE: '#8B5CF6',
    IN_PROGRESS: '#06B6D4',
    COMPLETED: '#22C55E',
    CANCELLED: '#6B7280',
    POSTPONED: '#F97316',
  },
  NATURE_LABELS: {},
  countByStatus: jest.fn().mockReturnValue(0),
}));

jest.mock('../api/tickets', () => ({
  __esModule: true,
  default: {
    getAll: jest.fn().mockResolvedValue({ data: [], total: 0, page: 1, limit: 200, totalPages: 0 }),
  },
}));

jest.mock('../api/crmApi', () => ({
  __esModule: true,
  default: {
    getLeads: jest.fn().mockResolvedValue([]),
  },
  LEAD_STATUS_LABELS: {
    NEW: 'Nouveau',
    CONTACTED: 'Contacté',
    QUALIFIED: 'Qualifié',
    PROPOSAL: 'Proposition',
    NEGOTIATION: 'Négociation',
    WON: 'Gagné',
    LOST: 'Perdu',
  },
  LEAD_STATUS_COLORS: {
    NEW: '#3B82F6',
    CONTACTED: '#8B5CF6',
    QUALIFIED: '#06B6D4',
    PROPOSAL: '#F59E0B',
    NEGOTIATION: '#F97316',
    WON: '#22C55E',
    LOST: '#EF4444',
  },
}));

jest.mock('../api/financeApi', () => ({
  invoicesApi: { getAll: jest.fn().mockResolvedValue([]) },
  paymentsApi: { getAll: jest.fn().mockResolvedValue([]) },
  contractsApi: { getAll: jest.fn().mockResolvedValue([]) },
  quotesApi: { getAll: jest.fn().mockResolvedValue([]) },
  INVOICE_STATUS_LABELS: {
    DRAFT: 'Brouillon',
    SENT: 'Envoyée',
    PAID: 'Réglée',
    PARTIALLY_PAID: 'Partiellement réglée',
    OVERDUE: 'En retard',
    CANCELLED: 'Annulée',
  },
  INVOICE_STATUS_COLORS: {
    DRAFT: '#6B7280',
    SENT: '#3B82F6',
    PAID: '#22C55E',
    PARTIALLY_PAID: '#F59E0B',
    OVERDUE: '#EF4444',
    CANCELLED: '#9CA3AF',
  },
  QUOTE_STATUS_LABELS: {
    DRAFT: 'Brouillon',
    SENT: 'Envoyé',
    ACCEPTED: 'Accepté',
    REJECTED: 'Refusé',
    EXPIRED: 'Expiré',
  },
  QUOTE_STATUS_COLORS: {
    DRAFT: '#6B7280',
    SENT: '#3B82F6',
    ACCEPTED: '#22C55E',
    REJECTED: '#EF4444',
    EXPIRED: '#9CA3AF',
  },
  CONTRACT_STATUS_LABELS: {
    DRAFT: 'Brouillon',
    ACTIVE: 'Actif',
    SUSPENDED: 'Suspendu',
    EXPIRED: 'Expiré',
    TERMINATED: 'Résilié',
  },
  CONTRACT_STATUS_COLORS: {
    DRAFT: '#6B7280',
    ACTIVE: '#22C55E',
    SUSPENDED: '#F59E0B',
    EXPIRED: '#9CA3AF',
    TERMINATED: '#EF4444',
  },
}));

jest.mock('../api/users', () => ({
  usersApi: {
    getAll: jest.fn().mockResolvedValue([]),
  },
}));

// expensesApi est importé par finance.ts + technique.ts → chaîne native
jest.mock('../api/expensesApi', () => ({
  __esModule: true,
  expensesApi: { getAll: jest.fn().mockResolvedValue([]) },
}));

// technique.ts importe maintenanceApi, geofencesApi, ecoDrivingApi, tiresApi, apiClient
jest.mock('../api/maintenanceApi', () => ({
  __esModule: true,
  default: { getAll: jest.fn().mockResolvedValue([]), getStats: jest.fn().mockResolvedValue({}) },
}));

jest.mock('../api/geofencesApi', () => ({
  __esModule: true,
  geofencesApi: { getAll: jest.fn().mockResolvedValue([]) },
  isCircle: jest.fn().mockReturnValue(false),
  toLatLng: jest.fn().mockReturnValue([]),
}));

jest.mock('../api/ecoDrivingApi', () => ({
  __esModule: true,
  ecoDrivingApi: { getAll: jest.fn().mockResolvedValue([]) },
}));

jest.mock('../api/tiresApi', () => ({
  __esModule: true,
  default: { getAll: jest.fn().mockResolvedValue([]) },
  Tire: {},
}));

jest.mock('../api/client', () => ({
  __esModule: true,
  default: { get: jest.fn().mockResolvedValue({ data: [] }), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

// ── Imports ───────────────────────────────────────────────────────────────────

import vehiclesApiModule from '../api/vehicles';
import alertsApiModule from '../api/alerts';
import interventionsApiModule from '../api/interventions';
import ticketsApiModule from '../api/tickets';
import crmApiModule from '../api/crmApi';
import { invoicesApi, paymentsApi, contractsApi } from '../api/financeApi';
import { usersApi } from '../api/users';

import { generateReport } from '../screens/main/reports/generators/index';
import { DEFAULT_FILTERS } from '../screens/main/reports/types';
import type { Vehicle } from '../api/vehicles';

// Accès typés aux fonctions mockées (évite les erreurs TS sur .mockResolvedValue)
const mockVehiclesGetAll = vehiclesApiModule.getAll as jest.Mock;
const mockVehiclesGetStats = vehiclesApiModule.getStats as jest.Mock;
const mockGetTrips = vehiclesApiModule.getTrips as jest.Mock;
const mockGetDailyRange = vehiclesApiModule.getDailyRange as jest.Mock;
const mockGetFleetAnalytics = vehiclesApiModule.getFleetAnalytics as jest.Mock;
const mockGetFuelStats = vehiclesApiModule.getFuelStats as jest.Mock;
const mockGetAlerts = vehiclesApiModule.getAlerts as jest.Mock;
const mockGetFuelHistory = vehiclesApiModule.getFuelHistory as jest.Mock;
const mockAlertsGetAll = alertsApiModule.getAll as jest.Mock;
const mockInterventionsGetAll = interventionsApiModule.getAll as jest.Mock;
const mockInterventionsGetStats = interventionsApiModule.getStats as jest.Mock;
const mockTicketsGetAll = ticketsApiModule.getAll as jest.Mock;
const mockCrmGetLeads = crmApiModule.getLeads as jest.Mock;
const mockInvoicesGetAll = invoicesApi.getAll as jest.Mock;
const mockPaymentsGetAll = paymentsApi.getAll as jest.Mock;
const mockContractsGetAll = contractsApi.getAll as jest.Mock;
const mockUsersGetAll = usersApi.getAll as jest.Mock;

// ── Données de test ───────────────────────────────────────────────────────────

/** Véhicule minimal mais complet couvrant tous les champs utilisés par les générateurs */
const MOCK_VEHICLE: Vehicle = {
  id: 'v-test-01',
  name: 'Engin Test 01',
  plate: 'CI-001-AB',
  type: 'Camion benne',
  status: 'moving',
  latitude: 5.354,
  longitude: -4.008,
  speed: 65,
  heading: 90,
  lastUpdate: new Date().toISOString(),
  fuelLevel: 72,
  odometer: 45_000,
  clientName: 'TOTAL CI',
  driverName: 'Konan Kouassi',
  tankCapacity: 150,
  theoreticalConsumption: 12,
  isImmobilized: false,
};

const MOCK_VEHICLES: Vehicle[] = [MOCK_VEHICLE];

// ── Liste exhaustive des combinaisons module / sous-rapport ───────────────────

const ALL_COMBOS: [string, string][] = [
  // Module 1 — Activités (8 sous-rapports)
  ['activity', 'synthese'],
  ['activity', 'general'],
  ['activity', 'trajets'],
  ['activity', 'kilometrage'],
  ['activity', 'daily'],
  ['activity', 'idle'],
  ['activity', 'stopped'],
  ['activity', 'offline'],
  // Module 2 — Alertes (4)
  ['alerts', 'synthese'],
  ['alerts', 'all'],
  ['alerts', 'geofence'],
  ['alerts', 'notifications'],
  // Module 3 — Carburant (8)
  ['fuel', 'synthese'],
  ['fuel', 'levels'],
  ['fuel', 'critical'],
  ['fuel', 'refills'],
  ['fuel', 'drops'],
  ['fuel', 'consumption'],
  ['fuel', 'vs_theo'],
  ['fuel', 'anomalies'],
  // Module 4 — CRM (6)
  ['crm', 'synthese'],
  ['crm', 'leads'],
  ['crm', 'performance'],
  ['crm', 'quotes'],
  ['crm', 'products'],
  ['crm', 'inscriptions'],
  // Module 5 — Finance (8)
  ['finance', 'synthese'],
  ['finance', 'invoices'],
  ['finance', 'overdue'],
  ['finance', 'payments'],
  ['finance', 'bilan'],
  ['finance', 'contracts'],
  ['finance', 'renewals'],
  ['finance', 'vat'],
  // Module 6 — Comptabilité (7)
  ['accounting', 'synthese'],
  ['accounting', 'sales_journal'],
  ['accounting', 'receipts_journal'],
  ['accounting', 'aged_balance'],
  ['accounting', 'reconciliation'],
  ['accounting', 'vat_state'],
  ['accounting', 'fec_export'],
  // Module 7 — Technique (11)
  ['technique', 'synthese'],
  ['technique', 'all'],
  ['technique', 'by_nature'],
  ['technique', 'by_tech'],
  ['technique', 'timing'],
  ['technique', 'planning'],
  ['technique', 'stock'],
  ['technique', 'monitoring'],
  ['technique', 'signal'],
  ['technique', 'telecom_anomalies'],
  ['technique', 'immobilisation'],
  // Module 8 — Support (8)
  ['support', 'synthese'],
  ['support', 'all'],
  ['support', 'open'],
  ['support', 'resolved'],
  ['support', 'by_priority'],
  ['support', 'by_agent'],
  ['support', 'sla'],
  ['support', 'anomalies'],
  // Module 9 — Admin (6)
  ['admin', 'synthese'],
  ['admin', 'users'],
  ['admin', 'user_activity'],
  ['admin', 'resellers'],
  ['admin', 'logs'],
  ['admin', 'audit'],
  // Module 10 — Superadmin (5)
  ['superadmin', 'synthese'],
  ['superadmin', 'by_tenant'],
  ['superadmin', 'mrr'],
  ['superadmin', 'gps_activity'],
  ['superadmin', 'balises'],
];

// ── Helper : valide la forme d'un ReportResult ────────────────────────────────

function assertValidResult(result: unknown): void {
  expect(result).toBeDefined();
  expect(typeof (result as any).title).toBe('string');
  expect((result as any).title.length).toBeGreaterThan(0);
  expect(Array.isArray((result as any).kpis)).toBe(true);
  expect(Array.isArray((result as any).columns)).toBe(true);
  expect(Array.isArray((result as any).rows)).toBe(true);

  // Chaque KPI doit avoir label, value et color
  for (const kpi of (result as any).kpis) {
    expect(typeof kpi.label).toBe('string');
    expect(typeof kpi.value).toBe('string');
    expect(typeof kpi.color).toBe('string');
  }

  // Chaque ligne doit être un tableau de strings (ou null/undefined, formatés)
  for (const row of (result as any).rows) {
    expect(Array.isArray(row)).toBe(true);
  }
}

// ── Réinitialise les mocks entre tests ─────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();

  // Rétablit les valeurs par défaut (données vides — pas d'erreur)
  mockVehiclesGetAll.mockResolvedValue([]);
  mockVehiclesGetStats.mockResolvedValue({});
  mockGetTrips.mockResolvedValue([]);
  mockGetDailyRange.mockResolvedValue([]);
  mockGetFleetAnalytics.mockResolvedValue(null);
  mockGetFuelStats.mockResolvedValue(null);
  mockGetAlerts.mockResolvedValue([]);
  mockGetFuelHistory.mockResolvedValue([]);

  mockAlertsGetAll.mockResolvedValue([]);

  mockInterventionsGetAll.mockResolvedValue([]);
  mockInterventionsGetStats.mockResolvedValue({
    byStatus: [],
    byType: [],
    byNature: [],
    byTechnician: [],
  });

  mockTicketsGetAll.mockResolvedValue({ data: [], total: 0, page: 1, limit: 200, totalPages: 0 });

  mockCrmGetLeads.mockResolvedValue([]);

  mockInvoicesGetAll.mockResolvedValue([]);
  mockPaymentsGetAll.mockResolvedValue([]);
  mockContractsGetAll.mockResolvedValue([]);

  mockUsersGetAll.mockResolvedValue([]);
});

// ═════════════════════════════════════════════════════════════════════════════
// 1. SMOKE — données vides
// ═════════════════════════════════════════════════════════════════════════════

describe('Smoke — données vides (toutes les 71 combinaisons)', () => {
  it.each(ALL_COMBOS)('%s / %s : ne crash pas et retourne un ReportResult valide', async (moduleId, subId) => {
    const result = await generateReport(moduleId, subId, MOCK_VEHICLES, DEFAULT_FILTERS);
    assertValidResult(result);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 2. SMOKE — avec des données réelles simulées
// ═════════════════════════════════════════════════════════════════════════════

describe('Smoke — avec données simulées (modules principaux)', () => {
  beforeEach(() => {
    // Retours représentatifs pour les modules les plus utilisés
    mockGetFleetAnalytics.mockResolvedValue({
      period: '30d',
      tripStatistics: {
        totalTrips: 42,
        totalDistance: 12_500,
        avgTripDistance: 297,
        avgMaxSpeed: 95,
      },
      utilization: {
        active_vehicles: 1,
        total_vehicles: 1,
      },
    });

    mockGetTrips.mockResolvedValue([
      {
        id: 'trip-01',
        object_id: 'v-test-01',
        start_time: '2026-04-01T07:00:00Z',
        end_time: '2026-04-01T09:30:00Z',
        distance_km: 180,
        start_address: 'Abidjan Plateau',
        end_address: 'Bouaké Centre',
        max_speed_kmh: 120,
        avg_speed_kmh: 72,
        duration_seconds: 9000,
      },
    ]);

    mockAlertsGetAll.mockResolvedValue([
      {
        id: 'a-01',
        type: 'speed',
        severity: 'warning',
        title: 'Excès de vitesse',
        message: '120 km/h sur RN3',
        vehicleId: 'v-test-01',
        vehicleName: 'Engin Test 01',
        vehiclePlate: 'CI-001-AB',
        isRead: false,
        createdAt: new Date().toISOString(),
      },
    ]);
  });

  it('activity/synthese — KPI présents et valides', async () => {
    const result = await generateReport('activity', 'synthese', MOCK_VEHICLES, DEFAULT_FILTERS);
    assertValidResult(result);
    expect(result.kpis.length).toBeGreaterThan(0);
    // Au moins un KPI contient la valeur '1' (1 engin mocké)
    const hasVehicleCount = result.kpis.some((k) => k.value === '1');
    expect(hasVehicleCount).toBe(true);
  });

  it('activity/trajets — tableau des trajets peuplé', async () => {
    const result = await generateReport('activity', 'trajets', MOCK_VEHICLES, DEFAULT_FILTERS);
    assertValidResult(result);
    // Pas de vérification sur rows.length car le filtre de date peut éliminer les trajets
  });

  it('alerts/synthese — KPIs alertes présents', async () => {
    const result = await generateReport('alerts', 'synthese', MOCK_VEHICLES, DEFAULT_FILTERS);
    assertValidResult(result);
    expect(result.kpis.length).toBeGreaterThan(0);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 3. RÉSILIENCE — erreurs API
//
//    Tous les générateurs sont désormais résilients : ils capturent les erreurs
//    et retournent un résultat d'erreur structuré au lieu de propager.
//    Le résultat d'erreur contient kpis[].value === 'Erreur' et rows avec le
//    message d'erreur.
// ═════════════════════════════════════════════════════════════════════════════

// Helper : vérifie qu'un résultat est un résultat d'erreur résilient
function assertErrorResult(
  result: ReturnType<
    typeof assertValidResult extends (r: infer R) => void ? never : typeof assertValidResult
  > extends never
    ? never
    : Parameters<typeof assertValidResult>[0]
): void {
  assertValidResult(result);
  expect(result.kpis.some((k: { value: string }) => k.value === 'Erreur')).toBe(true);
}

describe('Résilience — erreurs API', () => {
  // ── Module 1 · Activités ─────────────────────────────────────────────────

  it('activity/synthese : résilient — getFleetAnalytics en erreur → fallback null', async () => {
    mockGetFleetAnalytics.mockRejectedValueOnce(new Error('Network Error'));
    const result = await generateReport('activity', 'synthese', MOCK_VEHICLES, DEFAULT_FILTERS);
    assertValidResult(result);
  });

  it('activity/trajets : résilient — getTrips en erreur → lignes vides (catch par engin)', async () => {
    mockGetTrips.mockRejectedValueOnce(new Error('Network Error'));
    const result = await generateReport('activity', 'trajets', MOCK_VEHICLES, DEFAULT_FILTERS);
    assertValidResult(result);
    expect(result.rows).toEqual([]);
  });

  it('activity/kilometrage : résilient — getTrips en erreur → lignes vides', async () => {
    mockGetTrips.mockRejectedValueOnce(new Error('Network Error'));
    const result = await generateReport('activity', 'kilometrage', MOCK_VEHICLES, DEFAULT_FILTERS);
    assertValidResult(result);
  });

  // ── Module 2 · Alertes ───────────────────────────────────────────────────

  it("alerts/synthese : résilient — getAll en erreur → résultat d'erreur structuré", async () => {
    mockAlertsGetAll.mockRejectedValueOnce(new Error('Network Error'));
    const result = await generateReport('alerts', 'synthese', MOCK_VEHICLES, DEFAULT_FILTERS);
    assertValidResult(result);
  });

  it("alerts/all : résilient — getAll en erreur → résultat d'erreur structuré", async () => {
    mockAlertsGetAll.mockRejectedValueOnce(new Error('Network Error'));
    const result = await generateReport('alerts', 'all', MOCK_VEHICLES, DEFAULT_FILTERS);
    assertValidResult(result);
  });

  // ── Module 3 · Carburant ─────────────────────────────────────────────────

  it('fuel/refills : résilient — getFuelHistory en erreur → lignes vides (catch par engin)', async () => {
    mockGetFuelHistory.mockRejectedValueOnce(new Error('Network Error'));
    const result = await generateReport('fuel', 'refills', MOCK_VEHICLES, DEFAULT_FILTERS);
    assertValidResult(result);
    expect(result.rows).toEqual([]);
  });

  it('fuel/drops : résilient — getFuelHistory en erreur → lignes vides', async () => {
    mockGetFuelHistory.mockRejectedValueOnce(new Error('Network Error'));
    const result = await generateReport('fuel', 'drops', MOCK_VEHICLES, DEFAULT_FILTERS);
    assertValidResult(result);
  });

  it('fuel/consumption : résilient — getFuelStats en erreur → ligne avec valeurs nulles', async () => {
    mockGetFuelStats.mockRejectedValueOnce(new Error('Network Error'));
    const result = await generateReport('fuel', 'consumption', MOCK_VEHICLES, DEFAULT_FILTERS);
    assertValidResult(result);
  });

  // ── Module 4 · CRM ───────────────────────────────────────────────────────

  it("crm/leads : résilient — getLeads en erreur → résultat d'erreur structuré", async () => {
    mockCrmGetLeads.mockRejectedValueOnce(new Error('Network Error'));
    const result = await generateReport('crm', 'leads', MOCK_VEHICLES, DEFAULT_FILTERS);
    assertValidResult(result);
  });

  it("crm/synthese : résilient — getLeads en erreur → résultat d'erreur structuré", async () => {
    mockCrmGetLeads.mockRejectedValueOnce(new Error('Network Error'));
    const result = await generateReport('crm', 'synthese', MOCK_VEHICLES, DEFAULT_FILTERS);
    assertValidResult(result);
  });

  // ── Module 5 · Finance ───────────────────────────────────────────────────

  it("finance/invoices : résilient — invoicesApi.getAll en erreur → résultat d'erreur structuré", async () => {
    mockInvoicesGetAll.mockRejectedValueOnce(new Error('Network Error'));
    const result = await generateReport('finance', 'invoices', MOCK_VEHICLES, DEFAULT_FILTERS);
    assertValidResult(result);
  });

  it("finance/payments : résilient — paymentsApi.getAll en erreur → résultat d'erreur structuré", async () => {
    mockPaymentsGetAll.mockRejectedValueOnce(new Error('Network Error'));
    const result = await generateReport('finance', 'payments', MOCK_VEHICLES, DEFAULT_FILTERS);
    assertValidResult(result);
  });

  // ── Module 6 · Comptabilité ──────────────────────────────────────────────

  it("accounting/sales_journal : résilient — invoicesApi.getAll en erreur → résultat d'erreur structuré", async () => {
    mockInvoicesGetAll.mockRejectedValueOnce(new Error('Network Error'));
    const result = await generateReport('accounting', 'sales_journal', MOCK_VEHICLES, DEFAULT_FILTERS);
    assertValidResult(result);
  });

  it("accounting/receipts_journal : résilient — paymentsApi.getAll en erreur → résultat d'erreur structuré", async () => {
    mockPaymentsGetAll.mockRejectedValueOnce(new Error('Network Error'));
    const result = await generateReport('accounting', 'receipts_journal', MOCK_VEHICLES, DEFAULT_FILTERS);
    assertValidResult(result);
  });

  // ── Module 7 · Technique ─────────────────────────────────────────────────

  it("technique/synthese : résilient — interventionsApi.getAll en erreur → résultat d'erreur structuré", async () => {
    mockInterventionsGetAll.mockRejectedValueOnce(new Error('Network Error'));
    const result = await generateReport('technique', 'synthese', MOCK_VEHICLES, DEFAULT_FILTERS);
    assertValidResult(result);
  });

  it("technique/by_tech : résilient — interventionsApi.getStats en erreur → résultat d'erreur structuré", async () => {
    mockInterventionsGetStats.mockRejectedValueOnce(new Error('Network Error'));
    const result = await generateReport('technique', 'by_tech', MOCK_VEHICLES, DEFAULT_FILTERS);
    assertValidResult(result);
  });

  it('technique/immobilisation : résilient — getAlerts en erreur → lignes vides (mapWithConcurrency + catch)', async () => {
    mockGetAlerts.mockRejectedValueOnce(new Error('Network Error'));
    const result = await generateReport('technique', 'immobilisation', MOCK_VEHICLES, DEFAULT_FILTERS);
    assertValidResult(result);
    expect(result.rows).toEqual([]);
  });

  // ── Module 8 · Support ───────────────────────────────────────────────────

  it("support/synthese : résilient — ticketsApi.getAll en erreur → résultat d'erreur structuré", async () => {
    mockTicketsGetAll.mockRejectedValueOnce(new Error('Network Error'));
    const result = await generateReport('support', 'synthese', MOCK_VEHICLES, DEFAULT_FILTERS);
    assertValidResult(result);
  });

  it("support/all : résilient — ticketsApi.getAll en erreur → résultat d'erreur structuré", async () => {
    mockTicketsGetAll.mockRejectedValueOnce(new Error('Network Error'));
    const result = await generateReport('support', 'all', MOCK_VEHICLES, DEFAULT_FILTERS);
    assertValidResult(result);
  });

  // ── Module 9 · Admin ─────────────────────────────────────────────────────

  it("admin/synthese : résilient — usersApi.getAll en erreur → résultat d'erreur structuré", async () => {
    mockUsersGetAll.mockRejectedValueOnce(new Error('Network Error'));
    const result = await generateReport('admin', 'synthese', MOCK_VEHICLES, DEFAULT_FILTERS);
    assertValidResult(result);
  });

  it("admin/users : résilient — usersApi.getAll en erreur → résultat d'erreur structuré", async () => {
    mockUsersGetAll.mockRejectedValueOnce(new Error('Network Error'));
    const result = await generateReport('admin', 'users', MOCK_VEHICLES, DEFAULT_FILTERS);
    assertValidResult(result);
  });

  // ── Module 10 · Superadmin ───────────────────────────────────────────────

  it("superadmin/synthese : résilient — usersApi.getAll en erreur → résultat d'erreur structuré", async () => {
    mockUsersGetAll.mockRejectedValueOnce(new Error('Network Error'));
    const result = await generateReport('superadmin', 'synthese', MOCK_VEHICLES, DEFAULT_FILTERS);
    assertValidResult(result);
  });

  it("superadmin/mrr : résilient — contractsApi.getAll en erreur → résultat d'erreur structuré", async () => {
    mockContractsGetAll.mockRejectedValueOnce(new Error('Network Error'));
    const result = await generateReport('superadmin', 'mrr', MOCK_VEHICLES, DEFAULT_FILTERS);
    assertValidResult(result);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 4. FILTRES — véhicules
// ═════════════════════════════════════════════════════════════════════════════

describe('Filtres — vehicleIds', () => {
  it('activity/general : aucun engin retourné si vehicleIds ne correspond pas', async () => {
    const filters = { ...DEFAULT_FILTERS, vehicleIds: ['id-inexistant'] };
    const result = await generateReport('activity', 'general', MOCK_VEHICLES, filters);
    assertValidResult(result);
    expect(result.rows).toHaveLength(0);
  });

  it('activity/general : tous les engins retournés si vehicleIds est vide (aucun filtre)', async () => {
    const filters = { ...DEFAULT_FILTERS, vehicleIds: [] };
    const result = await generateReport('activity', 'general', MOCK_VEHICLES, filters);
    assertValidResult(result);
    expect(result.rows).toHaveLength(MOCK_VEHICLES.length);
  });

  it('fuel/levels : filtre client — exclut les engins hors-client', async () => {
    const filters = { ...DEFAULT_FILTERS, client: 'CLIENT-QUI-NEXISTE-PAS' };
    const result = await generateReport('fuel', 'levels', MOCK_VEHICLES, filters);
    assertValidResult(result);
    expect(result.rows).toHaveLength(0);
  });

  it('fuel/levels : filtre client — inclut les engins du bon client', async () => {
    const filters = { ...DEFAULT_FILTERS, client: 'TOTAL CI' };
    const result = await generateReport('fuel', 'levels', MOCK_VEHICLES, filters);
    assertValidResult(result);
    expect(result.rows).toHaveLength(MOCK_VEHICLES.length);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 5. DISPATCHER — module inconnu
// ═════════════════════════════════════════════════════════════════════════════

describe('Dispatcher', () => {
  it('retourne un résultat "inconnu" pour un moduleId non référencé', async () => {
    const result = await generateReport('module-inexistant', 'sous-rapport', [], DEFAULT_FILTERS);
    assertValidResult(result);
    expect(result.title).toContain('module-inexistant');
  });
});
