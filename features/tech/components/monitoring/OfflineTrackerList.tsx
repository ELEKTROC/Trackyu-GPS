import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useDataContext } from '../../../../contexts/DataContext';
import { type Vehicle, type Ticket, VehicleStatus } from '../../../../types';
import { WifiOff, Signal, RotateCcw, MessageSquare, Download, Search, PenLine, X, Clock, CheckSquare, Square, Minus } from 'lucide-react';
import { Pagination } from '../../../../components/Pagination';
import { MobileCard, MobileCardList, MobileCardAction } from '../../../../components/MobileCard';
import { useToast } from '../../../../contexts/ToastContext';
import { TOAST } from '../../../../constants/toastMessages';
import { MONITORING_THRESHOLDS } from '../../constants';
import { useTableSort } from '../../../../hooks/useTableSort';
import { SortableHeader } from '../../../../components/SortableHeader';
import { api } from '../../../../services/apiLazy';
import { useConfirmDialog } from '../../../../components/ConfirmDialog';
import { useIsMobile } from '../../../../hooks/useIsMobile';

// ── Pagination ────────────────────────────────────────
const ITEMS_PER_PAGE_OPTIONS = [25, 50, 100];

// ── Types pour commentaires (localStorage) ───────────
interface VehicleComment {
  id: string;
  vehicleId: string;
  text: string;
  author: string;
  createdAt: string;
}

const COMMENTS_STORAGE_KEY = 'offline_tracker_comments';

const loadComments = (): VehicleComment[] => {
  try {
    const raw = localStorage.getItem(COMMENTS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

const saveComments = (comments: VehicleComment[]) => {
  localStorage.setItem(COMMENTS_STORAGE_KEY, JSON.stringify(comments));
};

// ── Types pour le modal d'inactivité ─────────────────
interface InactivityEntry {
  type: 'offline_start' | 'command_sent' | 'ticket_created' | 'comment';
  date: string;
  description: string;
}

// ═══════════════════════════════════════════════════════
// Composant principal
// ═══════════════════════════════════════════════════════
export const OfflineTrackerList: React.FC = () => {
  const isMobile = useIsMobile();
  const { vehicles, clients, users, addTicket } = useDataContext();
  const { showToast } = useToast();
  const { confirm: confirmDialog, ConfirmDialogComponent } = useConfirmDialog();
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'ALL' | '24H' | '48H' | '7D' | 'ZOMBIE'>('ALL');
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  // Checkboxes
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // Modals
  const [commentModal, setCommentModal] = useState<{ vehicle: Vehicle } | null>(null);
  const [commentText, setCommentText] = useState('');
  const [inactivityModal, setInactivityModal] = useState<{ vehicle: Vehicle } | null>(null);

  // Comments state (localStorage-backed)
  const [allComments, setAllComments] = useState<VehicleComment[]>(loadComments);

  // ── Helper: resolve clientId ──────────────────────────
  const resolveClientId = useCallback((vehicle: Vehicle): string | undefined => {
    if (vehicle.clientId) return vehicle.clientId;
    if (vehicle.client && clients.length > 0) {
      const match = clients.find(c => c.name === vehicle.client);
      return match?.id;
    }
    return undefined;
  }, [clients]);

  // ── Helper: find available AGENT_TRACKING user ─────────
  const resolveAgentTracking = useCallback((): string | undefined => {
    const agents = users.filter(u => u.role === 'AGENT_TRACKING' && u.status === 'Actif');
    if (agents.length === 0) return undefined;
    // Round-robin simple basé sur le timestamp pour répartir
    return agents[Date.now() % agents.length].id;
  }, [users]);

  // ── Filtered offline vehicles ─────────────────────────
  const offlineVehicles = useMemo(() => {
    const now = new Date();
    return vehicles.filter(v => {
      const matchesSearch =
        v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.client.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      const lastUpdate = new Date(v.lastUpdated);
      const hoursSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);

      const isOffline = v.status === VehicleStatus.OFFLINE || hoursSinceUpdate >= MONITORING_THRESHOLDS.OFFLINE_WARNING_HOURS;
      if (!isOffline) return false;

      switch (filter) {
        case '24H': return hoursSinceUpdate >= MONITORING_THRESHOLDS.OFFLINE_WARNING_HOURS && hoursSinceUpdate < MONITORING_THRESHOLDS.OFFLINE_CRITICAL_HOURS;
        case '48H': return hoursSinceUpdate >= MONITORING_THRESHOLDS.OFFLINE_CRITICAL_HOURS && hoursSinceUpdate < 48;
        case '7D': return hoursSinceUpdate >= 48 && hoursSinceUpdate < MONITORING_THRESHOLDS.OFFLINE_ZOMBIE_HOURS;
        case 'ZOMBIE': return hoursSinceUpdate >= MONITORING_THRESHOLDS.OFFLINE_ZOMBIE_HOURS;
        default: return true;
      }
    }).sort((a, b) => new Date(a.lastUpdated).getTime() - new Date(b.lastUpdated).getTime());
  }, [vehicles, searchTerm, filter]);

  // ── Sorting ────────────────────────────────────────────
  const { sortedItems: sortedOfflineVehicles, sortConfig: offlineSortConfig, handleSort: handleOfflineSort } = useTableSort(
    offlineVehicles,
    { key: 'lastUpdated', direction: 'asc' }
  );

  // ── Pagination logic ──────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(sortedOfflineVehicles.length / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedVehicles = sortedOfflineVehicles.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage);

  // Reset page on filter/search change
  useEffect(() => { setCurrentPage(1); }, [searchTerm, filter]);

  // ── Checkbox handlers ──────────────────────────────────
  const pageIds = paginatedVehicles.map(v => v.id);
  const allPageSelected = pageIds.length > 0 && pageIds.every(id => selectedIds.has(id));
  const somePageSelected = pageIds.some(id => selectedIds.has(id));

  const toggleSelectAll = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allPageSelected) {
        pageIds.forEach(id => next.delete(id));
      } else {
        pageIds.forEach(id => next.add(id));
      }
      return next;
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ── Helpers ────────────────────────────────────────────
  const getOfflineDuration = (dateStr: Date) => {
    const now = new Date();
    const lastUpdate = new Date(dateStr);
    const diffMs = now.getTime() - lastUpdate.getTime();
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays > 0) return `${diffDays}j ${diffHrs % 24}h`;
    return `${diffHrs}h`;
  };

  const getOfflineHours = (dateStr: Date) => {
    const now = new Date();
    return (now.getTime() - new Date(dateStr).getTime()) / (1000 * 60 * 60);
  };

  const getStatusBadge = (dateStr: Date) => {
    const diffHrs = getOfflineHours(dateStr);
    if (diffHrs > MONITORING_THRESHOLDS.OFFLINE_ZOMBIE_HOURS)
      return <span className="px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">ZOMBIE</span>;
    if (diffHrs > MONITORING_THRESHOLDS.OFFLINE_CRITICAL_HOURS)
      return <span className="px-2 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-800 border border-orange-200">CRITIQUE</span>;
    return <span className="px-2 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-800 border border-yellow-200">ATTENTION</span>;
  };

  const getStatusLabel = (dateStr: Date) => {
    const diffHrs = getOfflineHours(dateStr);
    if (diffHrs > MONITORING_THRESHOLDS.OFFLINE_ZOMBIE_HOURS) return 'ZOMBIE';
    if (diffHrs > MONITORING_THRESHOLDS.OFFLINE_CRITICAL_HOURS) return 'CRITIQUE';
    return 'ATTENTION';
  };

  // ── Comments helpers ───────────────────────────────────
  const getVehicleComments = (vehicleId: string) => allComments.filter(c => c.vehicleId === vehicleId);
  const getLastComment = (vehicleId: string) => {
    const vc = getVehicleComments(vehicleId);
    return vc.length > 0 ? vc[vc.length - 1] : null;
  };

  const handleAddComment = () => {
    if (!commentModal || !commentText.trim()) return;
    const newComment: VehicleComment = {
      id: `CMT-${Date.now()}`,
      vehicleId: commentModal.vehicle.id,
      text: commentText.trim(),
      author: 'Moi',
      createdAt: new Date().toISOString()
    };
    const updated = [...allComments, newComment];
    setAllComments(updated);
    saveComments(updated);
    setCommentText('');
    showToast(`Commentaire ajouté pour ${commentModal.vehicle.name}`, 'success');
    setCommentModal(null);
  };

  // ── Actions ────────────────────────────────────────────
  const handleAction = async (action: string, vehicle: Vehicle) => {
    const actionKey = `${action}-${vehicle.id}`;
    if (loadingAction) return;
    setLoadingAction(actionKey);
    try {
      if (action === 'PING' || action === 'REBOOT') {
        await api.commands.create({
          id: `CMD-${Date.now()}`,
          deviceId: vehicle.imei || '',
          vehicleId: vehicle.id,
          commandType: action,
          payload: {},
          status: 'PENDING',
          sentAt: new Date().toISOString()
        } as unknown as Parameters<typeof api.commands.create>[0]);
        showToast(`Commande ${action} envoyée à ${vehicle.name}`, 'success');
      } else if (action === 'TICKET') {
        const offlineDuration = getOfflineDuration(vehicle.lastUpdated);
        const clientId = resolveClientId(vehicle);
        const agentId = resolveAgentTracking();
        await addTicket({
          id: `TK-${Date.now()}`,
          clientId: clientId || '',
          vehicleId: vehicle.id,
          subject: `[OFFLINE] ${vehicle.name} - Hors ligne depuis ${offlineDuration}`,
          description: `Le véhicule ${vehicle.name} (IMEI: ${vehicle.imei || 'N/A'}, Client: ${vehicle.client}) est hors ligne depuis ${offlineDuration}.\nDernière communication : ${new Date(vehicle.lastUpdated).toLocaleString()}`,
          priority: 'HIGH',
          status: 'OPEN',
          category: 'TECHNICAL',
          subCategory: 'Dépannage',
          interventionType: 'DEPANNAGE',
          assignedTo: agentId || '',
          source: 'TrackYu',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        } as unknown as Ticket);
        showToast(`Ticket créé pour ${vehicle.name}${agentId ? ' (assigné à un Agent Tracking)' : ''}`, 'success');
      }
    } catch {
      showToast(`Erreur lors de ${action} sur ${vehicle.name}`, 'error');
    } finally {
      setLoadingAction(null);
    }
  };

  // ── Bulk actions ───────────────────────────────────────
  const handleBulkAction = async (action: 'PING' | 'TICKET') => {
    const selected = offlineVehicles.filter(v => selectedIds.has(v.id));
    if (selected.length === 0) return;

    const confirmMsg = action === 'PING'
      ? `Envoyer PING à ${selected.length} véhicule(s) ?`
      : `Créer ${selected.length} ticket(s) ?`;
    if (!(await confirmDialog(confirmMsg))) return;

    let success = 0;
    let fail = 0;
    for (const v of selected) {
      try {
        await handleAction(action, v);
        success++;
      } catch {
        fail++;
      }
    }
    showToast(TOAST.FLEET.COMMAND_SENT(success, fail), success > 0 ? 'success' : 'error');
    setSelectedIds(new Set());
  };

  // ── Export ─────────────────────────────────────────────
  const handleExport = () => {
    const vehiclesToExport = selectedIds.size > 0
      ? offlineVehicles.filter(v => selectedIds.has(v.id))
      : offlineVehicles;

    const headers = ['Véhicule', 'Client', 'IMEI', 'Dernière Com', 'Durée Offline', 'Statut', 'Commentaire'];
    const rows = vehiclesToExport.map(v => [
      v.name,
      v.client,
      v.imei || '',
      new Date(v.lastUpdated).toLocaleString(),
      getOfflineDuration(v.lastUpdated),
      getStatusLabel(v.lastUpdated),
      (getLastComment(v.id)?.text || '').replace(/,/g, ';')
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `offline_vehicles_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ── Inactivity history builder ─────────────────────────
  const buildInactivityHistory = (vehicle: Vehicle): InactivityEntry[] => {
    const entries: InactivityEntry[] = [];
    // Offline start
    entries.push({
      type: 'offline_start',
      date: new Date(vehicle.lastUpdated).toISOString(),
      description: `Dernière communication reçue`
    });
    // Comments for this vehicle
    const vc = getVehicleComments(vehicle.id);
    vc.forEach(c => {
      entries.push({
        type: 'comment',
        date: c.createdAt,
        description: `Commentaire : ${c.text} (par ${c.author})`
      });
    });
    return entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  // ═══════════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════════
  return (
    <div className="space-y-3 h-full flex flex-col">
      {/* ── Filters + Search ────────────────────────── */}
      <div className="flex flex-wrap justify-between items-center gap-2">
        <div className="flex gap-2 flex-wrap">
          {[
            { key: 'ALL' as const, label: 'Tous', active: 'bg-slate-800 text-white', inactive: 'bg-slate-100 text-slate-600 hover:bg-slate-200' },
            { key: '24H' as const, label: '1h - 24h', active: 'bg-yellow-500 text-white', inactive: 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100' },
            { key: '48H' as const, label: '24h - 48h', active: 'bg-orange-500 text-white', inactive: 'bg-orange-50 text-orange-700 hover:bg-orange-100' },
            { key: '7D' as const, label: '48h - 7j', active: 'bg-red-400 text-white', inactive: 'bg-red-50 text-red-600 hover:bg-red-100' },
            { key: 'ZOMBIE' as const, label: 'Zombies (+7j)', active: 'bg-red-600 text-white', inactive: 'bg-red-50 text-red-700 hover:bg-red-100' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filter === f.key ? f.active : f.inactive}`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher un véhicule..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            />
          </div>
          <button
            onClick={handleExport}
            className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 hover:text-[var(--primary)] transition-colors"
            title={selectedIds.size > 0 ? `Exporter ${selectedIds.size} sélectionné(s)` : 'Exporter tout en CSV'}
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Bulk action bar ─────────────────────────── */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 bg-[var(--primary-dim)] border border-[var(--border)] rounded-lg px-4 py-2 text-sm">
          <span className="font-medium text-[var(--primary)]">{selectedIds.size} véhicule(s) sélectionné(s)</span>
          <div className="flex gap-2 ml-auto">
            <button
              onClick={() => handleBulkAction('PING')}
              className="px-3 py-1 bg-[var(--primary)] text-white rounded text-xs font-medium hover:bg-[var(--primary-light)]"
            >
              <Signal className="w-3 h-3 inline mr-1" /> Ping tous
            </button>
            <button
              onClick={() => handleBulkAction('TICKET')}
              className="px-3 py-1 bg-slate-700 text-white rounded text-xs font-medium hover:bg-slate-800"
            >
              <MessageSquare className="w-3 h-3 inline mr-1" /> Tickets
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="px-3 py-1 bg-white text-slate-600 border border-slate-200 rounded text-xs font-medium hover:bg-slate-50"
            >
              Tout désélectionner
            </button>
          </div>
        </div>
      )}

      {/* ── List ───────────────────────────────────── */}
      {isMobile ? (
        <MobileCardList>
          {paginatedVehicles.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <WifiOff className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="font-medium">Aucun tracker hors-ligne</p>
            </div>
          ) : paginatedVehicles.map(vehicle => {
            const lastComment = getLastComment(vehicle.id);
            const commentCount = getVehicleComments(vehicle.id).length;
            const hoursOffline = (Date.now() - new Date(vehicle.lastUpdated).getTime()) / 3600000;
            const borderColor = hoursOffline >= 168 ? 'border-l-red-600'
              : hoursOffline >= 24 ? 'border-l-orange-500'
              : 'border-l-yellow-400';
            return (
              <MobileCard key={vehicle.id} borderColor={borderColor}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{vehicle.name}</p>
                    <p className="text-xs text-slate-500 truncate">{vehicle.client} · <span className="font-mono">{vehicle.imei || '--'}</span></p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-bold font-mono text-sm text-slate-700 dark:text-slate-200">{getOfflineDuration(vehicle.lastUpdated)}</p>
                    {getStatusBadge(vehicle.lastUpdated)}
                  </div>
                </div>
                {lastComment && (
                  <p className="mt-1 text-[10px] text-slate-400 truncate">
                    <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded mr-1">{commentCount}</span>
                    {lastComment.text}
                  </p>
                )}
                <div className="mt-2 flex items-center gap-2">
                  <MobileCardAction icon={<Signal className="w-3 h-3" />} color="blue" onClick={() => handleAction('PING', vehicle)}>Ping</MobileCardAction>
                  <MobileCardAction icon={<PenLine className="w-3 h-3" />} color="emerald" onClick={() => { setCommentModal({ vehicle }); setCommentText(''); }}>Note</MobileCardAction>
                  <MobileCardAction icon={<MessageSquare className="w-3 h-3" />} color="slate" onClick={() => handleAction('TICKET', vehicle)}>Ticket</MobileCardAction>
                </div>
              </MobileCard>
            );
          })}
        </MobileCardList>
      ) : (
      <div className="flex-1 overflow-auto custom-scrollbar pb-16 lg:pb-0">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-xs sticky top-0 z-10">
            <tr>
              <th className="px-3 py-3 w-10">
                <button onClick={toggleSelectAll} className="text-slate-400 hover:text-slate-600" title="Sélectionner tout">
                  {allPageSelected ? <CheckSquare className="w-4 h-4 text-[var(--primary)]" /> : somePageSelected ? <Minus className="w-4 h-4 text-[var(--primary)]" /> : <Square className="w-4 h-4" />}
                </button>
              </th>
              <SortableHeader label="Véhicule" sortKey="name" currentSortKey={offlineSortConfig.key} currentDirection={offlineSortConfig.direction} onSort={handleOfflineSort} />
              <SortableHeader label="IMEI" sortKey="imei" currentSortKey={offlineSortConfig.key} currentDirection={offlineSortConfig.direction} onSort={handleOfflineSort} />
              <SortableHeader label="SIM" sortKey="sim" currentSortKey={offlineSortConfig.key} currentDirection={offlineSortConfig.direction} onSort={handleOfflineSort} />
              <SortableHeader label="Modèle" sortKey="deviceModel" currentSortKey={offlineSortConfig.key} currentDirection={offlineSortConfig.direction} onSort={handleOfflineSort} />
              <SortableHeader label="Client" sortKey="client" currentSortKey={offlineSortConfig.key} currentDirection={offlineSortConfig.direction} onSort={handleOfflineSort} />
              <SortableHeader label="Dernière Com." sortKey="lastUpdated" currentSortKey={offlineSortConfig.key} currentDirection={offlineSortConfig.direction} onSort={handleOfflineSort} />
              <th className="px-4 py-3">Durée Offline</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3">Commentaires</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedVehicles.map(vehicle => {
              const lastComment = getLastComment(vehicle.id);
              const commentCount = getVehicleComments(vehicle.id).length;
              return (
                <tr key={vehicle.id} className={`hover:bg-slate-50 transition-colors group ${selectedIds.has(vehicle.id) ? 'bg-[var(--primary-dim)]/50' : ''}`}>
                  <td className="px-3 py-3">
                    <button onClick={() => toggleSelect(vehicle.id)} className="text-slate-400 hover:text-slate-600">
                      {selectedIds.has(vehicle.id) ? <CheckSquare className="w-4 h-4 text-[var(--primary)]" /> : <Square className="w-4 h-4" />}
                    </button>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-800">
                    <button
                      onClick={() => setInactivityModal({ vehicle })}
                      className="hover:text-[var(--primary)] hover:underline text-left"
                      title="Voir l'historique d'inactivité"
                    >
                      {vehicle.name}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-slate-500 select-all">{vehicle.imei || '--'}</td>
                  <td className="px-4 py-3 text-xs font-mono text-slate-500 select-all">{vehicle.sim || '--'}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{vehicle.deviceModel || '--'}</td>
                  <td className="px-4 py-3 text-slate-600">{vehicle.client}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{new Date(vehicle.lastUpdated).toLocaleString()}</td>
                  <td className="px-4 py-3 font-mono text-slate-700">{getOfflineDuration(vehicle.lastUpdated)}</td>
                  <td className="px-4 py-3">{getStatusBadge(vehicle.lastUpdated)}</td>
                  <td className="px-4 py-3 max-w-[200px]">
                    {lastComment ? (
                      <button
                        onClick={() => { setCommentModal({ vehicle }); setCommentText(''); }}
                        className="text-left text-xs text-slate-600 hover:text-[var(--primary)] truncate block w-full"
                        title={lastComment.text}
                      >
                        <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 mr-1">{commentCount}</span>
                        {lastComment.text}
                      </button>
                    ) : (
                      <span className="text-xs text-slate-300">--</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleAction('PING', vehicle)}
                        className="p-1.5 bg-[var(--primary-dim)] text-[var(--primary)] rounded hover:bg-[var(--primary-dim)] disabled:opacity-50"
                        title="Ping Tracker"
                        disabled={loadingAction === `PING-${vehicle.id}`}
                      >
                        <Signal className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleAction('REBOOT', vehicle)}
                        className="p-1.5 bg-orange-50 text-orange-600 rounded hover:bg-orange-100 disabled:opacity-50"
                        title="Redémarrer Boîtier"
                        disabled={loadingAction === `REBOOT-${vehicle.id}`}
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => { setCommentModal({ vehicle }); setCommentText(''); }}
                        className="p-1.5 bg-emerald-50 text-emerald-600 rounded hover:bg-emerald-100"
                        title="Ajouter un commentaire"
                      >
                        <PenLine className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleAction('TICKET', vehicle)}
                        className="p-1.5 bg-slate-100 text-slate-600 rounded hover:bg-slate-200 disabled:opacity-50"
                        title="Créer Ticket Support"
                        disabled={loadingAction === `TICKET-${vehicle.id}`}
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setInactivityModal({ vehicle })}
                        className="p-1.5 bg-purple-50 text-purple-600 rounded hover:bg-purple-100"
                        title="Historique d'inactivité"
                      >
                        <Clock className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {offlineVehicles.length === 0 && (
              <tr>
                <td colSpan={11} className="px-4 py-8 text-center text-slate-400">
                  <WifiOff className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  Aucun véhicule hors ligne correspondant aux critères.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      )}

      {/* ── Pagination ──────────────────────────────── */}
      {sortedOfflineVehicles.length > 0 && (
        <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-sm text-slate-600">
          <div className="flex items-center gap-2">
            <span>Afficher</span>
            <select
              value={itemsPerPage}
              onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
              className="bg-white border border-slate-200 rounded px-2 py-1 text-xs"
              aria-label="Nombre d'éléments par page"
            >
              {ITEMS_PER_PAGE_OPTIONS.map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <span>par page</span>
            <span className="text-slate-400 ml-2">
              ({sortedOfflineVehicles.length} total)
            </span>
          </div>

          <Pagination
            currentPage={safePage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )}

      {/* ═══════════════════════════════════════════════════
          Modal : Commentaire
          ═══════════════════════════════════════════════════ */}
      {commentModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setCommentModal(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h3 className="font-semibold text-slate-800">
                <PenLine className="w-4 h-4 inline mr-2 text-emerald-600" />
                Commentaires - {commentModal.vehicle.name}
              </h3>
              <button onClick={() => setCommentModal(null)} className="text-slate-400 hover:text-slate-600" aria-label="Fermer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Existing comments */}
            <div className="flex-1 overflow-auto px-5 py-3 space-y-2 min-h-[100px] max-h-[300px]">
              {getVehicleComments(commentModal.vehicle.id).length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-4">Aucun commentaire pour ce véhicule.</p>
              ) : (
                getVehicleComments(commentModal.vehicle.id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(c => (
                  <div key={c.id} className="bg-slate-50 rounded-lg px-3 py-2">
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span className="font-medium text-slate-600">{c.author}</span>
                      <span>{new Date(c.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="text-sm text-slate-700">{c.text}</p>
                  </div>
                ))
              )}
            </div>

            {/* Add comment */}
            <div className="border-t px-5 py-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ajouter un commentaire..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddComment(); }}
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  autoFocus
                />
                <button
                  onClick={handleAddComment}
                  disabled={!commentText.trim()}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Ajouter
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════
          Modal : Historique d'inactivité
          ═══════════════════════════════════════════════════ */}
      {inactivityModal && (() => {
        const vehicle = inactivityModal.vehicle;
        const history = buildInactivityHistory(vehicle);
        const offlineDuration = getOfflineDuration(vehicle.lastUpdated);
        // statusLabel available via getStatusLabel(vehicle.lastUpdated) if needed

        return (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setInactivityModal(null)}>
            <div className="bg-white rounded-xl shadow-xl w-full max-w-xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-4 border-b">
                <h3 className="font-semibold text-slate-800">
                  <Clock className="w-4 h-4 inline mr-2 text-purple-600" />
                  Historique d'inactivité - {vehicle.name}
                </h3>
                <button onClick={() => setInactivityModal(null)} className="text-slate-400 hover:text-slate-600" aria-label="Fermer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Vehicle summary */}
              <div className="px-5 py-3 bg-slate-50 border-b grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-slate-500">IMEI :</span> <span className="font-mono">{vehicle.imei || '--'}</span></div>
                <div><span className="text-slate-500">Client :</span> <span>{vehicle.client}</span></div>
                <div><span className="text-slate-500">Durée offline :</span> <span className="font-bold text-red-600">{offlineDuration}</span></div>
                <div><span className="text-slate-500">Statut :</span> {getStatusBadge(vehicle.lastUpdated)}</div>
                <div><span className="text-slate-500">SIM :</span> <span className="font-mono">{vehicle.sim || '--'}</span></div>
                <div><span className="text-slate-500">Modèle :</span> <span>{vehicle.deviceModel || '--'}</span></div>
              </div>

              {/* Timeline */}
              <div className="flex-1 overflow-auto px-5 py-4 space-y-0">
                <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Chronologie</h4>
                {history.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-4">Aucun événement enregistré.</p>
                ) : (
                  <div className="relative border-l-2 border-slate-200 ml-2 space-y-4">
                    {history.map((entry, i) => {
                      const colors: Record<string, string> = {
                        offline_start: 'bg-red-500',
                        command_sent: 'bg-[var(--primary-dim)]0',
                        ticket_created: 'bg-orange-500',
                        comment: 'bg-emerald-500'
                      };
                      return (
                        <div key={i} className="relative pl-6">
                          <div className={`absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full ${colors[entry.type] || 'bg-slate-400'}`} />
                          <div className="text-xs text-slate-400">{new Date(entry.date).toLocaleString()}</div>
                          <div className="text-sm text-slate-700">{entry.description}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Actions from modal */}
              <div className="border-t px-5 py-3 flex gap-2 justify-end">
                <button
                  onClick={() => { setInactivityModal(null); handleAction('PING', vehicle); }}
                  className="px-3 py-1.5 bg-[var(--primary)] text-white rounded text-xs font-medium hover:bg-[var(--primary-light)]"
                >
                  <Signal className="w-3 h-3 inline mr-1" /> Ping
                </button>
                <button
                  onClick={() => { setInactivityModal(null); handleAction('REBOOT', vehicle); }}
                  className="px-3 py-1.5 bg-orange-500 text-white rounded text-xs font-medium hover:bg-orange-600"
                >
                  <RotateCcw className="w-3 h-3 inline mr-1" /> Reboot
                </button>
                <button
                  onClick={() => { setInactivityModal(null); handleAction('TICKET', vehicle); }}
                  className="px-3 py-1.5 bg-slate-700 text-white rounded text-xs font-medium hover:bg-slate-800"
                >
                  <MessageSquare className="w-3 h-3 inline mr-1" /> Ticket
                </button>
                <button
                  onClick={() => { setInactivityModal(null); setCommentModal({ vehicle }); setCommentText(''); }}
                  className="px-3 py-1.5 bg-emerald-600 text-white rounded text-xs font-medium hover:bg-emerald-700"
                >
                  <PenLine className="w-3 h-3 inline mr-1" /> Commenter
                </button>
              </div>
            </div>
          </div>
        );
      })()}
      <ConfirmDialogComponent />
    </div>
  );
};
