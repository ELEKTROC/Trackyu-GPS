/**
 * TrackYu Mobile — useVehicleSync
 *
 * Hook global appelé depuis AppInner (toujours actif quand authentifié).
 * Gère le cycle de vie WebSocket + synchronise les mises à jour WS vers :
 *   1. vehicleStore (Zustand) → MapScreen lit les marqueurs live
 *   2. React Query cache ['vehicles'] → FleetScreen / DashboardScreen / ReportsScreen
 *
 * Avant ce hook, le WS était géré dans MapScreen → déconnecté dès que
 * l'utilisateur quittait la carte, et le cache React Query n'était jamais
 * mis à jour en temps réel.
 */
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { wsService } from '../services/websocket';
import { useAuthStore } from '../store/authStore';
import { useVehicleStore } from '../store/vehicleStore';
import { normalizeVehicleWS, type Vehicle } from '../api/vehicles';

export function useVehicleSync(): void {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const updateVehicle = useVehicleStore((s) => s.updateVehicle);
  const qc = useQueryClient();

  useEffect(() => {
    if (!isAuthenticated) return;

    wsService.connect();

    const unsubVehicle = wsService.onVehicleUpdate((raw: Vehicle) => {
      // Le backend émet les statuts en majuscules (STOPPED, MOVING…) — normaliser
      const v = normalizeVehicleWS(raw as unknown as Record<string, unknown>);

      // 1. vehicleStore — marqueurs MapScreen (mis à jour instantanément)
      updateVehicle(v);

      // 2. React Query cache — FleetScreen, DashboardScreen, ReportsScreen
      qc.setQueryData<Vehicle[]>(['vehicles'], (prev) => {
        if (!prev) return prev;
        const idx = prev.findIndex((x) => x.id === v.id);
        if (idx === -1) return [...prev, v];
        const next = [...prev];
        // Merge : metadata REST conservée, champs live (position/status) mis à jour
        next[idx] = { ...next[idx], ...v };
        return next;
      });
    });

    return () => {
      unsubVehicle();
      wsService.disconnect();
    };
  }, [isAuthenticated, updateVehicle, qc]);
}
