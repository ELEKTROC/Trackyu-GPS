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
 * Phase A (actuelle) : calcul côté client via `computeVehicleStats` sur le
 * résultat de `getVehicleHistory(vehicleId, date)`. Timezone = navigateur.
 * Phase B (prévue) : bascule vers endpoint backend unifié `/api/fleet/vehicles/:id/stats`
 * qui retournera les mêmes champs calculés côté serveur (TZ tenant),
 * sans toucher à la surface du hook.
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDataContext } from '../contexts/DataContext';
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
  /** Si false, désactive la query. */
  enabled?: boolean;
}

export interface UseVehicleStatsReturn {
  /** Stats harmonisées. Null tant que `vehicle` est null. */
  stats: VehicleStatsResult | null;
  /** Historique brut retourné par l'API, utile pour graphiques. */
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
 * Récupère l'historique GPS d'un véhicule pour la période donnée puis calcule
 * les statistiques harmonisées (durées par statut, distance, vitesses, gaps).
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

  // Clé de cache stable : bornes de période arrondies au jour (évite refetch par seconde).
  const cacheKey = useMemo(
    () => ['vehicleStats', vehicle?.id, periodStart.toISOString().split('T')[0], periodEnd.toISOString().split('T')[0]],
    [vehicle?.id, periodStart, periodEnd]
  );

  const {
    data: history = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: cacheKey,
    queryFn: () => getVehicleHistory(vehicle!.id, periodStart),
    enabled: enabled && !!vehicle?.id,
  });

  const stats = useMemo<VehicleStatsResult | null>(() => {
    if (!vehicle) return null;
    return computeVehicleStats(history, vehicle.status, periodStart, periodEnd);
  }, [history, vehicle, periodStart, periodEnd]);

  return {
    stats,
    history,
    periodStart,
    periodEnd,
    isLoading,
    error: (error as Error | null) ?? null,
    refetch,
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
