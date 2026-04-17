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
import { getStateFromPath as defaultGetStateFromPath } from '@react-navigation/native';
import * as Sentry from '@sentry/react-native';
import type { RootStackParamList } from './types';

// Un identifiant de ressource autorisé : alphanumérique + tiret/underscore, 1–64 chars.
// Couvre UUID, ObjectId Mongo, entiers, cuid, nanoid. Rejette les caractères spéciaux,
// espaces, injection de path (../), guillemets, balises <script>, etc.
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;

// Routes dont le 2e segment doit être un ID valide.
const ID_ROUTES = new Set(['vehicle', 'intervention', 'ticket']);

function isValidIdSegment(segment: string): boolean {
  return SAFE_ID.test(segment);
}

export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['trackyu://'],

  /**
   * Intercepte le parsing des deep links pour valider les paramètres d'identifiants
   * avant que React Navigation ne monte l'écran cible. Un ID mal formé est remplacé
   * par un fallback vers le dashboard et l'événement est remonté à Sentry.
   */
  getStateFromPath: (path, options) => {
    const [basePath] = path.split('?');
    const segments = basePath.split('/').filter(Boolean);

    if (segments.length >= 2 && ID_ROUTES.has(segments[0]) && !isValidIdSegment(segments[1])) {
      Sentry.captureMessage('Invalid deep link ID param', {
        level: 'warning',
        extra: { path, route: segments[0] },
      });
      return defaultGetStateFromPath('dashboard', options);
    }

    return defaultGetStateFromPath(path, options);
  },

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
