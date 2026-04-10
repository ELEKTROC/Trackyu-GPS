import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { AlertFormData } from '../../../../schemas/alertSchema';
import { AlertSchema } from '../../../../schemas/alertSchema';
import type { Tier, Vehicle } from '../../../../types';
import type { User } from '../../../../types/auth';
interface ZoneOption { id: string; nom?: string; name?: string; client?: string; }
import { Copy, Activity, Calendar, Bell } from 'lucide-react';
import { FormField, FormSection, FormGrid, Input, Select, Textarea } from '../../../../components/form';
import { useToast } from '../../../../contexts/ToastContext';

interface BaseFormProps {
    initialData?: Partial<AlertFormData>;
    onFormSubmit: (data: AlertFormData) => void | Promise<void>;
}

export const AlertForm = React.forwardRef<HTMLFormElement, BaseFormProps & { resellers?: Tier[], clients?: Tier[], branches?: unknown[], groups?: unknown[], vehicles?: Vehicle[], users?: User[], zones?: ZoneOption[] }>(({ initialData, onFormSubmit, resellers = [], clients = [], vehicles = [], users = [], zones = [] }, ref) => {
    const { showToast } = useToast();
    const {
        register,
        handleSubmit,
        watch,
        setValue,
        formState: { errors },
    } = useForm<AlertFormData>({
         
        resolver: zodResolver(AlertSchema),
        defaultValues: initialData || {
            nom: '',
            type: 'Vitesse',
            priorite: 'Moyenne',
            statut: 'Actif',
            allVehicles: false,
            vehicleIds: [],
            notificationUserIds: [],
            notifyWeb: true,
            notifyEmail: false,
            notifySms: false,
            notifyPush: false,
            isScheduled: false,
            scheduleDays: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven'],
            scheduleTimeStart: '00:00',
            scheduleTimeEnd: '23:59'
        }
    });

    const type = watch('type');
    const selectedClient = watch('client');
    const allVehicles = watch('allVehicles');
    const isScheduled = watch('isScheduled');
    const selectedVehicleIds = watch('vehicleIds') || [];
    const selectedUserIds = watch('notificationUserIds') || [];

    const [isVehicleDropdownOpen, setIsVehicleDropdownOpen] = useState(false);
    const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);

    const filteredVehicles = React.useMemo(() => {
        if (!selectedClient) return vehicles;
        return vehicles.filter((v: Vehicle) => v.client === selectedClient);
    }, [vehicles, selectedClient]);

    const filteredUsers = React.useMemo(() => {
        if (!selectedClient) return users;
        return users.filter((u: User) => (u as unknown as Record<string, unknown>)['client'] === selectedClient || u.clientId === selectedClient);
    }, [users, selectedClient]);

    const filteredZones = React.useMemo(() => {
        // Assuming zones have client field
        if (!selectedClient) return zones;
        return zones.filter((z: ZoneOption) => !z.client || z.client === selectedClient);
    }, [zones, selectedClient]);

    const toggleVehicle = (id: string) => {
        const current = selectedVehicleIds;
        const updated = current.includes(id) 
            ? current.filter((i: string) => i !== id)
            : [...current, id];
        setValue('vehicleIds', updated);
    };

    const toggleUser = (id: string) => {
        const current = selectedUserIds;
        const updated = current.includes(id) 
            ? current.filter((i: string) => i !== id)
            : [...current, id];
        setValue('notificationUserIds', updated);
    };

    const [isSaving, setIsSaving] = useState(false);
    const onSubmit = async (data: AlertFormData) => {
        if (isSaving) return;
        setIsSaving(true);
        try { await onFormSubmit(data); } finally { setIsSaving(false); }
    };

    const handleClone = () => {
        const currentData = initialData;
        if (currentData) {
             setValue('id', undefined);
             setValue('client', '');
             showToast("Mode clonage activé : Sélectionnez un nouveau client et enregistrez pour créer une copie.", 'info');
        }
    };

    return (
        <form ref={ref} onSubmit={handleSubmit(onSubmit)} className="space-y-4 flex flex-col">
            <div className="flex justify-end mb-2 shrink-0">
                {initialData && (
                    <button type="button" onClick={handleClone} className="text-xs flex items-center gap-1 text-[var(--primary)] hover:text-[var(--primary)] bg-[var(--primary-dim)] hover:bg-[var(--primary-dim)] px-2.5 py-1.5 rounded-lg transition-colors font-medium">
                        <Copy className="w-3.5 h-3.5" /> Cloner vers un autre client
                    </button>
                )}
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
                {/* Context */}
                <FormGrid columns={2}>
                    <FormField label="Revendeur">
                        <Select {...register('resellerId')}>
                            <option value="">Sélectionner...</option>
                            {resellers.map((r: Tier) => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </Select>
                    </FormField>
                    <FormField label="Client">
                        <Select {...register('client')}>
                            <option value="">Sélectionner...</option>
                            {clients.map((c: Tier) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </Select>
                    </FormField>
                </FormGrid>

                {/* Basic Info */}
                <FormGrid columns={2}>
                    <FormField label="Nom de l'alerte" error={errors.nom?.message as string}>
                        <Input {...register('nom')} placeholder="Ex: Alerte Vitesse Excessive" />
                    </FormField>
                    <FormField label="Priorité">
                        <Select {...register('priorite')}>
                            <option value="Haute">Haute (Critique)</option>
                            <option value="Moyenne">Moyenne</option>
                            <option value="Basse">Basse (Info)</option>
                        </Select>
                    </FormField>
                </FormGrid>

                {/* Trigger Configuration */}
                <FormSection icon={Activity} title="Déclencheur">
                    <FormField label="Type d'événement">
                        <Select {...register('type')}>
                            <optgroup label="Sécurité & Conduite">
                                <option value="SOS">Bouton SOS (Urgence)</option>
                                <option value="Speeding">Vitesse Excessive</option>
                                <option value="HarshDriving">Conduite Brusque (Accélération/Freinage/Virage)</option>
                                <option value="Fatigue">Conduite sans interruption (Fatigue)</option>
                                <option value="NightDriving">Conduite de nuit non autorisée</option>
                                <option value="Seatbelt">Ceinture non attachée</option>
                            </optgroup>
                            <optgroup label="Géolocalisation">
                                <option value="Geofence">Entrée/Sortie de Zone (Geofence)</option>
                                <option value="RouteDeviation">Écart d'itinéraire</option>
                                <option value="Address">Départ/Arrivée à une adresse (POI)</option>
                            </optgroup>
                            <optgroup label="Véhicule & Maintenance">
                                <option value="Ignition">Démarrage / Arrêt Moteur</option>
                                <option value="Idling">Ralenti Excessif (Moteur tournant à l'arrêt)</option>
                                <option value="Battery">Batterie Véhicule (Déconnexion)</option>
                                <option value="BatteryLevel">Niveau Batterie Faible (Seuil)</option>
                                <option value="Towing">Remorquage (Mouvement sans contact)</option>
                                <option value="Crash">Détection d'accident</option>
                            </optgroup>
                            <optgroup label="Carburant">
                                <option value="FuelLevel">Niveau Carburant Bas</option>
                                <option value="FuelTheft">Vol de Carburant (Chute brutale)</option>
                                <option value="FuelFill">Remplissage Carburant</option>
                                <option value="FuelSensor">Erreur Capteur Carburant</option>
                            </optgroup>
                            <optgroup label="Appareil (Boîtier)">
                                <option value="PowerCut">Coupure Alimentation Externe</option>
                                <option value="DeviceBattery">Batterie Interne Faible</option>
                                <option value="SignalLoss">Perte de Signal GSM/GPS</option>
                                <option value="CoverOpen">Boîtier Ouvert (Sabotage)</option>
                            </optgroup>
                        </Select>
                    </FormField>

                    {/* Dynamic Fields based on Type */}
                    
                    {/* Vitesse */}
                    {type === 'Speeding' && (
                        <FormGrid columns={2}>
                            <FormField label="Vitesse Limite (km/h)">
                                <Input {...register('conditionValue')} type="number" placeholder="Ex: 90" />
                            </FormField>
                            <FormField label="Durée tolérée (secondes)" hint="Déclencher seulement si la vitesse dépasse la limite pendant plus de X secondes.">
                                <Input {...register('conditionDuration')} type="number" placeholder="Ex: 10" />
                            </FormField>
                        </FormGrid>
                    )}

                    {/* Conduite Brusque (HarshDriving) */}
                    {type === 'HarshDriving' && (
                        <>
                            <FormGrid columns={2}>
                                <FormField label="Type d'événement">
                                    <Select {...register('harshDrivingType')}>
                                        <option value="ALL">Tous (Freinage + Accélération + Virage)</option>
                                        <option value="BRAKING">Freinage brusque uniquement</option>
                                        <option value="ACCEL">Accélération brusque uniquement</option>
                                        <option value="TURN">Virages brusques uniquement</option>
                                    </Select>
                                </FormField>
                                <FormField label="Anti-répétition (minutes)" hint="Délai minimum entre deux alertes du même type.">
                                    <Input {...register('conditionDuration')} type="number" placeholder="Ex: 5" defaultValue={5} />
                                </FormField>
                            </FormGrid>
                            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                                <p className="text-xs text-amber-700 dark:text-amber-300">
                                    <strong>ℹ️ Comment ça fonctionne :</strong><br/>
                                    Les événements de conduite brusque sont détectés par l'<strong>accéléromètre embarqué</strong> dans le boîtier GPS. 
                                    La sensibilité (seuils de G-force) est configurée directement sur le boîtier via commandes AT/SMS.
                                </p>
                            </div>
                        </>
                    )}

                    {/* Crash Detection */}
                    {type === 'Crash' && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                            <p className="text-xs text-red-700 dark:text-red-300">
                                <strong>⚠️ Détection d'Accident (Crash)</strong><br/>
                                Cette alerte est déclenchée automatiquement par le boîtier GPS lorsqu'un impact important est détecté 
                                (G-force &gt; 2g sur plusieurs axes). Les alertes CRASH sont toujours de <strong>priorité CRITIQUE</strong> et génèrent 
                                une notification immédiate sur tous les canaux configurés.
                            </p>
                        </div>
                    )}

                    {/* SOS Button */}
                    {type === 'SOS' && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                            <p className="text-xs text-red-700 dark:text-red-300">
                                <strong>🆘 Bouton SOS (Urgence)</strong><br/>
                                Cette alerte est déclenchée lorsque le conducteur appuie sur le bouton SOS du boîtier GPS. 
                                Elle est toujours de <strong>priorité CRITIQUE</strong> et nécessite une réponse immédiate.
                            </p>
                        </div>
                    )}

                    {/* Zone / Geofence */}
                    {type === 'Geofence' && (
                        <FormGrid columns={2}>
                            <FormField label="Zone Géographique">
                                <Select {...register('conditionZoneId')}>
                                    <option value="">Sélectionner une zone...</option>
                                    {filteredZones.map((z: ZoneOption) => <option key={z.id} value={z.id}>{z.nom || z.name}</option>)}
                                </Select>
                            </FormField>
                            <FormField label="Direction">
                                <Select {...register('conditionDirection')}>
                                    <option value="Enter">Entrée dans la zone</option>
                                    <option value="Exit">Sortie de la zone</option>
                                    <option value="Both">Entrée & Sortie</option>
                                </Select>
                            </FormField>
                        </FormGrid>
                    )}

                    {/* Ralenti */}
                    {type === 'Idling' && (
                        <FormField label="Durée Max autorisée (minutes)">
                            <Input {...register('conditionDuration')} type="number" placeholder="Ex: 10" />
                        </FormField>
                    )}
                    
                    {/* Carburant */}
                    {(type === 'FuelTheft' || type === 'FuelFill') && (
                        <FormField label="Volume / Pourcentage (%)" hint="Valeur minimale de changement pour déclencher l'alerte.">
                            <Input {...register('conditionValue')} type="number" placeholder="Ex: 10" />
                        </FormField>
                    )}

                    {type === 'FuelLevel' && (
                        <FormField label="Seuil d'alerte (%)">
                            <Input {...register('conditionValue')} type="number" placeholder="Ex: 15" />
                        </FormField>
                    )}

                    {/* Batterie Seuil */}
                    {(type === 'BatteryLevel' || type === 'DeviceBattery') && (
                        <FormGrid columns={2}>
                            <FormField label="Seuil de tension (V) ou %">
                                <Input {...register('conditionValue')} type="number" step="0.1" placeholder="Ex: 11.5" />
                            </FormField>
                            <FormField label="Durée de confirmation (sec)" hint="Pour éviter les fausses alertes dues aux fluctuations.">
                                <Input {...register('conditionDuration')} type="number" placeholder="Ex: 60" />
                            </FormField>
                        </FormGrid>
                    )}

                    {/* Conduite Continue */}
                    {type === 'Fatigue' && (
                        <FormField label="Durée de conduite max (heures)">
                            <Input {...register('conditionValue')} type="number" step="0.5" placeholder="Ex: 4" />
                        </FormField>
                    )}

                    {/* Signal Loss */}
                    {type === 'SignalLoss' && (
                        <FormField label="Délai avant alerte (minutes)">
                            <Input {...register('conditionDuration')} type="number" placeholder="Ex: 10" />
                        </FormField>
                    )}
                </FormSection>

                {/* Vehicles Scope */}
                <div className="relative">
                    <div className="flex justify-between items-center mb-2">
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Véhicules concernés</label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" {...register('allVehicles')} className="w-4 h-4 rounded-lg border-slate-300 text-[var(--primary)] focus:ring-[var(--primary)]" />
                            <span className="text-xs text-slate-600 dark:text-slate-400">Tous les véhicules du client</span>
                        </label>
                    </div>
                    
                    {!allVehicles && (
                        <>
                            <button 
                                type="button" 
                                onClick={() => setIsVehicleDropdownOpen(!isVehicleDropdownOpen)}
                                className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-sm text-left flex justify-between items-center hover:border-slate-400 transition-colors"
                            >
                                <span className={selectedVehicleIds.length === 0 ? "text-slate-400" : "text-slate-700 dark:text-slate-300"}>
                                    {selectedVehicleIds.length === 0 
                                        ? "Sélectionner les véhicules..." 
                                        : `${selectedVehicleIds.length} véhicule(s) sélectionné(s)`}
                                </span>
                                <span className="text-xs text-slate-400">▼</span>
                            </button>
                            
                            {isVehicleDropdownOpen && (
                                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                                    {filteredVehicles.length === 0 ? (
                                        <div className="p-3 text-sm text-slate-500">Aucun véhicule trouvé pour ce client.</div>
                                    ) : (
                                        filteredVehicles.map((v: Vehicle) => (
                                            <label key={v.id} className="flex items-center gap-2 p-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer">
                                                <input 
                                                    type="checkbox" 
                                                    checked={selectedVehicleIds.includes(v.id)} 
                                                    onChange={() => toggleVehicle(v.id)}
                                                    className="w-4 h-4 rounded-lg border-slate-300 text-[var(--primary)] focus:ring-[var(--primary)]" 
                                                />
                                                <span className="text-sm text-slate-700 dark:text-slate-200">{v.name} ({v.id})</span>
                                            </label>
                                        ))
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Schedule */}
                <FormSection icon={Calendar} title="Calendrier d'activation">
                    <div className="flex items-center justify-between mb-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" {...register('isScheduled')} className="w-4 h-4 rounded-lg border-slate-300 text-[var(--primary)] focus:ring-[var(--primary)]" />
                            <span className="text-sm text-slate-600 dark:text-slate-400">Activer selon planning</span>
                        </label>
                    </div>
                    
                    {watch('isScheduled') && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-2">Jours actifs</label>
                                <div className="flex flex-wrap gap-2">
                                    {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(day => (
                                        <label key={day} className="flex items-center gap-1.5 text-xs cursor-pointer bg-white dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-[var(--primary)] transition-colors">
                                            <input type="checkbox" value={day} {...register('scheduleDays')} className="w-3.5 h-3.5 rounded border-slate-300 text-[var(--primary)] focus:ring-[var(--primary)]" />
                                            {day}
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <FormField label="De" className="flex-1">
                                    <Input {...register('scheduleTimeStart')} type="time" />
                                </FormField>
                                <FormField label="À" className="flex-1">
                                    <Input {...register('scheduleTimeEnd')} type="time" />
                                </FormField>
                            </div>
                        </div>
                    )}
                    {!watch('isScheduled') && <p className="text-xs text-slate-500 italic">L'alerte est active 24h/24 et 7j/7.</p>}
                </FormSection>

                {/* Notifications */}
                <FormSection icon={Bell} title="Notifications">
                    <div className="flex gap-4 mb-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" {...register('notifyWeb')} className="w-4 h-4 rounded-lg border-slate-300 text-[var(--primary)] focus:ring-[var(--primary)]" />
                            <span className="text-sm text-slate-700 dark:text-slate-300">Web (Plateforme)</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" {...register('notifyEmail')} className="w-4 h-4 rounded-lg border-slate-300 text-[var(--primary)] focus:ring-[var(--primary)]" />
                            <span className="text-sm text-slate-700 dark:text-slate-300">Email</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" {...register('notifySms')} className="w-4 h-4 rounded-lg border-slate-300 text-[var(--primary)] focus:ring-[var(--primary)]" />
                            <span className="text-sm text-slate-700 dark:text-slate-300">SMS</span>
                        </label>
                    </div>

                    <div className="space-y-4">
                        <div className="relative">
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1.5">Utilisateurs à notifier</label>
                            <button 
                                type="button" 
                                onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                                className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-sm text-left flex justify-between items-center hover:border-slate-400 transition-colors"
                            >
                                <span className={selectedUserIds.length === 0 ? "text-slate-400" : "text-slate-700 dark:text-slate-300"}>
                                    {selectedUserIds.length === 0 
                                        ? "Sélectionner les utilisateurs..." 
                                        : `${selectedUserIds.length} utilisateur(s) sélectionné(s)`}
                                </span>
                                <span className="text-xs text-slate-400">▼</span>
                            </button>
                            
                            {isUserDropdownOpen && (
                                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                                    {filteredUsers.length === 0 ? (
                                        <div className="p-3 text-sm text-slate-500">Aucun utilisateur trouvé pour ce client.</div>
                                    ) : (
                                        filteredUsers.map((u: User) => (
                                            <label key={u.id} className="flex items-start gap-2 p-3 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer border-b border-slate-100 dark:border-slate-700 last:border-0">
                                                <input 
                                                    type="checkbox" 
                                                    checked={selectedUserIds.includes(u.id)} 
                                                    onChange={() => toggleUser(u.id)}
                                                    className="mt-0.5 w-4 h-4 rounded-lg border-slate-300 text-[var(--primary)] focus:ring-[var(--primary)]" 
                                                />
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{u.name}</span>
                                                    <span className="text-xs text-slate-500">{u.email}</span>
                                                </div>
                                            </label>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>

                        <FormField label="Emails externes (séparés par virgule)">
                            <Input {...register('customEmails')} placeholder="ex: boss@gmail.com, service@client.com" />
                        </FormField>
                    </div>
                </FormSection>

                <FormField label="Statut">
                    <Select {...register('statut')}>
                        <option value="Actif">Actif</option>
                        <option value="Inactif">Inactif</option>
                    </Select>
                </FormField>
            </div>
        </form>
    );
});

AlertForm.displayName = 'AlertForm';