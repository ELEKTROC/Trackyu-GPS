import { z } from 'zod';

// Helper: accept string, Date, null, or undefined for date fields
const dateField = z.union([z.string(), z.date()]).nullable().optional();
// Helper: accept string or null for optional string fields  
const optStr = z.string().nullable().optional();
const optNum = z.number().nullable().optional();

const ItemSchema = z.object({
  description: z.string().min(1, "La description est requise"),
  quantity: z.number().min(1, "La quantité doit être au moins 1"),
  price: z.number().min(0, "Le prix doit être positif"),
}).passthrough();

export const InvoiceSchema = z.object({
  id: optStr,
  tenantId: optStr,
  clientId: z.string().min(1, "Le client est requis"),
  clientName: optStr,
  number: optStr,
  subject: optStr,
  date: dateField,
  dueDate: dateField,
  amount: optNum,
  amountHT: optNum,
  paidAmount: optNum,
  status: z.enum(['DRAFT', 'SENT', 'PAID', 'PARTIALLY_PAID', 'PARTIAL', 'OVERDUE', 'CANCELLED']).default('DRAFT'),
  items: z.array(ItemSchema).min(1, "Au moins un article est requis"),
  paymentTerms: optStr,
  contractId: optStr,
  invoiceType: z.enum(['FACTURE', 'AVOIR']).nullable().optional().default('FACTURE'),
  orderNumber: optStr,
  licensePlate: optStr,
  installationDate: dateField,
  category: optStr,
  vatRate: z.number().min(0).max(100, "Le taux de TVA ne peut pas dépasser 100%").default(0),
  discount: z.number().min(0).optional(),
  generalConditions: optStr,
  notes: optStr,
  resellerId: optStr,
  resellerName: optStr,
}).passthrough();

export const QuoteSchema = z.object({
  id: optStr,
  tenantId: optStr,
  clientId: z.string().optional(), // Optional — lead-based quotes may not have a client yet
  clientName: optStr,
  amount: optNum,
  amountHT: optNum,
  status: z.enum(['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED']).default('DRAFT'),
  items: z.array(ItemSchema).min(1, "Au moins un article est requis"),
  createdAt: dateField,
  paymentTerms: optStr,
  contractId: optStr,
  orderNumber: optStr,
  licensePlate: optStr,
  category: optStr,
  vatRate: z.number().min(0).max(100, "Le taux de TVA ne peut pas dépasser 100%").default(0),
  discount: z.number().min(0).optional(),
  generalConditions: optStr,
  notes: optStr,
  number: optStr,
  validUntil: dateField,
  leadId: optStr,
  subject: optStr,
  bankDetails: optStr,
  resellerId: optStr,
  resellerName: optStr,
}).passthrough();

export const ContractSchema = z.object({
  id: z.string().optional(),
  tenantId: z.string().optional(),
  clientId: z.string().min(1, "Le client est requis"),
  startDate: z.string().min(1, "La date de début est requise"),
  endDate: z.string().min(1, "La date de fin est requise"),
  status: z.enum(['ACTIVE', 'EXPIRED', 'TERMINATED']).default('ACTIVE'),
  monthlyFee: z.number().min(0, "La mensualité doit être positive"),
  vehicleCount: z.number().min(0, "Le nombre de véhicules doit être positif"),
  vehicleIds: z.array(z.string()).optional(),
  pdfUrl: z.string().optional(),
  billingCycle: z.enum(['MONTHLY', 'QUARTERLY', 'SEMESTRIAL', 'ANNUAL']).default('MONTHLY'),
  autoRenew: z.boolean().default(false),
  nextBillingDate: z.string().optional(),
  items: z.array(ItemSchema).optional(),
  effectiveDate: z.string().optional(),
  generationDate: z.string().optional(),
  resellerName: z.string().optional(),
  subject: z.string().optional(),
});
