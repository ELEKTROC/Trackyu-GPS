import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  VehicleStatus,
  View,
  type Vehicle,
  type FleetMetrics,
  type Contract,
  type Invoice,
  type Tier,
  type Lead,
  type Ticket,
  type Intervention,
  type DeviceStock,
  type Alert,
} from '../../../types';
import { Card } from '../../../components/Card';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Truck,
  Activity,
  PauseCircle,
  WifiOff,
  Route,
  Gauge,
  AlertCircle,
  Briefcase,
  Users,
  Wrench,
  Package,
  Headphones,
  Calendar,
  AlertTriangle,
  BarChart3,
  Download,
  RefreshCw,
  ChevronRight,
  Shield,
  RotateCcw,
  Settings2,
  EyeOff,
  DollarSign,
  Bell,
  Receipt,
} from 'lucide-react';
import { EmptyState } from '../../../components/EmptyState';
import { useTheme } from '../../../contexts/ThemeContext';
import { useDataContext } from '../../../contexts/DataContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useDateRange } from '../../../hooks/useDateRange';
import { DateRangeSelector } from '../../../components/DateRangeSelector';
import { api } from '../../../services/apiLazy';
import { useCurrency } from '../../../hooks/useCurrency';
import { useCountUp } from '../../../hooks/useCountUp';
import { StatsCardSkeleton, ChartSkeleton } from '../../../components/Skeleton';

// DnD
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { DraggableSection } from './DraggableSection';
import { useDashboardLayout, type DashboardSectionId } from '../../../hooks/useDashboardLayout';
import { useTranslation } from '../../../i18n';

// --- Helpers ---
const safeToISODate = (dateValue: unknown): string | null => {
  if (!dateValue) return null;
  try {
    const date = new Date(dateValue as string | number | Date);
    if (isNaN(date.getTime())) return null;
    return date.toISOString().split('T')[0];
  } catch {
    return null;
  }
};

const fmt = (n: number) => n.toLocaleString('fr-FR');
const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);

// --- Types ---
interface RevenueMonth {
  month: string;
  revenue: number;
  invoiced: number;
  overdue: number;
}

interface CostMonth {
  month: string;
  cost: number;
  count: number;
}

interface DashboardViewProps {
  vehicles: Vehicle[];
  metrics: FleetMetrics;
  onNavigate?: (view: View, params?: Record<string, string>) => void;
}

// --- Reusable components ---

const KPICard: React.FC<{
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  trend?: { value: number; trend: 'up' | 'down' | 'stable' };
  onClick?: () => void;
  subtitle?: string;
}> = ({ label, value, icon: Icon, color, bgColor, trend, onClick, subtitle }) => {
  const numericValue = typeof value === 'number' ? value : NaN;
  const animated = useCountUp(isNaN(numericValue) ? 0 : numericValue);
  const displayValue = typeof value === 'number' ? animated : value;

  return (
    <div
      onClick={onClick}
      className={`bg-[var(--bg-surface)] p-4 rounded-[14px] border border-[var(--border)] shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-all duration-200 ${onClick ? 'cursor-pointer hover:border-[var(--primary)]' : ''}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 rounded-[10px] ${bgColor}`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        {trend && trend.value !== 0 && (
          <span
            className={`flex items-center gap-0.5 text-[11px] font-bold px-1.5 py-0.5 rounded-full ${
              trend.trend === 'up'
                ? 'bg-[rgba(34,197,94,0.12)] text-[var(--status-moving)]'
                : trend.trend === 'down'
                  ? 'bg-[rgba(239,68,68,0.12)] text-[var(--status-stopped)]'
                  : 'text-[var(--text-muted)] bg-[var(--bg-elevated)]'
            }`}
          >
            {trend.trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {trend.value > 0 ? '+' : ''}
            {trend.value}%
          </span>
        )}
      </div>
      <p className="page-title tabular-nums">{displayValue}</p>
      <p className="text-xs text-[var(--text-muted)] mt-0.5 leading-tight">{label}</p>
      {subtitle && <p className="text-[10px] text-[var(--text-muted)] mt-1 leading-tight">{subtitle}</p>}
    </div>
  );
};

const MiniStat: React.FC<{
  label: string;
  value: string | number;
  color?: string;
  onClick?: () => void;
}> = ({ label, value, color = 'text-[var(--text-primary)]', onClick }) => (
  <div
    onClick={onClick}
    className={`flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0 ${onClick ? 'cursor-pointer hover:bg-[var(--bg-elevated)] rounded px-1 -mx-1' : ''}`}
  >
    <span className="text-xs text-[var(--text-muted)]">{label}</span>
    <span className={`text-sm font-bold ${color}`}>{value}</span>
  </div>
);

const StatusBadge: React.FC<{ count: number; label: string; color: string; dotColor: string }> = ({
  count,
  label,
  color,
  dotColor,
}) => (
  <div className="flex items-center gap-2">
    <div className={`w-2.5 h-2.5 rounded-full ${dotColor}`} />
    <span className="text-xs text-[var(--text-muted)]">{label}</span>
    <span className={`text-sm font-bold ml-auto ${color}`}>{count}</span>
  </div>
);

const SectionHeader: React.FC<{
  title: string;
  icon: React.ElementType;
  onViewAll?: () => void;
  badge?: string | number;
}> = ({ title, icon: Icon, onViewAll, badge }) => {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-[var(--text-muted)]" />
        <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wide">{title}</h3>
        {badge !== undefined && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[var(--primary-dim)] text-[var(--primary)]">
            {badge}
          </span>
        )}
      </div>
      {onViewAll && (
        <button
          onClick={onViewAll}
          className="flex items-center gap-1 text-xs font-medium hover:underline"
          style={{ color: 'var(--primary)' }}
        >
          {t('dashboard.header.viewAll')} <ChevronRight className="w-3 h-3" />
        </button>
      )}
    </div>
  );
};

// =====================================================
// ROLE-BASED DASHBOARD HELPERS
// =====================================================
type RoleFamily = 'CLIENT' | 'TECH' | 'COMMERCIAL' | 'FINANCE' | 'SUPPORT' | 'FULL';

function getRoleFamily(role: string | undefined): RoleFamily {
  const r = (role || '').toUpperCase().replace(/_/g, '');
  if (r === 'CLIENT' || r === 'SOUSCOMPTE' || r === 'SUBACCOUNT') return 'CLIENT';
  if (r === 'TECH' || r === 'AGENTTRACKING') return 'TECH';
  if (r === 'COMMERCIAL' || r === 'SALES') return 'COMMERCIAL';
  if (r === 'COMPTABLE') return 'FINANCE';
  if (r === 'SUPPORTAGENT') return 'SUPPORT';
  return 'FULL'; // ADMIN, SUPERADMIN, MANAGER, RESELLER_ADMIN, etc.
}

function isSectionAllowedForRole(sectionId: string, rf: RoleFamily): boolean {
  if (rf === 'FULL') return true;
  if (rf === 'CLIENT') return ['banner-kpi', 'fleet-realtime', 'charts', 'bottom-row'].includes(sectionId);
  if (rf === 'TECH') return ['banner-kpi', 'fleet-realtime', 'charts', 'bottom-row'].includes(sectionId);
  if (rf === 'COMMERCIAL') return ['banner-kpi', 'business-finance', 'charts'].includes(sectionId);
  // COMPTABLE a VIEW_FLEET + VIEW_TECH + MANAGE_STOCK → ajouter fleet-realtime et bottom-row
  if (rf === 'FINANCE')
    return ['banner-kpi', 'fleet-realtime', 'business-finance', 'charts', 'bottom-row'].includes(sectionId);
  // SUPPORT_AGENT n'a pas VIEW_FINANCE → retirer business-finance
  if (rf === 'SUPPORT') return ['banner-kpi', 'charts', 'bottom-row'].includes(sectionId);
  return true;
}

// =====================================================
// DASHBOARD VIEW - Hub KPI Manager
// =====================================================
export const DashboardView: React.FC<DashboardViewProps> = ({ vehicles, metrics, onNavigate }) => {
  const { t } = useTranslation();
  const { isDarkMode } = useTheme();
  const { user } = useAuth();
  const roleFamily = getRoleFamily(user?.role);
  const {
    tiers = [],
    contracts = [],
    invoices = [],
    alerts = [],
    tickets = [],
    interventions = [],
    stock = [],
    leads = [],
  } = useDataContext();

  const { periodPreset, setPeriodPreset, customDateRange, setCustomDateRange, dateRange } = useDateRange();
  // Fallback when dateRange is null (preset ALL) — uses a very wide range to skip filtering
  const effectiveDateRange = dateRange ?? { start: '1900-01-01', end: '2999-12-31' };
  const { formatPrice } = useCurrency();

  // Backend stats (polled)
  const [stats, setStats] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  // Stable timestamp for useMemo purity (updated on data refresh)
  const [nowMs, setNowMs] = useState(() => Date.now());
  // Trigger for stats refresh
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Fetch stats when trigger changes (either initial mount or interval)
  useEffect(() => {
    let cancelled = false;
    const doFetch = async () => {
      try {
        setFetchError(null);
        const data = await api.analytics.getDashboardStats();
        if (!cancelled && data) setStats(data);
      } catch (err) {
        if (!cancelled) {
          console.warn('[Dashboard] Failed to fetch stats:', err);
          setFetchError(t('dashboard.header.fetchError'));
        }
      }
      if (!cancelled) {
        setLoading(false);
        setLastRefresh(new Date());
        setNowMs(Date.now());
      }
    };
    doFetch();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger]);

  // Polling interval - triggers refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => setRefreshTrigger((prev) => prev + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  // Chart theme — résolu via CSS vars (pas besoin de isDarkMode)
  const chartGrid = 'var(--border)';
  const chartText = 'var(--text-secondary)';
  const tooltipStyle: React.CSSProperties = {
    backgroundColor: 'var(--bg-elevated)',
    borderRadius: '8px',
    border: '1px solid var(--border)',
    fontSize: '11px',
    color: 'var(--text-primary)',
  };
  const tooltipItemStyle = { color: 'var(--text-primary)' };

  const nav = (view: View, params?: Record<string, string>) => onNavigate?.(view, params);

  // --- DnD Layout ---
  const { sections, sectionOrder, hiddenCount, reorderSections, toggleCollapse, toggleHidden, resetLayout } =
    useDashboardLayout();

  // Edit mode state
  const [editMode, setEditMode] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (over && active.id !== over.id) {
        const oldIndex = sectionOrder.indexOf(active.id as DashboardSectionId);
        const newIndex = sectionOrder.indexOf(over.id as DashboardSectionId);
        const newOrder = arrayMove(sectionOrder, oldIndex, newIndex);
        reorderSections(newOrder);
      }
    },
    [sectionOrder, reorderSections]
  );

  // =====================================================
  // COMPUTED KPIs
  // =====================================================

  // --- FLEET ---
  const fleet = useMemo(() => {
    const moving = vehicles.filter((v) => v.status === VehicleStatus.MOVING).length;
    const idle = vehicles.filter((v) => v.status === VehicleStatus.IDLE).length;
    const stopped = vehicles.filter((v) => v.status === VehicleStatus.STOPPED).length;
    const offline = vehicles.filter((v) => v.status === VehicleStatus.OFFLINE).length;
    const kmToday = vehicles.reduce((s, v) => s + (v.dailyMileage || 0), 0);
    const utilization = vehicles.length > 0 ? pct(moving + idle, vehicles.length) : 0;
    const alertsCount = vehicles.filter((v) => (v.violationsCount || 0) > 0 || (v.suspectLoss || 0) > 0).length;
    const maintenanceDue = vehicles.filter((v) => {
      if (!v.nextMaintenance) return false;
      const days = Math.ceil((new Date(v.nextMaintenance).getTime() - nowMs) / 86400000);
      return days <= 7;
    }).length;
    return {
      total: vehicles.length,
      moving,
      idle,
      stopped,
      offline,
      kmToday,
      utilization,
      alertsCount,
      maintenanceDue,
    };
  }, [vehicles, nowMs]);

  // --- BUSINESS ---
  const business = useMemo(() => {
    const activeContracts = contracts.filter((c: Contract) => c.status === 'ACTIVE');
    const mrr = activeContracts.reduce((s: number, c: Contract) => s + (c.monthlyFee || 0), 0);
    const totalClients = tiers.filter((t: Tier) => t.type === 'CLIENT').length;
    const resellers = tiers.filter((t: Tier) => t.type === 'RESELLER').length;

    const periodInvoices = invoices.filter((inv: Invoice) => {
      const d = safeToISODate(inv.date);
      return d && d >= effectiveDateRange.start && d <= effectiveDateRange.end;
    });
    const revenue = periodInvoices
      .filter((i: Invoice) => i.status === 'PAID' || i.status === 'paid')
      .reduce((s: number, i: Invoice) => s + (i.amount || 0), 0);
    const overdue = invoices
      .filter((i: Invoice) => i.status === 'OVERDUE')
      .reduce((s: number, i: Invoice) => s + (i.amount || 0), 0);
    const overdueCount = invoices.filter((i: Invoice) => i.status === 'OVERDUE').length;
    const collectionRate =
      periodInvoices.length > 0
        ? pct(
            periodInvoices.filter((i: Invoice) => i.status === 'PAID' || i.status === 'paid').length,
            periodInvoices.length
          )
        : 0;

    const activeLeads = leads.filter((l: Lead) => !['WON', 'LOST'].includes(l.status)).length;
    const wonLeads = leads.filter((l: Lead) => {
      const d = safeToISODate(l.createdAt);
      return l.status === 'WON' && d && d >= effectiveDateRange.start && d <= effectiveDateRange.end;
    }).length;

    return {
      mrr,
      revenue,
      overdue,
      overdueCount,
      collectionRate,
      activeContracts: activeContracts.length,
      totalClients,
      resellers,
      activeLeads,
      wonLeads,
    };
  }, [contracts, invoices, tiers, leads, dateRange]);

  // --- SUPPORT ---
  const support = useMemo(() => {
    const open = tickets.filter((t: Ticket) => t.status === 'OPEN').length;
    const inProgress = tickets.filter((t: Ticket) => t.status === 'IN_PROGRESS').length;
    const waiting = tickets.filter((t: Ticket) => t.status === 'WAITING_CLIENT').length;
    const resolved = tickets.filter((t: Ticket) => {
      const d = safeToISODate(t.resolvedAt || t.updatedAt);
      return (
        (t.status === 'RESOLVED' || t.status === 'CLOSED') &&
        d &&
        d >= effectiveDateRange.start &&
        d <= effectiveDateRange.end
      );
    }).length;
    const critical = tickets.filter(
      (t: Ticket) => t.priority === 'CRITICAL' && t.status !== 'RESOLVED' && t.status !== 'CLOSED'
    ).length;
    const total = open + inProgress + waiting;

    const resolvedWithTime = tickets.filter((t: Ticket) => t.resolvedAt && t.createdAt);
    let avgResolution = 0;
    if (resolvedWithTime.length > 0) {
      const totalMs = resolvedWithTime.reduce((s: number, t: Ticket) => {
        return s + (new Date(t.resolvedAt!).getTime() - new Date(t.createdAt).getTime());
      }, 0);
      avgResolution = Math.round(totalMs / resolvedWithTime.length / 3600000);
    }

    return { open, inProgress, waiting, resolved, critical, total, avgResolution };
  }, [tickets, dateRange]);

  // --- TECH / INTERVENTIONS ---
  const tech = useMemo(() => {
    const periodInterventions = interventions.filter((i: Intervention) => {
      const d = safeToISODate(i.scheduledDate || i.createdAt);
      return d && d >= effectiveDateRange.start && d <= effectiveDateRange.end;
    });
    const total = periodInterventions.length;
    const pending = periodInterventions.filter(
      (i: Intervention) => i.status === 'PENDING' || i.status === 'SCHEDULED'
    ).length;
    const inProgressI = periodInterventions.filter(
      (i: Intervention) => i.status === 'EN_ROUTE' || i.status === 'IN_PROGRESS'
    ).length;
    const completed = periodInterventions.filter((i: Intervention) => i.status === 'COMPLETED').length;
    const cancelled = periodInterventions.filter(
      (i: Intervention) => i.status === 'CANCELLED' || i.status === 'POSTPONED'
    ).length;
    const successRate = total - cancelled > 0 ? pct(completed, total - cancelled) : 0;

    return { total, pending, inProgress: inProgressI, completed, cancelled, successRate };
  }, [interventions, dateRange]);

  // --- STOCK ---
  const stockStats = useMemo(() => {
    const boxes = stock.filter((d: DeviceStock) => d.type === 'BOX');
    const sims = stock.filter((d: DeviceStock) => d.type === 'SIM');
    const inStock = boxes.filter((d: DeviceStock) => d.status === 'IN_STOCK').length;
    const installed = boxes.filter((d: DeviceStock) => d.status === 'INSTALLED').length;
    const rma = boxes.filter((d: DeviceStock) => d.status === 'RMA' || d.status === 'RMA_PENDING').length;
    const simsInStock = sims.filter((d: DeviceStock) => d.status === 'IN_STOCK').length;
    const simsActive = sims.filter((d: DeviceStock) => d.status === 'INSTALLED').length;
    return { totalBoxes: boxes.length, inStock, installed, rma, simsInStock, simsActive };
  }, [stock]);

  // --- CHARTS DATA ---

  const statusDonut = useMemo(() => {
    const data = (stats?.statusDistribution || {}) as Record<string, number>;
    return [
      {
        name: t('dashboard.fleetRealtime.status.moving'),
        value: data[VehicleStatus.MOVING] || fleet.moving,
        color: '#22c55e',
      },
      {
        name: t('dashboard.fleetRealtime.status.idle'),
        value: data[VehicleStatus.IDLE] || fleet.idle,
        color: '#f97316',
      },
      {
        name: t('dashboard.fleetRealtime.status.stopped'),
        value: data[VehicleStatus.STOPPED] || fleet.stopped,
        color: '#ef4444',
      },
      {
        name: t('dashboard.fleetRealtime.status.offline'),
        value: data[VehicleStatus.OFFLINE] || fleet.offline,
        color: '#64748b',
      },
    ];
  }, [stats, fleet, t]);

  const activityData = useMemo(() => {
    if (!vehicles || vehicles.length === 0) return [];
    const start = new Date(effectiveDateRange.start);
    const end = new Date(effectiveDateRange.end);
    const days: Date[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) days.push(new Date(d));

    const activityByDay = (stats?.activityByDay || {}) as Record<string, { avgSpeed: number; activeCount: number }>;
    if (stats?.activityByDay && Object.keys(stats.activityByDay).length > 0) {
      return days.map((date) => {
        const ds = date.toISOString().split('T')[0];
        const s = activityByDay[ds] || { avgSpeed: 0, activeCount: 0 };
        return {
          time: date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
          speed: Math.round(s.avgSpeed || 0),
          active: s.activeCount || 0,
        };
      });
    }
    return days.map((date) => ({
      time: date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
      speed: 0,
      active: 0,
    }));
  }, [vehicles, stats, dateRange]);

  // Revenue by month (from backend)
  const revenueChartData = useMemo(() => {
    if (!stats?.revenueByMonth || !Array.isArray(stats.revenueByMonth)) return [];
    return stats.revenueByMonth.map((m: RevenueMonth) => ({
      month: m.month,
      revenue: Number(m.revenue) || 0,
      invoiced: Number(m.invoiced) || 0,
      overdue: Number(m.overdue) || 0,
    }));
  }, [stats]);

  // Cost history (from backend)
  const costChartData = useMemo(() => {
    if (!stats?.costHistory || !Array.isArray(stats.costHistory)) return [];
    return stats.costHistory.map((m: CostMonth) => ({
      month: m.month,
      cost: Number(m.cost) || 0,
      count: Number(m.count) || 0,
    }));
  }, [stats]);

  const alertsChart = useMemo(() => {
    const filtered = (alerts || []).filter((a: Alert) => {
      if (!a.createdAt) return false;
      const d = safeToISODate(a.createdAt);
      return d && d >= effectiveDateRange.start && d <= effectiveDateRange.end;
    });
    const counts = filtered.reduce(
      (acc: Record<string, number>, a: Alert) => {
        acc[a.type || 'Autre'] = (acc[a.type || 'Autre'] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [alerts, dateRange]);

  const upcomingMaintenance = useMemo(() => {
    return vehicles
      .filter((v) => v.nextMaintenance)
      .map((v) => {
        const due = new Date(v.nextMaintenance!);
        const daysLeft = Math.ceil((due.getTime() - nowMs) / 86400000);
        return { name: v.name, plate: v.licensePlate, date: due, daysLeft, overdue: daysLeft < 0 };
      })
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 5);
  }, [vehicles, nowMs]);

  const recentAlerts = useMemo(() => {
    return (alerts || [])
      .filter((a: Alert) => {
        const d = safeToISODate(a.createdAt);
        return d && d >= effectiveDateRange.start && d <= effectiveDateRange.end;
      })
      .sort((a: Alert, b: Alert) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 6);
  }, [alerts, dateRange]);

  // CSV export
  const handleExport = () => {
    const periodStr =
      effectiveDateRange.start && effectiveDateRange.end
        ? `Période: ${new Date(effectiveDateRange.start).toLocaleDateString('fr-FR')} - ${new Date(effectiveDateRange.end).toLocaleDateString('fr-FR')}`
        : `Période: ${periodPreset}`;
    const csv =
      'data:text/csv;charset=utf-8,' +
      `${periodStr}\n\n` +
      'Catégorie,Métrique,Valeur\n' +
      `Flotte,Véhicules Total,${fleet.total}\n` +
      `Flotte,En Mouvement,${fleet.moving}\n` +
      `Flotte,Hors Ligne,${fleet.offline}\n` +
      `Flotte,Utilisation %,${fleet.utilization}\n` +
      `Flotte,Km Aujourd'hui,${fleet.kmToday}\n` +
      `Flotte,Alertes,${fleet.alertsCount}\n` +
      `Flotte,Maintenance 7j,${fleet.maintenanceDue}\n` +
      `Business,Contrats Actifs,${business.activeContracts}\n` +
      `Business,MRR,${business.mrr}\n` +
      `Business,Revenus Période,${business.revenue}\n` +
      `Business,Impayés,${business.overdue}\n` +
      `Business,Taux Recouvrement %,${business.collectionRate}\n` +
      `Business,Clients,${business.totalClients}\n` +
      `Business,Leads Actifs,${business.activeLeads}\n` +
      `Support,Tickets Ouverts,${support.open}\n` +
      `Support,En Cours,${support.inProgress}\n` +
      `Support,Critiques,${support.critical}\n` +
      `Support,Résolus (période),${support.resolved}\n` +
      `Tech,Interventions Total,${tech.total}\n` +
      `Tech,En Attente,${tech.pending}\n` +
      `Tech,Complétées,${tech.completed}\n` +
      `Tech,Taux Succès %,${tech.successRate}\n` +
      `Stock,Balises En Stock,${stockStats.inStock}\n` +
      `Stock,Balises Installées,${stockStats.installed}\n` +
      `Stock,SIM En Stock,${stockStats.simsInStock}\n`;
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csv));
    link.setAttribute('download', `dashboard_kpi_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // =====================================================
  // LOADING STATE
  // =====================================================
  if (loading && !stats && vehicles.length === 0) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500 pb-10">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <StatsCardSkeleton key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <ChartSkeleton height={300} />
          <ChartSkeleton height={300} />
        </div>
      </div>
    );
  }

  // =====================================================
  // RENDER
  // =====================================================

  // --- Section renderers ---
  const renderBannerKpi = () => {
    // KPIs communs à tous les rôles
    const kpiFleet = (
      <KPICard
        label={t('dashboard.kpi.activeVehicles')}
        value={`${fleet.moving + fleet.idle}/${fleet.total}`}
        subtitle={t('dashboard.kpi.utilizationSubtitle', { pct: fleet.utilization })}
        icon={Truck}
        color="text-[var(--primary)]"
        bgColor="bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)]"
        onClick={() => nav(View.FLEET)}
      />
    );
    const kpiContracts = (
      <KPICard
        label={t('dashboard.kpi.activeContracts')}
        value={fmt(business.activeContracts)}
        subtitle={t('dashboard.kpi.mrrSubtitle', { value: fmt(business.mrr) })}
        icon={Briefcase}
        color="text-emerald-600"
        bgColor="bg-[var(--clr-emerald-dim)]"
        onClick={() => nav(View.CONTRACTS)}
      />
    );
    const kpiRevenue = (
      <KPICard
        label={t('dashboard.kpi.revenuePeriod')}
        value={fmt(business.revenue)}
        subtitle={t('dashboard.kpi.collectionSubtitle', { pct: business.collectionRate })}
        icon={TrendingUp}
        color="text-green-600"
        bgColor="bg-[var(--clr-success-dim)]"
        onClick={() => nav(View.INVOICES)}
      />
    );
    const kpiTickets = (
      <KPICard
        label={t('dashboard.kpi.openTickets')}
        value={support.total}
        subtitle={
          support.critical > 0
            ? t(support.critical === 1 ? 'dashboard.kpi.criticalCount_one' : 'dashboard.kpi.criticalCount_other', {
                count: support.critical,
              })
            : t('dashboard.kpi.noCritical')
        }
        icon={Headphones}
        color={support.critical > 0 ? 'text-red-600' : 'text-violet-600'}
        bgColor={support.critical > 0 ? 'bg-[var(--clr-danger-dim)]' : 'bg-violet-50 dark:bg-violet-900/30'}
        onClick={() => nav(View.SUPPORT)}
      />
    );
    const kpiTech = (
      <KPICard
        label={t('dashboard.kpi.interventions')}
        value={tech.total}
        subtitle={t(
          tech.completed === 1 ? 'dashboard.kpi.completedSubtitle_one' : 'dashboard.kpi.completedSubtitle_other',
          { count: tech.completed, pct: tech.successRate }
        )}
        icon={Wrench}
        color="text-orange-600"
        bgColor="bg-[var(--clr-warning-dim)]"
        onClick={() => nav(View.TECH)}
      />
    );
    const kpiStock = (
      <KPICard
        label={t('dashboard.kpi.stockBoxes')}
        value={stockStats.inStock}
        subtitle={t(
          stockStats.installed === 1 ? 'dashboard.kpi.installedRma_one' : 'dashboard.kpi.installedRma_other',
          { installed: stockStats.installed, rma: stockStats.rma }
        )}
        icon={Package}
        color="text-cyan-600"
        bgColor="bg-cyan-50 dark:bg-cyan-900/30"
        onClick={() => nav(View.STOCK)}
      />
    );
    const kpiAlerts = (
      <KPICard
        label={t('dashboard.kpi.vehicleAlerts')}
        value={fleet.alertsCount}
        subtitle={
          fleet.maintenanceDue > 0
            ? t(
                fleet.maintenanceDue === 1
                  ? 'dashboard.kpi.maintenanceDueSubtitle_one'
                  : 'dashboard.kpi.maintenanceDueSubtitle_other',
                { count: fleet.maintenanceDue }
              )
            : t('dashboard.kpi.noMaintenanceDue')
        }
        icon={AlertCircle}
        color={fleet.alertsCount > 0 ? 'text-red-600' : 'text-green-600'}
        bgColor={fleet.alertsCount > 0 ? 'bg-[var(--clr-danger-dim)]' : 'bg-[var(--clr-success-dim)]'}
        onClick={() => nav(View.FLEET)}
      />
    );
    const kpiOverdue = (
      <KPICard
        label={t('dashboard.kpi.overdue')}
        value={fmt(business.overdue)}
        subtitle={t(
          business.overdueCount === 1 ? 'dashboard.kpi.overdueInvoices_one' : 'dashboard.kpi.overdueInvoices_other',
          { count: business.overdueCount }
        )}
        icon={AlertTriangle}
        color={business.overdue > 0 ? 'text-red-600' : 'text-green-600'}
        bgColor={business.overdue > 0 ? 'bg-[var(--clr-danger-dim)]' : 'bg-[var(--clr-success-dim)]'}
        onClick={() => nav(View.INVOICES)}
      />
    );
    const kpiLeads = (
      <KPICard
        label={t('dashboard.kpi.activeLeads')}
        value={business.activeLeads}
        subtitle={t(
          business.wonLeads === 1 ? 'dashboard.kpi.wonLeadsPeriod_one' : 'dashboard.kpi.wonLeadsPeriod_other',
          { count: business.wonLeads }
        )}
        icon={Users}
        color="text-indigo-600"
        bgColor="bg-indigo-50 dark:bg-indigo-900/30"
        onClick={() => nav(View.LEADS)}
      />
    );

    // Grilles adaptées par rôle
    if (roleFamily === 'CLIENT') {
      return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {kpiFleet}
          {kpiAlerts}
          <KPICard
            label={t('dashboard.kpi.kmToday')}
            value={fmt(fleet.kmToday)}
            subtitle={t('dashboard.kpi.utilizationSubtitle', { pct: fleet.utilization })}
            icon={Route}
            color="text-purple-600"
            bgColor="bg-[var(--clr-info-dim)]"
            onClick={() => nav(View.FLEET)}
          />
          {kpiTickets}
        </div>
      );
    }
    if (roleFamily === 'TECH') {
      return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {kpiTech}
          <KPICard
            label={t('dashboard.kpi.pending')}
            value={tech.pending}
            subtitle={t('dashboard.kpi.inProgressCount', { count: tech.inProgress })}
            icon={Wrench}
            color="text-amber-600"
            bgColor="bg-[var(--clr-caution-dim)]"
            onClick={() => nav(View.TECH)}
          />
          {kpiStock}
          {kpiFleet}
        </div>
      );
    }
    if (roleFamily === 'COMMERCIAL') {
      return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {kpiLeads}
          {kpiContracts}
          {kpiRevenue}
          {kpiOverdue}
        </div>
      );
    }
    if (roleFamily === 'FINANCE') {
      return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {kpiRevenue}
          {kpiOverdue}
          {kpiContracts}
          <KPICard
            label={t('dashboard.kpi.collectionRate')}
            value={`${business.collectionRate}%`}
            subtitle={t('dashboard.kpi.mrrSubtitle', { value: fmt(business.mrr) })}
            icon={TrendingUp}
            color={business.collectionRate >= 80 ? 'text-green-600' : 'text-amber-600'}
            bgColor={business.collectionRate >= 80 ? 'bg-[var(--clr-success-dim)]' : 'bg-[var(--clr-caution-dim)]'}
            onClick={() => nav(View.INVOICES)}
          />
        </div>
      );
    }
    if (roleFamily === 'SUPPORT') {
      return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {kpiTickets}
          <KPICard
            label={t('dashboard.kpi.critical')}
            value={support.critical}
            subtitle={t('dashboard.kpi.avgResolutionSubtitle', { hours: support.avgResolution })}
            icon={AlertTriangle}
            color={support.critical > 0 ? 'text-red-600' : 'text-green-600'}
            bgColor={support.critical > 0 ? 'bg-[var(--clr-danger-dim)]' : 'bg-[var(--clr-success-dim)]'}
            onClick={() => nav(View.SUPPORT)}
          />
          <KPICard
            label={t('dashboard.kpi.resolvedPeriod')}
            value={support.resolved}
            subtitle={t('dashboard.kpi.inProgressCount', { count: support.inProgress })}
            icon={Headphones}
            color="text-green-600"
            bgColor="bg-[var(--clr-success-dim)]"
            onClick={() => nav(View.SUPPORT)}
          />
          {kpiFleet}
        </div>
      );
    }
    // FULL (ADMIN, MANAGER, SUPERADMIN, etc.)
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpiFleet}
        {kpiContracts}
        {kpiRevenue}
        {kpiTickets}
        {kpiTech}
        {kpiStock}
      </div>
    );
  };

  const renderFleetRealtime = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Fleet status cards + stats */}
      <div className="lg:col-span-2 space-y-3">
        <SectionHeader
          title={t('dashboard.fleetRealtime.title')}
          icon={Activity}
          onViewAll={() => nav(View.FLEET)}
          badge={t('dashboard.fleetRealtime.vehicleCount', { count: fleet.total })}
        />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            {
              label: t('dashboard.fleetRealtime.statusMoving'),
              value: fleet.moving,
              icon: Activity,
              color: 'text-[var(--status-moving)]',
              accentColor: 'var(--status-moving)',
            },
            {
              label: t('dashboard.fleetRealtime.statusIdle'),
              value: fleet.stopped + fleet.idle,
              icon: PauseCircle,
              color: 'text-[var(--status-idle)]',
              accentColor: 'var(--status-idle)',
            },
            {
              label: t('dashboard.fleetRealtime.statusOffline'),
              value: fleet.offline,
              icon: WifiOff,
              color: 'text-[var(--status-offline)]',
              accentColor: 'var(--status-offline)',
            },
            {
              label: t('dashboard.fleetRealtime.statusAlerts'),
              value: fleet.alertsCount,
              icon: AlertCircle,
              color: fleet.alertsCount > 0 ? 'text-[var(--status-stopped)]' : 'text-[var(--status-moving)]',
              accentColor: fleet.alertsCount > 0 ? 'var(--status-stopped)' : 'var(--status-moving)',
            },
          ].map((s, i) => (
            <div
              key={i}
              className="bg-[var(--bg-surface)] rounded-[12px] border border-[var(--border)] overflow-hidden"
              style={{ borderLeft: `4px solid ${s.accentColor}` }}
            >
              <div className="flex items-center justify-between p-3">
                <div>
                  <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wide">{s.label}</p>
                  <p className={`text-xl font-bold tabular-nums ${s.color}`}>{s.value}</p>
                </div>
                <div className="p-2 rounded-full bg-[var(--bg-elevated)]">
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            {
              label: t('dashboard.fleetRealtime.kmToday'),
              value: fmt(fleet.kmToday),
              icon: Route,
              color: 'text-purple-600',
            },
            {
              label: t('dashboard.fleetRealtime.utilization'),
              value: `${fleet.utilization}%`,
              icon: Gauge,
              color: 'text-emerald-600',
            },
            {
              label: t('dashboard.fleetRealtime.maintenance7d'),
              value: fleet.maintenanceDue,
              icon: Calendar,
              color: fleet.maintenanceDue > 0 ? 'text-rose-600' : 'text-[var(--text-secondary)]',
            },
            {
              label: t('dashboard.fleetRealtime.safetyScore'),
              value: `${metrics.avgDriverScore}/100`,
              icon: Shield,
              color: metrics.avgDriverScore > 80 ? 'text-green-600' : 'text-amber-600',
            },
          ].map((m, i) => (
            <div
              key={i}
              className="bg-[var(--bg-surface)] p-3 rounded-xl border border-[var(--border)] flex items-center gap-3"
            >
              <div className="p-2 bg-[var(--bg-elevated)] rounded-lg">
                <m.icon className={`w-4 h-4 ${m.color}`} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase">{m.label}</p>
                <p className={`text-lg font-bold ${m.color}`}>{m.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Donut: Vehicle Status */}
      <Card title={t('dashboard.fleetRealtime.distribution')}>
        <div className="h-[280px] flex flex-col items-center justify-center relative" style={{ minHeight: 260 }}>
          <ResponsiveContainer
            width="100%"
            height="100%"
            minHeight={260}
            initialDimension={{ width: 200, height: 260 }}
          >
            <PieChart>
              <Pie
                data={statusDonut}
                cx="50%"
                cy="45%"
                innerRadius={50}
                outerRadius={70}
                paddingAngle={4}
                dataKey="value"
                stroke={isDarkMode ? '#1e293b' : '#fff'}
                strokeWidth={2}
                className="cursor-pointer"
              >
                {statusDonut.map((entry, i) => (
                  <Cell key={i} fill={entry.color} className="hover:opacity-80 transition-opacity" />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: unknown) =>
                  t(
                    (value as number) === 1
                      ? 'dashboard.fleetRealtime.vehicleCountTooltip_one'
                      : 'dashboard.fleetRealtime.vehicleCountTooltip_other',
                    { count: value as number }
                  ) as unknown as string
                }
                contentStyle={tooltipStyle}
                itemStyle={tooltipItemStyle}
              />
              <Legend
                verticalAlign="bottom"
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: '10px', color: chartText, paddingTop: '8px' }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
            <span className="text-3xl font-bold text-[var(--text-primary)]">{fleet.total}</span>
            <p className="text-[10px] text-[var(--text-muted)]">{t('dashboard.fleetRealtime.vehicles')}</p>
          </div>
        </div>
      </Card>
    </div>
  );

  const renderBusinessFinance = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card>
        <SectionHeader title={t('dashboard.business.finance')} icon={TrendingUp} onViewAll={() => nav(View.INVOICES)} />
        <div className="space-y-1">
          <MiniStat
            label={t('dashboard.business.revenuePeriod')}
            value={fmt(business.revenue)}
            color="text-green-600"
            onClick={() => nav(View.INVOICES)}
          />
          <MiniStat
            label={t('dashboard.business.mrrContracts')}
            value={fmt(business.mrr)}
            color="text-[var(--primary)]"
            onClick={() => nav(View.CONTRACTS)}
          />
          <MiniStat
            label={t('dashboard.business.overdue')}
            value={fmt(business.overdue)}
            color={business.overdue > 0 ? 'text-red-600' : 'text-[var(--text-secondary)]'}
            onClick={() => nav(View.INVOICES)}
          />
          <MiniStat
            label={t('dashboard.business.overdueInvoices')}
            value={business.overdueCount}
            color={business.overdueCount > 0 ? 'text-red-600' : 'text-[var(--text-secondary)]'}
          />
          <MiniStat
            label={t('dashboard.business.collectionRate')}
            value={`${business.collectionRate}%`}
            color={business.collectionRate >= 80 ? 'text-green-600' : 'text-amber-600'}
          />
        </div>
      </Card>

      <Card>
        <SectionHeader title={t('dashboard.business.crmClients')} icon={Users} onViewAll={() => nav(View.CLIENTS)} />
        <div className="space-y-1">
          <MiniStat
            label={t('dashboard.business.activeClients')}
            value={fmt(business.totalClients)}
            onClick={() => nav(View.CLIENTS)}
          />
          <MiniStat label={t('dashboard.business.resellers')} value={business.resellers} />
          <MiniStat
            label={t('dashboard.business.activeLeads')}
            value={business.activeLeads}
            color="text-[var(--primary)]"
            onClick={() => nav(View.LEADS)}
          />
          <MiniStat label={t('dashboard.business.wonLeadsPeriod')} value={business.wonLeads} color="text-green-600" />
          <MiniStat
            label={t('dashboard.business.activeContracts')}
            value={business.activeContracts}
            onClick={() => nav(View.CONTRACTS)}
          />
        </div>
      </Card>

      <Card>
        <SectionHeader
          title={t('dashboard.business.supportTech')}
          icon={Headphones}
          onViewAll={() => nav(View.SUPPORT)}
        />
        <div className="space-y-1">
          <MiniStat
            label={t('dashboard.business.openTickets')}
            value={support.open}
            color={support.open > 10 ? 'text-red-600' : 'text-[var(--text-primary)]'}
            onClick={() => nav(View.SUPPORT)}
          />
          <MiniStat
            label={t('dashboard.business.ticketsInProgress')}
            value={support.inProgress}
            color="text-[var(--primary)]"
          />
          <MiniStat
            label={t('dashboard.business.critical')}
            value={support.critical}
            color={support.critical > 0 ? 'text-red-600' : 'text-green-600'}
          />
          <MiniStat label={t('dashboard.business.resolvedPeriod')} value={support.resolved} color="text-green-600" />
          {support.avgResolution > 0 && (
            <MiniStat
              label={t('dashboard.business.avgResolutionTime')}
              value={`${support.avgResolution}h`}
              color="text-violet-600"
            />
          )}
        </div>
        <div className="border-t border-[var(--border)] mt-3 pt-3">
          <SectionHeader title={t('dashboard.business.interventions')} icon={Wrench} onViewAll={() => nav(View.TECH)} />
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { label: t('dashboard.business.iStatusPending'), value: tech.pending, color: 'text-amber-600' },
              {
                label: t('dashboard.business.iStatusInProgress'),
                value: tech.inProgress,
                color: 'text-[var(--primary)]',
              },
              { label: t('dashboard.business.iStatusCompleted'), value: tech.completed, color: 'text-green-600' },
            ].map((s, i) => (
              <div key={i} className="bg-[var(--bg-elevated)] rounded-lg p-2">
                <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                <p className="text-[10px] text-[var(--text-muted)]">{s.label}</p>
              </div>
            ))}
          </div>
          {tech.total > 0 && (
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-[var(--text-muted)]">{t('dashboard.business.successRate')}</span>
              <div className="flex items-center gap-2">
                <div className="w-20 h-1.5 bg-[var(--border-strong)] rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: `${tech.successRate}%` }} />
                </div>
                <span className="text-xs font-bold text-green-600">{tech.successRate}%</span>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );

  const renderCharts = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card icon={BarChart3} title={t('dashboard.charts.fleetActivity')}>
        <div className="h-[250px] w-full" style={{ minHeight: 230 }}>
          {activityData.length > 0 ? (
            <ResponsiveContainer
              width="100%"
              height="100%"
              minHeight={200}
              initialDimension={{ width: 200, height: 230 }}
            >
              <AreaChart data={activityData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="gSpeed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#E8771A" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#E8771A" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartGrid} />
                <XAxis
                  dataKey="time"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: chartText, fontSize: 10 }}
                  dy={5}
                  interval="preserveStartEnd"
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: chartText, fontSize: 10 }} width={35} />
                <Tooltip contentStyle={tooltipStyle} itemStyle={tooltipItemStyle} />
                <Area
                  type="monotone"
                  dataKey="speed"
                  stroke="#E8771A"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#gSpeed)"
                  name={t('dashboard.charts.avgSpeed')}
                />
                <Area
                  type="monotone"
                  dataKey="active"
                  stroke="#22C55E"
                  strokeWidth={2}
                  fill="transparent"
                  name={t('dashboard.charts.active')}
                />
                <Legend
                  verticalAlign="top"
                  height={28}
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ color: chartText, fontSize: '11px' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full">
              <EmptyState
                compact
                icon={Activity}
                title={t('dashboard.charts.noData')}
                description={t('dashboard.charts.noActivity')}
              />
            </div>
          )}
        </div>
      </Card>

      <Card icon={AlertTriangle} title={t('dashboard.charts.alertTypes')}>
        <div className="h-[250px] w-full" style={{ minHeight: 230 }}>
          {alertsChart.length > 0 ? (
            <ResponsiveContainer
              width="100%"
              height="100%"
              minHeight={200}
              initialDimension={{ width: 200, height: 230 }}
            >
              <BarChart layout="vertical" data={alertsChart} margin={{ top: 5, right: 20, left: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={chartGrid} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={120} tick={{ fill: chartText, fontSize: 11 }} />
                <Tooltip
                  cursor={{ fill: isDarkMode ? '#334155' : '#f8fafc' }}
                  contentStyle={tooltipStyle}
                  itemStyle={tooltipItemStyle}
                />
                <Bar
                  dataKey="value"
                  fill="#ef4444"
                  radius={[0, 4, 4, 0]}
                  barSize={18}
                  name={t('dashboard.charts.alerts')}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full">
              <EmptyState
                compact
                icon={Bell}
                title={t('dashboard.charts.noAlerts')}
                description={t('dashboard.charts.noAlertsPeriod')}
              />
            </div>
          )}
        </div>
      </Card>

      {/* Revenue chart (from backend) */}
      <Card icon={DollarSign} title={t('dashboard.charts.revenueBilling')}>
        <div className="h-[250px] w-full" style={{ minHeight: 230 }}>
          {revenueChartData.length > 0 ? (
            <ResponsiveContainer
              width="100%"
              height="100%"
              minHeight={200}
              initialDimension={{ width: 200, height: 230 }}
            >
              <BarChart data={revenueChartData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartGrid} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: chartText, fontSize: 10 }} />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: chartText, fontSize: 10 }}
                  width={50}
                  tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  itemStyle={tooltipItemStyle}
                  formatter={(value: unknown) => formatPrice(value as number)}
                />
                <Bar
                  dataKey="revenue"
                  fill="#22c55e"
                  radius={[4, 4, 0, 0]}
                  barSize={16}
                  name={t('dashboard.charts.paid')}
                />
                <Bar
                  dataKey="invoiced"
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                  barSize={16}
                  name={t('dashboard.charts.invoiced')}
                />
                <Bar
                  dataKey="overdue"
                  fill="#ef4444"
                  radius={[4, 4, 0, 0]}
                  barSize={16}
                  name={t('dashboard.charts.unpaid')}
                />
                <Legend
                  verticalAlign="top"
                  height={28}
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ color: chartText, fontSize: '11px' }}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full">
              <EmptyState
                compact
                icon={Receipt}
                title={t('dashboard.charts.noBilling')}
                description={t('dashboard.charts.noBillingPeriod')}
              />
            </div>
          )}
        </div>
      </Card>

      {/* Cost chart (from backend) */}
      <Card icon={Wrench} title={t('dashboard.charts.costInterventions')}>
        <div className="h-[250px] w-full" style={{ minHeight: 230 }}>
          {costChartData.length > 0 ? (
            <ResponsiveContainer
              width="100%"
              height="100%"
              minHeight={200}
              initialDimension={{ width: 200, height: 230 }}
            >
              <AreaChart data={costChartData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="gCost" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartGrid} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: chartText, fontSize: 10 }} />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: chartText, fontSize: 10 }}
                  width={50}
                  tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  itemStyle={tooltipItemStyle}
                  formatter={(value: unknown, name: unknown) =>
                    name === t('dashboard.charts.cost') ? formatPrice(value as number) : (value as number)
                  }
                />
                <Area
                  type="monotone"
                  dataKey="cost"
                  stroke="#f97316"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#gCost)"
                  name={t('dashboard.charts.cost')}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  fill="transparent"
                  name={t('dashboard.charts.interventionCount')}
                />
                <Legend
                  verticalAlign="top"
                  height={28}
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ color: chartText, fontSize: '11px' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full">
              <EmptyState
                compact
                icon={Wrench}
                title={t('dashboard.charts.noIntervention')}
                description={t('dashboard.charts.noInterventionPeriod')}
              />
            </div>
          )}
        </div>
      </Card>
    </div>
  );

  const renderBottomRow = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <Card>
        <SectionHeader
          title={t('dashboard.bottomRow.stockMaterial')}
          icon={Package}
          onViewAll={() => nav(View.STOCK)}
        />
        <div className="space-y-2">
          <StatusBadge
            count={stockStats.inStock}
            label={t('dashboard.bottomRow.boxesInStock')}
            color="text-green-600"
            dotColor="bg-green-500"
          />
          <StatusBadge
            count={stockStats.installed}
            label={t('dashboard.bottomRow.boxesInstalled')}
            color="text-[var(--primary)]"
            dotColor="bg-[var(--primary)]"
          />
          <StatusBadge
            count={stockStats.rma}
            label={t('dashboard.bottomRow.rma')}
            color={stockStats.rma > 0 ? 'text-amber-600' : 'text-[var(--text-secondary)]'}
            dotColor={stockStats.rma > 0 ? 'bg-amber-500' : 'bg-[var(--text-secondary)]'}
          />
          <StatusBadge
            count={stockStats.simsInStock}
            label={t('dashboard.bottomRow.simInStock')}
            color="text-cyan-600"
            dotColor="bg-cyan-500"
          />
          <StatusBadge
            count={stockStats.simsActive}
            label={t('dashboard.bottomRow.simActive')}
            color="text-indigo-600"
            dotColor="bg-indigo-500"
          />
        </div>
        {stockStats.totalBoxes > 0 && (
          <div className="mt-3 pt-3 border-t border-[var(--border)]">
            <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-1">
              <span>{t('dashboard.bottomRow.installation')}</span>
              <span className="font-bold text-[var(--text-secondary)]">
                {pct(stockStats.installed, stockStats.totalBoxes)}%
              </span>
            </div>
            <div className="w-full h-2 bg-[var(--border-strong)] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  backgroundColor: 'var(--primary)',
                  width: `${pct(stockStats.installed, stockStats.totalBoxes)}%`,
                }}
              />
            </div>
          </div>
        )}
      </Card>

      <Card>
        <SectionHeader
          title={t('dashboard.bottomRow.upcomingMaintenance')}
          icon={Calendar}
          onViewAll={() => nav(View.FLEET)}
        />
        <div className="space-y-2">
          {upcomingMaintenance.length > 0 ? (
            upcomingMaintenance.map((v, i) => (
              <div key={i} className="flex items-center justify-between p-2 bg-[var(--bg-elevated)] rounded-lg">
                <div className="flex items-center gap-2">
                  <div
                    className="w-1.5 h-6 rounded-full"
                    style={{ backgroundColor: v.overdue ? 'var(--status-stopped)' : 'var(--primary)' }}
                  />
                  <div>
                    <p className="text-xs font-bold text-[var(--text-primary)]">{v.name}</p>
                    <p className="text-[10px] text-[var(--text-muted)]">{v.plate || '-'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-xs font-medium ${v.overdue ? 'text-red-600' : 'text-[var(--text-secondary)]'}`}>
                    {v.date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                  </p>
                  <p className={`text-[10px] ${v.overdue ? 'text-red-500 font-bold' : 'text-[var(--text-muted)]'}`}>
                    {v.overdue
                      ? t('dashboard.bottomRow.daysLate', { days: Math.abs(v.daysLeft) })
                      : t('dashboard.bottomRow.daysLeft', { days: v.daysLeft })}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <EmptyState
              compact
              icon={Wrench}
              title={t('dashboard.bottomRow.noMaintenance')}
              description={t('dashboard.bottomRow.noMaintenanceDesc')}
            />
          )}
        </div>
      </Card>

      <Card>
        <SectionHeader
          title={t('dashboard.bottomRow.recentAlerts')}
          icon={AlertCircle}
          badge={recentAlerts.length || undefined}
        />
        <div className="space-y-1.5 max-h-[280px] overflow-y-auto">
          {recentAlerts.length > 0 ? (
            recentAlerts.map((alert: Alert, i: number) => (
              /* Barre latérale rouge — miroir Card accent mobile */
              <div
                key={i}
                className="flex items-stretch rounded-[10px] border border-[var(--border)] overflow-hidden"
                style={{ backgroundColor: 'var(--bg-elevated)' }}
              >
                <div className="w-1 shrink-0" style={{ backgroundColor: 'var(--status-stopped)' }} />
                <div className="flex items-start gap-2 p-2.5 flex-1 min-w-0">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: 'var(--status-stopped)' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[var(--text-primary)] truncate">
                      {alert.vehicleName || alert.type || t('dashboard.bottomRow.vehicleAlert')}
                    </p>
                    {alert.message && (
                      <p className="text-[10px] text-[var(--text-muted)] truncate leading-tight">{alert.message}</p>
                    )}
                  </div>
                  <p className="text-[10px] text-[var(--text-muted)] shrink-0 tabular-nums">
                    {new Date(alert.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <EmptyState
              compact
              icon={Bell}
              title={t('dashboard.charts.noAlerts')}
              description={t('dashboard.bottomRow.noRecentAlerts')}
            />
          )}
        </div>
      </Card>
    </div>
  );

  // --- Section renderers map ---
  const sectionRenderers: Record<DashboardSectionId, () => React.ReactNode> = {
    'banner-kpi': renderBannerKpi,
    'fleet-realtime': renderFleetRealtime,
    'business-finance': renderBusinessFinance,
    charts: renderCharts,
    'bottom-row': renderBottomRow,
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      {/* ERROR BANNER */}
      {fetchError && (
        <div
          className="flex items-center gap-3 p-3 rounded-lg"
          style={{
            backgroundColor: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.3)',
            color: 'var(--color-error)',
          }}
        >
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{fetchError}</span>
          <button
            onClick={() => setRefreshTrigger((prev) => prev + 1)}
            className="ml-auto px-3 py-1 text-xs font-medium rounded transition-colors bg-red-100 dark:bg-red-800 hover:bg-red-200 dark:hover:bg-red-700"
          >
            {t('dashboard.header.retry')}
          </button>
        </div>
      )}

      {/* HEADER — salutation contextuelle (inspiré mobile DashboardScreen) */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-[var(--text-primary)]">
              {(() => {
                const hour = new Date().getHours();
                const greet =
                  hour < 12
                    ? t('dashboard.header.greetingMorning')
                    : hour < 18
                      ? t('dashboard.header.greetingAfternoon')
                      : t('dashboard.header.greetingEvening');
                const first = user?.name?.split(' ')[0];
                if (roleFamily === 'CLIENT') return `${greet}${first ? `, ${first}` : ''}`;
                if (roleFamily === 'TECH') return t('dashboard.header.techTitle');
                if (roleFamily === 'COMMERCIAL') return t('dashboard.header.commercialTitle');
                if (roleFamily === 'FINANCE') return t('dashboard.header.financeTitle');
                if (roleFamily === 'SUPPORT') return t('dashboard.header.supportTitle');
                return t('dashboard.header.defaultTitle');
              })()}
            </h1>
            <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              {loading
                ? t('dashboard.header.loading')
                : lastRefresh.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <p className="text-xs text-[var(--text-muted)] hidden sm:block">
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DateRangeSelector
            periodPreset={periodPreset}
            setPeriodPreset={setPeriodPreset}
            customDateRange={customDateRange}
            setCustomDateRange={setCustomDateRange}
          />
          <button
            onClick={() => setEditMode((prev) => !prev)}
            title={editMode ? t('dashboard.header.exitEditMode') : t('dashboard.header.customizeLayout')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
              editMode
                ? 'text-white border border-[var(--primary)]'
                : 'border border-[var(--border)] hover:bg-[var(--bg-elevated)]'
            }`}
            style={
              editMode
                ? { backgroundColor: 'var(--primary)' }
                : { backgroundColor: 'var(--bg-surface)', color: 'var(--text-secondary)' }
            }
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{editMode ? t('dashboard.header.done') : ''}</span>
          </button>
          {editMode && (
            <button
              onClick={resetLayout}
              title={t('dashboard.header.resetLayout')}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-[var(--border)] rounded-lg hover:bg-[var(--bg-elevated)] transition-colors"
              style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-secondary)' }}
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
          {hiddenCount > 0 && !editMode && (
            <button
              onClick={() => setEditMode(true)}
              title={t(
                hiddenCount === 1 ? 'dashboard.header.hiddenSections_one' : 'dashboard.header.hiddenSections_other',
                { count: hiddenCount }
              )}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-amber-600 bg-[var(--clr-caution-dim)] border border-amber-200 dark:border-amber-700 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
            >
              <EyeOff className="w-3.5 h-3.5" /> {hiddenCount}
            </button>
          )}
          <button
            onClick={handleExport}
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-[var(--border)] rounded-lg hover:bg-[var(--bg-elevated)] transition-colors"
            style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-secondary)' }}
          >
            <Download className="w-3.5 h-3.5" /> {t('dashboard.header.export')}
          </button>
        </div>
      </div>

      {/* Edit mode banner */}
      {editMode && (
        <div
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs"
          style={{ backgroundColor: 'var(--primary-dim)', border: '1px solid var(--primary)', color: 'var(--primary)' }}
        >
          <Settings2 className="w-4 h-4 flex-shrink-0" />
          <span className="font-bold">{t('dashboard.header.editModeBanner')}</span>
          <span style={{ opacity: 0.8 }}>{t('dashboard.header.editModeHint')}</span>
        </div>
      )}

      {/* DRAGGABLE SECTIONS */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sectionOrder} strategy={verticalListSortingStrategy}>
          <div className="space-y-6">
            {sections.map((section) => {
              // Sections non pertinentes pour ce rôle : masquées, non affichées même en edit
              if (!isSectionAllowedForRole(section.id, roleFamily)) return null;
              const labelKey: Record<DashboardSectionId, string> = {
                'banner-kpi': 'dashboard.sections.kpiMain',
                'fleet-realtime': 'dashboard.sections.fleetRealtime',
                'business-finance': 'dashboard.sections.businessFinance',
                charts: 'dashboard.sections.charts',
                'bottom-row': 'dashboard.sections.bottomRow',
              };
              return (
                <DraggableSection
                  key={section.id}
                  id={section.id}
                  label={t(labelKey[section.id])}
                  collapsed={section.collapsed}
                  hidden={section.hidden}
                  editMode={editMode}
                  onToggleCollapse={toggleCollapse}
                  onToggleHidden={toggleHidden}
                >
                  {sectionRenderers[section.id]()}
                </DraggableSection>
              );
            })}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
};
