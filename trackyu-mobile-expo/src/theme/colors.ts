/**
 * TrackYu Mobile — Brand Colors
 * Utilise useTheme() dans les composants pour les couleurs dynamiques.
 * Ces constantes sont pour les cas statiques (StyleSheet en dehors de composants).
 */

export const brand = {
  orange: '#E8771A',
  orangeLight: '#F5943A',
  black: '#1C1C1C',
} as const;

// Statuts véhicules (invariants)
export const status = {
  moving: '#22C55E',
  idle: '#F97316',
  stopped: '#EF4444',
  alert: '#DC2626',
  offline: '#6B7280',
} as const;

// Couleurs fonctionnelles
export const functional = {
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
} as const;

export default { brand, status, functional };
