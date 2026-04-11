import React from 'react';
import { Box, History } from 'lucide-react';
import { Card } from '../../../../components/Card';
import type { DeviceStock, StockMovement } from '../../../../types';
import { useTableSort } from '../../../../hooks/useTableSort';
import { SortableHeader } from '../../../../components/SortableHeader';

interface StockMovementsProps {
  stock: DeviceStock[];
  stockMovements: StockMovement[];
}

export const StockMovements: React.FC<StockMovementsProps> = ({ stock, stockMovements }) => {
  const typeColors: Record<string, string> = {
    ENTRY: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    INSTALLATION:
      'bg-[var(--primary-dim)] text-[var(--primary)] dark:bg-[var(--primary-dim)] dark:text-[var(--primary)]',
    REMOVAL: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    RMA_OUT: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    RMA_RETURN: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    TRANSFER: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    STATUS_CHANGE: 'bg-slate-100 text-[var(--text-primary)] bg-[var(--bg-surface)]/30 dark:text-[var(--text-muted)]',
  };

  const typeLabels: Record<string, string> = {
    ENTRY: 'Entrée',
    INSTALLATION: 'Installation',
    REMOVAL: 'Désinstallation',
    RMA_OUT: 'RMA Envoi',
    RMA_RETURN: 'RMA Retour',
    TRANSFER: 'Transfert',
    STATUS_CHANGE: 'Statut',
  };

  const MOVEMENT_SORT_ACCESSORS: Record<string, (mv: StockMovement) => any> = {
    equipment: (mv) => {
      const device = stock.find((s) => s.id === mv.deviceId);
      return device?.imei || device?.iccid || mv.deviceId;
    },
  };

  const {
    sortedItems: sortedMovements,
    sortConfig,
    handleSort,
  } = useTableSort(stockMovements || [], { key: 'date', direction: 'desc' }, MOVEMENT_SORT_ACCESSORS);

  return (
    <Card
      className="flex-1 flex flex-col overflow-hidden border-[var(--border)] shadow-sm"
      title={
        <div className="flex items-center justify-between w-full">
          <span className="text-lg font-bold text-[var(--text-primary)]">Historique des Mouvements</span>
          <span className="text-sm text-[var(--text-secondary)]">{stockMovements?.length || 0} mouvements</span>
        </div>
      }
    >
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead className="bg-[var(--bg-elevated)] text-[var(--text-secondary)] sticky top-0 z-10">
            <tr>
              <SortableHeader
                label="Date"
                sortKey="date"
                currentSortKey={sortConfig?.key || null}
                currentDirection={sortConfig?.direction || null}
                onSort={handleSort}
                className="px-6 py-3 text-xs font-bold uppercase border-b border-[var(--border)]"
              />
              <SortableHeader
                label="Équipement"
                sortKey="equipment"
                currentSortKey={sortConfig?.key || null}
                currentDirection={sortConfig?.direction || null}
                onSort={handleSort}
                className="px-6 py-3 text-xs font-bold uppercase border-b border-[var(--border)]"
              />
              <SortableHeader
                label="Type"
                sortKey="type"
                currentSortKey={sortConfig?.key || null}
                currentDirection={sortConfig?.direction || null}
                onSort={handleSort}
                className="px-6 py-3 text-xs font-bold uppercase border-b border-[var(--border)]"
              />
              <SortableHeader
                label="De"
                sortKey="fromLocation"
                currentSortKey={sortConfig?.key || null}
                currentDirection={sortConfig?.direction || null}
                onSort={handleSort}
                className="px-6 py-3 text-xs font-bold uppercase border-b border-[var(--border)]"
              />
              <SortableHeader
                label="Vers"
                sortKey="toLocation"
                currentSortKey={sortConfig?.key || null}
                currentDirection={sortConfig?.direction || null}
                onSort={handleSort}
                className="px-6 py-3 text-xs font-bold uppercase border-b border-[var(--border)]"
              />
              <SortableHeader
                label="Par"
                sortKey="performedBy"
                currentSortKey={sortConfig?.key || null}
                currentDirection={sortConfig?.direction || null}
                onSort={handleSort}
                className="px-6 py-3 text-xs font-bold uppercase border-b border-[var(--border)]"
              />
              <SortableHeader
                label="Notes"
                sortKey="notes"
                currentSortKey={sortConfig?.key || null}
                currentDirection={sortConfig?.direction || null}
                onSort={handleSort}
                className="px-6 py-3 text-xs font-bold uppercase border-b border-[var(--border)]"
              />
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)] bg-[var(--bg-surface)]">
            {sortedMovements.map((mv: StockMovement) => {
              const device = stock.find((s) => s.id === mv.deviceId);
              return (
                <tr key={mv.id} className="tr-hover/50 transition-colors">
                  <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                    {new Date(mv.date).toLocaleDateString('fr-FR')}{' '}
                    {new Date(mv.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-[var(--bg-elevated)] rounded">
                        <Box className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[var(--text-primary)]">
                          {device?.imei || device?.iccid || mv.deviceId}
                        </p>
                        <p className="text-xs text-[var(--text-secondary)]">{device?.model || 'N/A'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${typeColors[mv.type] || 'bg-slate-100 text-[var(--text-secondary)]'}`}
                    >
                      {typeLabels[mv.type] || mv.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{mv.fromLocation || '-'}</td>
                  <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{mv.toLocation || '-'}</td>
                  <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{mv.performedBy || '-'}</td>
                  <td className="px-6 py-4 text-sm text-[var(--text-secondary)] max-w-xs truncate">
                    {mv.notes || '-'}
                  </td>
                </tr>
              );
            })}
            {(!stockMovements || stockMovements.length === 0) && (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-[var(--text-secondary)]">
                  <History className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-[var(--text-secondary)]" />
                  <p className="text-lg font-medium">Aucun mouvement enregistré</p>
                  <p className="text-sm">Les mouvements de stock apparaîtront ici</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
};
