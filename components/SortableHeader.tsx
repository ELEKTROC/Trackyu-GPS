import React from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import type { SortDirection } from '../hooks/useTableSort';

interface SortableHeaderProps {
  label: string;
  sortKey: string;
  currentSortKey: string;
  currentDirection: SortDirection;
  onSort: (key: string) => void;
  className?: string;
}

/**
 * En-tête de colonne cliquable avec indicateur de tri.
 * Tri cyclique : neutre → croissant → décroissant → neutre
 */
export const SortableHeader: React.FC<SortableHeaderProps> = ({
  label,
  sortKey,
  currentSortKey,
  currentDirection,
  onSort,
  className = '',
}) => {
  const isActive = currentSortKey === sortKey && currentDirection !== null;

  return (
    <th
      className={`px-6 py-3 text-xs font-bold uppercase text-[var(--text-muted)] border-b border-[var(--border)] cursor-pointer select-none group hover:bg-[var(--bg-elevated)] transition-colors ${className}`}
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center gap-1">
        <span>{label}</span>
        <span className={`transition-opacity ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`}>
          {isActive && currentDirection === 'asc' ? (
            <ArrowUp className="w-3.5 h-3.5" />
          ) : isActive && currentDirection === 'desc' ? (
            <ArrowDown className="w-3.5 h-3.5" />
          ) : (
            <ArrowUpDown className="w-3.5 h-3.5" />
          )}
        </span>
      </div>
    </th>
  );
};
