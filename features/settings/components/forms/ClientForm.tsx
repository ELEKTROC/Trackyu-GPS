import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ClientSchema } from '../../../../schemas/clientSchema';
import { User, Phone, CreditCard, Key, UserPlus, AlertCircle } from 'lucide-react';
import { FormField, Input, Select, FormGrid } from '../../../../components/form';
import { z } from 'zod';

export type ClientFormData = z.infer<typeof ClientSchema>;

interface ResellerOption {
    id: string;
    nom?: string;
    name?: string;
}

interface BaseFormProps {
    initialData?: Partial<ClientFormData>;
    onFormSubmit: (data: ClientFormData) => void;
    resellers?: ResellerOption[];
}

export const ClientForm = React.forwardRef<HTMLFormElement, BaseFormProps>(({ initialData, onFormSubmit, resellers = [] }, ref) => {
    const { register, handleSubmit, formState: { errors }, watch } = useForm<ClientFormData>({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resolver: zodResolver(ClientSchema),
        defaultValues: initialData || {
            type: 'B2B',
            status: 'ACTIVE',
            paymentStatus: 'UP_TO_DATE',
            createUserAccount: false,
            defaultPassword: ''
        }
    });
    const [activeTab, setActiveTab] = useState('identity');
    const createUserAccount = watch('createUserAccount');
    const clientEmail = watch('email');

    const onSubmit = (data: ClientFormData) => {
        onFormSubmit(data);
    };

    const tabs = [
        { id: 'identity', label: 'Identité', icon: User },
        { id: 'contact', label: 'Contacts', icon: Phone },
        { id: 'finance', label: 'Finance', icon: CreditCard },
        { id: 'account', label: 'Compte', icon: Key },
    ];

    return (
        <form ref={ref} onSubmit={handleSubmit(onSubmit)} className="h-[600px] flex flex-col">
            {/* Tab Navigation - Style amélioré */}
            <div className="flex border-b border-slate-200 dark:border-slate-700 mb-5">
                {tabs.map(tab => (
                    <button 
                        key={tab.id}
                        type="button" 
                        onClick={() => setActiveTab(tab.id)} 
                        className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all flex items-center gap-2 ${
                            activeTab === tab.id 
                                ? 'border-blue-600 text-blue-600 dark:text-blue-400' 
                                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300'
                        }`}
                    >
                        <tab.icon className="w-4 h-4" /> {tab.label}
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {activeTab === 'identity' && (
                    <div className="space-y-5 animate-in fade-in duration-200">
                        <FormGrid cols={2}>
                            <FormField label="Nom Société" required error={errors.name?.message as string}>
                                <Input {...register('name')} type="text" placeholder="Ex: Transport Express" error={!!errors.name} />
                            </FormField>
                            <FormField label="Type">
                                <Select {...register('type')}>
                                    <option value="B2B">Entreprise (B2B)</option>
                                    <option value="B2C">Particulier (B2C)</option>
                                </Select>
                            </FormField>
                        </FormGrid>
                        <FormGrid cols={2}>
                            <FormField label="Revendeur">
                                <Select {...register('resellerId')}>
                                    <option value="">Sélectionner...</option>
                                    {resellers.map((r) => <option key={r.id} value={r.id}>{r.nom}</option>)}
                                </Select>
                            </FormField>
                            <FormField label="Statut">
                                <Select {...register('status')}>
                                    <option value="ACTIVE">Actif</option>
                                    <option value="SUSPENDED">Suspendu</option>
                                    <option value="CHURNED">Perdu</option>
                                </Select>
                            </FormField>
                        </FormGrid>
                        <FormGrid cols={2}>
                            <FormField label="Secteur d'activité">
                                <Input {...register('sector')} type="text" placeholder="Ex: Transport routier" />
                            </FormField>
                            <FormField label="Langue">
                                <Select {...register('language')}>
                                    <option value="fr">Français</option>
                                    <option value="en">Anglais</option>
                                    <option value="ar">Arabe</option>
                                </Select>
                            </FormField>
                        </FormGrid>
                    </div>
                )}

                {activeTab === 'contact' && (
                    <div className="space-y-5 animate-in fade-in duration-200">
                        <FormGrid cols={2}>
                            <FormField label="Contact Principal" error={errors.contactName?.message as string}>
                                <Input {...register('contactName')} type="text" placeholder="Nom du responsable" error={!!errors.contactName} />
                            </FormField>
                            <FormField label="Email" required error={errors.email?.message as string}>
                                <Input {...register('email')} type="email" placeholder="contact@entreprise.com" error={!!errors.email} />
                            </FormField>
                        </FormGrid>
                        <FormGrid cols={2}>
                            <FormField label="Téléphone">
                                <Input {...register('phone')} type="text" placeholder="+225 07 00 00 00 00" />
                            </FormField>
                            <FormField label="Contact Secondaire">
                                <Input {...register('secondContactName')} type="text" placeholder="Nom (optionnel)" />
                            </FormField>
                        </FormGrid>
                        <FormField label="Adresse">
                            <Input {...register('address')} type="text" placeholder="Rue, quartier..." />
                        </FormField>
                        <FormGrid cols={2}>
                            <FormField label="Ville">
                                <Input {...register('city')} type="text" placeholder="Abidjan" />
                            </FormField>
                            <FormField label="Pays">
                                <Input {...register('country')} type="text" placeholder="Côte d'Ivoire" />
                            </FormField>
                        </FormGrid>
                    </div>
                )}

                {activeTab === 'finance' && (
                    <div className="space-y-5 animate-in fade-in duration-200">
                        <FormGrid cols={2}>
                            <FormField label="Plan d'abonnement">
                                <Select {...register('subscriptionPlan')}>
                                    <option value="BASIC">Basic</option>
                                    <option value="PRO">Pro</option>
                                    <option value="ENTERPRISE">Enterprise</option>
                                </Select>
                            </FormField>
                            <FormField label="Devise">
                                <Select {...register('currency')}>
                                    <option value="EUR">EUR</option>
                                    <option value="USD">USD</option>
                                    <option value="MAD">MAD</option>
                                    <option value="XOF">XOF</option>
                                </Select>
                            </FormField>
                        </FormGrid>
                        <FormGrid cols={2}>
                            <FormField label="Conditions de paiement">
                                <Select {...register('paymentTerms')}>
                                    <option value="IMMEDIATE">Immédiat</option>
                                    <option value="NET30">30 Jours</option>
                                    <option value="NET60">60 Jours</option>
                                </Select>
                            </FormField>
                            <FormField label="Statut Paiement">
                                <Select {...register('paymentStatus')}>
                                    <option value="UP_TO_DATE">À jour</option>
                                    <option value="OVERDUE">En retard</option>
                                </Select>
                            </FormField>
                        </FormGrid>
                    </div>
                )}

                {/* Onglet Compte Utilisateur */}
                {activeTab === 'account' && (
                    <div className="space-y-5 animate-in fade-in duration-200">
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl flex items-start gap-3">
                            <UserPlus className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                            <div>
                                <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-300">Compte de connexion client</h4>
                                <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
                                    Activez cette option pour créer automatiquement un compte de connexion pour ce client. 
                                    L'identifiant sera l'adresse email du client.
                                </p>
                            </div>
                        </div>

                        <label className="flex items-center gap-3 p-4 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all">
                            <input 
                                type="checkbox" 
                                {...register('createUserAccount')} 
                                className="w-5 h-5 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                            />
                            <div>
                                <span className="font-medium text-slate-800 dark:text-white">Créer un compte utilisateur</span>
                                <p className="text-xs text-slate-500 mt-0.5">Le client pourra se connecter à la plateforme</p>
                            </div>
                        </label>

                        {createUserAccount && (
                            <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 animate-in fade-in slide-in-from-top-2 duration-200">
                                <FormField label="Identifiant (Email)" hint="L'email du client sera utilisé comme identifiant de connexion">
                                    <Input 
                                        type="email" 
                                        value={clientEmail || ''} 
                                        disabled 
                                        className="bg-slate-100 dark:bg-slate-700 cursor-not-allowed"
                                    />
                                </FormField>
                                
                                <FormField label="Mot de passe par défaut" hint="Le client devra changer ce mot de passe à sa première connexion">
                                    <Input 
                                        {...register('defaultPassword')} 
                                        type="text" 
                                        className="font-mono"
                                        placeholder="Minimum 8 caractères"
                                    />
                                </FormField>

                                {!clientEmail && (
                                    <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                                        <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                        <p className="text-xs text-amber-700 dark:text-amber-300">
                                            Veuillez d'abord renseigner l'email du client dans l'onglet Contacts
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {initialData?.userAccountCreated && (
                            <div className="flex items-center gap-2 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
                                <Key className="w-4 h-4 text-green-600 dark:text-green-400" />
                                <p className="text-sm text-green-700 dark:text-green-300">
                                    Un compte utilisateur a déjà été créé pour ce client
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </form>
    );
});
