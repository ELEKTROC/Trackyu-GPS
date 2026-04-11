import React, { useState, useMemo, useRef } from 'react';
import { Card } from '../../../../components/Card';
import { useDataContext } from '../../../../contexts/DataContext';
import { useDateRange } from '../../../../hooks/useDateRange';
import { DateRangeSelector } from '../../../../components/DateRangeSelector';
import { 
  AlertTriangle, Bell, CheckCircle, Clock, Search, 
  Wrench, MessageSquare, Send, Gauge, MapPin, Fuel, Key, Battery, 
  Truck, WifiOff, Zap, TrendingUp, CornerUpRight, ShieldAlert, Ban,
  AlertOctagon, CheckCheck, X, Eye, Plus, Settings, Edit, Trash2,
  MessageCircle, CheckSquare, Square
} from 'lucide-react';
import { useToast } from '../../../../contexts/ToastContext';
import { TOAST } from '../../../../constants/toastMessages';
import { NotificationComposer } from '../../../notifications/components/NotificationComposer';
import { AlertForm } from '../../../settings/components/forms/AlertForm';
import { type Alert, type AlertType, type AlertSeverity, type AlertConfig, type Tier, type Ticket, type Intervention, ALERT_TYPE_CONFIG } from '../../../../types';
import { api } from '../../../../services/apiLazy';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../../contexts/AuthContext';
import { useConfirmDialog } from '../../../../components/ConfirmDialog';

// Map icon names to actual components
const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  Gauge, MapPin, Fuel, AlertTriangle, Wrench, AlertOctagon, Key, Clock,
  Battery, Truck, WifiOff, Zap, TrendingUp, CornerUpRight, ShieldAlert, Ban
};

type FilterSeverity = 'ALL' | AlertSeverity;
type FilterType = 'ALL' | AlertType;
type FilterReadStatus = 'ALL' | 'READ' | 'UNREAD';
type FilterTreatedStatus = 'ALL' | 'TREATED' | 'NOT_TREATED';
type FilterCommentStatus = 'ALL' | 'COMMENTED' | 'NOT_COMMENTED';

export const AlertsConsole: React.FC = () => {
  const { 
    alerts, markAlertAsRead, addTicket, addIntervention, 
    vehicles, clients, users, zones, tiers, 
    alertConfigs, addAlertConfig, updateAlertConfig, deleteAlertConfig 
  } = useDataContext();
  const resellers = useMemo(() => tiers.filter(t => t.type === 'RESELLER'), [tiers]);
  const { user } = useAuth();
  const { showToast } = useToast();
  const { confirm: confirmDialog, ConfirmDialogComponent } = useConfirmDialog();
  const queryClient = useQueryClient();
  const alertFormRef = useRef<HTMLFormElement>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Tabs ──
  const [mainTab, setMainTab] = useState<'alerts' | 'autoAlerts' | 'createdAlerts'>('alerts');

  // ── Alerts tab state ──
  const { periodPreset, setPeriodPreset, customDateRange, setCustomDateRange, dateRange } = useDateRange('TODAY');
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSeverity, setFilterSeverity] = useState<FilterSeverity>('ALL');
  const [filterType, setFilterType] = useState<FilterType>('ALL');
  const [filterClient, setFilterClient] = useState<string>('ALL');
  const [filterReseller, setFilterReseller] = useState<string>('ALL');
  const [filterVehicle, setFilterVehicle] = useState<string>('ALL');
  const [filterReadStatus, setFilterReadStatus] = useState<FilterReadStatus>('ALL');
  const [filterTreatedStatus, setFilterTreatedStatus] = useState<FilterTreatedStatus>('ALL');
  const [filterCommentStatus, setFilterCommentStatus] = useState<FilterCommentStatus>('ALL');
  const [markingAll, setMarkingAll] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  
  // Comment modal state
  const [commentingAlert, setCommentingAlert] = useState<Alert | null>(null);
  const [commentText, setCommentText] = useState('');

  // ── Auto Alerts tab state ──
  const [showAlertConfigModal, setShowAlertConfigModal] = useState(false);
  const [editingConfig, setEditingConfig] = useState<AlertConfig | null>(null);

  // ── Unique values for filter dropdowns ──
  const uniqueClients = useMemo(() => {
    const names = new Set<string>();
    alerts.forEach(a => { if (a.clientName) names.add(a.clientName); });
    vehicles.forEach(v => { if (v.client) names.add(v.client); });
    return Array.from(names).sort();
  }, [alerts, vehicles]);

  const uniqueVehicles = useMemo(() => {
    const map = new Map<string, string>();
    alerts.forEach(a => { if (a.vehicleId && a.vehicleName) map.set(a.vehicleId, a.vehicleName); });
    vehicles.forEach(v => { if (!map.has(v.id)) map.set(v.id, v.name || v.id); });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [alerts, vehicles]);

  // ── Filtered alerts ──
  const filteredAlerts = useMemo(() => {
    return [...alerts]
      .sort((a, b) => new Date(b.createdAt || b.timestamp || 0).getTime() - new Date(a.createdAt || a.timestamp || 0).getTime())
      .filter(a => {
        // Date range filter
        if (dateRange) {
          const alertDate = new Date(a.createdAt || a.timestamp || '').toISOString().split('T')[0];
          if (alertDate < dateRange.start || alertDate > dateRange.end) return false;
        }
        // Search
        if (searchTerm) {
          const term = searchTerm.toLowerCase();
          if (!(a.message?.toLowerCase().includes(term) || a.vehicleName?.toLowerCase().includes(term) || a.type?.toLowerCase().includes(term) || a.comment?.toLowerCase().includes(term) || a.clientName?.toLowerCase().includes(term))) return false;
        }
        // Reseller
        if (filterReseller !== 'ALL') {
          const vehicle = vehicles.find(v => v.id === a.vehicleId);
          const client = clients.find(c => c.id === vehicle?.clientId || c.name === a.clientName);
          if (!client || client.resellerId !== filterReseller) return false;
        }
        // Client
        if (filterClient !== 'ALL') {
          const vClient = vehicles.find(v => v.id === a.vehicleId)?.client;
          if (a.clientName !== filterClient && vClient !== filterClient) return false;
        }
        // Vehicle
        if (filterVehicle !== 'ALL' && a.vehicleId !== filterVehicle) return false;
        // Severity
        if (filterSeverity !== 'ALL' && a.severity !== filterSeverity) return false;
        // Type
        if (filterType !== 'ALL' && a.type !== filterType) return false;
        // Read status
        if (filterReadStatus === 'READ' && !(a.isRead || a.read)) return false;
        if (filterReadStatus === 'UNREAD' && (a.isRead || a.read)) return false;
        // Treated
        if (filterTreatedStatus === 'TREATED' && !a.treated) return false;
        if (filterTreatedStatus === 'NOT_TREATED' && a.treated) return false;
        // Comment
        if (filterCommentStatus === 'COMMENTED' && !a.comment) return false;
        if (filterCommentStatus === 'NOT_COMMENTED' && a.comment) return false;
        return true;
      });
  }, [alerts, dateRange, searchTerm, filterClient, filterReseller, filterVehicle, filterSeverity, filterType, filterReadStatus, filterTreatedStatus, filterCommentStatus, vehicles, clients]);

  // ── Filtered alert configs (for tabs 2 & 3) ──
  const filteredAlertConfigs = useMemo(() => {
    return alertConfigs.filter(config => {
      // Search
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        if (!config.name?.toLowerCase().includes(term) && !config.type?.toLowerCase().includes(term)) return false;
      }
      // Type
      if (filterType !== 'ALL' && config.type !== filterType) return false;
      // Priority / Severity
      if (filterSeverity !== 'ALL') {
        const prio = (config.priority || '').toUpperCase();
        if (prio !== filterSeverity) return false;
      }
      // Vehicle
      if (filterVehicle !== 'ALL') {
        if (!config.allVehicles && !(config.vehicleIds || []).includes(filterVehicle)) return false;
      }
      return true;
    });
  }, [alertConfigs, searchTerm, filterType, filterSeverity, filterVehicle]);

  // Stats
  const totalCount = filteredAlerts.length;
  const unreadCount = filteredAlerts.filter(a => !(a.isRead || a.read)).length;
  const treatedCount = filteredAlerts.filter(a => a.treated).length;
  const hasActiveFilters = filterSeverity !== 'ALL' || filterType !== 'ALL' || filterClient !== 'ALL' || filterReseller !== 'ALL' || filterVehicle !== 'ALL' || filterReadStatus !== 'ALL' || filterTreatedStatus !== 'ALL' || filterCommentStatus !== 'ALL';

  const resetFilters = () => {
    setFilterSeverity('ALL'); setFilterType('ALL'); setFilterClient('ALL'); setFilterReseller('ALL');
    setFilterVehicle('ALL'); setFilterReadStatus('ALL'); setFilterTreatedStatus('ALL');
    setFilterCommentStatus('ALL'); setSearchTerm('');
  };

  // ── Helpers ──
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'border-l-red-500 bg-red-50/50 dark:bg-red-900/10';
      case 'HIGH': return 'border-l-orange-500 bg-orange-50/50 dark:bg-orange-900/10';
      case 'MEDIUM': return 'border-l-yellow-500 bg-yellow-50/50 dark:bg-yellow-900/10';
      case 'LOW': return 'border-l-blue-500 bg-[var(--primary-dim)]/50 dark:bg-[var(--primary-dim)]';
      case 'WARNING': return 'border-l-orange-500 bg-orange-50/50 dark:bg-orange-900/10';
      default: return 'border-l-slate-400 bg-slate-50/50 bg-[var(--bg-elevated)]/10';
    }
  };

  const getSeverityBadge = (severity: string) => {
    const styles: Record<string, string> = {
      'CRITICAL': 'bg-red-100 text-red-800 border-red-200',
      'HIGH': 'bg-orange-100 text-orange-800 border-orange-200',
      'MEDIUM': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'LOW': 'bg-[var(--primary-dim)] text-[var(--primary)] border-[var(--border)]',
    };
    return <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${styles[severity] || 'bg-slate-100 text-[var(--text-secondary)] border-[var(--border)]'}`}>{severity}</span>;
  };

  const getAlertIcon = (type: string) => {
    const config = ALERT_TYPE_CONFIG[type as AlertType];
    if (config) { const IconComp = ICON_MAP[config.icon]; if (IconComp) return <IconComp className="w-4 h-4" />; }
    return <AlertTriangle className="w-4 h-4" />;
  };

  const getAlertIconBgColor = (type: string, severity: string) => {
    if (severity === 'CRITICAL') return 'bg-red-100 text-red-600 dark:bg-red-900/30';
    const config = ALERT_TYPE_CONFIG[type as AlertType];
    const colorMap: Record<string, string> = { 'red': 'bg-red-100 text-red-600 dark:bg-red-900/30', 'orange': 'bg-orange-100 text-orange-600 dark:bg-orange-900/30', 'yellow': 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30', 'blue': 'bg-[var(--primary-dim)] text-[var(--primary)] dark:bg-[var(--primary-dim)]', 'green': 'bg-green-100 text-green-600 dark:bg-green-900/30', 'purple': 'bg-purple-100 text-purple-600 dark:bg-purple-900/30', 'slate': 'bg-slate-100 text-[var(--text-secondary)] bg-[var(--bg-elevated)]/30' };
    return colorMap[config?.color] || 'bg-slate-100 text-[var(--text-secondary)]';
  };

  const getAlertTypeLabel = (type: string) => ALERT_TYPE_CONFIG[type as AlertType]?.label || type;

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getTimeAgo = (dateStr: string | undefined) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const diffMs = Date.now() - d.getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return "à l'instant";
    if (mins < 60) return `il y a ${mins}min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `il y a ${hrs}h`;
    return `il y a ${Math.floor(hrs / 24)}j`;
  };

  // ── Actions ──
  const resolveClientId = (vehicleId: string): string => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (vehicle?.clientId) return vehicle.clientId;
    if (vehicle?.client) { const client = clients.find(c => c.name === vehicle.client); if (client) return client.id; }
    return '';
  };

  const handleCreateTicket = (alert: Alert) => {
    const clientId = resolveClientId(alert.vehicleId);
    addTicket({ id: '', clientId, vehicleId: alert.vehicleId, subject: `[${getAlertTypeLabel(alert.type)}] ${alert.vehicleName || 'Véhicule'}`, description: alert.message, status: 'OPEN', priority: alert.severity === 'CRITICAL' ? 'URGENT' : alert.severity === 'HIGH' ? 'HIGH' : 'MEDIUM', category: 'TECHNICAL', subCategory: 'Dépannage', interventionType: 'DEPANNAGE', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as unknown as Ticket);
    markAlertAsRead(alert.id);
    showToast(`Ticket technique créé pour ${alert.vehicleName || 'véhicule'}`, 'success');
  };

  const handleIntervention = (alert: Alert) => {
    const clientId = resolveClientId(alert.vehicleId);
    const vehicle = vehicles.find(v => v.id === alert.vehicleId);
    addIntervention({ id: '', vehicleId: alert.vehicleId, vehicleName: alert.vehicleName || vehicle?.name || '', clientId, type: 'CORRECTIVE', status: 'PLANNED', priority: alert.severity === 'CRITICAL' ? 'URGENT' : 'HIGH', description: `Intervention suite à alerte: ${alert.message}`, scheduledDate: new Date().toISOString(), createdAt: new Date().toISOString() } as unknown as Intervention);
    markAlertAsRead(alert.id);
    showToast(`Intervention planifiée pour ${alert.vehicleName || 'véhicule'}`, 'success');
  };

  const handleMarkAllAsRead = async () => {
    if (!(await confirmDialog({ message: `Marquer toutes les alertes non lues comme lues ?`, variant: 'info', title: 'Confirmation', confirmLabel: 'Confirmer' }))) return;
    const key = ['alerts', user?.tenantId];
    const previous = queryClient.getQueryData<Alert[]>(key);
    queryClient.setQueryData(key, (old: Alert[] = []) => old.map(a => ({ ...a, isRead: true })));
    setMarkingAll(true);
    try {
      await api.alerts.markAllAsRead();
      showToast('Toutes les alertes marquées comme lues', 'success');
    } catch (err) {
      queryClient.setQueryData(key, previous);
      console.error('[AlertsConsole] markAllAsRead failed:', err);
      showToast(TOAST.CRUD.ERROR_UPDATE('alertes'), 'error');
    } finally { setMarkingAll(false); }
  };

  const handleComment = async () => {
    if (!commentingAlert) return;
    const key = ['alerts', user?.tenantId];
    const previous = queryClient.getQueryData<Alert[]>(key);
    queryClient.setQueryData(key, (old: Alert[] = []) => old.map(a => a.id === commentingAlert.id ? { ...a, comment: commentText || null } : a));
    try {
      await api.alerts.comment(commentingAlert.id, commentText);
      showToast(TOAST.CRUD.SAVED('Commentaire'), 'success');
      setCommentingAlert(null); setCommentText('');
    } catch (err) {
      queryClient.setQueryData(key, previous);
      console.error('[AlertsConsole] comment failed:', err);
      showToast(TOAST.CRUD.ERROR_SAVE('commentaire'), 'error');
    }
  };

  const handleTreat = async (alert: Alert) => {
    const newTreated = !alert.treated;
    const key = ['alerts', user?.tenantId];
    const previous = queryClient.getQueryData<Alert[]>(key);
    queryClient.setQueryData(key, (old: Alert[] = []) => old.map(a => a.id === alert.id ? { ...a, treated: newTreated, treatedAt: newTreated ? new Date().toISOString() : null } : a));
    try {
      await api.alerts.treat(alert.id, newTreated);
      showToast(newTreated ? 'Alerte marquée comme traitée' : 'Alerte marquée comme non traitée', 'success');
    } catch (err) {
      queryClient.setQueryData(key, previous);
      console.error('[AlertsConsole] treat failed:', err);
      showToast(TOAST.CRUD.ERROR_UPDATE('alerte'), 'error');
    }
  };

  // ── Alert Config handlers ──
  const handleSaveAlertConfig = async (data: any) => {
    try {
      if (editingConfig) {
        await updateAlertConfig({ ...data, id: editingConfig.id } as AlertConfig);
        showToast(TOAST.CRUD.UPDATED('Règle d\'alerte'), 'success');
      } else {
        await addAlertConfig(data as AlertConfig);
        showToast(TOAST.CRUD.CREATED('Règle d\'alerte'), 'success');
      }
      setShowAlertConfigModal(false); setEditingConfig(null);
    } catch { showToast(TOAST.CRUD.ERROR_SAVE(), 'error'); }
  };

  const handleDeleteAlertConfig = async (config: AlertConfig) => {
    if (!(await confirmDialog({ message: `Supprimer la règle "${config.name}" ?`, variant: 'danger', title: 'Confirmation', confirmLabel: 'Supprimer' }))) return;
    try { await deleteAlertConfig(config.id); showToast(TOAST.CRUD.DELETED('Règle'), 'success'); }
    catch { showToast(TOAST.CRUD.ERROR_DELETE('règle'), 'error'); }
  };

  const selectClass = "px-2 py-1.5 border border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-primary)] rounded-lg text-xs";

  return (
    <div className="h-full flex flex-col gap-3">
      {/* Main Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={() => setMainTab('alerts')} className={`filter-chip flex items-center gap-2 ${mainTab === 'alerts' ? 'active' : ''}`}>
          <Bell className="w-4 h-4" /> Alertes
          {alerts.filter(a => !(a.isRead || a.read)).length > 0 && <span className="px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full">{alerts.filter(a => !(a.isRead || a.read)).length}</span>}
        </button>
        <button onClick={() => setMainTab('autoAlerts')} className={`filter-chip flex items-center gap-2 ${mainTab === 'autoAlerts' ? 'active' : ''}`}>
          <Settings className="w-4 h-4" /> Règles automatiques
          <span className="px-1.5 py-0.5 bg-slate-200 bg-[var(--bg-elevated)] text-[var(--text-primary)] text-[10px] font-bold rounded-full">{alertConfigs.length}</span>
        </button>
        <button onClick={() => setMainTab('createdAlerts')} className={`filter-chip flex items-center gap-2 ${mainTab === 'createdAlerts' ? 'active' : ''}`}>
          <Plus className="w-4 h-4" /> Alertes créées
          <span className="px-1.5 py-0.5 bg-slate-200 bg-[var(--bg-elevated)] text-[var(--text-primary)] text-[10px] font-bold rounded-full">{alertConfigs.length}</span>
        </button>
      </div>

      {/* ═══ Global Toolbar ═══ */}
      <div className="flex flex-wrap justify-between items-center gap-2">
        <DateRangeSelector periodPreset={periodPreset} setPeriodPreset={setPeriodPreset} customDateRange={customDateRange} setCustomDateRange={setCustomDateRange} />
        <div className="flex gap-2 items-center flex-wrap">
          {mainTab === 'alerts' && unreadCount > 0 && (
            <button onClick={handleMarkAllAsRead} disabled={markingAll} className="px-3 py-1.5 bg-[var(--bg-elevated)] text-[var(--text-primary)] rounded-lg text-xs font-medium flex items-center gap-1.5 hover:bg-[var(--bg-elevated)] dark:hover:bg-slate-600 transition-colors disabled:opacity-50">
              <CheckCheck className="w-3.5 h-3.5" /> Tout lu
            </button>
          )}
          {mainTab === 'alerts' && (
            <button onClick={() => setShowComposer(true)} className="px-3 py-1.5 bg-[var(--primary)] text-white rounded-lg text-xs font-medium flex items-center gap-1.5 hover:bg-[var(--primary-light)] transition-colors">
              <Send className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Notifier</span>
            </button>
          )}
          {(mainTab === 'autoAlerts' || mainTab === 'createdAlerts') && (
            <button onClick={() => { setEditingConfig(null); setShowAlertConfigModal(true); }} className="px-3 py-1.5 bg-[var(--primary)] text-white rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-[var(--primary-light)] transition-colors">
              <Plus className="w-4 h-4" /> Créer une règle
            </button>
          )}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
            <input type="text" value={searchInput} onChange={(e) => {
              setSearchInput(e.target.value);
              if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
              searchDebounceRef.current = setTimeout(() => setSearchTerm(e.target.value), 300);
            }} placeholder="Rechercher..." className="pl-8 pr-8 py-1.5 border border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-primary)] rounded-lg text-xs w-44" />
            {searchInput && <button onClick={() => { setSearchInput(''); setSearchTerm(''); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)]" title="Effacer la recherche"><X className="w-3 h-3" /></button>}
          </div>
        </div>
      </div>

      {/* ═══ Global Filters bar - horizontal scrollable ═══ */}
      <Card className="p-2 overflow-x-auto">
        <div className="flex flex-nowrap gap-3 items-center text-xs min-w-max">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase whitespace-nowrap">Revendeur</span>
            <select value={filterReseller} onChange={e => setFilterReseller(e.target.value)} className={selectClass} title="Filtrer par revendeur">
              <option value="ALL">Tous</option>
              {resellers.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase whitespace-nowrap">Client</span>
            <select value={filterClient} onChange={e => setFilterClient(e.target.value)} className={selectClass} title="Filtrer par client">
              <option value="ALL">Tous</option>
              {uniqueClients.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase whitespace-nowrap">Type</span>
            <select value={filterType} onChange={e => setFilterType(e.target.value as FilterType)} className={selectClass} title="Filtrer par type">
              <option value="ALL">Tous</option>
              {Object.entries(ALERT_TYPE_CONFIG).map(([key, config]) => <option key={key} value={key}>{config.label}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase whitespace-nowrap">Priorité</span>
            <select value={filterSeverity} onChange={e => setFilterSeverity(e.target.value as FilterSeverity)} className={selectClass} title="Filtrer par priorité">
              <option value="ALL">Toutes</option>
              <option value="CRITICAL">Critique</option>
              <option value="HIGH">Haute</option>
              <option value="MEDIUM">Moyenne</option>
              <option value="LOW">Basse</option>
            </select>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase whitespace-nowrap">Véhicule</span>
            <select value={filterVehicle} onChange={e => setFilterVehicle(e.target.value)} className={selectClass + " max-w-[160px]"} title="Filtrer par véhicule">
              <option value="ALL">Tous</option>
              {uniqueVehicles.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </select>
          </div>
          {mainTab === 'alerts' && <>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase whitespace-nowrap">Statut</span>
              <select value={filterReadStatus} onChange={e => setFilterReadStatus(e.target.value as FilterReadStatus)} className={selectClass} title="Filtrer par statut de lecture">
                <option value="ALL">Tous</option>
                <option value="UNREAD">Non lu</option>
                <option value="READ">Lu</option>
              </select>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase whitespace-nowrap">Traitement</span>
              <select value={filterTreatedStatus} onChange={e => setFilterTreatedStatus(e.target.value as FilterTreatedStatus)} className={selectClass} title="Filtrer par traitement">
                <option value="ALL">Tous</option>
                <option value="TREATED">Traité</option>
                <option value="NOT_TREATED">Non traité</option>
              </select>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase whitespace-nowrap">Commentaire</span>
              <select value={filterCommentStatus} onChange={e => setFilterCommentStatus(e.target.value as FilterCommentStatus)} className={selectClass} title="Filtrer par commentaire">
                <option value="ALL">Tous</option>
                <option value="COMMENTED">Commenté</option>
                <option value="NOT_COMMENTED">Non commenté</option>
              </select>
            </div>
          </>}
          <div className="flex items-center gap-2 ml-auto">
            {hasActiveFilters && <button onClick={resetFilters} className="px-2 py-1 text-[10px] text-red-600 hover:text-red-800 flex items-center gap-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"><X className="w-3 h-3" /> Réinitialiser</button>}
            <span className="text-[10px] text-[var(--text-muted)] whitespace-nowrap">{totalCount} alerte{totalCount !== 1 ? 's' : ''} · {unreadCount} non lue{unreadCount !== 1 ? 's' : ''} · {treatedCount} traitée{treatedCount !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </Card>

      {/* ══════ TAB 1: ALERTES ══════ */}
      {mainTab === 'alerts' && (<>
        {/* Alerts list */}
        <div className="flex-1 overflow-auto custom-scrollbar space-y-2 pb-16 lg:pb-0">
          {filteredAlerts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)] py-16">
              <CheckCircle className="w-12 h-12 mb-3 opacity-20" />
              <p className="text-lg font-medium">Aucune alerte trouvée</p>
              <p className="text-sm mt-1">{hasActiveFilters || searchTerm ? 'Essayez de modifier vos filtres ou la période' : 'Les alertes seront générées automatiquement par le système GPS'}</p>
            </div>
          ) : (
            filteredAlerts.map(alert => {
              const isRead = !!(alert.isRead || alert.read);
              const alertDate = alert.createdAt || alert.timestamp;
              return (
                <div key={alert.id} className={`p-3 rounded-lg border border-[var(--border)] border-l-4 shadow-sm flex justify-between items-start transition-all hover:shadow-md ${getSeverityColor(alert.severity)} ${isRead ? 'opacity-60' : ''}`}>
                  <div className="flex gap-3 flex-1 min-w-0">
                    <div className={`mt-0.5 p-1.5 rounded-full flex-shrink-0 ${getAlertIconBgColor(alert.type, alert.severity)}`}>{getAlertIcon(alert.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-[var(--text-primary)] text-sm truncate">{alert.vehicleName || 'Véhicule inconnu'}</h4>
                        {getSeverityBadge(alert.severity)}
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border)]">{getAlertTypeLabel(alert.type)}</span>
                        {alert.clientName && <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700">{alert.clientName}</span>}
                        {alert.treated && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700 border border-green-200 flex items-center gap-0.5"><CheckSquare className="w-3 h-3" /> Traité</span>}
                      </div>
                      <p className="text-[var(--text-primary)] mt-1 text-sm">{alert.message}</p>
                      {alert.comment && (
                        <div className="mt-1.5 px-2 py-1 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded text-xs text-amber-800 dark:text-amber-200 flex items-start gap-1.5">
                          <MessageCircle className="w-3 h-3 mt-0.5 shrink-0" /><span>{alert.comment}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-[var(--text-secondary)]">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDate(alertDate)}</span>
                        <span className="text-[var(--text-muted)]">{getTimeAgo(alertDate)}</span>
                        {isRead && <span className="flex items-center gap-1 text-green-600"><Eye className="w-3 h-3" /> Lu</span>}
                      </div>
                    </div>
                  </div>
                  {/* Actions */}
                  <div className="flex gap-0.5 flex-shrink-0 ml-2">
                    {!isRead && <button onClick={() => markAlertAsRead(alert.id)} className="p-1.5 hover:bg-white/50 dark:hover:bg-slate-700/50 rounded-lg text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors" title="Marquer comme lu"><CheckCircle className="w-4 h-4" /></button>}
                    <button onClick={() => handleTreat(alert)} className={`p-1.5 hover:bg-white/50 dark:hover:bg-slate-700/50 rounded-lg transition-colors ${alert.treated ? 'text-green-600' : 'text-[var(--text-secondary)] hover:text-green-600'}`} title={alert.treated ? 'Marquer non traité' : 'Marquer traité'}>
                      {alert.treated ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                    </button>
                    <button onClick={() => { setCommentingAlert(alert); setCommentText(alert.comment || ''); }} className={`p-1.5 hover:bg-white/50 dark:hover:bg-slate-700/50 rounded-lg transition-colors ${alert.comment ? 'text-amber-500' : 'text-[var(--text-secondary)] hover:text-amber-500'}`} title="Commenter"><MessageCircle className="w-4 h-4" /></button>
                    <button onClick={() => handleCreateTicket(alert)} className="p-1.5 hover:bg-white/50 dark:hover:bg-slate-700/50 rounded-lg text-[var(--text-secondary)] hover:text-purple-600 transition-colors" title="Créer un ticket"><MessageSquare className="w-4 h-4" /></button>
                    <button onClick={() => handleIntervention(alert)} className="p-1.5 hover:bg-white/50 dark:hover:bg-slate-700/50 rounded-lg text-[var(--text-secondary)] hover:text-orange-600 transition-colors" title="Planifier intervention"><Wrench className="w-4 h-4" /></button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </>)}

      {/* ══════ TAB 2: RÈGLES AUTOMATIQUES ══════ */}
      {mainTab === 'autoAlerts' && (<>
        <p className="text-sm text-[var(--text-secondary)]">Gérez les règles d'alertes automatiques déclenchées par le système GPS.</p>

        <div className="flex-1 overflow-auto custom-scrollbar space-y-2 pb-16 lg:pb-0">
          {filteredAlertConfigs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)] py-16">
                <Settings className="w-12 h-12 mb-3 opacity-20" />
                <p className="text-lg font-medium">Aucune règle configurée</p>
                <p className="text-sm mt-1">Créez votre première règle d'alerte automatique</p>
              </div>
            ) : (
            filteredAlertConfigs.map(config => (
              <Card key={config.id} className="p-4 flex items-center justify-between hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`p-2 rounded-lg ${config.isActive !== false && config.status !== 'INACTIVE' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-[var(--text-muted)]'}`}>
                    <Bell className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold text-[var(--text-primary)] text-sm truncate">{config.name}</h4>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${config.isActive !== false && config.status !== 'INACTIVE' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-slate-100 text-[var(--text-secondary)] border-[var(--border)]'}`}>
                        {config.isActive !== false && config.status !== 'INACTIVE' ? 'Actif' : 'Inactif'}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--primary-dim)] text-[var(--primary)] border border-[var(--border)]">{config.type}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${{ 'critical': 'bg-red-100 text-red-800 border-red-200', 'CRITICAL': 'bg-red-100 text-red-800 border-red-200', 'high': 'bg-orange-100 text-orange-800 border-orange-200', 'HIGH': 'bg-orange-100 text-orange-800 border-orange-200', 'medium': 'bg-yellow-100 text-yellow-800 border-yellow-200', 'MEDIUM': 'bg-yellow-100 text-yellow-800 border-yellow-200', 'low': 'bg-[var(--primary-dim)] text-[var(--primary)] border-[var(--border)]', 'LOW': 'bg-[var(--primary-dim)] text-[var(--primary)] border-[var(--border)]' }[config.priority] || 'bg-slate-100 text-[var(--text-secondary)] border-[var(--border)]'}`}>
                        {config.priority}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-[var(--text-secondary)]">
                      {config.allVehicles ? <span>Tous les véhicules</span> : <span>{config.vehicleIds?.length || 0} véhicule(s)</span>}
                      {config.conditionValue && <span>Seuil: {config.conditionValue}</span>}
                      {config.isScheduled && <span>Planifié</span>}
                      <span className="flex gap-1">
                        {config.notifyWeb && <span className="px-1 py-0.5 bg-slate-100 rounded text-[9px]">Web</span>}
                        {config.notifyEmail && <span className="px-1 py-0.5 bg-slate-100 rounded text-[9px]">Email</span>}
                        {config.notifySms && <span className="px-1 py-0.5 bg-slate-100 rounded text-[9px]">SMS</span>}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0 ml-2">
                  <button onClick={() => { setEditingConfig(config); setShowAlertConfigModal(true); }} className="p-2 hover:bg-[var(--primary-dim)] dark:hover:bg-[var(--primary-dim)]/20 rounded-lg text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors" title="Modifier"><Edit className="w-4 h-4" /></button>
                  <button onClick={() => handleDeleteAlertConfig(config)} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-[var(--text-secondary)] hover:text-red-600 transition-colors" title="Supprimer"><Trash2 className="w-4 h-4" /></button>
                </div>
              </Card>
            ))
          )}
        </div>
      </>)}

      {/* ══════ TAB 3: ALERTES CRÉÉES ══════ */}
      {mainTab === 'createdAlerts' && (<>
        <p className="text-sm text-[var(--text-secondary)]">Alertes créées depuis <span className="font-medium text-[var(--text-primary)]">Paramètres &gt; Alertes</span>. Modifiez ou supprimez-les ici.</p>

        <div className="flex-1 overflow-auto custom-scrollbar space-y-2 pb-16 lg:pb-0">
          {alertConfigs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)] py-16">
              <Bell className="w-12 h-12 mb-3 opacity-20" />
              <p className="text-lg font-medium">Aucune alerte créée</p>
              <p className="text-sm mt-1">Créez des alertes depuis Paramètres ou via le bouton ci-dessus</p>
            </div>
          ) : filteredAlertConfigs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)] py-16">
              <Search className="w-12 h-12 mb-3 opacity-20" />
              <p className="text-lg font-medium">Aucune alerte ne correspond aux filtres</p>
              <p className="text-sm mt-1">Essayez de modifier vos critères de recherche</p>
            </div>
          ) : (
            filteredAlertConfigs.map(config => {
              const isActive = config.isActive !== false && config.status !== 'INACTIVE';
              const priorityStyle: Record<string, string> = {
                'critical': 'bg-red-100 text-red-800 border-red-200', 'CRITICAL': 'bg-red-100 text-red-800 border-red-200',
                'high': 'bg-orange-100 text-orange-800 border-orange-200', 'HIGH': 'bg-orange-100 text-orange-800 border-orange-200',
                'medium': 'bg-yellow-100 text-yellow-800 border-yellow-200', 'MEDIUM': 'bg-yellow-100 text-yellow-800 border-yellow-200',
                'low': 'bg-[var(--primary-dim)] text-[var(--primary)] border-[var(--border)]', 'LOW': 'bg-[var(--primary-dim)] text-[var(--primary)] border-[var(--border)]',
              };
              const typeLabel = ALERT_TYPE_CONFIG[config.type as AlertType]?.label || config.type;
              const vehicleNames = config.allVehicles ? 'Tous les véhicules' : (config.vehicleIds?.map(vid => vehicles.find(v => v.id === vid)?.name || vid).join(', ') || 'Aucun véhicule');

              return (
                <Card key={config.id} className={`p-4 hover:shadow-md transition-shadow border-l-4 ${isActive ? 'border-l-emerald-500' : 'border-l-slate-300'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <h4 className="font-semibold text-[var(--text-primary)] text-sm">{config.name}</h4>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${isActive ? 'bg-green-100 text-green-700 border-green-200' : 'bg-slate-100 text-[var(--text-secondary)] border-[var(--border)]'}`}>
                          {isActive ? 'Actif' : 'Inactif'}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--primary-dim)] text-[var(--primary)] border border-[var(--border)]">{typeLabel}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${priorityStyle[config.priority] || 'bg-slate-100 text-[var(--text-secondary)] border-[var(--border)]'}`}>
                          {config.priority?.toUpperCase()}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs text-[var(--text-secondary)]">
                        <div className="flex items-center gap-1.5">
                          <Truck className="w-3 h-3 text-[var(--text-muted)]" />
                          <span className="truncate" title={vehicleNames}>{vehicleNames}</span>
                        </div>
                        {config.conditionValue && (
                          <div className="flex items-center gap-1.5">
                            <Gauge className="w-3 h-3 text-[var(--text-muted)]" />
                            <span>Seuil : {config.conditionValue}{config.type === 'SPEED' || config.type === 'SPEEDING' ? ' km/h' : ''}</span>
                          </div>
                        )}
                        {config.conditionDuration && (
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3 h-3 text-[var(--text-muted)]" />
                            <span>Durée : {config.conditionDuration} min</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5">
                          <Send className="w-3 h-3 text-[var(--text-muted)]" />
                          <span className="flex gap-1">
                            {config.notifyWeb && <span className="px-1 py-0.5 bg-[var(--bg-elevated)] rounded text-[9px]">Web</span>}
                            {config.notifyEmail && <span className="px-1 py-0.5 bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] rounded text-[9px] text-[var(--primary)]">Email</span>}
                            {config.notifySms && <span className="px-1 py-0.5 bg-green-50 dark:bg-green-900/20 rounded text-[9px] text-green-600">SMS</span>}
                            {!config.notifyWeb && !config.notifyEmail && !config.notifySms && <span className="text-[var(--text-muted)]">Aucune notification</span>}
                          </span>
                        </div>
                        {config.isScheduled && (
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3 h-3 text-[var(--text-muted)]" />
                            <span>Planifié : {config.scheduleTimeStart || '00:00'} - {config.scheduleTimeEnd || '23:59'}</span>
                          </div>
                        )}
                        {config.createdAt && (
                          <div className="flex items-center gap-1.5 text-[var(--text-muted)]">
                            <span>Créé le {new Date(config.createdAt).toLocaleDateString('fr-FR')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => { setEditingConfig(config); setShowAlertConfigModal(true); }} className="p-2 hover:bg-[var(--primary-dim)] dark:hover:bg-[var(--primary-dim)]/20 rounded-lg text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors" title="Modifier"><Edit className="w-4 h-4" /></button>
                      <button onClick={() => handleDeleteAlertConfig(config)} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-[var(--text-secondary)] hover:text-red-600 transition-colors" title="Supprimer"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </>)}

      {/* ══════ MODALS ══════ */}
      <NotificationComposer isOpen={showComposer} onClose={() => setShowComposer(false)} onSuccess={() => showToast(TOAST.COMM.NOTIFICATION_SENT, 'success')} />

      {/* Comment Modal */}
      {commentingAlert && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setCommentingAlert(null)}>
          <div className="bg-[var(--bg-elevated)] rounded-xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
              <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2"><MessageCircle className="w-4 h-4 text-amber-500" /> Commenter l'alerte</h2>
              <button onClick={() => setCommentingAlert(null)} className="p-1 hover:bg-[var(--bg-elevated)] rounded" title="Fermer"><X className="w-4 h-4 text-[var(--text-secondary)]" /></button>
            </div>
            <div className="p-4">
              <p className="text-xs text-[var(--text-secondary)] mb-2">{commentingAlert.vehicleName} — {getAlertTypeLabel(commentingAlert.type)}</p>
              <textarea value={commentText} onChange={e => setCommentText(e.target.value)} maxLength={500} className="w-full p-3 border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)] rounded-lg text-sm resize-none h-24" placeholder="Ajouter un commentaire..." autoFocus />
              <p className="text-right text-xs text-[var(--text-muted)] mt-1">{commentText.length}/500</p>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-[var(--border)]">
              <button onClick={() => setCommentingAlert(null)} className="px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] bg-slate-100 hover:bg-[var(--bg-elevated)] rounded-lg">Annuler</button>
              <button onClick={handleComment} className="px-3 py-1.5 text-xs font-medium text-white bg-amber-500 hover:bg-amber-600 rounded-lg">Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {/* Alert Config Modal (Create / Edit) */}
      {showAlertConfigModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => { setShowAlertConfigModal(false); setEditingConfig(null); }}>
          <div className="bg-[var(--bg-elevated)] rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-[var(--border)] shrink-0">
              <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                {editingConfig ? <Edit className="w-5 h-5 text-[var(--primary)]" /> : <Plus className="w-5 h-5 text-emerald-600" />}
                {editingConfig ? 'Modifier la règle d\'alerte' : 'Créer une règle d\'alerte'}
              </h2>
              <button onClick={() => { setShowAlertConfigModal(false); setEditingConfig(null); }} className="p-2 hover:bg-[var(--bg-elevated)] rounded-lg transition-colors" title="Fermer"><X className="w-5 h-5 text-[var(--text-secondary)]" /></button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 min-h-0">
              <AlertForm 
                ref={alertFormRef}
                initialData={editingConfig ? {
                  nom: editingConfig.name, type: editingConfig.type,
                  priorite: editingConfig.priority === 'critical' || editingConfig.priority === 'CRITICAL' ? 'Haute' : editingConfig.priority === 'low' || editingConfig.priority === 'LOW' ? 'Basse' : 'Moyenne',
                  statut: editingConfig.isActive !== false && editingConfig.status !== 'INACTIVE' ? 'Actif' : 'Inactif',
                  allVehicles: editingConfig.allVehicles || false, vehicleIds: editingConfig.vehicleIds || [],
                  notificationUserIds: editingConfig.notificationUserIds || [], notifyWeb: editingConfig.notifyWeb ?? true,
                  notifyEmail: editingConfig.notifyEmail || false, notifySms: editingConfig.notifySms || false,
                  conditionValue: editingConfig.conditionValue, conditionDuration: editingConfig.conditionDuration,
                  isScheduled: editingConfig.isScheduled || false, scheduleDays: (editingConfig.scheduleDays || []).map(String),
                  scheduleTimeStart: editingConfig.scheduleTimeStart || '00:00', scheduleTimeEnd: editingConfig.scheduleTimeEnd || '23:59',
                } : undefined}
                onFormSubmit={handleSaveAlertConfig}
                resellers={resellers} vehicles={vehicles} clients={clients as unknown as Tier[]} users={users} zones={zones}
              />
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-[var(--border)] shrink-0">
              <button onClick={() => { setShowAlertConfigModal(false); setEditingConfig(null); }} className="px-4 py-2 text-sm font-medium text-[var(--text-secondary)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)] dark:hover:bg-slate-600 rounded-lg transition-colors">Annuler</button>
              <button onClick={() => alertFormRef.current?.requestSubmit()} className="px-4 py-2 text-sm font-medium text-white bg-[var(--primary)] hover:bg-[var(--primary-light)] rounded-lg transition-colors">{editingConfig ? 'Enregistrer' : 'Créer la règle'}</button>
            </div>
          </div>
        </div>
      )}
      <ConfirmDialogComponent />
    </div>
  );
};
