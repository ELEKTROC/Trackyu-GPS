import React, { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  User,
  Settings,
  Shield,
  Users,
  FileText,
  Lock,
  Upload,
  Plus,
  Trash2,
  Download,
  GitBranch,
  Eye,
  EyeOff,
  Key,
  Pencil,
} from 'lucide-react';
import { FormField, FormSection, FormGrid, Input, Select, Textarea } from '../../../../components/form';
import { useToast } from '../../../../contexts/ToastContext';
import { UserFullSchema, type UserFormData } from '../../../../schemas/userFormSchema';
import { SubUserForm } from './SubUserForm';
import type { SubUserFormData } from '../../../../schemas/subUserSchema';
import { Modal } from '../../../../components/Modal';

interface ResellerOption {
  id: string;
  name: string;
}

interface BranchOption {
  id: string;
  nom: string;
  ville?: string;
  responsable?: string;
  statut?: string;
  clientId?: string;
}

interface VehicleOption {
  id: string;
  name: string;
  plate?: string;
  clientId?: string;
  branchId?: string;
}

interface ClientOption {
  id: string;
  name: string;
  resellerId?: string;
}

interface DocumentItem {
  name: string;
  type: string;
  date: string;
  size: string;
}

interface UserFormProps {
  initialData?: Partial<UserFormData> & { id?: string };
  onFormSubmit: (data: UserFormData) => void | Promise<void>;
  resellers?: ResellerOption[];
  branches?: BranchOption[];
  vehicles?: VehicleOption[];
  clients?: ClientOption[];
}

export const UserForm = React.forwardRef<HTMLFormElement, UserFormProps>(
  ({ initialData, onFormSubmit, resellers, branches, vehicles = [], clients = [] }, ref) => {
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState<number>(0);
    const [subUsersList, setSubUsersList] = useState<Partial<SubUserFormData>[]>(
      (initialData?.subUsers as unknown as Partial<SubUserFormData>[]) || []
    );
    const [documentsList, setDocumentsList] = useState<DocumentItem[]>(initialData?.documents || []);
    const [showPassword, setShowPassword] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Sub-account modal state
    const [isSubModalOpen, setIsSubModalOpen] = useState(false);
    const [editingSubUser, setEditingSubUser] = useState<Partial<SubUserFormData> | null>(null);
    const [editingSubUserIndex, setEditingSubUserIndex] = useState<number | null>(null);
    const subFormRef = useRef<HTMLFormElement>(null);

    // clientId of the parent user — pre-fill sub-accounts
    const parentClientId = initialData?.id || initialData?.clientId || '';

    const isEditMode = !!initialData?.email;

    const openAddSubUser = () => {
      setEditingSubUser(null);
      setEditingSubUserIndex(null);
      setIsSubModalOpen(true);
    };

    const openEditSubUser = (subUser: Partial<SubUserFormData>, index: number) => {
      setEditingSubUser(subUser);
      setEditingSubUserIndex(index);
      setIsSubModalOpen(true);
    };

    const handleSubUserSave = (data: SubUserFormData) => {
      const entry = { ...data, clientId: data.clientId || parentClientId };
      if (editingSubUserIndex !== null) {
        const updated = [...subUsersList];
        updated[editingSubUserIndex] = entry;
        setSubUsersList(updated);
        setValue('subUsers', updated as UserFormData['subUsers']);
      } else {
        const updated = [...subUsersList, entry];
        setSubUsersList(updated);
        setValue('subUsers', updated as UserFormData['subUsers']);
      }
      setIsSubModalOpen(false);
      setEditingSubUser(null);
      setEditingSubUserIndex(null);
    };

    const {
      register,
      handleSubmit,
      setValue,
      watch,
      formState: { errors, isDirty },
    } = useForm<UserFormData>({
      resolver: zodResolver(UserFullSchema),
      defaultValues: {
        language: 'fr',
        timezone: 'UTC+1',
        theme: 'system',
        notifications: { email: true, sms: false, push: true },
        role: 'CLIENT',
        accessLevel: 'Read',
        mustChangePassword: true,
        isActive: true,
        password: isEditMode ? undefined : '',
        ...initialData,
      },
    });

    const tabs = [
      { id: 0, label: 'Personnel', icon: User },
      { id: 1, label: 'Sécurité', icon: Key },
      { id: 2, label: 'Paramètres', icon: Settings },
      { id: 3, label: 'Permissions', icon: Shield },
      { id: 4, label: 'Sous-comptes', icon: Users },
      { id: 5, label: 'Documents', icon: FileText },
      { id: 6, label: 'Branches', icon: GitBranch },
    ];

    const handleRemoveSubUser = (index: number) => {
      const updated = subUsersList.filter((_, i) => i !== index);
      setSubUsersList(updated);
      setValue('subUsers', updated as UserFormData['subUsers']);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        const newDoc = {
          name: file.name,
          type: file.type,
          date: new Date().toLocaleDateString('fr-FR'),
          size: `${(file.size / 1024).toFixed(2)} KB`,
        };
        const updatedDocs = [...documentsList, newDoc];
        setDocumentsList(updatedDocs);
        setValue('documents', updatedDocs);
      }
    };

    const handleRemoveDocument = (index: number) => {
      const updatedDocs = documentsList.filter((_, i) => i !== index);
      setDocumentsList(updatedDocs);
      setValue('documents', updatedDocs);
    };

    const onSubmit = async (data: UserFormData) => {
      if (isSaving) return;
      setIsSaving(true);
      try {
        await onFormSubmit({
          ...data,
          subUsers: subUsersList,
          documents: documentsList,
        });
      } finally {
        setIsSaving(false);
      }
    };

    const onError = (errors: Record<string, unknown>) => {
      const errorKeys = Object.keys(errors);
      if (errorKeys.length > 0) {
        const fieldToTab: Record<string, number> = {
          // Tab 0: Personnel
          firstName: 0,
          lastName: 0,
          email: 0,
          phone: 0,
          address: 0,
          companyName: 0,
          resellerId: 0,
          // Tab 1: Sécurité
          password: 1,
          mustChangePassword: 1,
          isActive: 1,
          // Tab 2: Paramètres
          language: 2,
          timezone: 2,
          theme: 2,
          notifications: 2,
          // Tab 3: Permissions
          role: 3,
          accessLevel: 3,
          allowedVehicles: 3,
          allowedGroups: 3,
          allowedModules: 3,
        };
        const firstErrorField = errorKeys[0];
        const targetTab = fieldToTab[firstErrorField];
        if (targetTab !== undefined && targetTab !== activeTab) {
          setActiveTab(targetTab);
        }
      }
    };

    return (
      <>
        <form ref={ref} onSubmit={handleSubmit(onSubmit, onError)} className="flex flex-col h-[600px]">
          {/* Tabs Header */}
          <div className="flex border-b border-[var(--border)] mb-6 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-[var(--primary)] text-[var(--primary)]'
                    : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-secondary)] dark:hover:text-slate-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar px-1">
            {/* TAB 1: PERSONAL DATA */}
            {activeTab === 0 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                <FormSection icon={User} title="Informations personnelles">
                  <FormGrid columns={2}>
                    {resellers && (
                      <div className="col-span-2">
                        <FormField
                          label="Revendeur Associé"
                          hint={isEditMode ? 'Le revendeur ne peut pas être modifié après la création.' : undefined}
                        >
                          <Select {...register('resellerId')} disabled={isEditMode}>
                            <option value="">Sélectionner un revendeur...</option>
                            {resellers.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.name}
                              </option>
                            ))}
                          </Select>
                        </FormField>
                      </div>
                    )}

                    <FormField label="Prénom" required error={errors.firstName?.message}>
                      <Input {...register('firstName')} />
                    </FormField>

                    <FormField label="Nom" required error={errors.lastName?.message}>
                      <Input {...register('lastName')} />
                    </FormField>

                    <div className="col-span-2">
                      <FormField label="Email" required error={errors.email?.message}>
                        <Input {...register('email')} type="email" />
                      </FormField>
                    </div>

                    <FormField label="Téléphone">
                      <Input {...register('phone')} type="tel" />
                    </FormField>

                    {clients.length > 0 && (
                      <FormField
                        label="Client CRM associé"
                        hint="Lie ce compte utilisateur à un tier existant (CLI-xxx)"
                      >
                        <Select
                          value={watch('clientId') || ''}
                          onChange={(e) => {
                            const selected = clients.find((c) => c.id === e.target.value);
                            setValue('clientId', e.target.value);
                            setValue('companyName', selected?.name || '');
                          }}
                        >
                          <option value="">-- Aucun --</option>
                          {clients.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </Select>
                      </FormField>
                    )}

                    <div className="col-span-2">
                      <FormField label="Adresse">
                        <Textarea {...register('address')} rows={3} />
                      </FormField>
                    </div>
                  </FormGrid>
                </FormSection>
              </div>
            )}

            {/* TAB 2: SECURITY (Nouveau) */}
            {activeTab === 1 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-xl flex items-start gap-3">
                  <div className="p-1.5 bg-amber-100 dark:bg-amber-800 rounded-lg">
                    <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-amber-800 dark:text-amber-300">Sécurité du compte</h4>
                    <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                      L'identifiant de connexion est l'adresse email du client.
                      {!isEditMode && ' Définissez un mot de passe initial.'}
                    </p>
                  </div>
                </div>

                <FormSection icon={Key} title="Authentification">
                  <FormGrid columns={1}>
                    <FormField label="Identifiant (Email)">
                      <Input
                        type="email"
                        value={watch('email') || ''}
                        disabled
                        className="bg-[var(--bg-elevated)] cursor-not-allowed"
                      />
                    </FormField>

                    {!isEditMode && (
                      <FormField label="Mot de passe initial" required error={errors.password?.message}>
                        <div className="relative">
                          <Input
                            {...register('password')}
                            type={showPassword ? 'text' : 'password'}
                            className="pr-10 font-mono"
                            placeholder="Minimum 8 caractères"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </FormField>
                    )}

                    <label className="flex items-center gap-3 p-3 border border-[var(--border)] rounded-xl cursor-pointer tr-hover transition-colors">
                      <input
                        type="checkbox"
                        {...register('mustChangePassword')}
                        className="w-4 h-4 rounded-lg border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
                      />
                      <div>
                        <span className="text-sm font-medium text-[var(--text-primary)]">
                          Forcer le changement de mot de passe
                        </span>
                        <p className="text-xs text-[var(--text-secondary)]">
                          Le client devra changer son mot de passe à la première connexion
                        </p>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 border border-[var(--border)] rounded-xl cursor-pointer tr-hover transition-colors">
                      <input
                        type="checkbox"
                        {...register('isActive')}
                        className="w-4 h-4 rounded-lg border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
                      />
                      <div>
                        <span className="text-sm font-medium text-[var(--text-primary)]">Compte actif</span>
                        <p className="text-xs text-[var(--text-secondary)]">
                          Désactiver pour bloquer l'accès sans supprimer le compte
                        </p>
                      </div>
                    </label>

                    {isEditMode && (
                      <div className="p-4 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border)]">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
                              Dernière connexion
                            </p>
                            <p className="text-sm text-[var(--text-primary)]">
                              {initialData?.lastLogin || 'Jamais connecté'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
                              Erreurs MDP
                            </p>
                            <p className="text-sm text-[var(--text-primary)]">{initialData?.passwordErrors || 0}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => showToast('Email de réinitialisation envoyé !', 'success')}
                            className="px-3 py-2 text-xs font-medium bg-[var(--primary-dim)] text-[var(--primary)] hover:bg-[var(--primary-dim)] rounded-xl transition-colors"
                          >
                            Réinitialiser MDP
                          </button>
                        </div>
                      </div>
                    )}
                  </FormGrid>
                </FormSection>
              </div>
            )}

            {/* TAB 3: USER SETTINGS */}
            {activeTab === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <FormSection icon={Settings} title="Préférences Régionales">
                  <FormGrid columns={2}>
                    <FormField label="Langue">
                      <Select {...register('language')}>
                        <option value="fr">Français</option>
                        <option value="en">English</option>
                        <option value="es">Español</option>
                      </Select>
                    </FormField>

                    <FormField label="Fuseau Horaire">
                      <Select {...register('timezone')}>
                        <option value="UTC+1">Paris (UTC+1)</option>
                        <option value="UTC">Londres (UTC)</option>
                        <option value="UTC-5">New York (UTC-5)</option>
                      </Select>
                    </FormField>
                  </FormGrid>
                </FormSection>

                <div className="space-y-4">
                  <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide flex items-center gap-2">
                    Interface
                  </h3>
                  <FormField label="Thème">
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-[var(--bg-elevated)] rounded-lg transition-colors">
                        <input type="radio" value="light" {...register('theme')} className="text-[var(--primary)]" />
                        <span className="text-sm">Clair</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-[var(--bg-elevated)] rounded-lg transition-colors">
                        <input type="radio" value="dark" {...register('theme')} className="text-[var(--primary)]" />
                        <span className="text-sm">Sombre</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-[var(--bg-elevated)] rounded-lg transition-colors">
                        <input type="radio" value="system" {...register('theme')} className="text-[var(--primary)]" />
                        <span className="text-sm">Système</span>
                      </label>
                    </div>
                  </FormField>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
                    Notifications
                  </h3>
                  <div className="flex flex-col gap-3">
                    <label className="flex items-center justify-between p-3 border border-[var(--border)] rounded-xl tr-hover transition-colors cursor-pointer">
                      <span className="text-sm font-medium">Notifications Email</span>
                      <input
                        type="checkbox"
                        {...register('notifications.email')}
                        className="rounded-lg text-[var(--primary)] focus:ring-[var(--primary)]"
                      />
                    </label>
                    <label className="flex items-center justify-between p-3 border border-[var(--border)] rounded-xl tr-hover transition-colors cursor-pointer">
                      <span className="text-sm font-medium">Notifications SMS</span>
                      <input
                        type="checkbox"
                        {...register('notifications.sms')}
                        className="rounded-lg text-[var(--primary)] focus:ring-[var(--primary)]"
                      />
                    </label>
                    <label className="flex items-center justify-between p-3 border border-[var(--border)] rounded-xl tr-hover transition-colors cursor-pointer">
                      <span className="text-sm font-medium">Notifications Push (Mobile/Web)</span>
                      <input
                        type="checkbox"
                        {...register('notifications.push')}
                        className="rounded-lg text-[var(--primary)] focus:ring-[var(--primary)]"
                      />
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: PERMISSIONS */}
            {activeTab === 3 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="p-4 bg-[var(--primary-dim)] border border-[var(--border)] rounded-xl flex items-start gap-3">
                  <div className="p-1.5 bg-[var(--primary-dim)] rounded-lg shrink-0">
                    <Shield className="w-4 h-4 text-[var(--primary)]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">Accès à l'application client</p>
                    <p className="text-xs text-[var(--primary)] mt-0.5">
                      Ces permissions définissent les menus visibles dans l'application mobile / web du client.
                    </p>
                  </div>
                </div>

                <FormSection icon={Shield} title="Menus accessibles">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                      {
                        value: 'VIEW_DASHBOARD',
                        label: 'Tableau de bord',
                        description: "Vue d'ensemble et KPI",
                        locked: true,
                      },
                      { value: 'VIEW_MAP', label: 'Carte', description: 'Localisation temps réel', locked: true },
                      { value: 'VIEW_FLEET', label: 'Flotte', description: 'Liste des véhicules', locked: true },
                      { value: 'VIEW_REPORTS', label: 'Rapports', description: 'Historique et exports', locked: true },
                      { value: 'VIEW_ALERTS', label: 'Alertes', description: 'Notifications et alertes' },
                      { value: 'VIEW_TECH', label: 'Interventions', description: 'Suivi des maintenances' },
                    ].map(({ value, label, description, locked }) => {
                      const checked = (watch('allowedModules') || []).includes(value) || locked;
                      return (
                        <label
                          key={value}
                          className={`flex items-start gap-3 p-3 border rounded-xl transition-colors cursor-pointer ${
                            locked
                              ? 'border-[var(--border)] bg-[var(--primary-dim)]/50 dark:bg-[var(--primary-dim)]/10 cursor-not-allowed'
                              : checked
                                ? 'border-[var(--primary)] dark:border-[var(--primary)] bg-[var(--primary-dim)]'
                                : 'border-[var(--border)] tr-hover'
                          }`}
                        >
                          <input
                            type="checkbox"
                            value={value}
                            {...register('allowedModules')}
                            defaultChecked={locked}
                            disabled={locked}
                            className="mt-0.5 rounded text-[var(--primary)] disabled:opacity-60"
                          />
                          <div>
                            <p className="text-sm font-medium text-[var(--text-primary)]">
                              {label}
                              {locked && (
                                <span className="ml-2 text-[10px] text-[var(--primary)] font-normal">par défaut</span>
                              )}
                            </p>
                            <p className="text-xs text-[var(--text-secondary)]">{description}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </FormSection>
              </div>
            )}

            {/* TAB 5: SUB-USERS */}
            {activeTab === 4 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                {!isEditMode && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-xl text-xs text-amber-700 dark:text-amber-300">
                    Enregistrez d'abord ce compte client pour pouvoir ajouter des sous-comptes.
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={!isEditMode}
                    onClick={openAddSubUser}
                    className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-xl hover:bg-[var(--primary-light)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    Ajouter un sous-compte
                  </button>
                </div>

                <div className="border border-[var(--border)] rounded-xl overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-[var(--bg-elevated)] text-[var(--text-secondary)]">
                      <tr>
                        <th className="px-4 py-3 font-medium">Nom</th>
                        <th className="px-4 py-3 font-medium">Email</th>
                        <th className="px-4 py-3 font-medium">Rôle</th>
                        <th className="px-4 py-3 font-medium">Branche</th>
                        <th className="px-4 py-3 font-medium">Véhicules</th>
                        <th className="px-4 py-3 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {subUsersList.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-[var(--text-muted)]">
                            Aucun sous-compte créé
                          </td>
                        </tr>
                      ) : (
                        subUsersList.map((su, idx) => (
                          <tr key={idx} className="bg-[var(--bg-surface)]">
                            <td className="px-4 py-3 font-medium text-[var(--text-primary)]">{su.nom}</td>
                            <td className="px-4 py-3 text-[var(--text-secondary)]">{su.email}</td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-1 bg-[var(--bg-elevated)] rounded-lg text-xs font-medium text-[var(--text-secondary)]">
                                {su.role}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-[var(--text-secondary)] text-xs">
                              {branches?.find((b) => b.id === su.branchId)?.nom || '—'}
                            </td>
                            <td className="px-4 py-3 text-[var(--text-secondary)] text-xs">
                              {su.allVehicles ? 'Tous' : su.vehicleIds?.length ? `${su.vehicleIds.length} véh.` : '—'}
                            </td>
                            <td className="px-4 py-3 text-right flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => openEditSubUser(su, idx)}
                                className="p-1.5 text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-[var(--primary-dim)] dark:hover:bg-[var(--primary-dim)] rounded-lg transition-colors"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveSubUser(idx)}
                                className="p-1.5 text-[var(--text-muted)] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
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

            {/* TAB 6: DOCUMENTS */}
            {activeTab === 5 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="border-2 border-dashed border-[var(--border)] rounded-xl p-8 text-center tr-hover/50 transition-colors cursor-pointer relative">
                  <input
                    type="file"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={handleFileUpload}
                  />
                  <div className="p-3 bg-[var(--bg-elevated)] rounded-xl inline-block mb-3">
                    <Upload className="w-8 h-8 text-[var(--text-muted)]" />
                  </div>
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                    Cliquez pour uploader un document
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">CNI, Permis, Contrat, K-Bis (Max 5MB)</p>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {documentsList.length === 0 ? (
                    <p className="text-center text-[var(--text-muted)] text-sm py-4">Aucun document associé</p>
                  ) : (
                    documentsList.map((doc, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-4 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-[var(--primary-dim)] rounded-xl text-[var(--primary)]">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-[var(--text-primary)]">{doc.name}</p>
                            <p className="text-xs text-[var(--text-secondary)]">
                              {doc.date} • {doc.size}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="p-2 text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-[var(--primary-dim)] dark:hover:bg-[var(--primary-dim)] rounded-lg transition-colors"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveDocument(idx)}
                            className="p-2 text-[var(--text-muted)] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB 7: BRANCHES */}
            {activeTab === 6 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="p-4 bg-[var(--primary-dim)] border border-[var(--border)] rounded-xl flex items-start gap-3">
                  <div className="p-1.5 bg-[var(--primary-dim)] rounded-lg">
                    <GitBranch className="w-4 h-4 text-[var(--primary)]" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-[var(--primary)] dark:text-[var(--primary)]">
                      Gestion des Branches
                    </h4>
                    <p className="text-xs text-[var(--primary)] mt-1">
                      Les branches permettent de regrouper les véhicules (ex: Motos, Voitures, etc.). Une branche par
                      défaut est créée automatiquement au nom de l'utilisateur.
                    </p>
                  </div>
                </div>

                <div className="border border-[var(--border)] rounded-xl overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-[var(--bg-elevated)] text-[var(--text-secondary)]">
                      <tr>
                        <th className="px-4 py-3 font-medium">Nom</th>
                        <th className="px-4 py-3 font-medium">Ville</th>
                        <th className="px-4 py-3 font-medium">Responsable</th>
                        <th className="px-4 py-3 font-medium">Statut</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {!branches || branches.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-[var(--text-muted)]">
                            Aucune branche disponible
                          </td>
                        </tr>
                      ) : (
                        branches.map((branch, idx) => (
                          <tr key={idx} className="bg-[var(--bg-surface)]">
                            <td className="px-4 py-3 font-medium text-[var(--text-primary)]">{branch.nom}</td>
                            <td className="px-4 py-3 text-[var(--text-secondary)]">{branch.ville}</td>
                            <td className="px-4 py-3 text-[var(--text-secondary)]">{branch.responsable}</td>
                            <td className="px-4 py-3">
                              <span
                                className={`px-2 py-1 rounded-lg text-xs font-medium ${
                                  branch.statut === 'Ouvert'
                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                }`}
                              >
                                {branch.statut}
                              </span>
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

        {/* Sub-account Modal */}
        <Modal
          isOpen={isSubModalOpen}
          onClose={() => {
            setIsSubModalOpen(false);
            setEditingSubUser(null);
            setEditingSubUserIndex(null);
          }}
          title={editingSubUserIndex !== null ? 'Modifier le sous-compte' : 'Nouveau sous-compte'}
          maxWidth="max-w-2xl"
          isDirty={isDirty}
          footer={
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsSubModalOpen(false);
                  setEditingSubUser(null);
                  setEditingSubUserIndex(null);
                }}
                className="px-4 py-2 text-sm font-medium text-[var(--text-secondary)] border border-[var(--border)] rounded-xl tr-hover transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => subFormRef.current?.requestSubmit()}
                className="px-4 py-2 text-sm font-medium bg-[var(--primary)] text-white rounded-xl hover:bg-[var(--primary-light)] transition-colors"
              >
                {editingSubUserIndex !== null ? 'Mettre à jour' : 'Ajouter'}
              </button>
            </div>
          }
        >
          <SubUserForm
            ref={subFormRef}
            initialData={
              editingSubUser
                ? { ...editingSubUser, clientId: editingSubUser.clientId || parentClientId }
                : { clientId: parentClientId }
            }
            onFormSubmit={handleSubUserSave}
            hideClientSelector
            forcedClientId={parentClientId}
            clients={clients}
            branches={branches as unknown as { id: string; nom?: string; name?: string }[]}
            vehicles={vehicles}
          />
        </Modal>
      </>
    );
  }
);

UserForm.displayName = 'UserForm';
