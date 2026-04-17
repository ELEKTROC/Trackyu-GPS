/**
 * TrackYu Mobile - Navigation Types
 */
import type { NavigatorScreenParams } from '@react-navigation/native';

// ── Tab param lists par rôle ───────────────────────────────────────────────────

/** CLIENT : 5 onglets flotte + espace client */
export type ClientTabParamList = {
  Dashboard: undefined;
  Map: { vehicleId?: string } | undefined;
  Fleet: undefined;
  Reports: undefined;
  Settings: undefined;
};

/** TECH : dashboard tech + agenda + interventions */
export type TechTabParamList = {
  TechDashboard: undefined;
  Agenda: undefined;
  Tech:
    | {
        initialTab?: 'interventions' | 'devices' | 'stock';
        initialStatus?: 'PENDING' | 'SCHEDULED' | 'EN_ROUTE' | 'IN_PROGRESS' | 'COMPLETED' | 'POSTPONED';
      }
    | undefined;
  Settings: undefined;
};

/** Staff (ADMIN, MANAGER, COMMERCIAL, etc.) */
export type StaffTabParamList = {
  Dashboard: undefined;
  Map: { vehicleId?: string } | undefined;
  Fleet: undefined;
  Finance: undefined;
  Settings: undefined;
};

/** Support (SUPPORT_AGENT) : tickets à la place de Finance */
export type SupportTabParamList = {
  Dashboard: undefined;
  Map: { vehicleId?: string } | undefined;
  Fleet: undefined;
  Tickets: undefined;
  Settings: undefined;
};

/** Alias utilisé dans les navigateurs génériques */
export type MainTabParamList = StaffTabParamList;

// ── Portal stack (CLIENT) ──────────────────────────────────────────────────────

export type PortalStackParamList = {
  ClientPortal: undefined;
  PortalInvoices: undefined;
  PortalInvoiceDetail: { invoiceId: string };
  PortalContracts: undefined;
  PortalSubscriptions: undefined;
  PortalPayments: undefined;
  PortalTickets: undefined;
  PortalTicketDetail: { ticketId: string; subject: string };
  PortalNewTicket: { prefillSubject?: string; prefillDescription?: string } | undefined;
  PortalInterventions: undefined;
  PortalInterventionDetail: { interventionId: string };
};

// ── Root stack ────────────────────────────────────────────────────────────────

export type RootStackParamList = {
  Auth: undefined;
  Main: NavigatorScreenParams<StaffTabParamList> | undefined;
  VehicleDetail: { vehicleId: string };
  VehicleHistory: { vehicleId: string; plate: string; vehicleType?: string };
  InterventionDetail: { interventionId: string };
  Alerts: undefined;
  Reports: undefined;
  Portal: undefined;
  SupportTicketDetail: { ticketId: string; subject: string };
  Admin: undefined;
  AdminUsers: undefined;
  AdminResellers: undefined;
  AdminTrash: undefined;
  AdminAuditLogs: undefined;
  AdminDevices: undefined;
  AdminAgenda: undefined;
  AdminMonitoring: undefined;
  AdminComptabilite: undefined;
  AdminTickets: undefined;
  AdminInterventions: { initialTab?: 'interventions' | 'devices' | 'stock' } | undefined;
  CRMLeads: undefined;
  FleetAnalytics: undefined;
  Geofences: undefined;
  CreateTicket: { vehicleId: string; vehicleName: string; vehiclePlate: string };
  Help: undefined;
  PortalContractDocument: undefined;
  // ── Paramètres ────────────────────────────────────────────────────────────
  SettingsMenu: undefined;
  Profile: undefined;
  SubUsers: undefined;
  Branches: undefined;
  Groupes: undefined;
  VehiclesList: undefined;
  Drivers: undefined;
  Rules: undefined;
  AlertRules: undefined;
  Maintenance: undefined;
  EcoConduite: undefined;
  Depenses: undefined;
  Pneus: undefined;
  Temperature: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
