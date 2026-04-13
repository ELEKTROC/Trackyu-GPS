import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Trash2, RotateCcw, Archive, Users, FileText, Building2, AlertTriangle, Search, RefreshCw } from 'lucide-react';
import { api } from '../../../../services/apiLazy';
import { useToast } from '../../../../contexts/ToastContext';
import { TOAST } from '../../../../constants/toastMessages';
import { logger } from '../../../../utils/logger';
import { useConfirmDialog } from '../../../../components/ConfirmDialog';

type EntityType = 'user' | 'contract' | 'tenant';
type SubTab = 'all' | EntityType;

// Local interfaces for trash items
interface TrashUser {
  id: string;
  name?: string;
  email?: string;
  role?: string;
  deleted_at?: string;
}

interface TrashContract {
  id: string;
  contract_number?: string;
  client_name?: string;
  vehicle_plate?: string;
  deleted_at?: string;
}

interface TrashTenant {
  id: string;
  name?: string;
  slug?: string;
  contact_email?: string;
  deleted_at?: string;
}

interface TrashData {
  users: TrashUser[];
  contracts: TrashContract[];
  tenants: TrashTenant[];
  totals: { users: number; contracts: number; tenants: number; total: number };
}

const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`rounded-xl border border-[var(--border)] p-5 ${className}`}>{children}</div>
);

export const TrashPanelV2: React.FC = () => {
  const { showToast } = useToast();
  const { confirm, ConfirmDialogComponent } = useConfirmDialog();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<TrashData>({
    users: [],
    contracts: [],
    tenants: [],
    totals: { users: 0, contracts: 0, tenants: 0, total: 0 },
  });
  const [subTab, setSubTab] = useState<SubTab>('all');
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchTrash = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.trash.list();
      setData(result);
    } catch (e) {
      logger.error('Failed to fetch trash:', e);
      showToast(TOAST.CRUD.ERROR_LOAD('corbeille'), 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrash();
  }, [fetchTrash]);

  const handleRestore = async (entityType: EntityType, id: string, label: string) => {
    const typeLabel = entityType === 'user' ? "l'utilisateur" : entityType === 'contract' ? 'le contrat' : 'le tenant';
    const ok = await confirm({
      title: "Restaurer l'élément",
      message: `Voulez-vous restaurer ${typeLabel} "${label}" ?`,
      confirmLabel: 'Restaurer',
      variant: 'info',
    });
    if (!ok) return;
    setActionLoading(`restore-${entityType}-${id}`);
    try {
      await api.trash.restore(entityType, id);
      showToast(`"${label}" restauré avec succès`, 'success');
      fetchTrash();
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'Erreur lors de la restauration';
      showToast(errorMessage, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePermanentDelete = async (entityType: EntityType, id: string, label: string) => {
    const typeLabel = entityType === 'user' ? "l'utilisateur" : entityType === 'contract' ? 'le contrat' : 'le tenant';
    const ok = await confirm({
      title: 'Suppression définitive',
      message: `⚠️ Cette action est IRRÉVERSIBLE.\nSupprimer définitivement ${typeLabel} "${label}" ?`,
      confirmLabel: 'Supprimer définitivement',
      variant: 'danger',
    });
    if (!ok) return;
    setActionLoading(`delete-${entityType}-${id}`);
    try {
      await api.trash.permanentDelete(entityType, id);
      showToast(`"${label}" supprimé définitivement`, 'success');
      fetchTrash();
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'Erreur lors de la suppression';
      showToast(errorMessage, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // Filter items by search
  const filteredUsers = useMemo(() => {
    if (!search) return data.users;
    const q = search.toLowerCase();
    return data.users.filter(
      (u: TrashUser) =>
        u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.role?.toLowerCase().includes(q)
    );
  }, [data.users, search]);

  const filteredContracts = useMemo(() => {
    if (!search) return data.contracts;
    const q = search.toLowerCase();
    return data.contracts.filter(
      (c: TrashContract) =>
        c.contract_number?.toLowerCase().includes(q) ||
        c.client_name?.toLowerCase().includes(q) ||
        c.vehicle_plate?.toLowerCase().includes(q)
    );
  }, [data.contracts, search]);

  const filteredTenants = useMemo(() => {
    if (!search) return data.tenants;
    const q = search.toLowerCase();
    return data.tenants.filter(
      (t: TrashTenant) =>
        t.name?.toLowerCase().includes(q) ||
        t.slug?.toLowerCase().includes(q) ||
        t.contact_email?.toLowerCase().includes(q)
    );
  }, [data.tenants, search]);

  const subTabs: { id: SubTab; label: string; icon: React.ElementType; count: number; color: string }[] = [
    { id: 'all', label: 'Tout', icon: Archive, count: data.totals.total, color: 'slate' },
    { id: 'user', label: 'Utilisateurs', icon: Users, count: data.totals.users, color: 'blue' },
    { id: 'contract', label: 'Contrats', icon: FileText, count: data.totals.contracts, color: 'amber' },
    { id: 'tenant', label: 'Tenants', icon: Building2, count: data.totals.tenants, color: 'purple' },
  ];

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const ActionButtons: React.FC<{ entityType: EntityType; id: string; label: string }> = ({
    entityType,
    id,
    label,
  }) => (
    <div className="flex items-center justify-end gap-2">
      <button
        onClick={() => handleRestore(entityType, id, label)}
        disabled={actionLoading === `restore-${entityType}-${id}`}
        className="px-3 py-1.5 text-xs font-medium text-green-600 bg-green-50 hover:bg-[var(--clr-success-muted)] dark:hover:bg-green-900/40 rounded-lg flex items-center gap-1 transition-colors disabled:opacity-50"
        title="Restaurer"
      >
        <RotateCcw className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Restaurer</span>
      </button>
      <button
        onClick={() => handlePermanentDelete(entityType, id, label)}
        disabled={actionLoading === `delete-${entityType}-${id}`}
        className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-[var(--clr-danger-muted)] dark:hover:bg-red-900/40 rounded-lg flex items-center gap-1 transition-colors disabled:opacity-50"
        title="Supprimer définitivement"
      >
        <Trash2 className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Supprimer</span>
      </button>
    </div>
  );

  const renderUsersTable = () => {
    if (filteredUsers.length === 0) return null;
    return (
      <Card className="bg-[var(--bg-elevated)]">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-[var(--primary)]" />
          <h3 className="text-base font-semibold text-[var(--text-primary)]">Utilisateurs</h3>
          <span className="px-2 py-0.5 bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] text-[var(--primary)] dark:text-[var(--primary)] rounded-full text-xs font-medium">
            {filteredUsers.length}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left py-3 px-4 text-xs font-semibold text-[var(--text-secondary)] uppercase">
                  Utilisateur
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-[var(--text-secondary)] uppercase">
                  Rôle
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-[var(--text-secondary)] uppercase hidden md:table-cell">
                  Supprimé le
                </th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-[var(--text-secondary)] uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u: TrashUser) => (
                <tr
                  key={`user-${u.id}`}
                  className="border-b border-[var(--border)] border-[var(--border)]/50 hover:bg-[var(--bg-elevated)]/30"
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[var(--clr-danger-muted)] flex items-center justify-center text-[var(--clr-danger)] text-sm font-bold shrink-0">
                        {u.name?.charAt(0) || '?'}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-[var(--text-primary)] text-sm line-through opacity-70 truncate">
                          {u.name}
                        </p>
                        <p className="text-xs text-[var(--text-secondary)] truncate">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--bg-elevated)] text-[var(--text-secondary)]">
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3 px-4 hidden md:table-cell text-sm text-[var(--text-secondary)]">
                    {formatDate(u.deleted_at ?? null)}
                  </td>
                  <td className="py-3 px-4">
                    <ActionButtons entityType="user" id={u.id} label={u.name || u.email || ''} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    );
  };

  const renderContractsTable = () => {
    if (filteredContracts.length === 0) return null;
    return (
      <Card className="bg-[var(--bg-elevated)]">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-amber-500" />
          <h3 className="text-base font-semibold text-[var(--text-primary)]">Contrats</h3>
          <span className="px-2 py-0.5 bg-[var(--clr-caution-muted)] text-[var(--clr-caution)] rounded-full text-xs font-medium">
            {filteredContracts.length}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left py-3 px-4 text-xs font-semibold text-[var(--text-secondary)] uppercase">
                  N° Contrat
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-[var(--text-secondary)] uppercase">
                  Client
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-[var(--text-secondary)] uppercase hidden sm:table-cell">
                  Véhicule
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-[var(--text-secondary)] uppercase hidden md:table-cell">
                  Supprimé le
                </th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-[var(--text-secondary)] uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredContracts.map((c: TrashContract) => (
                <tr
                  key={`contract-${c.id}`}
                  className="border-b border-[var(--border)] border-[var(--border)]/50 hover:bg-[var(--bg-elevated)]/30"
                >
                  <td className="py-3 px-4">
                    <span className="font-medium text-[var(--text-primary)] text-sm line-through opacity-70">
                      {c.contract_number || `#${c.id?.slice(0, 8)}`}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-[var(--text-secondary)]">{c.client_name || '-'}</td>
                  <td className="py-3 px-4 hidden sm:table-cell text-sm text-[var(--text-secondary)]">
                    {c.vehicle_plate || '-'}
                  </td>
                  <td className="py-3 px-4 hidden md:table-cell text-sm text-[var(--text-secondary)]">
                    {formatDate(c.deleted_at ?? null)}
                  </td>
                  <td className="py-3 px-4">
                    <ActionButtons
                      entityType="contract"
                      id={c.id}
                      label={c.contract_number || `Contrat #${c.id?.slice(0, 8)}`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    );
  };

  const renderTenantsTable = () => {
    if (filteredTenants.length === 0) return null;
    return (
      <Card className="bg-[var(--bg-elevated)]">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="w-5 h-5 text-purple-500" />
          <h3 className="text-base font-semibold text-[var(--text-primary)]">Tenants / Organisations</h3>
          <span className="px-2 py-0.5 bg-[var(--clr-info-muted)] text-[var(--clr-info)] rounded-full text-xs font-medium">
            {filteredTenants.length}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left py-3 px-4 text-xs font-semibold text-[var(--text-secondary)] uppercase">
                  Nom
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-[var(--text-secondary)] uppercase hidden sm:table-cell">
                  Slug
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-[var(--text-secondary)] uppercase hidden md:table-cell">
                  Contact
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-[var(--text-secondary)] uppercase hidden md:table-cell">
                  Supprimé le
                </th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-[var(--text-secondary)] uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredTenants.map((t: TrashTenant) => (
                <tr
                  key={`tenant-${t.id}`}
                  className="border-b border-[var(--border)] border-[var(--border)]/50 hover:bg-[var(--bg-elevated)]/30"
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[var(--clr-info-muted)] flex items-center justify-center text-[var(--clr-info)] text-sm font-bold shrink-0">
                        {t.name?.charAt(0) || '?'}
                      </div>
                      <span className="font-medium text-[var(--text-primary)] text-sm line-through opacity-70">
                        {t.name}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 hidden sm:table-cell text-sm text-[var(--text-secondary)]">
                    {t.slug || '-'}
                  </td>
                  <td className="py-3 px-4 hidden md:table-cell text-sm text-[var(--text-secondary)]">
                    {t.contact_email || '-'}
                  </td>
                  <td className="py-3 px-4 hidden md:table-cell text-sm text-[var(--text-secondary)]">
                    {formatDate(t.deleted_at ?? null)}
                  </td>
                  <td className="py-3 px-4">
                    <ActionButtons entityType="tenant" id={t.id} label={t.name || t.slug || ''} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    );
  };

  const hasNoItems = data.totals.total === 0;
  const hasNoFilteredItems =
    filteredUsers.length === 0 && filteredContracts.length === 0 && filteredTenants.length === 0;

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[var(--clr-danger-muted)] rounded-lg">
            <Archive className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">Corbeille globale</h2>
            <p className="text-sm text-[var(--text-secondary)]">Éléments supprimés de toute l'application</p>
          </div>
        </div>
        <button
          onClick={fetchTrash}
          disabled={loading}
          className="px-4 py-2 text-sm bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)] rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </button>
      </div>

      {/* KPI counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {subTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSubTab(tab.id)}
            className={`p-3 rounded-xl border transition-all text-left ${
              subTab === tab.id
                ? 'border-red-300 dark:border-red-700 bg-[var(--clr-danger-dim)] ring-1 ring-red-200 dark:ring-red-800'
                : 'border-[var(--border)] bg-[var(--bg-elevated)] hover:border-[var(--border)]'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <tab.icon className={`w-4 h-4 ${subTab === tab.id ? 'text-red-500' : 'text-[var(--text-muted)]'}`} />
              <span className="text-xs text-[var(--text-secondary)] font-medium">{tab.label}</span>
            </div>
            <p
              className={`text-xl font-bold ${subTab === tab.id ? 'text-[var(--clr-danger)]' : 'text-[var(--text-primary)]'}`}
            >
              {tab.count}
            </p>
          </button>
        ))}
      </div>

      {/* Search */}
      {!hasNoItems && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Rechercher dans la corbeille..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-elevated)] text-sm text-[var(--text-primary)] placeholder-slate-400 focus:ring-2 focus:ring-red-200 dark:focus:ring-red-800 focus:border-red-300 dark:focus:border-red-700 outline-none transition"
          />
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-500"></div>
        </div>
      ) : hasNoItems ? (
        <Card className="bg-[var(--bg-elevated)]">
          <div className="text-center py-16 text-[var(--text-secondary)]">
            <Archive className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p className="text-lg font-semibold mb-1">La corbeille est vide</p>
            <p className="text-sm">Les éléments supprimés (utilisateurs, contrats, tenants) apparaîtront ici</p>
          </div>
        </Card>
      ) : hasNoFilteredItems ? (
        <Card className="bg-[var(--bg-elevated)]">
          <div className="text-center py-12 text-[var(--text-secondary)]">
            <Search className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-base font-medium">Aucun résultat</p>
            <p className="text-sm">Aucun élément supprimé ne correspond à "{search}"</p>
          </div>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Warning banner */}
          <div className="flex items-start gap-3 p-3 bg-[var(--clr-caution-dim)] border border-[var(--clr-caution-border)] rounded-lg">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-sm text-[var(--clr-caution-strong)]">
              La suppression définitive est <strong>irréversible</strong>. Les éléments restaurés retrouveront leur état
              précédent.
            </p>
          </div>

          {(subTab === 'all' || subTab === 'user') && renderUsersTable()}
          {(subTab === 'all' || subTab === 'contract') && renderContractsTable()}
          {(subTab === 'all' || subTab === 'tenant') && renderTenantsTable()}
        </div>
      )}

      <ConfirmDialogComponent />
    </div>
  );
};
