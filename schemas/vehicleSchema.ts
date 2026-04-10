import { z } from 'zod';

export const VehicleSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  licensePlate: z.string().min(1, "L'immatriculation est requise"),
  wwPlate: z.string().optional(),
  vin: z.string().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  year: z.coerce.number().optional(),
  color: z.string().optional(),

  // Tech
  imei: z.string()
    .min(15, "L'IMEI doit contenir au moins 15 chiffres")
    .max(17, "L'IMEI ne peut pas dépasser 17 chiffres")
    .regex(/^\d+$/, "L'IMEI doit contenir uniquement des chiffres"),
  deviceId: z.string().optional(),
  sim: z.string().optional(),
  iccid: z.string().optional(),
  simOperator: z.string().optional(),
  deviceType: z.string().optional(),
  deviceStatus: z.enum(['IN_STOCK', 'INSTALLED', 'DEFECTIVE', 'RETURNED', 'RMA', 'RMA_PENDING', 'SENT_TO_SUPPLIER', 'REPLACED_BY_SUPPLIER', 'SCRAPPED', 'LOST', 'REMOVED']).optional(),
  installDate: z.string().optional(),
  deviceLocation: z.string().optional(),
  serverAddress: z.string().optional(),
  sensors: z.array(z.string()).optional(),

  // Hierarchy
  resellerId: z.string().optional(),
  client: z.string().optional(),
  branchId: z.string().optional(),
  group: z.string().optional(),
  driver: z.string().optional(),

  status: z.enum(['MOVING', 'IDLE', 'STOPPED', 'OFFLINE']).default('STOPPED'),
  vehicleType: z.string().optional(),

  // Fuel
  fuelType: z.string().optional(),
  fuelSensorType: z.enum(['CANBUS', 'CAPACITIVE', 'ULTRASONIC']).optional(),
  tankCapacity: z.coerce.number().optional(),
  tankHeight: z.coerce.number().optional(),
  tankWidth: z.coerce.number().optional(),
  tankLength: z.coerce.number().optional(),
  calibrationTable: z.string().optional(),
  consumption: z.coerce.number().optional(),
  refillThreshold: z.coerce.number().optional(),
  theftThreshold: z.coerce.number().optional(),

  // Stats & maintenance
  maxSpeed: z.coerce.number().optional(),
  maxIdleTime: z.coerce.number().optional(),
  odometer: z.coerce.number().optional(),
  mileage: z.coerce.number().optional(),
  odometerSource: z.enum(['GPS', 'CANBUS']).default('GPS'),
  engineHours: z.coerce.number().optional(),
  distanceCounterSource: z.string().optional(),
  timezone: z.string().optional(),
  maintenanceInterval: z.coerce.number().optional(),

  // Maintenance dates
  nextMaintenanceKm: z.coerce.number().optional(),
  nextMaintenanceDate: z.string().optional(),
  insuranceExpiry: z.string().optional(),
  techVisitExpiry: z.string().optional(),
  contractExpiry: z.string().optional(),
});

export type VehicleFormData = z.infer<typeof VehicleSchema>;
