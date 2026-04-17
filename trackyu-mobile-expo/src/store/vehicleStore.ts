/**
 * TrackYu Mobile - Vehicle Store (Zustand)
 *
 * Source de vérité unique pour les positions véhicules.
 * Alimenté par :
 *   1. Chargement initial REST (vehiclesApi.getAll)
 *   2. Mises à jour temps réel via WebSocket (vehicle:update)
 */
import { create } from 'zustand';
import type { Vehicle } from '../api/vehicles';

interface VehicleStoreState {
  vehicles: Map<string, Vehicle>;
  isInitialized: boolean;

  // Actions
  setAllVehicles: (vehicles: Vehicle[]) => void;
  updateVehicle: (vehicle: Vehicle) => void;
  deleteVehicle: (id: string) => void;
  getVehicleList: () => Vehicle[];
  getVehicle: (id: string) => Vehicle | undefined;
}

export const useVehicleStore = create<VehicleStoreState>((set, get) => ({
  vehicles: new Map(),
  isInitialized: false,

  setAllVehicles: (vehicles: Vehicle[]) => {
    set((state) => {
      const map = new Map<string, Vehicle>();
      vehicles.forEach((v) => {
        const live = state.vehicles.get(v.id);
        // REST est autoritaire sur les métadonnées (plaque, nom, abonnement…).
        // WS est autoritaire sur les données live (position, statut, vitesse).
        // On conserve les champs live si un update WS existe déjà pour ce véhicule.
        map.set(
          v.id,
          live
            ? {
                ...v,
                latitude: live.latitude ?? v.latitude,
                longitude: live.longitude ?? v.longitude,
                status: live.status ?? v.status,
                speed: live.speed ?? v.speed,
                lastUpdate: live.lastUpdate ?? v.lastUpdate,
              }
            : v
        );
      });
      return { vehicles: map, isInitialized: true };
    });
  },

  updateVehicle: (vehicle: Vehicle) => {
    set((state) => {
      const updated = new Map(state.vehicles);
      updated.set(vehicle.id, vehicle);
      return { vehicles: updated };
    });
  },

  deleteVehicle: (id: string) => {
    set((state) => {
      const updated = new Map(state.vehicles);
      updated.delete(id);
      return { vehicles: updated };
    });
  },

  getVehicleList: () => {
    return Array.from(get().vehicles.values());
  },

  getVehicle: (id: string) => {
    return get().vehicles.get(id);
  },
}));

export default useVehicleStore;
