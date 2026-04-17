/**
 * TrackYu Mobile — Deep Linking Configuration
 *
 * Schéma : trackyu://
 * Utilisé par les notifications push pour naviguer vers un écran précis.
 *
 * Exemples :
 *   trackyu://vehicle/abc123          → VehicleDetailScreen
 *   trackyu://alerts                  → AlertsScreen
 *   trackyu://intervention/abc123     → InterventionDetailScreen
 *   trackyu://ticket/abc123           → SupportTicketDetailScreen
 */
import type { LinkingOptions } from '@react-navigation/native';
import type { RootStackParamList } from './types';

export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['trackyu://'],
  config: {
    screens: {
      // ── Auth ────────────────────────────────────────────────────────────────
      Auth: 'auth',

      // ── Onglets principaux ──────────────────────────────────────────────────
      Main: {
        screens: {
          Dashboard: 'dashboard',
          Map: 'map',
          Fleet: 'fleet',
          Finance: 'finance',
          Tickets: 'tickets',
          Settings: 'settings',
          // Tab TECH
          TechDashboard: 'tech-dashboard',
          Agenda: 'agenda',
          Tech: 'tech',
        },
      },

      // ── Écrans stack racine ─────────────────────────────────────────────────
      VehicleDetail: 'vehicle/:vehicleId',
      VehicleHistory: 'vehicle/:vehicleId/history',
      InterventionDetail: 'intervention/:interventionId',
      SupportTicketDetail: 'ticket/:ticketId',
      Alerts: 'alerts',
      Reports: 'reports',
      FleetAnalytics: 'fleet-analytics',
      Admin: 'admin',
      AdminUsers: 'admin/users',
      CRMLeads: 'crm',
      Portal: 'portal',
      PortalContractDocument: 'portal/contract',
      Geofences: 'geofences',
      CreateTicket: 'ticket/new',
      Help: 'help',

      // ── Paramètres ──────────────────────────────────────────────────────────
      SettingsMenu: 'settings/menu',
      Profile: 'settings/profile',
      SubUsers: 'settings/subusers',
      Branches: 'settings/branches',
      Groupes: 'settings/groupes',
      VehiclesList: 'settings/vehicles',
      Drivers: 'settings/drivers',
      Rules: 'settings/rules',
      AlertRules: 'settings/alert-rules',
      Maintenance: 'settings/maintenance',
      EcoConduite: 'settings/ecodriving',
      Depenses: 'settings/expenses',
      Pneus: 'settings/tires',
      Temperature: 'settings/temperature',
    },
  },
};

export default linking;
