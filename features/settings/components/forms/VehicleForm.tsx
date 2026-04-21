import React, { useState, useMemo, useEffect } from 'react';
import { useForm, type Resolver, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { VehicleSchema } from '../../../../schemas/vehicleSchema';
import { Car, Cpu, Fuel, Wrench, History, Loader2, MapPin, Package } from 'lucide-react';
import { api } from '../../../../services/apiLazy';
import { logger } from '../../../../utils/logger';
import { FormField, FormSection, FormGrid, Input, Select, Textarea } from '../../../../components/form';
import type { z } from 'zod';

export type VehicleFormData = z.infer<typeof VehicleSchema>;

const FUEL_TYPE_OPTIONS = [
  { value: 'diesel', label: 'Diesel' },
  { value: 'essence', label: 'Essence' },
  { value: 'hybrid', label: 'Hybride' },
  { value: 'electric', label: 'Électrique' },
] as const;

const VEHICLE_TYPE_OPTIONS = [
  { value: 'CAR', label: 'Voiture' },
  { value: 'VAN', label: 'VUL (Véhicule Utilitaire Léger)' },
  { value: 'TRUCK', label: 'Camion / Poids Lourd' },
  { value: 'PICKUP', label: 'Pick-up' },
  { value: 'BUS', label: 'Bus / Minibus' },
  { value: 'MOTO', label: 'Moto' },
  { value: 'TRICYCLE', label: 'Tricycle' },
  { value: 'CONSTRUCTION', label: 'Engin TP' },
  { value: 'AGRICULTURAL', label: 'Engin Agricole' },
  { value: 'TANKER', label: 'Citerne' },
  { value: 'TIPPER', label: 'Benne' },
  { value: 'TRAILER', label: 'Remorque' },
  { value: 'OTHER', label: 'Autre' },
] as const;

const DEVICE_LOCATION_PRESETS = [
  'Tableau de bord',
  'Boîte à gants',
  'Sous le volant',
  'Coffre',
  'Moteur',
  'Sous le siège',
  'Plancher',
];

const DEVICE_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  IN_STOCK: { label: 'En stock', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  INSTALLED: { label: 'Installé', color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
  RMA: { label: 'RMA en cours', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' },
  RMA_PENDING: {
    label: 'RMA en attente',
    color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  },
  SENT_TO_SUPPLIER: {
    label: 'Envoyé fournisseur',
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  },
  REPLACED_BY_SUPPLIER: {
    label: 'Remplacé fournisseur',
    color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
  },
  SCRAPPED: { label: 'Mis au rebut', color: 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400' },
  LOST: { label: 'Perdu', color: 'bg-red-200 text-red-800 dark:bg-red-900/60 dark:text-red-200' },
  REMOVED: { label: 'Retiré', color: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400' },
};

interface StockDevice {
  imei?: string;
  iccid?: string;
  phoneNumber?: string;
  operator?: string;
  status: string;
  type: string;
  model?: string;
}

interface DeviceModel {
  id: string;
  type: 'BOX' | 'SIM' | 'SENSOR' | 'ACCESSORY';
  brand: string;
  model: string;
  protocol?: string;
}

interface ClientOption {
  id: string;
  name: string;
  resellerId?: string;
}
interface BranchOption {
  id: string;
  name?: string;
  nom?: string;
  client_id?: string;
  clientId?: string;
  client?: string;
}
interface GroupOption {
  id: string;
  nom: string;
}
interface DriverOption {
  id: string;
  nom: string;
}
interface ResellerOption {
  id: string;
  name: string;
}

interface BaseFormProps {
  initialData?: Partial<VehicleFormData>;
  onFormSubmit: (data: VehicleFormData) => void | Promise<void>;
}

export const VehicleForm = React.forwardRef<
  HTMLFormElement,
  BaseFormProps & {
    clients?: ClientOption[];
    resellers?: ResellerOption[];
    branches?: BranchOption[];
    groups?: GroupOption[];
    drivers?: DriverOption[];
  }
>(({ initialData, onFormSubmit, clients = [], resellers = [], branches = [], groups = [], drivers = [] }, ref) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<VehicleFormData>({
    resolver: zodResolver(VehicleSchema) as unknown as Resolver<VehicleFormData>,
    defaultValues: initialData || {
      odometerSource: 'GPS',
      status: 'STOPPED',
    },
  });

  const [activeTab, setActiveTab] = useState('info');

  // ── Device Models (catalogue Admin > Paramètres Boîtiers) ──────────────
  const [deviceModels, setDeviceModels] = useState<DeviceModel[]>([]);
  const [loadingModels, setLoadingModels] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const models = await api.techSettings.getDeviceModels('BOX');
        setDeviceModels(models || []);
      } catch (err) {
        logger.warn('Impossible de charger les modèles de trackers:', err);
        setDeviceModels([
          { id: '1', type: 'BOX', brand: 'Teltonika', model: 'FMB920', protocol: 'Teltonika' },
          { id: '2', type: 'BOX', brand: 'Teltonika', model: 'FMB120', protocol: 'Teltonika' },
          { id: '3', type: 'BOX', brand: 'Teltonika', model: 'FMB140', protocol: 'Teltonika' },
          { id: '4', type: 'BOX', brand: 'Teltonika', model: 'FMC130', protocol: 'Teltonika' },
          { id: '5', type: 'BOX', brand: 'Concox', model: 'GT06N', protocol: 'GT06' },
          { id: '6', type: 'BOX', brand: 'Concox', model: 'S102A', protocol: 'GT06' },
          { id: '7', type: 'BOX', brand: 'Sinotrack', model: 'ST-901', protocol: 'GT06' },
          { id: '8', type: 'BOX', brand: 'Coban', model: 'GPS103', protocol: 'GT06' },
          { id: '9', type: 'BOX', brand: 'Queclink', model: 'GV300', protocol: 'Queclink' },
        ]);
      } finally {
        setLoadingModels(false);
      }
    };
    load();
  }, []);

  // ── Stock devices (BOX → statut boîtier, SIM → dropdown SIM) ──────────
  const [stockDevices, setStockDevices] = useState<StockDevice[]>([]);
  const [loadingStock, setLoadingStock] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const devices = await api.stock.list();
        setStockDevices(devices || []);
      } catch (err) {
        logger.warn('Impossible de charger le stock:', err);
      } finally {
        setLoadingStock(false);
      }
    };
    load();
  }, []);

  const simCards = useMemo(() => stockDevices.filter((d) => d.type === 'SIM'), [stockDevices]);

  const watchedImei = watch('imei');
  const linkedBoxDevice = useMemo(
    () => stockDevices.find((d) => d.type === 'BOX' && d.imei && d.imei === watchedImei) ?? null,
    [stockDevices, watchedImei]
  );

  // ── Onglet Jauge conditionnel ──────────────────────────────────────────
  const watchedSensors = watch('sensors');
  const hasFuelSensor = Array.isArray(watchedSensors) && watchedSensors.includes('FUEL');

  useEffect(() => {
    if (activeTab === 'fuel' && !hasFuelSensor) {
      setActiveTab('device');
    }
  }, [hasFuelSensor, activeTab]);

  // ── Emplacement boîtier (preset + saisie libre) ───────────────────────
  const watchedLocation = watch('deviceLocation') ?? '';
  const isPresetLocation = DEVICE_LOCATION_PRESETS.includes(watchedLocation);
  const [locationMode, setLocationMode] = useState<'preset' | 'custom'>(
    watchedLocation === '' || isPresetLocation ? 'preset' : 'custom'
  );

  // ── Cascade client/branche ────────────────────────────────────────────
  const selectedResellerId = watch('resellerId');
  const selectedClientId = watch('client');

  const filteredClients = useMemo(() => {
    if (!selectedResellerId) return clients;
    return clients.filter((c) => c.resellerId === selectedResellerId);
  }, [selectedResellerId, clients]);

  const filteredBranches = useMemo(() => {
    if (!selectedClientId) return branches;
    return branches.filter((b) => (b.client_id || b.clientId || b.client) === selectedClientId);
  }, [selectedClientId, branches]);

  useEffect(() => {
    if (selectedResellerId === (initialData?.resellerId ?? '')) return;
    setValue('client', '');
    setValue('branchId', '');
  }, [selectedResellerId, setValue, initialData?.resellerId]);

  useEffect(() => {
    if (selectedClientId === (initialData?.client ?? '')) return;
    setValue('branchId', '');
  }, [selectedClientId, setValue, initialData?.client]);

  // ── Auto-génération table calibration ────────────────────────────────
  const tankHeight = watch('tankHeight');
  const tankCapacity = watch('tankCapacity');
  const calibrationTable = watch('calibrationTable');

  useEffect(() => {
    if (tankHeight && tankCapacity && !calibrationTable) {
      const steps = 10;
      let table = '';
      for (let i = 0; i <= steps; i++) {
        const h = Math.round((i / steps) * (tankHeight ?? 0));
        const v = Math.round((i / steps) * (tankCapacity ?? 0));
        table += `${h},${v}\n`;
      }
      setValue('calibrationTable', table.trim());
    }
  }, [tankHeight, tankCapacity, setValue]);

  // ── Submit ────────────────────────────────────────────────────────────
  const [isSaving, setIsSaving] = useState(false);
  const onSubmit: SubmitHandler<VehicleFormData> = async (data) => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await onFormSubmit(data);
    } finally {
      setIsSaving(false);
    }
  };

  const [validationError, setValidationError] = useState<string | null>(null);

  const onInvalid = (errs: typeof errors) => {
    const entries = Object.entries(errs);
    if (entries.length === 0) return;
    const messages = entries
      .map(([field, err]) => (err as { message?: string })?.message || `Champ requis : ${field}`)
      .filter(Boolean);
    setValidationError(messages.join(' · '));
  };

  // ── Helpers UI ────────────────────────────────────────────────────────
  const tabClass = (tab: string) =>
    `px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
      activeTab === tab
        ? 'border-[var(--primary)] text-[var(--primary)]'
        : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
    }`;

  const deviceStatusInfo = linkedBoxDevice
    ? (DEVICE_STATUS_LABELS[linkedBoxDevice.status] ?? {
        label: linkedBoxDevice.status,
        color: 'bg-gray-100 text-gray-600',
      })
    : null;

  return (
    <form
      ref={ref}
      noValidate
      onSubmit={handleSubmit((data) => {
        setValidationError(null);
        return onSubmit(data);
      }, onInvalid)}
      className="h-[600px] flex flex-col"
    >
      {/* ABO Code Banner (edit mode) */}
      {initialData?.id?.startsWith('ABO-') && (
        <div className="flex items-center gap-3 mb-3 px-3 py-2 bg-[var(--primary-dim)] border border-[var(--border)] dark:border-[var(--primary)] rounded-lg">
          <span className="text-xs font-bold text-[var(--primary)] uppercase">Code Objet</span>
          <span className="font-mono text-sm font-semibold text-[var(--primary)] bg-[var(--primary-dim)] px-2.5 py-0.5 rounded-md tracking-wider">
            {initialData.id}
          </span>
        </div>
      )}

      {/* Bannière erreurs de validation */}
      {validationError && (
        <div
          className="flex items-start gap-2 mb-3 px-3 py-2.5 rounded-lg text-sm border"
          style={{
            backgroundColor: 'var(--color-error-dim, #fef2f2)',
            borderColor: 'var(--color-error)',
            color: 'var(--color-error)',
          }}
        >
          <svg className="w-4 h-4 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <span>{validationError}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-[var(--border)] mb-4 overflow-x-auto">
        <button type="button" onClick={() => setActiveTab('info')} className={tabClass('info')}>
          <Car className="w-4 h-4" /> Infos Véhicule
        </button>
        <button type="button" onClick={() => setActiveTab('device')} className={tabClass('device')}>
          <Cpu className="w-4 h-4" /> Boîtier & Connectivité
        </button>
        {hasFuelSensor && (
          <button type="button" onClick={() => setActiveTab('fuel')} className={tabClass('fuel')}>
            <Fuel className="w-4 h-4" /> Jauge
          </button>
        )}
        <button type="button" onClick={() => setActiveTab('maintenance')} className={tabClass('maintenance')}>
          <Wrench className="w-4 h-4" /> Maintenance
        </button>
        <button type="button" onClick={() => setActiveTab('history')} className={tabClass('history')}>
          <History className="w-4 h-4" /> Historique
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {/* ── Onglet Infos Véhicule ─────────────────────────────────── */}
        {activeTab === 'info' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <FormSection icon={Car} title="Rattachement">
              <FormGrid columns={3}>
                <FormField label="Revendeur" required error={errors.resellerId?.message as string}>
                  <Select {...register('resellerId')}>
                    <option value="">Sélectionner...</option>
                    {resellers.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <FormField label="Client" required error={errors.client?.message as string}>
                  <Select {...register('client')} disabled={!selectedResellerId && !initialData?.client}>
                    <option value="">Sélectionner...</option>
                    {filteredClients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <FormField label="Branche" required error={errors.branchId?.message as string}>
                  <Select {...register('branchId')} disabled={!selectedClientId && !initialData?.branchId}>
                    <option value="">Sélectionner...</option>
                    {filteredBranches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name || b.nom || b.id}
                      </option>
                    ))}
                  </Select>
                </FormField>
              </FormGrid>
            </FormSection>

            <FormGrid columns={2}>
              <FormField label="Immatriculation (Plaque)" required error={errors.licensePlate?.message as string}>
                <Input {...register('licensePlate')} className="font-bold uppercase" placeholder="AA-123-BB" />
              </FormField>
              <FormField label="Immatriculation Provisoire (WW)">
                <Input {...register('wwPlate')} placeholder="WW-..." />
              </FormField>
            </FormGrid>

            <FormGrid columns={2}>
              <FormField label="Alias / Nom (Optionnel)">
                <Input {...register('name')} placeholder="Ex: Camion Benne 01" />
              </FormField>
              <FormField label="Compteur Distance (Km)">
                <Input {...register('odometer')} type="number" />
              </FormField>
            </FormGrid>

            <FormGrid columns={2}>
              <FormField label="Marque">
                <Input {...register('brand')} />
              </FormField>
              <FormField label="Modèle">
                <Input {...register('model')} />
              </FormField>
            </FormGrid>

            <FormGrid columns={3}>
              <FormField label="Année">
                <Input {...register('year')} />
              </FormField>
              <FormField label="Couleur">
                <Input {...register('color')} />
              </FormField>
              <FormField label="Type d'engin">
                <Select {...register('vehicleType')}>
                  <option value="">— Sélectionner —</option>
                  {VEHICLE_TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </FormField>
            </FormGrid>

            <FormGrid columns={2}>
              <FormField label="VIN (Châssis)">
                <Input {...register('vin')} />
              </FormField>
              <FormField label="Kilométrage Initial">
                <Input {...register('mileage')} type="number" />
              </FormField>
            </FormGrid>

            <FormGrid columns={2}>
              <FormField
                label="Source Odomètre"
                hint="GPS: Calculé par distance entre points. CANBUS: Lu depuis le tableau de bord."
              >
                <Select {...register('odometerSource')}>
                  <option value="GPS">Calcul GPS (Serveur)</option>
                  <option value="CANBUS">Données CANBUS (Boîtier)</option>
                </Select>
              </FormField>
              <FormField label="Groupe">
                <Select {...register('group')}>
                  <option value="">Sélectionner...</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.nom}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Conducteur Assigné">
                <Select {...register('driver')}>
                  <option value="">Non assigné</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.nom}
                    </option>
                  ))}
                </Select>
              </FormField>
            </FormGrid>
          </div>
        )}

        {/* ── Onglet Boîtier & Connectivité ────────────────────────── */}
        {activeTab === 'device' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <FormSection icon={Cpu} title="Informations Boîtier">
              <FormGrid columns={2}>
                <FormField label="IMEI Boîtier" required error={errors.imei?.message as string}>
                  <Input {...register('imei')} placeholder="15 chiffres" />
                </FormField>
                <FormField label="ID Boîtier (S/N)">
                  <Input {...register('deviceId')} />
                </FormField>
              </FormGrid>

              <FormGrid columns={2}>
                <FormField label="Modèle Boîtier" hint="Modèles depuis Admin > Paramètres Boîtiers">
                  <div className="relative">
                    {loadingModels && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] animate-spin" />
                    )}
                    <Select {...register('deviceType')}>
                      <option value="">-- Sélectionner --</option>
                      {deviceModels.map((dm) => (
                        <option key={dm.id} value={`${dm.brand} ${dm.model}`}>
                          {dm.brand} {dm.model} {dm.protocol ? `(${dm.protocol})` : ''}
                        </option>
                      ))}
                    </Select>
                  </div>
                </FormField>

                {/* Statut boîtier — lecture seule depuis stock */}
                <FormField
                  label="Statut Boîtier"
                  hint={loadingStock ? 'Chargement stock…' : "Lu automatiquement depuis le stock selon l'IMEI"}
                >
                  {loadingStock ? (
                    <div className="flex items-center gap-2 px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--bg-elevated)] text-sm text-[var(--text-muted)]">
                      <Loader2 className="w-3 h-3 animate-spin" /> Chargement…
                    </div>
                  ) : deviceStatusInfo ? (
                    <div className="flex items-center gap-2 px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--bg-elevated)]">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${deviceStatusInfo.color}`}
                      >
                        {deviceStatusInfo.label}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--bg-elevated)] text-sm text-[var(--text-muted)]">
                      {watchedImei && watchedImei.length >= 15
                        ? 'Non référencé dans le stock'
                        : "Saisir l'IMEI pour afficher le statut"}
                    </div>
                  )}
                </FormField>
              </FormGrid>

              {/* Emplacement boîtier — dropdown + saisie libre */}
              <FormGrid columns={2}>
                <FormField label="Date Installation">
                  <Input {...register('installDate')} type="date" />
                </FormField>
                <FormField label="Adresse Serveur">
                  <Input {...register('serverAddress')} placeholder="IP ou DNS" />
                </FormField>
              </FormGrid>

              <FormField label="Emplacement Boîtier" hint="Emplacement physique du boîtier dans le véhicule">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                    <select
                      className="flex-1 px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
                      value={locationMode === 'custom' ? '__custom__' : watchedLocation || ''}
                      onChange={(e) => {
                        if (e.target.value === '__custom__') {
                          setLocationMode('custom');
                          setValue('deviceLocation', '');
                        } else {
                          setLocationMode('preset');
                          setValue('deviceLocation', e.target.value);
                        }
                      }}
                    >
                      <option value="">-- Sélectionner --</option>
                      {DEVICE_LOCATION_PRESETS.map((loc) => (
                        <option key={loc} value={loc}>
                          {loc}
                        </option>
                      ))}
                      <option value="__custom__">Autre (saisie libre)…</option>
                    </select>
                  </div>
                  {locationMode === 'custom' && (
                    <Input {...register('deviceLocation')} placeholder="Préciser l'emplacement…" autoFocus />
                  )}
                </div>
              </FormField>

              <FormField label="Fuseau Horaire">
                <Select {...register('timezone')}>
                  <option value="UTC">UTC</option>
                  <option value="UTC+1">UTC+1 (CET)</option>
                  <option value="UTC+2">UTC+2</option>
                  <option value="UTC+3">UTC+3</option>
                </Select>
              </FormField>
            </FormSection>

            {/* ── SIM — depuis stock ── */}
            <FormSection icon={Package} title="Carte SIM">
              {simCards.length > 0 && (
                <FormField
                  label="Sélectionner depuis le stock SIM"
                  hint="Pré-remplit automatiquement les champs ci-dessous"
                >
                  <select
                    className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
                    defaultValue=""
                    onChange={(e) => {
                      const selected = simCards.find(
                        (s) => s.iccid === e.target.value || s.phoneNumber === e.target.value
                      );
                      if (selected) {
                        setValue('sim', selected.phoneNumber || '');
                        setValue('iccid', selected.iccid || '');
                        setValue('simOperator', selected.operator || '');
                      }
                    }}
                  >
                    <option value="">— Sélectionner une SIM du stock —</option>
                    {simCards.map((s, i) => (
                      <option key={s.iccid || s.phoneNumber || i} value={s.iccid || s.phoneNumber || ''}>
                        {s.operator ? `[${s.operator}] ` : ''}
                        {s.phoneNumber || s.iccid || 'SIM sans numéro'}
                        {s.status ? ` — ${DEVICE_STATUS_LABELS[s.status]?.label ?? s.status}` : ''}
                      </option>
                    ))}
                  </select>
                </FormField>
              )}
              {loadingStock && !simCards.length && (
                <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] py-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Chargement des SIM disponibles…
                </div>
              )}

              <FormGrid columns={2}>
                <FormField label="Opérateur SIM">
                  <Input {...register('simOperator')} placeholder="Ex: Orange, MTN" />
                </FormField>
                <FormField label="Numéro SIM">
                  <Input {...register('sim')} placeholder="+225..." />
                </FormField>
              </FormGrid>
              <FormField label="ICCID SIM">
                <Input {...register('iccid')} placeholder="89..." className="font-mono" />
              </FormField>
            </FormSection>

            {/* ── Capteurs & Accessoires ── */}
            <FormField label="Capteurs & Accessoires">
              <div className="grid grid-cols-2 gap-3 p-3 border border-[var(--border)] rounded-xl bg-[var(--bg-elevated)]">
                <label className="flex items-center gap-2 text-sm cursor-pointer p-2 hover:bg-[var(--bg-surface)] rounded-lg transition-colors">
                  <input type="checkbox" {...register('sensors')} value="FUEL" className="rounded-lg" /> Jauge Carburant
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer p-2 hover:bg-[var(--bg-surface)] rounded-lg transition-colors">
                  <input type="checkbox" {...register('sensors')} value="TEMP" className="rounded-lg" /> Sonde
                  Température
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer p-2 hover:bg-[var(--bg-surface)] rounded-lg transition-colors">
                  <input type="checkbox" {...register('sensors')} value="DOOR" className="rounded-lg" /> Capteur Porte
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer p-2 hover:bg-[var(--bg-surface)] rounded-lg transition-colors">
                  <input type="checkbox" {...register('sensors')} value="ID" className="rounded-lg" /> Lecteur Badge
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer p-2 hover:bg-[var(--bg-surface)] rounded-lg transition-colors">
                  <input type="checkbox" {...register('sensors')} value="RELAY" className="rounded-lg" /> Relais Coupure
                </label>
              </div>
              {hasFuelSensor && (
                <p className="text-xs text-[var(--primary)] mt-1.5 flex items-center gap-1">
                  <Fuel className="w-3 h-3" /> Onglet "Jauge" disponible pour configurer la sonde carburant.
                </p>
              )}
            </FormField>
          </div>
        )}

        {/* ── Onglet Jauge (conditionnel FUEL) ─────────────────────── */}
        {activeTab === 'fuel' && hasFuelSensor && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <FormSection icon={Fuel} title="Configuration Carburant">
              <FormGrid columns={3}>
                <FormField label="Capacité Réservoir (L)">
                  <Input {...register('tankCapacity')} type="number" />
                </FormField>
                <FormField label="Type Carburant">
                  <Select {...register('fuelType')}>
                    <option value="">-- Sélectionner --</option>
                    {FUEL_TYPE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <FormField label="Type de Capteur">
                  <Select {...register('fuelSensorType')}>
                    <option value="CANBUS">CANBUS (Origine)</option>
                    <option value="CAPACITIVE">Sonde Capacitive</option>
                    <option value="ANALOG">Sonde Analogique (0-V)</option>
                    <option value="RS232">Sonde Numérique RS232</option>
                    <option value="BLUETOOTH">Sonde Bluetooth</option>
                    <option value="ULTRASONIC">Sonde Ultrason</option>
                  </Select>
                </FormField>
              </FormGrid>

              <FormGrid columns={3}>
                <FormField label="Hauteur (mm)">
                  <Input {...register('tankHeight')} type="number" />
                </FormField>
                <FormField label="Largeur (mm)">
                  <Input {...register('tankWidth')} type="number" />
                </FormField>
                <FormField label="Longueur (mm)">
                  <Input {...register('tankLength')} type="number" />
                </FormField>
              </FormGrid>

              <FormField label="Consommation Théorique (L/100km)">
                <Input {...register('consumption')} type="number" step="0.1" />
              </FormField>

              <FormGrid columns={2}>
                <FormField label="Seuil Détection Plein (%)" hint="Hausse min. pour considérer un plein">
                  <Input {...register('refillThreshold')} type="number" step="0.1" defaultValue={5.0} />
                </FormField>
                <FormField label="Seuil Détection Vol (%)" hint="Baisse min. à l'arrêt pour alerte vol">
                  <Input {...register('theftThreshold')} type="number" step="0.1" defaultValue={3.0} />
                </FormField>
              </FormGrid>

              <FormField label="Table de Calibration" hint="Format: hauteur(mm),volume(L) par ligne">
                <Textarea
                  {...register('calibrationTable')}
                  rows={5}
                  className="font-mono"
                  placeholder="mm,litres&#10;0,0&#10;10,5&#10;20,12..."
                />
              </FormField>
            </FormSection>
          </div>
        )}

        {/* ── Onglet Maintenance ────────────────────────────────────── */}
        {activeTab === 'maintenance' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <FormSection icon={Wrench} title="Maintenance & Échéances">
              <FormGrid columns={2}>
                <FormField label="Prochaine Maintenance (Km)">
                  <Input {...register('nextMaintenanceKm')} type="number" />
                </FormField>
                <FormField label="Prochaine Maintenance (Date)">
                  <Input {...register('nextMaintenanceDate')} type="date" />
                </FormField>
              </FormGrid>

              <FormGrid columns={2}>
                <FormField label="Fin Assurance">
                  <Input {...register('insuranceExpiry')} type="date" />
                </FormField>
                <FormField label="Fin Visite Technique">
                  <Input {...register('techVisitExpiry')} type="date" />
                </FormField>
              </FormGrid>

              <FormField label="Date d'expiration Contrat">
                <Input {...register('contractExpiry')} type="date" />
              </FormField>
            </FormSection>

            <div className="border-t border-[var(--border)] pt-4">
              <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-3">
                Seuils d'alerte
              </h4>
              <FormGrid columns={2}>
                <FormField label="Vitesse Max (km/h)">
                  <Input {...register('maxSpeed')} type="number" />
                </FormField>
                <FormField label="Ralenti Max (min)">
                  <Input {...register('maxIdleTime')} type="number" />
                </FormField>
              </FormGrid>
            </div>
          </div>
        )}

        {/* ── Onglet Historique ─────────────────────────────────────── */}
        {activeTab === 'history' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <FormSection icon={History} title="Historique des événements">
              <div className="text-sm text-[var(--text-secondary)]">Historique non disponible pour le moment.</div>
            </FormSection>
          </div>
        )}
      </div>
    </form>
  );
});

VehicleForm.displayName = 'VehicleForm';
