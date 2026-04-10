import { z } from 'zod';

export const resellerDrawerSchema = z.object({
  // Identité - Société
  name: z.string().min(2, 'Nom requis (min 2 caractères)'),
  slug: z.string()
    .min(2, 'Le slug doit avoir au moins 2 caractères')
    .max(10, 'Le slug ne peut pas dépasser 10 caractères')
    .regex(/^[A-Z0-9]+$/i, 'Le slug doit être en majuscules sans espaces ni caractères spéciaux')
    .transform(val => val.toUpperCase()),
  email: z.string().email('Email invalide'),
  phone: z.string().optional(),
  address: z.string().optional(),
  siret: z.string().optional(),

  // Identity - Admin
  adminName: z.string().min(2, 'Nom admin requis'),
  adminEmail: z.string().email('Email admin invalide'),
  adminPhone: z.string().optional(),
  password: z.string().optional(),

  // Identity - Brand
  brandName: z.string().optional(),
  primaryColor: z.string().optional().default('#3b82f6'),
  secondaryColor: z.string().optional().default('#1e40af'),
  customDomain: z.string().optional(),

  // Configuration - Modules
  modules: z.object({
    fleet: z.boolean().default(true),
    interventions: z.boolean().default(true),
    stock: z.boolean().default(false),
    crm: z.boolean().default(false),
    finance: z.boolean().default(false),
    reports: z.boolean().default(true),
    alerts: z.boolean().default(true),
    map: z.boolean().default(true),
  }).optional(),

  // Configuration - Permissions
  permissions: z.object({
    canManageTeam: z.boolean().default(true),
    canManageIntegrations: z.boolean().default(false),
    canManageOrganization: z.boolean().default(true),
    canAccessApi: z.boolean().default(false),
    canExportData: z.boolean().default(true),
    canDeleteData: z.boolean().default(false),
  }).optional(),

  // Status
  isActive: z.boolean().default(true),
});

export type ResellerDrawerFormData = z.infer<typeof resellerDrawerSchema>;
