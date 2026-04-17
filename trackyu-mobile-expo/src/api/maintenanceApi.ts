/**
 * TrackYu Mobile — Maintenance Rules API
 * Endpoints: /maintenance-rules
 */
import apiClient from './client';
import { normalizeError } from '../utils/errorTypes';

export type MaintenanceCategory =
  | 'Visite technique'
  | 'Assurance'
  | 'Patente'
  | 'Permis de conduire'
  | 'Carte de transporteur'
  | 'Maintenance Mécanique'
  | 'Autre';

export type MaintenanceTrigger = 'Kilométrage' | 'Durée' | 'Date' | 'Heures Moteur';
export type MaintenanceUnit = 'km' | 'mois' | 'jours' | 'ans' | 'h';

export interface MaintenanceRule {
  id: string;
  nom: string;
  category: MaintenanceCategory;
  type: MaintenanceTrigger;
  intervalle?: string | number;
  unit?: MaintenanceUnit;
  reminderValue?: string | number;
  reminderUnit?: string;
  isRecurring: boolean;
  vehicleIds?: string[];
  notificationUserIds?: string[];
  notifyEmail: boolean;
  notifySms: boolean;
  notifyPush: boolean;
  description?: string;
  statut: 'Actif' | 'Inactif';
  tenantId?: string;
  client?: string;
  resellerId?: string;
}

export type CreateMaintenanceRuleRequest = Omit<MaintenanceRule, 'id'>;

export const maintenanceApi = {
  getAll: async (): Promise<MaintenanceRule[]> => {
    try {
      const res = await apiClient.get('/maintenance-rules');
      return Array.isArray(res.data) ? res.data : [];
    } catch (e) {
      throw normalizeError(e);
    }
  },

  create: async (data: CreateMaintenanceRuleRequest): Promise<MaintenanceRule> => {
    try {
      const res = await apiClient.post<MaintenanceRule>('/maintenance-rules', data);
      return res.data;
    } catch (e) {
      throw normalizeError(e);
    }
  },

  update: async (id: string, data: Partial<MaintenanceRule>): Promise<MaintenanceRule> => {
    try {
      const res = await apiClient.put<MaintenanceRule>(`/maintenance-rules/${id}`, data);
      return res.data;
    } catch (e) {
      throw normalizeError(e);
    }
  },

  delete: async (id: string): Promise<void> => {
    try {
      await apiClient.delete(`/maintenance-rules/${id}`);
    } catch (e) {
      throw normalizeError(e);
    }
  },
};

export default maintenanceApi;
