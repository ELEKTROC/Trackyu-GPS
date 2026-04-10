import { z } from 'zod';

export const DeviceStockSchema = z.object({
  id: z.string().optional(),
  tenantId: z.string().optional(),
  type: z.enum(['BOX', 'SIM', 'SENSOR', 'ACCESSORY']),
  serialNumber: z.string().min(1, "Le numéro de série/IMEI/ICCID est requis"),
  imei: z.string().optional(),
  iccid: z.string().optional(),
  phoneNumber: z.string().optional(),
  model: z.string().min(1, "Le modèle est requis"),
  operator: z.string().optional(),
  // Fix 4: aligned with canonical DB status enum (added RMA; kept RMA_PENDING etc.)
  status: z.enum(['IN_STOCK', 'INSTALLED', 'RMA', 'RMA_PENDING', 'SENT_TO_SUPPLIER', 'SCRAPPED', 'REPLACED_BY_SUPPLIER', 'REMOVED', 'LOST']).default('IN_STOCK'),
  simCardId: z.string().optional(),
  assignedClientId: z.string().optional(),
  assignedVehicleId: z.string().optional(),
  // Fix 5: CLIENT added — devices installed at client site must pass validation
  location: z.enum(['CENTRAL', 'SIEGE', 'TECH', 'CLIENT']).default('CENTRAL'),
  technicianId: z.string().optional(),
  transferStatus: z.enum(['NONE', 'PENDING_RECEIPT', 'PENDING_RETURN']).optional(),
  entryDate: z.string().optional(),
  installationDate: z.string().optional(),
  removalDate: z.string().optional(),
  // Fix 7: resellerId/resellerName are used in StockView but were missing from schema
  resellerId: z.string().optional(),
  resellerName: z.string().optional(),
  notes: z.string().optional(),
});
