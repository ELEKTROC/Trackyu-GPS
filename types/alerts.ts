// types/alerts.ts — Alerts, anomalies, alert configuration

// Types d'alertes système
export type AlertType =
  | 'SPEEDING' // Excès de vitesse
  | 'GEOFENCE' // Entrée/Sortie zone
  | 'FUEL_LEVEL' // Niveau carburant bas
  | 'FUEL_THEFT' // Vol de carburant
  | 'FUEL_SUSPECT_LOSS' // Perte carburant suspecte (monitoring)
  | 'MAINTENANCE' // Alerte maintenance
  | 'SOS' // Bouton SOS
  | 'IGNITION' // Allumage/Extinction
  | 'IDLING' // Ralenti excessif
  | 'LONG_IDLE' // Ralenti prolongé (monitoring)
  | 'BATTERY' // Batterie faible (véhicule ou GPS)
  | 'BATTERY_LOW' // Batterie boîtier < 20 %
  | 'TOWING' // Remorquage détecté
  | 'JAMMING' // Brouillage GPS
  | 'OFFLINE' // Perte de signal (status)
  | 'COMMUNICATION_LOST' // Communication perdue > 5 min (monitoring)
  | 'GPS_JUMP' // Saut GPS détecté
  | 'POWER_CUT' // Coupure alimentation
  | 'HARSH_BRAKING' // Freinage brusque
  | 'HARSH_ACCEL' // Accélération brusque
  | 'SHARP_TURN' // Virage brusque
  | 'TAMPERING' // Sabotage/Vibration
  | 'CRASH' // Détection accident
  | 'IMMOBILIZATION' // Immobilisation active
  | 'RULE_VIOLATION'; // Violation de règle planifiée

// Niveaux de sévérité
export type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface Alert {
  id: string;
  vehicleId: string;
  vehicleName?: string;
  clientId?: string;
  clientName?: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  isRead: boolean;
  read?: boolean; // Alias pour compatibilité
  comment?: string | null;
  treated?: boolean;
  treatedAt?: string | null;
  vehiclePlate?: string | null;
  createdAt: string;
  timestamp?: string; // Alias pour compatibilité
}

// Configuration des types d'alertes pour l'UI
// label = libellé FR (fallback) ; labelKey = clé i18n à passer à t()
export const ALERT_TYPE_CONFIG: Record<AlertType, { label: string; labelKey: string; icon: string; color: string }> = {
  SPEEDING: { label: 'Excès de vitesse', labelKey: 'alerts.types.SPEEDING', icon: 'Gauge', color: 'orange' },
  GEOFENCE: { label: 'Zone géographique', labelKey: 'alerts.types.GEOFENCE', icon: 'MapPin', color: 'blue' },
  FUEL_LEVEL: { label: 'Niveau carburant', labelKey: 'alerts.types.FUEL_LEVEL', icon: 'Fuel', color: 'yellow' },
  FUEL_THEFT: { label: 'Vol de carburant', labelKey: 'alerts.types.FUEL_THEFT', icon: 'AlertTriangle', color: 'red' },
  FUEL_SUSPECT_LOSS: {
    label: 'Perte carburant suspecte',
    labelKey: 'alerts.types.FUEL_SUSPECT_LOSS',
    icon: 'AlertTriangle',
    color: 'orange',
  },
  MAINTENANCE: { label: 'Maintenance', labelKey: 'alerts.types.MAINTENANCE', icon: 'Wrench', color: 'purple' },
  SOS: { label: 'SOS Urgence', labelKey: 'alerts.types.SOS', icon: 'AlertOctagon', color: 'red' },
  IGNITION: { label: 'Moteur', labelKey: 'alerts.types.IGNITION', icon: 'Key', color: 'green' },
  IDLING: { label: 'Ralenti excessif', labelKey: 'alerts.types.IDLING', icon: 'Clock', color: 'orange' },
  LONG_IDLE: { label: 'Ralenti prolongé', labelKey: 'alerts.types.LONG_IDLE', icon: 'Clock', color: 'orange' },
  BATTERY: { label: 'Batterie', labelKey: 'alerts.types.BATTERY', icon: 'Battery', color: 'yellow' },
  BATTERY_LOW: { label: 'Batterie faible', labelKey: 'alerts.types.BATTERY_LOW', icon: 'BatteryLow', color: 'orange' },
  TOWING: { label: 'Remorquage', labelKey: 'alerts.types.TOWING', icon: 'Truck', color: 'red' },
  JAMMING: { label: 'Brouillage', labelKey: 'alerts.types.JAMMING', icon: 'WifiOff', color: 'red' },
  OFFLINE: { label: 'Hors ligne', labelKey: 'alerts.types.OFFLINE', icon: 'WifiOff', color: 'slate' },
  COMMUNICATION_LOST: {
    label: 'Communication perdue',
    labelKey: 'alerts.types.COMMUNICATION_LOST',
    icon: 'WifiOff',
    color: 'orange',
  },
  GPS_JUMP: { label: 'Saut GPS', labelKey: 'alerts.types.GPS_JUMP', icon: 'Navigation', color: 'orange' },
  POWER_CUT: { label: 'Coupure alimentation', labelKey: 'alerts.types.POWER_CUT', icon: 'Zap', color: 'red' },
  HARSH_BRAKING: {
    label: 'Freinage brusque',
    labelKey: 'alerts.types.HARSH_BRAKING',
    icon: 'AlertTriangle',
    color: 'orange',
  },
  HARSH_ACCEL: {
    label: 'Accélération brusque',
    labelKey: 'alerts.types.HARSH_ACCEL',
    icon: 'TrendingUp',
    color: 'orange',
  },
  SHARP_TURN: { label: 'Virage brusque', labelKey: 'alerts.types.SHARP_TURN', icon: 'CornerUpRight', color: 'orange' },
  TAMPERING: { label: 'Sabotage boîtier', labelKey: 'alerts.types.TAMPERING', icon: 'ShieldAlert', color: 'red' },
  CRASH: { label: 'Accident détecté', labelKey: 'alerts.types.CRASH', icon: 'AlertOctagon', color: 'red' },
  IMMOBILIZATION: { label: 'Immobilisation', labelKey: 'alerts.types.IMMOBILIZATION', icon: 'Lock', color: 'red' },
  RULE_VIOLATION: { label: 'Violation de règle', labelKey: 'alerts.types.RULE_VIOLATION', icon: 'Ban', color: 'red' },
};

export interface AlertConfig {
  id: string;
  tenantId?: string;
  name: string;
  type:
    | 'SPEEDING'
    | 'GEOFENCE'
    | 'FUEL_THEFT'
    | 'FUEL_LOW'
    | 'IDLE'
    | 'SOS'
    | 'MAINTENANCE'
    | 'BATTERY'
    | 'JAMMING'
    | 'OFFLINE'
    | 'SPEED'
    | 'MOVEMENT'
    | 'OTHER';
  priority: 'low' | 'medium' | 'high' | 'critical' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  conditionValue?: number;
  conditionDuration?: number;
  geofenceId?: string;
  geofenceName?: string;
  geofenceDirection?: 'enter' | 'exit' | 'both';
  vehicleIds?: string[];
  allVehicles?: boolean;
  isScheduled?: boolean;
  scheduleDays?: number[];
  scheduleTimeStart?: string;
  scheduleTimeEnd?: string;
  notifyEmail?: boolean;
  notifySms?: boolean;
  notifyPush?: boolean;
  notifyWeb?: boolean;
  notificationUserIds?: string[];
  customEmails?: string;
  customPhones?: string;
  isActive?: boolean;
  status?: 'ACTIVE' | 'INACTIVE';
  recipients?: string[];
  channels?: ('EMAIL' | 'SMS' | 'PUSH')[];
  conditions?: any;
  createdAt?: string;
  updatedAt?: string;
}

// --- MONITORING & ANOMALIES ---
export interface Anomaly {
  id: string;
  vehicleId: string;
  vehicleName: string;
  type: 'FUEL' | 'GEOFENCE' | 'SPEED' | 'IDLE' | 'MAINTENANCE' | 'OTHER';
  code?: string; // Code de l'anomalie (e.g., 'FUEL_DROP', 'OVERSPEED')
  label?: string; // Libellé court
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  timestamp: string;
  description: string;
  value?: string | number;
  unit?: string; // Unité de mesure (L, km/h, etc.)
  duration?: number; // Durée en minutes
  threshold?: string | number;
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED';
}
