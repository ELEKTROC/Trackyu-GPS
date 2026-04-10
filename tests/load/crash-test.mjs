/**
 * crash-test.mjs — Test de charge et crash natif Node.js
 * Architecture 10k devices / 1500 users — Sans dépendances externes
 *
 * Usage :
 *   node tests/load/crash-test.mjs [options]
 *
 * Options (env) :
 *   TARGET_HOST     — hôte cible (défaut: localhost)
 *   TARGET_HTTP     — port HTTP API (défaut: 3001)
 *   TARGET_GPS      — port TCP GPS (défaut: 5000)
 *   PHASE           — phase à exécuter: all|gps|http|ws (défaut: all)
 *   GPS_DEVICES     — nombre de trackers simulés (défaut: 500, max: 10000)
 *   HTTP_USERS      — utilisateurs HTTP simultanés (défaut: 100)
 *   WS_USERS        — utilisateurs WebSocket (défaut: 50)
 *   TEST_DURATION   — durée totale en secondes (défaut: 120)
 *   RAMP_UP         — durée de montée en secondes (défaut: 30)
 *   AUTH_TOKEN      — token JWT pour les appels HTTP (optionnel)
 *   VERBOSE         — afficher chaque requête (défaut: false)
 *
 * Exemples :
 *   # Test complet sur staging
 *   TARGET_HOST=staging.trackyugps.com GPS_DEVICES=2000 HTTP_USERS=300 node crash-test.mjs
 *
 *   # Juste le GPS sur local
 *   PHASE=gps GPS_DEVICES=5000 node crash-test.mjs
 *
 *   # Stress test max
 *   GPS_DEVICES=10000 HTTP_USERS=1500 WS_USERS=200 TEST_DURATION=300 node crash-test.mjs
 */

import net from 'net';
import http from 'http';
import { EventEmitter } from 'events';

// ─── Configuration ────────────────────────────────────────────────────────────
const TARGET_HOST   = process.env.TARGET_HOST   || 'localhost';
const TARGET_HTTP   = parseInt(process.env.TARGET_HTTP   || '3001');
const TARGET_GPS    = parseInt(process.env.TARGET_GPS    || '5000');
const PHASE         = process.env.PHASE         || 'all';
const GPS_DEVICES   = parseInt(process.env.GPS_DEVICES   || '500');
const HTTP_USERS    = parseInt(process.env.HTTP_USERS    || '100');
const WS_USERS      = parseInt(process.env.WS_USERS      || '50');
const TEST_DURATION = parseInt(process.env.TEST_DURATION || '120') * 1000;
const RAMP_UP       = parseInt(process.env.RAMP_UP       || '30') * 1000;
const AUTH_TOKEN    = process.env.AUTH_TOKEN    || '';
const VERBOSE       = process.env.VERBOSE === 'true';

// ─── Seuils de réussite ───────────────────────────────────────────────────────
const THRESHOLDS = {
  gps_error_rate:    0.02,   // < 2% connexions GPS échouées
  http_error_rate:   0.05,   // < 5% requêtes HTTP échouées
  http_p95_ms:       1000,   // p95 < 1 000 ms
  http_p99_ms:       2000,   // p99 < 2 000 ms
  ws_connect_rate:   0.95,   // > 95% WebSockets connectés
};

// ─── Métriques globales ───────────────────────────────────────────────────────
const metrics = {
  gps: {
    connected: 0, failed: 0, sent: 0, errors: 0,
    startTimes: new Map(),
  },
  http: {
    total: 0, success: 0, errors: 0,
    durations: [],
    statusCodes: {},
  },
  ws: {
    attempted: 0, connected: 0, failed: 0, messages: 0,
  },
  startTime: Date.now(),
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function log(msg)   { console.log(`[${new Date().toISOString()}] ${msg}`); }
function warn(msg)  { console.warn(`\x1b[33m[WARN] ${msg}\x1b[0m`); }
function ok(msg)    { console.log(`\x1b[32m[OK]   ${msg}\x1b[0m`); }
function fail(msg)  { console.error(`\x1b[31m[FAIL] ${msg}\x1b[0m`); }

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function percentile(arr, p) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

// Construire un paquet GT06 réaliste (login + GPS data)
function buildGT06Login(imei) {
  // Paquet login GT06 : 0x7878 0x11 0x01 [IMEI BCD 8bytes] [serial 2bytes] [CRC 2bytes] 0x0D0A
  const buf = Buffer.alloc(17);
  buf[0] = 0x78; buf[1] = 0x78; // Start
  buf[2] = 0x11;                 // Length
  buf[3] = 0x01;                 // Protocol: login
  // IMEI en BCD (8 bytes pour 15 chiffres + padding)
  const imeiStr = String(imei).padStart(15, '0');
  for (let i = 0; i < 8; i++) {
    buf[4 + i] = parseInt(imeiStr.slice(i * 2, i * 2 + 2), 16) || 0;
  }
  buf[12] = 0x00; buf[13] = 0x01; // Serial number
  // CRC simplifié (XOR des bytes 2..12)
  let crc = 0;
  for (let i = 2; i < 13; i++) crc ^= buf[i];
  buf[14] = (crc >> 8) & 0xFF;
  buf[15] = crc & 0xFF;
  buf[16] = 0x0D; // Fin paquet partiel (normalement 0x0D 0x0A mais on garde 17 bytes)
  return buf;
}

function buildGT06Data(imei, lat, lng, speed) {
  // Paquet GPS GT06 simplifié (format binaire)
  const buf = Buffer.alloc(22);
  buf[0] = 0x78; buf[1] = 0x78;
  buf[2] = 0x16; // Length
  buf[3] = 0x12; // Protocol: GPS
  // Timestamp
  const now = new Date();
  buf[4] = now.getFullYear() - 2000;
  buf[5] = now.getMonth() + 1;
  buf[6] = now.getDate();
  buf[7] = now.getHours();
  buf[8] = now.getMinutes();
  buf[9] = now.getSeconds();
  // Latitude (int32, degrés × 30000)
  const latInt = Math.round(Math.abs(lat) * 30000);
  buf.writeInt32BE(latInt, 10);
  // Longitude (int32)
  const lngInt = Math.round(Math.abs(lng) * 30000);
  buf.writeInt32BE(lngInt, 14);
  buf[18] = Math.min(255, Math.round(speed));
  buf[19] = 0x00; buf[20] = 0x01; // Serial
  buf[21] = 0x0D;
  return buf;
}

// ─── PHASE 1 : Simulation GPS TCP ────────────────────────────────────────────
async function runGpsPhase() {
  log(`\n${'='.repeat(60)}`);
  log(`PHASE GPS — ${GPS_DEVICES} trackers simulés → ${TARGET_HOST}:${TARGET_GPS}`);
  log('='.repeat(60));

  const sockets = [];
  let activeCount = 0;

  // Montée progressive : (GPS_DEVICES / RAMP_UP_seconds) connexions/s
  const batchSize = Math.max(1, Math.ceil(GPS_DEVICES / (RAMP_UP / 1000)));
  const batchInterval = 1000; // 1 connexion/batch/seconde

  let launched = 0;

  const connectDevice = (deviceIdx) => {
    const imei = 860000000000000 + deviceIdx;
    // Position autour d'Abidjan (5.36, -4.01) avec spread
    const lat = 5.36 + (deviceIdx % 200) * 0.001 - 0.1;
    const lng = -4.01 + Math.floor(deviceIdx / 200) * 0.001 + 0.1;

    return new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(15_000);

      socket.connect(TARGET_GPS, TARGET_HOST, () => {
        metrics.gps.connected++;
        activeCount++;

        // Envoyer login GT06
        socket.write(buildGT06Login(imei));

        // Envoyer positions périodiquement (simuler 30s interval compressé à 3s en test)
        const interval = setInterval(() => {
          if (socket.destroyed) { clearInterval(interval); return; }
          const speed = Math.random() * 120;
          socket.write(buildGT06Data(imei, lat + Math.random() * 0.001, lng + Math.random() * 0.001, speed));
          metrics.gps.sent++;
        }, 3000);

        socket.on('data', () => {}); // Absorber les ACKs
        socket.on('close', () => { clearInterval(interval); activeCount--; });
        socket.on('error', (e) => {
          clearInterval(interval);
          metrics.gps.errors++;
          if (VERBOSE) warn(`GPS socket error device ${deviceIdx}: ${e.message}`);
        });
        socket.on('timeout', () => socket.destroy());

        sockets.push(socket);
        resolve(socket);
      });

      socket.on('error', (e) => {
        metrics.gps.failed++;
        if (VERBOSE) warn(`GPS connect failed device ${deviceIdx}: ${e.message}`);
        resolve(null);
      });
    });
  };

  // Rampe de connexion
  const rampInterval = setInterval(async () => {
    const batch = Math.min(batchSize, GPS_DEVICES - launched);
    if (batch <= 0) { clearInterval(rampInterval); return; }
    const promises = [];
    for (let i = 0; i < batch; i++) {
      promises.push(connectDevice(launched + i));
    }
    await Promise.allSettled(promises);
    launched += batch;

    const rate = Math.round(metrics.gps.connected / ((Date.now() - metrics.startTime) / 1000));
    log(`GPS: ${metrics.gps.connected}/${GPS_DEVICES} connectés | ${rate} conn/s | sent=${metrics.gps.sent} | err=${metrics.gps.errors}`);
  }, batchInterval);

  // Attendre fin du test
  await sleep(TEST_DURATION);
  clearInterval(rampInterval);

  // Fermer toutes les connexions proprement
  log(`GPS: Fermeture de ${sockets.length} connexions...`);
  for (const s of sockets) {
    if (!s?.destroyed) s?.destroy();
  }

  await sleep(1000);
  return {
    connected: metrics.gps.connected,
    failed: metrics.gps.failed,
    sent: metrics.gps.sent,
    errors: metrics.gps.errors,
    error_rate: metrics.gps.failed / Math.max(1, GPS_DEVICES),
  };
}

// ─── PHASE 2 : Stress HTTP API ────────────────────────────────────────────────
const HTTP_ENDPOINTS = [
  { method: 'GET', path: '/api/health', weight: 5, name: 'health' },
  { method: 'GET', path: '/api/fleet/vehicles', weight: 25, name: 'vehicles' },
  { method: 'GET', path: '/api/fleet/stats', weight: 20, name: 'fleet_stats' },
  { method: 'GET', path: '/api/analytics/dashboard', weight: 15, name: 'dashboard' },
  { method: 'GET', path: '/api/alerts', weight: 10, name: 'alerts' },
  { method: 'GET', path: '/api/clients', weight: 10, name: 'clients' },
  { method: 'GET', path: '/api/finance/invoices', weight: 5, name: 'invoices' },
  { method: 'GET', path: '/api/leads', weight: 5, name: 'leads' },
  { method: 'GET', path: '/api/settings/map-config', weight: 5, name: 'map_config' },
];

function pickEndpoint() {
  const total = HTTP_ENDPOINTS.reduce((s, e) => s + e.weight, 0);
  let r = Math.random() * total;
  for (const ep of HTTP_ENDPOINTS) {
    r -= ep.weight;
    if (r <= 0) return ep;
  }
  return HTTP_ENDPOINTS[0];
}

function httpRequest(endpoint) {
  return new Promise((resolve) => {
    const start = Date.now();
    const options = {
      hostname: TARGET_HOST,
      port: TARGET_HTTP,
      path: endpoint.path,
      method: endpoint.method,
      headers: {
        'Accept': 'application/json',
        ...(AUTH_TOKEN ? { 'Authorization': `Bearer ${AUTH_TOKEN}` } : {}),
      },
      timeout: 10_000,
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        const duration = Date.now() - start;
        metrics.http.total++;
        metrics.http.durations.push(duration);
        metrics.http.statusCodes[res.statusCode] = (metrics.http.statusCodes[res.statusCode] || 0) + 1;

        if (res.statusCode >= 200 && res.statusCode < 400) {
          metrics.http.success++;
        } else {
          metrics.http.errors++;
          if (VERBOSE) warn(`HTTP ${res.statusCode} ${endpoint.path}`);
        }
        resolve({ status: res.statusCode, duration });
      });
    });

    req.on('error', (e) => {
      metrics.http.total++;
      metrics.http.errors++;
      if (VERBOSE) warn(`HTTP error ${endpoint.path}: ${e.message}`);
      resolve({ status: 0, duration: Date.now() - start });
    });

    req.on('timeout', () => {
      metrics.http.errors++;
      req.destroy();
      resolve({ status: 0, duration: 10_000 });
    });

    req.end();
  });
}

async function runHttpUser(userId, endTime) {
  // Simulation d'un utilisateur réel : requête → wait 200-500ms → requête
  while (Date.now() < endTime) {
    const endpoint = pickEndpoint();
    await httpRequest(endpoint);
    // Pause réaliste entre requêtes
    await sleep(200 + Math.random() * 300);
  }
}

async function runHttpPhase() {
  log(`\n${'='.repeat(60)}`);
  log(`PHASE HTTP — ${HTTP_USERS} utilisateurs → ${TARGET_HOST}:${TARGET_HTTP}`);
  log('='.repeat(60));

  const endTime = Date.now() + TEST_DURATION;

  // Rampe : ajouter des utilisateurs progressivement sur RAMP_UP
  const usersPerStep = Math.max(1, Math.ceil(HTTP_USERS / (RAMP_UP / 1000)));
  const userPromises = [];
  let launched = 0;

  await new Promise((resolve) => {
    const rampInterval = setInterval(() => {
      const count = Math.min(usersPerStep, HTTP_USERS - launched);
      for (let i = 0; i < count; i++) {
        userPromises.push(runHttpUser(launched + i, endTime));
      }
      launched += count;
      if (launched >= HTTP_USERS) {
        clearInterval(rampInterval);
        resolve();
      }
    }, 1000);
  });

  // Rapport intermédiaire toutes les 15s
  const reportInterval = setInterval(() => {
    const elapsed = (Date.now() - metrics.startTime) / 1000;
    const rps = Math.round(metrics.http.total / elapsed);
    const errRate = Math.round(metrics.http.errors / Math.max(1, metrics.http.total) * 100);
    const p50 = Math.round(percentile(metrics.http.durations, 50));
    const p95 = Math.round(percentile(metrics.http.durations, 95));
    log(`HTTP: total=${metrics.http.total} | rps=${rps} | err=${errRate}% | p50=${p50}ms | p95=${p95}ms`);
  }, 15_000);

  await Promise.allSettled(userPromises);
  clearInterval(reportInterval);

  return {
    total: metrics.http.total,
    success: metrics.http.success,
    errors: metrics.http.errors,
    error_rate: metrics.http.errors / Math.max(1, metrics.http.total),
    rps: Math.round(metrics.http.total / (TEST_DURATION / 1000)),
    p50: Math.round(percentile(metrics.http.durations, 50)),
    p95: Math.round(percentile(metrics.http.durations, 95)),
    p99: Math.round(percentile(metrics.http.durations, 99)),
    status_codes: metrics.http.statusCodes,
  };
}

// ─── PHASE 3 : Storm WebSocket ────────────────────────────────────────────────
async function runWsPhase() {
  log(`\n${'='.repeat(60)}`);
  log(`PHASE WS — ${WS_USERS} clients Socket.IO → ${TARGET_HOST}:${TARGET_HTTP}`);
  log('='.repeat(60));

  // Socket.IO utilise un polling HTTP avant de passer en WebSocket
  // On simule via HTTP polling (EIO=4, transport=polling)
  const connections = [];
  let sids = [];

  const connectWsUser = async (userId) => {
    metrics.ws.attempted++;
    return new Promise((resolve) => {
      // Étape 1: handshake Socket.IO (HTTP polling)
      const opts = {
        hostname: TARGET_HOST,
        port: TARGET_HTTP,
        path: '/socket.io/?EIO=4&transport=polling',
        method: 'GET',
        timeout: 10_000,
      };

      const req = http.request(opts, (res) => {
        let body = '';
        res.on('data', c => body += c);
        res.on('end', () => {
          if (res.statusCode === 200) {
            metrics.ws.connected++;
            // Simuler messages reçus (mock)
            const msgInterval = setInterval(() => {
              metrics.ws.messages++;
            }, 2000);
            connections.push(msgInterval);
            resolve({ connected: true, userId });
          } else {
            metrics.ws.failed++;
            resolve({ connected: false });
          }
        });
      });

      req.on('error', () => {
        metrics.ws.failed++;
        resolve({ connected: false });
      });
      req.on('timeout', () => { req.destroy(); metrics.ws.failed++; resolve({ connected: false }); });
      req.end();
    });
  };

  // Connecter tous les users en rampe
  const batchSize = Math.max(1, Math.ceil(WS_USERS / 10));
  for (let i = 0; i < WS_USERS; i += batchSize) {
    const batch = [];
    for (let j = i; j < Math.min(i + batchSize, WS_USERS); j++) {
      batch.push(connectWsUser(j));
    }
    await Promise.allSettled(batch);
    await sleep(1000);
    log(`WS: ${metrics.ws.connected}/${WS_USERS} connectés`);
  }

  // Maintenir les connexions pendant la durée du test
  await sleep(Math.min(TEST_DURATION, 30_000));

  // Nettoyage
  connections.forEach(clearInterval);

  return {
    attempted: metrics.ws.attempted,
    connected: metrics.ws.connected,
    failed: metrics.ws.failed,
    messages: metrics.ws.messages,
    connect_rate: metrics.ws.connected / Math.max(1, metrics.ws.attempted),
  };
}

// ─── Rapport final ────────────────────────────────────────────────────────────
function printReport(results) {
  const elapsed = Math.round((Date.now() - metrics.startTime) / 1000);
  console.log('\n' + '='.repeat(70));
  console.log('RAPPORT CRASH TEST — TrackYu GPS');
  console.log('='.repeat(70));
  console.log(`Cible    : ${TARGET_HOST} | Durée : ${elapsed}s`);
  console.log(`Config   : ${GPS_DEVICES} GPS, ${HTTP_USERS} HTTP users, ${WS_USERS} WS users`);
  console.log('');

  let allPassed = true;

  // GPS
  if (results.gps) {
    const r = results.gps;
    const passed = r.error_rate <= THRESHOLDS.gps_error_rate;
    if (!passed) allPassed = false;
    console.log(`GPS DEVICES :`);
    console.log(`  Connectés   : ${r.connected}/${GPS_DEVICES}`);
    console.log(`  Paquets     : ${r.sent}`);
    console.log(`  Erreurs     : ${r.errors} (${Math.round(r.error_rate * 100)}%)`);
    console.log(`  Taux erreur : ${passed ? '✓ PASS' : '✗ FAIL'} (seuil: ${THRESHOLDS.gps_error_rate * 100}%)`);
    console.log('');
  }

  // HTTP
  if (results.http) {
    const r = results.http;
    const errPass = r.error_rate <= THRESHOLDS.http_error_rate;
    const p95Pass = r.p95 <= THRESHOLDS.http_p95_ms;
    const p99Pass = r.p99 <= THRESHOLDS.http_p99_ms;
    if (!errPass || !p95Pass || !p99Pass) allPassed = false;
    console.log(`HTTP API :`);
    console.log(`  Requêtes    : ${r.total} (${r.rps} req/s)`);
    console.log(`  Succès      : ${r.success} (${Math.round(r.success / Math.max(1, r.total) * 100)}%)`);
    console.log(`  Erreurs     : ${r.errors} → ${errPass ? '✓ PASS' : '✗ FAIL'}`);
    console.log(`  p50         : ${r.p50}ms`);
    console.log(`  p95         : ${r.p95}ms → ${p95Pass ? '✓ PASS' : '✗ FAIL'} (seuil: ${THRESHOLDS.http_p95_ms}ms)`);
    console.log(`  p99         : ${r.p99}ms → ${p99Pass ? '✓ PASS' : '✗ FAIL'} (seuil: ${THRESHOLDS.http_p99_ms}ms)`);
    console.log(`  Status HTTP : ${JSON.stringify(r.status_codes)}`);
    console.log('');
  }

  // WS
  if (results.ws) {
    const r = results.ws;
    const passed = r.connect_rate >= THRESHOLDS.ws_connect_rate;
    if (!passed) allPassed = false;
    console.log(`WEBSOCKET :`);
    console.log(`  Connectés   : ${r.connected}/${r.attempted} (${Math.round(r.connect_rate * 100)}%)`);
    console.log(`  Messages    : ${r.messages}`);
    console.log(`  Taux succès : ${passed ? '✓ PASS' : '✗ FAIL'} (seuil: ${THRESHOLDS.ws_connect_rate * 100}%)`);
    console.log('');
  }

  console.log('='.repeat(70));
  if (allPassed) {
    ok(`RÉSULTAT GLOBAL : ✓ PASS — Système dans les seuils`);
  } else {
    fail(`RÉSULTAT GLOBAL : ✗ FAIL — Un ou plusieurs seuils dépassés`);
  }
  console.log('='.repeat(70));

  return allPassed;
}

// ─── Entry point ─────────────────────────────────────────────────────────────
async function main() {
  log('TrackYu Crash Test démarré');
  log(`Cible: ${TARGET_HOST} | GPS:${TARGET_GPS} | HTTP:${TARGET_HTTP}`);
  log(`Phase: ${PHASE} | Durée: ${TEST_DURATION / 1000}s | Rampe: ${RAMP_UP / 1000}s`);

  // Vérification connectivité préalable
  log('\nVérification connectivité...');
  try {
    await new Promise((resolve, reject) => {
      const req = http.get(`http://${TARGET_HOST}:${TARGET_HTTP}/api/health`, { timeout: 5000 }, (res) => {
        ok(`API health: HTTP ${res.statusCode}`);
        resolve();
      });
      req.on('error', reject);
    });
  } catch (e) {
    warn(`API HTTP non accessible: ${e.message}`);
    warn('Les tests HTTP/WS échoueront probablement. GPS uniquement peut fonctionner.');
  }

  const results = {};

  if (PHASE === 'all' || PHASE === 'gps') {
    results.gps = await runGpsPhase();
  }

  if (PHASE === 'all' || PHASE === 'http') {
    metrics.http = { total: 0, success: 0, errors: 0, durations: [], statusCodes: {} };
    results.http = await runHttpPhase();
  }

  if (PHASE === 'all' || PHASE === 'ws') {
    metrics.ws = { attempted: 0, connected: 0, failed: 0, messages: 0 };
    results.ws = await runWsPhase();
  }

  const passed = printReport(results);
  process.exit(passed ? 0 : 1);
}

main().catch(e => {
  console.error('Erreur fatale:', e);
  process.exit(1);
});
