import { z } from 'zod';

export const ClientTypeSchema = z.enum(['B2B', 'B2C']);
export const ClientStatusSchema = z.enum(['ACTIVE', 'SUSPENDED', 'CHURNED']);
export const PaymentStatusSchema = z.enum(['UP_TO_DATE', 'OVERDUE']);

export const ClientContactSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Le nom est obligatoire"),
  role: z.string().optional(),
  email: z.string().email("Email invalide").optional().or(z.literal('')),
  phone: z.string().optional(),
});

export const ClientSchema = z.object({
  id: z.string().optional(),
  tenantId: z.string().optional(),
  name: z.string().min(1, "Le nom de la société est obligatoire"),
  type: ClientTypeSchema.default('B2B'),
  status: ClientStatusSchema.default('ACTIVE'),
  
  // Contact Principal
  contactName: z.string().min(1, "Le nom du contact est obligatoire"),
  email: z.string().email("Email invalide").optional().or(z.literal('')),
  phone: z.string().optional(),
  
  // Contact Secondaire & Adresse
  secondContactName: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  
  // Info Commerciales
  subscriptionPlan: z.string().optional(),
  resellerId: z.string().optional(),
  createdAt: z.date().optional(),
  sector: z.string().optional(),
  segment: z.string().optional(),
  language: z.string().optional(),
  
  // Info Financières
  paymentTerms: z.string().optional(),
  currency: z.string().optional(),
  paymentStatus: PaymentStatusSchema.optional(),
  balance: z.number().optional(),
  
  // Liste des contacts additionnels
  contacts: z.array(ClientContactSchema).optional(),
  
  // Compte utilisateur
  createUserAccount: z.boolean().optional().default(false), // Créer un compte de connexion
  defaultPassword: z.string().optional(), // Mot de passe par défaut (si createUserAccount = true)
  userAccountCreated: z.boolean().optional(), // Indique si le compte a été créé
});

export type ClientFormData = z.infer<typeof ClientSchema>;
