/**
 * k6 Load Test - GPS Tracker Simulation
 * 
 * Simule 2000 trackers GPS envoyant des positions TCP.
 * Comme k6 ne supporte pas TCP natif, on simule via HTTP POST
 * vers un endpoint de test, ou on utilise le mode WebSocket.
 * 
 * Usage:
 *   k6 run --vus 200 --duration 5m tests/load/k6-gps-simulation.js
 *   k6 run --vus 2000 --duration 10m tests/load/k6-gps-simulation.js
 * 
 * Variables d'environnement:
 *   K6_API_BASE_URL  - URL de l'API (default: http://localhost:3001)
 *   K6_AUTH_TOKEN    - Token JWT pour les requêtes authentifiées
 */

import http from 'k6/http';
import ws from 'k6/ws';
import { check, sleep, group } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// ============================================
// CONFIGURATION
// ============================================

const API_BASE = __ENV.K6_API_BASE_URL || 'http://localhost:3001';
const AUTH_TOKEN = __ENV.K6_AUTH_TOKEN || '';

export const options = {
  scenarios: {
    // Scénario 1: Simulation GPS (montée progressive)
    gps_positions: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 500 },    // Montée à 500 trackers
        { duration: '2m', target: 2000 },   // Montée à 2000 trackers
        { duration: '5m', target: 2000 },   // Plateau 2000 trackers
        { duration: '1m', target: 500 },    // Descente
        { duration: '30s', target: 0 },     // Arrêt
      ],
      exec: 'gpsPositionUpdate',
    },
    // Scénario 2: WebSocket temps réel (50 clients dashboard)
    websocket_clients: {
      executor: 'constant-vus',
      vus: 50,
      duration: '8m',
      exec: 'websocketClient',
      startTime: '1m',
    },
  },
  thresholds: {
    'http_req_duration{scenario:gps_positions}': ['p(95)<500', 'p(99)<1000'],
    'http_req_failed{scenario:gps_positions}': ['rate<0.01'],       // < 1% erreurs
    'gps_position_saved': ['count>5000'],                            // Au moins 5000 positions
    'ws_messages_received': ['count>100'],
  },
};

// ============================================
// CUSTOM METRICS
// ============================================

const gpsPositionSaved = new Counter('gps_position_saved');
const gpsPositionFailed = new Counter('gps_position_failed');
const wsMessagesReceived = new Counter('ws_messages_received');
const gpsLatency = new Trend('gps_processing_latency_ms');

// ============================================
// HELPERS
// ============================================

// Générer une position GPS réaliste autour d'Abidjan
function generatePosition(vuId) {
  // Centre Abidjan: 5.3600, -4.0083
  // Variation: ±0.1 degré (~10km)
  const baseLat = 5.3600 + (vuId % 100) * 0.002;
  const baseLng = -4.0083 + Math.floor(vuId / 100) * 0.002;
  
  // Mouvement aléatoire
  const lat = baseLat + (Math.random() - 0.5) * 0.01;
  const lng = baseLng + (Math.random() - 0.5) * 0.01;
  const speed = Math.random() * 120; // 0-120 km/h
  const heading = Math.floor(Math.random() * 360);
  
  return {
    latitude: parseFloat(lat.toFixed(6)),
    longitude: parseFloat(lng.toFixed(6)),
    speed: parseFloat(speed.toFixed(1)),
    heading: heading,
    altitude: 50 + Math.random() * 100,
    timestamp: new Date().toISOString(),
  };
}

function generateImei(vuId) {
  // Générer un IMEI réaliste (15 chiffres)
  const prefix = '86'; // Préfixe commun trackers
  const body = String(vuId).padStart(13, '0');
  return prefix + body;
}

// ============================================
// SCÉNARIO 1: Envoi de positions GPS
// ============================================

export function gpsPositionUpdate() {
  const imei = generateImei(__VU);
  const position = generatePosition(__VU);

  const headers = {
    'Content-Type': 'application/json',
  };
  
  if (AUTH_TOKEN) {
    headers['Authorization'] = `Bearer ${AUTH_TOKEN}`;
  }

  group('GPS Position Update', () => {
    // Simuler l'envoi d'une position via l'API REST
    // En production, les trackers utilisent TCP, mais pour le load test
    // on utilise l'endpoint HTTP de test
    const payload = JSON.stringify({
      imei: imei,
      ...position,
      protocol: 'gt06',
      raw_data: `k6_loadtest_vu${__VU}_iter${__ITER}`,
    });

    const res = http.post(`${API_BASE}/api/fleet/positions`, payload, {
      headers: headers,
      tags: { name: 'GPS_Position' },
    });

    const success = check(res, {
      'status is 200 or 201': (r) => r.status === 200 || r.status === 201,
      'response time < 500ms': (r) => r.timings.duration < 500,
    });

    if (success) {
      gpsPositionSaved.add(1);
    } else {
      gpsPositionFailed.add(1);
    }

    gpsLatency.add(res.timings.duration);
  });

  // Simuler l'intervalle d'un tracker (10-30 secondes)
  sleep(Math.random() * 3 + 1); // 1-4s en test (compressé)
}

// ============================================
// SCÉNARIO 2: Client WebSocket
// ============================================

export function websocketClient() {
  const wsUrl = API_BASE.replace('http', 'ws') + '/socket.io/?EIO=4&transport=websocket';

  const res = ws.connect(wsUrl, {}, function (socket) {
    socket.on('open', () => {
      // Socket.IO handshake
      socket.send('40');
    });

    socket.on('message', (data) => {
      wsMessagesReceived.add(1);
      
      // Répondre aux pings Socket.IO
      if (data === '2') {
        socket.send('3');
      }
    });

    socket.on('error', (e) => {
      // Ignorer les erreurs de connexion en load test
    });

    // Rester connecté pendant la durée du test
    socket.setTimeout(() => {
      socket.close();
    }, 60000 * 7); // 7 minutes
  });
}

// ============================================
// FONCTIONS UTILITAIRES POUR TESTS MANUELS
// ============================================

// Export pour réutilisation
export function healthCheck() {
  const res = http.get(`${API_BASE}/health`);
  check(res, {
    'health check OK': (r) => r.status === 200,
  });
}
