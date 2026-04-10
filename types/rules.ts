// types/rules.ts — Fleet management rules (maintenance, scheduling, eco-driving)

export interface MaintenanceRule {
  id: string;
  tenantId?: string;
  name: string;
  type: 'MILEAGE' | 'TIME' | 'ENGINE_HOURS';
  intervalValue: number; // km, days, or hours
  intervalUnit?: 'KM' | 'DAYS' | 'HOURS';
  vehicleIds?: string[]; // specific vehicles or all
  status: 'ACTIVE' | 'INACTIVE';
}

export interface ScheduleRule {
  id: string;
  tenantId?: string;
  name: string;
  enableTimeRestriction: boolean;
  timeRanges?: { start: string; end: string; days: number[] }[];
  enableDistanceLimit: boolean;
  maxDistancePerDay?: number;
  enableSpeedLimit: boolean;
  maxSpeed?: number;
  enableEngineHoursLimit: boolean;
  maxEngineHoursPerDay?: number;
  vehicleIds?: string[];
  status: 'ACTIVE' | 'INACTIVE';
  enableCustomRestriction?: boolean;
  customRestrictionName?: string;
}

export interface EcoDrivingProfile {
  id: string;
  tenantId?: string;
  name: string;
  targetScore: number;
  maxSpeedLimit: number;
  maxSpeedPenalty: number;
  harshAccelerationSensitivity: 'LOW' | 'MEDIUM' | 'HIGH';
  harshBrakingSensitivity: 'LOW' | 'MEDIUM' | 'HIGH';
  maxIdlingDuration: number; // minutes
  status: 'ACTIVE' | 'INACTIVE';
}
