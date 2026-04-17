/**
 * TrackYu Mobile — CRM API (Leads)
 * Aligne avec /api/crm/leads (backend crmRoutes.ts)
 * GET /crm/leads → requirePermission('VIEW_CRM') → Lead[] (tableau plat snake_case)
 * Accessible : COMMERCIAL (MANAGE_LEADS), COMPTABLE (VIEW_CRM read-only), MANAGER, ADMIN
 */
import apiClient from './client';
import { normalizeError } from '../utils/errorTypes';

export type LeadStatus = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'PROPOSAL' | 'NEGOTIATION' | 'WON' | 'LOST';

export interface Lead {
  id: string;
  tenant_id: string;
  company_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  status: LeadStatus;
  potential_value: number | null;
  score: number | null;
  source: string | null;
  sector: string | null;
  assigned_to: string | null;
  qualification: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

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

const crmApi = {
  getLeads: async (): Promise<Lead[]> => {
    try {
      const res = await apiClient.get('/crm/leads');
      return Array.isArray(res.data) ? res.data : [];
    } catch (e) {
      throw normalizeError(e);
    }
  },
};

export default crmApi;
