import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { EcoDrivingSchema } from '../../../../schemas/ecoDrivingSchema';
import { Truck, Gauge, Car, RotateCcw, AlertTriangle } from 'lucide-react';
import { FormField, Input, Select, FormGrid, FormSection } from '../../../../components/form';
import type { z } from 'zod';

export type EcoDrivingFormData = z.infer<typeof EcoDrivingSchema>;

interface ClientOption {
    id: string;
    name: string;
}

interface ResellerOption {
    id: string;
    nom?: string;
    name?: string;
}

interface VehicleOption {
    id: string;
    name?: string;
    immatriculation?: string;
}

interface BaseFormProps {
    initialData?: Partial<EcoDrivingFormData>;
    onFormSubmit: (data: EcoDrivingFormData) => void | Promise<void>;
    clients?: ClientOption[];
    resellers?: ResellerOption[];
    vehicles?: VehicleOption[];
}

export const EcoDrivingForm = React.forwardRef<HTMLFormElement, BaseFormProps>(({ initialData, onFormSubmit, clients = [], resellers = [], vehicles = [] }, ref) => {
    const { register, handleSubmit, formState: { errors } } = useForm<EcoDrivingFormData>({
         
        resolver: zodResolver(EcoDrivingSchema),
        defaultValues: initialData || {
            statut: 'Actif',
            maxSpeedLimit: 110,
            maxSpeedPenalty: 20,
            harshAccelerationSensitivity: 'Medium',
            harshAccelerationPenalty: 20,
            harshBrakingSensitivity: 'Medium',
            harshBrakingPenalty: 20,
            harshCorneringSensitivity: 'Medium',
            harshCorneringPenalty: 20,
            maxIdlingDuration: 5,
            idlingPenalty: 20,
            targetScore: 80
        }
    });

    const [isSaving, setIsSaving] = useState(false);
    const onSubmit = async (data: EcoDrivingFormData) => {
        if (isSaving) return;
        setIsSaving(true);
        try { await onFormSubmit(data); } finally { setIsSaving(false); }
    };

    return (
        <form ref={ref} onSubmit={handleSubmit(onSubmit)} className="space-y-6 h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {/* Context */}
            <FormGrid columns={2}>
                <FormField label="Revendeur">
                    <Select {...register('resellerId')}>
                        <option value="">Sélectionner...</option>
                        {resellers.map((r) => <option key={r.id} value={r.id}>{r.nom}</option>)}
                    </Select>
                </FormField>
                <FormField label="Client">
                    <Select {...register('client')}>
                        <option value="">Sélectionner...</option>
                        {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </Select>
                </FormField>
            </FormGrid>

            <FormField label="Nom du Profil" required error={errors.nom?.message as string}>
                <Input {...register('nom')} placeholder="Ex: Profil Éco Standard" error={!!errors.nom} />
            </FormField>

            {/* Véhicules concernés */}
            <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] rounded-lg">
                        <Truck className="w-4 h-4 text-[var(--primary)] dark:text-[var(--primary)]" />
                    </div>
                    <span className="font-semibold text-sm text-slate-700 dark:text-slate-300">Véhicules concernés</span>
                </div>
                <label className="flex items-center gap-2 mb-3 cursor-pointer">
                    <input type="checkbox" {...register('allVehicles')} id="allVehiclesEco" className="w-4 h-4 rounded-lg border-slate-300 text-[var(--primary)] focus:ring-[var(--primary)]" />
                    <span className="text-sm text-slate-600 dark:text-slate-400">Appliquer à tous les véhicules du client</span>
                </label>
                <FormField label="Ou sélectionner des véhicules" hint="Ctrl+Clic pour sélection multiple">
                    <select {...register('vehicleIds')} multiple className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-sm h-24 focus:ring-4 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]">
                        {vehicles.map((v) => (
                            <option key={v.id} value={v.id}>
                                {v.name || v.immatriculation} {v.immatriculation ? `(${v.immatriculation})` : ''}
                            </option>
                        ))}
                    </select>
                </FormField>
            </div>

            {/* Excès de Vitesse */}
            <FormSection title="Excès de Vitesse" icon={Gauge}>
                <FormGrid columns={2}>
                    <FormField label="Seuil (km/h)">
                        <Input {...register('maxSpeedLimit')} type="number" />
                    </FormField>
                    <FormField label="Pénalité (Points)">
                        <Input {...register('maxSpeedPenalty')} type="number" />
                    </FormField>
                </FormGrid>
            </FormSection>

            {/* Accélération Brusque */}
            <FormSection title="Accélération Brusque" icon={AlertTriangle}>
                <FormGrid columns={2}>
                    <FormField label="Sensibilité">
                        <Select {...register('harshAccelerationSensitivity')}>
                            <option value="Low">Faible</option>
                            <option value="Medium">Moyenne</option>
                            <option value="High">Élevée</option>
                        </Select>
                    </FormField>
                    <FormField label="Pénalité (Points)">
                        <Input {...register('harshAccelerationPenalty')} type="number" />
                    </FormField>
                </FormGrid>
            </FormSection>

            {/* Freinage Brusque */}
            <FormSection title="Freinage Brusque" icon={Car}>
                <FormGrid columns={2}>
                    <FormField label="Sensibilité">
                        <Select {...register('harshBrakingSensitivity')}>
                            <option value="Low">Faible</option>
                            <option value="Medium">Moyenne</option>
                            <option value="High">Élevée</option>
                        </Select>
                    </FormField>
                    <FormField label="Pénalité (Points)">
                        <Input {...register('harshBrakingPenalty')} type="number" />
                    </FormField>
                </FormGrid>
            </FormSection>

            {/* Virage Brusque */}
            <FormSection title="Virage Brusque" icon={RotateCcw}>
                <FormGrid columns={2}>
                    <FormField label="Sensibilité">
                        <Select {...register('harshCorneringSensitivity')}>
                            <option value="Low">Faible</option>
                            <option value="Medium">Moyenne</option>
                            <option value="High">Élevée</option>
                        </Select>
                    </FormField>
                    <FormField label="Pénalité (Points)">
                        <Input {...register('harshCorneringPenalty')} type="number" />
                    </FormField>
                </FormGrid>
            </FormSection>

            {/* Ralenti Excessif */}
            <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-5 bg-slate-50/50 dark:bg-slate-800/30 space-y-4">
                <h4 className="font-semibold text-sm text-slate-700 dark:text-slate-300">Ralenti Excessif</h4>
                <FormGrid columns={2}>
                    <FormField label="Seuil (min)">
                        <Input {...register('maxIdlingDuration')} type="number" />
                    </FormField>
                    <FormField label="Pénalité (Points)">
                        <Input {...register('idlingPenalty')} type="number" />
                    </FormField>
                </FormGrid>
            </div>

            {/* Score et Statut */}
            <FormGrid columns={2}>
                <FormField label="Score Cible (Zone Verte)">
                    <Input {...register('targetScore')} type="number" />
                </FormField>
                <FormField label="Statut">
                    <Select {...register('statut')}>
                        <option value="Actif">Actif</option>
                        <option value="Inactif">Inactif</option>
                    </Select>
                </FormField>
            </FormGrid>
        </form>
    );
});
