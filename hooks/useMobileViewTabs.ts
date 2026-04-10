import { useQuery } from '@tanstack/react-query';
import { api } from '../services/apiLazy';

export interface MobileViewTabsConfig {
  techView?: string[];
  adminView?: string[];
  reportView?: string[];
  monitoringView?: string[];
  supportView?: string[];
}

/**
 * Reads mobileViewTabs from the tenant settings JSONB.
 * Returns a helper to filter any tab list to only the allowed ids.
 *
 * Admin/SuperAdmin can set this via OrganizationPanel > Interface Mobile.
 * If unconfigured (null), all tabs are shown.
 */
export const useMobileViewTabs = () => {
  const { data: config } = useQuery<MobileViewTabsConfig | null>({
    queryKey: ['mobile-view-tabs'],
    queryFn: async () => {
      const tenant = await api.tenants.getCurrent();
      return (tenant?.settings?.mobileViewTabs as MobileViewTabsConfig) || null;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  /**
   * Filters a tab array to only those allowed by the tenant config.
   * If the view has no config entry, returns all tabs unchanged.
   */
  function filterTabsForView<T extends { id: string }>(viewKey: keyof MobileViewTabsConfig, tabs: T[]): T[] {
    const allowed = config?.[viewKey];
    if (!allowed || allowed.length === 0) return tabs;
    return tabs.filter((t) => allowed.includes(t.id));
  }

  return { filterTabsForView, config };
};
