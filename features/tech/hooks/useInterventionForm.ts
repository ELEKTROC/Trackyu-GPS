/**
 * Custom hook for InterventionForm logic
 * Extracts business logic from the component for cleaner separation
 */

import { useState, useEffect, useMemo } from 'react';
import type { Intervention } from '../../../types';
import type { SystemUser } from '../../../types/auth';
import { useDataContext } from '../../../contexts/DataContext';
import { useToast } from '../../../contexts/ToastContext';
import { TOAST } from '../../../constants/toastMessages';
import { mapError } from '../../../utils/errorMapper';
import { useAuth } from '../../../contexts/AuthContext';
import { InterventionSchema, InterventionCompletionSchema } from '../../../schemas/interventionSchema';
import { z } from 'zod';
import { generateBonInterventionPDF, generateRapportInterventionPDF } from '../../../services/pdfServiceV2';
import { useTenantBranding } from '../../../hooks/useTenantBranding';
import * as deviceService from '../services/deviceService';
import { API_URL, getHeaders } from '../../../services/api/client';
import { saveDraftToQueue } from '../../../hooks/useDraftQueue';

// Helper to ensure material is always an array
const normalizeMaterial = (material: any): string[] => {
    if (!material) return [];
    if (Array.isArray(material)) return material;
    if (typeof material === 'string') {
        try {
            const parsed = JSON.parse(material);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }
    return [];
};

interface UseInterventionFormProps {
    initialData?: Intervention | null;
    isOpen: boolean;
    technicians: SystemUser[];
    onSave: (intervention: Partial<Intervention>) => void;
    onClose: () => void;
}
import { useInterventionTypes } from '../../../hooks/useInterventionTypes';

// ... (existing code for technicianSignature, useEffects etc. remains unchanged until handers) ...

export function useInterventionForm({
    initialData,
    isOpen,
    technicians,
    onSave,
    onClose
}: UseInterventionFormProps) {
    const { vehicles, clients, stock, addInvoice, catalogItems, tickets, updateTicket, contracts, users, branches } = useDataContext();
    const { user } = useAuth();
    const { showToast } = useToast();
    const { branding } = useTenantBranding();
    const { types: interventionTypes, natures: interventionNatures } = useInterventionTypes();

    const DRAFT_KEY = 'trackyu_draft_intervention';

    const [formData, setFormData] = useState<Partial<Intervention>>({});

    const currentNatureConfig = useMemo(() => {
        if (!formData.nature) return null;
        return interventionNatures.find(n => n.label === formData.nature || n.code === formData.nature);
    }, [formData.nature, interventionNatures]);
    const [activeTab, setActiveTab] = useState<'REQUEST' | 'VEHICLE' | 'TECH' | 'SIGNATURE'>('REQUEST');
    const [isTestLoading, setIsTestLoading] = useState<string | null>(null);
    const [testResult, setTestResult] = useState<string | null>(null);
    const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);

    // Get technician signature from profile
    const technicianSignature = useMemo(() => {
        if (!formData.technicianId || formData.technicianId === 'UNASSIGNED') return null;
        const tech = users.find(u => u.id === formData.technicianId);
        return tech?.signature || null;
    }, [formData.technicianId, users]);

    // Initialize form data
    useEffect(() => {
        if (initialData) {
            // Normalize material field to always be an array
            const normalizedData = {
                ...initialData,
                material: normalizeMaterial(initialData.material),
                // BUG FIX: Préserver le type original (ex: DEPANNAGE ne doit pas devenir INSTALLATION)
                type: initialData.type || 'INSTALLATION',
            };
            
            // Si l'intervention vient d'un ticket, récupérer les données du ticket
            if (initialData.ticketId && !initialData.id) {
                const ticket = tickets.find(t => t.id === initialData.ticketId);
                
                const baseData = ticket ? {
                    ...normalizedData,
                    // Récupérer technicien du ticket si non défini
                    technicianId: initialData.technicianId || ticket.assignedTo || 'UNASSIGNED',
                    // Récupérer revendeur du ticket
                    resellerId: initialData.resellerId || ticket.resellerId || '',
                    resellerName: initialData.resellerName || ticket.resellerName || '',
                    // Récupérer d'autres champs utiles
                    location: initialData.location || ticket.location || '',
                    contactPhone: initialData.contactPhone || ticket.contactPhone || '',
                    description: initialData.description || ticket.description || '',
                    notes: initialData.notes || ticket.description || '', // Fallback for old code
                } : normalizedData;

                // Si un véhicule est pré-sélectionné, enrichir avec les données complètes (IMEI, SIM, balise, contrat...)
                if (initialData.vehicleId) {
                    const vehicleUpdates = getVehicleUpdates(initialData.vehicleId, vehicles, stock, baseData, contracts);
                    setFormData({ ...baseData, ...vehicleUpdates });
                } else {
                    setFormData(baseData);
                }
            } else {
                setFormData(normalizedData);
            }
        } else {
            // Nouveau formulaire : proposer de restaurer un brouillon offline s'il existe
            const savedDraft = localStorage.getItem(DRAFT_KEY);
            if (savedDraft) {
                try {
                    const draft = JSON.parse(savedDraft) as Partial<Intervention>;
                    setFormData(draft);
                    showToast('Brouillon hors ligne restauré', 'info');
                } catch {
                    localStorage.removeItem(DRAFT_KEY);
                    setFormData({
                        status: 'PENDING', type: 'INSTALLATION', duration: 60, cost: 0,
                        scheduledDate: new Date().toISOString(), createdAt: new Date().toISOString(),
                        technicianId: 'UNASSIGNED'
                    });
                }
            } else {
                setFormData({
                    status: 'PENDING', type: 'INSTALLATION', duration: 60, cost: 0,
                    scheduledDate: new Date().toISOString(), createdAt: new Date().toISOString(),
                    technicianId: 'UNASSIGNED'
                });
            }
        }
        setActiveTab('REQUEST');
    }, [initialData, isOpen]);

    // Listener SW : nettoyer le brouillon localStorage quand Background Sync a rejoué la requête
    useEffect(() => {
        if (!('serviceWorker' in navigator)) return;
        const handleSWMessage = (event: MessageEvent) => {
            if (event.data?.type === 'DRAFT_REPLAYED' && event.data?.url?.includes('/tech/interventions')) {
                localStorage.removeItem(DRAFT_KEY);
                showToast('Intervention envoyée automatiquement à la reconnexion', 'success');
            }
        };
        navigator.serviceWorker.addEventListener('message', handleSWMessage);
        return () => navigator.serviceWorker.removeEventListener('message', handleSWMessage);
    }, []);

    // Auto-set duration based on intervention type (only for new interventions)
    useEffect(() => {
        if (!initialData?.id && formData.type && interventionTypes.length > 0) {
            const currentType = interventionTypes.find(t => t.code === formData.type);
            const newDuration = currentType?.default_duration ?? 60;
            setFormData(prev => ({ ...prev, duration: newDuration }));
            if (currentType?.base_cost !== undefined) {
                setFormData(prev => ({ ...prev, cost: currentType.base_cost }));
            }
        }
    }, [formData.type, initialData?.id, interventionTypes]);

    // Auto-apply technician signature
    useEffect(() => {
        if (technicianSignature && !formData.signatureTech) {
            setFormData(prev => ({ ...prev, signatureTech: technicianSignature }));
        }
    }, [technicianSignature]);

    // Auto-populate Old Device Info when Vehicle is selected based on stock_impact
    useEffect(() => {
        const impactAction = currentNatureConfig?.stock_impact?.action;
        const needsOldInfo = impactAction === 'SWAP' || impactAction === 'IN' || impactAction === 'TRANSFER';

        if (formData.vehicleId && needsOldInfo) {
            const v = vehicles.find(veh => veh.id === formData.vehicleId);
            if (v) {
                const oldBox = stock.find(d => d.assignedVehicleId === v.id && (d.type === 'BOX' || !d.type));
                const oldSim = stock.find(d => d.assignedVehicleId === v.id && d.type === 'SIM');

                const updates: any = {
                    oldDeviceImei: oldBox ? (oldBox.imei || oldBox.serialNumber) : undefined,
                    oldSimId: oldSim ? (oldSim.iccid || oldSim.serialNumber) : undefined
                };

                const oldSensor = stock.find(d => d.assignedVehicleId === v.id && (d.type === 'SENSOR' || d.type === 'ACCESSORY'));
                if (oldSensor) {
                    updates.oldSensorSerial = oldSensor.serialNumber;
                }

                // For TRANSFER actions, also pre-fill CURRENT imei/iccid from existing device
                if (impactAction === 'TRANSFER') {
                    updates.imei = oldBox ? (oldBox.imei || oldBox.serialNumber) : '';
                    updates.iccid = oldSim ? (oldSim.iccid || oldSim.serialNumber) : '';
                }

                setFormData(prev => ({
                    ...prev,
                    ...updates
                }));
            }
        }
    }, [formData.vehicleId, currentNatureConfig, vehicles, stock]);

    // Auto-populate Contract Info (priorité: contrat du véhicule > contrat du client)
    useEffect(() => {
        // Ne pas écraser un contractId déjà défini
        if (formData.contractId) return;
        if (!contracts || contracts.length === 0) return;

        // 1. Chercher via le contractId du véhicule sélectionné
        if (formData.vehicleId) {
            const selectedVehicle = vehicles.find(v => v.id === formData.vehicleId);
            if (selectedVehicle?.contractId) {
                const directContract = contracts.find(c => c.id === selectedVehicle.contractId);
                if (directContract) {
                    setFormData(prev => ({ ...prev, contractId: directContract.id }));
                    return;
                }
            }

            // 2. Chercher le contrat actif qui contient ce véhicule
            const vehicleContract = contracts.find(c =>
                c.status === 'ACTIVE' &&
                c.vehicleIds?.includes(formData.vehicleId) &&
                (!c.endDate || new Date(c.endDate) > new Date())
            );
            if (vehicleContract) {
                setFormData(prev => ({ ...prev, contractId: vehicleContract.id }));
                return;
            }
        }

        // 3. Fallback: contrat actif du client
        if (formData.clientId) {
            const activeContract = contracts.find(c =>
                c.clientId === formData.clientId &&
                c.status === 'ACTIVE' &&
                (!c.endDate || new Date(c.endDate) > new Date())
            );
            if (activeContract) {
                setFormData(prev => ({ ...prev, contractId: activeContract.id }));
            }
        }
    }, [formData.clientId, formData.vehicleId, formData.contractId, contracts, vehicles]);

    // Available vehicles: client vehicles + internal stock
    const availableVehicles = useMemo(() => {
        if (!formData.type) return [];
        
        // If a client is selected, show their vehicles
        if (formData.clientId) {
            const clientVehicles = vehicles.filter(v => 
                v.clientId === formData.clientId || v.client === formData.clientId
            );
            // For INSTALLATION, also include internal/unassigned vehicles (stock)
            if (formData.type === 'INSTALLATION') {
                const internalVehicles = vehicles.filter(v => 
                    (v.client === 'Interne' || !v.client) && 
                    !clientVehicles.some(cv => cv.id === v.id)
                );
                return [...clientVehicles, ...internalVehicles];
            }
            return clientVehicles;
        }
        
        // No client selected: show internal/unassigned vehicles
        return vehicles.filter(v => v.client === 'Interne' || !v.client);
    }, [vehicles, formData.type, formData.clientId]);

    // Material helpers - based on dynamic config
    const isFieldRequired = (fieldName: string) => {
        if (!currentNatureConfig?.required_fields) return false;
        return currentNatureConfig.required_fields.includes(fieldName);
    };

    const hasTracker = () => isFieldRequired('imei');
    const hasSim = () => isFieldRequired('iccid');
    const hasSensor = () => isFieldRequired('sensor_serial');
    const isTransfer = () => currentNatureConfig?.stock_impact?.action === 'TRANSFER';
    const hasMaterial = (keyword: string) => (Array.isArray(formData.material) ? formData.material : []).some(m => m.toLowerCase().includes(keyword.toLowerCase()));

    // ── Per-tab validation ──────────────────────────────────────────────
    const validateTab = (tabId: 'REQUEST' | 'VEHICLE' | 'TECH' | 'SIGNATURE'): string | null => {
        switch (tabId) {
            case 'REQUEST':
                if (!formData.clientId) return "Le client est obligatoire (Onglet 1)";
                if (!formData.type) return "Le type d'intervention est obligatoire (Onglet 1)";
                if (!(formData.nature as string)) return "La nature est obligatoire (Onglet 1)";
                if (!formData.technicianId || formData.technicianId === 'UNASSIGNED') return "Un technicien doit être assigné (Onglet 1)";
                if (!formData.scheduledDate) return "La date planifiée est obligatoire (Onglet 1)";
                return null;

            case 'VEHICLE': {
                if (!formData.vehicleId) return "Le véhicule est obligatoire (Onglet 2)";
                
                const needsRemovalStatus = currentNatureConfig?.stock_impact?.action === 'SWAP' || 
                                           currentNatureConfig?.stock_impact?.action === 'IN';
                if (needsRemovalStatus && !formData.removedMaterialStatus) {
                    return "L'état du matériel retiré est obligatoire pour cette opération (Onglet 2)";
                }
                return null;
            }

            case 'TECH': {
                if (hasTracker() && !formData.imei) return `L'IMEI du boîtier est obligatoire (Onglet 3)`;
                if (hasSim() && !formData.iccid) return `L'ICCID de la SIM est obligatoire (Onglet 3)`;
                if (hasSensor() && !formData.sensorSerial) return `Le numéro de série du capteur est obligatoire (Onglet 3)`;
                return null;
            }

            case 'SIGNATURE':
                return null; // Validated on Clôturer via InterventionCompletionSchema
        }
    };

    /**
     * Navigate between tabs with forward-only validation.
     * Going backward is always allowed.
     */
    const handleTabChange = (targetTab: 'REQUEST' | 'VEHICLE' | 'TECH' | 'SIGNATURE') => {
        const tabOrder: Array<'REQUEST' | 'VEHICLE' | 'TECH' | 'SIGNATURE'> = ['REQUEST', 'VEHICLE', 'TECH', 'SIGNATURE'];
        const currentIndex = tabOrder.indexOf(activeTab);
        const targetIndex = tabOrder.indexOf(targetTab);

        // Only validate when going forward
        if (targetIndex > currentIndex) {
            for (let i = currentIndex; i < targetIndex; i++) {
                const error = validateTab(tabOrder[i]);
                if (error) {
                    showToast(mapError(error), 'error');
                    return;
                }
            }
        }
        setActiveTab(targetTab);
    };

    // Handlers
    const handleMaterialToggle = (item: string) => {
        const currentMaterials = formData.material || [];
        if (currentMaterials.includes(item)) {
            setFormData({ ...formData, material: currentMaterials.filter(m => m !== item) });
        } else {
            setFormData({ ...formData, material: [...currentMaterials, item] });
        }
    };

    const handleSimulateTest = async (type: string) => {
        if (!formData.imei) {
            showToast(TOAST.FLEET.SELECT_DEVICE_FIRST, "error");
            return;
        }

        setIsTestLoading(type);
        setTestResult(null);

        try {
            let result;
            switch (type) {
                case 'LOC':
                    result = await deviceService.pingPosition(formData.imei);
                    if (result.success) {
                        showToast(result.message, "info");
                        setTestResult(`Position OK à ${new Date(result.timestamp).toLocaleTimeString()}`);
                    }
                    break;
                case 'IMMOB':
                    result = await deviceService.cutEngine(formData.imei);
                    if (result.success) {
                        showToast(result.message, "success");
                        setTestResult(`Moteur coupé à ${new Date(result.timestamp).toLocaleTimeString()}`);
                    }
                    break;
                case 'APN':
                    result = await deviceService.configureAPN(formData.imei);
                    if (result.success) showToast(result.message, "success");
                    break;
                case 'IP':
                    result = await deviceService.configureIP(formData.imei);
                    if (result.success) showToast(result.message, "success");
                    break;
            }
        } catch (error) {
            showToast(mapError('Erreur lors du test'), "error");
        } finally {
            setIsTestLoading(null);
        }
    };

    const handleStartIntervention = () => {
        // Validate all Tab 1 (REQUEST) fields before starting
        const requestError = validateTab('REQUEST');
        if (requestError) {
            showToast(mapError(requestError), 'error');
            return;
        }

        const startTime = new Date().toISOString();
        const updated = { ...formData, status: 'IN_PROGRESS' as const, startTime };
        setFormData(updated);
        onSave(updated);
        setActiveTab('VEHICLE');

        // SYNC TICKET
        if (formData.ticketId && updateTicket) {
            const ticket = tickets.find(t => t.id === formData.ticketId);
            if (ticket && ticket.status !== 'IN_PROGRESS' && ticket.status !== 'RESOLVED' && ticket.status !== 'CLOSED') {
                updateTicket({
                    ...ticket,
                    status: 'IN_PROGRESS',
                    updatedAt: new Date(),
                    startedAt: ticket.startedAt || new Date()
                });
                showToast(TOAST.TECH.TICKET_LINKED('En Cours'), "info");
            }
        }

        showToast(TOAST.TECH.INTERVENTION_STARTED, 'success');
    };

    const handleCompleteIntervention = () => {
        if (formData.status !== 'IN_PROGRESS') {
            showToast(TOAST.TECH.MUST_BE_IN_PROGRESS, "error");
            return;
        }

        // VALIDATION PROGRESSIVE : vérifier chaque onglet
        const tabOrder: Array<'REQUEST' | 'VEHICLE' | 'TECH' | 'SIGNATURE'> = ['REQUEST', 'VEHICLE', 'TECH', 'SIGNATURE'];
        for (const tab of tabOrder) {
            const tabError = validateTab(tab);
            if (tabError) {
                showToast(mapError(tabError), 'error');
                return;
            }
        }

        // VALIDATION SPÉCIFIQUE À LA NATURE pour la clôture
        const nature = formData.nature || '';
        if (((formData.nature as string) === 'Retrait' || (formData.type as string) === 'RETRAIT') && !formData.removalReason) {
            showToast(TOAST.VALIDATION.REQUIRED_FIELD('motif du retrait'), 'error');
            return;
        }
        const needsRemovalStatus = ['REMPLACEMENT', 'RETRAIT', 'REINSTALLATION'].includes(formData.type || '');
        if (needsRemovalStatus && !formData.removedMaterialStatus) {
            showToast(TOAST.VALIDATION.REQUIRED_FIELD('état du matériel retiré'), 'error');
            return;
        }

        // VALIDATION STRICTE A LA CLOTURE (signatures via Zod)
        try {
            InterventionCompletionSchema.parse(formData);
        } catch (error) {
            if (error instanceof z.ZodError) {
                const firstError = error.issues[0];
                if (firstError.path.includes('signatureTech')) {
                    showToast(TOAST.TECH.SIGNATURE_MISSING('technicien', 4), "error");
                    setActiveTab('SIGNATURE');
                    return;
                }
                if (firstError.path.includes('signatureClient')) {
                    showToast(TOAST.TECH.SIGNATURE_MISSING('client', 4), "error");
                    setActiveTab('SIGNATURE');
                    return;
                }
                showToast(mapError(firstError.message, 'intervention'), 'error');
                return;
            }
        }

        const endTime = new Date().toISOString();
        const updated = { ...formData, status: 'COMPLETED' as const, endTime };
        setFormData(updated);
        onSave(updated as unknown as Partial<Intervention>);

        // SYNC TICKET
        if (formData.ticketId && updateTicket) {
            const ticket = tickets.find(t => t.id === formData.ticketId);
            if (ticket && ticket.status !== 'RESOLVED' && ticket.status !== 'CLOSED') {
                updateTicket({
                    ...ticket,
                    status: 'RESOLVED',
                    updatedAt: new Date(),
                    resolvedAt: new Date()
                });
                showToast(TOAST.TECH.TICKET_LINKED('Résolu'), "info");
            }
        }

        showToast(TOAST.TECH.INTERVENTION_COMPLETED, "success");
    };

    const handleSubmit = async () => {
        // Si hors ligne → sauvegarder le brouillon et fermer
        if (!navigator.onLine) {
            localStorage.setItem(DRAFT_KEY, JSON.stringify(formData));
            // Enqueue pour Background Sync (auto-replay à la reconnexion)
            const endpoint = formData.id
                ? `${API_URL}/tech/interventions/${formData.id}`
                : `${API_URL}/tech/interventions`;
            const method = formData.id ? 'PUT' : 'POST';
            saveDraftToQueue(endpoint, method, getHeaders(), JSON.stringify(formData)).catch(() => {
                // Silently ignore — localStorage draft reste disponible
            });
            showToast('Hors ligne — brouillon sauvegardé, sera envoyé à la reconnexion', 'warning');
            onClose();
            return;
        }
        try {
            // Auto-transition: si une date est planifiée et le statut est PENDING, passer à SCHEDULED
            const dataToValidate = { ...formData };
            if (dataToValidate.scheduledDate && dataToValidate.status === 'PENDING') {
                dataToValidate.status = 'SCHEDULED';
            }
            const validatedData = InterventionSchema.parse(dataToValidate);
            const payload = validatedData as unknown as Partial<Intervention>;
            onSave(payload);
            localStorage.removeItem(DRAFT_KEY);
            onClose();
            showToast(TOAST.TECH.INTERVENTION_SAVED, 'success');
        } catch (error) {
            if (error instanceof z.ZodError) {
                const firstError = error.issues[0];
                showToast(mapError(`${firstError.path.join('.')}: ${firstError.message}`), 'error');
            } else {
                showToast(TOAST.VALIDATION.FORM_ERRORS, "error");
            }
        }
    };

    // Génère le BON D'INTERVENTION (avant intervention - ordre de mission)
    const handleDownloadBon = () => {
        try {
            const tech = technicians.find(t => t.id === formData.technicianId);
            const client = clients.find(c => c.id === formData.clientId);

            generateBonInterventionPDF({
                id: formData.id || 'BROUILLON',
                date: formData.scheduledDate || new Date().toISOString(),
                vehicle: {
                    plate: formData.licensePlate || formData.vehicleId || 'N/A',
                    brand: formData.vehicleBrand,
                    model: formData.vehicleModel,
                    client: client?.name,
                    type: formData.vehicleType
                },
                technician: {
                    name: tech?.name || 'Non assigné',
                    phone: tech?.phone
                },
                client: {
                    name: client?.name || 'Inconnu',
                    phone: formData.contactPhone || client?.phone,
                    location: formData.location || client?.address
                },
                type: formData.type || 'INTERVENTION',
                nature: formData.nature,
                ticketId: formData.ticketId,
                description: formData.description || formData.notes || 'À définir sur site.',
                partsUsed: (formData.material || []).map(m => ({ name: m, quantity: 1 })),
                notes: formData.notes,
                status: formData.status || 'PENDING',
                // Checklist vierge pour le bon
                checklist: [
                    { label: 'Contact client établi' },
                    { label: 'Véhicule identifié (plaque, VIN)' },
                    { label: 'État du véhicule vérifié (démarrage, voyants)' },
                    { label: 'Emplacement installation validé' },
                    { label: 'Branchements électriques effectués' },
                    { label: 'Test GPS effectué' },
                    { label: 'Client informé du fonctionnement' }
                ]
            }, { branding });
            showToast(TOAST.IO.PDF_DOWNLOADED, "success");
        } catch (e) {
            showToast(TOAST.IO.PDF_ERROR, "error");
        }
    };

    // Génère le RAPPORT D'INTERVENTION (après intervention - compte-rendu)
    const handleDownloadRapport = () => {
        try {
            const tech = technicians.find(t => t.id === formData.technicianId);
            const client = clients.find(c => c.id === formData.clientId);

            // Construire les observations à partir de la checklist
            const checklistItems = [];
            if (formData.checkStart) checklistItems.push('Démarrage OK');
            if (formData.checkLights) checklistItems.push('Feux OK');
            if (formData.checkDashboard) checklistItems.push('Tableau de bord OK');
            if (formData.checkAC) checklistItems.push('Climatisation OK');
            if (formData.checkAudio) checklistItems.push('Audio OK');
            if (formData.checkBattery) checklistItems.push('Batterie OK');

            generateRapportInterventionPDF({
                id: formData.id || 'RAPPORT',
                date: formData.scheduledDate || new Date().toISOString(),
                vehicle: {
                    plate: formData.licensePlate || formData.vehicleId || 'N/A',
                    brand: formData.vehicleBrand,
                    model: formData.vehicleModel,
                    client: client?.name,
                    mileage: formData.vehicleMileage?.toString(),
                    type: formData.vehicleType
                },
                technician: {
                    name: tech?.name || 'Non assigné',
                    phone: tech?.phone
                },
                client: {
                    name: client?.name || 'Inconnu',
                    phone: formData.contactPhone || client?.phone,
                    location: formData.location || client?.address
                },
                type: formData.type || 'INTERVENTION',
                nature: formData.nature,
                ticketId: formData.ticketId,
                description: formData.description || formData.notes || 'Aucune description.',
                actions: formData.material,
                partsUsed: (formData.material || []).map(m => ({ name: m, quantity: 1 })),
                duration: formData.duration?.toString(),
                signatureTech: formData.signatureTech,
                signatureClient: formData.signatureClient,
                notes: formData.notes,
                status: formData.status || 'COMPLETED',
                // Données spécifiques au rapport
                imei: formData.imei,
            }, { branding });
            showToast(TOAST.IO.PDF_DOWNLOADED, "success");
        } catch (e) {
            showToast(TOAST.IO.PDF_ERROR, "error");
        }
    };

    const handleSaveAndGenerateBon = () => {
        try {
            // Auto-transition: si une date est planifiée et le statut est PENDING, passer à SCHEDULED
            const dataToValidate = { ...formData };
            if (dataToValidate.scheduledDate && dataToValidate.status === 'PENDING') {
                dataToValidate.status = 'SCHEDULED';
            }
            const validatedData = InterventionSchema.parse(dataToValidate);
            const payload = validatedData as unknown as Partial<Intervention>;
            onSave(payload);
            handleDownloadBon();
            onClose();
            showToast(TOAST.TECH.INTERVENTION_SAVED_AND_PDF, 'success');
        } catch (error) {
            if (error instanceof z.ZodError) {
                const firstError = error.issues[0];
                showToast(mapError(`${firstError.path.join('.')}: ${firstError.message}`), 'error');
            } else {
                showToast(TOAST.VALIDATION.FORM_ERRORS, "error");
            }
        }
    };

    return {
        // State
        formData,
        setFormData,
        activeTab,
        setActiveTab,
        isTestLoading,
        testResult,
        isTicketModalOpen,
        setIsTicketModalOpen,
        technicianSignature,
        currentNatureConfig,

        // Computed
        availableVehicles,

        // Context data
        vehicles,
        clients,
        stock,
        catalogItems,
        tickets,
        contracts,
        users,
        branches,
        user,
        addInvoice,

        // Helpers
        hasMaterial,
        hasTracker,
        hasSim,
        hasSensor,
        isTransfer,

        // Validation
        validateTab,
        handleTabChange,

        // Handlers
        handleMaterialToggle,
        handleSimulateTest,
        handleStartIntervention,
        handleCompleteIntervention,
        handleSubmit,
        handleDownloadBon,
        handleDownloadRapport,
        handleSaveAndGenerateBon,
        showToast
    };
}

// Helper for Vehicle Selection
export const getVehicleUpdates = (vehicleId: string, availableVehicles: any[], stock: any[], formData: any, contracts?: any[]) => {
    const v = availableVehicles.find(veh => veh.id === vehicleId);
    if (!v) {
        // S'ils ont sélectionné une balise en stock (Installation)
        const s = stock.find(st => st.id === vehicleId);
        if (s) {
            return {
                vehicleId,
                imei: s.imei || s.serialNumber || '',
                iccid: s.iccid || s.simCardId || '',
                simCard: s.phoneNumber || '',
                beaconType: s.model || '',
                licensePlate: s.imei || s.serialNumber || '' // Default plate to IMEI for new installations
            };
        }
        return { vehicleId };
    }

    let newImei = '';
    let newIccid = '';
    let newPhone = '';
    let newSensorSerial = '';

    // Pour DEPANNAGE/non-INSTALLATION: récupérer le matériel déjà installé
    if (formData.type !== 'INSTALLATION') {
        // 1. Chercher dans le stock (BOX assignée au véhicule)
        const device = stock.find(d => d.assignedVehicleId === v.id && (d.type === 'BOX' || !d.type));
        if (device) {
            newImei = device.imei || device.serialNumber || '';
            newIccid = device.simCardId || device.iccid || '';

            if (newIccid) {
                const sim = stock.find(s => (s.type === 'SIM') && (s.iccid === newIccid || s.serialNumber === newIccid));
                if (sim) newPhone = sim.phoneNumber || '';
            }
        }

        // 2. Chercher SIM assignée au véhicule dans le stock (si pas trouvée via BOX)
        if (!newIccid || !newPhone) {
            const simDevice = stock.find(s => s.type === 'SIM' && s.assignedVehicleId === v.id);
            if (simDevice) {
                if (!newIccid) newIccid = simDevice.iccid || simDevice.serialNumber || '';
                if (!newPhone) newPhone = simDevice.phoneNumber || '';
            }
        }

        // 3. Fallback: utiliser les champs du véhicule lui-même
        if (!newImei && v.imei) newImei = v.imei;
        if (!newIccid && v.sim) newIccid = v.sim;

        const sensor = stock.find(d => d.assignedVehicleId === v.id && (d.type === 'SENSOR' || d.type === 'ACCESSORY'));
        if (sensor) newSensorSerial = sensor.serialNumber || '';
    }

    return {
        vehicleId: v.id,
        branchId: v.branchId || '',
        licensePlate: v.plate || v.licensePlate || v.name || v.id,
        wwPlate: v.wwPlate || v.ww_plate || '',
        vehicleBrand: v.brand || '',
        vehicleModel: v.model || v.name,
        vehicleName: v.name,
        vehicleType: v.vehicleType || v.type || '',
        vehicleYear: v.year || v.vehicleYear || '',
        tempPlate: v.wwPlate || v.ww_plate || v.tempPlate || '',
        vin: v.vin || '',
        vehicleColor: v.color || '',
        vehicleMileage: v.mileage || v.odometer || 0,
        
        // Type de balise depuis le véhicule (tracker_model ou deviceModel)
        beaconType: v.trackerModel || v.tracker_model || v.deviceModel || v.device_model || '',

        // Fuel Configuration Pre-fill
        tankCapacity: v.tankCapacity,
        fuelSensorType: v.fuelSensorType || 'CANBUS',
        refillThreshold: v.refillThreshold,
        theftThreshold: v.theftThreshold,
        calibrationTable: v.calibrationTable
            ? v.calibrationTable.map((row: any) => row.join(',')).join('\n')
            : '',

        imei: newImei,
        iccid: newIccid,
        simCard: newPhone,
        sensorSerial: newSensorSerial,

        // Contrat lié au véhicule
        ...(contracts && contracts.length > 0 ? (() => {
            // 1. Chercher via le contractId du véhicule lui-même
            if (v.contractId) {
                const directContract = contracts.find(c => c.id === v.contractId);
                if (directContract) return { contractId: directContract.id };
            }
            // 2. Chercher le contrat actif qui contient ce véhicule dans vehicleIds
            const vehicleContract = contracts.find(c =>
                c.status === 'ACTIVE' &&
                c.vehicleIds?.includes(vehicleId) &&
                (!c.endDate || new Date(c.endDate) > new Date())
            );
            if (vehicleContract) return { contractId: vehicleContract.id };
            // 3. Fallback: contrat actif du même client
            if (v.clientId) {
                const clientContract = contracts.find(c =>
                    c.clientId === v.clientId &&
                    c.status === 'ACTIVE' &&
                    (!c.endDate || new Date(c.endDate) > new Date())
                );
                if (clientContract) return { contractId: clientContract.id };
            }
            return {};
        })() : {})
    };
};
