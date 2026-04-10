// types/index.ts — Barrel re-export for all domain types
// Import from 'types' or 'types/index' to get everything.
// Import from 'types/fleet', 'types/crm', etc. for domain-specific types.

// Core enums
export * from './enums';

// Auth, permissions, users
export * from './auth';

// Tenant, branches, organization
export * from './admin';

// CRM: clients, leads, tiers, tasks
export * from './crm';

// Fleet: vehicles, GPS, drivers, groups
export * from './fleet';

// Finance: quotes, contracts, invoices, payments
export * from './finance';

// Tech: interventions, stock, devices
export * from './tech';

// Support: tickets, categories
export * from './support';

// Alerts & monitoring
export * from './alerts';

// Fleet rules: maintenance, scheduling, eco-driving
export * from './rules';

// External integrations, templates, webhooks
export * from './integrations';

// CRM automation
export * from './automation';

// accounting and audit modules not yet created — add when needed
