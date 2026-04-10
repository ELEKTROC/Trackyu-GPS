// services/api/index.ts — Barrel re-export for all API domain modules
export { createFleetApi } from './fleet';
export { createCrmApi } from './crm';
export { createFinanceApi } from './finance';
export { createTechApi } from './tech';
export { createSupportApi } from './support';
export { createAdminApi } from './admin';
export { createMonitoringApi } from './monitoring';
export { createNotificationsApi } from './notifications';

// Re-export shared client utilities for consumers that need them
export {
  USE_MOCK,
  NETWORK_DELAY,
  API_URL,
  DB_KEYS,
  db,
  sleep,
  filterByTenant,
  getHeaders,
  handleAuthError,
  tierToClient,
  clientToTier,
  tierToSupplier,
  supplierToTier
} from './client';
