/**
 * TrackYu Mobile - Alerts API
 */
import apiClient from './client';
import { normalizeError } from '../utils/errorTypes';

export interface Alert {
  id: string;
  type:
    | 'speed'
    | 'geofence'
    | 'fuel'
    | 'maintenance'
    | 'sos'
    | 'battery'
    | 'offline'
    | 'idle'
    | 'immobilization'
    | string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  /** Message personnalisé saisi par l'opérateur (champ `comment` en DB). Remplace le message par défaut si renseigné. */
  customMessage?: string;
  vehicleId: string;
  vehicleName: string;
  vehiclePlate: string;
  clientName?: string;
  groupName?: string;
  latitude?: number;
  longitude?: number;
  isRead: boolean;
  createdAt: string;
  // Statuts d'envoi des notifications
  pushSent?: boolean;
  emailSent?: boolean;
  smsSent?: boolean;
}

// ── Mapping type DB → type mobile ──────────────────────────────────────────
const TYPE_MAP: Record<string, Alert['type']> = {
  EXCESSIVE_IDLING: 'idle',
  IDLE: 'idle',
  IMMOBILIZATION: 'immobilization',
  SPEEDING: 'speed',
  SPEED: 'speed',
  OVER_SPEED: 'speed',
  GEOFENCE: 'geofence',
  GEOFENCE_ENTER: 'geofence',
  GEOFENCE_EXIT: 'geofence',
  FUEL_THEFT: 'fuel',
  FUEL_LOSS: 'fuel',
  FUEL: 'fuel',
  MAINTENANCE: 'maintenance',
  SOS: 'sos',
  PANIC: 'sos',
  BATTERY_LOW: 'battery',
  BATTERY: 'battery',
  OFFLINE: 'offline',
  DISCONNECT: 'offline',
  TAMPER: 'sos',
};

// ── Mapping severity DB → severity mobile ──────────────────────────────────
const SEVERITY_MAP: Record<string, Alert['severity']> = {
  CRITICAL: 'critical',
  HIGH: 'critical',
  MEDIUM: 'warning',
  WARNING: 'warning',
  LOW: 'info',
  INFO: 'info',
  NORMAL: 'info',
};

// ── i18n — locale actif (changeable via setAlertLocale) ───────────────────
let _locale = 'fr';
/** Appelé au démarrage depuis authStore/App après lecture de pref_language */
export function setAlertLocale(lang: string): void {
  _locale = lang.toLowerCase().startsWith('en') ? 'en' : 'fr';
}

// ── Libellés traduits par type ─────────────────────────────────────────────
const TYPE_LABEL_I18N: Record<string, Record<string, string>> = {
  fr: {
    idle: 'Ralenti excessif',
    immobilization: 'Immobilisation',
    speed: 'Excès de vitesse',
    geofence: 'Zone géographique',
    fuel: 'Carburant',
    maintenance: 'Maintenance',
    sos: 'SOS / Urgence',
    battery: 'Batterie faible',
    offline: 'Hors ligne',
    alert: 'Alerte',
  },
  en: {
    idle: 'Excessive idling',
    immobilization: 'Immobilization',
    speed: 'Speeding',
    geofence: 'Geofence',
    fuel: 'Fuel alert',
    maintenance: 'Maintenance',
    sos: 'SOS / Emergency',
    battery: 'Low battery',
    offline: 'Offline',
    alert: 'Alert',
  },
};

function tLabel(type: string): string {
  return (TYPE_LABEL_I18N[_locale] ?? TYPE_LABEL_I18N.fr)[type] ?? TYPE_LABEL_I18N.fr[type] ?? type;
}

// ── Statuts d'immobilisation traduits ─────────────────────────────────────
const IMMO_STATUS_I18N: Record<string, Record<string, string>> = {
  fr: { waiting: 'En attente', sent: 'Envoyé', success: 'Succès', failure: 'Échec', released: 'Débloqué' },
  en: { waiting: 'Pending', sent: 'Sent', success: 'Success', failure: 'Failed', released: 'Released' },
};
function tImmo(key: string): string {
  return (IMMO_STATUS_I18N[_locale] ?? IMMO_STATUS_I18N.fr)[key] ?? key;
}

// ── Inférer le type réel depuis le message (pour RULE_VIOLATION et types génériques) ─
function inferTypeFromMessage(msg: string): Alert['type'] {
  const m = msg.toLowerCase();
  if (m.includes('ralenti') || m.includes('idle') || m.includes('idling')) return 'idle';
  if (m.includes('immobil') || m.includes('relay')) return 'immobilization';
  if (m.includes('vitesse') || m.includes('speed') || m.includes('km/h')) return 'speed';
  if (m.includes('carburant') || m.includes('fuel')) return 'fuel';
  if (m.includes('géofence') || m.includes('geofence') || m.includes('zone')) return 'geofence';
  if (m.includes('maintenance') || m.includes('entretien')) return 'maintenance';
  if (m.includes('sos') || m.includes('panic') || m.includes('urgence')) return 'sos';
  if (m.includes('batterie') || m.includes('battery')) return 'battery';
  if (m.includes('hors ligne') || m.includes('offline') || m.includes('déconnect')) return 'offline';
  return 'idle'; // type le plus fréquent pour les règles automatiques
}

// ── Extraire le statut d'une alerte d'immobilisation depuis le message ─────
function parseImmobilizationStatus(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes('hors ligne') || m.includes('offline')) return tImmo('waiting');
  if (m.includes('commande envoy') || m.includes('sent') || m.includes('envoy')) return tImmo('sent');
  if (m.includes('success') || m.includes('succès') || m.includes('réussi')) return tImmo('success');
  if (m.includes('fail') || m.includes('échec') || m.includes('erreur')) return tImmo('failure');
  if (m.includes('released') || m.includes('débloqué') || m.includes('deimmob')) return tImmo('released');
  return '';
}

// ── Normalise un enregistrement brut (snake_case DB) → Alert camelCase ─────
function normalizeAlert(raw: Record<string, unknown>): Alert {
  const rawType = String(raw.type ?? '').toUpperCase();
  let mappedType: Alert['type'] = TYPE_MAP[rawType] ?? rawType.toLowerCase();
  // RULE_VIOLATION et types inconnus → inférence depuis le message
  if (mappedType === 'rule_violation' || !Object.values(TYPE_MAP).includes(mappedType as Alert['type'])) {
    mappedType = inferTypeFromMessage(String(raw.message ?? ''));
  }

  const rawSeverity = String(raw.severity ?? '').toUpperCase();
  const mappedSeverity: Alert['severity'] = SEVERITY_MAP[rawSeverity] ?? 'info';

  const plate = String(raw.vehicle_plate || raw.vehiclePlate || '').trim();
  const msg = String(raw.message ?? '');
  let baseTitle = String(raw.title || tLabel(mappedType) || rawType || tLabel('alert'));
  if (!raw.title) {
    if (mappedType === 'idle') {
      const match = msg.match(/>\s*(\d+)\s*(min|h|sec|s)/i) ?? msg.match(/(\d+)\s*(min|h|sec|s)/i);
      const duration = match ? ` ${match[1]} ${match[2]}` : '';
      baseTitle = `${plate ? plate + ' ' : ''}${tLabel('idle')}${duration}`;
    } else if (mappedType === 'immobilization') {
      const status = parseImmobilizationStatus(msg);
      baseTitle = `${plate ? plate + ' ' : ''}${tLabel('immobilization')}${status ? ' · ' + status : ''}`;
    } else {
      baseTitle = `${plate ? plate + ' ' : ''}${baseTitle}`;
    }
  }
  const title = baseTitle.slice(0, 80);

  // Message personnalisé défini à la création de l'alerte (champ custom_message en DB)
  const customMessage = String(raw.custom_message ?? raw.customMessage ?? '').trim() || undefined;

  return {
    id: String(raw.id ?? ''),
    type: mappedType,
    severity: mappedSeverity,
    title,
    message: String(raw.message ?? ''),
    vehicleId: String(raw.vehicle_id || raw.vehicleId || ''),
    vehicleName: String(raw.vehicle_name || raw.vehicleName || ''),
    vehiclePlate: String(raw.vehicle_plate || raw.vehiclePlate || ''),
    latitude: raw.latitude != null ? Number(raw.latitude) : undefined,
    longitude: raw.longitude != null ? Number(raw.longitude) : undefined,
    isRead: Boolean(raw.is_read ?? raw.isRead ?? false),
    createdAt: String(raw.created_at ?? raw.createdAt ?? new Date().toISOString()),
    customMessage,
    pushSent: Boolean(raw.push_sent ?? raw.pushSent ?? false),
    emailSent: Boolean(raw.email_sent ?? raw.emailSent ?? false),
    smsSent: Boolean(raw.sms_sent ?? raw.smsSent ?? false),
  };
}

export interface AlertsPage {
  data: Alert[];
  total: number;
  page: number;
  hasMore: boolean;
}

export const alertsApi = {
  /**
   * Get paginated alerts.
   * Backend /monitoring/alerts retourne : { alerts: Alert[], total: number, limit: number, offset: number }
   * On convertit page/limit → offset pour le backend.
   */
  async getPage(page = 1, limit = 20): Promise<AlertsPage> {
    try {
      const offset = (page - 1) * limit;
      const response = await apiClient.get('/monitoring/alerts', {
        params: { limit, offset },
      });
      const raw = response.data;
      // Format monitoring controller : { alerts, total, limit, offset }
      if (Array.isArray(raw?.alerts)) {
        const data = (raw.alerts as Record<string, unknown>[]).map(normalizeAlert);
        const hasMore = offset + data.length < (raw.total ?? 0);
        return { data, total: raw.total ?? 0, page, hasMore };
      }
      // Fallback : tableau brut
      if (Array.isArray(raw)) {
        return {
          data: (raw as Record<string, unknown>[]).map(normalizeAlert),
          total: raw.length,
          page,
          hasMore: false,
        };
      }
      return { data: [], total: 0, page, hasMore: false };
    } catch (error) {
      throw normalizeError(error);
    }
  },

  async getAll(): Promise<Alert[]> {
    try {
      const response = await apiClient.get('/monitoring/alerts', {
        params: { limit: 500, offset: 0 },
      });
      const raw = response.data;
      if (Array.isArray(raw?.alerts)) return (raw.alerts as Record<string, unknown>[]).map(normalizeAlert);
      if (Array.isArray(raw)) return (raw as Record<string, unknown>[]).map(normalizeAlert);
      return [];
    } catch (error) {
      throw normalizeError(error);
    }
  },

  async getUnreadCount(): Promise<number> {
    try {
      const response = await apiClient.get('/monitoring/alerts', {
        params: { isRead: false, limit: 500, offset: 0 },
      });
      const raw = response.data;
      const rawList = Array.isArray(raw?.alerts) ? raw.alerts : Array.isArray(raw) ? raw : [];
      const list: Alert[] = (rawList as Record<string, unknown>[]).map(normalizeAlert);
      return list.filter((a) => !a.isRead).length;
    } catch {
      return 0;
    }
  },

  async markAsRead(id: string): Promise<void> {
    try {
      await apiClient.put(`/monitoring/alerts/${id}/read`);
    } catch (error) {
      throw normalizeError(error);
    }
  },

  async markAllAsRead(): Promise<void> {
    try {
      await apiClient.put('/monitoring/alerts/read-all');
    } catch (error) {
      throw normalizeError(error);
    }
  },
};

export default alertsApi;
