import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { TechFormData } from '../../../../schemas/techSchema';
import { TechSchema } from '../../../../schemas/techSchema';
import { User, Wrench } from 'lucide-react';
import { FormField, Input, Select, FormSection, FormGrid } from '../../../../components/form';

interface BaseFormProps {
    initialData?: Partial<TechFormData>;
    onFormSubmit: (data: TechFormData) => void;
}

export const TechForm = React.forwardRef<HTMLFormElement, BaseFormProps>(({ initialData, onFormSubmit }, ref) => {
    const { register, handleSubmit, formState: { errors } } = useForm<TechFormData>({
        resolver: zodResolver(TechSchema),
        defaultValues: initialData || { statut: 'Actif', niveau: 'Confirmé' }
    });

    const onSubmit = (data: TechFormData) => {
        onFormSubmit(data);
    };

    return (
        <form ref={ref} onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Identité */}
                <FormSection title="Identité & Contact" icon={User}>
                    <FormField label="Nom du Technicien" required error={errors.nom?.message as string}>
                        <Input {...register('nom')} type="text" placeholder="Ex: Jean Kouassi" error={!!errors.nom} />
                    </FormField>

                    <FormField label="Email" error={errors.email?.message as string}>
                        <Input {...register('email')} type="email" placeholder="technicien@email.com" error={!!errors.email} />
                    </FormField>

                    <FormField label="Téléphone">
                        <Input {...register('telephone')} type="text" placeholder="+225 07 00 00 00 00" />
                    </FormField>

                    <FormField label="Société" hint="Renseigner si technicien externe">
                        <Input {...register('societe')} type="text" placeholder="Nom de la société prestataire" />
                    </FormField>
                </FormSection>

                {/* Compétences */}
                <FormSection title="Compétences & Zone" icon={Wrench}>
                    <FormField label="Spécialité" required error={errors.specialite?.message as string}>
                        <Input {...register('specialite')} type="text" placeholder="Ex: Électricien, Mécanicien GPS" error={!!errors.specialite} />
                    </FormField>

                    <FormField label="Niveau de Certification">
                        <Select {...register('niveau')}>
                            <option value="Junior">Junior</option>
                            <option value="Confirmé">Confirmé</option>
                            <option value="Expert">Expert</option>
                        </Select>
                    </FormField>

                    <FormField label="Zone d'intervention" error={errors.zone?.message as string}>
                        <Input {...register('zone')} type="text" placeholder="Ex: Abidjan, Bouaké" error={!!errors.zone} />
                    </FormField>

                    <FormField label="Statut">
                        <Select {...register('statut')}>
                            <option value="Actif">Actif</option>
                            <option value="Inactif">Inactif</option>
                            <option value="En attente">En attente</option>
                        </Select>
                    </FormField>
                </FormSection>
            </div>
        </form>
    );
});
