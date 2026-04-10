import { useQuery } from '@tanstack/react-query';
import { api } from '../services/apiLazy';
import type { TenantBranding } from '../services/pdfServiceV2';

/**
 * Convertit une URL d'image en chaîne Base64 (data URL).
 * Retourne null si le chargement échoue.
 */
export const loadImageAsBase64 = async (url: string): Promise<string | null> => {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

/**
 * Construit un objet TenantBranding à partir des données tenant.
 * Source de vérité : table `tenants` (via api.tenants.getCurrent()).
 * Compatible avec pdfServiceV2 et pdfService (V1).
 */
const buildBranding = (tenant: any, logoBase64: string | null): TenantBranding => ({
  name: tenant?.name || tenant?.company_name || 'Trackyu GPS',
  address: tenant?.address || tenant?.company_address || '',
  city: tenant?.city
    ? `${tenant.city}${tenant.country ? ', ' + tenant.country : ''}`
    : '',
  phone: tenant?.phone || tenant?.contact_phone || '',
  email: tenant?.email || tenant?.contact_email || '',
  website: tenant?.website || '',
  logo: logoBase64 || undefined,
  primaryColor: parseCssColor(tenant?.primary_color) || [37, 99, 235],
  siret: tenant?.registration_number || tenant?.company_tax_id || '',
  footer: '',
  bankDetails: tenant?.bank_details || '',
});

/**
 * Parse une couleur CSS hex (#2563eb) en tuple RGB.
 */
const parseCssColor = (hex?: string): [number, number, number] | null => {
  if (!hex || !hex.startsWith('#') || hex.length < 7) return null;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
  return [r, g, b];
};

/**
 * Hook React pour récupérer le branding du tenant courant.
 * Source de vérité : table `tenants` via GET /tenants/current.
 * Le résultat est mis en cache via TanStack Query (staleTime: 5 min).
 *
 * @returns { branding, isLoading }
 */
export const useTenantBranding = () => {
  const { data: branding, isLoading } = useQuery<TenantBranding>({
    queryKey: ['tenant-branding'],
    queryFn: async () => {
      const tenant = await api.tenants.getCurrent();

      // Charger le logo en Base64 si une URL est disponible
      let logoBase64: string | null = null;
      const logoUrl = tenant?.logo_url || tenant?.logo;
      if (logoUrl && logoUrl !== '/icons/icon-192x192.png') {
        logoBase64 = await loadImageAsBase64(logoUrl);
      }

      return buildBranding(tenant, logoBase64);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000,   // 30 minutes
    refetchOnWindowFocus: false,
  });

  return {
    branding: branding || undefined,
    isLoading,
  };
};

/**
 * Fonction utilitaire non-hook pour récupérer le branding programmatiquement.
 * Utile quand on n'a pas accès au contexte React (ex: fonctions utilitaires).
 */
export const fetchTenantBranding = async (): Promise<TenantBranding> => {
  try {
    const tenant = await api.tenants.getCurrent();
    let logoBase64: string | null = null;
    const logoUrl = tenant?.logo_url || tenant?.logo;
    if (logoUrl && logoUrl !== '/icons/icon-192x192.png') {
      logoBase64 = await loadImageAsBase64(logoUrl);
    }
    return buildBranding(tenant, logoBase64);
  } catch {
    // Fallback silencieux avec branding par défaut
    return buildBranding(null, null);
  }
};
