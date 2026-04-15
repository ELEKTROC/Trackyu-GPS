// backend/src/gps-server/precision.ts
// Module de précision GPS — Sprint 1 haut de gamme TrackYu
//
// 1. Kalman Filter 2D — Lissage trajectoire GPS (réduction noise)
// 2. Dead Reckoning  — Extrapolation position pendant perte de signal
// 3. GPS Loss Detection — Détection tunnel / masquage signal

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FilteredPosition {
  lat: number;
  lng: number;
  isExtrapolated: boolean;
  extrapolatedMs?: number; // durée depuis le dernier fix réel
}

interface KalmanState {
  lat: number;
  lng: number;
  vLat: number; // vitesse en degrés/sec vers le nord
  vLng: number; // vitesse en degrés/sec vers l'est
  P: number;    // variance estimée (scalaire simplifié)
}

interface LastFix {
  lat: number;
  lng: number;
  speed: number;   // km/h
  heading: number; // degrés 0-360
  ts: number;      // Date.now()
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const METERS_PER_DEG_LAT = 111_320; // constant

/** Bruit de processus (dynamique du mouvement) — plus élevé = suit mieux les virages brusques */
const Q = parseFloat(process.env.KALMAN_Q || '0.0001');

/** Bruit de mesure (imprécision GPS) — plus élevé = lissage plus fort */
const R = parseFloat(process.env.KALMAN_R || '0.0008');

/** Seuil satellites en dessous duquel on considère la perte de signal */
const SAT_THRESHOLD = parseInt(process.env.GPS_SAT_THRESHOLD || '3');

/** Seuil HDOP au dessus duquel la précision est insuffisante */
const HDOP_THRESHOLD = parseFloat(process.env.GPS_HDOP_THRESHOLD || '5.0');

/** Durée max de dead reckoning avant abandon (ms) */
const DR_MAX_AGE_MS = parseInt(process.env.DR_MAX_AGE_MS || '120000'); // 2 min

/** Vitesse minimale pour activer le dead reckoning (km/h) */
const DR_MIN_SPEED = parseFloat(process.env.DR_MIN_SPEED || '3');

// ─── Kalman Filter 2D ─────────────────────────────────────────────────────────

/**
 * Filtre de Kalman 1D par axe (lat + lng indépendants), avec modèle cinématique.
 * Maintient un état par IMEI pour conserver la continuité entre les paquets.
 *
 * Implémentation basée sur le filtre de Kalman à variance scalaire (GPS-grade).
 * Suffisant pour la précision requise (~1-3m RMS) sans la complexité matricielle 4x4.
 */
export class KalmanFilter2D {
  private states = new Map<string, KalmanState>();

  /**
   * Filtre une nouvelle mesure GPS.
   * @param imei     Identifiant du boîtier (clé d'état)
   * @param lat      Latitude mesurée (degrés)
   * @param lng      Longitude mesurée (degrés)
   * @param speed    Vitesse GPS (km/h) — pour initialiser le modèle cinématique
   * @param heading  Cap GPS (degrés) — pour initialiser la direction
   * @param dtMs     Delta-temps depuis le dernier fix (ms)
   * @returns        Position filtrée { lat, lng }
   */
  filter(
    imei: string,
    lat: number,
    lng: number,
    speed: number,
    heading: number,
    dtMs: number
  ): { lat: number; lng: number } {
    const dt = Math.min(dtMs / 1000, 30); // Clamper à 30s max (gap réseau, tunnel court)
    const metersPerDegLng = METERS_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180);
    const headingRad = (heading * Math.PI) / 180;

    // Vitesse en degrés/sec (projection sur les axes lat/lng)
    const speedMs = speed / 3.6;
    const vLat = (speedMs * Math.cos(headingRad)) / METERS_PER_DEG_LAT;
    const vLng = (speedMs * Math.sin(headingRad)) / metersPerDegLng;

    const prev = this.states.get(imei);

    if (!prev) {
      // Initialisation : première mesure = état de référence, P élevé (incertitude max)
      this.states.set(imei, { lat, lng, vLat, vLng, P: 1.0 });
      return { lat, lng };
    }

    // ── Prédiction (propagation du modèle cinématique) ──
    const predLat = prev.lat + prev.vLat * dt;
    const predLng = prev.lng + prev.vLng * dt;
    const predP = prev.P + Q * dt; // La variance croît avec le temps sans mesure

    // ── Mise à jour (fusion mesure + prédiction) ──
    const K = predP / (predP + R); // Gain de Kalman — (0=ignorer mesure, 1=faire confiance mesure)
    const filtLat = predLat + K * (lat - predLat);
    const filtLng = predLng + K * (lng - predLng);
    const newP = (1 - K) * predP;

    this.states.set(imei, { lat: filtLat, lng: filtLng, vLat, vLng, P: newP });
    return { lat: filtLat, lng: filtLng };
  }

  /** Réinitialise l'état (ex: boîtier qui refait surface après tunnel long) */
  reset(imei: string): void {
    this.states.delete(imei);
  }

  /** Statistiques pour monitoring */
  get trackedCount(): number {
    return this.states.size;
  }
}

// ─── Dead Reckoning ───────────────────────────────────────────────────────────

/**
 * Extrapolation de position pendant la perte de signal GPS.
 * Utilise le dernier fix connu (vitesse + cap) pour estimer la position actuelle.
 *
 * Limites physiques :
 * - Fiable ~30s à vitesse constante (autoroute tunnel)
 * - Dégradé après 60s (virages non connus)
 * - Abandonné après 2min (trop d'erreur cumulée)
 */
export class DeadReckoning {
  private lastFix = new Map<string, LastFix>();

  /** Enregistre un fix GPS valide */
  update(imei: string, lat: number, lng: number, speed: number, heading: number): void {
    this.lastFix.set(imei, { lat, lng, speed, heading, ts: Date.now() });
  }

  /**
   * Extrapole la position actuelle à partir du dernier fix connu.
   * @returns Position extrapolée, ou null si impossible
   */
  extrapolate(imei: string): FilteredPosition | null {
    const fix = this.lastFix.get(imei);
    if (!fix || fix.speed < DR_MIN_SPEED) return null; // Véhicule à l'arrêt → pas d'extrapolation

    const dtMs = Date.now() - fix.ts;
    if (dtMs > DR_MAX_AGE_MS) return null; // Trop vieux → abandon

    const dt = dtMs / 1000;
    const headingRad = (fix.heading * Math.PI) / 180;
    const distM = (fix.speed / 3.6) * dt; // Distance parcourue (modèle uniforme)
    const metersPerDegLng = METERS_PER_DEG_LAT * Math.cos((fix.lat * Math.PI) / 180);

    return {
      lat: fix.lat + (distM * Math.cos(headingRad)) / METERS_PER_DEG_LAT,
      lng: fix.lng + (distM * Math.sin(headingRad)) / metersPerDegLng,
      isExtrapolated: true,
      extrapolatedMs: dtMs,
    };
  }

  /** Durée depuis le dernier fix (ms), ou null si jamais vu */
  getAgeMs(imei: string): number | null {
    const fix = this.lastFix.get(imei);
    return fix ? Date.now() - fix.ts : null;
  }

  reset(imei: string): void {
    this.lastFix.delete(imei);
  }
}

// ─── Détection perte GPS ──────────────────────────────────────────────────────

export interface GpsQuality {
  isLost: boolean;
  reason?: 'NO_SATELLITES' | 'POOR_HDOP' | 'ZERO_COORDS' | 'STALE_TIMESTAMP';
  satellites?: number;
  hdop?: number;
}

/**
 * Détecte si le fix GPS actuel est fiable.
 * Cas couverts : tunnel, parking souterrain, interférence RF, antenne débranchée.
 */
export function assessGpsQuality(data: {
  latitude?: number;
  longitude?: number;
  satellites?: number;
  numSat?: number;
  hdop?: number;
  timestamp?: Date;
}): GpsQuality {
  const sats = data.satellites ?? data.numSat;

  // Coordonnées nulles (0,0) ou absentes → signal perdu
  if (!data.latitude || !data.longitude ||
      (Math.abs(data.latitude) < 0.001 && Math.abs(data.longitude) < 0.001)) {
    return { isLost: true, reason: 'ZERO_COORDS' };
  }

  // Pas assez de satellites verrouillés
  if (sats !== undefined && sats < SAT_THRESHOLD) {
    return { isLost: true, reason: 'NO_SATELLITES', satellites: sats };
  }

  // Précision horizontale insuffisante (HDOP > seuil)
  if (data.hdop !== undefined && data.hdop > HDOP_THRESHOLD) {
    return { isLost: true, reason: 'POOR_HDOP', hdop: data.hdop };
  }

  // Timestamp trop vieux (> 5min) → paquet ancien retransmis
  if (data.timestamp) {
    const ageMs = Date.now() - data.timestamp.getTime();
    if (ageMs > 300_000) {
      return { isLost: true, reason: 'STALE_TIMESTAMP' };
    }
  }

  return { isLost: false, satellites: sats, hdop: data.hdop };
}

// ─── Pipeline de filtrage complet ─────────────────────────────────────────────

/**
 * Singletons — un filtre et un DR par pipeline (partagés entre tous les véhicules).
 * Les états individuels par IMEI sont gérés en interne via Map.
 */
export const kalmanFilter = new KalmanFilter2D();
export const deadReckoning = new DeadReckoning();

/**
 * Filtre complet : Kalman + Dead Reckoning combinés.
 * À appeler pour chaque paquet GPS valide reçu.
 *
 * @param imei     Identifiant du boîtier
 * @param data     Données GPS brutes du parseur
 * @param dtMs     Temps écoulé depuis le dernier fix de ce boîtier (ms)
 * @returns        Position de sortie (filtrée ou extrapolée)
 */
export function filterPosition(
  imei: string,
  data: {
    latitude: number;
    longitude: number;
    speed: number;
    heading: number;
    satellites?: number;
    numSat?: number;
    hdop?: number;
    timestamp?: Date;
  },
  dtMs: number
): FilteredPosition {
  const quality = assessGpsQuality(data);

  if (quality.isLost) {
    // Signal GPS perdu → Dead Reckoning
    const dr = deadReckoning.extrapolate(imei);
    if (dr) {
      return dr; // Position extrapolée
    }
    // Pas de DR disponible (premier fix ou véhicule à l'arrêt) → position brute malgré tout
    return { lat: data.latitude, lng: data.longitude, isExtrapolated: false };
  }

  // Fix GPS valide → Kalman filter + mise à jour DR
  const filtered = kalmanFilter.filter(
    imei,
    data.latitude,
    data.longitude,
    data.speed,
    data.heading,
    dtMs
  );

  // Mettre à jour le dead reckoning avec le fix valide filtré
  deadReckoning.update(imei, filtered.lat, filtered.lng, data.speed, data.heading);

  return { lat: filtered.lat, lng: filtered.lng, isExtrapolated: false };
}
