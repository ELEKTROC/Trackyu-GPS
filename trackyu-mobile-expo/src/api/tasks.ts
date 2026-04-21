/**
 * TrackYu Mobile — CRM Tasks API
 * Aligne avec /api/crm/tasks (backend/src/routes/crmRoutes.ts)
 */
import apiClient from './client';
import { normalizeError } from '../utils/errorTypes';

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'BLOCKED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string; // ISO — utilisé dans l'agenda
  assignedTo?: string;
  assignedUserName?: string;
  clientId?: string;
  clientName?: string;
  relatedTo?: { type: 'LEAD' | 'CLIENT' | 'QUOTE' | 'INVOICE'; id: string; name?: string };
  reminder?: 'NONE' | '15M' | '30M' | '1H' | '2H' | '1D' | '2D' | '1W';
  createdAt: string;
  updatedAt: string;
}

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: 'À faire',
  IN_PROGRESS: 'En cours',
  DONE: 'Terminée',
  BLOCKED: 'Bloquée',
};

export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  TODO: '#6B7280',
  IN_PROGRESS: '#3B82F6',
  DONE: '#22C55E',
  BLOCKED: '#EF4444',
};

export const TASK_PRIORITY_COLORS: Record<TaskPriority, string> = {
  LOW: '#6B7280',
  MEDIUM: '#F59E0B',
  HIGH: '#F97316',
  URGENT: '#EF4444',
};

const tasksApi = {
  getAll: async (params?: { assignedTo?: string }): Promise<Task[]> => {
    try {
      const res = await apiClient.get('/crm/tasks', {
        params: params?.assignedTo ? { assignedTo: params.assignedTo } : undefined,
      });
      return Array.isArray(res.data) ? res.data : [];
    } catch (error) {
      throw normalizeError(error);
    }
  },

  update: async (id: string, data: Partial<Task>): Promise<Task> => {
    try {
      const res = await apiClient.put(`/crm/tasks/${id}`, data);
      return res.data;
    } catch (error) {
      throw normalizeError(error);
    }
  },

  reschedule: async (id: string, dueDate: string): Promise<Task> => {
    return tasksApi.update(id, { dueDate });
  },
};

export default tasksApi;
