import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { startOfDay, startOfWeek, startOfMonth, startOfYear } from 'date-fns';
import type { Intervention, SystemUser } from '../../../types';
import { Card } from '../../../components/Card';
import { useDataContext } from '../../../contexts/DataContext';
import { useCurrency } from '../../../hooks/useCurrency';
import {
  Wrench,
  Clock,
  TrendingUp,
  CheckCircle,
  LayoutTemplate,
  AlertTriangle,
  AlertCircle,
  CalendarClock,
  XCircle,
  Timer,
  Banknote,
  Ban,
  Target,
  Hourglass,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from 'recharts';
import { calculateResolutionStats, calculateResponseTime, formatDuration } from '../utils/resolutionTime';

interface TechStatsProps {
  interventions: Intervention[];
  technicians: SystemUser[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#a4de6c'];

export const TechStats: React.FC<TechStatsProps> = ({ interventions, technicians }) => {
  const { tiers } = useDataContext();
  const { formatPrice, currency } = useCurrency();
  const getClientName = useCallback(
    (clientId: string | undefined) => {
      if (!clientId) return 'Client';
      const client = tiers.find((t) => t.id === clientId);
      return client?.name || clientId.substring(0, 8) + '...';
    },
    [tiers]
  );
  const [statsPeriod, setStatsPeriod] = useState('THIS_MONTH');
  const [visibleCharts, setVisibleCharts] = useState({
    tech: true,
    nature: true,
    material: true,
    vehicle: true,
    period: true,
    status: true,
    clients: true,
  });
  const [isChartMenuOpen, setIsChartMenuOpen] = useState(false);
  const chartMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (chartMenuRef.current && !chartMenuRef.current.contains(event.target as Node)) {
        setIsChartMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleChart = (chartId: keyof typeof visibleCharts) => {
    setVisibleCharts((prev) => ({ ...prev, [chartId]: !prev[chartId] }));
  };

  // --- CALCUL DES STATS DYNAMIQUES ---

  const stats = useMemo(() => {
    // Filtrer par période sélectionnée
    const now = new Date();
    let periodStart: Date;
    switch (statsPeriod) {
      case 'TODAY':
        periodStart = startOfDay(now);
        break;
      case 'THIS_WEEK':
        periodStart = startOfWeek(now, { weekStartsOn: 1 });
        break;
      case 'THIS_YEAR':
        periodStart = startOfYear(now);
        break;
      case 'THIS_MONTH':
      default:
        periodStart = startOfMonth(now);
        break;
    }
    const filtered = interventions.filter((i) => i.scheduledDate && new Date(i.scheduledDate) >= periodStart);

    const totalInterventions = filtered.length;
    const pending = filtered.filter((i) => i.status === 'PENDING' || i.status === 'SCHEDULED').length;
    const completed = filtered.filter((i) => i.status === 'COMPLETED').length;
    const cancelled = filtered.filter((i) => i.status === 'CANCELLED').length;
    const postponed = filtered.filter((i) => i.status === 'POSTPONED').length;
    const successRate = totalInterventions > 0 ? Math.round((completed / totalInterventions) * 100) : 0;

    // Chiffre d'affaires
    const revenue = filtered
      .filter((i) => i.status === 'COMPLETED')
      .reduce((sum, i) => {
        const itemsTotal = (i.invoiceItems || []).reduce(
          (s, item) => s + (item.total ?? item.unitPrice * item.quantity),
          0
        );
        return sum + (itemsTotal || i.cost || 0);
      }, 0);

    // Temps de résolution
    const resolutionStats = calculateResolutionStats(filtered);

    // Temps de réponse moyen (createdAt → startTime)
    const responseTimes = filtered.map(calculateResponseTime).filter((t): t is number => t !== null);
    const avgResponseTime =
      responseTimes.length > 0 ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) : null;

    // Taux de ponctualité (terminées dans les temps SLA)
    const completedFiltered = filtered.filter((i) => i.status === 'COMPLETED');
    const onTimeCount = completedFiltered.filter((i) => {
      if (!i.endTime || !i.scheduledDate) return false;
      const scheduled = new Date(i.scheduledDate);
      const ended = new Date(i.endTime);
      // Considéré ponctuel si terminé le jour prévu ou avant
      const scheduledEnd = new Date(scheduled);
      scheduledEnd.setHours(23, 59, 59);
      return ended <= scheduledEnd;
    }).length;
    const punctualityRate =
      completedFiltered.length > 0 ? Math.round((onTimeCount / completedFiltered.length) * 100) : 0;

    // Alertes SLA
    const overdue = filtered.filter((i) => {
      if (i.status === 'COMPLETED' || i.status === 'CANCELLED') return false;
      const scheduled = new Date(i.scheduledDate);
      return scheduled < now;
    });
    const atRisk = filtered.filter((i) => {
      if (i.status === 'COMPLETED' || i.status === 'CANCELLED') return false;
      const scheduled = new Date(i.scheduledDate);
      const hoursUntil = (scheduled.getTime() - now.getTime()) / (1000 * 60 * 60);
      return hoursUntil > 0 && hoursUntil <= 24;
    });
    const unassigned = filtered.filter((i) => !i.technicianId || i.technicianId === 'UNASSIGNED');
    const inProgress = filtered.filter((i) => i.status === 'IN_PROGRESS' || i.status === 'EN_ROUTE');

    // 1. Intervention Par Technicien (Bar Chart)
    const techData = technicians.map((tech) => ({
      name: tech.name,
      count: filtered.filter((i) => i.technicianId === tech.id).length,
    }));

    // 2. Par Nature (Pie Chart)
    const natureData = filtered.reduce(
      (acc, curr) => {
        acc[curr.nature] = (acc[curr.nature] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
    const pieNatureData = Object.keys(natureData).map((k) => ({ name: k, value: natureData[k] }));

    // 3. Par Matériels (Bar Chart - Flatten Invoice Items)
    const materialCounts = filtered
      .flatMap((i) => i.invoiceItems || [])
      .reduce(
        (acc, item) => {
          const name = item.description;
          acc[name] = (acc[name] || 0) + item.quantity;
          return acc;
        },
        {} as Record<string, number>
      );
    const materialData = Object.keys(materialCounts)
      .map((k) => ({ name: k, count: materialCounts[k] }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // 4. Par Type d'Engin (Bar Chart)
    const vehicleTypeData = filtered.reduce(
      (acc, curr) => {
        const type = curr.vehicleType || 'Non spécifié';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
    const barVehicleData = Object.keys(vehicleTypeData).map((k) => ({ name: k, count: vehicleTypeData[k] }));

    // 5. Installations par Période (Dynamique par mois)
    const monthCounts = filtered.reduce(
      (acc, curr) => {
        const date = new Date(curr.scheduledDate);
        const month = date.toLocaleString('fr-FR', { month: 'short' });
        acc[month] = (acc[month] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
    const installData = Object.keys(monthCounts).map((k) => ({ period: k, count: monthCounts[k] }));

    // 6. Tendance 7 jours
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return date;
    });
    const trendData = last7Days.map((d) => {
      const dayStr = d.toLocaleDateString('fr-FR', { weekday: 'short' });
      const count = filtered.filter((i) => {
        const intDate = new Date(i.scheduledDate);
        return intDate.toDateString() === d.toDateString();
      }).length;
      return { day: dayStr, count };
    });

    // 7. Répartition par Statut (Donut)
    const STATUS_LABELS: Record<string, string> = {
      PENDING: 'En attente',
      SCHEDULED: 'Planifiée',
      EN_ROUTE: 'En route',
      IN_PROGRESS: 'En cours',
      COMPLETED: 'Terminée',
      CANCELLED: 'Annulée',
      POSTPONED: 'Reportée',
    };
    const STATUS_COLORS: Record<string, string> = {
      PENDING: '#94a3b8',
      SCHEDULED: '#3b82f6',
      EN_ROUTE: '#f59e0b',
      IN_PROGRESS: '#f97316',
      COMPLETED: '#22c55e',
      CANCELLED: '#ef4444',
      POSTPONED: '#a855f7',
    };
    const statusCounts = filtered.reduce(
      (acc, curr) => {
        acc[curr.status] = (acc[curr.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
    const statusData = Object.entries(statusCounts).map(([k, v]) => ({
      name: STATUS_LABELS[k] || k,
      value: v,
      fill: STATUS_COLORS[k] || '#64748b',
    }));

    // 8. Top 5 Clients
    const clientCounts = filtered.reduce(
      (acc, curr) => {
        const name = getClientName(curr.clientId);
        acc[name] = (acc[name] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
    const topClientsData = Object.entries(clientCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    return {
      totalInterventions,
      pending,
      completed,
      cancelled,
      postponed,
      successRate,
      revenue,
      avgResponseTime,
      punctualityRate,
      overdue,
      atRisk,
      unassigned,
      inProgress,
      resolutionStats,
      techData,
      pieNatureData,
      materialData,
      barVehicleData,
      installData,
      trendData,
      statusData,
      topClientsData,
    };
  }, [interventions, technicians, statsPeriod, getClientName]);

  return (
    <div className="space-y-6 overflow-y-auto h-full custom-scrollbar p-2">
      {/* HEADER & FILTER BAR */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[var(--bg-elevated)] p-4 rounded-xl border border-[var(--border)] shadow-sm">
        <div>
          <h3 className="font-bold text-lg text-[var(--text-primary)]">Performance Technique</h3>
          <p className="text-xs text-[var(--text-secondary)]">Analyse dynamique des interventions.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative" ref={chartMenuRef}>
            <button
              onClick={() => setIsChartMenuOpen(!isChartMenuOpen)}
              className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
            >
              <LayoutTemplate className="w-4 h-4" /> Gérer les graphiques
            </button>
            {isChartMenuOpen && (
              <div className="absolute top-full right-0 mt-2 w-56 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg shadow-xl z-50 p-2 animate-in fade-in slide-in-from-top-2">
                <p className="text-xs font-bold text-[var(--text-secondary)] uppercase px-2 py-1">Affichage</p>
                <label className="flex items-center gap-2 px-2 py-1.5 hover:bg-[var(--bg-elevated)] dark:hover:bg-slate-700 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={visibleCharts.tech}
                    onChange={() => toggleChart('tech')}
                    className="rounded border-[var(--border)] text-[var(--primary)]"
                  />
                  <span className="text-sm text-[var(--text-primary)]">Par Technicien</span>
                </label>
                <label className="flex items-center gap-2 px-2 py-1.5 hover:bg-[var(--bg-elevated)] dark:hover:bg-slate-700 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={visibleCharts.nature}
                    onChange={() => toggleChart('nature')}
                    className="rounded border-[var(--border)] text-[var(--primary)]"
                  />
                  <span className="text-sm text-[var(--text-primary)]">Par Nature</span>
                </label>
                <label className="flex items-center gap-2 px-2 py-1.5 hover:bg-[var(--bg-elevated)] dark:hover:bg-slate-700 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={visibleCharts.material}
                    onChange={() => toggleChart('material')}
                    className="rounded border-[var(--border)] text-[var(--primary)]"
                  />
                  <span className="text-sm text-[var(--text-primary)]">Par Matériel</span>
                </label>
                <label className="flex items-center gap-2 px-2 py-1.5 hover:bg-[var(--bg-elevated)] dark:hover:bg-slate-700 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={visibleCharts.vehicle}
                    onChange={() => toggleChart('vehicle')}
                    className="rounded border-[var(--border)] text-[var(--primary)]"
                  />
                  <span className="text-sm text-[var(--text-primary)]">Par Engin</span>
                </label>
                <label className="flex items-center gap-2 px-2 py-1.5 hover:bg-[var(--bg-elevated)] dark:hover:bg-slate-700 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={visibleCharts.period}
                    onChange={() => toggleChart('period')}
                    className="rounded border-[var(--border)] text-[var(--primary)]"
                  />
                  <span className="text-sm text-[var(--text-primary)]">Evolution</span>
                </label>
                <label className="flex items-center gap-2 px-2 py-1.5 hover:bg-[var(--bg-elevated)] dark:hover:bg-slate-700 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={visibleCharts.status}
                    onChange={() => toggleChart('status')}
                    className="rounded border-[var(--border)] text-[var(--primary)]"
                  />
                  <span className="text-sm text-[var(--text-primary)]">Par Statut</span>
                </label>
                <label className="flex items-center gap-2 px-2 py-1.5 hover:bg-[var(--bg-elevated)] dark:hover:bg-slate-700 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={visibleCharts.clients}
                    onChange={() => toggleChart('clients')}
                    className="rounded border-[var(--border)] text-[var(--primary)]"
                  />
                  <span className="text-sm text-[var(--text-primary)]">Top Clients</span>
                </label>
              </div>
            )}
          </div>
          <div className="h-6 w-px bg-slate-200 bg-[var(--bg-elevated)] mx-1"></div>
          <select
            value={statsPeriod}
            onChange={(e) => setStatsPeriod(e.target.value)}
            title="Sélectionner la période"
            className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--primary)] text-[var(--text-primary)]"
          >
            <option value="TODAY">Aujourd'hui</option>
            <option value="THIS_WEEK">Cette semaine</option>
            <option value="THIS_MONTH">Ce mois</option>
            <option value="THIS_YEAR">Cette année</option>
          </select>
        </div>
      </div>

      {/* KPI CARDS - Vue 360° */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-[var(--bg-elevated)] p-4 rounded-xl border border-[var(--border)] shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-[var(--text-secondary)] uppercase font-bold">Total</p>
              <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">{stats.totalInterventions}</p>
            </div>
            <div className="p-2 bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] rounded text-[var(--primary)]">
              <Wrench className="w-5 h-5" />
            </div>
          </div>
        </div>
        <div className="bg-[var(--bg-elevated)] p-4 rounded-xl border border-[var(--border)] shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-[var(--text-secondary)] uppercase font-bold">En Attente</p>
              <p className="text-2xl font-bold text-[var(--text-secondary)] mt-1">{stats.pending}</p>
            </div>
            <div className="p-2 bg-[var(--bg-elevated)] rounded text-[var(--text-secondary)]">
              <Hourglass className="w-5 h-5" />
            </div>
          </div>
        </div>
        <div className="bg-[var(--bg-elevated)] p-4 rounded-xl border border-[var(--border)] shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-[var(--text-secondary)] uppercase font-bold">En Cours</p>
              <p className="text-2xl font-bold text-orange-600 mt-1">{stats.inProgress.length}</p>
            </div>
            <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded text-orange-600">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </div>
        <div className="bg-[var(--bg-elevated)] p-4 rounded-xl border border-[var(--border)] shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-[var(--text-secondary)] uppercase font-bold">Terminées</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{stats.completed}</p>
            </div>
            <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded text-green-600">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>
        </div>
        <div className="bg-[var(--bg-elevated)] p-4 rounded-xl border border-[var(--border)] shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-[var(--text-secondary)] uppercase font-bold">Annulées</p>
              <p className="text-2xl font-bold text-red-500 mt-1">{stats.cancelled}</p>
              {stats.postponed > 0 && (
                <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                  {stats.postponed} reportée{stats.postponed > 1 ? 's' : ''}
                </p>
              )}
            </div>
            <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded text-red-500">
              <Ban className="w-5 h-5" />
            </div>
          </div>
        </div>
        <div className="bg-[var(--bg-elevated)] p-4 rounded-xl border border-[var(--border)] shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-[var(--text-secondary)] uppercase font-bold">Taux Succès</p>
              <p className="text-2xl font-bold text-purple-600 mt-1">{stats.successRate}%</p>
            </div>
            <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded text-purple-600">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
        </div>
        <div className="bg-[var(--bg-elevated)] p-4 rounded-xl border border-[var(--border)] shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-[var(--text-secondary)] uppercase font-bold">Ponctualité</p>
              <p className="text-2xl font-bold text-teal-600 mt-1">{stats.punctualityRate}%</p>
            </div>
            <div className="p-2 bg-teal-50 dark:bg-teal-900/20 rounded text-teal-600">
              <Target className="w-5 h-5" />
            </div>
          </div>
        </div>
        <div className="bg-[var(--bg-elevated)] p-4 rounded-xl border border-[var(--border)] shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-[var(--text-secondary)] uppercase font-bold">Temps Moyen</p>
              <p className="text-lg font-bold text-cyan-600 mt-1">
                {stats.resolutionStats.average !== null ? formatDuration(stats.resolutionStats.average) : '-'}
              </p>
              {stats.resolutionStats.median !== null && (
                <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                  Médian: {formatDuration(stats.resolutionStats.median)}
                </p>
              )}
            </div>
            <div className="p-2 bg-cyan-50 dark:bg-cyan-900/20 rounded text-cyan-600">
              <Timer className="w-5 h-5" />
            </div>
          </div>
        </div>
        <div className="bg-[var(--bg-elevated)] p-4 rounded-xl border border-[var(--border)] shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-[var(--text-secondary)] uppercase font-bold">Réactivité</p>
              <p className="text-lg font-bold text-indigo-600 mt-1">
                {stats.avgResponseTime !== null ? formatDuration(stats.avgResponseTime) : '-'}
              </p>
              <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Création → Début</p>
            </div>
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded text-indigo-600">
              <CalendarClock className="w-5 h-5" />
            </div>
          </div>
        </div>
        <div className="bg-[var(--bg-elevated)] p-4 rounded-xl border border-[var(--border)] shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-[var(--text-secondary)] uppercase font-bold">Chiffre Aff.</p>
              <p className="text-lg font-bold text-emerald-600 mt-1">
                {stats.revenue > 0 ? formatPrice(stats.revenue) : '0'}
              </p>
              <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{currency}</p>
            </div>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded text-emerald-600">
              <Banknote className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* ALERTES SLA */}
      {(stats.overdue.length > 0 || stats.atRisk.length > 0 || stats.unassigned.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {stats.overdue.length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-200 dark:border-red-800">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 dark:bg-red-900/40 rounded-lg">
                  <XCircle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-700 dark:text-red-400">{stats.overdue.length}</p>
                  <p className="text-xs font-bold text-red-600 dark:text-red-300 uppercase">En Retard</p>
                </div>
              </div>
              <div className="mt-3 space-y-1 max-h-20 overflow-y-auto">
                {stats.overdue.slice(0, 3).map((i) => (
                  <p key={i.id} className="text-xs text-red-700 dark:text-red-300 truncate">
                    {getClientName(i.clientId)} - {i.nature || i.type}
                  </p>
                ))}
                {stats.overdue.length > 3 && (
                  <p className="text-xs text-red-500">+{stats.overdue.length - 3} autres...</p>
                )}
              </div>
            </div>
          )}
          {stats.atRisk.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-200 dark:border-amber-800">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{stats.atRisk.length}</p>
                  <p className="text-xs font-bold text-amber-600 dark:text-amber-300 uppercase">À Risque (24h)</p>
                </div>
              </div>
              <div className="mt-3 space-y-1 max-h-20 overflow-y-auto">
                {stats.atRisk.slice(0, 3).map((i) => (
                  <p key={i.id} className="text-xs text-amber-700 dark:text-amber-300 truncate">
                    {i.id} -{' '}
                    {new Date(i.scheduledDate).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                ))}
              </div>
            </div>
          )}
          {stats.unassigned.length > 0 && (
            <div className="bg-[var(--bg-elevated)]/50 p-4 rounded-xl border border-[var(--border)]">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-200 bg-[var(--bg-elevated)] rounded-lg">
                  <AlertCircle className="w-6 h-6 text-[var(--text-secondary)]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.unassigned.length}</p>
                  <p className="text-xs font-bold text-[var(--text-secondary)] uppercase">Non Assignées</p>
                </div>
              </div>
              <div className="mt-3 space-y-1 max-h-20 overflow-y-auto">
                {stats.unassigned.slice(0, 3).map((i) => (
                  <p key={i.id} className="text-xs text-[var(--text-secondary)] truncate">
                    {getClientName(i.clientId)} - {i.nature || i.type}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* CHARTS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-6">
        {visibleCharts.tech && (
          <Card title="Interventions par Technicien">
            <div className="h-[250px] w-full">
              <ResponsiveContainer
                width="100%"
                height="100%"
                minHeight={200}
                minWidth={200}
                initialDimension={{ width: 200, height: 200 }}
              >
                <BarChart data={stats.techData} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}
        {visibleCharts.nature && (
          <Card title="Répartition par Nature">
            <div className="h-[250px] w-full">
              <ResponsiveContainer
                width="100%"
                height="100%"
                minHeight={200}
                minWidth={200}
                initialDimension={{ width: 200, height: 200 }}
              >
                <RePieChart>
                  <Pie
                    data={stats.pieNatureData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label
                  >
                    {stats.pieNatureData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </RePieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}
        {visibleCharts.material && (
          <Card title="Matériels Installés (Top 10)">
            <div className="h-[300px] w-full">
              <ResponsiveContainer
                width="100%"
                height="100%"
                minHeight={200}
                minWidth={200}
                initialDimension={{ width: 200, height: 200 }}
              >
                <BarChart data={stats.materialData} layout="vertical" margin={{ left: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8884d8" radius={[0, 4, 4, 0]} barSize={15} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}
        {visibleCharts.vehicle && (
          <Card title="Interventions par Type d'Engin">
            <div className="h-[300px] w-full">
              <ResponsiveContainer
                width="100%"
                height="100%"
                minHeight={200}
                minWidth={200}
                initialDimension={{ width: 200, height: 200 }}
              >
                <BarChart data={stats.barVehicleData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#ffc658" radius={[4, 4, 0, 0]} barSize={30} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}
        {visibleCharts.period && (
          <Card title="Activité (Évolution Mensuelle)">
            <div className="h-[250px] w-full">
              <ResponsiveContainer
                width="100%"
                height="100%"
                minHeight={200}
                minWidth={200}
                initialDimension={{ width: 200, height: 200 }}
              >
                <BarChart data={stats.installData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#82ca9d" radius={[4, 4, 0, 0]} barSize={30} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}

        {/* Tendance 7 Jours */}
        <Card title="Tendance 7 Derniers Jours">
          <div className="h-[250px] w-full">
            <ResponsiveContainer
              width="100%"
              height="100%"
              minHeight={200}
              minWidth={200}
              initialDimension={{ width: 200, height: 200 }}
            >
              <LineChart data={stats.trendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Répartition par Statut */}
        {visibleCharts.status && stats.statusData.length > 0 && (
          <Card title="Répartition par Statut">
            <div className="h-[250px] w-full">
              <ResponsiveContainer
                width="100%"
                height="100%"
                minHeight={200}
                minWidth={200}
                initialDimension={{ width: 200, height: 200 }}
              >
                <RePieChart>
                  <Pie
                    data={stats.statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    dataKey="value"
                    label
                  >
                    {stats.statusData.map((entry, index) => (
                      <Cell key={`s-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </RePieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}

        {/* Top Clients */}
        {visibleCharts.clients && stats.topClientsData.length > 0 && (
          <Card title="Top Clients">
            <div className="h-[300px] w-full">
              <ResponsiveContainer
                width="100%"
                height="100%"
                minHeight={200}
                minWidth={200}
                initialDimension={{ width: 200, height: 200 }}
              >
                <BarChart data={stats.topClientsData} layout="vertical" margin={{ left: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};
