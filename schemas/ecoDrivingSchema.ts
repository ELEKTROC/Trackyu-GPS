import { z } from 'zod';

export const EcoDrivingSchema = z.object({
  id: z.string().optional(),
  resellerId: z.string().optional(),
  client: z.string().optional(),
  nom: z.string().min(1, "Le nom du profil est requis"),
  
  // Scope
  vehicleIds: z.array(z.string()).optional(),
  allVehicles: z.boolean().default(false),

  // Thresholds & Penalties
  maxSpeedLimit: z.number().min(0).default(110), // km/h
  maxSpeedPenalty: z.number().min(0).max(100).default(20), // Points deducted

  harshAccelerationSensitivity: z.enum(['Low', 'Medium', 'High']).default('Medium'),
  harshAccelerationPenalty: z.number().min(0).max(100).default(20),

  harshBrakingSensitivity: z.enum(['Low', 'Medium', 'High']).default('Medium'),
  harshBrakingPenalty: z.number().min(0).max(100).default(20),

  harshCorneringSensitivity: z.enum(['Low', 'Medium', 'High']).default('Medium'),
  harshCorneringPenalty: z.number().min(0).max(100).default(20),

  maxIdlingDuration: z.number().min(0).default(5), // minutes
  idlingPenalty: z.number().min(0).max(100).default(20),
  
  // Target Score
  targetScore: z.number().min(0).max(100).default(80), // Green zone threshold

  statut: z.enum(['Actif', 'Inactif']).default('Actif'),
  description: z.string().optional(),
});

export type EcoDrivingFormData = z.infer<typeof EcoDrivingSchema>;
