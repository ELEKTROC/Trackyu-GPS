import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Download, Search, Calendar, ChevronDown, LayoutTemplate,
  Sparkles, ChevronRight, Filter, Check
} from 'lucide-react';
import { REPORT_PERIODS } from "../../../constants";
import { SortableHeader } from '../../../components/SortableHeader';
import { Pagination } from '../../../components/Pagination';

interface HierarchicalFilterProps {
    clientVehicleMap: Map<string, Set<string>>;
    selectedVehicles: Set<string>;
    onChange: (newSelection: Set<string>) => void;
}

const HierarchicalFilter: React.FC<HierarchicalFilterProps> = ({ clientVehicleMap, selectedVehicles, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
    const containerRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Filter clients/vehicles based on search
    const filteredMap = useMemo(() => {
        if (!searchTerm) return clientVehicleMap;
        const newMap = new Map<string, Set<string>>();
        clientVehicleMap.forEach((vehicles, client) => {
            const clientMatches = client.toLowerCase().includes(searchTerm.toLowerCase());
            const matchingVehicles = new Set<string>();
            vehicles.forEach(v => {
                if (clientMatches || v.toLowerCase().includes(searchTerm.toLowerCase())) {
                    matchingVehicles.add(v);
                }
            });
            if (matchingVehicles.size > 0) {
                newMap.set(client, matchingVehicles);
            }
        });
        return newMap;
    }, [clientVehicleMap, searchTerm]);

    // Auto-expand if searching
    useEffect(() => {
        if (searchTerm) {
            setExpandedClients(new Set(filteredMap.keys()));
        }
    }, [searchTerm, filteredMap]);

    const toggleClient = (client: string) => {
        const newExpanded = new Set(expandedClients);
        if (newExpanded.has(client)) newExpanded.delete(client);
        else newExpanded.add(client);
        setExpandedClients(newExpanded);
    };

    const handleClientCheckbox = (client: string, vehicles: Set<string>) => {
        const newSelection = new Set(selectedVehicles);
        const clientVehicles = Array.from(vehicles);
        const allSelected = clientVehicles.every(v => newSelection.has(v));

        if (allSelected) {
            // Deselect all
            clientVehicles.forEach(v => newSelection.delete(v));
        } else {
            // Select all
            clientVehicles.forEach(v => newSelection.add(v));
        }
        onChange(newSelection);
    };

    const handleVehicleCheckbox = (vehicle: string) => {
        const newSelection = new Set(selectedVehicles);
        if (newSelection.has(vehicle)) newSelection.delete(vehicle);
        else newSelection.add(vehicle);
        onChange(newSelection);
    };

    const selectAll = () => {
        const all = new Set<string>();
        clientVehicleMap.forEach(vehicles => vehicles.forEach(v => all.add(v)));
        onChange(all);
    };

    const deselectAll = () => {
        onChange(new Set());
    };

    const totalSelected = selectedVehicles.size;
    const totalVehicles = useMemo(() => {
        let count = 0;
        clientVehicleMap.forEach(v => count += v.size);
        return count;
    }, [clientVehicleMap]);

    return (
        <div className="relative" ref={containerRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm font-medium transition-colors ${isOpen || totalSelected < totalVehicles ? 'bg-[var(--primary-dim)] border-[var(--border)] text-[var(--primary)] dark:bg-[var(--primary-dim)] dark:border-[var(--primary)] dark:text-[var(--primary)]' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
            >
                <Filter className="w-4 h-4" />
                <span>Filtres {totalSelected < totalVehicles ? `(${totalSelected})` : ''}</span>
                <ChevronDown className="w-4 h-4 opacity-50" />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-80 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-50 flex flex-col max-h-[500px] animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-3 border-b border-slate-100 dark:border-slate-700 space-y-2">
                        <div className="relative">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                            <input 
                                type="text" 
                                placeholder="Rechercher client ou véhicule..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-2 py-1.5 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                            />
                        </div>
                        <div className="flex justify-between text-xs">
                            <button onClick={selectAll} className="text-[var(--primary)] hover:underline">Tout sélectionner</button>
                            <button onClick={deselectAll} className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">Tout désélectionner</button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                        {Array.from(filteredMap.entries()).map(([client, vehicles]) => {
                            const vehicleList = Array.from(vehicles);
                            const selectedCount = vehicleList.filter(v => selectedVehicles.has(v)).length;
                            const isAllSelected = selectedCount === vehicleList.length;
                            const isIndeterminate = selectedCount > 0 && !isAllSelected;
                            const isExpanded = expandedClients.has(client);

                            return (
                                <div key={client} className="border border-slate-100 dark:border-slate-700/50 rounded-lg overflow-hidden">
                                    <div className="flex items-center bg-slate-50 dark:bg-slate-800/50 p-2 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors">
                                        <button onClick={() => toggleClient(client)} className="p-1 mr-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded">
                                            {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                        </button>
                                        <div className="flex items-center gap-2 flex-1 cursor-pointer" onClick={() => handleClientCheckbox(client, vehicles)}>
                                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isAllSelected || isIndeterminate ? 'bg-[var(--primary)] border-[var(--primary)]' : 'border-slate-300 bg-white dark:bg-slate-900'}`}>
                                                {isAllSelected && <Check className="w-3 h-3 text-white" />}
                                                {isIndeterminate && <div className="w-2 h-0.5 bg-white rounded-full" />}
                                            </div>
                                            <span className="text-sm font-medium text-slate-700 dark:text-slate-200 select-none">{client}</span>
                                            <span className="text-xs text-slate-400 ml-auto">{selectedCount}/{vehicleList.length}</span>
                                        </div>
                                    </div>
                                    
                                    {isExpanded && (
                                        <div className="pl-9 pr-2 py-1 space-y-0.5 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-700/50">
                                            {vehicleList.map(vehicle => (
                                                <label key={vehicle} className="flex items-center gap-2 py-1.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 rounded px-1">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={selectedVehicles.has(vehicle)}
                                                        onChange={() => handleVehicleCheckbox(vehicle)}
                                                        className="rounded border-slate-300 text-[var(--primary)] focus:ring-[var(--primary)] w-3.5 h-3.5"
                                                    />
                                                    <span className="text-sm text-slate-600 dark:text-slate-300 truncate select-none">{vehicle}</span>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        {filteredMap.size === 0 && (
                            <div className="text-center py-8 text-slate-400 text-sm">
                                Aucun résultat trouvé
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

interface ReportTableProps {
    title: string;
    columns: string[];
    data: string[][]; // Array of rows, each row is an array of cell values matching columns
    onExport: (visibleColumns: string[], filteredData: string[][]) => void;
    onAiAnalysis: (visibleColumns: string[], filteredData: string[][]) => void;
}

export const ReportTable: React.FC<ReportTableProps> = ({ 
    title, 
    columns, 
    data, 
    onExport, 
    onAiAnalysis 
}) => {
    const [filter, setFilter] = useState('');
    const [selectedPeriod, setSelectedPeriod] = useState('THIS_WEEK');
    const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
    const [isColumnMenuOpen, setIsColumnMenuOpen] = useState(false);
    const columnMenuRef = useRef<HTMLDivElement>(null);

    // Identify Filter Columns
    const clientColIdx = useMemo(() => columns.findIndex(c => ['Client', 'Société', 'Compte'].some(k => c.includes(k))), [columns]);
    const vehicleColIdx = useMemo(() => columns.findIndex(c => ['Véhicule', 'Plaque', 'Immatriculation'].some(k => c.includes(k))), [columns]);

    // Build Client -> Vehicles Map
    const clientVehicleMap = useMemo(() => {
        const map = new Map<string, Set<string>>();
        if (clientColIdx === -1 || vehicleColIdx === -1) return map;

        data.forEach(row => {
            const client = row[clientColIdx];
            const vehicle = row[vehicleColIdx];
            if (client && vehicle) {
                if (!map.has(client)) map.set(client, new Set());
                map.get(client)!.add(vehicle);
            }
        });
        return map;
    }, [data, clientColIdx, vehicleColIdx]);

    // Filters State (Initialize with ALL vehicles)
    const [selectedVehicles, setSelectedVehicles] = useState<Set<string>>(new Set());

    // Initialize selectedVehicles when data loads
    useEffect(() => {
        const allVehicles = new Set<string>();
        clientVehicleMap.forEach(vehicles => vehicles.forEach(v => allVehicles.add(v)));
        if (allVehicles.size > 0) {
            setSelectedVehicles(allVehicles);
        }
    }, [clientVehicleMap]);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Initialize visible columns when columns prop changes
    useEffect(() => {
        setVisibleColumns(columns);
    }, [columns]);

    // Reset pagination when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [filter, selectedVehicles, itemsPerPage]);

    // Handle click outside column menu
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (columnMenuRef.current && !columnMenuRef.current.contains(event.target as Node)) {
                setIsColumnMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleColumn = (col: string) => {
        if (visibleColumns.includes(col)) {
            if (visibleColumns.length > 1) {
                setVisibleColumns(visibleColumns.filter(c => c !== col));
            }
        } else {
            // Insert at original index order
            const newVisible = [...visibleColumns, col].sort((a, b) => {
                return columns.indexOf(a) - columns.indexOf(b);
            });
            setVisibleColumns(newVisible);
        }
    };

    // Filter Data
    const filteredRows = useMemo(() => {
        return data.filter(row => {
            const matchesSearch = row.some(cell => String(cell).toLowerCase().includes(filter.toLowerCase()));
            
            // Vehicle Filter Logic
            let matchesVehicle = true;
            if (vehicleColIdx !== -1 && selectedVehicles.size > 0) {
                const vehicle = row[vehicleColIdx];
                matchesVehicle = selectedVehicles.has(vehicle);
            }
            
            return matchesSearch && matchesVehicle;
        });
    }, [data, filter, selectedVehicles, vehicleColIdx]);

    // Sort State
    const [reportSortConfig, setReportSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

    const handleReportSort = (key: string) => {
        setReportSortConfig(prev => {
            if (!prev || prev.key !== key) return { key, direction: 'asc' };
            if (prev.direction === 'asc') return { key, direction: 'desc' };
            return null;
        });
    };

    const sortedRows = useMemo(() => {
        if (!reportSortConfig) return filteredRows;
        const colIdx = columns.indexOf(reportSortConfig.key);
        if (colIdx === -1) return filteredRows;
        return [...filteredRows].sort((a, b) => {
            const valA = String(a[colIdx] || '');
            const valB = String(b[colIdx] || '');
            const numA = parseFloat(valA.replace(/[^\d.,-]/g, '').replace(',', '.'));
            const numB = parseFloat(valB.replace(/[^\d.,-]/g, '').replace(',', '.'));
            if (!isNaN(numA) && !isNaN(numB)) {
                return reportSortConfig.direction === 'asc' ? numA - numB : numB - numA;
            }
            return reportSortConfig.direction === 'asc'
                ? valA.localeCompare(valB, 'fr')
                : valB.localeCompare(valA, 'fr');
        });
    }, [filteredRows, reportSortConfig, columns]);

    // Pagination Logic
    const totalPages = Math.ceil(sortedRows.length / itemsPerPage);
    const paginatedRows = sortedRows.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            {/* Toolbar */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-col gap-4">
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800 dark:text-white">{title}</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            {filteredRows.length} enregistrements
                        </p>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-wrap">
                            {/* Period Selector */}
                            <div className="relative w-full sm:w-auto">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <select 
                                    value={selectedPeriod}
                                    onChange={(e) => setSelectedPeriod(e.target.value)}
                                    className="w-full sm:w-auto pl-9 pr-8 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] appearance-none cursor-pointer shadow-sm font-medium text-slate-700 dark:text-slate-200 min-w-[160px]"
                                >
                                    {REPORT_PERIODS.map(p => (
                                    <option key={p.id} value={p.id}>{p.label}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            </div>

                            {/* Hierarchical Filter (Client/Vehicle) */}
                            {clientVehicleMap.size > 0 && (
                                <HierarchicalFilter 
                                    clientVehicleMap={clientVehicleMap}
                                    selectedVehicles={selectedVehicles}
                                    onChange={setSelectedVehicles}
                                />
                            )}

                            {/* Search */}
                            <div className="relative w-full sm:w-48">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input 
                                    type="text" 
                                    placeholder="Rechercher..." 
                                    className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-sm"
                                    value={filter}
                                    onChange={(e) => setFilter(e.target.value)}
                                />
                            </div>
                            
                            <div className="flex gap-2 w-full sm:w-auto relative" ref={columnMenuRef}>

                            {/* Bouton Colonnes */}
                            <button 
                                onClick={() => setIsColumnMenuOpen(!isColumnMenuOpen)}
                                className={`justify-center p-2 border rounded-lg shadow-sm transition-colors ${isColumnMenuOpen ? 'bg-[var(--primary-dim)] border-[var(--border)] text-[var(--primary)]' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`} 
                                title="Gérer les colonnes"
                            >
                                <LayoutTemplate className="w-4 h-4" />
                            </button>

                            {/* Dropdown Colonnes */}
                            {isColumnMenuOpen && (
                                <div className="absolute top-full right-0 mt-2 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-20 p-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                <p className="text-xs font-semibold text-slate-500 px-2 py-1 mb-1 uppercase">Colonnes affichées</p>
                                <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-1">
                                    {columns.map((col) => (
                                    <label key={col} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 rounded cursor-pointer">
                                        <input 
                                        type="checkbox" 
                                        checked={visibleColumns.includes(col)}
                                        onChange={() => toggleColumn(col)}
                                        className="rounded border-slate-300 text-[var(--primary)] focus:ring-[var(--primary)]"
                                        />
                                        <span className="text-sm text-slate-700 dark:text-slate-200 truncate">{col}</span>
                                    </label>
                                    ))}
                                </div>
                                </div>
                            )}

                            {/* Bouton IA */}
                            <button 
                                onClick={() => onAiAnalysis(visibleColumns, filteredRows)}
                                className="flex items-center gap-2 px-3 py-2 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors shadow-sm"
                            >
                                <Sparkles className="w-4 h-4" />
                                <span className="hidden sm:inline text-sm font-medium">Analyser</span>
                            </button>

                            {/* Bouton Export */}
                            <button 
                                onClick={() => onExport(visibleColumns, filteredRows)}
                                className="flex items-center gap-2 px-3 py-2 bg-slate-800 dark:bg-slate-700 text-white rounded-lg hover:bg-slate-700 dark:hover:bg-slate-600 transition-colors shadow-sm"
                            >
                                <Download className="w-4 h-4" />
                                <span className="hidden sm:inline text-sm font-medium">Exporter</span>
                            </button>
                            </div>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 sticky top-0 z-10">
                        <tr>
                            {columns.map((col, idx) => (
                                visibleColumns.includes(col) && (
                                    <SortableHeader
                                        key={idx}
                                        label={col}
                                        sortKey={col}
                                        currentSortKey={reportSortConfig?.key || null}
                                        currentDirection={reportSortConfig?.direction || null}
                                        onSort={handleReportSort}
                                        className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-300 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700 whitespace-nowrap"
                                    />
                                )
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {paginatedRows.length > 0 ? (
                            paginatedRows.map((row, rowIdx) => (
                                <tr key={rowIdx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                                    {row.map((cell, cellIdx) => (
                                        visibleColumns.includes(columns[cellIdx]) && (
                                            <td key={cellIdx} className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300 whitespace-nowrap group-hover:text-slate-900 dark:group-hover:text-white">
                                                {cell}
                                            </td>
                                        )
                                    ))}
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={visibleColumns.length} className="px-4 py-12 text-center text-slate-400">
                                    <div className="flex flex-col items-center gap-2">
                                        <Search className="w-8 h-8 opacity-50" />
                                        <p>Aucun résultat trouvé</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50 dark:bg-slate-800/50">
                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                    <span>Afficher</span>
                    <select 
                        value={itemsPerPage}
                        onChange={(e) => setItemsPerPage(Number(e.target.value))}
                        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                    </select>
                    <span>par page</span>
                    <span className="mx-2">|</span>
                    <span>Page {currentPage} sur {totalPages || 1}</span>
                </div>

                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages || 1}
                    onPageChange={setCurrentPage}
                />
            </div>
        </div>
    );
};
