/**
 * Helpers d'affichage + cache pour les adresses géocodées issues du backend
 * /fleet/geocode. Miroir de trackyu-mobile-expo/src/utils/geocoding.ts.
 *
 * Cache localStorage 24 h keyé par (lat.toFixed(4), lng.toFixed(4)) ≈ 10 m.
 * Permet d'éviter de retaper le backend pour les mêmes coords entre reloads.
 */

const CACHE_PREFIX = 'trackyu:geocode:';
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

type CacheEntry = { address: string | null; ts: number };

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

export function formatCoords(lat: number, lng: number): string {
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

export function hasValidCoords(lat: number | undefined | null, lng: number | undefined | null): lat is number {
  if (typeof lat !== 'number' || typeof lng !== 'number') return false;
  if (!isFinite(lat) || !isFinite(lng)) return false;
  if (lat === 0 && lng === 0) return false;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return false;
  return true;
}

function cacheKey(lat: number, lng: number): string {
  return `${CACHE_PREFIX}${lat.toFixed(4)},${lng.toFixed(4)}`;
}

function readCache(lat: number, lng: number): string | null | undefined {
  try {
    const raw = localStorage.getItem(cacheKey(lat, lng));
    if (!raw) return undefined;
    const entry = JSON.parse(raw) as CacheEntry;
    if (Date.now() - entry.ts > CACHE_MAX_AGE_MS) {
      localStorage.removeItem(cacheKey(lat, lng));
      return undefined;
    }
    return entry.address;
  } catch {
    return undefined;
  }
}

function writeCache(lat: number, lng: number, address: string | null): void {
  try {
    const entry: CacheEntry = { address, ts: Date.now() };
    localStorage.setItem(cacheKey(lat, lng), JSON.stringify(entry));
  } catch {
    // quota exceeded, SSR, etc. — on ignore silencieusement
  }
}

/**
 * Reverse geocode via backend /fleet/geocode, avec cache localStorage.
 * Retourne `null` en cas d'erreur ou d'adresse absente.
 *
 * @param headers — headers optionnels (ex : `{ 'X-Tenant-Id': ... }`). Le cookie
 *                  de session est envoyé automatiquement via `credentials: 'include'`.
 */
export async function geocodeCoordCached(lat: number, lng: number, headers?: HeadersInit): Promise<string | null> {
  if (!hasValidCoords(lat, lng)) return null;

  const cached = readCache(lat, lng);
  if (cached !== undefined) return cached;

  try {
    const response = await fetch(`/api/fleet/geocode?lat=${lat}&lng=${lng}`, {
      credentials: 'include',
      headers,
    });
    if (!response.ok) {
      writeCache(lat, lng, null);
      return null;
    }
    const data = (await response.json()) as { address?: string | null };
    const address = data?.address ?? null;
    writeCache(lat, lng, address);
    return address;
  } catch {
    return null;
  }
}
