/**
 * TrackYu Mobile — Alert Configs API
 * GET/POST/PUT/DELETE/PATCH /monitoring/alert-configs
 */
import apiClient from './client';
import { normalizeError } from '../utils/errorTypes';

export type AlertType =
  | 'speed'
  | 'geofence'
  | 'fuel'
  | 'fuel_drop'
  | 'fuel_refill'
  | 'sos'
  | 'battery'
  | 'offline'
  | 'harsh_driving'
  | 'ignition'
  | 'temperature'
  | 'maintenance'
  | 'idle';

export type AlertPriority = 'Faible' | 'Moyenne' | 'Haute' | 'Critique';

export interface AlertConfig {
  id: string;
  nom: string;
  type: AlertType | string;
  priorite: AlertPriority;
  statut: 'Actif' | 'Inactif';
  is_active?: boolean;
  // Conditions
  conditionValue?: number | string;
  conditionDuration?: number;
  conditionZoneId?: string;
  conditionDirection?: 'enter' | 'exit' | 'both';
  harshDrivingType?: 'ALL' | 'BRAKING' | 'ACCEL' | 'TURN';
  // Scope
  vehicleIds?: string[];
  allVehicles?: boolean;
  // Schedule
  isScheduled?: boolean;
  scheduleDays?: string[];
  scheduleTimeStart?: string;
  scheduleTimeEnd?: string;
  // Notifications
  notifyEmail?: boolean;
  notifySms?: boolean;
  notifyPush?: boolean;
  notifyWeb?: boolean;
  notificationUserIds?: string[];
  customEmails?: string;
  customPhones?: string;
  description?: string;
  createdAt?: string;
  tenantId?: string;
}

export type CreateAlertConfigRequest = Omit<AlertConfig, 'id' | 'createdAt'>;

const alertConfigsApi = {
  getAll: async (): Promise<AlertConfig[]> => {
    try {
      const res = await apiClient.get('/monitoring/alert-configs');
      return Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
    } catch (e) {
      throw normalizeError(e);
    }
  },

  create: async (data: CreateAlertConfigRequest): Promise<AlertConfig> => {
    try {
      const res = await apiClient.post<AlertConfig>('/monitoring/alert-configs', data);
      return res.data;
    } catch (e) {
      throw normalizeError(e);
    }
  },

  update: async (id: string, data: Partial<AlertConfig>): Promise<AlertConfig> => {
    try {
      const res = await apiClient.put<AlertConfig>(`/monitoring/alert-configs/${id}`, data);
      return res.data;
    } catch (e) {
      throw normalizeError(e);
    }
  },

  delete: async (id: string): Promise<void> => {
    try {
      await apiClient.delete(`/monitoring/alert-configs/${id}`);
    } catch (e) {
      throw normalizeError(e);
    }
  },

  toggle: async (id: string, isActive: boolean): Promise<AlertConfig> => {
    try {
      const res = await apiClient.patch<AlertConfig>(`/monitoring/alert-configs/${id}/toggle`, { is_active: isActive });
      return res.data;
    } catch (e) {
      throw normalizeError(e);
    }
  },
};

export default alertConfigsApi;
