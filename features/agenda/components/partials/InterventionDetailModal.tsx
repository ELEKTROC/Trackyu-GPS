import React from 'react';
import {
    X, Edit, Calendar, Clock, User, MapPin, Car, Wrench,
    FileText, CheckCircle, AlertCircle, Phone, Building2,
    Package, FileCheck, Download, Navigation, PlayCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getStatusBgClass } from '../../../../constants';
import { generateBonInterventionPDF, generateRapportInterventionPDF } from '../../../../services/pdfServiceV2';
import { useTenantBranding } from '../../../../hooks/useTenantBranding';
import { useToast } from '../../../../contexts/ToastContext';
import { TOAST } from '../../../../constants/toastMessages';
import { mapError } from '../../../../utils/errorMapper';

interface InterventionDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    onEdit: () => void;
    onStatusChange?: (intervention: any, newStatus: string) => void;
    intervention: any;
    clients: any[];
}

export const InterventionDetailModal: React.FC<InterventionDetailModalProps> = ({
    isOpen,
    onClose,
    onEdit,
    onStatusChange,
    intervention,
    clients
}) => {
    const { branding } = useTenantBranding();
    const { showToast } = useToast();

    // Trouver le client pour les fallbacks d'infos de contact
    const client = clients?.find(c => String(c.id) === String(intervention?.clientId));
    const displayContactPhone = intervention?.contactPhone || client?.phone || client?.mobile;

    if (!isOpen || !intervention) return null;

    const formatDate = (date: string | Date | undefined) => {
        if (!date) return 'Non définie';
        try {
            return format(new Date(date), 'EEEE d MMMM yyyy à HH:mm', { locale: fr });
        } catch {
            return 'Date invalide';
        }
    };

    const formatShortDate = (date: string | Date | undefined) => {
        if (!date) return '-';
        try {
            return format(new Date(date), 'dd/MM/yyyy HH:mm');
        } catch {
            return '-';
        }
    };

    const getStatusLabel = (status: string) => {
        const labels: Record<string, string> = {
            'PENDING': 'À planifier',
            'SCHEDULED': 'Planifiée',
            'EN_ROUTE': 'En route',
            'IN_PROGRESS': 'En cours',
            'COMPLETED': 'Terminée',
            'CANCELLED': 'Annulée',
            'POSTPONED': 'Reportée'
        };
        return labels[status] || status;
    };

    const getPriorityLabel = (priority: string) => {
        const labels: Record<string, { label: string; color: string }> = {
            'LOW': { label: 'Basse', color: 'bg-slate-100 text-slate-700' },
            'NORMAL': { label: 'Normale', color: 'bg-[var(--primary-dim)] text-[var(--primary)]' },
            'HIGH': { label: 'Haute', color: 'bg-orange-100 text-orange-700' },
            'URGENT': { label: 'Urgente', color: 'bg-red-100 text-red-700' }
        };
        return labels[priority] || { label: priority, color: 'bg-slate-100 text-slate-700' };
    };

    const priority = getPriorityLabel(intervention.priority || 'NORMAL');

    const handleDownloadBon = () => {
        try {
            generateBonInterventionPDF({
                id: intervention.id,
                date: intervention.scheduledDate || intervention.createdAt,
                vehicle: {
                    plate: intervention.licensePlate || intervention.vehicleId || 'N/A',
                    brand: intervention.vehicleBrand,
                    model: intervention.vehicleModel,
                    client: intervention.clientName,
                    mileage: intervention.vehicleMileage?.toString(),
                    type: intervention.vehicleType
                },
                technician: {
                    name: intervention.technicianName || 'Non assigné',
                    phone: intervention.technicianPhone
                },
                client: {
                    name: intervention.clientName || 'Inconnu',
                    phone: intervention.contactPhone,
                    location: intervention.location
                },
                type: intervention.type || 'INTERVENTION',
                nature: intervention.nature,
                ticketId: intervention.ticketId,
                description: intervention.description || 'Aucune description.',
                actions: intervention.material,
                partsUsed: (intervention.material || []).map((m: string) => ({ name: m, quantity: 1 })),
                duration: intervention.duration?.toString(),
                notes: intervention.notes,
                status: intervention.status,
                checklist: [
                    { label: 'Kit relais', checked: false },
                    { label: 'Antenne GPS', checked: false },
                    { label: 'Câblage OBD', checked: false },
                    { label: 'Fusible', checked: false },
                    { label: 'Alimentation 12V', checked: false },
                    { label: 'Test de transmission', checked: false },
                    { label: 'Photos installation', checked: false },
                ]
            }, { branding });
            showToast(TOAST.IO.PDF_DOWNLOADED, "success");
        } catch (e) {
            showToast(mapError(e, 'intervention'), "error");
        }
    };

    const handleDownloadRapport = () => {
        try {
            generateRapportInterventionPDF({
                id: intervention.id,
                date: intervention.scheduledDate || intervention.createdAt,
                vehicle: {
                    plate: intervention.licensePlate || intervention.vehicleId || 'N/A',
                    brand: intervention.vehicleBrand,
                    model: intervention.vehicleModel,
                    client: intervention.clientName,
                    mileage: intervention.vehicleMileage?.toString(),
                    type: intervention.vehicleType
                },
                technician: {
                    name: intervention.technicianName || 'Non assigné',
                    phone: intervention.technicianPhone
                },
                client: {
                    name: intervention.clientName || 'Inconnu',
                    phone: intervention.contactPhone,
                    location: intervention.location
                },
                type: intervention.type || 'INTERVENTION',
                nature: intervention.nature,
                ticketId: intervention.ticketId,
                description: intervention.description || 'Aucune description.',
                actions: intervention.material,
                partsUsed: (intervention.material || []).map((m: string) => ({ name: m, quantity: 1 })),
                duration: intervention.duration?.toString(),
                signatureTech: intervention.signatureTech,
                signatureClient: intervention.signatureClient,
                notes: intervention.notes,
                status: intervention.status || 'COMPLETED',
                imei: intervention.imei,
                simCard: intervention.simCard,
                testResults: intervention.testResult || 'Tests effectués avec succès',
                observations: intervention.observations || intervention.notes
            }, { branding });
            showToast(TOAST.IO.PDF_DOWNLOADED, "success");
        } catch (e) {
            showToast(mapError(e, 'intervention'), "error");
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60"
                onClick={onClose}
            />

            {/* Modal Container */}
            <div className="relative bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-xl shadow-2xl w-full sm:max-w-2xl h-[92vh] sm:h-auto sm:max-h-[90vh] flex flex-col border-0 sm:border border-slate-200 dark:border-slate-700 z-[101] animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">

                {/* Drag handle — mobile only */}
                <div className="sm:hidden flex justify-center pt-2 pb-1 shrink-0">
                    <div className="w-10 h-1 bg-slate-300 dark:bg-slate-600 rounded-full" />
                </div>

                {/* Header - Fixed at top */}
                <div className="flex-shrink-0 px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 rounded-t-2xl sm:rounded-t-xl">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                            <Wrench className="w-5 h-5 text-orange-600" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                                    Intervention {intervention.id || 'N/A'}
                                </h3>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 bg-white/50 dark:bg-black/20 px-1.5 py-0.5 rounded border border-slate-200 dark:border-white/10">
                                    Créé le {formatShortDate(intervention.createdAt)}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {onStatusChange && (
                            <>
                                {(intervention.status === 'PENDING' || intervention.status === 'SCHEDULED') && (
                                    <button
                                        onClick={() => {
                                            onStatusChange(intervention, 'EN_ROUTE');
                                            showToast(TOAST.TECH.TECH_EN_ROUTE, 'success');
                                        }}
                                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-bold shadow-lg shadow-purple-600/20"
                                    >
                                        <Navigation className="w-4 h-4" /> En route
                                    </button>
                                )}
                                {intervention.status === 'EN_ROUTE' && (
                                    <button
                                        onClick={() => {
                                            onStatusChange(intervention, 'IN_PROGRESS');
                                            showToast(TOAST.TECH.TECH_STARTED, 'success');
                                        }}
                                        className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-bold shadow-lg shadow-orange-600/20"
                                    >
                                        <PlayCircle className="w-4 h-4" /> Démarrer
                                    </button>
                                )}
                            </>
                        )}
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-500 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Content - Scrollable */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6 min-h-0" style={{ WebkitOverflowScrolling: 'touch' }}>
                    
                    {/* Status & Priority */}
                    {/* Status, Priority & Nature Badges */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${getStatusBgClass(intervention.status || 'PENDING')}`}>
                            {getStatusLabel(intervention.status || 'PENDING')}
                        </span>
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${priority.color}`}>
                            {priority.label}
                        </span>
                        {(intervention.nature || intervention.type) && (
                            <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800">
                                {intervention.nature || intervention.type}
                            </span>
                        )}
                    </div>

                    {/* Date & Time */}
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 space-y-3">
                        <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-[var(--primary)]" />
                            Planification
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                            <div>
                                <p className="text-xs text-slate-500 mb-1">Date prévue</p>
                                <p className="text-sm font-medium text-slate-800 dark:text-white">
                                    {formatDate(intervention.scheduledDate)}
                                </p>
                            </div>
                            {(intervention.address || intervention.location) && (
                                <div>
                                    <p className="text-xs text-slate-500 mb-1">Client</p>
                                    <p className="text-sm font-medium text-slate-800 dark:text-white flex items-start gap-1.5">
                                        <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5" />
                                        {intervention.address || intervention.location}
                                    </p>
                                </div>
                            )}
                            {intervention.estimatedDuration && (
                                <div className="col-span-1 sm:col-span-2">
                                    <p className="text-xs text-slate-500 mb-1">Durée estimée</p>
                                    <p className="text-sm font-medium text-slate-800 dark:text-white flex items-center gap-1">
                                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                                        {intervention.estimatedDuration} min
                                    </p>
                                </div>
                            )}
                        </div>
                        {(intervention.startedAt || intervention.completedAt) && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-200 dark:border-slate-700">
                                {intervention.startedAt && (
                                    <div>
                                        <p className="text-xs text-slate-500 mb-1">Démarré le</p>
                                        <p className="text-sm font-medium text-green-600">{formatShortDate(intervention.startedAt)}</p>
                                    </div>
                                )}
                                {intervention.completedAt && (
                                    <div>
                                        <p className="text-xs text-slate-500 mb-1">Terminé le</p>
                                        <p className="text-sm font-medium text-[var(--primary)]">{formatShortDate(intervention.completedAt)}</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Client & Lieu */}
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 space-y-3">
                        <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-indigo-600" />
                            Client
                        </h4>
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {intervention.clientName && (
                                    <div className="flex items-start gap-3">
                                        <Building2 className="w-4 h-4 text-slate-400 mt-0.5" />
                                        <div className="flex-1">
                                            <p className="text-xs text-slate-500">Client</p>
                                            <p className="text-sm font-medium text-slate-800 dark:text-white">
                                                {intervention.clientName}
                                            </p>
                                        </div>
                                    </div>
                                )}
                                {displayContactPhone && (
                                    <div className="flex items-start gap-3 group">
                                        <Phone className="w-4 h-4 text-slate-400 mt-0.5" />
                                        <div className="flex-1">
                                            <p className="text-xs text-slate-500">Téléphone Client</p>
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-medium text-slate-800 dark:text-white">
                                                    {displayContactPhone}
                                                </p>
                                                <a 
                                                    href={`tel:${displayContactPhone}`}
                                                    className="p-1.5 bg-green-100 text-green-600 rounded-full hover:bg-green-200 transition-colors"
                                                    title="Appeler le client"
                                                >
                                                    <Phone className="w-3 h-3" />
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-200/50 dark:border-slate-700/50">
                                {intervention.siteContactName && (
                                    <div className="flex items-start gap-3">
                                        <User className="w-4 h-4 text-slate-400 mt-0.5" />
                                        <div className="flex-1">
                                            <p className="text-xs text-slate-500">Contact sur site</p>
                                            <p className="text-sm font-medium text-slate-800 dark:text-white">
                                                {intervention.siteContactName}
                                            </p>
                                        </div>
                                    </div>
                                )}
                                {intervention.siteContactPhone && (
                                    <div className="flex items-start gap-3 group">
                                        <Phone className="w-4 h-4 text-slate-400 mt-0.5" />
                                        <div className="flex-1">
                                            <p className="text-xs text-slate-500">Téléphone sur site</p>
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-medium text-slate-800 dark:text-white">
                                                    {intervention.siteContactPhone}
                                                </p>
                                                <a 
                                                    href={`tel:${intervention.siteContactPhone}`}
                                                    className="p-1.5 bg-[var(--primary-dim)] text-[var(--primary)] rounded-full hover:bg-[var(--primary-dim)] transition-colors"
                                                    title="Appeler le contact sur site"
                                                >
                                                    <Phone className="w-3 h-3" />
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Vehicle */}
                    {(intervention.vehicleName || intervention.vehiclePlate) && (
                        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 space-y-3">
                            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                <Car className="w-4 h-4 text-green-600" />
                                Véhicule
                            </h4>
                            <div className="flex items-center gap-4">
                                <div>
                                    <p className="text-xs text-slate-500">Véhicule</p>
                                    <p className="text-sm font-medium text-slate-800 dark:text-white">
                                        {intervention.vehicleName || 'Non spécifié'}
                                    </p>
                                </div>
                                {intervention.vehiclePlate && (
                                    <div>
                                        <p className="text-xs text-slate-500">Immatriculation</p>
                                        <p className="text-sm font-bold font-mono text-slate-800 dark:text-white bg-yellow-100 dark:bg-yellow-900/30 px-2 py-0.5 rounded">
                                            {intervention.vehiclePlate}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Technician */}
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 space-y-3">
                        <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                            <User className="w-4 h-4 text-purple-600" />
                            Technicien
                        </h4>
                        <p className="text-sm font-medium text-slate-800 dark:text-white">
                            {intervention.agentName || intervention.technicianName || 'Non assigné'}
                        </p>
                    </div>

                    {/* Materials */}
                    {intervention.materialsUsed && intervention.materialsUsed.length > 0 && (
                        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 space-y-3">
                            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                <Package className="w-4 h-4 text-amber-600" />
                                Matériel utilisé
                            </h4>
                            <div className="space-y-2">
                                {intervention.materialsUsed.map((mat: any, idx: number) => (
                                    <div key={idx} className="flex items-center justify-between text-sm">
                                        <span className="text-slate-700 dark:text-slate-300">{mat.name || mat.itemName}</span>
                                        <span className="font-mono text-slate-500">x{mat.quantity || 1}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Description */}
                    {intervention.description && (
                        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 space-y-3">
                            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                <FileText className="w-4 h-4 text-slate-600" />
                                Description
                            </h4>
                            <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                                {intervention.description}
                            </p>
                            
                            {/* Numéro de ticket déplacé en dessous de la description */}
                            {intervention.ticketId && (
                                <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700/50 flex items-center gap-2">
                                    <span className="text-xs text-slate-500">Référence Ticket:</span>
                                    <span className="text-xs font-mono font-bold bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] text-[var(--primary)] dark:text-[var(--primary)] px-2 py-0.5 rounded border border-[var(--primary)] dark:border-[var(--primary)]">
                                        #{intervention.ticketId}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Result / Outcome */}
                    {intervention.status === 'COMPLETED' && (
                        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
                            <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                                <CheckCircle className="w-5 h-5" />
                                <span className="font-bold">Intervention terminée avec succès</span>
                            </div>
                            {intervention.testResult && (
                                <p className="text-sm text-green-600 dark:text-green-400 mt-2">
                                    Résultat du test: {intervention.testResult}
                                </p>
                            )}
                        </div>
                    )}

                    {intervention.status === 'CANCELLED' && (
                        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 border border-red-200 dark:border-red-800">
                            <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                                <AlertCircle className="w-5 h-5" />
                                <span className="font-bold">Intervention annulée</span>
                            </div>
                            {intervention.cancellationReason && (
                                <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                                    Raison: {intervention.cancellationReason}
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer - Fixed at bottom */}
                <div className="flex-shrink-0 px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex justify-between items-center rounded-b-xl">
                    <div className="flex gap-2">
                        {/* Download Buttons */}
                        <button
                            onClick={handleDownloadBon}
                            className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium border border-slate-200 dark:border-slate-600"
                        >
                            <FileCheck className="w-4 h-4" /> Bon
                        </button>
                        
                        {(intervention.status === 'IN_PROGRESS' || intervention.status === 'COMPLETED') && (
                            <button
                                onClick={handleDownloadRapport}
                                className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium border border-slate-200 dark:border-slate-600"
                            >
                                <Download className="w-4 h-4" /> Rapport
                            </button>
                        )}
                    </div>
                    
                    <div className="flex gap-2">
                        {/* Swapped Modifier Button to footer */}
                        <button
                            onClick={onEdit}
                            className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] hover:bg-[var(--primary-light)] text-white rounded-lg text-sm font-medium transition-colors"
                        >
                            <Edit className="w-4 h-4" />
                            Modifier
                        </button>
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        >
                            Fermer
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
