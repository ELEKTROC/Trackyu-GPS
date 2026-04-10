import { z } from 'zod';

// Coordonnée simple [lat, lng]
const CoordinateSchema = z.tuple([z.number(), z.number()]);

export const GeofenceSchema = z.object({
  id: z.string().optional(),
  nom: z.string().min(1, "Le nom est requis"),
  type: z.enum(['Polygone', 'Cercle', 'Route', 'Dépôt', 'Client', 'Interdit', 'Parking', 'Autre']).default('Polygone'),
  description: z.string().optional(),
  
  // Pour Polygone: tableau de coordonnées [[lat, lng], ...]
  coordinates: z.array(CoordinateSchema).optional(),
  
  // Pour Cercle: centre + rayon
  centerLat: z.number().min(-90).max(90).optional(),
  centerLng: z.number().min(-180).max(180).optional(),
  radius: z.number().min(1).optional(),
  
  // Partage multi-clients
  isShared: z.boolean().default(false), // Zone partagée entre plusieurs clients
  clientIds: z.array(z.string()).default([]), // Liste des clients ayant accès
  allClients: z.boolean().default(false), // Accessible à tous les clients (du revendeur)
  
  statut: z.enum(['Active', 'Inactive']).default('Active'),
  resellerId: z.string().optional(), // Propriétaire de la zone (revendeur ou superadmin)
  color: z.string().optional(),
});

export type GeofenceFormData = z.infer<typeof GeofenceSchema>;
