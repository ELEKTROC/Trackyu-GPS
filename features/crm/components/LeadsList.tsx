import React, { useState, useMemo } from 'react';
import { Lead } from '../../../types';
import { Card } from '../../../components/Card';
import { Pagination } from '../../../components/Pagination';
import { useConfirmDialog } from '../../../components/ConfirmDialog';
import { useTableSort } from '../../../hooks/useTableSort';
import { SortableHeader } from '../../../components/SortableHeader';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { MobileCard, MobileCardList, MobileCardAction } from '../../../components/MobileCard';
import {
    CheckCircle,
    FileText,
    Edit,
    Trash2,
    Settings2,
    Clock,
    Plus,
    Calendar,
    Users,
    SearchX
} from 'lucide-react';
import { EmptyState } from '../../../components/EmptyState';

interface LeadsListProps {
    leads: Lead[];
    searchTerm: string;
    selectedCompany: string;
    filters?: any;
    tasks?: any[];
    selectedLeadIds: Set<string>;
    onToggleSelection: (id: string) => void;
    onToggleAllSelection: (leads: Lead[]) => void;
    onLeadClick: (lead: Lead) => void;
    onStatusChange: (leadId: string, newStatus: string) => void;
    onEditLead?: (lead: Lead) => void;
    onDeleteLead: (id: string) => void;
    onConvertToClient: (lead: Lead) => void;
    onCreateQuote?: (lead: Lead) => void;
    onAddTask?: (lead: Lead) => void;
    visibleColumns?: Set<string>;
    toggleColumn?: (id: string) => void;
}

export const LeadsList: React.FC<LeadsListProps> = ({
    leads,
    searchTerm,
    selectedCompany,
    filters,
    tasks = [],
    selectedLeadIds,
    onToggleSelection,
    onToggleAllSelection,
    onLeadClick,
    onStatusChange,
    onEditLead,
    onDeleteLead,
    onConvertToClient,
    onCreateQuote,
    onAddTask,
    visibleColumns = new Set(['company', 'contact', 'status', 'value', 'actions']),
    toggleColumn
}) => {
    const { confirm, ConfirmDialogComponent } = useConfirmDialog();
    const isMobile = useIsMobile();
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [isColumnConfigOpen, setIsColumnConfigOpen] = useState(false);

    const allColumns = [
        { id: 'company', label: 'Société' },
        { id: 'contact', label: 'Contact' },
        { id: 'reseller', label: 'Revendeur' },
        { id: 'assigned', label: 'Commercial' },
        { id: 'products', label: 'Produits' },
        { id: 'value', label: 'Valeur Pot.' },
        { id: 'status', label: 'Statut' },
        { id: 'date', label: 'Créé le' },
        { id: 'age', label: 'Durée' },
    ];

    const handleToggleColumn = (id: string) => {
        if (toggleColumn) {
            toggleColumn(id);
        }
    };

    const filteredLeads = useMemo(() => leads.filter(l => {
        const matchesSearch = ((l.companyName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (l.contactName?.toLowerCase() || '').includes(searchTerm.toLowerCase()));

        const matchesCompany = (selectedCompany === 'all' || l.companyName === selectedCompany);
        const matchesStatus = (!filters || filters.status === 'ALL' || l.status === filters.status);
        const matchesReseller = (!filters || filters.reseller === 'ALL' || l.resellerId === filters.reseller);
        const matchesAssigned = (!filters || filters.assignedTo === 'ALL' || l.assignedTo === filters.assignedTo);

        return matchesSearch && matchesCompany && matchesStatus && matchesReseller && matchesAssigned;
    }), [leads, searchTerm, selectedCompany, filters]);

    const LEAD_SORT_ACCESSORS: Record<string, (l: Lead) => any> = useMemo(() => ({
        value: (l) => l.estimatedValue || 0,
        date: (l) => l.createdAt || '',
    }), []);

    const { sortedItems: sortedLeads, sortConfig, handleSort } = useTableSort(filteredLeads, undefined, LEAD_SORT_ACCESSORS);

    const totalPages = Math.ceil(sortedLeads.length / itemsPerPage);
    const paginatedLeads = sortedLeads.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'WON': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
            case 'LOST': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
            case 'PROPOSAL': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
            case 'QUALIFIED': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
            case 'NEGOTIATION': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
            default: return 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
        }
    };
    const getStatusLabel = (status: string) => {
        const map: Record<string, string> = { NEW: 'Nouveau', CONTACTED: 'Contacté', QUALIFIED: 'Qualifié', PROPOSAL: 'Proposition', NEGOTIATION: 'Négociation', WON: 'Gagné', LOST: 'Perdu' };
        return map[status] || status;
    };
    const getBorderColor = (status: string) => {
        switch (status) {
            case 'WON': return 'border-l-green-500';
            case 'LOST': return 'border-l-red-500';
            case 'PROPOSAL': return 'border-l-purple-500';
            case 'QUALIFIED': return 'border-l-blue-500';
            case 'NEGOTIATION': return 'border-l-orange-500';
            case 'CONTACTED': return 'border-l-blue-400';
            default: return 'border-l-slate-400';
        }
    };

    return (
        <>
        {/* Mobile cards */}
        {isMobile && (
          <MobileCardList className="mb-20">
            {paginatedLeads.length === 0 ? (
              leads.length === 0
                ? <EmptyState compact icon={Users} title="Aucun lead" description="Créez votre premier lead pour démarrer votre pipeline commercial." />
                : <EmptyState compact icon={SearchX} title="Aucun résultat" description="Aucun lead ne correspond à votre recherche ou aux filtres actifs." />
            ) : paginatedLeads.map(lead => {
              const createdDate = lead.createdAt ? new Date(lead.createdAt) : null;
              const daysSinceCreation = createdDate ? Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24)) : null;
              return (
                <MobileCard key={lead.id} borderColor={getBorderColor(lead.status)} onClick={() => onLeadClick(lead)}>
                  {/* Primary: Société + Valeur */}
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-sm text-slate-800 dark:text-white truncate">{lead.companyName}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{lead.contactName}{lead.email ? ` · ${lead.email}` : ''}</p>
                    </div>
                    {lead.estimatedValue ? <p className="font-bold text-sm text-slate-700 dark:text-slate-300 shrink-0">{lead.estimatedValue.toLocaleString()}</p> : null}
                  </div>
                  {/* Secondary: Statut + Durée */}
                  <div className="flex items-center gap-2 text-xs mb-2 flex-wrap">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${getStatusColor(lead.status)}`}>{getStatusLabel(lead.status)}</span>
                    {daysSinceCreation !== null && (
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${daysSinceCreation > 30 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : daysSinceCreation > 7 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'}`}>{daysSinceCreation}j</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {onEditLead && <MobileCardAction color="blue" onClick={(e) => { e.stopPropagation(); onEditLead!(lead); }}>Modifier</MobileCardAction>}
                    {onCreateQuote && <MobileCardAction color="purple" onClick={(e) => { e.stopPropagation(); onCreateQuote!(lead); }}>Devis</MobileCardAction>}
                    {lead.status === 'WON' && <MobileCardAction color="green" onClick={(e) => { e.stopPropagation(); onConvertToClient(lead); }}>Convertir</MobileCardAction>}
                  </div>
                </MobileCard>
              );
            })}
          </MobileCardList>
        )}

        {!isMobile && <Card className="flex-1 flex flex-col overflow-hidden border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex-1 overflow-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-300 sticky top-0 z-10">
                        <tr>
                            <th className="px-4 py-3 w-10 border-b dark:border-slate-700">
                                <input
                                    type="checkbox"
                                    checked={paginatedLeads.length > 0 && paginatedLeads.every(l => selectedLeadIds.has(l.id))}
                                    onChange={() => onToggleAllSelection(paginatedLeads)}
                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                            </th>
                            {visibleColumns.has('company') && <SortableHeader label="Société" sortKey="companyName" currentSortKey={sortConfig.key} currentDirection={sortConfig.direction} onSort={handleSort} />}
                            {visibleColumns.has('contact') && <SortableHeader label="Contact" sortKey="contactName" currentSortKey={sortConfig.key} currentDirection={sortConfig.direction} onSort={handleSort} />}
                            {visibleColumns.has('reseller') && <SortableHeader label="Revendeur" sortKey="resellerId" currentSortKey={sortConfig.key} currentDirection={sortConfig.direction} onSort={handleSort} />}
                            {visibleColumns.has('assigned') && <SortableHeader label="Commercial" sortKey="assignedTo" currentSortKey={sortConfig.key} currentDirection={sortConfig.direction} onSort={handleSort} />}
                            {visibleColumns.has('products') && <th className="px-6 py-3 text-xs font-bold uppercase border-b dark:border-slate-700">Produits</th>}
                            {visibleColumns.has('value') && <SortableHeader label="Valeur Pot." sortKey="value" currentSortKey={sortConfig.key} currentDirection={sortConfig.direction} onSort={handleSort} className="text-right" />}
                            {visibleColumns.has('status') && <SortableHeader label="Statut" sortKey="status" currentSortKey={sortConfig.key} currentDirection={sortConfig.direction} onSort={handleSort} />}
                            {visibleColumns.has('date') && <SortableHeader label="Créé le" sortKey="date" currentSortKey={sortConfig.key} currentDirection={sortConfig.direction} onSort={handleSort} />}
                            {visibleColumns.has('age') && <th className="px-6 py-3 text-xs font-bold uppercase border-b dark:border-slate-700">Durée</th>}
                            <th className="px-6 py-3 text-xs font-bold uppercase border-b dark:border-slate-700 text-right flex items-center justify-end gap-2">
                                <span>Actions</span>
                                <div className="relative">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setIsColumnConfigOpen(!isColumnConfigOpen); }}
                                        className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors text-slate-400"
                                        title="Configurer les colonnes"
                                    >
                                        <Settings2 className="w-3.5 h-3.5" />
                                    </button>
                                    {isColumnConfigOpen && (
                                        <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-20 p-3 space-y-1 animate-in fade-in slide-in-from-top-2">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Colonnes visibles</p>
                                            {allColumns.map(col => (
                                                <label key={col.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 rounded cursor-pointer transition-colors">
                                                    <input
                                                        type="checkbox"
                                                        checked={visibleColumns.has(col.id)}
                                                        onChange={() => handleToggleColumn(col.id)}
                                                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3 h-3"
                                                    />
                                                    <span className="text-xs text-slate-700 dark:text-slate-300">{col.label}</span>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700 bg-white dark:bg-slate-900">
                        {paginatedLeads.length === 0 && (
                            <tr>
                                <td colSpan={10}>
                                    {leads.length === 0
                                        ? <EmptyState icon={Users} title="Aucun lead" description="Créez votre premier lead pour démarrer votre pipeline commercial." />
                                        : <EmptyState icon={SearchX} title="Aucun résultat" description="Aucun lead ne correspond à votre recherche ou aux filtres actifs." />
                                    }
                                </td>
                            </tr>
                        )}
                        {paginatedLeads.map(lead => {
                            const createdDate = lead.createdAt ? new Date(lead.createdAt) : null;
                            const daysSinceCreation = createdDate
                                ? Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24))
                                : null;

                            return (
                                <tr
                                    key={lead.id}
                                    onClick={() => onLeadClick(lead)}
                                    className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group ${selectedLeadIds.has(lead.id) ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                                >
                                    <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                                        <input
                                            type="checkbox"
                                            checked={selectedLeadIds.has(lead.id)}
                                            onChange={() => onToggleSelection(lead.id)}
                                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                        />
                                    </td>
                                    {visibleColumns.has('company') && (
                                        <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-200 text-sm">
                                            <div className="flex items-center gap-2">
                                                {lead.companyName}
                                                {tasks.some(t => t.relatedTo?.id === lead.id && t.status !== 'DONE') && (
                                                    <span className="flex h-2 w-2 relative" title="Tâches en attente">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                    )}
                                    {visibleColumns.has('contact') && (
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300 text-sm">
                                            <div>{lead.contactName}</div>
                                            <div className="text-xs text-slate-400">{lead.email}</div>
                                        </td>
                                    )}
                                    {visibleColumns.has('reseller') && (
                                        <td className="px-6 py-4 text-xs text-slate-500 dark:text-slate-400">
                                            {lead.resellerName || 'Global'}
                                        </td>
                                    )}
                                    {visibleColumns.has('assigned') && (
                                        <td className="px-6 py-4 text-xs text-slate-500 dark:text-slate-400">
                                            {lead.assignedTo || 'Non assigné'}
                                        </td>
                                    )}
                                    {visibleColumns.has('products') && (
                                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                                            {lead.interestedProducts && lead.interestedProducts.length > 0 ? (
                                                <div className="flex flex-wrap gap-1">
                                                    {lead.interestedProducts.slice(0, 2).map((p, idx) => (
                                                        <span key={idx} className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[10px] border border-slate-200 dark:border-slate-700 truncate max-w-[100px] inline-block" title={p.name}>
                                                            {p.name}
                                                        </span>
                                                    ))}
                                                    {lead.interestedProducts.length > 2 && (
                                                        <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[10px] border border-slate-200 dark:border-slate-700">
                                                            +{lead.interestedProducts.length - 2}
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-slate-400 italic text-xs">-</span>
                                            )}
                                        </td>
                                    )}
                                    {visibleColumns.has('value') && (
                                        <td className="px-6 py-4 text-sm font-mono text-right font-bold text-slate-700 dark:text-slate-300">
                                            {lead.potentialValue.toLocaleString()}
                                        </td>
                                    )}
                                    {visibleColumns.has('status') && (
                                        <td className="px-6 py-4">
                                            <select
                                                value={lead.status}
                                                onClick={(e) => e.stopPropagation()}
                                                onChange={(e) => onStatusChange(lead.id, e.target.value)}
                                                className={`text-[10px] font-bold py-1 px-2 rounded-full border transition-colors outline-none ${lead.status === 'NEW' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                                    lead.status === 'WON' ? 'bg-green-100 text-green-700 border-green-200' :
                                                        lead.status === 'LOST' ? 'bg-red-100 text-red-700 border-red-200' :
                                                            'bg-blue-100 text-blue-700 border-blue-200'
                                                    }`}
                                            >
                                                <option value="NEW">Nouveau</option>
                                                <option value="CONTACTED">Contacté</option>
                                                <option value="QUALIFIED">Qualifié</option>
                                                <option value="PROPOSAL">Proposition</option>
                                                <option value="NEGOTIATION">Négociation</option>
                                                <option value="WON">Gagné</option>
                                                <option value="LOST">Perdu</option>
                                            </select>
                                        </td>
                                    )}
                                    {visibleColumns.has('date') && (
                                        <td className="px-6 py-4 text-xs text-slate-500 dark:text-slate-400">
                                            {createdDate ? createdDate.toLocaleDateString('fr-FR') : '-'}
                                        </td>
                                    )}
                                    {visibleColumns.has('age') && (
                                        <td className="px-6 py-4 text-xs">
                                            {daysSinceCreation !== null ? (
                                                <span className={`px-2 py-0.5 rounded-full ${daysSinceCreation > 30 ? 'bg-red-100 text-red-700' :
                                                    daysSinceCreation > 7 ? 'bg-orange-100 text-orange-700' :
                                                        'bg-green-100 text-green-700'
                                                    }`}>
                                                    {daysSinceCreation}j
                                                </span>
                                            ) : '-'}
                                        </td>
                                    )}
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {onAddTask && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onAddTask(lead); }}
                                                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                                                    title="Planifier une tâche"
                                                >
                                                    <Calendar className="w-4 h-4" />
                                                </button>
                                            )}
                                            {lead.status === 'WON' && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onConvertToClient(lead);
                                                    }}
                                                    className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
                                                    title="Convertir en Client"
                                                >
                                                    <CheckCircle className="w-4 h-4" />
                                                </button>
                                            )}
                                            {onCreateQuote && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onCreateQuote(lead); }}
                                                    className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded transition-colors"
                                                    title="Créer un devis"
                                                >
                                                    <FileText className="w-4 h-4" />
                                                </button>
                                            )}
                                            <button
                                                onClick={async (e) => {
                                                    e.stopPropagation();
                                                    if (await confirm({ message: 'Supprimer ce lead ?', variant: 'danger', title: 'Confirmer la suppression', confirmLabel: 'Supprimer' })) onDeleteLead(lead.id);
                                                }}
                                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
            {/* PAGINATION */}
            <div className="p-3 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex justify-between items-center text-xs">
                <div className="flex items-center gap-2">
                    <span className="text-slate-500 dark:text-slate-400">Lignes:</span>
                    <select
                        value={itemsPerPage}
                        onChange={(e) => setItemsPerPage(Number(e.target.value))}
                        className="text-xs border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 p-1"
                    >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                    </select>
                </div>
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages || 1}
                    onPageChange={setCurrentPage}
                />
            </div>
        </Card>}
        <ConfirmDialogComponent />
        </>
    );
};
