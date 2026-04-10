// types/enums.ts — Core enums used across the application

export enum VehicleStatus {
  MOVING = 'MOVING',
  IDLE = 'IDLE',
  STOPPED = 'STOPPED',
  OFFLINE = 'OFFLINE',
}

export enum View {
  DASHBOARD = 'DASHBOARD',
  MAP = 'MAP',
  FLEET = 'FLEET',
  REPORTS = 'REPORTS',
  SETTINGS = 'SETTINGS',
  AGENDA = 'AGENDA',     // Calendrier interventions/tâches
  
  // Business Modules (Containers)
  PRESALES = 'PRESALES', // Contient: Leads, Devis, Catalogue
  SALES = 'SALES',       // Contient: Clients, Factures, Contrats
  
  // Tech & Stock
  STOCK = 'STOCK',       // Devices, SIM Cards
  TECH = 'TECH',         // Interventions, Scheduling
  MONITORING = 'MONITORING', // Monitoring Technique
  
  // Support & Admin
  SUPPORT = 'SUPPORT',   // Tickets
  ADMIN = 'ADMIN',        // Users, Roles, Logs
  
  // Comptabilité
  ACCOUNTING = 'ACCOUNTING', // SYSCOHADA, Finance

  // Internal Routing (kept for deep linking if needed, but primarily accessed via tabs)
  LEADS = 'LEADS',
  QUOTES = 'QUOTES',
  CATALOG = 'CATALOG',
  CLIENTS = 'CLIENTS',
  INVOICES = 'INVOICES',
  CONTRACTS = 'CONTRACTS'
}
