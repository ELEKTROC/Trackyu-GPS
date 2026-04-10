// backend/src/gps-server/types.ts
// Interfaces partagées pour le pipeline GPS multi-protocoles TrackYu

export interface GpsData {
  imei: string;
  timestamp: Date;
  latitude: number;
  longitude: number;
  speed: number;         // km/h
  heading: number;       // 0–360 degrés
  fuelLevel?: number;    // Litres (brut capteur)
  odometer?: number;     // Mètres (CAN/capteur)
  altitude?: number;     // Mètres
  satellites?: number;   // Nombre de satellites utilisés
  hdop?: number;         // Précision horizontale (plus bas = meilleur)
  // Données comportementales
  harshBraking?: boolean;
  harshAccel?: boolean;
  sharpLeft?: boolean;
  sharpRight?: boolean;
  crash?: boolean;
  sos?: boolean;
  vibration?: boolean;
  // Ignition et alimentation
  acc?: boolean;           // true = contact mis / moteur en marche
  externalVolt?: number;   // mV tension batterie externe
  batteryPercent?: number; // % batterie interne boîtier
  // Divers
  driverBehaviorScore?: number;
  raw: string;           // Paquet brut (hex ou texte) pour audit
  protocol?: string;     // Protocole détecté (GT06, TELTONIKA, etc.)
}

export interface GpsParser {
  protocolName: string;
  /**
   * Détermine si ce parseur peut traiter ce paquet.
   * Doit être rapide (header check seulement, pas de parsing complet).
   */
  canParse(data: Buffer | string): boolean;
  /**
   * Parse le paquet et retourne GpsData ou null si invalide/incomplet.
   * Pour les protocoles stateful (Teltonika, GT06 login), peut retourner null
   * même sur un paquet valide (ex: paquet de login seul, sans données GPS).
   */
  parse(data: Buffer | string, socket?: import('net').Socket): GpsData | null;
}

// Résultat de validation des données GPS
export interface GpsValidationResult {
  valid: boolean;
  reason?: string;
}

// Métriques par parseur (pour monitoring staff)
export interface ParserMetrics {
  name: string;
  totalPackets: number;
  validPackets: number;
  rejectedPackets: number;
  crcErrors: number;
  lastSeen: Date | null;
  activeConnections: number;
}

// Diagnostic d'un boîtier spécifique
export interface DeviceDiagnostic {
  imei: string;
  protocol: string | null;
  lastFix: Date | null;
  lastSeen: Date | null;
  packetsToday: number;
  batteryMv: number | null;
  externalVoltMv: number | null;
  satellites: number | null;
  hdop: number | null;
  signalQuality: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'UNKNOWN';
  isConnected: boolean;
  lastPosition: { lat: number; lng: number } | null;
}
