/**
 * TrackYu Mobile - Users API
 */
import apiClient from './client';
import { normalizeError } from '../utils/errorTypes';
import type { User } from './auth';

export interface UpdateProfileRequest {
  name: string;
  phone?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

/** Utilisateur tel que retourné par GET /users (champs sensibles exclus par le backend) */
export interface TenantUser {
  id: string;
  email: string;
  name: string;
  role: string;
  phone: string | null;
  avatar: string | null;
  status: 'Actif' | 'Inactif' | string;
  tenant_id: string;
  client_id: string | null;
  created_at: string;
  last_login: string | null;
  departement: string | null;
  poste: string | null;
}

export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
  role: string;
  phone?: string;
  departement?: string;
  poste?: string;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
  departement?: string;
  poste?: string;
}

export const usersApi = {
  /** GET /users — requiert VIEW_USERS. Retourne tableau plat filtré par tenant (SUPERADMIN voit tout). */
  getAll: async (): Promise<TenantUser[]> => {
    try {
      const res = await apiClient.get('/users');
      return Array.isArray(res.data) ? res.data : [];
    } catch (e) {
      throw normalizeError(e);
    }
  },

  /** POST /users — créer un sous-utilisateur */
  createUser: async (data: CreateUserRequest): Promise<TenantUser> => {
    try {
      const res = await apiClient.post<TenantUser>('/users', data);
      return res.data;
    } catch (e) {
      throw normalizeError(e);
    }
  },

  /** PUT /users/:id — modifier un utilisateur */
  updateUser: async (userId: string, data: UpdateUserRequest): Promise<TenantUser> => {
    try {
      const res = await apiClient.put<TenantUser>(`/users/${userId}`, data);
      return res.data;
    } catch (e) {
      throw normalizeError(e);
    }
  },

  /** PUT /users/:id — activer / désactiver (status dans le payload) */
  toggleStatus: async (userId: string, status: 'Actif' | 'Inactif'): Promise<void> => {
    try {
      await apiClient.put(`/users/${userId}`, { status });
    } catch (e) {
      throw normalizeError(e);
    }
  },

  updateProfile: async (userId: string, data: UpdateProfileRequest): Promise<User> => {
    try {
      const res = await apiClient.put<User>(`/users/${userId}`, data);
      return res.data;
    } catch (e) {
      throw normalizeError(e);
    }
  },

  changePassword: async (_userId: string, data: ChangePasswordRequest): Promise<void> => {
    try {
      await apiClient.post('/auth/change-password', data);
    } catch (e) {
      throw normalizeError(e);
    }
  },
};

export default usersApi;
