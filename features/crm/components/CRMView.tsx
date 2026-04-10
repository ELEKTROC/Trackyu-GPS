import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Users, 
  Briefcase, 
  Plus, 
  Search, 
  Filter, 
  List, 
  LayoutGrid, 
  ShoppingBag, 
  ChevronDown,
  Download, 
  Upload,
  Award,
  FileText
} from 'lucide-react';
import { Modal } from '../../../components/Modal';
import { ImportModal } from '../../../components/ImportModal';
import { Lead, Client, View, CatalogItem, Tier } from '../../../types';
import type { LeadStatus } from '../../../types/crm';
import { useDataContext } from '../../../contexts/DataContext';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { useToast } from '../../../contexts/ToastContext';
import { TOAST } from '../../../constants/toastMessages';
import { mapError } from '../../../utils/errorMapper';
import { useConfirmDialog } from '../../../components/ConfirmDialog';
import { useAuth } from '../../../contexts/AuthContext';
import { generatePDF } from '../../../services/pdfService';
import { useTenantBranding } from '../../../hooks/useTenantBranding';
import { api } from '../../../services/api';
import { useQueryClient } from '@tanstack/react-query';
import { TierDetailModal } from './TierDetailModal';
import { TierForm } from './TierForm';
import { TierList } from './TierList';
import { ContractsView } from './ContractsView';

// Nouveaux composants refactorisés
import { CatalogForm } from './CatalogForm';
import { CatalogDetail } from './CatalogDetail';
import { CatalogList } from './CatalogList';
import { LeadsKanban } from './LeadsKanban';
import { LeadsList } from './LeadsList';
import { LeadFormModal } from './LeadFormModal';

// --- TYPES & PROPS ---
interface CRMViewProps {
    mode?: 'LEADS' | 'CLIENTS' | 'CATALOG' | 'CONTRACTS';
    onNavigate?: (view: View, params?: Record<string, unknown>) => void;
    onCreateQuote?: (lead: Lead) => void;
    dateRange?: { start: string; end: string };
}

export const CRMView: React.FC<CRMViewProps> = ({ mode = 'LEADS', onNavigate, onCreateQuote, dateRange }) => {
    const { 
        leads, clients, vehicles, contracts, 
        updateLeadStatus, deleteClient, deleteLead, addClient, addLead, updateLead,
        catalogItems, addCatalogItem, updateCatalogItem, deleteCatalogItem,
        tiers 
    } = useDataContext();
    const { showToast } = useToast();
    const { user } = useAuth();
    const { confirm, ConfirmDialogComponent } = useConfirmDialog();
    const queryClient = useQueryClient();
    const { branding } = useTenantBranding();
    const isMobile = useIsMobile();

    // --- DATE FILTERING ---
    const filteredLeadsByDate = useMemo(() => {
        if (!dateRange) return leads;
        return leads.filter(l => {
            const date = new Date(l.createdAt).toISOString().split('T')[0];
            return date >= dateRange.start && date <= dateRange.end;
        });
    }, [leads, dateRange]);

    const filteredClientsByDate = useMemo(() => {
        if (!dateRange) return clients;
        return clients.filter(c => {
            const date = new Date(c.createdAt).toISOString().split('T')[0];
            return date >= dateRange.start && date <= dateRange.end;
        });
    }, [clients, dateRange]);

    // --- VIEW STATE ---
    // Force LIST on mobile (Kanban is unusable on small screens)
    const [viewMode, setViewMode] = useState<'KANBAN' | 'LIST'>(() => isMobile ? 'LIST' : 'KANBAN');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCompany, setSelectedCompany] = useState('all');
    
    // --- MODALS STATE ---
    const [isLeadFormOpen, setIsLeadFormOpen] = useState(false);
    const [isQuickLeadFormOpen, setIsQuickLeadFormOpen] = useState(false);
    const [editingLead, setEditingLead] = useState<Partial<Lead>>({});
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [isLeadDetailOpen, setIsLeadDetailOpen] = useState(false);
    const [isWinModalOpen, setIsWinModalOpen] = useState(false);
    const [justWonLead, setJustWonLead] = useState<Lead | null>(null);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    // Client State
    const [isClientFormOpen, setIsClientFormOpen] = useState(false);
    const [editingClient, setEditingClient] = useState<Partial<Tier> | null>(null);
    const [isClientDetailOpen, setIsClientDetailOpen] = useState(false);
    const [selectedClient, setSelectedClient] = useState<Tier | null>(null);

    // Catalog State
    const [isCatalogFormOpen, setIsCatalogFormOpen] = useState(false);
    const [editingCatalogItem, setEditingCatalogItem] = useState<Partial<CatalogItem> | null>(null);
    const [isCatalogDetailOpen, setIsCatalogDetailOpen] = useState(false);
    const [selectedCatalogItem, setSelectedCatalogItem] = useState<CatalogItem | null>(null);

    // Status Change Modal
    const [statusChangeModal, setStatusChangeModal] = useState<{ isOpen: boolean; leadId: string | null; newStatus: string | null; reason: string }>({
        isOpen: false, leadId: null, newStatus: null, reason: ''
    });

    // Leads selection
    const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
    const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);

    // Filter state
    const [filters, setFilters] = useState<{ status: string; plan: string; reseller: string; category: string }>({ status: 'ALL', plan: 'ALL', reseller: 'ALL', category: 'ALL' });
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const filterMenuRef = useRef<HTMLDivElement>(null);

    // Unique companies for filter
    const uniqueCompanies = useMemo(() => {
        if (mode === 'LEADS') {
            return Array.from(new Set(leads.map(l => l.companyName))).sort();
        } else if (mode === 'CLIENTS') {
            return Array.from(new Set(clients.map(c => c.name))).sort();
        }
        return [];
    }, [mode, leads, clients]);

    // Reset filter when mode changes
    useEffect(() => {
        setSelectedCompany('all');
    }, [mode]);

    // --- HANDLERS ---
    const handleStatusChangeRequest = (leadId: string, newStatus: string) => {
        setStatusChangeModal({ isOpen: true, leadId, newStatus, reason: '' });
    };

    const confirmStatusChange = () => {
        if (statusChangeModal.leadId && statusChangeModal.newStatus) {
            updateLeadStatus(statusChangeModal.leadId, statusChangeModal.newStatus as LeadStatus);
            
            // Show win celebration when moving to WON
            if (statusChangeModal.newStatus === 'WON') {
                const wonLead = leads.find(l => l.id === statusChangeModal.leadId);
                if (wonLead) {
                    setJustWonLead(wonLead);
                    setIsWinModalOpen(true);
                }
            }
            
            setStatusChangeModal({ isOpen: false, leadId: null, newStatus: null, reason: '' });
            showToast(TOAST.FINANCE.STATUS_CHANGED(statusChangeModal.newStatus!), 'success');
        }
    };

    const handleDragStart = (e: React.DragEvent, id: string) => {
        setDraggedLeadId(id);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOver = (e: React.DragEvent) => { 
        e.preventDefault(); 
        e.dataTransfer.dropEffect = "move"; 
    };
    
    const handleDrop = (e: React.DragEvent, targetStatus: string) => {
        e.preventDefault();
        if (!draggedLeadId) return;
        handleStatusChangeRequest(draggedLeadId, targetStatus);
        setDraggedLeadId(null);
    };

    const handleConvertToClient = async (lead: Lead) => {
        const confirmed = await confirm({
            title: 'Convertir en client',
            message: `Voulez-vous convertir le lead "${lead.companyName}" en client ? Un compte client sera créé automatiquement.`,
            confirmLabel: 'Convertir',
            variant: 'info'
        });
        if (!confirmed) return;

        try {
            const result = await api.crm.convertLead(lead.id, { createContract: false });
            if (result.error) {
                showToast(mapError(result.error, 'lead'), 'error');
                return;
            }
            // Refresh data
            queryClient.invalidateQueries({ queryKey: ['leads'] });
            queryClient.invalidateQueries({ queryKey: ['tiers'] });
            queryClient.invalidateQueries({ queryKey: ['clients'] });
            
            // Show win celebration
            setJustWonLead(lead);
            setIsWinModalOpen(true);
            showToast(TOAST.CRM.LEAD_CONVERTED(lead.companyName), 'success');
        } catch (error: unknown) {
            showToast(mapError(error, 'lead'), 'error');
        }
    };

    const toggleLeadSelection = (id: string) => {
        const newSelected = new Set(selectedLeadIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedLeadIds(newSelected);
    };

    const toggleAllLeads = (filteredLeads: Lead[]) => {
        if (selectedLeadIds.size === filteredLeads.length) {
            setSelectedLeadIds(new Set());
        } else {
            setSelectedLeadIds(new Set(filteredLeads.map(l => l.id)));
        }
    };

    const handleSaveLead = (leadData: Lead) => {
        const onSuccess = () => {
            showToast(TOAST.CRM.LEAD_SAVED(!!editingLead.id), 'success');
            setIsLeadFormOpen(false);
            setEditingLead({});
        };
        const onError = (error: unknown) => {
            const msg = mapError(error, 'lead');
            showToast(msg, 'error');
        };
        if (editingLead.id) {
            updateLead(leadData, { onSuccess, onError });
        } else {
            addLead(leadData, { onSuccess, onError });
        }
    };

    const handleSaveClient = (data: any) => {
        const client: Client = {
            id: data.id || `CLI-${Date.now()}`,
            tenantId: data.tenantId || user?.tenantId || '',
            name: data.name || '',
            type: 'B2B',
            status: data.status || 'ACTIVE',
            contactName: data.contactName || data.name,
            email: data.email,
            phone: data.phone,
            address: data.address,
            city: data.city,
            country: data.country,
            subscriptionPlan: data.subscriptionPlan || data.clientData?.subscriptionPlan || 'Standard',
            resellerId: data.resellerId || data.clientData?.resellerId,
            resellerName: data.resellerName,
            createdAt: data.createdAt instanceof Date ? data.createdAt : new Date(),
            sector: data.sector || 'Transport',
            segment: data.segment || 'Standard',
            language: data.language || 'Français',
            paymentTerms: data.paymentTerms || '30 jours',
            currency: data.currency || 'EUR',
            paymentStatus: 'UP_TO_DATE',
            balance: 0,
            contacts: []
        };

        addClient(client, {
            onSuccess: () => {
                showToast(TOAST.CRM.CLIENT_CREATED(client.name), 'success');
                setIsClientFormOpen(false);
                setEditingClient(null);
            },
            onError: (error: unknown) => {
                const msg = mapError(error, 'client');
                showToast(msg, 'error');
            }
        });
    };

    const handleSaveCatalogItem = (item: CatalogItem) => {
        if (editingCatalogItem?.id) {
            updateCatalogItem(item);
            showToast(TOAST.CRM.CATALOG_ARTICLE_SAVED(true), 'success');
        } else {
            addCatalogItem(item);
            showToast(TOAST.CRM.CATALOG_ARTICLE_SAVED(false), 'success');
        }
        setIsCatalogFormOpen(false);
        setEditingCatalogItem(null);
    };

    const handleDeleteCatalogItem = async (id: string) => {
        try {
            await deleteCatalogItem(id);
            showToast(TOAST.CRM.CATALOG_ARTICLE_DELETED, 'success');
        } catch (error: unknown) {
            showToast(mapError(error, 'catalog'), 'error');
        }
    };

    const handleCloneCatalogItem = (item: CatalogItem) => {
        const clonedItem = { ...item, id: ``, name: `${item.name} (Copie)` };
        setEditingCatalogItem(clonedItem);
        setIsCatalogFormOpen(true);
    };

    const handleToggleCatalogStatus = (item: CatalogItem) => {
        const newStatus = item.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
        updateCatalogItem({ ...item, status: newStatus });
        showToast(TOAST.CRM.CATALOG_ARTICLE_TOGGLED(newStatus === 'ACTIVE'), 'success');
    };

    const handleImport = async (data: any[]) => {
        let count = 0;
        for (const item of data) {
            try {
                if (mode === 'CLIENTS') {
                    const client: Client = {
                        id: item.id || `CLI-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                        name: item.name || 'Nouveau Client',
                        contactName: item.contact || 'Contact Inconnu',
                        email: item.email || 'email@example.com',
                        phone: item.phone || '0000000000',
                        address: item.address || 'Adresse Inconnue',
                        status: 'ACTIVE',
                        type: 'B2B',
                        subscriptionPlan: 'STANDARD',
                        tenantId: user?.tenantId || '',
                        createdAt: new Date(),
                        resellerId: item.resellerId,
                        resellerName: item.resellerName
                    };
                    addClient(client);
                } else if (mode === 'LEADS') {
                    const lead: Partial<Lead> = {
                        companyName: item.companyName || item.company || 'Société Inconnue',
                        contactName: item.contactName || item.contact || 'Contact Inconnu',
                        email: item.email || '',
                        phone: item.phone || '',
                        status: item.status || 'NEW',
                        potentialValue: parseFloat(item.potentialValue) || 0,
                        type: item.type || 'B2B',
                        sector: item.sector || '',
                        source: item.source || 'Import CSV',
                        notes: item.notes || '',
                        resellerId: item.resellerId,
                        resellerName: item.resellerName
                    };
                    await api.leads.create(lead as Lead);
                    queryClient.invalidateQueries({ queryKey: ['leads'] });
                } else if (mode === 'CATALOG') {
                    const newItem: CatalogItem = {
                        id: `CAT-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                        name: item.name || 'Nouvel Article',
                        type: item.type || 'Produit',
                        category: item.category || 'Matériel',
                        price: parseFloat(item.price) || 0,
                        unit: item.unit || 'unité',
                        status: 'ACTIVE',
                        resellerId: item.resellerId,
                        resellerName: item.resellerName
                    };
                    addCatalogItem(newItem);
                }
                count++;
            } catch (e) {
                // Import error handled silently
            }
        }
        showToast(TOAST.IO.IMPORT_SUCCESS(count), 'success');
    };

    const handleExport = () => {
        try {
            if (mode === 'CLIENTS') {
                const columns = ['id', 'company', 'contact', 'email', 'phone', 'status', 'plan', 'resellerName'];
                const data = clients.map(c => ({
                    id: c.id, company: c.name, contact: c.contactName, email: c.email,
                    phone: c.phone, status: c.status, plan: c.subscriptionPlan, resellerName: c.resellerName || 'Global'
                }));
                generatePDF('Liste des Clients', columns, data, `clients_${new Date().toISOString().split('T')[0]}.pdf`, { orientation: 'landscape', branding });
            } else if (mode === 'LEADS') {
                const columns = ['companyName', 'contactName', 'email', 'phone', 'type', 'sector', 'status', 'potentialValue', 'source', 'resellerName'];
                const data = filteredLeadsByDate.map(l => ({
                    companyName: l.companyName, contactName: l.contactName, email: l.email,
                    phone: l.phone, type: l.type || 'B2B', sector: l.sector || '', 
                    status: l.status, potentialValue: l.potentialValue, 
                    source: l.source || '', resellerName: l.resellerName || 'Global'
                }));
                generatePDF('Liste des Leads', columns, data, `leads_${new Date().toISOString().split('T')[0]}.pdf`, { orientation: 'landscape', branding });
            } else if (mode === 'CATALOG') {
                const columns = ['id', 'name', 'type', 'category', 'price', 'status', 'resellerName'];
                const data = catalogItems.map(c => ({
                    id: c.id, name: c.name, type: c.type, category: c.category,
                    price: c.price, status: c.status, resellerName: c.resellerName || 'Global'
                }));
                generatePDF('Catalogue', columns, data, `catalog_${new Date().toISOString().split('T')[0]}.pdf`, { orientation: 'landscape', branding });
            }
            showToast(TOAST.IO.EXPORT_SUCCESS('PDF'), 'success');
        } catch (e) {
            // Error reported via toast
            showToast(TOAST.IO.EXPORT_ERROR(), 'error');
        }
    };

    const openClientDetail = (tier: Tier) => {
        setSelectedClient(tier);
        setIsClientDetailOpen(true);
    };

    // --- RENDER ---
    return (
        <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-500 sm:h-[calc(100vh-140px)] sm:flex sm:flex-col">
            {/* HEADER CONTROLS */}
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center shrink-0">
                <h2 className="hidden sm:flex text-xl font-bold text-slate-800 dark:text-white items-center gap-2">
                    {mode === 'LEADS' ? <Users className="w-6 h-6 text-blue-600" /> : mode === 'CLIENTS' ? <Briefcase className="w-6 h-6 text-green-600" /> : <ShoppingBag className="w-6 h-6 text-purple-600" />}
                    {mode === 'LEADS' ? 'Gestion des Pistes (CRM)' : mode === 'CLIENTS' ? 'Base Clients' : 'Catalogue Produits & Services'}
                </h2>
                <div className="flex flex-wrap gap-2 items-center">
                    {/* Search */}
                    <div className="relative flex-1 sm:flex-none">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Rechercher..."
                            className="pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-white w-full sm:w-64"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/* Company Filter — desktop only */}
                    {!isMobile && (mode === 'LEADS' || mode === 'CLIENTS') && uniqueCompanies.length > 0 && (
                        <div className="relative">
                            <select
                                value={selectedCompany}
                                onChange={(e) => setSelectedCompany(e.target.value)}
                                className="pl-3 pr-8 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-white appearance-none cursor-pointer min-w-[150px]"
                            >
                                <option value="all">Toutes les sociétés</option>
                                {uniqueCompanies.map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                    )}

                    {/* View Mode Toggle — desktop only */}
                    {!isMobile && mode === 'LEADS' && (
                        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                            <button onClick={() => setViewMode('KANBAN')} className={`p-1.5 rounded ${viewMode === 'KANBAN' ? 'bg-white dark:bg-slate-700 shadow text-blue-600' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`} title="Vue Kanban">
                                <LayoutGrid className="w-4 h-4" />
                            </button>
                            <button onClick={() => setViewMode('LIST')} className={`p-1.5 rounded ${viewMode === 'LIST' ? 'bg-white dark:bg-slate-700 shadow text-blue-600' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`} title="Vue Liste">
                                <List className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                    {/* Action Buttons */}
                    {mode === 'LEADS' && (
                        <>
                            {!isMobile && (
                                <button onClick={() => setIsImportModalOpen(true)} className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600">
                                    <Download className="w-4 h-4" /> Import CSV
                                </button>
                            )}
                            <button
                                onClick={() => setIsQuickLeadFormOpen(true)}
                                className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-1.5 transition-colors shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600"
                                title="Saisie rapide"
                            >
                                <Plus className="w-4 h-4" />
                                {!isMobile && 'Saisie rapide'}
                            </button>
                            <button onClick={() => { setEditingLead({}); setIsLeadFormOpen(true); }} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors shadow-sm">
                                <Plus className="w-4 h-4" /> {isMobile ? 'Lead' : 'Nouveau Lead'}
                            </button>
                        </>
                    )}
                    {mode === 'CLIENTS' && (
                        <button onClick={() => { setEditingClient(null); setIsClientFormOpen(true); }} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors shadow-sm">
                            <Plus className="w-4 h-4" /> {isMobile ? 'Client' : 'Nouveau Client'}
                        </button>
                    )}
                    {mode === 'CATALOG' && (
                        <button onClick={() => { setEditingCatalogItem(null); setIsCatalogFormOpen(true); }} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors shadow-sm">
                            <Plus className="w-4 h-4" /> {isMobile ? 'Article' : 'Nouvel Article'}
                        </button>
                    )}

                    {/* Filter & Export */}
                    <div className="flex gap-2">
                        <div className="relative" ref={filterMenuRef}>
                            <button onClick={() => setIsFilterOpen(!isFilterOpen)} className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors flex items-center gap-1.5">
                                <Filter className="w-4 h-4" /> <span className="text-sm font-medium">Filtres</span>
                            </button>
                            {isFilterOpen && (
                                <div className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-20 p-4 space-y-4 animate-in fade-in slide-in-from-top-2">
                                    {mode === 'CATALOG' && (
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Catégorie</label>
                                            <select value={filters.category} onChange={e => setFilters(f => ({...f, category: e.target.value}))} className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-sm">
                                                <option value="ALL">Toutes</option>
                                                <option value="Matériel">Matériel</option>
                                                <option value="Abonnement">Abonnement</option>
                                                <option value="Prestation">Prestation</option>
                                                <option value="Package">Package</option>
                                            </select>
                                        </div>
                                    )}
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Revendeur</label>
                                        <select value={filters.reseller} onChange={e => setFilters(f => ({...f, reseller: e.target.value}))} className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-sm">
                                            <option value="ALL">Tous</option>
                                            {tiers.filter(t => t.type === 'RESELLER').map(r => (
                                                <option key={r.id} value={r.id}>{r.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}
                        </div>
                        <button onClick={() => setIsImportModalOpen(true)} className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300" title="Importer CSV"><Upload className="w-4 h-4"/></button>
                        <button onClick={handleExport} className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300" title="Exporter PDF"><Download className="w-4 h-4"/></button>
                    </div>
                </div>
            </div>

            {/* CONTENT */}
            {mode === 'LEADS' && viewMode === 'KANBAN' && (
                <LeadsKanban 
                    leads={filteredLeadsByDate}
                    searchTerm={searchTerm}
                    selectedCompany={selectedCompany}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onDeleteLead={async (id) => { if(await confirm({ message: 'Supprimer ce lead ?', variant: 'danger', title: 'Confirmer la suppression', confirmLabel: 'Supprimer' })) deleteLead(id); }}
                    onConvertToClient={handleConvertToClient}
                    onEditLead={(lead) => { setEditingLead(lead); setIsLeadFormOpen(true); }}
                />
            )}

            {mode === 'LEADS' && viewMode === 'LIST' && (
                <LeadsList 
                    leads={filteredLeadsByDate}
                    searchTerm={searchTerm}
                    selectedCompany={selectedCompany}
                    selectedLeadIds={selectedLeadIds}
                    onToggleSelection={toggleLeadSelection}
                    onToggleAllSelection={toggleAllLeads}
                    onLeadClick={(lead) => { setSelectedLead(lead); setIsLeadDetailOpen(true); }}
                    onStatusChange={handleStatusChangeRequest}
                    onDeleteLead={(id) => deleteLead(id)}
                    onConvertToClient={handleConvertToClient}
                    onCreateQuote={onCreateQuote}
                />
            )}

            {mode === 'CLIENTS' && (
                <TierList 
                    type="CLIENT"
                    searchTerm={searchTerm}
                    filter={(tier) => selectedCompany === 'all' || tier.name === selectedCompany}
                    onEdit={(tier) => { setEditingClient(tier); setIsClientFormOpen(true); }}
                    onViewDetail={(tier) => openClientDetail(tier)}
                />
            )}

            {mode === 'CATALOG' && (
                <CatalogList
                    catalogItems={catalogItems}
                    searchTerm={searchTerm}
                    categoryFilter={filters.category}
                    resellerFilter={filters.reseller}
                    onEdit={(item) => { setEditingCatalogItem(item); setIsCatalogFormOpen(true); }}
                    onClone={handleCloneCatalogItem}
                    onToggleStatus={handleToggleCatalogStatus}
                    onDelete={handleDeleteCatalogItem}
                    onViewDetail={(item) => { setSelectedCatalogItem(item); setIsCatalogDetailOpen(true); }}
                />
            )}

            {mode === 'CONTRACTS' && <ContractsView />}

            {/* --- MODALS --- */}
            
            {/* Client Detail Modal */}
            <TierDetailModal 
                tier={selectedClient}
                isOpen={isClientDetailOpen}
                onClose={() => { setIsClientDetailOpen(false); setSelectedClient(null); }}
                onEdit={(client) => { setEditingClient(client); setIsClientFormOpen(true); }}
            />

            {/* Client Form Modal */}
            <TierForm 
                isOpen={isClientFormOpen}
                initialData={editingClient ? { ...editingClient, type: 'CLIENT' as const } : {}} 
                initialType="CLIENT"
                onSave={handleSaveClient} 
                onClose={() => setIsClientFormOpen(false)} 
            />

            {/* Lead Form Modal */}
            <LeadFormModal
                isOpen={isLeadFormOpen}
                lead={editingLead}
                catalogItems={catalogItems}
                tiers={tiers}
                existingLeads={leads}
                onSave={handleSaveLead}
                onClose={() => { setIsLeadFormOpen(false); setEditingLead({}); }}
            />

            {/* Quick Lead Form Modal */}
            <LeadFormModal
                isOpen={isQuickLeadFormOpen}
                lead={{}}
                catalogItems={catalogItems}
                tiers={tiers}
                existingLeads={leads}
                onSave={handleSaveLead}
                onClose={() => setIsQuickLeadFormOpen(false)}
                quickMode
            />

            {/* Lead Detail Modal */}
            {selectedLead && (
                <Modal isOpen={isLeadDetailOpen} onClose={() => setIsLeadDetailOpen(false)} title={`Détail Lead: ${selectedLead.companyName}`}>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Contact</label>
                                <p className="font-bold text-slate-800 dark:text-white">{selectedLead.contactName}</p>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Email</label>
                                <p className="text-slate-600 dark:text-slate-300">{selectedLead.email}</p>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Valeur Potentielle</label>
                                <p className="font-bold text-blue-600">{(selectedLead.potentialValue ?? 0).toLocaleString('fr-FR')}</p>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Statut</label>
                                <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                                    selectedLead.status === 'WON' ? 'bg-green-100 text-green-700' : 
                                    selectedLead.status === 'LOST' ? 'bg-red-100 text-red-700' : 
                                    'bg-blue-100 text-blue-700'
                                }`}>{selectedLead.status}</span>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Revendeur</label>
                                <p className="text-slate-600 dark:text-slate-300">{selectedLead.resellerName || 'Global'}</p>
                            </div>
                        </div>
                        
                        <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-2">
                            {onCreateQuote && (
                                <button onClick={() => { setIsLeadDetailOpen(false); onCreateQuote(selectedLead); }} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-bold hover:bg-purple-700 flex items-center gap-2">
                                    <FileText className="w-4 h-4" /> Créer un Devis
                                </button>
                            )}
                            <button onClick={() => setIsLeadDetailOpen(false)} className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800">Fermer</button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Win Celebration Modal */}
            <Modal isOpen={isWinModalOpen} onClose={() => setIsWinModalOpen(false)} title="Opportunité Gagnée !">
                <div className="p-4 text-center">
                    <Award className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
                    <h3 className="text-lg font-bold">Félicitations !</h3>
                    <p className="text-sm text-slate-600">Vous avez gagné l'affaire <strong>{justWonLead?.companyName}</strong>.</p>
                </div>
            </Modal>

            {/* Import Modal */}
            <ImportModal 
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onImport={handleImport}
                title={`Importer des ${mode === 'CLIENTS' ? 'clients' : mode === 'LEADS' ? 'leads' : 'articles'}`}
                requiredColumns={mode === 'CLIENTS' ? ['name', 'contact', 'email'] : mode === 'LEADS' ? ['companyName', 'contactName'] : ['name', 'price']}
                sampleData={
                    mode === 'CLIENTS' ? "name,contact,email,phone,address\nAcme Corp,John Doe,john@acme.com,0102030405,123 Rue de la Paix" :
                    mode === 'LEADS' ? "companyName,contactName,email,phone,type,sector,source,potentialValue,notes\nLead Corp,Jane Doe,jane@lead.com,0600000000,B2B,IT,Site Web,500000,Contact via formulaire" :
                    "name,type,category,price,unit\nGPS Tracker,Produit,Matériel,45000,unité"
                }
            />

            {/* Catalog Form Modal */}
            <Modal isOpen={isCatalogFormOpen} onClose={() => setIsCatalogFormOpen(false)} title={editingCatalogItem?.id ? "Modifier l'article" : "Ajouter un article"} maxWidth="max-w-6xl">
                <CatalogForm 
                    initialData={editingCatalogItem || {}} 
                    onSave={handleSaveCatalogItem} 
                    onCancel={() => setIsCatalogFormOpen(false)} 
                />
            </Modal>

            {/* Catalog Detail Modal */}
            {selectedCatalogItem && (
                <Modal isOpen={isCatalogDetailOpen} onClose={() => setIsCatalogDetailOpen(false)} title="Détail de l'article" maxWidth="max-w-6xl">
                    <CatalogDetail 
                        item={selectedCatalogItem} 
                        onClose={() => setIsCatalogDetailOpen(false)} 
                        onEdit={(item) => {
                            setIsCatalogDetailOpen(false);
                            setEditingCatalogItem(item);
                            setIsCatalogFormOpen(true);
                        }}
                    />
                </Modal>
            )}

            {/* Status Change Modal */}
            <Modal 
                isOpen={statusChangeModal.isOpen} 
                onClose={() => setStatusChangeModal({...statusChangeModal, isOpen: false})} 
                title="Changement de statut"
            >
                <div className="space-y-4">
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                        Vous êtes sur le point de changer le statut vers <span className="font-bold">{statusChangeModal.newStatus}</span>.
                        Veuillez indiquer un motif pour ce changement.
                    </p>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Motif / Commentaire</label>
                        <textarea 
                            className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            rows={3}
                            value={statusChangeModal.reason}
                            onChange={e => setStatusChangeModal({...statusChangeModal, reason: e.target.value})}
                            placeholder="Ex: Client a validé le devis..."
                            autoFocus
                        />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <button onClick={() => setStatusChangeModal({...statusChangeModal, isOpen: false})} className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800">
                            Annuler
                        </button>
                        <button 
                            onClick={confirmStatusChange} 
                            disabled={!statusChangeModal.reason.trim()}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Confirmer
                        </button>
                    </div>
                </div>
            </Modal>
            <ConfirmDialogComponent />
        </div>
    );
};
