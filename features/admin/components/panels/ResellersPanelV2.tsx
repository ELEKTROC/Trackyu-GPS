/**
 * ResellersPanelV2 - Gestion des Revendeurs (Tenants) Améliorée
 *
 * Fonctionnalités:
 * - Dashboard KPIs (revendeurs, clients, véhicules, MRR)
 * - Tableau enrichi avec filtres, recherche, tri
 * - Création/édition avec génération automatique du tenantId
 * - Drawer de détail avec onglets: Info, Clients, Stats, Intégrations, Facturation
 * - Actions: Impersonation, Suspendre, Résilier
 */

import React, { useState, useMemo } from 'react';
import {
  Building2,
  Plus,
  Search,
  Edit2,
  Users,
  Car,
  TrendingUp,
  DollarSign,
  ExternalLink,
  Pause,
  Play,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { Card } from '../../../../components/Card';
import type { Tier } from '../../../../types';
import { useDataContext } from '../../../../contexts/DataContext';
import { useAuth } from '../../../../contexts/AuthContext';
import { useToast } from '../../../../contexts/ToastContext';
import { TOAST } from '../../../../constants/toastMessages';
import { mapError } from '../../../../utils/errorMapper';
import { useConfirmDialog } from '../../../../components/ConfirmDialog';
import { ResellerDrawerForm } from '../forms/ResellerDrawerForm';
import { api } from '../../../../services/apiLazy';
import { useCurrency } from '../../../../hooks/useCurrency';
import { useTableSort } from '../../../../hooks/useTableSort';
import { SortableHeader } from '../../../../components/SortableHeader';
import { useIsMobile } from '../../../../hooks/useIsMobile';
import { MobileCard, MobileCardList } from '../../../../components/MobileCard';

// Types
interface ResellerStats {
  clientCount: number;
  vehicleCount: number;
  activeSubscriptions: number;
  mrr: number;
  growthRate: number | null;
}

interface ResellerStatsAPI {
  resellerId: string;
  resellerName: string;
  tenantId: string;
  status: string;
  clients: { total: number; active: number };
  vehicles: { total: number; active: number };
  mrr: number;
}

interface ResellerFilter {
  status: 'ALL' | 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';
  search: string;
  sortBy: 'name' | 'clients' | 'vehicles' | 'mrr' | 'createdAt';
  sortOrder: 'asc' | 'desc';
}

// Génération d'un tenantId unique
const generateTenantId = (companyName: string, slug: string): string => {
  // Use the slug if provided, otherwise generate from company name
  const baseSlug = slug
    ? slug.toLowerCase()
    : companyName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '')
        .substring(0, 20);
  const suffix = Date.now().toString(36).substring(-4);
  return `tenant_${baseSlug}_${suffix}`;
};

// Composant principal
export const ResellersPanelV2: React.FC = () => {
  const { tiers, addTier, updateTier } = useDataContext();
  const { impersonate } = useAuth();
  const { showToast } = useToast();
  const { formatPrice } = useCurrency();
  const { confirm, ConfirmDialogComponent } = useConfirmDialog();

  // State
  const [filters, setFilters] = useState<ResellerFilter>({
    status: 'ALL',
    search: '',
    sortBy: 'name',
    sortOrder: 'asc',
  });
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedReseller, setSelectedReseller] = useState<Tier | null>(null);
  const [drawerMode, setDrawerMode] = useState<'view' | 'edit' | 'create'>('view');
  const [resellerStats, setResellerStats] = useState<Record<string, ResellerStatsAPI>>({});
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  // Charger les stats réelles depuis l'API
  React.useEffect(() => {
    const loadStats = async () => {
      setIsLoadingStats(true);
      try {
        const data = await api.resellers.getStatsSummary();

        if (!data || !data.resellers || !Array.isArray(data.resellers)) {
          return;
        }

        const statsMap: Record<string, ResellerStatsAPI> = {};
        data.resellers.forEach((r: ResellerStatsAPI) => {
          statsMap[r.resellerId] = r;
        });
        setResellerStats(statsMap);
      } catch (error) {
        showToast(TOAST.CRUD.ERROR_LOAD('statistiques'), 'error');
      } finally {
        setIsLoadingStats(false);
      }
    };
    loadStats();
  }, [showToast]);

  // Données filtrées
  const resellers = useMemo(() => (tiers || []).filter((t) => t.type === 'RESELLER'), [tiers]);

  const filteredResellers = useMemo(() => {
    let result = [...resellers];

    // Filtre statut
    if (filters.status !== 'ALL') {
      result = result.filter((r) => r.status === filters.status);
    }

    // Filtre recherche
    if (filters.search) {
      const search = filters.search.toLowerCase();
      result = result.filter(
        (r) =>
          r.name.toLowerCase().includes(search) ||
          r.email?.toLowerCase().includes(search) ||
          r.resellerData?.domain?.toLowerCase().includes(search)
      );
    }

    // Tri
    // (sorting handled by useTableSort below)

    return result;
  }, [resellers, filters]);

  const RESELLER_SORT_ACCESSORS: Record<string, (r: Tier) => any> = {
    name: (r) => r.name,
    slug: (r) => r.slug || r.resellerData?.domain,
    clients: (r) => getResellerStats(r.id).clientCount,
    vehicles: (r) => getResellerStats(r.id).vehicleCount,
    mrr: (r) => getResellerStats(r.id).mrr,
    status: (r) => r.status,
    createdAt: (r) => r.createdAt,
  };

  const {
    sortedItems: sortedResellers,
    sortConfig: resellerSortConfig,
    handleSort: handleResellerSort,
  } = useTableSort(filteredResellers, { key: 'name', direction: 'asc' }, RESELLER_SORT_ACCESSORS);

  // Calculer stats par revendeur (depuis l'API)
  const getResellerStats = (resellerId: string): ResellerStats => {
    const stats = resellerStats[resellerId];
    if (!stats) {
      return {
        clientCount: 0,
        vehicleCount: 0,
        activeSubscriptions: 0,
        mrr: 0,
        growthRate: null,
      };
    }

    // Calculer le taux d'activité (clients actifs / total) comme indicateur de croissance
    const activityRate =
      stats.clients.total > 0 ? Math.round((stats.clients.active / stats.clients.total) * 100) : null;

    return {
      clientCount: stats.clients.total,
      vehicleCount: stats.vehicles.total,
      activeSubscriptions: stats.clients.active,
      mrr: stats.mrr,
      growthRate: activityRate,
    };
  };

  // Stats globales (depuis l'API)
  const globalStats = useMemo(() => {
    if (isLoadingStats || Object.keys(resellerStats).length === 0) {
      return { activeResellers: 0, totalClients: 0, totalVehicles: 0, totalMRR: 0 };
    }

    const activeResellers = resellers.filter((r) => r.status === 'ACTIVE').length;
    const totalClients = Object.values(resellerStats).reduce((acc, s) => acc + s.clients.total, 0);
    const totalVehicles = Object.values(resellerStats).reduce((acc, s) => acc + s.vehicles.total, 0);
    const totalMRR = Object.values(resellerStats).reduce((acc, s) => acc + s.mrr, 0);

    return { activeResellers, totalClients, totalVehicles, totalMRR };
  }, [resellers, resellerStats, isLoadingStats]);

  // Handlers
  const handleCreateClick = () => {
    setSelectedReseller(null);
    setDrawerMode('create');
    setIsDrawerOpen(true);
  };

  const handleEditClick = (reseller: Tier) => {
    setSelectedReseller(reseller);
    setDrawerMode('edit');
    setIsDrawerOpen(true);
  };

  const handleViewDetails = (reseller: Tier) => {
    setSelectedReseller(reseller);
    setDrawerMode('view');
    setIsDrawerOpen(true);
  };

  const handleDrawerClose = () => {
    setIsDrawerOpen(false);
    setSelectedReseller(null);
  };

  const handleFormSave = async (data: Record<string, unknown>): Promise<void> => {
    const isNew = drawerMode === 'create';

    if (isNew) {
      // Création avec génération du tenantId
      const tenantId = generateTenantId(String(data.companyName || data.name), String(data.slug));

      const tier: Tier = {
        id: `reseller_${Date.now()}`,
        tenantId,
        type: 'RESELLER',
        name: String(data.companyName || data.name),
        slug: String(data.slug || '').toUpperCase(), // Slug en majuscules, non modifiable après
        email: String(data.email || ''),
        phone: String(data.phone || ''),
        address: String(data.address || ''),
        city: String(data.city || ''),
        country: String(data.country || 'Sénégal'),
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        resellerData: {
          domain: String(data.website || data.customDomain || ''),
          logo: data.logo as string | undefined,
          activeClients: 0,
          clientCount: 0,
          activity: String(data.activity || ''),
          rccm: String(data.rccm || ''),
          ccNumber: String(data.ccNumber || ''),
          managerName: String(data.managerName || ''),
        },
      };

      addTier(tier);
      showToast(TOAST.ADMIN.RESELLER_CREATED(String(data.slug)), 'success');
    } else if (selectedReseller) {
      // Mise à jour
      const updatedTier: Tier = {
        ...selectedReseller,
        name: String(data.name || data.companyName || ''),
        email: String(data.email || ''),
        phone: String(data.phone || ''),
        address: String(data.address || ''),
        city: String(data.city || ''),
        country: String(data.country || 'Sénégal'),
        updatedAt: new Date().toISOString(),
        resellerData: {
          ...selectedReseller.resellerData,
          domain: String(data.website || data.customDomain || ''),
          logo: data.logo as string | undefined,
          activity: String(data.activity || ''),
          rccm: String(data.rccm || ''),
          ccNumber: String(data.ccNumber || ''),
          managerName: String(data.managerName || ''),
        },
      };

      if (!updateTier) {
        showToast(mapError(null, 'contexte'), 'error');
        return;
      }

      updateTier(updatedTier);
      showToast(TOAST.ADMIN.RESELLER_UPDATED, 'success');
    }
  };

  const handleStatusChange = async (reseller: Tier, newStatus: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE') => {
    if (!updateTier) {
      showToast(mapError(null, 'contexte'), 'error');
      return;
    }

    const statusLabels = { ACTIVE: 'activé', SUSPENDED: 'suspendu', INACTIVE: 'désactivé' };

    if (
      !(await confirm({
        message: `Êtes-vous sûr de vouloir ${newStatus === 'ACTIVE' ? 'réactiver' : 'suspendre'} ce revendeur ?`,
        variant: 'warning',
        title: 'Confirmer le changement de statut',
        confirmLabel: 'Confirmer',
      }))
    ) {
      return;
    }

    updateTier({ ...reseller, status: newStatus, updatedAt: new Date().toISOString() });
    showToast(TOAST.CRUD.UPDATED('Revendeur'), 'success');
  };

  const handleImpersonate = (reseller: Tier) => {
    impersonate(reseller.tenantId, reseller.id);
    showToast(TOAST.ADMIN.RESELLER_IMPERSONATED(reseller.name), 'info');
  };

  const getStatusBadge = (status: string) => {
    const config = {
      ACTIVE: {
        bg: 'bg-[var(--clr-success-muted)]',
        text: 'text-[var(--clr-success-strong)]',
        icon: CheckCircle,
      },
      SUSPENDED: {
        bg: 'bg-[var(--clr-warning-muted)]',
        text: 'text-[var(--clr-warning-strong)]',
        icon: Pause,
      },
      INACTIVE: { bg: 'bg-[var(--clr-danger-muted)]', text: 'text-[var(--clr-danger-strong)]', icon: XCircle },
    };
    const c = config[status as keyof typeof config] || config.INACTIVE;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${c.bg} ${c.text}`}>
        <c.icon className="w-3 h-3" />
        {status}
      </span>
    );
  };

  const formatMoney = (amount: number) => {
    return formatPrice(amount);
  };

  const isMobile = useIsMobile();

  // Protection: Vérifier que le contexte est chargé (après tous les hooks)
  if (!updateTier || !addTier) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary)]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* KPI Cards - Hidden on mobile */}
      <div className="hidden sm:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-[var(--bg-elevated)] border-[var(--border)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[var(--text-secondary)] uppercase font-bold">Revendeurs Actifs</p>
              {isLoadingStats ? (
                <div className="h-8 w-16 bg-[var(--bg-elevated)] bg-[var(--bg-elevated)] animate-pulse rounded" />
              ) : (
                <>
                  <p className="page-title">{globalStats.activeResellers}</p>
                  <p className="text-xs text-[var(--text-secondary)]">sur {resellers.length} total</p>
                </>
              )}
            </div>
            <div className="p-3 bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] text-[var(--primary)] dark:text-[var(--primary)] rounded-lg">
              <Building2 className="w-6 h-6" />
            </div>
          </div>
        </Card>

        <Card className="bg-[var(--bg-elevated)] border-[var(--border)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[var(--text-secondary)] uppercase font-bold">Clients Gérés</p>
              {isLoadingStats ? (
                <div className="h-8 w-16 bg-[var(--bg-elevated)] bg-[var(--bg-elevated)] animate-pulse rounded" />
              ) : (
                <>
                  <p className="page-title">{globalStats.totalClients.toLocaleString('fr-FR')}</p>
                </>
              )}
            </div>
            <div className="p-3 bg-[var(--clr-info-muted)] text-[var(--clr-info)] rounded-lg">
              <Users className="w-6 h-6" />
            </div>
          </div>
        </Card>

        <Card className="bg-[var(--bg-elevated)] border-[var(--border)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[var(--text-secondary)] uppercase font-bold">Véhicules Trackés</p>
              {isLoadingStats ? (
                <div className="h-8 w-16 bg-[var(--bg-elevated)] bg-[var(--bg-elevated)] animate-pulse rounded" />
              ) : (
                <>
                  <p className="page-title">{globalStats.totalVehicles.toLocaleString('fr-FR')}</p>
                </>
              )}
            </div>
            <div className="p-3 bg-[var(--clr-success-muted)] text-[var(--clr-success)] rounded-lg">
              <Car className="w-6 h-6" />
            </div>
          </div>
        </Card>

        <Card className="bg-[var(--bg-elevated)] border-[var(--border)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[var(--text-secondary)] uppercase font-bold">MRR Total</p>
              {isLoadingStats ? (
                <div className="h-8 w-20 bg-[var(--bg-elevated)] bg-[var(--bg-elevated)] animate-pulse rounded" />
              ) : (
                <>
                  <p className="page-title">{(globalStats.totalMRR / 1000000).toFixed(1)}M</p>
                  <p className="text-xs text-[var(--text-secondary)]">Récurrent</p>
                </>
              )}
            </div>
            <div className="p-3 bg-[var(--clr-caution-muted)] text-[var(--clr-caution)] rounded-lg">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filters & Actions */}
      <Card className="bg-[var(--bg-elevated)] border-[var(--border)]">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-4">
          <div className="flex flex-wrap gap-3 flex-1">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Rechercher un revendeur..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm bg-[var(--bg-elevated)] border-[var(--border)] text-[var(--text-primary)]"
              />
            </div>

            {/* Status Filter */}
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value as any })}
              className="px-3 py-2 border rounded-lg text-sm bg-[var(--bg-elevated)] border-[var(--border)]"
            >
              <option value="ALL">Tous les statuts</option>
              <option value="ACTIVE">Actifs</option>
              <option value="SUSPENDED">Suspendus</option>
              <option value="INACTIVE">Inactifs</option>
            </select>

            {/* Sort */}
            <select
              value={`${filters.sortBy}-${filters.sortOrder}`}
              onChange={(e) => {
                const [sortBy, sortOrder] = e.target.value.split('-') as [
                  typeof filters.sortBy,
                  typeof filters.sortOrder,
                ];
                setFilters({ ...filters, sortBy, sortOrder });
              }}
              className="px-3 py-2 border rounded-lg text-sm bg-[var(--bg-elevated)] border-[var(--border)]"
            >
              <option value="name-asc">Nom A-Z</option>
              <option value="name-desc">Nom Z-A</option>
              <option value="clients-desc">Clients ↓</option>
              <option value="vehicles-desc">Véhicules ↓</option>
              <option value="mrr-desc">MRR ↓</option>
              <option value="createdAt-desc">Plus récent</option>
            </select>
          </div>

          <button
            onClick={handleCreateClick}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white text-sm font-bold rounded-lg hover:bg-[var(--primary-light)] transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            Nouveau Revendeur
          </button>
        </div>

        {/* Mobile Cards */}
        {isMobile && (
          <MobileCardList bordered={false}>
            {filteredResellers.length === 0 ? (
              <div className="px-6 py-12 text-center text-[var(--text-secondary)]">
                <Building2 className="w-12 h-12 mx-auto text-[var(--text-muted)] mb-4" />
                <p className="font-medium">Aucun revendeur trouvé</p>
              </div>
            ) : (
              sortedResellers.map((reseller) => {
                const stats = getResellerStats(reseller.id);
                return (
                  <MobileCard
                    key={reseller.id}
                    onClick={() => handleViewDetails(reseller)}
                    className="flex items-start justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                        {(reseller.slug || reseller.name.substring(0, 2)).toUpperCase().substring(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-[var(--text-primary)] text-sm truncate">{reseller.name}</p>
                        <p className="text-xs text-[var(--primary)] truncate">{reseller.email}</p>
                        <div className="mt-0.5 flex items-center gap-2 text-[10px] text-[var(--text-secondary)]">
                          <span>
                            <span className="font-bold text-[var(--text-primary)]">{stats.clientCount}</span> clients
                          </span>
                          <span>
                            <span className="font-bold text-[var(--text-primary)]">{stats.vehicleCount}</span> véh.
                          </span>
                          <span className="font-mono font-bold text-[var(--text-primary)]">
                            {formatMoney(stats.mrr)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      {getStatusBadge(reseller.status)}
                      <button
                        onClick={() => handleEditClick(reseller)}
                        className="p-1.5 text-[var(--text-muted)] hover:text-[var(--primary)] rounded"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  </MobileCard>
                );
              })
            )}
          </MobileCardList>
        )}

        {/* Table — desktop only */}
        {!isMobile && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--bg-elevated)] text-[var(--text-secondary)] uppercase font-bold text-xs border-t border-b border-[var(--border)]">
                <tr>
                  <SortableHeader
                    label="Revendeur"
                    sortKey="name"
                    currentSortKey={resellerSortConfig.key}
                    currentDirection={resellerSortConfig.direction}
                    onSort={handleResellerSort}
                  />
                  <SortableHeader
                    label="Slug"
                    sortKey="slug"
                    currentSortKey={resellerSortConfig.key}
                    currentDirection={resellerSortConfig.direction}
                    onSort={handleResellerSort}
                  />
                  <SortableHeader
                    label="Clients"
                    sortKey="clients"
                    currentSortKey={resellerSortConfig.key}
                    currentDirection={resellerSortConfig.direction}
                    onSort={handleResellerSort}
                    className="text-center"
                  />
                  <SortableHeader
                    label="Véhicules"
                    sortKey="vehicles"
                    currentSortKey={resellerSortConfig.key}
                    currentDirection={resellerSortConfig.direction}
                    onSort={handleResellerSort}
                    className="text-center"
                  />
                  <SortableHeader
                    label="MRR"
                    sortKey="mrr"
                    currentSortKey={resellerSortConfig.key}
                    currentDirection={resellerSortConfig.direction}
                    onSort={handleResellerSort}
                    className="text-right"
                  />
                  <SortableHeader
                    label="Statut"
                    sortKey="status"
                    currentSortKey={resellerSortConfig.key}
                    currentDirection={resellerSortConfig.direction}
                    onSort={handleResellerSort}
                  />
                  <SortableHeader
                    label="Créé le"
                    sortKey="createdAt"
                    currentSortKey={resellerSortConfig.key}
                    currentDirection={resellerSortConfig.direction}
                    onSort={handleResellerSort}
                  />
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filteredResellers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-[var(--text-secondary)]">
                      <Building2 className="w-12 h-12 mx-auto text-[var(--text-muted)] mb-4" />
                      <p className="font-medium">Aucun revendeur trouvé</p>
                      <p className="text-sm">Modifiez vos filtres ou créez un nouveau revendeur</p>
                    </td>
                  </tr>
                ) : (
                  sortedResellers.map((reseller) => {
                    const stats = getResellerStats(reseller.id);
                    return (
                      <tr
                        key={reseller.id}
                        className="tr-hover/50 cursor-pointer"
                        onClick={() => handleViewDetails(reseller)}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                              {(reseller.slug || reseller.name.substring(0, 2)).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-[var(--text-primary)]">{reseller.name}</div>
                              <div className="text-xs text-[var(--primary)]">{reseller.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <code className="text-xs bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] text-[var(--primary)] dark:text-[var(--primary)] px-2 py-1 rounded font-mono font-bold">
                            {reseller.slug || '-'}
                          </code>
                          <div className="text-xs text-[var(--text-muted)] mt-0.5 font-mono">
                            {reseller.tenantId?.substring(0, 15)}...
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="font-bold text-[var(--text-primary)]">{stats.clientCount}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="font-bold text-[var(--text-primary)]">{stats.vehicleCount}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="font-mono font-bold text-[var(--text-primary)]">
                            {formatMoney(stats.mrr)}
                          </span>
                        </td>
                        <td className="px-6 py-4">{getStatusBadge(reseller.status)}</td>
                        <td className="px-6 py-4 text-[var(--text-secondary)] text-xs">
                          {new Date(reseller.createdAt).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleImpersonate(reseller)}
                              className="p-1.5 text-[var(--primary)] hover:bg-[var(--primary-dim)] dark:hover:bg-[var(--primary-dim)]/20 rounded transition-colors"
                              title="Se connecter"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleEditClick(reseller)}
                              className="p-1.5 text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-[var(--primary-dim)] dark:hover:bg-[var(--primary-dim)]/20 rounded transition-colors"
                              title="Modifier"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            {reseller.status === 'ACTIVE' ? (
                              <button
                                onClick={() => handleStatusChange(reseller, 'SUSPENDED')}
                                className="p-1.5 text-[var(--text-muted)] hover:text-orange-600 hover:bg-[var(--clr-warning-dim)] rounded transition-colors"
                                title="Suspendre"
                              >
                                <Pause className="w-4 h-4" />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleStatusChange(reseller, 'ACTIVE')}
                                className="p-1.5 text-[var(--text-muted)] hover:text-green-600 hover:bg-[var(--clr-success-dim)] rounded transition-colors"
                                title="Réactiver"
                              >
                                <Play className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Drawer Dual-Mode (view/edit/create) */}
      <ResellerDrawerForm
        isOpen={isDrawerOpen}
        onClose={handleDrawerClose}
        reseller={selectedReseller}
        mode={drawerMode}
        onSubmit={handleFormSave}
        onModeChange={(mode) => setDrawerMode(mode)}
      />
      <ConfirmDialogComponent />
    </div>
  );
};

export default ResellersPanelV2;
