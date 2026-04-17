/**
 * @jest-environment node
 *
 * Tests unitaires de vehiclesApi.
 *
 * Deux axes principaux :
 *  1. NORMALISATION — normalizeVehicle() mappe correctement les variantes du format backend
 *     (snake_case vs camelCase, location nested vs flat, statuts majuscules vs minuscules)
 *  2. API — chaque méthode appelle le bon endpoint avec les bons paramètres,
 *     normalise les réponses vides, et propage ou absorbe les erreurs selon le contrat.
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
import vehiclesApi from '../api/vehicles';
import type { Vehicle } from '../api/vehicles';

const mockGet = apiClient.get as jest.Mock;
const mockPost = apiClient.post as jest.Mock;
const mockPut = apiClient.put as jest.Mock;

// ── Fixtures ───────────────────────────────────────────────────────────────────

/** Format backend complet en snake_case */
const RAW_BACKEND_VEHICLE = {
  id: 'v-001',
  name: 'Camion Benne 01',
  plate: 'CI-001-AB',
  vehicle_type: 'Camion benne',
  status: 'MOVING',
  location: { lat: 5.354, lng: -4.008 },
  speed: 65,
  heading: 90,
  last_updated: '2026-04-10T08:00:00.000Z',
  fuel_level: 72,
  battery_voltage: 12.5,
  mileage: 45000,
  driver_name: 'Konan Kouassi',
  client_name: 'TOTAL CI',
  is_immobilized: false,
  tank_capacity: 150,
};

const EXPECTED_VEHICLE: Partial<Vehicle> = {
  id: 'v-001',
  name: 'Camion Benne 01',
  plate: 'CI-001-AB',
  type: 'Camion benne',
  status: 'moving',
  latitude: 5.354,
  longitude: -4.008,
  speed: 65,
  heading: 90,
  fuelLevel: 72,
  driverName: 'Konan Kouassi',
  clientName: 'TOTAL CI',
};

beforeEach(() => jest.clearAllMocks());

// ═══════════════════════════════════════════════════════════════════════════════
// normalizeVehicle — via getAll
// ═══════════════════════════════════════════════════════════════════════════════

describe('normalizeVehicle (via getAll)', () => {
  it('mappe les champs snake_case correctement', async () => {
    mockGet.mockResolvedValueOnce({ data: [RAW_BACKEND_VEHICLE] });
    const [v] = await vehiclesApi.getAll();
    expect(v).toMatchObject(EXPECTED_VEHICLE);
  });

  it('mappe le statut MOVING → moving', async () => {
    mockGet.mockResolvedValueOnce({ data: [{ ...RAW_BACKEND_VEHICLE, status: 'MOVING' }] });
    const [v] = await vehiclesApi.getAll();
    expect(v.status).toBe('moving');
  });

  it('mappe le statut IDLE → idle', async () => {
    mockGet.mockResolvedValueOnce({ data: [{ ...RAW_BACKEND_VEHICLE, status: 'IDLE' }] });
    const [v] = await vehiclesApi.getAll();
    expect(v.status).toBe('idle');
  });

  it('mappe le statut STOPPED → stopped', async () => {
    mockGet.mockResolvedValueOnce({ data: [{ ...RAW_BACKEND_VEHICLE, status: 'STOPPED' }] });
    const [v] = await vehiclesApi.getAll();
    expect(v.status).toBe('stopped');
  });

  it('mappe le statut OFFLINE → offline (et ALERT → offline)', async () => {
    mockGet.mockResolvedValueOnce({
      data: [
        { ...RAW_BACKEND_VEHICLE, status: 'OFFLINE' },
        { ...RAW_BACKEND_VEHICLE, id: 'v-002', status: 'ALERT' },
      ],
    });
    const vehicles = await vehiclesApi.getAll();
    expect(vehicles[0].status).toBe('offline');
    expect(vehicles[1].status).toBe('offline');
  });

  it('statut inconnu → offline (fallback)', async () => {
    mockGet.mockResolvedValueOnce({ data: [{ ...RAW_BACKEND_VEHICLE, status: 'UNKNOWN_STATUS' }] });
    const [v] = await vehiclesApi.getAll();
    expect(v.status).toBe('offline');
  });

  it('accepte location nested { lat, lng }', async () => {
    mockGet.mockResolvedValueOnce({ data: [{ ...RAW_BACKEND_VEHICLE, location: { lat: 6.0, lng: -5.0 } }] });
    const [v] = await vehiclesApi.getAll();
    expect(v.latitude).toBe(6.0);
    expect(v.longitude).toBe(-5.0);
  });

  it('accepte location flat location_lat / location_lng', async () => {
    const raw = { ...RAW_BACKEND_VEHICLE, location: undefined, location_lat: 7.0, location_lng: -3.0 };
    mockGet.mockResolvedValueOnce({ data: [raw] });
    const [v] = await vehiclesApi.getAll();
    expect(v.latitude).toBe(7.0);
    expect(v.longitude).toBe(-3.0);
  });

  it('utilise vehicle_type en priorité pour le type', async () => {
    const raw = { ...RAW_BACKEND_VEHICLE, vehicle_type: 'Moto', vehicleType: 'Voiture', type: 'Bus' };
    mockGet.mockResolvedValueOnce({ data: [raw] });
    const [v] = await vehiclesApi.getAll();
    expect(v.type).toBe('Moto');
  });

  it('accepte les alias camelCase driver_name / driverName', async () => {
    const raw = { ...RAW_BACKEND_VEHICLE, driver_name: undefined, driverName: 'Diallo Ibrahim' };
    mockGet.mockResolvedValueOnce({ data: [raw] });
    const [v] = await vehiclesApi.getAll();
    expect(v.driverName).toBe('Diallo Ibrahim');
  });

  it('accepte last_updated / lastUpdated / lastUpdate', async () => {
    const ts = '2026-01-01T00:00:00.000Z';
    mockGet.mockResolvedValueOnce({ data: [{ ...RAW_BACKEND_VEHICLE, last_updated: ts }] });
    const [v] = await vehiclesApi.getAll();
    expect(v.lastUpdate).toBe(ts);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// vehiclesApi.getAll
// ═══════════════════════════════════════════════════════════════════════════════

describe('vehiclesApi.getAll', () => {
  it('envoie un GET vers /fleet/vehicles avec les params de pagination', async () => {
    mockGet.mockResolvedValueOnce({ data: [] });
    await vehiclesApi.getAll();
    expect(mockGet).toHaveBeenCalledWith('/fleet/vehicles', expect.objectContaining({ params: expect.any(Object) }));
  });

  it('retourne [] si le backend retourne null', async () => {
    mockGet.mockResolvedValueOnce({ data: null });
    const result = await vehiclesApi.getAll();
    expect(result).toEqual([]);
  });

  it('propage une erreur 401 sous forme ApiError AUTH', async () => {
    mockGet.mockRejectedValueOnce({ response: { status: 401, data: {} } });
    await expect(vehiclesApi.getAll()).rejects.toMatchObject({ code: 'AUTH' });
  });

  it('propage une erreur réseau sous forme ApiError NETWORK', async () => {
    mockGet.mockRejectedValueOnce({ request: {}, message: 'Network Error' });
    await expect(vehiclesApi.getAll()).rejects.toMatchObject({ code: 'NETWORK' });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// vehiclesApi.getById
// ═══════════════════════════════════════════════════════════════════════════════

describe('vehiclesApi.getById', () => {
  it('envoie un GET vers /fleet/vehicles/:id', async () => {
    mockGet.mockResolvedValueOnce({ data: RAW_BACKEND_VEHICLE });
    await vehiclesApi.getById('v-001');
    expect(mockGet).toHaveBeenCalledWith('/fleet/vehicles/v-001');
  });

  it('normalise le véhicule retourné', async () => {
    mockGet.mockResolvedValueOnce({ data: RAW_BACKEND_VEHICLE });
    const v = await vehiclesApi.getById('v-001');
    expect(v.status).toBe('moving');
    expect(v.latitude).toBe(5.354);
  });

  it('propage une erreur 404 sous forme ApiError NOT_FOUND', async () => {
    mockGet.mockRejectedValueOnce({ response: { status: 404, data: { message: 'Not found' } } });
    await expect(vehiclesApi.getById('id-inexistant')).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// vehiclesApi.getTrips
// ═══════════════════════════════════════════════════════════════════════════════

describe('vehiclesApi.getTrips', () => {
  it('envoie un GET vers /fleet/vehicles/:id/trips avec startDate et endDate', async () => {
    mockGet.mockResolvedValueOnce({ data: [] });

    await vehiclesApi.getTrips('v-001', '2026-04-10');

    expect(mockGet).toHaveBeenCalledWith('/fleet/vehicles/v-001/trips', {
      params: { startDate: '2026-04-10', endDate: '2026-04-10T23:59:59' },
    });
  });

  it('accepte une endDate explicite', async () => {
    mockGet.mockResolvedValueOnce({ data: [] });

    await vehiclesApi.getTrips('v-001', '2026-04-01', '2026-04-10');

    expect(mockGet).toHaveBeenCalledWith('/fleet/vehicles/v-001/trips', {
      params: { startDate: '2026-04-01', endDate: '2026-04-10' },
    });
  });

  it('retourne [] si le backend retourne null', async () => {
    mockGet.mockResolvedValueOnce({ data: null });
    const result = await vehiclesApi.getTrips('v-001', '2026-04-10');
    expect(result).toEqual([]);
  });

  it('retourne les trajets', async () => {
    const trip = {
      id: 't-01',
      object_id: 'v-001',
      start_time: '2026-04-10T07:00:00Z',
      end_time: '2026-04-10T09:00:00Z',
      distance_km: 120,
    };
    mockGet.mockResolvedValueOnce({ data: [trip] });
    const result = await vehiclesApi.getTrips('v-001', '2026-04-10');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('t-01');
  });

  it('propage une erreur réseau', async () => {
    mockGet.mockRejectedValueOnce({ request: {}, message: 'Network Error' });
    await expect(vehiclesApi.getTrips('v-001', '2026-04-10')).rejects.toMatchObject({ code: 'NETWORK' });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// vehiclesApi.getFleetAnalytics
// ═══════════════════════════════════════════════════════════════════════════════

describe('vehiclesApi.getFleetAnalytics', () => {
  const ANALYTICS = {
    period: '30d',
    tripStatistics: { totalTrips: 42, totalDistance: 12500, avgTripDistance: 297, avgMaxSpeed: 95 },
    fuelEfficiency: { avgConsumptionPer100km: 12.5 },
    utilization: { active_vehicles: '8', total_vehicles: '10' },
  };

  it('envoie un GET vers /fleet/analytics avec la période par défaut', async () => {
    mockGet.mockResolvedValueOnce({ data: ANALYTICS });
    await vehiclesApi.getFleetAnalytics();
    expect(mockGet).toHaveBeenCalledWith('/fleet/analytics', { params: { period: '30d' } });
  });

  it('envoie period=7d si passé', async () => {
    mockGet.mockResolvedValueOnce({ data: ANALYTICS });
    await vehiclesApi.getFleetAnalytics('7d');
    expect(mockGet).toHaveBeenCalledWith('/fleet/analytics', { params: { period: '7d' } });
  });

  it('envoie startDate + endDate si period=custom', async () => {
    mockGet.mockResolvedValueOnce({ data: ANALYTICS });
    await vehiclesApi.getFleetAnalytics('custom', '2026-04-01', '2026-04-10');
    expect(mockGet).toHaveBeenCalledWith('/fleet/analytics', {
      params: { startDate: '2026-04-01', endDate: '2026-04-10' },
    });
  });

  it('retourne les analytics', async () => {
    mockGet.mockResolvedValueOnce({ data: ANALYTICS });
    const result = await vehiclesApi.getFleetAnalytics();
    expect(result.tripStatistics.totalTrips).toBe(42);
  });

  it('propage une erreur 500', async () => {
    mockGet.mockRejectedValueOnce({ response: { status: 500, data: {} } });
    await expect(vehiclesApi.getFleetAnalytics()).rejects.toMatchObject({ code: 'SERVER' });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// vehiclesApi.getAlerts
// ═══════════════════════════════════════════════════════════════════════════════

describe('vehiclesApi.getAlerts', () => {
  it('envoie un GET vers /fleet/vehicles/:id/alerts avec limit', async () => {
    mockGet.mockResolvedValueOnce({ data: [] });
    await vehiclesApi.getAlerts('v-001');
    expect(mockGet).toHaveBeenCalledWith('/fleet/vehicles/v-001/alerts', {
      params: { limit: 50 },
    });
  });

  it('inclut le type si fourni', async () => {
    mockGet.mockResolvedValueOnce({ data: [] });
    await vehiclesApi.getAlerts('v-001', 100, 'IMMOBILIZATION');
    expect(mockGet).toHaveBeenCalledWith('/fleet/vehicles/v-001/alerts', {
      params: { limit: 100, type: 'IMMOBILIZATION' },
    });
  });

  it('inclut startDate et endDate si fournis', async () => {
    mockGet.mockResolvedValueOnce({ data: [] });
    await vehiclesApi.getAlerts('v-001', 50, undefined, '2026-04-01', '2026-04-10');
    const call = (mockGet.mock.calls[0][1] as any).params;
    expect(call.startDate).toBe('2026-04-01');
    expect(call.endDate).toBe('2026-04-10');
  });

  it('retourne [] si le backend retourne null', async () => {
    mockGet.mockResolvedValueOnce({ data: null });
    const result = await vehiclesApi.getAlerts('v-001');
    expect(result).toEqual([]);
  });

  it('propage une erreur réseau', async () => {
    mockGet.mockRejectedValueOnce({ request: {}, message: 'Network Error' });
    await expect(vehiclesApi.getAlerts('v-001')).rejects.toMatchObject({ code: 'NETWORK' });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// vehiclesApi.getFuelHistory — résilient
// ═══════════════════════════════════════════════════════════════════════════════

describe('vehiclesApi.getFuelHistory', () => {
  it('envoie un GET vers /fleet/vehicles/:id/fuel-events avec les dates', async () => {
    mockGet.mockResolvedValueOnce({ data: [] });
    await vehiclesApi.getFuelHistory('v-001', '2026-04-01', '2026-04-10');
    expect(mockGet).toHaveBeenCalledWith('/fleet/vehicles/v-001/fuel-events', {
      params: { startDate: '2026-04-01', endDate: '2026-04-10' },
    });
  });

  it('retourne les événements carburant', async () => {
    const events = [{ timestamp: '2026-04-05T10:00:00Z', level: 80, type: 'refill', volume: 40 }];
    mockGet.mockResolvedValueOnce({ data: events });
    const result = await vehiclesApi.getFuelHistory('v-001', '2026-04-01', '2026-04-10');
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('refill');
  });

  it('retourne [] si le backend retourne null (résilient)', async () => {
    mockGet.mockResolvedValueOnce({ data: null });
    const result = await vehiclesApi.getFuelHistory('v-001', '2026-04-01', '2026-04-10');
    expect(result).toEqual([]);
  });

  it('retourne [] sur erreur réseau (résilient — pas de propagation)', async () => {
    mockGet.mockRejectedValueOnce(new Error('Network Error'));
    const result = await vehiclesApi.getFuelHistory('v-001', '2026-04-01', '2026-04-10');
    expect(result).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// vehiclesApi.getDailyRange — résilient
// ═══════════════════════════════════════════════════════════════════════════════

describe('vehiclesApi.getDailyRange', () => {
  it('envoie un GET vers /fleet/vehicles/:id/daily-range', async () => {
    mockGet.mockResolvedValueOnce({ data: [] });
    await vehiclesApi.getDailyRange('v-001', '2026-04-01', '2026-04-30');
    expect(mockGet).toHaveBeenCalledWith('/fleet/vehicles/v-001/daily-range', {
      params: { startDate: '2026-04-01', endDate: '2026-04-30' },
    });
  });

  it('retourne les stats journalières', async () => {
    const days = [{ date: '2026-04-10', tripsCount: 3, totalDistance: 120 }];
    mockGet.mockResolvedValueOnce({ data: days });
    const result = await vehiclesApi.getDailyRange('v-001', '2026-04-01', '2026-04-30');
    expect(result).toHaveLength(1);
    expect(result[0].tripsCount).toBe(3);
  });

  it('retourne [] sur erreur réseau (résilient)', async () => {
    mockGet.mockRejectedValueOnce(new Error('Network Error'));
    const result = await vehiclesApi.getDailyRange('v-001', '2026-04-01', '2026-04-30');
    expect(result).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// vehiclesApi.getVehicleSubscription — résilient
// ═══════════════════════════════════════════════════════════════════════════════

describe('vehiclesApi.getVehicleSubscription', () => {
  it('envoie un GET vers /fleet/vehicles/:id/subscription', async () => {
    mockGet.mockResolvedValueOnce({ data: { contractNumber: 'CTR-001', status: 'ACTIVE' } });
    await vehiclesApi.getVehicleSubscription('v-001');
    expect(mockGet).toHaveBeenCalledWith('/fleet/vehicles/v-001/subscription');
  });

  it("retourne l'abonnement si présent", async () => {
    mockGet.mockResolvedValueOnce({ data: { contractNumber: 'CTR-001', status: 'ACTIVE' } });
    const result = await vehiclesApi.getVehicleSubscription('v-001');
    expect(result?.contractNumber).toBe('CTR-001');
  });

  it('retourne null si data est null', async () => {
    mockGet.mockResolvedValueOnce({ data: null });
    const result = await vehiclesApi.getVehicleSubscription('v-001');
    expect(result).toBeNull();
  });

  it('retourne null sur erreur réseau (résilient)', async () => {
    mockGet.mockRejectedValueOnce(new Error('Network Error'));
    const result = await vehiclesApi.getVehicleSubscription('v-001');
    expect(result).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// vehiclesApi.toggleImmobilize
// ═══════════════════════════════════════════════════════════════════════════════

describe('vehiclesApi.toggleImmobilize', () => {
  const BACKEND_RESPONSE = {
    object: { ...RAW_BACKEND_VEHICLE, is_immobilized: true },
    deviceConnected: true,
    method: 'tcp',
  };

  it('envoie un POST vers /fleet/vehicles/:id/immobilize avec les bons paramètres', async () => {
    mockPost.mockResolvedValueOnce({ data: BACKEND_RESPONSE });

    await vehiclesApi.toggleImmobilize('v-001', true, 'tcp');

    expect(mockPost).toHaveBeenCalledWith('/fleet/vehicles/v-001/immobilize', {
      immobilize: true,
      method: 'tcp',
    });
  });

  it('retourne le véhicule normalisé + deviceConnected + method', async () => {
    mockPost.mockResolvedValueOnce({ data: BACKEND_RESPONSE });
    const result = await vehiclesApi.toggleImmobilize('v-001', true);
    expect(result.vehicle.status).toBe('moving');
    expect(result.deviceConnected).toBe(true);
    expect(result.method).toBe('tcp');
  });

  it('propage une erreur 500', async () => {
    mockPost.mockRejectedValueOnce({ response: { status: 500, data: {} } });
    await expect(vehiclesApi.toggleImmobilize('v-001', true)).rejects.toMatchObject({ code: 'SERVER' });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// vehiclesApi.togglePanne
// ═══════════════════════════════════════════════════════════════════════════════

describe('vehiclesApi.togglePanne', () => {
  it('envoie un POST vers /fleet/vehicles/:id/panne', async () => {
    mockPost.mockResolvedValueOnce({ data: { object: RAW_BACKEND_VEHICLE } });
    await vehiclesApi.togglePanne('v-001', true);
    expect(mockPost).toHaveBeenCalledWith('/fleet/vehicles/v-001/panne', { isPanne: true });
  });

  it('retourne le véhicule normalisé', async () => {
    mockPost.mockResolvedValueOnce({ data: { object: RAW_BACKEND_VEHICLE } });
    const v = await vehiclesApi.togglePanne('v-001', false);
    expect(v.id).toBe('v-001');
    expect(v.status).toBe('moving');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// vehiclesApi.getPage
// ═══════════════════════════════════════════════════════════════════════════════

describe('vehiclesApi.getPage', () => {
  it('envoie un GET avec limit et offset', async () => {
    mockGet.mockResolvedValueOnce({ data: [] });
    await vehiclesApi.getPage({}, 0, 50);
    expect(mockGet).toHaveBeenCalledWith('/fleet/vehicles', {
      params: { limit: 50, offset: 0 },
    });
  });

  it('inclut les filtres status/q/groupId si fournis', async () => {
    mockGet.mockResolvedValueOnce({ data: [] });
    await vehiclesApi.getPage({ status: 'moving', q: 'camion', groupId: 'g-01' }, 10, 20);
    const params = (mockGet.mock.calls[0][1] as any).params;
    expect(params.status).toBe('moving');
    expect(params.q).toBe('camion');
    expect(params.groupId).toBe('g-01');
  });

  it('normalise la réponse paginée { data, total, limit, offset }', async () => {
    mockGet.mockResolvedValueOnce({
      data: { data: [RAW_BACKEND_VEHICLE], total: 42, limit: 50, offset: 0 },
    });
    const result = await vehiclesApi.getPage();
    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(42);
    expect(result.data[0].status).toBe('moving');
  });

  it('normalise le format tableau nu (fallback)', async () => {
    mockGet.mockResolvedValueOnce({ data: [RAW_BACKEND_VEHICLE] });
    const result = await vehiclesApi.getPage();
    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it('propage une erreur réseau', async () => {
    mockGet.mockRejectedValueOnce({ request: {}, message: 'Network Error' });
    await expect(vehiclesApi.getPage()).rejects.toMatchObject({ code: 'NETWORK' });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// vehiclesApi.getFleetMap
// ═══════════════════════════════════════════════════════════════════════════════

describe('vehiclesApi.getFleetMap', () => {
  it('envoie un GET vers /fleet/vehicles/map avec les bounding box', async () => {
    mockGet.mockResolvedValueOnce({ data: { data: [], total: 0 } });
    await vehiclesApi.getFleetMap(5.0, -5.0, 6.0, -4.0);
    expect(mockGet).toHaveBeenCalledWith('/fleet/vehicles/map', {
      params: { swLat: 5.0, swLng: -5.0, neLat: 6.0, neLng: -4.0 },
    });
  });

  it('retourne les marqueurs normalisés', async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        data: [
          {
            id: 'v-001',
            name: 'Camion 01',
            plate: 'CI-001',
            vehicle_type: 'Camion',
            status: 'MOVING',
            lat: 5.354,
            lng: -4.008,
            speed: 60,
            last_update: '2026-04-10T08:00:00Z',
          },
        ],
        total: 1,
      },
    });
    const result = await vehiclesApi.getFleetMap(5.0, -5.0, 6.0, -4.0);
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('moving');
    expect(result[0].lat).toBe(5.354);
  });

  it('propage une erreur réseau', async () => {
    mockGet.mockRejectedValueOnce({ request: {}, message: 'Network Error' });
    await expect(vehiclesApi.getFleetMap(0, 0, 1, 1)).rejects.toMatchObject({ code: 'NETWORK' });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// vehiclesApi.geocodeCoord — résilient
// ═══════════════════════════════════════════════════════════════════════════════

describe('vehiclesApi.geocodeCoord', () => {
  it('envoie un GET vers /fleet/geocode avec lat et lng', async () => {
    mockGet.mockResolvedValueOnce({ data: { address: 'Abidjan, Plateau' } });
    await vehiclesApi.geocodeCoord(5.354, -4.008);
    expect(mockGet).toHaveBeenCalledWith('/fleet/geocode', { params: { lat: 5.354, lng: -4.008 } });
  });

  it("retourne l'adresse géocodée", async () => {
    mockGet.mockResolvedValueOnce({ data: { address: 'Abidjan, Plateau' } });
    const result = await vehiclesApi.geocodeCoord(5.354, -4.008);
    expect(result).toBe('Abidjan, Plateau');
  });

  it('retourne null si data.address est null', async () => {
    mockGet.mockResolvedValueOnce({ data: { address: null } });
    const result = await vehiclesApi.geocodeCoord(0, 0);
    expect(result).toBeNull();
  });

  it('retourne null sur erreur réseau (résilient)', async () => {
    mockGet.mockRejectedValueOnce(new Error('Network Error'));
    const result = await vehiclesApi.geocodeCoord(5.354, -4.008);
    expect(result).toBeNull();
  });
});
