/**
 * vehicleStatus.ts — Source de vérité unique pour les labels et couleurs de statut véhicule
 * Utilisé sur toute l'application web (et aligné avec le mobile trackyu-mobile-expo).
 *
 * Statuts canoniques :
 *   moving  → "En route"
 *   idle    → "Ralenti"
 *   stopped → "Arrêté"
 *   offline → "Hors ligne"
 */
import { VehicleStatus } from '../types/enums';

// ── Labels ────────────────────────────────────────────────────────────────────

export const VEHICLE_STATUS_LABELS: Record<string, string> = {
  [VehicleStatus.MOVING]: 'En route',
  [VehicleStatus.IDLE]: 'Ralenti',
  [VehicleStatus.STOPPED]: 'Arrêté',
  [VehicleStatus.OFFLINE]: 'Hors ligne',
  // lowercase variants (WebSocket / normalized)
  moving: 'En route',
  idle: 'Ralenti',
  stopped: 'Arrêté',
  offline: 'Hors ligne',
};

/** Retourne le label traduit ou la valeur brute si inconnue */
export function vehicleStatusLabel(status: string): string {
  return VEHICLE_STATUS_LABELS[status] ?? VEHICLE_STATUS_LABELS[status.toUpperCase()] ?? status;
}

// ── Couleurs ──────────────────────────────────────────────────────────────────

export const VEHICLE_STATUS_COLORS: Record<string, string> = {
  [VehicleStatus.MOVING]: '#22C55E',
  [VehicleStatus.IDLE]: '#F97316',
  [VehicleStatus.STOPPED]: '#EF4444',
  [VehicleStatus.OFFLINE]: '#6B7280',
  moving: '#22C55E',
  idle: '#F97316',
  stopped: '#EF4444',
  offline: '#6B7280',
};

/** Retourne la couleur hex ou gris si statut inconnu */
export function vehicleStatusColor(status: string): string {
  return VEHICLE_STATUS_COLORS[status] ?? VEHICLE_STATUS_COLORS[status.toUpperCase()] ?? '#6B7280';
}

// ── Classes Tailwind ──────────────────────────────────────────────────────────

export const VEHICLE_STATUS_CLASSES: Record<string, { bg: string; text: string; dot: string }> = {
  [VehicleStatus.MOVING]: { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
  [VehicleStatus.IDLE]: { bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500' },
  [VehicleStatus.STOPPED]: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
  [VehicleStatus.OFFLINE]: { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },
  moving: { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
  idle: { bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500' },
  stopped: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
  offline: { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },
};
