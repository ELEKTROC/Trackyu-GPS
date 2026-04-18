/**
 * Helpers d'affichage pour les adresses géocodées issues du backend
 * /fleet/geocode ou de Nominatim (format display_name).
 */

/**
 * Raccourcit une adresse Nominatim "Rue, Quartier, Ville, Pays" à ses 3
 * premiers segments. Retourne null si l'entrée est vide.
 */
export function formatShortAddress(displayName: string | null | undefined): string | null {
  if (!displayName) return null;
  const parts = displayName
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length === 0) return null;
  if (parts.length <= 3) return parts.join(', ');
  return parts.slice(0, 3).join(', ');
}

/** Représentation courte des coordonnées pour affichage fallback. */
export function formatCoords(lat: number, lng: number): string {
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

/** Vérifie qu'un couple (lat, lng) est utilisable pour un geocode. */
export function hasValidCoords(lat: number | undefined | null, lng: number | undefined | null): lat is number {
  if (typeof lat !== 'number' || typeof lng !== 'number') return false;
  if (!isFinite(lat) || !isFinite(lng)) return false;
  if (lat === 0 && lng === 0) return false;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return false;
  return true;
}
