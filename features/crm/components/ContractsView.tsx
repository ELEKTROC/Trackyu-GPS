import React, { useState, useMemo, useCallback } from 'react';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { MobileCard, MobileCardList, MobileCardAction } from '../../../components/MobileCard';
import { Card } from '../../../components/Card';
import { Pagination } from '../../../components/Pagination';
import { Modal } from '../../../components/Modal';
import type { Contract } from '../../../types';
import type { Invoice } from '../../../types';
import { useDataContext } from '../../../contexts/DataContext';
import { api } from '../../../services/apiLazy';
import { SearchBar } from '../../../components/SearchBar';
import {
  Plus,
  Filter,
  Calendar,
  CreditCard,
  Edit2,
  Trash2,
  FileText,
  Eye,
  MoreVertical,
  RefreshCw,
  DollarSign,
  Users,
  Loader2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  X,
  Building2,
  CheckSquare,
  Square,
  Play,
  Pause,
  XCircle,
} from 'lucide-react';
import { useToast } from '../../../contexts/ToastContext';
import { TOAST } from '../../../constants/toastMessages';
import { mapError } from '../../../utils/errorMapper';
import { useConfirmDialog } from '../../../components/ConfirmDialog';
import { ContractForm } from './ContractForm';
import { ContractDetailModal } from './ContractDetailModal';
import { useDateRange } from '../../../hooks/useDateRange';
import { DateRangeSelector } from '../../../components/DateRangeSelector';
import { useCurrency } from '../../../hooks/useCurrency';
import { MobileFilterSheet, FilterRadioRow, type MobileFilterTab } from '../../../components/MobileFilterSheet';

// --- Status & billing cycle translations ---
const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Brouillon',
  ACTIVE: 'Actif',
  SUSPENDED: 'Suspendu',
  EXPIRED: 'Expiré',
  TERMINATED: 'Résilié',
  CANCELLED: 'Annulé',
};

const BILLING_CYCLE_LABELS: Record<string, string> = {
  MONTHLY: 'Mensuel',
  QUARTERLY: 'Trimestriel',
  SEMESTRIAL: 'Semestriel',
  ANNUAL: 'Annuel',
  YEARLY: 'Annuel',
  monthly: 'Mensuel',
  quarterly: 'Trimestriel',
  semi_annual: 'Semestriel',
  yearly: 'Annuel',
};

type SortField = 'clientName' | 'startDate' | 'endDate' | 'monthlyFee' | 'vehicleCount' | 'status' | 'billingCycle';
type SortDir = 'asc' | 'desc';

export const ContractsView: React.FC<{ dateRange?: { start: string; end: string } }> = ({
  dateRange: externalDateRange,
}) => {
  const isMobile = useIsMobile();
  const { contracts, invoices, vehicles, tiers, addContract, updateContract, deleteContract } = useDataContext();
  const { showToast } = useToast();
  const { confirm, ConfirmDialogComponent } = useConfirmDialog();
  const { formatPrice } = useCurrency();

  // --- DATE LOGIC ---
  const {
    periodPreset,
    setPeriodPreset,
    customDateRange,
    setCustomDateRange,
    dateRange: internalDateRange,
  } = useDateRange('ALL');

  const dateRange = externalDateRange || internalDateRange;

  const filteredContractsByDate = useMemo(() => {
    if (!dateRange) return contracts;
    const rangeStart = new Date(dateRange.start);
    const rangeEnd = new Date(dateRange.end);
    return contracts.filter((c) => {
      if (!c.startDate) return true;
      const startDate = new Date(c.startDate);
      if (isNaN(startDate.getTime())) return true;
      // Contrat actif pendant la période : a démarré avant la fin de plage
      // ET (pas de fin OU se termine après le début de plage)
      const endDate = c.endDate ? new Date(c.endDate) : null;
      return startDate <= rangeEnd && (endDate === null || endDate >= rangeStart);
    });
  }, [contracts, dateRange]);

  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | undefined>(undefined);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [generatingInvoice, setGeneratingInvoice] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [resellerFilter, setResellerFilter] = useState<string>('ALL');
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [sortField, setSortField] = useState<SortField>('startDate');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [tenantTaxRate, setTenantTaxRate] = useState<number>(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Fetch tenant tax rate via api.ts (not direct fetch)
  React.useEffect(() => {
    const fetchTenantSettings = async () => {
      try {
        const tenant = await api.tenants.getCurrent();
        setTenantTaxRate(parseFloat(tenant.default_tax_rate) || 0);
      } catch {
        // Silent — use default 0%
      }
    };
    fetchTenantSettings();
  }, []);

  // --- Resolve client name ---
  const getClientName = useCallback(
    (contract: Contract): string => {
      if (contract.clientName) return contract.clientName;
      const tier = tiers.find((t) => t.id === contract.clientId);
      return tier?.name || contract.clientId;
    },
    [tiers]
  );

  // --- Generate Invoice from Contract (via api.ts) ---
  const handleGenerateInvoice = useCallback(
    async (contract: Contract) => {
      const contractRef = contract.contractNumber || contract.id.slice(0, 8).toUpperCase();
      if (
        !(await confirm({
          message: `Générer une facture BROUILLON pour le contrat ${contractRef} ?\n\nLa facture sera créée en mode brouillon pour vérification avant envoi.`,
          variant: 'info',
          title: 'Générer une facture',
          confirmLabel: 'Générer',
        }))
      )
        return;

      setGeneratingInvoice(contract.id);
      try {
        const tier = tiers.find(
          (t) => t.id === contract.clientId || t.id === (contract as Contract & { tierId?: string }).tierId
        );

        // Charger les abonnements actifs pour ce contrat
        const allSubs = (await api.subscriptions.list()) as unknown[];
        const subs: any[] = allSubs.filter(
          (s: any) =>
            (s.contract_id === contract.id || s.contractId === contract.id) &&
            (s.status || '').toUpperCase() === 'ACTIVE'
        );

        const today = new Date();
        const dueDate = new Date(today);
        dueDate.setDate(dueDate.getDate() + 30);
        const billingCycle = (contract.billingCycle || 'ANNUAL').toUpperCase();
        const year = today.getFullYear().toString();
        const CYCLE_LABEL: Record<string, string> = {
          MONTHLY: 'MENSUEL',
          QUARTERLY: 'TRIMESTRIEL',
          SEMESTRIAL: 'SEMESTRIEL',
          ANNUAL: 'ANNUEL',
          YEARLY: 'ANNUEL',
        };

        let items: any[] = [];
        let totalHT = 0;
        let effectiveTaxRate = tenantTaxRate;
        const plates: string[] = [];

        if (subs.length > 0) {
          // Grouper par (catalog_item_id + unit_price) — même logique que recurringInvoiceService
          const groups = new Map<string, { subs: any[]; catalogItem: any; unitPrice: number; taxRate: number }>();
          for (const s of subs) {
            const plate = s.vehicle_plate || s.vehiclePlate || s.vehicle_id || s.vehicleId || '?';
            plates.push(plate);
            const subItems = s.items ? (typeof s.items === 'string' ? JSON.parse(s.items) : s.items) : null;
            const catalogItem = Array.isArray(subItems) && subItems.length > 0 ? subItems[0] : null;
            const unitPrice = catalogItem?.unit_price ?? parseFloat(s.monthly_fee || s.monthlyFee || 0);
            const taxRate = catalogItem?.tax_rate ?? tenantTaxRate;
            const key = `${catalogItem?.catalog_item_id || ''}::${unitPrice}`;
            if (!groups.has(key)) groups.set(key, { subs: [], catalogItem, unitPrice, taxRate });
            groups.get(key)!.subs.push({ ...s, _plate: plate });
          }
          for (const grp of groups.values()) {
            const groupPlates = grp.subs.map((s: any) => s._plate).join(', ');
            const baseDesc =
              grp.catalogItem?.description || `Abonnement ${CYCLE_LABEL[billingCycle] || billingCycle} ${year}`;
            const qty = grp.subs.length;
            totalHT += grp.unitPrice * qty;
            effectiveTaxRate = grp.taxRate;
            items.push({ description: `${baseDesc} — ${groupPlates}`, quantity: qty, unit_price: grp.unitPrice });
          }
        } else {
          // Fallback sans abonnements
          totalHT = contract.monthlyFee || 0;
          items = [
            {
              description: `Abonnement ${CYCLE_LABEL[billingCycle] || billingCycle} ${year} — ${contractRef}`,
              quantity: 1,
              unit_price: totalHT,
            },
          ];
        }

        const subject =
          plates.length > 0
            ? `REABONNEMENT ${CYCLE_LABEL[billingCycle] || billingCycle} ${year} — ${plates.join(', ')}`
            : `REABONNEMENT ${CYCLE_LABEL[billingCycle] || billingCycle} ${year} — ${contractRef}`;

        const amountTTC = totalHT * (1 + effectiveTaxRate / 100);

        await api.invoices.create({
          tier_id: tier?.id || contract.clientId,
          client_id: tier?.id || contract.clientId,
          subject,
          date: today.toISOString().split('T')[0],
          due_date: dueDate.toISOString().split('T')[0],
          amount: amountTTC,
          vat_rate: effectiveTaxRate,
          items,
          notes: `Facture générée manuellement — contrat ${contractRef}`,
          status: 'DRAFT',
          category: 'ABONNEMENT',
          contract_id: contract.id,
          license_plate: plates.join(', ') || null,
          subscription_number:
            subs
              .map((s: any) => s.vehicle_id || s.vehicleId)
              .filter(Boolean)
              .join(', ') || null,
        } as unknown as Invoice);

        showToast(TOAST.CRM.CONTRACT_INVOICE_GENERATED, 'success');
      } catch (error: unknown) {
        showToast(mapError(error, 'facture'), 'error');
      } finally {
        setGeneratingInvoice(null);
      }
    },
    [tiers, showToast, tenantTaxRate, confirm]
  );

  // --- KPIs Calculation ---
  const kpis = useMemo(() => {
    const activeContracts = filteredContractsByDate.filter((c) => c.status === 'ACTIVE');

    // MRR normalisé: ramener tous les montants à un équivalent mensuel
    const getMRRFromContract = (c: Contract) => {
      const fee = c.monthlyFee || 0;
      const cycle = (c.billingCycle || '').toLowerCase();
      // Le montant stocké est le prix UNITAIRE par véhicule selon le cycle
      // On calcule d'abord le total pour ce contrat, puis on normalise en mensuel
      const vehicleCount = c.vehicleIds?.length || c.vehicleCount || 0;
      const totalContractFee = fee * vehicleCount;
      if (cycle === 'yearly' || cycle === 'annual') return totalContractFee / 12;
      if (cycle === 'semi_annual' || cycle === 'semestrial') return totalContractFee / 6;
      if (cycle === 'quarterly') return totalContractFee / 3;
      return totalContractFee; // monthly
    };
    const totalMRR = activeContracts.reduce((sum, c) => sum + getMRRFromContract(c), 0);

    // Véhicules couverts: compter les véhicules dont le client a un contrat actif
    // 1. Récupérer les ID des tiers (clients) qui ont au moins un contrat actif
    const tiersWithActiveContract = new Set(activeContracts.map((c) => c.clientId).filter(Boolean));
    // 2. Compter les véhicules appartenant à ces clients
    const totalVehicles = vehicles.filter((v) => v.clientId && tiersWithActiveContract.has(v.clientId)).length;

    // Calcul réel de la durée moyenne des contrats
    const contractsWithEnd = activeContracts.filter((c) => c.endDate);
    const avgDuration =
      contractsWithEnd.length > 0
        ? Math.round(
            contractsWithEnd.reduce((sum, c) => {
              const start = new Date(c.startDate);
              const end = new Date(c.endDate!);
              return sum + Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30));
            }, 0) / contractsWithEnd.length
          )
        : 12;

    // Renewals in next 30 days (contrats à renouveler)
    const today = new Date();
    const next30Days = new Date();
    next30Days.setDate(today.getDate() + 30);

    const renewals = filteredContractsByDate.filter((c) => {
      if (c.status !== 'ACTIVE' || !c.endDate) return false;
      const endDate = new Date(c.endDate);
      return endDate >= today && endDate <= next30Days;
    }).length;

    return {
      activeCount: activeContracts.length,
      mrr: totalMRR,
      vehiclesCovered: totalVehicles,
      renewalsUpcoming: renewals,
      avgDuration,
    };
  }, [filteredContractsByDate, vehicles]);

  const handleCreate = () => {
    setEditingContract(undefined);
    setShowForm(true);
  };

  const handleEdit = (contract: Contract) => {
    setEditingContract(contract);
    setShowForm(true);
  };

  const handleView = (contract: Contract) => {
    setSelectedContract(contract);
    setShowDetail(true);
  };

  const [statusMenuId, setStatusMenuId] = useState<string | null>(null);
  const [renewingContract, setRenewingContract] = useState<Contract | null>(null);
  const [renewEndDate, setRenewEndDate] = useState('');
  const [vehicleConflicts, setVehicleConflicts] = useState<{ vehicleId: string; contractNumber: string }[] | null>(
    null
  );
  const [showBulkEndDateModal, setShowBulkEndDateModal] = useState(false);
  const [bulkEndDate, setBulkEndDate] = useState('');
  const [bulkNeverExpires, setBulkNeverExpires] = useState(false);

  // Transitions de statut autorisées
  const STATUS_TRANSITIONS: Record<string, { value: string; label: string; color: string }[]> = {
    DRAFT: [{ value: 'ACTIVE', label: 'Activer', color: 'text-green-600' }],
    ACTIVE: [
      { value: 'SUSPENDED', label: 'Suspendre', color: 'text-yellow-600' },
      { value: 'TERMINATED', label: 'Résilier', color: 'text-red-600' },
    ],
    SUSPENDED: [
      { value: 'ACTIVE', label: 'Réactiver', color: 'text-green-600' },
      { value: 'TERMINATED', label: 'Résilier', color: 'text-red-600' },
    ],
    EXPIRED: [
      { value: 'ACTIVE', label: 'Renouveler', color: 'text-green-600' },
      { value: 'TERMINATED', label: 'Résilier', color: 'text-red-600' },
    ],
    TERMINATED: [{ value: 'ACTIVE', label: 'Réactiver', color: 'text-green-600' }],
  };

  const handleStatusChange = async (contract: Contract, newStatus: string) => {
    setStatusMenuId(null);
    const statusLabels: Record<string, string> = {
      ACTIVE: 'Actif',
      SUSPENDED: 'Suspendu',
      EXPIRED: 'Expiré',
      TERMINATED: 'Résilié',
      DRAFT: 'Brouillon',
    };

    // Renewal: show dedicated modal to collect new end date
    if (newStatus === 'ACTIVE' && contract.status === 'EXPIRED') {
      setRenewEndDate(
        contract.endDate
          ? new Date(new Date(contract.endDate).setFullYear(new Date(contract.endDate).getFullYear() + 1))
              .toISOString()
              .split('T')[0]
          : new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0]
      );
      setRenewingContract(contract);
      return;
    }

    const confirmed = await confirm({
      title: 'Changer le statut',
      message: `Passer le contrat ${contract.contractNumber || contract.id.slice(0, 8)} de "${statusLabels[contract.status] || contract.status}" à "${statusLabels[newStatus] || newStatus}" ?`,
      confirmLabel: 'Confirmer',
      variant: newStatus === 'TERMINATED' ? 'danger' : 'info',
    });
    if (!confirmed) return;
    try {
      if (newStatus === 'TERMINATED') {
        await api.contracts.terminate(contract.id, { reason: 'Résiliation manuelle' });
      }
      await updateContract({ ...contract, status: newStatus as Contract['status'] });
      showToast(TOAST.CRM.CONTRACT_STATUS_CHANGED(statusLabels[newStatus]), 'success');
    } catch (err) {
      showToast(mapError(err, 'contrat'), 'error');
    }
  };

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) {
        n.delete(id);
      } else {
        n.add(id);
      }
      return n;
    });
  const toggleSelectAll = () =>
    setSelectedIds((prev) =>
      prev.size === paginatedContracts.length ? new Set() : new Set(paginatedContracts.map((c) => c.id))
    );

  const handleBulkStatus = async (newStatus: Contract['status']) => {
    const targets = filteredContracts.filter((c) => selectedIds.has(c.id));
    for (const c of targets) {
      try {
        if (newStatus === 'TERMINATED') await api.contracts.terminate(c.id, { reason: 'Résiliation groupée' });
        await updateContract({ ...c, status: newStatus });
      } catch {
        /* continue */
      }
    }
    showToast(`${targets.length} contrat(s) mis à jour`, 'success');
    setSelectedIds(new Set());
  };

  const handleBulkDelete = async () => {
    const confirmed = await confirm({
      title: 'Supprimer',
      message: `Supprimer ${selectedIds.size} contrat(s) ?`,
      confirmLabel: 'Supprimer',
      variant: 'danger',
    });
    if (!confirmed) return;
    for (const id of selectedIds) {
      try {
        await api.contracts.delete(id);
        deleteContract(id);
      } catch {
        /* continue */
      }
    }
    showToast(`${selectedIds.size} contrat(s) supprimés`, 'success');
    setSelectedIds(new Set());
  };

  const handleBulkEndDate = async () => {
    const targets = filteredContracts.filter((c) => selectedIds.has(c.id));
    const newEndDate = bulkNeverExpires ? null : bulkEndDate;
    for (const c of targets) {
      try {
        await updateContract({ ...c, endDate: newEndDate ?? undefined });
      } catch {
        /* continue */
      }
    }
    showToast(`Date de fin mise à jour sur ${targets.length} contrat(s)`, 'success');
    setShowBulkEndDateModal(false);
    setBulkEndDate('');
    setBulkNeverExpires(false);
    setSelectedIds(new Set());
  };

  const handleBulkGenerateInvoices = async () => {
    const targets = filteredContracts.filter((c) => selectedIds.has(c.id) && c.status === 'ACTIVE');
    for (const c of targets) {
      try {
        await handleGenerateInvoice(c);
      } catch {
        /* continue */
      }
    }
    setSelectedIds(new Set());
  };

  const handleRenewSubmit = async () => {
    if (!renewingContract) return;
    try {
      await api.contracts.renew(renewingContract.id, { newEndDate: renewEndDate || undefined });
      await updateContract({
        ...renewingContract,
        status: 'ACTIVE',
        endDate: renewEndDate || renewingContract.endDate,
      });
      showToast(TOAST.CRM.CONTRACT_STATUS_CHANGED('Actif'), 'success');
      setRenewingContract(null);
    } catch (err) {
      showToast(mapError(err, 'contrat'), 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (
      await confirm({
        message: 'Êtes-vous sûr de vouloir supprimer ce contrat ?',
        variant: 'danger',
        title: 'Confirmer la suppression',
        confirmLabel: 'Supprimer',
      })
    ) {
      deleteContract(id);
      showToast(TOAST.CRM.CONTRACT_DELETED, 'success');
    }
  };

  const handleSubmit = async (data: Partial<Contract>) => {
    try {
      if (editingContract) {
        await updateContract({ ...editingContract, ...data } as Contract);
        showToast(TOAST.CRM.CONTRACT_UPDATED, 'success');
      } else {
        addContract(data as Contract);
        showToast(TOAST.CRM.CONTRACT_CREATED, 'success');
      }
      setShowForm(false);
    } catch (error: unknown) {
      const err = error as Error & { conflicts?: { vehicleId: string; contractNumber: string }[] };
      if (err.conflicts && err.conflicts.length > 0) {
        setVehicleConflicts(err.conflicts);
      } else {
        showToast(mapError(error, 'contrat'), 'error');
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'DRAFT':
        return 'bg-[var(--primary-dim)] text-[var(--primary)] border-[var(--border)]';
      case 'SUSPENDED':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'EXPIRED':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'TERMINATED':
        return 'bg-[var(--bg-elevated)] text-[var(--text-primary)] border-[var(--border)]';
      default:
        return 'bg-[var(--bg-elevated)] text-[var(--text-primary)] border-[var(--border)]';
    }
  };

  // --- Unique resellers for filter ---
  const resellers = useMemo(() => {
    const map = new Map<string, string>();
    contracts.forEach((c) => {
      if (c.resellerName && c.tenantId) map.set(c.tenantId, c.resellerName);
    });
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [contracts]);

  // --- Search + filter + sort ---
  const filteredContracts = useMemo(() => {
    let result = filteredContractsByDate;

    // Status filter
    if (statusFilter !== 'ALL') {
      result = result.filter((c) => c.status === statusFilter);
    }

    // Reseller filter (by tenantId for reliability)
    if (resellerFilter !== 'ALL') {
      result = result.filter((c) => c.tenantId === resellerFilter);
    }

    // Search (by client name, ID, subject, status, amount)
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (c) =>
          c.id.toLowerCase().includes(term) ||
          (c.contractNumber || '').toLowerCase().includes(term) ||
          getClientName(c).toLowerCase().includes(term) ||
          (c.subject || '').toLowerCase().includes(term) ||
          (STATUS_LABELS[c.status] || c.status).toLowerCase().includes(term) ||
          String(c.monthlyFee).includes(term)
      );
    }

    // Sort
    result = [...result].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'clientName':
          cmp = getClientName(a).localeCompare(getClientName(b));
          break;
        case 'startDate':
          cmp =
            (a.startDate ? new Date(a.startDate).getTime() : 0) - (b.startDate ? new Date(b.startDate).getTime() : 0);
          break;
        case 'endDate':
          cmp =
            (a.endDate ? new Date(a.endDate).getTime() : Infinity) -
            (b.endDate ? new Date(b.endDate).getTime() : Infinity);
          break;
        case 'monthlyFee':
          cmp = (a.monthlyFee || 0) - (b.monthlyFee || 0);
          break;
        case 'vehicleCount':
          cmp = (a.vehicleIds?.length || a.vehicleCount || 0) - (b.vehicleIds?.length || b.vehicleCount || 0);
          break;
        case 'billingCycle':
          cmp = (a.billingCycle || '').localeCompare(b.billingCycle || '');
          break;
        case 'status':
          cmp = (a.status || '').localeCompare(b.status || '');
          break;
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });

    return result;
  }, [filteredContractsByDate, statusFilter, resellerFilter, searchTerm, sortField, sortDir, getClientName]);

  const totalPages = Math.ceil(filteredContracts.length / itemsPerPage);
  const paginatedContracts = filteredContracts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Reset page on filter change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, resellerFilter, sortField, sortDir]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const SortIcon: React.FC<{ field: SortField }> = ({ field }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 opacity-30" />;
    return sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />;
  };

  // --- Export CSV ---
  const handleExportCSV = () => {
    const headers = [
      'Réf.',
      'Client',
      'Revendeur',
      'Début',
      'Fin',
      'Prix Unitaire',
      'Véhicules',
      'Total',
      'Cycle',
      'Statut',
    ];
    const rows = filteredContracts.map((c) => [
      c.contractNumber || c.id.slice(0, 8),
      getClientName(c),
      c.resellerName || '',
      new Date(c.startDate).toLocaleDateString('fr-FR'),
      c.endDate ? new Date(c.endDate).toLocaleDateString('fr-FR') : "N'expire jamais",
      c.monthlyFee,
      c.vehicleIds?.length || c.vehicleCount || 0,
      (c.monthlyFee || 0) * (c.vehicleIds?.length || c.vehicleCount || 0),
      BILLING_CYCLE_LABELS[c.billingCycle] || c.billingCycle,
      STATUS_LABELS[c.status] || c.status,
    ]);

    const csv = [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contrats_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(TOAST.IO.EXPORT_SUCCESS('CSV', filteredContracts.length), 'success');
  };

  return (
    <div className="space-y-4 sm:space-y-6 sm:h-full sm:flex sm:flex-col animate-in fade-in duration-500">
      {/* Header - only shown when standalone (not embedded in SalesView) */}
      {!externalDateRange && (
        <div className="flex justify-between items-center">
          <div>
            <h2 className="page-title">Abonnements & Contrats</h2>
            <p className="page-subtitle">Gestion centralisée des revenus récurrents (SaaS)</p>
          </div>
          <div className="flex items-center gap-4">
            <DateRangeSelector
              periodPreset={periodPreset}
              setPeriodPreset={setPeriodPreset}
              customDateRange={customDateRange}
              setCustomDateRange={setCustomDateRange}
            />
            <button
              onClick={handleCreate}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-light)] transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Nouveau Contrat
            </button>
          </div>
        </div>
      )}

      {/* KPI CARDS - Hidden on mobile */}
      {!isMobile && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4 border-l-4 border-l-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="section-title">Contrats Actifs</p>
                <p className="page-title mt-1">{kpis.activeCount}</p>
              </div>
              <div className="p-3 bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] rounded-full text-[var(--primary)]">
                <FileText className="w-6 h-6" />
              </div>
            </div>
          </Card>
          <Card className="p-4 border-l-4 border-l-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="section-title">MRR</p>
                <p className="page-title mt-1">{formatPrice(kpis.mrr)}</p>
              </div>
              <div className="p-3 bg-[var(--clr-success-dim)] rounded-full text-green-600">
                <DollarSign className="w-6 h-6" />
              </div>
            </div>
          </Card>
          <Card className="p-4 border-l-4 border-l-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="section-title">Véhicules Couverts</p>
                <p className="page-title mt-1">{kpis.vehiclesCovered}</p>
              </div>
              <div className="p-3 bg-[var(--clr-info-dim)] rounded-full text-purple-600">
                <Users className="w-6 h-6" />
              </div>
            </div>
          </Card>
          <Card className="p-4 border-l-4 border-l-orange-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="section-title">Renouvellements (30j)</p>
                <p className="page-title mt-1">{kpis.renewalsUpcoming}</p>
              </div>
              <div className="p-3 bg-[var(--clr-warning-dim)] rounded-full text-orange-600">
                <RefreshCw className="w-6 h-6" />
              </div>
            </div>
          </Card>
        </div>
      )}

      <Card className="flex-1 flex flex-col min-h-0">
        <div
          className="toolbar p-3 sm:p-4 border-b flex-col sm:flex-row"
          style={{ borderBottomColor: 'var(--border)', backgroundColor: 'var(--bg-elevated)' }}
        >
          <SearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Rechercher (client, réf., statut, montant)..."
            className="flex-1"
          />
          <div className="flex gap-2 items-center flex-wrap sm:flex-nowrap">
            {/* Mobile filter button */}
            {isMobile && (
              <button onClick={() => setMobileFilterOpen(true)} className="icon-btn">
                <Filter className="w-4 h-4" />
                Filtres
                {(statusFilter !== 'ALL' || resellerFilter !== 'ALL') && (
                  <span className="absolute -top-1.5 -right-1.5 bg-[var(--primary-dim)]0 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                    {(statusFilter !== 'ALL' ? 1 : 0) + (resellerFilter !== 'ALL' ? 1 : 0)}
                  </span>
                )}
              </button>
            )}
            {/* Status filter pills — desktop only */}
            <div className="hidden sm:flex gap-1 overflow-x-auto pb-0.5 max-w-full">
              {['ALL', 'ACTIVE', 'DRAFT', 'SUSPENDED', 'EXPIRED', 'TERMINATED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`filter-chip ${statusFilter === st ? 'active' : ''}`}
                >
                  {st === 'ALL' ? 'Tous' : STATUS_LABELS[st]}
                </button>
              ))}
            </div>
            {/* Reseller filter — desktop only */}
            {resellers.length > 1 && (
              <div className="hidden sm:block relative">
                <Building2 className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
                <select
                  value={resellerFilter}
                  onChange={(e) => setResellerFilter(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-lg text-xs font-bold border appearance-none cursor-pointer"
                  style={{
                    borderColor: 'var(--border)',
                    backgroundColor: 'var(--bg-elevated)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <option value="ALL">Tous revendeurs</option>
                  {resellers.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <button
              onClick={handleExportCSV}
              className="icon-btn hover:text-green-600 hover:border-green-300"
              title="Exporter CSV"
            >
              <Download className="w-4 h-4" />
            </button>
            {/* Nouveau Contrat button - shown here when in SalesView context */}
            {externalDateRange && (
              <button
                onClick={handleCreate}
                className="flex items-center gap-2 px-3 py-1.5 bg-[var(--primary)] text-white text-xs font-bold rounded-lg hover:bg-[var(--primary-light)] transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Nouveau
              </button>
            )}
          </div>
        </div>

        {/* Empty state */}
        {filteredContracts.length === 0 && (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <FileText className="w-12 h-12 mb-3 text-[var(--text-muted)]" />
            {searchTerm || statusFilter !== 'ALL' || resellerFilter !== 'ALL' ? (
              <>
                <p className="text-[var(--text-secondary)] font-medium">Aucun contrat ne correspond aux filtres</p>
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('ALL');
                    setResellerFilter('ALL');
                  }}
                  className="mt-2 text-sm text-[var(--primary)] hover:underline flex items-center gap-1"
                >
                  <X className="w-3 h-3" /> Réinitialiser les filtres
                </button>
              </>
            ) : (
              <>
                <p className="text-[var(--text-secondary)] font-medium">Aucun contrat trouvé</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">Créez votre premier contrat pour commencer</p>
                <button
                  onClick={handleCreate}
                  className="mt-3 px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm hover:bg-[var(--primary-light)] flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Nouveau Contrat
                </button>
              </>
            )}
          </div>
        )}

        {/* Bulk actions bar */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 px-4 py-2 bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] border border-[var(--border)] dark:border-[var(--primary)] rounded-lg">
            <span className="text-sm font-medium text-[var(--primary)] dark:text-[var(--primary)]">
              {selectedIds.size} sélectionné{selectedIds.size > 1 ? 's' : ''}
            </span>
            <div className="flex gap-2 ml-auto flex-wrap">
              <button
                onClick={() => handleBulkStatus('ACTIVE')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[var(--bg-elevated)] border border-[var(--clr-success-border)] text-green-700 rounded-lg hover:bg-[var(--clr-success-dim)]"
              >
                <Play className="w-3.5 h-3.5" /> Activer
              </button>
              <button
                onClick={() => handleBulkStatus('SUSPENDED')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[var(--bg-elevated)] border border-[var(--clr-warning-border)] text-orange-700 rounded-lg hover:bg-[var(--clr-warning-dim)]"
              >
                <Pause className="w-3.5 h-3.5" /> Suspendre
              </button>
              <button
                onClick={() => handleBulkStatus('TERMINATED')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-secondary)] rounded-lg hover:bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)]"
              >
                <XCircle className="w-3.5 h-3.5" /> Résilier
              </button>
              <button
                onClick={() => {
                  setBulkEndDate('');
                  setBulkNeverExpires(false);
                  setShowBulkEndDateModal(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[var(--bg-elevated)] border border-[var(--border)] dark:border-[var(--primary)] text-[var(--primary)] rounded-lg hover:bg-[var(--primary-dim)] dark:hover:bg-[var(--primary-dim)]"
              >
                <Calendar className="w-3.5 h-3.5" /> Date de fin
              </button>
              <button
                onClick={handleBulkGenerateInvoices}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg hover:bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)]"
              >
                <DollarSign className="w-3.5 h-3.5 text-green-500" /> Générer factures
              </button>
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[var(--bg-elevated)] border border-[var(--clr-danger-border)] text-red-600 rounded-lg hover:bg-[var(--clr-danger-dim)]"
              >
                <Trash2 className="w-3.5 h-3.5" /> Supprimer
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="p-1.5 hover:bg-[var(--primary-dim)] dark:hover:bg-[var(--primary-dim)] rounded"
              >
                <X className="w-3.5 h-3.5 text-[var(--primary)]" />
              </button>
            </div>
          </div>
        )}

        {/* Mobile cards */}
        {filteredContracts.length > 0 && isMobile && (
          <MobileCardList bordered={false} className="pb-20">
            {paginatedContracts.map((contract) => {
              const borderColor =
                contract.status === 'ACTIVE'
                  ? 'border-l-green-500'
                  : contract.status === 'DRAFT'
                    ? 'border-l-blue-500'
                    : contract.status === 'SUSPENDED'
                      ? 'border-l-orange-500'
                      : contract.status === 'EXPIRED'
                        ? 'border-l-red-500'
                        : 'border-l-slate-400';
              const totalMensuel =
                (contract.monthlyFee || 0) * (contract.vehicleIds?.length || contract.vehicleCount || 1);
              return (
                <MobileCard key={contract.id} borderColor={borderColor} onClick={() => handleView(contract)}>
                  {/* Primary: Client + Ref + Total */}
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-sm text-[var(--text-primary)] truncate">{getClientName(contract)}</p>
                      <span className="font-mono text-xs text-[var(--primary)] dark:text-[var(--primary)]">
                        {contract.contractNumber || contract.id.slice(0, 8).toUpperCase()}
                      </span>
                    </div>
                    <p className="font-bold text-sm text-[var(--text-primary)] shrink-0">
                      {formatPrice(totalMensuel)}
                      <span className="text-xs font-normal text-[var(--text-muted)]">/mois</span>
                    </p>
                  </div>
                  {/* Secondary: Nb véhicules + Statut */}
                  <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)] mb-2">
                    <span>{contract.vehicleIds?.length || contract.vehicleCount || 0} véh.</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold border uppercase ${getStatusColor(contract.status)}`}
                    >
                      {STATUS_LABELS[contract.status] || contract.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MobileCardAction
                      color="blue"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(contract);
                      }}
                    >
                      Modifier
                    </MobileCardAction>
                    <MobileCardAction
                      color="red"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(contract.id);
                      }}
                    >
                      Supprimer
                    </MobileCardAction>
                  </div>
                </MobileCard>
              );
            })}
          </MobileCardList>
        )}

        {/* Table — desktop only */}
        {filteredContracts.length > 0 && !isMobile && (
          <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--bg-elevated)] text-[var(--text-secondary)] uppercase font-bold text-xs sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="px-3 py-3 w-10">
                    <button onClick={toggleSelectAll} className="text-[var(--text-muted)] hover:text-[var(--primary)]">
                      {selectedIds.size === paginatedContracts.length && paginatedContracts.length > 0 ? (
                        <CheckSquare className="w-4 h-4 text-[var(--primary)]" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="px-6 py-3">Réf. Contrat</th>
                  <th className="px-6 py-3 cursor-pointer select-none" onClick={() => handleSort('clientName')}>
                    <span className="flex items-center gap-1">
                      Client <SortIcon field="clientName" />
                    </span>
                  </th>
                  <th className="px-6 py-3">Revendeur</th>
                  <th className="px-6 py-3 cursor-pointer select-none" onClick={() => handleSort('startDate')}>
                    <span className="flex items-center gap-1">
                      Début <SortIcon field="startDate" />
                    </span>
                  </th>
                  <th className="px-6 py-3 cursor-pointer select-none" onClick={() => handleSort('endDate')}>
                    <span className="flex items-center gap-1">
                      Fin <SortIcon field="endDate" />
                    </span>
                  </th>
                  <th
                    className="px-6 py-3 text-right cursor-pointer select-none"
                    onClick={() => handleSort('monthlyFee')}
                  >
                    <span className="flex items-center gap-1 justify-end">
                      Prix Unit. <SortIcon field="monthlyFee" />
                    </span>
                  </th>
                  <th
                    className="px-6 py-3 text-center cursor-pointer select-none"
                    onClick={() => handleSort('vehicleCount')}
                  >
                    <span className="flex items-center gap-1 justify-center">
                      Véhicules <SortIcon field="vehicleCount" />
                    </span>
                  </th>
                  <th className="px-6 py-3 text-right">Total</th>
                  <th
                    className="px-6 py-3 text-center cursor-pointer select-none"
                    onClick={() => handleSort('billingCycle')}
                  >
                    <span className="flex items-center gap-1 justify-center">
                      Cycle <SortIcon field="billingCycle" />
                    </span>
                  </th>
                  <th className="px-6 py-3 text-center cursor-pointer select-none" onClick={() => handleSort('status')}>
                    <span className="flex items-center gap-1 justify-center">
                      Statut <SortIcon field="status" />
                    </span>
                  </th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] bg-[var(--bg-surface)]">
                {paginatedContracts.map((contract) => (
                  <tr
                    key={contract.id}
                    className={`tr-hover/50 transition-colors group ${selectedIds.has(contract.id) ? 'bg-[var(--primary-dim)]/50 dark:bg-[var(--primary-dim)]' : ''}`}
                  >
                    <td className="px-3 py-4">
                      <button
                        onClick={() => toggleSelect(contract.id)}
                        className="text-[var(--text-muted)] hover:text-[var(--primary)]"
                      >
                        {selectedIds.has(contract.id) ? (
                          <CheckSquare className="w-4 h-4 text-[var(--primary)]" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs font-bold text-[var(--primary)]">
                      {contract.contractNumber || contract.id.slice(0, 8).toUpperCase()}
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-[var(--text-primary)]">{getClientName(contract)}</p>
                        {contract.subject && (
                          <p className="text-xs text-[var(--text-muted)] truncate max-w-[200px]">{contract.subject}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {contract.resellerName ? (
                        <span className="inline-flex items-center gap-1 text-xs text-[var(--text-secondary)]">
                          <Building2 className="w-3 h-3" />
                          {contract.resellerName}
                        </span>
                      ) : (
                        <span className="text-xs text-[var(--text-muted)]">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-[var(--text-secondary)] text-xs whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(contract.startDate).toLocaleDateString('fr-FR')}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs whitespace-nowrap">
                      {contract.endDate ? (
                        <span className="text-[var(--text-secondary)]">
                          {new Date(contract.endDate).toLocaleDateString('fr-FR')}
                        </span>
                      ) : (
                        <span className="text-emerald-600 font-medium">∞ Sans fin</span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-bold text-[var(--text-primary)] text-right">
                      {formatPrice(contract.monthlyFee ?? 0)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--bg-elevated)] text-[var(--text-primary)] bg-[var(--bg-elevated)] text-[var(--text-primary)]">
                        {contract.vehicleIds?.length || contract.vehicleCount || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-[var(--clr-success-strong)] text-right">
                      {formatPrice(
                        (contract.monthlyFee || 0) * (contract.vehicleIds?.length || contract.vehicleCount || 0)
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-xs text-[var(--text-secondary)]">
                        {BILLING_CYCLE_LABELS[contract.billingCycle] || contract.billingCycle}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="relative inline-block">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setStatusMenuId(statusMenuId === contract.id ? null : contract.id);
                          }}
                          className={`px-2 py-1 rounded text-[10px] font-bold border uppercase cursor-pointer hover:ring-2 hover:ring-[var(--primary-dim)] transition-all ${getStatusColor(contract.status)}`}
                          title="Cliquer pour changer le statut"
                        >
                          {STATUS_LABELS[contract.status] || contract.status}
                        </button>
                        {statusMenuId === contract.id && STATUS_TRANSITIONS[contract.status] && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setStatusMenuId(null)} />
                            <div className="absolute right-0 top-full mt-1 z-50 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg shadow-xl py-1 min-w-[160px] animate-in fade-in zoom-in-95 duration-150">
                              <div className="px-3 py-1.5 text-[10px] font-bold text-[var(--text-muted)] uppercase">
                                Changer statut
                              </div>
                              {STATUS_TRANSITIONS[contract.status].map((t) => (
                                <button
                                  key={t.value}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStatusChange(contract, t.value);
                                  }}
                                  className={`w-full text-left px-3 py-2 text-sm hover:bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)] transition-colors ${t.color}`}
                                >
                                  {t.label} → {STATUS_LABELS[t.value]}
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleGenerateInvoice(contract)}
                          disabled={generatingInvoice === contract.id || contract.status !== 'ACTIVE'}
                          className="p-1.5 hover:bg-[var(--clr-success-dim)] rounded text-[var(--text-muted)] hover:text-green-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Générer Facture Brouillon"
                        >
                          {generatingInvoice === contract.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <DollarSign className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleView(contract)}
                          className="p-1.5 hover:bg-[var(--bg-elevated)] rounded text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                          title="Détails"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(contract)}
                          className="p-1.5 hover:bg-[var(--primary-dim)] dark:hover:bg-[var(--primary-dim)] rounded text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors"
                          title="Modifier"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(contract.id)}
                          className="p-1.5 hover:bg-[var(--clr-danger-dim)] rounded text-[var(--text-muted)] hover:text-red-600 transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* PAGINATION */}
        {filteredContracts.length > 0 && (
          <div className="p-3 border-t border-[var(--border)] bg-[var(--bg-surface)] flex justify-between items-center text-xs">
            <div className="flex items-center gap-2">
              <span className="text-[var(--text-secondary)]">{filteredContracts.length} contrat(s) — Lignes:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="text-xs border border-[var(--border)] rounded bg-[var(--bg-surface)] text-[var(--text-primary)] p-1"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
            <Pagination currentPage={currentPage} totalPages={totalPages || 1} onPageChange={setCurrentPage} />
          </div>
        )}
      </Card>

      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={editingContract ? 'Modifier le Contrat' : 'Nouveau Contrat'}
        maxWidth="max-w-4xl"
      >
        <ContractForm
          initialData={
            editingContract
              ? {
                  ...editingContract,
                  billingCycle: (editingContract.billingCycle || 'MONTHLY')
                    .toUpperCase()
                    .replace('SEMI_ANNUAL', 'SEMESTRIAL')
                    .replace('YEARLY', 'ANNUAL') as Contract['billingCycle'],
                }
              : undefined
          }
          onSubmit={handleSubmit}
          onCancel={() => setShowForm(false)}
        />
      </Modal>

      {selectedContract && (
        <ContractDetailModal
          contract={selectedContract}
          isOpen={showDetail}
          onClose={() => setShowDetail(false)}
          client={tiers.find((t) => t.id === selectedContract.clientId)}
          invoices={invoices}
          vehicles={vehicles}
          onStatusChange={async (c, status) => {
            try {
              await updateContract({ ...c, status });
              setSelectedContract({ ...c, status });
              showToast(TOAST.CRM.CONTRACT_STATUS_CHANGED(STATUS_LABELS[status] || status), 'success');
            } catch (err: unknown) {
              showToast(mapError(err, 'contrat'), 'error');
            }
          }}
          onEdit={() => {
            setShowDetail(false);
            handleEdit(selectedContract);
          }}
        />
      )}
      <ConfirmDialogComponent />

      {/* Renew Modal */}
      {vehicleConflicts && (
        <Modal
          isOpen={true}
          onClose={() => setVehicleConflicts(null)}
          title="Véhicules déjà assignés"
          maxWidth="max-w-lg"
        >
          <div className="space-y-4 p-2">
            <p className="text-sm text-[var(--text-secondary)]">
              Les véhicules suivants sont déjà assignés à des contrats actifs. Retirez-les du contrat ou résiliez les
              contrats existants avant de continuer.
            </p>
            <div className="divide-y divide-[var(--border)] border border-[var(--border)] rounded-lg overflow-hidden">
              {vehicleConflicts.map((c, i) => {
                const veh = vehicles.find((v) => v.id === c.vehicleId);
                return (
                  <div key={i} className="flex items-center justify-between px-4 py-3 bg-[var(--bg-elevated)]">
                    <div>
                      <div className="text-sm font-medium text-[var(--text-primary)]">
                        {veh?.licensePlate || veh?.name || c.vehicleId.slice(0, 8).toUpperCase()}
                      </div>
                      {veh?.name && veh.licensePlate && (
                        <div className="text-xs text-[var(--text-secondary)]">{veh.name}</div>
                      )}
                    </div>
                    <div className="text-xs font-mono bg-[var(--clr-warning-muted)] text-[var(--clr-warning-strong)] px-2 py-1 rounded">
                      {c.contractNumber}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setVehicleConflicts(null)}
                className="px-4 py-2 text-sm bg-[var(--bg-elevated)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-surface)]"
              >
                Fermer
              </button>
            </div>
          </div>
        </Modal>
      )}

      {showBulkEndDateModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowBulkEndDateModal(false)}
          title={`Modifier la date de fin — ${selectedIds.size} contrat(s)`}
          maxWidth="max-w-md"
        >
          <div className="space-y-4 p-2">
            <p className="text-sm text-[var(--text-secondary)]">
              Choisissez la nouvelle date de fin qui sera appliquée aux{' '}
              <span className="font-bold">{selectedIds.size}</span> contrat(s) sélectionné(s).
            </p>

            {/* Option N'expire jamais */}
            <label className="flex items-center gap-3 p-3 rounded-lg border border-[var(--border)] cursor-pointer tr-hover">
              <input
                type="checkbox"
                checked={bulkNeverExpires}
                onChange={(e) => {
                  setBulkNeverExpires(e.target.checked);
                  if (e.target.checked) setBulkEndDate('');
                }}
                className="w-4 h-4 rounded accent-blue-600"
              />
              <div>
                <div className="text-sm font-medium text-[var(--text-primary)]">N'expire jamais</div>
                <div className="text-xs text-[var(--text-secondary)]">Supprime la date de fin (contrat illimité)</div>
              </div>
            </label>

            {/* Date picker — masqué si "N'expire jamais" */}
            {!bulkNeverExpires && (
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                  Nouvelle date de fin
                </label>
                <input
                  type="date"
                  value={bulkEndDate}
                  onChange={(e) => setBulkEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--bg-surface)] focus:ring-2 focus:ring-[var(--primary)] outline-none"
                />
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2 border-t border-[var(--border)]">
              <button
                onClick={() => setShowBulkEndDateModal(false)}
                className="px-4 py-2 text-sm border border-[var(--border)] rounded-lg hover:bg-[var(--bg-elevated)]"
              >
                Annuler
              </button>
              <button
                onClick={handleBulkEndDate}
                disabled={!bulkNeverExpires && !bulkEndDate}
                className="px-4 py-2 text-sm bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-light)] disabled:opacity-50 flex items-center gap-2"
              >
                <Calendar className="w-4 h-4" /> Appliquer
              </button>
            </div>
          </div>
        </Modal>
      )}

      {renewingContract && (
        <Modal
          isOpen={true}
          onClose={() => setRenewingContract(null)}
          title="Renouveler le contrat"
          maxWidth="max-w-md"
        >
          <div className="space-y-4 p-2">
            <p className="text-sm text-[var(--text-secondary)]">
              Contrat{' '}
              <span className="font-bold">
                {renewingContract.contractNumber || renewingContract.id.slice(0, 8).toUpperCase()}
              </span>{' '}
              — choisissez la nouvelle date de fin.
            </p>
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Nouvelle date de fin</label>
              <input
                type="date"
                value={renewEndDate}
                onChange={(e) => setRenewEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--bg-surface)] focus:ring-2 focus:ring-[var(--primary)] outline-none"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setRenewingContract(null)}
                className="px-4 py-2 text-sm border border-[var(--border)] rounded-lg hover:bg-[var(--bg-elevated)]"
              >
                Annuler
              </button>
              <button
                onClick={handleRenewSubmit}
                disabled={!renewEndDate}
                className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" /> Renouveler
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Mobile Filter Sheet */}
      <MobileFilterSheet
        isOpen={mobileFilterOpen}
        onClose={() => setMobileFilterOpen(false)}
        activeCount={(statusFilter !== 'ALL' ? 1 : 0) + (resellerFilter !== 'ALL' ? 1 : 0)}
        onReset={() => {
          setStatusFilter('ALL');
          setResellerFilter('ALL');
        }}
        tabs={
          [
            {
              id: 'status',
              label: 'Statut',
              activeCount: statusFilter !== 'ALL' ? 1 : 0,
              content: (
                <>
                  {['ALL', 'ACTIVE', 'DRAFT', 'SUSPENDED', 'EXPIRED', 'TERMINATED'].map((st) => (
                    <FilterRadioRow
                      key={st}
                      value={st}
                      label={st === 'ALL' ? 'Tous' : STATUS_LABELS[st]}
                      checked={statusFilter === st}
                      onChange={() => setStatusFilter(st)}
                    />
                  ))}
                </>
              ),
            },
            {
              id: 'reseller',
              label: 'Revendeur',
              activeCount: resellerFilter !== 'ALL' ? 1 : 0,
              content: (
                <>
                  <FilterRadioRow
                    value="ALL"
                    label="Tous"
                    checked={resellerFilter === 'ALL'}
                    onChange={() => setResellerFilter('ALL')}
                  />
                  {resellers.map((r) => (
                    <FilterRadioRow
                      key={r.id}
                      value={r.id}
                      label={r.name}
                      checked={resellerFilter === r.id}
                      onChange={() => setResellerFilter(r.id)}
                    />
                  ))}
                </>
              ),
            },
          ] as MobileFilterTab[]
        }
      />
    </div>
  );
};
