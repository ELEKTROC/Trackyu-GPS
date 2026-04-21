/**
 * TrackYu Mobile — Interventions API
 * Aligne avec /api/tech/interventions (backend/src/routes/techRoutes.ts)
 */
import apiClient from './client';
import { normalizeError } from '../utils/errorTypes';

/** Types d'intervention — alignés sur intervention_type_configs en DB */
export type InterventionType =
  | 'INSTALLATION'
  | 'DEPANNAGE'
  | 'REMPLACEMENT'
  | 'RETRAIT'
  | 'REINSTALLATION'
  | 'TRANSFERT'
  | (string & {}); // open union pour types futurs

/** Natures — chargées dynamiquement via techSettingsApi.getNatures() */
export type InterventionNature = string;

export type InterventionStatus =
  | 'PENDING'
  | 'SCHEDULED'
  | 'EN_ROUTE'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'POSTPONED';

export interface Intervention {
  id: string;
  tenantId: string;
  clientId: string;
  clientName?: string;
  resellerName?: string;
  technicianId: string;
  ticketId?: string;
  ticketTitle?: string;
  contractId?: string;
  type: InterventionType;
  nature: InterventionNature;
  status: InterventionStatus;
  scheduledDate: string; // ISO — champ officiel (pas scheduledAt)
  startTime?: string;
  enRouteTime?: string;
  endTime?: string;
  duration: number; // minutes
  location: string;
  address?: string;
  contactName?: string;
  contactPhone?: string;

  // Véhicule
  vehicleId?: string;
  vehicleName?: string;
  licensePlate?: string;
  wwPlate?: string;
  tempPlate?: string;
  vin?: string;
  vehicleType?: string;
  vehicleBrand?: string;
  vehicleModel?: string;
  vehicleYear?: string;
  vehicleColor?: string;
  vehicleMileage?: number;
  engineHours?: number;

  // Check-up véhicule (aligné types/tech.ts)
  checkStart?: boolean;
  checkLights?: boolean;
  checkDashboard?: boolean;
  checkAC?: boolean;
  checkAudio?: boolean;
  checkBattery?: boolean;
  observations?: string;

  // Technique
  imei?: string;
  sim?: string; // champ canonique backend (PUT) — alias simCard conservé pour rétro-compat
  simCard?: string; // retourné par le GET (legacy), mappé vers sim au PUT
  iccid?: string;
  sensorSerial?: string;
  deviceLocation?: string;
  beaconType?: string;
  macAddress?: string;
  fuelSensorType?: 'CANBUS' | 'CAPACITIVE' | 'ULTRASONIC'; // champ canonique backend
  probeType?: 'CANBUS' | 'CAPACITIVE' | 'ULTRASONIC' | string; // legacy GET
  material?: string[];

  // Remplacement / Transfert
  newSim?: string;
  newImei?: string;
  oldDeviceImei?: string;
  oldSimId?: string;
  removedMaterialStatus?: 'FUNCTIONAL' | 'FAULTY' | 'DAMAGED' | 'UNKNOWN';

  // Facturation
  notes?: string;
  description?: string; // alias de notes (rétro-compat)
  cost?: number;
  invoiceId?: string;
  invoiceItems?: { id?: string; description: string; quantity: number; unitPrice: number }[];
  updateContract?: boolean;
  generateInvoice?: boolean;
  removeFromContract?: boolean;
  contractRemovalReason?: string;

  // Clôture
  signatureTech?: string; // base64 — obligatoire pour COMPLETED
  signatureClient?: string; // base64 — obligatoire pour COMPLETED
  clientSignatureName?: string;
  photos?: string[];

  // Remplacement / Retrait étendu
  newGaugeSerial?: string;

  // Jauge carburant
  tankCapacity?: number;
  tankHeight?: number;
  tankWidth?: number;
  tankLength?: number;
  tankShape?: 'RECTANGULAR' | 'CYLINDRICAL_H' | 'CYLINDRICAL_V' | 'L_SHAPE' | 'D_SHAPE';
  calibrationTable?: string;
  refillThreshold?: number;
  theftThreshold?: number;
  gaugeVoltage?: string;
  gaugeBrand?: string;
  gaugeModel?: string;
  gaugeSerial?: string;
  gaugeTest?: 'OK' | 'NOK';

  // Contact sur site
  siteContactName?: string;
  siteContactPhone?: string;

  // Config nature (issu du JOIN intervention_nature_configs)
  /** Champs obligatoires définis par la config DB : "imei" | "iccid" | "sensor_serial" | "odometer" | "tank_capacity" */
  requiredFields?: string[];
  /** Impact stock défini par la config DB */
  stockImpact?: { action: 'IN' | 'OUT' | 'SWAP' | 'TRANSFER'; items: string[] };

  createdAt: string;
}

export interface InterventionsPage {
  data: Intervention[];
  total: number;
  page: number;
  hasMore: boolean;
}

// Format réel retourné par GET /tech/interventions/stats
export interface InterventionStats {
  byStatus: { status: InterventionStatus; count: string }[];
  byType?: { type: InterventionType; count: string; avg_duration: string }[];
  byNature?: { nature: string; count: string }[];
  byTechnician?: { id: string; name: string; total_interventions: string; completed: string }[];
  avgCompletionHours?: number;
  totalCost?: number;
  avgCost?: number;
}

/** Extrait un nombre depuis byStatus */
export function countByStatus(stats: InterventionStats | undefined, ...statuses: InterventionStatus[]): number {
  if (!stats?.byStatus) return 0;
  return stats.byStatus
    .filter((s) => statuses.includes(s.status as InterventionStatus))
    .reduce((sum, s) => sum + parseInt(s.count, 10), 0);
}

export const STATUS_LABELS: Record<InterventionStatus, string> = {
  PENDING: 'À planifier',
  SCHEDULED: 'Planifié',
  EN_ROUTE: 'En route',
  IN_PROGRESS: 'En cours',
  COMPLETED: 'Terminé',
  CANCELLED: 'Annulé',
  POSTPONED: 'Reportée',
};

export const STATUS_COLORS: Record<InterventionStatus, string> = {
  PENDING: '#F59E0B',
  SCHEDULED: '#3B82F6',
  EN_ROUTE: '#8B5CF6',
  IN_PROGRESS: '#06B6D4',
  COMPLETED: '#22C55E',
  CANCELLED: '#EF4444',
  POSTPONED: '#F97316',
};

/** @deprecated Utiliser i.nature directement — le label DB est déjà le bon */
export const NATURE_LABELS: Record<string, string> = {};

// ── snake_case → camelCase normalizer ────────────────────────────────────────
// Le backend retourne les champs en snake_case (PostgreSQL). La mobile attend
// du camelCase conforme à l'interface Intervention.

const FIELD_MAP: Record<string, string> = {
  scheduled_date: 'scheduledDate',
  client_id: 'clientId',
  client_name: 'clientName',
  reseller_name: 'resellerName',
  client_email: 'clientEmail',
  client_phone: 'clientPhone',
  vehicle_id: 'vehicleId',
  vehicle_name: 'vehicleName',
  vehicle_plate: 'licensePlate', // alias JOIN findById : v.license_plate AS vehicle_plate
  license_plate: 'licensePlate',
  ww_plate: 'wwPlate',
  temp_plate: 'tempPlate',
  vehicle_brand: 'vehicleBrand',
  vehicle_brand_name: 'vehicleBrand',
  vehicle_model: 'vehicleModel',
  vehicle_model_name: 'vehicleModel',
  vehicle_year: 'vehicleYear',
  vehicle_color: 'vehicleColor',
  vehicle_mileage: 'vehicleMileage',
  vehicle_type: 'vehicleType',
  technician_id: 'technicianId',
  technician_name: 'technicianName',
  tenant_id: 'tenantId',
  ticket_id: 'ticketId',
  ticket_title: 'ticketTitle',
  contract_id: 'contractId',
  start_time: 'startTime',
  end_time: 'endTime',
  en_route_time: 'enRouteTime',
  contact_name: 'contactName',
  contact_phone: 'contactPhone',
  site_contact_name: 'siteContactName',
  site_contact_phone: 'siteContactPhone',
  device_location: 'deviceLocation',
  fuel_sensor_type: 'fuelSensorType',
  probe_type: 'probeType',
  sim_card: 'simCard',
  sensor_serial: 'sensorSerial',
  beacon_type: 'beaconType',
  mac_address: 'macAddress',
  new_sim: 'newSim',
  new_imei: 'newImei',
  old_device_imei: 'oldDeviceImei',
  old_sim_id: 'oldSimId',
  removed_material_status: 'removedMaterialStatus',
  invoice_id: 'invoiceId',
  invoice_items: 'invoiceItems',
  update_contract: 'updateContract',
  generate_invoice: 'generateInvoice',
  remove_from_contract: 'removeFromContract',
  contract_removal_reason: 'contractRemovalReason',
  signature_tech: 'signatureTech',
  signature_client: 'signatureClient',
  client_signature_name: 'clientSignatureName',
  engine_hours: 'engineHours',
  tank_capacity: 'tankCapacity',
  tank_height: 'tankHeight',
  tank_width: 'tankWidth',
  tank_length: 'tankLength',
  tank_shape: 'tankShape',
  calibration_table: 'calibrationTable',
  refill_threshold: 'refillThreshold',
  theft_threshold: 'theftThreshold',
  gauge_voltage: 'gaugeVoltage',
  gauge_brand: 'gaugeBrand',
  gauge_model: 'gaugeModel',
  gauge_serial: 'gaugeSerial',
  gauge_test: 'gaugeTest',
  new_gauge_serial: 'newGaugeSerial',
  created_at: 'createdAt',
  required_fields: 'requiredFields',
  stock_impact: 'stockImpact',
  // Check-up véhicule (champs snake_case PostgreSQL)
  check_start: 'checkStart',
  check_lights: 'checkLights',
  check_dashboard: 'checkDashboard',
  check_ac: 'checkAC',
  check_audio: 'checkAudio',
  check_battery: 'checkBattery',
};

function normalizeIntervention(raw: Record<string, unknown>): Intervention {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    const mapped = FIELD_MAP[k] ?? k;
    out[mapped] = v;
  }
  return out as unknown as Intervention;
}

// ─────────────────────────────────────────────────────────────────────────────

const interventionsApi = {
  getPage: async (params?: { technicianId?: string; page?: number; limit?: number }): Promise<InterventionsPage> => {
    try {
      const { technicianId, page = 1, limit = 20 } = params ?? {};
      const res = await apiClient.get('/tech/interventions', {
        params: { technicianId, page, limit },
      });
      const raw = res.data;
      if (Array.isArray(raw)) {
        return { data: raw.map(normalizeIntervention), total: raw.length, page, hasMore: false };
      }
      return {
        data: Array.isArray(raw?.data) ? raw.data.map(normalizeIntervention) : [],
        total: raw?.total ?? 0,
        page: raw?.page ?? page,
        hasMore: raw?.hasMore ?? false,
      };
    } catch (error) {
      throw normalizeError(error);
    }
  },

  getAll: async (params?: { technicianId?: string }): Promise<Intervention[]> => {
    try {
      const res = await apiClient.get('/tech/interventions', {
        params: params?.technicianId ? { technicianId: params.technicianId } : undefined,
      });
      const list = Array.isArray(res.data) ? res.data : [];
      return list.map(normalizeIntervention);
    } catch (error) {
      throw normalizeError(error);
    }
  },

  getById: async (id: string): Promise<Intervention> => {
    try {
      const res = await apiClient.get(`/tech/interventions/${id}`);
      return normalizeIntervention(res.data as Record<string, unknown>);
    } catch (error) {
      throw normalizeError(error);
    }
  },

  getStats: async (): Promise<InterventionStats> => {
    try {
      const res = await apiClient.get('/tech/interventions/stats');
      return res.data;
    } catch (error) {
      throw normalizeError(error);
    }
  },

  /**
   * Crée une intervention (POST /tech/interventions).
   * Champs obligatoires : clientId, type. ticketId requis uniquement si créé depuis un ticket.
   */
  create: async (data: {
    ticketId?: string | null;
    clientId: string;
    type: InterventionType;
    vehicleId?: string | null;
    technicianId?: string | null;
    nature?: string | null;
    scheduledDate?: string | null;
    address?: string | null;
    notes?: string | null;
    status?: InterventionStatus;
  }): Promise<Intervention> => {
    if (!data.clientId?.trim()) throw new Error('clientId requis');
    try {
      const res = await apiClient.post('/tech/interventions', {
        status: 'PENDING',
        ...data,
      });
      return normalizeIntervention(res.data as Record<string, unknown>);
    } catch (error) {
      throw normalizeError(error);
    }
  },

  update: async (id: string, data: Partial<Intervention>): Promise<Intervention> => {
    try {
      const res = await apiClient.put(`/tech/interventions/${id}`, data);
      return normalizeIntervention(res.data as Record<string, unknown>);
    } catch (error) {
      throw normalizeError(error);
    }
  },

  updateStatus: async (id: string, status: InterventionStatus): Promise<Intervention> => {
    const timestamps: Partial<Intervention> = { status };
    if (status === 'EN_ROUTE') timestamps.enRouteTime = new Date().toISOString();
    if (status === 'IN_PROGRESS') timestamps.startTime = new Date().toISOString();
    if (status === 'COMPLETED') timestamps.endTime = new Date().toISOString();
    return interventionsApi.update(id, timestamps);
  },

  /** DELETE /tech/interventions/:id */
  deleteIntervention: async (id: string): Promise<void> => {
    try {
      await apiClient.delete(`/tech/interventions/${id}`);
    } catch (error) {
      throw normalizeError(error);
    }
  },
};

export default interventionsApi;
