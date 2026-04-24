/**
 * useVehicleStats — Hook centralisé des statistiques véhicule.
 *
 * Objectif : supprimer les disparités entre consommateurs (VehicleDetailPanel,
 * ReplayControlPanel, FleetTable, Dashboard, Reports) en encapsulant fetch +
 * calcul + seuils métier derrière une API unique.
 *
 * Règles métier centralisées dans `utils/computeVehicleStats.ts` :
 *   - SPEED_MOVING_THRESHOLD_KMH = 2
 *   - GAP_DIST_MS = 10 min (anti-dérive distance)
 *   - GAP_OFFLINE_MS = 30 min (qualification gap offline/stop)
 *
 * Phase B : source primaire = endpoint backend `/api/v1/fleet/vehicles/:id/stats`
 * (seuils identiques serveur/client). Fallback client `computeVehicleStats` sur
 * `history` si le backend échoue (résilience transition).
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDataContext } from '../contexts/DataContext';
import { api } from '../services/apiLazy';
import {
  computeVehicleStats,
  formatDurationHHMM,
  formatEngineHours,
  formatHumanDuration,
  SPEED_MOVING_THRESHOLD_KMH,
  GAP_DIST_MS,
  GAP_OFFLINE_MS,
  type VehicleStatsResult,
} from '../utils/computeVehicleStats';

// ─── Types ───────────────────────────────────────────────────────────────────

export type StatsPeriodPreset = 'today' | 'week' | 'month';
export interface StatsPeriodCustom {
  start: Date;
  end: Date;
}
export type StatsPeriod = StatsPeriodPreset | StatsPeriodCustom;

export interface UseVehicleStatsOptions {
  /** Période de calcul. Défaut : 'today' (jour calendaire 00:00 → now). */
  period?: StatsPeriod;
  /** Si false, désactive les queries. */
  enabled?: boolean;
}

export interface UseVehicleStatsReturn {
  /** Stats harmonisées (backend primaire + fallback client). Null tant qu'aucune source dispo. */
  stats: VehicleStatsResult | null;
  /** Source ayant fourni les stats : 'backend' | 'client' (fallback) | null. */
  statsSource: 'backend' | 'client' | null;
  /** Historique brut retourné par /history/snapped, utile pour graphiques. */
  history: any[];
  /** Bornes effectives de la période (résolues). */
  periodStart: Date;
  periodEnd: Date;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}

// ─── Résolution de période ────────────────────────────────────────────────────

export function resolvePeriod(period: StatsPeriod): StatsPeriodCustom {
  const now = new Date();
  if (period === 'today') {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return { start, end: now };
  }
  if (period === 'week') {
    const start = new Date(now);
    start.setDate(start.getDate() - 6); // 7 jours incluant aujourd'hui
    start.setHours(0, 0, 0, 0);
    return { start, end: now };
  }
  if (period === 'month') {
    const start = new Date(now);
    start.setDate(start.getDate() - 29); // 30 jours incluant aujourd'hui
    start.setHours(0, 0, 0, 0);
    return { start, end: now };
  }
  return { start: period.start, end: period.end };
}

// ─── Hook principal ──────────────────────────────────────────────────────────

/**
 * Retourne les stats harmonisées d'un véhicule pour la période demandée.
 * Source primaire = backend (`api.vehicles.getStats`), fallback = compute client
 * (`computeVehicleStats`) sur l'historique GPS si le backend échoue.
 *
 * @example
 * const { stats, isLoading } = useVehicleStats(vehicle, { period: 'today' });
 * if (stats) console.log(formatDurationHHMM(stats.movingMs));
 */
export function useVehicleStats(
  vehicle: { id: string; status: string } | null | undefined,
  options: UseVehicleStatsOptions = {}
): UseVehicleStatsReturn {
  const { period = 'today', enabled = true } = options;
  const { getVehicleHistory } = useDataContext();

  const { start: periodStart, end: periodEnd } = useMemo(() => resolvePeriod(period), [period]);

  const periodKey = useMemo(
    () => `${periodStart.toISOString().split('T')[0]}..${periodEnd.toISOString().split('T')[0]}`,
    [periodStart, periodEnd]
  );

  // Historique (pour graphiques + fallback compute client)
  const historyQuery = useQuery({
    queryKey: ['vehicleHistory', vehicle?.id, periodKey],
    queryFn: () => getVehicleHistory(vehicle!.id, periodStart),
    enabled: enabled && !!vehicle?.id,
  });

  // Stats serveur (seuils alignés frontend/backend, source canonique)
  const statsQuery = useQuery({
    queryKey: ['vehicleStats:v2', vehicle?.id, periodKey],
    queryFn: () => {
      const isPreset = typeof period === 'string';
      return api.vehicles.getStats(vehicle!.id, {
        period: isPreset ? (period as StatsPeriodPreset) : undefined,
        start: !isPreset ? (period as StatsPeriodCustom).start.toISOString() : undefined,
        end: !isPreset ? (period as StatsPeriodCustom).end.toISOString() : undefined,
      });
    },
    enabled: enabled && !!vehicle?.id,
    retry: 1,
  });

  const { stats, statsSource } = useMemo<{
    stats: VehicleStatsResult | null;
    statsSource: 'backend' | 'client' | null;
  }>(() => {
    // Primaire : backend
    if (statsQuery.data) {
      const {
        movingMs,
        idleMs,
        stoppedMs,
        offlineMs,
        totalDistance,
        statusDurationMs,
        offlineGaps,
        maxSpeed,
        avgSpeed,
      } = statsQuery.data;
      return {
        stats: {
          movingMs,
          idleMs,
          stoppedMs,
          offlineMs,
          totalDistance,
          statusDurationMs,
          offlineGaps,
          maxSpeed,
          avgSpeed,
        },
        statsSource: 'backend',
      };
    }
    // Fallback : compute client si backend a échoué ET history dispo
    if (statsQuery.error && vehicle && historyQuery.data) {
      return {
        stats: computeVehicleStats(historyQuery.data, vehicle.status, periodStart, periodEnd),
        statsSource: 'client',
      };
    }
    return { stats: null, statsSource: null };
  }, [statsQuery.data, statsQuery.error, historyQuery.data, vehicle, periodStart, periodEnd]);

  return {
    stats,
    statsSource,
    history: historyQuery.data ?? [],
    periodStart,
    periodEnd,
    isLoading: statsQuery.isLoading || historyQuery.isLoading,
    error: (statsQuery.error as Error | null) ?? (historyQuery.error as Error | null) ?? null,
    refetch: async () => {
      await Promise.all([statsQuery.refetch(), historyQuery.refetch()]);
    },
  };
}

// ─── Re-exports pour API unique ──────────────────────────────────────────────

export {
  formatDurationHHMM,
  formatEngineHours,
  formatHumanDuration,
  SPEED_MOVING_THRESHOLD_KMH,
  GAP_DIST_MS,
  GAP_OFFLINE_MS,
};
export type { VehicleStatsResult };
