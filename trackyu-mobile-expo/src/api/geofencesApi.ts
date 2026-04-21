/**
 * TrackYu Mobile — Geofences API
 * GET  /monitoring/geofences      (VIEW_TECH)
 * POST /monitoring/geofences      (MANAGE_FLEET) — CIRCLE uniquement sur mobile
 * PUT  /monitoring/geofences/:id  (MANAGE_FLEET)
 * DEL  /monitoring/geofences/:id  (MANAGE_FLEET)
 *
 * Format POST/PUT backend :
 *   { name, type: 'CIRCLE', coordinates: [{lat, lng}], radius, color, isActive }
 * Format GET retourné :
 *   CIRCLE  → coordinates: CircleCoords ({ center: {lat, lng}, radius })
 *   POLYGON → coordinates: PolygonCoords ([{lat, lng}, ...])
 */
import apiClient from './client';
import { normalizeError } from '../utils/errorTypes';

// ── Types ─────────────────────────────────────────────────────────────────────

export type GeofenceType = 'CIRCLE' | 'POLYGON' | 'ROUTE';

/** Coordonnées CIRCLE telles que retournées par le GET */
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

/** Payload POST/PUT pour une géofence CIRCLE (format attendu par le backend) */
export interface CreateCircleRequest {
  name: string;
  type: 'CIRCLE';
  /** Tableau d'un seul point : le centre du cercle */
  coordinates: [{ lat: number; lng: number }];
  radius: number;
  color?: string;
  isActive?: boolean;
}

export type UpdateCircleRequest = Partial<CreateCircleRequest>;

// ── Helpers ───────────────────────────────────────────────────────────────────

export function isCircle(g: Geofence): g is Geofence & { coordinates: CircleCoords } {
  return g.type === 'CIRCLE';
}

export function toLatLng(coords: PolygonCoords) {
  return coords.map((p) => ({ latitude: p.lat, longitude: p.lng }));
}

export function formatRadius(meters: number): string {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`;
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

  /** POST /monitoring/geofences — CIRCLE uniquement sur mobile */
  async create(data: CreateCircleRequest): Promise<Geofence> {
    try {
      const res = await apiClient.post('/monitoring/geofences', data);
      return res.data;
    } catch (error) {
      throw normalizeError(error);
    }
  },

  /** PUT /monitoring/geofences/:id */
  async update(id: string, data: UpdateCircleRequest): Promise<Geofence> {
    try {
      const res = await apiClient.put(`/monitoring/geofences/${id}`, data);
      return res.data;
    } catch (error) {
      throw normalizeError(error);
    }
  },

  /** DELETE /monitoring/geofences/:id */
  async delete(id: string): Promise<void> {
    try {
      await apiClient.delete(`/monitoring/geofences/${id}`);
    } catch (error) {
      throw normalizeError(error);
    }
  },

  /** Toggle isActive via PUT */
  async toggleActive(id: string, isActive: boolean): Promise<Geofence> {
    try {
      const res = await apiClient.put(`/monitoring/geofences/${id}`, { isActive });
      return res.data;
    } catch (error) {
      throw normalizeError(error);
    }
  },
};

export default geofencesApi;
