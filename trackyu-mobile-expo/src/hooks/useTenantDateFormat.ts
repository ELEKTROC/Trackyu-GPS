/**
 * useTenantDateFormat
 *
 * Résolution du format de date en deux passes :
 *   1. Option A : GET /settings/tenant → date_format (config tenant backend)
 *   2. Option B : pref_language AsyncStorage → format dérivé (fallback)
 *
 * Formats supportés : 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD'
 */
import { useQuery } from '@tanstack/react-query';
import apiClient from '../api/client';
import storage from '../utils/storage';

export type DateFormat = 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';

/** Langue stockée → format de date par défaut */
const LANG_TO_FORMAT: Record<string, DateFormat> = {
  fr: 'DD/MM/YYYY',
  es: 'DD/MM/YYYY',
  en: 'MM/DD/YYYY',
};

/** Interface retournée par GET /settings/tenant */
interface TenantSettings {
  date_format?: DateFormat | string;
}

async function resolveDateFormat(): Promise<DateFormat> {
  // ── Option A : tenant backend ──────────────────────────────────────────────
  try {
    const res = await apiClient.get<TenantSettings>('/settings/tenant');
    const fmt = res.data?.date_format;
    if (fmt === 'DD/MM/YYYY' || fmt === 'MM/DD/YYYY' || fmt === 'YYYY-MM-DD') {
      return fmt;
    }
  } catch {
    // backend indisponible ou route inexistante → fallback
  }

  // ── Option B : langue locale ───────────────────────────────────────────────
  const lang = await storage.getString('pref_language');
  return LANG_TO_FORMAT[lang ?? 'fr'] ?? 'DD/MM/YYYY';
}

/**
 * Retourne le format de date résolu pour ce tenant.
 * staleTime 10 min — pas besoin de refetch fréquent.
 */
export function useTenantDateFormat(): DateFormat {
  const { data } = useQuery<DateFormat>({
    queryKey: ['tenant-date-format'],
    queryFn: resolveDateFormat,
    staleTime: 10 * 60_000,
    retry: false, // ne pas retenter si le backend est absent
  });
  return data ?? 'DD/MM/YYYY';
}

// ── Helpers de conversion ──────────────────────────────────────────────────────

/**
 * Convertit une date YYYY-MM-DD (interne) vers le format d'affichage.
 * Ex. '2026-04-06' → '06/04/2026' pour DD/MM/YYYY
 */
export function isoToDisplay(iso: string, fmt: DateFormat): string {
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  if (fmt === 'MM/DD/YYYY') return `${m}/${d}/${y}`;
  if (fmt === 'YYYY-MM-DD') return iso;
  return `${d}/${m}/${y}`; // DD/MM/YYYY
}

/**
 * Convertit une saisie utilisateur (display format) → YYYY-MM-DD pour l'API.
 * Retourne null si la saisie ne correspond pas au format attendu.
 */
export function displayToIso(input: string, fmt: DateFormat): string | null {
  const sep = fmt === 'YYYY-MM-DD' ? '-' : '/';
  const parts = input.split(sep);
  if (parts.length !== 3) return null;
  let y: string, m: string, d: string;
  if (fmt === 'DD/MM/YYYY') {
    [d, m, y] = parts;
  } else if (fmt === 'MM/DD/YYYY') {
    [m, d, y] = parts;
  } else {
    [y, m, d] = parts;
  } // YYYY-MM-DD
  if (!y || !m || !d) return null;
  const iso = `${y}-${m}-${d}`;
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : null;
}

/** Placeholder affiché selon le format */
export function datePlaceholder(fmt: DateFormat): string {
  if (fmt === 'MM/DD/YYYY') return 'MM/JJ/AAAA';
  if (fmt === 'YYYY-MM-DD') return 'AAAA-MM-JJ';
  return 'JJ/MM/AAAA';
}
