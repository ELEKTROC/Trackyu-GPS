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
  
  // Interventions
  canViewInterventions: z.boolean().default(false),
  canCreateInterventions: z.boolean().default(false),
  
  // Stock
  canViewStock: z.boolean().default(false),
  canManageStock: z.boolean().default(false),
});

export const SubUserSchema = z.object({
  id: z.string().optional(),
  
  // Identité
  nom: z.string().min(2, "Le nom est requis (min 2 caractères)"),
  email: z.string().email("Email invalide"),
  phone: z.string().optional(),
  
  // Rattachement hiérarchique
  clientId: z.string().min(1, "Client requis"),
  branchId: z.string().optional(),
  
  // Rôle et accès
  role: z.enum(['Manager', 'User', 'Viewer'], {
    message: 'Rôle requis'
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

// Presets de permissions par rôle
export const ROLE_PERMISSION_PRESETS: Record<string, Partial<SubUserPermissions>> = {
  Manager: {
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
    canCreateInterventions: true,
    canViewStock: true,
    canManageStock: false,
  },
  User: {
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
    canViewInterventions: true,
    canCreateInterventions: false,
    canViewStock: false,
    canManageStock: false,
  },
  Viewer: {
    canViewVehicles: true,
    canEditVehicles: false,
    canViewDrivers: true,
    canEditDrivers: false,
    canViewMap: true,
    canViewHistory: false,
    canViewAlerts: true,
    canConfigureAlerts: false,
    canViewReports: false,
    canExportReports: false,
    canViewInterventions: false,
    canCreateInterventions: false,
    canViewStock: false,
    canManageStock: false,
  },
};
