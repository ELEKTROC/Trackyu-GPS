import { z } from 'zod';

export const BranchSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Le nom de la flotte est requis"),
  clientId: z.string().min(1, "Le client est requis"),
  isDefault: z.boolean().default(false),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),

  // Legacy fields made optional
  ville: z.string().optional(),
  responsable: z.string().optional(),
  email: z.string().email("Email invalide").optional().or(z.literal('')),
  phone: z.string().optional(),
});
