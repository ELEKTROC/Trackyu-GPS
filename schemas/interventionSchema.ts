import { z } from 'zod';

// --- ENUMS ---
export const InterventionTypeSchema = z.enum(['INSTALLATION', 'DEPANNAGE', 'REMPLACEMENT', 'RETRAIT', 'REINSTALLATION', 'TRANSFERT']);
export const InterventionNatureSchema = z.enum([
  'Balise',
  'Balise et relais',
  'Balise et jauge',
  'Jauge',
  'Balise et autres accessoires',
  'Accessoires',
  'Autres',
  'Dépannage',
  'Reprise branchements',
  'Redémarrage balise',
  'Changement d\'emplacement',
  'Recalibrage Jauge',
  'Réinstallation',
  'Transfert',
  'Retrait',
  'Remplacement Balise',
  'Remplacement SIM',
  'Remplacement Sonde',
  'Remplacement Accessoires'
]);
export const InterventionStatusSchema = z.enum(['PENDING', 'SCHEDULED', 'EN_ROUTE', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'POSTPONED']);

// --- MAIN SCHEMA ---
// Validation minimale pour Tab 1 - Champs obligatoires réduits
export const InterventionSchema = z.object({
  id: z.string().optional(), // Optional for creation
  tenantId: z.string().optional(), // Often set by context
  ticketId: z.string().min(1, "Le ticket est obligatoire"),
  createdAt: z.string().optional(), // ISO Date

  // Client & Contact - Obligatoire
  clientId: z.string().min(1, "Le client est obligatoire"),
  contactPhone: z.string().nullish(), // Accept null, undefined, or string

  // Assignment - Optionnel pour création
  technicianId: z.string().nullish().default('UNASSIGNED'),

  // Classification - Type obligatoire
  type: InterventionTypeSchema,
  nature: InterventionNatureSchema.nullish(),

  // Status & Scheduling - Optionnels pour création
  status: InterventionStatusSchema.default('PENDING'),
  scheduledDate: z.string().nullish(),
  duration: z.coerce.number().min(1).nullish().default(60),
  location: z.string().nullish(),

  // Financial
  cost: z.coerce.number().min(0, "Le montant ne peut pas être négatif").nullish(),

  // Vehicle Identification - Tous optionnels (Bloc 2)
  vehicleId: z.string().nullish(),
  licensePlate: z.string().nullish(),
  wwPlate: z.string().nullish(),
  vin: z.string().max(17, "Le VIN ne peut pas dépasser 17 caractères").nullish(),
  vehicleType: z.string().nullish(),

  // Vehicle Details (Start Tab)
  vehicleBrand: z.string().nullish(),
  vehicleModel: z.string().nullish(),
  vehicleYear: z.string().nullish(),
  vehicleColor: z.string().nullish(),
  vehicleMileage: z.coerce.number().min(0).nullish(),
  engineHours: z.coerce.number().min(0).nullish(),

  // Checklist (Start Tab)
  checkStart: z.boolean().nullish(),
  checkLights: z.boolean().nullish(),
  checkDashboard: z.boolean().nullish(),
  checkAC: z.boolean().nullish(),
  checkAudio: z.boolean().nullish(),
  checkBattery: z.boolean().nullish(),
  observations: z.string().nullish(),

  // Technical & Material (Tech Tab)
  description: z.string().nullish(), // Alias for notes (backward compatibility)
  notes: z.string().nullish(),
  material: z.array(z.string()).nullish(),
  imei: z.string().nullish(),
  sim: z.string().nullish(),
  iccid: z.string().nullish(),
  sensorSerial: z.string().nullish(),
  deviceLocation: z.string().nullish(),

  // Replacement & Transfer (End Tab)
  newSim: z.string().nullish(),
  newImei: z.string().nullish(),
  newGaugeSerial: z.string().nullish(),
  newLicensePlate: z.string().nullish(),

  // Gauge Specifics (End Tab)
  tankCapacity: z.coerce.number().min(0).nullish(),
  tankHeight: z.coerce.number().min(0).nullish(),
  tankWidth: z.coerce.number().min(0).nullish(),
  tankLength: z.coerce.number().min(0).nullish(),
  tankShape: z.enum(['RECTANGULAR', 'CYLINDRICAL_H', 'CYLINDRICAL_V', 'L_SHAPE', 'D_SHAPE']).nullable().optional().or(z.literal('')).transform(val => val === '' || val === null ? undefined : val),

  fuelSensorType: z.enum(['CANBUS', 'CAPACITIVE', 'ULTRASONIC']).nullable().optional().or(z.literal('')).transform(val => val === '' || val === null ? undefined : val),
  calibrationTable: z.string().nullish(),
  refillThreshold: z.coerce.number().nullish(),
  theftThreshold: z.coerce.number().nullish(),

  gaugeVoltage: z.string().nullish(),
  gaugeBrand: z.string().nullish(),
  gaugeModel: z.string().nullish(),
  gaugeSerial: z.string().nullish(),
  gaugeTest: z.enum(['OK', 'NOK']).nullable().optional().or(z.literal('')).transform(val => val === '' || val === null ? undefined : val),

  // Signatures & Photos
  signatureTech: z.string().nullish(),
  signatureClient: z.string().nullish(),
  photos: z.array(z.string()).nullish(),

  // New Fields for Logic (Stock, Contract, Billing)
  contractId: z.string().nullish(),
  updateContract: z.boolean().nullish(),
  generateInvoice: z.boolean().nullish(),
  removeFromContract: z.boolean().nullish(),
  contractRemovalReason: z.string().nullish(),

  oldDeviceImei: z.string().nullish(),
  oldSimId: z.string().nullish(),
  removedMaterialStatus: z.enum(['UNKNOWN', 'FUNCTIONAL', 'FAULTY', 'DAMAGED']).nullable().optional().or(z.literal('')).transform(val => val === '' || val === null ? undefined : val),

  invoiceItems: z.array(z.object({
    description: z.string(),
    quantity: z.coerce.number(),
    unitPrice: z.coerce.number(),
    total: z.coerce.number().optional()
  })).nullish(),
}).passthrough();

// Keep base schema (no refinements) so it can be .extend()-ed
export const InterventionBaseSchema = InterventionSchema;

// InterventionSchema WITH cross-field validation (used for form validation)
export const InterventionValidatedSchema = InterventionBaseSchema.superRefine((data, ctx) => {
  // Transfert requiert un véhicule cible
  if ((data.type === 'TRANSFERT' || data.nature === 'Transfert') && !(data as any).targetVehicleId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Le véhicule cible est requis pour un Transfert",
      path: ["targetVehicleId"]
    });
  }

  // Remplacement requiert l'état du matériel retiré
  if ((data.type === 'REMPLACEMENT' || data.type === 'RETRAIT' || data.type === 'REINSTALLATION') && !data.removedMaterialStatus) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "L'état du matériel retiré est obligatoire pour cette opération",
      path: ["removedMaterialStatus"]
    });
  }

  // Retrait de contrat requiert une raison
  if ((data.type === 'RETRAIT' || data.nature === 'Retrait') && data.removeFromContract && !data.contractRemovalReason) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Une raison est requise pour retirer le véhicule du contrat",
      path: ["contractRemovalReason"]
    });
  }
});

export type InterventionFormData = z.infer<typeof InterventionBaseSchema>;

// --- COMPLETION SCHEMA ---
// Extend from the BASE (no refinements) then add completion-specific + cross-field validation
export const InterventionCompletionSchema = InterventionBaseSchema.extend({
  signatureTech: z.string().min(1, "La signature du technicien est obligatoire pour clôturer"),
  signatureClient: z.string().min(1, "La signature du client est obligatoire pour clôturer"),
}).passthrough().superRefine((data, ctx) => {
  if (data.nature === 'Transfert' && !(data as any).targetVehicleId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Le véhicule cible est requis pour un Transfert",
      path: ["targetVehicleId"]
    });
  }
  if (data.nature?.startsWith('Remplacement') && !data.removedMaterialStatus) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "L'état du matériel retiré est obligatoire pour un remplacement",
      path: ["removedMaterialStatus"]
    });
  }
  if (data.nature === 'Retrait' && data.removeFromContract && !data.contractRemovalReason) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Une raison est requise pour retirer le véhicule du contrat",
      path: ["contractRemovalReason"]
    });
  }
});

