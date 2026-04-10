import { useState, useCallback } from 'react';

// Dashboard section IDs
export type DashboardSectionId =
  | 'banner-kpi'
  | 'fleet-realtime'
  | 'business-finance'
  | 'charts'
  | 'bottom-row';

export interface DashboardSectionConfig {
  id: DashboardSectionId;
  label: string;
  collapsed: boolean;
  hidden: boolean;
}

const STORAGE_KEY = 'dashboard-layout-v2';

const DEFAULT_SECTIONS: DashboardSectionConfig[] = [
  { id: 'banner-kpi', label: 'KPI Principaux', collapsed: false, hidden: false },
  { id: 'fleet-realtime', label: 'Flotte en temps réel', collapsed: false, hidden: false },
  { id: 'business-finance', label: 'Business & Finance', collapsed: false, hidden: false },
  { id: 'charts', label: 'Graphiques', collapsed: false, hidden: false },
  { id: 'bottom-row', label: 'Stock, Maintenance & Alertes', collapsed: false, hidden: false },
];

function loadLayout(): DashboardSectionConfig[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_SECTIONS;
    const parsed = JSON.parse(stored) as DashboardSectionConfig[];
    const ids = new Set(parsed.map(s => s.id));
    const allPresent = DEFAULT_SECTIONS.every(s => ids.has(s.id));
    if (!allPresent || parsed.length !== DEFAULT_SECTIONS.length) return DEFAULT_SECTIONS;
    // Ensure hidden field exists (migration from v1)
    return parsed.map(s => ({ ...s, hidden: s.hidden ?? false }));
  } catch {
    return DEFAULT_SECTIONS;
  }
}

function saveLayout(sections: DashboardSectionConfig[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sections));
  } catch {}
}

export function useDashboardLayout() {
  const [sections, setSections] = useState<DashboardSectionConfig[]>(loadLayout);

  const reorderSections = useCallback((orderedIds: DashboardSectionId[]) => {
    setSections(prev => {
      const map = new Map(prev.map(s => [s.id, s]));
      const updated = orderedIds.map(id => map.get(id)!).filter(Boolean);
      saveLayout(updated);
      return updated;
    });
  }, []);

  const toggleCollapse = useCallback((id: DashboardSectionId) => {
    setSections(prev => {
      const updated = prev.map(s => s.id === id ? { ...s, collapsed: !s.collapsed } : s);
      saveLayout(updated);
      return updated;
    });
  }, []);

  const toggleHidden = useCallback((id: DashboardSectionId) => {
    setSections(prev => {
      const updated = prev.map(s => s.id === id ? { ...s, hidden: !s.hidden } : s);
      saveLayout(updated);
      return updated;
    });
  }, []);

  const resetLayout = useCallback(() => {
    setSections(DEFAULT_SECTIONS);
    saveLayout(DEFAULT_SECTIONS);
  }, []);

  const sectionOrder = sections.map(s => s.id);
  const visibleSections = sections.filter(s => !s.hidden);
  const collapsedMap = Object.fromEntries(sections.map(s => [s.id, s.collapsed])) as Record<DashboardSectionId, boolean>;
  const hiddenMap = Object.fromEntries(sections.map(s => [s.id, s.hidden])) as Record<DashboardSectionId, boolean>;
  const hiddenCount = sections.filter(s => s.hidden).length;

  return {
    sections,
    visibleSections,
    sectionOrder,
    collapsedMap,
    hiddenMap,
    hiddenCount,
    reorderSections,
    toggleCollapse,
    toggleHidden,
    resetLayout,
  };
}
