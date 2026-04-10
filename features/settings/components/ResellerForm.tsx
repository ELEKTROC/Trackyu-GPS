import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
    Building2, User, Shield, Settings, Users, 
    Lock, 
    MessageSquare, Share2, Plus, Trash2, MapPin, Mail
} from 'lucide-react';
import { logger } from '../../../utils/logger';
import { FormField, FormSection, FormGrid, Input, Select, Textarea } from '../../../components/form';

// --- SCHEMAS ---
// We'll define a comprehensive schema for the reseller
const ResellerFullSchema = z.object({
    // Tab 1: Company Info
    companyName: z.string().min(2, "Le nom de l'entreprise est requis"),
    address: z.string().optional(),
    phone: z.string().optional(),
    website: z.string().url().optional().or(z.literal('')),
    email: z.string().email("Email invalide"),

    // New Fields
    activity: z.string().optional(),
    rccm: z.string().optional(),
    ccNumber: z.string().optional(),
    managerName: z.string().optional(),
    fiscalYear: z.string().optional(),

    // Tab 2: Admin User
    adminName: z.string().min(2, "Le nom de l'administrateur est requis"),
    adminEmail: z.string().email("Email administrateur invalide"),
    adminPhone: z.string().optional(),
    password: z.string().min(8, "Le mot de passe doit faire au moins 8 caractères").optional(), // Optional for edit
    
    // Tab 3: Permissions
    modules: z.array(z.string()),
    maxVehicles: z.number().min(1),
    maxUsers: z.number().min(1),

    // Tab 4: Integrations
    googleMapsKey: z.string().optional(),
    smtpHost: z.string().optional(),
    smtpPort: z.string().optional(),
    smtpUser: z.string().optional(),
    smtpPass: z.string().optional(),
    smsProvider: z.string().optional(),
    smsApiKey: z.string().optional(),

    // Tab 5: Staff (Managed separately in UI, but part of data)
    staff: z.array(z.object({
        name: z.string(),
        email: z.string(),
        role: z.string()
    })).default([])
});

type ResellerFormData = z.infer<typeof ResellerFullSchema>;

interface ResellerFormProps {
    initialData?: Partial<ResellerFormData>;
    onFormSubmit: (data: ResellerFormData) => void;
}

export const ResellerForm = React.forwardRef<HTMLFormElement, ResellerFormProps>(({ initialData, onFormSubmit }, ref) => {
    const [activeTab, setActiveTab] = useState<number>(0);
    const [staffList, setStaffList] = useState<any[]>(initialData?.staff || []);
    const [newStaff, setNewStaff] = useState({ name: '', email: '', role: 'Support Client' });

    const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<ResellerFormData>({
        resolver: zodResolver(ResellerFullSchema) as any,
        defaultValues: {
            modules: ['fleet', 'reports'],
            maxVehicles: 50,
            maxUsers: 5,
            staff: [],
            ...initialData
        }
    });

    const tabs = [
        { id: 0, label: 'Société', icon: Building2 },
        { id: 1, label: 'Admin', icon: User },
        { id: 2, label: 'Permissions', icon: Shield },
        { id: 3, label: 'Intégrations', icon: Settings },
        { id: 4, label: 'Staff', icon: Users },
    ];

    const handleAddStaff = () => {
        if (newStaff.name && newStaff.email) {
            const updatedStaff = [...staffList, { ...newStaff, id: Date.now() }];
            setStaffList(updatedStaff);
            setValue('staff', updatedStaff);
            setNewStaff({ name: '', email: '', role: 'Support Client' });
        }
    };

    const handleRemoveStaff = (index: number) => {
        const updatedStaff = staffList.filter((_, i) => i !== index);
        setStaffList(updatedStaff);
        setValue('staff', updatedStaff);
    };

    const onSubmit = (data: ResellerFormData) => {
        // Ensure staff is included
        onFormSubmit({ ...data, staff: staffList });
    };

    const onError = (errors: Record<string, unknown>) => {
        logger.debug("Validation Errors:", errors);
        // Find the first tab with an error
        const errorKeys = Object.keys(errors);
        if (errorKeys.length > 0) {
            // Map fields to tabs
            const fieldToTab: Record<string, number> = {
                companyName: 0, address: 0, phone: 0, website: 0, email: 0, activity: 0, rccm: 0, ccNumber: 0, managerName: 0, fiscalYear: 0,
                adminName: 1, adminEmail: 1, adminPhone: 1, password: 1,
                modules: 2, maxVehicles: 2, maxUsers: 2,
                googleMapsKey: 3, smtpHost: 3, smtpPort: 3, smtpUser: 3, smtpPass: 3, smsProvider: 3, smsApiKey: 3
            };
            
            const firstErrorField = errorKeys[0];
            const targetTab = fieldToTab[firstErrorField];
            
            if (targetTab !== undefined && targetTab !== activeTab) {
                setActiveTab(targetTab);
            }
            
            // Show toast or alert (assuming useToast is not available here directly, but we can use console or alert for now, or pass it as prop)
            // Ideally, we should use the toast context, but it's not imported. Let's just rely on the tab switch and field error display.
        }
    };

    return (
        <form ref={ref} onSubmit={handleSubmit(onSubmit, onError)} className="flex flex-col h-[600px]">
            {/* Tabs Header */}
            <div className="flex border-b border-slate-200 dark:border-slate-700 mb-6">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                            activeTab === tab.id
                                ? 'border-[var(--primary)] text-[var(--primary)] dark:text-[var(--primary)]'
                                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                        }`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-1">
                
                {/* TAB 1: COMPANY INFO */}
                {activeTab === 0 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                        <FormSection icon={Building2} title="Informations Société">
                            <FormGrid columns={2}>
                                <div className="col-span-2">
                                    <FormField label="Nom de la Société" required error={errors.companyName?.message}>
                                        <Input {...register('companyName')} placeholder="Ex: Global Tracking Solutions" />
                                    </FormField>
                                </div>

                                <FormField label="Activité">
                                    <Input {...register('activity')} />
                                </FormField>

                                <FormField label="Nom du Responsable">
                                    <Input {...register('managerName')} />
                                </FormField>

                                <FormField label="RCCM">
                                    <Input {...register('rccm')} />
                                </FormField>

                                <FormField label="N° CC">
                                    <Input {...register('ccNumber')} />
                                </FormField>

                                <div className="col-span-2">
                                    <FormField label="Exercice Comptable">
                                        <Input {...register('fiscalYear')} placeholder="Ex: Janvier - Décembre" />
                                    </FormField>
                                </div>

                                <FormField label="Email Contact" error={errors.email?.message}>
                                    <Input {...register('email')} type="email" placeholder="contact@societe.com" />
                                </FormField>

                                <FormField label="Téléphone">
                                    <Input {...register('phone')} placeholder="+33 1 23 45 67 89" />
                                </FormField>

                                <div className="col-span-2">
                                    <FormField label="Adresse Complète">
                                        <Textarea {...register('address')} rows={3} placeholder="123 Rue de l'Innovation, 75001 Paris" />
                                    </FormField>
                                </div>

                                <div className="col-span-2">
                                    <FormField label="Site Web">
                                        <Input {...register('website')} type="url" placeholder="https://www.societe.com" />
                                    </FormField>
                                </div>
                            </FormGrid>
                        </FormSection>
                    </div>
                )}

                {/* TAB 2: ADMIN USER */}
                {activeTab === 1 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] p-4 rounded-xl border border-[var(--primary)] dark:border-[var(--primary)] mb-4">
                            <p className="text-sm text-[var(--primary)] dark:text-[var(--primary)] flex items-center gap-2">
                                <div className="p-1 bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] rounded-lg">
                                    <User className="w-4 h-4" />
                                </div>
                                Ce compte sera l'administrateur principal du tenant revendeur.
                            </p>
                        </div>

                        <FormSection icon={User} title="Administrateur Principal">
                            <FormGrid columns={2}>
                                <div className="col-span-2">
                                    <FormField label="Nom Complet Admin" required error={errors.adminName?.message}>
                                        <Input {...register('adminName')} />
                                    </FormField>
                                </div>

                                <FormField label="Email de Connexion" required error={errors.adminEmail?.message}>
                                    <Input {...register('adminEmail')} type="email" />
                                </FormField>

                                <FormField label="Téléphone Mobile">
                                    <Input {...register('adminPhone')} />
                                </FormField>

                                <FormField label="Rôle">
                                    <Input value="Administrateur" disabled className="bg-slate-100 dark:bg-slate-700 cursor-not-allowed" />
                                </FormField>

                                <div className="col-span-2">
                                    <FormField label="Mot de passe initial" error={errors.password?.message}>
                                        <Input {...register('password')} type="password" placeholder="••••••••" />
                                    </FormField>
                                </div>
                            </FormGrid>
                        </FormSection>
                    </div>
                )}

                {/* TAB 3: PERMISSIONS */}
                {activeTab === 2 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <FormSection icon={Shield} title="Quotas & Limites">
                            <FormGrid columns={2}>
                                <FormField label="Max Véhicules">
                                    <Input {...register('maxVehicles', { valueAsNumber: true })} type="number" />
                                </FormField>
                                <FormField label="Max Utilisateurs">
                                    <Input {...register('maxUsers', { valueAsNumber: true })} type="number" />
                                </FormField>
                            </FormGrid>
                        </FormSection>

                        <FormSection icon={Shield} title="Modules Autorisés">
                            <div className="grid grid-cols-2 gap-3">
                                {['Fleet Management', 'CRM', 'Finance', 'Tech & Intervention', 'Stock', 'Reports', 'API Access'].map((mod) => (
                                    <label key={mod} className="flex items-center gap-3 p-3 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                        <input type="checkbox" value={mod.toLowerCase()} {...register('modules')} className="w-4 h-4 rounded text-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/20" />
                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{mod}</span>
                                    </label>
                                ))}
                            </div>
                        </FormSection>
                    </div>
                )}

                {/* TAB 4: INTEGRATIONS */}
                {activeTab === 3 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        
                        {/* Google Maps */}
                        <FormSection icon={MapPin} iconClassName="text-red-600" title="Google Maps Platform">
                            <FormField label="Clé API Google Maps">
                                <Input {...register('googleMapsKey')} type="password" placeholder="AIzaSy..." />
                            </FormField>
                        </FormSection>

                        {/* SMTP */}
                        <FormSection icon={Mail} iconClassName="text-[var(--primary)]" title="Serveur Mail (SMTP)">
                            <FormGrid columns={2}>
                                <div className="col-span-2">
                                    <FormField label="Hôte SMTP">
                                        <Input {...register('smtpHost')} placeholder="smtp.example.com" />
                                    </FormField>
                                </div>
                                <FormField label="Port">
                                    <Input {...register('smtpPort')} placeholder="587" />
                                </FormField>
                                <FormField label="Utilisateur">
                                    <Input {...register('smtpUser')} />
                                </FormField>
                                <div className="col-span-2">
                                    <FormField label="Mot de passe">
                                        <Input {...register('smtpPass')} type="password" />
                                    </FormField>
                                </div>
                            </FormGrid>
                        </FormSection>

                        {/* SMS & Social */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormSection icon={MessageSquare} iconClassName="text-green-600" title="SMS Gateway">
                                <div className="space-y-4">
                                    <FormField label="Fournisseur">
                                        <Select {...register('smsProvider')}>
                                            <option value="">Sélectionner...</option>
                                            <option value="twilio">Twilio</option>
                                            <option value="nexmo">Nexmo</option>
                                            <option value="ovh">OVH Telecom</option>
                                        </Select>
                                    </FormField>
                                    <FormField label="Clé API">
                                        <Input {...register('smsApiKey')} type="password" />
                                    </FormField>
                                </div>
                            </FormSection>

                            <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900">
                                <h3 className="text-sm font-semibold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                                    <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                                        <Share2 className="w-4 h-4 text-purple-600" />
                                    </div>
                                    Réseaux Sociaux
                                </h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">Configuration des liens sociaux pour les emails et le portail client.</p>
                                <button type="button" className="text-sm text-[var(--primary)] hover:text-[var(--primary)] font-medium hover:underline">Configurer les liens</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 5: STAFF */}
                {activeTab === 4 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <FormSection icon={Users} title="Ajouter un Collaborateur">
                            <div className="flex gap-3 items-end">
                                <div className="flex-1">
                                    <FormField label="Nom">
                                        <Input 
                                            value={newStaff.name}
                                            onChange={e => setNewStaff({...newStaff, name: e.target.value})}
                                            placeholder="Nom du collaborateur"
                                        />
                                    </FormField>
                                </div>
                                <div className="flex-1">
                                    <FormField label="Email">
                                        <Input 
                                            type="email"
                                            value={newStaff.email}
                                            onChange={e => setNewStaff({...newStaff, email: e.target.value})}
                                            placeholder="email@revendeur.com"
                                        />
                                    </FormField>
                                </div>
                                <div className="w-36">
                                    <FormField label="Rôle">
                                        <Select
                                            value={newStaff.role}
                                            onChange={e => setNewStaff({...newStaff, role: e.target.value})}
                                        >
                                            <option value="Administrateur">Administrateur</option>
                                            <option value="Manager">Manager</option>
                                            <option value="Commercial">Commercial</option>
                                            <option value="Technicien">Technicien</option>
                                            <option value="Support Client">Support Client</option>
                                        </Select>
                                    </FormField>
                                </div>
                                <button 
                                    type="button" 
                                    onClick={handleAddStaff}
                                    className="p-2.5 bg-[var(--primary)] text-white rounded-xl hover:bg-[var(--primary-light)] transition-colors shadow-sm"
                                >
                                    <Plus className="w-5 h-5" />
                                </button>
                            </div>
                        </FormSection>

                        <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                                    <tr>
                                        <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wide">Nom</th>
                                        <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wide">Email</th>
                                        <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wide">Rôle</th>
                                        <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wide text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {staffList.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                                                Aucun membre du staff ajouté
                                            </td>
                                        </tr>
                                    ) : (
                                        staffList.map((staff, idx) => (
                                            <tr key={idx} className="bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                                <td className="px-4 py-3 font-medium text-slate-800 dark:text-white">{staff.name}</td>
                                                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{staff.email}</td>
                                                <td className="px-4 py-3">
                                                    <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300">
                                                        {staff.role}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <button 
                                                        type="button" 
                                                        onClick={() => handleRemoveStaff(idx)}
                                                        className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </form>
    );
});
