import React, { useState } from 'react';
import { useDataContext } from '../../../contexts/DataContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import { useCurrency } from '../../../hooks/useCurrency';
import { TOAST } from '../../../constants/toastMessages';
import { Card } from '../../../components/Card';
import { Pagination as SharedPagination } from '../../../components/Pagination';
import {
  FileText,
  Wrench,
  Ticket,
  ClipboardList,
  Search,
  Download,
  Eye,
  Calendar,
  Receipt,
  FileDown,
  Printer,
  ArrowRight,
  MapPin,
  User,
  Clock,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  CreditCard,
  Wallet,
  Banknote,
  LayoutList,
  Tag,
  MessageSquare,
  X,
  Send,
  ChevronRight,
  AlertTriangle,
  Info,
  Building2,
  FileBarChart,
} from 'lucide-react';
import type { Contract, Ticket as TicketType } from '../../../types';
import { CreateTicketModal } from './CreateTicketModal';
import { ContractDetailModal } from '../../crm/components/ContractDetailModal';
import { SubscriptionDetailModal } from '../../crm/components/SubscriptionDetailModal';
import { api } from '../../../services/apiLazy';
import { logger } from '../../../utils/logger';
import { useTableSort } from '../../../hooks/useTableSort';
import { SortableHeader } from '../../../components/SortableHeader';
import { generateInvoicePDF, type InvoiceData } from '../../../services/pdfServiceV2';
import { useTenantBranding } from '../../../hooks/useTenantBranding';

type OperationTab = 'subscriptions' | 'interventions' | 'requests' | 'tickets' | 'invoices' | 'quotes' | 'payments';

export const MyOperationsView: React.FC = () => {
  const { contracts, interventions, tickets, invoices, vehicles, payments = [], branches = [] } = useDataContext();
  const { user: _user } = useAuth();
  const { showToast } = useToast();
  const { formatPrice } = useCurrency();
  const { branding: tenantBranding } = useTenantBranding();
  const [activeTab, setActiveTab] = useState<OperationTab>('subscriptions');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [branchFilter, setBranchFilter] = useState<string>('ALL');
  const [periodFilter, setPeriodFilter] = useState<'ALL' | '7D' | '30D' | '90D' | '365D'>('ALL');

  const matchesPeriod = (dateStr?: string | Date | null): boolean => {
    if (periodFilter === 'ALL') return true;
    if (!dateStr) return false;
    const days = { '7D': 7, '30D': 30, '90D': 90, '365D': 365 }[periodFilter];
    const cutoff = Date.now() - days * 86400000;
    return new Date(dateStr).getTime() >= cutoff;
  };

  // Factures et devis client
  const [clientInvoices, setClientInvoices] = useState<any[]>([]);
  const [clientQuotes, setClientQuotes] = useState<any[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [loadingQuotes, setLoadingQuotes] = useState(false);

  // Fetch invoices une fois au montage (nécessaire pour Impayés/Nb factures dans abonnements)
  React.useEffect(() => {
    if (clientInvoices.length === 0) {
      setLoadingInvoices(true);
      api.invoices
        .list()
        .then((data: any[]) => setClientInvoices(data))
        .catch(() => {})
        .finally(() => setLoadingInvoices(false));
    }
  }, []);

  React.useEffect(() => {
    if (activeTab === 'quotes' && clientQuotes.length === 0) {
      setLoadingQuotes(true);
      api.quotes
        .list()
        .then((data: any[]) => setClientQuotes(data))
        .catch(() => {})
        .finally(() => setLoadingQuotes(false));
    }
  }, [activeTab]);

  // Helpers
  const getBranchName = (branchId?: string) => (branches as any[]).find((b: any) => b.id === branchId)?.name || '—';
  const getVehicle = (vehicleId?: string) => vehicles.find((v) => v.id === vehicleId);

  // Calculs factures par abonnement — même logique que SubscriptionDetailModal
  // Filtre par plaque (license_plate) OU par numéro d'abonnement (subscription_number / vehicle_id)
  const getSubInvoices = (sub: any) => {
    const plate = sub.vehicle_plate || sub.vehiclePlate;
    const subNum = sub.id || sub.vehicle_id || sub.vehicleId;
    return clientInvoices.filter((inv: any) => {
      const invPlate = inv.license_plate || inv.licensePlate;
      const invSubNum = inv.subscription_number || inv.subscriptionNumber || inv.subscription_id || inv.subscriptionId;
      return (plate && invPlate && invPlate === plate) || (subNum && invSubNum && invSubNum === subNum);
    });
  };
  const getSubUnpaid = (sub: any) =>
    getSubInvoices(sub)
      .filter((inv: any) => {
        const st = (inv.status || '').toUpperCase();
        return ['SENT', 'OVERDUE', 'PARTIALLY_PAID', 'PARTIAL', 'PENDING'].includes(st);
      })
      .reduce((sum: number, inv: any) => sum + Math.floor(inv.amount_ttc || inv.amountTTC || inv.amount || 0), 0);

  // Durée abonnement en mois
  const getSubDuration = (sub: any) => {
    const start = sub.start_date || sub.startDate;
    const end = sub.end_date || sub.endDate;
    if (!start) return '—';
    const s = new Date(start);
    const e = end ? new Date(end) : new Date();
    const months = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
    return months > 0 ? `${months} mois` : '< 1 mois';
  };

  // Durée de paiement (jours entre date facture et date d'échéance)
  const getPaymentDuration = (linkedInvoice: any) => {
    if (!linkedInvoice) return '—';
    const d = linkedInvoice.date;
    const due = linkedInvoice.dueDate || linkedInvoice.due_date;
    if (!d || !due) return '—';
    const days = Math.round((new Date(due).getTime() - new Date(d).getTime()) / 86400000);
    return days >= 0 ? `${days}j` : '—';
  };

  // Traductions statuts en français
  const statusFR: Record<string, string> = {
    PAID: 'Payée',
    SENT: 'Envoyée',
    OVERDUE: 'En retard',
    DRAFT: 'Brouillon',
    CANCELLED: 'Annulée',
    PARTIALLY_PAID: 'Part. payée',
    PARTIAL: 'Part. payée',
    PENDING: 'En attente',
    ACCEPTED: 'Accepté',
    REJECTED: 'Refusé',
    EXPIRED: 'Expiré',
  };

  // Véhicule par plaque
  const getVehicleByPlate = (plate?: string) =>
    plate ? vehicles.find((v) => v.licensePlate === plate || (v as any).license_plate === plate) : undefined;

  // Construction InvoiceData pour génération PDF
  const buildClientDocData = (doc: any): InvoiceData => {
    const plate = doc.license_plate || doc.licensePlate;
    const docItems = (doc.items || []).map((line: any) => ({
      description: line.description || '',
      quantity: Number(line.quantity) || 1,
      price: Number(line.price || line.unit_price) || 0,
      total: (Number(line.quantity) || 1) * (Number(line.price || line.unit_price) || 0),
    }));
    const total = Math.floor(doc.amount_ttc || doc.amountTTC || doc.amount || 0);
    const items =
      docItems.length > 0
        ? docItems
        : [{ description: doc.subject || 'Abonnement GPS', quantity: 1, price: total, total }];
    const subtotal = items.reduce((s: number, i: any) => s + i.total, 0);
    const taxRate = doc.vat_rate || doc.vatRate || 0;
    const taxAmount = doc.tax_amount || doc.taxAmount || Math.round((subtotal * taxRate) / 100);
    return {
      number: doc.number || doc.invoice_number || doc.quote_number || doc.id || '',
      date: doc.date ? new Date(doc.date).toISOString() : new Date().toISOString(),
      dueDate:
        doc.dueDate || doc.due_date || doc.validUntil
          ? new Date(doc.dueDate || doc.due_date || doc.validUntil).toISOString()
          : new Date().toISOString(),
      client: { name: doc.client_name || doc.clientName || _user?.email || '' },
      items,
      subtotal,
      taxRate,
      taxAmount,
      total,
      status: doc.status,
      notes: doc.notes,
      meta: { licensePlate: plate, contractId: doc.contract_id || doc.contractId },
    };
  };

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const tabs = [
    { id: 'subscriptions', label: 'Mes abonnements', icon: FileText },
    { id: 'interventions', label: 'Mes interventions', icon: Wrench },
    { id: 'requests', label: 'Mes demandes', icon: ClipboardList },
    { id: 'tickets', label: 'Mes tickets', icon: Ticket },
    { id: 'invoices', label: 'Mes factures', icon: FileBarChart },
    { id: 'quotes', label: 'Mes devis', icon: FileDown },
    { id: 'payments', label: 'Mes paiements', icon: Receipt },
  ];

  // Contract Detail Modal State
  const [viewingContract, setViewingContract] = useState<Contract | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Ticket detail panel state
  const [selectedTicket, setSelectedTicket] = useState<TicketType | null>(null);
  const [ticketMessages, setTicketMessages] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  const openTicketDetail = (ticket: TicketType) => {
    setSelectedTicket(ticket);
    setTicketMessages(ticket.messages || []);
  };

  const handleSendReply = async () => {
    if (!selectedTicket || !replyText.trim()) return;
    setSendingReply(true);
    try {
      const msg = await api.tickets.clientReply(selectedTicket.id, replyText);
      setTicketMessages((prev) => [...prev, msg]);
      setReplyText('');
    } catch {
      showToast("Erreur lors de l'envoi", 'error');
    } finally {
      setSendingReply(false);
    }
  };

  // Subscription Detail Modal State
  const [clientSubscriptions, setClientSubscriptions] = useState<any[]>([]);
  const [selectedSub, setSelectedSub] = useState<any | null>(null);
  const [loadingSubs, setLoadingSubs] = useState(false);

  // Fetch subscriptions for the client
  React.useEffect(() => {
    const fetchSubs = async () => {
      if (activeTab === 'subscriptions') {
        setLoadingSubs(true);
        try {
          const data = await api.subscriptions.list();
          // Filter by user's clientId if available
          const filtered = _user?.clientId
            ? data.filter((s: any) => s.client_id === _user.clientId || s.clientId === _user.clientId)
            : data;
          setClientSubscriptions(filtered);
        } catch (error) {
          logger.error('Error fetching subscriptions:', error);
        } finally {
          setLoadingSubs(false);
        }
      }
    };
    fetchSubs();
  }, [activeTab, _user?.clientId]);

  // Filter receipts (payments confirmés)
  const filteredReceipts = payments.filter((p) => {
    const matchesSearch =
      p.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.reference?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch && matchesPeriod(p.date);
  });

  // Filter abonnements — sur clientSubscriptions (source réelle)
  const filteredSubscriptions = clientSubscriptions.filter((sub: any) => {
    const s = searchTerm.toLowerCase();
    const veh = getVehicle(sub.vehicle_id || sub.vehicleId);
    const matchesSearch =
      !s ||
      (sub.vehicle_plate || sub.vehiclePlate || '').toLowerCase().includes(s) ||
      (sub.contract_number || '').toLowerCase().includes(s) ||
      (sub.vehicle_name || '').toLowerCase().includes(s) ||
      (sub.id || '').toLowerCase().includes(s);
    const matchesStatus = statusFilter === 'ALL' || sub.status === statusFilter;
    const matchesBranch = branchFilter === 'ALL' || veh?.branchId === branchFilter;
    return matchesSearch && matchesStatus && matchesBranch;
  });

  // Filter data based on search term and status (autres onglets)
  const filteredContracts = contracts.filter((c) => {
    const matchesSearch =
      (c.subscriptionNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.contractNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.status.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredInterventions = interventions.filter((i) => {
    const matchesSearch =
      i.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.nature.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.status.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || i.status === statusFilter;
    return matchesSearch && matchesStatus && matchesPeriod(i.scheduledDate);
  });

  const filteredTickets = tickets.filter((t) => {
    const isServiceReq = (t.category || '').toLowerCase() === 'services';
    if (activeTab === 'tickets' && isServiceReq) return false;
    if (activeTab === 'requests' && !isServiceReq) return false;
    const matchesSearch =
      t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.status.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    return matchesSearch && matchesStatus && matchesPeriod(t.createdAt);
  });

  const {
    sortedItems: sortedContracts,
    sortConfig: contractSortConfig,
    handleSort: handleContractSort,
  } = useTableSort(filteredSubscriptions, { key: 'start_date', direction: 'desc' });
  const {
    sortedItems: sortedInterventions,
    sortConfig: interventionSortConfig,
    handleSort: handleInterventionSort,
  } = useTableSort(filteredInterventions, { key: 'scheduledDate', direction: 'desc' });
  const TICKET_SORT_ACCESSORS: Record<string, (t: TicketType) => string | number | Date | undefined> = {
    lastUpdate: (t) => t.updatedAt,
  };
  const {
    sortedItems: sortedTickets,
    sortConfig: ticketSortConfig,
    handleSort: handleTicketSort,
  } = useTableSort(filteredTickets, { key: 'lastUpdate', direction: 'desc' }, TICKET_SORT_ACCESSORS);
  const {
    sortedItems: sortedReceipts,
    sortConfig: receiptSortConfig,
    handleSort: handleReceiptSort,
  } = useTableSort(filteredReceipts, { key: 'date', direction: 'desc' });

  const filteredInvoices = clientInvoices.filter((inv: any) => {
    const s = searchTerm.toLowerCase();
    return (
      !s ||
      (inv.number || '').toLowerCase().includes(s) ||
      (inv.subject || '').toLowerCase().includes(s) ||
      (inv.license_plate || inv.licensePlate || '').toLowerCase().includes(s)
    );
  });
  const { sortedItems: sortedInvoices } = useTableSort(filteredInvoices, { key: 'date', direction: 'desc' });

  const filteredQuotes = clientQuotes.filter((q: any) => {
    const s = searchTerm.toLowerCase();
    return !s || (q.number || '').toLowerCase().includes(s) || (q.subject || '').toLowerCase().includes(s);
  });
  const { sortedItems: sortedQuotes } = useTableSort(filteredQuotes, { key: 'date', direction: 'desc' });

  // Reset page when tab, search or filter changes
  React.useEffect(() => {
    setCurrentPage(1);
    setBranchFilter('ALL');
  }, [activeTab, searchTerm, statusFilter]);

  const getPaginatedItems = (items: any[]) => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return items.slice(startIndex, startIndex + itemsPerPage);
  };

  const STATUS_LABELS: Record<'contract' | 'intervention' | 'ticket', Record<string, string>> = {
    contract: {
      ACTIVE: 'Actif',
      INACTIVE: 'Inactif',
      EXPIRED: 'Expiré',
      TERMINATED: 'Résilié',
      CANCELLED: 'Résilié',
      SUSPENDED: 'Suspendu',
    },
    intervention: {
      SCHEDULED: 'Planifiée',
      PENDING: 'En attente',
      IN_PROGRESS: 'En cours',
      EN_ROUTE: 'En route',
      COMPLETED: 'Terminée',
      CANCELLED: 'Annulée',
    },
    ticket: {
      OPEN: 'Ouvert',
      IN_PROGRESS: 'En cours',
      WAITING_CLIENT: 'En attente',
      RESOLVED: 'Résolu',
      CLOSED: 'Fermé',
    },
  };

  const renderStatusBadge = (status: string, type: 'contract' | 'intervention' | 'ticket') => {
    let colorClass = 'bg-[var(--bg-elevated)] text-[var(--text-secondary)]';

    if (type === 'contract') {
      if (status === 'ACTIVE') colorClass = 'bg-green-100 text-green-700';
      if (status === 'EXPIRED') colorClass = 'bg-red-100 text-red-700';
      if (status === 'TERMINATED') colorClass = 'bg-[var(--bg-elevated)] text-[var(--text-primary)]';
    } else if (type === 'intervention') {
      if (status === 'COMPLETED') colorClass = 'bg-green-100 text-green-700';
      if (status === 'SCHEDULED') colorClass = 'bg-[var(--primary-dim)] text-[var(--primary)]';
      if (status === 'PENDING') colorClass = 'bg-yellow-100 text-yellow-700';
      if (status === 'CANCELLED') colorClass = 'bg-red-100 text-red-700';
    } else if (type === 'ticket') {
      if (status === 'RESOLVED' || status === 'CLOSED') colorClass = 'bg-green-100 text-green-700';
      if (status === 'OPEN') colorClass = 'bg-red-100 text-red-700';
      if (status === 'IN_PROGRESS') colorClass = 'bg-[var(--primary-dim)] text-[var(--primary)]';
      if (status === 'WAITING_CLIENT') colorClass = 'bg-yellow-100 text-yellow-700';
    }

    const label = STATUS_LABELS[type][status] || status;
    return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${colorClass}`}>{label}</span>;
  };

  if (!_user?.clientId && _user?.role !== 'CLIENT') {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center space-y-4 min-h-[400px]">
        <div className="p-4 bg-[var(--clr-warning-dim)] rounded-full">
          <AlertCircle className="w-12 h-12 text-[var(--clr-warning)]" />
        </div>
        <h3 className="page-title">Espace réservé aux clients</h3>
        <p className="text-[var(--text-secondary)] max-w-md">
          Cette section est dédiée au suivi des opérations personnelles des clients. En tant que gestionnaire, vous
          pouvez accéder à toutes les données centralisées dans les modules respectifs (CRM, Ventes, Support).
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="page-title">Mes Opérations</h2>
          <p className="text-[var(--text-secondary)]">Abonnements, interventions, demandes, tickets, facturation</p>
        </div>
        <div className="flex gap-2">
          {(activeTab === 'tickets' || activeTab === 'requests') && (
            <button
              onClick={() => setIsTicketModalOpen(true)}
              className="px-4 py-2 bg-[var(--primary)] hover:bg-[var(--primary-light)] text-white rounded-lg transition-colors flex items-center gap-2 text-sm font-medium shadow-sm"
            >
              {activeTab === 'requests' ? (
                <>
                  <ClipboardList className="w-4 h-4" /> Nouvelle demande
                </>
              ) : (
                <>
                  <Ticket className="w-4 h-4" /> Nouveau ticket
                </>
              )}
            </button>
          )}
          <button
            onClick={() => {
              let data: string[] = [];
              let filename = '';

              if (activeTab === 'subscriptions') {
                data = [
                  'Plaque;N° Contrat;Branche;Installation;Échéance;Proch. Fact.;Montant;Statut;Nb Factures;Impayés',
                  ...sortedContracts.map((sub: any) => {
                    const veh = getVehicle(sub.vehicle_id || sub.vehicleId);
                    return [
                      sub.vehicle_plate || sub.vehiclePlate || '',
                      sub.contract_number || '',
                      getBranchName(veh?.branchId),
                      veh?.installDate ? new Date(veh.installDate).toLocaleDateString('fr-FR') : '',
                      sub.end_date ? new Date(sub.end_date).toLocaleDateString('fr-FR') : '',
                      sub.next_billing_date ? new Date(sub.next_billing_date).toLocaleDateString('fr-FR') : '',
                      Math.floor(sub.monthly_fee || 0),
                      sub.status,
                      getSubInvoices(sub).length,
                      getSubUnpaid(sub),
                    ].join(';');
                  }),
                ];
                filename = 'mes_abonnements';
              } else if (activeTab === 'interventions') {
                data = [
                  'ID;Nature;Date;Technicien;Lieu;Statut',
                  ...filteredInterventions.map(
                    (i) =>
                      `${i.id};${i.nature};${new Date(i.scheduledDate).toLocaleDateString('fr-FR')};${i.technicianId};${i.location};${i.status}`
                  ),
                ];
                filename = 'mes_interventions';
              } else if (activeTab === 'tickets' || activeTab === 'requests') {
                data = [
                  'ID;Sujet;Catégorie;Priorité;Statut',
                  ...filteredTickets.map((t) => `${t.id};${t.subject};${t.category};${t.priority};${t.status}`),
                ];
                filename = activeTab === 'requests' ? 'mes_demandes' : 'mes_tickets';
              } else if (activeTab === 'payments') {
                data = [
                  'Référence;Date;Montant;Mode;Facture',
                  ...filteredReceipts.map(
                    (p) =>
                      `${p.reference || p.id};${new Date(p.date).toLocaleDateString('fr-FR')};${p.amount};${p.method};${invoices.find((inv) => inv.id === p.invoiceId)?.number || '-'}`
                  ),
                ];
                filename = 'mes_paiements';
              }

              const csvContent = 'data:text/csv;charset=utf-8,' + data.join('\n');
              const link = document.createElement('a');
              link.setAttribute('href', encodeURI(csvContent));
              link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              showToast(TOAST.IO.EXPORT_SUCCESS('CSV'), 'success');
            }}
            className="px-4 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] transition-colors flex items-center gap-2 text-sm font-medium"
          >
            <Download className="w-4 h-4" /> Exporter
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-[var(--bg-elevated)] rounded-xl border border-[var(--border)] shadow-sm overflow-hidden">
        {/* Tabs & Toolbar */}
        <div className="border-b border-[var(--border)] p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex p-1 bg-[var(--bg-elevated)] bg-[var(--bg-surface)] rounded-lg w-full sm:w-auto overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as OperationTab)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex-1 sm:flex-none whitespace-nowrap ${activeTab === tab.id ? 'bg-[var(--bg-elevated)] text-[var(--primary)] dark:text-[var(--primary)] shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Filtre statut — masqué pour paiements (pas de statut applicable) */}
            {activeTab !== 'payments' && (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                title="Filtrer par statut"
                className="pl-3 pr-8 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg text-sm focus:ring-2 focus:ring-[var(--primary)] outline-none appearance-none cursor-pointer"
              >
                <option value="ALL">Tous les statuts</option>
                {activeTab === 'subscriptions' && (
                  <>
                    <option value="ACTIVE">Actif</option>
                    <option value="INACTIVE">Inactif</option>
                    <option value="CANCELLED">Résilié</option>
                    <option value="EXPIRED">Expiré</option>
                    <option value="SUSPENDED">Suspendu</option>
                  </>
                )}
                {activeTab === 'interventions' && (
                  <>
                    <option value="SCHEDULED">Planifié</option>
                    <option value="IN_PROGRESS">En cours</option>
                    <option value="COMPLETED">Terminé</option>
                    <option value="CANCELLED">Annulé</option>
                  </>
                )}
                {(activeTab === 'tickets' || activeTab === 'requests') && (
                  <>
                    <option value="OPEN">Ouvert</option>
                    <option value="IN_PROGRESS">En cours</option>
                    <option value="RESOLVED">Résolu</option>
                    <option value="CLOSED">Fermé</option>
                  </>
                )}
                {activeTab === 'invoices' && (
                  <>
                    <option value="PAID">Payée</option>
                    <option value="SENT">Envoyée</option>
                    <option value="PENDING">En attente</option>
                    <option value="OVERDUE">En retard</option>
                    <option value="PARTIALLY_PAID">Partiellement payée</option>
                    <option value="DRAFT">Brouillon</option>
                    <option value="CANCELLED">Annulée</option>
                  </>
                )}
                {activeTab === 'quotes' && (
                  <>
                    <option value="ACCEPTED">Accepté</option>
                    <option value="SENT">Envoyé</option>
                    <option value="DRAFT">Brouillon</option>
                    <option value="EXPIRED">Expiré</option>
                    <option value="REJECTED">Refusé</option>
                  </>
                )}
              </select>
            )}

            {/* Filtre période — interventions / tickets / demandes / paiements */}
            {['interventions', 'tickets', 'requests', 'payments'].includes(activeTab) && (
              <select
                value={periodFilter}
                onChange={(e) => setPeriodFilter(e.target.value as typeof periodFilter)}
                title="Filtrer par période"
                className="pl-3 pr-8 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg text-sm focus:ring-2 focus:ring-[var(--primary)] outline-none appearance-none cursor-pointer"
              >
                <option value="ALL">Toutes périodes</option>
                <option value="7D">7 derniers jours</option>
                <option value="30D">30 derniers jours</option>
                <option value="90D">90 derniers jours</option>
                <option value="365D">12 derniers mois</option>
              </select>
            )}

            {/* Filtre branche — uniquement onglet abonnements */}
            {activeTab === 'subscriptions' && (branches as any[]).length > 0 && (
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                title="Filtrer par branche"
                className="pl-3 pr-8 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg text-sm focus:ring-2 focus:ring-[var(--primary)] outline-none appearance-none cursor-pointer"
              >
                <option value="ALL">Toutes les branches</option>
                {(branches as any[]).map((b: any) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            )}

            {/* Recherche */}
            <div className="relative flex-1 min-w-[160px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg text-sm focus:ring-2 focus:ring-[var(--primary)] outline-none"
              />
            </div>
          </div>
        </div>

        {/* Table Content */}
        {/* Cards Content */}
        <div className="p-4 sm:p-6 bg-[var(--bg-elevated)]/50 bg-[var(--bg-surface)]/50">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Abonnements — mini dashboard + liste */}
            {activeTab === 'subscriptions' && (
              <div className="lg:col-span-3 space-y-4">
                {/* Mini dashboard — toujours visible */}
                {!loadingSubs &&
                  (() => {
                    const now = new Date();
                    const in30 = new Date(now.getTime() + 30 * 86400000);
                    const actifs = clientSubscriptions.filter((s: any) => s.status === 'ACTIVE').length;
                    const expires = clientSubscriptions.filter((s: any) =>
                      ['EXPIRED', 'CANCELLED', 'INACTIVE'].includes(s.status)
                    ).length;
                    const totalImpaye = clientSubscriptions.reduce((sum: number, s: any) => sum + getSubUnpaid(s), 0);
                    const renewals30 = clientSubscriptions.filter((s: any) => {
                      const nextBill = s.next_billing_date || s.nextBillingDate;
                      if (!nextBill) return false;
                      const d = new Date(nextBill);
                      return d >= now && d <= in30;
                    }).length;
                    return (
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        {[
                          {
                            label: 'Total balises',
                            count: clientSubscriptions.length,
                            color: 'bg-[var(--primary-dim)] text-[var(--primary)]',
                            icon: FileText,
                            fmt: false,
                          },
                          {
                            label: 'Actifs',
                            count: actifs,
                            color: 'bg-green-100 text-green-600',
                            icon: CheckCircle2,
                            fmt: false,
                          },
                          {
                            label: 'Expirés / Résiliés',
                            count: expires,
                            color: 'bg-red-100 text-red-600',
                            icon: AlertTriangle,
                            fmt: false,
                          },
                          {
                            label: 'Renouvellements 30j',
                            count: renewals30,
                            color: 'bg-blue-100 text-blue-600',
                            icon: Calendar,
                            fmt: false,
                          },
                          {
                            label: 'Impayés',
                            count: totalImpaye,
                            color: 'bg-orange-100 text-orange-600',
                            icon: Receipt,
                            fmt: true,
                          },
                        ].map(({ label, count, color, icon: Icon, fmt }) => (
                          <div
                            key={label}
                            className="bg-[var(--bg-elevated)] rounded-xl p-3 border border-[var(--border)] flex items-center gap-3"
                          >
                            <div className={`p-2 rounded-lg ${color}`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-[10px] text-[var(--text-secondary)] uppercase font-semibold">
                                {label}
                              </p>
                              <p className="text-lg font-black text-[var(--text-primary)]">
                                {fmt ? count.toLocaleString('fr-FR') : count}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}

                {/* Table */}
                <div className="bg-[var(--bg-elevated)] rounded-xl border border-[var(--border)] overflow-hidden">
                  <div className="hidden md:grid grid-cols-[80px_140px_1fr_80px_80px_80px_70px_65px_65px_70px_75px] gap-2 px-4 py-2 bg-[var(--bg-surface)] border-b border-[var(--border)] text-[10px] font-semibold uppercase text-[var(--text-muted)]">
                    <div>Plaque</div>
                    <div>N° Contrat</div>
                    <div>Branche</div>
                    <div>Installation</div>
                    <div>Échéance</div>
                    <div>Proch. fact.</div>
                    <div>Montant</div>
                    <div>Durée</div>
                    <div>Nb Fact.</div>
                    <div>Impayés</div>
                    <div>Statut</div>
                  </div>
                  <div className="divide-y divide-[var(--border)]">
                    {loadingSubs && (
                      <div className="flex justify-center py-10">
                        <div className="w-6 h-6 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                    {!loadingSubs && sortedContracts.length === 0 && (
                      <div className="text-center py-10">
                        <FileText className="w-10 h-10 mx-auto mb-3 text-[var(--text-muted)]" />
                        <p className="font-semibold text-[var(--text-primary)]">Aucun abonnement trouvé</p>
                        <p className="text-sm text-[var(--text-secondary)]">Modifiez vos filtres ou votre recherche</p>
                      </div>
                    )}
                    {getPaginatedItems(sortedContracts).map((sub: any) => {
                      const veh = getVehicle(sub.vehicle_id || sub.vehicleId);
                      const branchName = getBranchName(veh?.branchId);
                      const installDate = veh?.installDate || sub.install_date;
                      const echeance = sub.end_date || sub.endDate;
                      const nextBilling = sub.next_billing_date || sub.nextBillingDate;
                      const montant = Math.floor(sub.monthly_fee || sub.monthlyFee || 0).toLocaleString('fr-FR');
                      const duree = getSubDuration(sub);
                      const nbFact = getSubInvoices(sub).length;
                      const impaye = getSubUnpaid(sub);
                      return (
                        <div
                          key={sub.id}
                          onClick={() => setSelectedSub(sub)}
                          className="grid grid-cols-1 md:grid-cols-[80px_140px_1fr_80px_80px_80px_70px_65px_65px_70px_75px] gap-2 items-center px-4 py-3 hover:bg-[var(--bg-surface)] transition-colors cursor-pointer"
                        >
                          <span className="font-mono text-xs font-bold text-[var(--primary)] bg-[var(--primary-dim)] px-2 py-0.5 rounded w-fit">
                            {sub.vehicle_plate || sub.vehiclePlate || '—'}
                          </span>
                          <span className="font-mono text-xs text-[var(--text-secondary)] truncate">
                            {sub.contract_number || '—'}
                          </span>
                          <div className="hidden md:flex items-center gap-1 text-xs text-[var(--text-secondary)]">
                            <Building2 className="w-3 h-3 text-[var(--text-muted)] flex-shrink-0" />
                            <span className="truncate text-[10px]">{branchName}</span>
                          </div>
                          <span className="hidden md:block text-[10px] text-[var(--text-secondary)]">
                            {installDate ? new Date(installDate).toLocaleDateString('fr-FR') : '—'}
                          </span>
                          <span
                            className={`hidden md:block text-[10px] font-medium ${echeance && new Date(echeance) < new Date() ? 'text-red-500 font-bold' : 'text-[var(--text-secondary)]'}`}
                          >
                            {echeance ? new Date(echeance).toLocaleDateString('fr-FR') : '—'}
                          </span>
                          <span className="hidden md:block text-[10px] text-[var(--primary)] font-semibold">
                            {nextBilling ? new Date(nextBilling).toLocaleDateString('fr-FR') : '—'}
                          </span>
                          <span className="text-xs font-bold text-[var(--text-primary)]">{montant}</span>
                          <span className="hidden md:block text-[10px] text-center font-mono text-[var(--text-secondary)]">
                            {duree}
                          </span>
                          <span className="hidden md:block text-[10px] text-center font-mono text-[var(--text-secondary)]">
                            {nbFact}
                          </span>
                          <span
                            className={`hidden md:block text-[10px] font-bold ${impaye > 0 ? 'text-red-500' : 'text-[var(--text-muted)]'}`}
                          >
                            {impaye > 0 ? impaye.toLocaleString('fr-FR') : '0'}
                          </span>
                          {renderStatusBadge(sub.status, 'contract')}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Interventions — mini dashboard + cartes */}
            {activeTab === 'interventions' && (
              <div className="lg:col-span-3 space-y-4">
                {/* Mini dashboard (toujours visible, affiche 0 si aucune intervention) */}
                {(() => {
                  const planifiees = filteredInterventions.filter((i) => i.status === 'SCHEDULED').length;
                  const enCours = filteredInterventions.filter((i) =>
                    ['IN_PROGRESS', 'EN_ROUTE'].includes(i.status)
                  ).length;
                  const terminees = filteredInterventions.filter((i) => i.status === 'COMPLETED').length;
                  const annulees = filteredInterventions.filter((i) => i.status === 'CANCELLED').length;
                  return (
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      {[
                        {
                          label: 'Total',
                          count: filteredInterventions.length,
                          color: 'bg-[var(--primary-dim)] text-[var(--primary)]',
                          icon: Wrench,
                        },
                        {
                          label: 'Planifiées',
                          count: planifiees,
                          color: 'bg-blue-100 text-blue-600',
                          icon: Calendar,
                        },
                        { label: 'En cours', count: enCours, color: 'bg-yellow-100 text-yellow-600', icon: Clock },
                        {
                          label: 'Terminées',
                          count: terminees,
                          color: 'bg-green-100 text-green-600',
                          icon: CheckCircle2,
                        },
                        { label: 'Annulées', count: annulees, color: 'bg-red-100 text-red-600', icon: AlertTriangle },
                      ].map(({ label, count, color, icon: Icon }) => (
                        <div
                          key={label}
                          className="bg-[var(--bg-elevated)] rounded-xl p-3 border border-[var(--border)] flex items-center gap-3"
                        >
                          <div className={`p-2 rounded-lg ${color}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-[10px] text-[var(--text-secondary)] uppercase font-semibold">{label}</p>
                            <p className="text-lg font-black text-[var(--text-primary)]">{count}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
                {/* Cartes interventions */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {getPaginatedItems(sortedInterventions).map((intervention) => {
                    const vehicle = vehicles.find((v) => v.id === intervention.vehicleId);
                    return (
                      <div
                        key={intervention.id}
                        className="bg-[var(--bg-elevated)] rounded-2xl p-5 border border-[var(--border)] shadow-sm hover:shadow-md transition-all border-l-4 border-l-blue-500"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div className="bg-[var(--bg-elevated)] p-2 rounded-lg">
                            <Wrench className="w-5 h-5 text-[var(--primary)]" />
                          </div>
                          {renderStatusBadge(intervention.status, 'intervention')}
                        </div>
                        <h4 className="text-base font-bold text-[var(--text-primary)] mb-1 line-clamp-1">
                          {intervention.nature}
                        </h4>
                        <div className="flex items-center gap-2 mb-4">
                          <Tag className="w-3 h-3 text-[var(--text-muted)]" />
                          <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase">
                            {intervention.interventionType || 'Standard'}
                          </span>
                        </div>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                              <Clock className="w-4 h-4 text-[var(--text-muted)]" />
                              <span className="text-sm font-medium">
                                {new Date(intervention.scheduledDate).toLocaleDateString('fr-FR')}
                              </span>
                            </div>
                            <span className="text-xs font-mono font-bold bg-[var(--bg-elevated)] px-2 py-1 rounded">
                              {(intervention as any).vehiclePlate || vehicle?.licensePlate || '-'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                            <MapPin className="w-4 h-4 text-[var(--text-muted)]" />
                            <span className="text-sm truncate">{intervention.location}</span>
                          </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-[var(--border)] flex justify-end">
                          <button className="text-[var(--primary)] text-sm font-semibold flex items-center gap-1 hover:gap-2 transition-all">
                            Détails <ArrowRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tickets / Demandes — mini dashboard + table pleine largeur */}
            {(activeTab === 'tickets' || activeTab === 'requests') && (
              <div className="lg:col-span-3 space-y-4">
                {/* Mini dashboard tickets */}
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                  {[
                    {
                      label: 'Total',
                      count: filteredTickets.length,
                      color: 'bg-[var(--primary-dim)] text-[var(--primary)]',
                      icon: Ticket,
                    },
                    {
                      label: 'Ouverts',
                      count: filteredTickets.filter((t) => t.status === 'OPEN').length,
                      color: 'bg-red-100 text-red-600',
                      icon: AlertTriangle,
                    },
                    {
                      label: 'En attente',
                      count: filteredTickets.filter((t) => t.status === 'WAITING_CLIENT').length,
                      color: 'bg-yellow-100 text-yellow-600',
                      icon: Clock,
                    },
                    {
                      label: 'En cours',
                      count: filteredTickets.filter((t) => t.status === 'IN_PROGRESS').length,
                      color: 'bg-blue-100 text-blue-600',
                      icon: Info,
                    },
                    {
                      label: 'Résolus',
                      count: filteredTickets.filter((t) => t.status === 'RESOLVED').length,
                      color: 'bg-green-100 text-green-600',
                      icon: CheckCircle2,
                    },
                    {
                      label: 'Fermés',
                      count: filteredTickets.filter((t) => t.status === 'CLOSED').length,
                      color: 'bg-[var(--bg-elevated)] text-[var(--text-secondary)]',
                      icon: CheckCircle2,
                    },
                  ].map(({ label, count, color, icon: Icon }) => (
                    <div
                      key={label}
                      className="bg-[var(--bg-elevated)] rounded-xl p-3 border border-[var(--border)] flex items-center gap-3"
                    >
                      <div className={`p-2 rounded-lg ${color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[10px] text-[var(--text-secondary)] uppercase font-semibold">{label}</p>
                        <p className="text-xl font-black text-[var(--text-primary)]">{count}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Table tickets */}
                <div className="bg-[var(--bg-elevated)] rounded-xl border border-[var(--border)] overflow-hidden">
                  {/* Header */}
                  <div className="hidden sm:grid grid-cols-[4px_1fr_140px_100px_120px_100px_100px_80px] gap-3 px-4 py-2 bg-[var(--bg-surface)] border-b border-[var(--border)] text-[10px] font-semibold uppercase text-[var(--text-muted)]">
                    <div />
                    <div>Sujet</div>
                    <div>Catégorie</div>
                    <div>Plaque</div>
                    <div>Statut</div>
                    <div>Créé le</div>
                    <div>Résolu le</div>
                    <div />
                  </div>

                  {/* Rows */}
                  <div className="divide-y divide-[var(--border)]">
                    {getPaginatedItems(sortedTickets).map((ticket) => {
                      const priorityColor =
                        ticket.priority === 'CRITICAL'
                          ? 'bg-red-500'
                          : ticket.priority === 'HIGH'
                            ? 'bg-orange-500'
                            : ticket.priority === 'MEDIUM'
                              ? 'bg-yellow-400'
                              : 'bg-[var(--border)]';
                      return (
                        <div
                          key={ticket.id}
                          onClick={() => openTicketDetail(ticket)}
                          className="grid grid-cols-1 sm:grid-cols-[4px_1fr_140px_100px_120px_100px_100px_80px] gap-3 items-center px-4 py-3 hover:bg-[var(--bg-surface)] transition-colors cursor-pointer group"
                        >
                          {/* Priorité */}
                          <div className={`hidden sm:block w-1 self-stretch rounded-full ${priorityColor}`} />

                          {/* Sujet */}
                          <div className="min-w-0">
                            <p className="font-semibold text-sm text-[var(--text-primary)] truncate group-hover:text-[var(--primary)] transition-colors">
                              {ticket.subject}
                            </p>
                            <p className="text-[11px] text-[var(--text-muted)] truncate">
                              {ticket.description?.slice(0, 60) || '—'}
                            </p>
                          </div>

                          {/* Catégorie */}
                          <div className="hidden sm:block">
                            <span className="text-[11px] bg-[var(--bg-surface)] px-2 py-0.5 rounded font-medium text-[var(--text-secondary)] truncate block">
                              {ticket.category || '—'}
                            </span>
                          </div>

                          {/* Plaque */}
                          <div className="hidden sm:block">
                            <span className="text-[11px] font-mono bg-[var(--bg-surface)] px-2 py-0.5 rounded text-[var(--text-secondary)]">
                              {ticket.vehiclePlate || '—'}
                            </span>
                          </div>

                          {/* Statut */}
                          <div>{renderStatusBadge(ticket.status, 'ticket')}</div>

                          {/* Créé le */}
                          <div className="hidden sm:block text-[11px] text-[var(--text-secondary)]">
                            {new Date(ticket.createdAt).toLocaleDateString('fr-FR')}
                          </div>

                          {/* Résolu le */}
                          <div className="hidden sm:block text-[11px]">
                            {ticket.resolvedAt ? (
                              <span className="text-green-600">
                                {new Date(ticket.resolvedAt).toLocaleDateString('fr-FR')}
                              </span>
                            ) : (
                              <span className="text-[var(--text-muted)]">—</span>
                            )}
                          </div>

                          {/* Action */}
                          <div className="flex justify-end">
                            <button className="flex items-center gap-1 text-[11px] text-[var(--primary)] font-semibold hover:underline">
                              Voir <ChevronRight className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {filteredTickets.length === 0 && (
                      <div className="text-center py-12">
                        {activeTab === 'requests' ? (
                          <ClipboardList className="w-10 h-10 mx-auto mb-3 text-[var(--text-muted)]" />
                        ) : (
                          <Ticket className="w-10 h-10 mx-auto mb-3 text-[var(--text-muted)]" />
                        )}
                        <p className="font-semibold text-[var(--text-primary)]">
                          {activeTab === 'requests' ? 'Aucune demande' : 'Aucun ticket'}
                        </p>
                        <p className="text-sm text-[var(--text-secondary)]">
                          {activeTab === 'requests'
                            ? 'Demandez un service à tout moment.'
                            : "Besoin d'aide ? Créez un ticket."}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Paiements — liste */}
            {activeTab === 'payments' && (
              <div className="lg:col-span-3 space-y-4">
                {/* Mini dashboard paiements — toujours visible */}
                {(() => {
                  const totalMontant = sortedReceipts.reduce((s: number, p: any) => s + Math.floor(p.amount || 0), 0);
                  const parMobileMoney = sortedReceipts.filter((p: any) => p.method === 'MOBILE_MONEY').length;
                  const parVirement = sortedReceipts.filter((p: any) => p.method === 'BANK_TRANSFER').length;
                  const parCheque = sortedReceipts.filter((p: any) => p.method === 'CHECK').length;
                  const parEspeces = sortedReceipts.filter(
                    (p: any) => !['MOBILE_MONEY', 'BANK_TRANSFER', 'CHECK'].includes(p.method || '')
                  ).length;
                  return (
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      {[
                        {
                          label: 'Total encaissé',
                          count: totalMontant,
                          color: 'bg-green-100 text-green-600',
                          icon: Wallet,
                          fmt: true,
                        },
                        {
                          label: 'Nb paiements',
                          count: sortedReceipts.length,
                          color: 'bg-[var(--primary-dim)] text-[var(--primary)]',
                          icon: Receipt,
                          fmt: false,
                        },
                        {
                          label: 'Mobile Money',
                          count: parMobileMoney,
                          color: 'bg-blue-100 text-blue-600',
                          icon: Smartphone,
                          fmt: false,
                        },
                        {
                          label: 'Virement',
                          count: parVirement,
                          color: 'bg-purple-100 text-purple-600',
                          icon: Banknote,
                          fmt: false,
                        },
                        {
                          label: 'Espèces / Chèque',
                          count: parEspeces + parCheque,
                          color: 'bg-orange-100 text-orange-600',
                          icon: CreditCard,
                          fmt: false,
                        },
                      ].map(({ label, count, color, icon: Icon, fmt }) => (
                        <div
                          key={label}
                          className="bg-[var(--bg-elevated)] rounded-xl p-3 border border-[var(--border)] flex items-center gap-3"
                        >
                          <div className={`p-2 rounded-lg ${color}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-[10px] text-[var(--text-secondary)] uppercase font-semibold">{label}</p>
                            <p className="text-lg font-black text-[var(--text-primary)]">
                              {fmt ? count.toLocaleString('fr-FR') : count}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
                <div className="bg-[var(--bg-elevated)] rounded-xl border border-[var(--border)] overflow-hidden">
                  <div className="hidden md:grid grid-cols-[130px_85px_100px_80px_110px_85px_85px_60px_200px_44px] gap-2 px-4 py-2 bg-[var(--bg-surface)] border-b border-[var(--border)] text-[10px] font-semibold uppercase text-[var(--text-muted)]">
                    <div>Référence</div>
                    <div>Date paiement</div>
                    <div>Montant</div>
                    <div>Mode</div>
                    <div>N° Facture</div>
                    <div>Plaque</div>
                    <div>Date fact.</div>
                    <div>Durée</div>
                    <div>Branche</div>
                    <div />
                  </div>
                  <div className="divide-y divide-[var(--border)]">
                    {getPaginatedItems(sortedReceipts).map((payment) => {
                      const linkedInvoice = invoices.find((inv) => inv.id === payment.invoiceId);
                      const linkedClientInv = clientInvoices.find(
                        (inv: any) => inv.id === payment.invoiceId || inv.number === linkedInvoice?.number
                      );
                      const MethodIcon =
                        payment.method === 'MOBILE_MONEY'
                          ? Smartphone
                          : payment.method === 'BANK_TRANSFER'
                            ? Wallet
                            : payment.method === 'CHECK'
                              ? Banknote
                              : CreditCard;
                      const branchName = getBranchName(
                        (payment as any).branchId ||
                          (linkedInvoice as any)?.branchId ||
                          (linkedClientInv as any)?.branch_id
                      );
                      const plate =
                        (payment as any).licensePlate ||
                        (payment as any).license_plate ||
                        linkedInvoice?.licensePlate ||
                        (linkedClientInv as any)?.license_plate ||
                        (linkedClientInv as any)?.licensePlate;
                      const factDate = linkedInvoice?.date || (linkedClientInv as any)?.date;
                      const duration = getPaymentDuration(linkedInvoice || linkedClientInv);
                      return (
                        <div
                          key={payment.id}
                          className="grid grid-cols-1 md:grid-cols-[130px_85px_100px_80px_110px_85px_85px_60px_200px_44px] gap-2 items-center px-4 py-3 hover:bg-[var(--bg-surface)] transition-colors"
                        >
                          <span className="font-mono text-xs text-[var(--text-secondary)]">
                            {payment.reference || `REC-${payment.id?.slice(0, 8)}`}
                          </span>
                          <span className="text-xs text-[var(--text-secondary)]">
                            {payment.date ? new Date(payment.date).toLocaleDateString('fr-FR') : '—'}
                          </span>
                          <span className="text-sm font-bold text-[var(--text-primary)]">
                            {Math.floor(payment.amount || 0).toLocaleString('fr-FR')}
                          </span>
                          <div className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
                            <MethodIcon className="w-3 h-3 text-[var(--text-muted)]" />
                            <span className="uppercase text-[10px]">{(payment.method || '').replace(/_/g, ' ')}</span>
                          </div>
                          <span className="font-mono text-xs text-[var(--primary)]">
                            {linkedInvoice?.number || '—'}
                          </span>
                          <span className="font-mono text-[10px] text-[var(--text-secondary)]">{plate || '—'}</span>
                          <span className="hidden md:block text-[10px] text-[var(--text-secondary)]">
                            {factDate ? new Date(factDate).toLocaleDateString('fr-FR') : '—'}
                          </span>
                          <span className="hidden md:block text-[10px] font-mono text-[var(--text-secondary)]">
                            {duration}
                          </span>
                          <div className="hidden md:flex items-center gap-1 text-xs text-[var(--text-secondary)]">
                            <Building2 className="w-3 h-3 text-[var(--text-muted)]" />
                            <span className="truncate text-[10px]">{branchName}</span>
                          </div>
                          <button
                            onClick={() => {
                              const inv = linkedClientInv || linkedInvoice;
                              if (!inv) {
                                showToast('Aucune facture liée', 'error');
                                return;
                              }
                              generateInvoicePDF(
                                buildClientDocData({ ...inv, subject: `Reçu — ${payment.reference || payment.id}` }),
                                { branding: tenantBranding || undefined, type: 'receipt' }
                              );
                            }}
                            className="p-1.5 rounded-lg hover:bg-[var(--primary-dim)] text-[var(--primary)] transition-colors"
                            title="Télécharger reçu"
                          >
                            <FileDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                    {sortedReceipts.length === 0 && (
                      <div className="text-center py-10">
                        <Receipt className="w-10 h-10 mx-auto mb-3 text-[var(--text-muted)]" />
                        <p className="font-semibold text-[var(--text-primary)]">Aucun paiement enregistré</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Factures — liste */}
          {activeTab === 'invoices' && (
            <div className="lg:col-span-3 space-y-4">
              {/* Mini dashboard factures — toujours visible */}
              {!loadingInvoices &&
                (() => {
                  const getAmt = (inv: any) => Math.floor(inv.amount_ttc || inv.amountTTC || inv.amount || 0);
                  const listPayees = sortedInvoices.filter((inv: any) => (inv.status || '').toUpperCase() === 'PAID');
                  const listRetard = sortedInvoices.filter(
                    (inv: any) => (inv.status || '').toUpperCase() === 'OVERDUE'
                  );
                  const listAttente = sortedInvoices.filter((inv: any) =>
                    ['SENT', 'PENDING'].includes((inv.status || '').toUpperCase())
                  );
                  const listImpaye = sortedInvoices.filter((inv: any) =>
                    ['SENT', 'OVERDUE', 'PARTIALLY_PAID', 'PARTIAL', 'PENDING'].includes(
                      (inv.status || '').toUpperCase()
                    )
                  );
                  const totalTTC = sortedInvoices.reduce((s: number, inv: any) => s + getAmt(inv), 0);
                  return (
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      {[
                        {
                          label: 'Total factures',
                          nb: sortedInvoices.length,
                          amount: totalTTC,
                          color: 'bg-[var(--primary-dim)] text-[var(--primary)]',
                          icon: FileBarChart,
                        },
                        {
                          label: 'Payées',
                          nb: listPayees.length,
                          amount: listPayees.reduce((s: number, i: any) => s + getAmt(i), 0),
                          color: 'bg-green-100 text-green-600',
                          icon: CheckCircle2,
                        },
                        {
                          label: 'En retard',
                          nb: listRetard.length,
                          amount: listRetard.reduce((s: number, i: any) => s + getAmt(i), 0),
                          color: 'bg-red-100 text-red-600',
                          icon: AlertTriangle,
                        },
                        {
                          label: 'En attente',
                          nb: listAttente.length,
                          amount: listAttente.reduce((s: number, i: any) => s + getAmt(i), 0),
                          color: 'bg-blue-100 text-blue-600',
                          icon: Clock,
                        },
                        {
                          label: 'Impayés',
                          nb: listImpaye.length,
                          amount: listImpaye.reduce((s: number, i: any) => s + getAmt(i), 0),
                          color: 'bg-orange-100 text-orange-600',
                          icon: Receipt,
                        },
                      ].map(({ label, nb, amount, color, icon: Icon }) => (
                        <div
                          key={label}
                          className="bg-[var(--bg-elevated)] rounded-xl p-3 border border-[var(--border)] flex items-center gap-3"
                        >
                          <div className={`p-2 rounded-lg flex-shrink-0 ${color}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] text-[var(--text-secondary)] uppercase font-semibold truncate">
                              {label}
                            </p>
                            <p className="text-sm font-black text-[var(--text-primary)] leading-tight">
                              {amount.toLocaleString('fr-FR')}
                            </p>
                            <p className="text-[10px] text-[var(--text-muted)]">
                              ({nb} facture{nb > 1 ? 's' : ''})
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              <div className="bg-[var(--bg-elevated)] rounded-xl border border-[var(--border)] overflow-hidden">
                <div className="hidden md:grid grid-cols-[120px_80px_160px_1fr_80px_80px_100px_80px_110px_40px] gap-2 px-4 py-2 bg-[var(--bg-surface)] border-b border-[var(--border)] text-[10px] font-semibold uppercase text-[var(--text-muted)]">
                  <div>N° Facture</div>
                  <div>Plaque</div>
                  <div>Branche</div>
                  <div>Objet</div>
                  <div>Date</div>
                  <div>Échéance</div>
                  <div>Montant TTC</div>
                  <div>Inst.</div>
                  <div>Statut</div>
                  <div />
                </div>
                <div className="divide-y divide-[var(--border)]">
                  {loadingInvoices && (
                    <div className="flex justify-center py-10">
                      <div className="w-6 h-6 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                  {!loadingInvoices &&
                    getPaginatedItems(sortedInvoices).map((inv: any) => {
                      const statusColors: Record<string, string> = {
                        PAID: 'bg-green-100 text-green-700',
                        SENT: 'bg-blue-100 text-blue-700',
                        OVERDUE: 'bg-red-100 text-red-600',
                        DRAFT: 'bg-[var(--bg-elevated)] text-[var(--text-muted)]',
                        CANCELLED: 'bg-[var(--bg-elevated)] text-[var(--text-muted)]',
                        PARTIALLY_PAID: 'bg-orange-100 text-orange-600',
                        PARTIAL: 'bg-orange-100 text-orange-600',
                        PENDING: 'bg-yellow-100 text-yellow-600',
                      };
                      const stKey = (inv.status || '').toUpperCase();
                      const sc = statusColors[stKey] || 'bg-[var(--bg-elevated)] text-[var(--text-secondary)]';
                      const plate = inv.license_plate || inv.licensePlate;
                      const vehByPlate = getVehicleByPlate(plate);
                      const branchId = inv.branch_id || inv.branchId || vehByPlate?.branchId;
                      const branchName = getBranchName(branchId);
                      const installDate = vehByPlate?.installDate || (vehByPlate as any)?.install_date;
                      return (
                        <div
                          key={inv.id}
                          className="grid grid-cols-1 md:grid-cols-[120px_80px_160px_1fr_80px_80px_100px_80px_110px_40px] gap-2 items-center px-4 py-3 hover:bg-[var(--bg-surface)] transition-colors"
                        >
                          <span className="font-mono text-xs font-bold text-[var(--primary)]">
                            {inv.number || inv.invoice_number || '—'}
                          </span>
                          <span className="font-mono text-[10px] text-[var(--text-secondary)]">{plate || '—'}</span>
                          <div className="hidden md:flex items-center gap-1 text-[10px] text-[var(--text-secondary)]">
                            <Building2 className="w-3 h-3 text-[var(--text-muted)] flex-shrink-0" />
                            <span className="truncate">{branchName}</span>
                          </div>
                          <span className="text-xs text-[var(--text-primary)] truncate">{inv.subject || '—'}</span>
                          <span className="text-[10px] text-[var(--text-secondary)]">
                            {inv.date ? new Date(inv.date).toLocaleDateString('fr-FR') : '—'}
                          </span>
                          <span
                            className={`text-[10px] font-medium ${(inv.dueDate || inv.due_date) && new Date(inv.dueDate || inv.due_date) < new Date() && stKey !== 'PAID' ? 'text-red-500' : 'text-[var(--text-secondary)]'}`}
                          >
                            {inv.dueDate || inv.due_date
                              ? new Date(inv.dueDate || inv.due_date).toLocaleDateString('fr-FR')
                              : '—'}
                          </span>
                          <span className="text-sm font-bold text-[var(--text-primary)]">
                            {Math.floor(inv.amount_ttc || inv.amountTTC || inv.amount || 0).toLocaleString('fr-FR')}
                          </span>
                          <span className="hidden md:block text-[10px] text-[var(--text-secondary)]">
                            {installDate ? new Date(installDate).toLocaleDateString('fr-FR') : '—'}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${sc}`}>
                            {statusFR[stKey] || inv.status}
                          </span>
                          <button
                            onClick={() =>
                              generateInvoicePDF(buildClientDocData(inv), {
                                branding: tenantBranding || undefined,
                                type: 'invoice',
                              })
                            }
                            className="p-1.5 rounded-lg hover:bg-[var(--primary-dim)] text-[var(--primary)] transition-colors"
                            title="Télécharger facture"
                          >
                            <FileDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  {!loadingInvoices && sortedInvoices.length === 0 && (
                    <div className="text-center py-10">
                      <FileBarChart className="w-10 h-10 mx-auto mb-3 text-[var(--text-muted)]" />
                      <p className="font-semibold text-[var(--text-primary)]">Aucune facture</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Devis — liste */}
          {activeTab === 'quotes' && (
            <div className="lg:col-span-3 space-y-4">
              {/* Mini dashboard devis — toujours visible */}
              {!loadingQuotes &&
                (() => {
                  const acceptes = sortedQuotes.filter(
                    (q: any) => (q.status || '').toUpperCase() === 'ACCEPTED'
                  ).length;
                  const envoyes = sortedQuotes.filter((q: any) => (q.status || '').toUpperCase() === 'SENT').length;
                  const expires = sortedQuotes.filter((q: any) => (q.status || '').toUpperCase() === 'EXPIRED').length;
                  const totalTTC = sortedQuotes.reduce(
                    (s: number, q: any) => s + Math.floor(q.amount || q.amount_ttc || 0),
                    0
                  );
                  return (
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      {[
                        {
                          label: 'Total devis',
                          count: sortedQuotes.length,
                          color: 'bg-[var(--primary-dim)] text-[var(--primary)]',
                          icon: FileDown,
                          fmt: false,
                        },
                        {
                          label: 'Acceptés',
                          count: acceptes,
                          color: 'bg-green-100 text-green-600',
                          icon: CheckCircle2,
                          fmt: false,
                        },
                        {
                          label: 'Envoyés',
                          count: envoyes,
                          color: 'bg-blue-100 text-blue-600',
                          icon: Send,
                          fmt: false,
                        },
                        {
                          label: 'Expirés',
                          count: expires,
                          color: 'bg-red-100 text-red-600',
                          icon: AlertTriangle,
                          fmt: false,
                        },
                        {
                          label: 'Montant total',
                          count: totalTTC,
                          color: 'bg-orange-100 text-orange-600',
                          icon: Wallet,
                          fmt: true,
                        },
                      ].map(({ label, count, color, icon: Icon, fmt }) => (
                        <div
                          key={label}
                          className="bg-[var(--bg-elevated)] rounded-xl p-3 border border-[var(--border)] flex items-center gap-3"
                        >
                          <div className={`p-2 rounded-lg ${color}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-[10px] text-[var(--text-secondary)] uppercase font-semibold">{label}</p>
                            <p className="text-lg font-black text-[var(--text-primary)]">
                              {fmt ? count.toLocaleString('fr-FR') : count}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              <div className="bg-[var(--bg-elevated)] rounded-xl border border-[var(--border)] overflow-hidden">
                <div className="hidden md:grid grid-cols-[130px_1fr_90px_90px_110px_130px_100px_40px] gap-2 px-4 py-2 bg-[var(--bg-surface)] border-b border-[var(--border)] text-[10px] font-semibold uppercase text-[var(--text-muted)]">
                  <div>N° Devis</div>
                  <div>Objet</div>
                  <div>Date</div>
                  <div>Validité</div>
                  <div>Montant TTC</div>
                  <div>Catégorie</div>
                  <div>Statut</div>
                  <div />
                </div>
                <div className="divide-y divide-[var(--border)]">
                  {loadingQuotes && (
                    <div className="flex justify-center py-10">
                      <div className="w-6 h-6 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                  {!loadingQuotes &&
                    getPaginatedItems(sortedQuotes).map((q: any) => {
                      const statusColors: Record<string, string> = {
                        ACCEPTED: 'bg-green-100 text-green-700',
                        SENT: 'bg-blue-100 text-blue-700',
                        EXPIRED: 'bg-red-100 text-red-600',
                        DRAFT: 'bg-[var(--bg-elevated)] text-[var(--text-muted)]',
                        REJECTED: 'bg-red-50 text-red-500',
                      };
                      const stKey = (q.status || '').toUpperCase();
                      const sc = statusColors[stKey] || 'bg-[var(--bg-elevated)] text-[var(--text-secondary)]';
                      return (
                        <div
                          key={q.id}
                          className="grid grid-cols-1 md:grid-cols-[130px_1fr_90px_90px_110px_130px_100px_40px] gap-2 items-center px-4 py-3 hover:bg-[var(--bg-surface)] transition-colors"
                        >
                          <span className="font-mono text-xs font-bold text-[var(--primary)]">
                            {q.number || q.quote_number || '—'}
                          </span>
                          <span className="text-sm text-[var(--text-primary)] truncate">{q.subject || '—'}</span>
                          <span className="text-[10px] text-[var(--text-secondary)]">
                            {q.date ? new Date(q.date).toLocaleDateString('fr-FR') : '—'}
                          </span>
                          <span
                            className={`text-[10px] font-medium ${q.validUntil && new Date(q.validUntil) < new Date() ? 'text-red-500' : 'text-[var(--text-secondary)]'}`}
                          >
                            {q.validUntil ? new Date(q.validUntil).toLocaleDateString('fr-FR') : '—'}
                          </span>
                          <span className="text-sm font-bold text-[var(--text-primary)]">
                            {Math.floor(q.amount || q.amount_ttc || 0).toLocaleString('fr-FR')}
                          </span>
                          <span className="hidden md:block text-[10px] bg-[var(--bg-surface)] px-2 py-0.5 rounded font-medium text-[var(--text-secondary)] uppercase truncate">
                            {q.category || '—'}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${sc}`}>
                            {statusFR[stKey] || q.status}
                          </span>
                          <button
                            onClick={() =>
                              generateInvoicePDF(buildClientDocData(q), {
                                branding: tenantBranding || undefined,
                                type: 'quote',
                              })
                            }
                            className="p-1.5 rounded-lg hover:bg-[var(--primary-dim)] text-[var(--primary)] transition-colors"
                            title="Télécharger devis"
                          >
                            <FileDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  {!loadingQuotes && sortedQuotes.length === 0 && (
                    <div className="text-center py-10">
                      <FileDown className="w-10 h-10 mx-auto mb-3 text-[var(--text-muted)]" />
                      <p className="font-semibold text-[var(--text-primary)]">Aucun devis</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Pagination */}
          <div className="mt-8 flex flex-col items-center gap-4">
            {activeTab === 'subscriptions' && sortedContracts.length > itemsPerPage && (
              <Pagination
                currentPage={currentPage}
                totalItems={sortedContracts.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
              />
            )}
            {activeTab === 'interventions' && sortedInterventions.length > itemsPerPage && (
              <Pagination
                currentPage={currentPage}
                totalItems={sortedInterventions.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
              />
            )}
            {(activeTab === 'tickets' || activeTab === 'requests') && sortedTickets.length > itemsPerPage && (
              <Pagination
                currentPage={currentPage}
                totalItems={sortedTickets.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
              />
            )}
            {activeTab === 'payments' && sortedReceipts.length > itemsPerPage && (
              <Pagination
                currentPage={currentPage}
                totalItems={sortedReceipts.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
              />
            )}
            {activeTab === 'invoices' && sortedInvoices.length > itemsPerPage && (
              <Pagination
                currentPage={currentPage}
                totalItems={sortedInvoices.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
              />
            )}
            {activeTab === 'quotes' && sortedQuotes.length > itemsPerPage && (
              <Pagination
                currentPage={currentPage}
                totalItems={sortedQuotes.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
              />
            )}

            {/* Empty States */}
            {activeTab === 'interventions' && filteredInterventions.length === 0 && (
              <div className="text-center py-12">
                <Wrench className="w-12 h-12 mx-auto mb-4 text-[var(--text-muted)]" />
                <h3 className="text-lg font-bold text-[var(--text-primary)]">Aucune intervention</h3>
                <p className="text-[var(--text-secondary)]">Vous n'avez pas d'intervention planifiée ou passée.</p>
              </div>
            )}
            {loadingSubs && (
              <div className="text-center py-12">
                <div className="animate-spin w-8 h-8 border-4 border-[var(--primary)] border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-[var(--text-secondary)]">Chargement de vos abonnements...</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Panneau détail ticket */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex">
          {/* Overlay */}
          <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedTicket(null)} />

          {/* Panel */}
          <div className="w-full max-w-lg bg-[var(--bg-surface)] border-l border-[var(--border)] flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="flex items-start justify-between p-5 border-b border-[var(--border)]">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {renderStatusBadge(selectedTicket.status, 'ticket')}
                  <span className="text-[10px] font-mono text-[var(--text-muted)]">{selectedTicket.id}</span>
                </div>
                <h3 className="font-bold text-[var(--text-primary)] text-base leading-snug">
                  {selectedTicket.subject}
                </h3>
                <div className="flex flex-wrap gap-3 mt-2 text-[11px] text-[var(--text-secondary)]">
                  {selectedTicket.category && (
                    <span className="bg-[var(--bg-elevated)] px-2 py-0.5 rounded">{selectedTicket.category}</span>
                  )}
                  {(selectedTicket as any).vehiclePlate && (
                    <span className="font-mono bg-[var(--bg-elevated)] px-2 py-0.5 rounded">
                      {(selectedTicket as any).vehiclePlate}
                    </span>
                  )}
                  {selectedTicket.priority && (
                    <span
                      className={`px-2 py-0.5 rounded font-semibold uppercase ${
                        selectedTicket.priority === 'CRITICAL'
                          ? 'bg-red-100 text-red-600'
                          : selectedTicket.priority === 'HIGH'
                            ? 'bg-orange-100 text-orange-600'
                            : selectedTicket.priority === 'MEDIUM'
                              ? 'bg-yellow-100 text-yellow-600'
                              : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'
                      }`}
                    >
                      {selectedTicket.priority}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                className="p-1.5 rounded-lg hover:bg-[var(--bg-elevated)] text-[var(--text-muted)] ml-3 flex-shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Infos dates */}
            <div className="grid grid-cols-2 gap-3 px-5 py-3 bg-[var(--bg-elevated)] border-b border-[var(--border)] text-[11px]">
              <div>
                <p className="text-[var(--text-muted)] uppercase font-semibold mb-0.5">Créé le</p>
                <p className="text-[var(--text-primary)] font-medium">
                  {new Date(selectedTicket.createdAt).toLocaleDateString('fr-FR')}
                </p>
              </div>
              <div>
                <p className="text-[var(--text-muted)] uppercase font-semibold mb-0.5">Mis à jour</p>
                <p className="text-[var(--text-primary)] font-medium">
                  {new Date(selectedTicket.updatedAt).toLocaleDateString('fr-FR')}
                </p>
              </div>
              {selectedTicket.resolvedAt && (
                <div className="col-span-2">
                  <p className="text-green-600 uppercase font-semibold mb-0.5">Résolu le</p>
                  <p className="text-green-700 font-medium">
                    {new Date(selectedTicket.resolvedAt).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              )}
              {selectedTicket.description && (
                <div className="col-span-2">
                  <p className="text-[var(--text-muted)] uppercase font-semibold mb-0.5">Description</p>
                  <p className="text-[var(--text-primary)]">{selectedTicket.description}</p>
                </div>
              )}
            </div>

            {/* Historique conversation */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              <p className="text-[11px] font-semibold uppercase text-[var(--text-muted)] flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" /> Historique ({ticketMessages.length})
              </p>

              {loadingMessages && (
                <div className="flex justify-center py-6">
                  <div className="w-6 h-6 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
                </div>
              )}

              {!loadingMessages && ticketMessages.length === 0 && (
                <div className="text-center py-8 text-[var(--text-muted)]">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Aucun message pour l'instant</p>
                </div>
              )}

              {ticketMessages.map((msg: any, idx: number) => {
                const isClient = msg.isClient || msg.is_client || msg.senderRole === 'CLIENT';
                return (
                  <div key={msg.id || idx} className={`flex ${isClient ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                        isClient
                          ? 'bg-[var(--primary)] text-white rounded-br-sm'
                          : 'bg-[var(--bg-elevated)] text-[var(--text-primary)] rounded-bl-sm border border-[var(--border)]'
                      }`}
                    >
                      {!isClient && <p className="text-[10px] font-semibold mb-1 opacity-60 uppercase">Support</p>}
                      <p className="leading-relaxed whitespace-pre-wrap">{msg.content || msg.message}</p>
                      <p
                        className={`text-[10px] mt-1.5 ${isClient ? 'text-white/60 text-right' : 'text-[var(--text-muted)]'}`}
                      >
                        {msg.createdAt
                          ? new Date(msg.createdAt).toLocaleString('fr-FR', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : ''}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Zone de réponse */}
            {!['CLOSED', 'RESOLVED'].includes(selectedTicket.status) && (
              <div className="p-4 border-t border-[var(--border)] bg-[var(--bg-elevated)]">
                <div className="flex gap-2 items-end">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendReply();
                      }
                    }}
                    placeholder="Votre message... (Entrée pour envoyer)"
                    rows={2}
                    className="flex-1 resize-none text-sm px-3 py-2 bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-[var(--primary)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                  />
                  <button
                    onClick={handleSendReply}
                    disabled={!replyText.trim() || sendingReply}
                    className="p-2.5 bg-[var(--primary)] text-white rounded-xl hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex-shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      <CreateTicketModal
        isOpen={isTicketModalOpen}
        onClose={() => setIsTicketModalOpen(false)}
        defaultCategory={activeTab === 'requests' ? 'Services' : undefined}
      />

      {isDetailModalOpen && viewingContract && (
        <ContractDetailModal
          isOpen={isDetailModalOpen}
          contract={viewingContract}
          onClose={() => {
            setViewingContract(null);
            setIsDetailModalOpen(false);
          }}
          client={undefined}
          invoices={invoices}
          vehicles={vehicles}
          onStatusChange={() => {}}
          onEdit={() => {}}
        />
      )}

      {selectedSub && (
        <SubscriptionDetailModal
          isOpen={!!selectedSub}
          onClose={() => setSelectedSub(null)}
          subscriptionNumber={selectedSub.subscriptionNumber || selectedSub.vehicle_id || selectedSub.vehicleId || ''}
          vehicleId={selectedSub.vehicle_id || selectedSub.vehicleId || ''}
          contractId={selectedSub.contract_id || selectedSub.contractId || ''}
          subscriptionId={selectedSub.id || selectedSub.subscriptionId || ''}
          monthlyFee={selectedSub.monthlyFee || 0}
          billingCycle={selectedSub.billingCycle || 'MONTHLY'}
          subscriptionStatus={selectedSub.status || 'ACTIVE'}
          autoRenew={selectedSub.autoRenew ?? true}
          startDate={selectedSub.startDate || selectedSub.start_date || ''}
          endDate={selectedSub.endDate || selectedSub.end_date}
        />
      )}
    </div>
  );
};

const Pagination = ({
  currentPage,
  totalItems,
  itemsPerPage,
  onPageChange,
}: {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}) => (
  <SharedPagination
    currentPage={currentPage}
    totalPages={Math.ceil(totalItems / itemsPerPage)}
    onPageChange={onPageChange}
    totalItems={totalItems}
    itemLabel="résultat"
    className="w-full px-4 py-3 bg-[var(--bg-elevated)] border-t border-[var(--border)]"
  />
);
