import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { BranchSchema } from '../../../../schemas/branchSchema';
import { Building2, Info } from 'lucide-react';
import { FormField, Input, Select, FormSection, FormGrid } from '../../../../components/form';
import type { z } from 'zod';

export type BranchFormData = z.infer<typeof BranchSchema>;

interface ClientOption {
    id: string;
    name: string;
}

interface BaseFormProps {
    initialData?: Partial<BranchFormData>;
    onFormSubmit: (data: BranchFormData) => void;
    clients?: ClientOption[];
}

export const BranchForm = React.forwardRef<HTMLFormElement, BaseFormProps>(({ initialData, onFormSubmit, clients = [] }, ref) => {
    const { register, handleSubmit, formState: { errors } } = useForm<BranchFormData>({
         
        resolver: zodResolver(BranchSchema),
        defaultValues: initialData || { status: 'ACTIVE', isDefault: false }
    });

    const onSubmit = (data: BranchFormData) => {
        onFormSubmit(data);
    };

    return (
        <form ref={ref} onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <FormSection title="Informations de la Flotte" icon={Building2}>
                <FormGrid cols={2}>
                    <FormField label="Nom de la flotte" required error={errors.name?.message as string}>
                        <Input {...register('name')} type="text" placeholder="Ex: Flotte Nord" error={!!errors.name} />
                    </FormField>
                    <FormField label="Client Rattaché" required error={errors.clientId?.message as string}>
                        <Select {...register('clientId')} error={!!errors.clientId}>
                            <option value="">Sélectionner...</option>
                            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </Select>
                    </FormField>
                </FormGrid>

                <FormGrid cols={2}>
                    <FormField label="Statut">
                        <Select {...register('status')}>
                            <option value="ACTIVE">Actif</option>
                            <option value="INACTIVE">Inactif</option>
                        </Select>
                    </FormField>
                    <div className="flex items-center pt-7">
                        <label className="flex items-center gap-3 cursor-pointer group">
                            <input 
                                {...register('isDefault')} 
                                type="checkbox" 
                                className="w-5 h-5 rounded border-slate-300 dark:border-slate-600 text-[var(--primary)] focus:ring-[var(--primary)] focus:ring-offset-0" 
                            />
                            <span className="text-sm text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors">
                                Flotte par défaut
                            </span>
                        </label>
                    </div>
                </FormGrid>
            </FormSection>

            {/* Informations Complémentaires */}
            <FormSection title="Informations Complémentaires" icon={Info} description="Optionnel">
                <FormGrid cols={2}>
                    <FormField label="Ville">
                        <Input {...register('ville')} type="text" placeholder="Ex: Abidjan" />
                    </FormField>
                    <FormField label="Responsable">
                        <Input {...register('responsable')} type="text" placeholder="Nom du responsable" />
                    </FormField>
                </FormGrid>
            </FormSection>
        </form>
    );
});
