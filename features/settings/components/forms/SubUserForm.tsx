import React, { useMemo, useEffect } from 'react';
import { useForm, type Resolver, Controller } from 'react-hook-form';
import type { Path } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { SubUserFormData } from '../../../../schemas/subUserSchema';
import { SubUserSchema, ROLE_PERMISSION_PRESETS } from '../../../../schemas/subUserSchema';
import { useAuth } from '../../../../contexts/AuthContext';
import {
  User,
  Building2,
  Car,
  Shield,
  Map,
  Bell,
  FileText,
  Wrench,
  Package,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  RefreshCw,
} from 'lucide-react';
import { FormField, FormSection, FormGrid, Input, Select, Textarea } from '../../../../components/form';

interface ResellerOption {
  id: string;
  nom?: string;
  name?: string;
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
  clientId?: string;
}

interface VehicleOption {
  id: string;
  name: string;
  plate?: string;
  clientId?: string;
  branchId?: string;
}

interface BaseFormProps {
  initialData?: Partial<SubUserFormData>;
  onFormSubmit: (data: SubUserFormData) => void | Promise<void>;
  resellers?: ResellerOption[];
  clients?: ClientOption[];
  branches?: BranchOption[];
  vehicles?: VehicleOption[];
  /** Masque le sélecteur client — clientId est géré par le parent */
  hideClientSelector?: boolean;
  /** Force la valeur de clientId (pré-remplie depuis le compte parent) */
  forcedClientId?: string;
}

// Groupes de permissions pour l'affichage
const PERMISSION_GROUPS = [
  {
    title: 'Flotte',
    icon: Car,
    permissions: [
      { key: 'canViewVehicles', label: 'Voir les véhicules' },
      { key: 'canEditVehicles', label: 'Modifier les véhicules' },
      { key: 'canViewDrivers', label: 'Voir les conducteurs' },
      { key: 'canEditDrivers', label: 'Modifier les conducteurs' },
    ],
  },
  {
    title: 'Carte & Historique',
    icon: Map,
    permissions: [
      { key: 'canViewMap', label: 'Voir la carte' },
      { key: 'canViewHistory', label: "Voir l'historique" },
    ],
  },
  {
    title: 'Alertes',
    icon: Bell,
    permissions: [
      { key: 'canViewAlerts', label: 'Voir les alertes' },
      { key: 'canConfigureAlerts', label: 'Configurer les alertes' },
    ],
  },
  {
    title: 'Rapports',
    icon: FileText,
    permissions: [
      { key: 'canViewReports', label: 'Voir les rapports' },
      { key: 'canExportReports', label: 'Exporter les rapports' },
    ],
  },
  {
    title: 'Interventions',
    icon: Wrench,
    permissions: [
      { key: 'canViewInterventions', label: 'Voir les interventions' },
      { key: 'canCreateInterventions', label: 'Créer des interventions' },
    ],
  },
  {
    title: 'Stock',
    icon: Package,
    permissions: [
      { key: 'canViewStock', label: 'Voir le stock' },
      { key: 'canManageStock', label: 'Gérer le stock' },
    ],
  },
];

export const SubUserForm = React.forwardRef<HTMLFormElement, BaseFormProps>(
  (
    {
      initialData,
      onFormSubmit,
      clients = [],
      branches = [],
      vehicles = [],
      resellers = [],
      hideClientSelector = false,
      forcedClientId,
    },
    ref
  ) => {
    const { user } = useAuth();
    const [showPermissions, setShowPermissions] = React.useState(false);
    const [showVehicles, setShowVehicles] = React.useState(false);
    const [vehicleSearch, setVehicleSearch] = React.useState('');
    const [showPassword, setShowPassword] = React.useState(false);

    const generatePassword = () => {
      const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$!';
      const pwd = Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
      setValue('password', pwd);
      setShowPassword(true);
    };

    const {
      register,
      handleSubmit,
      watch,
      setValue,
      control,
      formState: { errors },
    } = useForm<SubUserFormData>({
      resolver: zodResolver(SubUserSchema) as Resolver<SubUserFormData>,
      defaultValues: initialData || {
        nom: '',
        email: '',
        phone: '',
        clientId: forcedClientId || '',
        branchId: '',
        role: 'User',
        statut: 'Actif',
        vehicleIds: [],
        allVehicles: false,
        permissions: ROLE_PERMISSION_PRESETS.User,
        notes: '',
      },
    });

    // Sync forcedClientId into form when provided
    useEffect(() => {
      if (forcedClientId) setValue('clientId', forcedClientId);
    }, [forcedClientId, setValue]);

    const selectedClientId = watch('clientId');
    const selectedBranchId = watch('branchId');
    const selectedRole = watch('role');
    const allVehicles = watch('allVehicles');
    const selectedVehicleIds: string[] = watch('vehicleIds') || [];

    const selectedClient = clients.find((c) => c.id === selectedClientId);
    const derivedReseller = selectedClient?.resellerId
      ? resellers.find((r) => r.id === selectedClient.resellerId)
      : undefined;
    const derivedResellerLabel = derivedReseller?.name || derivedReseller?.nom || selectedClient?.resellerId || '—';

    // Filtrer les clients selon le rôle de l'utilisateur connecté
    const accessibleClients = useMemo(() => {
      if (!user) return clients;

      const normalizedRole = user.role?.toUpperCase().replace(/_/g, '');
      if (normalizedRole === 'SUPERADMIN' || normalizedRole === 'ADMIN') {
        return clients;
      }

      if (user.role === 'RESELLER') {
        return clients.filter((c) => c.resellerId === user.resellerId);
      }

      if (user.role === 'CLIENT') {
        return clients.filter((c) => c.id === user.clientId);
      }

      return [];
    }, [clients, user]);

    // Filtrer les branches selon le client sélectionné
    const filteredBranches = useMemo(() => {
      if (!selectedClientId) return [];
      return branches.filter((b) => b.clientId === selectedClientId);
    }, [branches, selectedClientId]);

    // Filtrer les véhicules selon le client sélectionné, puis par branche si sélectionnée
    const clientVehicles = useMemo(() => {
      if (!selectedClientId) return [];
      const clientName = clients.find((c) => c.id === selectedClientId)?.name;
      const byClient = vehicles.filter((v) => v.clientId === selectedClientId || v.name === clientName);
      if (selectedBranchId) return byClient.filter((v) => !v.branchId || v.branchId === selectedBranchId);
      return byClient;
    }, [vehicles, clients, selectedClientId, selectedBranchId]);

    // Filtrer les véhicules par recherche
    const filteredVehicles = useMemo(() => {
      if (!vehicleSearch) return clientVehicles;
      const search = vehicleSearch.toLowerCase();
      return clientVehicles.filter(
        (v) => v.name?.toLowerCase().includes(search) || v.plate?.toLowerCase().includes(search)
      );
    }, [clientVehicles, vehicleSearch]);

    // Appliquer les permissions par défaut quand le rôle change
    useEffect(() => {
      if (selectedRole && ROLE_PERMISSION_PRESETS[selectedRole]) {
        setValue('permissions', ROLE_PERMISSION_PRESETS[selectedRole] as SubUserFormData['permissions']);
      }
    }, [selectedRole, setValue]);

    // Reset branche quand le client change
    useEffect(() => {
      if (selectedClientId && !initialData) {
        setValue('branchId', '');
        setValue('vehicleIds', []);
      }
    }, [selectedClientId, setValue, initialData]);

    const toggleVehicle = (vehicleId: string) => {
      const current = selectedVehicleIds || [];
      if (current.includes(vehicleId)) {
        setValue(
          'vehicleIds',
          current.filter((id) => id !== vehicleId)
        );
      } else {
        setValue('vehicleIds', [...current, vehicleId]);
      }
    };

    const [isSaving, setIsSaving] = React.useState(false);
    const onSubmit = async (data: SubUserFormData) => {
      if (isSaving) return;
      setIsSaving(true);
      try {
        await onFormSubmit(data);
      } finally {
        setIsSaving(false);
      }
    };

    return (
      <form ref={ref} onSubmit={handleSubmit(onSubmit)} className="space-y-4 h-[600px] flex flex-col">
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
          {/* Section Identité */}
          <FormSection icon={User} title="Identité">
            <FormGrid columns={2}>
              <FormField label="Nom complet" required error={errors.nom?.message}>
                <Input {...register('nom')} placeholder="Jean Dupont" />
              </FormField>

              <FormField label="Email" required error={errors.email?.message}>
                <Input {...register('email')} type="email" placeholder="jean@entreprise.com" />
              </FormField>

              <FormField label="Téléphone">
                <Input {...register('phone')} type="tel" placeholder="+225 07 XX XX XX XX" />
              </FormField>

              <FormField label="Statut">
                <Select {...register('statut')}>
                  <option value="Actif">✅ Actif</option>
                  <option value="Inactif">⛔ Inactif</option>
                  <option value="En attente">⏳ En attente</option>
                </Select>
              </FormField>

              <FormField
                label="Mot de passe"
                hint={initialData?.id ? 'Laisser vide pour ne pas modifier' : 'Min. 6 caractères'}
                error={errors.password?.message}
              >
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      {...register('password')}
                      type={showPassword ? 'text' : 'password'}
                      placeholder={initialData?.id ? '••••••••' : 'Mot de passe...'}
                      className="pr-8"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={generatePassword}
                    className="px-2 py-1.5 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--primary)] hover:border-[var(--primary)] transition-colors"
                    title="Générer un mot de passe"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </FormField>
            </FormGrid>
          </FormSection>

          {/* Section Rattachement */}
          <FormSection icon={Building2} title="Rattachement">
            <FormGrid columns={2}>
              {!hideClientSelector && (
                <FormField label="Client" required error={errors.clientId?.message}>
                  <Select {...register('clientId')}>
                    <option value="">Sélectionner un client...</option>
                    {accessibleClients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                </FormField>
              )}

              <FormField
                label="Revendeur"
                hint={!selectedClientId ? "Sélectionnez d'abord un client" : 'Hérité automatiquement du client'}
              >
                <Input
                  value={derivedResellerLabel}
                  disabled
                  readOnly
                  className="bg-[var(--bg-elevated)] cursor-not-allowed"
                />
              </FormField>

              <FormField
                label="Branche (optionnel)"
                hint={!selectedClientId ? "Sélectionnez d'abord un client" : undefined}
              >
                <Select {...register('branchId')} disabled={!selectedClientId}>
                  <option value="">Toutes les branches</option>
                  {filteredBranches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name || b.nom}
                    </option>
                  ))}
                </Select>
              </FormField>

              <FormField
                label="Rôle"
                required
                hint={
                  selectedRole === 'Manager'
                    ? 'Accès complet sauf administration'
                    : selectedRole === 'User'
                      ? 'Accès standard en lecture/écriture limitée'
                      : 'Accès en lecture seule'
                }
              >
                <Select {...register('role')}>
                  <option value="Manager">👔 Gestionnaire</option>
                  <option value="User">👤 Utilisateur</option>
                  <option value="Viewer">👁️ Lecteur seul</option>
                </Select>
              </FormField>
            </FormGrid>
          </FormSection>

          {/* Section Véhicules */}
          <div className="border border-[var(--border)] rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowVehicles(!showVehicles)}
              className="w-full p-3 bg-[var(--bg-elevated)] flex items-center justify-between hover:bg-[var(--bg-elevated)] transition-colors"
            >
              <span className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
                <div className="p-1 bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] rounded-lg">
                  <Car className="w-4 h-4 text-[var(--primary)] dark:text-[var(--primary)]" />
                </div>
                Véhicules accessibles
                {!allVehicles && selectedVehicleIds.length > 0 && (
                  <span className="bg-[var(--primary-dim)] text-[var(--primary)] dark:bg-[var(--primary-dim)] dark:text-[var(--primary)] text-xs px-2 py-0.5 rounded-full font-medium">
                    {selectedVehicleIds.length} sélectionné(s)
                  </span>
                )}
                {allVehicles && (
                  <span className="bg-[var(--clr-success-badge)] text-[var(--clr-success-badge-text)] text-xs px-2 py-0.5 rounded-full font-medium">
                    Tous
                  </span>
                )}
              </span>
              {showVehicles ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showVehicles && (
              <div className="p-4 space-y-3">
                {!selectedClientId ? (
                  <p className="text-sm text-[var(--text-muted)] text-center py-4">Sélectionnez d'abord un client</p>
                ) : (
                  <>
                    <label className="flex items-center gap-2 p-3 bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] rounded-xl cursor-pointer">
                      <input
                        type="checkbox"
                        {...register('allVehicles')}
                        className="w-4 h-4 text-[var(--primary)] rounded-lg"
                      />
                      <span className="text-sm font-medium text-[var(--primary)] dark:text-[var(--primary)]">
                        Accès à tous les véhicules du client
                      </span>
                    </label>

                    {!allVehicles && (
                      <>
                        <Input
                          value={vehicleSearch}
                          onChange={(e) => setVehicleSearch(e.target.value)}
                          placeholder="Rechercher un véhicule..."
                        />

                        <div className="max-h-40 overflow-y-auto space-y-1">
                          {filteredVehicles.map((v) => (
                            <label
                              key={v.id}
                              className="flex items-center gap-2 p-2.5 hover:bg-[var(--bg-elevated)] rounded-lg cursor-pointer transition-colors"
                            >
                              <button
                                type="button"
                                onClick={() => toggleVehicle(v.id)}
                                className="text-[var(--text-muted)] hover:text-[var(--primary)]"
                              >
                                {selectedVehicleIds.includes(v.id) ? (
                                  <CheckSquare className="w-4 h-4 text-[var(--primary)]" />
                                ) : (
                                  <Square className="w-4 h-4" />
                                )}
                              </button>
                              <span className="text-sm text-[var(--text-primary)]">
                                {v.name} <span className="text-[var(--text-muted)]">({v.plate})</span>
                              </span>
                            </label>
                          ))}
                          {filteredVehicles.length === 0 && (
                            <p className="text-xs text-[var(--text-muted)] text-center py-2">Aucun véhicule trouvé</p>
                          )}
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Section Permissions */}
          <div className="border border-[var(--border)] rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowPermissions(!showPermissions)}
              className="w-full p-3 bg-[var(--bg-elevated)] flex items-center justify-between hover:bg-[var(--bg-elevated)] transition-colors"
            >
              <span className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
                <div className="p-1 bg-purple-100 dark:bg-purple-800 rounded-lg">
                  <Shield className="w-4 h-4 text-purple-600 dark:text-purple-300" />
                </div>
                Permissions détaillées
              </span>
              {showPermissions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showPermissions && (
              <div className="p-4 space-y-4">
                <p className="text-xs text-[var(--text-secondary)]">
                  Les permissions sont pré-remplies selon le rôle. Personnalisez si nécessaire.
                </p>

                {PERMISSION_GROUPS.map((group) => {
                  const Icon = group.icon;
                  return (
                    <div key={group.title} className="space-y-2">
                      <h5 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wide flex items-center gap-2">
                        <Icon className="w-3 h-3" /> {group.title}
                      </h5>
                      <div className="grid grid-cols-2 gap-2">
                        {group.permissions.map((perm) => (
                          <Controller
                            key={perm.key}
                            name={`permissions.${perm.key}` as Path<SubUserFormData>}
                            control={control}
                            render={({ field }) => (
                              <label className="flex items-center gap-2 text-sm cursor-pointer hover:bg-[var(--bg-elevated)] p-2 rounded-lg transition-colors">
                                <input
                                  type="checkbox"
                                  checked={!!field.value}
                                  onChange={field.onChange}
                                  className="w-4 h-4 text-[var(--primary)] rounded-lg"
                                />
                                <span className="text-[var(--text-secondary)]">{perm.label}</span>
                              </label>
                            )}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Notes */}
          <FormField label="Notes internes">
            <Textarea
              {...register('notes')}
              rows={2}
              placeholder="Notes visibles uniquement par les administrateurs..."
            />
          </FormField>
        </div>
      </form>
    );
  }
);

SubUserForm.displayName = 'SubUserForm';
