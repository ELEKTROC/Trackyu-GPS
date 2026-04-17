/**
 * TrackYu Mobile — Design Tokens
 * Invariants partagés entre tous les thèmes
 */

// ─── Spacing ─────────────────────────────────────────────────────────────────
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
} as const;

// ─── Border Radius ────────────────────────────────────────────────────────────
export const radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 28,
  full: 9999,
} as const;

// ─── Typography ───────────────────────────────────────────────────────────────
export const typography = {
  fonts: {
    regular: undefined, // Police système par défaut
    medium: undefined,
    semiBold: undefined,
    bold: undefined,
    mono: 'monospace', // Courier/Monospace système (plaques, coordonnées GPS)
  },
  sizes: {
    display: 32, // KPI chiffres
    title: 20, // Titres écrans
    body: 15, // Contenu principal
    label: 13, // Étiquettes, badges
    caption: 11, // Métadonnées, timestamps
    mono: 13, // Plaques, coordonnées GPS
  },
  lineHeights: {
    display: 38,
    title: 26,
    body: 22,
    label: 18,
    caption: 16,
  },
} as const;

// ─── Statuts véhicules (invariants — jamais modifiés par le thème) ────────────
export const vehicleStatus = {
  moving: '#22C55E', // Vert      — en mouvement
  idle: '#F97316', // Orange    — moteur on, vitesse 0
  stopped: '#EF4444', // Rouge     — moteur off / arrêté
  alert: '#DC2626', // Rouge foncé — alarme active
  offline: '#6B7280', // Gris      — hors ligne
} as const;

// ─── Couleurs fonctionnelles (invariants) ─────────────────────────────────────
export const functional = {
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
} as const;

// ─── Shadows ──────────────────────────────────────────────────────────────────
export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.24,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;

// ─── Animation durations ──────────────────────────────────────────────────────
export const durations = {
  fast: 150,
  normal: 250,
  slow: 400,
} as const;
