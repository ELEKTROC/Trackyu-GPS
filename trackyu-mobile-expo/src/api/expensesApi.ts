/**
 * TrackYu Mobile — Dépenses véhicules
 * Endpoints: /vehicle-expenses
 */
import apiClient from './client';
import { normalizeError } from '../utils/errorTypes';

export type ExpenseCategory =
  | 'Carburant'
  | 'Péage'
  | 'Réparation'
  | 'Assurance'
  | 'Entretien'
  | 'Lavage'
  | 'Amende'
  | 'Autre';

export interface VehicleExpense {
  id: string;
  vehicleId: string;
  category: ExpenseCategory;
  amount: number;
  currency?: string;
  date: string; // ISO date (YYYY-MM-DD)
  description?: string;
  receiptUrl?: string;
  tenantId?: string;
}

export type CreateExpenseRequest = Omit<VehicleExpense, 'id'>;

export const expensesApi = {
  getAll: async (): Promise<VehicleExpense[]> => {
    try {
      const res = await apiClient.get('/vehicle-expenses');
      return Array.isArray(res.data) ? res.data : [];
    } catch (e) {
      throw normalizeError(e);
    }
  },

  getByVehicle: async (vehicleId: string): Promise<VehicleExpense[]> => {
    try {
      const res = await apiClient.get(`/vehicle-expenses?vehicleId=${vehicleId}`);
      return Array.isArray(res.data) ? res.data : [];
    } catch (e) {
      throw normalizeError(e);
    }
  },

  create: async (data: CreateExpenseRequest): Promise<VehicleExpense> => {
    try {
      const res = await apiClient.post<VehicleExpense>('/vehicle-expenses', data);
      return res.data;
    } catch (e) {
      throw normalizeError(e);
    }
  },

  update: async (id: string, data: Partial<VehicleExpense>): Promise<VehicleExpense> => {
    try {
      const res = await apiClient.put<VehicleExpense>(`/vehicle-expenses/${id}`, data);
      return res.data;
    } catch (e) {
      throw normalizeError(e);
    }
  },

  delete: async (id: string): Promise<void> => {
    try {
      await apiClient.delete(`/vehicle-expenses/${id}`);
    } catch (e) {
      throw normalizeError(e);
    }
  },
};

export default expensesApi;
