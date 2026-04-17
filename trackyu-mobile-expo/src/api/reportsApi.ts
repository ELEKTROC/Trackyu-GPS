/**
 * TrackYu Mobile — Scheduled Reports API
 *
 * Endpoint backend : /api/reports/scheduled
 * Permet de programmer l'envoi automatique de rapports par email.
 */
import apiClient from './client';
import { normalizeError } from '../utils/errorTypes';

export type ScheduleFrequency = 'daily' | 'weekly' | 'monthly';
export type ScheduleFormat = 'PDF' | 'CSV';

export interface ScheduledReport {
  id?: string;
  reportModule: string;
  reportSubId: string;
  reportTitle: string;
  frequency: ScheduleFrequency;
  format: ScheduleFormat;
  recipients: string[]; // liste d'emails
  filters?: Record<string, unknown>; // filtres sérialisés
  active: boolean;
  nextRunAt?: string; // ISO
  createdAt?: string;
}

export const reportsApi = {
  /**
   * Crée une nouvelle programmation d'envoi.
   * L'heure d'envoi est déterminée côté backend (06:00 UTC par défaut).
   */
  createSchedule: async (data: Omit<ScheduledReport, 'id' | 'createdAt' | 'nextRunAt'>): Promise<ScheduledReport> => {
    try {
      const res = await apiClient.post<ScheduledReport>('/reports/scheduled', data);
      return res.data;
    } catch (error) {
      throw normalizeError(error);
    }
  },

  /** Liste les programmations de l'utilisateur courant */
  getSchedules: async (): Promise<ScheduledReport[]> => {
    try {
      const res = await apiClient.get<ScheduledReport[]>('/reports/scheduled');
      return Array.isArray(res.data) ? res.data : [];
    } catch (error) {
      throw normalizeError(error);
    }
  },

  /** Supprime / désactive une programmation */
  deleteSchedule: async (id: string): Promise<void> => {
    try {
      await apiClient.delete(`/reports/scheduled/${id}`);
    } catch (error) {
      throw normalizeError(error);
    }
  },
};

export default reportsApi;
