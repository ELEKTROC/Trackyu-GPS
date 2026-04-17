/**
 * TrackYu Mobile — Branches API
 * GET/POST/PUT/DELETE /branches
 */
import apiClient from './client';
import { normalizeError } from '../utils/errorTypes';

export interface Branch {
  id: string;
  name: string;
  tenantId?: string;
  clientId?: string;
  isDefault?: boolean;
  ville?: string;
  responsable?: string;
  statut?: 'ACTIVE' | 'INACTIVE';
  email?: string;
  phone?: string;
  description?: string;
  country?: string;
  resellerId?: string;
  createdAt?: string;
}

export type CreateBranchRequest = Omit<Branch, 'id' | 'createdAt'>;

const branchesApi = {
  getAll: async (): Promise<Branch[]> => {
    try {
      const res = await apiClient.get('/branches');
      return Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
    } catch (e) {
      throw normalizeError(e);
    }
  },

  create: async (data: CreateBranchRequest): Promise<Branch> => {
    try {
      const res = await apiClient.post<Branch>('/branches', data);
      return res.data;
    } catch (e) {
      throw normalizeError(e);
    }
  },

  update: async (id: string, data: Partial<Branch>): Promise<Branch> => {
    try {
      const res = await apiClient.put<Branch>(`/branches/${id}`, data);
      return res.data;
    } catch (e) {
      throw normalizeError(e);
    }
  },

  delete: async (id: string): Promise<void> => {
    try {
      await apiClient.delete(`/branches/${id}`);
    } catch (e) {
      throw normalizeError(e);
    }
  },
};

export default branchesApi;
