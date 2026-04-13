import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { useQuery } from '@tanstack/react-query';
import {
  Receipt,
  DollarSign,
  Download,
  Filter,
  Search,
  Plus,
  Edit2,
  X,
  ChevronDown,
  Trash2,
  Mail,
  Copy,
  XCircle,
  FileCheck,
  Upload,
  Columns,
  RefreshCw,
  CheckCircle,
  FileText,
  TrendingUp,
  AlertCircle,
  PieChart,
  MoreVertical,
  SearchX,
} from 'lucide-react';
import { EmptyState } from '../../../components/EmptyState';
import { Card } from '../../../components/Card';
import { Pagination } from '../../../components/Pagination';
import { Modal } from '../../../components/Modal';
import type { Invoice, Quote, Intervention, Contract, Payment } from '../../../types';
import { useToast } from '../../../contexts/ToastContext';
import { TOAST } from '../../../constants/toastMessages';
import { mapError } from '../../../utils/errorMapper';
import { useDataContext } from '../../../contexts/DataContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useConfirmDialog } from '../../../components/ConfirmDialog';
import { generateInvoicePDF, generateTablePDF, type InvoiceData } from '../../../services/pdfServiceV2';
import { InvoiceForm } from './InvoiceForm';
import { ContractForm } from '../../crm/components/ContractForm';
import { useCurrency } from '../../../hooks/useCurrency';
import { useTenantBranding } from '../../../hooks/useTenantBranding';
import { DocumentPreview } from './partials/DocumentPreview';
import { api } from '../../../services/apiLazy';
import { PAYMENT_TERMS } from '../constants';
import { useTableSort } from '../../../hooks/useTableSort';
import { SortableHeader } from '../../../components/SortableHeader';

// Helper function to safely parse date to YYYY-MM-DD format
const safeToDateString = (dateValue: unknown): string | null => {
  if (!dateValue) return null;
  try {
    const dateObj = new Date(dateValue as string | number | Date);
    if (isNaN(dateObj.getTime())) return null;
    return dateObj.toISOString().split('T')[0];
  } catch {
    return null;
  }
};

// --- TYPES & PROPS ---

interface FinanceItem {
  id: string;
  number?: string;
  clientName?: string;
  clientId?: string;
  resellerName?: string;
  date?: string;
  createdAt?: string | Date;
  amount?: number;
  balance?: number;
  status?: string;
  category?: string;
  invoiceType?: string;
  installationDate?: string;
  contractId?: string;
  licensePlate?: string;
  validUntil?: string | Date;
  paymentTerms?: string;
}

// Combined type for Invoice | Quote data items — both types share all these fields
type FinanceDoc = Invoice &
  Quote & {
    invoice_number?: string;
    license_plate?: string;
    items?: Array<{ quantity: number; price: number }>;
  };

interface ContractOption {
  id: string;
  vehicleCount?: number;
  monthlyFee: number;
  status?: string;
  startDate: string;
  clientName?: string;
  billingCycle?: string;
  vehicleIds?: string[];
}

interface FinanceViewProps {
  mode?: 'INVOICES' | 'QUOTES';
  initialTab?: string;
  initialData?: Partial<Invoice>;
  dateRange?: { start: string; end: string };
  onSaveSuccess?: (item: Invoice) => void;
}

// --- MOCK DATA Constants (Updated with new fields) ---
// Moved to api.ts

const INVOICE_COLUMNS = [
  { id: 'number', label: 'Numéro' },
  { id: 'category', label: 'Type Op.' },
  { id: 'resellerName', label: 'Revendeur' },
  { id: 'client', label: 'Client' },
  { id: 'invoiceType', label: 'Type Doc' },
  { id: 'date', label: 'Date' },
  { id: 'installationDate', label: 'Date Install.' },
  { id: 'contractId', label: 'Ref Contrat' },
  { id: 'licensePlate', label: 'Plaque' },
  { id: 'amount', label: 'Montant' },
  { id: 'balance', label: 'Solde' },
  { id: 'status', label: 'Statut' },
];

// Colonnes spécifiques pour les devis (sans date installation, plaque, etc.)
const QUOTE_COLUMNS = [
  { id: 'number', label: 'Numéro' },
  { id: 'resellerName', label: 'Revendeur' },
  { id: 'client', label: 'Client' },
  { id: 'date', label: 'Date' },
  { id: 'validUntil', label: 'Validité' },
  { id: 'amount', label: 'Montant' },
  { id: 'paymentTerms', label: 'Conditions' },
  { id: 'status', label: 'Statut' },
];

export const FinanceView: React.FC<FinanceViewProps> = ({
  mode = 'INVOICES',
  initialData,
  dateRange,
  onSaveSuccess,
}) => {
  const isMobile = useIsMobile();
  const { formatPrice } = useCurrency();
  const { showToast } = useToast();
  const { hasPermission, user } = useAuth();
  const { confirm, ConfirmDialogComponent } = useConfirmDialog();
  const { branding: tenantBranding } = useTenantBranding();
  const {
    clients,
    tiers,
    invoices,
    quotes,
    interventions,
    vehicles,
    catalogItems,
    contracts,
    addInvoice,
    updateInvoice,
    deleteInvoice,
    addQuote,
    updateQuote,
    deleteQuote,
    addContract,
    updateContract,
  } = useDataContext();

  // Charger les tenants (revendeurs) pour le formulaire de facture
  // Accessible pour SuperAdmin, MANAGE_TENANTS, et les staff du tenant_default
  const normalizedRole = user?.role?.toUpperCase().replace(/_/g, '');
  const canViewTenants =
    hasPermission('MANAGE_TENANTS') || normalizedRole === 'SUPERADMIN' || user?.tenantId === 'tenant_default';
  const { data: rawTenants = [] } = useQuery({
    queryKey: ['tenants'],
    queryFn: () => api.tenants.list(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: canViewTenants, // Ne pas appeler si pas la permission
  });
  const tenants = Array.isArray(rawTenants) ? rawTenants : [];

  // UI State
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [resellerFilter, setResellerFilter] = useState('ALL');
  const [clientFilter, setClientFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [plateFilter, setPlateFilter] = useState('ALL');
  const [selectedItem, setSelectedItem] = useState<Invoice | Quote | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isFormDirty, setIsFormDirty] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<Invoice> | Partial<Quote> | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Column Manager & Export State
  const [showColumnManager, setShowColumnManager] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, _setItemsPerPage] = useState(10);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);

  // Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState<{
    amount: number;
    method: string;
    reference: string;
    date: string;
    notes: string;
    invoiceId: string;
    paymentNumber: string;
    attachment: File | null;
  }>({
    amount: 0,
    method: 'VIREMENT',
    reference: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    invoiceId: '',
    paymentNumber: '',
    attachment: null,
  });

  // Contract Modal State
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [contractInitialData, setContractInitialData] = useState<Partial<Contract> | null>(null);
  const [isContractChoiceModalOpen, setIsContractChoiceModalOpen] = useState(false);
  const [_targetContractId, _setTargetContractId] = useState<string>('');

  // Modal liaison Facture → Contrat
  const [isContractLinkModalOpen, setIsContractLinkModalOpen] = useState(false);
  const [contractLinkData, setContractLinkData] = useState<{
    invoice: Invoice | null;
    matchingContracts: any[];
    selectedContractId: string;
  }>({ invoice: null, matchingContracts: [], selectedContractId: '' });

  // Email Modal State
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [emailForm, setEmailForm] = useState<{
    invoiceId: string;
    recipientEmail: string;
    subject: string;
    message: string;
  }>({ invoiceId: '', recipientEmail: '', subject: '', message: '' });

  // Payment History Modal State
  const [isPaymentHistoryOpen, setIsPaymentHistoryOpen] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<{
    invoice: any;
    payments: any[];
    totalPaid: number;
    balance: number;
    loading: boolean;
  }>({ invoice: null, payments: [], totalPaid: 0, balance: 0, loading: false });
  const [paymentSaving, setPaymentSaving] = useState(false);

  // Credit Note (Avoir) Modal State
  const [isCreditNoteModalOpen, setIsCreditNoteModalOpen] = useState(false);
  const [creditNoteCreating, setCreditNoteCreating] = useState(false);
  const [creditNoteForm, setCreditNoteForm] = useState<{
    invoice: Invoice | null;
    amount: number;
    reason: string;
    type: 'FULL' | 'PARTIAL' | 'COMMERCIAL';
    notes: string;
  }>({ invoice: null, amount: 0, reason: '', type: 'PARTIAL', notes: '' });

  // Fonction pour calculer la date d'échéance
  const _calculateDueDate = (invoiceDate: string, paymentTermId: string, _clientId?: string): string => {
    const date = new Date(invoiceDate);
    // Vérifier si la date est valide
    if (isNaN(date.getTime())) {
      // Fallback: utiliser la date actuelle + 30 jours
      const fallbackDate = new Date();
      fallbackDate.setDate(fallbackDate.getDate() + 30);
      return fallbackDate.toISOString().split('T')[0];
    }

    const term = PAYMENT_TERMS.find((t) => t.id === paymentTermId);

    if (!term) {
      // Par défaut: Net 30 jours
      date.setDate(date.getDate() + 30);
      return date.toISOString().split('T')[0];
    }

    // Ajouter les jours
    date.setDate(date.getDate() + term.days);

    // Si fin de mois
    if ('special' in term && term.special === 'EOM') {
      // Aller à la fin du mois
      date.setMonth(date.getMonth() + 1);
      date.setDate(0); // Dernier jour du mois précédent (= fin du mois courant)
    }

    return date.toISOString().split('T')[0];
  };

  // Obtenir les conditions de paiement du client
  const _getClientPaymentTerm = (clientId: string): string => {
    const client = clients.find((c) => c.id === clientId);
    // Si le client a des conditions de paiement personnalisées
    if (client && 'paymentTerms' in client && client.paymentTerms) {
      return client.paymentTerms as string;
    }
    // Par défaut: Net 30 jours
    return 'NET_30';
  };

  // --- KPIs Calculation ---
  const kpis = useMemo(() => {
    if (mode === 'INVOICES') {
      const safeInvoices = Array.isArray(invoices) ? invoices : [];
      const totalInvoiced = safeInvoices.reduce((sum, i) => sum + i.amount, 0);
      const totalPaid = safeInvoices.filter((i) => i.status === 'PAID').reduce((sum, i) => sum + i.amount, 0);
      const totalOverdue = safeInvoices.filter((i) => i.status === 'OVERDUE').reduce((sum, i) => sum + i.amount, 0);
      const collectionRate = totalInvoiced > 0 ? (totalPaid / totalInvoiced) * 100 : 0;

      return {
        totalInvoiced,
        totalPaid,
        totalOverdue,
        collectionRate,
      };
    } else {
      const safeQuotes = Array.isArray(quotes) ? quotes : [];
      const totalQuoted = safeQuotes.reduce((sum, q) => sum + q.amount, 0);
      const totalAccepted = safeQuotes.filter((q) => q.status === 'ACCEPTED').reduce((sum, q) => sum + q.amount, 0);
      const conversionRate =
        safeQuotes.length > 0
          ? (safeQuotes.filter((q) => q.status === 'ACCEPTED').length / safeQuotes.length) * 100
          : 0;

      return {
        totalQuoted,
        totalAccepted,
        conversionRate,
      };
    }
  }, [invoices, quotes, mode]);

  useEffect(() => {
    const columns = mode === 'QUOTES' ? QUOTE_COLUMNS : INVOICE_COLUMNS;
    setVisibleColumns(columns.map((c) => c.id));
  }, [mode]);

  const toggleColumn = (columnId: string) => {
    setVisibleColumns((prev) => (prev.includes(columnId) ? prev.filter((id) => id !== columnId) : [...prev, columnId]));
  };

  const handleExport = async (format: 'csv' | 'pdf') => {
    const dataToExport = filteredData;

    if (format === 'csv') {
      // Export CSV complet avec toutes les colonnes importantes
      const csvHeaders = [
        'Numéro',
        'Type',
        'Catégorie',
        'Revendeur',
        'Client',
        'Client ID',
        'Date',
        'Date Échéance',
        'Date Installation',
        'Ref Contrat',
        'Plaque',
        'Montant HT',
        'TVA %',
        'Montant TTC',
        'Solde',
        'Statut',
        'Objet',
        'Notes',
      ];

      const csvRows = dataToExport.map((item) => {
        const inv = item as Invoice;
        const clientName =
          tiers.find((t) => t.id === inv.clientId)?.name ||
          clients.find((c) => c.id === inv.clientId)?.name ||
          inv.clientId ||
          '-';
        const ht = inv.amount / (1 + (inv.vatRate ?? 0) / 100);

        return [
          inv.number || inv.id,
          inv.invoiceType || 'FACTURE',
          inv.category || '-',
          inv.resellerName || '-',
          clientName,
          inv.clientId || '-',
          safeToDateString(inv.date) ? new Date(safeToDateString(inv.date)!).toLocaleDateString('fr-FR') : '-',
          safeToDateString(inv.dueDate) ? new Date(safeToDateString(inv.dueDate)!).toLocaleDateString('fr-FR') : '-',
          safeToDateString(inv.installationDate)
            ? new Date(safeToDateString(inv.installationDate)!).toLocaleDateString('fr-FR')
            : '-',
          inv.contractId || '-',
          inv.licensePlate || '-',
          ht.toFixed(2),
          `${inv.vatRate ?? 0}%`,
          (inv.amount || 0).toFixed(2),
          (inv.balance || 0).toFixed(2),
          inv.status || '-',
          (inv.subject || '').replace(/"/g, '""'),
          (inv.notes || '').replace(/"/g, '""'),
        ]
          .map((val) => `"${val}"`)
          .join(',');
      });

      const csvContent = [csvHeaders.join(','), ...csvRows].join('\n');
      const bom = '\uFEFF'; // BOM pour UTF-8 (Excel)
      const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${mode === 'INVOICES' ? 'factures' : 'devis'}_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      showToast(TOAST.IO.EXPORT_SUCCESS('CSV', dataToExport.length), 'success');
    } else {
      const title = `Export ${mode === 'INVOICES' ? 'Factures' : 'Devis'} - ${new Date().toLocaleDateString('fr-FR')}`;
      const headers = ['N°', 'Client', 'Date', 'Montant', 'Solde', 'Statut'];
      const rows = dataToExport.map((item) => {
        const inv = item as Invoice;
        const clientName =
          tiers.find((t) => t.id === inv.clientId)?.name ||
          clients.find((c) => c.id === inv.clientId)?.name ||
          inv.clientId ||
          '-';
        return [
          inv.number || inv.id,
          clientName.substring(0, 30),
          safeToDateString(inv.date) ? new Date(safeToDateString(inv.date)!).toLocaleDateString('fr-FR') : '-',
          formatPrice(inv.amount || 0),
          formatPrice(inv.balance || 0),
          inv.status || '-',
        ];
      });

      await generateTablePDF({
        title,
        headers,
        rows,
        filename: `${mode === 'INVOICES' ? 'factures' : 'devis'}_${new Date().toISOString().split('T')[0]}`,
        orientation: 'landscape',
        branding: tenantBranding || undefined,
      });
      showToast(TOAST.IO.EXPORT_SUCCESS('PDF', dataToExport.length), 'success');
    }
    setShowExportMenu(false);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      showToast(TOAST.IO.IMPORT_INVALID_FORMAT, 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter((l) => l.trim());
        if (lines.length < 2) {
          showToast(TOAST.IO.IMPORT_EMPTY, 'error');
          return;
        }
        const headers = lines[0].split(';').map((h) => h.trim().toLowerCase());
        const imported = lines.slice(1).map((line) => {
          const cols = line.split(';').map((c) => c.trim());
          const row: Record<string, string> = {};
          headers.forEach((h, i) => {
            row[h] = cols[i] || '';
          });
          return row;
        });
        showToast(TOAST.IO.IMPORT_SUCCESS(imported.length), 'success');
        // Données disponibles dans `imported` pour traitement ultérieur
      } catch {
        showToast(TOAST.IO.IMPORT_ERROR, 'error');
      }
    };
    reader.readAsText(file);
    // Reset input
    if (event.target) event.target.value = '';
  };

  useEffect(() => {
    if (initialData) {
      setEditingItem({
        ...initialData,
        createdAt: new Date(),
        items: initialData.items || [{ description: '', quantity: 1, price: 0 }],
        vatRate: 0,
        status: 'DRAFT',
      });
      setIsFormDirty(false);
      setIsFormOpen(true);
    }
  }, [initialData, mode]);

  const data = mode === 'INVOICES' ? (Array.isArray(invoices) ? invoices : []) : Array.isArray(quotes) ? quotes : [];

  // Get unique resellers for filter dropdown
  const availableResellers = useMemo(() => {
    const resellers = new Set<string>();
    (data || []).forEach((i) => {
      if ((i as FinanceDoc).resellerName) resellers.add((i as FinanceDoc).resellerName);
    });
    return Array.from(resellers).sort();
  }, [data]);

  const availableClients = useMemo(() => {
    const map = new Map<string, string>();
    (data || []).forEach((i) => {
      const id = i.clientId || (i as FinanceDoc).tier_id || '';
      const name = (i as FinanceDoc).clientName || id;
      if (name) map.set(id, name);
    });
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [data]);

  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    (data || []).forEach((i) => {
      if ((i as FinanceDoc).category) cats.add((i as FinanceDoc).category);
    });
    return Array.from(cats).sort();
  }, [data]);

  const availablePlates = useMemo(() => {
    const plates = new Set<string>();
    (data || []).forEach((i) => {
      if ((i as FinanceDoc).licensePlate) plates.add((i as FinanceDoc).licensePlate);
    });
    return Array.from(plates).sort();
  }, [data]);

  const filteredData = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    return (data || []).filter((i) => {
      try {
        const clientId = i.clientId || (i as FinanceDoc).tier_id || '';
        const clientName = (i as FinanceDoc).clientName || '';
        const invoiceNumber = (i as FinanceDoc).number || (i as FinanceDoc).invoice_number || '';
        const subject = (i as FinanceDoc).subject || '';
        const plate = (i as FinanceDoc).licensePlate || (i as FinanceDoc).license_plate || '';
        const contractRef = (i as FinanceDoc).contractNumber || (i as FinanceDoc).contractId || '';
        const invoiceType = (i as FinanceDoc).invoiceType || '';
        const category = (i as FinanceDoc).category || '';

        const matchesSearch =
          !q ||
          clientId.toLowerCase().includes(q) ||
          clientName.toLowerCase().includes(q) ||
          i.id.toLowerCase().includes(q) ||
          invoiceNumber.toLowerCase().includes(q) ||
          subject.toLowerCase().includes(q) ||
          plate.toLowerCase().includes(q) ||
          contractRef.toLowerCase().includes(q) ||
          invoiceType.toLowerCase().includes(q) ||
          category.toLowerCase().includes(q);
        const normalizedStatus = (i.status || '').toUpperCase().replace('PENDING', 'DRAFT');
        const matchesFilter =
          filter === 'ALL' ||
          normalizedStatus === filter ||
          (filter === 'PARTIALLY_PAID' && normalizedStatus === 'PARTIAL');
        const matchesReseller = resellerFilter === 'ALL' || (i as FinanceDoc).resellerName === resellerFilter;
        const matchesClient = clientFilter === 'ALL' || clientId === clientFilter;
        const matchesCategory = categoryFilter === 'ALL' || category === categoryFilter;
        const matchesPlate = plateFilter === 'ALL' || plate === plateFilter;

        let matchesDate = true;
        if (dateRange) {
          const dateStr = (i as FinanceDoc).date || (i as FinanceDoc).createdAt;
          const date = safeToDateString(dateStr);
          if (date) matchesDate = date >= dateRange.start && date <= dateRange.end;
        }

        return (
          matchesSearch &&
          matchesFilter &&
          matchesReseller &&
          matchesClient &&
          matchesCategory &&
          matchesPlate &&
          matchesDate
        );
      } catch {
        return false;
      }
    });
  }, [data, searchTerm, filter, resellerFilter, clientFilter, categoryFilter, plateFilter, dateRange]);

  const FINANCE_SORT_ACCESSORS: Record<string, (item: any) => string | number> = useMemo(
    () => ({
      number: (i: any) => i.number || i.id || '',
      client: (i: any) => i.clientName || i.clientId || '',
      resellerName: (i: any) => i.resellerName || '',
      date: (i: any) => (i.date || i.createdAt || '').toString(),
      amount: (i: any) => i.amount || 0,
      balance: (i: any) => i.balance || 0,
      status: (i: any) => i.status || '',
      category: (i: any) => i.category || '',
      invoiceType: (i: any) => i.invoiceType || '',
      installationDate: (i: any) => i.installationDate || '',
      contractId: (i: any) => i.contractId || '',
      licensePlate: (i: any) => i.licensePlate || '',
      validUntil: (i: any) => (i.validUntil || '').toString(),
      paymentTerms: (i: any) => i.paymentTerms || '',
    }),
    []
  );

  const {
    sortedItems: sortedData,
    sortConfig: financeSortConfig,
    handleSort: handleFinanceSort,
  } = useTableSort(filteredData, { key: 'date', direction: 'desc' }, FINANCE_SORT_ACCESSORS);

  useEffect(() => {
    setSelectedIds(new Set());
    setActionMenuId(null);
    setCurrentPage(1);
  }, [filter, resellerFilter, clientFilter, categoryFilter, plateFilter, searchTerm, mode]);

  const getStatusBadge = (status: string, isQuote: boolean = mode === 'QUOTES') => {
    const styles: Record<string, string> = {
      PAID: 'bg-green-100 text-green-700',
      PARTIALLY_PAID: 'bg-yellow-100 text-yellow-800',
      PARTIAL: 'bg-yellow-100 text-yellow-800',
      SENT: 'bg-[var(--primary-dim)] text-[var(--primary)]',
      OVERDUE: 'bg-red-100 text-red-700',
      DRAFT: 'bg-[var(--bg-elevated)] text-[var(--text-secondary)]',
      ACCEPTED: 'bg-green-100 text-green-700',
      REJECTED: 'bg-red-100 text-red-700',
      CANCELLED: 'bg-red-100 text-red-700',
      ACTIVE: 'bg-green-100 text-green-700',
      EXPIRED: 'bg-orange-100 text-orange-700',
      TERMINATED: 'bg-red-100 text-red-700',
    };
    // Labels différents pour factures (féminin) et devis (masculin)
    const invoiceLabels: Record<string, string> = {
      PAID: 'Payée',
      PARTIALLY_PAID: 'Partiellement payée',
      PARTIAL: 'Partiellement payée',
      SENT: 'Envoyée',
      OVERDUE: 'En retard',
      DRAFT: 'Brouillon',
      CANCELLED: 'Annulée',
    };
    const quoteLabels: Record<string, string> = {
      DRAFT: 'Brouillon',
      SENT: 'Envoyé',
      ACCEPTED: 'Accepté',
      REJECTED: 'Refusé',
      EXPIRED: 'Expiré',
      CANCELLED: 'Annulé',
    };
    const labels = isQuote ? quoteLabels : invoiceLabels;
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-semibold uppercase ${styles[status] || styles['DRAFT']}`}>
        {labels[status] || status}
      </span>
    );
  };

  const handleImportIntervention = (intervention: Intervention) => {
    const newInvoice: Invoice = {
      id: `INV-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`,
      tenantId: intervention.tenantId,
      clientId: intervention.clientId,
      number: `INV-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`,
      subject: `Facture pour Intervention: ${intervention.type} - ${intervention.nature || ''}`,
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      amount: intervention.cost || 0,
      status: 'DRAFT',
      items: [
        {
          description: `Intervention: ${intervention.type} - ${intervention.nature || ''} (${intervention.vehicleId})`,
          quantity: 1,
          price: intervention.cost || 0,
        },
      ],
      vatRate: 0,
      notes: intervention.notes,
      invoiceType: 'FACTURE',
    };

    setIsImportModalOpen(false);
    setEditingItem(newInvoice);
    setIsFormDirty(false);
    setIsFormOpen(true);
  };

  const handleCreate = () => {
    if (mode === 'INVOICES') {
      setEditingItem({
        number: `INV-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000)}`,
        subject: '',
        date: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        items: [{ description: '', quantity: 1, price: 0 }],
        vatRate: 0,
        status: 'DRAFT',
      });
    } else {
      setEditingItem({
        createdAt: new Date(),
        items: [{ description: '', quantity: 1, price: 0 }],
        vatRate: 0,
        status: 'DRAFT',
      });
    }
    setIsFormDirty(false);
    setIsFormOpen(true);
  };

  const handleEdit = (item: Invoice | Quote) => {
    setSelectedItem(null);
    setEditingItem(JSON.parse(JSON.stringify(item))); // Deep copy
    setIsFormDirty(false);
    setIsFormOpen(true);
  };

  const handleSave = (item: Invoice | Quote) => {
    const exists = data.some((d) => d.id === item.id);
    if (exists) {
      if (mode === 'INVOICES') updateInvoice(item as Invoice);
      else if (mode === 'QUOTES') updateQuote(item as Quote);
      showToast(TOAST.CRUD.UPDATED('Document'), 'success');
    } else {
      // Ne pas générer d'ID frontend - le backend génère l'UUID
      const newItem = { ...item };
      if (mode === 'INVOICES') addInvoice(newItem as Invoice);
      else if (mode === 'QUOTES') addQuote(newItem as Quote);
      showToast(TOAST.CRUD.CREATED('Document'), 'success');
    }
    setIsFormOpen(false);
    setEditingItem(null);
    // Fire callback for both new and updated items (M9 fix)
    if (onSaveSuccess && mode === 'INVOICES') onSaveSuccess(item as Invoice);
  };

  const handleDelete = async () => {
    if (
      await confirm({
        message: `Êtes-vous sûr de vouloir supprimer ${selectedIds.size} élément(s) ?`,
        variant: 'danger',
        title: 'Confirmer la suppression',
        confirmLabel: 'Supprimer',
      })
    ) {
      selectedIds.forEach((id) => {
        if (mode === 'INVOICES') deleteInvoice(id);
        else if (mode === 'QUOTES') deleteQuote(id);
      });
      showToast(TOAST.CRUD.DELETED(`${selectedIds.size} élément(s)`), 'success');
      setSelectedIds(new Set());
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    setPaymentSaving(true);
    try {
      const result = await api.payments.create({
        id: paymentForm.paymentNumber,
        invoiceId: selectedItem.id,
        amount: paymentForm.amount,
        date: paymentForm.date,
        method: paymentForm.method as Payment['method'],
        reference: paymentForm.reference,
        notes: paymentForm.notes,
      } as Partial<Payment>);

      if (result) {
        // Calculer le nouveau solde
        const newBalance = (selectedItem.amount || 0) - (paymentHistory.totalPaid + paymentForm.amount);
        let newStatus: string = 'PARTIALLY_PAID';
        if (newBalance <= 0) newStatus = 'PAID';

        // Mettre à jour le statut de la facture
        updateInvoice({
          ...(selectedItem as Invoice),
          status: newStatus as Invoice['status'],
          balance: Math.max(0, newBalance),
        });

        showToast(TOAST.FINANCE.PAYMENT_RECORDED(formatPrice(paymentForm.amount)), 'success');
        setIsPaymentModalOpen(false);
        setSelectedItem(null);
      } else {
        showToast(mapError((result as { error?: string })?.error, 'paiement'), 'error');
      }
    } catch (error: unknown) {
      showToast(mapError(error, 'paiement'), 'error');
    } finally {
      setPaymentSaving(false);
    }
  };

  const openPaymentModal = async (item: Invoice) => {
    setSelectedItem(item);

    // Charger l'historique des paiements pour calculer le solde
    try {
      const data = await api.payments.getPaymentHistory(item.id);
      const totalPaid = data.totalPaid || 0;
      const balance = (item.amount || 0) - totalPaid;

      if (data) {
        setPaymentHistory({
          invoice: data.invoice,
          payments: data.history || [],
          totalPaid,
          balance,
          loading: false,
        });

        setPaymentForm({
          amount: Math.max(0, balance), // Solde restant par défaut
          method: 'VIREMENT',
          reference: '',
          date: new Date().toISOString().split('T')[0],
          notes: '',
          invoiceId: item.id,
          paymentNumber: `PAY-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)
            .toString()
            .padStart(4, '0')}`,
          attachment: null,
        });
      }
    } catch {
      setPaymentHistory({ invoice: item, payments: [], totalPaid: 0, balance: item.amount || 0, loading: false });
      setPaymentForm({
        amount: item.amount || 0,
        method: 'VIREMENT',
        reference: '',
        date: new Date().toISOString().split('T')[0],
        notes: '',
        invoiceId: item.id,
        paymentNumber: `PAY-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)
          .toString()
          .padStart(4, '0')}`,
        attachment: null,
      });
    }

    setIsPaymentModalOpen(true);
  };

  // Ouvrir modal historique paiements
  const openPaymentHistoryModal = async (item: Invoice) => {
    setSelectedItem(item);
    setPaymentHistory((prev) => ({ ...prev, loading: true }));
    setIsPaymentHistoryOpen(true);

    try {
      const data = await api.payments.getPaymentHistory(item.id);
      setPaymentHistory({
        invoice: data.invoice,
        payments: data.history || [],
        totalPaid: data.totalPaid || 0,
        balance: data.balance || 0,
        loading: false,
      });
    } catch {
      setPaymentHistory((prev) => ({ ...prev, loading: false }));
      showToast(TOAST.CRUD.ERROR_LOAD('historique'), 'error');
    }
  };

  // Fonction pour ouvrir le modal d'envoi d'email
  const openEmailModal = (item: Invoice | Quote) => {
    setSelectedItem(item);

    // Récupérer l'email du client
    const client = clients.find((c) => c.id === item.clientId);
    const tier = tiers.find((t) => t.id === item.clientId);
    const recipientEmail = client?.email || tier?.email || '';

    setEmailForm({
      invoiceId: item.id,
      recipientEmail: recipientEmail,
      subject: `${mode === 'INVOICES' ? 'Facture' : 'Devis'} ${(item as Invoice).number || item.id}`,
      message: `Veuillez trouver ci-joint votre ${mode === 'INVOICES' ? 'facture' : 'devis'}.`,
    });
    setIsEmailModalOpen(true);
  };

  // Fonction pour envoyer l'email via l'API
  const handleSendEmail = async () => {
    if (!emailForm.recipientEmail) {
      showToast(TOAST.VALIDATION.REQUIRED_FIELD('adresse email'), 'error');
      return;
    }

    setEmailSending(true);
    try {
      const emailData = {
        to: emailForm.recipientEmail,
        subject: emailForm.subject,
        message: emailForm.message,
      };

      const result =
        mode === 'QUOTES'
          ? await api.finance.sendQuoteEmail(emailForm.invoiceId, emailData)
          : await api.finance.sendInvoiceEmail(emailForm.invoiceId, emailData);

      if (result) {
        // Mettre à jour le statut
        if (selectedItem) {
          if (mode === 'QUOTES') updateQuote({ ...(selectedItem as Quote), status: 'SENT' });
          else updateInvoice({ ...(selectedItem as Invoice), status: 'SENT' });
        }
        showToast(TOAST.COMM.EMAIL_SENT(emailForm.recipientEmail), 'success');
        setIsEmailModalOpen(false);
        setSelectedItem(null);
      } else {
        showToast(TOAST.COMM.EMAIL_ERROR, 'error');
      }
    } catch (error: unknown) {
      showToast(mapError(error, 'email'), 'error');
    } finally {
      setEmailSending(false);
    }
  };

  // Credit Note (Avoir) Functions
  const openCreditNoteModal = (invoice: Invoice) => {
    setCreditNoteForm({
      invoice,
      amount: invoice.amount,
      reason: '',
      type: 'PARTIAL',
      notes: '',
    });
    setIsCreditNoteModalOpen(true);
  };

  const handleCreateCreditNote = async () => {
    if (!creditNoteForm.invoice || !creditNoteForm.reason.trim()) {
      showToast(TOAST.FINANCE.CREDIT_NOTE_REASON_REQUIRED, 'warning');
      return;
    }
    if (creditNoteForm.amount <= 0 || creditNoteForm.amount > creditNoteForm.invoice.amount) {
      showToast(TOAST.FINANCE.CREDIT_NOTE_AMOUNT_INVALID, 'warning');
      return;
    }

    setCreditNoteCreating(true);
    try {
      const result = await api.finance.createCreditNote({
        invoice_id: creditNoteForm.invoice.id,
        invoice_number: creditNoteForm.invoice.number,
        client_name:
          clients.find((c) => c.id === creditNoteForm.invoice?.clientId)?.name ||
          tiers.find((t) => t.id === creditNoteForm.invoice?.tier_id)?.name ||
          'Client',
        client_id: creditNoteForm.invoice.clientId || creditNoteForm.invoice.tier_id,
        amount: creditNoteForm.amount,
        reason: creditNoteForm.reason,
        type: creditNoteForm.type,
        notes: creditNoteForm.notes,
        items:
          creditNoteForm.invoice.items?.map((i) => ({
            ...i,
            quantity: -Math.abs(i.quantity),
            price: i.price,
          })) || [],
      });

      if (result) {
        showToast(TOAST.FINANCE.CREDIT_NOTE_CREATED(result.number), 'success');
        // Update invoice status if full credit note
        if (creditNoteForm.type === 'FULL') {
          updateInvoice({ ...creditNoteForm.invoice, status: 'CANCELLED' });
        }
        setIsCreditNoteModalOpen(false);
        setCreditNoteForm({ invoice: null, amount: 0, reason: '', type: 'PARTIAL', notes: '' });
      } else {
        showToast(TOAST.FINANCE.CREDIT_NOTE_ERROR, 'error');
      }
    } catch (error: unknown) {
      showToast(mapError(error, 'avoir'), 'error');
    } finally {
      setCreditNoteCreating(false);
    }
  };

  const handleGenerateContract = (invoice: Invoice | Quote) => {
    // 1. Check if updateContract flag is set or if it's an INSTALLATION
    const shouldCheckForUpdate =
      (invoice as Invoice).updateContract || (invoice as Invoice).category === 'INSTALLATION';

    if (shouldCheckForUpdate) {
      // 2. Find active contracts for this client
      const activeContracts = (Array.isArray(contracts) ? contracts : []).filter(
        (c) => (c.clientId === invoice.clientId || c.clientId === invoice.tenantId) && c.status === 'ACTIVE'
      );

      if (activeContracts.length > 0) {
        // 3. Smart Matching Logic
        // Check if invoice date (subscription start) aligns with any contract's billing cycle
        let targetDate = new Date((invoice as Invoice).date || (invoice as Quote).createdAt);

        // Try to find linked intervention to use endTime (Real Installation Date) or scheduledDate
        if ((invoice as Invoice).interventionId) {
          const linkedIntervention = interventions.find((i) => i.id === (invoice as Invoice).interventionId);
          if (linkedIntervention) {
            // Prioritize actual completion date (endTime), fallback to scheduled date
            if (linkedIntervention.endTime) {
              targetDate = new Date(linkedIntervention.endTime);
            } else if (linkedIntervention.scheduledDate) {
              targetDate = new Date(linkedIntervention.scheduledDate);
            }
          }
        }

        const targetMonth = targetDate.getMonth();

        // Filtrer les contrats correspondants
        const matchingContracts = activeContracts.filter((c) => {
          const contractStart = new Date(c.startDate);

          if (c.billingCycle === 'ANNUAL') {
            return contractStart.getMonth() === targetMonth;
          }
          if (c.billingCycle === 'SEMESTRIAL') {
            return contractStart.getMonth() === targetMonth || (contractStart.getMonth() + 6) % 12 === targetMonth;
          }
          if (c.billingCycle === 'QUARTERLY') {
            return (targetMonth - contractStart.getMonth()) % 3 === 0;
          }
          if (c.billingCycle === 'MONTHLY') {
            return true;
          }
          return false;
        });

        if (matchingContracts.length > 0) {
          // Ouvrir le modal de sélection au lieu de confirm()
          setContractLinkData({
            invoice: invoice as Invoice,
            matchingContracts: matchingContracts.map((c) => ({
              ...c,
              clientName: clients.find((cl) => cl.id === c.clientId)?.name || 'Client',
            })),
            selectedContractId: matchingContracts[0].id,
          });
          setIsContractLinkModalOpen(true);
          return;
        }
      }
    }

    const invoiceDate = safeToDateString((invoice as Invoice).date) || new Date().toISOString().split('T')[0];
    const startDateObj = new Date((invoice as Invoice).date || Date.now());
    const endDateObj = new Date(startDateObj);
    endDateObj.setFullYear(endDateObj.getFullYear() + 1);
    const endDate = !isNaN(endDateObj.getTime())
      ? endDateObj.toISOString().split('T')[0]
      : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    setContractInitialData({
      clientId: invoice.clientId,
      startDate: invoiceDate,
      endDate: endDate,
      monthlyFee: invoice.amount,
      vehicleCount: 1,
      items: (invoice.items || []).map((i) => ({ description: i.description, quantity: i.quantity, price: i.price })),
      resellerId: (invoice as Invoice).resellerId,
      resellerName: (invoice as Invoice).resellerName,
    });
    setIsContractChoiceModalOpen(true);
  };

  // Handler pour ajouter le véhicule à un contrat existant
  const handleAddVehicleToContract = () => {
    const { invoice, selectedContractId } = contractLinkData;
    if (!invoice || !selectedContractId) return;

    const targetContract = contracts.find((c) => c.id === selectedContractId);
    if (!targetContract) return;

    const newVehicleCount = (targetContract.vehicleCount || 0) + 1;
    const unitPrice = targetContract.monthlyFee / (targetContract.vehicleCount || 1);
    const newMonthlyFee = unitPrice * newVehicleCount;

    const updatedContract = {
      ...targetContract,
      vehicleCount: newVehicleCount,
      monthlyFee: newMonthlyFee,
      vehicleIds: [...(targetContract.vehicleIds || []), invoice.licensePlate || 'Unknown'],
    };

    updateContract(updatedContract);
    showToast(
      `Véhicule ${invoice.licensePlate} ajouté au contrat. Nouveau total: ${formatPrice(newMonthlyFee)} / mois`,
      'success'
    );
    setIsContractLinkModalOpen(false);
    setContractLinkData({ invoice: null, matchingContracts: [], selectedContractId: '' });
  };

  const handleContractChoice = (choice: 'NEW' | 'EXISTING') => {
    setIsContractChoiceModalOpen(false);
    if (choice === 'NEW') {
      setIsContractModalOpen(true);
    } else {
      showToast(TOAST.CRM.FEATURE_COMING_SOON("Ajouter à l'existant"), 'info');
    }
  };

  const handleContractSubmit = (contract: Contract) => {
    addContract(contract);
    showToast(TOAST.FINANCE.CONTRACT_GENERATED, 'success');
    setIsContractModalOpen(false);
    setContractInitialData(null);
  };

  // Helper: convertir Invoice/Quote en InvoiceData pour pdfServiceV2
  const buildInvoiceData = (item: Invoice | Quote): InvoiceData => {
    const isInvoice = 'number' in item && (item as Invoice).number;
    const inv = item as Invoice;
    const client = tiers.find((t) => t.id === item.clientId) || clients.find((c) => c.id === item.clientId);

    const items = (item.items || []).map((line) => ({
      description: line.description,
      quantity: line.quantity,
      price: line.price,
      total: line.quantity * line.price,
    }));

    const subtotal = items.reduce((sum, i) => sum + i.total, 0);
    const taxRate = item.vatRate ?? 0;
    const taxAmount = subtotal * (taxRate / 100);
    const total = inv.amount || subtotal + taxAmount;

    const contract = contracts.find((c) => c.id === inv.contractId);
    const contractRef = contract?.contractNumber || contract?.subscriptionNumber || inv.contractId;

    return {
      number: isInvoice ? inv.number : (item as Quote).id,
      date: typeof item.date === 'string' ? item.date : new Date(item.date).toISOString(),
      dueDate: inv.dueDate || new Date().toISOString(),
      clientId: item.clientId,
      currency: (inv as FinanceDoc).currency || 'XOF',
      client: {
        name: client?.name || item.clientId || '',
        address: client?.address || '',
        city: client?.city || '',
        email: client?.email || '',
        phone: client?.phone || '',
      },
      items,
      subtotal,
      taxRate,
      taxAmount,
      total,
      status: inv.status,
      notes: inv.notes,
      resellerName: (inv as FinanceDoc).resellerName,
      meta: {
        licensePlate: (inv as FinanceDoc).licensePlate,
        contractId: contractRef,
        paymentMethod: (inv as FinanceDoc).paymentMethod,
      },
    };
  };

  const downloadItemPDF = (item: Invoice | Quote) => {
    try {
      const data = buildInvoiceData(item);
      const isQuote = data.number.startsWith('DEV');
      generateInvoicePDF(data, {
        branding: tenantBranding || undefined,
        type: isQuote ? 'quote' : 'invoice',
      });
    } catch {
      // PDF generation error — silent
    }
  };

  const handleAction = async (
    action:
      | 'download'
      | 'send'
      | 'pay'
      | 'clone'
      | 'cancel'
      | 'accept'
      | 'reject'
      | 'convert_to_invoice'
      | 'convert_to_contract'
      | 'mark_sent'
      | 'credit_note'
      | 'delete',
    item: Invoice | Quote
  ) => {
    if (action === 'download') {
      try {
        downloadItemPDF(item);
        showToast(TOAST.IO.PDF_DOWNLOADED, 'success');
      } catch {
        showToast(TOAST.IO.PDF_ERROR, 'error');
      }
    }
    if (action === 'send') {
      // Open email modal for real email sending
      openEmailModal(item);
    }
    if (action === 'mark_sent') {
      if (mode === 'QUOTES') updateQuote({ ...(item as Quote), status: 'SENT' });
      else updateInvoice({ ...(item as Invoice), status: 'SENT' });
      showToast(TOAST.FINANCE.STATUS_CHANGED('envoyé'), 'success');
    }
    if (action === 'pay') {
      openPaymentModal(item as Invoice);
    }
    if (action === 'clone') {
      const clonedItem = { ...item, id: '', number: '', status: 'DRAFT', date: new Date().toISOString().split('T')[0] };
      setEditingItem(clonedItem as Partial<Invoice> | Partial<Quote>);
      setIsFormDirty(false);
      setIsFormOpen(true);
      showToast(TOAST.CRUD.DUPLICATED('Document'), 'info');
    }
    if (action === 'cancel') {
      if (
        await confirm({
          message: 'Êtes-vous sûr de vouloir annuler ce document ?',
          variant: 'warning',
          title: "Confirmer l'annulation",
          confirmLabel: 'Annuler le document',
        })
      ) {
        if (mode === 'INVOICES') updateInvoice({ ...(item as Invoice), status: 'CANCELLED' });
        else updateQuote({ ...(item as Quote), status: 'REJECTED' });
        showToast(TOAST.FINANCE.STATUS_CHANGED('annulé'), 'warning');
      }
    }
    if (action === 'accept' || action === 'convert_to_invoice') {
      const quote = item as Quote;
      try {
        const result = await api.finance.convertQuoteToInvoice(quote.id);
        if (result.error) {
          showToast(mapError(result.error, 'devis'), 'error');
          return;
        }
        // Mettre à jour le devis en ACCEPTED localement
        updateQuote({ ...quote, status: 'ACCEPTED' });
        // Ajouter la facture créée par le backend
        if (result.invoice) {
          addInvoice({
            ...result.invoice,
            id: result.invoice.id,
            clientId: result.invoice.tier_id,
            number: result.invoice.invoice_number,
            amount: parseFloat(result.invoice.amount_ttc || result.invoice.amount_ht || '0'),
            vatRate: parseFloat(result.invoice.tax_rate || '0'),
            status: result.invoice.status || 'DRAFT',
            items: result.invoice.items || [],
            createdAt: new Date(result.invoice.created_at),
          });
        }
        showToast(
          action === 'accept' ? TOAST.FINANCE.QUOTE_ACCEPTED(item.id) : TOAST.FINANCE.QUOTE_CONVERTED,
          'success'
        );
      } catch (error) {
        showToast(TOAST.FINANCE.QUOTE_CONVERT_ERROR, 'error');
      }
    }
    if (action === 'reject') {
      updateQuote({ ...(item as Quote), status: 'REJECTED' });
      showToast(TOAST.FINANCE.QUOTE_REJECTED(item.id), 'info');
    }
    if (action === 'convert_to_contract') {
      // Open contract generation modal
      handleGenerateContract(item);
    }
    if (action === 'credit_note') {
      // Open credit note modal for creating avoir
      openCreditNoteModal(item as Invoice);
    }
    if (action === 'delete') {
      if (
        await confirm({
          message: 'Êtes-vous sûr de vouloir supprimer ce document ?',
          variant: 'danger',
          title: 'Confirmer la suppression',
          confirmLabel: 'Supprimer',
        })
      ) {
        if (mode === 'INVOICES') deleteInvoice(item.id);
        else deleteQuote(item.id);
        showToast(TOAST.CRUD.DELETED('Document'), 'success');
      }
    }
  };

  // Pagination logic
  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const paginatedData = sortedData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleSelectAll = () => {
    if (paginatedData.every((i) => selectedIds.has(i.id))) {
      const newSet = new Set(selectedIds);
      paginatedData.forEach((i) => newSet.delete(i.id));
      setSelectedIds(newSet);
    } else {
      const newSet = new Set(selectedIds);
      paginatedData.forEach((i) => newSet.add(i.id));
      setSelectedIds(newSet);
    }
  };

  const isAllSelected = paginatedData.length > 0 && paginatedData.every((i) => selectedIds.has(i.id));

  return (
    <>
      <div className="space-y-4 sm:space-y-6 sm:h-full sm:flex sm:flex-col">
        <div className="flex flex-col gap-2 shrink-0">
          {/* Row 1: Title + New button */}
          <div className="flex justify-between items-center">
            <h2 className="text-lg sm:page-title flex items-center gap-2">
              <Receipt className="w-5 h-5 sm:w-6 sm:h-6 text-[var(--primary)]" />{' '}
              {mode === 'INVOICES' ? 'Facturation' : 'Devis'}
            </h2>
            <div className="flex items-center gap-2">
              {/* Desktop-only secondary actions */}
              <div className="hidden sm:flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept=".csv,.json"
                  title="Importer un fichier"
                />
                <button
                  onClick={handleImportClick}
                  className="p-2 bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-secondary)] rounded-lg hover:bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)]"
                  title="Importer"
                >
                  <Upload className="w-4 h-4" />
                </button>
                <div className="relative">
                  <button
                    onClick={() => setShowExportMenu(!showExportMenu)}
                    className={`p-2 bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-secondary)] rounded-lg hover:bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)] ${showExportMenu ? 'bg-[var(--bg-elevated)]' : ''}`}
                    title="Exporter"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  {showExportMenu && (
                    <div className="absolute right-0 top-full mt-2 w-32 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg shadow-xl z-50 overflow-hidden py-1">
                      <button
                        onClick={() => handleExport('csv')}
                        className="w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)] flex items-center gap-2"
                      >
                        <span className="font-mono text-xs border rounded px-1">CSV</span> Export CSV
                      </button>
                      <button
                        onClick={() => handleExport('pdf')}
                        className="w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)] flex items-center gap-2"
                      >
                        <span className="font-mono text-xs border rounded px-1">PDF</span> Export PDF
                      </button>
                    </div>
                  )}
                </div>
                {mode === 'INVOICES' && (
                  <button
                    onClick={() => setIsImportModalOpen(true)}
                    className="px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)]"
                  >
                    <Download className="w-4 h-4" /> Importer Interv.
                  </button>
                )}
              </div>
              <button
                onClick={handleCreate}
                className="px-3 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-bold flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">{mode === 'INVOICES' ? 'Nouvelle Facture' : 'Nouveau Devis'}</span>
                <span className="sm:hidden">{mode === 'INVOICES' ? 'Facture' : 'Devis'}</span>
              </button>
            </div>
          </div>

          {/* Row 2: Search + Filters */}
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Rechercher..."
                aria-label="Rechercher"
                className="pl-9 pr-4 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                aria-label="Filtrer par statut"
                className="pl-9 pr-8 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] appearance-none focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              >
                <option value="ALL">Tous</option>
                {mode === 'INVOICES' ? (
                  <>
                    <option value="PAID">Payée</option>
                    <option value="PARTIALLY_PAID">Partiellement payée</option>
                    <option value="SENT">Envoyée</option>
                    <option value="OVERDUE">En retard</option>
                    <option value="DRAFT">Brouillon</option>
                    <option value="CANCELLED">Annulée</option>
                  </>
                ) : (
                  <>
                    <option value="DRAFT">Brouillon</option>
                    <option value="SENT">Envoyé</option>
                    <option value="ACCEPTED">Accepté</option>
                    <option value="REJECTED">Refusé</option>
                    <option value="EXPIRED">Expiré</option>
                  </>
                )}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
            </div>

            {/* Reseller Filter — desktop only */}
            {availableResellers.length > 0 && (
              <div className="hidden sm:block relative">
                <select
                  value={resellerFilter}
                  onChange={(e) => setResellerFilter(e.target.value)}
                  aria-label="Filtrer par revendeur"
                  className="pl-3 pr-8 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] appearance-none focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                >
                  <option value="ALL">Tous les revendeurs</option>
                  {availableResellers.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
              </div>
            )}

            {/* Client Filter */}
            {availableClients.length > 0 && (
              <div className="hidden sm:block relative">
                <select
                  value={clientFilter}
                  onChange={(e) => setClientFilter(e.target.value)}
                  aria-label="Filtrer par client"
                  className="pl-3 pr-8 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] appearance-none focus:outline-none focus:ring-2 focus:ring-[var(--primary)] max-w-[180px]"
                >
                  <option value="ALL">Tous les clients</option>
                  {availableClients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
              </div>
            )}

            {/* Category Filter (Type Op.) — invoices only */}
            {mode === 'INVOICES' && availableCategories.length > 0 && (
              <div className="hidden sm:block relative">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  aria-label="Filtrer par type d'opération"
                  className="pl-3 pr-8 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] appearance-none focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                >
                  <option value="ALL">Type Op.</option>
                  <option value="INSTALLATION">Installation</option>
                  <option value="ABONNEMENT">Abonnement</option>
                  <option value="STANDARD">Standard</option>
                  <option value="AUTRES_VENTES">Autres ventes</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
              </div>
            )}

            {/* Plate Filter — invoices only */}
            {mode === 'INVOICES' && availablePlates.length > 0 && (
              <div className="hidden sm:block relative">
                <select
                  value={plateFilter}
                  onChange={(e) => setPlateFilter(e.target.value)}
                  aria-label="Filtrer par plaque"
                  className="pl-3 pr-8 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] appearance-none focus:outline-none focus:ring-2 focus:ring-[var(--primary)] font-mono max-w-[160px]"
                >
                  <option value="ALL">Toutes les plaques</option>
                  {availablePlates.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
              </div>
            )}

            {/* Active filters badge + reset */}
            {(clientFilter !== 'ALL' ||
              categoryFilter !== 'ALL' ||
              plateFilter !== 'ALL' ||
              resellerFilter !== 'ALL') && (
              <button
                onClick={() => {
                  setClientFilter('ALL');
                  setCategoryFilter('ALL');
                  setPlateFilter('ALL');
                  setResellerFilter('ALL');
                }}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-2 text-xs font-medium text-orange-600 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg hover:bg-orange-100"
                title="Réinitialiser les filtres"
              >
                <X className="w-3 h-3" /> Effacer les filtres
              </button>
            )}

            {/* Column manager — desktop only */}
            <div className="hidden sm:block relative">
              <button
                onClick={() => setShowColumnManager(!showColumnManager)}
                className={`p-2 bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-secondary)] rounded-lg hover:bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)] ${showColumnManager ? 'bg-[var(--bg-elevated)]' : ''}`}
                title="Gérer les colonnes"
              >
                <Columns className="w-4 h-4" />
              </button>
              {showColumnManager && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg shadow-xl z-50 p-2">
                  <div className="flex justify-between items-center mb-2 px-2">
                    <span className="section-title">Colonnes</span>
                    <button
                      onClick={() => setShowColumnManager(false)}
                      className="text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                      title="Fermer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-1">
                    {(mode === 'INVOICES' ? INVOICE_COLUMNS : QUOTE_COLUMNS).map((col) => (
                      <label
                        key={col.id}
                        className="flex items-center gap-2 p-2 hover:bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)]/50 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={visibleColumns.includes(col.id)}
                          onChange={() => toggleColumn(col.id)}
                          className="rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
                        />
                        <span className="text-sm text-[var(--text-primary)]">{col.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* KPI CARDS - Hidden on mobile */}
        {!isMobile && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {mode === 'INVOICES' ? (
              <>
                <Card className="p-4 border-l-4 border-l-blue-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="section-title">Factures Émises</p>
                      <p className="page-title mt-1">{(Array.isArray(invoices) ? invoices : []).length}</p>
                    </div>
                    <div className="p-3 bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] rounded-full text-[var(--primary)]">
                      <FileText className="w-6 h-6" />
                    </div>
                  </div>
                </Card>
                <Card className="p-4 border-l-4 border-l-green-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="section-title">Factures Payées</p>
                      <p className="page-title mt-1">
                        {(Array.isArray(invoices) ? invoices : []).filter((i) => i.status === 'PAID').length}
                      </p>
                    </div>
                    <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-full text-green-600">
                      <CheckCircle className="w-6 h-6" />
                    </div>
                  </div>
                </Card>
                <Card className="p-4 border-l-4 border-l-red-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="section-title">En Retard</p>
                      <p className="page-title mt-1">
                        {(Array.isArray(invoices) ? invoices : []).filter((i) => i.status === 'OVERDUE').length}
                      </p>
                    </div>
                    <div className="p-3 bg-red-50 dark:bg-red-900/30 rounded-full text-red-600">
                      <AlertCircle className="w-6 h-6" />
                    </div>
                  </div>
                </Card>
                <Card className="p-4 border-l-4 border-l-purple-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="section-title">Taux Recouvrement</p>
                      <p className="page-title mt-1">
                        {((kpis as Record<string, number>).collectionRate || 0).toFixed(1)} %
                      </p>
                    </div>
                    <div className="p-3 bg-purple-50 dark:bg-purple-900/30 rounded-full text-purple-600">
                      <PieChart className="w-6 h-6" />
                    </div>
                  </div>
                </Card>
              </>
            ) : (
              <>
                <Card className="p-4 border-l-4 border-l-blue-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="section-title">Total Devis</p>
                      <p className="page-title mt-1">{(Array.isArray(quotes) ? quotes : []).length}</p>
                    </div>
                    <div className="p-3 bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] rounded-full text-[var(--primary)]">
                      <FileText className="w-6 h-6" />
                    </div>
                  </div>
                </Card>
                <Card className="p-4 border-l-4 border-l-green-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="section-title">Devis Acceptés</p>
                      <p className="page-title mt-1">
                        {(Array.isArray(quotes) ? quotes : []).filter((q) => q.status === 'ACCEPTED').length}
                      </p>
                    </div>
                    <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-full text-green-600">
                      <CheckCircle className="w-6 h-6" />
                    </div>
                  </div>
                </Card>
                <Card className="p-4 border-l-4 border-l-purple-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="section-title">Taux Transformation</p>
                      <p className="page-title mt-1">
                        {((kpis as Record<string, number>).conversionRate || 0).toFixed(1)} %
                      </p>
                    </div>
                    <div className="p-3 bg-purple-50 dark:bg-purple-900/30 rounded-full text-purple-600">
                      <TrendingUp className="w-6 h-6" />
                    </div>
                  </div>
                </Card>
              </>
            )}
          </div>
        )}

        {/* Mobile cards — Factures / Devis */}
        {isMobile && (
          <div className="divide-y divide-[var(--border)] bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)] mb-20">
            {paginatedData.length === 0 ? (
              filter !== 'ALL' ||
              resellerFilter !== 'ALL' ||
              clientFilter !== 'ALL' ||
              categoryFilter !== 'ALL' ||
              !!searchTerm ? (
                <EmptyState
                  compact
                  icon={SearchX}
                  title="Aucun résultat"
                  description="Aucun document ne correspond aux filtres actifs."
                />
              ) : (
                <EmptyState
                  compact
                  icon={Receipt}
                  title={mode === 'INVOICES' ? 'Aucune facture' : 'Aucun devis'}
                  description={
                    mode === 'INVOICES' ? "Aucune facture n'a encore été créée." : "Aucun devis n'a encore été créé."
                  }
                />
              )
            ) : (
              paginatedData.map((item) => {
                const itemsTotal = ((item as FinanceDoc).items || []).reduce(
                  (sum: number, line: any) => sum + line.quantity * line.price,
                  0
                );
                const total =
                  (item as FinanceDoc).amountHT ||
                  (item as FinanceDoc).amount ||
                  itemsTotal * (1 + ((item as FinanceDoc).vatRate ?? 0) / 100);
                const clientName = (item as FinanceDoc).clientName || (item as FinanceDoc).clientId || '—';
                const number =
                  mode === 'INVOICES'
                    ? (item as FinanceDoc).number || (item as FinanceDoc).invoice_number || item.id
                    : (item as FinanceDoc).number || item.id;
                const borderColor =
                  item.status === 'PAID' || item.status === 'ACCEPTED'
                    ? 'border-l-green-500'
                    : item.status === 'PARTIALLY_PAID' || item.status === 'PARTIAL'
                      ? 'border-l-yellow-500'
                      : item.status === 'OVERDUE' || item.status === 'REJECTED' || item.status === 'CANCELLED'
                        ? 'border-l-red-500'
                        : item.status === 'SENT'
                          ? 'border-l-blue-500'
                          : 'border-l-[var(--text-muted)]';
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className={`pl-4 pr-4 py-3 border-l-4 ${borderColor} cursor-pointer tr-hover/50 active:bg-[var(--bg-elevated)] dark:active:bg-slate-700`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-sm text-[var(--text-primary)] truncate">{clientName}</p>
                        <span className="font-mono text-xs text-[var(--primary)] dark:text-[var(--primary)]">
                          {number}
                        </span>
                      </div>
                      <p className="font-bold text-sm text-[var(--text-primary)] shrink-0">{formatPrice(total)}</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] mb-2 flex-wrap">
                      <span>
                        {new Date(
                          mode === 'INVOICES' ? (item as FinanceDoc).date : (item as FinanceDoc).createdAt
                        ).toLocaleDateString('fr-FR')}
                      </span>
                      {getStatusBadge(item.status)}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(item);
                        }}
                        className="px-3 py-1.5 text-xs bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] text-[var(--primary)] dark:text-[var(--primary)] rounded-lg"
                      >
                        Modifier
                      </button>
                      {mode === 'INVOICES' && item.status !== 'PAID' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAction('pay', item);
                          }}
                          className="px-3 py-1.5 text-xs bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg"
                        >
                          Payer
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {!isMobile && (
          <Card className="flex-1 overflow-hidden p-0 relative">
            {selectedIds.size > 0 && (
              <div className="absolute top-0 left-0 right-0 h-14 bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] flex items-center justify-between px-6 z-20 animate-in fade-in slide-in-from-top-1 border-b border-[var(--primary)] dark:border-[var(--primary)]">
                <span className="text-sm font-bold text-[var(--primary)] dark:text-[var(--primary)]">
                  {selectedIds.size} sélectionné(s)
                </span>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      const selected = filteredData.filter((i) => selectedIds.has(i.id));
                      selected.forEach((i) => openEmailModal(i));
                    }}
                    className="text-xs text-[var(--primary)] flex items-center gap-1.5 px-2 py-1 rounded hover:bg-[var(--primary-dim)] dark:hover:bg-[var(--primary-dim)]"
                  >
                    <Mail className="w-3 h-3" /> Envoyer par mail
                  </button>
                  {mode === 'INVOICES' && (
                    <button
                      onClick={() => {
                        filteredData
                          .filter((i) => selectedIds.has(i.id) && (i.status === 'DRAFT' || i.status === 'SENT'))
                          .forEach((i) => updateInvoice({ ...(i as Invoice), status: 'SENT' }));
                        showToast(`${selectedIds.size} facture(s) marquée(s) comme envoyée(s)`, 'success');
                        setSelectedIds(new Set());
                      }}
                      className="text-xs text-[var(--primary)] flex items-center gap-1.5 px-2 py-1 rounded hover:bg-[var(--primary-dim)] dark:hover:bg-[var(--primary-dim)]"
                    >
                      <CheckCircle className="w-3 h-3" /> Marquer envoyées
                    </button>
                  )}
                  {mode === 'QUOTES' && (
                    <button
                      onClick={() => {
                        filteredData
                          .filter((i) => selectedIds.has(i.id) && i.status === 'DRAFT')
                          .forEach((i) => updateQuote({ ...(i as Quote), status: 'SENT' }));
                        showToast(`${selectedIds.size} devis marqué(s) comme envoyé(s)`, 'success');
                        setSelectedIds(new Set());
                      }}
                      className="text-xs text-[var(--primary)] flex items-center gap-1.5 px-2 py-1 rounded hover:bg-[var(--primary-dim)] dark:hover:bg-[var(--primary-dim)]"
                    >
                      <CheckCircle className="w-3 h-3" /> Marquer envoyés
                    </button>
                  )}
                  <button
                    onClick={() => handleExport('csv')}
                    className="text-xs text-[var(--text-secondary)] flex items-center gap-1.5 px-2 py-1 rounded hover:bg-[var(--bg-elevated)]"
                  >
                    <Download className="w-3 h-3" /> Exporter CSV
                  </button>
                  <button
                    onClick={() => handleExport('pdf')}
                    className="text-xs text-[var(--text-secondary)] flex items-center gap-1.5 px-2 py-1 rounded hover:bg-[var(--bg-elevated)]"
                  >
                    <Download className="w-3 h-3" /> Exporter PDF
                  </button>
                  <button
                    onClick={() => {
                      const selected = filteredData.filter((i) => selectedIds.has(i.id));
                      selected.forEach((i) => {
                        downloadItemPDF(i);
                      });
                      showToast(TOAST.IO.EXPORT_SUCCESS('PDF', selected.length), 'success');
                    }}
                    className="text-xs text-purple-600 flex items-center gap-1.5 px-2 py-1 rounded hover:bg-purple-100 dark:hover:bg-purple-800"
                  >
                    <Download className="w-3 h-3" /> Export ZIP
                  </button>
                  <button
                    onClick={handleDelete}
                    className="text-xs text-red-600 flex items-center gap-1.5 px-2 py-1 rounded hover:bg-red-100 dark:hover:bg-red-800"
                  >
                    <Trash2 className="w-3 h-3" /> Supprimer
                  </button>
                </div>
              </div>
            )}
            <div className="overflow-auto h-full">
              <table className="w-full text-left min-w-[800px]">
                <thead
                  className={`bg-[var(--bg-elevated)] sticky top-0 z-10 ${selectedIds.size > 0 ? 'opacity-0' : ''}`}
                >
                  <tr className="text-xs font-bold text-[var(--text-secondary)] uppercase">
                    <th className="px-4 py-3 w-12">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={handleSelectAll}
                        aria-label="Tout sélectionner"
                        className="rounded border-[var(--border)] text-[var(--primary)]"
                      />
                    </th>
                    {(mode === 'QUOTES' ? QUOTE_COLUMNS : INVOICE_COLUMNS)
                      .filter((c) => visibleColumns.includes(c.id))
                      .map((c) => (
                        <SortableHeader
                          key={c.id}
                          label={c.label}
                          sortKey={c.id}
                          currentSortKey={financeSortConfig.key}
                          currentDirection={financeSortConfig.direction}
                          onSort={handleFinanceSort}
                        />
                      ))}
                    <th className="px-6 py-3 text-right sticky right-0 bg-[var(--bg-elevated)] shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.08)]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)] text-sm">
                  {paginatedData.map((item, idx) => {
                    // Use amountHT (HT) in priority, then TTC, then compute from items
                    const itemsTotal = ((item as Invoice | Quote).items || []).reduce(
                      (sum, line) => sum + line.quantity * line.price,
                      0
                    );
                    const total =
                      (item as Invoice | any).amountHT ||
                      (item as Invoice).amount ||
                      itemsTotal * (1 + ((item as Invoice | Quote).vatRate ?? 0) / 100);
                    return (
                      <tr key={item.id} className="density-row tr-hover/50 group">
                        <td className="px-4 py-4">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(item.id)}
                            onChange={() => toggleSelection(item.id)}
                            aria-label="Sélectionner l'élément"
                            className="rounded border-[var(--border)] text-[var(--primary)]"
                          />
                        </td>

                        {(mode === 'QUOTES' ? QUOTE_COLUMNS : INVOICE_COLUMNS)
                          .filter((c) => visibleColumns.includes(c.id))
                          .map((col) => {
                            if (col.id === 'number')
                              return (
                                <td
                                  key={col.id}
                                  className="px-6 py-4 font-mono text-[var(--primary)] dark:text-[var(--primary)] cursor-pointer"
                                  onClick={() => setSelectedItem(item)}
                                >
                                  {mode === 'INVOICES'
                                    ? (item as Invoice).number || (item as FinanceDoc).invoice_number || item.id
                                    : (item as FinanceDoc).number || (item as Quote).id}
                                </td>
                              );
                            if (col.id === 'resellerName')
                              return (
                                <td key={col.id} className="px-6 py-4 text-[var(--text-secondary)]">
                                  {(item as FinanceDoc).resellerName || '-'}
                                </td>
                              );
                            if (col.id === 'client') {
                              const clientName =
                                (item as FinanceDoc).clientName ||
                                tiers.find((t) => t.id === item.clientId)?.name ||
                                clients.find((c) => c.id === item.clientId)?.name ||
                                item.clientId ||
                                '-';
                              return (
                                <td key={col.id} className="px-6 py-4 font-semibold text-[var(--text-primary)]">
                                  {clientName}
                                </td>
                              );
                            }
                            if (col.id === 'invoiceType')
                              return (
                                <td key={col.id} className="px-6 py-4 text-[var(--text-secondary)]">
                                  {(item as FinanceDoc).invoiceType || 'FACTURE'}
                                </td>
                              );
                            if (col.id === 'date')
                              return (
                                <td key={col.id} className="px-6 py-4 text-[var(--text-secondary)]">
                                  {new Date(
                                    mode === 'INVOICES' ? (item as Invoice).date : (item as Quote).createdAt
                                  ).toLocaleDateString('fr-FR')}
                                </td>
                              );
                            if (col.id === 'validUntil')
                              return (
                                <td key={col.id} className="px-6 py-4 text-[var(--text-secondary)]">
                                  {(item as Quote).validUntil
                                    ? new Date((item as Quote).validUntil).toLocaleDateString('fr-FR')
                                    : '-'}
                                </td>
                              );
                            if (col.id === 'paymentTerms')
                              return (
                                <td key={col.id} className="px-6 py-4 text-[var(--text-secondary)]">
                                  {(item as FinanceDoc).paymentTerms || '-'}
                                </td>
                              );
                            if (col.id === 'installationDate')
                              return (
                                <td key={col.id} className="px-6 py-4 text-[var(--text-secondary)]">
                                  {(item as Invoice).installationDate
                                    ? new Date((item as Invoice).installationDate!).toLocaleDateString('fr-FR')
                                    : '-'}
                                </td>
                              );
                            if (col.id === 'contractId')
                              return (
                                <td key={col.id} className="px-6 py-4 text-[var(--text-secondary)] font-mono text-xs">
                                  {(item as FinanceDoc).contractNumber || (item as Invoice).contractId || '-'}
                                </td>
                              );
                            if (col.id === 'licensePlate')
                              return (
                                <td key={col.id} className="px-6 py-4 text-[var(--text-secondary)]">
                                  <span className="font-mono bg-[var(--bg-elevated)] px-2 py-1 rounded text-xs">
                                    {(item as Invoice).licensePlate || '-'}
                                  </span>
                                </td>
                              );
                            if (col.id === 'amount')
                              return (
                                <td
                                  key={col.id}
                                  className="px-6 py-4 font-mono text-[var(--text-primary)] font-semibold"
                                >
                                  {formatPrice(total)}
                                </td>
                              );
                            if (col.id === 'balance')
                              return (
                                <td key={col.id} className="px-6 py-4 font-mono text-[var(--text-secondary)]">
                                  {formatPrice(total - ((item as FinanceDoc).paidAmount || 0))}
                                </td>
                              );
                            if (col.id === 'category') {
                              const catLabels: Record<string, string> = {
                                STANDARD: 'Standard',
                                INSTALLATION: 'Installation',
                                ABONNEMENT: 'Abonnement',
                                AUTRES_VENTES: 'Autres ventes',
                              };
                              const cat = (item as FinanceDoc).category;
                              return (
                                <td key={col.id} className="px-6 py-4 text-[var(--text-secondary)]">
                                  {cat ? catLabels[cat] || cat : '-'}
                                </td>
                              );
                            }
                            if (col.id === 'status') {
                              const dueDate = new Date((item as FinanceDoc).dueDate);
                              const today = new Date();
                              const isOverdue = dueDate < today && item.status !== 'PAID';
                              const daysOverdue = isOverdue
                                ? Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
                                : 0;

                              return (
                                <td key={col.id} className="px-6 py-4">
                                  {getStatusBadge(item.status)}
                                  {isOverdue && (
                                    <div className="text-[10px] font-bold text-red-600 mt-1">{daysOverdue} jours</div>
                                  )}
                                </td>
                              );
                            }
                            return <td key={col.id}>-</td>;
                          })}

                        <td className="px-6 py-4 text-right sticky right-0 bg-[var(--bg-surface)] shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.08)] group-hover:bg-[var(--bg-elevated)] dark:group-hover:bg-slate-800/50">
                          <div className="flex items-center justify-end gap-1 relative whitespace-nowrap">
                            <button
                              onClick={() => handleEdit(item)}
                              className="p-2 text-[var(--text-secondary)] hover:text-[var(--primary)] hover:bg-[var(--primary-dim)] dark:hover:bg-[var(--primary-dim)] rounded-full"
                              title="Éditer"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            {mode === 'INVOICES' && item.status !== 'PAID' && (
                              <button
                                onClick={() => handleAction('pay', item)}
                                className="p-2 text-[var(--text-secondary)] hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-full"
                                title="Payer"
                              >
                                <DollarSign className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActionMenuId(actionMenuId === item.id ? null : item.id);
                              }}
                              className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] rounded-full"
                              title="Plus d'actions"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                            {actionMenuId === item.id && (
                              <>
                                <div className="fixed inset-0 z-40" onClick={() => setActionMenuId(null)} />
                                <div className="absolute right-0 top-full mt-1 w-52 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl shadow-xl z-50 py-1 text-left animate-in fade-in slide-in-from-top-1 duration-150">
                                  {mode === 'INVOICES' && item.status !== 'PAID' && (
                                    <button
                                      onClick={() => {
                                        openPaymentModal(item as Invoice);
                                        setActionMenuId(null);
                                      }}
                                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)]"
                                    >
                                      <DollarSign className="w-4 h-4 text-green-500" /> Enregistrer un paiement
                                    </button>
                                  )}
                                  {mode === 'INVOICES' && (
                                    <button
                                      onClick={() => {
                                        openPaymentHistoryModal(item as Invoice);
                                        setActionMenuId(null);
                                      }}
                                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)]"
                                    >
                                      <Receipt className="w-4 h-4 text-amber-500" /> Historique paiements
                                    </button>
                                  )}
                                  {mode === 'INVOICES' && item.status !== 'CANCELLED' && (
                                    <button
                                      onClick={() => {
                                        handleAction('credit_note', item);
                                        setActionMenuId(null);
                                      }}
                                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)]"
                                    >
                                      <XCircle className="w-4 h-4 text-orange-500" /> Générer un avoir
                                    </button>
                                  )}
                                  {mode === 'INVOICES' && (item as Invoice).category === 'INSTALLATION' && (
                                    <button
                                      onClick={() => {
                                        handleGenerateContract(item);
                                        setActionMenuId(null);
                                      }}
                                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)]"
                                    >
                                      <FileText className="w-4 h-4 text-indigo-500" /> Générer contrat
                                    </button>
                                  )}
                                  <button
                                    onClick={() => {
                                      handleAction('clone', item);
                                      setActionMenuId(null);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)]"
                                  >
                                    <Copy className="w-4 h-4 text-purple-500" /> Dupliquer
                                  </button>
                                  <button
                                    onClick={() => {
                                      handleAction('send', item);
                                      setActionMenuId(null);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)]"
                                  >
                                    <Mail className="w-4 h-4 text-[var(--text-secondary)]" /> Envoyer par email
                                  </button>
                                  {item.status !== 'CANCELLED' && item.status !== 'PAID' && (
                                    <button
                                      onClick={() => {
                                        handleAction('cancel', item);
                                        setActionMenuId(null);
                                      }}
                                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/30"
                                    >
                                      <XCircle className="w-4 h-4" /> Annuler
                                    </button>
                                  )}
                                  {mode === 'INVOICES' && (item.status === 'DRAFT' || item.status === 'SENT') && (
                                    <button
                                      onClick={() => {
                                        handleAction('mark_sent', item);
                                        setActionMenuId(null);
                                      }}
                                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--primary)] hover:bg-[var(--primary-dim)] dark:hover:bg-[var(--primary-dim)]"
                                    >
                                      <CheckCircle className="w-4 h-4" /> Marquer comme envoyée
                                    </button>
                                  )}
                                  {mode === 'QUOTES' && item.status === 'DRAFT' && (
                                    <button
                                      onClick={() => {
                                        handleAction('mark_sent', item);
                                        setActionMenuId(null);
                                      }}
                                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--primary)] hover:bg-[var(--primary-dim)] dark:hover:bg-[var(--primary-dim)]"
                                    >
                                      <CheckCircle className="w-4 h-4" /> Marquer comme envoyé
                                    </button>
                                  )}
                                  {mode === 'QUOTES' && item.status === 'SENT' && (
                                    <>
                                      <button
                                        onClick={() => {
                                          handleAction('accept', item);
                                          setActionMenuId(null);
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30"
                                      >
                                        <FileCheck className="w-4 h-4" /> Accepter le devis
                                      </button>
                                      <button
                                        onClick={() => {
                                          handleAction('reject', item);
                                          setActionMenuId(null);
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
                                      >
                                        <XCircle className="w-4 h-4" /> Refuser le devis
                                      </button>
                                    </>
                                  )}
                                  {mode === 'QUOTES' && (item.status === 'DRAFT' || item.status === 'SENT') && (
                                    <button
                                      onClick={() => {
                                        handleAction('convert_to_invoice', item);
                                        setActionMenuId(null);
                                      }}
                                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--primary)] hover:bg-[var(--primary-dim)] dark:hover:bg-[var(--primary-dim)]"
                                    >
                                      <FileCheck className="w-4 h-4" /> Convertir en facture
                                    </button>
                                  )}
                                  <div className="border-t border-[var(--border)] border-[var(--border)] my-1" />
                                  <button
                                    onClick={() => {
                                      handleAction('delete', item);
                                      setActionMenuId(null);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
                                  >
                                    <Trash2 className="w-4 h-4" /> Supprimer
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {paginatedData.length === 0 && (
                    <tr>
                      <td colSpan={20}>
                        {filter !== 'ALL' ||
                        resellerFilter !== 'ALL' ||
                        clientFilter !== 'ALL' ||
                        categoryFilter !== 'ALL' ||
                        !!searchTerm ? (
                          <EmptyState
                            icon={SearchX}
                            title="Aucun résultat"
                            description="Aucun document ne correspond aux filtres actifs."
                          />
                        ) : (
                          <EmptyState
                            icon={Receipt}
                            title={mode === 'INVOICES' ? 'Aucune facture' : 'Aucun devis'}
                            description={
                              mode === 'INVOICES'
                                ? "Aucune facture n'a encore été créée."
                                : "Aucun devis n'a encore été créé."
                            }
                          />
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Pagination Controls */}
              <Pagination
                currentPage={currentPage}
                totalPages={Math.ceil(filteredData.length / itemsPerPage)}
                onPageChange={setCurrentPage}
                totalItems={filteredData.length}
                itemLabel="élément"
                className="py-4 px-6 bg-[var(--bg-elevated)] border-t border-[var(--border)]"
              />
            </div>
          </Card>
        )}

        {/* PREVIEW MODAL */}
        <Modal
          isOpen={!!selectedItem}
          onClose={() => setSelectedItem(null)}
          title={`Aperçu ${mode === 'INVOICES' ? 'Facture' : 'Devis'} : ${(selectedItem as FinanceDoc)?.number || selectedItem?.id}`}
          maxWidth="max-w-6xl"
        >
          {selectedItem && (
            <DocumentPreview
              item={selectedItem}
              onEdit={() => handleEdit(selectedItem)}
              onAction={(action) => handleAction(action, selectedItem)}
            />
          )}
        </Modal>

        {/* FORM MODAL */}
        {isFormOpen && editingItem && (
          <Modal
            isOpen={isFormOpen}
            onClose={() => {
              setIsFormOpen(false);
              setIsFormDirty(false);
            }}
            title={editingItem.id ? 'Modifier le document' : 'Nouveau Document'}
            maxWidth="max-w-6xl"
            isDirty={isFormDirty}
          >
            <InvoiceForm
              initialData={editingItem}
              clients={clients}
              tiers={tiers}
              tenants={tenants}
              vehicles={vehicles}
              catalogItems={catalogItems}
              onSave={handleSave as unknown as (item: Invoice) => void}
              onCancel={() => {
                setIsFormOpen(false);
                setIsFormDirty(false);
              }}
              onDirtyChange={setIsFormDirty}
              mode={mode}
            />
          </Modal>
        )}

        {/* PAYMENT MODAL */}
        {isPaymentModalOpen && selectedItem && (
          <Modal
            isOpen={isPaymentModalOpen}
            onClose={() => setIsPaymentModalOpen(false)}
            title="Enregistrer un Paiement"
            maxWidth="max-w-2xl"
          >
            <div className="p-6">
              <form onSubmit={handlePaymentSubmit} className="space-y-6">
                {/* Payment Details Summary */}
                <div className="bg-[var(--bg-elevated)] p-4 rounded-lg grid grid-cols-2 gap-y-4 gap-x-8 text-sm border border-[var(--border)]">
                  <div>
                    <span className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-0.5">
                      N° Paiement
                    </span>
                    <span className="font-mono font-bold text-[var(--text-primary)]">{paymentForm.paymentNumber}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-0.5">
                      Client
                    </span>
                    <span className="font-medium text-[var(--text-primary)]">
                      {(selectedItem as FinanceDoc).clientName ||
                        tiers.find((t) => t.id === selectedItem.clientId)?.name ||
                        clients.find((c) => c.id === selectedItem.clientId)?.name ||
                        selectedItem.clientId}
                    </span>
                  </div>
                  {(selectedItem as Invoice).resellerName && (
                    <div>
                      <span className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-0.5">
                        Revendeur
                      </span>
                      <span className="font-medium text-[var(--text-primary)]">
                        {(selectedItem as Invoice).resellerName}
                      </span>
                    </div>
                  )}
                  {(selectedItem as Invoice).contractId && (
                    <div>
                      <span className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-0.5">
                        Contrat
                      </span>
                      <span className="font-medium font-mono text-[var(--text-primary)]">
                        {(selectedItem as FinanceDoc).contractNumber || (selectedItem as Invoice).contractId}
                      </span>
                    </div>
                  )}
                  {(selectedItem as Invoice).licensePlate && (
                    <div>
                      <span className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-0.5">
                        Plaque
                      </span>
                      <span className="font-medium text-[var(--text-primary)]">
                        {(selectedItem as Invoice).licensePlate}
                      </span>
                    </div>
                  )}
                  <div>
                    <span className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-0.5">
                      Facture Concernée
                    </span>
                    <span className="font-medium text-[var(--text-primary)]">{(selectedItem as Invoice).number}</span>
                  </div>
                </div>

                {/* Solde & Montants */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-3 bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] rounded-lg border border-[var(--border)] dark:border-[var(--primary)]">
                  <div className="text-center">
                    <span className="block text-[10px] font-bold text-[var(--primary)] uppercase">Montant Total</span>
                    <span className="font-bold text-[var(--primary)] dark:text-[var(--primary)]">
                      {formatPrice(selectedItem.amount || 0)}
                    </span>
                  </div>
                  <div className="text-center">
                    <span className="block text-[10px] font-bold text-green-600 uppercase">Déjà Payé</span>
                    <span className="font-bold text-green-600">{formatPrice(paymentHistory.totalPaid)}</span>
                  </div>
                  <div className="text-center">
                    <span className="block text-[10px] font-bold text-red-600 uppercase">Solde Restant</span>
                    <span className={`font-bold ${paymentHistory.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {formatPrice(paymentHistory.balance)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">
                      Montant
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                      <input
                        type="number"
                        className="w-full pl-10 pr-4 py-2 border border-[var(--border)] rounded-lg bg-[var(--bg-elevated)] text-[var(--text-primary)] font-mono font-bold"
                        value={paymentForm.amount}
                        onChange={(e) => setPaymentForm((prev) => ({ ...prev, amount: Number(e.target.value) }))}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">Date</label>
                    <input
                      type="date"
                      className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-elevated)] text-[var(--text-primary)]"
                      value={paymentForm.date}
                      onChange={(e) => setPaymentForm((prev) => ({ ...prev, date: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">
                      Mode de Paiement
                    </label>
                    <select
                      className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-elevated)] text-[var(--text-primary)]"
                      value={paymentForm.method}
                      onChange={(e) => setPaymentForm((prev) => ({ ...prev, method: e.target.value }))}
                    >
                      <option value="VIREMENT">Virement Bancaire</option>
                      <option value="CHEQUE">Chèque</option>
                      <option value="ESPECES">Espèces</option>
                      <option value="MOBILE_MONEY">Mobile Money</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">
                      Référence
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-elevated)] text-[var(--text-primary)]"
                      value={paymentForm.reference}
                      onChange={(e) => setPaymentForm((prev) => ({ ...prev, reference: e.target.value }))}
                      placeholder="N° Chèque, ID Transaction..."
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">
                    Preuve de Paiement (Optionnel)
                  </label>
                  <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-[var(--border)] border-dashed rounded-lg cursor-pointer bg-[var(--bg-elevated)] dark:hover:bg-bray-800 bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)] border-[var(--border)] hover:border-[var(--primary)] hover:bg-[var(--bg-elevated)]">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        {paymentForm.attachment ? (
                          <>
                            <FileCheck className="w-8 h-8 mb-3 text-green-500" />
                            <p className="mb-2 text-sm text-[var(--text-secondary)] font-semibold">
                              {paymentForm.attachment.name}
                            </p>
                            <p className="text-xs text-[var(--text-secondary)]">
                              {(paymentForm.attachment.size / 1024).toFixed(2)} KB
                            </p>
                          </>
                        ) : (
                          <>
                            <Upload className="w-8 h-8 mb-3 text-[var(--text-muted)]" />
                            <p className="mb-2 text-sm text-[var(--text-secondary)]">
                              <span className="font-semibold">Cliquez pour uploader</span> ou glissez-déposez
                            </p>
                            <p className="text-xs text-[var(--text-secondary)]">PDF, PNG, JPG (MAX. 5MB)</p>
                          </>
                        )}
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.png,.jpg,.jpeg"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setPaymentForm((prev) => ({ ...prev, attachment: e.target.files![0] }));
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">Notes</label>
                  <textarea
                    className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-elevated)] text-[var(--text-primary)] h-24 resize-none"
                    value={paymentForm.notes}
                    onChange={(e) => setPaymentForm((prev) => ({ ...prev, notes: e.target.value }))}
                    placeholder="Commentaire interne..."
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)] border-[var(--border)]">
                  <button
                    type="button"
                    onClick={() => setIsPaymentModalOpen(false)}
                    disabled={paymentSaving}
                    className="px-4 py-2 text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] rounded-lg font-bold disabled:opacity-50"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={paymentSaving || paymentForm.amount <= 0}
                    className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold shadow-lg shadow-green-500/30 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {paymentSaving ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" /> Enregistrement...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" /> Enregistrer le Paiement
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </Modal>
        )}

        {/* EMAIL SENDING MODAL */}
        {isEmailModalOpen && selectedItem && (
          <Modal
            isOpen={isEmailModalOpen}
            onClose={() => setIsEmailModalOpen(false)}
            title="Envoyer par Email"
            maxWidth="max-w-lg"
          >
            <div className="p-6 space-y-4">
              {/* Document Info */}
              <div className="bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] p-3 rounded-lg border border-[var(--border)] dark:border-[var(--primary)]">
                <p className="text-sm font-semibold text-[var(--primary)] dark:text-[var(--primary)]">
                  <Mail className="inline w-4 h-4 mr-2" />
                  Document: {(selectedItem as Invoice).number || selectedItem.id}
                </p>
                <p className="text-xs text-[var(--primary)] dark:text-[var(--primary)] mt-1">
                  Montant: {formatPrice(selectedItem.amount)}
                </p>
              </div>

              {/* Email Form */}
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">
                  Email du destinataire *
                </label>
                <input
                  type="email"
                  required
                  className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-elevated)] text-[var(--text-primary)]"
                  value={emailForm.recipientEmail}
                  onChange={(e) => setEmailForm((prev) => ({ ...prev, recipientEmail: e.target.value }))}
                  placeholder="email@exemple.com"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">Objet</label>
                <input
                  type="text"
                  className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-elevated)] text-[var(--text-primary)]"
                  value={emailForm.subject}
                  onChange={(e) => setEmailForm((prev) => ({ ...prev, subject: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">
                  Message personnalisé
                </label>
                <textarea
                  className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-elevated)] text-[var(--text-primary)] h-24 resize-none"
                  value={emailForm.message}
                  onChange={(e) => setEmailForm((prev) => ({ ...prev, message: e.target.value }))}
                  placeholder="Message qui sera inclus dans l'email..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)] border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setIsEmailModalOpen(false)}
                  disabled={emailSending}
                  className="px-4 py-2 text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] rounded-lg font-bold disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleSendEmail}
                  disabled={emailSending || !emailForm.recipientEmail}
                  className="px-6 py-2 bg-[var(--primary)] hover:bg-[var(--primary-light)] text-white rounded-lg font-bold shadow-lg shadow-blue-500/30 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {emailSending ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Envoi en cours...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4" /> Envoyer l'email
                    </>
                  )}
                </button>
              </div>
            </div>
          </Modal>
        )}

        {/* PAYMENT HISTORY MODAL */}
        {isPaymentHistoryOpen && selectedItem && (
          <Modal
            isOpen={isPaymentHistoryOpen}
            onClose={() => setIsPaymentHistoryOpen(false)}
            title="Historique des Paiements"
            maxWidth="max-w-3xl"
          >
            <div className="p-6">
              {/* Invoice Summary */}
              <div className="bg-[var(--bg-elevated)] p-4 rounded-lg mb-6 border border-[var(--border)]">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase">Facture</span>
                    <span className="font-mono font-bold text-[var(--text-primary)]">
                      {(selectedItem as Invoice).number}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase">
                      Montant Total
                    </span>
                    <span className="font-bold text-[var(--text-primary)]">
                      {formatPrice(selectedItem.amount || 0)}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase">
                      Total Payé
                    </span>
                    <span className="font-bold text-green-600">{formatPrice(paymentHistory.totalPaid)}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase">
                      Solde Restant
                    </span>
                    <span className={`font-bold ${paymentHistory.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {formatPrice(paymentHistory.balance)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment History List */}
              {paymentHistory.loading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="w-6 h-6 animate-spin text-[var(--primary)]" />
                  <span className="ml-2 text-[var(--text-secondary)]">Chargement...</span>
                </div>
              ) : (paymentHistory.payments || []).length === 0 ? (
                <div className="text-center py-12 text-[var(--text-secondary)]">
                  <Receipt className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>Aucun paiement enregistré pour cette facture</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {(paymentHistory.payments || []).map((payment, idx) => (
                    <div
                      key={payment.id || idx}
                      className="flex items-center justify-between p-4 bg-[var(--bg-surface)] rounded-lg border border-[var(--border)]"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center ${payment.type === 'credit_note' ? 'bg-purple-100 text-purple-600' : 'bg-green-100 text-green-600'}`}
                        >
                          {payment.type === 'credit_note' ? (
                            <FileText className="w-5 h-5" />
                          ) : (
                            <DollarSign className="w-5 h-5" />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-[var(--text-primary)]">
                            {payment.type === 'credit_note' ? 'Avoir appliqué' : 'Paiement'}
                          </p>
                          <p className="text-xs text-[var(--text-secondary)]">
                            {new Date(payment.date).toLocaleDateString('fr-FR')} • {payment.method || '-'}
                            {payment.reference && ` • Réf: ${payment.reference}`}
                          </p>
                          {payment.notes && <p className="text-xs text-[var(--text-muted)] mt-1">{payment.notes}</p>}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">{formatPrice(payment.amount)}</p>
                        {payment.createdBy && (
                          <p className="text-xs text-[var(--text-muted)]">Par: {payment.createdBy}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-between items-center pt-4 mt-4 border-t border-[var(--border)] border-[var(--border)]">
                <button
                  onClick={() => setIsPaymentHistoryOpen(false)}
                  className="px-4 py-2 text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] rounded-lg font-bold"
                >
                  Fermer
                </button>
                {paymentHistory.balance > 0 && (
                  <button
                    onClick={() => {
                      setIsPaymentHistoryOpen(false);
                      openPaymentModal(selectedItem as Invoice);
                    }}
                    className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold flex items-center gap-2"
                  >
                    <DollarSign className="w-4 h-4" /> Enregistrer un paiement
                  </button>
                )}
              </div>
            </div>
          </Modal>
        )}

        {/* IMPORT MODAL */}
        {isImportModalOpen && (
          <Modal
            isOpen={isImportModalOpen}
            onClose={() => setIsImportModalOpen(false)}
            title="Importer depuis l'Intervention"
            maxWidth="max-w-2xl"
          >
            <div className="p-4">
              <p className="text-sm text-[var(--text-secondary)] mb-4">
                Sélectionnez une intervention pour créer une facture.
              </p>
              <div className="max-h-60 overflow-auto mb-4">
                {(interventions || [])
                  .filter(
                    (i) =>
                      (i.clientId || '').toLowerCase().includes(searchTerm.toLowerCase()) && i.status === 'COMPLETED'
                  )
                  .map((intervention) => (
                    <div
                      key={intervention.id}
                      className="flex justify-between items-center p-3 rounded-lg bg-[var(--bg-elevated)] mb-2 cursor-pointer hover:bg-[var(--bg-elevated)]"
                      onClick={() => handleImportIntervention(intervention)}
                    >
                      <div>
                        <p className="font-semibold text-[var(--text-primary)]">
                          {intervention.type} - {intervention.nature}
                        </p>
                        <p className="text-xs text-[var(--text-secondary)]">Client: {intervention.clientId}</p>
                        <p className="text-xs text-[var(--text-secondary)]">
                          Date: {new Date(intervention.scheduledDate).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-[var(--text-primary)]">
                          {formatPrice(intervention.cost || 0)}
                        </p>
                        <p className="text-xs text-[var(--text-secondary)]">
                          {intervention.licensePlate || intervention.vehicleId}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2 text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] rounded-lg"
                >
                  Annuler
                </button>
              </div>
            </div>
          </Modal>
        )}

        {/* CONTRACT FORM MODAL */}
        {isContractModalOpen && (
          <Modal
            isOpen={isContractModalOpen}
            onClose={() => setIsContractModalOpen(false)}
            title="Générer un Contrat"
            maxWidth="max-w-4xl"
          >
            <ContractForm
              initialData={contractInitialData || {}}
              onSubmit={handleContractSubmit}
              onCancel={() => setIsContractModalOpen(false)}
            />
          </Modal>
        )}

        {/* CONTRACT CHOICE MODAL */}
        {isContractChoiceModalOpen && (
          <Modal
            isOpen={isContractChoiceModalOpen}
            onClose={() => setIsContractChoiceModalOpen(false)}
            title="Génération de Contrat"
            maxWidth="max-w-md"
          >
            <div className="p-6 space-y-4">
              <p className="text-[var(--text-secondary)]">
                Souhaitez-vous créer un nouveau contrat ou ajouter ces éléments à un contrat existant ?
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => handleContractChoice('NEW')}
                  className="w-full p-4 border border-[var(--border)] rounded-lg hover:bg-[var(--primary-dim)] dark:hover:bg-[var(--primary-dim)] flex items-center gap-3 transition-colors"
                >
                  <div className="p-2 bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] rounded-full text-[var(--primary)] dark:text-[var(--primary)]">
                    <Plus className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <span className="block font-bold text-[var(--text-primary)]">Nouveau Contrat</span>
                    <span className="text-xs text-[var(--text-secondary)]">
                      Créer un nouveau contrat pour ce client
                    </span>
                  </div>
                </button>

                <button
                  onClick={() => handleContractChoice('EXISTING')}
                  className="w-full p-4 border border-[var(--border)] rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 flex items-center gap-3 transition-colors"
                >
                  <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-full text-purple-600 dark:text-purple-400">
                    <RefreshCw className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <span className="block font-bold text-[var(--text-primary)]">Mettre à jour existant</span>
                    <span className="text-xs text-[var(--text-secondary)]">
                      Ajouter les véhicules à un contrat actif
                    </span>
                  </div>
                </button>
              </div>
            </div>
          </Modal>
        )}

        {/* MODAL LIAISON FACTURE → CONTRAT */}
        {isContractLinkModalOpen && contractLinkData.invoice && (
          <Modal
            isOpen={isContractLinkModalOpen}
            onClose={() => setIsContractLinkModalOpen(false)}
            title="🔗 Lier Facture à un Contrat Existant"
            maxWidth="max-w-2xl"
          >
            <div className="p-6 space-y-4">
              {/* Info Facture */}
              <div className="bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] p-4 rounded-lg border border-[var(--border)] dark:border-[var(--primary)]">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-bold text-[var(--primary)] dark:text-[var(--primary)]">
                      Facture: {contractLinkData.invoice.number}
                    </p>
                    <p className="text-xs text-[var(--primary)] dark:text-[var(--primary)] mt-1">
                      Véhicule:{' '}
                      <span className="font-mono font-bold">
                        {contractLinkData.invoice.licensePlate || 'Non spécifié'}
                      </span>
                    </p>
                  </div>
                  <span className="text-lg font-bold text-[var(--primary)] dark:text-[var(--primary)]">
                    {formatPrice(contractLinkData.invoice.amount)}
                  </span>
                </div>
              </div>

              <p className="text-sm text-[var(--text-secondary)]">
                {contractLinkData.matchingContracts.length} contrat(s) actif(s) trouvé(s) pour ce client. Sélectionnez
                celui auquel ajouter le véhicule :
              </p>

              {/* Liste des contrats */}
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {contractLinkData.matchingContracts.map((contract: ContractOption) => (
                  <label
                    key={contract.id}
                    className={`flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-all ${
                      contractLinkData.selectedContractId === contract.id
                        ? 'border-[var(--primary)] bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] ring-2 ring-[var(--primary)]'
                        : 'border-[var(--border)] tr-hover'
                    }`}
                  >
                    <input
                      type="radio"
                      name="contract"
                      value={contract.id}
                      checked={contractLinkData.selectedContractId === contract.id}
                      onChange={() => setContractLinkData({ ...contractLinkData, selectedContractId: contract.id })}
                      className="w-4 h-4 text-[var(--primary)]"
                    />
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-[var(--text-primary)]">{contract.id}</p>
                          <p className="text-xs text-[var(--text-secondary)]">{contract.clientName}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-[var(--text-primary)]">{formatPrice(contract.monthlyFee)}</p>
                          <p className="text-xs text-[var(--text-secondary)]">
                            {contract.vehicleCount || 0} véhicule(s)
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-xs text-[var(--text-secondary)]">
                        <span>📅 {new Date(contract.startDate).toLocaleDateString('fr-FR')}</span>
                        <span>🔄 {contract.billingCycle}</span>
                        {contract.vehicleIds && contract.vehicleIds.length > 0 && (
                          <span>
                            🚗 {contract.vehicleIds.slice(0, 3).join(', ')}
                            {contract.vehicleIds.length > 3 ? '...' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  </label>
                ))}
              </div>

              {/* Aperçu du nouveau contrat */}
              {contractLinkData.selectedContractId &&
                (() => {
                  const selectedContract = contractLinkData.matchingContracts.find(
                    (c: ContractOption) => c.id === contractLinkData.selectedContractId
                  );
                  if (!selectedContract) return null;
                  const newVehicleCount = (selectedContract.vehicleCount || 0) + 1;
                  const unitPrice = selectedContract.monthlyFee / (selectedContract.vehicleCount || 1);
                  const newMonthlyFee = unitPrice * newVehicleCount;

                  return (
                    <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                      <p className="text-sm font-bold text-green-800 dark:text-green-300 mb-2">
                        📊 Après modification :
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-xs text-green-600">Véhicules</p>
                          <p className="font-bold text-green-800 dark:text-green-300">
                            {selectedContract.vehicleCount || 0} → {newVehicleCount}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-green-600">Prix unitaire</p>
                          <p className="font-bold text-green-800 dark:text-green-300">
                            {formatPrice(unitPrice)}/véhicule
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-green-600">Nouveau mensuel</p>
                          <p className="font-bold text-green-800 dark:text-green-300">{formatPrice(newMonthlyFee)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })()}

              <div className="flex justify-between gap-3 pt-4 border-t border-[var(--border)]">
                <button
                  onClick={() => {
                    setIsContractLinkModalOpen(false);
                    // Proposer de créer un nouveau contrat
                    const invoiceStartDate =
                      safeToDateString(contractLinkData.invoice?.date) || new Date().toISOString().split('T')[0];
                    setContractInitialData({
                      clientId: contractLinkData.invoice?.clientId,
                      startDate: invoiceStartDate,
                      monthlyFee: contractLinkData.invoice?.amount,
                      vehicleCount: 1,
                    });
                    setIsContractModalOpen(true);
                  }}
                  className="px-4 py-2 text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] rounded-lg text-sm"
                >
                  Créer nouveau contrat
                </button>
                <button
                  onClick={handleAddVehicleToContract}
                  disabled={!contractLinkData.selectedContractId}
                  className="px-4 py-2 bg-[var(--primary)] text-white hover:bg-[var(--primary-light)] disabled:bg-[var(--border)] rounded-lg font-bold text-sm flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" /> Ajouter au contrat
                </button>
              </div>
            </div>
          </Modal>
        )}

        {/* CREDIT NOTE (AVOIR) MODAL */}
        {isCreditNoteModalOpen && creditNoteForm.invoice && (
          <Modal
            isOpen={isCreditNoteModalOpen}
            onClose={() => setIsCreditNoteModalOpen(false)}
            title="Générer un Avoir"
            maxWidth="max-w-lg"
          >
            <div className="p-6 space-y-5">
              {/* Invoice Reference */}
              <div className="bg-[var(--bg-elevated)] p-4 rounded-lg border border-[var(--border)]">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase">
                      Facture d'origine
                    </span>
                    <span className="font-mono font-bold text-[var(--text-primary)]">
                      {creditNoteForm.invoice.number}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase">
                      Montant Facture
                    </span>
                    <span className="font-bold text-[var(--text-primary)]">
                      {formatPrice(creditNoteForm.invoice.amount)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Credit Note Type */}
              <div>
                <label className="block text-sm font-bold text-[var(--text-secondary)] mb-2">Type d'avoir</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'PARTIAL', label: 'Partiel', desc: 'Remboursement partiel' },
                    { id: 'FULL', label: 'Total', desc: 'Annulation complète' },
                    { id: 'COMMERCIAL', label: 'Commercial', desc: 'Geste commercial' },
                  ].map((type) => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => {
                        setCreditNoteForm((prev) => ({
                          ...prev,
                          type: type.id as 'FULL' | 'PARTIAL' | 'COMMERCIAL',
                          amount: type.id === 'FULL' ? creditNoteForm.invoice!.amount : prev.amount,
                        }));
                      }}
                      className={`p-3 rounded-lg border-2 transition-all text-center ${
                        creditNoteForm.type === type.id
                          ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                          : 'border-[var(--border)] hover:border-orange-300'
                      }`}
                    >
                      <span className="block font-bold text-sm text-[var(--text-primary)]">{type.label}</span>
                      <span className="text-[10px] text-[var(--text-secondary)]">{type.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-bold text-[var(--text-secondary)] mb-2">Montant de l'avoir</label>
                <div className="relative">
                  <input
                    type="number"
                    title="Montant de l'avoir"
                    className="w-full p-3 border border-[var(--border)] rounded-lg bg-[var(--bg-elevated)] text-[var(--text-primary)] font-mono text-lg"
                    value={creditNoteForm.amount}
                    onChange={(e) =>
                      setCreditNoteForm((prev) => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))
                    }
                    max={creditNoteForm.invoice.amount}
                    disabled={creditNoteForm.type === 'FULL'}
                  />
                </div>
                {creditNoteForm.type !== 'FULL' && (
                  <p className="text-xs text-[var(--text-secondary)] mt-1">
                    Maximum: {formatPrice(creditNoteForm.invoice.amount)}
                  </p>
                )}
              </div>

              {/* Reason */}
              <div>
                <label className="block text-sm font-bold text-[var(--text-secondary)] mb-2">
                  Motif de l'avoir <span className="text-red-500">*</span>
                </label>
                <select
                  title="Motif de l'avoir"
                  className="w-full p-3 border border-[var(--border)] rounded-lg bg-[var(--bg-elevated)] text-[var(--text-primary)]"
                  value={creditNoteForm.reason}
                  onChange={(e) => setCreditNoteForm((prev) => ({ ...prev, reason: e.target.value }))}
                >
                  <option value="">-- Sélectionner un motif --</option>
                  <option value="Erreur de facturation">Erreur de facturation</option>
                  <option value="Retour produit/service">Retour produit/service</option>
                  <option value="Résiliation contrat">Résiliation contrat</option>
                  <option value="Geste commercial">Geste commercial</option>
                  <option value="Double facturation">Double facturation</option>
                  <option value="Prestation non réalisée">Prestation non réalisée</option>
                  <option value="Rabais exceptionnel">Rabais exceptionnel</option>
                  <option value="Autre">Autre</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-bold text-[var(--text-secondary)] mb-2">
                  Notes complémentaires
                </label>
                <textarea
                  className="w-full p-3 border border-[var(--border)] rounded-lg bg-[var(--bg-elevated)] text-[var(--text-primary)] h-20 resize-none"
                  value={creditNoteForm.notes}
                  onChange={(e) => setCreditNoteForm((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="Détails supplémentaires sur l'avoir..."
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)] border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setIsCreditNoteModalOpen(false)}
                  disabled={creditNoteCreating}
                  className="px-4 py-2 text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] rounded-lg font-bold disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleCreateCreditNote}
                  disabled={creditNoteCreating || !creditNoteForm.reason || creditNoteForm.amount <= 0}
                  className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-bold shadow-lg shadow-orange-500/30 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creditNoteCreating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Création...
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4" /> Créer l'avoir
                    </>
                  )}
                </button>
              </div>
            </div>
          </Modal>
        )}
      </div>
      <ConfirmDialogComponent />
    </>
  );
};

// --- SUB-COMPONENTS imported from partials ---
// DocumentPreview is imported from './partials/DocumentPreview'
