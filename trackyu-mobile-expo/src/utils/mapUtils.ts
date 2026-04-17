/**
 * TrackYu Mobile — Map Utilities
 * Fonctions pures extraites de MapScreen pour être testables indépendamment.
 */
import type { MapMarker } from '../api/vehicles';

export type StatusFilter = 'all' | 'moving' | 'stopped' | 'idle' | 'offline';

/** @deprecated Utiliser getTypeKey() pour les icônes PNG */
export function getTypeChar(type: string): string {
  return getTypeKey(type).toUpperCase();
}

/**
 * Retourne la clé de type véhicule utilisée pour sélectionner l'icône PNG.
 * Doit correspondre aux clés de MARKER_IMAGES dans src/assets/markers/index.ts.
 */
export function getTypeKey(type: string): 'car' | 'truck' | 'bus' | 'moto' | 'van' | 'agr' | 'eng' {
  const t = (type ?? '').toLowerCase();
  if (t.includes('truck') || t.includes('camion')) return 'truck';
  if (t.includes('bus') || t.includes('autobus') || t.includes('autocar')) return 'bus';
  if (t.includes('moto') || t.includes('bike') || t.includes('motorcycle')) return 'moto';
  if (t.includes('van') || t.includes('utilitaire') || t.includes('fourgon')) return 'van';
  if (t.includes('tractor') || t.includes('tracteur')) return 'agr';
  if (t.includes('engin') || t.includes('machine')) return 'eng';
  return 'car';
}

/**
 * Retourne true si la position GPS est réelle (non nulle, non Golfe de Guinée).
 * Seuil ±0.5° : couvre tous les véhicules hors point origine (0,0).
 */
export function hasRealPosition(lat: number, lng: number): boolean {
  return isFinite(lat) && isFinite(lng) && (Math.abs(lat) > 0.5 || Math.abs(lng) > 0.5);
}

/**
 * Filtre les marqueurs par statut, client et branche.
 * Logique AND : tous les filtres actifs doivent correspondre.
 */
export function buildFilteredMarkers(
  markers: MapMarker[],
  statusFilter: StatusFilter,
  clientFilter: string | null,
  branchFilter: string | null
): MapMarker[] {
  return markers.filter((m) => {
    if (statusFilter !== 'all' && m.status !== statusFilter) return false;
    if (clientFilter && m.clientName !== clientFilter) return false;
    if (branchFilter && m.groupName !== branchFilter) return false;
    return true;
  });
}

/**
 * Calcule les compteurs de statut depuis la liste complète des véhicules.
 * Source unique pour éviter la divergence entre stat-pills et total.
 */
export function computeStatusCounts(vehicles: Pick<MapMarker, 'status'>[]) {
  return {
    moving: vehicles.filter((v) => v.status === 'moving').length,
    stopped: vehicles.filter((v) => v.status === 'stopped').length,
    idle: vehicles.filter((v) => v.status === 'idle').length,
    offline: vehicles.filter((v) => v.status === 'offline').length,
    total: vehicles.length,
  };
}
