import { z } from 'zod';

export const LeadStatusSchema = z.enum(['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST']);
export const LeadTypeSchema = z.enum(['B2B', 'B2C']);

export const InterestedProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.union([z.number(), z.string().transform(v => parseFloat(v) || 0)]),
  quantity: z.number().optional(),
}).passthrough();

export const LeadSchema = z.object({
  id: z.string().optional(),
  tenantId: z.string().optional(),
  
  // Identity
  companyName: z.string().min(1, "Le nom (Société ou Nom complet) est obligatoire"),
  contactName: z.string().optional(),
  type: LeadTypeSchema.default('B2B'),
  
  // Contact
  email: z.string().email("Email invalide").optional().or(z.literal('')),
  phone: z.string().optional(),
  
  // Business
  status: LeadStatusSchema.default('NEW'),
  potentialValue: z.union([z.number(), z.string().transform(v => parseFloat(v) || 0)]).optional(),
  probability: z.number().min(0).max(100).optional(),
  source: z.string().optional(),
  sector: z.string().optional(),
  
  // Assignment
  assignedTo: z.string().optional(),
  
  // Details
  notes: z.string().optional(),
  interestedProducts: z.array(InterestedProductSchema).optional(),
  
  createdAt: z.any().optional(),
  updatedAt: z.any().optional(),
  convertedClientId: z.string().optional(),
  resellerId: z.string().optional(),
  resellerName: z.string().optional(),
}).passthrough();

export type LeadFormData = z.infer<typeof LeadSchema>;
