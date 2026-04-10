import { z } from 'zod';

export const PoiSchema = z.object({
  id: z.string().optional(),
  nom: z.string().min(1, "Le nom est requis"),
  type: z.string().min(1, "Le type est requis"),
  adresse: z.string().optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  rayon: z.number().min(1, "Le rayon doit être positif").default(50),
  
  // Partage multi-clients
  isShared: z.boolean().default(false),
  clientIds: z.array(z.string()).default([]),
  allClients: z.boolean().default(false),
  
  statut: z.enum(['Actif', 'Inactif']).default('Actif'),
  resellerId: z.string().optional(),
  color: z.string().optional(),
});

export type PoiFormData = z.infer<typeof PoiSchema>;
