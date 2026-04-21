import { z } from 'zod';

export const GroupCriteriaType = z.enum([
  'VEHICLE_TYPE', // Types d'engins
  'SIM_OPERATOR', // Opérateurs SIM
  'CLIENT_TYPE', // Types client
  'FUEL_TYPE', // Type carburant
  'BRANCH', // Par branche
  'GEOFENCE', // Par zone
  'DRIVER', // Par conducteur
  'CUSTOM', // Personnalisé
]);

export const GroupSchema = z.object({
  id: z.string().optional(),
  nom: z.string().min(1, 'Le nom est requis'),
  description: z.string().optional(),
  clientId: z.string().min(1, 'Le client est requis'),
  criteriaType: GroupCriteriaType.optional(),
  criteriaValue: z.string().optional(), // Valeur du critère sélectionné
  customCriteria: z.string().optional(), // Champ personnalisé si CUSTOM
  vehicleIds: z.array(z.string()).optional(), // IDs des véhicules sélectionnés
  statut: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
});

export type GroupFormData = z.infer<typeof GroupSchema>;
