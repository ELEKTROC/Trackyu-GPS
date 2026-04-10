import React, { useState, useMemo } from 'react';
import { CatalogItem } from '../../../types';
import { useTableSort } from '../../../hooks/useTableSort';
import { SortableHeader } from '../../../components/SortableHeader';
import { Pagination } from '../../../components/Pagination';
import {
    Edit2,
    Copy,
    X,
    CheckCircle,
    LayoutTemplate,
    Trash2,
    BookOpen,
    LayoutGrid,
    List,
    Tag,
    Package,
} from 'lucide-react';
import { useCurrency } from '../../../hooks/useCurrency';

interface CatalogListProps {
    catalogItems: CatalogItem[];
    searchTerm: string;
    categoryFilter: string;
    resellerFilter?: string;
    onEdit: (item: CatalogItem) => void;
    onClone: (item: CatalogItem) => void;
    onToggleStatus: (item: CatalogItem) => void;
    onDelete: (id: string) => void;
    onViewDetail: (item: CatalogItem) => void;
}

const CATALOG_COLUMNS = [
    { id: 'checkbox', label: '', locked: true },
    { id: 'id', label: 'ID' },
    { id: 'name', label: 'Nom', locked: true },
    { id: 'type', label: 'Type' },
    { id: 'category', label: 'Catégorie' },
    { id: 'price', label: 'Prix' },
    { id: 'taxRate', label: 'TVA (%)' },
    { id: 'unit', label: 'Unité' },
    { id: 'status', label: 'Statut' },
    { id: 'actions', label: 'Actions', locked: true }
];

export const CatalogList: React.FC<CatalogListProps> = ({
    catalogItems,
    searchTerm,
    categoryFilter,
    resellerFilter,
    onEdit,
    onClone,
    onToggleStatus,
    onDelete,
    onViewDetail
}) => {
    const { formatPrice } = useCurrency();
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(12);
    const [visibleColumns, setVisibleColumns] = useState<string[]>(CATALOG_COLUMNS.map(c => c.id));
    const [isColumnMenuOpen, setIsColumnMenuOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'card' | 'table'>('card');

    const filteredCatalog = useMemo(() => catalogItems.filter(i => {
        const matchSearch = i.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchCategory = categoryFilter === 'ALL' || i.category === categoryFilter;
        const matchReseller = !resellerFilter || resellerFilter === 'ALL' || i.resellerId === resellerFilter;
        return matchSearch && matchCategory && matchReseller;
    }), [catalogItems, searchTerm, categoryFilter, resellerFilter]);

    const { sortedItems: sortedCatalog, sortConfig, handleSort } = useTableSort(filteredCatalog);

    const totalPages = Math.ceil(sortedCatalog.length / itemsPerPage);
    const paginatedCatalog = sortedCatalog.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const handleSelectAll = () => {
        if (paginatedCatalog.every(c => selectedIds.has(c.id))) {
            const newSet = new Set(selectedIds);
            paginatedCatalog.forEach(c => newSet.delete(c.id));
            setSelectedIds(newSet);
        } else {
            const newSet = new Set(selectedIds);
            paginatedCatalog.forEach(c => newSet.add(c.id));
            setSelectedIds(newSet);
        }
    };

    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const isAllSelected = paginatedCatalog.length > 0 && paginatedCatalog.every(c => selectedIds.has(c.id));

    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 relative">

            {/* BULK ACTIONS BAR */}
            {selectedIds.size > 0 && (
                <div className="absolute top-0 left-0 right-0 h-14 bg-purple-50 dark:bg-purple-900/50 flex items-center justify-between px-4 z-20 animate-in fade-in slide-in-from-top-1 border-b border-purple-100 dark:border-purple-800 rounded-t-lg">
                    <span className="text-sm font-bold text-purple-800 dark:text-purple-200">{selectedIds.size} article(s) sélectionné(s)</span>
                    <div className="flex gap-2">
                        <button
                            onClick={() => {
                                selectedIds.forEach(id => {
                                    const item = catalogItems.find(c => c.id === id);
                                    if (item) onToggleStatus(item);
                                });
                                setSelectedIds(new Set());
                            }}
                            className="text-xs bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-700 text-purple-700 dark:text-purple-300 px-3 py-1.5 rounded shadow-sm hover:bg-purple-100 dark:hover:bg-purple-800 transition-colors flex items-center gap-1.5"
                        >
                            <X className="w-3 h-3"/> Désactiver
                        </button>
                        <button onClick={() => setSelectedIds(new Set())} className="p-1 hover:bg-purple-200 dark:hover:bg-purple-800 rounded text-purple-600 dark:text-purple-300">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Toolbar: view toggle + column manager */}
            <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
                {/* View toggle */}
                <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700">
                    <button
                        onClick={() => { setViewMode('card'); setItemsPerPage(12); }}
                        className={`p-1.5 rounded transition-colors ${viewMode === 'card' ? 'bg-white dark:bg-slate-700 shadow-sm text-purple-600' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                        title="Vue cartes"
                    >
                        <LayoutGrid className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => { setViewMode('table'); setItemsPerPage(10); }}
                        className={`p-1.5 rounded transition-colors ${viewMode === 'table' ? 'bg-white dark:bg-slate-700 shadow-sm text-purple-600' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                        title="Vue tableau"
                    >
                        <List className="w-4 h-4" />
                    </button>
                </div>

                {/* Column manager (table mode only) */}
                {viewMode === 'table' && (
                    <div className="relative">
                        <button
                            onClick={() => setIsColumnMenuOpen(!isColumnMenuOpen)}
                            className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors bg-white dark:bg-slate-800"
                            title="Colonnes"
                        >
                            <LayoutTemplate className="w-4 h-4" />
                        </button>
                        {isColumnMenuOpen && (
                            <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-20 p-2 animate-in fade-in slide-in-from-top-2">
                                <div className="text-xs font-bold text-slate-500 uppercase mb-2 px-2">Colonnes visibles</div>
                                {CATALOG_COLUMNS.map(col => (
                                    <label key={col.id} className="flex items-center gap-2 p-2 hover:bg-slate-50 dark:hover:bg-slate-700 rounded cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={visibleColumns.includes(col.id)}
                                            disabled={col.locked}
                                            onChange={() => {
                                                if (visibleColumns.includes(col.id)) {
                                                    setVisibleColumns(visibleColumns.filter(c => c !== col.id));
                                                } else {
                                                    setVisibleColumns([...visibleColumns, col.id]);
                                                }
                                            }}
                                            className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                                        />
                                        <span className="text-sm text-slate-700 dark:text-slate-200">{col.label || '☑'}</span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ── CARD VIEW ─────────────────────────────────────────── */}
            {viewMode === 'card' && (
                <div className="flex-1 overflow-auto custom-scrollbar p-4">
                    {paginatedCatalog.length === 0 ? (
                        <div className="py-16 text-center text-slate-400 dark:text-slate-500">
                            <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
                            <p className="text-sm">Aucun article dans le catalogue</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {paginatedCatalog.map(item => (
                                <div
                                    key={item.id}
                                    onClick={() => onViewDetail(item)}
                                    className={`group relative flex flex-col bg-white dark:bg-slate-800 border rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden
                                        ${selectedIds.has(item.id) ? 'border-purple-400 ring-2 ring-purple-300 dark:ring-purple-700' : 'border-slate-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-600'}
                                        ${item.status !== 'ACTIVE' ? 'opacity-60' : ''}`}
                                >
                                    {/* Top accent bar by type */}
                                    <div className={`h-1 w-full ${item.type === 'Service' ? 'bg-purple-500' : 'bg-blue-500'}`} />

                                    {/* Checkbox (top-left) */}
                                    <div
                                        className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={e => { e.stopPropagation(); toggleSelection(item.id); }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.has(item.id)}
                                            onChange={() => {}}
                                            className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 shadow-sm"
                                        />
                                    </div>

                                    {/* Status badge (top-right) */}
                                    <div className="absolute top-3 right-3">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${item.status === 'ACTIVE' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' : 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400'}`}>
                                            {item.status === 'ACTIVE' ? 'Actif' : 'Inactif'}
                                        </span>
                                    </div>

                                    {/* Body */}
                                    <div className="flex-1 p-4 pt-8">
                                        {/* Name */}
                                        <h3 className="font-bold text-sm text-slate-800 dark:text-white leading-tight mb-2 pr-2 line-clamp-2">
                                            {item.name}
                                        </h3>

                                        {/* Type + Category */}
                                        <div className="flex items-center gap-2 mb-3 flex-wrap">
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${item.type === 'Service' ? 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400' : 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'}`}>
                                                {item.type === 'Service' ? <Tag className="w-2.5 h-2.5" /> : <Package className="w-2.5 h-2.5" />}
                                                {item.type}
                                            </span>
                                            {item.category && (
                                                <span className="text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded truncate max-w-[100px]">
                                                    {item.category}
                                                </span>
                                            )}
                                        </div>

                                        {/* Price */}
                                        <div className="mb-2">
                                            <p className="text-xl font-bold text-slate-800 dark:text-white font-mono">
                                                {formatPrice(item.price)}
                                            </p>
                                            <p className="text-xs text-slate-400 dark:text-slate-500">
                                                {item.unit ? `/ ${item.unit}` : ''}{item.taxRate ? ` · TVA ${item.taxRate}%` : ''}
                                            </p>
                                        </div>

                                        {/* Description if any */}
                                        {item.description && (
                                            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                                                {item.description}
                                            </p>
                                        )}
                                    </div>

                                    {/* Actions footer */}
                                    <div
                                        className="flex items-center justify-end gap-1 px-3 py-2 border-t border-slate-100 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/60"
                                        onClick={e => e.stopPropagation()}
                                    >
                                        <button
                                            onClick={() => onEdit(item)}
                                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                                            title="Modifier"
                                        >
                                            <Edit2 className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={() => onClone(item)}
                                            className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded transition-colors"
                                            title="Cloner"
                                        >
                                            <Copy className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={() => onToggleStatus(item)}
                                            className={`p-1.5 rounded transition-colors ${item.status === 'ACTIVE' ? 'text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20' : 'text-red-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'}`}
                                            title={item.status === 'ACTIVE' ? 'Désactiver' : 'Activer'}
                                        >
                                            {item.status === 'ACTIVE' ? <X className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                                        </button>
                                        <button
                                            onClick={() => { if (confirm('Supprimer cet article ?')) onDelete(item.id); }}
                                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                            title="Supprimer"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── TABLE VIEW ────────────────────────────────────────── */}
            {viewMode === 'table' && (
                <div className="flex-1 overflow-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead className={`bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-300 sticky top-0 z-10 ${selectedIds.size > 0 ? 'opacity-0' : ''}`}>
                            <tr>
                                {visibleColumns.includes('checkbox') && (
                                    <th className="px-4 py-3 w-10 border-b dark:border-slate-700">
                                        <input type="checkbox" checked={isAllSelected} onChange={handleSelectAll} className="rounded border-slate-300 text-purple-600 focus:ring-purple-500" />
                                    </th>
                                )}
                                {visibleColumns.includes('id') && <SortableHeader label="ID" sortKey="id" currentSortKey={sortConfig.key} currentDirection={sortConfig.direction} onSort={handleSort} />}
                                {visibleColumns.includes('name') && <SortableHeader label="Nom" sortKey="name" currentSortKey={sortConfig.key} currentDirection={sortConfig.direction} onSort={handleSort} />}
                                {visibleColumns.includes('type') && <SortableHeader label="Type" sortKey="type" currentSortKey={sortConfig.key} currentDirection={sortConfig.direction} onSort={handleSort} />}
                                {visibleColumns.includes('category') && <SortableHeader label="Catégorie" sortKey="category" currentSortKey={sortConfig.key} currentDirection={sortConfig.direction} onSort={handleSort} />}
                                {visibleColumns.includes('price') && <SortableHeader label="Prix" sortKey="price" currentSortKey={sortConfig.key} currentDirection={sortConfig.direction} onSort={handleSort} className="text-right" />}
                                {visibleColumns.includes('taxRate') && <SortableHeader label="TVA (%)" sortKey="taxRate" currentSortKey={sortConfig.key} currentDirection={sortConfig.direction} onSort={handleSort} className="text-center" />}
                                {visibleColumns.includes('unit') && <SortableHeader label="Unité" sortKey="unit" currentSortKey={sortConfig.key} currentDirection={sortConfig.direction} onSort={handleSort} />}
                                {visibleColumns.includes('status') && <SortableHeader label="Statut" sortKey="status" currentSortKey={sortConfig.key} currentDirection={sortConfig.direction} onSort={handleSort} />}
                                {visibleColumns.includes('actions') && <th className="px-6 py-3 text-xs font-bold uppercase border-b dark:border-slate-700 text-right">Actions</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {paginatedCatalog.length === 0 && (
                                <tr>
                                    <td colSpan={10} className="px-4 py-12 text-center text-sm text-slate-400 dark:text-slate-500">
                                        <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                        Aucun article dans le catalogue
                                    </td>
                                </tr>
                            )}
                            {paginatedCatalog.map((item) => (
                                <tr
                                    key={item.id}
                                    onClick={() => onViewDetail(item)}
                                    className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group ${selectedIds.has(item.id) ? 'bg-purple-50 dark:bg-purple-900/20' : ''}`}
                                >
                                    {visibleColumns.includes('checkbox') && (
                                        <td className="px-4 py-4" onClick={e => { e.stopPropagation(); toggleSelection(item.id); }}>
                                            <input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => {}} className="rounded border-slate-300 text-purple-600 focus:ring-purple-500" />
                                        </td>
                                    )}
                                    {visibleColumns.includes('id') && <td className="px-6 py-4 text-sm font-mono text-slate-500 dark:text-slate-400">{item.id}</td>}
                                    {visibleColumns.includes('name') && <td className="px-6 py-4 text-sm font-bold text-slate-800 dark:text-white">{item.name}</td>}
                                    {visibleColumns.includes('type') && (
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${item.type === 'Service' ? 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400' : 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'}`}>
                                                {item.type}
                                            </span>
                                        </td>
                                    )}
                                    {visibleColumns.includes('category') && <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">{item.category}</td>}
                                    {visibleColumns.includes('price') && <td className="px-6 py-4 text-sm font-mono font-bold text-right text-slate-800 dark:text-white">{formatPrice(item.price)}</td>}
                                    {visibleColumns.includes('taxRate') && <td className="px-6 py-4 text-sm text-center text-slate-600 dark:text-slate-300">{item.taxRate ?? 0}%</td>}
                                    {visibleColumns.includes('unit') && <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{item.unit}</td>}
                                    {visibleColumns.includes('status') && (
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${item.status === 'ACTIVE' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                                {item.status === 'ACTIVE' ? 'Actif' : 'Inactif'}
                                            </span>
                                        </td>
                                    )}
                                    {visibleColumns.includes('actions') && (
                                        <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                                            <div className="flex justify-end gap-1">
                                                <button onClick={() => onEdit(item)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors" title="Modifier">
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => onClone(item)} className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded transition-colors" title="Cloner">
                                                    <Copy className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => onToggleStatus(item)}
                                                    className={`p-2 rounded transition-colors ${item.status === 'ACTIVE' ? 'text-slate-400 hover:text-red-600 hover:bg-red-50' : 'text-red-400 hover:text-green-600 hover:bg-green-50'}`}
                                                    title={item.status === 'ACTIVE' ? 'Désactiver' : 'Activer'}
                                                >
                                                    {item.status === 'ACTIVE' ? <X className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); if (confirm('Supprimer cet article ?')) onDelete(item.id); }}
                                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                    title="Supprimer"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* PAGINATION */}
            <div className="p-3 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex justify-between items-center text-xs shrink-0">
                <div className="flex items-center gap-2">
                    <span className="text-slate-500 dark:text-slate-400">
                        {sortedCatalog.length} article{sortedCatalog.length !== 1 ? 's' : ''}
                    </span>
                    <select
                        value={itemsPerPage}
                        onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                        className="text-xs border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 p-1"
                    >
                        {viewMode === 'card'
                            ? [12, 24, 48].map(n => <option key={n} value={n}>{n}</option>)
                            : [5, 10, 25, 50].map(n => <option key={n} value={n}>{n}</option>)
                        }
                    </select>
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
