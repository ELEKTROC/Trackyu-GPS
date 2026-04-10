/**
 * AuditLogsPanelV2 - Journal d'Audit Amélioré
 *
 * Fonctionnalités:
 * - Timeline visuelle des événements
 * - Filtres avancés (date, utilisateur, action, entité)
 * - Export CSV/PDF
 * - Détails avec diff JSON
 * - Statistiques d'activité
 * - Alertes de sécurité
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useIsMobile } from '../../../../hooks/useIsMobile';
import {
  Activity,
  Search,
  Filter,
  Download,
  RefreshCw,
  Eye,
  ChevronRight,
  User,
  Clock,
  FileText,
  Trash2,
  Edit2,
  Plus,
  LogIn,
  LogOut,
  Shield,
  AlertTriangle,
  Check,
  X,
  Settings,
  Database,
  Key,
  Users,
  Car,
  CreditCard,
  MapPin,
  BarChart3,
  ArrowUpRight,
} from 'lucide-react';
import { Card } from '../../../../components/Card';
import { Modal } from '../../../../components/Modal';
import { useToast } from '../../../../contexts/ToastContext';
import { TOAST } from '../../../../constants/toastMessages';
import { mapError } from '../../../../utils/errorMapper';
import { api } from '../../../../services/apiLazy';
import { useTableSort } from '../../../../hooks/useTableSort';
import { SortableHeader } from '../../../../components/SortableHeader';
import { logger } from '../../../../utils/logger';
import { useDataContext } from '../../../../contexts/DataContext';
import { useAuth } from '../../../../contexts/AuthContext';

// Helper: Safely parse date to Date object or null
const safeToDate = (dateValue: string | Date | null | undefined): Date | null => {
  if (!dateValue) return null;
  try {
    const dateObj = new Date(dateValue);
    if (isNaN(dateObj.getTime())) return null;
    return dateObj;
  } catch {
    return null;
  }
};

// API Row interface for mapping
interface AuditLogApiRow {
  id: string;
  created_at?: string;
  timestamp?: string;
  user_id?: string;
  userId?: string;
  user_name?: string;
  userName?: string;
  user_email?: string;
  userEmail?: string;
  user_role?: string;
  userRole?: string;
  action?: string;
  entity_type?: string;
  entityType?: string;
  entity_id?: string;
  entityId?: string;
  entity_name?: string;
  entityName?: string;
  ip_address?: string;
  ipAddress?: string;
  user_agent?: string;
  userAgent?: string;
  details?: Record<string, unknown>;
  old_values?: Record<string, unknown>;
  oldValues?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  status?: string;
  duration?: number;
}

// Types
interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'EXPORT' | 'IMPORT' | 'VIEW' | 'SECURITY';
  entityType: string;
  entityId?: string;
  entityName?: string;
  ipAddress: string;
  userAgent: string;
  details: Record<string, any>;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  status: 'success' | 'failure' | 'warning';
  duration?: number; // ms
}

interface AuditFilter {
  search: string;
  dateFrom: string;
  dateTo: string;
  userId: string;
  tenantId: string; // Add this
  action: string;
  entityType: string;
  status: string;
}

// Actions avec config
const ACTION_CONFIG: Record<
  string,
  { label: string; icon: React.ElementType; color: string; bgColor: string; barColor: string }
> = {
  CREATE: { label: 'Création', icon: Plus, color: 'text-green-600', bgColor: 'bg-green-100', barColor: 'bg-green-500' },
  UPDATE: {
    label: 'Modification',
    icon: Edit2,
    color: 'text-[var(--primary)]',
    bgColor: 'bg-[var(--primary-dim)]',
    barColor: 'bg-[var(--primary-dim)]0',
  },
  DELETE: { label: 'Suppression', icon: Trash2, color: 'text-red-600', bgColor: 'bg-red-100', barColor: 'bg-red-500' },
  LOGIN: {
    label: 'Connexion',
    icon: LogIn,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    barColor: 'bg-purple-500',
  },
  LOGOUT: {
    label: 'Déconnexion',
    icon: LogOut,
    color: 'text-slate-600',
    bgColor: 'bg-slate-100',
    barColor: 'bg-slate-500',
  },
  EXPORT: { label: 'Export', icon: Download, color: 'text-cyan-600', bgColor: 'bg-cyan-100', barColor: 'bg-cyan-500' },
  IMPORT: {
    label: 'Import',
    icon: ArrowUpRight,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100',
    barColor: 'bg-indigo-500',
  },
  VIEW: {
    label: 'Consultation',
    icon: Eye,
    color: 'text-slate-600',
    bgColor: 'bg-slate-100',
    barColor: 'bg-slate-500',
  },
  SECURITY: {
    label: 'Sécurité',
    icon: Shield,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
    barColor: 'bg-amber-500',
  },
};

// Entités
const ENTITY_CONFIG: Record<string, { label: string; icon: React.ElementType }> = {
  USER: { label: 'Utilisateur', icon: User },
  VEHICLE: { label: 'Véhicule', icon: Car },
  CLIENT: { label: 'Client', icon: Users },
  INVOICE: { label: 'Facture', icon: CreditCard },
  INTERVENTION: { label: 'Intervention', icon: Settings },
  GEOFENCE: { label: 'Géofence', icon: MapPin },
  DEVICE: { label: 'Boîtier', icon: Database },
  ROLE: { label: 'Rôle', icon: Shield },
  SETTINGS: { label: 'Paramètres', icon: Settings },
  SESSION: { label: 'Session', icon: Key },
  REPORT: { label: 'Rapport', icon: BarChart3 },
};

// Données de démonstration
const DEMO_LOGS: AuditLog[] = [
  {
    id: '1',
    timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
    userId: 'usr_1',
    userName: 'Amadou Diallo',
    userEmail: 'amadou@trackyu.sn',
    userRole: 'Administrateur',
    action: 'UPDATE',
    entityType: 'VEHICLE',
    entityId: 'veh_123',
    entityName: 'DK-1234-AB',
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    details: { field: 'status', reason: 'Maintenance' },
    oldValues: { status: 'active' },
    newValues: { status: 'maintenance' },
    status: 'success',
    duration: 45,
  },
  {
    id: '2',
    timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
    userId: 'usr_2',
    userName: 'Fatou Sow',
    userEmail: 'fatou@trackyu.sn',
    userRole: 'Commercial',
    action: 'CREATE',
    entityType: 'CLIENT',
    entityId: 'cli_456',
    entityName: 'Transport Express SARL',
    ipAddress: '192.168.1.105',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    details: { source: 'form' },
    status: 'success',
    duration: 120,
  },
  {
    id: '3',
    timestamp: new Date(Date.now() - 30 * 60000).toISOString(),
    userId: 'usr_1',
    userName: 'Amadou Diallo',
    userEmail: 'amadou@trackyu.sn',
    userRole: 'Administrateur',
    action: 'DELETE',
    entityType: 'USER',
    entityId: 'usr_old',
    entityName: 'ancien.user@test.com',
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    details: { reason: 'Compte inactif' },
    status: 'success',
    duration: 35,
  },
  {
    id: '4',
    timestamp: new Date(Date.now() - 45 * 60000).toISOString(),
    userId: 'usr_3',
    userName: 'Moussa Ba',
    userEmail: 'moussa@trackyu.sn',
    userRole: 'Superadmin',
    action: 'SECURITY',
    entityType: 'ROLE',
    entityId: 'role_admin',
    entityName: 'Administrateur',
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    details: { change: 'permissions_updated', added: ['VIEW_REPORTS'] },
    status: 'warning',
  },
  {
    id: '5',
    timestamp: new Date(Date.now() - 60 * 60000).toISOString(),
    userId: 'usr_4',
    userName: 'Inconnu',
    userEmail: 'unknown@test.com',
    userRole: 'Guest',
    action: 'LOGIN',
    entityType: 'SESSION',
    ipAddress: '41.82.100.50',
    userAgent: 'Mozilla/5.0 (Linux; Android 10)',
    details: { method: 'password', attempts: 3 },
    status: 'failure',
  },
  {
    id: '6',
    timestamp: new Date(Date.now() - 2 * 3600000).toISOString(),
    userId: 'usr_2',
    userName: 'Fatou Sow',
    userEmail: 'fatou@trackyu.sn',
    userRole: 'Commercial',
    action: 'EXPORT',
    entityType: 'REPORT',
    entityName: 'Rapport Clients Q4',
    ipAddress: '192.168.1.105',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    details: { format: 'xlsx', records: 156 },
    status: 'success',
    duration: 2500,
  },
  {
    id: '7',
    timestamp: new Date(Date.now() - 3 * 3600000).toISOString(),
    userId: 'usr_1',
    userName: 'Amadou Diallo',
    userEmail: 'amadou@trackyu.sn',
    userRole: 'Administrateur',
    action: 'LOGIN',
    entityType: 'SESSION',
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    details: { method: '2fa', device: 'Desktop' },
    status: 'success',
  },
];

// Formatage date relative
const formatRelativeTime = (date: string): string => {
  const dateObj = safeToDate(date);
  if (!dateObj) return 'Date invalide';

  const diff = Date.now() - dateObj.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "À l'instant";
  if (minutes < 60) return `Il y a ${minutes} min`;
  if (hours < 24) return `Il y a ${hours}h`;
  if (days < 7) return `Il y a ${days}j`;
  return dateObj.toLocaleDateString('fr-FR');
};

export const AuditLogsPanelV2: React.FC = () => {
  const isMobile = useIsMobile();
  const { showToast } = useToast();
  const { tiers, users: allUsers } = useDataContext();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPERADMIN' || user?.role === 'SUPER_ADMIN';

  // State
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [activeTab, setActiveTab] = useState<'timeline' | 'table' | 'stats'>('timeline');
  const [filters, setFilters] = useState<AuditFilter>({
    search: '',
    dateFrom: '',
    dateTo: '',
    userId: '',
    tenantId: 'all',
    action: 'all',
    entityType: 'all',
    status: 'all',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Charger les logs depuis l'API
  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      try {
        const params: any = { limit: '200' };
        if (filters.tenantId && filters.tenantId !== 'all') {
          params.tenantId = filters.tenantId;
        }
        if (filters.action && filters.action !== 'all') params.action = filters.action;
        if (filters.entityType && filters.entityType !== 'all') params.entityType = filters.entityType;
        if (filters.status && filters.status !== 'all') params.status = filters.status;
        if (filters.dateFrom) params.dateFrom = filters.dateFrom;
        if (filters.dateTo) params.dateTo = filters.dateTo;
        if (filters.userId) params.userId = filters.userId;

        const data = await api.auditLogs.list(params);
        if (Array.isArray(data) && data.length > 0) {
          // Mapper le format backend → frontend
          const mapped: AuditLog[] = data.map((row: AuditLogApiRow) => ({
            id: row.id,
            timestamp: row.created_at || row.timestamp,
            userId: row.user_id || row.userId,
            userName: row.user_name || row.userName || 'Inconnu',
            userEmail: row.user_email || row.userEmail || '',
            userRole: row.user_role || row.userRole || '',
            action: (row.action || 'VIEW').toUpperCase() as AuditLog['action'],
            entityType: (row.entity_type || row.entityType || '').toUpperCase(),
            entityId: row.entity_id || row.entityId,
            entityName: row.entity_name || row.entityName,
            ipAddress: row.ip_address || row.ipAddress || '',
            userAgent: row.user_agent || row.userAgent || '',
            details: row.details || {},
            oldValues: row.old_values || row.oldValues,
            newValues: row.new_values || row.newValues,
            status: (row.status || 'success') as AuditLog['status'],
            duration: row.duration,
          }));
          setLogs(mapped);
        }
        // Si API vide, logs reste []
      } catch (error) {
        logger.error('Erreur chargement audit logs:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  // Filtrage
  const filteredLogs = useMemo(() => {
    let result = [...logs];

    if (filters.search) {
      const query = filters.search.toLowerCase();
      result = result.filter(
        (l) =>
          l.userName.toLowerCase().includes(query) ||
          l.userEmail.toLowerCase().includes(query) ||
          l.entityName?.toLowerCase().includes(query) ||
          l.entityId?.toLowerCase().includes(query)
      );
    }

    if (filters.action !== 'all') {
      result = result.filter((l) => l.action === filters.action);
    }

    if (filters.entityType !== 'all') {
      result = result.filter((l) => l.entityType === filters.entityType);
    }

    if (filters.status !== 'all') {
      result = result.filter((l) => l.status === filters.status);
    }

    if (filters.dateFrom) {
      const fromDate = safeToDate(filters.dateFrom);
      if (fromDate) {
        result = result.filter((l) => {
          const logDate = safeToDate(l.timestamp);
          return logDate && logDate >= fromDate;
        });
      }
    }

    if (filters.dateTo) {
      const toDate = safeToDate(filters.dateTo + 'T23:59:59');
      if (toDate) {
        result = result.filter((l) => {
          const logDate = safeToDate(l.timestamp);
          return logDate && logDate <= toDate;
        });
      }
    }

    return result;
  }, [logs, filters]);

  const AUDIT_SORT_ACCESSORS: Record<string, (log: AuditLog) => string> = {
    date: (l) => l.timestamp,
    user: (l) => l.userName,
    action: (l) => l.action,
    entity: (l) => l.entityName || l.entityType,
    status: (l) => l.status || '',
    ip: (l) => l.ipAddress || '',
  };

  const {
    sortedItems: sortedLogs,
    sortConfig: auditSortConfig,
    handleSort: handleAuditSort,
  } = useTableSort(filteredLogs, { key: 'date', direction: 'desc' }, AUDIT_SORT_ACCESSORS);

  // Stats
  const stats = useMemo(() => {
    const today = new Date().toDateString();
    const todayLogs = logs.filter((l) => new Date(l.timestamp).toDateString() === today);

    return {
      total: logs.length,
      today: todayLogs.length,
      byAction: Object.entries(ACTION_CONFIG).map(([key, config]) => ({
        action: key,
        ...config,
        count: logs.filter((l) => l.action === key).length,
      })),
      byEntity: Object.entries(ENTITY_CONFIG).map(([key, config]) => ({
        entity: key,
        ...config,
        count: logs.filter((l) => l.entityType === key).length,
      })),
      failures: logs.filter((l) => l.status === 'failure').length,
      warnings: logs.filter((l) => l.status === 'warning').length,
      uniqueUsers: new Set(logs.map((l) => l.userId)).size,
    };
  }, [logs]);

  // Handlers
  const handleRefresh = async () => {
    setLoading(true);
    try {
      const data = await api.auditLogs.list({ limit: '200' });
      if (Array.isArray(data) && data.length > 0) {
        const mapped: AuditLog[] = data.map((row: AuditLogApiRow) => ({
          id: row.id,
          timestamp: row.created_at || row.timestamp || '',
          userId: row.user_id || row.userId || '',
          userName: row.user_name || row.userName || 'Inconnu',
          userEmail: row.user_email || row.userEmail || '',
          userRole: row.user_role || row.userRole || '',
          action: (row.action || 'VIEW').toUpperCase() as AuditLog['action'],
          entityType: (row.entity_type || row.entityType || '').toUpperCase(),
          entityId: row.entity_id || row.entityId,
          entityName: row.entity_name || row.entityName,
          ipAddress: row.ip_address || row.ipAddress || '',
          userAgent: row.user_agent || row.userAgent || '',
          details: (row.details || {}) as Record<string, unknown>,
          oldValues: (row.old_values || row.oldValues) as Record<string, unknown> | undefined,
          newValues: (row.new_values || row.newValues) as Record<string, unknown> | undefined,
          status: (row.status || 'success') as AuditLog['status'],
          duration: row.duration,
        }));
        setLogs(mapped);
      }
      showToast(TOAST.ADMIN.LOGS_REFRESHED, 'success');
    } catch (error) {
      logger.error('Erreur rafraîchissement audit logs:', error);
      showToast(mapError(error, 'logs'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = (format: 'csv' | 'json') => {
    try {
      if (filteredLogs.length === 0) {
        showToast(TOAST.IO.NOTHING_TO_EXPORT, 'warning');
        return;
      }
      if (format === 'csv') {
        const headers = ['Date', 'Utilisateur', 'Email', 'Action', 'Entité', 'ID Entité', 'IP', 'Statut'];
        const rows = filteredLogs.map((l) => [
          l.timestamp,
          l.userName,
          l.userEmail,
          l.action,
          l.entityType,
          l.entityId || '',
          l.ipAddress,
          l.status,
        ]);
        const csvContent = [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
        const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
      } else {
        const jsonContent = JSON.stringify(filteredLogs, null, 2);
        const blob = new Blob([jsonContent], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `audit_logs_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
      }
      showToast(TOAST.IO.EXPORT_SUCCESS(format.toUpperCase(), filteredLogs.length), 'success');
    } catch (error) {
      showToast(TOAST.IO.EXPORT_ERROR(format), 'error');
    }
  };

  const handleViewDetails = (log: AuditLog) => {
    setSelectedLog(log);
    setIsDetailOpen(true);
  };

  const resetFilters = () => {
    setFilters({
      search: '',
      dateFrom: '',
      dateTo: '',
      userId: '',
      tenantId: 'all',
      action: 'all',
      entityType: 'all',
      status: 'all',
    });
  };

  const getActionConfig = (action: string) => ACTION_CONFIG[action] || ACTION_CONFIG.VIEW;
  const getEntityConfig = (entity: string) => ENTITY_CONFIG[entity] || { label: entity, icon: FileText };

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Activity className="w-6 h-6 text-purple-600" />
            Journal d'Audit
          </h2>
          <p className="text-sm text-slate-500">
            {filteredLogs.length} événements • {stats.today} aujourd'hui
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleExport('csv')}
            className="flex items-center gap-2 px-3 py-2 border rounded-lg hover:bg-slate-50 text-sm"
          >
            <Download className="w-4 h-4" />
            Exporter
          </button>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        </div>
      </div>

      {/* KPIs rapides - Hidden on mobile */}
      {!isMobile && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 shrink-0">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Activity className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800 dark:text-white">{stats.total}</p>
                <p className="text-xs text-slate-500">Total</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] rounded-lg">
                <Clock className="w-5 h-5 text-[var(--primary)]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800 dark:text-white">{stats.today}</p>
                <p className="text-xs text-slate-500">Aujourd'hui</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Users className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800 dark:text-white">{stats.uniqueUsers}</p>
                <p className="text-xs text-slate-500">Utilisateurs</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800 dark:text-white">{stats.warnings}</p>
                <p className="text-xs text-slate-500">Avertissements</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <X className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800 dark:text-white">{stats.failures}</p>
                <p className="text-xs text-slate-500">Échecs</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-4 border-b border-slate-200 dark:border-slate-700 shrink-0">
        {[
          { id: 'timeline', label: 'Timeline', icon: Clock },
          { id: 'table', label: 'Tableau', icon: FileText },
          { id: 'stats', label: 'Statistiques', icon: BarChart3 },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === tab.id
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <Card className="p-4 shrink-0">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="relative flex-1 min-w-[250px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher utilisateur, entité..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm bg-slate-50 dark:bg-slate-900 dark:border-slate-700"
            />
          </div>

          {isSuperAdmin && (
            <select
              value={filters.tenantId}
              onChange={(e) => setFilters({ ...filters, tenantId: e.target.value })}
              className="px-3 py-2 border rounded-lg text-sm bg-slate-50 dark:bg-slate-900 dark:border-slate-700"
              title="Revendeur"
            >
              <option value="all">Tous les revendeurs</option>
              {tiers
                .filter((t) => t.type === 'RESELLER')
                .map((reseller) => (
                  <option key={reseller.id} value={reseller.id}>
                    {reseller.name}
                  </option>
                ))}
            </select>
          )}

          <select
            value={filters.action}
            onChange={(e) => setFilters({ ...filters, action: e.target.value })}
            className="px-3 py-2 border rounded-lg text-sm bg-slate-50 dark:bg-slate-900 dark:border-slate-700"
            title="Action"
          >
            <option value="all">Toutes les actions</option>
            {Object.entries(ACTION_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>
                {config.label}
              </option>
            ))}
          </select>

          <select
            value={filters.entityType}
            onChange={(e) => setFilters({ ...filters, entityType: e.target.value })}
            className="px-3 py-2 border rounded-lg text-sm bg-slate-50 dark:bg-slate-900 dark:border-slate-700"
            title="Type d'entité"
          >
            <option value="all">Toutes les entités</option>
            {Object.entries(ENTITY_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>
                {config.label}
              </option>
            ))}
          </select>

          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="px-3 py-2 border rounded-lg text-sm bg-slate-50 dark:bg-slate-900 dark:border-slate-700"
            title="Statut"
          >
            <option value="all">Tous les statuts</option>
            <option value="success">✓ Succès</option>
            <option value="warning">⚠ Avertissement</option>
            <option value="failure">✗ Échec</option>
          </select>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm ${showFilters ? 'bg-purple-50 border-purple-300' : ''}`}
          >
            <Filter className="w-4 h-4" />
            Plus de filtres
          </button>

          {(filters.search ||
            filters.action !== 'all' ||
            filters.entityType !== 'all' ||
            filters.status !== 'all' ||
            (isSuperAdmin && filters.tenantId !== 'all')) && (
            <button onClick={resetFilters} className="text-sm text-red-600 hover:underline">
              Réinitialiser
            </button>
          )}
        </div>

        {showFilters && (
          <div className="flex gap-4 mt-4 pt-4 border-t dark:border-slate-700">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Date début</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                className="px-3 py-2 border rounded-lg text-sm dark:bg-slate-900 dark:border-slate-700"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Date fin</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                className="px-3 py-2 border rounded-lg text-sm dark:bg-slate-900 dark:border-slate-700"
              />
            </div>
          </div>
        )}
      </Card>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-16 lg:pb-0">
        {activeTab === 'timeline' && (
          <div className="relative pl-8">
            {/* Timeline line */}
            <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-700"></div>

            {filteredLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                <Activity className="w-12 h-12 text-slate-300 mb-4" />
                <p className="font-medium">Aucun log trouvé</p>
                <p className="text-sm">Modifiez vos filtres</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredLogs.map((log, index) => {
                  const actionConfig = getActionConfig(log.action);
                  const entityConfig = getEntityConfig(log.entityType);
                  const ActionIcon = actionConfig.icon;
                  const EntityIcon = entityConfig.icon;

                  return (
                    <div key={log.id} className="relative">
                      {/* Timeline dot */}
                      <div
                        className={`absolute -left-5 w-6 h-6 rounded-full ${actionConfig.bgColor} flex items-center justify-center ring-4 ring-white dark:ring-slate-900`}
                      >
                        <ActionIcon className={`w-3 h-3 ${actionConfig.color}`} />
                      </div>

                      <Card
                        className={`p-4 cursor-pointer hover:shadow-md transition-shadow ${
                          log.status === 'failure'
                            ? 'border-l-4 border-l-red-500'
                            : log.status === 'warning'
                              ? 'border-l-4 border-l-amber-500'
                              : ''
                        }`}
                        onClick={() => handleViewDetails(log)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span
                                className={`px-2 py-0.5 rounded text-xs font-medium ${actionConfig.bgColor} ${actionConfig.color}`}
                              >
                                {actionConfig.label}
                              </span>
                              <span className="flex items-center gap-1 text-xs text-slate-500">
                                <EntityIcon className="w-3 h-3" />
                                {entityConfig.label}
                              </span>
                              {log.status !== 'success' && (
                                <span
                                  className={`px-2 py-0.5 rounded text-xs font-medium ${
                                    log.status === 'failure' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                                  }`}
                                >
                                  {log.status === 'failure' ? 'Échec' : 'Attention'}
                                </span>
                              )}
                            </div>

                            <p className="text-sm text-slate-800 dark:text-white">
                              <strong>{log.userName}</strong>
                              {' a '}
                              {actionConfig.label.toLowerCase()}
                              {log.entityName && (
                                <>
                                  {' '}
                                  : <span className="font-medium">{log.entityName}</span>
                                </>
                              )}
                              {log.entityId && !log.entityName && (
                                <>
                                  {' '}
                                  ID: <code className="text-xs bg-slate-100 px-1 rounded">{log.entityId}</code>
                                </>
                              )}
                            </p>

                            <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatRelativeTime(log.timestamp)}
                              </span>
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {log.userRole}
                              </span>
                              <span>{log.ipAddress}</span>
                              {log.duration && <span>{log.duration}ms</span>}
                            </div>
                          </div>

                          <button className="p-2 hover:bg-slate-100 rounded-lg">
                            <ChevronRight className="w-4 h-4 text-slate-400" />
                          </button>
                        </div>
                      </Card>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'table' && (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-800">
                  <tr>
                    <SortableHeader
                      label="Date"
                      sortKey="date"
                      currentSortKey={auditSortConfig.key}
                      currentDirection={auditSortConfig.direction}
                      onSort={handleAuditSort}
                      className="text-xs font-bold text-slate-500 uppercase"
                    />
                    <SortableHeader
                      label="Utilisateur"
                      sortKey="user"
                      currentSortKey={auditSortConfig.key}
                      currentDirection={auditSortConfig.direction}
                      onSort={handleAuditSort}
                      className="text-xs font-bold text-slate-500 uppercase"
                    />
                    <SortableHeader
                      label="Action"
                      sortKey="action"
                      currentSortKey={auditSortConfig.key}
                      currentDirection={auditSortConfig.direction}
                      onSort={handleAuditSort}
                      className="text-xs font-bold text-slate-500 uppercase"
                    />
                    <SortableHeader
                      label="Entité"
                      sortKey="entity"
                      currentSortKey={auditSortConfig.key}
                      currentDirection={auditSortConfig.direction}
                      onSort={handleAuditSort}
                      className="text-xs font-bold text-slate-500 uppercase"
                    />
                    <SortableHeader
                      label="Statut"
                      sortKey="status"
                      currentSortKey={auditSortConfig.key}
                      currentDirection={auditSortConfig.direction}
                      onSort={handleAuditSort}
                      className="text-xs font-bold text-slate-500 uppercase"
                    />
                    <SortableHeader
                      label="IP"
                      sortKey="ip"
                      currentSortKey={auditSortConfig.key}
                      currentDirection={auditSortConfig.direction}
                      onSort={handleAuditSort}
                      className="text-xs font-bold text-slate-500 uppercase"
                    />
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase">Détails</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {sortedLogs.map((log) => {
                    const actionConfig = getActionConfig(log.action);
                    return (
                      <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                        <td className="px-4 py-3 text-sm text-slate-500">
                          {new Date(log.timestamp).toLocaleString('fr-FR')}
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-sm font-medium text-slate-800 dark:text-white">{log.userName}</p>
                            <p className="text-xs text-slate-500">{log.userEmail}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${actionConfig.bgColor} ${actionConfig.color}`}
                          >
                            {actionConfig.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <p className="text-slate-800 dark:text-white">{getEntityConfig(log.entityType).label}</p>
                          {log.entityName && <p className="text-xs text-slate-500">{log.entityName}</p>}
                        </td>
                        <td className="px-4 py-3">
                          {log.status === 'success' && <Check className="w-4 h-4 text-green-600" />}
                          {log.status === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-600" />}
                          {log.status === 'failure' && <X className="w-4 h-4 text-red-600" />}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-500 font-mono">{log.ipAddress}</td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => handleViewDetails(log)} className="p-1.5 hover:bg-slate-100 rounded">
                            <Eye className="w-4 h-4 text-slate-500" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {activeTab === 'stats' && (
          <div className="grid grid-cols-2 gap-6">
            {/* Par action */}
            <Card className="p-4">
              <h3 className="font-bold text-slate-800 dark:text-white mb-4">Par Action</h3>
              <div className="space-y-3">
                {stats.byAction
                  .filter((a) => a.count > 0)
                  .sort((a, b) => b.count - a.count)
                  .map((item) => (
                    <div key={item.action} className="flex items-center gap-3">
                      <div className={`p-2 rounded ${item.bgColor}`}>
                        <item.icon className={`w-4 h-4 ${item.color}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium">{item.label}</span>
                          <span className="text-sm text-slate-500">{item.count}</span>
                        </div>
                        <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${item.barColor}`}
                            style={{ width: `${(item.count / stats.total) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </Card>

            {/* Par entité */}
            <Card className="p-4">
              <h3 className="font-bold text-slate-800 dark:text-white mb-4">Par Entité</h3>
              <div className="space-y-3">
                {stats.byEntity
                  .filter((e) => e.count > 0)
                  .sort((a, b) => b.count - a.count)
                  .map((item) => (
                    <div key={item.entity} className="flex items-center gap-3">
                      <div className="p-2 rounded bg-slate-100 dark:bg-slate-700">
                        <item.icon className="w-4 h-4 text-slate-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium">{item.label}</span>
                          <span className="text-sm text-slate-500">{item.count}</span>
                        </div>
                        <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-purple-500"
                            style={{ width: `${(item.count / stats.total) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title="Détails de l'événement"
        maxWidth="max-w-2xl"
      >
        {selectedLog && (
          <div className="p-4 space-y-4">
            {/* Header */}
            <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <div className={`p-3 rounded-lg ${getActionConfig(selectedLog.action).bgColor}`}>
                {React.createElement(getActionConfig(selectedLog.action).icon, {
                  className: `w-6 h-6 ${getActionConfig(selectedLog.action).color}`,
                })}
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-800 dark:text-white">
                  {getActionConfig(selectedLog.action).label} - {getEntityConfig(selectedLog.entityType).label}
                </h3>
                <p className="text-sm text-slate-500">{new Date(selectedLog.timestamp).toLocaleString('fr-FR')}</p>
              </div>
              <span
                className={`ml-auto px-3 py-1 rounded-full text-sm font-medium ${
                  selectedLog.status === 'success'
                    ? 'bg-green-100 text-green-700'
                    : selectedLog.status === 'warning'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-red-100 text-red-700'
                }`}
              >
                {selectedLog.status === 'success'
                  ? 'Succès'
                  : selectedLog.status === 'warning'
                    ? 'Avertissement'
                    : 'Échec'}
              </span>
            </div>

            {/* User info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Utilisateur</label>
                <p className="font-medium text-slate-800 dark:text-white">{selectedLog.userName}</p>
                <p className="text-sm text-slate-500">{selectedLog.userEmail}</p>
                <p className="text-xs text-slate-400">{selectedLog.userRole}</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Connexion</label>
                <p className="font-mono text-sm text-slate-800 dark:text-white">{selectedLog.ipAddress}</p>
                <p className="text-xs text-slate-500 truncate">{selectedLog.userAgent}</p>
              </div>
            </div>

            {/* Entity */}
            {selectedLog.entityName && (
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Entité concernée</label>
                <p className="font-medium text-slate-800 dark:text-white">{selectedLog.entityName}</p>
                {selectedLog.entityId && <p className="text-xs text-slate-500 font-mono">ID: {selectedLog.entityId}</p>}
              </div>
            )}

            {/* Changes */}
            {(selectedLog.oldValues || selectedLog.newValues) && (
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Modifications</label>
                <div className="grid grid-cols-2 gap-4">
                  {selectedLog.oldValues && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <p className="text-xs font-bold text-red-600 mb-2">Avant</p>
                      <pre className="text-xs text-slate-700 dark:text-slate-300 overflow-x-auto">
                        {JSON.stringify(selectedLog.oldValues, null, 2)}
                      </pre>
                    </div>
                  )}
                  {selectedLog.newValues && (
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <p className="text-xs font-bold text-green-600 mb-2">Après</p>
                      <pre className="text-xs text-slate-700 dark:text-slate-300 overflow-x-auto">
                        {JSON.stringify(selectedLog.newValues, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Details */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Détails bruts</label>
              <pre className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs overflow-x-auto">
                {JSON.stringify(selectedLog.details, null, 2)}
              </pre>
            </div>

            {selectedLog.duration && (
              <p className="text-xs text-slate-500">Durée de l'opération: {selectedLog.duration}ms</p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AuditLogsPanelV2;
