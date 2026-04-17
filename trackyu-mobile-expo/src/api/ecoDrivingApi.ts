/**
 * TrackYu Mobile — Eco Driving Profiles API
 * Endpoints: /eco-driving-profiles
 */
import apiClient from './client';
import { normalizeError } from '../utils/errorTypes';

export type Sensitivity = 'LOW' | 'MEDIUM' | 'HIGH';

export interface EcoDrivingProfile {
  id: string;
  tenantId?: string;
  name: string;
  targetScore: number;
  maxSpeedLimit: number; // km/h
  maxSpeedPenalty: number; // points
  harshAccelerationSensitivity: Sensitivity;
  harshAccelerationPenalty: number;
  harshBrakingSensitivity: Sensitivity;
  harshBrakingPenalty: number;
  harshCorneringSensitivity?: Sensitivity;
  harshCorneringPenalty?: number;
  maxIdlingDuration: number; // minutes
  idlingPenalty: number;
  vehicleIds?: string[];
  allVehicles?: boolean;
  status: 'ACTIVE' | 'INACTIVE';
  client?: string;
  resellerId?: string;
}

export type CreateEcoDrivingProfileRequest = Omit<EcoDrivingProfile, 'id'>;

export const ecoDrivingApi = {
  getAll: async (): Promise<EcoDrivingProfile[]> => {
    try {
      const res = await apiClient.get('/eco-driving-profiles');
      return Array.isArray(res.data) ? res.data : [];
    } catch (e) {
      throw normalizeError(e);
    }
  },

  create: async (data: CreateEcoDrivingProfileRequest): Promise<EcoDrivingProfile> => {
    try {
      const res = await apiClient.post<EcoDrivingProfile>('/eco-driving-profiles', data);
      return res.data;
    } catch (e) {
      throw normalizeError(e);
    }
  },

  update: async (id: string, data: Partial<EcoDrivingProfile>): Promise<EcoDrivingProfile> => {
    try {
      const res = await apiClient.put<EcoDrivingProfile>(`/eco-driving-profiles/${id}`, data);
      return res.data;
    } catch (e) {
      throw normalizeError(e);
    }
  },

  delete: async (id: string): Promise<void> => {
    try {
      await apiClient.delete(`/eco-driving-profiles/${id}`);
    } catch (e) {
      throw normalizeError(e);
    }
  },
};

export default ecoDrivingApi;
