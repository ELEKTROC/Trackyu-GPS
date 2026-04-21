/**
 * TrackYu Mobile — Finance API
 * Aligne avec /api/finance/* (backend/src/routes/financeRoutes.ts)
 * et /api/contracts (backend/src/routes/contractRoutes.ts)
 */
import apiClient from './client';
import { normalizeError } from '../utils/errorTypes';

// ── Types ─────────────────────────────────────────────────────────────────────

export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID' | 'PARTIALLY_PAID' | 'OVERDUE' | 'CANCELLED';
export type QuoteStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
export type ContractStatus = 'DRAFT' | 'ACTIVE' | 'SUSPENDED' | 'EXPIRED' | 'TERMINATED';
export type ContractBilling = 'MONTHLY' | 'QUARTERLY' | 'SEMESTRIAL' | 'ANNUAL';

export interface Invoice {
  id: string;
  number: string;
  clientId: string;
  clientName?: string;
  date: string;
  dueDate: string;
  amount: number;
  amountHT?: number;
  balance?: number;
  paidAmount?: number;
  status: InvoiceStatus;
  currency?: string;
  category?: 'INSTALLATION' | 'ABONNEMENT' | 'AUTRES_VENTES';
  subject?: string;
  vatRate: number;
  items: { description: string; quantity: number; price: number }[];
  paymentTerms?: string;
  notes?: string;
  recoveryLevel?: 'NONE' | 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3' | 'LITIGATION';
}

export interface Quote {
  id: string;
  number?: string;
  clientId?: string;
  clientName?: string;
  date?: string;
  validUntil?: string;
  amount: number;
  amountHT?: number;
  status: QuoteStatus;
  currency?: string;
  subject?: string;
  vatRate: number;
  items: { description: string; quantity: number; price: number }[];
  notes?: string;
  createdAt: string;
}

export interface Contract {
  id: string;
  contractNumber?: string;
  clientId: string;
  clientName?: string;
  startDate: string;
  endDate: string;
  status: ContractStatus;
  monthlyFee: number;
  vehicleCount: number;
  billingCycle: ContractBilling;
  autoRenew: boolean;
  nextBillingDate?: string;
  subject?: string;
  resellerName?: string;
  createdAt?: string;
}

export interface Payment {
  id: string;
  date: string;
  clientId?: string;
  clientName?: string;
  amount: number;
  method?: string;
  reference?: string;
  invoiceIds?: string[];
  status?: string;
  contractId?: string;
  excess?: number;
}

// ── Status helpers ─────────────────────────────────────────────────────────────

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  DRAFT: 'Brouillon',
  SENT: 'Envoyée',
  PAID: 'Payée',
  PARTIALLY_PAID: 'Partiel',
  OVERDUE: 'En retard',
  CANCELLED: 'Annulée',
};

export const INVOICE_STATUS_COLORS: Record<InvoiceStatus, string> = {
  DRAFT: '#6B7280',
  SENT: '#3B82F6',
  PAID: '#22C55E',
  PARTIALLY_PAID: '#F59E0B',
  OVERDUE: '#EF4444',
  CANCELLED: '#374151',
};

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  DRAFT: 'Brouillon',
  SENT: 'Envoyé',
  ACCEPTED: 'Accepté',
  REJECTED: 'Refusé',
  EXPIRED: 'Expiré',
};

export const QUOTE_STATUS_COLORS: Record<QuoteStatus, string> = {
  DRAFT: '#6B7280',
  SENT: '#3B82F6',
  ACCEPTED: '#22C55E',
  REJECTED: '#EF4444',
  EXPIRED: '#F59E0B',
};

export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  DRAFT: 'Brouillon',
  ACTIVE: 'Actif',
  SUSPENDED: 'Suspendu',
  EXPIRED: 'Expiré',
  TERMINATED: 'Résilié',
};

export const CONTRACT_STATUS_COLORS: Record<ContractStatus, string> = {
  DRAFT: '#6B7280',
  ACTIVE: '#22C55E',
  SUSPENDED: '#F59E0B',
  EXPIRED: '#F97316',
  TERMINATED: '#EF4444',
};

// ── API ───────────────────────────────────────────────────────────────────────

// Normalise les champs numériques (backend envoie décimaux Prisma en string)
// et le snake_case → camelCase pour les champs clés.
// Le backend utilise tier_id / tier_name pour les clients (format CLI-XXX-XXXX)
function normalizeInvoice(raw: Record<string, unknown>): Invoice {
  const rawAmountHT = raw.amountHT ?? raw.amount_ht;
  const rawPaidAmount = raw.paidAmount ?? raw.paid_amount;
  return {
    ...raw,
    number: (raw.invoice_number ?? raw.number) as string,
    clientId: (raw.tier_id ?? raw.client_id ?? raw.clientId) as string,
    clientName: (raw.tier_name ?? raw.client_name ?? raw.clientName) as string | undefined,
    dueDate: (raw.due_date ?? raw.dueDate) as string,
    paymentTerms: (raw.payment_terms ?? raw.paymentTerms) as string | undefined,
    recoveryLevel: (raw.recovery_level ?? raw.recoveryLevel) as Invoice['recoveryLevel'],
    amount: Number(raw.amount ?? 0),
    amountHT: rawAmountHT != null ? Number(rawAmountHT) : undefined,
    balance: raw.balance != null ? Number(raw.balance) : undefined,
    paidAmount: rawPaidAmount != null ? Number(rawPaidAmount) : undefined,
    vatRate: Number(raw.vatRate ?? raw.vat_rate ?? 0),
  } as Invoice;
}

function normalizeQuote(raw: Record<string, unknown>): Quote {
  const rawAmountHT = raw.amountHT ?? raw.amount_ht;
  return {
    ...raw,
    number: (raw.quote_number ?? raw.number) as string | undefined,
    clientId: (raw.tier_id ?? raw.client_id ?? raw.clientId) as string | undefined,
    clientName: (raw.tier_name ?? raw.client_name ?? raw.clientName) as string | undefined,
    validUntil: (raw.valid_until ?? raw.validUntil) as string | undefined,
    amount: Number(raw.amount ?? 0),
    amountHT: rawAmountHT != null ? Number(rawAmountHT) : undefined,
    vatRate: Number(raw.vatRate ?? raw.vat_rate ?? 0),
  } as Quote;
}

function normalizeContract(raw: Record<string, unknown>): Contract {
  return {
    ...raw,
    clientId: (raw.tier_id ?? raw.client_id ?? raw.clientId) as string,
    clientName: (raw.tier_name ?? raw.client_name ?? raw.clientName) as string | undefined,
    contractNumber: (raw.contract_number ?? raw.contractNumber) as string | undefined,
    startDate: (raw.start_date ?? raw.startDate) as string,
    endDate: (raw.end_date ?? raw.endDate) as string,
    billingCycle: (raw.billing_cycle ?? raw.billingCycle) as Contract['billingCycle'],
    autoRenew: Boolean(raw.auto_renew ?? raw.autoRenew),
    nextBillingDate: (raw.next_billing_date ?? raw.nextBillingDate) as string | undefined,
    resellerName: (raw.reseller_name ?? raw.resellerName) as string | undefined,
    monthlyFee: Number(raw.monthlyFee ?? raw.monthly_fee ?? 0),
    vehicleCount: Number(raw.vehicleCount ?? raw.vehicle_count ?? 0),
  } as Contract;
}

function normalizePayment(raw: Record<string, unknown>): Payment {
  return {
    ...raw,
    clientId: (raw.tier_id ?? raw.client_id ?? raw.clientId) as string | undefined,
    clientName: (raw.tier_name ?? raw.client_name ?? raw.clientName) as string | undefined,
    contractId: (raw.contract_id ?? raw.contractId) as string | undefined,
    invoiceIds: (raw.invoice_ids ?? raw.invoiceIds) as string[] | undefined,
    amount: Number(raw.amount ?? 0),
  } as Payment;
}

// ── Subscription (Abonnements) ─────────────────────────────────────────────────

export type SubscriptionStatus = 'ACTIVE' | 'PENDING' | 'EXPIRED' | 'CANCELLED' | 'SUSPENDED';
export type BillingCycle = 'MONTHLY' | 'QUARTERLY' | 'SEMESTRIAL' | 'ANNUAL';

export interface Subscription {
  id: string;
  clientId: string;
  clientName?: string;
  contractId?: string;
  contractNumber?: string;
  vehicleId?: string;
  vehiclePlate?: string;
  vehicleName?: string;
  status: SubscriptionStatus;
  monthlyFee: number;
  billingCycle: BillingCycle;
  startDate: string;
  endDate?: string;
  autoRenew: boolean;
  nextBillingDate?: string;
  daysUntilExpiry?: number | null;
  renewalCount?: number;
}

export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  ACTIVE: 'Actif',
  PENDING: 'En attente',
  EXPIRED: 'Expiré',
  CANCELLED: 'Résilié',
  SUSPENDED: 'Suspendu',
};

export const SUBSCRIPTION_STATUS_COLORS: Record<SubscriptionStatus, string> = {
  ACTIVE: '#22C55E',
  PENDING: '#F59E0B',
  EXPIRED: '#EF4444',
  CANCELLED: '#6B7280',
  SUSPENDED: '#F97316',
};

function normalizeSub(raw: Record<string, unknown>): Subscription {
  return {
    ...raw,
    clientId: (raw.client_id ?? raw.clientId) as string,
    clientName: (raw.client_name ?? raw.clientName) as string | undefined,
    contractId: (raw.contract_id ?? raw.contractId) as string | undefined,
    contractNumber: (raw.contract_number ?? raw.contractNumber) as string | undefined,
    vehicleId: (raw.vehicle_id ?? raw.vehicleId) as string | undefined,
    vehiclePlate: (raw.vehicle_plate ?? raw.vehiclePlate) as string | undefined,
    vehicleName: (raw.vehicle_name ?? raw.vehicleName) as string | undefined,
    startDate: (raw.start_date ?? raw.startDate) as string,
    endDate: (raw.end_date ?? raw.endDate) as string | undefined,
    autoRenew: Boolean(raw.auto_renew ?? raw.autoRenew),
    nextBillingDate: (raw.next_billing_date ?? raw.nextBillingDate) as string | undefined,
    monthlyFee: Number(raw.monthly_fee ?? raw.monthlyFee ?? 0),
    daysUntilExpiry:
      raw.days_until_expiry != null
        ? Number(raw.days_until_expiry)
        : (raw.daysUntilExpiry as number | null | undefined),
    renewalCount: raw.renewal_count != null ? Number(raw.renewal_count) : undefined,
  } as Subscription;
}

// ── APIs ───────────────────────────────────────────────────────────────────────

export const invoicesApi = {
  getPage: async (
    page: number,
    limit: number,
    search?: string,
    resellerId?: string | null,
    year?: number | null,
    clientId?: string
  ): Promise<{ data: Invoice[]; total: number }> => {
    try {
      const res = await apiClient.get('/finance/invoices', {
        params: {
          page,
          limit,
          ...(search ? { search } : {}),
          ...(resellerId ? { reseller_id: resellerId } : {}),
          ...(year ? { year } : {}),
          ...(clientId ? { client_id: clientId } : {}),
        },
      });
      const raw = res.data;
      const data: Invoice[] = (Array.isArray(raw?.data) ? raw.data : Array.isArray(raw) ? raw : []).map(
        (r: Record<string, unknown>) => normalizeInvoice(r)
      );
      return { data, total: raw?.total ?? data.length };
    } catch (error) {
      throw normalizeError(error);
    }
  },

  getAll: async (): Promise<Invoice[]> => {
    try {
      const res = await apiClient.get('/finance/invoices', { params: { limit: 200 } });
      const raw: unknown[] = Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : [];
      return raw.map((r) => normalizeInvoice(r as Record<string, unknown>));
    } catch (error) {
      throw normalizeError(error);
    }
  },
  getById: async (id: string): Promise<Invoice> => {
    try {
      const res = await apiClient.get(`/finance/invoices/${id}`);
      return normalizeInvoice(res.data as Record<string, unknown>);
    } catch (error) {
      throw normalizeError(error);
    }
  },
  create: async (payload: {
    tier_id: string;
    subject?: string;
    items: { description: string; quantity: number; price: number }[];
    due_date?: string;
    vat_rate?: number;
    notes?: string;
  }): Promise<Invoice> => {
    try {
      const res = await apiClient.post('/finance/invoices', payload);
      return normalizeInvoice(res.data as Record<string, unknown>);
    } catch (error) {
      throw normalizeError(error);
    }
  },
};

export const quotesApi = {
  getAll: async (): Promise<Quote[]> => {
    try {
      const res = await apiClient.get('/finance/quotes', { params: { limit: 100 } });
      const raw: unknown[] = Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : [];
      return raw.map((r) => normalizeQuote(r as Record<string, unknown>));
    } catch (error) {
      throw normalizeError(error);
    }
  },
  getById: async (id: string): Promise<Quote> => {
    try {
      const res = await apiClient.get(`/finance/quotes/${id}`);
      return normalizeQuote(res.data as Record<string, unknown>);
    } catch (error) {
      throw normalizeError(error);
    }
  },
  create: async (payload: {
    tier_id: string;
    subject?: string;
    items: { description: string; quantity: number; price: number }[];
    valid_until?: string;
    vat_rate?: number;
    notes?: string;
  }): Promise<Quote> => {
    try {
      const res = await apiClient.post('/finance/quotes', payload);
      return normalizeQuote(res.data as Record<string, unknown>);
    } catch (error) {
      throw normalizeError(error);
    }
  },
  convertToInvoice: async (id: string): Promise<Invoice> => {
    try {
      const res = await apiClient.post(`/finance/quotes/${id}/convert`);
      return normalizeInvoice(res.data as Record<string, unknown>);
    } catch (error) {
      throw normalizeError(error);
    }
  },
};

export const contractsApi = {
  getAll: async (): Promise<Contract[]> => {
    try {
      const res = await apiClient.get('/contracts', { params: { limit: 100 } });
      const raw: unknown[] = Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : [];
      return raw.map((r) => normalizeContract(r as Record<string, unknown>));
    } catch (error) {
      throw normalizeError(error);
    }
  },
  getById: async (id: string): Promise<Contract> => {
    try {
      const res = await apiClient.get(`/contracts/${id}`);
      return normalizeContract(res.data as Record<string, unknown>);
    } catch (error) {
      throw normalizeError(error);
    }
  },
  renew: async (id: string): Promise<Contract> => {
    try {
      const res = await apiClient.post(`/contracts/${id}/renew`);
      return normalizeContract(res.data as Record<string, unknown>);
    } catch (error) {
      throw normalizeError(error);
    }
  },
};

export const subscriptionsApi = {
  getAll: async (): Promise<Subscription[]> => {
    try {
      const res = await apiClient.get('/subscriptions', { params: { limit: 100 } });
      const raw: unknown[] = Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : [];
      return raw.map((r) => normalizeSub(r as Record<string, unknown>));
    } catch (error) {
      throw normalizeError(error);
    }
  },
};

export const paymentsApi = {
  getAll: async (): Promise<Payment[]> => {
    try {
      const res = await apiClient.get('/finance/payments', { params: { limit: 100 } });
      const raw: unknown[] = Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : [];
      return raw.map((r) => normalizePayment(r as Record<string, unknown>));
    } catch (error) {
      throw normalizeError(error);
    }
  },
  create: async (payload: {
    tier_id?: string;
    amount: number;
    method?: string;
    reference?: string;
    date?: string;
    notes?: string;
  }): Promise<Payment> => {
    try {
      const res = await apiClient.post('/finance/payments', payload);
      return normalizePayment(res.data as Record<string, unknown>);
    } catch (error) {
      throw normalizeError(error);
    }
  },
};
