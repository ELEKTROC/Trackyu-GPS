import { z } from 'zod';

// Permissions granulaires pour sous-utilisateurs
export const SubUserPermissionsSchema = z.object({
  // Flotte
  canViewVehicles: z.boolean().default(true),
  canEditVehicles: z.boolean().default(false),
  canViewDrivers: z.boolean().default(true),
  canEditDrivers: z.boolean().default(false),

  // Carte
  canViewMap: z.boolean().default(true),
  canViewHistory: z.boolean().default(true),

  // Alertes
  canViewAlerts: z.boolean().default(true),
  canConfigureAlerts: z.boolean().default(false),

  // Rapports
  canViewReports: z.boolean().default(true),
  canExportReports: z.boolean().default(false),

  // Interventions (création réservée au staff — canCreate toujours false pour sous-compte)
  canViewInterventions: z.boolean().default(false),
  canCreateInterventions: z.boolean().default(false),

  // Tickets
  canCreateTickets: z.boolean().default(false),

  // Zones / Geofences
  canCreateGeofences: z.boolean().default(false),

  // Stock
  canViewStock: z.boolean().default(false),
  canManageStock: z.boolean().default(false),
});

export const SubUserSchema = z.object({
  id: z.string().optional(),

  // Identité
  nom: z.string().min(2, 'Le nom est requis (min 2 caractères)'),
  email: z.string().email('Email invalide'),
  phone: z.string().optional(),
  password: z.string().min(6, 'Mot de passe : 6 caractères minimum').optional(),

  // Rattachement hiérarchique
  clientId: z.string().min(1, 'Client requis'),
  branchId: z.string().optional(),

  // Rôle et accès (Manager réservé aux staff tenant via UserForm — interdit pour sous-compte)
  role: z.enum(['User', 'Viewer'], {
    message: 'Rôle requis',
  }),
  statut: z.enum(['Actif', 'Inactif', 'En attente']).default('Actif'),

  // Véhicules assignés
  vehicleIds: z.array(z.string()).default([]),
  allVehicles: z.boolean().default(false), // Accès à tous les véhicules du client

  // Permissions
  permissions: SubUserPermissionsSchema.optional(),

  // Métadonnées
  notes: z.string().optional(),
  expiresAt: z.date().optional(), // Date d'expiration du compte
});

export type SubUserFormData = z.infer<typeof SubUserSchema>;
export type SubUserPermissions = z.infer<typeof SubUserPermissionsSchema>;

// Presets de permissions par rôle sous-compte
export const ROLE_PERMISSION_PRESETS: Record<string, Partial<SubUserPermissions>> = {
  User: {
    canViewVehicles: true,
    canEditVehicles: true,
    canViewDrivers: true,
    canEditDrivers: true,
    canViewMap: true,
    canViewHistory: true,
    canViewAlerts: true,
    canConfigureAlerts: true,
    canViewReports: true,
    canExportReports: true,
    canViewInterventions: true,
    canCreateInterventions: false,
    canCreateTickets: true,
    canCreateGeofences: true,
    canViewStock: false,
    canManageStock: false,
  },
  Viewer: {
    canViewVehicles: true,
    canEditVehicles: false,
    canViewDrivers: true,
    canEditDrivers: false,
    canViewMap: true,
    canViewHistory: true,
    canViewAlerts: true,
    canConfigureAlerts: false,
    canViewReports: true,
    canExportReports: false,
    canViewInterventions: false,
    canCreateInterventions: false,
    canCreateTickets: false,
    canCreateGeofences: false,
    canViewStock: false,
    canManageStock: false,
  },
};
