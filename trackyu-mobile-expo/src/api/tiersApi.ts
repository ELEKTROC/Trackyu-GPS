/**
 * TrackYu Mobile — Tiers API (Clients / Revendeurs / Fournisseurs)
 * Aligne avec /api/tiers (backend tierRoutes.ts)
 * Requiert VIEW_CLIENTS | VIEW_CRM | VIEW_FINANCE (lecture)
 * et CREATE_CLIENTS | EDIT_CLIENTS | DELETE_CLIENTS (CRUD)
 */
import apiClient from './client';
import { normalizeError } from '../utils/errorTypes';

export type TierType = 'CLIENT' | 'SUPPLIER' | 'RESELLER' | 'PROSPECT';
export type TierStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'CHURNED';

/** Métadonnées spécifiques revendeur (stockées dans tiers.metadata.resellerData) */
export interface ResellerData {
  adminName?: string;
  adminEmail?: string;
  adminPhone?: string;
  managerName?: string;
  activity?: string;
  rccm?: string;
  ccNumber?: string;
  domain?: string;
}

export interface Tier {
  id: string;
  tenantId: string;
  type: TierType;
  name: string;
  slug?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  status: TierStatus;
  accountingCode?: string;
  resellerId?: string;
  resellerData?: ResellerData;
  createdAt: string;
  updatedAt: string;
}

/** Payload création revendeur (allégé : société + admin, pas de white-label) */
export interface CreateResellerRequest {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  accountingCode?: string;
  resellerData?: ResellerData;
}

/** Payload mise à jour revendeur (tous champs optionnels) */
export type UpdateResellerRequest = Partial<CreateResellerRequest> & { status?: TierStatus };

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

  /**
   * Crée un revendeur (type=RESELLER par défaut).
   * Backend : POST /tiers — validation Zod TierSchema (name min 2, type, phone format).
   */
  createReseller: async (data: CreateResellerRequest): Promise<Tier> => {
    try {
      const res = await apiClient.post('/tiers', {
        ...data,
        type: 'RESELLER',
        status: 'ACTIVE',
      });
      return (res.data?.data ?? res.data) as Tier;
    } catch (error) {
      throw normalizeError(error);
    }
  },

  /**
   * Met à jour un revendeur (tous champs partiels).
   * Backend : PUT /tiers/:id — validation Zod TierUpdateSchema.
   */
  updateReseller: async (id: string, data: UpdateResellerRequest): Promise<Tier> => {
    try {
      const res = await apiClient.put(`/tiers/${id}`, data);
      return (res.data?.data ?? res.data) as Tier;
    } catch (error) {
      throw normalizeError(error);
    }
  },

  /** Change uniquement le statut (ACTIVE/SUSPENDED/INACTIVE) */
  toggleStatus: async (id: string, status: TierStatus): Promise<Tier> => {
    try {
      const res = await apiClient.put(`/tiers/${id}`, { status });
      return (res.data?.data ?? res.data) as Tier;
    } catch (error) {
      throw normalizeError(error);
    }
  },
};

export default tiersApi;
