import { z } from 'zod';

export const AlertSchema = z.object({
  id: z.string().optional(),
  resellerId: z.string().optional(),
  client: z.string().optional(),
  nom: z.string().min(1, "Le nom est requis"),
  type: z.string().min(1, "Le type d'alerte est requis"), // Vitesse, Zone, SOS, etc.
  priorite: z.string().default('Moyenne'),
  
  // Conditions (Dynamic)
  conditionValue: z.union([z.string(), z.number()]).optional(), // Speed limit, etc.
  conditionDuration: z.number().optional(), // Duration in seconds/minutes
  conditionZoneId: z.string().optional(), // For Geofence
  conditionDirection: z.string().optional(), // Enter/Exit
  
  // HarshDriving specific
  harshDrivingType: z.enum(['ALL', 'BRAKING', 'ACCEL', 'TURN']).optional(),
  
  // Scope
  vehicleIds: z.array(z.string()).optional(),
  allVehicles: z.boolean().default(false),
  
  // Schedule
  isScheduled: z.boolean().default(false),
  scheduleDays: z.array(z.string()).optional(),
  scheduleTimeStart: z.string().optional(),
  scheduleTimeEnd: z.string().optional(),
  
  // Notifications
  notifyEmail: z.boolean().default(false),
  notifySms: z.boolean().default(false),
  notifyPush: z.boolean().default(false),
  notifyWeb: z.boolean().default(true),
  
  // Recipients
  notificationUserIds: z.array(z.string()).optional(),
  customEmails: z.string()
    .optional()
    .transform(val => val ? val.split(',').map(e => e.trim()).filter(Boolean).join(', ') : val)
    .refine(val => {
      if (!val) return true;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return val.split(',').map(e => e.trim()).every(e => emailRegex.test(e));
    }, { message: 'Un ou plusieurs emails sont invalides' }),
  customPhones: z.string().optional(), // Comma separated
  
  statut: z.string().default('Actif'),
  description: z.string().optional(),
});

export type AlertFormData = z.infer<typeof AlertSchema>;
