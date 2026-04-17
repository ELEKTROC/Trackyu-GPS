/**
 * TrackYu Mobile — Portal API (Mon Espace / CLIENT)
 */
import apiClient from './client';
import { normalizeError } from '../utils/errorTypes';

// ── React Native FormData file descriptor ────────────────────────────────────
// RN's FormData accepte { uri, type, name } (extension native) à la place d'un Blob.
// Le helper évite le cast `as any` non typé.
function rnFile(uri: string, type: string, name: string): Blob {
  return { uri, type, name } as unknown as Blob;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PortalDashboard {
  contracts: { active: number };
  subscriptions: { active: number };
  invoices: { unpaid: number; totalDue: number };
  tickets: { open: number };
  latestInvoice: PortalInvoice | null;
}

export interface PortalInvoice {
  id: string;
  invoice_number: string;
  date: string;
  due_date: string | null;
  status: 'DRAFT' | 'SENT' | 'PAID' | 'PARTIALLY_PAID' | 'OVERDUE' | 'CANCELLED';
  amount_ht: number;
  amount_ttc: number;
  paid_amount: number;
}

export interface PortalInvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface PortalContract {
  id: string;
  reference: string;
  status: 'ACTIVE' | 'EXPIRED' | 'TERMINATED';
  start_date: string;
  end_date: string | null;
  monthly_fee: number;
  vehicle_count: number;
  billing_cycle: 'MONTHLY' | 'QUARTERLY' | 'SEMESTRIAL' | 'ANNUAL';
  auto_renew: boolean;
  pdf_url: string | null;
}

export interface PortalSubscription {
  id: string;
  plan_name: string;
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'CANCELLED' | 'SUSPENDED' | 'EXPIRED';
  start_date: string;
  end_date: string | null;
  monthly_fee: number;
  vehicle_count: number;
  billing_cycle: 'MONTHLY' | 'QUARTERLY' | 'SEMESTRIAL' | 'YEARLY' | 'ANNUAL';
  auto_renew: boolean;
  features: string[];
  next_billing_date: string | null;
  contract_id?: string | null;
  contract_number?: string | null;
  vehicle_id?: string | null;
  vehicle_plate?: string | null;
  vehicle_brand?: string | null;
  vehicle_model?: string | null;
  vehicle_name?: string | null;
  vehicle_install_date?: string | null;
}

export interface PortalPayment {
  id: string;
  amount: number;
  method: string;
  payment_date: string;
  invoice_id: string;
  invoice_number: string;
  note: string | null;
}

export interface PortalTicket {
  id: string;
  subject: string;
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'WAITING_CLIENT' | 'RESOLVED' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  category: string | null;
  created_at: string;
  updated_at: string;
}

export interface PortalTicketMessage {
  id: string;
  ticket_id: string;
  text: string;
  sender: 'CLIENT' | 'SUPPORT' | 'SYSTEM';
  created_at: string;
}

export interface PortalPaymentSettings {
  wave_link: string | null;
  orange_number: string | null;
  orange_name: string | null;
}

export interface PortalIntervention {
  id: string;
  type: string;
  nature: string;
  status: 'PENDING' | 'SCHEDULED' | 'EN_ROUTE' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'POSTPONED';
  scheduled_date: string;
  start_time: string | null;
  end_time: string | null;
  duration: number | null;
  location: string;
  notes: string | null;
  license_plate: string | null;
  vehicle_brand: string | null;
  vehicle_model: string | null;
  vehicle_name: string | null;
  vehicle_mileage: number | null;
  imei: string | null;
  sim_card: string | null;
  device_location: string | null;
  cost: number | null;
  signature_tech: string | null;
  signature_client: string | null;
  checklist: Record<string, boolean> | null;
  test_results: Record<string, string> | null;
  contact_phone: string | null;
  technician_name: string | null;
  created_at: string;
}

export interface AlertPreferenceSetting {
  enabled: boolean;
  threshold: number;
}

export interface AlertPreferences {
  speed: AlertPreferenceSetting; // km/h
  fuel: AlertPreferenceSetting; // %
  offline: AlertPreferenceSetting; // minutes
}

// ── Profil client enrichi (/portal/client-profile) ────────────────────────────

export interface ClientContact {
  id: string;
  name: string;
  role: string;
  phone: string;
  email: string;
}

export interface ClientProfile {
  id: string;
  code: string; // ex: CLI-0042
  name: string;
  type: 'B2B' | 'B2C';
  status: string;
  email: string;
  phone: string;
  phone2?: string;
  address?: string;
  city?: string;
  country?: string;
  cni?: string; // N° CNI (B2C)
  rc?: string; // RCCM (B2B)
  cc?: string; // N° CC (B2B)
  subscriptionPlan?: string;
  resellerId?: string;
  resellerName?: string;
  sector?: string;
  segment?: string;
  language?: string;
  paymentTerms?: string;
  contacts?: ClientContact[];
}

// ── API calls ─────────────────────────────────────────────────────────────────

export const portalApi = {
  async getDashboard(): Promise<PortalDashboard> {
    try {
      const { data } = await apiClient.get<PortalDashboard>('/portal/dashboard');
      return data;
    } catch (e) {
      throw normalizeError(e);
    }
  },

  async getInvoices(page = 1, limit = 20): Promise<{ data: PortalInvoice[]; total: number }> {
    try {
      // /finance/invoices already filters by req.user.clientId for CLIENT role
      const { data } = await apiClient.get('/finance/invoices', { params: { page, limit } });
      if (Array.isArray(data?.data)) return { data: data.data, total: data.total ?? data.data.length };
      if (Array.isArray(data)) return { data, total: data.length };
      return { data: [], total: 0 };
    } catch (e) {
      throw normalizeError(e);
    }
  },

  async getInvoiceById(id: string): Promise<{ invoice: PortalInvoice; items: PortalInvoiceItem[] }> {
    try {
      const { data } = await apiClient.get(`/portal/invoices/${id}`);
      return data;
    } catch (e) {
      throw normalizeError(e);
    }
  },

  async getContracts(): Promise<PortalContract[]> {
    try {
      const { data } = await apiClient.get('/portal/contracts');
      return Array.isArray(data) ? data : [];
    } catch (e) {
      throw normalizeError(e);
    }
  },

  async getSubscriptions(): Promise<PortalSubscription[]> {
    try {
      const { data } = await apiClient.get('/portal/subscriptions');
      return Array.isArray(data) ? data : [];
    } catch (e) {
      throw normalizeError(e);
    }
  },

  async getPayments(): Promise<PortalPayment[]> {
    try {
      // /finance/payments already filters by req.user.clientId for CLIENT role
      const { data } = await apiClient.get('/finance/payments');
      return Array.isArray(data) ? data : [];
    } catch (e) {
      throw normalizeError(e);
    }
  },

  // Tickets — uses existing /tickets/my endpoint
  async getMyTickets(page = 1, limit = 20): Promise<{ data: PortalTicket[]; total: number }> {
    try {
      const { data } = await apiClient.get('/tickets/my', { params: { page, limit } });
      // Handle both paginated { data, total } and legacy array responses
      if (Array.isArray(data)) return { data, total: data.length };
      if (Array.isArray(data?.data)) return { data: data.data, total: data.total ?? data.data.length };
      return { data: [], total: 0 };
    } catch (e) {
      throw normalizeError(e);
    }
  },

  async getTicketById(id: string): Promise<{ ticket: PortalTicket; messages: PortalTicketMessage[] }> {
    try {
      // /portal/tickets/:id uses ownership check — no VIEW_TICKETS permission needed
      const { data } = await apiClient.get(`/portal/tickets/${id}`);
      return data;
    } catch (e) {
      throw normalizeError(e);
    }
  },

  async createTicket(payload: {
    subject: string;
    description: string;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH';
    category?: string;
    sub_category?: string;
  }): Promise<PortalTicket> {
    try {
      const { data } = await apiClient.post<PortalTicket>('/tickets', payload);
      return data;
    } catch (e) {
      throw normalizeError(e);
    }
  },

  async uploadTicketAttachment(
    ticketId: string,
    uri: string,
    mimeType: string,
    fileName: string
  ): Promise<{ url: string }> {
    try {
      const form = new FormData();
      form.append('file', rnFile(uri, mimeType, fileName));
      // Axios détecte FormData et set Content-Type: multipart/form-data avec boundary automatiquement
      const { data } = await apiClient.post(`/tickets/${ticketId}/attachments`, form);
      return data;
    } catch (e) {
      throw normalizeError(e);
    }
  },

  async addTicketMessage(ticketId: string, text: string): Promise<PortalTicketMessage> {
    try {
      const { data } = await apiClient.post<PortalTicketMessage>(`/tickets/${ticketId}/messages/client`, { text });
      return data;
    } catch (e) {
      throw normalizeError(e);
    }
  },

  async getMyInterventions(): Promise<PortalIntervention[]> {
    try {
      const { data } = await apiClient.get('/portal/interventions');
      if (Array.isArray(data)) return data;
      if (Array.isArray(data?.data)) return data.data;
      return [];
    } catch (e) {
      throw normalizeError(e);
    }
  },

  async getPaymentSettings(): Promise<PortalPaymentSettings> {
    try {
      const { data } = await apiClient.get<PortalPaymentSettings>('/portal/payment-settings');
      return data;
    } catch (e) {
      throw normalizeError(e);
    }
  },

  async getInterventionById(id: string): Promise<PortalIntervention> {
    try {
      const { data } = await apiClient.get(`/portal/interventions/${id}`);
      return data;
    } catch (e) {
      throw normalizeError(e);
    }
  },

  async getAlertPreferences(): Promise<AlertPreferences> {
    try {
      const { data } = await apiClient.get<AlertPreferences>('/portal/alert-preferences');
      return data;
    } catch (e) {
      throw normalizeError(e);
    }
  },

  async updateAlertPreferences(prefs: Partial<AlertPreferences>): Promise<AlertPreferences> {
    try {
      const { data } = await apiClient.put<AlertPreferences>('/portal/alert-preferences', prefs);
      return data;
    } catch (e) {
      throw normalizeError(e);
    }
  },

  async getClientProfile(): Promise<ClientProfile> {
    try {
      const { data } = await apiClient.get<ClientProfile>('/portal/client-profile');
      return data;
    } catch (e) {
      throw normalizeError(e);
    }
  },

  async updateClientProfile(
    payload: Partial<Pick<ClientProfile, 'phone2' | 'address' | 'city' | 'country' | 'cni' | 'rc' | 'cc'>>
  ): Promise<void> {
    try {
      await apiClient.patch('/portal/client-profile', payload);
    } catch (e) {
      throw normalizeError(e);
    }
  },
};

export default portalApi;
