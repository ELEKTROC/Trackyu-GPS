import React, { useState, useMemo, useEffect } from 'react';
import { useForm, type Resolver, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { VehicleSchema } from '../../../../schemas/vehicleSchema';
import { Car, Cpu, Fuel, Wrench, History, Loader2 } from 'lucide-react';
import { api } from '../../../../services/api';
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

export const VehicleForm = React.forwardRef<HTMLFormElement, BaseFormProps & { clients?: ClientOption[], resellers?: ResellerOption[], branches?: BranchOption[], groups?: GroupOption[], drivers?: DriverOption[] }>(({ initialData, onFormSubmit, clients = [], resellers = [], branches = [], groups = [], drivers = [] }, ref) => {
    const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<VehicleFormData>({
        resolver: zodResolver(VehicleSchema) as unknown as Resolver<VehicleFormData>,
        defaultValues: initialData || {
            odometerSource: 'GPS',
            status: 'STOPPED',
        }
    });
    const [activeTab, setActiveTab] = useState('info');

    // Device Models (chargés depuis Admin > Paramètres Boîtiers)
    const [deviceModels, setDeviceModels] = useState<DeviceModel[]>([]);
    const [loadingModels, setLoadingModels] = useState(true);

    useEffect(() => {
        const loadDeviceModels = async () => {
            try {
                const models = await api.techSettings.getDeviceModels('BOX');
                setDeviceModels(models || []);
            } catch (err) {
                logger.warn('Impossible de charger les modèles de trackers:', err);
                // Fallback: modèles par défaut
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
        loadDeviceModels();
    }, []);

    // --- CASCADING LOGIC ---
    const selectedResellerId = watch('resellerId');
    const selectedClientId = watch('client'); // Note: 'client' stores the NAME in current arch, ideally should be ID. Assuming ID based on plan.
    // If 'client' field stores Name, we have a problem for filtering branches which usually link to ClientID.
    // Plan said: "Strict UUIDs + Names for display".
    // So 'client' should store ID.

    // Derived Lists
    const filteredClients = useMemo(() => {
        if (!selectedResellerId) return clients; // Show all clients if no reseller selected (edit mode)
        return clients.filter(c => c.resellerId === selectedResellerId);
    }, [selectedResellerId, clients]);

    const filteredBranches = useMemo(() => {
        if (!selectedClientId) return branches; // Show all branches if no client selected (edit mode)
        return branches.filter(b => (b.client_id || b.clientId || b.client) === selectedClientId);
    }, [selectedClientId, branches]);

    // Reset children when reseller changes — skip if value matches initialData (not a user change)
    useEffect(() => {
        if (selectedResellerId === (initialData?.resellerId ?? '')) return;
        setValue('client', '');
        setValue('branchId', '');
    }, [selectedResellerId, setValue, initialData?.resellerId]);

    useEffect(() => {
        if (selectedClientId === (initialData?.client ?? '')) return;
        setValue('branchId', '');
    }, [selectedClientId, setValue, initialData?.client]);


    // Auto-generate calibration table
    const tankHeight = watch('tankHeight');
    const tankCapacity = watch('tankCapacity');
    const calibrationTable = watch('calibrationTable');

    React.useEffect(() => {
        if (tankHeight && tankCapacity && !calibrationTable) {
            const steps = 10;
            let table = "";
            for (let i = 0; i <= steps; i++) {
                const h = Math.round((i / steps) * (tankHeight ?? 0));
                const v = Math.round((i / steps) * (tankCapacity ?? 0));
                table += `${h},${v}\n`;
            }
            setValue('calibrationTable', table.trim());
        }
    }, [tankHeight, tankCapacity, setValue]);

    const [isSaving, setIsSaving] = useState(false);
    const onSubmit: SubmitHandler<VehicleFormData> = async (data) => {
        if (isSaving) return;
        setIsSaving(true);
        try { await onFormSubmit(data); } finally { setIsSaving(false); }
    };

    return (
        <form ref={ref} onSubmit={handleSubmit(onSubmit as SubmitHandler<VehicleFormData>)} className="h-[600px] flex flex-col">
            {/* ABO Code Banner (edit mode) */}
            {initialData?.id?.startsWith('ABO-') && (
                <div className="flex items-center gap-3 mb-3 px-3 py-2 bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] border border-[var(--border)] dark:border-[var(--primary)] rounded-lg">
                    <span className="text-xs font-bold text-[var(--primary)] dark:text-[var(--primary)] uppercase">Code Objet</span>
                    <span className="font-mono text-sm font-semibold text-[var(--primary)] dark:text-[var(--primary)] bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] px-2.5 py-0.5 rounded-md tracking-wider">{initialData.id}</span>
                </div>
            )}
            {/* Tabs Header */}
            <div className="flex border-b border-slate-200 dark:border-slate-700 mb-4 overflow-x-auto">
                <button type="button" onClick={() => setActiveTab('info')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'info' ? 'border-[var(--primary)] text-[var(--primary)]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                    <Car className="w-4 h-4" /> Infos Véhicule
                </button>
                <button type="button" onClick={() => setActiveTab('device')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'device' ? 'border-[var(--primary)] text-[var(--primary)]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                    <Cpu className="w-4 h-4" /> Boîtier & Connectivité
                </button>
                <button type="button" onClick={() => setActiveTab('fuel')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'fuel' ? 'border-[var(--primary)] text-[var(--primary)]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                    <Fuel className="w-4 h-4" /> Jauge
                </button>
                <button type="button" onClick={() => setActiveTab('maintenance')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'maintenance' ? 'border-[var(--primary)] text-[var(--primary)]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                    <Wrench className="w-4 h-4" /> Maintenance
                </button>
                <button type="button" onClick={() => setActiveTab('history')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'history' ? 'border-[var(--primary)] text-[var(--primary)]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                    <History className="w-4 h-4" /> Historique
                </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {activeTab === 'info' && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                        {/* Revendeur & Client & Branche (CASCADE) */}
                        <FormSection icon={Car} title="Rattachement">
                            <FormGrid columns={3}>
                                <FormField label="Revendeur" required>
                                    <Select {...register('resellerId')}>
                                        <option value="">Sélectionner...</option>
                                        {resellers.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                                    </Select>
                                </FormField>
                                <FormField label="Client" required>
                                    <Select {...register('client')} disabled={!selectedResellerId && !initialData?.client}>
                                        <option value="">Sélectionner...</option>
                                        {filteredClients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </Select>
                                </FormField>
                                <FormField label="Branche" required>
                                    <Select {...register('branchId')} disabled={!selectedClientId && !initialData?.branchId}>
                                        <option value="">Sélectionner...</option>
                                        {filteredBranches.map((b) => <option key={b.id} value={b.id}>{b.name || b.nom || b.id}</option>)}
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
                            <FormField label="Type">
                                <Select {...register('vehicleType')}>
                                    <option value="">— Sélectionner —</option>
                                    <option value="TRUCK">Camion</option>
                                    <option value="CAR">Voiture</option>
                                    <option value="VAN">Utilitaire</option>
                                    <option value="CONSTRUCTION">Engin TP</option>
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
                            <FormField label="Source Odomètre" hint="GPS: Calculé par distance entre points. CANBUS: Lu depuis le tableau de bord.">
                                <Select {...register('odometerSource')}>
                                    <option value="GPS">Calcul GPS (Serveur)</option>
                                    <option value="CANBUS">Données CANBUS (Boîtier)</option>
                                </Select>
                            </FormField>
                            <FormField label="Groupe">
                                <Select {...register('group')}>
                                    <option value="">Sélectionner...</option>
                                    {groups.map((g) => <option key={g.id} value={g.id}>{g.nom}</option>)}
                                </Select>
                            </FormField>
                            <FormField label="Conducteur Assigné">
                                <Select {...register('driver')}>
                                    <option value="">Non assigné</option>
                                    {drivers.map((d) => <option key={d.id} value={d.id}>{d.nom}</option>)}
                                </Select>
                            </FormField>
                        </FormGrid>
                    </div>
                )}

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
                                            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin" />
                                        )}
                                        <Select {...register('deviceType')}>
                                            <option value="">-- Sélectionner --</option>
                                            {deviceModels.map(dm => (
                                                <option key={dm.id} value={`${dm.brand} ${dm.model}`}>
                                                    {dm.brand} {dm.model} {dm.protocol ? `(${dm.protocol})` : ''}
                                                </option>
                                            ))}
                                        </Select>
                                    </div>
                                </FormField>
                                <FormField label="Opérateur SIM">
                                    <Input {...register('simOperator')} placeholder="Ex: Orange, MTN" />
                                </FormField>
                            </FormGrid>

                            <FormGrid columns={2}>
                                <FormField label="Numéro SIM">
                                    <Input {...register('sim')} />
                                </FormField>
                                <FormField label="ICCID SIM">
                                    <Input {...register('iccid')} />
                                </FormField>
                            </FormGrid>

                            <FormGrid columns={2}>
                                <FormField label="Adresse Serveur">
                                    <Input {...register('serverAddress')} placeholder="IP ou DNS" />
                                </FormField>
                                <FormField label="Fuseau Horaire">
                                    <Select {...register('timezone')}>
                                        <option value="UTC">UTC</option>
                                        <option value="UTC+1">UTC+1 (CET)</option>
                                        <option value="UTC+2">UTC+2</option>
                                        <option value="UTC+3">UTC+3</option>
                                    </Select>
                                </FormField>
                            </FormGrid>

                            <FormGrid columns={3}>
                                <FormField label="Date Installation">
                                    <Input {...register('installDate')} type="date" />
                                </FormField>
                                <FormField label="Emplacement Boîtier">
                                    <Input {...register('deviceLocation')} placeholder="Ex: Tableau de bord" />
                                </FormField>
                                <FormField label="Statut Boîtier">
                                    <Select {...register('deviceStatus')}>
                                        <option value="">-- Sélectionner --</option>
                                        <option value="IN_STOCK">En stock</option>
                                        <option value="INSTALLED">Installé</option>
                                        <option value="DEFECTIVE">Défectueux</option>
                                        <option value="RETURNED">Retourné</option>
                                        <option value="RMA">RMA en cours</option>
                                        <option value="RMA_PENDING">RMA en attente</option>
                                        <option value="SENT_TO_SUPPLIER">Envoyé fournisseur</option>
                                        <option value="REPLACED_BY_SUPPLIER">Remplacé fournisseur</option>
                                        <option value="SCRAPPED">Mis au rebut</option>
                                        <option value="LOST">Perdu</option>
                                        <option value="REMOVED">Retiré</option>
                                    </Select>
                                </FormField>
                            </FormGrid>
                        </FormSection>

                        <FormField label="Capteurs & Accessoires">
                            <div className="grid grid-cols-2 gap-3 p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                                <label className="flex items-center gap-2 text-sm cursor-pointer p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                                    <input type="checkbox" {...register('sensors')} value="FUEL" className="rounded-lg" /> Jauge Carburant
                                </label>
                                <label className="flex items-center gap-2 text-sm cursor-pointer p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                                    <input type="checkbox" {...register('sensors')} value="TEMP" className="rounded-lg" /> Sonde Température
                                </label>
                                <label className="flex items-center gap-2 text-sm cursor-pointer p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                                    <input type="checkbox" {...register('sensors')} value="DOOR" className="rounded-lg" /> Capteur Porte
                                </label>
                                <label className="flex items-center gap-2 text-sm cursor-pointer p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                                    <input type="checkbox" {...register('sensors')} value="ID" className="rounded-lg" /> Lecteur Badge
                                </label>
                                <label className="flex items-center gap-2 text-sm cursor-pointer p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                                    <input type="checkbox" {...register('sensors')} value="RELAY" className="rounded-lg" /> Relais Coupure
                                </label>
                            </div>
                        </FormField>
                    </div>
                )}

                {activeTab === 'fuel' && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                        <FormSection icon={Fuel} title="Configuration Carburant">
                            <FormGrid columns={3}>
                                <FormField label="Capacité Réservoir (L)">
                                    <Input {...register('tankCapacity')} type="number" />
                                </FormField>
                                <FormField label="Type Carburant">
                                    <Select {...register('fuelType')}>
                                        <option value="">-- Sélectionner --</option>
                                        {FUEL_TYPE_OPTIONS.map(o => (
                                            <option key={o.value} value={o.value}>{o.label}</option>
                                        ))}
                                    </Select>
                                </FormField>
                                <FormField label="Type de Capteur">
                                    <Select {...register('fuelSensorType')}>
                                        <option value="CANBUS">CANBUS (Origine)</option>
                                        <option value="CAPACITIVE">Sonde Capacitive</option>
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
                                <Textarea {...register('calibrationTable')} rows={5} className="font-mono" placeholder="mm,litres&#10;0,0&#10;10,5&#10;20,12..." />
                            </FormField>
                        </FormSection>
                    </div>
                )}

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

                        <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                            <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">Seuils d'alerte</h4>
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

                {activeTab === 'history' && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                        <FormSection icon={History} title="Historique des événements">
                            <div className="text-sm text-slate-500">Historique non disponible pour le moment.</div>
                        </FormSection>
                    </div>
                )}
            </div>
        </form>
    );
});

VehicleForm.displayName = 'VehicleForm';
