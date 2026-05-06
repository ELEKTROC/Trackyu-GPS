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
  const watchedFuelSensorType = watch('fuelSensorType');
  const watchedSensorUnit = watch('sensorUnit');
  const watchedDeviceType = watch('deviceType');
  const isCanbus = watchedFuelSensorType === 'CANBUS';
  const isTension = watchedSensorUnit === 'tension' || (!watchedSensorUnit && watchedFuelSensorType === 'ANALOG');
  // JT808 BLE : capteur BLE qui livre directement le volume calibré (calibration faite
  // dans la jauge via app mobile dédiée). Aucun champ calibration côté serveur n'est utile.
  const isJT808BLE = watchedDeviceType === 'JT808 BLE';

  useEffect(() => {
    if (activeTab === 'fuel' && !hasFuelSensor) {
      setActiveTab('device');
    }
  }, [hasFuelSensor, activeTab]);

  // Auto-détection depuis préfixe IMEI : capteur carburant + config par défaut + modèle boîtier
  useEffect(() => {
    if (!watchedImei || watchedImei.length < 4) return;

    const IMEI_PROFILES: Array<{
      prefix: string;
      modelId: string;
      sensorUnit: 'litres' | 'tension';
      fuelSensorType: 'CAPACITIVE' | 'ANALOG';
      voltages?: { empty: number; half: number; full: number };
    }> = [
      {
        prefix: '15042',
        modelId: 'a470f46c-1cb4-4f7f-9700-3a0170479372', // JT808 BLE (catalogue renommé depuis l'historique Concox GT02)
        sensorUnit: 'litres',
        fuelSensorType: 'CAPACITIVE',
      },
      {
        prefix: '3515',
        modelId: '5157b121-8d40-4931-af88-b315cd57e93c', // Concox GT800
        sensorUnit: 'tension',
        fuelSensorType: 'ANALOG',
        voltages: { empty: 0, half: 2500, full: 5000 },
      },
      {
        prefix: '86513',
        modelId: 'd1d6ab1d-96dd-4743-9314-45741795a681', // Concox X3
        sensorUnit: 'tension',
        fuelSensorType: 'ANALOG',
        voltages: { empty: 0, half: 2500, full: 5000 },
      },
    ];

    const profile = IMEI_PROFILES.find((p) => watchedImei.startsWith(p.prefix));
    if (!profile) return;

    // Jauge carburant : ajouter FUEL aux capteurs si pas déjà présent
    const currentSensors: string[] = watch('sensors') || [];
    if (!currentSensors.includes('FUEL')) {
      setValue('sensors', [...currentSensors, 'FUEL']);
    }

    // Champs capteur : ne pas écraser si déjà configurés manuellement
    if (!watch('sensorUnit')) setValue('sensorUnit', profile.sensorUnit);
    if (!watch('fuelSensorType')) setValue('fuelSensorType', profile.fuelSensorType);
    if (!watch('tankCapacity')) setValue('tankCapacity', 350);
    if (profile.voltages) {
      if (watch('voltageEmptyMv') === undefined || watch('voltageEmptyMv') === null)
        setValue('voltageEmptyMv', profile.voltages.empty);
      if (watch('voltageHalfMv') === undefined || watch('voltageHalfMv') === null)
        setValue('voltageHalfMv', profile.voltages.half);
      if (watch('voltageFullMv') === undefined || watch('voltageFullMv') === null)
        setValue('voltageFullMv', profile.voltages.full);
    }

    // Modèle boîtier : affecter au format "Brand Model" attendu par le Select
    if (!watch('deviceType')) {
      const model = deviceModels.find((m) => m.id === profile.modelId);
      if (model) setValue('deviceType', `${model.brand} ${model.model}`);
    }
  }, [watchedImei, deviceModels]); // eslint-disable-line react-hooks/exhaustive-deps

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
    if (!tankCapacity || calibrationTable) return;
    const steps = 10;
    let table = '';
    // Si tankHeight défini → calibration hauteur(mm) → volume(L)
    // Sinon → calibration tension(mV 0-5000) → volume(L), linéaire par défaut
    const axisMax = tankHeight || 5000;
    for (let i = 0; i <= steps; i++) {
      const x = Math.round((i / steps) * axisMax);
      const v = Math.round((i / steps) * (tankCapacity ?? 0));
      table += `${x},${v}\n`;
    }
    setValue('calibrationTable', table.trim());
  }, [tankHeight, tankCapacity, calibrationTable, setValue]);

  // ── Submit ────────────────────────────────────────────────────────────
  const [isSaving, setIsSaving] = useState(false);
  const onSubmit: SubmitHandler<VehicleFormData> = async (data) => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await onFormSubmit(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de la sauvegarde';
      setValidationError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const [validationError, setValidationError] = useState<string | null>(null);

  const FIELD_LABELS: Record<string, string> = {
    resellerId: 'Revendeur',
    client: 'Client',
    branchId: 'Branche',
    licensePlate: 'Immatriculation',
    wwPlate: 'Plaque WW',
    name: 'Alias / Nom',
    odometer: 'Compteur Distance',
    brand: 'Marque',
    model: 'Modèle véhicule',
    year: 'Année',
    color: 'Couleur',
    vehicleType: "Type d'engin",
    vin: 'VIN / Châssis',
    mileage: 'Kilométrage initial',
    odometerSource: 'Source odomètre',
    group: 'Groupe',
    driver: 'Conducteur',
    status: 'Statut',
    imei: 'IMEI boîtier',
    deviceId: 'ID boîtier',
    deviceType: 'Modèle boîtier',
    deviceStatus: 'Statut boîtier',
    installDate: 'Date installation',
    serverAddress: 'Adresse serveur',
    deviceLocation: 'Emplacement boîtier',
    timezone: 'Fuseau horaire',
    simOperator: 'Opérateur SIM',
    sim: 'Numéro SIM',
    iccid: 'ICCID SIM',
    sensors: 'Capteurs',
    tankCapacity: 'Capacité réservoir',
    fuelType: 'Type carburant',
    fuelSensorType: 'Type capteur',
    sensorUnit: 'Unité capteur',
    fuelConversionFactor: 'Facteur conversion',
    sensorBrand: 'Marque capteur',
    sensorModel: 'Modèle capteur',
    sensorInstallDate: 'Date installation capteur',
    voltageEmptyMv: 'Voltage vide (mV)',
    voltageHalfMv: 'Voltage mi-niveau (mV)',
    voltageFullMv: 'Voltage plein (mV)',
    tankHeight: 'Hauteur réservoir',
    tankWidth: 'Largeur réservoir',
    tankLength: 'Longueur réservoir',
    consumption: 'Consommation théorique',
    refillThreshold: 'Seuil plein',
    theftThreshold: 'Seuil vol',
    calibrationTable: 'Table calibration',
    nextMaintenanceKm: 'Prochaine maintenance (km)',
    nextMaintenanceDate: 'Prochaine maintenance (date)',
    insuranceExpiry: 'Fin assurance',
    techVisitExpiry: 'Fin visite technique',
    contractExpiry: 'Expiration contrat',
    maxSpeed: 'Vitesse max',
    maxIdleTime: 'Ralenti max',
  };

  const FIELD_TAB: Record<string, string> = {
    resellerId: 'info',
    client: 'info',
    branchId: 'info',
    licensePlate: 'info',
    wwPlate: 'info',
    name: 'info',
    odometer: 'info',
    brand: 'info',
    model: 'info',
    year: 'info',
    color: 'info',
    vehicleType: 'info',
    vin: 'info',
    mileage: 'info',
    odometerSource: 'info',
    group: 'info',
    driver: 'info',
    status: 'info',
    imei: 'device',
    deviceId: 'device',
    deviceType: 'device',
    deviceStatus: 'device',
    installDate: 'device',
    serverAddress: 'device',
    deviceLocation: 'device',
    timezone: 'device',
    simOperator: 'device',
    sim: 'device',
    iccid: 'device',
    sensors: 'device',
    tankCapacity: 'fuel',
    fuelType: 'fuel',
    fuelSensorType: 'fuel',
    sensorUnit: 'fuel',
    fuelConversionFactor: 'fuel',
    sensorBrand: 'fuel',
    sensorModel: 'fuel',
    sensorInstallDate: 'fuel',
    voltageEmptyMv: 'fuel',
    voltageHalfMv: 'fuel',
    voltageFullMv: 'fuel',
    tankHeight: 'fuel',
    tankWidth: 'fuel',
    tankLength: 'fuel',
    consumption: 'fuel',
    refillThreshold: 'fuel',
    theftThreshold: 'fuel',
    calibrationTable: 'fuel',
    nextMaintenanceKm: 'maintenance',
    nextMaintenanceDate: 'maintenance',
    insuranceExpiry: 'maintenance',
    techVisitExpiry: 'maintenance',
    contractExpiry: 'maintenance',
    maxSpeed: 'maintenance',
    maxIdleTime: 'maintenance',
  };

  const onInvalid = (errs: typeof errors) => {
    const entries = Object.entries(errs);
    if (entries.length === 0) return;
    // Navigate to the tab containing the first error
    const firstTab = entries.map(([f]) => FIELD_TAB[f]).find(Boolean);
    if (firstTab) setActiveTab(firstTab);
    const messages = entries.map(([field, err]) => {
      const label = FIELD_LABELS[field] || field;
      const msg = (err as { message?: string })?.message || 'valeur invalide';
      return `${label} : ${msg}`;
    });
    setValidationError(messages.join('  ·  '));
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
              <FormField label="Alias / Nom (Optionnel)" error={errors.name?.message as string}>
                <Input {...register('name')} placeholder="Ex: Camion Benne 01" />
              </FormField>
              <FormField label="Compteur Distance (Km)" error={errors.odometer?.message as string}>
                <Input {...register('odometer')} type="number" />
              </FormField>
            </FormGrid>

            <FormGrid columns={2}>
              <FormField label="Marque" error={errors.brand?.message as string}>
                <Input {...register('brand')} />
              </FormField>
              <FormField label="Modèle" error={errors.model?.message as string}>
                <Input {...register('model')} />
              </FormField>
            </FormGrid>

            <FormGrid columns={3}>
              <FormField label="Année" error={errors.year?.message as string}>
                <Input {...register('year')} />
              </FormField>
              <FormField label="Couleur" error={errors.color?.message as string}>
                <Input {...register('color')} />
              </FormField>
              <FormField label="Type d'engin" error={errors.vehicleType?.message as string}>
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
              <FormField label="VIN (Châssis)" error={errors.vin?.message as string}>
                <Input {...register('vin')} />
              </FormField>
              <FormField label="Kilométrage Initial" error={errors.mileage?.message as string}>
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
                  <Input {...register('imei')} placeholder="Ex: 15042020102" />
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
                      {watchedImei && watchedImei.length >= 8
                        ? 'Non référencé dans le stock'
                        : "Saisir l'IMEI pour afficher le statut"}
                    </div>
                  )}
                </FormField>
              </FormGrid>

              {/* Emplacement boîtier — dropdown + saisie libre */}
              <FormGrid columns={2}>
                <FormField label="Date Installation" error={errors.installDate?.message as string}>
                  <Input {...register('installDate')} type="date" />
                </FormField>
                <FormField label="Adresse Serveur" error={errors.serverAddress?.message as string}>
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
                <FormField label="Capacité Réservoir (L)" error={errors.tankCapacity?.message as string}>
                  <Input {...register('tankCapacity')} type="number" />
                </FormField>
                <FormField label="Type Carburant" error={errors.fuelType?.message as string}>
                  <Select {...register('fuelType')}>
                    <option value="">-- Sélectionner --</option>
                    {FUEL_TYPE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <FormField label="Type de Capteur" error={errors.fuelSensorType?.message as string}>
                  <Select {...register('fuelSensorType')}>
                    <option value="">-- Sélectionner --</option>
                    <option value="CANBUS">CANBUS (Origine)</option>
                    <option value="CAPACITIVE">Sonde Capacitive</option>
                    <option value="ANALOG">Sonde Analogique (0-V)</option>
                    <option value="RS232">Sonde Numérique RS232</option>
                    <option value="BLUETOOTH">Sonde Bluetooth</option>
                    <option value="ULTRASONIC">Sonde Ultrason</option>
                  </Select>
                </FormField>
              </FormGrid>

              {/* ── Section capteur (masquée si CANBUS) ── */}
              {!isCanbus && (
                <>
                  <FormGrid columns={3}>
                    <FormField label="Unité mesure capteur" error={errors.sensorUnit?.message as string}>
                      <Select {...register('sensorUnit')}>
                        <option value="">-- Sélectionner --</option>
                        <option value="tension">Tension (mV)</option>
                        <option value="litres">Litres</option>
                        <option value="gallons">Gallons</option>
                        <option value="pourcentage">Pourcentage (%)</option>
                        <option value="hauteur">Hauteur (mm)</option>
                      </Select>
                    </FormField>
                    <FormField
                      label="Facteur de conversion"
                      hint="Multiplicateur appliqué sur la valeur brute (défaut=1)"
                      error={errors.fuelConversionFactor?.message as string}
                    >
                      <Input {...register('fuelConversionFactor')} type="number" step="0.01" placeholder="1" />
                    </FormField>
                    <FormField label="Marque capteur" error={errors.sensorBrand?.message as string}>
                      <Select {...register('sensorBrand')}>
                        <option value="">-- Sélectionner --</option>
                        {[
                          'Concox',
                          'Ligo',
                          'Ruptela',
                          'Mielta',
                          'Mechatronics',
                          'Omnicomm',
                          'Technoton',
                          'Escort',
                          'Noname',
                          'Autres',
                        ].map((b) => (
                          <option key={b} value={b}>
                            {b}
                          </option>
                        ))}
                      </Select>
                    </FormField>
                  </FormGrid>

                  <FormGrid columns={2}>
                    <FormField label="Modèle capteur (optionnel)" error={errors.sensorModel?.message as string}>
                      <Input {...register('sensorModel')} placeholder="ex: LS-200" />
                    </FormField>
                    <FormField label="Date installation capteur" error={errors.sensorInstallDate?.message as string}>
                      <Input {...register('sensorInstallDate')} type="date" />
                    </FormField>
                  </FormGrid>

                  {/* Champs tension conditionnels (masqués pour JT808 BLE : capteur livre déjà le volume) */}
                  {isTension && !isJT808BLE && (
                    <FormGrid columns={3}>
                      <FormField
                        label="Voltage vide (mV)"
                        hint="Signal capteur à réservoir vide"
                        error={errors.voltageEmptyMv?.message as string}
                      >
                        <Input {...register('voltageEmptyMv')} type="number" step="1" placeholder="0" />
                      </FormField>
                      <FormField label="Voltage mi-niveau (mV)" error={errors.voltageHalfMv?.message as string}>
                        <Input {...register('voltageHalfMv')} type="number" step="1" placeholder="2500" />
                      </FormField>
                      <FormField
                        label="Voltage plein (mV)"
                        hint="Signal capteur à réservoir plein"
                        error={errors.voltageFullMv?.message as string}
                      >
                        <Input {...register('voltageFullMv')} type="number" step="1" placeholder="5000" />
                      </FormField>
                    </FormGrid>
                  )}
                </>
              )}

              <FormGrid columns={3}>
                <FormField label="Hauteur (mm)" error={errors.tankHeight?.message as string}>
                  <Input {...register('tankHeight')} type="number" />
                </FormField>
                <FormField label="Largeur (mm)" error={errors.tankWidth?.message as string}>
                  <Input {...register('tankWidth')} type="number" />
                </FormField>
                <FormField label="Longueur (mm)" error={errors.tankLength?.message as string}>
                  <Input {...register('tankLength')} type="number" />
                </FormField>
              </FormGrid>

              <FormField label="Consommation Théorique (L/100km)" error={errors.consumption?.message as string}>
                <Input {...register('consumption')} type="number" step="0.1" />
              </FormField>

              <FormGrid columns={2}>
                <FormField
                  label="Seuil Détection Plein (%)"
                  hint="Hausse min. pour considérer un plein"
                  error={errors.refillThreshold?.message as string}
                >
                  <Input {...register('refillThreshold')} type="number" step="0.1" defaultValue={5.0} />
                </FormField>
                <FormField
                  label="Seuil Détection Vol (%)"
                  hint="Baisse min. à l'arrêt pour alerte vol"
                  error={errors.theftThreshold?.message as string}
                >
                  <Input {...register('theftThreshold')} type="number" step="0.1" defaultValue={3.0} />
                </FormField>
              </FormGrid>

              {!isJT808BLE && (
                <FormField label="Table de Calibration" hint="Format: hauteur(mm),volume(L) par ligne">
                  <Textarea
                    {...register('calibrationTable')}
                    rows={5}
                    className="font-mono"
                    placeholder="mm,litres&#10;0,0&#10;10,5&#10;20,12..."
                  />
                </FormField>
              )}

              {isJT808BLE && (
                <div className="text-xs text-[var(--text-muted)] bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg px-3 py-2 flex items-start gap-2">
                  <Fuel className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>
                    Capteur <strong>JT808 BLE</strong> : la calibration hauteur ↔ volume est faite directement dans la
                    jauge via l&apos;application mobile dédiée. Aucune table de calibration côté serveur n&apos;est
                    requise. Seul le <em>facteur de conversion</em> ci-dessus reste utilisé pour un éventuel ajustement
                    fin.
                  </span>
                </div>
              )}
            </FormSection>
          </div>
        )}

        {/* ── Onglet Maintenance ────────────────────────────────────── */}
        {activeTab === 'maintenance' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <FormSection icon={Wrench} title="Maintenance & Échéances">
              <FormGrid columns={2}>
                <FormField label="Prochaine Maintenance (Km)" error={errors.nextMaintenanceKm?.message as string}>
                  <Input {...register('nextMaintenanceKm')} type="number" />
                </FormField>
                <FormField label="Prochaine Maintenance (Date)" error={errors.nextMaintenanceDate?.message as string}>
                  <Input {...register('nextMaintenanceDate')} type="date" />
                </FormField>
              </FormGrid>

              <FormGrid columns={2}>
                <FormField label="Fin Assurance" error={errors.insuranceExpiry?.message as string}>
                  <Input {...register('insuranceExpiry')} type="date" />
                </FormField>
                <FormField label="Fin Visite Technique" error={errors.techVisitExpiry?.message as string}>
                  <Input {...register('techVisitExpiry')} type="date" />
                </FormField>
              </FormGrid>

              <FormField label="Date d'expiration Contrat" error={errors.contractExpiry?.message as string}>
                <Input {...register('contractExpiry')} type="date" />
              </FormField>
            </FormSection>

            <div className="border-t border-[var(--border)] pt-4">
              <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-3">
                Seuils d'alerte
              </h4>
              <FormGrid columns={2}>
                <FormField label="Vitesse Max (km/h)" error={errors.maxSpeed?.message as string}>
                  <Input {...register('maxSpeed')} type="number" />
                </FormField>
                <FormField label="Ralenti Max (min)" error={errors.maxIdleTime?.message as string}>
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
