/**
 * ResellerFormV2 - Formulaire de création/édition de revendeur amélioré
 * 
 * Onglets:
 * 1. Société - Infos de base, coordonnées, légal
 * 2. Administrateur - Compte admin principal du tenant
 * 3. Configuration - Quotas, modules, limites
 * 4. Marque Blanche - Logo, couleurs, domaine
 */

import React, { useState, forwardRef, useImperativeHandle } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Building2, User, Shield, Palette, 
  Mail, Phone, MapPin, Globe, Lock, 
  Upload, Check, AlertTriangle, Eye, EyeOff,
  Image, Zap, Info
} from 'lucide-react';
import { Tier } from '../../../../types';
import { useToast } from '../../../../contexts/ToastContext';
import { TOAST } from '../../../../constants/toastMessages';

// Schema de validation
const ResellerSchemaV2 = z.object({
  // Tab 1: Société
  companyName: z.string().min(2, "Le nom de l'entreprise est requis (min 2 caractères)"),
  email: z.string().email("Email invalide"),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().default('Sénégal'),
  website: z.string().url("URL invalide").optional().or(z.literal('')),
  activity: z.string().optional(),
  rccm: z.string().optional(),
  ccNumber: z.string().optional(),
  managerName: z.string().optional(),
  fiscalYear: z.string().optional(),

  // Tab 2: Administrateur
  adminName: z.string().min(2, "Le nom de l'administrateur est requis"),
  adminEmail: z.string().email("Email administrateur invalide"),
  adminPhone: z.string().optional(),
  password: z.string().min(8, "Le mot de passe doit faire au moins 8 caractères").optional(),

  // Tab 3: Configuration
  maxVehicles: z.number().min(1).default(100),
  maxUsers: z.number().min(1).default(10),
  maxClients: z.number().min(1).default(50),
  modules: z.array(z.string()).default(['fleet', 'reports', 'alerts']),
  apiAccess: z.boolean().default(false),
  
  // Tab 4: Marque Blanche
  logo: z.string().optional(),
  primaryColor: z.string().default('#3B82F6'),
  secondaryColor: z.string().default('#1E40AF'),
  customDomain: z.string().optional(),
});

type ResellerFormDataV2 = z.infer<typeof ResellerSchemaV2>;

interface ResellerFormV2Props {
  initialData?: Tier | null;
  onFormSubmit: (data: ResellerFormDataV2) => void;
  isEdit?: boolean;
}

// Modules disponibles
const AVAILABLE_MODULES = [
  { id: 'fleet', label: 'Gestion de Flotte', description: 'Véhicules, conducteurs, groupes' },
  { id: 'map', label: 'Carte & Tracking', description: 'Suivi temps réel, historique' },
  { id: 'reports', label: 'Rapports', description: 'Rapports personnalisés, exports' },
  { id: 'alerts', label: 'Alertes', description: 'Alertes personnalisées, notifications' },
  { id: 'crm', label: 'CRM', description: 'Leads, devis, clients' },
  { id: 'finance', label: 'Finance', description: 'Factures, paiements, comptabilité' },
  { id: 'tech', label: 'Interventions', description: 'Techniciens, planning, stock' },
  { id: 'support', label: 'Support', description: 'Tickets, FAQ, chat' },
  { id: 'api', label: 'API Access', description: 'Webhooks, intégrations tierces' },
];

export const ResellerFormV2 = forwardRef<HTMLFormElement, ResellerFormV2Props>(
  ({ initialData, onFormSubmit, isEdit = false }, ref) => {
    const [activeTab, setActiveTab] = useState(0);
    const [showPassword, setShowPassword] = useState(false);
    const [logoPreview, setLogoPreview] = useState<string | null>(initialData?.resellerData?.logo || null);
    const { showToast } = useToast();

    // Préparer les valeurs initiales depuis le Tier
    const rd = initialData?.resellerData as any;
    const defaultValues: Partial<ResellerFormDataV2> = initialData ? {
      companyName: initialData.name,
      email: initialData.email,
      phone: initialData.phone,
      address: initialData.address,
      city: initialData.city,
      country: initialData.country || 'Sénégal',
      website: rd?.domain,
      activity: rd?.activity,
      rccm: rd?.rccm,
      ccNumber: rd?.ccNumber,
      managerName: rd?.managerName,
      fiscalYear: rd?.fiscalYear,
      adminName: rd?.managerName || '',
      adminEmail: initialData.email,
      maxVehicles: rd?.maxVehicles ?? rd?.quotas?.maxVehicles ?? 100,
      maxUsers: rd?.maxUsers ?? rd?.quotas?.maxUsers ?? 10,
      maxClients: rd?.maxClients ?? rd?.quotas?.maxClients ?? 50,
      modules: rd?.modules ?? ['fleet', 'reports', 'alerts'],
      apiAccess: rd?.apiAccess ?? false,
      primaryColor: rd?.whiteLabelConfig?.primaryColor ?? rd?.primaryColor ?? '#3B82F6',
      secondaryColor: rd?.whiteLabelConfig?.secondaryColor ?? rd?.secondaryColor ?? '#1E40AF',
      logo: rd?.logo,
    } : {
      country: 'Sénégal',
      maxVehicles: 100,
      maxUsers: 10,
      maxClients: 50,
      modules: ['fleet', 'reports', 'alerts'],
      apiAccess: false,
      primaryColor: '#3B82F6',
      secondaryColor: '#1E40AF',
    };

    const { 
      register, 
      handleSubmit, 
      setValue, 
      watch,
      formState: { errors } 
    } = useForm<ResellerFormDataV2>({
      resolver: zodResolver(ResellerSchemaV2) as any,
      defaultValues
    });

    const selectedModules = watch('modules') || [];
    const primaryColor = watch('primaryColor');

    const tabs = [
      { id: 0, label: 'Société', icon: Building2, errorFields: ['companyName', 'email', 'phone', 'address'] },
      { id: 1, label: 'Administrateur', icon: User, errorFields: ['adminName', 'adminEmail', 'password'] },
      { id: 2, label: 'Configuration', icon: Shield, errorFields: ['maxVehicles', 'maxUsers'] },
      { id: 3, label: 'Marque Blanche', icon: Palette, errorFields: ['logo', 'primaryColor'] },
    ];

    const hasTabError = (tabIndex: number) => {
      const tab = tabs[tabIndex];
      return tab.errorFields.some(field => errors[field as keyof typeof errors]);
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        if (file.size > 500 * 1024) {
          showToast('Le logo doit faire moins de 500KB', 'error');
          return;
        }
        
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          setLogoPreview(base64);
          setValue('logo', base64);
        };
        reader.readAsDataURL(file);
      }
    };

    const toggleModule = (moduleId: string) => {
      const current = selectedModules;
      const updated = current.includes(moduleId)
        ? current.filter(m => m !== moduleId)
        : [...current, moduleId];
      setValue('modules', updated);
    };

    const onSubmit = (data: ResellerFormDataV2) => {
      onFormSubmit(data);
    };

    const onError = (formErrors: Record<string, unknown>) => {
      // Trouver le premier onglet avec erreur
      for (let i = 0; i < tabs.length; i++) {
        if (hasTabError(i)) {
          setActiveTab(i);
          break;
        }
      }
      showToast(TOAST.VALIDATION.FORM_ERRORS, 'error');
    };

    return (
      <form ref={ref} onSubmit={handleSubmit(onSubmit, onError)} className="flex flex-col h-[550px]">
        {/* Tabs Header */}
        <div className="flex border-b border-slate-200 dark:border-slate-700 mb-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 relative ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {hasTabError(tab.id) && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-1">
          
          {/* TAB 1: SOCIÉTÉ */}
          {activeTab === 0 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Nom société */}
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    Nom de la Société <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      {...register('companyName')} 
                      type="text" 
                      className={`w-full pl-9 p-2 border rounded-lg bg-slate-50 dark:bg-slate-800 dark:border-slate-700 ${
                        errors.companyName ? 'border-red-500' : ''
                      }`}
                      placeholder="Ex: TrackYu Sénégal" 
                    />
                  </div>
                  {errors.companyName && (
                    <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {errors.companyName.message}
                    </p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    Email Contact <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      {...register('email')} 
                      type="email" 
                      className={`w-full pl-9 p-2 border rounded-lg bg-slate-50 dark:bg-slate-800 dark:border-slate-700 ${
                        errors.email ? 'border-red-500' : ''
                      }`}
                      placeholder="contact@entreprise.sn" 
                    />
                  </div>
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
                </div>

                {/* Téléphone */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Téléphone</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      {...register('phone')} 
                      type="text" 
                      className="w-full pl-9 p-2 border rounded-lg bg-slate-50 dark:bg-slate-800 dark:border-slate-700"
                      placeholder="+221 77 123 45 67" 
                    />
                  </div>
                </div>

                {/* Activité */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Activité</label>
                  <input 
                    {...register('activity')} 
                    type="text" 
                    className="w-full p-2 border rounded-lg bg-slate-50 dark:bg-slate-800 dark:border-slate-700"
                    placeholder="Géolocalisation et tracking" 
                  />
                </div>

                {/* Responsable */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nom du Responsable</label>
                  <input 
                    {...register('managerName')} 
                    type="text" 
                    className="w-full p-2 border rounded-lg bg-slate-50 dark:bg-slate-800 dark:border-slate-700"
                    placeholder="M. Diallo" 
                  />
                </div>

                {/* RCCM */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">RCCM</label>
                  <input 
                    {...register('rccm')} 
                    type="text" 
                    className="w-full p-2 border rounded-lg bg-slate-50 dark:bg-slate-800 dark:border-slate-700"
                    placeholder="SN-DKR-2024-B-12345" 
                  />
                </div>

                {/* N° CC */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">N° Contribuable (CC)</label>
                  <input 
                    {...register('ccNumber')} 
                    type="text" 
                    className="w-full p-2 border rounded-lg bg-slate-50 dark:bg-slate-800 dark:border-slate-700"
                    placeholder="00012345B" 
                  />
                </div>

                {/* Adresse */}
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Adresse</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <textarea 
                      {...register('address')} 
                      className="w-full pl-9 p-2 border rounded-lg bg-slate-50 dark:bg-slate-800 dark:border-slate-700 min-h-[70px]"
                      placeholder="123 Avenue Cheikh Anta Diop, Dakar" 
                    />
                  </div>
                </div>

                {/* Ville */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Ville</label>
                  <input 
                    {...register('city')} 
                    type="text" 
                    className="w-full p-2 border rounded-lg bg-slate-50 dark:bg-slate-800 dark:border-slate-700"
                    placeholder="Abidjan" 
                  />
                </div>

                {/* Pays */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Pays</label>
                  <select 
                    {...register('country')} 
                    className="w-full p-2 border rounded-lg bg-slate-50 dark:bg-slate-800 dark:border-slate-700"
                  >
                    <option value="Côte d'Ivoire">🇨🇮 Côte d'Ivoire</option>
                    <option value="Sénégal">🇸🇳 Sénégal</option>
                    <option value="Mali">🇲🇱 Mali</option>
                    <option value="Burkina Faso">🇧🇫 Burkina Faso</option>
                    <option value="Guinée">🇬🇳 Guinée</option>
                    <option value="Cameroun">🇨🇲 Cameroun</option>
                    <option value="Togo">🇹🇬 Togo</option>
                    <option value="Bénin">🇧🇯 Bénin</option>
                    <option value="Autre">🌍 Autre</option>
                  </select>
                </div>

                {/* Site Web */}
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Site Web</label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      {...register('website')} 
                      type="url" 
                      className="w-full pl-9 p-2 border rounded-lg bg-slate-50 dark:bg-slate-800 dark:border-slate-700"
                      placeholder="https://www.entreprise.sn" 
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ADMINISTRATEUR */}
          {activeTab === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800 mb-4">
                <p className="text-sm text-blue-800 dark:text-blue-200 flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  Ce compte sera l'administrateur principal du tenant. Il aura tous les droits sur son espace.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Nom Admin */}
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    Nom Complet <span className="text-red-500">*</span>
                  </label>
                  <input 
                    {...register('adminName')} 
                    type="text" 
                    className={`w-full p-2 border rounded-lg bg-slate-50 dark:bg-slate-800 dark:border-slate-700 ${
                      errors.adminName ? 'border-red-500' : ''
                    }`}
                    placeholder="Prénom Nom" 
                  />
                  {errors.adminName && <p className="text-red-500 text-xs mt-1">{errors.adminName.message}</p>}
                </div>

                {/* Email Admin */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    Email de Connexion <span className="text-red-500">*</span>
                  </label>
                  <input 
                    {...register('adminEmail')} 
                    type="email" 
                    className={`w-full p-2 border rounded-lg bg-slate-50 dark:bg-slate-800 dark:border-slate-700 ${
                      errors.adminEmail ? 'border-red-500' : ''
                    }`}
                    placeholder="admin@entreprise.sn" 
                  />
                  {errors.adminEmail && <p className="text-red-500 text-xs mt-1">{errors.adminEmail.message}</p>}
                </div>

                {/* Téléphone Admin */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Téléphone Mobile</label>
                  <input 
                    {...register('adminPhone')} 
                    type="text" 
                    className="w-full p-2 border rounded-lg bg-slate-50 dark:bg-slate-800 dark:border-slate-700"
                    placeholder="+221 77 000 00 00" 
                  />
                </div>

                {/* Rôle (fixe) */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Rôle</label>
                  <input 
                    type="text" 
                    value="Administrateur Tenant" 
                    disabled 
                    className="w-full p-2 border rounded-lg bg-slate-100 dark:bg-slate-800 dark:border-slate-700 text-slate-500 cursor-not-allowed" 
                  />
                </div>

                {/* Mot de passe */}
                {!isEdit && (
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                      Mot de passe initial <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        {...register('password')} 
                        type={showPassword ? 'text' : 'password'}
                        className={`w-full pl-9 pr-10 p-2 border rounded-lg bg-slate-50 dark:bg-slate-800 dark:border-slate-700 ${
                          errors.password ? 'border-red-500' : ''
                        }`}
                        placeholder="Minimum 8 caractères" 
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
                    <p className="text-xs text-slate-500 mt-1">
                      Un email de bienvenue sera envoyé avec les instructions de connexion.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: CONFIGURATION */}
          {activeTab === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              {/* Quotas */}
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  Quotas & Limites
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Max Véhicules</label>
                    <input 
                      {...register('maxVehicles', { valueAsNumber: true })} 
                      type="number" 
                      min={1}
                      className="w-full p-2 border rounded-lg bg-slate-50 dark:bg-slate-800 dark:border-slate-700"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Max Utilisateurs</label>
                    <input 
                      {...register('maxUsers', { valueAsNumber: true })} 
                      type="number" 
                      min={1}
                      className="w-full p-2 border rounded-lg bg-slate-50 dark:bg-slate-800 dark:border-slate-700"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Max Clients</label>
                    <input 
                      {...register('maxClients', { valueAsNumber: true })} 
                      type="number" 
                      min={1}
                      className="w-full p-2 border rounded-lg bg-slate-50 dark:bg-slate-800 dark:border-slate-700"
                    />
                  </div>
                </div>
              </div>

              {/* Modules */}
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-3">Modules Autorisés</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {AVAILABLE_MODULES.map((mod) => (
                    <label 
                      key={mod.id} 
                      className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedModules.includes(mod.id)
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <input 
                        type="checkbox" 
                        checked={selectedModules.includes(mod.id)}
                        onChange={() => toggleModule(mod.id)}
                        className="mt-1 rounded text-blue-600 focus:ring-blue-500" 
                      />
                      <div>
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{mod.label}</span>
                        <p className="text-xs text-slate-500">{mod.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: MARQUE BLANCHE */}
          {activeTab === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              {/* Logo */}
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                  <Image className="w-4 h-4 text-purple-500" />
                  Logo
                </h3>
                <div className="flex items-center gap-4">
                  <div className={`w-24 h-24 rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden ${
                    logoPreview ? 'border-transparent' : 'border-slate-300 dark:border-slate-600'
                  }`}>
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo preview" className="w-full h-full object-contain" />
                    ) : (
                      <Upload className="w-8 h-8 text-slate-400" />
                    )}
                  </div>
                  <div>
                    <label className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 cursor-pointer">
                      <Upload className="w-4 h-4" />
                      Choisir un logo
                      <input 
                        type="file" 
                        accept="image/png,image/jpeg,image/svg+xml"
                        onChange={handleLogoUpload}
                        className="hidden" 
                      />
                    </label>
                    <p className="text-xs text-slate-500 mt-2">PNG, JPG ou SVG. Max 500KB.</p>
                  </div>
                </div>
              </div>

              {/* Couleurs */}
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                  <Palette className="w-4 h-4 text-pink-500" />
                  Couleurs de marque
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Couleur Principale</label>
                    <div className="flex items-center gap-2">
                      <input 
                        {...register('primaryColor')} 
                        type="color" 
                        className="w-10 h-10 rounded-lg border-2 border-slate-200 cursor-pointer"
                      />
                      <input 
                        {...register('primaryColor')} 
                        type="text" 
                        className="flex-1 p-2 border rounded-lg bg-slate-50 dark:bg-slate-800 dark:border-slate-700 font-mono text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Couleur Secondaire</label>
                    <div className="flex items-center gap-2">
                      <input 
                        {...register('secondaryColor')} 
                        type="color" 
                        className="w-10 h-10 rounded-lg border-2 border-slate-200 cursor-pointer"
                      />
                      <input 
                        {...register('secondaryColor')} 
                        type="text" 
                        className="flex-1 p-2 border rounded-lg bg-slate-50 dark:bg-slate-800 dark:border-slate-700 font-mono text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-3">Aperçu</h3>
                <div 
                  className="p-4 rounded-xl text-white"
                  style={{ background: `linear-gradient(135deg, ${primaryColor}, ${watch('secondaryColor')})` }}
                >
                  <div className="flex items-center gap-3">
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo" className="w-10 h-10 rounded-lg bg-white p-1" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                        <Building2 className="w-6 h-6" />
                      </div>
                    )}
                    <div>
                      <p className="font-bold">{watch('companyName') || 'Nom de la société'}</p>
                      <p className="text-sm opacity-80">Plateforme de tracking GPS</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Domaine personnalisé */}
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-green-500" />
                  Domaine Personnalisé
                </h3>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    {...register('customDomain')} 
                    type="text" 
                    className="w-full pl-9 p-2 border rounded-lg bg-slate-50 dark:bg-slate-800 dark:border-slate-700"
                    placeholder="tracking.votredomaine.sn" 
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Optionnel. Configurez un sous-domaine pour accéder à la plateforme.
                </p>
              </div>
            </div>
          )}
        </div>
      </form>
    );
  }
);

ResellerFormV2.displayName = 'ResellerFormV2';

export default ResellerFormV2;
