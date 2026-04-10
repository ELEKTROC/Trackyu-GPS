import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Modal } from '../../../../components/Modal';
import { Client, Vehicle, SystemUser, Invoice, Tier, TicketCategory } from '../../../../types';
import { useInterventionTypes } from '../../../../hooks/useInterventionTypes';
import { Paperclip, X, FileText, Image } from 'lucide-react';
import { useToast } from '../../../../contexts/ToastContext';

interface TicketFormState {
    id?: string;
    clientId?: string;
    tierId?: string;
    vehicleId?: string;
    technicianId?: string;
    assignedTo?: string;
    category?: string;
    subCategory?: string;
    interventionType?: string;
    nature?: string;
    priority?: string;
    subject?: string;
    description?: string;
    status?: string;
    invoiceId?: string;
    source?: string;
    receivedAt?: Date | string;
}

interface TicketSubcategory {
    id: string | number;
    name: string;
    categoryId?: string | number;
    category_id?: string | number;
}

interface SlaConfig {
    low?: number;
    medium?: number;
    high?: number;
    critical?: number;
}

interface TicketFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    isEditMode: boolean;
    ticketForm: TicketFormState;
    setTicketForm: (form: TicketFormState) => void;
    formErrors: Record<string, string>;
    handleSaveTicket: () => void;
    isSaving?: boolean;
    clients: Client[];
    vehicles: Vehicle[];
    technicians: SystemUser[];
    tiers: Tier[];
    ticketCategories: TicketCategory[];
    ticketSubcategories: TicketSubcategory[];
    slaConfig?: SlaConfig;
    invoices?: Invoice[];
    stagedFiles?: File[];
    onStagedFilesChange?: (files: File[]) => void;
}

export const TicketFormModal: React.FC<TicketFormModalProps> = ({
    isOpen,
    onClose,
    isEditMode,
    ticketForm,
    setTicketForm,
    formErrors,
    handleSaveTicket,
    isSaving = false,
    clients,
    vehicles,
    technicians,
    tiers,
    ticketCategories,
    ticketSubcategories,
    slaConfig,
    invoices = [],
    stagedFiles = [],
    onStagedFilesChange
}) => {
    const { showToast } = useToast();
    // Filter subcategories based on selected category
    const { types: interventionTypesData, natures: allNatures } = useInterventionTypes();
    const availableSubCategories = useMemo(() => {
        const category = ticketCategories.find((c) => c.name === ticketForm.category);
        if (!category) return [];
        return ticketSubcategories.filter((sc) => sc.categoryId === category.id || sc.category_id === category.id);
    }, [ticketForm.category, ticketCategories, ticketSubcategories]);

    // Helper function to generate subject and description automatically
    const generateSubjectAndDescription = (params: {
        category?: string;
        interventionType?: string;
        nature?: string;
        subCategory?: string;
        plate?: string;
        clientName?: string;
    }): { subject: string; description: string } => {
        const { category, interventionType, nature, subCategory, plate, clientName } = params;
        const plateStr = plate || '';
        const clientStr = clientName || '';
        
        // For "Demande d'intervention" category
        if (category === "Demande d'intervention") {
            const selectedType = interventionTypesData.find(t => t.code === interventionType);
            const typeLabel = selectedType?.label || '';
            
            // Build subject: Type - Nature - Plaque
            const subjectParts = [typeLabel, nature, plateStr].filter(Boolean);
            const subject = subjectParts.join(' - ');
            
            // Build description template
            let description = '';
            const natureLower = nature?.toLowerCase() || '';
            const contextStr = `${plateStr}${clientStr ? ` (Client: ${clientStr})` : ''}`;

            switch (interventionType) {
                case 'INSTALLATION':
                    description = `Demande d'installation ${nature || 'GPS'} sur véhicule ${contextStr}.`;
                    break;
                case 'DEPANNAGE':
                    description = `Demande de dépannage (${nature || 'Panne'}) sur véhicule ${contextStr}.`;
                    break;
                case 'REMPLACEMENT':
                    description = `Demande de remplacement (${nature || 'Matériel'}) sur véhicule ${contextStr}.`;
                    break;
                case 'RETRAIT':
                    description = `Demande de retrait (${nature || 'Désinstallation'}) sur véhicule ${contextStr}.`;
                    break;
                case 'REINSTALLATION':
                    description = `Demande de réinstallation (${nature || 'Transfert inter-véhicule'}) sur véhicule ${contextStr}.`;
                    break;
                case 'TRANSFERT':
                    description = `Demande de transfert (${nature || 'Mutation'}) sur véhicule ${contextStr}.`;
                    break;
                default:
                    description = nature ? `${nature} sur véhicule ${contextStr}.` : '';
            }
            
            return { subject, description };
        }
        
        // For other categories (with subCategory)
        if (subCategory) {
            const subject = plateStr ? `${subCategory} - ${plateStr}` : subCategory;
            let description = '';
            
            // Templates based on category and subCategory
            if (category === 'Réclamation client') {
                description = `Réclamation client${clientStr ? ` (${clientStr})` : ''} concernant: ${subCategory}${plateStr ? ` - Véhicule: ${plateStr}` : ''}.`;
            } else if (category === 'Demande commerciale') {
                description = `Demande commerciale${clientStr ? ` de ${clientStr}` : ''}: ${subCategory}.`;
            } else if (category === 'Support technique') {
                description = `Support technique requis: ${subCategory}${plateStr ? ` - Véhicule concerné: ${plateStr}` : ''}${clientStr ? ` (Client: ${clientStr})` : ''}.`;
            } else {
                description = `${subCategory}${plateStr ? ` - Véhicule: ${plateStr}` : ''}${clientStr ? ` (Client: ${clientStr})` : ''}.`;
            }
            
            return { subject, description };
        }
        
        return { subject: '', description: '' };
    };

    // Calculate client payment status based on invoices
    const clientPaymentStatus = useMemo(() => {
        if (!ticketForm.clientId) return 'UP_TO_DATE';
        const clientInvoices = invoices.filter(inv => 
            inv.clientId === ticketForm.clientId || inv.tier_id === ticketForm.clientId
        );
        const hasOverdue = clientInvoices.some(inv => 
            inv.status === 'OVERDUE' || 
            (inv.status === 'SENT' && inv.dueDate && new Date(inv.dueDate) < new Date())
        );
        return hasOverdue ? 'OVERDUE' : 'UP_TO_DATE';
    }, [ticketForm.clientId, invoices]);

    const selectedVehicle = useMemo(() => vehicles.find(v => v.id === ticketForm.vehicleId), [vehicles, ticketForm.vehicleId]);

    const selectedClient = useMemo(() => clients.find(c => c.id === ticketForm.clientId), [clients, ticketForm.clientId]);

    // Filtered vehicles for selected client
    const clientVehicles = useMemo(() => {
        if (!ticketForm.clientId) return [];
        return vehicles.filter(v => {
            // Match by clientId (ID direct)
            if (v.clientId === ticketForm.clientId) return true;
            // Match by client field (peut contenir l'ID ou le nom)
            if (v.client === ticketForm.clientId) return true;
            // Match by client name si selectedClient disponible
            if (selectedClient && v.client === selectedClient.name) return true;
            if (selectedClient && v.clientId === selectedClient.id) return true;
            return false;
        });
    }, [ticketForm.clientId, vehicles, selectedClient]);

    // Client Search State
    const [clientSearch, setClientSearch] = useState('');
    const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
    const clientSearchRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (clientSearchRef.current && !clientSearchRef.current.contains(event.target as Node)) {
                setIsClientDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Filter clients for search
    const filteredClients = useMemo(() => {
        if (!clientSearch) return clients.slice(0, 50); // Show first 50 by default
        return clients.filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase())).slice(0, 50);
    }, [clients, clientSearch]);

    const clientReseller = useMemo(() => {
        if (!selectedClient) return null;

        // 1. Check direct property (API v2 pattern)
        if (selectedClient.resellerName) return selectedClient.resellerName;

        // 2. Check via ID lookup in tiers list
        const rId = selectedClient.resellerId;
        if (rId) {
            // Try matching by ID first
            const reseller = tiers.find(t => t.id === rId);
            if (reseller) return reseller.name;

            // Fallback: If rId looks like a tenantId (e.g. 'tenant_abc'), try matching by tenantId or just format it
            if (rId.startsWith('tenant_')) {
                // Simple formatting for known tenants if tier logic fails
                if (rId === 'tenant_abj') return 'ABIDJAN GPS';
                if (rId === 'tenant_smt') return 'SMARTRACK SOLUTIONS';
                return rId;
            }
        }

        // 3. Fallback: Find reseller by matching client's tenantId
        if (selectedClient.tenantId && selectedClient.tenantId !== 'tenant_default') {
            const reseller = tiers.find(t => t.type === 'RESELLER' && t.tenantId === selectedClient.tenantId);
            if (reseller) return reseller.name;
        }

        return null;
    }, [selectedClient, tiers]);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={isEditMode ? "Modifier le Ticket" : "Nouveau Ticket"}
            maxWidth="max-w-6xl"
            footer={
                <>
                    <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Annuler</button>
                    <button onClick={handleSaveTicket} disabled={isSaving} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2">
                        {isSaving && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                        {isEditMode ? "Mettre à jour" : "Créer le Ticket"}
                    </button>
                </>
            }
        >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* COL 1: CONTEXTE CLIENT */}
                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-400 uppercase border-b border-slate-100 pb-2 mb-4">Contexte Client</h3>

                    <div ref={clientSearchRef} className="relative">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Client <span className="text-red-500">*</span></label>
                        <div className="relative">
                            <input
                                type="text"
                                className={`w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:text-white ${formErrors.clientId ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'}`}
                                placeholder="Rechercher un client..."
                                value={isClientDropdownOpen ? clientSearch : (selectedClient?.name || '')}
                                onChange={e => {
                                    setClientSearch(e.target.value);
                                    setIsClientDropdownOpen(true);
                                }}
                                onFocus={() => {
                                    setClientSearch('');
                                    setIsClientDropdownOpen(true);
                                }}
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                            </div>
                        </div>

                        {isClientDropdownOpen && (
                            <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                {filteredClients.length > 0 ? (
                                    filteredClients.map(c => (
                                        <div
                                            key={c.id}
                                            className="px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer text-sm text-slate-700 dark:text-slate-200 border-b border-slate-100 dark:border-slate-700 last:border-0"
                                            onClick={() => {
                                                setTicketForm({ ...ticketForm, clientId: c.id, vehicleId: '' });
                                                setClientSearch('');
                                                setIsClientDropdownOpen(false);
                                            }}
                                        >
                                            <div className="font-medium">{c.name}</div>
                                            {c.contactName && <div className="text-[10px] text-slate-400">{c.contactName}</div>}
                                        </div>
                                    ))
                                ) : (
                                    <div className="px-3 py-2 text-sm text-slate-400 italic">Aucun client trouvé</div>
                                )}
                            </div>
                        )}
                        {formErrors.clientId && <p className="text-xs text-red-500 mt-1">{formErrors.clientId}</p>}
                    </div>

                    {/* Revendeur (lecture seule) */}
                    {selectedClient && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Revendeur</label>
                            <div className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-600 dark:text-slate-300">
                                {clientReseller || <span className="italic text-slate-400">Client direct (pas de revendeur)</span>}
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Véhicule Concerné
                            {selectedClient && clientVehicles.length > 0 && (
                                <span className="ml-2 text-xs font-normal text-blue-600">({clientVehicles.length} véhicule{clientVehicles.length > 1 ? 's' : ''})</span>
                            )}
                        </label>
                        <select
                            title="Sélectionner un véhicule"
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:text-white"
                            value={ticketForm.vehicleId}
                            onChange={e => {
                                const vehicleId = e.target.value;
                                const newVehicle = vehicles.find(v => v.id === vehicleId);
                                if (ticketForm.subCategory || ticketForm.interventionType) {
                                    const plate = newVehicle?.plate || newVehicle?.licensePlate || '';
                                    const { subject, description } = generateSubjectAndDescription({
                                        category: ticketForm.category,
                                        interventionType: ticketForm.interventionType,
                                        nature: ticketForm.category === "Demande d'intervention" ? ticketForm.subCategory : undefined,
                                        subCategory: ticketForm.category !== "Demande d'intervention" ? ticketForm.subCategory : undefined,
                                        plate,
                                        clientName: selectedClient?.name
                                    });
                                    setTicketForm({ ...ticketForm, vehicleId, subject, description });
                                } else {
                                    setTicketForm({ ...ticketForm, vehicleId });
                                }
                            }}
                            disabled={!ticketForm.clientId}
                        >
                            <option value="">{clientVehicles.length === 0 && ticketForm.clientId ? 'Aucun véhicule trouvé' : 'Aucun / Non Applicable'}</option>
                            {clientVehicles.map(v => (
                                <option key={v.id} value={v.id}>{v.name} ({v.plate || v.licensePlate || 'N/A'})</option>
                            ))}
                        </select>
                        {/* Badge Statut Paiement Client */}
                        {selectedClient && (
                            <div className="mt-2">
                                {clientPaymentStatus === 'OVERDUE' ? (
                                    <span className="inline-flex items-center px-2.5 py-1 bg-red-100 text-red-700 border border-red-200 rounded-full text-xs font-bold">
                                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        Impayés
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center px-2.5 py-1 bg-green-100 text-green-700 border border-green-200 rounded-full text-xs font-bold">
                                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                        À jour
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Info Véhicule (Read Only) */}
                    {selectedVehicle && (
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800 text-sm space-y-2">
                            <div className="flex justify-between">
                                <span className="text-slate-500">Modèle Boîtier:</span>
                                <span className="font-medium text-slate-800 dark:text-white">{selectedVehicle.deviceModel || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">IMEI:</span>
                                <span className="font-medium text-slate-800 dark:text-white font-mono">{selectedVehicle.imei || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">SIM:</span>
                                <span className="font-medium text-slate-800 dark:text-white font-mono">{selectedVehicle.sim || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-500">Statut:</span>
                                <span className={`font-medium px-2 py-0.5 rounded text-xs ${selectedVehicle.status === 'MOVING' ? 'bg-green-100 text-green-700' :
                                    selectedVehicle.status === 'OFFLINE' ? 'bg-red-100 text-red-700' :
                                        'bg-slate-100 text-slate-700'
                                    }`}>
                                    {selectedVehicle.status}
                                </span>
                            </div>
                            {/* GPS Status (from vehicle data) */}
                            <div className="flex justify-between items-center pt-2 border-t border-blue-100 dark:border-blue-800/50 mt-2">
                                <span className="text-slate-500">Statut GPS:</span>
                                <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${selectedVehicle.status === 'OFFLINE' ? 'text-red-600 bg-red-50' : 'text-green-600 bg-green-50'}`}>
                                    {selectedVehicle.status === 'OFFLINE' ? 'SIGNAL PERDU' : 'SIGNAL OK'}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* COL 2: DÉTAILS TICKET */}
                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-400 uppercase border-b border-slate-100 pb-2 mb-4">Détails du Problème</h3>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Catégorie</label>
                            <select
                                title="Sélectionner une catégorie"
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:text-white"
                                value={ticketForm.category}
                                onChange={e => {
                                    const catName = e.target.value;
                                    const category = ticketCategories.find((c) => c.name === catName);
                                    const plate = selectedVehicle?.plate || selectedVehicle?.licensePlate || '';
                                    const { subject, description } = generateSubjectAndDescription({
                                        category: catName,
                                        plate,
                                        clientName: selectedClient?.name
                                    });
                                    setTicketForm({
                                        ...ticketForm,
                                        category: catName,
                                        subCategory: '',
                                        interventionType: '',
                                        priority: (category as TicketCategory & { defaultPriority?: string; default_priority?: string })?.defaultPriority || (category as TicketCategory & { defaultPriority?: string; default_priority?: string })?.default_priority || ticketForm.priority,
                                        subject,
                                        description
                                    });
                                }}
                            >
                                {ticketCategories.map((cat) => (
                                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Priorité</label>
                            <select
                                title="Sélectionner une priorité"
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:text-white"
                                value={ticketForm.priority}
                                onChange={e => setTicketForm({ ...ticketForm, priority: e.target.value })}
                            >
                                <option value="LOW">Basse ({slaConfig?.low || 72}h)</option>
                                <option value="MEDIUM">Moyenne ({slaConfig?.medium || 48}h)</option>
                                <option value="HIGH">Haute ({slaConfig?.high || 24}h)</option>
                                <option value="CRITICAL">Critique ({slaConfig?.critical || 4}h)</option>
                            </select>
                        </div>
                    </div>

                    {/* Type & Nature - affiché uniquement si catégorie est "Demande d'intervention" */}
                    {ticketForm.category === "Demande d'intervention" ? (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Type</label>
                                <select
                                    title="Sélectionner un type"
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:text-white"
                                    value={ticketForm.interventionType || ''}
                                    onChange={e => {
                                        const newType = e.target.value;
                                        const plate = selectedVehicle?.plate || selectedVehicle?.licensePlate || '';
                                        const { subject, description } = generateSubjectAndDescription({
                                            category: ticketForm.category,
                                            interventionType: newType,
                                            nature: ticketForm.subCategory,
                                            plate,
                                            clientName: selectedClient?.name
                                        });
                                        setTicketForm({ ...ticketForm, interventionType: newType, subject, description });
                                    }}
                                >
                                    <option value="">-- Sélectionner --</option>
                                    {interventionTypesData && interventionTypesData.map(t => (
                                        <option key={t.id} value={t.code}>{t.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nature</label>
                                <select
                                    title="Sélectionner une nature"
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:text-white"
                                    value={ticketForm.subCategory || ''}
                                    onChange={e => {
                                        const natureName = e.target.value;
                                        const plate = selectedVehicle?.plate || selectedVehicle?.licensePlate || '';
                                        const { subject, description } = generateSubjectAndDescription({
                                            category: ticketForm.category,
                                            interventionType: ticketForm.interventionType,
                                            nature: natureName,
                                            plate,
                                            clientName: selectedClient?.name
                                        });
                                        setTicketForm({ ...ticketForm, subCategory: natureName, subject, description });
                                    }}
                                >
                                    <option value="">-- Sélectionner --</option>
                                    {allNatures
                                        .filter(n => {
                                            const parentType = interventionTypesData.find(t => t.id === n.typeId);
                                            return parentType?.code === ticketForm.interventionType;
                                        })
                                        .map(nature => (
                                            <option key={nature.id} value={nature.label}>{nature.label}</option>
                                        ))}
                                </select>
                            </div>
                        </div>
                    ) : (
                        /* Sous-catégorie pour les autres catégories */
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Sous-Catégorie</label>
                            <select
                                title="Sélectionner une sous-catégorie"
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:text-white"
                                value={ticketForm.subCategory}
                                onChange={e => {
                                    const subCatName = e.target.value;
                                    const selected = availableSubCategories.find(sc => sc.name === subCatName);
                                    const plate = selectedVehicle?.plate || selectedVehicle?.licensePlate || '';
                                    const { subject, description } = generateSubjectAndDescription({
                                        category: ticketForm.category,
                                        subCategory: subCatName,
                                        plate,
                                        clientName: selectedClient?.name
                                    });
                                    setTicketForm({
                                        ...ticketForm,
                                        subCategory: subCatName,
                                        subject,
                                        description,
                                        priority: selected ? ((selected as TicketSubcategory & { defaultPriority?: string; default_priority?: string }).defaultPriority || (selected as TicketSubcategory & { defaultPriority?: string; default_priority?: string }).default_priority || ticketForm.priority) : ticketForm.priority
                                    });
                                }}
                            >
                                <option value="">Préciser...</option>
                                {availableSubCategories.map(sc => (
                                    <option key={sc.id} value={sc.name}>{sc.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* --- Ligne : Canal / Date réception / Assigné à --- */}
                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Canal</label>
                            <select
                                title="Canal de réception de la demande"
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:text-white text-sm"
                                value={ticketForm.source || 'TrackYu'}
                                onChange={e => setTicketForm({ ...ticketForm, source: e.target.value })}
                            >
                                <option value="TrackYu">TrackYu</option>
                                <option value="Appel">📞 Appel</option>
                                <option value="WhatsApp">💬 WhatsApp</option>
                                <option value="Visite">🏢 Visite</option>
                                <option value="SMS">📱 SMS</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Date réception</label>
                            <input
                                type="datetime-local"
                                title="Date et heure de réception de la demande"
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:text-white text-sm"
                                value={ticketForm.receivedAt ? new Date(new Date(ticketForm.receivedAt).getTime() - new Date(ticketForm.receivedAt).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                                onChange={e => setTicketForm({ ...ticketForm, receivedAt: e.target.value ? new Date(e.target.value) : new Date() })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Assigné à</label>
                            <select
                                title="Assigner à un agent support"
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:text-white text-sm"
                                value={ticketForm.assignedTo}
                                onChange={e => setTicketForm({ ...ticketForm, assignedTo: e.target.value })}
                            >
                                <option value="">-- Non assigné --</option>
                                {technicians.map(t => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Sujet <span className="text-red-500">*</span>
                            {ticketForm.subject && (
                                <span className="ml-2 text-xs font-normal text-green-600 dark:text-green-400">✓ Généré automatiquement</span>
                            )}
                        </label>
                        <input
                            type="text"
                            className={`w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:text-white ${formErrors.subject ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'}`}
                            value={ticketForm.subject}
                            onChange={e => setTicketForm({ ...ticketForm, subject: e.target.value })}
                            placeholder="Le sujet sera généré automatiquement..."
                        />
                        {formErrors.subject && <p className="text-xs text-red-500 mt-1">{formErrors.subject}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Description <span className="text-red-500">*</span>
                            {ticketForm.description && (
                                <span className="ml-2 text-xs font-normal text-green-600 dark:text-green-400">✓ Pré-remplie</span>
                            )}
                        </label>
                        <textarea
                            className={`w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none h-32 resize-none dark:text-white ${formErrors.description ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'}`}
                            value={ticketForm.description}
                            onChange={e => setTicketForm({ ...ticketForm, description: e.target.value })}
                            placeholder="La description sera pré-remplie en fonction de la catégorie..."
                        />
                        {formErrors.description && <p className="text-xs text-red-500 mt-1">{formErrors.description}</p>}
                    </div>

                    {/* Pièces jointes (staging) */}
                    {!isEditMode && onStagedFilesChange && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                <Paperclip className="w-4 h-4 inline mr-1" />
                                Pièces jointes
                            </label>
                            <div
                                className="w-full px-3 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg text-center cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
                                onClick={() => {
                                    const input = document.createElement('input');
                                    input.type = 'file';
                                    input.multiple = true;
                                    input.accept = 'image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip,.rar';
                                    input.onchange = (e) => {
                                        const files = Array.from((e.target as HTMLInputElement).files || []);
                                        const validFiles = files.filter(f => f.size <= 10 * 1024 * 1024);
                                        const rejected = files.filter(f => f.size > 10 * 1024 * 1024);
                                        if (rejected.length > 0) {
                                            showToast(`${rejected.length} fichier(s) rejeté(s) car > 10 Mo : ${rejected.map(f => f.name).join(', ')}`, 'warning');
                                        }
                                        onStagedFilesChange([...stagedFiles, ...validFiles]);
                                    };
                                    input.click();
                                }}
                            >
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Cliquez pour ajouter des fichiers (max 10 Mo chacun)
                                </p>
                            </div>
                            {stagedFiles.length > 0 && (
                                <div className="mt-2 space-y-1">
                                    {stagedFiles.map((file, idx) => (
                                        <div key={idx} className="flex items-center gap-2 p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs">
                                            {file.type.startsWith('image/') ? (
                                                <Image className="w-4 h-4 text-blue-500 flex-shrink-0" />
                                            ) : (
                                                <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                            )}
                                            <span className="truncate flex-1 text-slate-700 dark:text-slate-300">{file.name}</span>
                                            <span className="text-slate-400 flex-shrink-0">{(file.size / 1024).toFixed(0)} Ko</span>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onStagedFilesChange(stagedFiles.filter((_, i) => i !== idx));
                                                }}
                                                className="p-0.5 text-red-400 hover:text-red-600 flex-shrink-0"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
};
