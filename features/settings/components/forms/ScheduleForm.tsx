import React, { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import type { Path } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { ScheduleFormData } from '../../../../schemas/scheduleSchema';
import { ScheduleSchema, RULE_TYPES } from '../../../../schemas/scheduleSchema';
import type { Tier, Vehicle } from '../../../../types';
interface ZoneOption { id: string; nom?: string; name?: string; client?: string; allClients?: boolean; }
import { 
    Truck, Lock, Clock, Gauge, Route, Timer, MapPin, Calendar, Moon, Settings,
    Bell, Mail, MessageSquare, Smartphone, AlertTriangle, Info
} from 'lucide-react';
import { FormField, FormGrid, Input, Select, Textarea } from '../../../../components/form';

interface BaseFormProps {
    initialData?: Partial<ScheduleFormData>;
    onFormSubmit: (data: ScheduleFormData) => void | Promise<void>;
    clients?: Tier[];
    resellers?: Tier[];
    vehicles?: Vehicle[];
    zones?: ZoneOption[];
    users?: unknown[];
}

const DAYS = [
    { id: 'Lun', label: 'Lundi', full: 'monday' },
    { id: 'Mar', label: 'Mardi', full: 'tuesday' },
    { id: 'Mer', label: 'Mercredi', full: 'wednesday' },
    { id: 'Jeu', label: 'Jeudi', full: 'thursday' },
    { id: 'Ven', label: 'Vendredi', full: 'friday' },
    { id: 'Sam', label: 'Samedi', full: 'saturday' },
    { id: 'Dim', label: 'Dimanche', full: 'sunday' },
];

const getIconComponent = (iconName: string) => {
    const icons: Record<string, any> = { Lock, Clock, Gauge, Route, Timer, MapPin, Calendar, Moon, Settings };
    return icons[iconName] || Settings;
};

export const ScheduleForm = React.forwardRef<HTMLFormElement, BaseFormProps>(({ 
    initialData, onFormSubmit, clients = [], resellers = [], vehicles = [], zones = [], users = [] 
}, ref) => {
    const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<ScheduleFormData>({
         
        resolver: zodResolver(ScheduleSchema),
        defaultValues: initialData || {
            ruleType: 'WORKING_HOURS',
            statut: 'Actif',
            allVehicles: false,
            scheduledImmobilization: { enabled: false, startTime: '02:00', endTime: '05:00', days: DAYS.map(d => d.id) },
            timeRestriction: { enabled: false, mode: 'ALLOWED' },
            speedLimit: { enabled: false, maxSpeed: 90, toleranceSeconds: 10 },
            distanceLimit: { enabled: false, maxKmPerDay: 500 },
            engineHoursLimit: { enabled: false, maxHoursPerDay: 10 },
            geofenceRestriction: { enabled: false, mode: 'FORBIDDEN_ZONES', zoneIds: [] },
            weekendRestriction: { enabled: false },
            nightRestriction: { enabled: false, startTime: '22:00', endTime: '06:00' },
            actions: { createAlert: true, alertPriority: 'MEDIUM', notifyPush: true }
        }
    });

    const ruleType = watch('ruleType');
    const selectedClient = watch('client');
    const allVehicles = watch('allVehicles');

    // Filtrer véhicules par client
    const filteredVehicles = useMemo(() => {
        if (!selectedClient) return vehicles;
        return vehicles.filter((v: Vehicle) => v.client === selectedClient);
    }, [vehicles, selectedClient]);

    // Filtrer zones par client
    const filteredZones = useMemo(() => {
        if (!selectedClient) return zones;
        return zones.filter((z: ZoneOption) => !z.client || z.client === selectedClient || z.allClients);
    }, [zones, selectedClient]);

    const [isSaving, setIsSaving] = useState(false);
    const onSubmit = async (data: ScheduleFormData) => {
        if (isSaving) return;
        setIsSaving(true);
        try { await onFormSubmit(data); } finally { setIsSaving(false); }
    };

    return (
        <form ref={ref} onSubmit={handleSubmit(onSubmit)} className="space-y-4 h-[650px] overflow-y-auto pr-2 custom-scrollbar">
            
            {/* Context: Revendeur & Client */}
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

            {/* Nom de la règle */}
            <FormField label="Nom de la règle" error={errors.nom?.message as string}>
                <Input {...register('nom')} placeholder="Ex: Immobilisation nocturne" />
            </FormField>

            {/* Type de règle - Sélection visuelle */}
            <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-2">Type de règle</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {RULE_TYPES.map((type) => {
                        const IconComp = getIconComponent(type.icon);
                        const isSelected = ruleType === type.id;
                        return (
                            <button
                                key={type.id}
                                type="button"
                                onClick={() => setValue('ruleType', type.id as ScheduleFormData['ruleType'])}
                                className={`p-3 rounded-xl border text-left transition-all ${
                                    isSelected 
                                        ? `bg-${type.color}-50 dark:bg-${type.color}-900/30 border-${type.color}-500 ring-2 ring-${type.color}-500` 
                                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-400'
                                }`}
                            >
                                <IconComp className={`w-5 h-5 mb-1 ${isSelected ? `text-${type.color}-600` : 'text-slate-400'}`} />
                                <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">{type.label}</div>
                            </button>
                        );
                    })}
                </div>
                <p className="text-xs text-slate-500 mt-2">
                    {RULE_TYPES.find(t => t.id === ruleType)?.description}
                </p>
            </div>

            {/* Véhicules concernés */}
            <div className="p-4 border rounded-xl bg-slate-50 dark:bg-slate-800 dark:border-slate-700">
                <label className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] rounded-lg">
                        <Truck className="w-4 h-4 text-[var(--primary)] dark:text-[var(--primary)]" />
                    </div>
                    <span className="font-semibold text-sm text-slate-700 dark:text-slate-300">Véhicules concernés</span>
                </label>
                <div className="flex items-center gap-2 mb-3">
                    <input type="checkbox" {...register('allVehicles')} id="allVehiclesSchedule" className="w-4 h-4 rounded-lg border-slate-300 text-[var(--primary)] focus:ring-[var(--primary)]" />
                    <label htmlFor="allVehiclesSchedule" className="text-sm text-slate-600 dark:text-slate-400">Appliquer à tous les véhicules du client</label>
                </div>
                {!allVehicles && (
                    <div>
                        <select {...register('vehicleIds')} multiple className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-sm h-24">
                            {filteredVehicles.map((v: Vehicle) => (
                                <option key={v.id} value={v.id}>
                                    {v.name || v.licensePlate} {v.licensePlate ? `(${v.licensePlate})` : ''}
                                </option>
                            ))}
                        </select>
                        <p className="text-xs text-slate-500 mt-1.5">Ctrl+Clic pour sélection multiple</p>
                    </div>
                )}
            </div>

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* CONFIGURATION SPÉCIFIQUE PAR TYPE DE RÈGLE */}
            {/* ═══════════════════════════════════════════════════════════ */}

            {/* IMMOBILISATION PROGRAMMÉE */}
            {ruleType === 'SCHEDULED_IMMOBILIZATION' && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg space-y-4">
                    <div className="flex items-center gap-2 text-red-700 dark:text-red-300 font-bold">
                        <Lock className="w-5 h-5" />
                        Configuration Immobilisation Programmée
                    </div>
                    <p className="text-xs text-red-600 dark:text-red-400">
                        Le véhicule sera automatiquement immobilisé pendant la plage horaire définie. 
                        L'immobilisation s'active à l'heure de début et se désactive à l'heure de fin.
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">Heure d'activation</label>
                            <input {...register('scheduledImmobilization.startTime')} type="time" 
                                className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-sm" />
                            <p className="text-[10px] text-slate-500 mt-1">L'immobilisation s'active</p>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">Heure de désactivation</label>
                            <input {...register('scheduledImmobilization.endTime')} type="time" 
                                className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-sm" />
                            <p className="text-[10px] text-slate-500 mt-1">L'immobilisation se désactive</p>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-600 mb-2">Jours d'application</label>
                        <div className="flex flex-wrap gap-2">
                            {DAYS.map(day => (
                                <label key={day.id} className="flex items-center gap-1 text-xs bg-white dark:bg-slate-800 px-2 py-1 rounded border cursor-pointer">
                                    <input type="checkbox" value={day.id} {...register('scheduledImmobilization.days')} defaultChecked />
                                    {day.label.slice(0, 3)}
                                </label>
                            ))}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <input type="checkbox" {...register('scheduledImmobilization.allowOverride')} id="allowOverride" />
                        <label htmlFor="allowOverride" className="text-xs text-slate-600 dark:text-slate-400">
                            Permettre la désactivation manuelle (mot de passe requis)
                        </label>
                    </div>
                </div>
            )}

            {/* HEURES DE TRAVAIL / INTERDITES */}
            {(ruleType === 'WORKING_HOURS' || ruleType === 'FORBIDDEN_HOURS') && (
                <div className={`p-4 ${ruleType === 'WORKING_HOURS' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'} border rounded-lg space-y-4`}>
                    <div className={`flex items-center gap-2 ${ruleType === 'WORKING_HOURS' ? 'text-green-700 dark:text-green-300' : 'text-orange-700 dark:text-orange-300'} font-bold`}>
                        <Clock className="w-5 h-5" />
                        {ruleType === 'WORKING_HOURS' ? 'Heures de Travail Autorisées' : 'Heures Interdites'}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                        {ruleType === 'WORKING_HOURS' 
                            ? 'Le véhicule ne peut circuler QUE pendant les heures définies ci-dessous.'
                            : 'Le véhicule NE PEUT PAS circuler pendant les heures définies ci-dessous.'}
                    </p>
                    <div className="space-y-2">
                        {DAYS.map(day => (
                            <div key={day.id} className="flex items-center gap-3 p-2 bg-white dark:bg-slate-800 rounded">
                                <input type="checkbox" {...register(`timeRestriction.${day.full}.enabled` as Path<ScheduleFormData>)} className="rounded" />
                                <span className="w-20 text-sm font-medium">{day.label}</span>
                                <input {...register(`timeRestriction.${day.full}.start` as Path<ScheduleFormData>)} type="time" 
                                    className="p-1 border rounded text-sm bg-slate-50 dark:bg-slate-900" defaultValue="08:00" />
                                <span className="text-slate-400">à</span>
                                <input {...register(`timeRestriction.${day.full}.end` as Path<ScheduleFormData>)} type="time" 
                                    className="p-1 border rounded text-sm bg-slate-50 dark:bg-slate-900" defaultValue="18:00" />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* LIMITE DE VITESSE */}
            {ruleType === 'SPEED_LIMIT' && (
                <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg space-y-4">
                    <div className="flex items-center gap-2 text-orange-700 dark:text-orange-300 font-bold">
                        <Gauge className="w-5 h-5" />
                        Configuration Limite de Vitesse
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">Vitesse maximale (km/h)</label>
                            <input {...register('speedLimit.maxSpeed', { valueAsNumber: true })} type="number" 
                                className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">Tolérance (secondes)</label>
                            <input {...register('speedLimit.toleranceSeconds', { valueAsNumber: true })} type="number" 
                                className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-sm" />
                            <p className="text-[10px] text-slate-500 mt-1">Durée avant déclenchement alerte</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <input type="checkbox" {...register('speedLimit.immobilizeOnViolation')} id="immobilizeSpeed" />
                        <label htmlFor="immobilizeSpeed" className="text-xs text-slate-600 dark:text-slate-400">
                            Immobiliser le véhicule en cas de violation persistante
                        </label>
                    </div>
                </div>
            )}

            {/* LIMITE KILOMÉTRIQUE */}
            {ruleType === 'DISTANCE_LIMIT' && (
                <div className="p-4 bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] border border-[var(--border)] dark:border-[var(--primary)] rounded-lg space-y-4">
                    <div className="flex items-center gap-2 text-[var(--primary)] dark:text-[var(--primary)] font-bold">
                        <Route className="w-5 h-5" />
                        Configuration Limite Kilométrique
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">Km max par jour</label>
                            <input {...register('distanceLimit.maxKmPerDay', { valueAsNumber: true })} type="number" 
                                className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">Heure reset compteur</label>
                            <input {...register('distanceLimit.resetTime')} type="time" 
                                className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-sm" />
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <input type="checkbox" {...register('distanceLimit.immobilizeOnLimit')} id="immobilizeDist" />
                        <label htmlFor="immobilizeDist" className="text-xs text-slate-600 dark:text-slate-400">
                            Immobiliser le véhicule une fois la limite atteinte
                        </label>
                    </div>
                </div>
            )}

            {/* LIMITE HEURES MOTEUR */}
            {ruleType === 'ENGINE_HOURS_LIMIT' && (
                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg space-y-4">
                    <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300 font-bold">
                        <Timer className="w-5 h-5" />
                        Configuration Limite Heures Moteur
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">Heures max par jour</label>
                            <input {...register('engineHoursLimit.maxHoursPerDay', { valueAsNumber: true })} type="number" step="0.5"
                                className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">Heure reset compteur</label>
                            <input {...register('engineHoursLimit.resetTime')} type="time" 
                                className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-sm" />
                        </div>
                    </div>
                </div>
            )}

            {/* RESTRICTION DE ZONE */}
            {ruleType === 'GEOFENCE_RESTRICTION' && (
                <div className="p-4 bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] border border-[var(--border)] dark:border-[var(--primary)] rounded-lg space-y-4">
                    <div className="flex items-center gap-2 text-[var(--primary)] dark:text-[var(--primary)] font-bold">
                        <MapPin className="w-5 h-5" />
                        Configuration Restriction de Zone
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">Mode</label>
                        <select {...register('geofenceRestriction.mode')} className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-sm">
                            <option value="FORBIDDEN_ZONES">Zones INTERDITES (ne pas entrer)</option>
                            <option value="ALLOWED_ZONES">Zones AUTORISÉES (ne pas sortir)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">Sélectionner les zones</label>
                        <select {...register('geofenceRestriction.zoneIds')} multiple className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-sm h-24">
                            {filteredZones.map((z: ZoneOption) => (
                                <option key={z.id} value={z.id}>{z.nom || z.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-center gap-2">
                        <input type="checkbox" {...register('geofenceRestriction.immobilizeOnViolation')} id="immobilizeZone" />
                        <label htmlFor="immobilizeZone" className="text-xs text-slate-600 dark:text-slate-400">
                            Immobiliser le véhicule en cas de violation
                        </label>
                    </div>
                </div>
            )}

            {/* RESTRICTION WEEKEND */}
            {ruleType === 'WEEKEND_RESTRICTION' && (
                <div className="p-4 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg space-y-4">
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-bold">
                        <Calendar className="w-5 h-5" />
                        Configuration Restriction Weekend
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">Début restriction</label>
                            <select {...register('weekendRestriction.startDay')} className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-sm mb-2">
                                <option value="Friday">Vendredi</option>
                                <option value="Saturday">Samedi</option>
                            </select>
                            <input {...register('weekendRestriction.startTime')} type="time" className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">Fin restriction</label>
                            <select {...register('weekendRestriction.endDay')} className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-sm mb-2">
                                <option value="Sunday">Dimanche</option>
                                <option value="Monday">Lundi</option>
                            </select>
                            <input {...register('weekendRestriction.endTime')} type="time" className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-sm" />
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <input type="checkbox" {...register('weekendRestriction.immobilizeDuringWeekend')} id="immobilizeWeekend" />
                        <label htmlFor="immobilizeWeekend" className="text-xs text-slate-600 dark:text-slate-400">
                            Immobiliser le véhicule pendant le weekend
                        </label>
                    </div>
                </div>
            )}

            {/* RESTRICTION NOCTURNE */}
            {ruleType === 'NIGHT_RESTRICTION' && (
                <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg space-y-4">
                    <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-bold">
                        <Moon className="w-5 h-5" />
                        Configuration Restriction Nocturne
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">Début nuit</label>
                            <input {...register('nightRestriction.startTime')} type="time" 
                                className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">Fin nuit</label>
                            <input {...register('nightRestriction.endTime')} type="time" 
                                className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-sm" />
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <input type="checkbox" {...register('nightRestriction.immobilizeAtNight')} id="immobilizeNight" />
                        <label htmlFor="immobilizeNight" className="text-xs text-slate-600 dark:text-slate-400">
                            Immobiliser le véhicule la nuit
                        </label>
                    </div>
                </div>
            )}

            {/* RÈGLE PERSONNALISÉE */}
            {ruleType === 'CUSTOM' && (
                <div className="p-4 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg space-y-4">
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-bold">
                        <Settings className="w-5 h-5" />
                        Règle Personnalisée
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">Description de la règle</label>
                        <textarea {...register('description')} rows={3}
                            className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-sm"
                            placeholder="Décrivez la règle à appliquer..." />
                    </div>
                    <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 rounded">
                        <p className="text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2">
                            <Info className="w-4 h-4 shrink-0 mt-0.5" />
                            Les règles personnalisées nécessitent une configuration manuelle côté serveur.
                        </p>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* ACTIONS EN CAS DE VIOLATION */}
            {/* ═══════════════════════════════════════════════════════════ */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl space-y-4">
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-semibold">
                    <div className="p-1.5 bg-amber-100 dark:bg-amber-800 rounded-lg">
                        <Bell className="w-4 h-4 text-amber-600 dark:text-amber-300" />
                    </div>
                    Actions en cas de violation
                </div>
                
                <FormGrid columns={2}>
                    <div className="flex items-center gap-2">
                        <input type="checkbox" {...register('actions.createAlert')} id="createAlert" defaultChecked className="w-4 h-4 rounded-lg border-slate-300 text-[var(--primary)] focus:ring-[var(--primary)]" />
                        <label htmlFor="createAlert" className="text-sm text-slate-700 dark:text-slate-300">Créer une alerte</label>
                    </div>
                    <Select {...register('actions.alertPriority')}>
                        <option value="LOW">Priorité Basse</option>
                        <option value="MEDIUM">Priorité Moyenne</option>
                        <option value="HIGH">Priorité Haute</option>
                        <option value="CRITICAL">Priorité Critique</option>
                    </Select>
                </FormGrid>

                <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" {...register('actions.notifyEmail')} className="w-4 h-4 rounded-lg border-slate-300 text-[var(--primary)] focus:ring-[var(--primary)]" />
                        <Mail className="w-4 h-4 text-slate-400" />
                        <span className="text-sm text-slate-700 dark:text-slate-300">Email</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" {...register('actions.notifySms')} className="w-4 h-4 rounded-lg border-slate-300 text-[var(--primary)] focus:ring-[var(--primary)]" />
                        <MessageSquare className="w-4 h-4 text-slate-400" />
                        <span className="text-sm text-slate-700 dark:text-slate-300">SMS</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" {...register('actions.notifyPush')} defaultChecked className="w-4 h-4 rounded-lg border-slate-300 text-[var(--primary)] focus:ring-[var(--primary)]" />
                        <Smartphone className="w-4 h-4 text-slate-400" />
                        <span className="text-sm text-slate-700 dark:text-slate-300">Push</span>
                    </label>
                </div>
            </div>

            {/* Statut */}
            <FormField label="Statut">
                <Select {...register('statut')}>
                    <option value="Actif">Actif</option>
                    <option value="Inactif">Inactif</option>
                </Select>
            </FormField>
        </form>
    );
});

ScheduleForm.displayName = 'ScheduleForm';
