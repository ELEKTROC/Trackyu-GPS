import { useState, useMemo, useCallback } from 'react';

export type SortDirection = 'asc' | 'desc' | null;

export interface SortConfig {
  key: string;
  direction: SortDirection;
}

/**
 * Hook réutilisable pour le tri de tableaux.
 * @param items - Les données à trier
 * @param defaultSort - Tri par défaut (optionnel)
 * @param customAccessors - Fonctions d'accès personnalisées pour les clés imbriquées
 */
export function useTableSort<T>(
  items: T[],
  defaultSort?: SortConfig,
  customAccessors?: Record<string, (item: T) => any>
) {
  const [sortConfig, setSortConfig] = useState<SortConfig>(
    defaultSort || { key: '', direction: null }
  );

  const handleSort = useCallback((key: string) => {
    setSortConfig(prev => {
      if (prev.key === key) {
        // Cycle: asc → desc → null
        if (prev.direction === 'asc') return { key, direction: 'desc' };
        if (prev.direction === 'desc') return { key: '', direction: null };
      }
      return { key, direction: 'asc' };
    });
  }, []);

  const sortedItems = useMemo(() => {
    if (!sortConfig.key || !sortConfig.direction) return items;

    return [...items].sort((a, b) => {
      let valA: any;
      let valB: any;

      if (customAccessors?.[sortConfig.key]) {
        valA = customAccessors[sortConfig.key](a);
        valB = customAccessors[sortConfig.key](b);
      } else {
        valA = getNestedValue(a, sortConfig.key);
        valB = getNestedValue(b, sortConfig.key);
      }

      // Handle null/undefined
      if (valA == null && valB == null) return 0;
      if (valA == null) return 1;
      if (valB == null) return -1;

      // Numeric comparison
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
      }

      // Date comparison
      if (valA instanceof Date && valB instanceof Date) {
        return sortConfig.direction === 'asc'
          ? valA.getTime() - valB.getTime()
          : valB.getTime() - valA.getTime();
      }

      // Try parsing as date strings
      if (typeof valA === 'string' && typeof valB === 'string') {
        const dateA = Date.parse(valA);
        const dateB = Date.parse(valB);
        if (!isNaN(dateA) && !isNaN(dateB) && valA.includes('-')) {
          return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
        }
      }

      // String comparison
      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      if (strA < strB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (strA > strB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [items, sortConfig, customAccessors]);

  return { sortedItems, sortConfig, handleSort };
}

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((acc, key) => acc?.[key], obj);
}
