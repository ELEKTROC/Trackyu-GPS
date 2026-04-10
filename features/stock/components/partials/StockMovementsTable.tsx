import React from 'react';
import { History, Box } from 'lucide-react';
import { Card } from '../../../../components/Card';
import { DeviceStock, StockMovement } from '../../../../types';
import { useTableSort } from '../../../../hooks/useTableSort';
import { SortableHeader } from '../../../../components/SortableHeader';

interface StockMovementsTableProps {
    stockMovements: StockMovement[];
    stock: DeviceStock[];
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    historyFilter: string;
    setHistoryFilter: (filter: string) => void;
}

export const StockMovementsTable: React.FC<StockMovementsTableProps> = ({
    stockMovements,
    stock,
    searchTerm,
    setSearchTerm,
    historyFilter,
    setHistoryFilter
}) => {
    const typeColors: Record<string, string> = {
        'ENTRY': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
        'INSTALLATION': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
        'REMOVAL': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
        'RMA_OUT': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
        'RMA_RETURN': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
        'TRANSFER': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
        'STATUS_CHANGE': 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400',
    };

    const typeLabels: Record<string, string> = {
        'ENTRY': 'Entrée',
        'INSTALLATION': 'Installation',
        'REMOVAL': 'Désinstallation',
        'RMA_OUT': 'RMA Envoi',
        'RMA_RETURN': 'RMA Retour',
        'TRANSFER': 'Transfert',
        'STATUS_CHANGE': 'Statut',
    };

    const MOVEMENT_SORT_ACCESSORS: Record<string, (mv: StockMovement) => any> = {
        equipment: (mv) => {
            const device = stock.find(s => s.id === mv.deviceId);
            return device?.imei || device?.iccid || mv.deviceId;
        },
    };

    const { sortedItems: sortedMovements, sortConfig, handleSort } = useTableSort(
        stockMovements || [],
        { key: 'date', direction: 'desc' },
        MOVEMENT_SORT_ACCESSORS
    );

    return (
        <Card className="flex-1 flex flex-col overflow-hidden border-slate-200 dark:border-slate-700 shadow-sm" title={
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
                <div className="flex items-center gap-4">
                    <span className="text-lg font-bold text-slate-800 dark:text-white">Historique des Mouvements</span>
                    <span className="text-sm text-slate-500 hidden sm:block">{stockMovements?.length || 0} mouvements</span>
                </div>

                <div className="flex items-center gap-2">
                    <select
                        value={historyFilter}
                        onChange={(e) => setHistoryFilter(e.target.value)}
                        className="pl-3 pr-8 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 dark:text-white appearance-none cursor-pointer min-w-[130px]"
                    >
                        <option value="ALL">Tous les types</option>
                        <option value="ENTRY">Entrées</option>
                        <option value="INSTALLATION">Installations</option>
                        <option value="REMOVAL">Désinstallations</option>
                        <option value="TRANSFER">Transferts</option>
                        <option value="RMA_OUT">RMA Envoi</option>
                        <option value="RMA_RETURN">RMA Retour</option>
                        <option value="STATUS_CHANGE">Statut</option>
                    </select>
                </div>
            </div>
        }>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-300 sticky top-0 z-10">
                        <tr>
                            <SortableHeader label="Date" sortKey="date" currentSortKey={sortConfig?.key || null} currentDirection={sortConfig?.direction || null} onSort={handleSort} className="px-6 py-3 text-xs font-bold uppercase border-b border-slate-200 dark:border-slate-700" />
                            <SortableHeader label="Équipement" sortKey="equipment" currentSortKey={sortConfig?.key || null} currentDirection={sortConfig?.direction || null} onSort={handleSort} className="px-6 py-3 text-xs font-bold uppercase border-b border-slate-200 dark:border-slate-700" />
                            <SortableHeader label="Type" sortKey="type" currentSortKey={sortConfig?.key || null} currentDirection={sortConfig?.direction || null} onSort={handleSort} className="px-6 py-3 text-xs font-bold uppercase border-b border-slate-200 dark:border-slate-700" />
                            <SortableHeader label="De" sortKey="fromLocation" currentSortKey={sortConfig?.key || null} currentDirection={sortConfig?.direction || null} onSort={handleSort} className="px-6 py-3 text-xs font-bold uppercase border-b border-slate-200 dark:border-slate-700" />
                            <SortableHeader label="Vers" sortKey="toLocation" currentSortKey={sortConfig?.key || null} currentDirection={sortConfig?.direction || null} onSort={handleSort} className="px-6 py-3 text-xs font-bold uppercase border-b border-slate-200 dark:border-slate-700" />
                            <SortableHeader label="Par" sortKey="performedBy" currentSortKey={sortConfig?.key || null} currentDirection={sortConfig?.direction || null} onSort={handleSort} className="px-6 py-3 text-xs font-bold uppercase border-b border-slate-200 dark:border-slate-700" />
                            <SortableHeader label="Notes" sortKey="notes" currentSortKey={sortConfig?.key || null} currentDirection={sortConfig?.direction || null} onSort={handleSort} className="px-6 py-3 text-xs font-bold uppercase border-b border-slate-200 dark:border-slate-700" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700 bg-white dark:bg-slate-900">
                        {sortedMovements.map((mv: StockMovement) => {
                            const device = stock.find(s => s.id === mv.deviceId);
                            return (
                                <tr key={mv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                                        {new Date(mv.date).toLocaleDateString('fr-FR')} {new Date(mv.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1.5 bg-slate-100 dark:bg-slate-700 rounded">
                                                <Box className="w-3.5 h-3.5 text-slate-500" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{device?.imei || device?.iccid || mv.deviceId}</p>
                                                <p className="text-xs text-slate-500">{device?.model || 'N/A'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${typeColors[mv.type] || 'bg-slate-100 text-slate-600'}`}>
                                            {typeLabels[mv.type] || mv.type}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">{mv.fromLocation || '-'}</td>
                                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">{mv.toLocation || '-'}</td>
                                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">{mv.performedBy || '-'}</td>
                                    <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400 max-w-xs truncate">{mv.notes || '-'}</td>
                                </tr>
                            );
                        })}
                        {(!stockMovements || stockMovements.length === 0) && (
                            <tr>
                                <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                                    <History className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
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
