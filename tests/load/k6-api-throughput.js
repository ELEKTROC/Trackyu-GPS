/**
 * k6 Load Test - API Throughput
 * 
 * Teste les performances des endpoints API principaux :
 * - Auth (login)
 * - Fleet (vehicles, positions)
 * - Dashboard (analytics)
 * - CRM (leads, quotes)
 * 
 * Usage:
 *   k6 run tests/load/k6-api-throughput.js
 *   k6 run --vus 50 --duration 3m tests/load/k6-api-throughput.js
 * 
 * Variables d'environnement:
 *   K6_API_BASE_URL   - URL de l'API (default: http://localhost:3001)
 *   K6_USER_EMAIL     - Email pour login
 *   K6_USER_PASSWORD  - Mot de passe pour login
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { SharedArray } from 'k6/data';
import { Counter, Rate, Trend } from 'k6/metrics';

// ============================================
// CONFIGURATION
// ============================================

const API_BASE = __ENV.K6_API_BASE_URL || 'http://localhost:3001';
const USER_EMAIL = __ENV.K6_USER_EMAIL || 'admin@trackyugps.com';
const USER_PASSWORD = __ENV.K6_USER_PASSWORD || 'admin123';

export const options = {
  scenarios: {
    // Test de charge progressif
    api_load: {
      executor: 'ramping-arrival-rate',
      startRate: 10,
      timeUnit: '1s',
      preAllocatedVUs: 100,
      maxVUs: 200,
      stages: [
        { duration: '30s', target: 20 },   // Warm-up
        { duration: '2m', target: 50 },    // Charge modérée
        { duration: '2m', target: 100 },   // Charge élevée
        { duration: '1m', target: 150 },   // Pic
        { duration: '30s', target: 0 },    // Cool-down
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<1000', 'p(99)<2000'],
    http_req_failed: ['rate<0.05'],
    'http_req_duration{name:login}': ['p(95)<500'],
    'http_req_duration{name:vehicles_list}': ['p(95)<800'],
    'http_req_duration{name:dashboard}': ['p(95)<1000'],
  },
};

// ============================================
// CUSTOM METRICS
// ============================================

const apiErrors = new Counter('api_errors');
const authSuccess = new Rate('auth_success_rate');

// ============================================
// SETUP - Login et récupération du token
// ============================================

export function setup() {
  const loginRes = http.post(`${API_BASE}/api/auth/login`, JSON.stringify({
    email: USER_EMAIL,
    password: USER_PASSWORD,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  const success = check(loginRes, {
    'login successful': (r) => r.status === 200,
    'has token': (r) => {
      try {
        return JSON.parse(r.body).token !== undefined;
      } catch {
        return false;
      }
    },
  });

  if (!success) {
    console.error(`Login failed: ${loginRes.status} ${loginRes.body}`);
    return { token: '' };
  }

  const body = JSON.parse(loginRes.body);
  return { token: body.token };
}

// ============================================
// SCÉNARIO PRINCIPAL
// ============================================

export default function (data) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${data.token}`,
  };

  // Sélection aléatoire pondérée des endpoints
  const scenarios = [
    { weight: 30, fn: () => testVehicles(headers) },
    { weight: 20, fn: () => testDashboard(headers) },
    { weight: 15, fn: () => testFleet(headers) },
    { weight: 10, fn: () => testClients(headers) },
    { weight: 10, fn: () => testAlerts(headers) },
    { weight: 5, fn: () => testCRM(headers) },
    { weight: 5, fn: () => testFinance(headers) },
    { weight: 5, fn: () => testHealth() },
  ];

  const totalWeight = scenarios.reduce((sum, s) => sum + s.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const scenario of scenarios) {
    random -= scenario.weight;
    if (random <= 0) {
      scenario.fn();
      break;
    }
  }

  sleep(0.1 + Math.random() * 0.3); // 100-400ms entre requêtes
}

// ============================================
// TEST FUNCTIONS
// ============================================

function testVehicles(headers) {
  group('Vehicles API', () => {
    const res = http.get(`${API_BASE}/api/vehicles`, {
      headers,
      tags: { name: 'vehicles_list' },
    });

    check(res, {
      'vehicles: status 200': (r) => r.status === 200,
      'vehicles: is array': (r) => {
        try { return Array.isArray(JSON.parse(r.body)); } catch { return false; }
      },
    }) || apiErrors.add(1);
  });
}

function testDashboard(headers) {
  group('Dashboard API', () => {
    const res = http.get(`${API_BASE}/api/analytics/dashboard`, {
      headers,
      tags: { name: 'dashboard' },
    });

    check(res, {
      'dashboard: status 200': (r) => r.status === 200,
    }) || apiErrors.add(1);
  });
}

function testFleet(headers) {
  group('Fleet API', () => {
    const res = http.get(`${API_BASE}/api/fleet/vehicles`, {
      headers,
      tags: { name: 'fleet_vehicles' },
    });

    check(res, {
      'fleet: status 200': (r) => r.status === 200,
    }) || apiErrors.add(1);
  });
}

function testClients(headers) {
  group('Clients API', () => {
    const res = http.get(`${API_BASE}/api/clients`, {
      headers,
      tags: { name: 'clients_list' },
    });

    check(res, {
      'clients: status 200': (r) => r.status === 200,
    }) || apiErrors.add(1);
  });
}

function testAlerts(headers) {
  group('Alerts API', () => {
    const res = http.get(`${API_BASE}/api/alerts`, {
      headers,
      tags: { name: 'alerts_list' },
    });

    check(res, {
      'alerts: status 200': (r) => r.status === 200,
    }) || apiErrors.add(1);
  });
}

function testCRM(headers) {
  group('CRM API', () => {
    const res = http.get(`${API_BASE}/api/leads`, {
      headers,
      tags: { name: 'leads_list' },
    });

    check(res, {
      'leads: status 200': (r) => r.status === 200,
    }) || apiErrors.add(1);
  });
}

function testFinance(headers) {
  group('Finance API', () => {
    const res = http.get(`${API_BASE}/api/finance/invoices`, {
      headers,
      tags: { name: 'invoices_list' },
    });

    check(res, {
      'invoices: status 200': (r) => r.status === 200,
    }) || apiErrors.add(1);
  });
}

function testHealth() {
  group('Health Check', () => {
    const res = http.get(`${API_BASE}/health`, {
      tags: { name: 'health' },
    });

    check(res, {
      'health: status 200': (r) => r.status === 200,
    });
  });
}

// ============================================
// TEARDOWN
// ============================================

export function teardown(data) {
  console.log('=== Load Test Complete ===');
  console.log(`API Base: ${API_BASE}`);
}
