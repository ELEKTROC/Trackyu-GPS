import React, { useState, useEffect } from 'react';
import { useForm, type Path } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { api } from '../../../../services/apiLazy';
import { Drawer } from '../../../../components/Drawer';
import {
  Building2,
  User,
  Palette,
  Settings,
  Users,
  BarChart3,
  Receipt,
  Save,
  X,
  Edit,
  ChevronLeft,
  ChevronRight,
  Check,
  Shield,
  Package,
  Car,
  UserCheck,
} from 'lucide-react';
import type { Tier } from '../../../../types';
import {
  resellerDrawerSchema as resellerSchema,
  type ResellerDrawerFormData as ResellerFormData,
} from '../../../../schemas/resellerDrawerSchema';

// =============================================================================
// TYPES
// =============================================================================
interface ResellerDrawerFormProps {
  isOpen: boolean;
  onClose: () => void;
  reseller?: Tier | null;
  mode: 'view' | 'edit' | 'create';
  onSubmit: (data: any) => Promise<void>;
  onModeChange?: (mode: 'view' | 'edit') => void;
}

interface ManagedClient {
  id: string;
  name: string;
  vehicleCount: number;
  userCount: number;
  status: 'active' | 'inactive';
  createdAt: string;
}

interface Invoice {
  id: string;
  number: string;
  date: string;
  dueDate: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue';
}

type TabId = 'identity' | 'config' | 'clients' | 'stats' | 'billing';

// =============================================================================
// TABS DEFINITION
// =============================================================================
const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'identity', label: 'Identité', icon: Building2 },
  { id: 'config', label: 'Configuration', icon: Settings },
  { id: 'clients', label: 'Clients', icon: Users },
  { id: 'stats', label: 'Statistiques', icon: BarChart3 },
  { id: 'billing', label: 'Facturation', icon: Receipt },
];

// =============================================================================
// MOCK DATA (À remplacer par API)
// =============================================================================
const mockClients: ManagedClient[] = [
  { id: '1', name: 'Transport Express', vehicleCount: 25, userCount: 8, status: 'active', createdAt: '2024-06-15' },
  { id: '2', name: 'Logistique Plus', vehicleCount: 42, userCount: 12, status: 'active', createdAt: '2024-08-20' },
  { id: '3', name: 'Livraison Rapide', vehicleCount: 18, userCount: 5, status: 'inactive', createdAt: '2024-09-10' },
  { id: '4', name: 'Fleet Pro', vehicleCount: 35, userCount: 10, status: 'active', createdAt: '2024-10-05' },
  { id: '5', name: 'AutoTrack SARL', vehicleCount: 15, userCount: 4, status: 'active', createdAt: '2024-11-12' },
];

const mockInvoices: Invoice[] = [
  { id: '1', number: 'INV-2024-001', date: '2024-01-01', dueDate: '2024-01-31', amount: 299, status: 'paid' },
  { id: '2', number: 'INV-2024-002', date: '2024-02-01', dueDate: '2024-02-29', amount: 299, status: 'paid' },
  { id: '3', number: 'INV-2024-003', date: '2024-03-01', dueDate: '2024-03-31', amount: 349, status: 'paid' },
  { id: '4', number: 'INV-2024-004', date: '2024-04-01', dueDate: '2024-04-30', amount: 349, status: 'pending' },
  { id: '5', number: 'INV-2024-005', date: '2024-05-01', dueDate: '2024-05-31', amount: 349, status: 'overdue' },
];

// =============================================================================
// COMPONENT
// =============================================================================
export function ResellerDrawerForm({
  isOpen,
  onClose,
  reseller,
  mode,
  onSubmit,
  onModeChange,
}: ResellerDrawerFormProps) {
  const [realClients, setRealClients] = useState<ManagedClient[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('identity');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clientPage, setClientPage] = useState(1);
  const [invoicePage, setInvoicePage] = useState(1);
  const pageSize = 5;

  const isViewMode = mode === 'view';
  const isCreateMode = mode === 'create';

  const form = useForm<ResellerFormData>({
    resolver: zodResolver(resellerSchema),
    defaultValues: {
      name: '',
      slug: '',
      email: '',
      phone: '',
      address: '',
      siret: '',
      adminName: '',
      adminEmail: '',
      adminPhone: '',
      password: '',
      brandName: '',
      primaryColor: '#3b82f6',
      secondaryColor: '#1e40af',
      customDomain: '',
      modules: {
        fleet: true,
        interventions: true,
        stock: false,
        crm: false,
        finance: false,
        reports: true,
        alerts: true,
        map: true,
      },
      permissions: {
        canManageTeam: true,
        canManageIntegrations: false,
        canManageOrganization: true,
        canAccessApi: false,
        canExportData: true,
        canDeleteData: false,
      },
      isActive: true,
    },
  });

  // Reset form when reseller changes
  useEffect(() => {
    if (reseller) {
      const rd = reseller.resellerData || {};
      form.reset({
        name: reseller.name || '',
        slug: reseller.slug || '',
        email: reseller.email || '',
        phone: reseller.phone || '',
        address: reseller.address || '',
        siret: rd.siret || '',
        adminName: rd.adminName || '',
        adminEmail: rd.adminEmail || reseller.email || '',
        adminPhone: rd.adminPhone || '',
        brandName: rd.brandName || '',
        primaryColor: rd.primaryColor || '#3b82f6',
        secondaryColor: rd.secondaryColor || '#1e40af',
        customDomain: rd.customDomain || '',
        modules: rd.modules || {
          fleet: true,
          interventions: true,
          stock: false,
          crm: false,
          finance: false,
          reports: true,
          alerts: true,
          map: true,
        },
        permissions: rd.permissions
          ? {
              canManageTeam: rd.permissions.includes('MANAGE_TEAM'),
              canManageIntegrations: rd.permissions.includes('MANAGE_INTEGRATIONS'),
              canManageOrganization: rd.permissions.includes('MANAGE_ORGANIZATION'),
              canAccessApi: rd.permissions.includes('ACCESS_API'),
              canExportData: rd.permissions.includes('EXPORT_DATA'),
              canDeleteData: rd.permissions.includes('DELETE_DATA'),
            }
          : {
              canManageTeam: true,
              canManageIntegrations: false,
              canManageOrganization: true,
              canAccessApi: false,
              canExportData: true,
              canDeleteData: false,
            },
        isActive: rd.isActive !== false,
      });
    } else if (isCreateMode) {
      form.reset();
    }
  }, [reseller, isCreateMode]);

  // Fetch real clients
  useEffect(() => {
    const fetchClients = async () => {
      if (activeTab === 'clients' && reseller?.id) {
        setIsLoadingClients(true);
        try {
          // Utiliser l'API CRM tiers.list()
          const response = await api.tiers.list();
          // Filter locally: type CLIENT and parentId matching reseller.id
          const filtered = response.filter((t: any) => t.type === 'CLIENT' && t.parentId === reseller.id);
          const mapped: ManagedClient[] = filtered.map((t: any) => ({
            id: t.id,
            name: t.name,
            vehicleCount: t.vehicleCount || 0,
            userCount: t.userCount || 0,
            status: t.status === 'ACTIVE' ? 'active' : 'inactive',
            createdAt: new Date(t.createdAt).toLocaleDateString('fr-FR'),
          }));
          setRealClients(mapped);
        } catch (error) {
          console.error('Failed to fetch clients:', error);
        } finally {
          setIsLoadingClients(false);
        }
      }
    };
    fetchClients();
  }, [activeTab, reseller?.id]);

  // Reset tab when drawer opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab('identity');
      setClientPage(1);
      setInvoicePage(1);
    }
  }, [isOpen]);

  const handleSubmit = async (data: ResellerFormData) => {
    // Vérifier s'il y a des erreurs de validation
    if (Object.keys(form.formState.errors).length > 0) {
      // Aller sur l'onglet Identité si erreurs sur champs requis
      if (
        form.formState.errors.name ||
        form.formState.errors.slug ||
        form.formState.errors.email ||
        form.formState.errors.adminName ||
        form.formState.errors.adminEmail
      ) {
        setActiveTab('identity');
      }
      return;
    }

    setIsSubmitting(true);
    try {
      if (typeof onSubmit === 'function') {
        await onSubmit(data);
        onClose();
      }
    } catch (error) {
      /* silent */
    } finally {
      setIsSubmitting(false);
    }
  };

  // =============================================================================
  // RENDER HELPERS
  // =============================================================================
  const renderField = (
    label: string,
    name: keyof ResellerFormData,
    type: 'text' | 'email' | 'number' | 'color' = 'text',
    placeholder?: string
  ) => {
    const value = form.watch(name);
    const error = form.formState.errors[name];

    if (isViewMode) {
      return (
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">{label}</label>
          <p className="text-[var(--text-primary)]">
            {type === 'color' ? (
              <span className="flex items-center gap-2">
                <span className="w-6 h-6 rounded border" style={{ backgroundColor: String(value) }} />
                {String(value)}
              </span>
            ) : (
              String(value) || '-'
            )}
          </p>
        </div>
      );
    }

    return (
      <div>
        <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">{label}</label>
        {type === 'color' ? (
          <div className="flex items-center gap-2">
            <input type="color" {...form.register(name)} className="w-10 h-10 rounded cursor-pointer" />
            <input
              type="text"
              value={String(value)}
              onChange={(e) => form.setValue(name, e.target.value as ResellerFormData[keyof ResellerFormData])}
              className="flex-1 px-3 py-2 border rounded-lg bg-[var(--bg-elevated)] border-[var(--border)]"
            />
          </div>
        ) : (
          <input
            type={type}
            {...form.register(name, { valueAsNumber: type === 'number' })}
            placeholder={placeholder}
            className="w-full px-3 py-2 border rounded-lg bg-[var(--bg-elevated)] border-[var(--border)] 
                       focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
          />
        )}
        {error && <p className="mt-1 text-sm text-red-500">{error.message as string}</p>}
      </div>
    );
  };

  const renderCheckbox = (label: string, path: string, icon?: React.ElementType) => {
    const Icon = icon;
    const pathParts = path.split('.');
    const value = pathParts.reduce(
      (obj: Record<string, unknown>, key) => obj?.[key] as Record<string, unknown>,
      form.watch() as unknown as Record<string, unknown>
    );

    if (isViewMode) {
      return (
        <div className="flex items-center gap-2 py-1">
          {Icon && <Icon className="w-4 h-4 text-[var(--text-muted)]" />}
          <span className={value ? 'text-green-600' : 'text-[var(--text-muted)]'}>
            {value ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
          </span>
          <span className="text-sm text-[var(--text-primary)]">{label}</span>
        </div>
      );
    }

    return (
      <label className="flex items-center gap-2 py-1 cursor-pointer hover:bg-[var(--bg-elevated)] dark:hover:bg-slate-700 px-2 rounded">
        {Icon && <Icon className="w-4 h-4 text-[var(--text-muted)]" />}
        <input
          type="checkbox"
          {...form.register(path as Path<ResellerFormData>)}
          className="w-4 h-4 text-[var(--primary)] rounded focus:ring-[var(--primary)]"
        />
        <span className="text-sm text-[var(--text-primary)]">{label}</span>
      </label>
    );
  };

  // =============================================================================
  // TAB CONTENT
  // =============================================================================
  const renderIdentityTab = () => (
    <div className="space-y-6">
      {/* Société */}
      <div className="bg-[var(--bg-elevated)] rounded-lg p-4">
        <h4 className="font-medium text-[var(--text-primary)] mb-4 flex items-center gap-2">
          <Building2 className="w-4 h-4" /> Société
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderField('Nom', 'name', 'text', 'Nom de la société')}
          {/* Slug - Non modifiable après création */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
              Slug (Code numérotation) <span className="text-red-500">*</span>
            </label>
            {isViewMode ? (
              <p className="text-[var(--text-primary)] font-mono bg-[var(--bg-elevated)] px-3 py-2 rounded">
                {form.watch('slug') || '-'}
              </p>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  {...form.register('slug')}
                  placeholder="ABJ, DKR, SMART..."
                  maxLength={10}
                  disabled={!isCreateMode}
                  className={`w-full px-3 py-2 border rounded-lg bg-[var(--bg-elevated)] border-[var(--border)] font-mono uppercase ${
                    !isCreateMode ? 'bg-slate-100 bg-[var(--bg-elevated)] cursor-not-allowed' : ''
                  } ${form.formState.errors.slug ? 'border-red-500' : ''}`}
                  onChange={(e) => {
                    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                    form.setValue('slug', value);
                  }}
                />
                {!isCreateMode && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-amber-600 dark:text-amber-400">
                    🔒 Non modifiable
                  </span>
                )}
              </div>
            )}
            {form.formState.errors.slug && (
              <p className="text-red-500 text-xs mt-1">{form.formState.errors.slug.message}</p>
            )}
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Ce code sera utilisé dans les numéros de documents (ex: FAC-<strong>{form.watch('slug') || 'XXX'}</strong>
              -00001)
            </p>
          </div>
          {renderField('Email', 'email', 'email', 'contact@societe.com')}
          {renderField('Téléphone', 'phone', 'text', '+225 07 XX XX XX XX')}
          {renderField('SIRET', 'siret', 'text', '123 456 789 00012')}
        </div>
        <div className="mt-4">{renderField('Adresse', 'address', 'text', 'Adresse complète')}</div>
      </div>

      {/* Admin */}
      <div className="bg-[var(--bg-elevated)] rounded-lg p-4">
        <h4 className="font-medium text-[var(--text-primary)] mb-4 flex items-center gap-2">
          <User className="w-4 h-4" /> Administrateur
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderField('Nom', 'adminName', 'text', 'Jean Dupont')}
          {renderField('Email', 'adminEmail', 'email', 'admin@societe.com')}
          {renderField('Téléphone', 'adminPhone', 'text', '+225 05 XX XX XX XX')}
          {isCreateMode && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                Mot de passe initial
              </label>
              <div className="relative group">
                <input
                  type={showPassword ? 'text' : 'password'}
                  {...form.register('password')}
                  className="w-full pl-3 pr-10 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--primary)] outline-none transition-all"
                  placeholder="********"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] dark:hover:text-slate-200"
                >
                  {showPassword ? <X className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                </button>
              </div>
              {form.formState.errors.password && (
                <p className="text-xs text-red-500 mt-1">{form.formState.errors.password.message as string}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Marque Blanche */}
      <div className="bg-[var(--bg-elevated)] rounded-lg p-4">
        <h4 className="font-medium text-[var(--text-primary)] mb-4 flex items-center gap-2">
          <Palette className="w-4 h-4" /> Marque Blanche
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderField('Nom de marque', 'brandName', 'text', 'Ma Marque')}
          {renderField('Domaine personnalisé', 'customDomain', 'text', 'app.mamarque.com')}
          {renderField('Couleur principale', 'primaryColor', 'color')}
          {renderField('Couleur secondaire', 'secondaryColor', 'color')}
        </div>
      </div>
    </div>
  );

  const renderConfigTab = () => (
    <div className="space-y-6">
      {/* Quotas */}
      {/* Status */}
      <div className="bg-[var(--bg-elevated)] rounded-lg p-4">
        <h4 className="font-medium text-[var(--text-primary)] mb-4">Statut</h4>
        {renderCheckbox('Compte actif', 'isActive', UserCheck)}
      </div>

      {/* Modules */}
      <div className="bg-[var(--bg-elevated)] rounded-lg p-4">
        <h4 className="font-medium text-[var(--text-primary)] mb-4 flex items-center gap-2">
          <Package className="w-4 h-4" /> Modules activés
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {renderCheckbox('Flotte', 'modules.fleet', Car)}
          {renderCheckbox('Interventions', 'modules.interventions')}
          {renderCheckbox('Stock', 'modules.stock')}
          {renderCheckbox('CRM', 'modules.crm')}
          {renderCheckbox('Finance', 'modules.finance')}
          {renderCheckbox('Rapports', 'modules.reports')}
          {renderCheckbox('Alertes', 'modules.alerts')}
          {renderCheckbox('Carte', 'modules.map')}
        </div>
      </div>

      {/* Permissions */}
      <div className="bg-[var(--bg-elevated)] rounded-lg p-4">
        <h4 className="font-medium text-[var(--text-primary)] mb-4 flex items-center gap-2">
          <Shield className="w-4 h-4" /> Permissions
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {renderCheckbox('Gérer son équipe', 'permissions.canManageTeam', Users)}
          {renderCheckbox('Gérer les intégrations', 'permissions.canManageIntegrations')}
          {renderCheckbox("Gérer l'organisation", 'permissions.canManageOrganization')}
          {renderCheckbox('Accès API', 'permissions.canAccessApi')}
          {renderCheckbox('Exporter les données', 'permissions.canExportData')}
          {renderCheckbox('Supprimer des données', 'permissions.canDeleteData')}
        </div>
      </div>

      {/* Status */}
      <div className="bg-[var(--bg-elevated)] rounded-lg p-4">
        <h4 className="font-medium text-[var(--text-primary)] mb-4">Statut</h4>
        {renderCheckbox('Compte actif', 'isActive', UserCheck)}
      </div>
    </div>
  );

  const renderClientsTab = () => {
    const totalPages = Math.ceil(realClients.length / pageSize);
    const paginatedClients = realClients.slice((clientPage - 1) * pageSize, clientPage * pageSize);

    return (
      <div className="space-y-4">
        {isLoadingClients ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary)]"></div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-[var(--text-primary)]">Clients gérés ({realClients.length})</h4>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[var(--bg-elevated)]">
                  <tr>
                    <th className="px-4 py-2 text-left">Client</th>
                    <th className="px-4 py-2 text-center">Véhicules</th>
                    <th className="px-4 py-2 text-center">Utilisateurs</th>
                    <th className="px-4 py-2 text-center">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-gray-700">
                  {paginatedClients.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-[var(--text-secondary)]">
                        Aucun client trouvé pour ce revendeur.
                      </td>
                    </tr>
                  ) : (
                    paginatedClients.map((client) => (
                      <tr key={client.id} className="tr-hover">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-[var(--text-primary)]">{client.name}</p>
                            <p className="text-xs text-[var(--text-secondary)]">Depuis {client.createdAt}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">{client.vehicleCount}</td>
                        <td className="px-4 py-3 text-center">{client.userCount}</td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`px-2 py-1 rounded-full text-xs ${
                              client.status === 'active'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : 'bg-slate-100 text-[var(--text-primary)] bg-[var(--bg-elevated)] text-[var(--text-secondary)]'
                            }`}
                          >
                            {client.status === 'active' ? 'Actif' : 'Inactif'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-[var(--border)]">
                <span className="text-sm text-[var(--text-secondary)]">
                  Page {clientPage} sur {totalPages}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setClientPage((p) => Math.max(1, p - 1))}
                    disabled={clientPage === 1}
                    className="p-2 rounded hover:bg-[var(--bg-elevated)] disabled:opacity-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setClientPage((p) => Math.min(totalPages, p + 1))}
                    disabled={clientPage === totalPages}
                    className="p-2 rounded hover:bg-[var(--bg-elevated)] disabled:opacity-50"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  const renderStatsTab = () => {
    // Calculs mock
    const totalVehicles = mockClients.reduce((sum, c) => sum + c.vehicleCount, 0);
    const totalUsers = mockClients.reduce((sum, c) => sum + c.userCount, 0);
    const activeClients = mockClients.filter((c) => c.status === 'active').length;
    const mrr = 349; // Mock MRR

    return (
      <div className="space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-[var(--primary)]">{mockClients.length}</p>
            <p className="text-sm text-[var(--text-secondary)]">Clients</p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{activeClients}</p>
            <p className="text-sm text-[var(--text-secondary)]">Actifs</p>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-purple-600">{totalVehicles}</p>
            <p className="text-sm text-[var(--text-secondary)]">Véhicules</p>
          </div>
          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-orange-600">{totalUsers}</p>
            <p className="text-sm text-[var(--text-secondary)]">Utilisateurs</p>
          </div>
        </div>

        {/* MRR */}
        <div className="bg-[var(--bg-elevated)] rounded-lg p-4">
          <h4 className="font-medium text-[var(--text-primary)] mb-4">Revenus</h4>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold text-[var(--text-primary)]">{mrr}</p>
              <p className="text-sm text-[var(--text-secondary)]">Abonnement mensuel</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-medium text-green-600">+12%</p>
              <p className="text-sm text-[var(--text-secondary)]">vs mois précédent</p>
            </div>
          </div>
        </div>

        {/* Croissance */}
        <div className="bg-[var(--bg-elevated)] rounded-lg p-4">
          <h4 className="font-medium text-[var(--text-primary)] mb-4">Croissance</h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-[var(--text-secondary)]">Nouveaux clients (30j)</span>
              <span className="font-medium text-[var(--text-primary)]">+2</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-[var(--text-secondary)]">Nouveaux véhicules (30j)</span>
              <span className="font-medium text-[var(--text-primary)]">+18</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-[var(--text-secondary)]">Taux de rétention</span>
              <span className="font-medium text-green-600">98%</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderBillingTab = () => {
    const totalPages = Math.ceil(mockInvoices.length / pageSize);
    const paginatedInvoices = mockInvoices.slice((invoicePage - 1) * pageSize, invoicePage * pageSize);

    const statusColors = {
      paid: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      overdue: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    };

    const statusLabels = {
      paid: 'Payée',
      pending: 'En attente',
      overdue: 'En retard',
    };

    const totalDue = mockInvoices.filter((i) => i.status !== 'paid').reduce((sum, i) => sum + i.amount, 0);

    return (
      <div className="space-y-4">
        {/* Résumé */}
        <div className="bg-[var(--bg-elevated)] rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--text-secondary)]">Montant dû</p>
              <p className="text-2xl font-bold text-[var(--text-primary)]">{totalDue}</p>
            </div>
            <Receipt className="w-8 h-8 text-[var(--text-muted)]" />
          </div>
        </div>

        {/* Liste factures */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[var(--bg-elevated)]">
              <tr>
                <th className="px-4 py-2 text-left">N° Facture</th>
                <th className="px-4 py-2 text-left">Date</th>
                <th className="px-4 py-2 text-left">Échéance</th>
                <th className="px-4 py-2 text-right">Montant</th>
                <th className="px-4 py-2 text-center">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-gray-700">
              {paginatedInvoices.map((invoice) => (
                <tr key={invoice.id} className="tr-hover">
                  <td className="px-4 py-3 font-medium text-[var(--primary)]">{invoice.number}</td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">{invoice.date}</td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">{invoice.dueDate}</td>
                  <td className="px-4 py-3 text-right font-medium">{invoice.amount}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs ${statusColors[invoice.status]}`}>
                      {statusLabels[invoice.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-[var(--border)]">
            <span className="text-sm text-[var(--text-secondary)]">
              Page {invoicePage} sur {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setInvoicePage((p) => Math.max(1, p - 1))}
                disabled={invoicePage === 1}
                className="p-2 rounded hover:bg-[var(--bg-elevated)] disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setInvoicePage((p) => Math.min(totalPages, p + 1))}
                disabled={invoicePage === totalPages}
                className="p-2 rounded hover:bg-[var(--bg-elevated)] disabled:opacity-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'identity':
        return renderIdentityTab();
      case 'config':
        return renderConfigTab();
      case 'clients':
        return renderClientsTab();
      case 'stats':
        return renderStatsTab();
      case 'billing':
        return renderBillingTab();
      default:
        return null;
    }
  };

  // =============================================================================
  // MAIN RENDER
  // =============================================================================
  const title = isCreateMode
    ? 'Nouveau Revendeur'
    : isViewMode
      ? reseller?.name || 'Détails Revendeur'
      : `Modifier ${reseller?.name || 'Revendeur'}`;

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title={title} size="lg">
      <form onSubmit={form.handleSubmit(handleSubmit)} className="h-full flex flex-col">
        {/* Header Actions */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border)] bg-[var(--bg-elevated)]">
          <div className="flex items-center gap-2">
            {isViewMode && onModeChange && (
              <button
                type="button"
                onClick={() => onModeChange('edit')}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-light)]"
              >
                <Edit className="w-4 h-4" />
                Modifier
              </button>
            )}
          </div>
          {!isViewMode && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] rounded-lg"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-light)] disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[var(--border)] overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            // Hide clients/stats/billing in create mode
            if (isCreateMode && ['clients', 'stats', 'billing'].includes(tab.id)) {
              return null;
            }
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  isActive
                    ? 'border-[var(--primary)] text-[var(--primary)]'
                    : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] dark:hover:text-slate-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">{renderTabContent()}</div>
      </form>
    </Drawer>
  );
}
