/**
 * RegistrationRequestsPanel - Gestion des demandes d'inscription
 *
 * Fonctionnalités:
 * - Dashboard KPIs (en attente, approuvées, rejetées)
 * - Tableau des demandes avec filtres
 * - Approbation avec sélection de tenant
 * - Rejet avec motif
 * - Historique des traitements
 */
import { useIsMobile } from '../../../../hooks/useIsMobile';
import { MobileCard, MobileCardList, MobileCardAction } from '../../../../components/MobileCard';

import React, { useState, useEffect } from 'react';
import {
  UserPlus,
  Check,
  X,
  Clock,
  Search,
  Filter,
  RefreshCw,
  Mail,
  Phone,
  Building,
  Calendar,
  AlertCircle,
  CheckCircle,
  XCircle,
  Eye,
  ChevronDown,
  Send,
  MessageSquare,
} from 'lucide-react';
import { Card } from '../../../../components/Card';
import { Modal } from '../../../../components/Modal';
import { useToast } from '../../../../contexts/ToastContext';
import { TOAST } from '../../../../constants/toastMessages';
import { mapError } from '../../../../utils/errorMapper';
import { api } from '../../../../services/apiLazy';
import { useTableSort } from '../../../../hooks/useTableSort';
import { SortableHeader } from '../../../../components/SortableHeader';

// Types
interface RegistrationRequest {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company_name?: string;
  message?: string;
  status: 'pending' | 'approved' | 'rejected';
  reminder_count: number;
  created_at: string;
  updated_at: string;
  reviewed_by?: string;
  reviewed_at?: string;
  rejection_reason?: string;
  reviewer_name?: string;
  tenant_id?: string;
}

interface Tenant {
  id: string;
  name: string;
  logo_url?: string;
}

interface Stats {
  pending_count: number;
  approved_count: number;
  rejected_count: number;
  total_count: number;
  oldest_pending?: string;
}

export const RegistrationRequestsPanel: React.FC = () => {
  const isMobile = useIsMobile();
  const { showToast } = useToast();

  // State
  const [requests, setRequests] = useState<RegistrationRequest[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [search, setSearch] = useState('');

  // Modal states
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [emailPreviewModalOpen, setEmailPreviewModalOpen] = useState(false);
  const [smsPreviewModalOpen, setSmsPreviewModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<RegistrationRequest | null>(null);
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  // Preview states
  const [emailSubject, setEmailSubject] = useState('');
  const [emailContent, setEmailContent] = useState('');
  const [smsMessage, setSmsMessage] = useState('');

  // Fetch data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [requestsData, tenantsData, statsData] = await Promise.all([
        api.registrationRequests.list(),
        api.registrationRequests.listTenants(),
        api.registrationRequests.getStats(),
      ]);

      setRequests(requestsData || []);
      setTenants(tenantsData || []);
      setStats(statsData || null);
    } catch (error) {
      showToast(TOAST.CRUD.ERROR_LOAD('demandes'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter requests
  const filteredRequests = requests.filter((req) => {
    // Status filter
    if (filter !== 'all' && req.status !== filter) return false;

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      return (
        req.name.toLowerCase().includes(searchLower) ||
        req.email.toLowerCase().includes(searchLower) ||
        req.phone?.toLowerCase().includes(searchLower) ||
        req.company_name?.toLowerCase().includes(searchLower)
      );
    }

    return true;
  });

  const {
    sortedItems: sortedRequests,
    sortConfig: regSortConfig,
    handleSort: handleRegSort,
  } = useTableSort(filteredRequests, { key: 'created_at', direction: 'desc' });

  // Handle approve
  const handleApprove = async () => {
    if (!selectedRequest || !selectedTenantId) {
      showToast(TOAST.VALIDATION.REQUIRED_FIELD('tenant'), 'error');
      return;
    }

    setProcessing(true);
    try {
      await api.registrationRequests.approve(selectedRequest.id, { tenantId: selectedTenantId });
      showToast(TOAST.ADMIN.REGISTRATION_APPROVED, 'success');
      setApproveModalOpen(false);
      setSelectedRequest(null);
      setSelectedTenantId('');
      fetchData();
    } catch (error: unknown) {
      showToast(mapError(error, 'inscription'), 'error');
    } finally {
      setProcessing(false);
    }
  };

  // Handle reject
  const handleReject = async () => {
    if (!selectedRequest) return;

    setProcessing(true);
    try {
      await api.registrationRequests.reject(selectedRequest.id, { reason: rejectionReason });
      showToast(TOAST.ADMIN.REGISTRATION_REJECTED, 'success');
      setRejectModalOpen(false);
      setSelectedRequest(null);
      setRejectionReason('');
      fetchData();
    } catch (error: unknown) {
      showToast(mapError(error, 'demande'), 'error');
    } finally {
      setProcessing(false);
    }
  };

  // Open approve modal
  const openApproveModal = (request: RegistrationRequest) => {
    setSelectedRequest(request);
    setSelectedTenantId('');
    setApproveModalOpen(true);
  };

  // Open reject modal
  const openRejectModal = (request: RegistrationRequest) => {
    setSelectedRequest(request);
    setRejectionReason('');
    setRejectModalOpen(true);
  };

  // Open detail modal
  const openDetailModal = (request: RegistrationRequest) => {
    setSelectedRequest(request);
    setDetailModalOpen(true);
  };

  // Send email to request
  const handleSendEmail = async () => {
    if (!selectedRequest) return;

    // First, get preview
    setProcessing(true);
    try {
      const preview = await api.registrationRequests.previewEmail(selectedRequest.id);
      setEmailSubject(preview.subject);
      setEmailContent(preview.content);
      setEmailPreviewModalOpen(true);
    } catch (error: unknown) {
      showToast(mapError(error, 'template'), 'error');
    } finally {
      setProcessing(false);
    }
  };

  // Actually send email (after preview confirmation)
  const confirmSendEmail = async () => {
    if (!selectedRequest) return;

    setProcessing(true);
    try {
      await api.registrationRequests.sendEmail(selectedRequest.id);
      showToast(TOAST.COMM.EMAIL_SENT(selectedRequest.email), 'success');
      setEmailPreviewModalOpen(false);
    } catch (error: unknown) {
      showToast(TOAST.COMM.EMAIL_ERROR, 'error');
    } finally {
      setProcessing(false);
    }
  };

  // Send SMS to request
  const handleSendSMS = async () => {
    if (!selectedRequest) return;

    if (!selectedRequest.phone) {
      showToast(TOAST.VALIDATION.REQUIRED_FIELD('téléphone'), 'error');
      return;
    }

    // First, get preview
    setProcessing(true);
    try {
      const preview = await api.registrationRequests.previewSms(selectedRequest.id);
      setSmsMessage(preview.message);
      setSmsPreviewModalOpen(true);
    } catch (error: unknown) {
      showToast(mapError(error, 'template SMS'), 'error');
    } finally {
      setProcessing(false);
    }
  };

  // Actually send SMS (after preview confirmation)
  const confirmSendSMS = async () => {
    if (!selectedRequest) return;

    setProcessing(true);
    try {
      await api.registrationRequests.sendSms(selectedRequest.id);
      showToast(TOAST.COMM.SMS_SENT, 'success');
      setSmsPreviewModalOpen(false);
    } catch (error: unknown) {
      showToast(TOAST.COMM.SMS_ERROR, 'error');
    } finally {
      setProcessing(false);
    }
  };

  // Format date
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get time ago
  const getTimeAgo = (dateStr: string) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `il y a ${diffMins} min`;
    if (diffHours < 24) return `il y a ${diffHours}h`;
    return `il y a ${diffDays}j`;
  };

  // Status badge
  const StatusBadge = ({ status }: { status: string }) => {
    const configs = {
      pending: {
        bg: 'bg-amber-100 dark:bg-amber-900/30',
        text: 'text-amber-700 dark:text-amber-400',
        icon: Clock,
        label: 'En attente',
      },
      approved: {
        bg: 'bg-green-100 dark:bg-green-900/30',
        text: 'text-green-700 dark:text-green-400',
        icon: CheckCircle,
        label: 'Approuvée',
      },
      rejected: {
        bg: 'bg-red-100 dark:bg-red-900/30',
        text: 'text-red-700 dark:text-red-400',
        icon: XCircle,
        label: 'Rejetée',
      },
    };
    const config = configs[status as keyof typeof configs] || configs.pending;
    const Icon = config.icon;

    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}
      >
        <Icon size={12} />
        {config.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="page-title flex items-center gap-2">
            <UserPlus className="text-[var(--primary)]" />
            Demandes d'inscription
          </h2>
          <p className="text-[var(--text-secondary)] text-sm mt-1">Gérer les nouvelles demandes d'inscription</p>
        </div>

        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-elevated)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-elevated)] dark:hover:bg-slate-600 transition-colors"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Actualiser
        </button>
      </div>

      {/* KPIs */}
      {!isMobile && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-amber-600 dark:text-amber-400">En attente</p>
                  <p className="text-3xl font-bold text-amber-700 dark:text-amber-300">{stats?.pending_count || 0}</p>
                </div>
                <Clock className="text-amber-500" size={32} />
              </div>
            </div>
          </Card>

          <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600 dark:text-green-400">Approuvées</p>
                  <p className="text-3xl font-bold text-green-700 dark:text-green-300">{stats?.approved_count || 0}</p>
                </div>
                <CheckCircle className="text-green-500" size={32} />
              </div>
            </div>
          </Card>

          <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-600 dark:text-red-400">Rejetées</p>
                  <p className="text-3xl font-bold text-red-700 dark:text-red-300">{stats?.rejected_count || 0}</p>
                </div>
                <XCircle className="text-red-500" size={32} />
              </div>
            </div>
          </Card>

          <Card className="bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] border-[var(--border)] dark:border-[var(--primary)]">
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--primary)] dark:text-[var(--primary)]">Total</p>
                  <p className="text-3xl font-bold text-[var(--primary)] dark:text-[var(--primary)]">
                    {stats?.total_count || 0}
                  </p>
                </div>
                <UserPlus className="text-[var(--primary)]" size={32} />
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <div className="p-4 flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
            <input
              type="text"
              placeholder="Rechercher par nom, email, téléphone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-[var(--border)] rounded-lg bg-[var(--bg-elevated)] text-[var(--text-primary)]"
            />
          </div>

          {/* Status filter */}
          <div className="flex flex-wrap gap-2">
            {[
              { value: 'all', label: 'Toutes', count: stats?.total_count },
              { value: 'pending', label: 'En attente', count: stats?.pending_count },
              { value: 'approved', label: 'Approuvées', count: stats?.approved_count },
              { value: 'rejected', label: 'Rejetées', count: stats?.rejected_count },
            ].map((item) => (
              <button
                key={item.value}
                onClick={() => setFilter(item.value as any)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  filter === item.value
                    ? 'bg-[var(--primary)] text-white'
                    : 'bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] dark:hover:bg-slate-600'
                }`}
              >
                {item.label} ({item.count || 0})
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* List / Table */}
      <Card>
        {loading ? (
          <div className="p-8 text-center">
            <RefreshCw className="animate-spin mx-auto text-[var(--primary)] mb-2" size={32} />
            <p className="text-[var(--text-secondary)]">Chargement...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-8 text-center">
            <UserPlus className="mx-auto text-slate-300 dark:text-[var(--text-secondary)] mb-2" size={48} />
            <p className="text-[var(--text-secondary)]">Aucune demande trouvée</p>
          </div>
        ) : isMobile ? (
          <MobileCardList bordered={false}>
            {sortedRequests.map((request) => {
              const borderColor =
                request.status === 'pending'
                  ? 'border-l-amber-500'
                  : request.status === 'approved'
                    ? 'border-l-green-500'
                    : 'border-l-red-500';
              return (
                <MobileCard key={request.id} borderColor={borderColor} onClick={() => openDetailModal(request)}>
                  {/* Primary: nom + statut */}
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-sm text-[var(--text-primary)] truncate">{request.name}</p>
                      <p className="text-xs text-[var(--text-secondary)] truncate">{request.email}</p>
                    </div>
                    <div className="shrink-0">
                      <StatusBadge status={request.status} />
                    </div>
                  </div>
                  {/* Secondary: entreprise + téléphone + date */}
                  <div className="flex items-center gap-2 text-[10px] text-[var(--text-secondary)] mb-2 flex-wrap">
                    {request.company_name && (
                      <span className="flex items-center gap-1">
                        <Building size={10} />
                        {request.company_name}
                      </span>
                    )}
                    {request.phone && (
                      <span className="flex items-center gap-1">
                        <Phone size={10} />
                        {request.phone}
                      </span>
                    )}
                    <span>{getTimeAgo(request.created_at)}</span>
                    {request.status === 'pending' && request.reminder_count > 0 && (
                      <span className="text-amber-500">
                        {request.reminder_count} relance{request.reminder_count > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <MobileCardAction
                      icon={<Eye size={12} />}
                      color="slate"
                      onClick={(e) => {
                        e.stopPropagation();
                        openDetailModal(request);
                      }}
                    >
                      Voir
                    </MobileCardAction>
                    {request.status === 'pending' && (
                      <>
                        <MobileCardAction
                          icon={<Check size={12} />}
                          color="green"
                          onClick={(e) => {
                            e.stopPropagation();
                            openApproveModal(request);
                          }}
                        >
                          Approuver
                        </MobileCardAction>
                        <MobileCardAction
                          icon={<X size={12} />}
                          color="red"
                          onClick={(e) => {
                            e.stopPropagation();
                            openRejectModal(request);
                          }}
                        >
                          Rejeter
                        </MobileCardAction>
                      </>
                    )}
                  </div>
                </MobileCard>
              );
            })}
          </MobileCardList>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[var(--bg-elevated)]">
                <tr>
                  <SortableHeader
                    label="Utilisateur"
                    sortKey="name"
                    currentSortKey={regSortConfig.key}
                    currentDirection={regSortConfig.direction}
                    onSort={handleRegSort}
                    className="text-xs font-semibold text-[var(--text-secondary)] uppercase"
                  />
                  <SortableHeader
                    label="Contact"
                    sortKey="phone"
                    currentSortKey={regSortConfig.key}
                    currentDirection={regSortConfig.direction}
                    onSort={handleRegSort}
                    className="text-xs font-semibold text-[var(--text-secondary)] uppercase"
                  />
                  <SortableHeader
                    label="Entreprise"
                    sortKey="company_name"
                    currentSortKey={regSortConfig.key}
                    currentDirection={regSortConfig.direction}
                    onSort={handleRegSort}
                    className="text-xs font-semibold text-[var(--text-secondary)] uppercase"
                  />
                  <SortableHeader
                    label="Status"
                    sortKey="status"
                    currentSortKey={regSortConfig.key}
                    currentDirection={regSortConfig.direction}
                    onSort={handleRegSort}
                    className="text-xs font-semibold text-[var(--text-secondary)] uppercase"
                  />
                  <SortableHeader
                    label="Date"
                    sortKey="created_at"
                    currentSortKey={regSortConfig.key}
                    currentDirection={regSortConfig.direction}
                    onSort={handleRegSort}
                    className="text-xs font-semibold text-[var(--text-secondary)] uppercase"
                  />
                  <th className="px-4 py-3 text-center text-xs font-semibold text-[var(--text-secondary)] uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {sortedRequests.map((request) => (
                  <tr key={request.id} className="tr-hover/50">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-[var(--text-primary)]">{request.name}</p>
                        <p className="text-sm text-[var(--text-secondary)] flex items-center gap-1">
                          <Mail size={12} />
                          {request.email}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {request.phone ? (
                        <span className="flex items-center gap-1 text-sm text-[var(--text-secondary)]">
                          <Phone size={12} />
                          {request.phone}
                        </span>
                      ) : (
                        <span className="text-sm text-[var(--text-muted)]">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {request.company_name ? (
                        <span className="flex items-center gap-1 text-sm text-[var(--text-secondary)]">
                          <Building size={12} />
                          {request.company_name}
                        </span>
                      ) : (
                        <span className="text-sm text-[var(--text-muted)]">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={request.status} />
                      {request.status === 'pending' && request.reminder_count > 0 && (
                        <span className="ml-2 text-xs text-amber-500">
                          ({request.reminder_count} relance{request.reminder_count > 1 ? 's' : ''})
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm text-[var(--text-secondary)]">{formatDate(request.created_at)}</p>
                        <p className="text-xs text-[var(--text-muted)]">{getTimeAgo(request.created_at)}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openDetailModal(request)}
                          className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-[var(--primary-dim)] dark:hover:bg-[var(--primary-dim)]/30 transition-colors"
                          title="Voir détails"
                        >
                          <Eye size={16} />
                        </button>
                        {request.status === 'pending' && (
                          <>
                            <button
                              onClick={() => openApproveModal(request)}
                              className="p-1.5 rounded-lg text-green-500 hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors"
                              title="Approuver"
                            >
                              <Check size={16} />
                            </button>
                            <button
                              onClick={() => openRejectModal(request)}
                              className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                              title="Rejeter"
                            >
                              <X size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Approve Modal */}
      <Modal isOpen={approveModalOpen} onClose={() => setApproveModalOpen(false)} title="Approuver l'inscription">
        <div className="space-y-4">
          {selectedRequest && (
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
              <p className="font-medium text-green-800 dark:text-green-200">{selectedRequest.name}</p>
              <p className="text-sm text-green-600 dark:text-green-400">{selectedRequest.email}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              Assigner un espace (tenant) *
            </label>
            <select
              value={selectedTenantId}
              onChange={(e) => setSelectedTenantId(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--bg-elevated)] text-[var(--text-primary)]"
              required
            >
              <option value="">-- Sélectionner un espace --</option>
              {tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              L'utilisateur sera créé avec le rôle "USER" dans cet espace.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => setApproveModalOpen(false)}
              className="px-4 py-2 text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] rounded-lg transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleApprove}
              disabled={processing || !selectedTenantId}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {processing && <RefreshCw size={16} className="animate-spin" />}
              <CheckCircle size={16} />
              Approuver
            </button>
          </div>
        </div>
      </Modal>

      {/* Reject Modal */}
      <Modal isOpen={rejectModalOpen} onClose={() => setRejectModalOpen(false)} title="Rejeter la demande">
        <div className="space-y-4">
          {selectedRequest && (
            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
              <p className="font-medium text-red-800 dark:text-red-200">{selectedRequest.name}</p>
              <p className="text-sm text-red-600 dark:text-red-400">{selectedRequest.email}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              Motif du rejet (optionnel)
            </label>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Ex: Informations incomplètes, compte doublon..."
              rows={3}
              className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--bg-elevated)] text-[var(--text-primary)]"
            />
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Ce motif sera communiqué à l'utilisateur par email.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => setRejectModalOpen(false)}
              className="px-4 py-2 text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] rounded-lg transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleReject}
              disabled={processing}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {processing && <RefreshCw size={16} className="animate-spin" />}
              <XCircle size={16} />
              Rejeter
            </button>
          </div>
        </div>
      </Modal>

      {/* Detail Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title="Détail de la demande"
        maxWidth="max-w-2xl"
      >
        {selectedRequest && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-[var(--text-secondary)] uppercase">Nom</label>
                <p className="text-[var(--text-primary)] font-medium">{selectedRequest.name}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--text-secondary)] uppercase">Email</label>
                <p className="text-[var(--text-primary)]">{selectedRequest.email}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--text-secondary)] uppercase">Téléphone</label>
                <p className="text-[var(--text-primary)]">{selectedRequest.phone || '-'}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--text-secondary)] uppercase">Entreprise</label>
                <p className="text-[var(--text-primary)]">{selectedRequest.company_name || '-'}</p>
              </div>
            </div>

            {selectedRequest.message && (
              <div>
                <label className="text-xs font-medium text-[var(--text-secondary)] uppercase">Message</label>
                <p className="text-[var(--text-primary)] bg-[var(--bg-elevated)] p-3 rounded-lg mt-1">
                  {selectedRequest.message}
                </p>
              </div>
            )}

            <div className="border-t border-[var(--border)] pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-[var(--text-secondary)] uppercase">Status</label>
                  <div className="mt-1">
                    <StatusBadge status={selectedRequest.status} />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--text-secondary)] uppercase">Date</label>
                  <p className="text-[var(--text-primary)]">{formatDate(selectedRequest.created_at)}</p>
                </div>
              </div>

              {selectedRequest.reviewed_at && (
                <div className="mt-4 bg-[var(--bg-elevated)] p-3 rounded-lg">
                  <p className="text-sm text-[var(--text-secondary)]">
                    <span className="font-medium">Traité par:</span> {selectedRequest.reviewer_name || 'Inconnu'}
                  </p>
                  <p className="text-sm text-[var(--text-secondary)]">
                    <span className="font-medium">Le:</span> {formatDate(selectedRequest.reviewed_at)}
                  </p>
                  {selectedRequest.rejection_reason && (
                    <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                      <span className="font-medium">Motif:</span> {selectedRequest.rejection_reason}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-[var(--border)]">
              {selectedRequest.status === 'pending' && (
                <>
                  <button
                    onClick={handleSendEmail}
                    disabled={processing}
                    className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-light)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    title="Envoyer un email"
                  >
                    {processing ? <RefreshCw size={16} className="animate-spin" /> : <Mail size={16} />}
                    Envoyer Email
                  </button>
                  <button
                    onClick={handleSendSMS}
                    disabled={processing || !selectedRequest.phone}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    title={selectedRequest.phone ? 'Envoyer un SMS' : 'Aucun numéro de téléphone'}
                  >
                    {processing ? <RefreshCw size={16} className="animate-spin" /> : <MessageSquare size={16} />}
                    Envoyer SMS
                  </button>
                  <button
                    onClick={() => {
                      setDetailModalOpen(false);
                      openApproveModal(selectedRequest);
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                  >
                    <CheckCircle size={16} />
                    Approuver
                  </button>
                  <button
                    onClick={() => {
                      setDetailModalOpen(false);
                      openRejectModal(selectedRequest);
                    }}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 flex items-center gap-2"
                  >
                    <XCircle size={16} />
                    Rejeter
                  </button>
                </>
              )}
              <button
                onClick={() => setDetailModalOpen(false)}
                className="px-4 py-2 bg-[var(--bg-elevated)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-elevated)] dark:hover:bg-slate-600"
              >
                Fermer
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Email Preview Modal */}
      <Modal
        isOpen={emailPreviewModalOpen}
        onClose={() => setEmailPreviewModalOpen(false)}
        title="Aperçu de l'email"
        maxWidth="max-w-3xl"
      >
        <div className="space-y-4">
          <div className="bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] p-3 rounded-lg border border-[var(--border)] dark:border-[var(--primary)]">
            <p className="text-xs text-[var(--primary)] dark:text-[var(--primary)] font-medium mb-1">📧 Destinataire</p>
            <p className="text-[var(--text-primary)] font-medium">{selectedRequest?.email}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Sujet de l'email</label>
            <input
              type="text"
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              placeholder="Ex: Bienvenue chez TrackYu GPS"
              className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--bg-elevated)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--primary)]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Contenu de l'email</label>
            <textarea
              value={emailContent}
              onChange={(e) => setEmailContent(e.target.value)}
              rows={14}
              placeholder="Rédigez votre message..."
              className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--bg-elevated)] text-[var(--text-primary)] font-mono text-sm focus:ring-2 focus:ring-[var(--primary)] leading-relaxed"
            />
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              💡 Les variables ont déjà été remplacées. Vous pouvez personnaliser le message avant envoi.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-[var(--border)]">
            <button
              onClick={() => setEmailPreviewModalOpen(false)}
              className="px-4 py-2 bg-[var(--bg-elevated)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-elevated)] dark:hover:bg-slate-600 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={confirmSendEmail}
              disabled={processing || !emailSubject.trim() || !emailContent.trim()}
              className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-light)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
            >
              {processing ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
              Envoyer l'email
            </button>
          </div>
        </div>
      </Modal>

      {/* SMS Preview Modal */}
      <Modal
        isOpen={smsPreviewModalOpen}
        onClose={() => setSmsPreviewModalOpen(false)}
        title="Aperçu du SMS"
        maxWidth="max-w-xl"
      >
        <div className="space-y-4">
          <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
            <p className="text-xs text-green-600 dark:text-green-400 font-medium mb-1">📱 Destinataire</p>
            <p className="text-[var(--text-primary)] font-medium">{selectedRequest?.phone}</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-[var(--text-primary)]">Message SMS</label>
              <span
                className={`text-xs font-medium ${
                  smsMessage.length > 140 ? 'text-red-500' : 'text-[var(--text-secondary)]'
                }`}
              >
                {smsMessage.length}/160 caractères
              </span>
            </div>
            <textarea
              value={smsMessage}
              onChange={(e) => setSmsMessage(e.target.value)}
              rows={6}
              maxLength={160}
              placeholder="Rédigez votre SMS..."
              className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--bg-elevated)] text-[var(--text-primary)] focus:ring-2 focus:ring-green-500"
            />
            <div className="flex items-center gap-2 mt-2">
              <div className="flex-1 bg-slate-200 bg-[var(--bg-elevated)] rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    smsMessage.length > 140 ? 'bg-red-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${(smsMessage.length / 160) * 100}%` }}
                />
              </div>
              <span className="text-xs text-[var(--text-secondary)] whitespace-nowrap">
                {160 - smsMessage.length} restants
              </span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              💡 Les variables ont déjà été remplacées. Personnalisez si nécessaire.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-[var(--border)]">
            <button
              onClick={() => setSmsPreviewModalOpen(false)}
              className="px-4 py-2 bg-[var(--bg-elevated)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-elevated)] dark:hover:bg-slate-600 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={confirmSendSMS}
              disabled={processing || !smsMessage.trim()}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
            >
              {processing ? <RefreshCw size={16} className="animate-spin" /> : <MessageSquare size={16} />}
              Envoyer le SMS
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default RegistrationRequestsPanel;
