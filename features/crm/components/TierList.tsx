import React, { useState, useMemo } from 'react';
import type { Tier, TierType } from '../../../types';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { MobileCard, MobileCardList, MobileCardAction } from '../../../components/MobileCard';
import { useDataContext } from '../../../contexts/DataContext';
import { useToast } from '../../../contexts/ToastContext';
import { TOAST } from '../../../constants/toastMessages';
import { useCurrency } from '../../../hooks/useCurrency';
import { useConfirmDialog } from '../../../components/ConfirmDialog';
import { Card } from '../../../components/Card';
import { Pagination } from '../../../components/Pagination';
import { useTableSort } from '../../../hooks/useTableSort';
import { SortableHeader } from '../../../components/SortableHeader';
import {
  Trash2,
  X,
  Layers,
  Building2,
  LifeBuoy,
  FileText,
  Receipt,
  Wrench,
  CreditCard,
  MoreHorizontal,
  Mail,
  MessageSquare,
} from 'lucide-react';

export type TierQuickAction =
  | 'ticket'
  | 'devis'
  | 'facture'
  | 'intervention'
  | 'paiement'
  | 'mail'
  | 'sms'
  | 'fusionner';

interface TierListProps {
  type?: TierType | 'ALL';
  searchTerm?: string;
  onEdit: (tier: Tier) => void;
  onViewDetail?: (tier: Tier) => void;
  onQuickAction?: (tier: Tier, action: TierQuickAction) => void;
  filter?: (tier: Tier) => boolean;
  readOnly?: boolean;
  dateRange?: { start: string; end: string };
}

export const TierList: React.FC<TierListProps> = ({
  type = 'ALL',
  searchTerm = '',
  onEdit,
  onViewDetail,
  onQuickAction,
  filter,
  readOnly = false,
  dateRange,
}) => {
  const isMobile = useIsMobile();
  const { tiers, deleteTier, updateTier } = useDataContext();
  const { showToast } = useToast();
  const { formatPrice } = useCurrency();
  const { confirm, ConfirmDialogComponent } = useConfirmDialog();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const itemsPerPage = 15;

  // Filter Tiers by Type and Search Term
  const filteredTiers = useMemo(() => {
    return tiers.filter((t) => {
      if (type && type !== 'ALL' && t.type !== type) return false;
      if (filter && !filter(t)) return false;

      if (dateRange) {
        const date = new Date(t.createdAt).toISOString().split('T')[0];
        if (date < dateRange.start || date > dateRange.end) return false;
      }

      const searchLower = searchTerm.toLowerCase();
      return (
        t.name.toLowerCase().includes(searchLower) ||
        t.email?.toLowerCase().includes(searchLower) ||
        t.contactName?.toLowerCase().includes(searchLower)
      );
    });
  }, [tiers, type, searchTerm, filter, dateRange]);

  // Sort
  const { sortedItems: sortedTiers, sortConfig, handleSort } = useTableSort(filteredTiers);

  // Pagination
  const totalPages = Math.ceil(sortedTiers.length / itemsPerPage);
  const paginatedTiers = sortedTiers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Selection Handlers
  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleSelectAll = () => {
    if (paginatedTiers.every((t) => selectedIds.has(t.id))) {
      const newSet = new Set(selectedIds);
      paginatedTiers.forEach((t) => newSet.delete(t.id));
      setSelectedIds(newSet);
    } else {
      const newSet = new Set(selectedIds);
      paginatedTiers.forEach((t) => newSet.add(t.id));
      setSelectedIds(newSet);
    }
  };

  const isAllSelected = paginatedTiers.length > 0 && paginatedTiers.every((t) => selectedIds.has(t.id));

  // Bulk Actions
  const handleBulkAction = async (action: string) => {
    const selectedTiers = tiers.filter((t) => selectedIds.has(t.id));
    if (selectedTiers.length === 0) {
      showToast(TOAST.CRM.BATCH_EMPTY_SELECTION, 'warning');
      return;
    }

    try {
      switch (action) {
        case 'mark_inactive':
          for (const tier of selectedTiers) {
            await updateTier({ ...tier, status: 'INACTIVE' });
          }
          showToast(TOAST.CRM.TIER_BATCH_DEACTIVATED(selectedTiers.length), 'success');
          break;
        case 'mark_active':
          for (const tier of selectedTiers) {
            await updateTier({ ...tier, status: 'ACTIVE' });
          }
          showToast(TOAST.CRM.TIER_BATCH_ACTIVATED(selectedTiers.length), 'success');
          break;
        case 'delete':
          if (
            await confirm({
              message: `Supprimer ${selectedTiers.length} tiers ? Cette action est irréversible.`,
              variant: 'danger',
              title: 'Confirmer la suppression',
              confirmLabel: 'Supprimer',
            })
          ) {
            for (const tier of selectedTiers) {
              await deleteTier(tier.id);
            }
            showToast(TOAST.CRM.TIER_BATCH_DELETED(selectedTiers.length), 'success');
          }
          break;
      }
      setSelectedIds(new Set());
    } catch (error) {
      showToast(TOAST.CRM.BATCH_ERROR, 'error');
    }
  };

  const handleAction = (e: React.MouseEvent, tier: Tier, action: TierQuickAction) => {
    e.stopPropagation();
    setOpenMenuId(null);
    if (onQuickAction) {
      onQuickAction(tier, action);
    } else {
      showToast(TOAST.CRM.FEATURE_COMING_SOON(action), 'info');
    }
  };

  // Quick action items for the dropdown
  const quickActions: { action: TierQuickAction; label: string; icon: React.ElementType; color: string }[] = [
    {
      action: 'ticket',
      label: 'Créer un ticket',
      icon: LifeBuoy,
      color: 'text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20',
    },
    {
      action: 'devis',
      label: 'Créer un devis',
      icon: FileText,
      color: 'text-[var(--primary)] hover:bg-[var(--primary-dim)] dark:hover:bg-[var(--primary-dim)]/20',
    },
    {
      action: 'facture',
      label: 'Créer une facture',
      icon: Receipt,
      color: 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20',
    },
    {
      action: 'intervention',
      label: 'Créer une intervention',
      icon: Wrench,
      color: 'text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20',
    },
    {
      action: 'paiement',
      label: 'Enregistrer un paiement',
      icon: CreditCard,
      color: 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20',
    },
    {
      action: 'mail',
      label: 'Envoyer un e-mail',
      icon: Mail,
      color: 'text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-900/20',
    },
    {
      action: 'sms',
      label: 'Envoyer un SMS',
      icon: MessageSquare,
      color: 'text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20',
    },
    {
      action: 'fusionner',
      label: 'Fusionner',
      icon: Layers,
      color: 'text-[var(--text-secondary)] tr-hover',
    },
  ];

  const APP_BADGE: Record<string, { label: string; className: string }> = {
    TRACKYU: {
      label: 'TrackYu',
      className:
        'bg-[var(--primary-dim)] text-[var(--primary)] dark:bg-[var(--primary-dim)] dark:text-[var(--primary)]',
    },
    GPS51: { label: 'GPS51', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
    WHATSGPS: { label: 'WhatsGPS', className: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
    AUTRES: {
      label: 'Autres',
      className: 'bg-slate-100 text-[var(--text-secondary)] bg-[var(--bg-elevated)] dark:text-[var(--text-muted)]',
    },
  };

  // Dynamic Columns based on Type
  const renderSpecificColumns = (tier: Tier) => {
    switch (type) {
      case 'CLIENT': {
        const appKey = tier.application || 'TRACKYU';
        const appBadge = APP_BADGE[appKey] ?? APP_BADGE['AUTRES'];
        return (
          <>
            <td className="px-6 py-4 text-[var(--text-secondary)] text-sm">{tier.phone || '-'}</td>
            <td className="px-6 py-4 text-[var(--text-secondary)] text-sm text-center font-bold">
              {tier.clientData?.fleetSize || 0}
            </td>
            <td className="px-6 py-4 text-[var(--text-secondary)] text-sm">
              <span
                className={`px-2 py-1 rounded-full text-xs font-semibold ${
                  tier.clientData?.segment === 'VIP'
                    ? 'bg-purple-100 text-purple-700'
                    : tier.clientData?.segment === 'Grand Compte'
                      ? 'bg-[var(--primary-dim)] text-[var(--primary)]'
                      : 'bg-slate-100 text-[var(--text-secondary)]'
                }`}
              >
                {tier.clientData?.segment || 'Standard'}
              </span>
            </td>
            <td className="px-6 py-4 text-[var(--text-secondary)] text-sm">
              <span
                className={`px-2 py-1 rounded-full text-xs font-semibold ${appBadge.className}`}
                title={appKey === 'AUTRES' && tier.applicationDetail ? tier.applicationDetail : undefined}
              >
                {appKey === 'AUTRES' && tier.applicationDetail ? tier.applicationDetail : appBadge.label}
              </span>
            </td>
            <td className="px-6 py-4 text-sm text-right">
              <div className="flex flex-col items-end gap-1">
                <span
                  className={`font-mono font-semibold ${(tier.clientData?.balance || 0) < 0 ? 'text-red-600' : 'text-[var(--text-primary)]'}`}
                >
                  {formatPrice(tier.clientData?.balance || 0)}
                </span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase ${
                    (tier.clientData?.balance || 0) < 0
                      ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                  }`}
                >
                  {(tier.clientData?.balance || 0) < 0 ? 'Impayés' : 'A jour'}
                </span>
              </div>
            </td>
          </>
        );
      }
      case 'RESELLER':
        return (
          <>
            <td className="px-6 py-4 text-[var(--text-secondary)] text-sm">{tier.resellerData?.domain || '-'}</td>
            <td className="px-6 py-4 text-[var(--text-secondary)] text-sm text-center font-semibold">
              {tier.resellerData?.activeClients || 0}
            </td>
          </>
        );
      case 'SUPPLIER':
        return (
          <>
            <td className="px-6 py-4 text-[var(--text-secondary)] text-sm">{tier.supplierData?.category || '-'}</td>
            <td className="px-6 py-4 text-sm text-right">
              <div className="flex flex-col items-end gap-1">
                <span
                  className={`font-mono font-semibold ${(tier.supplierData?.balance || 0) < 0 ? 'text-orange-600' : 'text-[var(--text-primary)]'}`}
                >
                  {formatPrice(tier.supplierData?.balance || 0)}
                </span>
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full font-semibold uppercase ${
                    (tier.supplierData?.balance || 0) < 0
                      ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                  }`}
                >
                  {(tier.supplierData?.balance || 0) < 0 ? 'Solde Dû' : 'A jour'}
                </span>
              </div>
            </td>
          </>
        );
      default:
        return null;
    }
  };

  const getHeaders = () => {
    const common = [
      { key: 'name', label: 'Nom / Société', width: 'w-1/4' },
      { key: 'contactName', label: 'Contact', width: 'w-1/6' },
      { key: 'email', label: 'Email', width: 'w-1/6' },
    ];

    switch (type) {
      case 'CLIENT':
        return [
          ...common,
          { key: 'phone', label: 'Téléphone', width: 'w-1/12' },
          { key: 'clientData.fleetSize', label: 'Véhicules', width: 'w-1/12' },
          { key: 'clientData.segment', label: 'Segment', width: 'w-1/12' },
          { key: 'application', label: 'Application', width: 'w-1/12' },
          { key: 'clientData.balance', label: 'Solde', width: 'w-1/12' },
        ];
      case 'RESELLER':
        return [
          ...common,
          { key: 'resellerData.domain', label: 'Domaine', width: 'w-1/6' },
          { key: 'resellerData.activeClients', label: 'Clients', width: 'w-1/12' },
        ];
      case 'SUPPLIER':
        return [
          ...common,
          { key: 'supplierData.category', label: 'Catégorie', width: 'w-1/6' },
          { key: 'supplierData.balance', label: 'Solde', width: 'w-1/12' },
        ];
      default:
        return common;
    }
  };

  return (
    <Card className="flex-1 flex flex-col overflow-hidden border-[var(--border)] shadow-sm relative">
      {/* BULK ACTIONS BAR */}
      {selectedIds.size > 0 && (
        <div className="absolute top-0 left-0 right-0 h-14 bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] flex items-center justify-between px-4 z-20 animate-in fade-in slide-in-from-top-1 border-b border-[var(--primary)] dark:border-[var(--primary)] rounded-t-lg">
          <span className="text-sm font-bold text-[var(--primary)] dark:text-[var(--primary)]">
            {selectedIds.size} sélectionné(s)
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => handleBulkAction('mark_inactive')}
              className="text-xs bg-[var(--bg-elevated)] border border-[var(--border)] dark:border-[var(--primary)] text-[var(--primary)] dark:text-[var(--primary)] px-3 py-1.5 rounded shadow-sm hover:bg-[var(--primary-dim)] dark:hover:bg-[var(--primary-dim)] transition-colors flex items-center gap-1.5"
            >
              <X className="w-3 h-3" /> Désactiver
            </button>
            <button
              onClick={() => handleBulkAction('delete')}
              className="text-xs bg-[var(--bg-elevated)] border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 px-3 py-1.5 rounded shadow-sm hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-1.5"
            >
              <Trash2 className="w-3 h-3" /> Supprimer
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="p-1 hover:bg-[var(--primary-dim)] dark:hover:bg-[var(--primary-dim)] rounded text-[var(--primary)] dark:text-[var(--primary)]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {isMobile ? (
        <MobileCardList bordered={false}>
          {paginatedTiers.length === 0 ? (
            <div className="px-6 py-12 text-center text-[var(--text-muted)]">Aucun élément trouvé</div>
          ) : (
            paginatedTiers.map((tier) => {
              const borderColor =
                tier.type === 'CLIENT'
                  ? 'border-l-blue-500'
                  : tier.type === 'RESELLER'
                    ? 'border-l-purple-500'
                    : tier.type === 'SUPPLIER'
                      ? 'border-l-orange-500'
                      : 'border-l-green-500';
              const avatarBg =
                tier.type === 'CLIENT'
                  ? 'bg-[var(--primary-dim)]0'
                  : tier.type === 'RESELLER'
                    ? 'bg-purple-500'
                    : tier.type === 'SUPPLIER'
                      ? 'bg-orange-500'
                      : 'bg-green-500';
              const typeLabel =
                tier.type === 'CLIENT'
                  ? 'Client'
                  : tier.type === 'RESELLER'
                    ? 'Revendeur'
                    : tier.type === 'SUPPLIER'
                      ? 'Fournisseur'
                      : 'Prospect';
              const balance =
                tier.type === 'CLIENT'
                  ? (tier.clientData?.balance ?? null)
                  : tier.type === 'SUPPLIER'
                    ? (tier.supplierData?.balance ?? null)
                    : null;
              return (
                <MobileCard
                  key={tier.id}
                  borderColor={borderColor}
                  onClick={() => {
                    setOpenMenuId(null);
                    onViewDetail?.(tier);
                  }}
                >
                  {/* Primary: avatar + name + status */}
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0 ${avatarBg}`}
                    >
                      {(tier.name || '??').substring(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-[var(--text-primary)] truncate">{tier.name}</p>
                      <p className="text-xs text-[var(--text-secondary)] truncate">
                        {tier.email || tier.contactName || '—'}
                      </p>
                    </div>
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0 ${tier.status === 'ACTIVE' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-slate-100 text-[var(--text-secondary)] bg-[var(--bg-elevated)] dark:text-[var(--text-muted)]'}`}
                    >
                      {tier.status === 'ACTIVE' ? 'Actif' : 'Inactif'}
                    </span>
                  </div>
                  {/* Secondary: type + context data */}
                  <div className="flex items-center gap-2 text-xs mb-2 ml-10 flex-wrap">
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white ${avatarBg}`}>
                      {typeLabel}
                    </span>
                    {tier.type === 'CLIENT' && !!tier.clientData?.fleetSize && (
                      <span className="text-[var(--text-secondary)]">{tier.clientData.fleetSize} véh.</span>
                    )}
                    {tier.type === 'RESELLER' && tier.resellerData?.activeClients !== undefined && (
                      <span className="text-[var(--text-secondary)]">{tier.resellerData.activeClients} clients</span>
                    )}
                    {balance !== null && (
                      <span
                        className={`font-mono font-semibold ${balance < 0 ? 'text-red-500' : 'text-[var(--text-secondary)]'}`}
                      >
                        {formatPrice(balance)}
                      </span>
                    )}
                  </div>
                  {!readOnly && (
                    <div className="flex items-center gap-2 ml-10">
                      <MobileCardAction
                        color="blue"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(tier);
                        }}
                      >
                        Modifier
                      </MobileCardAction>
                    </div>
                  )}
                </MobileCard>
              );
            })
          )}
        </MobileCardList>
      ) : (
        <div className="flex-1 overflow-auto custom-scrollbar pb-16 lg:pb-0">
          <table className="w-full text-left border-collapse">
            <thead
              className={`bg-[var(--bg-elevated)] text-[var(--text-secondary)] sticky top-0 z-10 ${selectedIds.size > 0 ? 'opacity-0' : ''}`}
            >
              <tr>
                <th className="px-4 py-3 w-10 border-b border-[var(--border)]">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                    className="rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
                  />
                </th>
                {getHeaders().map((col) => (
                  <SortableHeader
                    key={col.key}
                    label={col.label}
                    sortKey={col.key}
                    currentSortKey={sortConfig.key}
                    currentDirection={sortConfig.direction}
                    onSort={handleSort}
                    className={col.width || ''}
                  />
                ))}
                {(!readOnly || onViewDetail) && (
                  <th className="px-6 py-3 text-xs font-bold uppercase border-b border-[var(--border)] text-right w-16">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] bg-[var(--bg-surface)]">
              {paginatedTiers.map((tier) => (
                <tr
                  key={tier.id}
                  onClick={() => {
                    setOpenMenuId(null);
                    onViewDetail?.(tier);
                  }}
                  className={`tr-hover/50 transition-colors cursor-pointer group ${selectedIds.has(tier.id) ? 'bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)]' : ''}`}
                >
                  <td
                    className="px-4 py-4"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelection(tier.id);
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(tier.id)}
                      onChange={() => {}}
                      className="rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
                    />
                  </td>

                  {/* Common Columns */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs ${
                          tier.type === 'CLIENT'
                            ? 'bg-[var(--primary-dim)]0'
                            : tier.type === 'RESELLER'
                              ? 'bg-purple-500'
                              : 'bg-orange-500'
                        }`}
                      >
                        {(tier.name || '??').substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-[var(--text-primary)] text-sm">{tier.name}</div>
                        <div className="text-xs text-[var(--text-muted)] font-mono">{tier.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-[var(--text-secondary)] text-sm">{tier.contactName || '-'}</td>
                  <td className="px-6 py-4 text-[var(--text-secondary)] text-sm">{tier.email || '-'}</td>

                  {/* Specific Columns */}
                  {renderSpecificColumns(tier)}

                  {/* Actions dropdown */}
                  {(!readOnly || onViewDetail) && (
                    <td className="px-6 py-4 text-right">
                      <div className="relative inline-block">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(openMenuId === tier.id ? null : tier.id);
                          }}
                          className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] rounded-lg transition-colors"
                          title="Actions rapides"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                        {openMenuId === tier.id && (
                          <>
                            <div
                              className="fixed inset-0 z-30"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(null);
                              }}
                            />
                            <div className="absolute right-0 top-full mt-1 w-56 bg-[var(--bg-elevated)] rounded-xl shadow-xl border border-[var(--border)] z-40 py-1 animate-in fade-in zoom-in-95 duration-150">
                              {quickActions.map(({ action, label, icon: Icon, color }) => (
                                <button
                                  key={action}
                                  onClick={(e) => handleAction(e, tier, action)}
                                  className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium transition-colors ${color}`}
                                >
                                  <Icon className="w-4 h-4 flex-shrink-0" />
                                  {label}
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {paginatedTiers.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-[var(--text-muted)]">
                    Aucun élément trouvé
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        className="p-3 border-t border-[var(--border)] bg-[var(--bg-surface)]"
      />
      <ConfirmDialogComponent />
    </Card>
  );
};
