import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../../../components/Modal';
import { Send, AlertCircle, Car, User as UserIcon, Building, Mail } from 'lucide-react';
import { useDataContext } from '../../../contexts/DataContext';
import { Ticket } from '../../../types';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import { TOAST } from '../../../constants/toastMessages';
import { mapError } from '../../../utils/errorMapper';
import { logger } from '../../../utils/logger';

interface CreateTicketModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialClientId?: string;
    onSuccess?: (ticket: Ticket) => void;
}

export const CreateTicketModal: React.FC<CreateTicketModalProps> = ({ isOpen, onClose, initialClientId, onSuccess }) => {
    const { addTicket, clients, vehicles, tiers, ticketCategories, ticketSubcategories } = useDataContext();
    const { user } = useAuth();
    const { showToast } = useToast();

    // Default to the user's tenantId as clientId if they are a client, otherwise use passed initialClientId
    const defaultClientId = user?.role === 'CLIENT' ? user.tenantId : initialClientId;

    const [clientId, setClientId] = useState(defaultClientId || '');
    const [category, setCategory] = useState('');
    const [subCategory, setSubCategory] = useState('');
    const [priority, setPriority] = useState<any>('MEDIUM');
    const [vehicleId, setVehicleId] = useState('');
    const [subject, setSubject] = useState('');
    const [description, setDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (defaultClientId) setClientId(defaultClientId);
    }, [defaultClientId]);

    const selectedClient = useMemo(() => clients.find(c => c.id === clientId), [clients, clientId]);

    const clientVehicles = useMemo(() => {
        if (!clientId) return [];
        return vehicles.filter(v => v.clientId === clientId || v.client === selectedClient?.name);
    }, [clientId, vehicles, selectedClient]);

    const availableSubCategories = useMemo(() => {
        const cat = ticketCategories?.find(c => c.name === category);
        if (!cat) return [];
        return ticketSubcategories?.filter(sc => sc.categoryId === cat.id || sc.category_id === cat.id) || [];
    }, [category, ticketCategories, ticketSubcategories]);

    // Helper function to auto-generate subject and description (aligned with Support's TicketFormModal)
    const generateSubjectAndDescription = (cat: string, subCat: string, plate: string) => {
        const subjectStr = plate ? `${subCat || cat} - ${plate}` : (subCat || cat);
        let descStr = '';
        if (cat === 'Réclamation client') {
            descStr = `Réclamation client concernant: ${subCat}${plate ? ` - Véhicule: ${plate}` : ''}.`;
        } else if (cat === 'Support technique') {
            descStr = `Support technique requis: ${subCat}${plate ? ` - Véhicule concerné: ${plate}` : ''}.`;
        } else {
            descStr = `${subCat}${plate ? ` - Véhicule: ${plate}` : ''}.`;
        }
        return { subjectStr, descStr };
    };

    // Update auto-fields when selections change manually
    const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newCat = e.target.value;
        setCategory(newCat);
        setSubCategory('');
        const selectedCat = ticketCategories?.find(c => c.name === newCat);
        if (selectedCat) {
            setPriority((selectedCat as { defaultPriority?: string; default_priority?: string }).defaultPriority || (selectedCat as { defaultPriority?: string; default_priority?: string }).default_priority || 'MEDIUM');
        }
        const v = clientVehicles.find(veh => veh.id === vehicleId);
        const { subjectStr, descStr } = generateSubjectAndDescription(newCat, '', v?.plate || '');
        setSubject(subjectStr);
        setDescription(descStr);
    };

    const handleSubCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newSubCat = e.target.value;
        setSubCategory(newSubCat);
        const selectedSC = availableSubCategories.find(sc => sc.name === newSubCat);
        if (selectedSC) {
            setPriority((selectedSC as { defaultPriority?: string; default_priority?: string }).defaultPriority || (selectedSC as { defaultPriority?: string; default_priority?: string }).default_priority || priority);
        }
        const v = clientVehicles.find(veh => veh.id === vehicleId);
        const { subjectStr, descStr } = generateSubjectAndDescription(category, newSubCat, v?.plate || '');
        setSubject(subjectStr);
        setDescription(descStr);
    };

    const handleVehicleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const vId = e.target.value;
        setVehicleId(vId);
        const v = clientVehicles.find(veh => veh.id === vId);
        if (category || subCategory) {
            const { subjectStr, descStr } = generateSubjectAndDescription(category, subCategory, v?.plate || '');
            setSubject(subjectStr);
            setDescription(descStr);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!clientId) {
            showToast("Veuillez sélectionner un client", 'warning');
            return;
        }

        setIsSubmitting(true);

        const v = clientVehicles.find(veh => veh.id === vehicleId);
        const finalDescription = description + (v ? `\n\n[Véhicule concerné: ${v.plate} - ${v.name}]` : '');

        const newTicket: Ticket = {
            id: crypto.randomUUID(),
            tenantId: 'default',
            clientId: clientId,
            vehicleId: vehicleId || undefined,
            subject,
            description: finalDescription,
            status: 'OPEN',
            priority,
            category: category || 'TECHNICAL',
            subCategory: subCategory || undefined,
            messages: [],
            createdAt: new Date(),
            updatedAt: new Date(),
            assignedTo: user?.id
        };

        try {
            addTicket(newTicket);
            showToast(TOAST.SUPPORT.TICKET_CREATED, 'success');
            if (onSuccess) onSuccess(newTicket);
            onClose();
            // Reset form
            setSubject('');
            setCategory('');
            setSubCategory('');
            setPriority('MEDIUM');
            setDescription('');
            setVehicleId('');
        } catch (error) {
            logger.error(error);
            showToast(mapError(error, 'ticket'), 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Créer une demande d'assistance"
            maxWidth="max-w-xl"
        >
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
                {/* 1. Bloc d'informations Client pré-remplies (Read Only) */}
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                    <h3 className="text-sm font-bold text-slate-500 uppercase flex items-center gap-2 mb-2">
                        <UserIcon className="w-4 h-4" /> Vos informations
                    </h3>
                    
                    {!defaultClientId && (
                        <div>
                            <select
                                required
                                value={clientId}
                                onChange={(e) => setClientId(e.target.value)}
                                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                            >
                                <option value="">-- Sélectionner un client --</option>
                                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                    )}

                    {selectedClient && (
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="block text-xs text-slate-500 mb-1 flex items-center gap-1"><Building className="w-3 h-3"/> Raison Sociale</span>
                                <span className="font-medium text-slate-800 dark:text-white">{selectedClient.name}</span>
                            </div>
                            <div>
                                <span className="block text-xs text-slate-500 mb-1 flex items-center gap-1"><Mail className="w-3 h-3"/> Email Contact</span>
                                <span className="font-medium text-slate-800 dark:text-white truncate" title={selectedClient.email}>{selectedClient.email || 'N/A'}</span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg flex gap-3 items-start border border-blue-100 dark:border-blue-800">
                    <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                        Précisez la catégorie et le véhicule concerné pour générer automatiquement le sujet de votre demande.
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Catégorie <span className="text-red-500">*</span></label>
                        <select
                            required
                            title="Sélectionner une catégorie"
                            value={category}
                            onChange={handleCategoryChange}
                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        >
                            <option value="">Sélectionner...</option>
                            {ticketCategories?.map(c => (
                                <option key={c.id} value={c.name}>{c.name}</option>
                            ))}
                            {/* Fallback old options if DataContext empty */}
                            {!ticketCategories?.length && (
                                <>
                                    <option value="TECHNICAL">Technique</option>
                                    <option value="BILLING">Facturation</option>
                                    <option value="ACCESS">Accès & Compte</option>
                                    <option value="OTHER">Autre</option>
                                </>
                            )}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Sous-catégorie</label>
                        <select
                            title="Sélectionner une sous-catégorie"
                            value={subCategory}
                            onChange={handleSubCategoryChange}
                            disabled={!availableSubCategories.length}
                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all disabled:opacity-50"
                        >
                            <option value="">Préciser...</option>
                            {availableSubCategories.map(sc => (
                                <option key={sc.id} value={sc.name}>{sc.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        <Car className="w-4 h-4 inline mr-1 text-slate-500" />
                        Véhicule / Plaque (Optionnel)
                    </label>
                    <select
                        title="Sélectionner un véhicule"
                        value={vehicleId}
                        onChange={handleVehicleChange}
                        disabled={!clientVehicles.length}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all disabled:opacity-50"
                    >
                        <option value="">-- Aucun véhicule sélectionné --</option>
                        {clientVehicles.map(v => (
                            <option key={v.id} value={v.id}>{v.plate || v.name}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Sujet <span className="text-red-500">*</span>
                        {subject && (category || subCategory) && <span className="ml-2 text-[10px] text-green-600 font-normal">Généré auto.</span>}
                    </label>
                    <input
                        type="text"
                        required
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-slate-800 dark:text-white"
                        placeholder="Ex: Problème de connexion GPS"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Description détaillée <span className="text-red-500">*</span>
                    </label>
                    <textarea
                        required
                        rows={4}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none text-sm"
                        placeholder="Expliquez le problème rencontré..."
                    />
                </div>

                <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-700">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors font-medium text-sm"
                    >
                        Annuler
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm shadow-md shadow-blue-500/20"
                    >
                        {isSubmitting ? (
                            <>Veuillez patienter...</>
                        ) : (
                            <>
                                <Send className="w-4 h-4" />
                                Soumettre la demande
                            </>
                        )}
                    </button>
                </div>
            </form>
        </Modal>
    );
};
