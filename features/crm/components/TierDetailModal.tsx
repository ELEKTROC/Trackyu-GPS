import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  FileText,
  DollarSign,
  Briefcase,
  CheckCircle,
  Plus,
  Calendar,
  Building2,
  Mail,
  Phone,
  X,
  Truck,
  Loader2,
  Search,
  LayoutGrid,
  Tag,
  ChevronLeft,
  ChevronRight,
  Edit2,
  MapPin,
  CreditCard,
  MessageSquare,
  FileSpreadsheet,
  Send,
  Clock,
  AlertCircle,
  Globe2,
  Languages,
  Briefcase as BriefcaseIcon,
  Bookmark,
  AlertTriangle,
  BarChart3,
  Receipt,
  FileCheck,
  Wrench,
  LifeBuoy,
  Book,
  Download,
  Trash2,
  Settings,
  Car,
  Eye,
  WifiOff,
  Activity,
  CircleDot,
  RefreshCw,
  History,
  PhoneIncoming,
  StickyNote,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TierType, VehicleStatus } from '../../../types';
import type { Invoice, Quote, Contract, Payment, Tier, Vehicle } from '../../../types';
import type { Intervention } from '../../../types';
import type { Ticket } from '../../../types';
import type { AuditLog } from '../../../types';
import { useToast } from '../../../contexts/ToastContext';
import { TOAST } from '../../../constants/toastMessages';
import { mapError } from '../../../utils/errorMapper';
import { useCurrency } from '../../../hooks/useCurrency';
import { useConfirmDialog } from '../../../components/ConfirmDialog';
import { useDataContext } from '../../../contexts/DataContext';
import { TierList } from './TierList';
import { logger } from '../../../utils/logger';
import { api } from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';
import type { TierQuickAction } from './TierList';

const TRANSACTION_SUBTABS = [
  { id: 'INVOICES', label: 'Factures', icon: Receipt },
  { id: 'PAYMENTS', label: 'Paiements', icon: CreditCard },
  { id: 'QUOTES', label: 'Devis', icon: FileText },
  { id: 'CONTRACTS', label: 'Contrats', icon: FileCheck },
  { id: 'INTERVENTIONS', label: 'Interventions', icon: Wrench },
  { id: 'TICKETS', label: 'Tickets', icon: LifeBuoy },
  { id: 'JOURNALS', label: 'Journaux', icon: Book },
];

interface TierDetailModalProps {
  tier: Tier | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (tier: Tier) => void;
  onQuickAction?: (tier: Tier, action: TierQuickAction) => void;
}

export const TierDetailModal: React.FC<TierDetailModalProps> = ({ tier, isOpen, onClose, onEdit, onQuickAction }) => {
  const { showToast } = useToast();
  const { formatPrice, currency } = useCurrency();
  const { invoices, quotes, contracts, interventions, tickets, deleteTier, updateTier, payments, vehicles } =
    useDataContext();
  const { confirm, ConfirmDialogComponent } = useConfirmDialog();
  const { user } = useAuth();

  const [activeDetailTab, setActiveDetailTab] = useState('OVERVIEW');
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [trxData, setTrxData] = useState<Record<string, unknown[]>>({});
  const [activeTrxSubTab, setActiveTrxSubTab] = useState('INVOICES');
  const [trxPage, setTrxPage] = useState(1);
  const [trxSearchTerm, setTrxSearchTerm] = useState('');
  const [comments, setComments] = useState<
    { id: string; date: string; author: string; text: string; type: 'note' | 'appel' | 'email' | 'sms' | 'système' }[]
  >([]);
  const [newComment, setNewComment] = useState('');
  const [commentType, setCommentType] = useState<'note' | 'appel'>('note');
  const [chartPeriod, setChartPeriod] = useState('THIS_YEAR');
  // Add contact form
  const [showAddContactForm, setShowAddContactForm] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactRole, setNewContactRole] = useState('');
  const [isSavingContact, setIsSavingContact] = useState(false);

  // Status change modal
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState<string>('');
  const [statusMotif, setStatusMotif] = useState('');
  const [isStatusUpdating, setIsStatusUpdating] = useState(false);

  // Initialize data when tier ID changes
  useEffect(() => {
    if (isOpen && tier) {
      setActiveDetailTab('OVERVIEW');
      // Filter real data from context - match by ID or by name for legacy compatibility
      const tierInvoices = invoices.filter((i) => i.clientId === tier.id || i.clientId === tier.name);
      const tierQuotes = quotes.filter((q) => q.clientId === tier.id || q.clientId === tier.name);
      const tierContracts = contracts.filter((c) => c.clientId === tier.id);
      const tierInterventions = interventions.filter((i) => i.clientId === tier.id);
      const tierTickets = tickets.filter((t) => t.clientId === tier.id);
      // Payments: filter from invoices that are paid or use payments context if available
      const tierPayments = (payments || []).filter((p: Payment) => p.clientId === tier.id || p.tierId === tier.id);

      setTrxData({
        INVOICES: tierInvoices,
        PAYMENTS:
          tierPayments.length > 0
            ? tierPayments
            : tierInvoices
                .filter((i: Invoice) => i.status === 'PAID' || i.status === 'PAYÉ')
                .map((i: Invoice) => ({
                  id: `PMT-${i.id}`,
                  date: i.paidDate || i.date,
                  method: 'Virement',
                  amount: i.amount,
                  ref: i.id,
                })),
        QUOTES: tierQuotes,
        CONTRACTS: tierContracts,
        INTERVENTIONS: tierInterventions,
        TICKETS: tierTickets,
        JOURNALS: [], // Journals comptables à implémenter ultérieurement
      });
      setComments([]);
    }
  }, [tier?.id, isOpen, invoices, quotes, contracts, interventions, tickets, payments]);

  // Fetch audit logs when History tab is active
  const fetchAuditLogs = useCallback(async () => {
    if (!tier?.id) return;
    setAuditLoading(true);
    try {
      const logs = await api.auditLogs.list({ entityId: tier.id, limit: '100' });
      setAuditLogs(Array.isArray(logs) ? logs : []);
    } catch (error) {
      logger.error('Failed to fetch audit logs for tier:', error);
      setAuditLogs([]);
    } finally {
      setAuditLoading(false);
    }
  }, [tier?.id]);

  useEffect(() => {
    if (isOpen && activeDetailTab === 'HISTORY' && tier?.id) {
      fetchAuditLogs();
    }
  }, [isOpen, activeDetailTab, tier?.id, fetchAuditLogs]);

  // Quick action handler inside modal
  const handleQuickAction = (action: TierQuickAction) => {
    if (!tier) return;
    if (onQuickAction) {
      onQuickAction(tier, action);
    } else {
      showToast(TOAST.CRM.FEATURE_COMING_SOON(action), 'info');
    }
  };

  // Reset pagination on subtab change
  useEffect(() => {
    setTrxPage(1);
    setTrxSearchTerm('');
  }, [activeTrxSubTab]);

  const handleSendComment = () => {
    if (!newComment.trim()) return;
    const comment = {
      id: `COM-${Date.now()}`,
      date: new Date().toLocaleString('fr-FR'),
      author: 'Vous',
      text: newComment,
      type: commentType as 'note' | 'appel' | 'email' | 'sms' | 'système',
    };
    setComments([comment, ...comments]);
    setNewComment('');
    showToast(TOAST.CRM.COMMENT_ADDED(commentType as 'appel' | 'commentaire'), 'success');
  };

  const handleAddContact = () => {
    setNewContactName('');
    setNewContactRole('');
    setShowAddContactForm(true);
  };

  const handleSaveContact = async () => {
    if (!tier || !newContactName.trim()) return;
    setIsSavingContact(true);
    try {
      await updateTier({ ...tier, secondContactName: newContactName.trim() });
      showToast('Contact ajouté avec succès', 'success');
      setShowAddContactForm(false);
    } catch (error) {
      logger.error('Erreur ajout contact:', error);
      showToast(mapError(error, 'contact'), 'error');
    } finally {
      setIsSavingContact(false);
    }
  };

  const handleStatusChange = async () => {
    if (!tier || !newStatus || !statusMotif.trim()) {
      showToast(TOAST.CRM.STATUS_CHANGE_REASON_REQUIRED, 'error');
      return;
    }
    setIsStatusUpdating(true);
    try {
      await updateTier({ ...tier, status: newStatus as Tier['status'] });
      showToast(
        TOAST.FINANCE.STATUS_CHANGED(
          newStatus === 'ACTIVE' ? 'Actif' : newStatus === 'INACTIVE' ? 'Inactif' : 'Suspendu'
        ),
        'success'
      );
      setShowStatusModal(false);
      setStatusMotif('');
      setNewStatus('');
    } catch (error) {
      logger.error('Erreur changement statut:', error);
      showToast(mapError(error, 'statut'), 'error');
    } finally {
      setIsStatusUpdating(false);
    }
  };

  const handleDownloadTemplate = () => {
    showToast(TOAST.IO.TEMPLATE_DOWNLOADED, 'info');
  };

  // --- Invoice helpers ---
  const formatDate = (dateStr: string | undefined | null) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const getInvoiceStatusLabel = (status: string): string => {
    const map: Record<string, string> = {
      DRAFT: 'Brouillon',
      SENT: 'Envoyée',
      PAID: 'Payée',
      PAYÉ: 'Payée',
      PARTIALLY_PAID: 'Partiel',
      PARTIAL: 'Partiel',
      OVERDUE: 'En retard',
      RETARD: 'En retard',
      CANCELLED: 'Annulée',
      PENDING: 'En attente',
    };
    return map[status?.toUpperCase()] || status;
  };

  const getInvoiceStatusStyle = (status: string): string => {
    switch (status?.toUpperCase()) {
      case 'PAID':
      case 'PAYÉ':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800';
      case 'SENT':
        return 'bg-[var(--primary-dim)] text-[var(--primary)] border-[var(--border)]';
      case 'DRAFT':
        return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
      case 'PARTIALLY_PAID':
      case 'PARTIAL':
        return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800';
      case 'OVERDUE':
      case 'RETARD':
        return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800';
      case 'CANCELLED':
        return 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700 line-through';
      default:
        return 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800';
    }
  };

  // Auto-detect overdue: if dueDate < today and status not PAID/CANCELLED, treat as OVERDUE
  const getEffectiveStatus = (inv: Invoice): string => {
    const s = (inv.status || 'DRAFT').toUpperCase();
    if (['PAID', 'PAYÉ', 'CANCELLED'].includes(s)) return s;
    if (inv.dueDate) {
      try {
        const due = new Date(inv.dueDate);
        if (!isNaN(due.getTime()) && due < new Date()) return 'OVERDUE';
      } catch {
        /* ignore */
      }
    }
    return s;
  };

  const renderTransactionsTab = () => {
    const currentData = trxData[activeTrxSubTab] || [];
    const filteredData = currentData;

    const ITEMS_PER_PAGE_TRX = 8;
    const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE_TRX);
    const paginatedData = filteredData.slice((trxPage - 1) * ITEMS_PER_PAGE_TRX, trxPage * ITEMS_PER_PAGE_TRX);

    const renderTableContent = () => {
      switch (activeTrxSubTab) {
        case 'INVOICES': {
          // Compute summary from ALL invoices (not just paginated)
          const allInvoices = filteredData as Invoice[];
          const totalHT = allInvoices.reduce((sum: number, inv: Invoice) => sum + Number(inv.amountHT || 0), 0);
          const totalTTC = allInvoices.reduce((sum: number, inv: Invoice) => sum + Number(inv.amount || 0), 0);
          const totalPaid = allInvoices.reduce((sum: number, inv: Invoice) => sum + Number(inv.paidAmount || 0), 0);
          const totalBalance = totalTTC - totalPaid;
          const overdueCount = allInvoices.filter((inv: Invoice) => getEffectiveStatus(inv) === 'OVERDUE').length;

          return (
            <>
              {/* SUMMARY CARDS */}
              <thead>
                <tr>
                  <th colSpan={7} className="p-0">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-gradient-to-r from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 border-b border-slate-200 dark:border-slate-700">
                      <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-100 dark:border-slate-700 shadow-sm">
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Total HT</p>
                        <p className="text-lg font-bold text-slate-800 dark:text-white">{formatPrice(totalHT)}</p>
                      </div>
                      <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-100 dark:border-slate-700 shadow-sm">
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Total TTC</p>
                        <p className="text-lg font-bold text-slate-800 dark:text-white">{formatPrice(totalTTC)}</p>
                      </div>
                      <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-emerald-100 dark:border-emerald-800 shadow-sm">
                        <p className="text-[10px] font-bold text-emerald-500 uppercase mb-1">Payé</p>
                        <p className="text-lg font-bold text-emerald-600">{formatPrice(totalPaid)}</p>
                      </div>
                      <div
                        className={`bg-white dark:bg-slate-800 p-3 rounded-lg border shadow-sm ${totalBalance > 0 ? 'border-red-100 dark:border-red-800' : 'border-slate-100 dark:border-slate-700'}`}
                      >
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1">
                          Solde restant{' '}
                          {overdueCount > 0 && <span className="text-red-500">({overdueCount} en retard)</span>}
                        </p>
                        <p
                          className={`text-lg font-bold ${totalBalance > 0 ? 'text-red-600' : 'text-slate-800 dark:text-white'}`}
                        >
                          {formatPrice(totalBalance)}
                        </p>
                      </div>
                    </div>
                  </th>
                </tr>
                <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-xs text-slate-500 uppercase">
                  <th className="py-3 px-4">N° Facture</th>
                  <th className="py-3 px-4">Objet</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Échéance</th>
                  <th className="py-3 px-4 text-right">Montant HT</th>
                  <th className="py-3 px-4 text-right">TTC</th>
                  <th className="py-3 px-4 text-center">Statut</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedData.map((inv: Invoice) => {
                  const effectiveStatus = getEffectiveStatus(inv);
                  const balance = Number(inv.amount || 0) - Number(inv.paidAmount || 0);
                  const isOverdue = effectiveStatus === 'OVERDUE';
                  return (
                    <tr
                      key={inv.id}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${isOverdue ? 'bg-red-50/30 dark:bg-red-900/10' : ''}`}
                    >
                      <td className="py-3 px-4 font-mono text-[var(--primary)] font-medium text-xs">
                        {inv.number || inv.id?.substring(0, 10)}
                      </td>
                      <td
                        className="py-3 px-4 max-w-[180px] truncate text-slate-600 dark:text-slate-300"
                        title={inv.subject || ''}
                      >
                        {inv.subject || '-'}
                      </td>
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">{formatDate(inv.date)}</td>
                      <td
                        className={`py-3 px-4 whitespace-nowrap ${isOverdue ? 'text-red-600 font-bold' : 'text-slate-500'}`}
                      >
                        {formatDate(inv.dueDate)}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {formatPrice(Number(inv.amountHT || 0))}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-800 dark:text-white whitespace-nowrap">
                        {formatPrice(Number(inv.amount || 0))}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold border ${getInvoiceStatusStyle(effectiveStatus)}`}
                        >
                          {isOverdue && <AlertCircle className="w-3 h-3" />}
                          {getInvoiceStatusLabel(effectiveStatus)}
                        </span>
                        {effectiveStatus === 'PARTIALLY_PAID' && balance > 0 && (
                          <p className="text-[9px] text-amber-600 mt-0.5">Reste {formatPrice(balance)}</p>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </>
          );
        }
        case 'PAYMENTS':
          return (
            <>
              <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-xs text-slate-500 uppercase">
                <tr>
                  <th>Réf</th>
                  <th>Date</th>
                  <th>Méthode</th>
                  <th className="text-right">Montant</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedData.map((p: Payment) => (
                  <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="py-3 px-4 font-mono text-slate-600">{p.ref}</td>
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">{formatDate(p.date)}</td>
                    <td className="py-3 px-4">{p.method}</td>
                    <td className="py-3 px-4 text-right font-bold text-green-600">+{formatPrice(Number(p.amount))}</td>
                  </tr>
                ))}
              </tbody>
            </>
          );
        case 'QUOTES':
          return (
            <>
              <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-xs text-slate-500 uppercase">
                <tr>
                  <th className="py-3 px-4">Numéro</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4 text-right">Montant</th>
                  <th className="py-3 px-4 text-right">Statut</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedData.map((q: Quote) => {
                  const qStatusMap: Record<string, string> = {
                    DRAFT: 'Brouillon',
                    SENT: 'Envoyé',
                    ACCEPTED: 'Accepté',
                    REJECTED: 'Rejeté',
                    EXPIRED: 'Expiré',
                    CANCELLED: 'Annulé',
                  };
                  return (
                    <tr key={q.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="py-3 px-4 font-mono text-[var(--primary)]">{q.number || q.id}</td>
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">{formatDate(q.date)}</td>
                      <td className="py-3 px-4">{q.clientName || '-'}</td>
                      <td className="py-3 px-4 text-right font-bold">{formatPrice(Number(q.amount || 0))}</td>
                      <td className="py-3 px-4 text-right">
                        <span
                          className={`px-2 py-1 rounded text-[10px] font-bold border ${q.status === 'ACCEPTED' ? 'bg-green-100 text-green-700 border-green-200' : q.status === 'SENT' ? 'bg-[var(--primary-dim)] text-[var(--primary)] border-[var(--border)]' : q.status === 'REJECTED' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-orange-100 text-orange-700 border-orange-200'}`}
                        >
                          {qStatusMap[q.status?.toUpperCase()] || q.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </>
          );
        case 'CONTRACTS':
          return (
            <>
              <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-xs text-slate-500 uppercase">
                <tr>
                  <th className="py-3 px-4">N° Contrat</th>
                  <th className="py-3 px-4">Début</th>
                  <th className="py-3 px-4">Fin</th>
                  <th className="py-3 px-4">Cycle</th>
                  <th className="py-3 px-4 text-right">Mensualité</th>
                  <th className="py-3 px-4 text-right">Statut</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedData.map((c: Contract) => {
                  const cStatusMap: Record<string, string> = {
                    ACTIVE: 'Actif',
                    EXPIRED: 'Expiré',
                    CANCELLED: 'Annulé',
                    DRAFT: 'Brouillon',
                    SUSPENDED: 'Suspendu',
                  };
                  const billingMap: Record<string, string> = {
                    MONTHLY: 'Mensuel',
                    QUARTERLY: 'Trimestriel',
                    YEARLY: 'Annuel',
                    BIANNUAL: 'Semestriel',
                  };
                  return (
                    <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="py-3 px-4 font-mono text-[var(--primary)]">{c.id?.substring(0, 8) || '-'}</td>
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">{formatDate(c.startDate)}</td>
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">{formatDate(c.endDate)}</td>
                      <td className="py-3 px-4">
                        {billingMap[c.billingCycle?.toUpperCase()] || c.billingCycle || '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-bold">{formatPrice(Number(c.monthlyFee || 0))}</td>
                      <td className="py-3 px-4 text-right">
                        <span
                          className={`px-2 py-1 rounded text-[10px] font-bold border ${c.status === 'ACTIVE' ? 'bg-green-100 text-green-700 border-green-200' : c.status === 'EXPIRED' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-orange-100 text-orange-700 border-orange-200'}`}
                        >
                          {cStatusMap[c.status?.toUpperCase()] || c.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </>
          );
        case 'INTERVENTIONS':
          return (
            <>
              <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-xs text-slate-500 uppercase">
                <tr>
                  <th className="py-3 px-4">ID</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Technicien</th>
                  <th className="py-3 px-4 text-right">Statut</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedData.map((itv: Intervention) => {
                  const itvStatusMap: Record<string, string> = {
                    COMPLETED: 'Terminée',
                    IN_PROGRESS: 'En cours',
                    PLANNED: 'Planifiée',
                    CANCELLED: 'Annulée',
                    PENDING: 'En attente',
                  };
                  const itvTypeMap: Record<string, string> = {
                    INSTALLATION: 'Installation',
                    MAINTENANCE: 'Maintenance',
                    REPAIR: 'Réparation',
                    REMOVAL: 'Retrait',
                  };
                  return (
                    <tr key={itv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="py-3 px-4 font-mono text-[var(--primary)]">{itv.id?.substring(0, 10) || '-'}</td>
                      <td className="py-3 px-4">
                        {itvTypeMap[(itv.type || itv.interventionType || '').toUpperCase()] ||
                          itv.type ||
                          itv.interventionType ||
                          '-'}
                      </td>
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        {formatDate(itv.date || itv.scheduledDate)}
                      </td>
                      <td className="py-3 px-4">{itv.technicianName || itv.assignedTo || '-'}</td>
                      <td className="py-3 px-4 text-right">
                        <span
                          className={`px-2 py-1 rounded text-[10px] font-bold border ${itv.status === 'COMPLETED' ? 'bg-green-100 text-green-700 border-green-200' : itv.status === 'IN_PROGRESS' ? 'bg-[var(--primary-dim)] text-[var(--primary)] border-[var(--border)]' : 'bg-orange-100 text-orange-700 border-orange-200'}`}
                        >
                          {itvStatusMap[itv.status?.toUpperCase()] || itv.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </>
          );
        case 'TICKETS':
          return (
            <>
              <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-xs text-slate-500 uppercase">
                <tr>
                  <th className="py-3 px-4">ID</th>
                  <th className="py-3 px-4">Sujet</th>
                  <th className="py-3 px-4">Priorité</th>
                  <th className="py-3 px-4 text-right">Statut</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedData.map((t: Ticket) => {
                  const tStatusMap: Record<string, string> = {
                    OPEN: 'Ouvert',
                    IN_PROGRESS: 'En cours',
                    RESOLVED: 'Résolu',
                    CLOSED: 'Fermé',
                    PENDING: 'En attente',
                  };
                  const tPriorityMap: Record<string, string> = {
                    CRITICAL: 'Critique',
                    HIGH: 'Haute',
                    MEDIUM: 'Moyenne',
                    LOW: 'Basse',
                  };
                  return (
                    <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="py-3 px-4 font-mono text-[var(--primary)]">{t.id}</td>
                      <td className="py-3 px-4 max-w-[250px] truncate">{t.subject}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${t.priority === 'CRITICAL' ? 'bg-red-100 text-red-700' : t.priority === 'HIGH' ? 'bg-orange-100 text-orange-700' : t.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-600'}`}
                        >
                          {tPriorityMap[t.priority?.toUpperCase()] || t.priority}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span
                          className={`px-2 py-1 rounded text-[10px] font-bold border ${t.status === 'RESOLVED' || t.status === 'CLOSED' ? 'bg-green-100 text-green-700 border-green-200' : t.status === 'IN_PROGRESS' ? 'bg-[var(--primary-dim)] text-[var(--primary)] border-[var(--border)]' : 'bg-orange-100 text-orange-700 border-orange-200'}`}
                        >
                          {tStatusMap[t.status?.toUpperCase()] || t.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </>
          );
        case 'JOURNALS':
          return (
            <>
              <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-xs text-slate-500 uppercase">
                <tr>
                  <th className="py-3 px-4" colSpan={5}>
                    Journaux comptables
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={5} className="py-8 text-center text-sm text-slate-400">
                    Module en cours de développement
                  </td>
                </tr>
              </tbody>
            </>
          );
        // Generic fallback
        default:
          return (
            <>
              <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-xs text-slate-500 uppercase">
                <tr>
                  {Object.keys(paginatedData[0] || {})
                    .slice(0, 5)
                    .map((k) => (
                      <th key={k} className="py-3 px-4 capitalize">
                        {k}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedData.map((item: any, i: number) => (
                  <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    {Object.values(item)
                      .slice(0, 5)
                      .map((val: any, idx) => (
                        <td key={idx} className="py-3 px-4 text-slate-600 dark:text-slate-300">
                          {String(val ?? '')}
                        </td>
                      ))}
                  </tr>
                ))}
              </tbody>
            </>
          );
      }
    };

    return (
      <div className="h-full flex flex-col animate-in fade-in duration-300">
        {/* Toolbar */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg overflow-x-auto max-w-full custom-scrollbar">
            {TRANSACTION_SUBTABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTrxSubTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs font-bold transition-all whitespace-nowrap ${activeTrxSubTab === tab.id ? 'bg-white dark:bg-slate-700 text-[var(--primary)] shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
              >
                <tab.icon className="w-3 h-3" /> {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col">
          <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full text-left">{renderTableContent()}</table>
            {paginatedData.length === 0 && (
              <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                <Search className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-sm">Aucun résultat trouvé</p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-3 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
              <button
                onClick={() => setTrxPage((p) => Math.max(1, p - 1))}
                disabled={trxPage === 1}
                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded disabled:opacity-30"
                title="Page précédente"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-bold text-slate-500">
                Page {trxPage} / {totalPages}
              </span>
              <button
                onClick={() => setTrxPage((p) => Math.min(totalPages, p + 1))}
                disabled={trxPage === totalPages}
                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded disabled:opacity-30"
                title="Page suivante"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (!isOpen || !tier) return null;

  const getTabs = () => {
    const common = [
      { id: 'OVERVIEW', label: "Vue d'ensemble", icon: LayoutGrid },
      { id: 'TRANSACTIONS', label: 'Transactions', icon: Receipt },
      { id: 'HISTORY', label: 'Historique', icon: History },
    ];

    if (tier.type === 'CLIENT') {
      return [...common.slice(0, 2), { id: 'VEHICLES', label: 'Véhicules', icon: Car }, ...common.slice(2)];
    }

    if (tier.type === 'RESELLER') {
      return [
        ...common,
        { id: 'CLIENTS', label: 'Clients Gérés', icon: Users },
        { id: 'CONFIG', label: 'Configuration', icon: Settings },
      ];
    }

    return common;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
      <div className="relative w-full max-w-6xl h-[90vh] bg-slate-50 dark:bg-slate-900 rounded-2xl shadow-2xl flex overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-700">
        {/* SIDEBAR NAVIGATION */}
        <div className="w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col z-10">
          <div className="p-6 border-b border-slate-100 dark:border-slate-700">
            <div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg mb-4 ${
                tier.type === 'CLIENT'
                  ? 'bg-gradient-to-br from-blue-500 to-indigo-600'
                  : tier.type === 'RESELLER'
                    ? 'bg-gradient-to-br from-purple-500 to-pink-600'
                    : 'bg-gradient-to-br from-orange-500 to-red-600'
              }`}
            >
              {tier.name.charAt(0)}
            </div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-white leading-tight mb-1">{tier.name}</h2>
            <div className="flex items-center gap-2 mb-1">
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">{tier.type}</p>
              <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded font-mono">
                {tier.id}
              </span>
              {tier.accountingCode && (
                <span
                  className="text-[10px] px-1.5 py-0.5 bg-[var(--primary-dim)] text-[var(--primary)] rounded font-mono border border-[var(--border)]"
                  title="Code Comptable"
                >
                  {tier.accountingCode}
                </span>
              )}
            </div>

            {/* STATUS BADGE */}
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => {
                  setNewStatus(tier.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE');
                  setShowStatusModal(true);
                }}
                className={`px-2 py-1 rounded text-[10px] font-bold uppercase border flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity ${tier.status === 'ACTIVE' ? 'bg-green-50 text-green-600 border-green-200' : tier.status === 'SUSPENDED' ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}
                title="Cliquer pour changer le statut"
              >
                <RefreshCw className="w-3 h-3" />
                {tier.status === 'ACTIVE'
                  ? 'Actif'
                  : tier.status === 'INACTIVE'
                    ? 'Inactif'
                    : tier.status === 'SUSPENDED'
                      ? 'Suspendu'
                      : tier.status}
              </button>

              {/* FINANCIAL STATUS BADGE */}
              {tier.type === 'CLIENT' && (
                <span
                  className={`px-2 py-1 rounded text-[10px] font-bold uppercase border flex items-center gap-1 ${
                    (tier.clientData?.balance || 0) < 0
                      ? 'bg-red-50 text-red-600 border-red-200'
                      : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                  }`}
                >
                  {(tier.clientData?.balance || 0) < 0 ? (
                    <AlertCircle className="w-3 h-3" />
                  ) : (
                    <CheckCircle className="w-3 h-3" />
                  )}
                  {(tier.clientData?.balance || 0) < 0 ? 'Impayés' : 'A jour'}
                </span>
              )}

              {tier.type === 'SUPPLIER' && (
                <span
                  className={`px-2 py-1 rounded text-[10px] font-bold uppercase border flex items-center gap-1 ${
                    (tier.supplierData?.balance || 0) < 0
                      ? 'bg-orange-50 text-orange-600 border-orange-200'
                      : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                  }`}
                >
                  {(tier.supplierData?.balance || 0) < 0 ? (
                    <AlertTriangle className="w-3 h-3" />
                  ) : (
                    <CheckCircle className="w-3 h-3" />
                  )}
                  {(tier.supplierData?.balance || 0) < 0 ? 'Solde Dû' : 'A jour'}
                </span>
              )}
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
            {getTabs().map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveDetailTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeDetailTab === item.id ? 'bg-[var(--primary-dim)] text-[var(--primary)] shadow-sm ring-1 ring-[var(--border)]' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300'}`}
              >
                <item.icon
                  className={`w-4 h-4 ${activeDetailTab === item.id ? 'text-[var(--primary)]' : 'text-slate-400'}`}
                />
                {item.label}
              </button>
            ))}
          </nav>

          <div className="p-4 border-t border-slate-100 dark:border-slate-700">
            <button
              onClick={async () => {
                if (
                  await confirm({
                    message: 'Êtes-vous sûr de vouloir supprimer ce tiers ? Cette action est irréversible.',
                    variant: 'danger',
                    title: 'Confirmer la suppression',
                    confirmLabel: 'Supprimer',
                  })
                ) {
                  try {
                    await deleteTier(tier.id);
                    showToast(TOAST.CRM.TIER_DELETED, 'success');
                    onClose();
                  } catch (error) {
                    showToast(mapError(error, 'tiers'), 'error');
                  }
                }
              }}
              className="w-full py-2 flex items-center justify-center gap-2 text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" /> Supprimer
            </button>
          </div>
        </div>

        {/* MAIN CONTENT AREA */}
        <div className="flex-1 flex flex-col min-w-0 bg-slate-50/50 dark:bg-slate-900/50">
          {/* Header */}
          <div className="h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-6 shrink-0">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Users className="w-4 h-4" />
              <ChevronRight className="w-4 h-4" />
              <span>Détails {tier.type}</span>
              <ChevronRight className="w-4 h-4" />
              <span className="font-bold text-slate-800 dark:text-white">
                {getTabs().find((t) => t.id === activeDetailTab)?.label}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {/* Quick Actions */}
              {onEdit && (
                <button
                  onClick={() => onEdit(tier)}
                  className="p-2 hover:bg-[var(--primary-dim)] dark:hover:bg-[var(--primary-dim)] rounded-lg text-slate-400 hover:text-[var(--primary)] transition-colors"
                  title="Modifier"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => handleQuickAction('ticket')}
                className="p-2 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg text-slate-400 hover:text-purple-600 transition-colors"
                title="Créer un ticket"
              >
                <LifeBuoy className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleQuickAction('devis')}
                className="p-2 hover:bg-[var(--primary-dim)] dark:hover:bg-[var(--primary-dim)] rounded-lg text-slate-400 hover:text-[var(--primary)] transition-colors"
                title="Créer un devis"
              >
                <FileText className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleQuickAction('facture')}
                className="p-2 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg text-slate-400 hover:text-emerald-600 transition-colors"
                title="Créer une facture"
              >
                <Receipt className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleQuickAction('intervention')}
                className="p-2 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg text-slate-400 hover:text-orange-600 transition-colors"
                title="Créer une intervention"
              >
                <Wrench className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleQuickAction('paiement')}
                className="p-2 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg text-slate-400 hover:text-green-600 transition-colors"
                title="Enregistrer un paiement"
              >
                <CreditCard className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleQuickAction('mail')}
                className="p-2 hover:bg-sky-50 dark:hover:bg-sky-900/20 rounded-lg text-slate-400 hover:text-sky-600 transition-colors"
                title="Envoyer un e-mail"
              >
                <Mail className="w-4 h-4" />
              </button>
              <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />
              <button
                onClick={onClose}
                className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
                title="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content Scrollable */}
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            {/* 1. VUE D'ENSEMBLE */}
            {activeDetailTab === 'OVERVIEW' && (
              <div className="grid grid-cols-12 gap-6 animate-in fade-in slide-in-from-right-4 duration-300">
                {/* COLONNE GAUCHE : INFOS PRINCIPALES */}
                <div className="col-span-12 lg:col-span-8 space-y-6">
                  {/* Carte Identité */}
                  <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                      <Building2 className="w-32 h-32 text-slate-900 dark:text-white" />
                    </div>
                    <div className="relative z-10">
                      <div className="flex items-start justify-between mb-6">
                        <div>
                          <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-1">
                            Informations Générales
                          </h3>
                          <p className="text-sm text-slate-500">Données administratives et légales</p>
                        </div>
                        <button
                          onClick={() =>
                            onEdit ? onEdit(tier) : showToast(TOAST.CRM.FEATURE_COMING_SOON('Modification'), 'info')
                          }
                          className="p-2 bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
                          title="Modifier les informations"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-6">
                        {/* Contact Principal */}
                        <div className="p-3 bg-[var(--primary-dim)] rounded-lg border border-[var(--border)]">
                          <p className="text-[10px] font-bold text-[var(--primary)] uppercase mb-2">
                            Contact Principal
                          </p>
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center font-bold text-xs text-[var(--primary)] shadow-sm">
                              {(tier.contactName || tier.name).charAt(0)}
                            </div>
                            <div>
                              <p className="font-bold text-slate-800 dark:text-white text-sm">
                                {tier.contactName || tier.name}
                              </p>
                              <div className="flex gap-2 mt-1">
                                <a
                                  href={`mailto:${tier.email}`}
                                  title="Envoyer un email"
                                  className="p-1 bg-white dark:bg-slate-800 rounded hover:text-[var(--primary)] transition-colors"
                                >
                                  <Mail className="w-3 h-3" />
                                </a>
                                {tier.phone && (
                                  <a
                                    href={`tel:${tier.phone}`}
                                    title="Appeler"
                                    className="p-1 bg-white dark:bg-slate-800 rounded hover:text-green-600 transition-colors"
                                  >
                                    <Phone className="w-3 h-3" />
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Bloc Détails Société */}
                      <div className="grid grid-cols-2 gap-4 text-sm mt-6">
                        <div className="col-span-2">
                          <label className="block text-xs text-slate-500 mb-1">Adresse Siège</label>
                          <div className="font-medium text-slate-800 dark:text-slate-200 flex items-start gap-2">
                            <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                            <span>
                              {tier.address || 'Non renseignée'}
                              <br />
                              {tier.city && <span className="text-slate-600 dark:text-slate-400">{tier.city}, </span>}
                              {tier.country && <span className="font-bold">{tier.country}</span>}
                            </span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Date Création</label>
                          <div className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-2">
                            <Calendar className="w-3 h-3 text-slate-400" />{' '}
                            {new Date(tier.createdAt).toLocaleDateString('fr-FR')}
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Code Comptable</label>
                          <div className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-2 font-mono">
                            <FileSpreadsheet className="w-3 h-3 text-slate-400" /> {tier.accountingCode || '-'}
                          </div>
                        </div>

                        {/* Type Specific Fields */}
                        {tier.type === 'CLIENT' && (
                          <>
                            <div>
                              <label className="block text-xs text-slate-500 mb-1">Plan</label>
                              <div className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                <Bookmark className="w-3 h-3 text-slate-400" />{' '}
                                {tier.clientData?.subscriptionPlan || 'Standard'}
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs text-slate-500 mb-1">Flotte</label>
                              <div className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                <Truck className="w-3 h-3 text-slate-400" /> {tier.clientData?.fleetSize || 0} véhicules
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs text-slate-500 mb-1">Segment</label>
                              <div className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                <Tag className="w-3 h-3 text-slate-400" /> {tier.clientData?.segment || 'Standard'}
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs text-slate-500 mb-1">Secteur</label>
                              <div className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                <Briefcase className="w-3 h-3 text-slate-400" /> {tier.clientData?.sector || '-'}
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs text-slate-500 mb-1">Langue</label>
                              <div className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                <Languages className="w-3 h-3 text-slate-400" />{' '}
                                {tier.clientData?.language || 'Français'}
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs text-slate-500 mb-1">Type</label>
                              <div className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                <Building2 className="w-3 h-3 text-slate-400" /> {tier.clientData?.type || 'B2B'}
                              </div>
                            </div>
                            {tier.clientData?.resellerId && (
                              <div className="col-span-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                                <label className="block text-xs text-slate-500 mb-1">Géré par (Revendeur)</label>
                                <div className="font-medium text-[var(--primary)] flex items-center gap-2">
                                  <BriefcaseIcon className="w-3 h-3" /> {tier.clientData.resellerId}
                                </div>
                              </div>
                            )}
                            <div className="col-span-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-700 grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-xs text-slate-500 mb-1">Devise</label>
                                <div className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                  <DollarSign className="w-3 h-3 text-slate-400" /> {tier.clientData?.currency || 'XOF'}
                                </div>
                              </div>
                              <div>
                                <label className="block text-xs text-slate-500 mb-1">Paiement</label>
                                <div className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                  <Clock className="w-3 h-3 text-slate-400" />{' '}
                                  {tier.clientData?.paymentTerms || '30 jours'}
                                </div>
                              </div>
                            </div>
                          </>
                        )}

                        {tier.type === 'RESELLER' && (
                          <>
                            <div>
                              <label className="block text-xs text-slate-500 mb-1">Domaine</label>
                              <div className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                <Globe2 className="w-3 h-3 text-slate-400" /> {tier.resellerData?.domain || '-'}
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs text-slate-500 mb-1">Activité</label>
                              <div className="font-medium text-slate-800 dark:text-slate-200">
                                {tier.resellerData?.activity || '-'}
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs text-slate-500 mb-1">Responsable</label>
                              <div className="font-medium text-slate-800 dark:text-slate-200">
                                {tier.resellerData?.managerName || '-'}
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs text-slate-500 mb-1">RCCM</label>
                              <div className="font-medium text-slate-800 dark:text-slate-200">
                                {tier.resellerData?.rccm || '-'}
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs text-slate-500 mb-1">N° CC</label>
                              <div className="font-medium text-slate-800 dark:text-slate-200">
                                {tier.resellerData?.ccNumber || '-'}
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs text-slate-500 mb-1">Exercice</label>
                              <div className="font-medium text-slate-800 dark:text-slate-200">
                                {tier.resellerData?.fiscalYear || '-'}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* HISTOGRAMME CHIFFRE D'AFFAIRES */}
                  <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2">
                        <BarChart3 className="w-4 h-4" /> Chiffre d'Affaires
                      </h4>
                      <select
                        className="text-xs border border-slate-200 dark:border-slate-700 rounded bg-slate-50 dark:bg-slate-900 px-2 py-1 outline-none focus:ring-1 focus:ring-[var(--primary)]"
                        value={chartPeriod}
                        onChange={(e) => setChartPeriod(e.target.value)}
                        title="Période du CA"
                      >
                        <option value="THIS_YEAR">Cette Année</option>
                        <option value="LAST_YEAR">Année N-1</option>
                      </select>
                    </div>
                    <div className="h-[250px] w-full" style={{ minHeight: 240, minWidth: 200 }}>
                      <ResponsiveContainer
                        width="100%"
                        height="100%"
                        minHeight={240}
                        minWidth={200}
                        initialDimension={{ width: 200, height: 240 }}
                      >
                        <BarChart
                          data={(() => {
                            const MONTHS = [
                              'Jan',
                              'Fév',
                              'Mar',
                              'Avr',
                              'Mai',
                              'Juin',
                              'Juil',
                              'Aoû',
                              'Sep',
                              'Oct',
                              'Nov',
                              'Déc',
                            ];
                            const tierInvs = invoices.filter(
                              (inv) => inv.clientId === tier.id || inv.clientId === tier.name
                            );
                            const currentYear =
                              chartPeriod === 'THIS_YEAR' ? new Date().getFullYear() : new Date().getFullYear() - 1;
                            return MONTHS.map((month, idx) => {
                              const total = tierInvs
                                .filter((inv) => {
                                  const d = new Date(inv.date);
                                  return d.getFullYear() === currentYear && d.getMonth() === idx;
                                })
                                .reduce((sum, inv) => sum + Number(inv.amountHT || inv.amount || 0), 0);
                              return { month, amount: total };
                            });
                          })()}
                          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis
                            dataKey="month"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#64748b', fontSize: 12 }}
                            dy={10}
                          />
                          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                          <Tooltip
                            cursor={{ fill: '#f8fafc' }}
                            contentStyle={{
                              borderRadius: '8px',
                              border: 'none',
                              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                            }}
                            formatter={(value: number) => [formatPrice(value), 'CA HT']}
                          />
                          <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={30} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* COLONNE DROITE : CONTACTS & ACTIONS */}
                <div className="col-span-12 lg:col-span-4 space-y-6">
                  {/* BLOC CONTACTS */}
                  <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-xs font-bold text-slate-400 uppercase">Personnes à contacter</h4>
                      <button
                        onClick={handleAddContact}
                        className="p-1 bg-[var(--primary-dim)] hover:bg-[var(--primary-dim)] rounded text-[var(--primary)] transition-colors"
                        title="Ajouter un contact"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="space-y-3">
                      <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded border border-slate-100 dark:border-slate-700 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                          {(tier.contactName || tier.name).charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                            {tier.contactName || tier.name}
                          </p>
                          <p className="text-xs text-slate-400">Principal</p>
                        </div>
                      </div>
                      {tier.secondContactName && (
                        <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded border border-slate-100 dark:border-slate-700 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                            {tier.secondContactName.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                              {tier.secondContactName}
                            </p>
                            <p className="text-xs text-slate-400">Secondaire</p>
                          </div>
                        </div>
                      )}
                      {showAddContactForm && (
                        <div className="p-3 bg-[var(--primary-dim)] rounded border border-[var(--border)] space-y-2">
                          <input
                            autoFocus
                            type="text"
                            placeholder="Nom du contact *"
                            value={newContactName}
                            onChange={(e) => setNewContactName(e.target.value)}
                            className="w-full text-sm px-2 py-1 rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-800"
                          />
                          <input
                            type="text"
                            placeholder="Rôle / Fonction"
                            value={newContactRole}
                            onChange={(e) => setNewContactRole(e.target.value)}
                            className="w-full text-sm px-2 py-1 rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-800"
                          />
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => setShowAddContactForm(false)}
                              className="text-xs px-2 py-1 rounded border border-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                            >
                              Annuler
                            </button>
                            <button
                              onClick={handleSaveContact}
                              disabled={isSavingContact || !newContactName.trim()}
                              className="text-xs px-2 py-1 rounded bg-[var(--primary)] text-white hover:bg-[var(--primary-light)] disabled:opacity-50"
                            >
                              {isSavingContact ? 'Enregistrement...' : 'Ajouter'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. TRANSACTIONS */}
            {activeDetailTab === 'TRANSACTIONS' && renderTransactionsTab()}

            {/* 2.5. VEHICLES (CLIENT ONLY) */}
            {activeDetailTab === 'VEHICLES' &&
              tier.type === 'CLIENT' &&
              (() => {
                const tierVehicles = vehicles.filter((v) => v.clientId === tier.id);
                // Calculer les infos de contrat/abonnement pour chaque véhicule
                const getVehicleContract = (v: Vehicle) =>
                  contracts.find((c) => c.id === v.contractId && c.clientId === tier.id);
                const getVehicleInvoiceStatus = (v: Vehicle) => {
                  const vInvoices = invoices.filter(
                    (inv) => inv.clientId === tier.id && (inv.status === 'OVERDUE' || inv.status === 'DRAFT')
                  );
                  return vInvoices.length > 0 ? 'IMPAYE' : 'A_JOUR';
                };

                return (
                  <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                      <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex justify-between items-center">
                        <div>
                          <h3 className="font-bold text-slate-800 dark:text-white">Véhicules du client</h3>
                          <p className="text-xs text-slate-500">{tierVehicles.length} véhicule(s) associé(s)</p>
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="flex items-center gap-1 text-green-600">
                            <CircleDot className="w-3 h-3" />{' '}
                            {tierVehicles.filter((v) => v.status === VehicleStatus.MOVING).length} en mouvement
                          </span>
                          <span className="flex items-center gap-1 text-slate-400">
                            <WifiOff className="w-3 h-3" />{' '}
                            {tierVehicles.filter((v) => v.status === VehicleStatus.OFFLINE).length} hors ligne
                          </span>
                        </div>
                      </div>
                      <div className="overflow-auto custom-scrollbar">
                        {tierVehicles.length === 0 ? (
                          <div className="p-8 text-center text-slate-400">
                            <Car className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            <p>Aucun véhicule associé à ce client</p>
                          </div>
                        ) : (
                          <table className="w-full text-left">
                            <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-xs text-slate-500 uppercase">
                              <tr>
                                <th className="py-3 px-4">Véhicule</th>
                                <th className="py-3 px-4">Plaque</th>
                                <th className="py-3 px-4">Date Installation</th>
                                <th className="py-3 px-4">N° Contrat</th>
                                <th className="py-3 px-4">Statut GPS</th>
                                <th className="py-3 px-4 text-right">Paiement</th>
                              </tr>
                            </thead>
                            <tbody className="text-sm divide-y divide-slate-100 dark:divide-slate-800">
                              {tierVehicles.map((vehicle: Vehicle) => {
                                const contract = getVehicleContract(vehicle);
                                const payStatus = getVehicleInvoiceStatus(vehicle);
                                return (
                                  <tr
                                    key={vehicle.id}
                                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                                  >
                                    <td className="py-3 px-4">
                                      <div className="flex items-center gap-2">
                                        <div
                                          className={`w-2 h-2 rounded-full shrink-0 ${
                                            vehicle.status === VehicleStatus.MOVING
                                              ? 'bg-green-500 animate-pulse'
                                              : vehicle.status === VehicleStatus.IDLE
                                                ? 'bg-yellow-500'
                                                : vehicle.status === VehicleStatus.STOPPED
                                                  ? 'bg-orange-500'
                                                  : 'bg-slate-300'
                                          }`}
                                        />
                                        <span className="font-bold text-slate-800 dark:text-white">{vehicle.name}</span>
                                      </div>
                                      <div className="text-[11px] text-slate-400 mt-0.5">
                                        {vehicle.brand && (
                                          <span>
                                            {vehicle.brand} {vehicle.model}
                                          </span>
                                        )}
                                        {vehicle.imei && <span className="ml-2 font-mono">IMEI: {vehicle.imei}</span>}
                                      </div>
                                    </td>
                                    <td className="py-3 px-4 font-mono text-xs">
                                      {vehicle.plate || vehicle.licensePlate || '-'}
                                    </td>
                                    <td className="py-3 px-4 text-xs">
                                      {vehicle.installDate ? (
                                        <span className="flex items-center gap-1">
                                          <Calendar className="w-3 h-3 text-slate-400" />{' '}
                                          {new Date(vehicle.installDate).toLocaleDateString('fr-FR')}
                                        </span>
                                      ) : (
                                        <span className="text-slate-300">-</span>
                                      )}
                                    </td>
                                    <td className="py-3 px-4 text-xs">
                                      {contract ? (
                                        <div>
                                          <span className="font-mono text-[var(--primary)]">
                                            {contract.id?.substring(0, 8)}
                                          </span>
                                          <span
                                            className={`ml-2 px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                              contract.status === 'ACTIVE'
                                                ? 'bg-green-100 text-green-700'
                                                : contract.status === 'EXPIRED'
                                                  ? 'bg-red-100 text-red-700'
                                                  : 'bg-orange-100 text-orange-700'
                                            }`}
                                          >
                                            {contract.status}
                                          </span>
                                        </div>
                                      ) : (
                                        <span className="text-slate-300">Aucun</span>
                                      )}
                                    </td>
                                    <td className="py-3 px-4">
                                      <span
                                        className={`text-xs px-2 py-1 rounded font-bold ${
                                          vehicle.status === VehicleStatus.MOVING
                                            ? 'bg-green-100 text-green-700'
                                            : vehicle.status === VehicleStatus.IDLE
                                              ? 'bg-yellow-100 text-yellow-700'
                                              : vehicle.status === VehicleStatus.STOPPED
                                                ? 'bg-orange-100 text-orange-700'
                                                : 'bg-slate-100 text-slate-600'
                                        }`}
                                      >
                                        {vehicle.status === VehicleStatus.MOVING
                                          ? 'En mouvement'
                                          : vehicle.status === VehicleStatus.IDLE
                                            ? 'Au ralenti'
                                            : vehicle.status === VehicleStatus.STOPPED
                                              ? 'Arrêté'
                                              : 'Hors ligne'}
                                      </span>
                                    </td>
                                    <td className="py-3 px-4 text-right">
                                      <span
                                        className={`text-xs px-2 py-1 rounded font-bold border ${
                                          payStatus === 'A_JOUR'
                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                            : 'bg-red-50 text-red-700 border-red-200'
                                        }`}
                                      >
                                        {payStatus === 'A_JOUR' ? '✓ À jour' : '✗ Impayé'}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

            {/* 3. CLIENTS (RESELLER ONLY) */}
            {activeDetailTab === 'CLIENTS' && tier.type === 'RESELLER' && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <TierList
                  type="CLIENT"
                  searchTerm=""
                  onEdit={() => {}}
                  filter={(t) => t.clientData?.resellerId === tier.id}
                />
              </div>
            )}

            {/* 4. HISTORIQUE (fusionne Courrier + Commentaires + Audit Logs) */}
            {activeDetailTab === 'HISTORY' && (
              <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-4">
                {/* Saisie commentaire / note d'appel */}
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                    <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2 mb-3">
                      <Plus className="w-4 h-4 text-[var(--primary)]" /> Ajouter une entrée
                    </h4>
                    <div className="flex gap-2 mb-3">
                      <button
                        onClick={() => setCommentType('note')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors border ${
                          commentType === 'note'
                            ? 'bg-[var(--primary-dim)] text-[var(--primary)] border-[var(--primary)]'
                            : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700'
                        }`}
                      >
                        <StickyNote className="w-3.5 h-3.5" /> Note / Commentaire
                      </button>
                      <button
                        onClick={() => setCommentType('appel')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors border ${
                          commentType === 'appel'
                            ? 'bg-green-50 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700'
                            : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700'
                        }`}
                      >
                        <PhoneIncoming className="w-3.5 h-3.5" /> Note d&apos;appel
                      </button>
                    </div>
                    <textarea
                      className="w-full p-3 text-sm border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-[var(--primary)] outline-none bg-white dark:bg-slate-800 resize-none"
                      rows={3}
                      placeholder={
                        commentType === 'appel'
                          ? "Résumé de l'appel téléphonique..."
                          : 'Ajouter une note ou un commentaire...'
                      }
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                    />
                    <div className="flex justify-end mt-2">
                      <button
                        onClick={handleSendComment}
                        disabled={!newComment.trim()}
                        className="px-4 py-2 bg-[var(--primary)] text-white text-sm font-bold rounded-lg hover:bg-[var(--primary-light)] disabled:opacity-50 transition-colors flex items-center gap-2"
                      >
                        <Send className="w-4 h-4" /> Enregistrer
                      </button>
                    </div>
                  </div>
                </div>

                {/* Audit Logs (actions système) */}
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                    <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-[var(--primary)]" /> Journal d&apos;activité
                    </h4>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={fetchAuditLogs}
                        className="text-xs text-[var(--primary)] hover:text-[var(--primary)] font-medium flex items-center gap-1"
                        title="Rafraîchir"
                      >
                        <RefreshCw className={`w-3 h-3 ${auditLoading ? 'animate-spin' : ''}`} /> Actualiser
                      </button>
                      <span className="text-xs text-slate-400">{auditLogs.length + comments.length} entrée(s)</span>
                    </div>
                  </div>

                  {auditLoading ? (
                    <div className="p-8 text-center text-slate-400">
                      <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin opacity-40" />
                      <p className="text-sm">Chargement de l&apos;historique...</p>
                    </div>
                  ) : auditLogs.length === 0 && comments.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">
                      <History className="w-10 h-10 mx-auto mb-3 opacity-20" />
                      <p className="text-sm">Aucun historique pour ce compte</p>
                      <p className="text-xs mt-1">
                        Les notes, appels, emails et actions utilisateur seront affichés ici
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-700 max-h-[500px] overflow-y-auto custom-scrollbar">
                      {/* Merge audit logs + comments, sort by date desc */}
                      {(() => {
                        const auditActionConfig: Record<
                          string,
                          { icon: React.ElementType; color: string; label: string }
                        > = {
                          CREATE: {
                            icon: Plus,
                            color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
                            label: 'Création',
                          },
                          UPDATE: {
                            icon: Edit2,
                            color:
                              'bg-[var(--primary-dim)] text-[var(--primary)] dark:bg-[var(--primary-dim)] dark:text-[var(--primary)]',
                            label: 'Modification',
                          },
                          DELETE: {
                            icon: Trash2,
                            color: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
                            label: 'Suppression',
                          },
                          LOGIN: {
                            icon: Eye,
                            color: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400',
                            label: 'Connexion',
                          },
                          STATUS_CHANGE: {
                            icon: RefreshCw,
                            color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
                            label: 'Changement statut',
                          },
                          PAYMENT_RECEIVED: {
                            icon: CreditCard,
                            color: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
                            label: 'Paiement reçu',
                          },
                          EXPORT: {
                            icon: Download,
                            color: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
                            label: 'Export',
                          },
                        };
                        const commentTypeConfig: Record<
                          string,
                          { icon: React.ElementType; color: string; label: string }
                        > = {
                          note: {
                            icon: StickyNote,
                            color:
                              'bg-[var(--primary-dim)] text-[var(--primary)] dark:bg-[var(--primary-dim)] dark:text-[var(--primary)]',
                            label: 'Note',
                          },
                          appel: {
                            icon: PhoneIncoming,
                            color: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
                            label: 'Appel',
                          },
                          email: {
                            icon: Mail,
                            color: 'bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400',
                            label: 'E-mail',
                          },
                          sms: {
                            icon: MessageSquare,
                            color: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
                            label: 'SMS',
                          },
                          système: {
                            icon: Activity,
                            color: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400',
                            label: 'Système',
                          },
                        };

                        // Normalize all entries to a common format
                        const allEntries: {
                          id: string;
                          date: string;
                          sortDate: number;
                          author: string;
                          text: string;
                          type: string;
                          source: 'audit' | 'comment';
                          details?: any;
                        }[] = [];

                        // Add audit log entries
                        auditLogs.forEach((log: AuditLog) => {
                          const d = log.created_at ? new Date(log.created_at) : new Date();
                          const details =
                            typeof log.details === 'string'
                              ? (() => {
                                  try {
                                    return JSON.parse(log.details);
                                  } catch {
                                    return log.details;
                                  }
                                })()
                              : log.details;

                          // Build description from details
                          let description: string;
                          const action = (log.action || '').toUpperCase();
                          const entityType = (log.entity_type || '').toLowerCase();

                          if (details?.description) {
                            description = details.description;
                          } else if (details?.changes) {
                            const changes = Array.isArray(details.changes)
                              ? details.changes
                              : Object.keys(details.changes).map((k) => `${k}: ${details.changes[k]}`);
                            description = `Champs modifiés: ${changes.join(', ')}`;
                          } else if (action === 'CREATE') {
                            description = `Création de ${entityType} ${log.entity_id || ''}`;
                          } else if (action === 'UPDATE') {
                            description = `Modification de ${entityType} ${log.entity_id || ''}`;
                          } else if (action === 'DELETE') {
                            description = `Suppression de ${entityType} ${log.entity_id || ''}`;
                          } else {
                            description = `${action} sur ${entityType}`;
                          }

                          // Append detail fields if available
                          if (details && typeof details === 'object' && !details.description && !details.changes) {
                            const readable = Object.entries(details)
                              .filter(([k]) => !['timestamp', 'ip', 'userAgent'].includes(k))
                              .map(([k, v]) => `${k}: ${v}`)
                              .join(', ');
                            if (readable) description += ` — ${readable}`;
                          }

                          allEntries.push({
                            id: log.id || `audit-${log.created_at}`,
                            date: d.toLocaleString('fr-FR', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            }),
                            sortDate: d.getTime(),
                            author: log.user_name || log.user_email || 'Système',
                            text: description,
                            type: action,
                            source: 'audit',
                            details: details,
                          });
                        });

                        // Add manual comments
                        comments.forEach((entry) => {
                          allEntries.push({
                            id: entry.id,
                            date: entry.date,
                            sortDate: new Date(entry.date).getTime() || Date.now(),
                            author: entry.author,
                            text: entry.text,
                            type: entry.type,
                            source: 'comment',
                          });
                        });

                        // Sort by date desc
                        allEntries.sort((a, b) => b.sortDate - a.sortDate);

                        return allEntries.map((entry) => {
                          const config =
                            entry.source === 'audit'
                              ? auditActionConfig[entry.type] || {
                                  icon: Activity,
                                  color: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400',
                                  label: entry.type,
                                }
                              : commentTypeConfig[entry.type] || {
                                  icon: StickyNote,
                                  color: 'bg-slate-100 text-slate-500',
                                  label: 'Note',
                                };
                          const EntryIcon = config.icon;
                          return (
                            <div
                              key={entry.id}
                              className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex gap-3"
                            >
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${config.color}`}
                              >
                                <EntryIcon className="w-4 h-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start mb-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-bold text-sm text-slate-800 dark:text-white">
                                      {entry.author}
                                    </span>
                                    <span
                                      className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${config.color}`}
                                    >
                                      {config.label}
                                    </span>
                                    {entry.source === 'audit' && (
                                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 font-mono">
                                        auto
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-xs text-slate-400 flex items-center gap-1 flex-shrink-0 ml-2">
                                    <Clock className="w-3 h-3" /> {entry.date}
                                  </span>
                                </div>
                                <p className="text-sm text-slate-600 dark:text-slate-300">{entry.text}</p>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* STATUS CHANGE MODAL */}
      {showStatusModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setShowStatusModal(false)}
          />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-[var(--primary)]" />
                Changer le statut
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                Modifier le statut de <span className="font-bold">{tier.name}</span>
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Nouveau statut</label>
                <div className="flex gap-2">
                  {[
                    {
                      value: 'ACTIVE',
                      label: 'Actif',
                      color: 'bg-emerald-50 text-emerald-700 border-emerald-300 ring-emerald-500',
                    },
                    {
                      value: 'INACTIVE',
                      label: 'Inactif',
                      color: 'bg-slate-50 text-slate-700 border-slate-300 ring-slate-500',
                    },
                    {
                      value: 'SUSPENDED',
                      label: 'Suspendu',
                      color: 'bg-amber-50 text-amber-700 border-amber-300 ring-amber-500',
                    },
                  ]
                    .filter((s) => s.value !== tier.status)
                    .map((s) => (
                      <button
                        key={s.value}
                        onClick={() => setNewStatus(s.value)}
                        className={`flex-1 px-3 py-2.5 rounded-lg text-sm font-bold border-2 transition-all ${
                          newStatus === s.value
                            ? `${s.color} ring-2`
                            : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                  Motif du changement <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={statusMotif}
                  onChange={(e) => setStatusMotif(e.target.value)}
                  placeholder="Indiquez la raison du changement de statut..."
                  className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm resize-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                  rows={3}
                />
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowStatusModal(false);
                  setStatusMotif('');
                  setNewStatus('');
                }}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleStatusChange}
                disabled={!newStatus || !statusMotif.trim() || isStatusUpdating}
                className="px-4 py-2 text-sm font-bold text-white bg-[var(--primary)] hover:bg-[var(--primary-light)] rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isStatusUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
