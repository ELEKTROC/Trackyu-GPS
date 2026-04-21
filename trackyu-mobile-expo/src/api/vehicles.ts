/**
 * TrackYu Mobile - Vehicles API
 *
 * Le backend retourne :
 *   location: { lat, lng } | undefined   (pas latitude/longitude à plat)
 *   status: 'MOVING' | 'IDLE' | 'STOPPED' | 'OFFLINE'  (majuscules)
 *   lastUpdated (pas lastUpdate)
 *
 * normalizeVehicle() fait le mapping avant de passer les données aux composants.
 */
import apiClient from './client';
import { normalizeError } from '../utils/errorTypes';

// ── Type renvoyé par le backend ───────────────────────────────────────────────
interface RawVehicle {
  id: string;
  name: string;
  plate: string;
  // type peut venir sous plusieurs clés selon la source
  type?: string;
  vehicle_type?: string;
  vehicleType?: string;
  status?: string;
  // Position — trois formats possibles (API REST / SQL flat / WebSocket flat)
  location?: { lat: number; lng: number };
  location_lat?: number; // format SQL query flat
  location_lng?: number;
  latitude?: number; // format WebSocket flat
  longitude?: number;
  heading?: number;
  speed?: number;
  // Timestamps
  last_updated?: string; // format SQL
  lastUpdated?: string; // format WS/legacy
  lastUpdate?: string;
  // Télémetrie
  fuel_level?: number;
  fuelLevel?: number;
  battery_voltage?: number;
  batteryVoltage?: number;
  mileage?: number;
  is_immobilized?: boolean;
  isImmobilized?: boolean;
  ignition?: boolean;
  address?: string;
  // Nommage (SQL snake_case)
  brand?: string;
  model?: string;
  vin?: string;
  imei?: string;
  driver_name?: string;
  driverName?: string;
  client_id?: string;
  client_name?: string;
  clientName?: string;
  group_name?: string;
  groupName?: string;
  reseller_name?: string;
  resellerName?: string;
  // Enrichis backend
  days_until_expiration?: number;
  daysUntilExpiration?: number;
  alerts_count?: number;
  alertsCount?: number;
  is_panne?: boolean;
  isPanne?: boolean;
  sim_phone_number?: string;
  simPhoneNumber?: string;
  install_date?: string;
  installDate?: string;
  tank_capacity?: number;
  tankCapacity?: number;
  fuel_sensor_type?: string;
  fuelSensorType?: string;
  fuel_type?: string;
  fuelType?: string;
  theoretical_consumption?: number;
  theoreticalConsumption?: number;
  [key: string]: unknown;
}

// ── Type utilisé dans l'app mobile ───────────────────────────────────────────
export interface Vehicle {
  id: string;
  name: string;
  plate: string;
  type: string;
  status: 'moving' | 'idle' | 'stopped' | 'offline';
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  lastUpdate: string;
  fuelLevel?: number;
  battery?: number;
  odometer?: number;
  isImmobilized?: boolean;
  brand?: string;
  model?: string;
  vin?: string;
  imei?: string;
  driverName?: string;
  driverPhone?: string;
  clientId?: string;
  clientName?: string;
  groupName?: string;
  resellerName?: string;
  // Champs télémétriques complémentaires
  ignition?: boolean;
  engineHours?: number;
  temperature?: number; // Température moteur (°C) — capteur optionnel
  batteryLevel?: number; // Niveau batterie auxiliaire (%) — capteur optionnel
  engineTemp?: number; // Température moteur alternative (°C)
  humidity?: number; // Humidité relative (%) — capteurs cargo
  rpm?: number; // Tours/minute moteur
  // Champs véhicule complémentaires (non toujours renseignés)
  year?: number;
  color?: string;
  // Champs optionnels legacy
  fuel?: number; // alias de fuelLevel (compatibilité)
  address?: string; // adresse géocodée inverse (optionnelle)
  driver?: { id?: string; name?: string; phone?: string };
  // Champs enrichis (disponibles si backend les expose)
  alertsCount?: number;
  daysUntilExpiration?: number;
  isPanne?: boolean;
  simPhoneNumber?: string;
  installDate?: string;
  tankCapacity?: number;
  fuelSensorType?: string;
  fuelType?: string;
  theoreticalConsumption?: number;
  mileage?: number;
}

export interface DayStats {
  date: string;
  tripsCount: number;
  totalDistance: number;
  maxSpeed: number;
  avgSpeed: number;
  drivingSeconds: number;
  stoppedSeconds: number;
  idleSeconds: number;
  offlineSeconds: number;
}

export interface FuelStats {
  avgConsumption: number;
  totalConsumption: number;
  totalRefillVolume: number;
  totalTheftVolume: number;
  refillCount: number;
  theftCount: number;
  tankCapacity: number | null;
  fuelType: string | null;
}

export interface VehicleAlert {
  id: string;
  type: string;
  severity: string;
  message: string;
  created_at: string;
  plate?: string;
  latitude?: number | null;
  longitude?: number | null;
  triggered_by?: string;
  user_name?: string;
  success?: boolean;
}

export interface FuelEvent {
  timestamp: string;
  level: number;
  type: 'normal' | 'refill' | 'theft';
  volume?: number;
}

export interface VehicleSubscriptionInfo {
  subscriptionNumber?: string | null;
  contractNumber?: string | null;
  branch?: string | null;
  clientName?: string | null;
  expirationDate?: string | null;
  status?: string | null;
  // Impayés liés au véhicule (exposés par /fleet/vehicles/:id/subscription)
  unpaidCount?: number | null;
  unpaidAmount?: number | null;
  unpaidCurrency?: string | null;
}

export interface VehicleStats {
  totalDistance: number;
  totalDuration: number;
  fuelConsumed: number;
  maxSpeed: number;
  avgSpeed: number;
}

export interface UpdateVehicleRequest {
  name?: string;
  plate?: string;
  type?: string;
  brand?: string;
  model?: string;
  year?: number;
  color?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
}

/** Trajet calculé serveur-side (table trips) */
export interface Trip {
  id: string;
  object_id: string;
  start_time: string;
  end_time: string | null;
  duration_seconds: number | null;
  start_lat: number | null;
  start_lng: number | null;
  start_address: string | null;
  end_lat: number | null;
  end_lng: number | null;
  end_address: string | null;
  distance_km: number | null;
  max_speed_kmh: number | null;
  avg_speed_kmh: number | null;
  positions_count: number | null;
  status: string | null;
  driver_name: string | null;
}

/** Réponse paginée de GET /fleet/vehicles?limit=&offset= */
export interface VehiclePage {
  data: Vehicle[];
  total: number;
  limit: number;
  offset: number;
}

/** Marqueur léger pour la carte viewport (findInBounds) */
export interface MapMarker {
  id: string;
  name: string;
  plate: string;
  type: string;
  status: Vehicle['status'];
  lat: number;
  lng: number;
  speed: number;
  lastUpdate: string;
  // Champs pour recherche / filtrage avancé
  imei?: string;
  clientName?: string;
  groupName?: string;
  simPhoneNumber?: string;
  /** true = position GPS réelle connue, false = affiché au Golfe de Guinée (0,0) */
  hasGps?: boolean;
  resellerName?: string;
}

export interface FleetAnalytics {
  period: string;
  tripStatistics: {
    totalTrips: number;
    totalDistance: number;
    avgTripDistance: number;
    avgMaxSpeed: number;
  };
  fuelEfficiency: {
    avgConsumptionPer100km: number | null;
  } | null;
  utilization: {
    active_vehicles: string;
    total_vehicles: string;
  } | null;
}

// ── Mapping backend → app ─────────────────────────────────────────────────────

/** Dictionnaire de normalisation des statuts — partagé entre normalizeVehicle et getFleetMap */
export const STATUS_MAP: Record<string, Vehicle['status']> = {
  MOVING: 'moving',
  moving: 'moving',
  IDLE: 'idle',
  idle: 'idle',
  EXCESSIVE_IDLING: 'idle',
  STOPPED: 'stopped',
  stopped: 'stopped',
  OFFLINE: 'offline',
  offline: 'offline',
};

/** Normalise un objet Vehicle brut provenant du WebSocket (statut peut être en majuscules) */
export function normalizeVehicleWS(raw: Record<string, unknown>): Vehicle {
  return normalizeVehicle(raw as RawVehicle);
}

function normalizeVehicle(raw: RawVehicle): Vehicle {
  return {
    id: raw.id,
    name: raw.name ?? '–',
    plate: raw.plate ?? '–',
    type: raw.vehicle_type ?? raw.vehicleType ?? raw.type ?? 'unknown',
    status: STATUS_MAP[raw.status ?? ''] ?? 'offline',
    latitude: raw.location?.lat ?? raw.location_lat ?? (raw as any).last_lat ?? (raw as any).lat ?? raw.latitude ?? 0,
    longitude: raw.location?.lng ?? raw.location_lng ?? (raw as any).last_lng ?? (raw as any).lng ?? raw.longitude ?? 0,
    speed: raw.speed ?? 0,
    heading: raw.heading ?? 0,
    lastUpdate: raw.last_updated ?? raw.lastUpdated ?? raw.lastUpdate ?? new Date().toISOString(),
    fuelLevel: raw.fuel_level ?? raw.fuelLevel,
    battery: raw.battery_voltage ?? raw.batteryVoltage,
    odometer: raw.mileage,
    isImmobilized: raw.is_immobilized ?? raw.isImmobilized,
    brand: raw.brand,
    model: raw.model,
    vin: raw.vin,
    imei: raw.imei,
    driverName: raw.driver_name ?? raw.driverName,
    clientId: raw.client_id,
    clientName: raw.client_name ?? raw.clientName,
    groupName: raw.group_name ?? raw.groupName,
    resellerName: raw.reseller_name ?? raw.resellerName,
    ignition: raw.ignition,
    address: raw.address,
    alertsCount: raw.alerts_count ?? raw.alertsCount,
    daysUntilExpiration: raw.days_until_expiration ?? raw.daysUntilExpiration,
    isPanne: raw.is_panne ?? raw.isPanne,
    simPhoneNumber: raw.sim_phone_number ?? raw.simPhoneNumber,
    installDate: raw.install_date ?? raw.installDate,
    tankCapacity: raw.tank_capacity ?? raw.tankCapacity,
    fuelSensorType: raw.fuel_sensor_type ?? raw.fuelSensorType,
    fuelType: raw.fuel_type ?? raw.fuelType,
    theoreticalConsumption: raw.theoretical_consumption ?? raw.theoreticalConsumption,
    mileage: raw.mileage,
  };
}

// ── API ───────────────────────────────────────────────────────────────────────
export const vehiclesApi = {
  async getAll(): Promise<Vehicle[]> {
    const BATCH = 500;
    let offset = 0;
    let total = Infinity;
    const all: Vehicle[] = [];

    try {
      while (all.length < total) {
        const response = await apiClient.get<
          { data: RawVehicle[]; total: number; limit: number; offset: number } | RawVehicle[]
        >('/fleet/vehicles', { params: { limit: BATCH, offset } });

        let page: RawVehicle[];
        let pageTotal: number;

        if (Array.isArray(response.data)) {
          // Backend renvoie un tableau nu (sans pagination) → tout est là
          page = response.data;
          pageTotal = response.data.length;
        } else if (!response.data) {
          break; // null / undefined — rien à paginer
        } else {
          page = response.data.data ?? [];
          pageTotal = response.data.total ?? page.length;
        }

        all.push(...page.map(normalizeVehicle));
        total = pageTotal;
        offset += BATCH;
        if (page.length < BATCH) break; // dernière page incomplète
      }
      return all;
    } catch (error) {
      throw normalizeError(error);
    }
  },

  async getById(id: string): Promise<Vehicle> {
    try {
      const response = await apiClient.get<RawVehicle>(`/fleet/vehicles/${id}`);
      return normalizeVehicle(response.data);
    } catch (error) {
      throw normalizeError(error);
    }
  },

  async getStats(id: string): Promise<VehicleStats> {
    try {
      const response = await apiClient.get<VehicleStats>(`/fleet/vehicles/${id}/stats`);
      return response.data;
    } catch (error) {
      throw normalizeError(error);
    }
  },

  async getTrips(vehicleId: string, date: string, explicitEndDate?: string): Promise<Trip[]> {
    try {
      const startDate = date;
      const endDate = explicitEndDate ?? `${date}T23:59:59`;
      const response = await apiClient.get<Trip[]>(`/fleet/vehicles/${vehicleId}/trips`, {
        params: { startDate, endDate },
      });
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      throw normalizeError(error);
    }
  },

  async getFleetAnalytics(
    period: '7d' | '30d' | '90d' | 'custom' = '30d',
    startDate?: string,
    endDate?: string
  ): Promise<FleetAnalytics> {
    try {
      const params: Record<string, string> =
        period === 'custom' && startDate && endDate ? { startDate, endDate } : { period };
      const response = await apiClient.get<FleetAnalytics>('/fleet/analytics', { params });
      return response.data;
    } catch (error) {
      throw normalizeError(error);
    }
  },

  async getDayStats(id: string, date: string): Promise<DayStats> {
    try {
      const response = await apiClient.get<DayStats>(`/fleet/vehicles/${id}/day-stats`, { params: { date } });
      return response.data;
    } catch (error) {
      throw normalizeError(error);
    }
  },

  async getFuelStats(id: string): Promise<FuelStats> {
    try {
      const response = await apiClient.get<FuelStats>(`/fleet/vehicles/${id}/fuel-stats`);
      return response.data;
    } catch (error) {
      throw normalizeError(error);
    }
  },

  async toggleImmobilize(
    id: string,
    immobilize: boolean,
    method: 'tcp' | 'sms' = 'tcp'
  ): Promise<{ vehicle: Vehicle; deviceConnected: boolean; method: string; commandError?: string }> {
    try {
      const response = await apiClient.post<{
        object: RawVehicle;
        deviceConnected: boolean;
        method: string;
        commandError?: string;
      }>(`/fleet/vehicles/${id}/immobilize`, { immobilize, method });
      return {
        vehicle: normalizeVehicle(response.data.object),
        deviceConnected: response.data.deviceConnected ?? false,
        method: response.data.method,
        commandError: response.data.commandError,
      };
    } catch (error) {
      throw normalizeError(error);
    }
  },

  async getAlerts(
    id: string,
    limit = 50,
    type?: string,
    startDate?: string,
    endDate?: string
  ): Promise<VehicleAlert[]> {
    try {
      const params: Record<string, string | number> = { limit };
      if (type) params.type = type;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const response = await apiClient.get<VehicleAlert[]>(`/fleet/vehicles/${id}/alerts`, { params });
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      throw normalizeError(error);
    }
  },

  async getFuelHistory(id: string, startDate: string, endDate: string): Promise<FuelEvent[]> {
    try {
      const response = await apiClient.get<FuelEvent[]>(`/fleet/vehicles/${id}/fuel-events`, {
        params: { startDate, endDate },
      });
      return Array.isArray(response.data) ? response.data : [];
    } catch {
      return [];
    }
  },

  async getVehicleSubscription(id: string): Promise<VehicleSubscriptionInfo | null> {
    try {
      const response = await apiClient.get<VehicleSubscriptionInfo>(`/fleet/vehicles/${id}/subscription`);
      return response.data ?? null;
    } catch {
      return null;
    }
  },

  async togglePanne(id: string, isPanne: boolean): Promise<Vehicle> {
    try {
      const response = await apiClient.post<{ object: RawVehicle }>(`/fleet/vehicles/${id}/panne`, { isPanne });
      return normalizeVehicle(response.data.object);
    } catch (error) {
      throw normalizeError(error);
    }
  },

  async getHistory(
    id: string,
    date: string,
    startTime?: string,
    endTime?: string
  ): Promise<
    {
      latitude: number;
      longitude: number;
      timestamp: string;
      speed?: number;
      heading?: number;
      ignition?: boolean | null;
    }[]
  > {
    try {
      const params: Record<string, string> = startTime && endTime ? { startTime, endTime } : { date };
      const response = await apiClient.get<
        Array<{
          lat?: number;
          lng?: number;
          latitude?: number;
          longitude?: number;
          time?: string;
          timestamp?: string;
          speed?: number;
          heading?: number;
          ignition?: boolean | null;
        }>
      >(`/fleet/vehicles/${id}/history/snapped`, { params });
      const data = Array.isArray(response.data) ? response.data : [];
      return data.map((p) => ({
        latitude: p.lat ?? p.latitude ?? 0,
        longitude: p.lng ?? p.longitude ?? 0,
        timestamp: p.time ?? p.timestamp ?? '',
        speed: p.speed,
        heading: p.heading,
        ignition: p.ignition ?? null,
      }));
    } catch (error) {
      throw normalizeError(error);
    }
  },

  async getDailyRange(
    id: string,
    startDate: string,
    endDate: string
  ): Promise<{ date: string; tripsCount: number; totalDistance: number }[]> {
    try {
      const response = await apiClient.get<{ date: string; tripsCount: number; totalDistance: number }[]>(
        `/fleet/vehicles/${id}/daily-range`,
        { params: { startDate, endDate } }
      );
      return Array.isArray(response.data) ? response.data : [];
    } catch {
      return [];
    }
  },

  /**
   * Pagination serveur — appelé par FleetScreen useInfiniteQuery.
   * Le backend supporte limit / offset / q / status / groupId.
   * Réponse attendue : { data: RawVehicle[], total: number, limit: number, offset: number }
   * Fallback : si le backend retourne un tableau nu, on l'encapsule.
   */
  async getPage(
    filters: { status?: string; q?: string; groupId?: string; filterClientId?: string } = {},
    offset = 0,
    limit = 50
  ): Promise<VehiclePage> {
    try {
      const params: Record<string, string | number> = { limit, offset };
      if (filters.status) params.status = filters.status;
      if (filters.q) params.q = filters.q;
      if (filters.groupId) params.groupId = filters.groupId;
      if (filters.filterClientId) params.filter_client_id = filters.filterClientId;

      const response = await apiClient.get<
        { data: RawVehicle[]; total: number; limit: number; offset: number } | RawVehicle[]
      >('/fleet/vehicles', { params });

      // Gestion des deux formats de réponse (paginé vs tableau nu)
      if (Array.isArray(response.data)) {
        const vehicles = response.data.map(normalizeVehicle);
        return { data: vehicles, total: vehicles.length, limit, offset };
      }
      return {
        data: response.data.data.map(normalizeVehicle),
        total: response.data.total,
        limit: response.data.limit ?? limit,
        offset: response.data.offset ?? offset,
      };
    } catch (error) {
      throw normalizeError(error);
    }
  },

  /**
   * Endpoint viewport — appelé par MapScreen.
   * Retourne uniquement les marqueurs visibles dans le bounding box courant.
   * Beaucoup plus léger que getAll() à grande échelle.
   */
  async getFleetMap(swLat: number, swLng: number, neLat: number, neLng: number): Promise<MapMarker[]> {
    try {
      const response = await apiClient.get<{
        data: Array<{
          id: string;
          name: string;
          plate: string;
          type?: string;
          vehicle_type?: string;
          status?: string;
          lat: number;
          lng: number;
          speed?: number;
          last_update?: string;
        }>;
        total: number;
      }>('/fleet/vehicles/map', {
        params: { swLat, swLng, neLat, neLng },
      });

      return (response.data.data ?? []).map((v) => ({
        id: v.id,
        name: v.name ?? '–',
        plate: v.plate ?? '–',
        type: v.type ?? v.vehicle_type ?? '',
        status: STATUS_MAP[v.status ?? ''] ?? 'offline',
        lat: v.lat,
        lng: v.lng,
        speed: v.speed ?? 0,
        lastUpdate: v.last_update ?? new Date().toISOString(),
      }));
    } catch (error) {
      throw normalizeError(error);
    }
  },

  async geocodeCoord(lat: number, lng: number): Promise<string | null> {
    try {
      const response = await apiClient.get<{ address: string | null }>('/fleet/geocode', { params: { lat, lng } });
      return response.data.address ?? null;
    } catch {
      return null;
    }
  },

  async update(
    id: string,
    data: Partial<
      Pick<Vehicle, 'name' | 'plate' | 'driverName' | 'groupName'> & { driverId?: string; groupId?: string }
    >
  ): Promise<void> {
    await apiClient.put(`/objects/${id}`, data);
  },

  /** PUT /fleet/vehicles/:id — édition infos administratives (EDIT_VEHICLES) */
  async updateVehicle(id: string, data: UpdateVehicleRequest): Promise<Vehicle> {
    try {
      const res = await apiClient.put<RawVehicle>(`/fleet/vehicles/${id}`, data);
      return normalizeVehicle(res.data);
    } catch (error) {
      throw normalizeError(error);
    }
  },
};

export default vehiclesApi;
