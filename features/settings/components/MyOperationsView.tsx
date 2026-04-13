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
} from 'lucide-react';
import type { Contract, Ticket as TicketType } from '../../../types';
import { CreateTicketModal } from './CreateTicketModal';
import { ContractDetailModal } from '../../crm/components/ContractDetailModal';
import { SubscriptionDetailModal } from '../../crm/components/SubscriptionDetailModal';
import { api } from '../../../services/apiLazy';
import { logger } from '../../../utils/logger';
import { useTableSort } from '../../../hooks/useTableSort';
import { SortableHeader } from '../../../components/SortableHeader';

type OperationTab = 'subscriptions' | 'interventions' | 'tickets' | 'payments';

export const MyOperationsView: React.FC = () => {
  const { contracts, interventions, tickets, invoices, vehicles, payments = [] } = useDataContext();
  const { user: _user } = useAuth();
  const { showToast } = useToast();
  const { formatPrice } = useCurrency();
  const [activeTab, setActiveTab] = useState<OperationTab>('subscriptions');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const tabs = [
    { id: 'subscriptions', label: 'Abonnements', icon: FileText },
    { id: 'interventions', label: 'Interventions', icon: Wrench },
    { id: 'tickets', label: 'Tickets Support', icon: Ticket },
    { id: 'payments', label: 'Paiements', icon: Receipt },
  ];

  // Contract Detail Modal State
  const [viewingContract, setViewingContract] = useState<Contract | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

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
    return matchesSearch;
  });

  // Filter data based on search term and status
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
    return matchesSearch && matchesStatus;
  });

  const filteredTickets = tickets.filter((t) => {
    const matchesSearch =
      t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.status.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const {
    sortedItems: sortedContracts,
    sortConfig: contractSortConfig,
    handleSort: handleContractSort,
  } = useTableSort(clientSubscriptions, { key: 'startDate', direction: 'desc' });
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

  // Reset page when tab, search or filter changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchTerm, statusFilter]);

  const getPaginatedItems = (items: any[]) => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return items.slice(startIndex, startIndex + itemsPerPage);
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

    return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold uppercase ${colorClass}`}>{status}</span>;
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
          <p className="text-[var(--text-secondary)]">Suivez vos contrats, interventions et tickets de support</p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'tickets' && (
            <button
              onClick={() => setIsTicketModalOpen(true)}
              className="px-4 py-2 bg-[var(--primary)] hover:bg-[var(--primary-light)] text-white rounded-lg transition-colors flex items-center gap-2 text-sm font-medium shadow-sm"
            >
              <Ticket className="w-4 h-4" /> Nouveau Ticket
            </button>
          )}
          <button
            onClick={() => {
              let data: string[] = [];
              let filename = '';

              if (activeTab === 'subscriptions') {
                data = [
                  'Code;N° Contrat;Date Début;Date Fin;Plaques;Véhicules;Montant;Statut',
                  ...filteredContracts.map((c) => {
                    const plates =
                      c.vehicleIds
                        ?.map((vid) => vehicles.find((v) => v.id === vid)?.licensePlate)
                        .filter(Boolean)
                        .join(', ') ||
                      c.licensePlate ||
                      '-';
                    return `${c.subscriptionNumber || '-'};${c.contractNumber || '-'};${new Date(c.startDate).toLocaleDateString('fr-FR')};${c.endDate ? new Date(c.endDate).toLocaleDateString('fr-FR') : '-'};${plates};${c.vehicleCount};${c.monthlyFee};${c.status}`;
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
              } else if (activeTab === 'tickets') {
                data = [
                  'ID;Sujet;Catégorie;Priorité;Statut',
                  ...filteredTickets.map((t) => `${t.id};${t.subject};${t.category};${t.priority};${t.status}`),
                ];
                filename = 'mes_tickets';
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-[var(--bg-elevated)] border-[var(--border)]">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] rounded-xl text-[var(--primary)] dark:text-[var(--primary)]">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--text-secondary)]">Abonnements Actifs</p>
              <h3 className="page-title">{contracts.filter((c) => c.status === 'ACTIVE').length}</h3>
            </div>
          </div>
        </Card>
        <Card className="bg-[var(--bg-elevated)] border-[var(--border)]">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[var(--clr-info-dim)] rounded-xl text-[var(--clr-info)]">
              <Wrench className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--text-secondary)]">Interventions en cours</p>
              <h3 className="page-title">
                {interventions.filter((i) => ['SCHEDULED', 'EN_ROUTE', 'IN_PROGRESS'].includes(i.status)).length}
              </h3>
            </div>
          </div>
        </Card>
        <Card className="bg-[var(--bg-elevated)] border-[var(--border)]">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[var(--clr-warning-dim)] rounded-xl text-[var(--clr-warning)]">
              <Ticket className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--text-secondary)]">Tickets Ouverts</p>
              <h3 className="page-title">
                {tickets.filter((t) => ['OPEN', 'IN_PROGRESS', 'WAITING_CLIENT'].includes(t.status)).length}
              </h3>
            </div>
          </div>
        </Card>
        <Card className="bg-[var(--bg-elevated)] border-[var(--border)]">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[var(--clr-success-dim)] rounded-xl text-[var(--clr-success)]">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--text-secondary)]">Paiements enregistrés</p>
              <h3 className="page-title">{payments.length}</h3>
            </div>
          </div>
        </Card>
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

          <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              title="Filtrer par statut"
              className="flex-1 sm:flex-none pl-3 pr-8 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg text-sm focus:ring-2 focus:ring-[var(--primary)] outline-none appearance-none cursor-pointer"
            >
              <option value="ALL">Tous les statuts</option>
              {activeTab === 'subscriptions' && (
                <>
                  <option value="ACTIVE">Actif</option>
                  <option value="EXPIRED">Expiré</option>
                  <option value="TERMINATED">Résilié</option>
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
              {activeTab === 'tickets' && (
                <>
                  <option value="OPEN">Ouvert</option>
                  <option value="IN_PROGRESS">En cours</option>
                  <option value="RESOLVED">Résolu</option>
                  <option value="CLOSED">Fermé</option>
                </>
              )}
            </select>
            <div className="relative flex-1">
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
            {/* Subscriptions Cards */}
            {activeTab === 'subscriptions' &&
              getPaginatedItems(sortedContracts).map((sub: any) => {
                const contract = contracts.find((c) => c.id === sub.contract_id || c.id === sub.contractId);
                const paymentStatus = contract?.status === 'ACTIVE' ? 'À jour' : 'En retard';
                // Format amount: no currency, no decimals
                const formattedAmount = Math.floor(sub.monthly_fee || sub.monthlyFee || 0).toLocaleString('fr-FR');

                return (
                  <div
                    key={sub.id}
                    onClick={() => setSelectedSub(sub)}
                    className="group bg-[var(--bg-elevated)] rounded-2xl p-5 border border-[var(--border)] shadow-sm hover:shadow-md hover:border-[var(--primary)] dark:hover:border-[var(--primary)]/50 transition-all cursor-pointer relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
                      <FileText className="w-16 h-16" />
                    </div>

                    <div className="flex justify-between items-start mb-4">
                      <span className="font-mono text-[var(--primary)] dark:text-[var(--primary)] font-bold bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] px-3 py-1 rounded-lg text-sm">
                        {sub.vehicle_id || sub.vehicleId || '-'}
                      </span>
                      {renderStatusBadge(sub.status, 'contract')}
                    </div>

                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-2">
                          <Smartphone className="w-4 h-4 text-[var(--text-muted)]" />
                          <div>
                            <p className="text-[10px] text-[var(--text-secondary)] uppercase font-semibold">Plaque</p>
                            <p className="text-sm font-bold text-[var(--text-primary)] font-mono">
                              {sub.vehicle_plate || sub.vehiclePlate || '-'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-[var(--text-muted)]" />
                          <div>
                            <p className="text-[10px] text-[var(--text-secondary)] uppercase font-semibold">
                              N° Contrat
                            </p>
                            <p className="text-sm font-bold text-[var(--text-primary)] font-mono">
                              {sub.contract_number || contract?.contractNumber || '-'}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2">
                        <div className="bg-[var(--bg-elevated)]/50 p-2 rounded-lg">
                          <p className="text-[10px] text-[var(--text-secondary)] uppercase font-semibold">
                            Dérnier Paiement
                          </p>
                          <p className="text-xs font-medium text-[var(--text-primary)]">
                            {new Date(sub.start_date || sub.startDate).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                        <div className="bg-[var(--bg-elevated)]/50 p-2 rounded-lg">
                          <p className="text-[10px] text-[var(--text-secondary)] uppercase font-semibold">
                            Prochaine Facture
                          </p>
                          <p className="text-xs font-bold text-[var(--primary)] dark:text-[var(--primary)]">
                            {sub.next_billing_date || sub.nextBillingDate
                              ? new Date(sub.next_billing_date || sub.nextBillingDate).toLocaleDateString('fr-FR')
                              : '-'}
                          </p>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-[var(--border)] border-[var(--border)] flex justify-between items-center">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-[var(--text-secondary)] uppercase font-semibold">
                            Montant
                          </span>
                          <span className="text-sm font-black text-[var(--text-primary)]">{formattedAmount}</span>
                        </div>
                        <div
                          className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${paymentStatus === 'À jour' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}
                        >
                          {paymentStatus}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

            {/* Interventions Cards */}
            {activeTab === 'interventions' &&
              getPaginatedItems(sortedInterventions).map((intervention) => {
                const vehicle = vehicles.find((v) => v.id === intervention.vehicleId);
                return (
                  <div
                    key={intervention.id}
                    className="bg-[var(--bg-elevated)] rounded-2xl p-5 border border-[var(--border)] shadow-sm hover:shadow-md transition-all border-l-4 border-l-blue-500"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="bg-[var(--bg-elevated)] p-2 rounded-lg">
                        <Wrench className="w-5 h-5 text-[var(--primary)] dark:text-[var(--primary)]" />
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
                          {intervention.vehiclePlate || vehicle?.licensePlate || '-'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                        <MapPin className="w-4 h-4 text-[var(--text-muted)]" />
                        <span className="text-sm truncate">{intervention.location}</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-[var(--border)] border-[var(--border)] flex justify-end">
                      <button className="text-[var(--primary)] dark:text-[var(--primary)] text-sm font-semibold flex items-center gap-1 hover:gap-2 transition-all">
                        Détails <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}

            {/* Tickets List View */}
            {activeTab === 'tickets' && (
              <div className="lg:col-span-3 space-y-2">
                {getPaginatedItems(sortedTickets).map((ticket) => (
                  <div
                    key={ticket.id}
                    className="bg-[var(--bg-elevated)] rounded-xl p-4 border border-[var(--border)] shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div
                        className={`w-2 h-10 rounded-full ${
                          ticket.priority === 'CRITICAL'
                            ? 'bg-red-500'
                            : ticket.priority === 'HIGH'
                              ? 'bg-orange-500'
                              : ticket.priority === 'MEDIUM'
                                ? 'bg-[var(--primary-dim)]0'
                                : 'bg-[var(--border)]'
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-[var(--text-primary)] truncate max-w-[200px]">
                            {ticket.subject}
                          </h4>
                          <span className="text-[10px] bg-[var(--bg-elevated)] px-1.5 py-0.5 rounded font-mono">
                            {ticket.vehiclePlate || '-'}
                          </span>
                          {renderStatusBadge(ticket.status, 'ticket')}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-[11px] text-[var(--text-secondary)]">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> Créé le:{' '}
                            {new Date(ticket.createdAt).toLocaleDateString('fr-FR')}
                          </span>
                          {ticket.resolvedAt && (
                            <span className="flex items-center gap-1 text-green-600">
                              <CheckCircle2 className="w-3 h-3" /> Résolu le:{' '}
                              {new Date(ticket.resolvedAt).toLocaleDateString('fr-FR')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button className="whitespace-nowrap px-4 py-2 bg-[var(--bg-elevated)]/50 hover:bg-[var(--bg-elevated)] rounded-lg text-[var(--text-primary)] text-xs font-bold transition-colors">
                      CONVERSATION
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Payments Cards */}
            {activeTab === 'payments' &&
              getPaginatedItems(sortedReceipts).map((payment) => {
                const linkedInvoice = invoices.find((inv) => inv.id === payment.invoiceId);
                return (
                  <div
                    key={payment.id}
                    className="bg-[var(--bg-elevated)] rounded-2xl p-5 border border-[var(--border)] shadow-sm hover:shadow-md transition-all flex flex-col items-center text-center"
                  >
                    <div className="w-12 h-12 bg-[var(--clr-success-dim)] rounded-full flex items-center justify-center mb-4 text-[var(--clr-success)]">
                      {payment.method === 'MOBILE_MONEY' ? (
                        <Smartphone className="w-6 h-6" />
                      ) : payment.method === 'BANK_TRANSFER' ? (
                        <Wallet className="w-6 h-6" />
                      ) : payment.method === 'CHECK' ? (
                        <Banknote className="w-6 h-6" />
                      ) : (
                        <CreditCard className="w-6 h-6" />
                      )}
                    </div>

                    <p className="text-xl font-black text-[var(--text-primary)] mb-1">
                      {Math.floor(payment.amount || 0).toLocaleString('fr-FR')}
                    </p>
                    <p className="text-xs font-mono text-[var(--text-secondary)] mb-4">
                      {payment.reference || `REC-${payment.id?.slice(0, 8)}`}
                    </p>

                    <div className="w-full bg-[var(--bg-elevated)]/50 p-3 rounded-xl space-y-2 mb-4 text-left">
                      <div className="flex justify-between text-xs">
                        <span className="text-[var(--text-secondary)] font-medium">Date</span>
                        <span className="text-[var(--text-primary)] font-bold">
                          {new Date(payment.date).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-[var(--text-secondary)] font-medium">Facture</span>
                        <span className="text-[var(--text-primary)] font-bold">{linkedInvoice?.number || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-[var(--text-secondary)] font-medium">Méthode</span>
                        <span className="text-[var(--text-primary)] font-bold uppercase">{payment.method}</span>
                      </div>
                    </div>

                    <div className="flex gap-2 w-full mt-auto">
                      <button
                        onClick={() => showToast('Téléchargement du reçu...', 'info')}
                        className="flex-1 flex items-center justify-center gap-2 py-2 bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] text-[var(--primary)] dark:text-[var(--primary)] rounded-lg text-xs font-bold hover:bg-[var(--primary-dim)] dark:hover:bg-[var(--primary-dim)]/40 transition-all"
                      >
                        <FileDown className="w-4 h-4" /> REÇU
                      </button>
                      <button
                        onClick={() => window.print()}
                        className="p-2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]/50 rounded-lg transition-all"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>

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
            {activeTab === 'tickets' && sortedTickets.length > itemsPerPage && (
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

            {/* Empty States */}
            {activeTab === 'subscriptions' && clientSubscriptions.length === 0 && !loadingSubs && (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 mx-auto mb-4 text-[var(--text-muted)]" />
                <h3 className="text-lg font-bold text-[var(--text-primary)]">Aucun abonnement trouvé</h3>
                <p className="text-[var(--text-secondary)]">Vos abonnements actifs apparaîtront ici.</p>
              </div>
            )}
            {activeTab === 'interventions' && filteredInterventions.length === 0 && (
              <div className="text-center py-12">
                <Wrench className="w-12 h-12 mx-auto mb-4 text-[var(--text-muted)]" />
                <h3 className="text-lg font-bold text-[var(--text-primary)]">Aucune intervention</h3>
                <p className="text-[var(--text-secondary)]">Vous n'avez pas d'intervention planifiée ou passée.</p>
              </div>
            )}
            {activeTab === 'tickets' && filteredTickets.length === 0 && (
              <div className="text-center py-12">
                <Ticket className="w-12 h-12 mx-auto mb-4 text-[var(--text-muted)]" />
                <h3 className="text-lg font-bold text-[var(--text-primary)]">Zéro ticket support</h3>
                <p className="text-[var(--text-secondary)]">Besoin d'aide ? Créez un nouveau ticket.</p>
              </div>
            )}
            {activeTab === 'payments' && sortedReceipts.length === 0 && (
              <div className="text-center py-12">
                <Receipt className="w-12 h-12 mx-auto mb-4 text-[var(--text-muted)]" />
                <h3 className="text-lg font-bold text-[var(--text-primary)]">Aucun paiement</h3>
                <p className="text-[var(--text-secondary)]">Vos reçus de paiement seront listés ici.</p>
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

      {/* Modals */}
      <CreateTicketModal isOpen={isTicketModalOpen} onClose={() => setIsTicketModalOpen(false)} />

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
          subscriptionNumber={selectedSub.vehicle_id || selectedSub.vehicleId}
          vehicleId={selectedSub.vehicle_id || selectedSub.vehicleId}
          contractId={selectedSub.contract_id || selectedSub.contractId}
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
