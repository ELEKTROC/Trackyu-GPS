// backend/src/services/metricsService.ts
// Métriques temps réel du pipeline GPS — exposées via /api/admin/gps-stats
// Compatible Prometheus (si prom-client disponible) + API JSON interne

import { getGpsStats } from '../gps-server/server.js';

// ─── Compteurs simples (fallback si Prometheus non dispo) ─────────────────────
const counters: Record<string, number> = {};

export function incrementGpsPackets(protocol: string): void {
  const key = `gps_packets_${protocol.toLowerCase()}`;
  counters[key] = (counters[key] || 0) + 1;
}

export function incrementDbError(): void {
  counters['db_errors'] = (counters['db_errors'] || 0) + 1;
}

export function incrementCrcError(protocol: string): void {
  counters[`crc_errors_${protocol.toLowerCase()}`] =
    (counters[`crc_errors_${protocol.toLowerCase()}`] || 0) + 1;
}

// ─── Statistiques agrégées pour le monitoring staff ──────────────────────────
export function getFullMetrics() {
  const gpsStats = getGpsStats();

  const parserSummary = Object.entries(gpsStats.stats).map(([name, stat]) => ({
    name,
    totalPackets: stat.total,
    validPackets: stat.valid,
    rejectedPackets: stat.rejected,
    crcErrors: stat.crcErrors,
    successRate: stat.total > 0 ? Math.round(stat.valid / stat.total * 100) : 0,
    lastSeen: stat.lastSeen,
  }));

  const unknownImeis = Object.entries(gpsStats.unknownImeis).map(([imei, data]) => ({
    imei,
    packetCount: data.count,
    lastSeen: data.lastSeen,
  })).sort((a, b) => b.packetCount - a.packetCount).slice(0, 20);

  return {
    timestamp: new Date().toISOString(),
    pipeline: {
      activeConnections: gpsStats.activeConnections,
      activeParsers: gpsStats.activeParsers,
      rateLimit: gpsStats.rateLimit,
    },
    parsers: parserSummary,
    unknownImeis,
    totals: {
      packets: Object.values(gpsStats.stats).reduce((s, p) => s + p.total, 0),
      valid: Object.values(gpsStats.stats).reduce((s, p) => s + p.valid, 0),
      rejected: Object.values(gpsStats.stats).reduce((s, p) => s + p.rejected, 0),
      crcErrors: Object.values(gpsStats.stats).reduce((s, p) => s + p.crcErrors, 0),
    },
  };
}

// ─── Optionnel : Prometheus (si prom-client est installé) ────────────────────
let promClient: any = null;
export let gpsActiveConnections: any = { inc: () => {}, dec: () => {} };
export let gpsPacketsTotal: any = { inc: () => {} };

(async () => {
  try {
    promClient = await import('prom-client');
    const register = new promClient.Registry();
    promClient.collectDefaultMetrics({ register });

    gpsActiveConnections = new promClient.Gauge({
      name: 'gps_active_connections',
      help: 'Nombre de boîtiers GPS connectés',
      registers: [register],
    });

    gpsPacketsTotal = new promClient.Counter({
      name: 'gps_packets_total',
      help: 'Total paquets GPS reçus',
      labelNames: ['protocol', 'status'],
      registers: [register],
    });

    console.info('[Metrics] Prometheus initialisé');
  } catch {
    // prom-client non installé → métriques JSON uniquement
  }
})();
