import { z } from 'zod';

// Converts empty string / null / NaN to undefined before number/enum validation
const optNum = (schema: z.ZodNumber = z.number()) =>
  z.preprocess((v) => {
    if (v === '' || v === null || v === undefined) return undefined;
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isNaN(n) ? undefined : n;
  }, schema.optional());

const optEnum = <T extends [string, ...string[]]>(values: T) =>
  z.preprocess((v) => (v === '' || v === null || v === undefined ? undefined : v), z.enum(values).optional());

// Converts null to undefined — tolère les champs NULL venant de la BD en édition
const optStr = z.preprocess((v) => (v === null || v === undefined ? undefined : v), z.string().optional());

export const VehicleSchema = z.object({
  id: optStr,
  name: optStr,
  licensePlate: z.string().min(1, "L'immatriculation est requise"),
  wwPlate: optStr,
  vin: optStr,
  brand: optStr,
  model: optStr,
  year: optNum(),
  color: optStr,

  // Tech
  imei: z
    .string()
    .min(8, "L'IMEI doit contenir au moins 8 chiffres")
    .max(20, "L'IMEI ne peut pas dépasser 20 chiffres")
    .regex(/^\d+$/, "L'IMEI doit contenir uniquement des chiffres"),
  deviceId: optStr,
  sim: optStr,
  iccid: optStr,
  simOperator: optStr,
  deviceType: optStr,
  deviceStatus: optEnum([
    'IN_STOCK',
    'INSTALLED',
    'RMA',
    'RMA_PENDING',
    'SENT_TO_SUPPLIER',
    'REPLACED_BY_SUPPLIER',
    'SCRAPPED',
    'LOST',
    'REMOVED',
  ]),
  installDate: optStr,
  deviceLocation: optStr,
  serverAddress: optStr,
  sensors: z.array(z.string()).optional().nullable(),

  // Hierarchy
  resellerId: z.string().min(1, 'Le revendeur est requis'),
  client: z.string().min(1, 'Le client est requis'),
  branchId: z.string().min(1, 'La branche est requise'),
  group: optStr,
  driver: optStr,

  status: z.enum(['MOVING', 'IDLE', 'STOPPED', 'OFFLINE', 'ONLINE']).default('STOPPED'),
  vehicleType: optStr,

  // Fuel
  fuelType: optStr,
  fuelSensorType: optEnum(['CANBUS', 'CAPACITIVE', 'ANALOG', 'RS232', 'BLUETOOTH', 'ULTRASONIC']),
  tankCapacity: optNum(),
  tankHeight: optNum(),
  tankWidth: optNum(),
  tankLength: optNum(),
  calibrationTable: optStr,
  consumption: optNum(),
  refillThreshold: optNum(),
  theftThreshold: optNum(),

  // Sensor config
  sensorUnit: optEnum(['tension', 'litres', 'gallons', 'pourcentage', 'hauteur']),
  fuelConversionFactor: optNum(z.number().positive()),
  voltageEmptyMv: optNum(z.number().min(0)),
  voltageHalfMv: optNum(z.number().min(0)),
  voltageFullMv: optNum(z.number().min(0)),
  sensorBrand: optStr,
  sensorModel: optStr,
  sensorInstallDate: optStr,

  // Stats & maintenance
  maxSpeed: optNum(),
  maxIdleTime: optNum(),
  odometer: optNum(),
  mileage: optNum(),
  odometerSource: z.enum(['GPS', 'CANBUS', 'CAN']).default('GPS'),
  engineHours: optNum(),
  distanceCounterSource: optStr,
  timezone: optStr,
  maintenanceInterval: optNum(),

  // Maintenance dates
  nextMaintenanceKm: optNum(),
  nextMaintenanceDate: optStr,
  insuranceExpiry: optStr,
  techVisitExpiry: optStr,
  contractExpiry: optStr,
});

export type VehicleFormData = z.infer<typeof VehicleSchema>;
