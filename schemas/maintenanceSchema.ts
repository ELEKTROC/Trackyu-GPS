import { z } from 'zod';

export const MaintenanceSchema = z.object({
  id: z.string().optional(),
  resellerId: z.string().optional(),
  client: z.string().optional(),
  nom: z.string().min(1, "Le nom est requis"),
  category: z.string().min(1, "La catégorie est requise"), // 'Visite technique', 'Assurance', etc.
  type: z.string().min(1, "Le type est requis"), // 'Kilométrage', 'Durée', 'Date'
  intervalle: z.union([z.string(), z.number()]).optional(),
  unit: z.string().optional(), // 'km', 'mois', 'jours'
  
  // Rappel
  reminderValue: z.union([z.string(), z.number()]).optional(),
  reminderUnit: z.string().optional(),
  
  // Périodicité
  isRecurring: z.boolean().default(false),
  
  // Véhicules concernés
  vehicleIds: z.array(z.string()).optional(),
  
  // Notifications
  notifyEmail: z.boolean().default(false),
  notifySms: z.boolean().default(false),
  notifyPush: z.boolean().default(false),
  notificationUserIds: z.array(z.string()).optional(),
  
  description: z.string().optional(),
  statut: z.string().default('Actif'),
});
