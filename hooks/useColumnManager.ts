import { useState, useEffect, useCallback } from 'react';
import { ColumnDef } from '../components/ColumnManager';

interface UseColumnManagerOptions {
  /** All available columns */
  columns: ColumnDef[];
  /** LocalStorage key for persistence (optional) */
  persistKey?: string;
  /** Default visible columns (if not specified, all non-locked columns are visible) */
  defaultVisible?: string[];
}

interface UseColumnManagerReturn {
  /** Currently visible column IDs */
  visibleColumns: string[];
  /** Set visible columns */
  setVisibleColumns: (columns: string[]) => void;
  /** Toggle a single column */
  toggleColumn: (columnId: string) => void;
  /** Reset to default columns */
  resetColumns: () => void;
  /** Check if a column is visible */
  isColumnVisible: (columnId: string) => boolean;
  /** Get visible columns definitions */
  activeColumns: ColumnDef[];
}

/**
 * Hook for managing table column visibility with optional persistence.
 * 
 * Usage:
 * ```tsx
 * const { visibleColumns, setVisibleColumns, activeColumns } = useColumnManager({
 *   columns: ALL_COLUMNS,
 *   persistKey: 'fleet_table_columns',
 *   defaultVisible: ['id', 'name', 'status']
 * });
 * ```
 */
export function useColumnManager({
  columns,
  persistKey,
  defaultVisible,
}: UseColumnManagerOptions): UseColumnManagerReturn {
  
  // Calculate default visible columns
  const getDefaultVisible = useCallback(() => {
    if (defaultVisible) return defaultVisible;
    return columns.filter(col => col.defaultVisible !== false).map(col => col.id);
  }, [columns, defaultVisible]);

  // Initialize state from localStorage or defaults
  const [visibleColumns, setVisibleColumnsInternal] = useState<string[]>(() => {
    if (persistKey) {
      try {
        const saved = localStorage.getItem(persistKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Validate that saved columns still exist
            const validColumns = parsed.filter(id => columns.some(col => col.id === id));
            if (validColumns.length > 0) return validColumns;
          }
        }
      } catch (e) {
        // Ignore localStorage errors
      }
    }
    return getDefaultVisible();
  });

  // Persist to localStorage when changed
  useEffect(() => {
    if (persistKey) {
      try {
        localStorage.setItem(persistKey, JSON.stringify(visibleColumns));
      } catch (e) {
        // Ignore localStorage errors
      }
    }
  }, [persistKey, visibleColumns]);

  // Wrapper to set columns
  const setVisibleColumns = useCallback((newColumns: string[]) => {
    // Ensure locked columns are always visible
    const lockedIds = columns.filter(c => c.locked).map(c => c.id);
    const withLocked = [...new Set([...lockedIds, ...newColumns])];
    setVisibleColumnsInternal(withLocked);
  }, [columns]);

  // Toggle single column
  const toggleColumn = useCallback((columnId: string) => {
    const col = columns.find(c => c.id === columnId);
    if (col?.locked) return;
    
    setVisibleColumnsInternal(prev => {
      if (prev.includes(columnId)) {
        return prev.filter(id => id !== columnId);
      }
      return [...prev, columnId];
    });
  }, [columns]);

  // Reset to defaults
  const resetColumns = useCallback(() => {
    setVisibleColumnsInternal(getDefaultVisible());
  }, [getDefaultVisible]);

  // Check visibility
  const isColumnVisible = useCallback((columnId: string) => {
    return visibleColumns.includes(columnId);
  }, [visibleColumns]);

  // Get active column definitions
  const activeColumns = columns.filter(col => visibleColumns.includes(col.id));

  return {
    visibleColumns,
    setVisibleColumns,
    toggleColumn,
    resetColumns,
    isColumnVisible,
    activeColumns,
  };
}

export default useColumnManager;
