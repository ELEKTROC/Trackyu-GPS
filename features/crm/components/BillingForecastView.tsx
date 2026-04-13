/**
 * BillingForecastView — Calendrier de facturation prévisionnel
 *
 * Matrice 12 mois × clients/abonnements — estimation MRR mensuel.
 * Filtres : recherche texte, client, revendeur, cycle.
 * Pagination sur les lignes contrat.
 * Export CSV / Excel / PDF.
 * Clic sur plaque → modal abonnement ; clic sur N° contrat → modal contrat.
 */
import React, { useState, useMemo, useCallback } from 'react';
import { useDataContext } from '../../../contexts/DataContext';
import { useCurrency } from '../../../hooks/useCurrency';
import { Card } from '../../../components/Card';
import { Pagination } from '../../../components/Pagination';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronRight as ChevronRightIcon,
  TrendingUp,
  Calendar,
  Search,
  X,
  Filter,
  Download,
  FileText,
  FileSpreadsheet,
} from 'lucide-react';
import { SubscriptionDetailModal } from './SubscriptionDetailModal';
import { ContractDetailModal } from './ContractDetailModal';
import { exportToCSV, exportToExcel } from '../../../services/exportService';
import type { View, Invoice } from '../../../types';

type InvoiceRaw = Invoice & { subscriptionId?: string; subscription_id?: string; contract_id?: string };

// ─── Constantes ────────────────────────────────────────────────────────────────

const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
const MONTHS_FULL = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
];
const PAGE_SIZE = 15;

const CYCLE_COLORS: Record<string, string> = {
  ANNUAL: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  YEARLY: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  SEMESTRIAL: 'bg-[var(--primary-dim)] text-[var(--primary)] dark:bg-[var(--primary-dim)] dark:text-[var(--primary)]',
  QUARTERLY: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  MONTHLY: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
};

// Couleurs statut facture (pour les cellules montant)
const INVOICE_CELL_COLORS: Record<string, string> = {
  PAID: 'bg-green-100  text-green-800  dark:bg-green-900/40  dark:text-green-300',
  paid: 'bg-green-100  text-green-800  dark:bg-green-900/40  dark:text-green-300',
  SENT: 'bg-[var(--primary-dim)]   text-[var(--primary)]   dark:bg-[var(--primary-dim)]   dark:text-[var(--primary)]',
  sent: 'bg-[var(--primary-dim)]   text-[var(--primary)]   dark:bg-[var(--primary-dim)]   dark:text-[var(--primary)]',
  OVERDUE: 'bg-red-100    text-red-800    dark:bg-red-900/40    dark:text-red-300',
  overdue: 'bg-red-100    text-red-800    dark:bg-red-900/40    dark:text-red-300',
  DRAFT:
    'bg-[var(--bg-elevated)]  text-[var(--text-secondary)]  bg-[var(--bg-elevated)]     dark:text-[var(--text-muted)]',
  draft:
    'bg-[var(--bg-elevated)]  text-[var(--text-secondary)]  bg-[var(--bg-elevated)]     dark:text-[var(--text-muted)]',
  PARTIAL: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  PARTIALLY_PAID: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  partial: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  CANCELLED:
    'bg-[var(--bg-elevated)]  text-[var(--text-muted)]  bg-[var(--bg-elevated)]/60  dark:text-[var(--text-secondary)]',
};
// Aucune facture trouvée = prévisionnel (neutre)
const INVOICE_CELL_DEFAULT =
  'bg-[var(--bg-elevated)] text-[var(--text-secondary)] bg-[var(--bg-elevated)]/50 dark:text-[var(--text-muted)]';

const CYCLE_LABELS: Record<string, string> = {
  ANNUAL: 'AN',
  YEARLY: 'AN',
  SEMESTRIAL: 'SEM',
  QUARTERLY: 'TRIM',
  MONTHLY: 'MENS',
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function addCycle(date: Date, cycle: string): Date {
  const d = new Date(date);
  switch (cycle) {
    case 'ANNUAL':
    case 'YEARLY':
      d.setFullYear(d.getFullYear() + 1);
      break;
    case 'SEMESTRIAL':
      d.setMonth(d.getMonth() + 6);
      break;
    case 'QUARTERLY':
      d.setMonth(d.getMonth() + 3);
      break;
    default:
      d.setMonth(d.getMonth() + 1);
      break;
  }
  return d;
}

function subtractCycle(date: Date, cycle: string): Date {
  const d = new Date(date);
  switch (cycle) {
    case 'ANNUAL':
    case 'YEARLY':
      d.setFullYear(d.getFullYear() - 1);
      break;
    case 'SEMESTRIAL':
      d.setMonth(d.getMonth() - 6);
      break;
    case 'QUARTERLY':
      d.setMonth(d.getMonth() - 3);
      break;
    default:
      d.setMonth(d.getMonth() - 1);
      break;
  }
  return d;
}

function getBillingMonths(nextBillingDateStr: string | null | undefined, cycle: string, year: number): number[] {
  if (!nextBillingDateStr) return [];
  const anchor = new Date(nextBillingDateStr);
  if (isNaN(anchor.getTime())) return [];
  const upperCycle = (cycle || 'ANNUAL').toUpperCase();
  const months: number[] = [];
  let cursor = new Date(anchor);
  while (cursor.getFullYear() >= year) cursor = subtractCycle(cursor, upperCycle);
  cursor = addCycle(cursor, upperCycle);
  let safety = 0;
  while (cursor.getFullYear() <= year && safety < 50) {
    if (cursor.getFullYear() === year) months.push(cursor.getMonth());
    cursor = addCycle(cursor, upperCycle);
    safety++;
  }
  return months;
}

// ─── Types ─────────────────────────────────────────────────────────────────────

interface SubForecast {
  id: string; // vehicle_id (ABO-xxx) — used as subscriptionNumber
  subscriptionId: string; // real subscription UUID
  plate: string;
  name: string;
  cycle: string;
  fee: number;
  billingMonths: number[];
  // For modal
  status: string;
  autoRenew: boolean;
  startDate: string;
  endDate?: string | null;
  nextBillingDate?: string | null;
}

interface ContractForecast {
  contractId: string;
  contractNumber: string;
  clientName: string;
  resellerName: string;
  subs: SubForecast[];
}

// ─── Composant ─────────────────────────────────────────────────────────────────

interface BillingForecastViewProps {
  onNavigate?: (view: View, params?: Record<string, unknown>) => void;
}

export const BillingForecastView: React.FC<BillingForecastViewProps> = ({ onNavigate }) => {
  const { contracts, invoices, vehicles, tiers } = useDataContext();
  const { formatPrice: format } = useCurrency();
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  // États filtres / nav
  const [year, setYear] = useState(currentYear);
  const [search, setSearch] = useState('');
  const [filterClient, setFilterClient] = useState('');
  const [filterReseller, setFilterReseller] = useState('');
  const [filterCycle, setFilterCycle] = useState('');
  const [page, setPage] = useState(1);
  const [filterMonth, setFilterMonth] = useState<number | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Modal états
  const [selectedSub, setSelectedSub] = useState<(SubForecast & { contractId: string }) | null>(null);
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);

  // Popover aperçu facture
  const [previewPopup, setPreviewPopup] = useState<{
    x: number;
    y: number;
    flipUp: boolean;
    invoice: any | null;
    sub: SubForecast;
    contractId: string;
    clientName: string;
    monthIdx: number;
  } | null>(null);

  // Chargement abonnements
  const [rawSubs, setRawSubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  React.useEffect(() => {
    setLoading(true);
    import('../../../services/api').then(({ api }) => {
      api.subscriptions
        .list()
        .then((subs: any[]) => {
          setRawSubs(subs);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    });
  }, []);

  // ─── Données forecast filtrées par année ────────────────────────────────────
  const allForecastData = useMemo((): ContractForecast[] => {
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31, 23, 59, 59);

    // Garder uniquement les abonnements actifs PENDANT l'année sélectionnée
    const activeSubs = rawSubs.filter((s) => {
      if (s.status !== 'ACTIVE') return false;
      if (s.end_date && new Date(s.end_date) < yearStart) return false;
      if (s.start_date && new Date(s.start_date) > yearEnd) return false;
      return true;
    });

    const byContract = new Map<string, ContractForecast>();

    for (const sub of activeSubs) {
      const contractId = sub.contract_id;
      if (!contractId) continue;
      const contract = contracts.find((c) => c.id === contractId);
      const contractNumber = sub.contract_number || contract?.contractNumber || contractId;
      const clientName = sub.client_name || contract?.clientName || '—';
      const resellerName = contract?.resellerName || '—';
      const cycle = (sub.billing_cycle || 'ANNUAL').toUpperCase();
      const billingMonths = getBillingMonths(sub.next_billing_date, cycle, year);

      // N'inclure que les abonnements qui ont au moins une échéance dans l'année
      if (billingMonths.length === 0) continue;

      const subForecast: SubForecast = {
        id: sub.vehicle_id || sub.id,
        subscriptionId: sub.id,
        plate: sub.vehicle_plate || sub.vehicle_id || '—',
        name: [sub.vehicle_brand, sub.vehicle_model].filter(Boolean).join(' ') || sub.vehicle_name || '',
        cycle,
        fee: Number(sub.monthly_fee) || 0,
        billingMonths,
        status: sub.status || 'ACTIVE',
        autoRenew: sub.auto_renew ?? true,
        startDate: sub.start_date || '',
        endDate: sub.end_date ?? null,
        nextBillingDate: sub.next_billing_date ?? null,
      };

      if (!byContract.has(contractId)) {
        byContract.set(contractId, { contractId, contractNumber, clientName, resellerName, subs: [] });
      }
      byContract.get(contractId)!.subs.push(subForecast);
    }

    return Array.from(byContract.values())
      .filter((c) => c.subs.length > 0)
      .sort((a, b) => a.clientName.localeCompare(b.clientName));
  }, [rawSubs, contracts, year]);

  // Options filtres dynamiques
  const clientOptions = useMemo(() => [...new Set(allForecastData.map((c) => c.clientName))].sort(), [allForecastData]);
  const resellerOptions = useMemo(
    () => [...new Set(allForecastData.map((c) => c.resellerName).filter((r) => r && r !== '—'))].sort(),
    [allForecastData]
  );

  // Données filtrées
  const filteredData = useMemo(() => {
    const q = search.toLowerCase();
    return allForecastData.filter((c) => {
      if (filterClient && c.clientName !== filterClient) return false;
      if (filterReseller && c.resellerName !== filterReseller) return false;
      if (filterCycle) {
        const hasCycle = c.subs.some(
          (s) => s.cycle === filterCycle || (filterCycle === 'ANNUAL' && s.cycle === 'YEARLY')
        );
        if (!hasCycle) return false;
      }
      if (filterMonth !== null) {
        const hasMonthBilling = c.subs.some((s) => s.billingMonths.includes(filterMonth));
        if (!hasMonthBilling) return false;
      }
      if (q) {
        const match =
          c.clientName.toLowerCase().includes(q) ||
          c.contractNumber.toLowerCase().includes(q) ||
          c.resellerName.toLowerCase().includes(q) ||
          c.subs.some((s) => s.id.toLowerCase().includes(q) || s.plate.toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });
  }, [allForecastData, search, filterClient, filterReseller, filterCycle, filterMonth]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredData.length / PAGE_SIZE));
  const pagedData = filteredData.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ─── Index factures par (sub|contract) × année × mois ──────────────────────
  const { invoiceStatusByKey, invoiceByKey } = useMemo(() => {
    const statusMap = new Map<string, string>();
    const objMap = new Map<string, any>();
    for (const inv of invoices) {
      if (!inv.date) continue;
      const d = new Date(inv.date as string);
      if (isNaN(d.getTime())) continue;
      const y = d.getFullYear();
      const m = d.getMonth();
      const raw = inv as InvoiceRaw;
      const subId = raw.subscriptionId ?? raw.subscription_id;
      const cId = String(inv.contractId ?? raw.contract_id ?? '');
      if (subId) {
        const k = `s:${subId}:${y}:${m}`;
        if (!statusMap.has(k)) {
          statusMap.set(k, inv.status);
          objMap.set(k, inv);
        }
      }
      if (cId) {
        const k = `c:${cId}:${y}:${m}`;
        if (!statusMap.has(k)) {
          statusMap.set(k, inv.status);
          objMap.set(k, inv);
        }
      }
    }
    return { invoiceStatusByKey: statusMap, invoiceByKey: objMap };
  }, [invoices]);

  const getInvoiceStatus = (subId: string, contractId: string, monthIdx: number): string | null =>
    invoiceStatusByKey.get(`s:${subId}:${year}:${monthIdx}`) ??
    invoiceStatusByKey.get(`c:${contractId}:${year}:${monthIdx}`) ??
    null;

  const getInvoice = (subId: string, contractId: string, monthIdx: number): any | null =>
    invoiceByKey.get(`s:${subId}:${year}:${monthIdx}`) ??
    invoiceByKey.get(`c:${contractId}:${year}:${monthIdx}`) ??
    null;

  const handleCellClick = (
    e: React.MouseEvent<HTMLTableCellElement>,
    sub: SubForecast,
    contractId: string,
    clientName: string,
    monthIdx: number
  ) => {
    e.stopPropagation();
    if (previewPopup?.sub.subscriptionId === sub.subscriptionId && previewPopup?.monthIdx === monthIdx) {
      setPreviewPopup(null);
      return;
    }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const flipUp = rect.bottom + 260 > window.innerHeight;
    const invoice = getInvoice(sub.subscriptionId, contractId, monthIdx);
    setPreviewPopup({
      x: rect.left,
      y: flipUp ? rect.top - 4 : rect.bottom + 4,
      flipUp,
      invoice,
      sub,
      contractId,
      clientName,
      monthIdx,
    });
  };

  // Totaux MRR
  const monthlyTotals = useMemo(() => {
    const totals = Array(12).fill(0);
    for (const c of filteredData) {
      for (const s of c.subs) {
        for (const m of s.billingMonths) totals[m] += s.fee;
      }
    }
    return totals;
  }, [filteredData]);
  const annualTotal = monthlyTotals.reduce((a, b) => a + b, 0);

  // ─── Collapse ────────────────────────────────────────────────────────────────
  const toggleCollapse = (id: string) =>
    setCollapsed((prev) => {
      const n = new Set(prev);
      if (n.has(id)) {
        n.delete(id);
      } else {
        n.add(id);
      }
      return n;
    });
  const collapseAll = () => setCollapsed(new Set(pagedData.map((c) => c.contractId)));
  const expandAll = () => setCollapsed(new Set());

  const hasFilters = !!(search || filterClient || filterReseller || filterCycle || filterMonth !== null);
  const clearFilters = () => {
    setSearch('');
    setFilterClient('');
    setFilterReseller('');
    setFilterCycle('');
    setFilterMonth(null);
    setPage(1);
  };

  // ─── Export ──────────────────────────────────────────────────────────────────
  const buildExportRows = useCallback(() => {
    const rows: Record<string, any>[] = [];
    for (const c of filteredData) {
      for (const s of c.subs) {
        const row: Record<string, any> = {
          client: c.clientName,
          reseller: c.resellerName,
          contract: c.contractNumber,
          plate: s.plate,
          vehicle: s.name,
          cycle: CYCLE_LABELS[s.cycle] || s.cycle,
          fee: s.fee,
        };
        MONTHS.forEach((_, i) => {
          row[`m${i}`] = s.billingMonths.includes(i) ? s.fee : 0;
        });
        row.total = s.billingMonths.length * s.fee;
        rows.push(row);
      }
    }
    return rows;
  }, [filteredData]);

  const EXPORT_COLUMNS = useMemo(
    () => [
      { key: 'client', header: 'Client', format: 'text' as const },
      { key: 'reseller', header: 'Revendeur', format: 'text' as const },
      { key: 'contract', header: 'Contrat', format: 'text' as const },
      { key: 'plate', header: 'Plaque', format: 'text' as const },
      { key: 'vehicle', header: 'Véhicule', format: 'text' as const },
      { key: 'cycle', header: 'Périodicité', format: 'text' as const },
      { key: 'fee', header: 'Tarif', format: 'currency' as const },
      ...MONTHS.map((m, i) => ({ key: `m${i}`, header: m, format: 'currency' as const })),
      { key: 'total', header: 'Total', format: 'currency' as const },
    ],
    []
  );

  const handleExportCSV = () => {
    exportToCSV(buildExportRows(), { filename: `previsionnel_${year}`, columns: EXPORT_COLUMNS });
    setShowExportMenu(false);
  };

  const handleExportExcel = () => {
    exportToExcel(buildExportRows(), { filename: `previsionnel_${year}`, columns: EXPORT_COLUMNS });
    setShowExportMenu(false);
  };

  const handleExportPDF = async () => {
    setShowExportMenu(false);
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' });
    doc.setFontSize(14);
    doc.text(`Prévisionnel de facturation ${year}`, 14, 15);
    doc.setFontSize(9);
    doc.text(`Exporté le ${new Date().toLocaleDateString('fr-FR')} — ${filteredData.length} contrat(s)`, 14, 22);
    const head = [['Client', 'Revendeur', 'Contrat', 'Plaque', 'Cycle', 'Tarif', ...MONTHS, 'Total']];
    const body = buildExportRows().map((r) => [
      r.client,
      r.reseller,
      r.contract,
      r.plate,
      r.cycle,
      r.fee.toLocaleString('fr-FR'),
      ...MONTHS.map((_, i) => (r[`m${i}`] > 0 ? r[`m${i}`].toLocaleString('fr-FR') : '')),
      r.total.toLocaleString('fr-FR'),
    ]);
    autoTable(doc, {
      head,
      body,
      startY: 27,
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });
    doc.save(`previsionnel_${year}.pdf`);
  };

  // ─── Modal contrat ────────────────────────────────────────────────────────────
  const selectedContract = useMemo(
    () => contracts.find((c) => c.id === selectedContractId) ?? null,
    [contracts, selectedContractId]
  );

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full gap-3">
      {/* ── Barre outils ──────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Année */}
        <div className="flex items-center gap-0.5 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg px-1">
          <button
            onClick={() => {
              setYear((y) => y - 1);
              setPage(1);
            }}
            className="p-1.5 hover:bg-[var(--bg-elevated)] rounded"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-2 font-bold text-[var(--text-primary)] text-sm min-w-[52px] text-center">{year}</span>
          <button
            onClick={() => {
              setYear((y) => y + 1);
              setPage(1);
            }}
            className="p-1.5 hover:bg-[var(--bg-elevated)] rounded"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Recherche */}
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Client, contrat, ABO, plaque…"
            className="w-full pl-8 pr-8 py-1.5 text-xs border border-[var(--border)] rounded-lg bg-[var(--bg-elevated)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
          />
          {search && (
            <button
              onClick={() => {
                setSearch('');
                setPage(1);
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2"
            >
              <X className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            </button>
          )}
        </div>

        {/* Filtres avancés */}
        <button
          onClick={() => setShowFilters((f) => !f)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors
            ${
              showFilters || filterClient || filterReseller || filterCycle
                ? 'bg-[var(--primary-dim)] border-[var(--primary)] text-[var(--primary)] dark:bg-[var(--primary-dim)] dark:border-[var(--primary)] dark:text-[var(--primary)]'
                : 'bg-[var(--bg-elevated)] border-[var(--border)] text-[var(--text-secondary)]'
            }`}
        >
          <Filter className="w-3.5 h-3.5" />
          Filtres
          {(filterClient || filterReseller || filterCycle) && (
            <span className="bg-[var(--primary-dim)]0 text-white rounded-full px-1.5 text-[10px] font-bold">
              {[filterClient, filterReseller, filterCycle].filter(Boolean).length}
            </span>
          )}
        </button>

        {hasFilters && (
          <button onClick={clearFilters} className="text-xs text-red-500 hover:underline flex items-center gap-1">
            <X className="w-3 h-3" />
            Effacer
          </button>
        )}

        {/* Export */}
        <div className="relative">
          <button
            onClick={() => setShowExportMenu((e) => !e)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border bg-[var(--bg-elevated)] border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)] transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Exporter
          </button>
          {showExportMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowExportMenu(false)} />
              <div className="absolute left-0 mt-1 w-40 bg-[var(--bg-elevated)] rounded-lg shadow-xl border border-[var(--border)] z-20 py-1">
                <button
                  onClick={handleExportCSV}
                  className="w-full px-3 py-2 text-left text-xs hover:bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)] flex items-center gap-2 text-[var(--text-primary)]"
                >
                  <FileText className="w-3.5 h-3.5 text-green-500" />
                  CSV
                </button>
                <button
                  onClick={handleExportExcel}
                  className="w-full px-3 py-2 text-left text-xs hover:bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)] flex items-center gap-2 text-[var(--text-primary)]"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                  Excel
                </button>
                <button
                  onClick={handleExportPDF}
                  className="w-full px-3 py-2 text-left text-xs hover:bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)] flex items-center gap-2 text-[var(--text-primary)]"
                >
                  <FileText className="w-3.5 h-3.5 text-red-500" />
                  PDF
                </button>
              </div>
            </>
          )}
        </div>

        {/* Légende statut facture */}
        <div className="flex items-center gap-1.5 ml-auto flex-wrap">
          {(
            [
              {
                status: 'PAID',
                label: 'Payée',
                color: 'bg-green-100  text-green-800  dark:bg-green-900/40  dark:text-green-300',
              },
              {
                status: 'SENT',
                label: 'Émise',
                color:
                  'bg-[var(--primary-dim)]   text-[var(--primary)]   dark:bg-[var(--primary-dim)]   dark:text-[var(--primary)]',
              },
              {
                status: 'OVERDUE',
                label: 'En retard',
                color: 'bg-red-100    text-red-800    dark:bg-red-900/40    dark:text-red-300',
              },
              {
                status: 'PARTIALLY_PAID',
                label: 'Partiel',
                color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
              },
              {
                status: 'DRAFT',
                label: 'Brouillon',
                color:
                  'bg-[var(--bg-elevated)]  text-[var(--text-secondary)]  bg-[var(--bg-elevated)]     dark:text-[var(--text-muted)]',
              },
              {
                status: null,
                label: 'Prévision',
                color:
                  'bg-[var(--bg-elevated)]  text-[var(--text-secondary)]  bg-[var(--bg-elevated)]/50  dark:text-[var(--text-muted)]',
              },
            ] as const
          ).map(({ label, color }) => (
            <span key={label} className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${color}`}>
              {label}
            </span>
          ))}
        </div>

        {/* Filtres cycle */}
        <div className="flex gap-1">
          {(['ANNUAL', 'QUARTERLY', 'SEMESTRIAL', 'MONTHLY'] as const).map((k) => (
            <button
              key={k}
              onClick={() => {
                setFilterCycle(filterCycle === k ? '' : k);
                setPage(1);
              }}
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-all
                ${filterCycle === k ? 'ring-2 ring-offset-1 ring-current' : 'opacity-70 hover:opacity-100'}
                ${CYCLE_COLORS[k]}`}
            >
              {CYCLE_LABELS[k]}
            </button>
          ))}
        </div>

        {/* Total */}
        <span className="font-bold text-[var(--text-primary)] flex items-center gap-1 text-xs whitespace-nowrap">
          <TrendingUp className="w-3.5 h-3.5 text-green-500" />
          {format(annualTotal)}
        </span>
      </div>

      {/* ── Filtres avancés ───────────────────────────────── */}
      {showFilters && (
        <div className="flex flex-wrap gap-3 p-3 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border)]">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">Client</label>
            <select
              value={filterClient}
              onChange={(e) => {
                setFilterClient(e.target.value);
                setPage(1);
              }}
              className="text-xs border border-[var(--border)] rounded-lg px-2 py-1.5 bg-[var(--bg-elevated)] min-w-[160px]"
            >
              <option value="">Tous les clients</option>
              {clientOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">Revendeur</label>
            <select
              value={filterReseller}
              onChange={(e) => {
                setFilterReseller(e.target.value);
                setPage(1);
              }}
              className="text-xs border border-[var(--border)] rounded-lg px-2 py-1.5 bg-[var(--bg-elevated)] min-w-[160px]"
            >
              <option value="">Tous les revendeurs</option>
              {resellerOptions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* ── Table ─────────────────────────────────────────── */}
      <Card className="flex-1 min-h-0 overflow-hidden">
        <div className="overflow-auto h-full">
          {loading ? (
            <div className="flex items-center justify-center h-40 text-[var(--text-muted)] text-sm">Chargement…</div>
          ) : filteredData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-[var(--text-muted)] gap-2">
              <Calendar className="w-10 h-10 opacity-30" />
              <p className="font-medium text-sm">Aucune donnée pour {year}</p>
              <p className="text-xs">
                {hasFilters
                  ? 'Essayez de modifier vos filtres'
                  : 'Aucun abonnement actif avec une échéance sur cette année'}
              </p>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="bg-[var(--bg-elevated)] sticky top-0 z-10">
                <tr>
                  <th className="text-left px-3 py-3 font-bold text-[var(--text-secondary)] uppercase tracking-wide whitespace-nowrap w-48">
                    <div className="flex items-center justify-between gap-2">
                      <span>Client / Contrat</span>
                      <div className="flex gap-1 font-normal normal-case text-[10px]">
                        <button onClick={expandAll} className="text-[var(--primary)] hover:underline">
                          +
                        </button>
                        <button onClick={collapseAll} className="text-[var(--text-muted)] hover:underline">
                          −
                        </button>
                      </div>
                    </div>
                  </th>
                  <th className="text-center px-1 py-3 font-bold text-[var(--text-secondary)] uppercase tracking-wide w-12">
                    Cycle
                  </th>
                  {MONTHS.map((m, i) => (
                    <th
                      key={i}
                      onClick={() => {
                        setFilterMonth(filterMonth === i ? null : i);
                        setPage(1);
                      }}
                      className={`text-center px-1 py-3 font-bold uppercase tracking-wide whitespace-nowrap w-14 cursor-pointer select-none transition-colors
                    ${
                      filterMonth === i
                        ? 'bg-[var(--primary-dim)]0 text-white dark:bg-[var(--primary)]'
                        : i === currentMonth && year === currentYear
                          ? 'text-[var(--primary)] dark:text-[var(--primary)] bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] hover:bg-[var(--primary-dim)] dark:hover:bg-[var(--primary-dim)]/40'
                          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]/50'
                    }`}
                    >
                      {m}
                    </th>
                  ))}
                  <th className="text-right px-3 py-3 font-bold text-[var(--text-secondary)] uppercase tracking-wide whitespace-nowrap w-20">
                    Total
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[var(--border)]">
                {pagedData.map((contract) => {
                  const isCollapsed = collapsed.has(contract.contractId);
                  const cTotals = Array(12).fill(0);
                  for (const s of contract.subs) for (const m of s.billingMonths) cTotals[m] += s.fee;
                  const cAnnual = cTotals.reduce((a, b) => a + b, 0);

                  return (
                    <React.Fragment key={contract.contractId}>
                      {/* Ligne contrat */}
                      <tr className="bg-[var(--bg-elevated)]/60 hover:bg-[var(--bg-elevated)]/40">
                        <td className="px-3 py-2.5 font-semibold text-[var(--text-primary)]">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <button onClick={() => toggleCollapse(contract.contractId)} className="flex-shrink-0">
                              {isCollapsed ? (
                                <ChevronRightIcon className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                              )}
                            </button>
                            <span className="truncate max-w-[100px]">{contract.clientName}</span>
                            {/* Clic sur N° contrat → modal contrat */}
                            <button
                              onClick={() => setSelectedContractId(contract.contractId)}
                              className="text-[var(--text-muted)] font-mono font-normal text-[10px] flex-shrink-0 hover:text-[var(--primary)] hover:underline"
                            >
                              {contract.contractNumber}
                            </button>
                            <span className="ml-auto flex-shrink-0 bg-[var(--bg-elevated)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] rounded-full px-1.5 text-[10px]">
                              {contract.subs.length}
                            </span>
                          </div>
                        </td>
                        <td className="text-center px-1 py-2.5 text-[var(--text-muted)] dark:text-[var(--text-secondary)]">
                          —
                        </td>
                        {cTotals.map((total, i) => (
                          <td
                            key={i}
                            className={`text-center px-1 py-2.5 font-medium
                        ${i === currentMonth && year === currentYear ? 'bg-[var(--primary-dim)]/50 dark:bg-[var(--primary-dim)]' : ''}`}
                          >
                            {total > 0 ? (
                              <span className="text-[var(--text-primary)]">{format(total)}</span>
                            ) : (
                              <span className="text-[var(--text-muted)] dark:text-[var(--text-secondary)]">—</span>
                            )}
                          </td>
                        ))}
                        <td className="text-right px-3 py-2.5 font-bold text-[var(--text-primary)]">
                          {format(cAnnual)}
                        </td>
                      </tr>

                      {/* Lignes abonnements */}
                      {!isCollapsed &&
                        contract.subs.map((sub) => {
                          const subAnnual = sub.billingMonths.length * sub.fee;
                          return (
                            <tr key={sub.id} className="tr-hover/20">
                              <td className="pl-7 pr-3 py-1.5">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <Calendar className="w-3 h-3 text-[var(--text-muted)] flex-shrink-0" />
                                  {/* Clic sur plaque → modal abonnement */}
                                  <button
                                    onClick={() => setSelectedSub({ ...sub, contractId: contract.contractId })}
                                    className="font-mono text-[11px] font-medium text-[var(--primary)] dark:text-[var(--primary)] hover:underline truncate"
                                  >
                                    {sub.plate || sub.id}
                                  </button>
                                </div>
                              </td>
                              <td className="text-center px-1 py-1.5">
                                <span className="px-1 py-0.5 rounded text-[10px] font-bold text-[var(--text-secondary)]">
                                  {CYCLE_LABELS[sub.cycle] || sub.cycle}
                                </span>
                              </td>
                              {MONTHS.map((_, i) => {
                                const has = sub.billingMonths.includes(i);
                                const invStatus = has
                                  ? getInvoiceStatus(sub.subscriptionId, contract.contractId, i)
                                  : null;
                                const cellColor = invStatus
                                  ? (INVOICE_CELL_COLORS[invStatus] ?? INVOICE_CELL_DEFAULT)
                                  : INVOICE_CELL_DEFAULT;
                                const isActive =
                                  previewPopup?.sub.subscriptionId === sub.subscriptionId &&
                                  previewPopup?.monthIdx === i;
                                return (
                                  <td
                                    key={i}
                                    onClick={
                                      has
                                        ? (e) => handleCellClick(e, sub, contract.contractId, contract.clientName, i)
                                        : undefined
                                    }
                                    className={`text-center px-0.5 py-1.5 ${has ? 'cursor-pointer' : ''}
                                ${i === currentMonth && year === currentYear ? 'bg-[var(--primary-dim)]/30 dark:bg-[var(--primary-dim)]' : ''}`}
                                  >
                                    {has ? (
                                      <span
                                        className={`inline-block px-1 py-0.5 rounded text-[10px] font-semibold transition-all ${cellColor} ${isActive ? 'ring-2 ring-[var(--primary-dim)] ring-offset-1' : 'hover:brightness-95'}`}
                                      >
                                        {format(sub.fee)}
                                      </span>
                                    ) : (
                                      <span className="text-[var(--text-muted)]">·</span>
                                    )}
                                  </td>
                                );
                              })}
                              <td className="text-right px-3 py-1.5 font-medium text-[var(--text-secondary)]">
                                {subAnnual > 0 ? format(subAnnual) : '—'}
                              </td>
                            </tr>
                          );
                        })}
                    </React.Fragment>
                  );
                })}
              </tbody>

              {/* Footer MRR */}
              <tfoot className="sticky bottom-0 z-10">
                <tr className="bg-[var(--bg-surface)] text-white">
                  <td className="px-3 py-2.5 font-bold text-sm">
                    <div className="flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-green-400" />
                      MRR {year}
                      {hasFilters && (
                        <span className="text-[10px] font-normal text-[var(--text-muted)] ml-1">(filtré)</span>
                      )}
                    </div>
                  </td>
                  <td className="text-center px-1 py-2.5 text-[var(--text-secondary)]">—</td>
                  {monthlyTotals.map((total, i) => (
                    <td
                      key={i}
                      className={`text-center px-1 py-2.5 font-bold
                  ${i === currentMonth && year === currentYear ? 'text-[var(--primary)]' : 'text-green-300'}`}
                    >
                      {total > 0 ? format(total) : <span className="text-[var(--text-secondary)]">—</span>}
                    </td>
                  ))}
                  <td className="text-right px-3 py-2.5 font-bold text-green-300">{format(annualTotal)}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </Card>

      {/* ── Pagination ────────────────────────────────────── */}
      <Pagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
        totalItems={filteredData.length}
        itemLabel="contrat"
        filtered={hasFilters}
        className="py-1"
      />

      {/* ── Popover aperçu facture ───────────────────────── */}
      {previewPopup && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setPreviewPopup(null)} />
          <div
            className="fixed z-50 w-72 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            style={{
              left: Math.min(previewPopup.x, window.innerWidth - 296),
              ...(previewPopup.flipUp ? { bottom: window.innerHeight - previewPopup.y } : { top: previewPopup.y }),
            }}
          >
            {previewPopup.invoice ? (
              /* ── Facture réelle ── */
              <>
                <div className="px-4 py-3 border-b border-[var(--border)] border-[var(--border)] flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-bold text-[var(--text-primary)] font-mono">
                      {previewPopup.invoice.invoiceNumber || previewPopup.invoice.invoice_number || '—'}
                    </p>
                    <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                      {previewPopup.invoice.date
                        ? new Date(previewPopup.invoice.date).toLocaleDateString('fr-FR')
                        : '—'}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      INVOICE_CELL_COLORS[previewPopup.invoice.status] ?? INVOICE_CELL_DEFAULT
                    }`}
                  >
                    {{
                      PAID: 'Payée',
                      SENT: 'Émise',
                      OVERDUE: 'En retard',
                      DRAFT: 'Brouillon',
                      PARTIALLY_PAID: 'Partiel',
                      CANCELLED: 'Annulée',
                    }[previewPopup.invoice.status as string] ?? previewPopup.invoice.status}
                  </span>
                </div>
                <div className="px-4 py-3 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-[var(--text-secondary)]">Client</span>
                    <span className="font-medium text-[var(--text-primary)] text-right max-w-[160px] truncate">
                      {previewPopup.clientName}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[var(--text-secondary)]">Véhicule</span>
                    <span className="font-mono font-medium text-[var(--primary)] dark:text-[var(--primary)]">
                      {previewPopup.sub.plate}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[var(--text-secondary)]">Période</span>
                    <span className="text-[var(--text-primary)]">
                      {MONTHS_FULL[previewPopup.monthIdx]} {year}
                    </span>
                  </div>
                  <div className="h-px bg-[var(--bg-elevated)]" />
                  <div className="flex justify-between text-xs">
                    <span className="text-[var(--text-secondary)]">Montant HT</span>
                    <span className="text-[var(--text-primary)]">
                      {format(previewPopup.invoice.amountHT ?? previewPopup.invoice.amount_ht ?? previewPopup.sub.fee)}
                    </span>
                  </div>
                  {(previewPopup.invoice.vatRate ?? previewPopup.invoice.vat_rate ?? 0) > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-[var(--text-secondary)]">
                        TVA ({previewPopup.invoice.vatRate ?? previewPopup.invoice.vat_rate}%)
                      </span>
                      <span className="text-[var(--text-secondary)]">
                        {format(
                          (previewPopup.invoice.amount ?? previewPopup.invoice.amountHT ?? previewPopup.sub.fee) *
                            ((previewPopup.invoice.vatRate ?? previewPopup.invoice.vat_rate ?? 0) / 100)
                        )}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-[var(--text-primary)]">Total TTC</span>
                    <span className="text-[var(--text-primary)]">
                      {format(previewPopup.invoice.amount ?? previewPopup.invoice.amountTTC ?? previewPopup.sub.fee)}
                    </span>
                  </div>
                </div>
                <div className="px-4 pb-3">
                  <button
                    onClick={() => {
                      setPreviewPopup(null);
                      setSelectedContractId(previewPopup.contractId);
                    }}
                    className="w-full text-center text-[11px] text-[var(--primary)] dark:text-[var(--primary)] hover:underline font-medium"
                  >
                    Voir le contrat →
                  </button>
                </div>
              </>
            ) : (
              /* ── Aperçu prévisionnel ── */
              <>
                <div className="px-4 py-3 border-b border-[var(--border)] border-[var(--border)] flex items-center justify-between">
                  <p className="text-xs font-bold text-[var(--text-primary)]">Aperçu prévisionnel</p>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--bg-elevated)] text-[var(--text-secondary)] bg-[var(--bg-elevated)] dark:text-[var(--text-muted)]">
                    Non émise
                  </span>
                </div>
                <div className="px-4 py-3 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-[var(--text-secondary)]">Client</span>
                    <span className="font-medium text-[var(--text-primary)] text-right max-w-[160px] truncate">
                      {previewPopup.clientName}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[var(--text-secondary)]">Véhicule</span>
                    <span className="font-mono font-medium text-[var(--primary)] dark:text-[var(--primary)]">
                      {previewPopup.sub.plate}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[var(--text-secondary)]">Période</span>
                    <span className="text-[var(--text-primary)]">
                      {MONTHS_FULL[previewPopup.monthIdx]} {year}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[var(--text-secondary)]">Périodicité</span>
                    <span className="text-[var(--text-primary)]">
                      {CYCLE_LABELS[previewPopup.sub.cycle] || previewPopup.sub.cycle}
                    </span>
                  </div>
                  <div className="h-px bg-[var(--bg-elevated)]" />
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-[var(--text-primary)]">Montant prévu</span>
                    <span className="text-green-600 dark:text-green-400">{format(previewPopup.sub.fee)}</span>
                  </div>
                  <p className="text-[10px] text-[var(--text-muted)] italic">
                    Facture non encore générée pour cette période.
                  </p>
                </div>
                <div className="px-4 pb-3">
                  <button
                    onClick={() => {
                      setPreviewPopup(null);
                      setSelectedSub({ ...previewPopup.sub, contractId: previewPopup.contractId });
                    }}
                    className="w-full text-center text-[11px] text-[var(--primary)] dark:text-[var(--primary)] hover:underline font-medium"
                  >
                    Voir l'abonnement →
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* ── Modal Abonnement ──────────────────────────────── */}
      {selectedSub && (
        <SubscriptionDetailModal
          isOpen={!!selectedSub}
          onClose={() => setSelectedSub(null)}
          subscriptionNumber={selectedSub.id}
          vehicleId={selectedSub.id}
          contractId={selectedSub.contractId}
          subscriptionId={selectedSub.subscriptionId}
          monthlyFee={selectedSub.fee}
          billingCycle={selectedSub.cycle}
          subscriptionStatus={selectedSub.status}
          autoRenew={selectedSub.autoRenew}
          startDate={selectedSub.startDate}
          endDate={selectedSub.endDate}
          nextBillingDate={selectedSub.nextBillingDate}
          onNavigate={onNavigate}
        />
      )}

      {/* ── Modal Contrat ─────────────────────────────────── */}
      {selectedContractId && selectedContract && (
        <ContractDetailModal
          isOpen={!!selectedContractId}
          onClose={() => setSelectedContractId(null)}
          contract={selectedContract}
          invoices={invoices}
          vehicles={vehicles}
          client={tiers.find((t) => t.id === selectedContract.clientId)}
          onStatusChange={() => {}}
          onEdit={() => {}}
        />
      )}
    </div>
  );
};
