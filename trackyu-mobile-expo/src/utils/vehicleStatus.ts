/**
 * TrackYu Mobile — Statuts véhicules
 * Source canonique : couleurs et libellés statuts.
 * Validés par le design system (feedback 2026-04-03).
 */

export const VEHICLE_STATUS_COLORS: Record<string, string> = {
  moving: '#22C55E', // Vert   — en mouvement
  idle: '#F97316', // Orange — moteur on, vitesse 0
  stopped: '#EF4444', // Rouge  — moteur off / arrêté
  offline: '#6B7280', // Gris   — hors ligne
} as const;

export const VEHICLE_STATUS_LABELS: Record<string, string> = {
  moving: 'En route',
  idle: 'Ralenti',
  stopped: 'Arrêté',
  offline: 'Hors ligne',
} as const;

/** Retourne la couleur hex d'un statut (défaut gris offline). */
export function vehicleStatusColor(status: string): string {
  return VEHICLE_STATUS_COLORS[status] ?? VEHICLE_STATUS_COLORS.offline;
}

/** Retourne le libellé français d'un statut. */
export function vehicleStatusLabel(status: string): string {
  return VEHICLE_STATUS_LABELS[status] ?? status;
}
