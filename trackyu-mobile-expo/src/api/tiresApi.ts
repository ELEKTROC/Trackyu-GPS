/**
 * TrackYu Mobile — Gestion des pneus
 * Endpoints: /fleet-tires
 */
import apiClient from './client';
import { normalizeError } from '../utils/errorTypes';

// Positions voiture (4 roues)
// Positions camion : essieux avant + essieux arrière avec doubles montages
export type TirePosition =
  | 'AV.G'
  | 'AV.D' // Avant gauche / droit
  | 'AR.G'
  | 'AR.D' // Arrière simple (voiture)
  | 'E1.GE'
  | 'E1.GI'
  | 'E1.DE'
  | 'E1.DI' // Essieu 1 arrière (double montage)
  | 'E2.GE'
  | 'E2.GI'
  | 'E2.DE'
  | 'E2.DI' // Essieu 2 arrière
  | 'E3.GE'
  | 'E3.GI'
  | 'E3.DE'
  | 'E3.DI' // Essieu 3 arrière
  | 'Secours';

export interface Tire {
  id: string;
  vehicleId: string;
  serialNumber: string;
  brand?: string;
  position: TirePosition;
  mountDate: string; // ISO date
  mileageAtMount: number; // km au moment de la pose
  targetMileage: number; // km cible avant remplacement
  currentMileage?: number; // km actuel du véhicule (calculé)
  status: 'Actif' | 'Remplacé' | 'Hors service';
  notes?: string;
  tenantId?: string;
}

export type CreateTireRequest = Omit<Tire, 'id'>;

export const tiresApi = {
  getAll: async (): Promise<Tire[]> => {
    try {
      const res = await apiClient.get('/fleet-tires');
      return Array.isArray(res.data) ? res.data : [];
    } catch (e) {
      throw normalizeError(e);
    }
  },

  getByVehicle: async (vehicleId: string): Promise<Tire[]> => {
    try {
      const res = await apiClient.get(`/fleet-tires?vehicleId=${vehicleId}`);
      return Array.isArray(res.data) ? res.data : [];
    } catch (e) {
      throw normalizeError(e);
    }
  },

  create: async (data: CreateTireRequest): Promise<Tire> => {
    try {
      const res = await apiClient.post<Tire>('/fleet-tires', data);
      return res.data;
    } catch (e) {
      throw normalizeError(e);
    }
  },

  update: async (id: string, data: Partial<Tire>): Promise<Tire> => {
    try {
      const res = await apiClient.put<Tire>(`/fleet-tires/${id}`, data);
      return res.data;
    } catch (e) {
      throw normalizeError(e);
    }
  },

  delete: async (id: string): Promise<void> => {
    try {
      await apiClient.delete(`/fleet-tires/${id}`);
    } catch (e) {
      throw normalizeError(e);
    }
  },
};

export default tiresApi;
