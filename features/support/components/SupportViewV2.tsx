import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  MessageSquare,
  LayoutDashboard,
  Columns3,
  AlertTriangle,
  Settings,
  Plus,
  Search,
  Filter,
  Clock,
  User,
  Trash2,
  Edit2,
  Shield,
  Play,
  Check,
  Lock,
  Paperclip,
  Zap,
  X,
  Send,
  BookOpen,
  TrendingUp,
  CheckCircle,
  Timer,
  ChevronDown,
  MoreVertical,
  ArrowUpRight,
  Calendar,
  Target,
  Users,
  Download,
  Upload,
  FileSpreadsheet,
  FileText,
  RotateCcw,
  Headset,
  CheckSquare,
  Square,
  MinusSquare,
  ChevronLeft,
  ChevronRight,
  SearchX,
} from 'lucide-react';
import { EmptyState } from '../../../components/EmptyState';
import { Modal } from '../../../components/Modal';
import { Card } from '../../../components/Card';
import { SearchBar } from '../../../components/SearchBar';
import { ListItemSkeleton } from '../../../components/Skeleton';
import { useDataContext } from '../../../contexts/DataContext';
import { useToast } from '../../../contexts/ToastContext';
import { useAuth } from '../../../contexts/AuthContext';
import { TicketMessage } from '../../../types';
import type {
  Tier,
  TicketCategory,
  Intervention,
  Ticket,
  HelpArticle,
  Integration,
  InterventionType,
  InterventionNature,
} from '../../../types';
import type { User as UserType } from '../../../types/auth';
import { api } from '../../../services/apiLazy';
import { CreateTicketSchema } from '../../../schemas/ticketSchema';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { TOAST } from '../../../constants/toastMessages';
import { mapError } from '../../../utils/errorMapper';
import { InterventionForm } from '../../tech/components/InterventionForm';
import { TicketFormModal } from './partials/TicketFormModal';
import { AttachmentUpload } from './AttachmentUpload';
import { EscalateTicketModal } from './EscalateTicketModal';
import {
  FILTERS_CONFIG,
  PRIORITY_ORDER,
  getStatusInfo,
  getSlaStatus,
  INTERVENTION_TYPES_CONFIG,
  MACROS,
} from '../utils';
import { STAFF_ROLES, TICKET_ASSIGNABLE_ROLES } from '../constants';
import { calculateTicketResolutionStats, formatTicketDuration } from '../utils/ticketResolutionTime';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  LineChart,
  Line,
} from 'recharts';
import { LiveChatPanel } from './LiveChatPanel';
import { logger } from '../../../utils/logger';
import { useConfirmDialog } from '../../../components/ConfirmDialog';
import { TicketChatPanel } from './TicketChatPanel';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { MobileTabLayout } from '../../../components/MobileTabLayout';
import { useMobileViewTabs } from '../../../hooks/useMobileViewTabs';

// ============================================================================
// TYPES
// ============================================================================
interface MacroApiResponse {
  id: string;
  label: string;
  text: string;
  category?: string;
  is_active?: boolean;
  isSystem?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
}

interface Macro {
  id: string;
  label: string;
  text: string;
  category?: string;
  isActive?: boolean;
}

type TabId = 'DASHBOARD' | 'TICKETS' | 'KANBAN' | 'SLA' | 'CONFIG' | 'LIVECHAT';

// Local interface for API subcategory config response
interface SubCategoryConfig {
  id: number;
  name: string;
  default_priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  sla_hours: number;
  _modified?: boolean;
}

const SUPPORT_MOBILE_HIDDEN = new Set<TabId>(['KANBAN', 'SLA', 'CONFIG']);

const SUPPORT_TABS = [
  {
    id: 'DASHBOARD' as TabId,
    label: 'Dashboard',
    icon: LayoutDashboard,
    color: 'bg-purple-500',
    description: "Vue d'ensemble du support",
  },
  {
    id: 'TICKETS' as TabId,
    label: 'Tickets',
    icon: MessageSquare,
    color: 'bg-[var(--primary-dim)]0',
    description: 'Gestion des tickets',
  },
  {
    id: 'KANBAN' as TabId,
    label: 'Kanban',
    icon: Columns3,
    color: 'bg-teal-500',
    description: 'Vue Kanban des tickets',
  },
  {
    id: 'SLA' as TabId,
    label: 'SLA Monitor',
    icon: AlertTriangle,
    color: 'bg-red-500',
    description: 'Surveillance des délais SLA',
  },
  {
    id: 'CONFIG' as TabId,
    label: 'Configuration',
    icon: Settings,
    color: 'bg-[var(--text-secondary)]',
    description: 'Paramètres du support',
  },
  { id: 'LIVECHAT' as TabId, label: 'Live Chat', icon: Headset, color: 'bg-green-500', description: 'Chat en direct' },
];

const KANBAN_COLUMNS = [
  { id: 'OPEN', label: 'Ouvert', color: 'blue', borderClass: 'border-[var(--primary)]' },
  { id: 'IN_PROGRESS', label: 'En Cours', color: 'orange', borderClass: 'border-orange-500' },
  { id: 'WAITING_CLIENT', label: 'En Attente', color: 'purple', borderClass: 'border-purple-500' },
  { id: 'RESOLVED', label: 'Résolu', color: 'green', borderClass: 'border-green-500' },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export const SupportViewV2: React.FC = () => {
  const {
    tickets,
    clients,
    interventions,
    vehicles,
    users,
    updateTicket,
    addTicket,
    addIntervention,
    tiers,
    slaConfig,
    ticketCategories,
    ticketSubcategories,
    invoices,
    deleteTicket,
  } = useDataContext();
  const { showToast } = useToast();
  const { confirm, ConfirmDialogComponent } = useConfirmDialog();
  const { user, hasPermission } = useAuth();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();

  // Tab State
  const [activeTab, setActiveTab] = useState<TabId>('TICKETS');
  const { filterTabsForView } = useMobileViewTabs();
  const visibleSupportTabs = useMemo(() => {
    const baseTabs = isMobile ? SUPPORT_TABS.filter((t) => !SUPPORT_MOBILE_HIDDEN.has(t.id)) : SUPPORT_TABS;
    return isMobile ? filterTabsForView('supportView', baseTabs) : baseTabs;
  }, [isMobile, filterTabsForView]);

  // Ticket Selection & Filters
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Pagination
  const PAGE_SIZE = 25;
  const [currentPage, setCurrentPage] = useState(1);

  // Debounced search (300ms)
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, priorityFilter, categoryFilter]);

  // Server-side paginated ticket list
  const { data: ticketPageData, isLoading: loadingTicketList } = useQuery({
    queryKey: [
      'tickets-paged',
      user?.tenantId,
      currentPage,
      PAGE_SIZE,
      statusFilter,
      priorityFilter,
      categoryFilter,
      debouncedSearch,
    ],
    queryFn: () =>
      api.tickets.list({
        page: currentPage,
        limit: PAGE_SIZE,
        search: debouncedSearch || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        priority: priorityFilter !== 'ALL' ? priorityFilter : undefined,
        category: categoryFilter !== 'ALL' ? categoryFilter : undefined,
      }),
    enabled: !!user,
    placeholderData: (prev) => prev,
  });

  const pagedTickets = ticketPageData?.data ?? [];
  const totalTicketCount = ticketPageData?.total ?? 0;
  const totalPages = ticketPageData?.totalPages ?? 1;

  // Message State
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stagedAttachments, setStagedAttachments] = useState<File[]>([]);

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSavingTicket, setIsSavingTicket] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState<string | null>(null);
  const [statusReason, setStatusReason] = useState('');
  const [isInterventionModalOpen, setIsInterventionModalOpen] = useState(false);
  const [interventionInitialData, setInterventionInitialData] = useState<Intervention | null>(null);
  const [pendingKanbanDrop, setPendingKanbanDrop] = useState<{ ticketId: string; newStatus: string } | null>(null);
  const [kanbanDropReason, setKanbanDropReason] = useState('');

  // Macros State
  const [macros, setMacros] = useState<Macro[]>([]);
  const [loadingMacros, setLoadingMacros] = useState(false);
  const [isEditingMacro, setIsEditingMacro] = useState<Macro | null>(null);
  const [newMacro, setNewMacro] = useState({ label: '', text: '', category: '' });

  // Import State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const importFileRef = useRef<HTMLInputElement>(null);

  // Escalate State
  const [isEscalateModalOpen, setIsEscalateModalOpen] = useState(false);

  // Bulk Selection State
  const [selectedTicketIds, setSelectedTicketIds] = useState<Set<string>>(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);

  // Ticket Form
  const [ticketForm, setTicketForm] = useState<any>({
    id: '',
    clientId: '',
    subject: '',
    category: 'Commercial',
    subCategory: '',
    interventionType: '',
    priority: 'MEDIUM',
    vehicleId: '',
    description: '',
    assignedTo: '',
  });

  // External Data
  const [faqArticles, setFaqArticles] = useState<HelpArticle[]>([]);
  const [integrations, setIntegrations] = useState<Integration[]>([]);

  // Category Config State
  const [expandedCategory, setExpandedCategory] = useState<number | null>(null);
  const [configSubCategories, setConfigSubCategories] = useState<SubCategoryConfig[]>([]);
  const [loadingConfig, setLoadingConfig] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [articles, integ] = await Promise.all([
          api.adminFeatures.helpArticles.list(),
          api.adminFeatures.integrations.list(),
        ]);
        setFaqArticles(articles.filter((a: HelpArticle) => a.is_published));
        setIntegrations(integ);
      } catch {
        /* silent */
      }
    };
    loadData();
  }, []);

  // Load macros from API
  useEffect(() => {
    const loadMacros = async () => {
      setLoadingMacros(true);
      try {
        const data = await api.adminFeatures.supportSettings.getMacros();
        setMacros(
          data.map((m: MacroApiResponse) => ({
            id: m.id,
            label: m.label,
            text: m.text,
            category: m.category,
            isActive: m.is_active !== false,
            isSystem: m.isSystem,
            canEdit: m.canEdit,
            canDelete: m.canDelete,
          }))
        );
      } catch {
        // Fallback to default macros if API fails
        setMacros(MACROS.map((m) => ({ ...m, isActive: true })));
      } finally {
        setLoadingMacros(false);
      }
    };
    loadMacros();
  }, []);

  // Computed Values
  const selectedTicket = tickets.find((t) => t.id === selectedTicketId);
  // Utiliser clientName du ticket (backend JOIN) ou fallback sur clients locaux
  const getClientName = (ticket: Ticket | undefined) => {
    if (!ticket) return 'Client inconnu';
    if (ticket.clientName) return ticket.clientName;
    const localClient = clients.find((c) => c.id === ticket.clientId);
    return localClient?.name || 'Client inconnu';
  };
  const clientDetails = selectedTicket ? clients.find((c) => c.id === selectedTicket.clientId) : null;
  const relatedInterventions = selectedTicket ? interventions.filter((i) => i.ticketId === selectedTicket.id) : [];
  // Rôles staff complets (incluant TECH) — pour les interventions
  const staffRoles = STAFF_ROLES;
  // Staff assignable aux TICKETS (sans techniciens)
  const ticketStaff = useMemo(
    () =>
      users.filter(
        (u) =>
          (TICKET_ASSIGNABLE_ROLES as readonly string[]).includes(u.role) ||
          (((u.role || '').toLowerCase().includes('support') ||
            (u.role || '').toLowerCase().includes('tracking') ||
            (u.role || '').toLowerCase().includes('admin') ||
            (u.role || '').toLowerCase().includes('manager')) &&
            !(u.role || '').toLowerCase().includes('technicien') &&
            u.role !== 'TECH')
      ),
    [users]
  );
  // Vérifier si l'utilisateur connecté est un technicien
  const isCurrentUserTech = user?.role === 'TECH' || user?.role?.toLowerCase().includes('technicien');

  // Client Metrics
  const clientMetrics = useMemo(() => {
    if (!clientDetails) return null;
    const clientVehicles = vehicles.filter(
      (v) => v.client === clientDetails.name || v.client === clientDetails.id || v.clientId === clientDetails.id
    );
    const vehicleCount = clientVehicles.length;
    const seniorityYears = clientDetails.createdAt
      ? Math.max(1, new Date().getFullYear() - new Date(clientDetails.createdAt).getFullYear())
      : 1;
    // Real revenue from invoices (PAID status)
    const clientInvoices = invoices.filter(
      (inv) => inv.clientId === clientDetails.id || inv.tier_id === clientDetails.id
    );
    const revenueYTD = clientInvoices
      .filter((inv) => inv.status === 'PAID')
      .reduce((sum, inv) => sum + (inv.amountTTC || inv.amount || 0), 0);
    // Real payment status from invoices
    const hasOverdue = clientInvoices.some(
      (inv) => inv.status === 'OVERDUE' || (inv.status === 'SENT' && inv.dueDate && new Date(inv.dueDate) < new Date())
    );
    const paymentStatus = hasOverdue ? 'LATE' : 'OK';
    return { vehicleCount, seniorityYears, revenueYTD, paymentStatus };
  }, [clientDetails, vehicles, invoices]);

  // Ticket Counts
  const ticketCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: tickets.length };
    FILTERS_CONFIG.forEach((f) => {
      if (f.id !== 'ALL') counts[f.id] = tickets.filter((t) => t.status === f.id).length;
    });
    return counts;
  }, [tickets]);

  // Filtered Tickets
  const filteredTickets = useMemo(() => {
    return tickets
      .filter((t) => {
        const clientName = t.clientName || clients.find((c) => c.id === t.clientId)?.name || '';
        const searchLower = searchTerm.toLowerCase();
        const assignedName = t.assignedUserName || users.find((u) => u.id === t.assignedTo)?.name || '';
        const vehicleName = t.vehicleId
          ? vehicles.find((v) => v.id === t.vehicleId)?.name || vehicles.find((v) => v.id === t.vehicleId)?.plate || ''
          : '';
        const messageTexts = (t.messages || []).map((m) => m.text).join(' ');
        const matchesSearch =
          !searchLower ||
          (t.id || '').toLowerCase().includes(searchLower) ||
          (t.subject || '').toLowerCase().includes(searchLower) ||
          clientName.toLowerCase().includes(searchLower) ||
          (t.description || '').toLowerCase().includes(searchLower) ||
          (t.category || '').toLowerCase().includes(searchLower) ||
          (t.subCategory || '').toLowerCase().includes(searchLower) ||
          assignedName.toLowerCase().includes(searchLower) ||
          vehicleName.toLowerCase().includes(searchLower) ||
          (t.source || '').toLowerCase().includes(searchLower) ||
          messageTexts.toLowerCase().includes(searchLower);
        const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
        const matchesPriority = priorityFilter === 'ALL' || t.priority === priorityFilter;
        const matchesCategory = categoryFilter === 'ALL' || t.category === categoryFilter;
        return matchesSearch && matchesStatus && matchesPriority && matchesCategory;
      })
      .sort((a, b) => {
        // 1. Tickets fermés/résolus en bas
        const closedStatuses = ['CLOSED', 'RESOLVED'];
        const aIsClosed = closedStatuses.includes(a.status) ? 1 : 0;
        const bIsClosed = closedStatuses.includes(b.status) ? 1 : 0;
        if (aIsClosed !== bIsClosed) return aIsClosed - bIsClosed;
        // 2. Par priorité (CRITICAL → HIGH → MEDIUM → LOW)
        const priorityDiff = (PRIORITY_ORDER[a.priority] || 2) - (PRIORITY_ORDER[b.priority] || 2);
        if (priorityDiff !== 0) return priorityDiff;
        // 3. Par date (plus récent en premier)
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [tickets, searchTerm, statusFilter, priorityFilter, categoryFilter, clients]);

  // SLA Stats
  const slaStats = useMemo(() => {
    const activeTickets = tickets.filter((t) => !['CLOSED', 'RESOLVED'].includes(t.status));
    const criticalSla = activeTickets.filter((t) => getSlaStatus(t.createdAt, t.priority, slaConfig) === 'CRITICAL');
    const warningSla = activeTickets.filter((t) => getSlaStatus(t.createdAt, t.priority, slaConfig) === 'WARNING');
    const okSla = activeTickets.filter((t) => getSlaStatus(t.createdAt, t.priority, slaConfig) === 'OK');
    const slaRespect = activeTickets.length > 0 ? Math.round((okSla.length / activeTickets.length) * 100) : 100;
    return {
      critical: criticalSla,
      warning: warningSla,
      ok: okSla,
      respectRate: slaRespect,
      total: activeTickets.length,
    };
  }, [tickets, slaConfig]);

  // Resolution Stats
  const resolutionStats = useMemo(() => calculateTicketResolutionStats(tickets, slaConfig), [tickets, slaConfig]);

  // ========================================================================
  // ACTIONS
  // ========================================================================
  const openCreateModal = () => {
    setIsEditMode(false);
    setFormErrors({});
    setTicketForm({
      id: '',
      clientId: '',
      subject: '',
      category: 'Support Technique',
      subCategory: '',
      interventionType: '',
      priority: 'MEDIUM',
      vehicleId: '',
      description: '',
      assignedTo: '',
      source: 'TrackYu',
      receivedAt: new Date(),
    });
    setIsCreateModalOpen(true);
  };

  const openEditModal = () => {
    if (!selectedTicket) return;
    setIsEditMode(true);
    setFormErrors({});
    setTicketForm({ ...selectedTicket });
    setIsCreateModalOpen(true);
  };

  const handleSaveTicket = async () => {
    if (isSavingTicket) return;
    setIsSavingTicket(true);
    // In edit mode, skip strict CreateTicketSchema validation (only validate on creation)
    if (!isEditMode) {
      const validationResult = CreateTicketSchema.safeParse({
        ...ticketForm,
        vehicleId: ticketForm.vehicleId || undefined,
        subCategory: ticketForm.subCategory || undefined,
      });
      if (!validationResult.success) {
        const errors: Record<string, string> = {};
        validationResult.error.issues.forEach((issue) => {
          if (issue.path[0]) errors[issue.path[0].toString()] = issue.message;
        });
        setFormErrors(errors);
        const fieldNames: Record<string, string> = {
          clientId: 'Client',
          subject: 'Sujet',
          description: 'Description',
          category: 'Catégorie',
          priority: 'Priorité',
        };
        const errorFields = Object.keys(errors)
          .map((k) => fieldNames[k] || k)
          .join(', ');
        showToast(TOAST.VALIDATION.REQUIRED_FIELDS, 'error');
        return;
      }
    } else {
      // For edit mode, only require subject to be present
      if (!ticketForm.subject || ticketForm.subject.trim() === '') {
        setFormErrors({ subject: 'Le sujet est requis' });
        showToast(TOAST.VALIDATION.FORM_ERRORS, 'error');
        return;
      }
    }

    setFormErrors({}); // Clear any previous errors

    try {
      if (isEditMode && selectedTicket) {
        updateTicket({ ...selectedTicket, ...ticketForm, updatedAt: new Date() });
        showToast(TOAST.SUPPORT.TICKET_UPDATED(ticketForm.id), 'success');
      } else {
        const newId = `T-${Date.now().toString().slice(-6)}`;
        const createdTicket = await addTicket({
          ...ticketForm,
          id: newId,
          tenantId: user?.tenantId || '',
          status: 'OPEN',
          createdAt: new Date(),
          updatedAt: new Date(),
          messages: [],
        } as Ticket);

        // Upload staged attachments if any
        const ticketId = createdTicket?.id || newId;
        if (stagedAttachments.length > 0) {
          let uploaded = 0;
          for (const file of stagedAttachments) {
            try {
              const formData = new FormData();
              formData.append('file', file);
              await api.tickets.addAttachment(ticketId, formData);
              uploaded++;
            } catch {
              // Continue uploading remaining files
            }
          }
          if (uploaded > 0) {
            showToast(TOAST.SUPPORT.TICKET_CREATED_WITH_ATTACHMENTS(uploaded), 'success');
          } else {
            showToast(TOAST.SUPPORT.TICKET_CREATED_ATTACHMENTS_FAILED, 'warning');
          }
          setStagedAttachments([]);
        } else {
          showToast(TOAST.SUPPORT.TICKET_CREATED, 'success');
        }
      }
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    } catch (error) {
      showToast(mapError(error, 'ticket'), 'error');
    } finally {
      setIsSavingTicket(false);
    }
    setIsCreateModalOpen(false);
  };

  const handleStatusClick = (status: string) => {
    setTargetStatus(status);
    setStatusReason('');
    setIsStatusModalOpen(true);
  };

  // ========================================================================
  // BULK ACTIONS
  // ========================================================================
  const toggleTicketSelection = (ticketId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedTicketIds((prev) => {
      const next = new Set(prev);
      if (next.has(ticketId)) next.delete(ticketId);
      else next.add(ticketId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedTicketIds.size === pagedTickets.length) {
      setSelectedTicketIds(new Set());
    } else {
      setSelectedTicketIds(new Set(pagedTickets.map((t) => t.id)));
    }
  };

  const clearSelection = () => setSelectedTicketIds(new Set());

  const handleBulkTakeCharge = async () => {
    if (selectedTicketIds.size === 0 || bulkProcessing) return;
    if (isCurrentUserTech) {
      showToast(TOAST.SUPPORT.TICKET_TECH_ONLY, 'warning');
      return;
    }
    setBulkProcessing(true);
    try {
      const ids = Array.from(selectedTicketIds);
      const result = await api.tickets.bulkUpdate(ids, { status: 'IN_PROGRESS', assigned_to: user?.id });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['tickets-paged'] });
      setSelectedTicketIds(new Set());
      showToast(
        TOAST.SUPPORT.BATCH_TAKEN(result.updated, ids.length - result.updated),
        result.updated > 0 ? 'success' : 'error'
      );
    } catch {
      showToast(TOAST.SUPPORT.BATCH_TAKEN(0, selectedTicketIds.size), 'error');
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleBulkResolve = async () => {
    if (selectedTicketIds.size === 0 || bulkProcessing) return;
    setBulkProcessing(true);
    try {
      const ids = Array.from(selectedTicketIds);
      const result = await api.tickets.bulkUpdate(ids, { status: 'RESOLVED' });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['tickets-paged'] });
      setSelectedTicketIds(new Set());
      showToast(
        TOAST.SUPPORT.BATCH_RESOLVED(result.updated, ids.length - result.updated),
        result.updated > 0 ? 'success' : 'error'
      );
    } catch {
      showToast(TOAST.SUPPORT.BATCH_RESOLVED(0, selectedTicketIds.size), 'error');
    } finally {
      setBulkProcessing(false);
    }
  };

  // Prise en charge directe sans demander de motif
  const handleTakeCharge = async () => {
    if (!selectedTicketId) return;
    if (isCurrentUserTech) {
      showToast(TOAST.SUPPORT.TICKET_TECH_ONLY, 'warning');
      return;
    }
    const ticket = tickets.find((t) => t.id === selectedTicketId);
    if (!ticket) return;
    try {
      await api.tickets.update({ ...ticket, status: 'IN_PROGRESS' as Ticket['status'], assignedTo: user?.id });
      await api.tickets.addMessage(selectedTicketId, {
        sender: 'SYSTEM',
        text: `Statut: ${ticket.status} \u27a4 IN_PROGRESS\nPris en charge par ${user?.name || 'Agent'}`,
      });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      showToast(TOAST.SUPPORT.TICKET_TAKEN, 'success');
    } catch (error) {
      logger.error('Failed to take charge:', error);
      showToast(mapError(error, 'ticket'), 'error');
    }
  };

  // Résolution directe sans demander de motif
  const handleResolve = async () => {
    if (!selectedTicketId) return;
    const ticket = tickets.find((t) => t.id === selectedTicketId);
    if (!ticket) return;
    try {
      await api.tickets.update({ ...ticket, status: 'RESOLVED' as Ticket['status'] });
      await api.tickets.addMessage(selectedTicketId, {
        sender: 'SYSTEM',
        text: `Statut: ${ticket.status} \u27a4 RESOLVED\nRésolu par ${user?.name || 'Agent'}`,
      });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      showToast(TOAST.SUPPORT.TICKET_RESOLVED, 'success');
    } catch (error) {
      logger.error('Failed to resolve:', error);
      showToast(mapError(error, 'ticket'), 'error');
    }
  };

  const confirmStatusChange = async () => {
    if (!selectedTicketId || !targetStatus || !statusReason.trim()) {
      showToast(TOAST.SUPPORT.REASON_REQUIRED, 'error');
      return;
    }
    const ticket = tickets.find((t) => t.id === selectedTicketId);
    if (ticket) {
      try {
        // 1. Persist status change via API (await to catch errors)
        await api.tickets.update({ ...ticket, status: targetStatus as Ticket['status'] });
        // 2. Persist system message via API
        await api.tickets.addMessage(selectedTicketId, {
          sender: 'SYSTEM',
          text: `Statut: ${ticket.status} ➔ ${targetStatus}\nMotif: ${statusReason}`,
        });
        // 3. Refresh tickets to get updated data from backend
        queryClient.invalidateQueries({ queryKey: ['tickets'] });
        showToast(TOAST.SUPPORT.TICKET_STATUS_CHANGED(targetStatus), 'success');
      } catch (error) {
        logger.error('Failed to update status:', error);
        showToast(mapError(error, 'ticket'), 'error');
      }
    }
    setIsStatusModalOpen(false);
  };

  const handleKanbanDrop = async (ticketId: string, newStatus: string) => {
    const ticket = tickets.find((t) => t.id === ticketId);
    // Bloquer le déplacement des tickets RESOLVED ou CLOSED
    if (ticket && ['RESOLVED', 'CLOSED'].includes(ticket.status)) {
      showToast(TOAST.SUPPORT.TICKET_READONLY, 'error');
      return;
    }
    if (ticket && ticket.status !== newStatus) {
      // Prise en charge directe sans motif (Kanban drag vers IN_PROGRESS)
      if (newStatus === 'IN_PROGRESS' && ticket.status === 'OPEN') {
        if (isCurrentUserTech) {
          showToast(TOAST.SUPPORT.TICKET_TECH_ONLY, 'warning');
          return;
        }
        try {
          updateTicket({ ...ticket, status: 'IN_PROGRESS' as Ticket['status'], assignedTo: user?.id });
          await api.tickets.addMessage(ticketId, {
            sender: 'SYSTEM',
            text: `Statut: ${ticket.status} \u27a4 IN_PROGRESS\nPris en charge par ${user?.name || 'Agent'}`,
          });
          queryClient.invalidateQueries({ queryKey: ['tickets'] });
          showToast(TOAST.SUPPORT.TICKET_TAKEN, 'success');
        } catch (error) {
          logger.error('Failed to take charge via kanban:', error);
          showToast(mapError(error, 'ticket'), 'error');
        }
        return;
      }
      // Résolution directe sans motif (Kanban drag vers RESOLVED)
      if (newStatus === 'RESOLVED' && ticket.status === 'IN_PROGRESS') {
        try {
          updateTicket({ ...ticket, status: 'RESOLVED' as Ticket['status'] });
          await api.tickets.addMessage(ticketId, {
            sender: 'SYSTEM',
            text: `Statut: ${ticket.status} \u27a4 RESOLVED\nRésolu par ${user?.name || 'Agent'}`,
          });
          queryClient.invalidateQueries({ queryKey: ['tickets'] });
          showToast(TOAST.SUPPORT.TICKET_RESOLVED, 'success');
        } catch (error) {
          logger.error('Failed to resolve via kanban:', error);
          showToast(mapError(error, 'ticket'), 'error');
        }
        return;
      }
      setPendingKanbanDrop({ ticketId, newStatus });
      setKanbanDropReason('');
    }
  };

  const confirmKanbanDrop = async () => {
    if (!pendingKanbanDrop) return;
    if (!kanbanDropReason.trim()) {
      showToast(TOAST.SUPPORT.REASON_REQUIRED, 'error');
      return;
    }
    const { ticketId, newStatus } = pendingKanbanDrop;
    const ticket = tickets.find((t) => t.id === ticketId);
    if (!ticket) return;

    try {
      // 1. Persist status change via API
      updateTicket({ ...ticket, status: newStatus as Ticket['status'] });
      // 2. Persist system message via API
      await api.tickets.addMessage(ticketId, {
        sender: 'SYSTEM',
        text: `Statut: ${ticket.status} ➔ ${newStatus} (Kanban) — Motif: ${kanbanDropReason.trim()}`,
      });
      // 3. Refresh to get backend-computed timestamps
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      showToast(TOAST.SUPPORT.TICKET_STATUS_CHANGED(newStatus), 'success');
    } catch (error) {
      logger.error('Failed to update ticket status:', error);
      showToast(mapError(error, 'ticket'), 'error');
    }
    setPendingKanbanDrop(null);
    setKanbanDropReason('');
  };

  // Macros CRUD - Now with API persistence
  const saveMacro = async () => {
    if (!newMacro.label || !newMacro.text) {
      showToast(TOAST.MACRO.LABEL_AND_TEXT_REQUIRED, 'error');
      return;
    }
    try {
      if (isEditingMacro) {
        const updated = await api.adminFeatures.supportSettings.updateMacro(isEditingMacro.id, {
          label: newMacro.label,
          text: newMacro.text,
          category: newMacro.category,
        });
        setMacros((prev) =>
          prev.map((m) =>
            m.id === isEditingMacro.id
              ? {
                  ...m,
                  label: updated.label,
                  text: updated.text,
                  category: updated.category,
                }
              : m
          )
        );
        showToast(TOAST.MACRO.UPDATED, 'success');
      } else {
        const created = await api.adminFeatures.supportSettings.createMacro({
          label: newMacro.label,
          text: newMacro.text,
          category: newMacro.category,
        });
        setMacros((prev) => [
          ...prev,
          {
            id: created.id,
            label: created.label,
            text: created.text,
            category: created.category,
            isActive: true,
            canEdit: true,
            canDelete: true,
          },
        ]);
        showToast(TOAST.MACRO.CREATED, 'success');
      }
    } catch (error) {
      showToast(mapError(error, 'macro'), 'error');
    }
    setNewMacro({ label: '', text: '', category: '' });
    setIsEditingMacro(null);
  };

  const deleteMacro = async (id: string) => {
    try {
      await api.adminFeatures.supportSettings.deleteMacro(id);
      setMacros((prev) => prev.filter((m) => m.id !== id));
      showToast(TOAST.MACRO.DELETED, 'success');
    } catch (error) {
      showToast(mapError(error, 'macro'), 'error');
    }
  };

  const handleDeleteTicket = async (ticketId: string, ticketSubject: string) => {
    if (
      !(await confirm({
        message: `Supprimer le ticket "${ticketSubject}" ?\n\nCette action est irréversible.`,
        variant: 'danger',
        title: 'Confirmer la suppression',
        confirmLabel: 'Supprimer',
      }))
    )
      return;
    try {
      deleteTicket(ticketId);
      setSelectedTicketId(null);
      showToast('Ticket supprimé avec succès', 'success');
    } catch (error) {
      showToast(mapError(error, 'ticket'), 'error');
    }
  };

  // ========================================================================
  // EXPORT / IMPORT FUNCTIONS
  // ========================================================================
  const handleExportCSV = () => {
    const headers = [
      'ID',
      'Sujet',
      'Client',
      'Catégorie',
      'Priorité',
      'Statut',
      'Canal',
      'Date réception',
      'Assigné à',
      'Créé le',
      'Description',
    ];
    const rows = filteredTickets.map((t) => {
      const assignee = users.find((u) => u.id === t.assignedTo);
      return [
        t.id,
        t.subject,
        getClientName(t),
        t.category,
        t.priority,
        t.status,
        t.source || 'TrackYu',
        t.receivedAt ? new Date(t.receivedAt).toLocaleString('fr-FR') : '',
        assignee?.name || t.assignedTo || '',
        new Date(t.createdAt).toLocaleDateString('fr-FR'),
        (t.description || '').replace(/;/g, ',').replace(/\n/g, ' '),
      ];
    });
    const csvContent = [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tickets_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast(TOAST.IO.EXPORT_SUCCESS('CSV'), 'success');
  };

  const handleExportExcel = () => {
    // Export as TSV (Tab Separated Values) which Excel opens natively
    const headers = [
      'ID',
      'Sujet',
      'Client',
      'Catégorie',
      'Priorité',
      'Statut',
      'Canal',
      'Date réception',
      'Assigné à',
      'Créé le',
      'Description',
    ];
    const rows = filteredTickets.map((t) => {
      const assignee = users.find((u) => u.id === t.assignedTo);
      return [
        t.id,
        t.subject,
        getClientName(t),
        t.category,
        t.priority,
        t.status,
        t.source || 'TrackYu',
        t.receivedAt ? new Date(t.receivedAt).toLocaleString('fr-FR') : '',
        assignee?.name || t.assignedTo || '',
        new Date(t.createdAt).toLocaleDateString('fr-FR'),
        (t.description || '').replace(/\t/g, ' ').replace(/\n/g, ' '),
      ];
    });
    const tsvContent = [headers.join('\t'), ...rows.map((r) => r.join('\t'))].join('\n');
    const blob = new Blob(['\ufeff' + tsvContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tickets_export_${new Date().toISOString().split('T')[0]}.xls`;
    link.click();
    URL.revokeObjectURL(url);
    showToast(TOAST.IO.EXPORT_SUCCESS('Excel'), 'success');
  };

  const handleExportPDF = () => {
    // Simple PDF generation using data URL
    const title = 'Export Tickets';
    const headers = ['ID', 'Sujet', 'Priorité', 'Statut', 'Client'];
    const rows = filteredTickets.map((t) => {
      return [t.id.slice(-8), t.subject.slice(0, 30), t.priority, t.status, getClientName(t).slice(0, 20)];
    });

    // Create HTML for PDF
    const htmlContent = `
            <html><head><style>
                body { font-family: Arial; padding: 20px; }
                h1 { color: #1e293b; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th { background: #3b82f6; color: white; padding: 10px; text-align: left; }
                td { border: 1px solid #e2e8f0; padding: 8px; }
                tr:nth-child(even) { background: #f8fafc; }
            </style></head><body>
                <h1>${title}</h1>
                <p>Date: ${new Date().toLocaleDateString('fr-FR')} - Total: ${rows.length} tickets</p>
                <table>
                    <tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr>
                    ${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}
                </table>
            </body></html>
        `;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.print();
    }
    showToast(TOAST.IO.PDF_GENERATED, 'success');
  };

  const handleDownloadImportTemplate = () => {
    const template = `clientId;subject;category;priority;description;vehicleId
CLIENT-001;Problème GPS;Demande d'intervention;HIGH;Description du problème;VEH-001
CLIENT-002;Installation demandée;Demande d'intervention;MEDIUM;Nouvelle installation;VEH-002`;
    const blob = new Blob(['\ufeff' + template], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'template_import_tickets.csv';
    link.click();
    URL.revokeObjectURL(url);
    showToast(TOAST.IO.TEMPLATE_DOWNLOADED, 'success');
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').filter((l) => l.trim());
      if (lines.length > 1) {
        const headers = lines[0].split(';').map((h) => h.trim().toLowerCase());
        const items = lines.slice(1).map((line, idx) => {
          const values = line.split(';');
          const item: any = { _row: idx + 2 };
          headers.forEach((h, i) => {
            item[h] = values[i]?.trim() || '';
          });
          return item;
        });
        setImportPreview(items);
      }
    };
    reader.readAsText(file);
  };

  const handleImportTickets = async () => {
    let successCount = 0;
    let errorCount = 0;
    for (const item of importPreview) {
      try {
        const newTicket: Partial<Ticket> = {
          clientId: item.clientid || '',
          subject: item.subject || 'Sans titre',
          category: item.category || "Demande d'intervention",
          priority: (item.priority || 'MEDIUM').toUpperCase() as Ticket['priority'],
          description: item.description || '',
          vehicleId: item.vehicleid || '',
          status: 'OPEN',
          messages: [],
        };
        await api.tickets.create(newTicket as Ticket);
        successCount++;
      } catch {
        errorCount++;
      }
    }
    queryClient.invalidateQueries({ queryKey: ['tickets'] });
    showToast(TOAST.IO.IMPORT_PARTIAL(successCount, errorCount), successCount > 0 ? 'success' : 'error');
    setIsImportModalOpen(false);
    setImportPreview([]);
  };

  // ========================================================================
  // RENDER HELPERS
  // ========================================================================
  const getPriorityBadge = (priority: string) => {
    const styles: Record<string, string> = {
      CRITICAL: 'bg-red-100 text-red-700 border-red-200',
      HIGH: 'bg-orange-100 text-orange-700 border-orange-200',
      MEDIUM: 'bg-[var(--primary-dim)] text-[var(--primary)] border-[var(--border)]',
      LOW: 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] border-[var(--border)]',
    };
    return styles[priority] || styles.MEDIUM;
  };

  const getSlaBadge = (ticket: Ticket) => {
    if (['CLOSED', 'RESOLVED'].includes(ticket.status)) return null;
    const sla = getSlaStatus(ticket.createdAt, ticket.priority, slaConfig);
    if (sla === 'CRITICAL')
      return <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-[10px] font-bold">SLA !</span>;
    if (sla === 'WARNING')
      return <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded text-[10px] font-bold">SLA</span>;
    return null;
  };

  const getRemainingTime = (ticket: Ticket) => {
    // Use dynamic config or fallback to defaults
    const config = slaConfig || { CRITICAL: 4, HIGH: 24, MEDIUM: 48, LOW: 72 };
    const priority = ticket.priority as keyof typeof config;
    // Handle case case sensitivity if needed, assuming keys match
    const limit =
      Number(config[priority] || config[(ticket.priority || '').toUpperCase() as keyof typeof config]) || 48;

    const elapsed = (Date.now() - new Date(ticket.createdAt).getTime()) / (1000 * 60 * 60);
    const remaining = limit - elapsed;
    if (remaining < 0)
      return <span className="text-red-600 font-bold">Dépassé de {Math.abs(Math.round(remaining))}h</span>;
    if (remaining < 4) return <span className="text-orange-600 font-bold">{Math.round(remaining)}h restantes</span>;
    return <span className="text-green-600">{Math.round(remaining)}h restantes</span>;
  };

  // ========================================================================
  // RENDER
  // ========================================================================
  return (
    <div className="h-[calc(100vh-204px)] lg:h-[calc(100vh-140px)] flex flex-col space-y-4 animate-in fade-in duration-500">
      {/* TABS + ACTIONS */}
      <div className="flex items-center justify-between gap-2">
        {/* Tab bar — desktop only */}
        {!isMobile && (
          <div className="flex gap-1 overflow-x-auto">
            {visibleSupportTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`filter-chip flex items-center gap-2 ${activeTab === tab.id ? 'active' : ''}`}
              >
                <tab.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
                {tab.id === 'SLA' && slaStats.critical.length > 0 && (
                  <span className="px-1.5 py-0.5 bg-red-500 text-white rounded-full text-[10px] font-bold">
                    {slaStats.critical.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2">
          {/* Export + Import — desktop only */}
          <div className="hidden sm:flex items-center gap-1 border-r border-[var(--border)] pr-2">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1 px-2 py-1.5 text-xs font-bold rounded border border-[var(--border)] text-[var(--primary)] bg-[var(--primary-dim)] hover:bg-[var(--primary-dim)] transition-colors"
              title="Export CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> CSV
            </button>
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1 px-2 py-1.5 text-xs font-bold rounded border border-green-200 text-green-600 bg-green-50 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400 hover:bg-green-100 transition-colors"
              title="Export Excel"
            >
              <FileText className="w-3.5 h-3.5" /> Excel
            </button>
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-1 px-2 py-1.5 text-xs font-bold rounded border border-red-200 text-red-600 bg-red-50 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400 hover:bg-red-100 transition-colors"
              title="Export PDF"
            >
              <Download className="w-3.5 h-3.5" /> PDF
            </button>
          </div>
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="hidden sm:flex items-center gap-1 px-3 py-1.5 bg-amber-600 text-white text-xs font-bold rounded-lg hover:bg-amber-700"
          >
            <Upload className="w-3.5 h-3.5" /> Import
          </button>
          {/* Nouveau Ticket : label sur desktop, icône seule sur mobile */}
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-light)] shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline text-sm font-medium">Nouveau Ticket</span>
          </button>
        </div>
      </div>

      <MobileTabLayout
        tabs={visibleSupportTabs}
        activeTab={activeTab}
        onTabChange={(id) => setActiveTab(id as TabId)}
        backLabel="Support"
      >
        {/* TAB: DASHBOARD */}
        {activeTab === 'DASHBOARD' && (
          <div className="flex-1 overflow-y-auto space-y-6 pb-16 lg:pb-0">
            {/* KPIs - Hidden on mobile */}
            <div className="hidden sm:grid grid-cols-1 md:grid-cols-5 gap-4">
              <Card className="p-4 border-l-4 border-l-blue-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="section-title">Ouverts</p>
                    <p className="text-2xl font-bold text-[var(--text-primary)]">{ticketCounts.OPEN || 0}</p>
                  </div>
                  <MessageSquare className="w-8 h-8 text-[var(--primary)] opacity-50" />
                </div>
              </Card>
              <Card className="p-4 border-l-4 border-l-orange-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="section-title">En Cours</p>
                    <p className="text-2xl font-bold text-[var(--text-primary)]">{ticketCounts.IN_PROGRESS || 0}</p>
                  </div>
                  <Clock className="w-8 h-8 text-orange-500 opacity-50" />
                </div>
              </Card>
              <Card className="p-4 border-l-4 border-l-green-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="section-title">Résolus</p>
                    <p className="text-2xl font-bold text-[var(--text-primary)]">{ticketCounts.RESOLVED || 0}</p>
                    <p className="text-[10px] text-[var(--text-muted)]">
                      {(() => {
                        const now = new Date();
                        return tickets.filter(
                          (t) =>
                            t.status === 'RESOLVED' &&
                            t.resolvedAt &&
                            new Date(t.resolvedAt).getMonth() === now.getMonth() &&
                            new Date(t.resolvedAt).getFullYear() === now.getFullYear()
                        ).length;
                      })()}{' '}
                      ce mois
                    </p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-500 opacity-50" />
                </div>
              </Card>
              <Card className="p-4 border-l-4 border-l-red-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="section-title">SLA Critique</p>
                    <p className="text-2xl font-bold text-red-600">{slaStats.critical.length}</p>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-red-500 opacity-50" />
                </div>
              </Card>
              <Card className="p-4 border-l-4 border-l-emerald-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="section-title">Taux SLA</p>
                    <p className="text-2xl font-bold text-emerald-600">{slaStats.respectRate}%</p>
                  </div>
                  <Target className="w-8 h-8 text-emerald-500 opacity-50" />
                </div>
              </Card>
            </div>

            {/* Resolution Time KPIs */}
            <div className="hidden sm:grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="p-4 border-l-4 border-l-cyan-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="section-title">Temps Moyen</p>
                    <p className="text-2xl font-bold text-cyan-600">
                      {resolutionStats.average !== null ? formatTicketDuration(resolutionStats.average) : '-'}
                    </p>
                    {resolutionStats.count > 0 && (
                      <p className="text-[10px] text-[var(--text-muted)]">sur {resolutionStats.count} tickets</p>
                    )}
                  </div>
                  <Timer className="w-8 h-8 text-cyan-500 opacity-50" />
                </div>
              </Card>
              <Card className="p-4 border-l-4 border-l-indigo-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="section-title">Temps Réponse</p>
                    <p className="text-2xl font-bold text-indigo-600">
                      {resolutionStats.avgResponseTime !== null
                        ? formatTicketDuration(resolutionStats.avgResponseTime)
                        : '-'}
                    </p>
                    <p className="text-[10px] text-[var(--text-muted)]">1ère prise en charge</p>
                  </div>
                  <Play className="w-8 h-8 text-indigo-500 opacity-50" />
                </div>
              </Card>
              <Card className="p-4 border-l-4 border-l-violet-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="section-title">Temps Traitement</p>
                    <p className="text-2xl font-bold text-violet-600">
                      {resolutionStats.avgHandlingTime !== null
                        ? formatTicketDuration(resolutionStats.avgHandlingTime)
                        : '-'}
                    </p>
                    <p className="text-[10px] text-[var(--text-muted)]">durée de travail</p>
                  </div>
                  <Zap className="w-8 h-8 text-violet-500 opacity-50" />
                </div>
              </Card>
              <Card className="p-4 border-l-4 border-l-teal-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="section-title">Conformité SLA</p>
                    <p className="text-2xl font-bold text-teal-600">{resolutionStats.slaComplianceRate}%</p>
                    <p className="text-[10px] text-[var(--text-muted)]">
                      {resolutionStats.withinSLA}/{resolutionStats.count} dans les temps
                    </p>
                  </div>
                  <Shield className="w-8 h-8 text-teal-500 opacity-50" />
                </div>
              </Card>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4">Tickets par Statut</h3>
                <div className="h-64">
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                    minHeight={200}
                    minWidth={200}
                    initialDimension={{ width: 200, height: 200 }}
                  >
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Ouvert', value: ticketCounts.OPEN || 0, color: '#3b82f6' },
                          { name: 'En cours', value: ticketCounts.IN_PROGRESS || 0, color: '#f97316' },
                          { name: 'En attente', value: ticketCounts.WAITING_CLIENT || 0, color: '#a855f7' },
                          { name: 'Résolu', value: ticketCounts.RESOLVED || 0, color: '#22c55e' },
                          { name: 'Fermé', value: ticketCounts.CLOSED || 0, color: '#64748b' },
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {[
                          { color: '#3b82f6' },
                          { color: '#f97316' },
                          { color: '#a855f7' },
                          { color: '#22c55e' },
                          { color: '#64748b' },
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Card>
              <Card className="p-6">
                <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4">Tickets par Catégorie</h3>
                <div className="h-64">
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                    minHeight={200}
                    minWidth={200}
                    initialDimension={{ width: 200, height: 200 }}
                  >
                    <BarChart
                      data={ticketCategories.map((cat: TicketCategory) => ({
                        name: cat.name.substring(0, 15),
                        count: tickets.filter((t) => t.category === cat.name).length,
                      }))}
                    >
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>

            {/* Tickets Urgents */}
            {slaStats.critical.length > 0 && (
              <Card className="p-6 border-l-4 border-l-red-500">
                <h3 className="text-lg font-bold text-red-600 mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" /> Tickets Hors SLA ({slaStats.critical.length})
                </h3>
                <div className="space-y-2">
                  {slaStats.critical.slice(0, 5).map((t) => (
                    <div
                      key={t.id}
                      onClick={() => {
                        setSelectedTicketId(t.id);
                        setActiveTab('TICKETS');
                      }}
                      className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg cursor-pointer hover:bg-red-100 transition-colors"
                    >
                      <div>
                        <span className="font-bold text-[var(--text-primary)]">{t.id}</span>
                        <span className="mx-2 text-[var(--text-muted)]">•</span>
                        <span className="text-[var(--text-secondary)]">{t.subject}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-bold border ${getPriorityBadge(t.priority)}`}
                        >
                          {t.priority}
                        </span>
                        {getRemainingTime(t)}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Statistiques par Agent */}
            <Card className="p-6">
              <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-[var(--primary)]" /> Performance par Agent
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[var(--bg-elevated)] sticky top-0 z-10">
                    <tr className="border-b border-[var(--border)]">
                      <th className="text-left px-3 py-3 text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                        Agent
                      </th>
                      <th className="text-center px-3 py-3 text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                        Créés
                      </th>
                      <th className="text-center px-3 py-3 text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                        Assignés
                      </th>
                      <th className="text-center px-3 py-3 text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                        Résolus
                      </th>
                      <th className="text-center px-3 py-3 text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                        En cours
                      </th>
                      <th className="text-center px-3 py-3 text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                        Temps moy.
                      </th>
                      <th className="text-center px-3 py-3 text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                        Taux SLA
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const agentMap = new Map<
                        string,
                        {
                          name: string;
                          created: number;
                          assigned: number;
                          resolved: number;
                          inProgress: number;
                          totalResTime: number;
                          resCount: number;
                          slaOk: number;
                          slaTotal: number;
                        }
                      >();
                      ticketStaff.forEach((tech) => {
                        agentMap.set(tech.id, {
                          name: tech.name || tech.email,
                          created: 0,
                          assigned: 0,
                          resolved: 0,
                          inProgress: 0,
                          totalResTime: 0,
                          resCount: 0,
                          slaOk: 0,
                          slaTotal: 0,
                        });
                      });
                      tickets.forEach((t) => {
                        // Créés par cet agent
                        if (t.createdBy && agentMap.has(t.createdBy)) {
                          agentMap.get(t.createdBy)!.created++;
                        }
                        // Assignés
                        if (t.assignedTo && agentMap.has(t.assignedTo)) {
                          const a = agentMap.get(t.assignedTo)!;
                          a.assigned++;
                          if (t.status === 'RESOLVED' || t.status === 'CLOSED') {
                            a.resolved++;
                            if (t.resolvedAt && t.createdAt) {
                              a.totalResTime += new Date(t.resolvedAt).getTime() - new Date(t.createdAt).getTime();
                              a.resCount++;
                            }
                          }
                          if (t.status === 'IN_PROGRESS') a.inProgress++;
                          // SLA
                          a.slaTotal++;
                          if (getSlaStatus(t.createdAt, t.priority, slaConfig) !== 'CRITICAL') a.slaOk++;
                        }
                      });
                      const agents = Array.from(agentMap.values())
                        .filter((a) => a.assigned > 0 || a.created > 0)
                        .sort((a, b) => b.assigned - a.assigned);
                      if (agents.length === 0)
                        return (
                          <tr>
                            <td colSpan={7} className="text-center py-4 text-[var(--text-muted)]">
                              Aucune donnée agent
                            </td>
                          </tr>
                        );
                      let totalCreated = 0,
                        totalAssigned = 0,
                        totalResolved = 0,
                        totalInProgress = 0,
                        sumTotalResTime = 0,
                        sumResCount = 0,
                        sumSlaOk = 0,
                        sumSlaTotal = 0;

                      const rows = agents.map((a, i) => {
                        totalCreated += a.created;
                        totalAssigned += a.assigned;
                        totalResolved += a.resolved;
                        totalInProgress += a.inProgress;
                        sumTotalResTime += a.totalResTime;
                        sumResCount += a.resCount;
                        sumSlaOk += a.slaOk;
                        sumSlaTotal += a.slaTotal;

                        const avgTime = a.resCount > 0 ? a.totalResTime / a.resCount : 0;
                        const slaRate = a.slaTotal > 0 ? Math.round((a.slaOk / a.slaTotal) * 100) : 100;
                        const hours = Math.floor(avgTime / 3600000);
                        const mins = Math.floor((avgTime % 3600000) / 60000);
                        return (
                          <tr
                            key={i}
                            className="density-row border-b border-[var(--border)] border-[var(--border)] tr-hover/50"
                          >
                            <td className="py-2 px-3 font-medium text-[var(--text-primary)]">{a.name}</td>
                            <td className="text-center py-2 px-3">
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[var(--primary-dim)] text-[var(--primary)] text-xs font-bold">
                                {a.created}
                              </span>
                            </td>
                            <td className="text-center py-2 px-3">
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-bold">
                                {a.assigned}
                              </span>
                            </td>
                            <td className="text-center py-2 px-3">
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-bold">
                                {a.resolved}
                              </span>
                            </td>
                            <td className="text-center py-2 px-3">
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-xs font-bold">
                                {a.inProgress}
                              </span>
                            </td>
                            <td className="text-center py-2 px-3 text-xs text-[var(--text-secondary)]">
                              {a.resCount > 0 ? `${hours}h${mins.toString().padStart(2, '0')}` : '—'}
                            </td>
                            <td className="text-center py-2 px-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-xs font-bold ${slaRate >= 80 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : slaRate >= 50 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}
                              >
                                {slaRate}%
                              </span>
                            </td>
                          </tr>
                        );
                      });

                      const avgGlobalTime = sumResCount > 0 ? sumTotalResTime / sumResCount : 0;
                      const globalSlaRate = sumSlaTotal > 0 ? Math.round((sumSlaOk / sumSlaTotal) * 100) : 100;
                      const gHours = Math.floor(avgGlobalTime / 3600000);
                      const gMins = Math.floor((avgGlobalTime % 3600000) / 60000);

                      rows.push(
                        <tr key="total" className="border-t-2 border-[var(--border)] bg-[var(--bg-elevated)] font-bold">
                          <td className="py-3 px-3 text-[var(--primary)] uppercase tracking-wider">
                            TOTAUX / MOY. GLOBALE
                          </td>
                          <td className="text-center py-3 px-3 text-[var(--text-primary)] text-base">
                            <div className="flex flex-col">
                              <span>{totalCreated}</span>
                              <span className="text-[10px] text-[var(--text-muted)] font-normal">tickets</span>
                            </div>
                          </td>
                          <td className="text-center py-3 px-3 text-[var(--text-primary)] text-base">
                            <div className="flex flex-col">
                              <span>{totalAssigned}</span>
                              <span className="text-[10px] text-[var(--text-muted)] font-normal">100%</span>
                            </div>
                          </td>
                          <td className="text-center py-3 px-3 text-[var(--text-primary)] text-base">
                            <div className="flex flex-col">
                              <span>{totalResolved}</span>
                              <span className="text-[10px] text-green-500 font-normal">
                                {totalAssigned > 0 ? Math.round((totalResolved / totalAssigned) * 100) : 0}%
                              </span>
                            </div>
                          </td>
                          <td className="text-center py-3 px-3 text-[var(--text-primary)] text-base">
                            <div className="flex flex-col">
                              <span>{totalInProgress}</span>
                              <span className="text-[10px] text-orange-500 font-normal">
                                {totalAssigned > 0 ? Math.round((totalInProgress / totalAssigned) * 100) : 0}%
                              </span>
                            </div>
                          </td>
                          <td className="text-center py-3 px-3 text-[var(--text-primary)] text-base font-mono">
                            {sumResCount > 0 ? `${gHours}h${gMins.toString().padStart(2, '0')}` : '—'}
                          </td>
                          <td className="text-center py-3 px-3">
                            <span
                              className={`px-2 py-1 rounded-full text-sm font-bold shadow-sm ${globalSlaRate >= 80 ? 'bg-green-500 text-white' : globalSlaRate >= 50 ? 'bg-yellow-500 text-white' : 'bg-red-500 text-white'}`}
                            >
                              {globalSlaRate}%
                            </span>
                          </td>
                        </tr>
                      );

                      return rows;
                    })()}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* TAB: TICKETS (3 colonnes desktop / liste-détail mobile) */}
        {activeTab === 'TICKETS' && (
          <div className="flex flex-col lg:flex-row h-full gap-4 overflow-hidden">
            {/* LEFT: TICKET LIST — masqué sur mobile quand un ticket est ouvert */}
            <div
              className={`w-full lg:w-[460px] shrink-0 flex-col rounded-xl overflow-hidden lg:max-h-none ${isMobile && selectedTicketId ? 'hidden' : 'flex h-full'}`}
              style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}
            >
              {/* Search & Filters */}
              <div className="p-4 border-b border-[var(--border)] space-y-3">
                <SearchBar
                  value={searchTerm}
                  onChange={setSearchTerm}
                  placeholder="Rechercher par ID, sujet, client, agent, véhicule, message..."
                />
                <div className="flex gap-2 flex-wrap">
                  {FILTERS_CONFIG.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setStatusFilter(f.id)}
                      className={`filter-chip ${statusFilter === f.id ? 'active' : ''}`}
                    >
                      {f.label}
                      {f.id !== 'ALL' && <span className="opacity-60 text-[11px]">({ticketCounts[f.id] || 0})</span>}
                    </button>
                  ))}
                </div>
              </div>
              {/* Bulk Action Bar */}
              {selectedTicketIds.size > 0 && (
                <div className="px-4 py-2.5 bg-[var(--primary-dim)] border-b border-[var(--border)] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-[var(--primary)]" />
                    <span className="text-sm font-medium text-[var(--primary)]">
                      {selectedTicketIds.size} sélectionné(s)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleBulkTakeCharge}
                      disabled={bulkProcessing}
                      className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors"
                    >
                      <Play className="w-3 h-3" /> Prendre en charge
                    </button>
                    <button
                      onClick={handleBulkResolve}
                      disabled={bulkProcessing}
                      className="px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors"
                    >
                      <Check className="w-3 h-3" /> Résoudre
                    </button>
                    <button
                      onClick={clearSelection}
                      className="px-2 py-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] dark:hover:text-[var(--text-muted)] text-xs transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
              {/* Select All Header */}
              {pagedTickets.length > 0 && (
                <div
                  className="px-4 py-2 border-b border-[var(--border)] flex items-center justify-between"
                  style={{ backgroundColor: 'var(--bg-elevated)' }}
                >
                  <div className="flex items-center gap-2">
                    <button
                      onClick={toggleSelectAll}
                      className="p-0.5 hover:bg-[var(--bg-elevated)] rounded transition-colors"
                      title={
                        selectedTicketIds.size === pagedTickets.length ? 'Tout désélectionner' : 'Tout sélectionner'
                      }
                    >
                      {selectedTicketIds.size === pagedTickets.length && pagedTickets.length > 0 ? (
                        <CheckSquare className="w-4 h-4 text-[var(--primary)]" />
                      ) : selectedTicketIds.size > 0 ? (
                        <MinusSquare className="w-4 h-4 text-[var(--primary)]" />
                      ) : (
                        <Square className="w-4 h-4 text-[var(--text-muted)]" />
                      )}
                    </button>
                    <span className="text-xs text-[var(--text-muted)]">{totalTicketCount} ticket(s)</span>
                  </div>
                  {totalPages > 1 && (
                    <span className="text-xs text-[var(--text-muted)]">
                      Page {currentPage}/{totalPages}
                    </span>
                  )}
                </div>
              )}
              {/* Ticket List */}
              <div className="flex-1 overflow-y-auto pb-4 lg:pb-0">
                {loadingTicketList ? (
                  <div className="divide-y divide-[var(--border)]">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <ListItemSkeleton key={i} />
                    ))}
                  </div>
                ) : pagedTickets.length === 0 ? (
                  statusFilter !== 'ALL' ||
                  priorityFilter !== 'ALL' ||
                  categoryFilter !== 'ALL' ||
                  !!debouncedSearch ? (
                    <EmptyState
                      icon={SearchX}
                      title="Aucun résultat"
                      description="Aucun ticket ne correspond aux filtres actifs. Modifiez ou réinitialisez vos filtres."
                    />
                  ) : (
                    <EmptyState
                      icon={MessageSquare}
                      title="Aucun ticket"
                      description="Aucun ticket d'assistance n'a encore été créé."
                    />
                  )
                ) : (
                  pagedTickets.map((ticket) => {
                    const isChecked = selectedTicketIds.has(ticket.id);
                    return (
                      <div
                        key={ticket.id}
                        onClick={() => setSelectedTicketId(ticket.id)}
                        className={`density-row p-4 border-b border-[var(--border)] cursor-pointer transition-colors ${
                          selectedTicketId === ticket.id
                            ? 'bg-[var(--primary-dim)] border-l-4 border-l-[var(--primary)]'
                            : 'hover:bg-[var(--bg-elevated)] border-l-4 border-l-transparent'
                        }`}
                      >
                        <div className="flex gap-3">
                          {/* Checkbox */}
                          <button
                            onClick={(e) => toggleTicketSelection(ticket.id, e)}
                            className="mt-0.5 shrink-0 p-0.5 hover:bg-[var(--bg-elevated)] rounded transition-colors"
                          >
                            {isChecked ? (
                              <CheckSquare className="w-4 h-4 text-[var(--primary)]" />
                            ) : (
                              <Square className="w-4 h-4 text-[var(--text-muted)]" />
                            )}
                          </button>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs text-[var(--text-muted)]">{ticket.id}</span>
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${getPriorityBadge(ticket.priority)}`}
                                >
                                  {ticket.priority}
                                </span>
                                {getSlaBadge(ticket)}
                                {(ticket.escalationCount ?? 0) > 0 && (
                                  <span
                                    className="px-1 py-0.5 rounded text-[10px] font-bold border border-orange-300 bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-300"
                                    title={`Escaladé ${ticket.escalationCount}×`}
                                  >
                                    ↑{ticket.escalationCount}
                                  </span>
                                )}
                              </div>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getStatusInfo(ticket.status).style}`}
                              >
                                {getStatusInfo(ticket.status).label}
                              </span>
                            </div>
                            <p className="font-medium text-[var(--text-primary)] text-sm mb-1 line-clamp-1">
                              {ticket.subject}
                            </p>
                            <p className="text-xs text-[var(--text-secondary)] flex items-center gap-2">
                              <User className="w-3 h-3" /> {getClientName(ticket)}
                              <span className="text-[var(--text-muted)]">•</span>
                              {ticket.source && ticket.source !== 'TrackYu' && (
                                <>
                                  <span className="text-[10px]">
                                    {ticket.source === 'Appel'
                                      ? '📞'
                                      : ticket.source === 'WhatsApp'
                                        ? '💬'
                                        : ticket.source === 'Visite'
                                          ? '🏢'
                                          : ticket.source === 'SMS'
                                            ? '📱'
                                            : '🌐'}
                                  </span>
                                  <span className="text-[var(--text-muted)]">•</span>
                                </>
                              )}
                              <Clock className="w-3 h-3" /> {new Date(ticket.createdAt).toLocaleDateString('fr-FR')}{' '}
                              {new Date(ticket.createdAt).toLocaleTimeString('fr-FR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                          {/* end flex-1 min-w-0 */}
                        </div>
                        {/* end flex gap-3 */}
                      </div>
                    );
                  })
                )}
              </div>
              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div
                  className="px-4 py-2.5 border-t border-[var(--border)] flex items-center justify-between"
                  style={{ backgroundColor: 'var(--bg-surface)' }}
                >
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="pagination-btn"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> Préc.
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
                      const p = start + i;
                      return (
                        <button
                          key={p}
                          onClick={() => setCurrentPage(p)}
                          className={`pagination-btn ${p === currentPage ? 'active' : ''}`}
                        >
                          {p}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="pagination-btn"
                  >
                    Suiv. <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* CENTER: TICKET DETAIL — masqué sur mobile quand aucun ticket sélectionné */}
            <div
              className={`flex-1 flex flex-col rounded-xl overflow-hidden ${isMobile && !selectedTicketId ? 'hidden' : ''}`}
              style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}
            >
              {selectedTicket ? (
                <>
                  {/* Header */}
                  <div
                    className="p-4 border-b border-[var(--border)]"
                    style={{ backgroundColor: 'var(--bg-elevated)' }}
                  >
                    {/* Bouton retour mobile */}
                    {isMobile && (
                      <button
                        onClick={() => setSelectedTicketId(null)}
                        className="flex items-center gap-1.5 text-sm font-medium text-[var(--primary)] mb-3 -mt-1"
                      >
                        <ChevronLeft className="w-4 h-4" /> Retour aux tickets
                      </button>
                    )}
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h2 className="text-lg font-bold text-[var(--text-primary)]">{selectedTicket.subject}</h2>
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-bold border ${getStatusInfo(selectedTicket.status).style}`}
                          >
                            {getStatusInfo(selectedTicket.status).label}
                          </span>
                          {getSlaBadge(selectedTicket)}
                          {(selectedTicket.escalationCount ?? 0) > 0 && (
                            <span
                              className="px-2 py-0.5 rounded text-xs font-bold border border-orange-300 bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-600 flex items-center gap-1"
                              title={
                                selectedTicket.escalatedAt
                                  ? `Dernière escalade: ${new Date(selectedTicket.escalatedAt).toLocaleString()}`
                                  : ''
                              }
                            >
                              <ArrowUpRight className="w-3 h-3" />
                              Escaladé ×{selectedTicket.escalationCount}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-[var(--text-secondary)] flex items-center gap-2 flex-wrap">
                          <User className="w-4 h-4" /> {clientDetails?.name || getClientName(selectedTicket)}
                          <span className="text-[var(--border-strong)]">|</span>
                          {selectedTicket.source && (
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                selectedTicket.source === 'TrackYu'
                                  ? 'bg-[var(--primary-dim)] text-[var(--primary)]'
                                  : selectedTicket.source === 'Appel'
                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                                    : selectedTicket.source === 'WhatsApp'
                                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                                      : selectedTicket.source === 'Visite'
                                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                              }`}
                            >
                              {selectedTicket.source === 'Appel'
                                ? '📞'
                                : selectedTicket.source === 'WhatsApp'
                                  ? '💬'
                                  : selectedTicket.source === 'Visite'
                                    ? '🏢'
                                    : selectedTicket.source === 'SMS'
                                      ? '📱'
                                      : '🌐'}{' '}
                              {selectedTicket.source}
                            </span>
                          )}
                          <span className="text-[var(--text-muted)]">|</span>
                          <Clock className="w-4 h-4" />{' '}
                          {selectedTicket.receivedAt
                            ? `Reçu ${new Date(selectedTicket.receivedAt).toLocaleString('fr-FR')}`
                            : new Date(selectedTicket.createdAt).toLocaleString()}
                          <span className="text-[var(--text-muted)]">|</span>
                          {getRemainingTime(selectedTicket)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {/* Bloquer les actions pour tickets RESOLVED ou CLOSED */}
                        {!['RESOLVED', 'CLOSED'].includes(selectedTicket.status) && (
                          <>
                            <button
                              onClick={() => setIsEscalateModalOpen(true)}
                              className="p-2 bg-orange-600 hover:bg-orange-700 border border-orange-500 text-white rounded-lg transition-colors"
                              title="Escalader"
                            >
                              <ArrowUpRight className="w-4 h-4" />
                            </button>
                            <button
                              onClick={openEditModal}
                              className="p-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg hover:border-[var(--primary)]"
                              title="Modifier"
                            >
                              <Edit2 className="w-4 h-4 text-[var(--text-secondary)]" />
                            </button>
                            {hasPermission('DELETE_TICKETS') && (
                              <button
                                onClick={() => handleDeleteTicket(selectedTicket.id, selectedTicket.subject)}
                                className="p-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg hover:border-red-300 hover:bg-red-50"
                                title="Supprimer"
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </button>
                            )}
                            <button
                              onClick={() => {
                                const client = clients.find((c) => c.id === selectedTicket.clientId);
                                const vehicle = selectedTicket.vehicleId
                                  ? vehicles.find((v) => v.id === selectedTicket.vehicleId)
                                  : null;

                                // Mapper sub_category vers type d'intervention (uniquement INSTALLATION ou DEPANNAGE)
                                const mapSubCategoryToType = (subCat?: string): InterventionType => {
                                  if (!subCat) return 'DEPANNAGE';
                                  const lower = subCat.toLowerCase();
                                  // Installation: nouvelle installation, réinstallation, transfert, balise, jauge
                                  if (
                                    lower.includes('installation') ||
                                    lower.includes('transfert') ||
                                    lower.includes('balise') ||
                                    lower.includes('jauge')
                                  )
                                    return 'INSTALLATION';
                                  // Tout le reste = Dépannage
                                  return 'DEPANNAGE';
                                };

                                setInterventionInitialData({
                                  clientId: selectedTicket.clientId,
                                  // Client Data
                                  resellerId: client?.resellerId,
                                  resellerName: client?.resellerName,
                                  // Ticket Data
                                  ticketId: selectedTicket.id,
                                  vehicleId: selectedTicket.vehicleId,
                                  technicianId: 'UNASSIGNED', // Le technicien est choisi dans le formulaire d'intervention, pas depuis le ticket
                                  // Classification - mapper depuis interventionType du ticket ou fallback subCategory
                                  type:
                                    (selectedTicket.interventionType as InterventionType) ||
                                    mapSubCategoryToType(selectedTicket.subCategory),
                                  nature:
                                    (selectedTicket.subCategory as InterventionNature) ||
                                    (mapSubCategoryToType(selectedTicket.subCategory) === 'INSTALLATION'
                                      ? 'Balise'
                                      : 'Dépannage'),
                                  notes: selectedTicket.description,

                                  // Pre-fill Vehicle Data
                                  ...(vehicle
                                    ? {
                                        licensePlate: vehicle.licensePlate || vehicle.plate,
                                        vehicleName: vehicle.name,
                                        vin: vehicle.vin,
                                        vehicleBrand: vehicle.brand,
                                        vehicleModel: vehicle.model,
                                        vehicleColor: (vehicle as typeof vehicle & { color?: string }).color || 'Blanc',
                                        vehicleMileage: vehicle.mileage,
                                      }
                                    : {}),
                                } as Intervention);
                                setIsInterventionModalOpen(true);
                              }}
                              className="p-2 bg-purple-600 hover:bg-purple-700 border border-purple-500 text-white rounded-lg transition-colors"
                              title="Planifier une intervention"
                            >
                              <Calendar className="w-4 h-4" />
                            </button>
                            {selectedTicket.status === 'OPEN' && (
                              <button
                                onClick={handleTakeCharge}
                                className="px-3 py-2 bg-[var(--primary)] text-white rounded-lg text-xs font-bold flex items-center gap-2"
                              >
                                <Play className="w-4 h-4" /> Prendre en charge
                              </button>
                            )}
                            {selectedTicket.status === 'IN_PROGRESS' && (
                              <button
                                onClick={handleResolve}
                                className="px-3 py-2 bg-green-600 text-white rounded-lg text-xs font-bold flex items-center gap-2"
                              >
                                <Check className="w-4 h-4" /> Résoudre
                              </button>
                            )}
                          </>
                        )}
                        {/* Bouton Clôturer visible uniquement quand RESOLVED */}
                        {selectedTicket.status === 'RESOLVED' && (
                          <button
                            onClick={() => handleStatusClick('CLOSED')}
                            className="px-3 py-2 bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border)] rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-[var(--bg-surface)] transition-colors"
                          >
                            <Lock className="w-4 h-4" /> Clôturer
                          </button>
                        )}
                        {/* Bouton Rouvrir pour SUPERADMIN/ADMIN sur tickets RESOLVED ou CLOSED */}
                        {['RESOLVED', 'CLOSED'].includes(selectedTicket.status) &&
                          ['SUPERADMIN', 'ADMIN'].includes(user?.role || '') && (
                            <button
                              onClick={() => handleStatusClick('OPEN')}
                              className="px-3 py-2 bg-[var(--primary)] text-white rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-[var(--primary-light)] transition-colors"
                            >
                              <RotateCcw className="w-4 h-4" /> Rouvrir
                            </button>
                          )}
                      </div>
                    </div>
                  </div>

                  {/* Detail Interface */}
                  <TicketChatPanel
                    ticketId={selectedTicket.id}
                    className="flex-1"
                    onPlanIntervention={(data) => {
                      setInterventionInitialData({
                        ticketId: data.ticketId,
                        clientId: data.clientId,
                        type: data.type || 'Installation',
                        vehicleId: data.vehicleId,
                        status: 'PLANNED',
                        scheduledDate: new Date(),
                      } as Intervention);
                      setIsInterventionModalOpen(true);
                    }}
                  />
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-[var(--text-muted)]">
                  <MessageSquare className="w-16 h-16 mb-4 opacity-20" />
                  <p className="text-lg font-medium">Sélectionnez un ticket</p>
                </div>
              )}
            </div>

            {/* RIGHT: CONTEXT PANEL - desktop only (masqué sur mobile) */}
            {selectedTicket && !isMobile && (
              <div className="w-full lg:w-[380px] flex flex-col gap-4 overflow-y-auto overflow-x-hidden">
                {/* Fiche Client */}
                <Card className="p-4 shrink-0">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase flex items-center gap-2">
                      <User className="w-3 h-3" /> Fiche Client
                    </h4>
                    {clientMetrics?.paymentStatus === 'OK' ? (
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 border border-green-200 rounded text-[10px] font-bold uppercase">
                        À Jour
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-red-100 text-red-700 border border-red-200 rounded text-[10px] font-bold uppercase">
                        Impayés
                      </span>
                    )}
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="font-bold text-[var(--text-primary)] text-base">{clientDetails?.name}</p>
                      <p className="text-xs text-[var(--text-secondary)]">
                        {clientDetails?.subscriptionPlan || 'Plan Standard'}
                      </p>
                    </div>

                    {/* Contacts */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-sm">
                        <User className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                        <span className="text-[var(--text-secondary)]">
                          {clientDetails?.contactName || 'Non renseigné'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="w-3.5 h-3.5 text-[var(--text-muted)] text-center">📞</span>
                        <span className="text-[var(--text-secondary)]">{clientDetails?.phone || 'Non renseigné'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="w-3.5 h-3.5 text-[var(--text-muted)] text-center">✉️</span>
                        <span className="text-[var(--text-secondary)]">{clientDetails?.email || 'Non renseigné'}</span>
                      </div>
                    </div>

                    {/* Métriques */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[var(--border)] border-[var(--border)]">
                      <div className="p-2 bg-[var(--bg-elevated)] rounded border border-[var(--border)] border-[var(--border)]">
                        <div className="flex items-center gap-1.5 text-[var(--text-muted)] text-[10px] uppercase font-bold mb-1">
                          <Clock className="w-3 h-3" /> Ancienneté
                        </div>
                        <p className="font-bold text-[var(--text-primary)]">{clientMetrics?.seniorityYears || 1} ans</p>
                      </div>
                      <div className="p-2 bg-[var(--bg-elevated)] rounded border border-[var(--border)] border-[var(--border)]">
                        <div className="flex items-center gap-1.5 text-[var(--text-muted)] text-[10px] uppercase font-bold mb-1">
                          <Shield className="w-3 h-3" /> Flotte
                        </div>
                        <p className="font-bold text-[var(--text-primary)]">{clientMetrics?.vehicleCount || 0} véh.</p>
                      </div>
                      <div className="p-2 bg-[var(--bg-elevated)] rounded border border-[var(--border)] border-[var(--border)] col-span-2">
                        <div className="flex items-center gap-1.5 text-[var(--text-muted)] text-[10px] uppercase font-bold mb-1">
                          <TrendingUp className="w-3 h-3" /> CA Annuel
                        </div>
                        <p className="font-bold text-[var(--text-primary)]">
                          {(clientMetrics?.revenueYTD || 0).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Interventions */}
                <Card className="p-4 shrink-0">
                  <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase mb-3 flex items-center gap-2">
                    <Shield className="w-3 h-3" /> Interventions
                  </h4>
                  {relatedInterventions.length > 0 ? (
                    relatedInterventions.slice(0, 3).map((int) => (
                      <div key={int.id} className="p-2 bg-[var(--bg-elevated)] rounded mb-2">
                        <span className="font-bold text-xs">{int.type}</span>
                        <p className="text-[10px] text-[var(--text-secondary)]">
                          {new Date(int.scheduledDate).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-[var(--text-muted)] italic">Aucune intervention</p>
                  )}
                </Card>

                {/* Description */}
                <Card className="p-4 max-h-48 overflow-y-auto shrink-0">
                  <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase mb-3 flex items-center gap-2 sticky top-0 bg-[var(--bg-surface)] pb-1">
                    <FileText className="w-3 h-3" /> Description
                  </h4>
                  <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">
                    {selectedTicket.description || (
                      <span className="italic text-[var(--text-muted)]">Aucune description</span>
                    )}
                  </p>
                </Card>

                {/* Historique / Timeline */}
                <Card className="p-4 max-h-64 overflow-y-auto shrink-0">
                  <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase mb-3 flex items-center gap-2 sticky top-0 bg-[var(--bg-surface)] pb-1">
                    <Clock className="w-3 h-3" /> Historique
                  </h4>
                  <div className="relative pl-4 border-l-2 border-[var(--border)] space-y-3">
                    {/* Création */}
                    <div className="relative">
                      <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-[var(--primary-dim)]0 border-2 border-[var(--bg-surface)]" />
                      <p className="text-xs text-[var(--text-primary)]">
                        <span className="font-semibold">Créé</span> par{' '}
                        {selectedTicket.createdByName || selectedTicket.assignedUserName || user?.name || 'Inconnu'}
                      </p>
                      <p className="text-[10px] text-[var(--text-muted)]">
                        {new Date(selectedTicket.createdAt).toLocaleDateString('fr-FR')} à{' '}
                        {new Date(selectedTicket.createdAt).toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    {/* Première réponse */}
                    {selectedTicket.firstResponseAt && (
                      <div className="relative">
                        <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-cyan-500 border-2 border-[var(--bg-surface)]" />
                        <p className="text-xs text-[var(--text-primary)]">
                          <span className="font-semibold">Première réponse</span>
                        </p>
                        <p className="text-[10px] text-[var(--text-muted)]">
                          {new Date(selectedTicket.firstResponseAt).toLocaleDateString('fr-FR')} à{' '}
                          {new Date(selectedTicket.firstResponseAt).toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    )}
                    {/* Prise en charge */}
                    {selectedTicket.startedAt && (
                      <div className="relative">
                        <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-yellow-500 border-2 border-[var(--bg-surface)]" />
                        <p className="text-xs text-[var(--text-primary)]">
                          <span className="font-semibold">Pris en charge</span>
                          {selectedTicket.assignedUserName ? ` par ${selectedTicket.assignedUserName}` : ''}
                        </p>
                        <p className="text-[10px] text-[var(--text-muted)]">
                          {new Date(selectedTicket.startedAt).toLocaleDateString('fr-FR')} à{' '}
                          {new Date(selectedTicket.startedAt).toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    )}
                    {/* Escalade */}
                    {selectedTicket.escalatedAt && (
                      <div className="relative">
                        <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-orange-500 border-2 border-[var(--bg-surface)]" />
                        <p className="text-xs text-[var(--text-primary)]">
                          <span className="font-semibold">Escaladé</span> (×{selectedTicket.escalationCount || 1})
                        </p>
                        <p className="text-[10px] text-[var(--text-muted)]">
                          {new Date(selectedTicket.escalatedAt).toLocaleDateString('fr-FR')} à{' '}
                          {new Date(selectedTicket.escalatedAt).toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    )}
                    {/* Modification */}
                    {selectedTicket.updatedAt &&
                      new Date(selectedTicket.updatedAt).getTime() !== new Date(selectedTicket.createdAt).getTime() && (
                        <div className="relative">
                          <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-[var(--text-secondary)] border-2 border-[var(--bg-surface)]" />
                          <p className="text-xs text-[var(--text-primary)]">
                            <span className="font-semibold">Modifié</span>
                          </p>
                          <p className="text-[10px] text-[var(--text-muted)]">
                            {new Date(selectedTicket.updatedAt).toLocaleDateString('fr-FR')} à{' '}
                            {new Date(selectedTicket.updatedAt).toLocaleTimeString('fr-FR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      )}
                    {/* Résolu */}
                    {selectedTicket.resolvedAt && (
                      <div className="relative">
                        <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-[var(--bg-surface)]" />
                        <p className="text-xs text-[var(--text-primary)]">
                          <span className="font-semibold">Résolu</span>
                        </p>
                        <p className="text-[10px] text-[var(--text-muted)]">
                          {new Date(selectedTicket.resolvedAt).toLocaleDateString('fr-FR')} à{' '}
                          {new Date(selectedTicket.resolvedAt).toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    )}
                    {/* Clôturé */}
                    {selectedTicket.closedAt && (
                      <div className="relative">
                        <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-[var(--text-muted)] border-2 border-[var(--bg-surface)]" />
                        <p className="text-xs text-[var(--text-primary)]">
                          <span className="font-semibold">Clôturé</span>
                        </p>
                        <p className="text-[10px] text-[var(--text-muted)]">
                          {new Date(selectedTicket.closedAt).toLocaleDateString('fr-FR')} à{' '}
                          {new Date(selectedTicket.closedAt).toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    )}
                  </div>
                </Card>

                {/* Pièces jointes */}
                <Card className="p-4 shrink-0">
                  <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase mb-3 flex items-center gap-2">
                    <Paperclip className="w-3 h-3" /> Pièces jointes
                  </h4>
                  <AttachmentUpload ticketId={selectedTicket.id} />
                </Card>

                {/* Tickets Récents */}
                <Card className="p-4 shrink-0 max-h-64 overflow-y-auto">
                  <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase mb-3 flex items-center gap-2">
                    <MessageSquare className="w-3 h-3" /> Tickets Récents du Client
                  </h4>
                  {(() => {
                    const clientTickets = tickets
                      .filter((t) => t.clientId === selectedTicket?.clientId && t.id !== selectedTicket?.id)
                      .slice(0, 5);
                    return clientTickets.length > 0 ? (
                      clientTickets.map((t) => (
                        <div
                          key={t.id}
                          onClick={() => setSelectedTicketId(t.id)}
                          className="p-2 bg-[var(--bg-elevated)] rounded mb-2 cursor-pointer hover:bg-[var(--primary-dim)] dark:hover:bg-[var(--primary-dim)] transition-colors"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-mono text-[10px] text-[var(--text-muted)]">{t.id}</span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${getStatusInfo(t.status).style}`}
                            >
                              {getStatusInfo(t.status).label}
                            </span>
                          </div>
                          <p className="text-xs font-medium text-[var(--text-primary)] line-clamp-1">{t.subject}</p>
                          <p className="text-[10px] text-[var(--text-muted)] mt-1">
                            {new Date(t.createdAt).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-[var(--text-muted)] italic">Aucun autre ticket</p>
                    );
                  })()}
                </Card>
              </div>
            )}
          </div>
        )}

        {/* TAB: KANBAN */}
        {activeTab === 'KANBAN' && (
          <div className="flex-1 flex gap-4 overflow-x-auto pb-4">
            {KANBAN_COLUMNS.map((col) => {
              const columnTickets = filteredTickets.filter((t) => t.status === col.id);
              return (
                <div
                  key={col.id}
                  className="flex-shrink-0 w-80 flex flex-col bg-[var(--bg-elevated)] rounded-xl"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    const ticketId = e.dataTransfer.getData('ticketId');
                    handleKanbanDrop(ticketId, col.id);
                  }}
                >
                  <div className={`p-4 border-b-2 ${col.borderClass}`}>
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-[var(--text-primary)]">{col.label}</h3>
                      <span className="px-2 py-0.5 bg-[var(--bg-elevated)] rounded-full text-sm font-bold">
                        {columnTickets.length}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 p-2 space-y-2 overflow-y-auto">
                    {columnTickets.map((ticket) => {
                      const agentName =
                        ticket.assignedUserName || users.find((u) => u.id === ticket.assignedTo)?.name || '';
                      return (
                        <div
                          key={ticket.id}
                          draggable
                          onDragStart={(e) => e.dataTransfer.setData('ticketId', ticket.id)}
                          className={`p-3 bg-[var(--bg-surface)] rounded-lg shadow-sm cursor-grab hover:shadow-md transition-shadow border-l-4 ${ticket.priority === 'CRITICAL' ? 'border-l-red-500' : ticket.priority === 'HIGH' ? 'border-l-orange-500' : 'border-l-blue-500'}`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-mono text-xs text-[var(--text-muted)]">{ticket.id}</span>
                            {getSlaBadge(ticket)}
                          </div>
                          <p className="text-sm font-medium text-[var(--text-primary)] line-clamp-2">
                            {ticket.subject}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <p className="text-xs text-[var(--text-secondary)]">{getClientName(ticket)}</p>
                            {agentName && (
                              <span className="text-xs text-[var(--primary)] font-medium">{agentName}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB: SLA MONITOR */}
        {activeTab === 'SLA' && (
          <div className="flex-1 overflow-y-auto space-y-6 pb-16 lg:pb-0">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="p-6 text-center">
                <p className="text-xs font-bold text-[var(--text-secondary)] uppercase mb-2">Taux de Respect SLA</p>
                <p
                  className={`text-4xl font-bold ${slaStats.respectRate >= 80 ? 'text-green-600' : slaStats.respectRate >= 60 ? 'text-orange-600' : 'text-red-600'}`}
                >
                  {slaStats.respectRate}%
                </p>
              </Card>
              <Card className="p-6 text-center border-l-4 border-l-green-500">
                <p className="text-xs font-bold text-[var(--text-secondary)] uppercase mb-2">Dans les Temps</p>
                <p className="text-3xl font-bold text-green-600">{slaStats.ok.length}</p>
              </Card>
              <Card className="p-6 text-center border-l-4 border-l-orange-500">
                <p className="text-xs font-bold text-[var(--text-secondary)] uppercase mb-2">Attention</p>
                <p className="text-3xl font-bold text-orange-600">{slaStats.warning.length}</p>
              </Card>
              <Card className="p-6 text-center border-l-4 border-l-red-500">
                <p className="text-xs font-bold text-[var(--text-secondary)] uppercase mb-2">Critique / Dépassé</p>
                <p className="text-3xl font-bold text-red-600">{slaStats.critical.length}</p>
              </Card>
            </div>

            {/* Liste SLA Critiques */}
            <Card className="p-6">
              <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4">Tickets Nécessitant Attention</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[var(--bg-elevated)] sticky top-0 z-10">
                    <tr className="border-b border-[var(--border)]">
                      <th className="text-left px-3 py-3 text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                        ID
                      </th>
                      <th className="text-left px-3 py-3 text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                        Sujet
                      </th>
                      <th className="text-left px-3 py-3 text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                        Client
                      </th>
                      <th className="text-left px-3 py-3 text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                        Agent
                      </th>
                      <th className="text-center px-3 py-3 text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                        Priorité
                      </th>
                      <th className="text-center px-3 py-3 text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                        Créé le
                      </th>
                      <th className="text-center px-3 py-3 text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                        Temps restant
                      </th>
                      <th className="text-center px-3 py-3 text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...slaStats.critical, ...slaStats.warning].map((t) => {
                      const clientName = (() => {
                        if (t.clientName) return t.clientName;
                        const tier = tiers.find((ti: Tier) => ti.id === t.clientId);
                        if (tier) return tier.name || '';
                        const client = clients.find((c) => c.id === t.clientId);
                        return client?.name || '';
                      })();
                      const agentName = (() => {
                        if (t.assignedUserName) return t.assignedUserName;
                        if (!t.assignedTo) return '';
                        const agent = users.find((u: UserType) => u.id === t.assignedTo);
                        return agent?.name || agent?.email || '';
                      })();
                      return (
                        <tr
                          key={t.id}
                          className="density-row border-b border-[var(--border)] border-[var(--border)] tr-hover/50"
                        >
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-2">
                              <span
                                className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${getSlaStatus(t.createdAt, t.priority) === 'CRITICAL' ? 'bg-red-500' : 'bg-orange-500'}`}
                              />
                              <button
                                onClick={() => {
                                  setSelectedTicketId(t.id);
                                  setActiveTab('TICKETS');
                                }}
                                className="font-mono text-xs font-bold text-[var(--primary)] hover:text-[var(--primary)] dark:text-[var(--primary)] dark:hover:text-[var(--primary)] hover:underline"
                                title="Ouvrir le ticket"
                              >
                                {t.id}
                              </button>
                            </div>
                          </td>
                          <td className="py-2 px-3 text-[var(--text-primary)] max-w-[200px] truncate">{t.subject}</td>
                          <td className="py-2 px-3 text-[var(--text-secondary)] text-xs">
                            {clientName || <span className="italic text-[var(--text-muted)]">—</span>}
                          </td>
                          <td className="py-2 px-3 text-[var(--text-secondary)] text-xs">
                            {agentName || <span className="italic text-[var(--text-muted)]">Non assigné</span>}
                          </td>
                          <td className="text-center py-2 px-3">
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${getPriorityBadge(t.priority)}`}>
                              {t.priority}
                            </span>
                          </td>
                          <td className="text-center py-2 px-3 text-xs text-[var(--text-secondary)] whitespace-nowrap">
                            {new Date(t.createdAt).toLocaleDateString('fr-FR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                            })}{' '}
                            {new Date(t.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="text-center py-2 px-3">{getRemainingTime(t)}</td>
                          <td className="text-center py-2 px-3">
                            <button
                              onClick={() => {
                                setSelectedTicketId(t.id);
                                setActiveTab('TICKETS');
                              }}
                              className="p-1.5 hover:bg-[var(--primary-dim)] dark:hover:bg-[var(--primary-dim)] rounded-lg text-[var(--primary)]"
                              title="Voir le ticket"
                            >
                              <ArrowUpRight className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {slaStats.critical.length === 0 && slaStats.warning.length === 0 && (
                  <p className="text-center text-[var(--text-muted)] py-8">Tous les tickets sont dans les délais SLA</p>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* TAB: CONFIGURATION */}
        {activeTab === 'CONFIG' && (
          <div className="flex-1 overflow-y-auto pb-16 lg:pb-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Macros */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-[var(--text-primary)]">Macros de Réponse</h3>
                  <button
                    onClick={() => {
                      setIsEditingMacro(null);
                      setNewMacro({ label: '', text: '', category: '' });
                    }}
                    className="text-sm text-[var(--primary)] hover:underline"
                  >
                    + Nouvelle Macro
                  </button>
                </div>

                {/* Form */}
                <div className="p-4 bg-[var(--bg-elevated)] rounded-lg mb-4 space-y-3">
                  <input
                    type="text"
                    placeholder="Label (ex: Bonjour)"
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    value={newMacro.label}
                    onChange={(e) => setNewMacro({ ...newMacro, label: e.target.value })}
                  />
                  <textarea
                    placeholder="Texte de la macro..."
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    rows={3}
                    value={newMacro.text}
                    onChange={(e) => setNewMacro({ ...newMacro, text: e.target.value })}
                  />
                  <div className="flex gap-2">
                    <button onClick={saveMacro} className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm">
                      {isEditingMacro ? 'Mettre à jour' : 'Créer'}
                    </button>
                    {isEditingMacro && (
                      <button
                        onClick={() => {
                          setIsEditingMacro(null);
                          setNewMacro({ label: '', text: '', category: '' });
                        }}
                        className="px-4 py-2 text-[var(--text-secondary)]"
                      >
                        Annuler
                      </button>
                    )}
                  </div>
                </div>

                {/* List */}
                <div className="space-y-2">
                  {loadingMacros && (
                    <div className="text-center py-4 text-[var(--text-muted)] text-sm">Chargement des macros...</div>
                  )}
                  {!loadingMacros && macros.length === 0 && (
                    <div className="text-center py-6 text-[var(--text-muted)] text-sm">Aucune macro configurée</div>
                  )}
                  {macros.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between p-3 bg-[var(--bg-surface)] border rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-[var(--text-primary)]">{m.label}</p>
                        <p className="text-xs text-[var(--text-secondary)] line-clamp-1">{m.text}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setIsEditingMacro(m);
                            setNewMacro({ label: m.label, text: m.text, category: m.category || '' });
                          }}
                          className="p-1 hover:bg-[var(--bg-elevated)] rounded"
                          title="Modifier la macro"
                        >
                          <Edit2 className="w-4 h-4 text-[var(--text-muted)]" />
                        </button>
                        <button
                          onClick={() => deleteMacro(m.id)}
                          className="p-1 hover:bg-red-50 rounded"
                          title="Supprimer la macro"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* SLA Config */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-[var(--text-primary)]">Configuration SLA</h3>
                  <span className="text-xs text-[var(--text-muted)] italic">Modifiable dans Admin → Paramètres</span>
                </div>
                <div className="space-y-3">
                  {Object.entries(slaConfig || {}).map(([key, hours]) => {
                    const priority = key.toUpperCase();
                    if (['ID', 'TENANT_ID', 'IS_CUSTOM'].includes(priority)) return null; // Skip non-priority fields
                    return (
                      <div
                        key={priority}
                        className="flex items-center justify-between p-3 bg-[var(--bg-elevated)] rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${getPriorityBadge(priority)}`}>
                            {priority}
                          </span>
                          <span className="text-[var(--text-secondary)]">Délai maximum</span>
                        </div>
                        <span className="font-bold text-[var(--text-primary)]">{hours as React.ReactNode}h</span>
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* Categories & SLA */}
              <Card className="p-6">
                <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4">Catégories & SLA</h3>
                <div className="space-y-3">
                  {ticketCategories.map((cat: TicketCategory) => (
                    <div key={cat.id} className="border border-[var(--border)] rounded-lg overflow-hidden">
                      <div
                        className="p-3 bg-[var(--bg-elevated)] flex items-center justify-between cursor-pointer hover:bg-[var(--bg-elevated)] transition-colors"
                        onClick={async () => {
                          if (expandedCategory === cat.id) {
                            setExpandedCategory(null);
                          } else {
                            setExpandedCategory(cat.id);
                            setLoadingConfig(true);
                            try {
                              const subs = await api.adminFeatures.supportSettings.getSubCategories(cat.id);
                              setConfigSubCategories(subs);
                            } catch {
                              /* silent */
                            }
                            setLoadingConfig(false);
                          }
                        }}
                      >
                        <div className="flex items-center gap-2">
                          {expandedCategory === cat.id ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <Play className="w-3 h-3 text-[var(--text-muted)]" />
                          )}
                          <span className="font-medium text-[var(--text-primary)]">{cat.name}</span>
                        </div>
                        <span className="text-xs text-[var(--text-secondary)]">
                          {expandedCategory === cat.id ? configSubCategories.length : '?'} sous-catégories
                        </span>
                      </div>

                      {expandedCategory === cat.id && (
                        <div className="p-3 bg-[var(--bg-surface)] border-t border-[var(--border)] space-y-2">
                          {loadingConfig ? (
                            <div className="text-center py-2 text-[var(--text-muted)] text-sm">Chargement...</div>
                          ) : configSubCategories.length > 0 ? (
                            configSubCategories.map((sub: SubCategoryConfig) => {
                              const saveSubCat = async (s: SubCategoryConfig) => {
                                if (!s._modified) return;
                                try {
                                  await api.adminFeatures.supportSettings.updateSubCategory(s.id, {
                                    name: s.name,
                                    default_priority: s.default_priority,
                                    sla_hours: s.sla_hours,
                                  });
                                  showToast(TOAST.CRUD.UPDATED('Sous-catégorie'), 'success');
                                  setConfigSubCategories((prev) =>
                                    prev.map((x: SubCategoryConfig) => (x.id === s.id ? { ...x, _modified: false } : x))
                                  );
                                } catch (e) {
                                  showToast(mapError(e, 'sous-catégorie'), 'error');
                                }
                              };
                              return (
                                <div key={sub.id} className="flex items-center justify-between p-2 tr-hover rounded">
                                  <div className="flex-1">
                                    <input
                                      type="text"
                                      className="bg-transparent border-none p-0 text-sm font-medium text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--primary)] w-full"
                                      value={sub.name}
                                      onChange={(e) => {
                                        const newSubs = configSubCategories.map((s: SubCategoryConfig) =>
                                          s.id === sub.id ? { ...s, name: e.target.value, _modified: true } : s
                                        );
                                        setConfigSubCategories(newSubs);
                                      }}
                                      onBlur={() => saveSubCat(sub)}
                                    />
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <select
                                      className="px-2 py-1 text-xs border rounded bg-[var(--bg-elevated)] text-[var(--text-primary)]"
                                      value={sub.default_priority}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setConfigSubCategories((prev) => {
                                          const updated = prev.map((s: SubCategoryConfig) =>
                                            s.id === sub.id
                                              ? {
                                                  ...s,
                                                  default_priority: val as SubCategoryConfig['default_priority'],
                                                  _modified: true,
                                                }
                                              : s
                                          );
                                          const target = updated.find((s: SubCategoryConfig) => s.id === sub.id);
                                          if (target) setTimeout(() => saveSubCat(target), 100);
                                          return updated;
                                        });
                                      }}
                                    >
                                      <option value="LOW">LOW</option>
                                      <option value="MEDIUM">MEDIUM</option>
                                      <option value="HIGH">HIGH</option>
                                      <option value="CRITICAL">CRITICAL</option>
                                    </select>
                                    <div className="flex items-center gap-1">
                                      <input
                                        type="number"
                                        className="w-16 px-2 py-1 text-xs border rounded bg-[var(--bg-elevated)] text-[var(--text-primary)]"
                                        value={sub.sla_hours || 0}
                                        onChange={(e) => {
                                          const newSubs = configSubCategories.map((s: SubCategoryConfig) =>
                                            s.id === sub.id
                                              ? { ...s, sla_hours: parseInt(e.target.value), _modified: true }
                                              : s
                                          );
                                          setConfigSubCategories(newSubs);
                                        }}
                                        onBlur={() => saveSubCat(sub)}
                                      />
                                      <span className="text-xs text-[var(--text-secondary)]">h</span>
                                    </div>
                                    {sub._modified && (
                                      <button
                                        onClick={() => saveSubCat(sub)}
                                        className="p-1.5 bg-[var(--primary)] text-white rounded hover:bg-[var(--primary-light)] transition-colors"
                                        title="Enregistrer les modifications"
                                      >
                                        <Check className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="text-center py-2 text-[var(--text-muted)] text-sm">
                              Aucune sous-catégorie
                            </div>
                          )}
                          <div className="pt-2 border-t border-[var(--border)] border-[var(--border)] flex justify-center">
                            <button
                              className="text-xs text-[var(--primary)] hover:text-[var(--primary-light)] flex items-center gap-1"
                              onClick={async () => {
                                const name = prompt('Nom de la nouvelle sous-catégorie :');
                                if (name) {
                                  try {
                                    const newSub = await api.adminFeatures.supportSettings.createSubCategory({
                                      category_id: cat.id,
                                      name,
                                      default_priority: 'MEDIUM',
                                      sla_hours: 48,
                                    });
                                    setConfigSubCategories([...configSubCategories, newSub]);
                                  } catch (e) {
                                    showToast(mapError(e, 'sous-catégorie'), 'error');
                                  }
                                }
                              }}
                            >
                              <Plus className="w-3 h-3" /> Ajouter une sous-catégorie
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* TAB: LIVE CHAT */}
        {activeTab === 'LIVECHAT' && (
          <div className="flex-1 overflow-hidden">
            <LiveChatPanel />
          </div>
        )}

        {/* MODALS */}
        <TicketFormModal
          isOpen={isCreateModalOpen}
          onClose={() => {
            setIsCreateModalOpen(false);
            setStagedAttachments([]);
          }}
          isEditMode={isEditMode}
          ticketForm={ticketForm}
          setTicketForm={setTicketForm}
          formErrors={formErrors}
          handleSaveTicket={handleSaveTicket}
          isSaving={isSavingTicket}
          clients={clients}
          vehicles={vehicles}
          technicians={ticketStaff}
          tiers={tiers}
          ticketCategories={ticketCategories}
          ticketSubcategories={ticketSubcategories}
          slaConfig={slaConfig}
          invoices={invoices}
          stagedFiles={stagedAttachments}
          onStagedFilesChange={setStagedAttachments}
        />

        {/* Import Modal */}
        <Modal
          isOpen={isImportModalOpen}
          onClose={() => {
            setIsImportModalOpen(false);
            setImportPreview([]);
          }}
          title="Importer des Tickets"
          footer={
            <>
              <button
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportPreview([]);
                }}
                className="px-4 py-2 text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] rounded-lg"
              >
                Annuler
              </button>
              <button
                onClick={handleImportTickets}
                disabled={importPreview.length === 0}
                className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg disabled:opacity-50"
              >
                Importer {importPreview.length} ticket(s)
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="bg-[var(--primary-dim)] border border-[var(--border)] rounded-lg p-4">
              <h4 className="font-bold text-[var(--primary)] dark:text-[var(--primary)] mb-2">Instructions</h4>
              <ol className="text-sm text-[var(--primary)] space-y-1 list-decimal list-inside">
                <li>Téléchargez le template CSV</li>
                <li>Remplissez les données (1 ligne = 1 ticket)</li>
                <li>Importez le fichier complété</li>
              </ol>
              <button
                onClick={handleDownloadImportTemplate}
                className="mt-3 flex items-center gap-2 px-3 py-1.5 bg-[var(--primary)] text-white text-sm rounded-lg hover:bg-[var(--primary-light)]"
              >
                <Download className="w-4 h-4" /> Télécharger le template
              </button>
            </div>
            <div>
              <label
                className="block text-sm font-medium text-[var(--text-primary)] mb-2"
                htmlFor="import-tickets-file"
              >
                Fichier CSV
              </label>
              <input
                type="file"
                id="import-tickets-file"
                ref={importFileRef}
                accept=".csv,.txt"
                onChange={handleImportFile}
                title="Sélectionner un fichier CSV à importer"
                className="block w-full text-sm text-[var(--text-secondary)] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-[var(--primary-dim)] file:text-[var(--primary)] hover:file:bg-[var(--primary-dim)]"
              />
            </div>
            {importPreview.length > 0 && (
              <div>
                <h4 className="font-bold text-[var(--text-primary)] mb-2">Aperçu ({importPreview.length} lignes)</h4>
                <div className="max-h-48 overflow-auto border border-[var(--border)] rounded-lg">
                  <table className="w-full text-xs">
                    <thead className="bg-[var(--bg-elevated)] sticky top-0">
                      <tr>
                        <th className="px-2 py-1 text-left">Ligne</th>
                        <th className="px-2 py-1 text-left">Client</th>
                        <th className="px-2 py-1 text-left">Sujet</th>
                        <th className="px-2 py-1 text-left">Priorité</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {importPreview.slice(0, 10).map((item, idx) => (
                        <tr key={idx} className="tr-hover">
                          <td className="px-2 py-1">{item._row}</td>
                          <td className="px-2 py-1">{item.clientid || '-'}</td>
                          <td className="px-2 py-1">{item.subject || '-'}</td>
                          <td className="px-2 py-1">{item.priority || 'MEDIUM'}</td>
                        </tr>
                      ))}
                      {importPreview.length > 10 && (
                        <tr>
                          <td colSpan={4} className="px-2 py-1 text-center text-[var(--text-secondary)]">
                            ... et {importPreview.length - 10} autres
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </Modal>

        <Modal
          isOpen={isStatusModalOpen}
          onClose={() => setIsStatusModalOpen(false)}
          title="Changement de Statut"
          footer={
            <>
              <button
                onClick={() => setIsStatusModalOpen(false)}
                className="px-4 py-2 text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] rounded-lg"
              >
                Annuler
              </button>
              <button onClick={confirmStatusChange} className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg">
                Confirmer
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <p className="text-[var(--text-secondary)]">
              Ticket <strong>{selectedTicket?.id}</strong> →{' '}
              <span className="font-bold">{targetStatus && getStatusInfo(targetStatus).label}</span>
            </p>
            <textarea
              className="w-full px-3 py-2 border rounded-lg"
              rows={3}
              placeholder="Motif du changement..."
              value={statusReason}
              onChange={(e) => setStatusReason(e.target.value)}
            />
          </div>
        </Modal>

        {/* Kanban Drop Reason Modal */}
        <Modal
          isOpen={!!pendingKanbanDrop}
          onClose={() => setPendingKanbanDrop(null)}
          title="Motif du changement de statut"
          footer={
            <>
              <button
                onClick={() => setPendingKanbanDrop(null)}
                className="px-4 py-2 text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] rounded-lg"
              >
                Annuler
              </button>
              <button
                onClick={confirmKanbanDrop}
                disabled={!kanbanDropReason.trim()}
                className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirmer
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <p className="text-[var(--text-secondary)]">
              Ticket <strong>{pendingKanbanDrop?.ticketId}</strong> →{' '}
              <span className="font-bold">
                {pendingKanbanDrop?.newStatus && getStatusInfo(pendingKanbanDrop.newStatus).label}
              </span>
            </p>
            <textarea
              className="w-full px-3 py-2 border rounded-lg bg-[var(--bg-elevated)] border-[var(--border)]"
              rows={3}
              placeholder="Motif obligatoire du changement de statut..."
              required
              value={kanbanDropReason}
              onChange={(e) => setKanbanDropReason(e.target.value)}
            />
            {!kanbanDropReason.trim() && <p className="text-xs text-red-500">* Le motif est obligatoire</p>}
          </div>
        </Modal>

        {/* Escalate Modal */}
        {selectedTicket && (
          <EscalateTicketModal
            isOpen={isEscalateModalOpen}
            onClose={() => setIsEscalateModalOpen(false)}
            ticketId={selectedTicket.id}
            currentPriority={selectedTicket.priority}
            onSuccess={() => {
              showToast(TOAST.SUPPORT.TICKET_ESCALATED, 'success');
              setIsEscalateModalOpen(false);
              setSelectedTicketId(null);
            }}
          />
        )}

        {/* Intervention Form - Composant autonome avec son propre modal */}
        <InterventionForm
          isOpen={isInterventionModalOpen}
          onClose={() => {
            setIsInterventionModalOpen(false);
            setInterventionInitialData(null);
          }}
          onSave={(intervention) => {
            addIntervention(intervention as Intervention);
            showToast(TOAST.SUPPORT.INTERVENTION_PLANNED, 'success');
            setIsInterventionModalOpen(false);
            setInterventionInitialData(null);
          }}
          initialData={interventionInitialData as Intervention | null}
          technicians={users.filter((u) => (staffRoles as readonly string[]).includes(u.role))}
        />
        <ConfirmDialogComponent />
      </MobileTabLayout>
    </div>
  );
};
