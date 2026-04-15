// types/fleet.ts — Fleet, vehicles, GPS, drivers, groups, POIs, commands

import type { VehicleStatus } from './enums';

export interface Coordinate {
  lat: number;
  lng: number;
}

export interface Zone {
  id: string;
  name: string;
  type: 'CIRCLE' | 'POLYGON';
  center?: Coordinate;
  radius?: number; // in meters
  coordinates?: Coordinate[]; // for polygon
  color: string;
  category: 'DEPOT' | 'CLIENT' | 'RESTRICTED' | 'HQ';
}

export interface FuelRecord {
  id: string;
  vehicleId: string;
  date: Date;
  volume: number; // Litres
  cost: number;
  type: 'REFILL' | 'THEFT_ALERT' | 'CONSUMPTION_LOG';
  location?: string;
  driver?: string;
  odometer?: number; // Mileage at time of event
}

export interface MaintenanceRecord {
  id: string;
  vehicleId: string;
  type: 'PREVENTIVE' | 'CORRECTIVE' | 'TIRES' | 'INSPECTION';
  description: string;
  date: Date;
  cost: number;
  status: 'SCHEDULED' | 'COMPLETED' | 'OVERDUE';
  provider?: string;
  nextDueDate?: Date;
  nextDueMileage?: number;
}

export interface VehiclePositionHistory {
  id: string;
  vehicleId: string;
  timestamp: Date;
  location: Coordinate;
  speed: number;
  heading: number;
  status: VehicleStatus;
  ignition: boolean;
}

/**
 * DeviceStatus — Status of a GPS tracker device in the objects table.
 * Matches the CHECK constraint on objects.device_status.
 */
export type DeviceStatus =
  | 'IN_STOCK'
  | 'INSTALLED'
  | 'DEFECTIVE'
  | 'RETURNED'
  | 'RMA'
  | 'RMA_PENDING'
  | 'SENT_TO_SUPPLIER'
  | 'REPLACED_BY_SUPPLIER'
  | 'SCRAPPED'
  | 'LOST'
  | 'REMOVED';

/**
 * TrackedObject - Unified type for objects table (fusion Vehicle + Device BOX)
 * ABO code is the primary key (id field)
 * This is the source of truth type for the new architecture.
 */
export interface TrackedObject {
  id: string; // ABO-XXXXXX code (primary key)
  subscriptionCode: string; // Same as id (alias for clarity)
  tenantId: string;

  // Device fields (ex-devices BOX)
  imei: string;
  deviceModel?: string;
  deviceSerial?: string;
  protocol?: string;
  deviceStatus?: DeviceStatus;
  deviceLocation?: string;
  technicianId?: string;
  transferStatus?: string;

  // Vehicle fields
  name: string;
  plate?: string;
  vin?: string;
  brand?: string;
  model?: string;
  vehicleType?: string;
  type?: string; // Alias for vehicleType (backward compat)
  driverName?: string;

  // Relationships
  clientId?: string;
  clientName?: string;
  contractId?: string;
  groupId?: string;
  groupName?: string;
  branchId?: string;

  // Telemetry
  status: VehicleStatus;
  speed?: number;
  mileage?: number;
  odometerSource?: 'GPS' | 'CAN' | 'SENSOR' | 'CANBUS';
  fuelLevel?: number;
  batteryVoltage?: number;
  isImmobilized?: boolean;

  // Fuel
  tankCapacity?: number;
  fuelSensorType?: string;
  calibrationTable?: Array<{ voltage: number; liters: number }> | Array<[number, number]>;
  fuelType?: string;
  theoreticalConsumption?: number;
  refillThreshold?: number;
  theftThreshold?: number;
  excessiveIdlingThreshold?: number;
  tankShape?: string;
  tankHeight?: number;
  tankWidth?: number;
  tankLength?: number;

  // Position
  location?: Coordinate;
  heading?: number;
  lastUpdated?: Date;
  lastFuelLiters?: number;

  // Dates
  installDate?: string;
  entryDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Vehicle — Extended TrackedObject with backward-compatible aliases.
 *
 * Components use `vehicle.client`, `vehicle.driver`, `vehicle.speed`, etc.
 * These aliases are populated by the api.vehicles.list() adapter layer.
 *
 * New code should prefer TrackedObject fields (clientName, driverName, etc.)
 * but both are available on Vehicle for backward compatibility.
 */
export interface Vehicle extends TrackedObject {
  // Backward-compat aliases (mapped from TrackedObject equivalents)
  client: string; // = clientName || ''
  driver: string; // = driverName || ''

  // Required overrides (TrackedObject has these as optional, Vehicle needs defaults)
  speed: number; // km/h (default 0)
  fuelLevel: number; // percentage (default 0)
  mileage: number; // Kilométrage Total (default 0)
  lastUpdated: Date; // (default to createdAt or epoch)
  location: Coordinate; // (default { lat: 0, lng: 0 })
  branchId: string; // Mandatory: Vehicle MUST belong to a branch

  // Vehicle display/computed fields (not in DB, set by adapter)
  maxSpeed: number;
  destination: string;
  dailyMileage: number;
  driverScore: number;
  nextMaintenance: string;

  // Trip fields (computed from trips table, not stored on objects)
  departureLocation: string;
  departureTime: string;
  arrivalTime: string;
  arrivalLocation: string;
  violationsCount: number;

  // Fuel computed fields
  fuelQuantity: number; // Litres actuels (= lastFuelLiters)
  refuelAmount: number; // Litres ajoutés (Recharge)
  fuelLoss: number; // Litres perdus (Perte)
  consumption: number; // L/100km
  suspectLoss: number; // Litres (Perte suspecte)

  // Organisation compat
  group?: string; // = groupName
  geofence?: string;

  // Identification compat
  licensePlate?: string; // = plate
  wwPlate?: string;
  sim?: string;
  resellerId?: string;

  // Security compat aliases
  isBrokenDown?: boolean;
  immobilized?: boolean; // = isImmobilized
  isBreakdown?: boolean; // = isBrokenDown

  // Media
  photoUrl?: string;

  // Extended telemetry (not in objects table yet)
  engineHours?: number;
  weight?: number;
  temperature?: number;
  batteryLevel?: number; // Tension batterie en V (= batteryVoltage)
  batteryPercent?: number; // % batterie boîtier GPS
  signalStrength?: string;

  // Champs GPS enrichis (transmis via vehicle:update Socket.IO)
  altitude?: number; // Altitude en mètres
  hdop?: number; // Précision horizontale (HDOP — plus faible = meilleur)
  ignition?: boolean; // Contact moteur (acc)

  // Alertes comportementales temps réel
  crash?: boolean;
  sos?: boolean;
  harshBraking?: boolean;
  harshAccel?: boolean;

  // Behavior Stats (computed)
  behaviorStats?: {
    harshBraking: number;
    harshAccel: number;
    sharpTurn: number;
    safetyScore: number;
  };

  // Settings / Form field aliases
  deviceType?: string; // = deviceModel
  odometer?: number; // = mileage

  // Override odometerSource to also accept legacy 'CANBUS' value
  odometerSource?: 'GPS' | 'CAN' | 'SENSOR' | 'CANBUS';
}

export interface FleetMetrics {
  totalVehicles: number;
  activeVehicles: number;
  totalDistance: number;
  avgFuelEfficiency: number;
  avgDriverScore: number;
  alerts: number;
}

export interface Driver {
  id: string;
  nom: string;
  email?: string;
  telephone?: string;
  adresse?: string;
  permis?: string;
  permisCategories?: string;
  permisExpiration?: string;
  rfidTag?: string;
  contactUrgence?: string;
  statut: 'Actif' | 'Inactif' | 'En congé';
  tenantId?: string;
  clientId?: string; // Linked to a client if B2B
}

export interface Group {
  id: string;
  tenantId?: string;
  nom: string;
  description?: string;
  statut: 'Actif' | 'Inactif';
  vehicleCount?: number;
  createdAt?: string;
}

export interface Command {
  id: string;
  tenantId?: string;
  vehicleId: string;
  type: 'CUT_ENGINE' | 'RESTORE_ENGINE' | 'OPEN_DOOR' | 'CLOSE_DOOR' | 'REBOOT_DEVICE' | 'GET_POSITION' | 'CUSTOM';
  channel: 'GPRS' | 'SMS';
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'EXECUTED' | 'FAILED' | 'TIMEOUT';
  response?: string;
  sentAt: string;
  executedAt?: string;
  createdBy: string;
}

export interface POI {
  id: string;
  tenantId?: string;
  name: string;
  type: 'GAS_STATION' | 'CLIENT' | 'SUPPLIER' | 'RESTAURANT' | 'OTHER';
  address?: string;
  latitude: number;
  longitude: number;
  radius: number; // meters
  status: 'ACTIVE' | 'INACTIVE';
}
