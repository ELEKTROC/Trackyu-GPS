/**
 * TrackYu Mobile — Drivers API
 * CRUD sur /drivers
 */
import apiClient from './client';

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
    const res = await apiClient.get<Driver[] | { data: Driver[] }>('/drivers');
    const raw = res.data;
    return Array.isArray(raw) ? raw : ((raw as any).data ?? []);
  },

  async create(data: CreateDriverRequest): Promise<Driver> {
    const res = await apiClient.post<Driver | { data: Driver }>('/drivers', data);
    const raw = res.data;
    return (raw as any).data ?? raw;
  },

  async update(id: string, data: Partial<CreateDriverRequest>): Promise<Driver> {
    const res = await apiClient.put<Driver | { data: Driver }>(`/drivers/${id}`, data);
    const raw = res.data;
    return (raw as any).data ?? raw;
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/drivers/${id}`);
  },
};

export default driversApi;
