// AccountingContent.tsx - Extracted from AccountingView.tsx
// SYSCOHADA synthesis and General Journal tab

import React, { useRef, useEffect, useState } from 'react';
import { FileSpreadsheet, Plus, Search, Download, BookOpen, LayoutTemplate } from 'lucide-react';
import { Card } from '../../../../components/Card';
import { Pagination } from '../../../../components/Pagination';
import { generateFEC } from '../../../../services/fecService';
import type { JournalEntry } from '../../../../types';
import { useTableSort } from '../../../../hooks/useTableSort';
import { SortableHeader } from '../../../../components/SortableHeader';

// Journal columns configuration
export const JOURNAL_COLUMNS = [
    { id: 'date', label: 'Date' },
    { id: 'ref', label: 'N° Pièce' },
    { id: 'reseller', label: 'Revendeur' },
    { id: 'account', label: 'Compte' },
    { id: 'label', label: 'Libellé' },
    { id: 'debit', label: 'Débit' },
    { id: 'credit', label: 'Crédit' }
] as const;

export type JournalColumnId = typeof JOURNAL_COLUMNS[number]['id'];

interface AccountStat {
    id: string;
    label: string;
    balance: number;
}

interface AccountingContentProps {
    // Data
    accountStats: AccountStat[];
    journalEntries: JournalEntry[];
    paginatedData: JournalEntry[];
    // Pagination
    currentPage: number;
    totalPages: number;
    setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
    // Search
    searchTerm: string;
    setSearchTerm: React.Dispatch<React.SetStateAction<string>>;
    // Column visibility
    visibleColumns: JournalColumnId[];
    toggleColumn: (columnId: JournalColumnId) => void;
    // Lock date
    lockDate: string | null;
    setLockDate: React.Dispatch<React.SetStateAction<string | null>>;
    // Class filter
    selectedClassFilter: string | null;
    setSelectedClassFilter: React.Dispatch<React.SetStateAction<string | null>>;
    // Modal
    onOpenEntryModal: () => void;
    // Formatting
    formatPrice: (value: number) => string;
    isSuperAdmin?: boolean;
    resellers?: any[]; // Using any[] to avoid importing Tier here if not needed, or import Tier
}

export const AccountingContent: React.FC<AccountingContentProps> = ({
    accountStats,
    journalEntries,
    paginatedData,
    currentPage,
    totalPages,
    setCurrentPage,
    searchTerm,
    setSearchTerm,
    visibleColumns,
    toggleColumn,
    lockDate,
    setLockDate,
    selectedClassFilter,
    setSelectedClassFilter,
    onOpenEntryModal,
    formatPrice,
    isSuperAdmin,
    resellers
}) => {
    const [isColumnMenuOpen, setIsColumnMenuOpen] = useState(false);
    const columnMenuRef = useRef<HTMLDivElement>(null);

    const { sortedItems: sortedEntries, sortConfig: entrySortConfig, handleSort: handleEntrySort } = useTableSort(
        paginatedData,
        { key: 'date', direction: 'desc' },
        {
            reseller: (e) => {
                const r = resellers?.find(r => r.tenantId === e.tenantId);
                return r?.name || '';
            }
        }
    );

    // Close column menu on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (columnMenuRef.current && !columnMenuRef.current.contains(event.target as Node)) {
                setIsColumnMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const [showLockDateInput, setShowLockDateInput] = useState(false);
    const [lockDateInput, setLockDateInput] = useState(new Date().toISOString().split('T')[0]);

    const handleSetLockDate = () => {
        if (showLockDateInput) {
            if (lockDateInput) setLockDate(lockDateInput);
            setShowLockDateInput(false);
        } else {
            setShowLockDateInput(true);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300 h-full flex flex-col">
            {/* PLAN COMPTABLE SYNTHESE - Hidden on mobile */}
            <Card title="Synthèse par Classe (SYSCOHADA)" className="hidden sm:block">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {accountStats.map((cl, i) => (
                        <div 
                            key={cl.id} 
                            onClick={() => setSelectedClassFilter(selectedClassFilter === cl.id ? null : cl.id)}
                            className={`flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer ${
                                selectedClassFilter === cl.id 
                                    ? 'bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] border-[var(--primary)] ring-2 ring-[var(--primary-dim)]' 
                                    : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700 hover:bg-[var(--primary-dim)] dark:hover:bg-slate-800'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded flex items-center justify-center font-bold text-white ${
                                    selectedClassFilter === cl.id ? 'ring-2 ring-white' : ''
                                } ${
                                    i < 5 ? 'bg-[var(--primary-dim)]0' : i === 5 ? 'bg-red-500' : 'bg-green-500'
                                }`}>
                                    {cl.id}
                                </div>
                                <span className="font-medium text-slate-700 dark:text-slate-200 text-sm truncate max-w-[120px]" title={cl.label}>{cl.label.split(':')[1]}</span>
                            </div>
                            <span className="font-mono font-bold text-slate-800 dark:text-white text-sm">
                                {formatPrice(cl.balance)}
                            </span>
                        </div>
                    ))}
                </div>
                {selectedClassFilter && (
                    <div className="mt-3 flex items-center gap-2 text-sm text-[var(--primary)] dark:text-[var(--primary)]">
                        <span className="font-medium">📊 Filtre actif: Classe {selectedClassFilter}</span>
                        <button 
                            onClick={() => setSelectedClassFilter(null)}
                            className="text-xs px-2 py-1 bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] hover:bg-[var(--primary-dim)] dark:hover:bg-[var(--primary-dim)]/50 rounded-full transition-colors"
                        >
                            ✕ Effacer
                        </button>
                    </div>
                )}
            </Card>

            {/* JOURNAL */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden flex flex-col flex-1 min-h-[300px]">
                <div className="p-3 sm:p-4 border-b border-slate-200 dark:border-slate-700 flex flex-wrap sm:flex-nowrap justify-between items-center gap-2 bg-slate-50 dark:bg-slate-800">
                    <div className="flex items-center gap-2">
                        <FileSpreadsheet className="w-5 h-5 text-[var(--primary)] dark:text-[var(--primary)]" />
                        <h3 className="font-bold text-slate-800 dark:text-white">Journal Général</h3>
                    </div>
                    <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                        <button 
                            onClick={onOpenEntryModal}
                            className="flex items-center gap-2 px-3 py-2 bg-[var(--primary)] hover:bg-[var(--primary-light)] text-white rounded-lg text-sm font-bold transition-colors"
                        >
                            <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Nouvelle Écriture</span>
                        </button>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input 
                                type="text" 
                                placeholder="Rechercher..." 
                                className="pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-[var(--primary)] outline-none"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <button 
                            onClick={() => generateFEC(journalEntries || [], `FEC_EXPORT_${new Date().toISOString().slice(0,10)}.csv`)}
                            className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                        >
                            <Download className="w-4 h-4" /> <span className="hidden sm:inline">Export FEC</span>
                        </button>

                        {showLockDateInput && (
                            <input
                                type="date"
                                value={lockDateInput}
                                onChange={(e) => setLockDateInput(e.target.value)}
                                className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 outline-none"
                            />
                        )}
                        <button 
                            onClick={handleSetLockDate}
                            className="flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold transition-colors"
                            title="Clôturer la période"
                        >
                            <BookOpen className="w-4 h-4" />
                            {showLockDateInput && <span className="hidden sm:inline">Valider</span>}
                        </button>

                        {lockDate && (
                            <div className="hidden md:flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-xs font-bold border border-red-200 dark:border-red-800">
                                <BookOpen className="w-3 h-3" />
                                {lockDate}
                            </div>
                        )}
                        
                        {/* COLUMN MANAGER */}
                        <div className="relative" ref={columnMenuRef}>
                            <button 
                                onClick={() => setIsColumnMenuOpen(!isColumnMenuOpen)}
                                className={`p-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 transition-colors ${isColumnMenuOpen ? 'bg-slate-50 dark:bg-slate-700 ring-2 ring-[var(--primary-dim)]' : ''}`}
                                title="Gérer les colonnes"
                            >
                                <LayoutTemplate className="w-4 h-4" />
                            </button>
                            {isColumnMenuOpen && (
                                <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="p-2 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                                        Colonnes
                                    </div>
                                    <div className="max-h-48 overflow-y-auto custom-scrollbar p-1">
                                        {JOURNAL_COLUMNS.map(col => (
                                            <label key={col.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 rounded cursor-pointer text-sm">
                                                <input 
                                                    type="checkbox" 
                                                    checked={visibleColumns.includes(col.id)}
                                                    onChange={() => toggleColumn(col.id)}
                                                    className="rounded border-slate-300 dark:border-slate-600 text-[var(--primary)] focus:ring-[var(--primary)] bg-white dark:bg-slate-900"
                                                />
                                                <span className="text-slate-700 dark:text-slate-200">{col.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                
                <div className="flex-1 overflow-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-100 dark:bg-slate-900 sticky top-0 z-10 shadow-sm">
                            <tr>
                                {visibleColumns.includes('date') && <SortableHeader label="Date" sortKey="date" currentSortKey={entrySortConfig.key} currentDirection={entrySortConfig.direction} onSort={handleEntrySort} className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase border-b dark:border-slate-700" />}
                                {visibleColumns.includes('ref') && <SortableHeader label="N° Pièce" sortKey="ref" currentSortKey={entrySortConfig.key} currentDirection={entrySortConfig.direction} onSort={handleEntrySort} className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase border-b dark:border-slate-700" />}
                                {visibleColumns.includes('reseller') && <SortableHeader label="Revendeur" sortKey="reseller" currentSortKey={entrySortConfig.key} currentDirection={entrySortConfig.direction} onSort={handleEntrySort} className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase border-b dark:border-slate-700" />}
                                {visibleColumns.includes('account') && <SortableHeader label="Compte" sortKey="account" currentSortKey={entrySortConfig.key} currentDirection={entrySortConfig.direction} onSort={handleEntrySort} className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase border-b dark:border-slate-700" />}
                                {visibleColumns.includes('label') && <SortableHeader label="Libellé" sortKey="label" currentSortKey={entrySortConfig.key} currentDirection={entrySortConfig.direction} onSort={handleEntrySort} className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase border-b dark:border-slate-700" />}
                                {visibleColumns.includes('debit') && <SortableHeader label="Débit" sortKey="debit" currentSortKey={entrySortConfig.key} currentDirection={entrySortConfig.direction} onSort={handleEntrySort} className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase border-b dark:border-slate-700 text-right" />}
                                {visibleColumns.includes('credit') && <SortableHeader label="Crédit" sortKey="credit" currentSortKey={entrySortConfig.key} currentDirection={entrySortConfig.direction} onSort={handleEntrySort} className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase border-b dark:border-slate-700 text-right" />}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                            {sortedEntries.length === 0 && (
                                <tr>
                                    <td colSpan={visibleColumns.length} className="px-4 py-10 text-center text-sm text-slate-400 dark:text-slate-500">
                                        <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                        {searchTerm ? `Aucune écriture pour "${searchTerm}"` : 'Aucune écriture comptable sur cette période'}
                                    </td>
                                </tr>
                            )}
                            {sortedEntries.map((entry, i) => (
                                <tr key={i} className="hover:bg-[var(--primary-dim)] dark:hover:bg-[var(--primary-dim)]/10 transition-colors">
                                    {visibleColumns.includes('date') && <td className="px-4 py-2 text-slate-600 dark:text-slate-300">{entry.date}</td>}
                                    {visibleColumns.includes('ref') && <td className="px-4 py-2 font-mono text-xs text-slate-500 dark:text-slate-400">{entry.ref}</td>}
                                    {visibleColumns.includes('reseller') && (
                                        <td className="px-4 py-2">
                                            <div className="flex items-center gap-2">
                                                <div className="w-5 h-5 rounded bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] flex items-center justify-center text-[10px] font-bold text-[var(--primary)]">
                                                    {(resellers?.find(r => r.tenantId === entry.tenantId)?.slug || '??').substring(0, 2)}
                                                </div>
                                                <span className="text-xs text-slate-600 dark:text-slate-300">
                                                    {resellers?.find(r => r.tenantId === entry.tenantId)?.name || entry.tenantId || '-'}
                                                </span>
                                            </div>
                                        </td>
                                    )}
                                    {visibleColumns.includes('account') && <td className="px-4 py-2 font-bold text-slate-700 dark:text-slate-200">{entry.account}</td>}
                                    {visibleColumns.includes('label') && <td className="px-4 py-2 text-slate-800 dark:text-slate-200">{entry.label}</td>}
                                    {visibleColumns.includes('debit') && <td className="px-4 py-2 text-right font-mono text-slate-700 dark:text-slate-300">{entry.debit > 0 ? formatPrice(entry.debit) : '-'}</td>}
                                    {visibleColumns.includes('credit') && <td className="px-4 py-2 text-right font-mono text-slate-700 dark:text-slate-300">{entry.credit > 0 ? formatPrice(entry.credit) : '-'}</td>}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                
                {/* PAGINATION */}
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages || 1}
                    onPageChange={setCurrentPage}
                    className="p-3 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
            </div>
        </div>
    );
};
