/**
 * TrackYu Mobile — Tiers API (Clients / Revendeurs / Fournisseurs)
 * Aligne avec /api/tiers (backend crmRoutes.ts)
 * Requiert VIEW_CLIENTS | VIEW_CRM | VIEW_FINANCE
 */
import apiClient from './client';
import { normalizeError } from '../utils/errorTypes';

export type TierType = 'CLIENT' | 'SUPPLIER' | 'RESELLER' | 'PROSPECT';
export type TierStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'CHURNED';

export interface Tier {
  id: string;
  tenantId: string;
  type: TierType;
  name: string;
  email?: string;
  phone?: string;
  status: TierStatus;
  resellerId?: string;
  createdAt: string;
  updatedAt: string;
}

const tiersApi = {
  /** Récupère tous les tiers, filtrable par type */
  getAll: async (params?: { type?: TierType }): Promise<Tier[]> => {
    try {
      const res = await apiClient.get('/tiers', { params: { limit: 500, ...params } });
      if (Array.isArray(res.data?.data)) return res.data.data;
      if (Array.isArray(res.data)) return res.data;
      return [];
    } catch (error) {
      throw normalizeError(error);
    }
  },

  /** Récupère uniquement les revendeurs — silencieux si pas de droits */
  getResellers: async (): Promise<Tier[]> => {
    try {
      const res = await apiClient.get('/tiers', { params: { type: 'RESELLER', limit: 100 } });
      if (Array.isArray(res.data?.data)) return res.data.data;
      if (Array.isArray(res.data)) return res.data;
      return [];
    } catch {
      return [];
    }
  },
};

export default tiersApi;
