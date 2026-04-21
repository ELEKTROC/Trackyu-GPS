import React, { useState, useMemo } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import type { Path } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { ScheduleFormData } from '../../../../schemas/scheduleSchema';
import { ScheduleSchema, RULE_TYPES } from '../../../../schemas/scheduleSchema';
import type { Tier, Vehicle } from '../../../../types';
interface ZoneOption {
  id: string;
  nom?: string;
  name?: string;
  client?: string;
  allClients?: boolean;
}
import {
  Truck,
  Lock,
  Clock,
  Gauge,
  Route,
  Timer,
  MapPin,
  Calendar,
  Moon,
  Settings,
  Bell,
  Mail,
  MessageSquare,
  Smartphone,
  AlertTriangle,
  Info,
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

const RULE_TYPE_STYLES: Record<string, { selected: string; icon: string }> = {
  red: { selected: 'bg-red-50 dark:bg-red-900/30 border-red-500 ring-2 ring-red-500', icon: 'text-red-600' },
  green: {
    selected: 'bg-green-50 dark:bg-green-900/30 border-green-500 ring-2 ring-green-500',
    icon: 'text-green-600',
  },
  orange: {
    selected: 'bg-orange-50 dark:bg-orange-900/30 border-orange-500 ring-2 ring-orange-500',
    icon: 'text-orange-600',
  },
  blue: { selected: 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 ring-2 ring-blue-500', icon: 'text-blue-600' },
  purple: {
    selected: 'bg-purple-50 dark:bg-purple-900/30 border-purple-500 ring-2 ring-purple-500',
    icon: 'text-purple-600',
  },
  slate: {
    selected: 'bg-slate-50 dark:bg-slate-900/30 border-slate-500 ring-2 ring-slate-500',
    icon: 'text-slate-600',
  },
  indigo: {
    selected: 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-500 ring-2 ring-indigo-500',
    icon: 'text-indigo-600',
  },
};

export const ScheduleForm = React.forwardRef<HTMLFormElement, BaseFormProps>(
  ({ initialData, onFormSubmit, clients = [], resellers = [], vehicles = [], zones = [], users = [] }, ref) => {
    const {
      register,
      handleSubmit,
      formState: { errors },
      watch,
      setValue,
    } = useForm<ScheduleFormData>({
      resolver: zodResolver(ScheduleSchema) as Resolver<ScheduleFormData>,
      defaultValues: initialData || {
        ruleType: 'WORKING_HOURS',
        statut: 'Actif',
        allVehicles: false,
        scheduledImmobilization: { enabled: false, startTime: '02:00', endTime: '05:00', days: DAYS.map((d) => d.id) },
        timeRestriction: { enabled: false, mode: 'ALLOWED' },
        speedLimit: { enabled: false, maxSpeed: 90, toleranceSeconds: 10 },
        distanceLimit: { enabled: false, maxKmPerDay: 500 },
        engineHoursLimit: { enabled: false, maxHoursPerDay: 10 },
        geofenceRestriction: { enabled: false, mode: 'FORBIDDEN_ZONES', zoneIds: [] },
        weekendRestriction: { enabled: false },
        nightRestriction: { enabled: false, startTime: '22:00', endTime: '06:00' },
        actions: { createAlert: true, alertPriority: 'MEDIUM', notifyPush: true },
      },
    });

    const ruleType = watch('ruleType');
    const selectedClient = watch('client');
    const allVehicles = watch('allVehicles');
    const selectedVehicleIds = watch('vehicleIds') || [];
    const [isVehicleDropdownOpen, setIsVehicleDropdownOpen] = useState(false);

    // Filtrer véhicules par client
    const filteredVehicles = useMemo(() => {
      if (!selectedClient) return [];
      return vehicles.filter((v: Vehicle) => v.client === selectedClient);
    }, [vehicles, selectedClient]);

    const toggleVehicle = (id: string) => {
      const current = selectedVehicleIds;
      const updated = current.includes(id) ? current.filter((i: string) => i !== id) : [...current, id];
      setValue('vehicleIds', updated);
    };

    // Filtrer zones par client
    const filteredZones = useMemo(() => {
      if (!selectedClient) return zones;
      return zones.filter((z: ZoneOption) => !z.client || z.client === selectedClient || z.allClients);
    }, [zones, selectedClient]);

    const [isSaving, setIsSaving] = useState(false);
    const onSubmit = async (data: ScheduleFormData) => {
      if (isSaving) return;
      setIsSaving(true);
      try {
        await onFormSubmit(data);
      } finally {
        setIsSaving(false);
      }
    };

    return (
      <form
        ref={ref}
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-4 h-[650px] overflow-y-auto pr-2 custom-scrollbar"
      >
        {/* Context: Revendeur & Client */}
        <FormGrid columns={2}>
          <FormField label="Revendeur">
            <Select {...register('resellerId')}>
              <option value="">Sélectionner...</option>
              {resellers.map((r: Tier) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Client">
            <Select {...register('client')}>
              <option value="">Sélectionner...</option>
              {clients.map((c: Tier) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </FormField>
        </FormGrid>

        {/* Nom de la règle */}
        <FormField label="Nom de la règle" error={errors.nom?.message as string}>
          <Input {...register('nom')} placeholder="Ex: Immobilisation nocturne" />
        </FormField>

        {/* Type de règle - Sélection visuelle */}
        <div>
          <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2">
            Type de règle
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {RULE_TYPES.map((type) => {
              const IconComp = getIconComponent(type.icon);
              const isSelected = ruleType === type.id;
              const styles = RULE_TYPE_STYLES[type.color] || RULE_TYPE_STYLES.slate;
              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setValue('ruleType', type.id as ScheduleFormData['ruleType'])}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    isSelected
                      ? styles.selected
                      : 'bg-[var(--bg-elevated)] border-[var(--border)] hover:border-[var(--border-strong)]'
                  }`}
                >
                  <IconComp className={`w-5 h-5 mb-1 ${isSelected ? styles.icon : 'text-[var(--text-muted)]'}`} />
                  <div className="text-xs font-semibold text-[var(--text-primary)]">{type.label}</div>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-2">
            {RULE_TYPES.find((t) => t.id === ruleType)?.description}
          </p>
        </div>

        {/* Véhicules concernés */}
        <div className="p-4 border rounded-xl bg-[var(--bg-elevated)] border-[var(--border)]">
          <label className="flex items-center gap-2 mb-3">
            <div className="p-1.5 bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] rounded-lg">
              <Truck className="w-4 h-4 text-[var(--primary)] dark:text-[var(--primary)]" />
            </div>
            <span className="font-semibold text-sm text-[var(--text-primary)]">Véhicules concernés</span>
          </label>
          <div className="flex items-center gap-2 mb-3">
            <input
              type="checkbox"
              {...register('allVehicles')}
              id="allVehiclesSchedule"
              className="w-4 h-4 rounded-lg border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
            />
            <label htmlFor="allVehiclesSchedule" className="text-sm text-[var(--text-secondary)]">
              Appliquer à tous les véhicules du client
            </label>
          </div>
          {!allVehicles && (
            <div className="relative">
              <button
                type="button"
                onClick={() => selectedClient && setIsVehicleDropdownOpen(!isVehicleDropdownOpen)}
                disabled={!selectedClient}
                className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-elevated)] text-sm text-left flex justify-between items-center hover:border-[var(--border-strong)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span
                  className={
                    selectedVehicleIds.length === 0 ? 'text-[var(--text-muted)]' : 'text-[var(--text-primary)]'
                  }
                >
                  {!selectedClient
                    ? "Sélectionnez un client d'abord..."
                    : selectedVehicleIds.length === 0
                      ? 'Sélectionner les véhicules...'
                      : `${selectedVehicleIds.length} véhicule(s) sélectionné(s)`}
                </span>
                <span className="text-xs text-[var(--text-muted)]">▼</span>
              </button>
              {isVehicleDropdownOpen && selectedClient && (
                <div className="absolute z-10 w-full mt-1 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl shadow-lg max-h-48 overflow-y-auto">
                  {filteredVehicles.length === 0 ? (
                    <div className="p-3 text-sm text-[var(--text-secondary)]">
                      Aucun véhicule trouvé pour ce client.
                    </div>
                  ) : (
                    filteredVehicles.map((v: Vehicle) => (
                      <label
                        key={v.id}
                        className="flex items-center gap-2 p-2.5 hover:bg-[var(--bg-elevated)] cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedVehicleIds.includes(v.id)}
                          onChange={() => toggleVehicle(v.id)}
                          className="w-4 h-4 rounded-lg border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
                        />
                        <span className="text-sm text-[var(--text-primary)]">
                          {v.name || v.licensePlate} {v.licensePlate ? `(${v.licensePlate})` : ''}
                        </span>
                      </label>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* CONFIGURATION SPÉCIFIQUE PAR TYPE DE RÈGLE */}
        {/* ═══════════════════════════════════════════════════════════ */}

        {/* IMMOBILISATION PROGRAMMÉE */}
        {ruleType === 'SCHEDULED_IMMOBILIZATION' && (
          <div className="p-4 bg-[var(--clr-danger-dim)] border border-[var(--clr-danger-border)] rounded-lg space-y-4">
            <div className="flex items-center gap-2 text-[var(--clr-danger-strong)] font-bold">
              <Lock className="w-5 h-5" />
              Configuration Immobilisation Programmée
            </div>
            <p className="text-xs text-[var(--clr-danger)]">
              Le véhicule sera automatiquement immobilisé pendant la plage horaire définie. L'immobilisation s'active à
              l'heure de début et se désactive à l'heure de fin.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">Heure d'activation</label>
                <input
                  {...register('scheduledImmobilization.startTime')}
                  type="time"
                  className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] text-sm"
                />
                <p className="text-[10px] text-[var(--text-secondary)] mt-1">L'immobilisation s'active</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                  Heure de désactivation
                </label>
                <input
                  {...register('scheduledImmobilization.endTime')}
                  type="time"
                  className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] text-sm"
                />
                <p className="text-[10px] text-[var(--text-secondary)] mt-1">L'immobilisation se désactive</p>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] mb-2">Jours d'application</label>
              <div className="flex flex-wrap gap-2">
                {DAYS.map((day) => (
                  <label
                    key={day.id}
                    className="flex items-center gap-1 text-xs bg-[var(--bg-elevated)] px-2 py-1 rounded border cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      value={day.id}
                      {...register('scheduledImmobilization.days')}
                      defaultChecked
                    />
                    {day.label.slice(0, 3)}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" {...register('scheduledImmobilization.allowOverride')} id="allowOverride" />
              <label htmlFor="allowOverride" className="text-xs text-[var(--text-secondary)]">
                Permettre la désactivation manuelle (mot de passe requis)
              </label>
            </div>
          </div>
        )}

        {/* HEURES DE TRAVAIL / INTERDITES */}
        {(ruleType === 'WORKING_HOURS' || ruleType === 'FORBIDDEN_HOURS') && (
          <div
            className={`p-4 ${ruleType === 'WORKING_HOURS' ? 'bg-[var(--clr-success-dim)] border-[var(--clr-success-border)]' : 'bg-[var(--clr-warning-dim)] border-[var(--clr-warning-border)]'} border rounded-lg space-y-4`}
          >
            <div
              className={`flex items-center gap-2 ${ruleType === 'WORKING_HOURS' ? 'text-[var(--clr-success-strong)]' : 'text-[var(--clr-warning-strong)]'} font-bold`}
            >
              <Clock className="w-5 h-5" />
              {ruleType === 'WORKING_HOURS' ? 'Heures de Travail Autorisées' : 'Heures Interdites'}
            </div>
            <p className="text-xs text-[var(--text-secondary)]">
              {ruleType === 'WORKING_HOURS'
                ? 'Le véhicule ne peut circuler QUE pendant les heures définies ci-dessous.'
                : 'Le véhicule NE PEUT PAS circuler pendant les heures définies ci-dessous.'}
            </p>
            <div className="space-y-2">
              {DAYS.map((day) => (
                <div key={day.id} className="flex items-center gap-3 p-2 bg-[var(--bg-elevated)] rounded">
                  <input
                    type="checkbox"
                    {...register(`timeRestriction.${day.full}.enabled` as Path<ScheduleFormData>)}
                    className="rounded"
                  />
                  <span className="w-20 text-sm font-medium">{day.label}</span>
                  <input
                    {...register(`timeRestriction.${day.full}.start` as Path<ScheduleFormData>)}
                    type="time"
                    className="p-1 border rounded text-sm bg-[var(--bg-elevated)]"
                    defaultValue="08:00"
                  />
                  <span className="text-[var(--text-muted)]">à</span>
                  <input
                    {...register(`timeRestriction.${day.full}.end` as Path<ScheduleFormData>)}
                    type="time"
                    className="p-1 border rounded text-sm bg-[var(--bg-elevated)]"
                    defaultValue="18:00"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* LIMITE DE VITESSE */}
        {ruleType === 'SPEED_LIMIT' && (
          <div className="p-4 bg-[var(--clr-warning-dim)] border border-[var(--clr-warning-border)] rounded-lg space-y-4">
            <div className="flex items-center gap-2 text-[var(--clr-warning-strong)] font-bold">
              <Gauge className="w-5 h-5" />
              Configuration Limite de Vitesse
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                  Vitesse maximale (km/h)
                </label>
                <input
                  {...register('speedLimit.maxSpeed', { valueAsNumber: true })}
                  type="number"
                  className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                  Tolérance (secondes)
                </label>
                <input
                  {...register('speedLimit.toleranceSeconds', { valueAsNumber: true })}
                  type="number"
                  className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] text-sm"
                />
                <p className="text-[10px] text-[var(--text-secondary)] mt-1">Durée avant déclenchement alerte</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" {...register('speedLimit.immobilizeOnViolation')} id="immobilizeSpeed" />
              <label htmlFor="immobilizeSpeed" className="text-xs text-[var(--text-secondary)]">
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
                <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">Km max par jour</label>
                <input
                  {...register('distanceLimit.maxKmPerDay', { valueAsNumber: true })}
                  type="number"
                  className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                  Heure reset compteur
                </label>
                <input
                  {...register('distanceLimit.resetTime')}
                  type="time"
                  className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] text-sm"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" {...register('distanceLimit.immobilizeOnLimit')} id="immobilizeDist" />
              <label htmlFor="immobilizeDist" className="text-xs text-[var(--text-secondary)]">
                Immobiliser le véhicule une fois la limite atteinte
              </label>
            </div>
          </div>
        )}

        {/* LIMITE HEURES MOTEUR */}
        {ruleType === 'ENGINE_HOURS_LIMIT' && (
          <div className="p-4 bg-[var(--clr-info-dim)] border border-[var(--clr-info-border)] rounded-lg space-y-4">
            <div className="flex items-center gap-2 text-[var(--clr-info-strong)] font-bold">
              <Timer className="w-5 h-5" />
              Configuration Limite Heures Moteur
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">Heures max par jour</label>
                <input
                  {...register('engineHoursLimit.maxHoursPerDay', { valueAsNumber: true })}
                  type="number"
                  step="0.5"
                  className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                  Heure reset compteur
                </label>
                <input
                  {...register('engineHoursLimit.resetTime')}
                  type="time"
                  className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] text-sm"
                />
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
              <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">Mode</label>
              <select
                {...register('geofenceRestriction.mode')}
                className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] text-sm"
              >
                <option value="FORBIDDEN_ZONES">Zones INTERDITES (ne pas entrer)</option>
                <option value="ALLOWED_ZONES">Zones AUTORISÉES (ne pas sortir)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                Sélectionner les zones
              </label>
              <select
                {...register('geofenceRestriction.zoneIds')}
                multiple
                className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] text-sm h-24"
              >
                {filteredZones.map((z: ZoneOption) => (
                  <option key={z.id} value={z.id}>
                    {z.nom || z.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" {...register('geofenceRestriction.immobilizeOnViolation')} id="immobilizeZone" />
              <label htmlFor="immobilizeZone" className="text-xs text-[var(--text-secondary)]">
                Immobiliser le véhicule en cas de violation
              </label>
            </div>
          </div>
        )}

        {/* RESTRICTION WEEKEND */}
        {ruleType === 'WEEKEND_RESTRICTION' && (
          <div className="p-4 bg-[var(--bg-elevated)]/50 border border-[var(--border)] rounded-lg space-y-4">
            <div className="flex items-center gap-2 text-[var(--text-primary)] font-bold">
              <Calendar className="w-5 h-5" />
              Configuration Restriction Weekend
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">Début restriction</label>
                <select
                  {...register('weekendRestriction.startDay')}
                  className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] text-sm mb-2"
                >
                  <option value="Friday">Vendredi</option>
                  <option value="Saturday">Samedi</option>
                </select>
                <input
                  {...register('weekendRestriction.startTime')}
                  type="time"
                  className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">Fin restriction</label>
                <select
                  {...register('weekendRestriction.endDay')}
                  className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] text-sm mb-2"
                >
                  <option value="Sunday">Dimanche</option>
                  <option value="Monday">Lundi</option>
                </select>
                <input
                  {...register('weekendRestriction.endTime')}
                  type="time"
                  className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] text-sm"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                {...register('weekendRestriction.immobilizeDuringWeekend')}
                id="immobilizeWeekend"
              />
              <label htmlFor="immobilizeWeekend" className="text-xs text-[var(--text-secondary)]">
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
                <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">Début nuit</label>
                <input
                  {...register('nightRestriction.startTime')}
                  type="time"
                  className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">Fin nuit</label>
                <input
                  {...register('nightRestriction.endTime')}
                  type="time"
                  className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] text-sm"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" {...register('nightRestriction.immobilizeAtNight')} id="immobilizeNight" />
              <label htmlFor="immobilizeNight" className="text-xs text-[var(--text-secondary)]">
                Immobiliser le véhicule la nuit
              </label>
            </div>
          </div>
        )}

        {/* RÈGLE PERSONNALISÉE */}
        {ruleType === 'CUSTOM' && (
          <div className="p-4 bg-[var(--bg-elevated)]/50 border border-[var(--border)] rounded-lg space-y-4">
            <div className="flex items-center gap-2 text-[var(--text-primary)] font-bold">
              <Settings className="w-5 h-5" />
              Règle Personnalisée
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                Description de la règle
              </label>
              <textarea
                {...register('description')}
                rows={3}
                className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] text-sm"
                placeholder="Décrivez la règle à appliquer..."
              />
            </div>
            <div className="p-3 bg-[var(--clr-caution-dim)] border border-amber-200 rounded">
              <p className="text-xs text-[var(--clr-caution-strong)] flex items-start gap-2">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                Les règles personnalisées nécessitent une configuration manuelle côté serveur.
              </p>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* ACTIONS EN CAS DE VIOLATION */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <div className="p-4 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl space-y-4">
          <div className="flex items-center gap-2 text-[var(--text-primary)] font-semibold">
            <div className="p-1.5 bg-amber-100 dark:bg-amber-800 rounded-lg">
              <Bell className="w-4 h-4 text-amber-600 dark:text-amber-300" />
            </div>
            Actions en cas de violation
          </div>

          <FormGrid columns={2}>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                {...register('actions.createAlert')}
                id="createAlert"
                defaultChecked
                className="w-4 h-4 rounded-lg border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
              />
              <label htmlFor="createAlert" className="text-sm text-[var(--text-primary)]">
                Créer une alerte
              </label>
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
              <input
                type="checkbox"
                {...register('actions.notifyEmail')}
                className="w-4 h-4 rounded-lg border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
              />
              <Mail className="w-4 h-4 text-[var(--text-muted)]" />
              <span className="text-sm text-[var(--text-primary)]">Email</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                {...register('actions.notifySms')}
                className="w-4 h-4 rounded-lg border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
              />
              <MessageSquare className="w-4 h-4 text-[var(--text-muted)]" />
              <span className="text-sm text-[var(--text-primary)]">SMS</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                {...register('actions.notifyPush')}
                defaultChecked
                className="w-4 h-4 rounded-lg border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
              />
              <Smartphone className="w-4 h-4 text-[var(--text-muted)]" />
              <span className="text-sm text-[var(--text-primary)]">Push</span>
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
  }
);

ScheduleForm.displayName = 'ScheduleForm';
