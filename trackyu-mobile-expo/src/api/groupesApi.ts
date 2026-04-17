/**
 * TrackYu Mobile — Groupes API
 * GET/POST/PUT/DELETE /groups
 */
import apiClient from './client';
import { normalizeError } from '../utils/errorTypes';

export interface Groupe {
  id: string;
  tenantId?: string;
  nom: string;
  description?: string;
  statut: 'Actif' | 'Inactif';
  vehicleCount?: number;
  createdAt?: string;
}

export type CreateGroupeRequest = Omit<Groupe, 'id' | 'createdAt' | 'vehicleCount'>;

const groupesApi = {
  getAll: async (): Promise<Groupe[]> => {
    try {
      const res = await apiClient.get('/groups');
      return Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
    } catch (e) {
      throw normalizeError(e);
    }
  },

  create: async (data: CreateGroupeRequest): Promise<Groupe> => {
    try {
      const res = await apiClient.post<Groupe>('/groups', data);
      return res.data;
    } catch (e) {
      throw normalizeError(e);
    }
  },

  update: async (id: string, data: Partial<Groupe>): Promise<Groupe> => {
    try {
      const res = await apiClient.put<Groupe>(`/groups/${id}`, data);
      return res.data;
    } catch (e) {
      throw normalizeError(e);
    }
  },

  delete: async (id: string): Promise<void> => {
    try {
      await apiClient.delete(`/groups/${id}`);
    } catch (e) {
      throw normalizeError(e);
    }
  },
};

export default groupesApi;
