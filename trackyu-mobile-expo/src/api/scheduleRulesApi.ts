/**
 * TrackYu Mobile — Schedule Rules API
 * Endpoints: /schedule-rules
 */
import apiClient from './client';
import { normalizeError } from '../utils/errorTypes';

export interface TimeRange {
  start: string; // "HH:MM"
  end: string; // "HH:MM"
  days: number[]; // 0=Dim, 1=Lun, ..., 6=Sam
}

export interface ScheduleRule {
  id: string;
  tenantId?: string;
  name: string;
  enableTimeRestriction: boolean;
  timeRanges?: TimeRange[];
  enableDistanceLimit: boolean;
  maxDistancePerDay?: number;
  enableSpeedLimit: boolean;
  maxSpeed?: number;
  enableEngineHoursLimit: boolean;
  maxEngineHoursPerDay?: number;
  vehicleIds?: string[];
  status: 'ACTIVE' | 'INACTIVE';
  enableCustomRestriction?: boolean;
  customRestrictionName?: string;
}

export type CreateScheduleRuleRequest = Omit<ScheduleRule, 'id'>;

export const scheduleRulesApi = {
  getAll: async (): Promise<ScheduleRule[]> => {
    try {
      const res = await apiClient.get('/schedule-rules');
      return Array.isArray(res.data) ? res.data : [];
    } catch (e) {
      throw normalizeError(e);
    }
  },

  create: async (data: CreateScheduleRuleRequest): Promise<ScheduleRule> => {
    try {
      const res = await apiClient.post<ScheduleRule>('/schedule-rules', data);
      return res.data;
    } catch (e) {
      throw normalizeError(e);
    }
  },

  update: async (id: string, data: Partial<ScheduleRule>): Promise<ScheduleRule> => {
    try {
      const res = await apiClient.put<ScheduleRule>(`/schedule-rules/${id}`, data);
      return res.data;
    } catch (e) {
      throw normalizeError(e);
    }
  },

  delete: async (id: string): Promise<void> => {
    try {
      await apiClient.delete(`/schedule-rules/${id}`);
    } catch (e) {
      throw normalizeError(e);
    }
  },
};

export default scheduleRulesApi;
