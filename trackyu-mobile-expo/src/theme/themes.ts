/**
 * TrackYu Mobile — Thèmes
 *
 * 3 presets disponibles :
 *   dark   → TrackYu Dark (défaut brand)
 *   ocean  → Ocean Dark (logistique, maritime)
 *   light  → Light Pro (bureau, management)
 *
 * White label : chaque revendeur peut surcharger `primary`
 * via resolveTheme(preset, primaryOverride)
 */

import { vehicleStatus, functional } from './tokens';

// ─── Type Theme ───────────────────────────────────────────────────────────────
export interface Theme {
  id: 'dark' | 'ocean' | 'light';
  isDark: boolean;

  // Backgrounds
  bg: {
    primary: string; // Fond principal app
    surface: string; // Cards, bottom sheets
    elevated: string; // Modals, popovers
    overlay: string; // Backdrop semi-transparent
  };

  // Couleur primaire / brand
  primary: string;
  primaryLight: string; // Hover, highlight
  primaryDim: string; // Badge background (rgba)

  // Texte
  text: {
    primary: string;
    secondary: string;
    muted: string;
    inverse: string;
    onPrimary: string; // Texte sur fond primary (bouton)
  };

  // Bordures
  border: string;
  borderStrong: string;

  // Navigation bar
  nav: {
    bg: string;
    active: string;
    inactive: string;
    border: string;
  };

  // Tokens invariants injectés pour commodité
  status: typeof vehicleStatus;
  functional: typeof functional;
}

// ─── Thème 1 : TrackYu Dark ───────────────────────────────────────────────────
const dark: Theme = {
  id: 'dark',
  isDark: true,

  bg: {
    primary: '#0D0D0F',
    surface: '#1A1A1E',
    elevated: '#252529',
    overlay: 'rgba(0, 0, 0, 0.65)',
  },

  primary: '#E8771A',
  primaryLight: '#F5943A',
  primaryDim: 'rgba(232, 119, 26, 0.15)',

  text: {
    primary: '#F9FAFB',
    secondary: '#9CA3AF',
    muted: '#4B5563',
    inverse: '#0D0D0F',
    onPrimary: '#FFFFFF',
  },

  border: '#2A2A2E',
  borderStrong: '#3A3A3E',

  nav: {
    bg: '#131316',
    active: '#E8771A',
    inactive: '#6B7280',
    border: '#2A2A2E',
  },

  status: vehicleStatus,
  functional,
};

// ─── Thème 2 : Ocean Dark ─────────────────────────────────────────────────────
const ocean: Theme = {
  id: 'ocean',
  isDark: true,

  bg: {
    primary: '#080E1A',
    surface: '#0F1B2D',
    elevated: '#162338',
    overlay: 'rgba(0, 8, 26, 0.70)',
  },

  primary: '#3B82F6',
  primaryLight: '#60A5FA',
  primaryDim: 'rgba(59, 130, 246, 0.15)',

  text: {
    primary: '#F0F6FF',
    secondary: '#8BAAC4',
    muted: '#3D5A73',
    inverse: '#080E1A',
    onPrimary: '#FFFFFF',
  },

  border: '#1E2E42',
  borderStrong: '#2A3F58',

  nav: {
    bg: '#060C16',
    active: '#3B82F6',
    inactive: '#4A6580',
    border: '#1E2E42',
  },

  status: vehicleStatus,
  functional,
};

// ─── Thème 3 : Light Pro ──────────────────────────────────────────────────────
const light: Theme = {
  id: 'light',
  isDark: false,

  bg: {
    primary: '#F8FAFC',
    surface: '#FFFFFF',
    elevated: '#F1F5F9',
    overlay: 'rgba(15, 23, 42, 0.45)',
  },

  primary: '#E8771A',
  primaryLight: '#F5943A',
  primaryDim: 'rgba(232, 119, 26, 0.10)',

  text: {
    primary: '#0F172A',
    secondary: '#64748B',
    muted: '#94A3B8',
    inverse: '#FFFFFF',
    onPrimary: '#FFFFFF',
  },

  border: '#E2E8F0',
  borderStrong: '#CBD5E1',

  nav: {
    bg: '#FFFFFF',
    active: '#E8771A',
    inactive: '#94A3B8',
    border: '#E2E8F0',
  },

  status: vehicleStatus,
  functional,
};

// ─── Presets registry ─────────────────────────────────────────────────────────
export const THEMES = { dark, ocean, light } as const;
export type ThemePreset = keyof typeof THEMES;

// ─── resolveTheme : applique un override primary pour le white label ──────────
export function resolveTheme(preset: ThemePreset, primaryOverride?: string): Theme {
  const base = { ...THEMES[preset] };

  if (primaryOverride && /^#[0-9A-Fa-f]{6}$/.test(primaryOverride)) {
    base.primary = primaryOverride;
    base.primaryLight = lighten(primaryOverride, 0.15);
    base.primaryDim = hexToRgba(primaryOverride, 0.15);
    base.nav = { ...base.nav, active: primaryOverride };
  }

  return base;
}

// ─── Helpers couleur ──────────────────────────────────────────────────────────
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function lighten(hex: string, amount: number): string {
  const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + Math.round(255 * amount));
  const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + Math.round(255 * amount));
  const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + Math.round(255 * amount));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}
