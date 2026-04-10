// types/alerts.ts — Alerts, anomalies, alert configuration

// Types d'alertes système
export type AlertType = 
  | 'SPEEDING'      // Excès de vitesse
  | 'GEOFENCE'      // Entrée/Sortie zone
  | 'FUEL_LEVEL'    // Niveau carburant bas
  | 'FUEL_THEFT'    // Vol de carburant
  | 'MAINTENANCE'   // Alerte maintenance
  | 'SOS'           // Bouton SOS
  | 'IGNITION'      // Allumage/Extinction
  | 'IDLING'        // Ralenti excessif
  | 'BATTERY'       // Batterie faible (véhicule ou GPS)
  | 'TOWING'        // Remorquage détecté
  | 'JAMMING'       // Brouillage GPS
  | 'OFFLINE'       // Perte de signal
  | 'POWER_CUT'     // Coupure alimentation
  | 'HARSH_BRAKING' // Freinage brusque
  | 'HARSH_ACCEL'   // Accélération brusque
  | 'SHARP_TURN'    // Virage brusque
  | 'TAMPERING'     // Sabotage/Vibration
  | 'CRASH'         // Détection accident
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
export const ALERT_TYPE_CONFIG: Record<AlertType, { label: string; icon: string; color: string }> = {
  SPEEDING: { label: 'Excès de vitesse', icon: 'Gauge', color: 'orange' },
  GEOFENCE: { label: 'Zone géographique', icon: 'MapPin', color: 'blue' },
  FUEL_LEVEL: { label: 'Niveau carburant', icon: 'Fuel', color: 'yellow' },
  FUEL_THEFT: { label: 'Vol de carburant', icon: 'AlertTriangle', color: 'red' },
  MAINTENANCE: { label: 'Maintenance', icon: 'Wrench', color: 'purple' },
  SOS: { label: 'SOS Urgence', icon: 'AlertOctagon', color: 'red' },
  IGNITION: { label: 'Moteur', icon: 'Key', color: 'green' },
  IDLING: { label: 'Ralenti excessif', icon: 'Clock', color: 'orange' },
  BATTERY: { label: 'Batterie', icon: 'Battery', color: 'yellow' },
  TOWING: { label: 'Remorquage', icon: 'Truck', color: 'red' },
  JAMMING: { label: 'Brouillage', icon: 'WifiOff', color: 'red' },
  OFFLINE: { label: 'Hors ligne', icon: 'WifiOff', color: 'slate' },
  POWER_CUT: { label: 'Coupure alimentation', icon: 'Zap', color: 'red' },
  HARSH_BRAKING: { label: 'Freinage brusque', icon: 'AlertTriangle', color: 'orange' },
  HARSH_ACCEL: { label: 'Accélération brusque', icon: 'TrendingUp', color: 'orange' },
  SHARP_TURN: { label: 'Virage brusque', icon: 'CornerUpRight', color: 'orange' },
  TAMPERING: { label: 'Sabotage boîtier', icon: 'ShieldAlert', color: 'red' },
  CRASH: { label: 'Accident détecté', icon: 'AlertOctagon', color: 'red' },
  RULE_VIOLATION: { label: 'Violation de règle', icon: 'Ban', color: 'red' },
};

export interface AlertConfig {
  id: string;
  tenantId?: string;
  name: string;
  type: 'SPEEDING' | 'GEOFENCE' | 'FUEL_THEFT' | 'FUEL_LOW' | 'IDLE' | 'SOS' | 'MAINTENANCE' | 'BATTERY' | 'JAMMING' | 'OFFLINE' | 'SPEED' | 'MOVEMENT' | 'OTHER';
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
