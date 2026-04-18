/**
 * computeVehicleStats — Moteur de calcul partagé des stats véhicule
 *
 * Utilisé par VehicleDetailPanel, ReplayControlPanel (et futurs rapports).
 * Source unique de vérité pour : conduite / ralenti / arrêt / hors ligne / distance.
 *
 * Règle "assignGap" :
 *   Gap > 30min + dernier statut MOVING/IDLE  → hors ligne (signal perdu en activité)
 *   Gap > 30min + dernier statut STOPPED       → arrêt prolongé / veille boîtier
 */
import { VehicleStatus } from '../types';

const GAP_DIST_MS = 10 * 60 * 1000; // 10 min — au-delà : ne pas cumuler la distance
const GAP_OFFLINE_MS = 30 * 60 * 1000; // 30 min — au-delà : qualifier le gap

export interface VehicleStatsResult {
  movingMs: number;
  idleMs: number;
  stoppedMs: number;
  offlineMs: number;
  totalDistance: number; // km
  statusDurationMs: number; // durée dans le statut courant
  offlineGaps: number; // nombre de coupures distinctes
  maxSpeed: number; // km/h
  avgSpeed: number; // km/h
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function getPointTs(p: any): number {
  return new Date(p.time ?? p.timestamp).getTime();
}

export function getPointStatus(p: any): VehicleStatus {
  const speed = typeof p.speed === 'number' ? p.speed : parseFloat(p.speed ?? '0') || 0;
  if (speed >= 2) return VehicleStatus.MOVING;
  const ign = p.ignition;
  if (ign === true || ign === 'true' || ign === 't') return VehicleStatus.IDLE;
  return VehicleStatus.STOPPED;
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Core function ─────────────────────────────────────────────────────────────

/**
 * @param history       Points GPS bruts (champs time|timestamp, speed, ignition, location|lat/lng)
 * @param currentStatus Statut actuel du véhicule (pour calculer statusDurationMs)
 * @param periodStart   Début de la période (ex: 00:00:00 du jour)
 * @param periodEnd     Fin de la période (ex: maintenant)
 */
export function computeVehicleStats(
  history: any[],
  currentStatus: string,
  periodStart: Date,
  periodEnd: Date
): VehicleStatsResult {
  let movingMs = 0,
    idleMs = 0,
    stoppedMs = 0,
    offlineMs = 0;
  let totalDistance = 0,
    offlineGaps = 0;
  let maxSpeed = 0,
    speedSum = 0,
    speedCount = 0;
  let statusDurationMs = 0;

  const periodStartMs = periodStart.getTime();
  const periodEndMs = periodEnd.getTime();

  // Répartit un gap dans le bon bucket selon le statut qui précède le trou
  const assignGap = (dt: number, statusBeforeGap: VehicleStatus) => {
    if (statusBeforeGap === VehicleStatus.MOVING || statusBeforeGap === VehicleStatus.IDLE) {
      offlineMs += dt;
      offlineGaps++;
    } else {
      stoppedMs += dt;
    }
  };

  if (history.length === 0) {
    // Aucun point GPS sur la période → tout en hors ligne
    offlineMs = Math.max(0, periodEndMs - periodStartMs);
    offlineGaps = offlineMs > 0 ? 1 : 0;
    return {
      movingMs,
      idleMs,
      stoppedMs,
      offlineMs,
      totalDistance,
      statusDurationMs,
      offlineGaps,
      maxSpeed,
      avgSpeed: 0,
    };
  }

  const sorted = [...history].sort((a, b) => getPointTs(a) - getPointTs(b));

  // 1. Gap : début de période → premier point GPS
  const firstTs = getPointTs(sorted[0]);
  if (firstTs > periodStartMs) {
    assignGap(firstTs - periodStartMs, getPointStatus(sorted[0]));
  }

  // 2. Intervalles entre points consécutifs
  for (let i = 0; i < sorted.length - 1; i++) {
    const curr = sorted[i];
    const next = sorted[i + 1];
    const dt = getPointTs(next) - getPointTs(curr);
    const status = getPointStatus(curr);

    if (dt > GAP_OFFLINE_MS) {
      assignGap(dt, status);
    } else {
      if (status === VehicleStatus.MOVING) movingMs += dt;
      else if (status === VehicleStatus.IDLE) idleMs += dt;
      else stoppedMs += dt;
    }

    // Distance (ignorer les grands gaps GPS)
    if (dt < GAP_DIST_MS) {
      const loc1 = curr.location ?? { lat: curr.lat, lng: curr.lng };
      const loc2 = next.location ?? { lat: next.lat, lng: next.lng };
      if (loc1?.lat != null && loc2?.lat != null) {
        totalDistance += haversine(loc1.lat, loc1.lng, loc2.lat, loc2.lng);
      }
    }

    const spd = curr.speed || 0;
    if (spd > maxSpeed) maxSpeed = spd;
    if (spd > 0) {
      speedSum += spd;
      speedCount++;
    }
  }

  // Vitesse du dernier point
  const lastSpd = sorted[sorted.length - 1].speed || 0;
  if (lastSpd > maxSpeed) maxSpeed = lastSpd;
  if (lastSpd > 0) {
    speedSum += lastSpd;
    speedCount++;
  }

  // 3. Gap : dernier point GPS → fin de période
  const last = sorted[sorted.length - 1];
  const lastGapMs = periodEndMs - getPointTs(last);
  if (lastGapMs > 0) {
    const lastStatus = getPointStatus(last);
    if (lastGapMs > GAP_OFFLINE_MS) {
      assignGap(lastGapMs, lastStatus);
    } else {
      if (lastStatus === VehicleStatus.MOVING) movingMs += lastGapMs;
      else if (lastStatus === VehicleStatus.IDLE) idleMs += lastGapMs;
      else stoppedMs += lastGapMs;
    }
  }

  // 4. Durée dans le statut actuel (depuis le dernier changement de statut)
  let lastChangeTs = getPointTs(last);
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (getPointStatus(sorted[i]) !== currentStatus) break;
    lastChangeTs = getPointTs(sorted[i]);
  }
  statusDurationMs = periodEndMs - lastChangeTs;

  return {
    movingMs,
    idleMs,
    stoppedMs,
    offlineMs,
    totalDistance,
    statusDurationMs,
    offlineGaps,
    maxSpeed,
    avgSpeed: speedCount > 0 ? speedSum / speedCount : 0,
  };
}

// ── Formatters ────────────────────────────────────────────────────────────────

/** HH:MM depuis des millisecondes */
export function formatDurationHHMM(ms: number): string {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** "Xh Ymin" depuis des millisecondes */
export function formatEngineHours(ms: number): string {
  if (ms <= 0) return 'N/A';
  const h = Math.floor(ms / 3_600_000);
  const min = Math.floor((ms % 3_600_000) / 60_000);
  return `${h}h${min > 0 ? ` ${min}min` : ''}`;
}
