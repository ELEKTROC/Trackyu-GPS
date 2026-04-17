/**
 * TrackYu Mobile — Geofences API
 * GET /monitoring/geofences   (VIEW_TECH)
 * GET /monitoring/geofences/:id
 */
import apiClient from './client';
import { normalizeError } from '../utils/errorTypes';

// ── Types ─────────────────────────────────────────────────────────────────────

export type GeofenceType = 'CIRCLE' | 'POLYGON' | 'ROUTE';

/** Coordonnées CIRCLE : { center, radius } */
export interface CircleCoords {
  center: { lat: number; lng: number };
  radius: number; // mètres
}

/** Coordonnées POLYGON / ROUTE : tableau de points */
export type PolygonCoords = { lat: number; lng: number }[];

export interface Geofence {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  type: GeofenceType;
  /** CIRCLE → CircleCoords | POLYGON|ROUTE → PolygonCoords */
  coordinates: CircleCoords | PolygonCoords;
  color?: string;
  is_active: boolean;
  created_at: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function isCircle(g: Geofence): g is Geofence & { coordinates: CircleCoords } {
  return g.type === 'CIRCLE';
}

export function toLatLng(coords: PolygonCoords) {
  return coords.map((p) => ({ latitude: p.lat, longitude: p.lng }));
}

// ── API ───────────────────────────────────────────────────────────────────────

export const geofencesApi = {
  async getAll(): Promise<Geofence[]> {
    try {
      const res = await apiClient.get<Geofence[]>('/monitoring/geofences');
      return Array.isArray(res.data) ? res.data : [];
    } catch (error) {
      throw normalizeError(error);
    }
  },

  async getById(id: string): Promise<Geofence> {
    try {
      const res = await apiClient.get<Geofence>(`/monitoring/geofences/${id}`);
      return res.data;
    } catch (error) {
      throw normalizeError(error);
    }
  },
};

export default geofencesApi;
