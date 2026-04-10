import React, { useState, useRef, useEffect } from 'react';
import { Search, Filter, Download, ChevronDown } from 'lucide-react';
import { ColumnManager } from '../../../../components/ColumnManager';

interface InvoiceFiltersProps {
    mode: 'INVOICES' | 'QUOTES';
    searchTerm: string;
    onSearchChange: (value: string) => void;
    filter: string;
    onFilterChange: (value: string) => void;
    categoryFilter: string;
    onCategoryFilterChange: (value: string) => void;
    resellerFilter: string;
    onResellerFilterChange: (value: string) => void;
    availableResellers: string[];
    visibleColumns: string[];
    onColumnsChange: (columns: string[]) => void;
    columns: Array<{ id: string; label: string; defaultVisible?: boolean }>;
    onExport: (format: 'csv' | 'pdf') => void;
}

export const InvoiceFilters: React.FC<InvoiceFiltersProps> = ({
    mode,
    searchTerm,
    onSearchChange,
    filter,
    onFilterChange,
    categoryFilter,
    onCategoryFilterChange,
    resellerFilter,
    onResellerFilterChange,
    availableResellers,
    visibleColumns,
    onColumnsChange,
    columns,
    onExport,
}) => {
    const [showExportMenu, setShowExportMenu] = useState(false);
    const exportMenuRef = useRef<HTMLDivElement>(null);

    // Close export menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
                setShowExportMenu(false);
            }
        };

        if (showExportMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showExportMenu]);

    const handleExport = (format: 'csv' | 'pdf') => {
        onExport(format);
        setShowExportMenu(false);
    };

    return (
        <div className="flex gap-3 flex-wrap">
            {/* Search Input */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                    type="text"
                    placeholder="Rechercher..."
                    aria-label="Rechercher"
                    className="pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm w-full sm:w-64 text-slate-700 dark:text-slate-200 placeholder-slate-400"
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                />
            </div>

            {/* Status Filter */}
            <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <select
                    value={filter}
                    onChange={(e) => onFilterChange(e.target.value)}
                    aria-label="Filtrer par statut"
                    className="pl-9 pr-8 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm appearance-none text-slate-700 dark:text-slate-200"
                >
                    <option value="ALL">Tous</option>
                    {mode === 'INVOICES' ? (
                        <>
                            <option value="PAID">Payée</option>
                            <option value="PARTIALLY_PAID">Partiellement payée</option>
                            <option value="SENT">Envoyée</option>
                            <option value="OVERDUE">En retard</option>
                            <option value="DRAFT">Brouillon</option>
                            <option value="CANCELLED">Annulée</option>
                        </>
                    ) : (
                        <>
                            <option value="DRAFT">Brouillon</option>
                            <option value="SENT">Envoyé</option>
                            <option value="ACCEPTED">Accepté</option>
                            <option value="REJECTED">Refusé</option>
                            <option value="EXPIRED">Expiré</option>
                        </>
                    )}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>

            {/* Reseller Filter */}
            {availableResellers.length > 0 && (
                <div className="relative">
                    <select
                        value={resellerFilter}
                        onChange={(e) => onResellerFilterChange(e.target.value)}
                        aria-label="Filtrer par revendeur"
                        className="pl-3 pr-8 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm appearance-none text-slate-700 dark:text-slate-200"
                    >
                        <option value="ALL">Tous les revendeurs</option>
                        {availableResellers.map((r) => (
                            <option key={r} value={r}>
                                {r}
                            </option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
            )}

            {/* Category Filter - Only for Invoices */}
            {mode === 'INVOICES' && (
                <div className="relative">
                    <select
                        value={categoryFilter}
                        onChange={(e) => onCategoryFilterChange(e.target.value)}
                        aria-label="Filtrer par catégorie"
                        className="pl-3 pr-8 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm appearance-none text-slate-700 dark:text-slate-200"
                    >
                        <option value="ALL">Toutes catégories</option>
                        <option value="STANDARD">Standard</option>
                        <option value="INSTALLATION">Installation</option>
                        <option value="ABONNEMENT">Abonnement</option>
                        <option value="AUTRES_VENTES">Autres Ventes</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
            )}

            {/* Column Manager */}
            <ColumnManager
                columns={columns}
                visible={visibleColumns}
                onChange={onColumnsChange}
            />

            {/* Export Menu */}
            <div className="relative" ref={exportMenuRef}>
                <button
                    onClick={() => setShowExportMenu(!showExportMenu)}
                    className={`p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 ${
                        showExportMenu ? 'bg-slate-100 dark:bg-slate-700' : ''
                    }`}
                    title="Exporter"
                >
                    <Download className="w-4 h-4" />
                </button>
                {showExportMenu && (
                    <div className="absolute right-0 top-full mt-2 w-32 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden py-1">
                        <button
                            onClick={() => handleExport('csv')}
                            className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"
                        >
                            <span className="font-mono text-xs border border-slate-300 dark:border-slate-600 rounded px-1">CSV</span> Export CSV
                        </button>
                        <button
                            onClick={() => handleExport('pdf')}
                            className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"
                        >
                            <span className="font-mono text-xs border border-slate-300 dark:border-slate-600 rounded px-1">PDF</span> Export PDF
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
