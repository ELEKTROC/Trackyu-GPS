/**
 * TrackYu Mobile — CRM API (Leads)
 * Aligne avec /api/crm/leads (backend crmRoutes.ts)
 * Permissions : VIEW_CRM (lecture), CREATE_LEADS / EDIT_LEADS / DELETE_LEADS (écriture)
 */
import apiClient from './client';
import { normalizeError } from '../utils/errorTypes';

export type LeadStatus = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'PROPOSAL' | 'NEGOTIATION' | 'WON' | 'LOST';
export type LeadType = 'B2B' | 'B2C';

export interface Lead {
  id: string;
  tenant_id: string;
  company_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  status: LeadStatus;
  type?: LeadType;
  potential_value: number | null;
  score: number | null;
  source: string | null;
  sector: string | null;
  assigned_to: string | null;
  reseller_id?: string | null;
  reseller_name?: string | null;
  notes: string | null;
  qualification: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateLeadRequest {
  companyName: string;
  contactName?: string;
  email?: string;
  phone?: string;
  status?: LeadStatus;
  type?: LeadType;
  potentialValue?: number;
  source?: string;
  sector?: string;
  notes?: string;
  resellerId?: string;
  assignedTo?: string;
}

export type UpdateLeadRequest = Partial<CreateLeadRequest>;

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  NEW: 'Nouveau',
  CONTACTED: 'Contacté',
  QUALIFIED: 'Qualifié',
  PROPOSAL: 'Proposition',
  NEGOTIATION: 'Négociation',
  WON: 'Gagné',
  LOST: 'Perdu',
};

export const LEAD_STATUS_COLORS: Record<LeadStatus, string> = {
  NEW: '#3B82F6',
  CONTACTED: '#8B5CF6',
  QUALIFIED: '#F59E0B',
  PROPOSAL: '#06B6D4',
  NEGOTIATION: '#F97316',
  WON: '#22C55E',
  LOST: '#EF4444',
};

const LEAD_FILTER_STATUSES: LeadStatus[] = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'];
export { LEAD_FILTER_STATUSES };

export const LEAD_SECTORS = [
  { value: 'TRANSPORT', label: 'Transport & Logistique' },
  { value: 'BTP', label: 'BTP & Construction' },
  { value: 'SERVICES', label: 'Services' },
  { value: 'COMMERCE', label: 'Commerce & Distribution' },
  { value: 'INDUSTRIE', label: 'Industrie' },
  { value: 'AGRICULTURE', label: 'Agriculture' },
  { value: 'AUTRE', label: 'Autre' },
];

export const LEAD_SOURCES = [
  { value: 'REFERRAL', label: 'Recommandation' },
  { value: 'WEBSITE', label: 'Site web' },
  { value: 'SOCIAL', label: 'Réseaux sociaux' },
  { value: 'COLD_CALL', label: 'Prospection' },
  { value: 'EVENT', label: 'Événement' },
  { value: 'PARTNER', label: 'Partenaire' },
  { value: 'OTHER', label: 'Autre' },
];

const crmApi = {
  getLeads: async (): Promise<Lead[]> => {
    try {
      const res = await apiClient.get('/crm/leads');
      return Array.isArray(res.data) ? res.data : [];
    } catch (e) {
      throw normalizeError(e);
    }
  },

  /** POST /crm/leads — backend requiert companyName min 1 */
  createLead: async (data: CreateLeadRequest): Promise<Lead> => {
    try {
      const res = await apiClient.post('/crm/leads', { status: 'NEW', type: 'B2B', ...data });
      return res.data;
    } catch (e) {
      throw normalizeError(e);
    }
  },

  /** PUT /crm/leads/:id */
  updateLead: async (id: string, data: UpdateLeadRequest): Promise<Lead> => {
    try {
      const res = await apiClient.put(`/crm/leads/${id}`, data);
      return res.data;
    } catch (e) {
      throw normalizeError(e);
    }
  },

  /** DELETE /crm/leads/:id */
  deleteLead: async (id: string): Promise<void> => {
    try {
      await apiClient.delete(`/crm/leads/${id}`);
    } catch (e) {
      throw normalizeError(e);
    }
  },

  /**
   * POST /crm/leads/:leadId/convert
   * Convertit le lead en client (tier type=CLIENT). Corps vide = pas de contrat (allégé).
   */
  convertToClient: async (leadId: string): Promise<{ clientId: string; clientName: string }> => {
    try {
      const res = await apiClient.post(`/crm/leads/${leadId}/convert`, {});
      return res.data;
    } catch (e) {
      throw normalizeError(e);
    }
  },
};

export default crmApi;
