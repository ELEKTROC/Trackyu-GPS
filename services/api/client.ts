// services/api/client.ts — Shared HTTP utilities, mock helpers, mappers
// All domain modules import from this file.

import type { Vehicle, Client, Tier, Supplier, Branch, VehiclePositionHistory, TrackedObject } from '../../types';
import { API_BASE_URL } from '../../utils/apiConfig';
import { logger } from '../../utils/logger';

export const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';
export const NETWORK_DELAY = 600;
export const API_URL = API_BASE_URL;

// --- KEYS STORAGE ---
export const DB_KEYS = {
  VEHICLES: 'db_vehicles_v2',
  STOCK_MOVEMENTS: 'db_stock_movements',
  CLIENTS: 'db_clients_v2',
  LEADS: 'db_leads_v2',
  STOCK: 'db_stock_v4',
  INTERVENTIONS: 'db_interventions_v3',
  ZONES: 'db_zones_v2',
  USERS: 'db_users_v2',
  CONTRACTS: 'db_contracts_v2',
  INVOICES: 'db_invoices_v2',
  QUOTES: 'db_quotes_v2',
  TICKETS: 'db_tickets_v2',
  ALERTS: 'db_alerts_v2',
  CATALOG: 'db_catalog_v1',
  JOURNAL: 'db_journal_v1',
  PAYMENTS: 'db_payments_v1',
  SUPPLIER_INVOICES: 'db_supplier_invoices_v1',
  BANK_TRANSACTIONS: 'db_bank_transactions_v1',
  BUDGETS: 'db_budgets_v1',
  SUPPLIERS: 'db_suppliers_v1',
  POSITION_HISTORY: 'db_position_history_v1',
  FUEL_RECORDS: 'db_fuel_records_v1',
  MAINTENANCE_RECORDS: 'db_maintenance_records_v1',
  TIERS: 'db_tiers_v2',
  SUBSCRIPTIONS: 'db_subscriptions_v1',
  ANOMALIES: 'db_anomalies_v1',
  USER_ACTIVITY: 'db_user_activity_v1',
  INTEGRATIONS: 'db_integrations_v2',
  TEMPLATES: 'db_templates_v2',
  WEBHOOKS: 'db_webhooks_v2',
  HELP_ARTICLES: 'db_help_articles_v2',
  ORGANIZATION: 'db_organization_v2',
  DRIVERS: 'db_drivers_v1',
  TECHS: 'db_techs_v1',
  BRANCHES: 'db_branches_v1',
  GROUPS: 'db_groups_v1',
  COMMANDS: 'db_commands_v1',
  POIS: 'db_pois_v1',
  ALERT_CONFIGS: 'db_alert_configs_v1',
  MAINTENANCE_RULES: 'db_maintenance_rules_v1',
  SCHEDULE_RULES: 'db_schedule_rules_v1',
  ECO_DRIVING_PROFILES: 'db_eco_driving_profiles_v1',
  TASKS: 'db_tasks_v1',
  SETTINGS: 'db_settings_v1',
  ROLES: 'db_roles_v1',
};

// --- MAPPERS ---

export const tierToClient = (t: Tier, allTiers?: Tier[]): Client => {
  let resellerId = t.resellerId || t.clientData?.resellerId;
  let resellerName: string | undefined;
  if (allTiers) {
    if (resellerId) {
      const reseller = allTiers.find(tier => tier.id === resellerId);
      resellerName = reseller?.name;
    }
    if (!resellerId && t.tenantId && t.tenantId !== 'tenant_default') {
      const reseller = allTiers.find(tier => tier.type === 'RESELLER' && tier.tenantId === t.tenantId);
      if (reseller) {
        resellerId = reseller.id;
        resellerName = reseller.name;
      }
    }
  }
  return {
    id: t.id,
    tenantId: t.tenantId,
    name: t.name,
    type: 'B2B',
    status: t.status as any,
    contactName: t.contactName || t.name,
    email: t.email,
    phone: t.phone || '',
    address: t.address || '',
    city: t.city,
    country: t.country,
    subscriptionPlan: t.clientData?.subscriptionPlan || 'Standard',
    createdAt: new Date(t.createdAt),
    sector: 'Transport',
    segment: t.clientData?.segment || 'Standard',
    language: 'Français',
    paymentTerms: '30 jours',
    currency: 'EUR',
    paymentStatus: 'UP_TO_DATE',
    balance: t.clientData?.balance || 0,
    contacts: [],
    resellerId,
    resellerName,
  };
};

export const clientToTier = (c: Client): Tier => ({
  id: c.id,
  tenantId: c.tenantId,
  type: 'CLIENT',
  name: c.name,
  email: c.email,
  phone: c.phone,
  address: c.address,
  city: c.city,
  country: c.country,
  status: c.status as any,
  createdAt: c.createdAt.toISOString(),
  updatedAt: new Date().toISOString(),
  contactName: c.contactName,
  clientData: {
    subscriptionPlan: c.subscriptionPlan,
    resellerId: c.resellerId,
    balance: c.balance,
    segment: c.segment
  }
});

export const tierToSupplier = (t: Tier): Supplier => ({
  id: t.id,
  tenantId: t.tenantId,
  name: t.name,
  email: t.email,
  phone: t.phone,
  address: t.address,
  taxId: t.supplierData?.taxId,
  paymentTerms: t.supplierData?.paymentTerms,
  createdAt: t.createdAt,
  defaultAccountCode: '401100'
});

export const supplierToTier = (s: Supplier): Tier => ({
  id: s.id,
  tenantId: s.tenantId || 'tenant_default',
  type: 'SUPPLIER',
  name: s.name,
  email: s.email || '',
  phone: s.phone,
  address: s.address,
  status: 'ACTIVE',
  createdAt: s.createdAt,
  updatedAt: new Date().toISOString(),
  supplierData: {
    paymentTerms: s.paymentTerms,
    taxId: s.taxId
  }
});

// --- CORE UTILS ---

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const db = {
  get: <T>(key: string, initialData: T): T => {
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        logger.error('DB Corrupt', e);
      }
    }
    localStorage.setItem(key, JSON.stringify(initialData));
    return initialData;
  },
  save: (key: string, data: any) => {
    localStorage.setItem(key, JSON.stringify(data));
  },
  set: (key: string, data: any) => {
    localStorage.setItem(key, JSON.stringify(data));
  }
};

export const filterByTenant = <T extends { tenantId?: string }>(data: T[], tenantId?: string) => {
  if (!tenantId) return data;
  return data.filter(item => item.tenantId === tenantId);
};

export const handleAuthError = (response: Response) => {
  if (response.status === 401 || response.status === 403) {
    const token = localStorage.getItem('fleet_token');
    if (token) {
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
          const now = Math.floor(Date.now() / 1000);
          if (payload.exp && payload.exp < now) {
            logger.debug('[API] Token expiré détecté, tentative de refresh automatique');
            // Don't force-logout here — let the auto-refresh interceptor handle it
            return true;
          }
        }
      } catch { /* ignore decode errors */ }
    }
  }
  return false;
};

// --- TOKEN REFRESH INTERCEPTOR ---

let refreshPromise: Promise<string | null> | null = null;

/**
 * Attempt to refresh the access token using the httpOnly refresh_token cookie.
 * Returns the new access token, or null if refresh failed.
 * Deduplicates concurrent refresh attempts via a shared promise.
 */
async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include', // Send httpOnly cookie
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        // Refresh failed — force logout
        logger.debug('[API] Refresh token invalide, déconnexion');
        localStorage.removeItem('fleet_user');
        localStorage.removeItem('fleet_token');
        localStorage.removeItem('impersonate_tenant_id');
        localStorage.removeItem('impersonate_reseller_id');
        window.location.reload();
        return null;
      }

      const data = await response.json();
      const newToken = data.token;
      if (newToken) {
        localStorage.setItem('fleet_token', newToken);
        // Update stored user if the server returned updated user info
        if (data.user) {
          localStorage.setItem('fleet_user', JSON.stringify(data.user));
        }
      }
      return newToken;
    } catch (err) {
      logger.error('[API] Erreur lors du refresh token:', err);
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * Execute a fetch request with automatic token refresh on 401.
 * Retries once after a successful refresh.
 */
async function fetchWithRefresh(url: string, options: RequestInit): Promise<Response> {
  const response = await fetch(url, { ...options, credentials: 'include' });

  if (response.status === 401) {
    // Try to refresh
    const newToken = await refreshAccessToken();
    if (newToken) {
      // Retry original request with new token
      const retryHeaders = { ...(options.headers as Record<string, string>) };
      retryHeaders['Authorization'] = `Bearer ${newToken}`;
      return fetch(url, { ...options, headers: retryHeaders, credentials: 'include' });
    }
  }

  return response;
}

// UUID v4 pattern — valide le format avant injection dans les headers
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
// Accepte aussi les IDs tenant au format "tenant_<alphanumeric>"
const TENANT_ID_PATTERN = /^(tenant_)?[a-zA-Z0-9_-]{1,64}$/;

export const getHeaders = () => {
  const token = localStorage.getItem('fleet_token');
  const impersonateTenantId = localStorage.getItem('impersonate_tenant_id');
  const impersonateExpiry = localStorage.getItem('impersonate_expiry');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : ''
  };

  // Vérifier que l'impersonation est valide : format + non expirée
  const isImpersonationValid =
    impersonateTenantId &&
    (UUID_PATTERN.test(impersonateTenantId) || TENANT_ID_PATTERN.test(impersonateTenantId)) &&
    impersonateExpiry &&
    Date.now() < parseInt(impersonateExpiry, 10);

  if (isImpersonationValid) {
    headers['X-Impersonate-Tenant'] = impersonateTenantId!;
  } else if (impersonateTenantId) {
    // Nettoyer une impersonation expirée ou invalide
    localStorage.removeItem('impersonate_tenant_id');
    localStorage.removeItem('impersonate_reseller_id');
    localStorage.removeItem('impersonate_expiry');
  }

  return headers;
};

// --- URL SAFETY ---
// Toutes les URLs doivent être relatives (commencer par /) sauf les URLs explicitement
// construites en interne. Protège contre les SSRF et les appels vers des domaines tiers.
const buildUrl = (url: string, queryString = ''): string => {
  if (!url.startsWith('/') && !url.startsWith(API_URL)) {
    logger.error(`[API] URL externe rejetée : ${url}`);
    throw new Error('Appel API vers une URL externe non autorisée');
  }
  return url.startsWith('http') ? `${url}${queryString}` : `${API_URL}${url}${queryString}`;
};

// --- GENERIC HTTP METHODS ---

export const httpGet = async <T = any>(url: string, config?: { params?: Record<string, any> }): Promise<{ data: T }> => {
  const queryString = config?.params
    ? '?' + new URLSearchParams(config.params as Record<string, string>).toString()
    : '';
  const fullUrl = buildUrl(url, queryString);
  const response = await fetchWithRefresh(fullUrl, { headers: getHeaders() });
  if (!response.ok) {
    if (handleAuthError(response)) return { data: null as T };
    throw new Error(`GET ${url} failed: ${response.statusText}`);
  }
  const data = await response.json();
  return { data };
};

export const httpPost = async <T = any>(url: string, body?: any): Promise<{ data: T }> => {
  const fullUrl = buildUrl(url);
  const response = await fetchWithRefresh(fullUrl, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    if (handleAuthError(response)) return { data: null as T };
    throw new Error(`POST ${url} failed: ${response.statusText}`);
  }
  const data = await response.json();
  return { data };
};

export const httpPut = async <T = any>(url: string, body?: any): Promise<{ data: T }> => {
  const fullUrl = buildUrl(url);
  const response = await fetchWithRefresh(fullUrl, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    if (handleAuthError(response)) return { data: null as T };
    throw new Error(`PUT ${url} failed: ${response.statusText}`);
  }
  const data = await response.json();
  return { data };
};

export const httpPatch = async <T = any>(url: string, body?: any): Promise<{ data: T }> => {
  const fullUrl = buildUrl(url);
  const response = await fetchWithRefresh(fullUrl, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error(`PATCH ${url} failed: ${response.statusText}`);
  const data = await response.json();
  return { data };
};

export const httpDelete = async <T = any>(url: string): Promise<{ data: T }> => {
  const fullUrl = buildUrl(url);
  const response = await fetchWithRefresh(fullUrl, {
    method: 'DELETE',
    headers: getHeaders()
  });
  if (!response.ok) throw new Error(`DELETE ${url} failed: ${response.statusText}`);
  const data = response.headers.get('content-type')?.includes('application/json')
    ? await response.json()
    : {};
  return { data };
};
