import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card } from '../../../components/Card';
import { Pagination } from '../../../components/Pagination';
import { useDataContext } from '../../../contexts/DataContext';
import { useCurrency } from '../../../hooks/useCurrency';
import { useToast } from '../../../contexts/ToastContext';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { MobileCard, MobileCardList, MobileCardAction } from '../../../components/MobileCard';
import { ColumnManager, type ColumnDef } from '../../../components/ColumnManager';
import { SubscriptionDetailModal } from './SubscriptionDetailModal';
import { SubscriptionForm, type SubscriptionFormData } from './SubscriptionForm';
import { MobileFilterSheet, FilterRadioRow, type MobileFilterTab } from '../../../components/MobileFilterSheet';
import { api } from '../../../services/api';
import {
  Search,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  Truck,
  ExternalLink,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  FileText,
  Eye,
  Trash2,
  MoreVertical,
  CreditCard,
  CheckSquare,
  Square,
  Plus,
  X,
  PauseCircle,
  XCircle,
  Receipt,
  Building2,
  Wifi,
  WifiOff,
  SearchX,
} from 'lucide-react';
import { EmptyState } from '../../../components/EmptyState';


import { View } from '../../../types';
import { VehicleStatus } from '../../../types/enums';

// Raw API subscription (matching GET /subscriptions response with JOINs)
interface RawSub {
  id: string;
  tenant_id: string;
  client_id: string;
  contract_id: string;
  vehicle_id: string;
  status: string;
  monthly_fee: number;
  billing_cycle: string;
  start_date: string;
  end_date?: string | null;
  auto_renew: boolean;
  next_billing_date?: string | null;
  notes?: string | null;
  items?: string | Array<Record<string, unknown>> | null; // jsonb — retourné par pg comme tableau JS ou string
  // JOINed fields
  vehicle_plate?: string;
  vehicle_brand?: string;
  vehicle_model?: string;
  vehicle_name?: string;
  contract_number?: string;
  client_name?: string;
}

interface SubscriptionsViewProps {
  dateRange?: { start: string; end: string };
  onNavigate?: (view: View, params?: Record<string, unknown>) => void;
}

const BILLING_CYCLE_LABELS: Record<string, string> = {
  MONTHLY: 'Mensuel',
  QUARTERLY: 'Trimestriel',
  SEMESTRIAL: 'Semestriel',
  ANNUAL: 'Annuel',
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: 'Actif', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  PENDING: { label: 'En attente', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  EXPIRED: { label: 'Expiré', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  CANCELLED: { label: 'Résilié', color: 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400' },
  SUSPENDED: { label: 'Suspendu', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  EXPIRING_SOON: {
    label: 'Expire bientôt',
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  },
};

const toMonthlyEquivalent = (fee: number, cycle: string): number => {
  switch (cycle?.toUpperCase()) {
    case 'ANNUAL': return fee / 12;
    case 'SEMESTRIAL': return fee / 6;
    case 'QUARTERLY': return fee / 3;
    default: return fee;
  }
};

const calculateRenewalCount = (startDate: string, billingCycle: string): number => {
  if (!startDate) return 0;
  const diffYears = (new Date().getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24 * 365);
  switch (billingCycle?.toUpperCase()) {
    case 'ANNUAL': return Math.max(0, Math.floor(diffYears));
    case 'SEMESTRIAL': return Math.max(0, Math.floor(diffYears * 2));
    case 'QUARTERLY': return Math.max(0, Math.floor(diffYears * 4));
    case 'MONTHLY': return Math.max(0, Math.floor(diffYears * 12));
    default: return 0;
  }
};

// Display model for the table
interface VehicleSubscription {
  id: string;                  // SUB-xxx (real subscription ID)
  subscriptionNumber: string;  // ABO-xxx (vehicle_id)
  vehicleId: string;
  licensePlate: string;
  vehicleName: string;
  clientId: string;
  clientName: string;
  contractId: string;
  contractNumber: string;
  tenantId: string;
  resellerName: string;
  effectiveStatus: string;
  periodicFee: number;
  monthlyEquivalent: number;
  billingCycle: string;
  startDate: string;
  endDate?: string;
  autoRenew: boolean;
  nextBillingDate?: string;
  daysUntilExpiry: number | null;
  renewalCount: number;
  installDate: string;
  invoiceCount: number;
  gpsImei: string;
  gpsStatus: VehicleStatus | null;
}

const SUBSCRIPTION_COLUMNS: ColumnDef[] = [
  { id: 'subscriptionNumber', label: 'N° Abonnement', locked: true, defaultVisible: true },
  { id: 'vehicleName', label: 'Véhicule', defaultVisible: true },
  { id: 'licensePlate', label: 'Plaque', defaultVisible: true },
  { id: 'clientName', label: 'Client', defaultVisible: true },
  { id: 'contractNumber', label: 'Contrat', defaultVisible: true },
  { id: 'resellerName', label: 'Revendeur', defaultVisible: false },
  { id: 'effectiveStatus', label: 'Statut', defaultVisible: true },
  { id: 'periodicFee', label: 'Tarif', defaultVisible: true },
  { id: 'billingCycle', label: 'Périodicité', defaultVisible: false },
  { id: 'nextBillingDate', label: 'Prochaine fact.', defaultVisible: true },
  { id: 'installDate', label: 'Date install.', defaultVisible: false },
  { id: 'invoiceCount', label: 'Nb. factures', defaultVisible: false },
  { id: 'gpsImei', label: 'Statut GPS', defaultVisible: false },
  { id: 'renewalCount', label: 'Renouvellements', defaultVisible: false },
  { id: 'daysUntilExpiry', label: 'Expiration', defaultVisible: true },
  { id: 'actions', label: 'Actions', locked: true, defaultVisible: true },
];

type SortField = keyof VehicleSubscription | 'actions';
type SortDir = 'asc' | 'desc';

const SortIcon = ({ field, sortField, sortDir }: { field: SortField; sortField: SortField; sortDir: SortDir }) => {
  if (sortField !== field) return <ArrowUpDown className="w-3 h-3 opacity-30" />;
  return sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />;
};

export const SubscriptionsView: React.FC<SubscriptionsViewProps> = ({ dateRange, onNavigate }) => {
  const isMobile = useIsMobile();
  const { vehicles, contracts, invoices } = useDataContext();
  const { formatPrice } = useCurrency();
  const { showToast } = useToast();

  const [rawSubs, setRawSubs] = useState<RawSub[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [sortField, setSortField] = useState<SortField>('subscriptionNumber');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [statusFilter, setStatusFilter] = useState<string>('ACTIVE');
  const [resellerFilter, setResellerFilter] = useState<string>('ALL');
  const [cycleFilter, setCycleFilter] = useState<string>('ALL');
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [showActionsFor, setShowActionsFor] = useState<string | null>(null);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    SUBSCRIPTION_COLUMNS.filter((c) => c.defaultVisible !== false).map((c) => c.id)
  );
  const [selectedSubscription, setSelectedSubscription] = useState<VehicleSubscription | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Edit state
  const [editingSub, setEditingSub] = useState<RawSub | null>(null);

  // Generate invoice state
  const [generatingInvoiceFor, setGeneratingInvoiceFor] = useState<RawSub | null>(null);
  const [invoiceBillingDate, setInvoiceBillingDate] = useState('');
  const [invoiceDueDate, setInvoiceDueDate] = useState('');
  const [generatingInvoiceLoading, setGeneratingInvoiceLoading] = useState(false);

  // Create state: first select contract + vehicle, then show form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [step1ContractId, setStep1ContractId] = useState('');
  const [createVehicle, setCreateVehicle] = useState<{ id: string; plate: string; name: string; contractId?: string; installationDate?: string } | null>(null);

  // Fetch subscriptions from API
  const fetchSubs = useCallback(async () => {
    setLoadingData(true);
    try {
      const data = await api.subscriptions.list();
      setRawSubs(data as unknown as RawSub[]);
    } catch {
      showToast('Erreur lors du chargement des abonnements', 'error');
    } finally {
      setLoadingData(false);
    }
  }, [showToast]);

  useEffect(() => { fetchSubs(); }, [fetchSubs]);

  // Reseller name lookup: tenant_id → reseller name (from contracts)
  const resellerMap = useMemo(() => {
    const map = new Map<string, string>();
    contracts.forEach(c => { if (c.tenantId && c.resellerName) map.set(c.tenantId, c.resellerName); });
    return map;
  }, [contracts]);

  // Invoice count per contract
  const invoiceCountByContract = useMemo(() => {
    const map = new Map<string, number>();
    invoices.forEach(inv => { if (inv.contractId) map.set(inv.contractId, (map.get(inv.contractId) || 0) + 1); });
    return map;
  }, [invoices]);

  // Map raw API data to display model
  const subscriptions = useMemo<VehicleSubscription[]>(() => {
    const today = new Date();
    return rawSubs.map((s) => {
      let daysUntilExpiry: number | null = null;
      if (s.end_date) {
        daysUntilExpiry = Math.ceil((new Date(s.end_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      }
      let effectiveStatus = s.status || 'ACTIVE';
      if (s.status === 'ACTIVE') {
        if (daysUntilExpiry !== null && daysUntilExpiry < 0) effectiveStatus = 'EXPIRED';
        else if (daysUntilExpiry !== null && daysUntilExpiry <= 30) effectiveStatus = 'EXPIRING_SOON';
      }
      const vehicleName =
        [s.vehicle_brand, s.vehicle_model].filter(Boolean).join(' ') ||
        s.vehicle_name ||
        s.vehicle_id;
      const vehicle = vehicles.find(v => v.id === s.vehicle_id);
      return {
        id: s.id,
        subscriptionNumber: s.vehicle_id,
        vehicleId: s.vehicle_id,
        licensePlate: s.vehicle_plate || '-',
        vehicleName,
        clientId: s.client_id,
        clientName: s.client_name || '-',
        contractId: s.contract_id,
        contractNumber: s.contract_number || s.contract_id?.slice(0, 8).toUpperCase() || '-',
        tenantId: s.tenant_id,
        resellerName: resellerMap.get(s.tenant_id) || '-',
        effectiveStatus,
        periodicFee: Number(s.monthly_fee) || 0,
        monthlyEquivalent: toMonthlyEquivalent(Number(s.monthly_fee) || 0, s.billing_cycle),
        billingCycle: s.billing_cycle || 'ANNUAL',
        startDate: s.start_date,
        endDate: s.end_date ?? undefined,
        autoRenew: s.auto_renew ?? true,
        nextBillingDate: s.next_billing_date ?? undefined,
        daysUntilExpiry,
        renewalCount: calculateRenewalCount(s.start_date, s.billing_cycle),
        installDate: vehicle?.installDate || '-',
        invoiceCount: invoiceCountByContract.get(s.contract_id) || 0,
        gpsImei: vehicle?.imei || '',
        gpsStatus: vehicle?.status ?? null,
      };
    });
  }, [rawSubs, vehicles, resellerMap, invoiceCountByContract]);

  // Resellers list for filter dropdown
  const resellers = useMemo(() => {
    const map = new Map<string, string>();
    subscriptions.forEach(s => { if (s.tenantId && s.resellerName && s.resellerName !== '-') map.set(s.tenantId, s.resellerName); });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [subscriptions]);

  // Status filter
  const filteredByStatus = useMemo(() => {
    if (statusFilter === 'ALL') return subscriptions;
    if (statusFilter === 'ACTIVE') return subscriptions.filter((s) => ['ACTIVE', 'EXPIRING_SOON'].includes(s.effectiveStatus));
    return subscriptions.filter((s) => s.effectiveStatus === statusFilter || s.effectiveStatus.toLowerCase() === statusFilter.toLowerCase());
  }, [subscriptions, statusFilter]);

  // Reseller filter
  const filteredByReseller = useMemo(() => {
    if (resellerFilter === 'ALL') return filteredByStatus;
    return filteredByStatus.filter(s => s.tenantId === resellerFilter);
  }, [filteredByStatus, resellerFilter]);

  // Cycle filter
  const filteredByCycle = useMemo(() => {
    if (cycleFilter === 'ALL') return filteredByReseller;
    return filteredByReseller.filter(s => (s.billingCycle || '').toUpperCase() === cycleFilter);
  }, [filteredByReseller, cycleFilter]);

  // Date range filter
  const filteredByDate = useMemo(() => {
    if (!dateRange) return filteredByCycle;
    return filteredByCycle.filter((s) => {
      const parsed = new Date(s.startDate);
      const d = !isNaN(parsed.getTime()) ? parsed.toISOString().split('T')[0] : '';
      return d >= dateRange.start && d <= dateRange.end;
    });
  }, [filteredByCycle, dateRange]);

  // Search filter
  const filteredSubscriptions = useMemo(() => {
    if (!searchTerm) return filteredByDate;
    const lower = searchTerm.toLowerCase();
    return filteredByDate.filter(
      (s) =>
        (s.subscriptionNumber || '').toLowerCase().includes(lower) ||
        (s.vehicleName || '').toLowerCase().includes(lower) ||
        (s.clientName || '').toLowerCase().includes(lower) ||
        (s.licensePlate || '').toLowerCase().includes(lower) ||
        (s.contractNumber || '').toLowerCase().includes(lower) ||
        (s.resellerName || '').toLowerCase().includes(lower)
    );
  }, [filteredByDate, searchTerm]);

  // Sort
  const sortedSubscriptions = useMemo(() => {
    return [...filteredSubscriptions].sort((a, b) => {
      let aVal = a[sortField as keyof typeof a] as string | number | undefined;
      let bVal = b[sortField as keyof typeof b] as string | number | undefined;
      if (['periodicFee', 'monthlyEquivalent', 'daysUntilExpiry', 'renewalCount'].includes(sortField as string)) {
        aVal = aVal ?? (sortDir === 'asc' ? Infinity : -Infinity);
        bVal = bVal ?? (sortDir === 'asc' ? Infinity : -Infinity);
      } else if (['startDate', 'endDate', 'nextBillingDate'].includes(sortField as string)) {
        aVal = new Date((aVal as string) || 0).getTime();
        bVal = new Date((bVal as string) || 0).getTime();
      } else {
        aVal = String(aVal || '').toLowerCase();
        bVal = String(bVal || '').toLowerCase();
      }
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredSubscriptions, sortField, sortDir]);

  const totalPages = Math.ceil(sortedSubscriptions.length / itemsPerPage);
  const paginatedSubscriptions = sortedSubscriptions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // KPIs
  const kpis = useMemo(() => {
    const active = subscriptions.filter((s) => ['ACTIVE', 'EXPIRING_SOON'].includes(s.effectiveStatus));
    const mrr = active.reduce((sum, s) => sum + s.monthlyEquivalent, 0);
    const expiringSoon = subscriptions.filter(
      (s) => s.daysUntilExpiry !== null && s.daysUntilExpiry >= 0 && s.daysUntilExpiry <= 30
    ).length;
    const expired = subscriptions.filter((s) => s.daysUntilExpiry !== null && s.daysUntilExpiry < 0).length;
    return { totalVehicles: active.length, mrr, expiringSoon, expired };
  }, [subscriptions]);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDir('asc'); }
  };

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedSubscriptions.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(paginatedSubscriptions.map((s) => s.id)));
  };

  // Suspend subscription
  const handleSuspend = async (id: string) => {
    try {
      await api.subscriptions.suspend(id);
      showToast('Abonnement suspendu', 'success');
      fetchSubs();
    } catch {
      showToast('Erreur lors de la suspension', 'error');
    }
  };

  // Résilier subscription
  const handleRésilier = async (id: string, reason?: string) => {
    try {
      await api.subscriptions.résilier(id, reason);
      showToast('Abonnement résilié', 'success');
      fetchSubs();
    } catch {
      showToast('Erreur lors de la résiliation', 'error');
    }
  };

  // Delete subscription
  const handleDeleteSub = async (sub: VehicleSubscription) => {
    try {
      await api.subscriptions.delete(sub.id);
      showToast(`Abonnement ${sub.subscriptionNumber} supprimé`, 'success');
      fetchSubs();
    } catch {
      showToast('Erreur lors de la suppression', 'error');
    }
    setShowActionsFor(null);
  };

  // Bulk delete
  const handleBulkRemove = async () => {
    const toRemove = [...selectedIds];
    for (const id of toRemove) {
      try { await api.subscriptions.delete(id); } catch { /* continue */ }
    }
    showToast(`${toRemove.length} abonnement(s) supprimé(s)`, 'success');
    setSelectedIds(new Set());
    fetchSubs();
  };

  const handleBulkViewInvoices = () => {
    const sub = filteredSubscriptions.find((s) => selectedIds.has(s.id));
    if (sub) handleViewInvoices(sub.clientId);
    setSelectedIds(new Set());
  };

  const handleViewContract = (contractId: string) => {
    if (onNavigate) onNavigate(View.SALES, { tab: 'contracts', contractId });
    setShowActionsFor(null);
  };

  const handleViewInvoices = (clientId: string) => {
    if (onNavigate) onNavigate(View.SALES, { tab: 'invoices', clientId });
    setShowActionsFor(null);
  };

  // Generate invoice for subscription
  const handleGenerateInvoice = async () => {
    if (!generatingInvoiceFor || !invoiceBillingDate) return;
    setGeneratingInvoiceLoading(true);
    try {
      await api.subscriptions.generateInvoice(generatingInvoiceFor.id, {
        billingDate: invoiceBillingDate,
        dueDate: invoiceDueDate || null,
      });
      showToast('Facture créée en brouillon', 'success');
      setGeneratingInvoiceFor(null);
      setInvoiceBillingDate('');
      setInvoiceDueDate('');
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Erreur lors de la création', 'error');
    } finally {
      setGeneratingInvoiceLoading(false);
    }
  };

  // Create subscription
  const handleCreateSubmit = async (data: SubscriptionFormData) => {
    await api.subscriptions.create(data as unknown as Parameters<typeof api.subscriptions.create>[0]);
    showToast('Abonnement créé avec succès', 'success');
    setShowCreateForm(false);
    setCreateVehicle(null);
    setStep1ContractId('');
    fetchSubs();
  };

  // Edit subscription
  const handleEditSubmit = async (data: SubscriptionFormData) => {
    if (!editingSub) return;
    await api.subscriptions.update({ ...editingSub, ...data, id: editingSub.id } as unknown as Parameters<typeof api.subscriptions.update>[0]);
    showToast('Abonnement mis à jour', 'success');
    setEditingSub(null);
    fetchSubs();
  };

  // Vehicles without existing subscriptions (for new subscription create)
  const vehicleOptions = useMemo(() => {
    const existingVehicleIds = new Set(rawSubs.map((s) => s.vehicle_id));
    return vehicles
      .filter((v) => v.id?.startsWith('ABO-') && !existingVehicleIds.has(v.id))
      .map((v) => ({
        id: v.id,
        plate: v.licensePlate || '',
        name: `${v.brand || ''} ${v.model || ''}`.trim() || v.name || '',
        contractId: v.contractId,
        installationDate: v.installDate || undefined,
      }))
      .sort((a, b) => a.plate.localeCompare(b.plate));
  }, [vehicles, rawSubs]);

  const getExpiryBadge = (sub: VehicleSubscription) => {
    if (sub.daysUntilExpiry === null)
      return <span className="text-green-600 dark:text-green-400 text-xs">∞</span>;
    if (sub.daysUntilExpiry < 0)
      return (
        <span className="text-red-600 dark:text-red-400 text-xs font-medium flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          Expiré ({Math.abs(sub.daysUntilExpiry)}j)
        </span>
      );
    if (sub.daysUntilExpiry <= 30)
      return (
        <span className="text-amber-600 dark:text-amber-400 text-xs font-medium flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          {sub.daysUntilExpiry}j
        </span>
      );
    return <span className="text-slate-600 dark:text-slate-400 text-xs">{sub.daysUntilExpiry}j</span>;
  };

  const formatDate = (d?: string) => (d ? new Date(d).toLocaleDateString('fr-FR') : '-');

  return (
    <div className="space-y-4 sm:h-full sm:flex sm:flex-col animate-in fade-in duration-300">
      {/* KPI Cards - hidden on mobile */}
      {!isMobile && <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3 border-l-4 border-l-blue-500">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-600">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase">Véhicules Actifs</p>
              <p className="text-xl font-bold text-slate-800 dark:text-white">{kpis.totalVehicles}</p>
            </div>
          </div>
        </Card>
        <Card className="p-3 border-l-4 border-l-green-500">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 dark:bg-green-900/30 rounded-lg text-green-600">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase">MRR</p>
              <p className="text-xl font-bold text-slate-800 dark:text-white">{formatPrice(kpis.mrr)}</p>
            </div>
          </div>
        </Card>
        <Card className="p-3 border-l-4 border-l-amber-500">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-50 dark:bg-amber-900/30 rounded-lg text-amber-600">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase">Expire sous 30j</p>
              <p className="text-xl font-bold text-slate-800 dark:text-white">{kpis.expiringSoon}</p>
            </div>
          </div>
        </Card>
        <Card className="p-3 border-l-4 border-l-red-500">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-50 dark:bg-red-900/30 rounded-lg text-red-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase">Expirés</p>
              <p className="text-xl font-bold text-slate-800 dark:text-white">{kpis.expired}</p>
            </div>
          </div>
        </Card>
      </div>}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher N° abonnement, véhicule, client, plaque..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm dark:text-white"
          />
        </div>
        {/* Mobile filter button */}
        {isMobile && (
          <button
            onClick={() => setMobileFilterOpen(true)}
            className="relative flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-600 dark:text-slate-300"
          >
            <Search className="w-4 h-4" style={{ display: 'none' }} />
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
            Filtres
            {(statusFilter !== 'ALL' || resellerFilter !== 'ALL' || cycleFilter !== 'ALL') && (
              <span className="absolute -top-1.5 -right-1.5 bg-blue-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                {(statusFilter !== 'ALL' ? 1 : 0) + (resellerFilter !== 'ALL' ? 1 : 0) + (cycleFilter !== 'ALL' ? 1 : 0)}
              </span>
            )}
          </button>
        )}
        {/* Desktop filters */}
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
          className="hidden sm:block px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm dark:text-white"
        >
          <option value="ALL">Tous les statuts</option>
          <option value="ACTIVE">Actifs seulement</option>
          <option value="PENDING">En attente</option>
          <option value="EXPIRED">Expirés</option>
          <option value="SUSPENDED">Suspendus</option>
          <option value="CANCELLED">Résiliés</option>
        </select>
        <select
          value={resellerFilter}
          onChange={(e) => { setResellerFilter(e.target.value); setCurrentPage(1); }}
          className="hidden sm:block px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm dark:text-white"
        >
          <option value="ALL">Tous les revendeurs</option>
          {resellers.map(r => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
        <select
          value={cycleFilter}
          onChange={(e) => { setCycleFilter(e.target.value); setCurrentPage(1); }}
          className="hidden sm:block px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm dark:text-white"
        >
          <option value="ALL">Toutes périodicités</option>
          <option value="MONTHLY">Mensuel</option>
          <option value="QUARTERLY">Trimestriel</option>
          <option value="SEMESTRIAL">Semestriel</option>
          <option value="ANNUAL">Annuel</option>
        </select>
        <ColumnManager
          columns={SUBSCRIPTION_COLUMNS}
          visible={visibleColumns}
          onChange={setVisibleColumns}
          title="Colonnes"
        />
        <span className="text-sm text-slate-500 ml-auto">
          {loadingData ? 'Chargement…' : `${filteredSubscriptions.length} abonnement${filteredSubscriptions.length > 1 ? 's' : ''}`}
        </span>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Créer un abonnement
        </button>
      </div>

      {/* Bulk actions bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
            {selectedIds.size} sélectionné{selectedIds.size > 1 ? 's' : ''}
          </span>
          <div className="flex gap-2 ml-auto">
            <button
              onClick={handleBulkViewInvoices}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              <FileText className="w-3.5 h-3.5 text-green-500" />
              Voir factures
            </button>
            <button
              onClick={handleBulkRemove}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-red-200 dark:border-red-800 text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Supprimer
            </button>
            <button onClick={() => setSelectedIds(new Set())} className="p-1.5 hover:bg-blue-100 dark:hover:bg-blue-800 rounded">
              <X className="w-3.5 h-3.5 text-blue-500" />
            </button>
          </div>
        </div>
      )}

      {/* Mobile cards */}
      {isMobile && (
        <MobileCardList className="pb-20">
          {paginatedSubscriptions.length === 0 ? (
            subscriptions.length === 0
              ? <EmptyState compact icon={CreditCard} title="Aucun abonnement" description="Aucun abonnement n'a encore été créé." />
              : <EmptyState compact icon={SearchX} title="Aucun résultat" description="Aucun abonnement ne correspond aux filtres actifs." />
          ) : paginatedSubscriptions.map(sub => {
            const statusInfo = STATUS_LABELS[sub.effectiveStatus] || { label: sub.effectiveStatus, color: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300' };
            const borderColor = sub.effectiveStatus === 'ACTIVE' ? 'border-l-green-500'
              : sub.effectiveStatus === 'EXPIRING_SOON' ? 'border-l-amber-500'
              : sub.effectiveStatus === 'EXPIRED' ? 'border-l-red-500'
              : sub.effectiveStatus === 'SUSPENDED' ? 'border-l-orange-500'
              : sub.effectiveStatus === 'CANCELLED' ? 'border-l-slate-400'
              : 'border-l-blue-400';
            return (
              <MobileCard key={sub.id} borderColor={borderColor} onClick={() => setSelectedSubscription(sub)}>
                {/* Primary: Client + Plaque + Montant */}
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-sm text-slate-800 dark:text-white truncate">{sub.clientName || '—'}</p>
                    <span className="font-mono text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded">{sub.licensePlate || sub.vehicleName || '—'}</span>
                  </div>
                  <p className="font-bold text-sm text-slate-800 dark:text-white shrink-0">{formatPrice(sub.periodicFee)}</p>
                </div>
                {/* Secondary: Cycle + Statut + Prochaine facturation */}
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-2 flex-wrap">
                  <span>{BILLING_CYCLE_LABELS[sub.billingCycle] || sub.billingCycle}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${statusInfo.color}`}>{statusInfo.label}</span>
                  {sub.nextBillingDate && <span>Proch. {new Date(sub.nextBillingDate).toLocaleDateString('fr-FR')}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <MobileCardAction color="blue" onClick={(e) => { e.stopPropagation(); const raw = rawSubs.find(s => s.id === sub.id); if (raw) setEditingSub(raw); }}>Modifier</MobileCardAction>
                </div>
              </MobileCard>
            );
          })}
        </MobileCardList>
      )}

      {/* Table */}
      {!isMobile && <Card className="flex-1 overflow-hidden">
        <div className="overflow-x-auto h-full">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900 sticky top-0 dark:text-white">
              <tr>
                <th className="px-3 py-3 w-10">
                  <button onClick={toggleSelectAll} className="text-slate-400 hover:text-blue-600">
                    {selectedIds.size === paginatedSubscriptions.length && paginatedSubscriptions.length > 0
                      ? <CheckSquare className="w-4 h-4 text-blue-500" />
                      : <Square className="w-4 h-4" />}
                  </button>
                </th>
                {visibleColumns.includes('subscriptionNumber') && (
                  <th onClick={() => handleSort('subscriptionNumber')} className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800">
                    <div className="flex items-center gap-1">
                      N° Abonnement <SortIcon sortField={sortField} sortDir={sortDir} field="subscriptionNumber" />
                    </div>
                  </th>
                )}
                {visibleColumns.includes('vehicleName') && (
                  <th onClick={() => handleSort('vehicleName')} className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800">
                    <div className="flex items-center gap-1">
                      Véhicule <SortIcon sortField={sortField} sortDir={sortDir} field="vehicleName" />
                    </div>
                  </th>
                )}
                {visibleColumns.includes('licensePlate') && (
                  <th onClick={() => handleSort('licensePlate')} className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800">
                    <div className="flex items-center gap-1">
                      Plaque <SortIcon sortField={sortField} sortDir={sortDir} field="licensePlate" />
                    </div>
                  </th>
                )}
                {visibleColumns.includes('clientName') && (
                  <th onClick={() => handleSort('clientName')} className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800">
                    <div className="flex items-center gap-1">
                      Client <SortIcon sortField={sortField} sortDir={sortDir} field="clientName" />
                    </div>
                  </th>
                )}
                {visibleColumns.includes('contractNumber') && (
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Contrat</th>
                )}
                {visibleColumns.includes('resellerName') && (
                  <th onClick={() => handleSort('resellerName')} className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800">
                    <div className="flex items-center gap-1">Revendeur <SortIcon sortField={sortField} sortDir={sortDir} field="resellerName" /></div>
                  </th>
                )}
                {visibleColumns.includes('effectiveStatus') && (
                  <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase">Statut</th>
                )}
                {visibleColumns.includes('periodicFee') && (
                  <th onClick={() => handleSort('periodicFee')} className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800">
                    <div className="flex items-center justify-end gap-1">
                      Tarif <SortIcon sortField={sortField} sortDir={sortDir} field="periodicFee" />
                    </div>
                  </th>
                )}
                {visibleColumns.includes('billingCycle') && (
                  <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase">Périodicité</th>
                )}
                {visibleColumns.includes('nextBillingDate') && (
                  <th onClick={() => handleSort('nextBillingDate')} className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800">
                    <div className="flex items-center justify-center gap-1">
                      Proch. Fact. <SortIcon sortField={sortField} sortDir={sortDir} field="nextBillingDate" />
                    </div>
                  </th>
                )}
                {visibleColumns.includes('installDate') && (
                  <th onClick={() => handleSort('installDate')} className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800">
                    <div className="flex items-center justify-center gap-1">Date install. <SortIcon sortField={sortField} sortDir={sortDir} field="installDate" /></div>
                  </th>
                )}
                {visibleColumns.includes('invoiceCount') && (
                  <th onClick={() => handleSort('invoiceCount')} className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800">
                    <div className="flex items-center justify-center gap-1">Factures <SortIcon sortField={sortField} sortDir={sortDir} field="invoiceCount" /></div>
                  </th>
                )}
                {visibleColumns.includes('gpsImei') && (
                  <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase">Statut GPS</th>
                )}
                {visibleColumns.includes('renewalCount') && (
                  <th onClick={() => handleSort('renewalCount')} className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800">
                    <div className="flex items-center justify-center gap-1">
                      Renouv. <SortIcon sortField={sortField} sortDir={sortDir} field="renewalCount" />
                    </div>
                  </th>
                )}
                {visibleColumns.includes('daysUntilExpiry') && (
                  <th onClick={() => handleSort('daysUntilExpiry')} className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800">
                    <div className="flex items-center justify-center gap-1">
                      Expiration <SortIcon sortField={sortField} sortDir={sortDir} field="daysUntilExpiry" />
                    </div>
                  </th>
                )}
                {visibleColumns.includes('actions') && (
                  <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {paginatedSubscriptions.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumns.length + 1}>
                    {subscriptions.length === 0
                      ? <EmptyState icon={CreditCard} title="Aucun abonnement" description="Aucun abonnement n'a encore été créé." />
                      : <EmptyState icon={SearchX} title="Aucun résultat" description="Aucun abonnement ne correspond aux filtres actifs." />
                    }
                  </td>
                </tr>
              ) : (
                paginatedSubscriptions.map((sub) => {
                  const isExpiringSoon = sub.effectiveStatus === 'EXPIRING_SOON';
                  const isExpired = sub.effectiveStatus === 'EXPIRED';
                  const statusStyle = STATUS_LABELS[sub.effectiveStatus] || STATUS_LABELS.ACTIVE;

                  return (
                    <tr
                      key={sub.id}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                        isExpired ? 'bg-red-50/50 dark:bg-red-900/10' : isExpiringSoon ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''
                      } ${selectedIds.has(sub.id) ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                    >
                      <td className="px-3 py-3">
                        <button onClick={() => toggleSelect(sub.id)} className="text-slate-400 hover:text-blue-600">
                          {selectedIds.has(sub.id)
                            ? <CheckSquare className="w-4 h-4 text-blue-500" />
                            : <Square className="w-4 h-4" />}
                        </button>
                      </td>
                      {visibleColumns.includes('subscriptionNumber') && (
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setSelectedSubscription(sub)}
                            className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                          >
                            {sub.subscriptionNumber || '-'}
                          </button>
                        </td>
                      )}
                      {visibleColumns.includes('vehicleName') && (
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-slate-100 dark:bg-slate-700 rounded dark:text-white">
                              <Truck className="w-4 h-4 text-slate-500" />
                            </div>
                            <span className="font-medium text-slate-800 dark:text-white truncate max-w-[150px]">
                              {sub.vehicleName}
                            </span>
                          </div>
                        </td>
                      )}
                      {visibleColumns.includes('licensePlate') && (
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded dark:text-white">
                            {sub.licensePlate}
                          </span>
                        </td>
                      )}
                      {visibleColumns.includes('clientName') && (
                        <td className="px-4 py-3">
                          <span className="text-slate-700 dark:text-slate-300 truncate max-w-[150px] block">
                            {sub.clientName}
                          </span>
                        </td>
                      )}
                      {visibleColumns.includes('contractNumber') && (
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleViewContract(sub.contractId)}
                            className="font-mono text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                          >
                            {sub.contractNumber}
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </td>
                      )}
                      {visibleColumns.includes('resellerName') && (
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400">
                            <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                            {sub.resellerName}
                          </span>
                        </td>
                      )}
                      {visibleColumns.includes('effectiveStatus') && (
                        <td className="px-4 py-3 text-center">
                          <span className={`text-xs px-2 py-1 rounded-full ${statusStyle.color}`}>
                            {statusStyle.label}
                          </span>
                        </td>
                      )}
                      {visibleColumns.includes('periodicFee') && (
                        <td className="px-4 py-3 text-right">
                          <span className="font-bold text-green-600 dark:text-green-400">
                            {formatPrice(sub.periodicFee)}
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            /{BILLING_CYCLE_LABELS[sub.billingCycle]?.toLowerCase() || sub.billingCycle}
                          </span>
                        </td>
                      )}
                      {visibleColumns.includes('billingCycle') && (
                        <td className="px-4 py-3 text-center">
                          <span className="text-xs text-slate-600 dark:text-slate-400">
                            {BILLING_CYCLE_LABELS[sub.billingCycle] || sub.billingCycle}
                          </span>
                        </td>
                      )}
                      {visibleColumns.includes('nextBillingDate') && (
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`text-xs ${sub.nextBillingDate && new Date(sub.nextBillingDate) < new Date() ? 'text-red-600 font-medium' : 'text-slate-600 dark:text-slate-400'}`}
                          >
                            {formatDate(sub.nextBillingDate)}
                          </span>
                        </td>
                      )}
                      {visibleColumns.includes('installDate') && (
                        <td className="px-4 py-3 text-center">
                          <span className="text-xs text-slate-600 dark:text-slate-400">
                            {sub.installDate !== '-' ? formatDate(sub.installDate) : '—'}
                          </span>
                        </td>
                      )}
                      {visibleColumns.includes('invoiceCount') && (
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center gap-1 text-xs font-medium ${sub.invoiceCount > 0 ? 'text-green-600 dark:text-green-400' : 'text-slate-400'}`}>
                            <FileText className="w-3 h-3" />
                            {sub.invoiceCount}
                          </span>
                        </td>
                      )}
                      {visibleColumns.includes('gpsImei') && (
                        <td className="px-4 py-3 text-center">
                          {sub.gpsImei ? (() => {
                            const GPS_STATUS_CFG: Record<VehicleStatus, { label: string; dot: string; text: string; bg: string }> = {
                              [VehicleStatus.MOVING]:  { label: 'En mouvement', dot: 'bg-green-500',  text: 'text-green-700 dark:text-green-400',  bg: 'bg-green-50 dark:bg-green-900/20' },
                              [VehicleStatus.IDLE]:    { label: 'Ralenti',      dot: 'bg-orange-500', text: 'text-orange-700 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/20' },
                              [VehicleStatus.STOPPED]: { label: 'Arrêté',       dot: 'bg-red-500',    text: 'text-red-700 dark:text-red-400',       bg: 'bg-red-50 dark:bg-red-900/20' },
                              [VehicleStatus.OFFLINE]: { label: 'Hors ligne',   dot: 'bg-slate-400',  text: 'text-slate-500 dark:text-slate-400',   bg: 'bg-slate-100 dark:bg-slate-700/40' },
                            };
                            const cfg = sub.gpsStatus ? GPS_STATUS_CFG[sub.gpsStatus] : GPS_STATUS_CFG[VehicleStatus.OFFLINE];
                            return (
                              <div className="inline-flex flex-col items-center gap-0.5">
                                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.text} ${cfg.bg}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} ${sub.gpsStatus === VehicleStatus.MOVING ? 'animate-pulse' : ''}`} />
                                  {cfg.label}
                                </span>
                                <span className="font-mono text-[10px] text-slate-400">{sub.gpsImei}</span>
                              </div>
                            );
                          })() : (
                            <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                              <WifiOff className="w-3 h-3" />
                              Non configuré
                            </span>
                          )}
                        </td>
                      )}
                      {visibleColumns.includes('renewalCount') && (
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                            <RefreshCw className="w-3 h-3 text-green-500" />
                            {sub.renewalCount}
                          </span>
                        </td>
                      )}
                      {visibleColumns.includes('daysUntilExpiry') && (
                        <td className="px-4 py-3 text-center">
                          {getExpiryBadge(sub)}
                          {sub.endDate && (
                            <span className="text-[10px] text-slate-400 block">{formatDate(sub.endDate)}</span>
                          )}
                        </td>
                      )}
                      {visibleColumns.includes('actions') && (
                        <td className="px-4 py-3 text-center relative">
                          <button
                            onClick={() => setShowActionsFor(showActionsFor === sub.id ? null : sub.id)}
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                          >
                            <MoreVertical className="w-4 h-4 text-slate-500" />
                          </button>
                          {showActionsFor === sub.id && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setShowActionsFor(null)} />
                              <div className="absolute right-0 mt-1 w-52 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 z-20 py-1 dark:text-white">
                                <button
                                  onClick={() => { setSelectedSubscription(sub); setShowActionsFor(null); }}
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"
                                >
                                  <CreditCard className="w-4 h-4 text-indigo-500" />
                                  Détail abonnement
                                </button>
                                <button
                                  onClick={() => {
                                    const raw = rawSubs.find(s => s.id === sub.id);
                                    if (raw) setEditingSub(raw);
                                    setShowActionsFor(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"
                                >
                                  <Eye className="w-4 h-4 text-blue-500" />
                                  Modifier
                                </button>
                                <button
                                  onClick={() => handleViewContract(sub.contractId)}
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"
                                >
                                  <ExternalLink className="w-4 h-4 text-slate-500" />
                                  Voir le contrat
                                </button>
                                <button
                                  onClick={() => {
                                    const raw = rawSubs.find(s => s.id === sub.id);
                                    if (raw) {
                                      setGeneratingInvoiceFor(raw);
                                      setInvoiceBillingDate(new Date().toISOString().split('T')[0]);
                                      setInvoiceDueDate('');
                                    }
                                    setShowActionsFor(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"
                                >
                                  <Receipt className="w-4 h-4 text-green-500" />
                                  Générer une facture
                                </button>
                                <hr className="my-1 border-slate-200 dark:border-slate-700" />
                                {sub.effectiveStatus === 'ACTIVE' && (
                                  <button
                                    onClick={() => { handleSuspend(sub.id); setShowActionsFor(null); }}
                                    className="w-full px-4 py-2 text-left text-sm hover:bg-orange-50 dark:hover:bg-orange-900/20 text-orange-600 flex items-center gap-2"
                                  >
                                    <PauseCircle className="w-4 h-4" />
                                    Suspendre
                                  </button>
                                )}
                                {sub.effectiveStatus !== 'CANCELLED' && sub.effectiveStatus !== 'CANCELED' && (
                                  <button
                                    onClick={() => { handleRésilier(sub.id); setShowActionsFor(null); }}
                                    className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 flex items-center gap-2"
                                  >
                                    <XCircle className="w-4 h-4" />
                                    Résilier
                                  </button>
                                )}
                                <hr className="my-1 border-slate-200 dark:border-slate-700" />
                                <button
                                  onClick={() => handleDeleteSub(sub)}
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 flex items-center gap-2"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Supprimer l'abonnement
                                </button>
                              </div>
                            </>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>}

      {/* Pagination — mb-20 pour éviter overlap avec le bouton AI flottant */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        className="px-2 mb-20"
      />

      {/* Subscription Detail Modal */}
      {selectedSubscription && (
        <SubscriptionDetailModal
          isOpen={!!selectedSubscription}
          onClose={() => setSelectedSubscription(null)}
          subscriptionNumber={selectedSubscription.subscriptionNumber}
          vehicleId={selectedSubscription.vehicleId}
          contractId={selectedSubscription.contractId}
          subscriptionId={selectedSubscription.id}
          monthlyFee={selectedSubscription.periodicFee}
          billingCycle={selectedSubscription.billingCycle}
          subscriptionStatus={selectedSubscription.effectiveStatus}
          autoRenew={selectedSubscription.autoRenew}
          startDate={selectedSubscription.startDate}
          endDate={selectedSubscription.endDate}
          nextBillingDate={selectedSubscription.nextBillingDate}
          onNavigate={onNavigate}
          onEdit={() => {
            const raw = rawSubs.find(s => s.id === selectedSubscription.id);
            if (raw) setEditingSub(raw);
            setSelectedSubscription(null);
          }}
          onSuspend={handleSuspend}
          onRésilier={handleRésilier}
        />
      )}

      {/* Edit Subscription Modal */}
      {editingSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">Modifier l'abonnement</h2>
              <button onClick={() => setEditingSub(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <SubscriptionForm
              vehicleId={editingSub.vehicle_id}
              vehiclePlate={editingSub.vehicle_plate || '-'}
              vehicleName={[editingSub.vehicle_brand, editingSub.vehicle_model].filter(Boolean).join(' ') || editingSub.vehicle_name}
              contractId={editingSub.contract_id}
              installationDate={vehicles.find(v => v.id === editingSub.vehicle_id)?.installDate ?? undefined}
              initialData={{
                id: editingSub.id,
                catalogItemId: (() => {
                  try {
                    const raw = editingSub.items;
                    const parsed = Array.isArray(raw) ? raw : JSON.parse(typeof raw === 'string' ? raw : '[]');
                    return Array.isArray(parsed) && parsed[0]?.catalog_item_id ? String(parsed[0].catalog_item_id) : '';
                  } catch { return ''; }
                })(),
                monthlyFee: Number(editingSub.monthly_fee) || 0,
                billingCycle: editingSub.billing_cycle as SubscriptionFormData['billingCycle'],
                startDate: editingSub.start_date,
                endDate: editingSub.end_date,
                notes: editingSub.notes ?? undefined,
                nextBillingDate: editingSub.next_billing_date ?? null,
              }}
              onSubmit={handleEditSubmit}
              onCancel={() => setEditingSub(null)}
            />
          </div>
        </div>
      )}

      {/* Generate Invoice Modal */}
      {generatingInvoiceFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Receipt className="w-5 h-5 text-green-500" />
                Générer une facture
              </h2>
              <button onClick={() => setGeneratingInvoiceFor(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg text-sm text-slate-600 dark:text-slate-300">
                <p className="font-medium">{generatingInvoiceFor.vehicle_plate || generatingInvoiceFor.vehicle_id}</p>
                <p className="text-xs text-slate-400 mt-0.5">{generatingInvoiceFor.client_name || generatingInvoiceFor.client_id}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Date de facturation <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={invoiceBillingDate}
                  onChange={e => setInvoiceBillingDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Date d'échéance <span className="text-slate-400 text-xs">(optionnel)</span>
                </label>
                <input
                  type="date"
                  value={invoiceDueDate}
                  onChange={e => setInvoiceDueDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white text-sm"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setGeneratingInvoiceFor(null)}
                  className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  Annuler
                </button>
                <button
                  onClick={handleGenerateInvoice}
                  disabled={!invoiceBillingDate || generatingInvoiceLoading}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2"
                >
                  {generatingInvoiceLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Receipt className="w-4 h-4" />}
                  Générer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Subscription — Step 1: Vehicle selection */}
      {showCreateForm && !createVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-500" />
                Sélectionner un véhicule
              </h2>
              <button
                onClick={() => { setShowCreateForm(false); setCreateVehicle(null); }}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-500">Sélectionnez le véhicule (ABO) pour créer un nouvel abonnement.</p>
              {vehicleOptions.length === 0 ? (
                <div className="text-center py-6 text-slate-500">
                  <Truck className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Tous les véhicules ont déjà un abonnement actif.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {vehicleOptions.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => setCreateVehicle(v)}
                      className="w-full flex items-center gap-3 px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 text-left transition-colors"
                    >
                      <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
                        <Truck className="w-4 h-4 text-slate-500" />
                      </div>
                      <div>
                        <p className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">{v.id}</p>
                        <p className="text-sm font-medium text-slate-800 dark:text-white">{v.plate}</p>
                        {v.name && <p className="text-xs text-slate-500">{v.name}</p>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Subscription — Step 2: Form */}
      {showCreateForm && createVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-500" />
                Créer un abonnement
              </h2>
              <button
                onClick={() => { setShowCreateForm(false); setCreateVehicle(null); }}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <SubscriptionForm
              vehicleId={createVehicle.id}
              vehiclePlate={createVehicle.plate}
              vehicleName={createVehicle.name}
              contractId={createVehicle.contractId}
              installationDate={createVehicle.installationDate}
              onSubmit={handleCreateSubmit}
              onCancel={() => { setShowCreateForm(false); setCreateVehicle(null); }}
            />
          </div>
        </div>
      )}

      {/* Mobile Filter Sheet */}
      <MobileFilterSheet
        isOpen={mobileFilterOpen}
        onClose={() => setMobileFilterOpen(false)}
        activeCount={(statusFilter !== 'ALL' ? 1 : 0) + (resellerFilter !== 'ALL' ? 1 : 0) + (cycleFilter !== 'ALL' ? 1 : 0)}
        onReset={() => { setStatusFilter('ALL'); setResellerFilter('ALL'); setCycleFilter('ALL'); }}
        tabs={[
          {
            id: 'status',
            label: 'Statut',
            activeCount: statusFilter !== 'ALL' ? 1 : 0,
            content: (
              <>
                <FilterRadioRow value="ALL" label="Tous" checked={statusFilter === 'ALL'} onChange={() => setStatusFilter('ALL')} />
                <FilterRadioRow value="ACTIVE" label="Actif" checked={statusFilter === 'ACTIVE'} onChange={() => setStatusFilter('ACTIVE')} />
                <FilterRadioRow value="PENDING" label="En attente" checked={statusFilter === 'PENDING'} onChange={() => setStatusFilter('PENDING')} />
                <FilterRadioRow value="EXPIRED" label="Expiré" checked={statusFilter === 'EXPIRED'} onChange={() => setStatusFilter('EXPIRED')} />
                <FilterRadioRow value="SUSPENDED" label="Suspendu" checked={statusFilter === 'SUSPENDED'} onChange={() => setStatusFilter('SUSPENDED')} />
                <FilterRadioRow value="CANCELLED" label="Résilié" checked={statusFilter === 'CANCELLED'} onChange={() => setStatusFilter('CANCELLED')} />
              </>
            ),
          },
          {
            id: 'reseller',
            label: 'Revendeur',
            activeCount: resellerFilter !== 'ALL' ? 1 : 0,
            content: (
              <>
                <FilterRadioRow value="ALL" label="Tous" checked={resellerFilter === 'ALL'} onChange={() => setResellerFilter('ALL')} />
                {resellers.map(r => (
                  <FilterRadioRow key={r.id} value={r.id} label={r.name} checked={resellerFilter === r.id} onChange={() => setResellerFilter(r.id)} />
                ))}
              </>
            ),
          },
          {
            id: 'cycle',
            label: 'Périodicité',
            activeCount: cycleFilter !== 'ALL' ? 1 : 0,
            content: (
              <>
                <FilterRadioRow value="ALL" label="Toutes" checked={cycleFilter === 'ALL'} onChange={() => setCycleFilter('ALL')} />
                <FilterRadioRow value="MONTHLY" label="Mensuel" checked={cycleFilter === 'MONTHLY'} onChange={() => setCycleFilter('MONTHLY')} />
                <FilterRadioRow value="QUARTERLY" label="Trimestriel" checked={cycleFilter === 'QUARTERLY'} onChange={() => setCycleFilter('QUARTERLY')} />
                <FilterRadioRow value="SEMESTRIAL" label="Semestriel" checked={cycleFilter === 'SEMESTRIAL'} onChange={() => setCycleFilter('SEMESTRIAL')} />
                <FilterRadioRow value="ANNUAL" label="Annuel" checked={cycleFilter === 'ANNUAL'} onChange={() => setCycleFilter('ANNUAL')} />
              </>
            ),
          },
        ] as MobileFilterTab[]}
      />
    </div>
  );
};
