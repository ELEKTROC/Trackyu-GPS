/**
 * TrackYu Mobile — Utilitaires dates
 * Fonctions sécurisées pour formater et valider les dates ISO
 */

/**
 * Vérifie si une valeur est une date ISO valide.
 */
function isValidDate(d: Date): boolean {
  return !isNaN(d.getTime());
}

/**
 * Formate une chaîne ISO en date locale fr-FR.
 * Retourne `fallback` si la valeur est manquante ou invalide.
 *
 * @example
 * safeFmtDate('2025-03-17T10:00:00Z')  // → "17 mars 2025"
 * safeFmtDate(null)                     // → "—"
 * safeFmtDate('invalid')               // → "—"
 */
export function safeFmtDate(
  iso: string | null | undefined,
  options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' },
  fallback = '—'
): string {
  if (!iso) return fallback;
  const d = new Date(iso);
  if (!isValidDate(d)) return fallback;
  try {
    return d.toLocaleDateString('fr-FR', options);
  } catch {
    return fallback;
  }
}

/**
 * Formate une chaîne ISO en date + heure locale fr-FR.
 * Retourne `fallback` si invalide.
 *
 * @example
 * safeFmtDateTime('2025-03-17T10:30:00Z')  // → "17 mars 2025, 10:30"
 */
export function safeFmtDateTime(iso: string | null | undefined, fallback = '—'): string {
  if (!iso) return fallback;
  const d = new Date(iso);
  if (!isValidDate(d)) return fallback;
  try {
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return fallback;
  }
}

/**
 * Retourne le nombre de jours entre aujourd'hui et une date ISO.
 * Valeur négative = passé, positive = futur.
 * Retourne `null` si date invalide.
 */
export function daysFromNow(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (!isValidDate(d)) return null;
  const diff = d.getTime() - Date.now();
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

/**
 * Formate une durée en millisecondes en "Xh Ym" ou "Zm".
 */
export function fmtDuration(ms: number): string {
  const totalMin = Math.round(ms / 60_000);
  if (totalMin < 60) return `${totalMin} min`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
