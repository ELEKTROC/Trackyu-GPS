// services/api.ts — Facade: assembles all domain modules into the unified `api` object.
// Original 6267-line monolith has been split into domain modules under services/api/.
// This file re-exports the same public API shape so all consumers keep working unchanged.

import { API_URL, USE_MOCK, NETWORK_DELAY, sleep, getHeaders, handleAuthError } from './api/client';
import { createFleetApi } from './api/fleet';
import { createCrmApi } from './api/crm';
import { createFinanceApi } from './api/finance';
import { createTechApi } from './api/tech';
import { createSupportApi } from './api/support';
import { createAdminApi } from './api/admin';
import { createMonitoringApi } from './api/monitoring';
import { createNotificationsApi } from './api/notifications';
import { logger } from '../utils/logger';

// Lazy reference — lets modules call each other through the assembled `api`
const lazyApi = () => api;

// --- Assemble domain modules ---
const fleetModule = createFleetApi(lazyApi);
const crmModule = createCrmApi(lazyApi);
const financeModule = createFinanceApi();
const techModule = createTechApi(lazyApi);
const supportModule = createSupportApi(lazyApi);
const adminModule = createAdminApi(lazyApi);
const monitoringModule = createMonitoringApi();
const notificationsModule = createNotificationsApi();

// --- API EXPORT ---
export const api = {
  // ─── Generic HTTP Methods ───────────────────────────────────────────
  get: async <T = any>(url: string, config?: { params?: Record<string, any> }): Promise<{ data: T }> => {
    const queryString = config?.params
      ? '?' + new URLSearchParams(config.params as Record<string, string>).toString()
      : '';
    const fullUrl = url.startsWith('http') ? url : `${API_URL}${url}${queryString}`;
    const response = await fetch(fullUrl, { headers: getHeaders() });
    if (!response.ok) {
      if (handleAuthError(response)) return { data: null as T };
      throw new Error(`GET ${url} failed: ${response.statusText}`);
    }
    const data = await response.json();
    return { data };
  },

  post: async <T = any>(url: string, body?: any): Promise<{ data: T }> => {
    const fullUrl = url.startsWith('http') ? url : `${API_URL}${url}`;
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      if (handleAuthError(response)) return { data: null as T };
      throw new Error(`POST ${url} failed: ${response.statusText}`);
    }
    const data = await response.json();
    return { data };
  },

  put: async <T = any>(url: string, body?: any): Promise<{ data: T }> => {
    const fullUrl = url.startsWith('http') ? url : `${API_URL}${url}`;
    const response = await fetch(fullUrl, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      if (handleAuthError(response)) return { data: null as T };
      throw new Error(`PUT ${url} failed: ${response.statusText}`);
    }
    const data = await response.json();
    return { data };
  },

  patch: async <T = any>(url: string, body?: any): Promise<{ data: T }> => {
    const fullUrl = url.startsWith('http') ? url : `${API_URL}${url}`;
    const response = await fetch(fullUrl, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`PATCH ${url} failed: ${response.statusText}`);
    const data = await response.json();
    return { data };
  },

  delete: async <T = any>(url: string): Promise<{ data: T }> => {
    const fullUrl = url.startsWith('http') ? url : `${API_URL}${url}`;
    const response = await fetch(fullUrl, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error(`DELETE ${url} failed: ${response.statusText}`);
    const data = response.headers.get('content-type')?.includes('application/json') ? await response.json() : {};
    return { data };
  },

  // ─── Fleet domain ──────────────────────────────────────────────────
  vehicles: fleetModule.vehicles,
  objects: fleetModule.objects,
  fuel: fleetModule.fuel,
  fuelEvents: fleetModule.fuelEvents,
  positionAnomalies: fleetModule.positionAnomalies,
  maintenance: fleetModule.maintenance,
  alerts: fleetModule.alerts,
  zones: fleetModule.zones,
  drivers: fleetModule.drivers,
  groups: fleetModule.groups,
  commands: fleetModule.commands,
  pois: fleetModule.pois,
  alertConfigs: fleetModule.alertConfigs,
  maintenanceRules: fleetModule.maintenanceRules,
  scheduleRules: fleetModule.scheduleRules,
  ecoDrivingProfiles: fleetModule.ecoDrivingProfiles,
  branches: fleetModule.branches,
  fleet: fleetModule.fleetApi,

  // ─── CRM domain ───────────────────────────────────────────────────
  tiers: crmModule.tiers,
  resellers: crmModule.resellers,
  clients: crmModule.clients,
  leads: crmModule.leads,
  suppliers: crmModule.suppliers,
  crm: crmModule.crm,

  // ─── Finance domain ────────────────────────────────────────────────
  contracts: financeModule.contracts,
  invoices: financeModule.invoices,
  quotes: financeModule.quotes,
  catalog: financeModule.catalog,
  stockMovements: financeModule.stockMovements,
  accounting: financeModule.accounting,
  cashClosings: financeModule.cashClosings,
  payments: financeModule.payments,
  supplierInvoices: financeModule.supplierInvoices,
  bankTransactions: financeModule.bankTransactions,
  budgets: financeModule.budgets,
  subscriptions: financeModule.subscriptions,
  finance: financeModule.finance,

  // ─── Tech domain ──────────────────────────────────────────────────
  stock: techModule.stock,
  interventions: techModule.interventions,
  techs: techModule.techs,
  techSettings: techModule.techSettings,
  discoveredDevices: techModule.discoveredDevices,
  tech: techModule.techApi,

  // ─── Support domain ───────────────────────────────────────────────
  tickets: supportModule.tickets,
  faq: supportModule.faq,
  ai: supportModule.ai,

  // ─── Admin domain ─────────────────────────────────────────────────
  anomalies: adminModule.anomalies,
  userActivity: adminModule.userActivity,
  users: adminModule.users,
  trash: adminModule.trash,
  settings: adminModule.settings,
  system: adminModule.system,
  adminFeatures: adminModule.adminFeatures,
  registrationRequests: adminModule.registrationRequests,
  messageTemplates: adminModule.messageTemplates,
  tenants: adminModule.tenants,
  webhookDeliveries: adminModule.webhookDeliveries,
  apiKeys: adminModule.apiKeys,
  auditLogs: adminModule.auditLogs,

  // ─── Monitoring domain ────────────────────────────────────────────
  monitoring: monitoringModule,

  // ─── Notifications domain ─────────────────────────────────────────
  notifications: notificationsModule,
  send: notificationsModule, // Keep send for backward compat

  // ─── Analytics (small, stays in facade) ───────────────────────────
  analytics: {
    getDashboardStats: async (): Promise<any> => {
      if (USE_MOCK) return null;
      try {
        const response = await fetch(`${API_URL}/analytics/dashboard`, { headers: getHeaders() });
        if (!response.ok) throw new Error('Failed to fetch dashboard stats');
        return await response.json();
      } catch (e) {
        logger.warn('API Error (dashboard), falling back to mock data:', e);
        return null;
      }
    },
  },

  // ─── System reset (small, stays in facade) ───────────────────────
  reset: async () => {
    await sleep(1000);
    localStorage.clear();
    window.location.reload();
  },
};
