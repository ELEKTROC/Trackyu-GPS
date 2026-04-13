import React, { useState, useMemo, useRef, useEffect, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { useIsMobile } from '../../../hooks/useIsMobile';
import {
  Calendar,
  Map as MapIcon,
  Table,
  PieChart,
  Filter,
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  Box,
  ClipboardCheck,
  Users,
  Wrench,
  CheckCircle,
  Clock,
  Activity,
  ArrowRightLeft,
} from 'lucide-react';
import { Card } from '../../../components/Card';
import { Modal } from '../../../components/Modal';
import { Tabs } from '../../../components/Tabs';
import type { Intervention, DeviceStock } from '../../../types';
import { useDataContext } from '../../../contexts/DataContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import { TOAST } from '../../../constants/toastMessages';
import { TechRadarMap } from './TechRadarMap';
import { TechStats } from './TechStats';
import { InterventionList } from './InterventionList';
import { InterventionPlanning } from './InterventionPlanning';
import { InterventionForm } from './InterventionForm';
const InterventionDetailModal = React.lazy(() =>
  import('../../agenda/components/partials/InterventionDetailModal').then((m) => ({
    default: m.InterventionDetailModal,
  }))
);
import { TechTeamView } from './TechTeamView';
// TechSettingsPanel supprimé - configuration via Tickets > Configuration
import { useInterventionFilter } from '../hooks/useInterventionFilter';
import { INTERVENTION_STATUSES } from '../constants';
import { useInterventionTypes } from '../../../hooks/useInterventionTypes';
import { useTableSort } from '../../../hooks/useTableSort';
import { SortableHeader } from '../../../components/SortableHeader';
import { MobileTabLayout } from '../../../components/MobileTabLayout';
import { useMobileViewTabs } from '../../../hooks/useMobileViewTabs';
// recharts charts moved to TechStats.tsx

const STOCK_STATUS_LABELS: Record<string, { label: string; bg: string; text: string }> = {
  IN_STOCK: { label: 'Disponible', bg: 'bg-green-100', text: 'text-green-700' },
  INSTALLED: { label: 'Installé', bg: 'bg-[var(--primary-dim)]', text: 'text-[var(--primary)]' },
  RMA: { label: 'En SAV', bg: 'bg-red-100', text: 'text-red-700' },
  RMA_PENDING: { label: 'SAV en attente', bg: 'bg-orange-100', text: 'text-orange-700' },
  SENT_TO_SUPPLIER: { label: 'Envoyé fournisseur', bg: 'bg-purple-100', text: 'text-purple-700' },
  REPLACED_BY_SUPPLIER: { label: 'Remplacé', bg: 'bg-teal-100', text: 'text-teal-700' },
  SCRAPPED: { label: 'Mis au rebut', bg: 'bg-[var(--bg-elevated)]', text: 'text-[var(--text-secondary)]' },
  LOST: { label: 'Perdu', bg: 'bg-red-200', text: 'text-red-800' },
  REMOVED: { label: 'Retiré', bg: 'bg-yellow-100', text: 'text-yellow-700' },
};

const getStockStatusStyle = (status: string) => {
  return (
    STOCK_STATUS_LABELS[status] || { label: status, bg: 'bg-[var(--bg-elevated)]', text: 'text-[var(--text-primary)]' }
  );
};

const TECH_TABS = [
  {
    id: 'OVERVIEW',
    label: "Vue d'ensemble",
    icon: PieChart,
    color: 'bg-purple-500',
    description: 'Statistiques et KPIs',
  },
  {
    id: 'LIST',
    label: 'Liste',
    icon: Table,
    color: 'bg-[var(--primary-dim)]0',
    description: 'Toutes les interventions',
  },
  {
    id: 'PLANNING',
    label: 'Planning',
    icon: Calendar,
    color: 'bg-orange-500',
    description: 'Calendrier des interventions',
  },
  { id: 'MAP', label: 'Radar', icon: MapIcon, color: 'bg-teal-500', description: 'Carte des techniciens' },
  { id: 'STOCK', label: 'Stock', icon: Box, color: 'bg-amber-500', description: 'Gestion du matériel' },
  {
    id: 'TEAM',
    label: 'Équipe',
    icon: Users,
    color: 'bg-[var(--text-secondary)]',
    description: 'Gestion des techniciens',
  },
];

// Mobile: TECH role only sees LIST, STOCK, TEAM (no OVERVIEW/PLANNING/Radar)
const TECH_MOBILE_HIDDEN = new Set(['OVERVIEW', 'PLANNING', 'MAP']);

interface TechViewProps {
  initialViewMode?: 'LIST' | 'PLANNING' | 'MAP' | 'STATS' | 'HISTORY' | 'STOCK' | 'TEAM';
}

export const TechView: React.FC<TechViewProps> = ({ initialViewMode = 'LIST' }) => {
  const isMobile = useIsMobile();
  const {
    interventions,
    updateIntervention,
    deleteIntervention,
    addIntervention,
    users,
    stock,
    updateDevice,
    tiers,
    tickets,
    updateTicket,
  } = useDataContext();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { types: interventionTypes } = useInterventionTypes();

  // KPI Calculation
  const kpis = useMemo(() => {
    const totalInterventions = interventions.length;
    const completedInterventions = interventions.filter((i) => i.status === 'COMPLETED').length;
    const pendingInterventions = interventions.filter((i) => i.status === 'PENDING' || i.status === 'SCHEDULED').length;
    const inProgressInterventions = interventions.filter(
      (i) => i.status === 'IN_PROGRESS' || i.status === 'EN_ROUTE'
    ).length;

    // Calcul temps moyen réel basé sur duration des interventions terminées
    const completedWithDuration = interventions.filter((i) => i.status === 'COMPLETED' && i.duration && i.duration > 0);
    let avgResolutionTime = '-';
    if (completedWithDuration.length > 0) {
      const avgMinutes =
        completedWithDuration.reduce((sum, i) => sum + (i.duration || 0), 0) / completedWithDuration.length;
      const hours = Math.floor(avgMinutes / 60);
      const mins = Math.round(avgMinutes % 60);
      avgResolutionTime = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    }

    return {
      total: totalInterventions,
      completed: completedInterventions,
      pending: pendingInterventions,
      inProgress: inProgressInterventions,
      avgTime: avgResolutionTime,
    };
  }, [interventions]);

  // DERIVED STATE
  // Techniciens: filtre par rôle TECHNICIAN (anglais) ou Technicien (français)
  const technicians = useMemo(() => {
    const techs = users.filter((u) => {
      const role = u.role?.toLowerCase() || '';
      return role === 'technician' || role === 'technicien' || role.includes('tech');
    });
    // Si aucun technicien trouvé, créer une entrée "Non assigné" pour afficher les interventions sans technicien
    if (techs.length === 0) {
      return [
        { id: 'unassigned', name: 'Non assigné', email: '', role: 'TECHNICIAN' } as unknown as (typeof users)[number],
      ];
    }
    return techs;
  }, [users]);

  // STOCK SEARCH STATE (must be declared before useMemo that uses it)
  const [stockSearch, setStockSearch] = useState('');
  const [stockTypeFilter, setStockTypeFilter] = useState('ALL');
  const [stockPage, setStockPage] = useState(1);
  const [stockItemsPerPage, setStockItemsPerPage] = useState(15);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferTarget, setTransferTarget] = useState<DeviceStock | null>(null);
  const [transferTechId, setTransferTechId] = useState('');

  // STOCK STATE
  const myStock = useMemo(() => {
    const role = user?.role?.toLowerCase() || '';
    const isTech = role === 'technician' || role === 'technicien' || role.includes('tech');
    if (isTech) {
      return stock.filter((s) => s.technicianId === user?.id && s.location === 'TECH');
    }
    // Admins/managers see all stock
    return stock;
  }, [stock, user]);

  const filteredMyStock = useMemo(() => {
    return myStock.filter(
      (s) =>
        s.transferStatus !== 'PENDING_RECEIPT' &&
        (stockTypeFilter === 'ALL' || s.type === stockTypeFilter) &&
        (stockSearch === '' ||
          s.model.toLowerCase().includes(stockSearch.toLowerCase()) ||
          (s.serialNumber && s.serialNumber.toLowerCase().includes(stockSearch.toLowerCase())) ||
          (s.imei && s.imei.toLowerCase().includes(stockSearch.toLowerCase())) ||
          (s.iccid && s.iccid.toLowerCase().includes(stockSearch.toLowerCase())))
    );
  }, [myStock, stockSearch, stockTypeFilter]);

  // Reset page when filters change
  useEffect(() => {
    setStockPage(1);
  }, [stockSearch, stockTypeFilter]);

  // Stock type options (derived from data)
  const stockTypes = useMemo(() => {
    const types = new Set(myStock.map((s) => s.type));
    return Array.from(types).sort();
  }, [myStock]);

  const {
    sortedItems: sortedMyStock,
    sortConfig: stockSortConfig,
    handleSort: handleStockSort,
  } = useTableSort(filteredMyStock, { key: 'model', direction: 'asc' });

  // Paginated stock (must be after useTableSort)
  const totalStockPages = Math.max(1, Math.ceil(sortedMyStock.length / stockItemsPerPage));
  const paginatedStock = sortedMyStock.slice((stockPage - 1) * stockItemsPerPage, stockPage * stockItemsPerPage);

  const pendingStock = useMemo(() => {
    const role = user?.role?.toLowerCase() || '';
    const isTech = role === 'technician' || role === 'technicien' || role.includes('tech');
    if (isTech) {
      return stock.filter((s) => s.technicianId === user?.id && s.transferStatus === 'PENDING_RECEIPT');
    }
    return stock.filter((s) => s.transferStatus === 'PENDING_RECEIPT');
  }, [stock, user]);

  // HISTORY STATE (Derived from Interventions)
  const historyLogs = useMemo(() => {
    const logs: { id: string; date: string; interventionId: string; user: string; action: string; details: string }[] =
      [];

    interventions.forEach((int) => {
      // Creation Log
      logs.push({
        id: `${int.id}-created`,
        date: int.createdAt,
        interventionId: int.id,
        user: 'Système',
        action: 'CREATION',
        details: `Nouvelle intervention : ${int.type}`,
      });

      // Status Log
      if (int.status !== 'PENDING') {
        logs.push({
          id: `${int.id}-status`,
          date: int.scheduledDate,
          interventionId: int.id,
          user: technicians.find((t) => t.id === int.technicianId)?.name || 'Technicien',
          action: int.status,
          details: `Statut: ${int.status}`,
        });
      }
    });

    return logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [interventions, technicians]);

  const HISTORY_SORT_ACCESSORS: Record<
    string,
    (l: { id: string; date: string; interventionId: string; user: string; action: string; details: string }) => string
  > = {
    date: (l) => l.date,
    ref: (l) => l.interventionId,
    user: (l) => l.user,
    action: (l) => l.action,
    details: (l) => l.details,
  };

  const {
    sortedItems: sortedHistory,
    sortConfig: historySortConfig,
    handleSort: handleHistorySort,
  } = useTableSort(historyLogs, { key: 'date', direction: 'desc' }, HISTORY_SORT_ACCESSORS);

  // VIEW STATE
  const isTechRole = user?.role?.toUpperCase() === 'TECH' || user?.role?.toLowerCase().includes('tech');
  const { filterTabsForView } = useMobileViewTabs();

  const visibleTechTabs = useMemo(() => {
    const baseTabs = isMobile ? TECH_TABS.filter((t) => !TECH_MOBILE_HIDDEN.has(t.id)) : TECH_TABS;
    return isMobile ? filterTabsForView('techView', baseTabs) : baseTabs;
  }, [isMobile, filterTabsForView]);

  const [viewMode, setViewMode] = useState<
    'LIST' | 'PLANNING' | 'MAP' | 'STATS' | 'HISTORY' | 'STOCK' | 'TEAM' | 'OVERVIEW' | 'CONFIG'
  >(initialViewMode);

  useEffect(() => {
    if (initialViewMode) setViewMode(initialViewMode);
  }, [initialViewMode]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedIntervention, setSelectedIntervention] = useState<Intervention | null>(null);

  // FILTER STATE (Using Hook)
  const { filterTech, setFilterTech, filterStatus, setFilterStatus, filterType, setFilterType, filteredInterventions } =
    useInterventionFilter(interventions);

  const [mobileKpiFilter, setMobileKpiFilter] = useState<'pending' | 'in_progress' | 'completed' | null>(null);

  const mobileKpiFilteredInterventions = useMemo(() => {
    if (!mobileKpiFilter) return filteredInterventions;
    if (mobileKpiFilter === 'pending')
      return filteredInterventions.filter((i) => i.status === 'PENDING' || i.status === 'SCHEDULED');
    if (mobileKpiFilter === 'in_progress')
      return filteredInterventions.filter((i) => i.status === 'IN_PROGRESS' || i.status === 'EN_ROUTE');
    if (mobileKpiFilter === 'completed') return filteredInterventions.filter((i) => i.status === 'COMPLETED');
    return filteredInterventions;
  }, [filteredInterventions, mobileKpiFilter]);

  // On mobile, TECH role → auto-filter to current user's interventions
  useEffect(() => {
    if (isMobile && isTechRole && user?.id) {
      setFilterTech(user.id);
    }
  }, [isMobile, isTechRole, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const filterMenuRef = useRef<HTMLDivElement>(null);

  // PAGINATION STATE
  const [historyPage, setHistoryPage] = useState(1);
  const [historyItemsPerPage, setHistoryItemsPerPage] = useState(15);

  // AUDIT STATE
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [auditItems, setAuditItems] = useState<Set<string>>(new Set());

  // stockSearch declared above (before filteredMyStock useMemo)

  // Click Outside Handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterMenuRef.current && !filterMenuRef.current.contains(event.target as Node)) {
        setIsFilterMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- ACTIONS ---
  const handleAcceptTransfer = (item: DeviceStock) => {
    updateDevice({
      ...item,
      transferStatus: 'NONE',
    });
    showToast(TOAST.TECH.TRANSFER_RECEIVED, 'success');
  };

  const handleRejectTransfer = (item: DeviceStock) => {
    updateDevice({
      ...item,
      location: 'CENTRAL',
      technicianId: undefined,
      transferStatus: 'NONE',
    });
    showToast(TOAST.TECH.TRANSFER_REJECTED, 'info');
  };

  const handleTransfer = (item: DeviceStock) => {
    setTransferTarget(item);
    setTransferTechId('');
    setIsTransferModalOpen(true);
  };

  const handleConfirmTransfer = () => {
    if (!transferTarget || !transferTechId) return;
    updateDevice({
      ...transferTarget,
      technicianId: transferTechId,
      transferStatus: 'PENDING_RECEIPT',
      location: 'TECH',
    });
    showToast(TOAST.TECH.TRANSFER_INITIATED, 'success');
    setIsTransferModalOpen(false);
    setTransferTarget(null);
  };

  const renderStock = () => (
    <div className="flex-1 flex flex-col gap-4 overflow-hidden">
      {/* PENDING TRANSFERS */}
      {pendingStock.length > 0 && (
        <Card className="bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-orange-800 dark:text-orange-200 flex items-center gap-2">
              <Box className="w-5 h-5" /> Réceptions en attente ({pendingStock.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-orange-700 dark:text-orange-300 border-b border-orange-200 dark:border-orange-800">
                  <th className="pb-2">Type</th>
                  <th className="pb-2">Modèle</th>
                  <th className="pb-2">S/N</th>
                  <th className="pb-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingStock.map((item) => (
                  <tr key={item.id} className="border-b border-orange-100 dark:border-orange-800/50 last:border-0">
                    <td className="py-2">{item.type}</td>
                    <td className="py-2">{item.model}</td>
                    <td className="py-2 font-mono">{item.serialNumber || item.imei || item.iccid}</td>
                    <td className="py-2 text-right space-x-2">
                      <button
                        onClick={() => handleAcceptTransfer(item)}
                        className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                      >
                        Accepter
                      </button>
                      <button
                        onClick={() => handleRejectTransfer(item)}
                        className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                      >
                        Refuser
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* CURRENT STOCK */}
      {isMobile ? (
        /* ── MOBILE STOCK CARDS ── */
        <div className="flex-1 flex flex-col min-h-0">
          {/* Search + type filter */}
          <div className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-elevated)] border-b border-[var(--border)]">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Modèle, IMEI, S/N..."
                value={stockSearch}
                onChange={(e) => setStockSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[var(--bg-elevated)] border-0 rounded-lg text-sm focus:ring-2 focus:ring-[var(--primary)]"
              />
            </div>
            <select
              value={stockTypeFilter}
              onChange={(e) => setStockTypeFilter(e.target.value)}
              title="Type"
              className="px-2 py-2 text-xs border border-[var(--border)] rounded-lg bg-[var(--bg-elevated)]"
            >
              <option value="ALL">Tous</option>
              {stockTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <button
              onClick={() => setIsAuditModalOpen(true)}
              className="p-2 bg-[var(--primary)] text-white rounded-lg"
              title="Inventaire"
            >
              <ClipboardCheck className="w-4 h-4" />
            </button>
          </div>
          <div
            className="flex-1 overflow-y-auto p-3 pb-16 lg:pb-3 space-y-2"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {filteredMyStock.map((item) => {
              const s = getStockStatusStyle(item.status);
              const typeColor =
                item.type === 'BOX'
                  ? 'bg-[var(--primary-dim)] text-[var(--primary)] dark:bg-[var(--primary-dim)] dark:text-[var(--primary)]'
                  : item.type === 'SIM'
                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                    : item.type === 'SENSOR'
                      ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300'
                      : item.type === 'ACCESSORY'
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                        : 'bg-[var(--bg-elevated)] text-[var(--text-primary)] bg-[var(--bg-elevated)] text-[var(--text-secondary)]';
              return (
                <div
                  key={item.id}
                  className="bg-[var(--bg-elevated)] rounded-xl border border-[var(--border)] p-3 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${typeColor}`}>
                        {item.type}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${s.bg} ${s.text}`}>
                        {s.label}
                      </span>
                    </div>
                    <span className="text-[10px] text-[var(--text-muted)] shrink-0">
                      {item.entryDate ? new Date(item.entryDate).toLocaleDateString('fr-FR') : '-'}
                    </span>
                  </div>
                  <p className="font-bold text-sm text-[var(--text-primary)]">{item.model}</p>
                  <p className="font-mono text-xs text-[var(--text-secondary)] mt-0.5">
                    {item.serialNumber || item.imei || item.iccid || '-'}
                  </p>
                  {item.status === 'IN_STOCK' && (
                    <button
                      onClick={() => handleTransfer(item)}
                      className="mt-2 w-full py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1 hover:bg-indigo-700 active:scale-95 transition-all"
                    >
                      <ArrowRightLeft className="w-3 h-3" /> Transférer
                    </button>
                  )}
                </div>
              );
            })}
            {filteredMyStock.length === 0 && (
              <div className="text-center py-16 text-[var(--text-muted)]">
                <p className="font-medium">Aucun matériel</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ── DESKTOP STOCK TABLE ── */
        <Card
          className="flex-1 flex flex-col min-h-0 border-[var(--border)] p-0 overflow-hidden"
          title={
            <div className="flex items-center justify-between w-full gap-4">
              <span className="whitespace-nowrap">Mon Stock ({filteredMyStock.length})</span>
              <div className="flex items-center gap-2 flex-1 justify-end flex-wrap">
                <select
                  title="Filtrer par type"
                  value={stockTypeFilter}
                  onChange={(e) => setStockTypeFilter(e.target.value)}
                  className="px-2 py-1.5 text-xs border border-[var(--border)] rounded-lg bg-[var(--bg-elevated)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                >
                  <option value="ALL">Tous les types</option>
                  {stockTypes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <div className="relative max-w-xs w-full">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    placeholder="Rechercher (Modèle, IMEI, S/N)..."
                    value={stockSearch}
                    onChange={(e) => setStockSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs border border-[var(--border)] rounded-lg bg-[var(--bg-elevated)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>
                <button
                  onClick={() => setIsAuditModalOpen(true)}
                  className="px-3 py-1.5 bg-[var(--primary)] text-white text-xs rounded-lg hover:bg-[var(--primary-light)] flex items-center gap-2 whitespace-nowrap"
                >
                  <ClipboardCheck className="w-3 h-3" /> Inventaire
                </button>
              </div>
            </div>
          }
        >
          <div className="flex-1 overflow-auto custom-scrollbar pb-16 lg:pb-0">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead className="bg-[var(--bg-elevated)] border-b border-[var(--border)] sticky top-0 z-10">
                <tr>
                  <SortableHeader
                    label="Type"
                    sortKey="type"
                    currentSortKey={stockSortConfig.key}
                    currentDirection={stockSortConfig.direction}
                    onSort={handleStockSort}
                    className="section-title"
                  />
                  <SortableHeader
                    label="Modèle"
                    sortKey="model"
                    currentSortKey={stockSortConfig.key}
                    currentDirection={stockSortConfig.direction}
                    onSort={handleStockSort}
                    className="section-title"
                  />
                  <SortableHeader
                    label="S/N (IMEI/ICCID)"
                    sortKey="serialNumber"
                    currentSortKey={stockSortConfig.key}
                    currentDirection={stockSortConfig.direction}
                    onSort={handleStockSort}
                    className="section-title"
                  />
                  <SortableHeader
                    label="Statut"
                    sortKey="status"
                    currentSortKey={stockSortConfig.key}
                    currentDirection={stockSortConfig.direction}
                    onSort={handleStockSort}
                    className="section-title"
                  />
                  <SortableHeader
                    label="Date Entrée"
                    sortKey="receivedDate"
                    currentSortKey={stockSortConfig.key}
                    currentDirection={stockSortConfig.direction}
                    onSort={handleStockSort}
                    className="section-title"
                  />
                  <th className="px-4 py-2 text-xs font-bold text-[var(--text-secondary)] uppercase text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] text-sm">
                {paginatedStock.map((item) => (
                  <tr key={item.id} className="density-row tr-hover/50">
                    <td className="px-4 py-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${item.type === 'BOX' ? 'bg-[var(--primary-dim)] text-[var(--primary)]' : item.type === 'SIM' ? 'bg-purple-100 text-purple-700' : item.type === 'SENSOR' ? 'bg-teal-100 text-teal-700' : item.type === 'ACCESSORY' ? 'bg-amber-100 text-amber-700' : 'bg-[var(--bg-elevated)] text-[var(--text-primary)]'}`}
                      >
                        {item.type}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-[var(--text-primary)]">{item.model}</td>
                    <td className="px-4 py-2 font-mono text-[var(--text-secondary)] text-xs">
                      {item.serialNumber || item.imei || item.iccid}
                    </td>
                    <td className="px-4 py-2">
                      {(() => {
                        const s = getStockStatusStyle(item.status);
                        return (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${s.bg} ${s.text}`}>
                            {s.label}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-2 text-[var(--text-secondary)] text-xs">
                      {item.entryDate ? new Date(item.entryDate).toLocaleDateString('fr-FR') : '-'}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {item.status === 'IN_STOCK' && (
                        <button
                          onClick={() => handleTransfer(item)}
                          title="Transférer à un technicien"
                          className="px-2 py-1 bg-indigo-600 text-white rounded text-xs hover:bg-indigo-700 inline-flex items-center gap-1"
                        >
                          <ArrowRightLeft className="w-3 h-3" /> Transférer
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {paginatedStock.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-[var(--text-secondary)]">
                      Aucun matériel en stock.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {sortedMyStock.length > stockItemsPerPage && (
            <div className="p-3 border-t border-[var(--border)] bg-[var(--bg-elevated)] flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--text-secondary)]">Lignes par page:</span>
                <select
                  title="Lignes par page"
                  className="p-1 border border-[var(--border)] rounded text-xs bg-[var(--bg-surface)]"
                  value={stockItemsPerPage}
                  onChange={(e) => {
                    setStockItemsPerPage(Number(e.target.value));
                    setStockPage(1);
                  }}
                >
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
                <span className="text-xs text-[var(--text-secondary)] ml-2">
                  Page {stockPage} sur {totalStockPages} ({sortedMyStock.length} éléments)
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setStockPage((p) => Math.max(1, p - 1))}
                  disabled={stockPage === 1}
                  className="p-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded hover:bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setStockPage((p) => Math.min(totalStockPages, p + 1))}
                  disabled={stockPage === totalStockPages}
                  className="p-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded hover:bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );

  const handleEdit = (int: Intervention) => {
    // Enrichir l'intervention avec clientName et agentName pour le modal
    const client = tiers.find((t) => t.id === int.clientId);
    const technician = users.find((u) => u.id === int.technicianId);

    const enrichedIntervention = {
      ...int,
      clientName: client?.name || int.clientId || 'Client non défini',
      agentName: technician?.name || 'Non assigné',
      technicianPhone: technician?.phone,
      contactPhone: int.contactPhone || client?.phone || (client as typeof client & { mobile?: string })?.mobile,
    };

    setSelectedIntervention(enrichedIntervention);
    // Ouvrir le modal de détail en lecture seule
    setIsDetailModalOpen(true);
  };

  const handleOpenEditForm = () => {
    // Fermer le detail et ouvrir le formulaire d'édition
    setIsDetailModalOpen(false);
    setIsModalOpen(true);
  };

  const handleDepart = (int: Intervention) => {
    const updated = { ...int, status: 'EN_ROUTE' as const, enRouteTime: new Date().toISOString() };
    updateIntervention(updated);

    // SYNC TICKET - Passer le ticket en "En cours" quand le technicien part
    if (int.ticketId && updateTicket) {
      const ticket = tickets.find((t) => t.id === int.ticketId);
      if (ticket && ticket.status !== 'IN_PROGRESS' && ticket.status !== 'RESOLVED' && ticket.status !== 'CLOSED') {
        updateTicket({
          ...ticket,
          status: 'IN_PROGRESS',
          updatedAt: new Date(),
          startedAt: ticket.startedAt || new Date(),
        });
        showToast(TOAST.TECH.TICKET_LINKED('En Cours'), 'info');
      }
    }

    showToast(TOAST.TECH.TECH_EN_ROUTE, 'success');
  };

  const handleCreate = () => {
    setSelectedIntervention(null);
    setIsModalOpen(true);
  };

  const handleDelete = (ids: string[]) => {
    ids.forEach((id) => deleteIntervention(id));
    showToast(TOAST.CRUD.DELETED(`${ids.length} intervention(s)`), 'success');
  };

  const renderHistory = () => {
    const totalHistoryPages = Math.ceil(sortedHistory.length / historyItemsPerPage);
    const paginatedHistory = sortedHistory.slice(
      (historyPage - 1) * historyItemsPerPage,
      historyPage * historyItemsPerPage
    );
    return (
      <Card className="flex-1 flex flex-col min-h-0 p-0 overflow-hidden border-[var(--border)]">
        <div className="flex-1 overflow-auto custom-scrollbar pb-16 lg:pb-0">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead className="bg-[var(--bg-elevated)] border-b border-[var(--border)] sticky top-0 z-10">
              <tr>
                <SortableHeader
                  label="Date"
                  sortKey="date"
                  currentSortKey={historySortConfig.key}
                  currentDirection={historySortConfig.direction}
                  onSort={handleHistorySort}
                  className="section-title"
                />
                <SortableHeader
                  label="Réf"
                  sortKey="ref"
                  currentSortKey={historySortConfig.key}
                  currentDirection={historySortConfig.direction}
                  onSort={handleHistorySort}
                  className="section-title"
                />
                <SortableHeader
                  label="Utilisateur"
                  sortKey="user"
                  currentSortKey={historySortConfig.key}
                  currentDirection={historySortConfig.direction}
                  onSort={handleHistorySort}
                  className="section-title"
                />
                <SortableHeader
                  label="Action"
                  sortKey="action"
                  currentSortKey={historySortConfig.key}
                  currentDirection={historySortConfig.direction}
                  onSort={handleHistorySort}
                  className="section-title"
                />
                <SortableHeader
                  label="Détails"
                  sortKey="details"
                  currentSortKey={historySortConfig.key}
                  currentDirection={historySortConfig.direction}
                  onSort={handleHistorySort}
                  className="section-title"
                />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] text-sm">
              {paginatedHistory.map((log) => (
                <tr key={log.id} className="density-row tr-hover/50">
                  <td className="px-4 py-2 text-[var(--text-secondary)] text-xs">
                    {new Date(log.date).toLocaleString()}
                  </td>
                  <td className="px-4 py-2 font-mono text-[var(--primary)] text-xs">{log.interventionId}</td>
                  <td className="px-4 py-2 font-bold text-[var(--text-primary)]">{log.user}</td>
                  <td className="px-4 py-2">
                    <span className="bg-[var(--bg-elevated)] px-2 py-0.5 rounded text-xs font-medium border border-[var(--border)]">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-[var(--text-secondary)] text-xs">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-[var(--border)] bg-[var(--bg-elevated)] flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--text-secondary)]">Lignes par page:</span>
            <select
              className="p-1 border border-[var(--border)] rounded text-xs bg-[var(--bg-surface)]"
              value={historyItemsPerPage}
              onChange={(e) => {
                setHistoryItemsPerPage(Number(e.target.value));
                setHistoryPage(1);
              }}
            >
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span className="text-xs text-[var(--text-secondary)] ml-2">
              Page {historyPage} sur {totalHistoryPages} ({historyLogs.length} entrées)
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
              disabled={historyPage === 1}
              className="p-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded hover:bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setHistoryPage((p) => Math.min(totalHistoryPages, p + 1))}
              disabled={historyPage === totalHistoryPages}
              className="p-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded hover:bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </Card>
    );
  };

  const handleAuditSubmit = () => {
    // In a real app, this would send a report to the server
    // For now, we just show a toast
    const totalItems = myStock.filter((s) => s.transferStatus !== 'PENDING_RECEIPT').length;
    const checkedItems = auditItems.size;

    if (checkedItems === totalItems) {
      showToast(TOAST.TECH.INVENTORY_COMPLETE, 'success');
    } else {
      showToast(TOAST.TECH.INVENTORY_PARTIAL(checkedItems, totalItems), 'warning');
    }
    setIsAuditModalOpen(false);
    setAuditItems(new Set());
  };

  const toggleAuditItem = (id: string) => {
    const newSet = new Set(auditItems);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setAuditItems(newSet);
  };

  return (
    <div className="h-full flex flex-col bg-[var(--bg-elevated)] overflow-hidden">
      <MobileTabLayout
        tabs={visibleTechTabs}
        activeTab={viewMode}
        onTabChange={(id) => setViewMode(id as typeof viewMode)}
        backLabel="Interventions"
      >
        {/* TOP BAR */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[var(--bg-elevated)] p-2 rounded-xl border border-[var(--border)] shadow-sm shrink-0">
          {!isMobile && (
            <Tabs
              tabs={visibleTechTabs}
              activeTab={viewMode}
              onTabChange={(id) => setViewMode(id as typeof viewMode)}
            />
          )}

          <div className="flex items-center gap-2 w-full md:w-auto">
            {['LIST', 'PLANNING', 'MAP'].includes(viewMode) && (
              <>
                <button
                  onClick={handleCreate}
                  className="hidden sm:flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white text-sm font-bold rounded-lg hover:bg-[var(--primary-light)] shadow-sm transition-colors whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" /> Nouvelle Intervention
                </button>
                {/* Bouton Filtres avec Dropdown — masqué sur mobile (InterventionList a son propre filtre) */}
                <div className="relative hidden sm:block" ref={filterMenuRef}>
                  <button
                    onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
                    className={`flex items-center gap-2 px-4 py-2 border border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-primary)] text-sm font-bold rounded-lg hover:bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)] shadow-sm transition-colors whitespace-nowrap ${isFilterMenuOpen ? 'ring-2 ring-offset-2 ring-[var(--primary)]' : ''}`}
                  >
                    <Filter className="w-4 h-4" /> <span className="hidden sm:inline">Filtres</span>
                  </button>

                  {isFilterMenuOpen &&
                    (() => {
                      const filterContent = (
                        <>
                          <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase mb-3">
                            Filtres actifs
                          </h4>
                          <div className="space-y-3">
                            <div className="space-y-1">
                              <label className="text-xs text-[var(--text-secondary)]">Statut</label>
                              <select
                                className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-elevated)] text-sm"
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                              >
                                <option value="ALL">Tous les statuts</option>
                                {Object.entries(INTERVENTION_STATUSES).map(([key, label]) => (
                                  <option key={key} value={key}>
                                    {label}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs text-[var(--text-secondary)]">Type</label>
                              <select
                                className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-elevated)] text-sm"
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value)}
                              >
                                <option value="ALL">Tous les types</option>
                                {interventionTypes.map((t) => (
                                  <option key={t.code} value={t.code}>
                                    {t.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs text-[var(--text-secondary)]">Technicien</label>
                              <select
                                className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-elevated)] text-sm"
                                value={filterTech}
                                onChange={(e) => setFilterTech(e.target.value)}
                              >
                                <option value="ALL">Tous les techniciens</option>
                                {technicians.map((t) => (
                                  <option key={t.id} value={t.id}>
                                    {t.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <div className="mt-4 pt-3 border-t border-[var(--border)] border-[var(--border)] flex justify-end">
                            <button
                              onClick={() => {
                                setFilterStatus('ALL');
                                setFilterType('ALL');
                                setFilterTech('ALL');
                              }}
                              className="text-xs text-[var(--primary)] hover:text-[var(--primary)] font-medium"
                            >
                              Réinitialiser
                            </button>
                          </div>
                        </>
                      );
                      return isMobile ? (
                        <div
                          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
                          onClick={() => setIsFilterMenuOpen(false)}
                        >
                          <div
                            className="w-full max-w-sm bg-[var(--bg-elevated)] border border-[var(--border)] rounded-2xl shadow-2xl p-4"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {filterContent}
                          </div>
                        </div>
                      ) : (
                        <div className="absolute top-full right-0 mt-2 w-72 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg shadow-xl z-50 p-4 animate-in fade-in slide-in-from-top-2">
                          {filterContent}
                        </div>
                      );
                    })()}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Mobile KPI Strip - cliquable pour filtrer */}
        {isMobile && ['LIST', 'PLANNING', 'MAP', 'STATS', 'HISTORY'].includes(viewMode) && (
          <div className="flex gap-2 shrink-0">
            {[
              {
                key: 'pending' as const,
                label: 'En attente',
                value: kpis.pending,
                active: 'bg-amber-100 dark:bg-amber-900/40 border-amber-400 ring-1 ring-amber-400',
                inactive: 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-900/30',
                text: 'text-amber-600 dark:text-amber-400',
                sub: 'text-amber-500',
              },
              {
                key: 'in_progress' as const,
                label: 'En cours',
                value: kpis.inProgress,
                active:
                  'bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] border-[var(--primary)] ring-1 ring-[var(--primary-dim)]',
                inactive:
                  'bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] border-[var(--primary)] dark:border-[var(--primary)]/30',
                text: 'text-[var(--primary)] dark:text-[var(--primary)]',
                sub: 'text-[var(--primary)]',
              },
              {
                key: 'completed' as const,
                label: 'Terminées',
                value: kpis.completed,
                active: 'bg-green-100 dark:bg-green-900/40 border-green-400 ring-1 ring-green-400',
                inactive: 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-900/30',
                text: 'text-green-600 dark:text-green-400',
                sub: 'text-green-500',
              },
            ].map(({ key, label, value, active, inactive, text, sub }) => (
              <button
                key={key}
                onClick={() => setMobileKpiFilter((f) => (f === key ? null : key))}
                className={`flex-1 rounded-lg p-3 text-center border transition-all ${mobileKpiFilter === key ? active : inactive}`}
              >
                <p className={`text-xl font-bold ${text}`}>{value}</p>
                <p className={`text-[10px] font-semibold uppercase tracking-wide mt-0.5 ${sub}`}>{label}</p>
              </button>
            ))}
          </div>
        )}

        {/* KPI CARDS - Only visible for Intervention views - Hidden on mobile */}
        {['LIST', 'PLANNING', 'MAP', 'STATS', 'HISTORY'].includes(viewMode) && !isMobile && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 shrink-0">
            <Card className="p-4 border-l-4 border-l-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="section-title">Total Interventions</p>
                  <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">{kpis.total}</p>
                </div>
                <div className="p-3 bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] rounded-full text-[var(--primary)]">
                  <Wrench className="w-6 h-6" />
                </div>
              </div>
            </Card>
            <Card className="p-4 border-l-4 border-l-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="section-title">Terminées</p>
                  <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">{kpis.completed}</p>
                </div>
                <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-full text-green-600">
                  <CheckCircle className="w-6 h-6" />
                </div>
              </div>
            </Card>
            <Card className="p-4 border-l-4 border-l-amber-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="section-title">En Attente</p>
                  <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">{kpis.pending}</p>
                </div>
                <div className="p-3 bg-amber-50 dark:bg-amber-900/30 rounded-full text-amber-600">
                  <Clock className="w-6 h-6" />
                </div>
              </div>
            </Card>
            <Card className="p-4 border-l-4 border-l-orange-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="section-title">En Cours</p>
                  <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">{kpis.inProgress}</p>
                </div>
                <div className="p-3 bg-orange-50 dark:bg-orange-900/30 rounded-full text-orange-600">
                  <Activity className="w-6 h-6" />
                </div>
              </div>
            </Card>
            <Card className="p-4 border-l-4 border-l-purple-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="section-title">Temps Moyen</p>
                  <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">{kpis.avgTime}</p>
                </div>
                <div className="p-3 bg-purple-50 dark:bg-purple-900/30 rounded-full text-purple-600">
                  <Activity className="w-6 h-6" />
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* MAIN CONTENT AREA */}
        <div className="flex-1 flex flex-col min-h-0">
          {viewMode === 'OVERVIEW' &&
            (interventions.length === 0 ? (
              <Card className="flex-1 flex flex-col items-center justify-center p-12 text-center border-[var(--border)]">
                <ClipboardCheck className="w-16 h-16 text-[var(--text-muted)] mb-4" />
                <p className="text-lg font-semibold text-[var(--text-secondary)]">Aucune intervention</p>
                <p className="text-sm text-[var(--text-muted)] mt-1">
                  Créez votre première intervention pour voir les statistiques
                </p>
              </Card>
            ) : (
              <Card className="flex-1 border-[var(--border)] p-0 overflow-hidden">
                <TechStats interventions={interventions} technicians={technicians} />
              </Card>
            ))}

          {viewMode === 'LIST' &&
            (() => {
              const listData = isMobile ? mobileKpiFilteredInterventions : filteredInterventions;
              return listData.length === 0 ? (
                <Card className="flex-1 flex flex-col items-center justify-center p-12 text-center border-[var(--border)]">
                  <Wrench className="w-16 h-16 text-[var(--text-muted)] mb-4" />
                  <p className="text-lg font-semibold text-[var(--text-secondary)]">Aucune intervention trouvée</p>
                  <p className="text-sm text-[var(--text-muted)] mt-1">
                    Modifiez les filtres ou créez une nouvelle intervention
                  </p>
                </Card>
              ) : (
                <InterventionList
                  interventions={listData}
                  technicians={technicians}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onDepart={handleDepart}
                />
              );
            })()}

          {viewMode === 'PLANNING' && (
            <InterventionPlanning
              interventions={filteredInterventions}
              technicians={technicians}
              currentUserId={user?.id}
              onEdit={handleEdit}
              onUpdate={(updatedInt) => {
                updateIntervention(updatedInt);
                showToast(TOAST.CRUD.UPDATED('Planning'), 'success');
              }}
            />
          )}

          {viewMode === 'MAP' && (
            <Card className="flex-1 border-[var(--border)] p-0 overflow-hidden flex flex-col relative">
              <TechRadarMap
                technicians={technicians}
                interventions={filteredInterventions}
                onInterventionClick={handleEdit}
              />
            </Card>
          )}

          {viewMode === 'STOCK' && renderStock()}

          {viewMode === 'HISTORY' && renderHistory()}

          {viewMode === 'TEAM' && <TechTeamView />}
        </div>

        {/* FAB mobile — Nouvelle Intervention */}
        {isMobile && ['LIST', 'PLANNING'].includes(viewMode) && (
          <button
            onClick={handleCreate}
            className="fixed bottom-32 right-4 z-30 bg-[var(--primary)] text-white p-4 rounded-full shadow-lg hover:bg-[var(--primary-light)] active:scale-95 transition-all sm:hidden"
            aria-label="Nouvelle intervention"
          >
            <Plus className="w-6 h-6" />
          </button>
        )}

        {/* MODALS */}

        {/* Modal de détail intervention (lecture seule) - Rendu via Portal pour éviter les problèmes de z-index */}
        {typeof document !== 'undefined' &&
          isDetailModalOpen &&
          createPortal(
            <Suspense fallback={null}>
              <InterventionDetailModal
                isOpen={isDetailModalOpen}
                onClose={() => {
                  setIsDetailModalOpen(false);
                  setSelectedIntervention(null);
                }}
                onEdit={handleOpenEditForm}
                onStatusChange={(int, newStatus) => {
                  const updated = {
                    ...int,
                    status: newStatus,
                    enRouteTime: newStatus === 'EN_ROUTE' ? new Date().toISOString() : int.enRouteTime,
                  };
                  updateIntervention(updated);
                  setSelectedIntervention(updated);
                  // SYNC TICKET - Passer le ticket en "En cours" quand le technicien part
                  if (newStatus === 'EN_ROUTE' && int.ticketId && updateTicket) {
                    const ticket = tickets.find((t) => t.id === int.ticketId);
                    if (
                      ticket &&
                      ticket.status !== 'IN_PROGRESS' &&
                      ticket.status !== 'RESOLVED' &&
                      ticket.status !== 'CLOSED'
                    ) {
                      updateTicket({
                        ...ticket,
                        status: 'IN_PROGRESS',
                        updatedAt: new Date(),
                        startedAt: ticket.startedAt || new Date(),
                      });
                    }
                  }
                }}
                intervention={selectedIntervention}
                clients={tiers}
              />
            </Suspense>,
            document.body
          )}

        {/* Formulaire d'édition intervention */}
        <InterventionForm
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          initialData={selectedIntervention}
          technicians={technicians}
          onSave={(data) => {
            if (selectedIntervention) {
              updateIntervention({ ...selectedIntervention, ...data } as Intervention);
              showToast(TOAST.CRUD.UPDATED('Intervention'), 'success');
            } else {
              addIntervention(data as Intervention);
              showToast(TOAST.CRUD.CREATED('Intervention'), 'success');
            }
            setIsModalOpen(false);
            setSelectedIntervention(null);
          }}
        />

        {/* STOCK INVENTORY MODAL */}
        <Modal
          isOpen={isAuditModalOpen}
          onClose={() => setIsAuditModalOpen(false)}
          title="Inventaire du Stock"
          maxWidth="max-w-2xl"
        >
          <div className="p-4">
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm text-[var(--text-secondary)]">
                Veuillez confirmer la présence physique de chaque élément.
              </p>
              <button
                onClick={handleAuditSubmit}
                className="px-3 py-1.5 bg-[var(--primary)] text-white text-sm font-bold rounded hover:bg-[var(--primary-light)]"
              >
                Valider l'inventaire
              </button>
            </div>
            <div className="max-h-96 overflow-y-auto border rounded-lg">
              {myStock
                .filter((s) => s.transferStatus !== 'PENDING_RECEIPT')
                .map((item) => (
                  <div key={item.id} className="flex items-center gap-3 p-3 border-b last:border-0 tr-hover">
                    <input
                      type="checkbox"
                      checked={auditItems.has(item.id)}
                      onChange={() => toggleAuditItem(item.id)}
                      className="rounded border-[var(--border)] text-[var(--primary)] w-5 h-5"
                    />
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <p className="font-bold text-sm text-[var(--text-primary)]">
                          {item.type} - {item.model}
                        </p>
                        {(() => {
                          const s = getStockStatusStyle(item.status);
                          return (
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${s.bg} ${s.text}`}>
                              {s.label}
                            </span>
                          );
                        })()}
                      </div>
                      <p className="text-xs font-mono text-[var(--text-secondary)]">
                        {item.serialNumber || item.imei || item.iccid}
                      </p>
                    </div>
                  </div>
                ))}
              {myStock.filter((s) => s.transferStatus !== 'PENDING_RECEIPT').length === 0 && (
                <div className="p-8 text-center text-[var(--text-secondary)]">Aucun matériel en stock à auditer.</div>
              )}
            </div>
          </div>
        </Modal>

        {/* Transfer Modal */}
        <Modal
          isOpen={isTransferModalOpen}
          onClose={() => {
            setIsTransferModalOpen(false);
            setTransferTarget(null);
            setTransferTechId('');
          }}
          title="Transférer un matériel"
          maxWidth="max-w-md"
        >
          <div className="p-4 flex flex-col gap-4">
            {transferTarget && (
              <div className="bg-[var(--bg-elevated)] rounded-lg p-3 text-sm">
                <p className="font-bold text-[var(--text-primary)]">
                  {transferTarget.type} — {transferTarget.model}
                </p>
                <p className="font-mono text-xs text-[var(--text-secondary)] mt-1">
                  {transferTarget.serialNumber || transferTarget.imei || transferTarget.iccid}
                </p>
              </div>
            )}
            <div>
              <label htmlFor="transfer-tech" className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                Technicien destinataire
              </label>
              <select
                id="transfer-tech"
                value={transferTechId}
                onChange={(e) => setTransferTechId(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              >
                <option value="">— Sélectionner un technicien —</option>
                {technicians
                  .filter((t) => t.id !== user?.id)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setIsTransferModalOpen(false);
                  setTransferTarget(null);
                  setTransferTechId('');
                }}
                className="px-4 py-2 border border-[var(--border)] rounded-lg text-sm tr-hover"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmTransfer}
                disabled={!transferTechId}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirmer le transfert
              </button>
            </div>
          </div>
        </Modal>
      </MobileTabLayout>
    </div>
  );
};
