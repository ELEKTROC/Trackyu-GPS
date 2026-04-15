// backend/src/services/metricsService.ts
// Métriques temps réel du pipeline GPS
// • /api/admin/gps-stats  → JSON pour le monitoring staff
// • /metrics              → format Prometheus text (si prom-client installé)
//
// Montage Prometheus dans l'app Express principale :
//   import { getPrometheusMetrics } from './services/metricsService.js';
//   app.get('/metrics', async (req, res) => {
//     const m = await getPrometheusMetrics();
//     if (m) res.set('Content-Type', m.contentType).send(m.metrics);
//     else res.status(503).json({ error: 'Prometheus non initialisé' });
//   });

import { getGpsStats } from '../gps-server/server.js';

// ─── Compteurs JSON simples (toujours actifs, fallback si prom-client absent) ─
const counters: Record<string, number> = {};

export function incrementGpsPackets(protocol: string): void {
  const key = `gps_packets_${protocol.toLowerCase()}`;
  counters[key] = (counters[key] || 0) + 1;
  gpsPacketsTotal.inc?.({ protocol, status: 'valid' });
}

export function incrementDbError(): void {
  counters['db_errors'] = (counters['db_errors'] || 0) + 1;
}

export function incrementCrcError(protocol: string): void {
  const key = `crc_errors_${protocol.toLowerCase()}`;
  counters[key] = (counters[key] || 0) + 1;
  gpsPacketsTotal.inc?.({ protocol, status: 'crc_error' });
}

export function incrementFuelAnomaly(type: 'REFILL' | 'THEFT'): void {
  const key = `fuel_anomaly_${type.toLowerCase()}`;
  counters[key] = (counters[key] || 0) + 1;
  fuelAnomalyTotal.inc?.({ type });
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

  const unknownImeis = Object.entries(gpsStats.unknownImeis)
    .map(([imei, data]) => ({ imei, packetCount: data.count, lastSeen: data.lastSeen }))
    .sort((a, b) => b.packetCount - a.packetCount)
    .slice(0, 20);

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
    counters, // Compteurs JSON bruts (debug)
  };
}

// ─── Prometheus (prom-client) ─────────────────────────────────────────────────
// Stubs no-op actifs tant que prom-client n'est pas initialisé
export let gpsActiveConnections: any = { inc: () => {}, dec: () => {}, set: () => {} };
export let gpsPacketsTotal: any = { inc: () => {} };
export let positionBufferSize: any = { set: () => {} };
export let websocketActiveClients: any = { set: () => {} };
export let fuelAnomalyTotal: any = { inc: () => {} };
export let httpRequestDuration: any = { startTimer: () => () => {} };

let prometheusRegister: any = null;

(async () => {
  try {
    const promClient = await import('prom-client');
    const register = new promClient.Registry();
    promClient.collectDefaultMetrics({ register });
    prometheusRegister = register;

    gpsActiveConnections = new promClient.Gauge({
      name: 'gps_active_connections',
      help: 'Nombre de boîtiers GPS connectés au serveur TCP',
      registers: [register],
    });

    gpsPacketsTotal = new promClient.Counter({
      name: 'gps_packets_total',
      help: 'Total paquets GPS reçus, par protocole et statut (valid/rejected/crc_error)',
      labelNames: ['protocol', 'status'],
      registers: [register],
    });

    positionBufferSize = new promClient.Gauge({
      name: 'position_buffer_size',
      help: 'Positions en attente dans le buffer mémoire avant flush PostgreSQL',
      registers: [register],
    });

    websocketActiveClients = new promClient.Gauge({
      name: 'websocket_active_clients',
      help: 'Nombre de clients Socket.IO connectés (toutes rooms)',
      registers: [register],
    });

    fuelAnomalyTotal = new promClient.Counter({
      name: 'fuel_anomaly_events_total',
      help: 'Détections ravitaillements (REFILL) et siphonnages (THEFT) carburant',
      labelNames: ['type'],
      registers: [register],
    });

    httpRequestDuration = new promClient.Histogram({
      name: 'http_request_duration_seconds',
      help: 'Durée des requêtes HTTP en secondes',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
      registers: [register],
    });

    console.info('[Metrics] Prometheus initialisé — 6 métriques GPS actives');
  } catch {
    // prom-client non installé → fallback JSON uniquement, pas d'erreur fatale
  }
})();

// ─── Endpoint Prometheus ──────────────────────────────────────────────────────
// Retourne le payload text/plain attendu par Prometheus scraper.
// Monter dans l'app Express principale : app.get('/metrics', prometheusHandler)
export async function getPrometheusMetrics(): Promise<{ contentType: string; metrics: string } | null> {
  if (!prometheusRegister) return null;
  const [contentType, metrics] = await Promise.all([
    Promise.resolve(prometheusRegister.contentType),
    prometheusRegister.metrics(),
  ]);
  return { contentType, metrics };
}

export function isPrometheusReady(): boolean {
  return prometheusRegister !== null;
}
