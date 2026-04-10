import { z } from 'zod';

export const TierTypeSchema = z.enum(['CLIENT', 'RESELLER', 'SUPPLIER', 'PROSPECT']);
export const TierStatusSchema = z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'CHURNED']);

export const TierSchema = z.object({
  id: z.string().optional(),
  tenantId: z.string().optional(),
  type: TierTypeSchema,
  name: z.string().min(1, "Le nom est obligatoire"),
  slug: z.string().optional(),
  email: z.string().email("Email invalide").optional().or(z.literal('')).or(z.null()).transform(val => val || undefined),
  phone: z.string().optional().or(z.null()).transform(val => val || undefined),
  address: z.string().optional().or(z.null()).transform(val => val || undefined),
  city: z.string().optional().or(z.null()).transform(val => val || undefined),
  country: z.string().optional().or(z.null()).transform(val => val || undefined),
  status: TierStatusSchema.default('ACTIVE'),
  accountingCode: z.string().optional().or(z.null()).transform(val => val || undefined),
  resellerId: z.string().optional().or(z.null()).transform(val => val || undefined),
  application: z.enum(['TRACKYU', 'GPS51', 'WHATSGPS', 'AUTRES']).optional().or(z.null()).transform(val => val || undefined),
  applicationDetail: z.string().optional().or(z.null()).transform(val => val || undefined),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  contactName: z.string().optional().or(z.null()).transform(val => val || undefined),
  secondContactName: z.string().optional().or(z.null()).transform(val => val || undefined),
  createUserAccount: z.boolean().optional(),

  // Client Data
  clientData: z.object({
    type: z.enum(['B2B', 'B2C']).optional(),
    subscriptionPlan: z.string().optional(),
    resellerId: z.string().optional(),
    currency: z.string().optional(),
    paymentTerms: z.string().optional(),
    sector: z.string().optional(),
    segment: z.string().optional(),
    language: z.string().optional(),
    fleetSize: z.number().optional(),
    balance: z.number().optional(),
    vehicleCount: z.number().optional(),
    contractCount: z.number().optional(),
  }).passthrough().optional(),

  // Reseller Data
  resellerData: z.object({
    domain: z.string().optional(),
    logo: z.string().optional(),
    activeClients: z.number().optional(),
    clientCount: z.number().optional(),
    activity: z.string().optional(),
    rccm: z.string().optional(),
    ccNumber: z.string().optional(),
    managerName: z.string().optional(),
    fiscalYear: z.string().optional(),
    contractDate: z.string().optional(),
    region: z.string().optional(),
    bankInfo: z.string().optional(),
    siret: z.string().optional(),
    adminName: z.string().optional(),
    adminEmail: z.string().optional(),
    adminPhone: z.string().optional(),
    brandName: z.string().optional(),
    primaryColor: z.string().optional(),
    secondaryColor: z.string().optional(),
    customDomain: z.string().optional(),
    maxVehicles: z.number().optional(),
    maxUsers: z.number().optional(),
    maxClients: z.number().optional(),
    modules: z.object({
      fleet: z.boolean().optional(),
      interventions: z.boolean().optional(),
      stock: z.boolean().optional(),
      crm: z.boolean().optional(),
      finance: z.boolean().optional(),
      reports: z.boolean().optional(),
      alerts: z.boolean().optional(),
      map: z.boolean().optional(),
    }).optional(),
    permissions: z.array(z.string()).optional(),
    isActive: z.boolean().optional(),
  }).passthrough().optional(),

  // Supplier Data
  supplierData: z.object({
    category: z.string().optional(),
    paymentTerms: z.string().optional(),
    taxId: z.string().optional(),
    website: z.string().optional(),
    balance: z.number().optional(),
    resellerId: z.string().optional(),
    rating: z.number().optional(),
  }).passthrough().optional(),
}).passthrough(); // Allow additional fields

// For updates, make everything optional except id
export const TierUpdateSchema = TierSchema.partial().extend({
  id: z.string().optional(),
});
