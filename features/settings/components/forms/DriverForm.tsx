import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { DriverFormData } from '../../../../schemas/driverSchema';
import { DriverSchema } from '../../../../schemas/driverSchema';
import { User, CreditCard, Truck } from 'lucide-react';
import { FormField, Input, Select, FormSection, FormGrid } from '../../../../components/form';

interface VehicleOption {
    id: string;
    name?: string;
    immatriculation?: string;
}

interface BaseFormProps {
    initialData?: Partial<DriverFormData>;
    onFormSubmit: (data: DriverFormData) => void | Promise<void>;
    vehicles?: VehicleOption[];
}

export const DriverForm = React.forwardRef<HTMLFormElement, BaseFormProps>(({ initialData, onFormSubmit, vehicles = [] }, ref) => {
    const { register, handleSubmit, formState: { errors } } = useForm<DriverFormData>({
         
        resolver: zodResolver(DriverSchema),
        defaultValues: initialData || { statut: 'ACTIVE' }
    });

    const [isSaving, setIsSaving] = useState(false);
    const onSubmit = async (data: DriverFormData) => {
        if (isSaving) return;
        setIsSaving(true);
        try { await onFormSubmit(data); } finally { setIsSaving(false); }
    };

    return (
        <form ref={ref} onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Informations Personnelles */}
                <FormSection title="Informations Personnelles" icon={User}>
                    <FormField label="Nom Complet" required error={errors.nom?.message as string}>
                        <Input 
                            {...register('nom')} 
                            type="text" 
                            placeholder="Ex: Jean Dupont"
                            error={!!errors.nom}
                        />
                    </FormField>

                    <FormField label="Email" error={errors.email?.message as string}>
                        <Input 
                            {...register('email')} 
                            type="email" 
                            placeholder="jean.dupont@email.com"
                            error={!!errors.email}
                        />
                    </FormField>

                    <FormField label="Téléphone">
                        <Input 
                            {...register('telephone')} 
                            type="text" 
                            placeholder="+225 07 12 34 56 78"
                        />
                    </FormField>

                    <FormField label="Adresse">
                        <Input 
                            {...register('adresse')} 
                            type="text" 
                            placeholder="123 Rue de la Paix"
                        />
                    </FormField>
                </FormSection>

                {/* Permis & Identification */}
                <FormSection title="Permis & Identification" icon={CreditCard}>
                    <FormGrid cols={2}>
                        <FormField label="N° Permis">
                            <Input {...register('permis')} type="text" placeholder="AB-123456" />
                        </FormField>
                        <FormField label="Catégories">
                            <Input {...register('permisCategories')} type="text" placeholder="B, C, CE" />
                        </FormField>
                    </FormGrid>

                    <FormField label="Expiration Permis">
                        <Input {...register('permisExpiration')} type="date" />
                    </FormField>

                    <FormField label="Badge RFID" hint="Scanner ou saisir manuellement le code">
                        <Input {...register('rfidTag')} type="text" placeholder="0000-0000-0000" />
                    </FormField>

                    <FormField label="Contact d'urgence">
                        <Input {...register('contactUrgence')} type="text" placeholder="Nom et téléphone" />
                    </FormField>

                    <FormField label="Statut">
                        <Select {...register('statut')}>
                            <option value="ACTIVE">Actif</option>
                            <option value="INACTIVE">Inactif</option>
                            <option value="ON_LEAVE">En congé</option>
                        </Select>
                    </FormField>
                </FormSection>
            </div>

            {/* Véhicule Assigné */}
            <FormSection title="Véhicule Assigné" icon={Truck}>
                <FormField label="Véhicule Principal" hint="Le chauffeur sera associé par défaut à ce véhicule">
                    <Select {...register('vehicleId')}>
                        <option value="">Aucun véhicule assigné</option>
                        {vehicles.map((v) => (
                            <option key={v.id} value={v.id}>
                                {v.name || v.immatriculation} {v.immatriculation ? `(${v.immatriculation})` : ''}
                            </option>
                        ))}
                    </Select>
                </FormField>
            </FormSection>
        </form>
    );
});
