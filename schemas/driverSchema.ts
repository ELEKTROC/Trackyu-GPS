import { z } from 'zod';

export const DriverSchema = z.object({
  id: z.string().optional(),
  nom: z.string().min(1, 'Le nom est requis'),
  clientId: z.string().min(1, 'Le client est requis'),
  email: z.string().email('Email invalide').optional().or(z.literal('')),
  telephone: z.string().optional(),
  adresse: z.string().optional(),
  permis: z.string().optional(),
  permisCategories: z.string().optional(), // Ex: "B, C"
  permisExpiration: z.string().optional(),
  rfidTag: z.string().optional(),
  contactUrgence: z.string().optional(),
  statut: z.enum(['ACTIVE', 'INACTIVE', 'ON_LEAVE']).default('ACTIVE'),
  vehicleId: z.string().optional(),
});

export type DriverFormData = z.infer<typeof DriverSchema>;
