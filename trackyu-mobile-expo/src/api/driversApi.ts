/**
 * TrackYu Mobile — Drivers API
 * CRUD sur /drivers
 */
import apiClient from './client';
import { normalizeError } from '../utils/errorTypes';

export type DriverStatus = 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE';

export interface Driver {
  id: string;
  nom: string;
  email?: string;
  telephone?: string;
  adresse?: string;
  permis?: string;
  permisCategories?: string;
  permisExpiration?: string;
  rfidTag?: string;
  contactUrgence?: string;
  statut: DriverStatus;
  vehicleId?: string;
  vehicleName?: string;
  vehiclePlate?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateDriverRequest {
  nom: string;
  email?: string;
  telephone?: string;
  adresse?: string;
  permis?: string;
  permisCategories?: string;
  permisExpiration?: string;
  rfidTag?: string;
  contactUrgence?: string;
  statut?: DriverStatus;
  vehicleId?: string;
}

const driversApi = {
  async getAll(): Promise<Driver[]> {
    try {
      const res = await apiClient.get<Driver[] | { data: Driver[] }>('/drivers');
      const raw = res.data;
      return Array.isArray(raw) ? raw : ((raw as { data: Driver[] }).data ?? []);
    } catch (e) {
      throw normalizeError(e);
    }
  },

  async create(data: CreateDriverRequest): Promise<Driver> {
    try {
      const res = await apiClient.post<Driver | { data: Driver }>('/drivers', data);
      const raw = res.data;
      return (raw as { data: Driver }).data ?? (raw as Driver);
    } catch (e) {
      throw normalizeError(e);
    }
  },

  async update(id: string, data: Partial<CreateDriverRequest>): Promise<Driver> {
    try {
      const res = await apiClient.put<Driver | { data: Driver }>(`/drivers/${id}`, data);
      const raw = res.data;
      return (raw as { data: Driver }).data ?? (raw as Driver);
    } catch (e) {
      throw normalizeError(e);
    }
  },

  async delete(id: string): Promise<void> {
    try {
      await apiClient.delete(`/drivers/${id}`);
    } catch (e) {
      throw normalizeError(e);
    }
  },
};

export default driversApi;
