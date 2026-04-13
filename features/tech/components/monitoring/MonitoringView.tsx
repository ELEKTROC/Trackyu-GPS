// features/tech/components/monitoring/MonitoringView.tsx
// Vue de monitoring technique — Tableau de bord flotte + Pipeline GPS temps réel

import React, { useState, useEffect, useCallback } from 'react';
import { AlertsConsole } from './AlertsConsole';
import { OfflineTrackerList } from './OfflineTrackerList';
import { AnomalyDashboard } from './AnomalyDashboard';
import { SystemMetricsPanel } from './SystemMetricsPanel';
import { UserMonitoring } from './UserMonitoring';
import { getHeaders } from '../../../../services/api/client';
import {
  Activity, AlertTriangle, CheckCircle, Cpu, RefreshCw,
  Server, Shield, Users, Wifi, WifiOff, XCircle, Zap
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface FleetOverview {
  total: number;
  online: number;
  offline: number;
  healthScore: number;
  alertsToday: number;
  unreadAlerts: number;
}

interface GpsPipelineStats {
  timestamp: string;
  pipeline: {
    activeConnections: number;
    activeParsers: string[];
    rateLimit: { maxPerSec: number; trackedImeis: number };
  };
  parsers: {
    name: string;
    totalPackets: number;
    validPackets: number;
    rejectedPackets: number;
    crcErrors: number;
    successRate: number;
    lastSeen: string | null;
  }[];
  unknownImeis: { imei: string; packetCount: number; lastSeen: string }[];
  totals: { packets: number; valid: number; rejected: number; crcErrors: number };
}

type Tab = 'OVERVIEW' | 'PIPELINE_GPS' | 'ALERTS' | 'OFFLINE' | 'ANOMALIES' | 'SYSTEM' | 'USERS';

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60)  return `il y a ${secs}s`;
  if (secs < 3600) return `il y a ${Math.floor(secs / 60)}min`;
  if (secs < 86400) return `il y a ${Math.floor(secs / 3600)}h`;
  return `il y a ${Math.floor(secs / 86400)}j`;
}

// ─── Onglet Pipeline GPS ──────────────────────────────────────────────────────
function PipelineGpsTab() {
  const [stats, setStats] = useState<GpsPipelineStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/gps-stats', { headers: getHeaders() });
      if (res.ok) {
        setStats(await res.json());
        setLastRefresh(new Date());
      }
    } catch { /* ignore fetch error */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 10_000); // Refresh toutes les 10s
    return () => clearInterval(interval);
  }, [fetchStats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <RefreshCw className="h-6 w-6 animate-spin text-[var(--primary)]" />
        <span className="ml-2 text-[var(--text-secondary)]">Chargement des métriques pipeline…</span>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-16 text-[var(--text-secondary)]">
        <Server className="h-12 w-12 mx-auto mb-3 opacity-30" />
        <p>Données pipeline GPS non disponibles</p>
        <p className="text-sm mt-1">Vérifiez que le serveur GPS est en cours d'exécution</p>
      </div>
    );
  }

  const successRate = stats.totals.packets > 0
    ? Math.round(stats.totals.valid / stats.totals.packets * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Refresh info */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
          <Server className="h-4 w-4 text-[var(--primary)]" />
          Pipeline GPS — Données en temps réel
        </h3>
        <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          {lastRefresh && <span>Mis à jour {lastRefresh.toLocaleTimeString('fr-FR')}</span>}
          <button onClick={fetchStats} className="p-1 hover:bg-[var(--bg-elevated)] rounded">
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: 'Boîtiers connectés',
            value: stats.pipeline.activeConnections,
            icon: Wifi,
            color: stats.pipeline.activeConnections > 0 ? 'text-green-600' : 'text-[var(--text-muted)]',
            bg: stats.pipeline.activeConnections > 0 ? 'bg-green-50' : 'bg-[var(--bg-surface)]',
          },
          {
            label: 'Taux de succès',
            value: `${successRate}%`,
            icon: successRate >= 95 ? CheckCircle : AlertTriangle,
            color: successRate >= 95 ? 'text-green-600' : successRate >= 80 ? 'text-yellow-600' : 'text-red-600',
            bg: successRate >= 95 ? 'bg-green-50' : successRate >= 80 ? 'bg-yellow-50' : 'bg-red-50',
          },
          {
            label: 'Paquets reçus',
            value: stats.totals.packets.toLocaleString('fr-FR'),
            icon: Activity,
            color: 'text-[var(--primary)]',
            bg: 'bg-[var(--primary-dim)]',
          },
          {
            label: 'IMEI inconnus',
            value: stats.unknownImeis.length,
            icon: AlertTriangle,
            color: stats.unknownImeis.length > 0 ? 'text-orange-600' : 'text-[var(--text-muted)]',
            bg: stats.unknownImeis.length > 0 ? 'bg-orange-50' : 'bg-[var(--bg-elevated)]',
          },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className={`${bg} border border-[var(--border)] rounded-lg p-3`}>
            <div className="flex items-center gap-1.5 mb-1">
              <Icon className={`h-4 w-4 ${color}`} />
              <span className="text-xs text-[var(--text-secondary)]">{label}</span>
            </div>
            <div className={`text-xl font-bold ${color}`}>{value}</div>
          </div>
        ))}
      </div>

      {/* Barre progression globale */}
      <div className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg p-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-[var(--text-secondary)]">
            {stats.totals.valid.toLocaleString('fr-FR')} valides ·{' '}
            {stats.totals.rejected.toLocaleString('fr-FR')} rejetés ·{' '}
            {stats.totals.crcErrors.toLocaleString('fr-FR')} erreurs CRC
          </span>
          <span className="font-bold text-[var(--text-primary)]">{successRate}%</span>
        </div>
        <div className="h-2 bg-[var(--bg-elevated)] rounded-full overflow-hidden flex">
          <div
            className="h-full bg-green-500 transition-all"
            style={{ width: `${successRate}%` }}
          />
          <div
            className="h-full bg-red-400 transition-all"
            style={{ width: `${stats.totals.packets > 0 ? Math.round(stats.totals.crcErrors / stats.totals.packets * 100) : 0}%` }}
          />
        </div>
        <div className="flex gap-4 mt-1.5 text-xs text-[var(--text-secondary)]">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" />Valides</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" />Erreurs CRC</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[var(--border)]" />Rejetés (bornes)</span>
        </div>
      </div>

      {/* Par protocole */}
      <div className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg overflow-hidden">
        <div className="px-4 py-3 bg-[var(--bg-surface)] border-b">
          <h4 className="text-sm font-semibold text-[var(--text-primary)]">Statistiques par protocole</h4>
        </div>
        {stats.parsers.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-[var(--text-secondary)]">
            Aucun paquet reçu depuis le démarrage du serveur
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[var(--bg-surface)]">
              <tr>
                {['Protocole', 'Total', 'Valides', 'Rejetés', 'CRC err.', 'Succès', 'Dernier fix'].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-xs font-medium text-[var(--text-secondary)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {stats.parsers.map(p => (
                <tr key={p.name} className="hover:bg-[var(--bg-surface)]">
                  <td className="px-3 py-2.5">
                    <span className="px-2 py-0.5 bg-[var(--primary-dim)] text-[var(--primary)] text-xs font-mono rounded">
                      {p.name}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[var(--text-primary)]">{p.totalPackets.toLocaleString()}</td>
                  <td className="px-3 py-2.5 font-mono text-green-700">{p.validPackets.toLocaleString()}</td>
                  <td className="px-3 py-2.5 font-mono text-red-600">{p.rejectedPackets.toLocaleString()}</td>
                  <td className="px-3 py-2.5 font-mono text-orange-600">{p.crcErrors.toLocaleString()}</td>
                  <td className="px-3 py-2.5">
                    <span className={`font-bold ${p.successRate >= 95 ? 'text-green-600' : p.successRate >= 80 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {p.successRate}%
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-[var(--text-secondary)]">{timeAgo(p.lastSeen)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* IMEI inconnus */}
      {stats.unknownImeis.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-orange-200 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <h4 className="text-sm font-semibold text-orange-800">
              IMEI inconnus ({stats.unknownImeis.length}) — boîtiers non enregistrés dans le stock
            </h4>
          </div>
          <div className="divide-y divide-orange-100">
            {stats.unknownImeis.slice(0, 10).map(({ imei, packetCount, lastSeen }) => (
              <div key={imei} className="px-4 py-2.5 flex items-center justify-between text-sm">
                <span className="font-mono text-orange-900">{imei}</span>
                <div className="flex items-center gap-4 text-xs text-orange-700">
                  <span>{packetCount} paquets ignorés</span>
                  <span>{timeAgo(lastSeen)}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="px-4 py-2 bg-orange-100 text-xs text-orange-700">
            → Pour activer ces boîtiers : Administration → Paramètres Boîtiers → Découverte
          </div>
        </div>
      )}

      {/* Rate limiting */}
      <div className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg p-4">
        <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-2 flex items-center gap-2">
          <Shield className="h-4 w-4 text-[var(--primary)]" />
          Rate Limiting IMEI
        </h4>
        <div className="flex gap-6 text-sm text-[var(--text-secondary)]">
          <span>Max: <strong>{stats.pipeline.rateLimit.maxPerSec} paquets/sec</strong> par IMEI</span>
          <span>IMEI suivis: <strong>{stats.pipeline.rateLimit.trackedImeis}</strong></span>
        </div>
      </div>
    </div>
  );
}

// ─── Onglet Vue d'ensemble flotte ─────────────────────────────────────────────
function OverviewTab() {
  const [fleet, setFleet] = useState<FleetOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/fleet/stats', { headers: getHeaders() });
        if (res.ok) {
          const data = await res.json();
          setFleet({
            total: data.total || 0,
            online: data.online || 0,
            offline: data.offline || 0,
            healthScore: data.total > 0 ? Math.round(data.online / data.total * 100) : 0,
            alertsToday: data.alertsToday || 0,
            unreadAlerts: data.unreadAlerts || 0,
          });
        }
      } catch { /* ignore fetch error */ }
      setLoading(false);
    };
    load();
    const i = setInterval(load, 30_000);
    return () => clearInterval(i);
  }, []);

  if (loading) return <div className="text-center py-8 text-[var(--text-secondary)]">Chargement…</div>;
  if (!fleet) return <div className="text-center py-8 text-[var(--text-muted)]">Données non disponibles</div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { label: 'Véhicules total', value: fleet.total, icon: Cpu, color: 'text-[var(--text-primary)]' },
          { label: 'En ligne', value: fleet.online, icon: Wifi, color: 'text-green-600' },
          { label: 'Hors ligne', value: fleet.offline, icon: WifiOff, color: 'text-red-600' },
          { label: 'Score santé', value: `${fleet.healthScore}%`, icon: Zap, color: fleet.healthScore >= 80 ? 'text-green-600' : 'text-yellow-600' },
          { label: 'Alertes aujourd\'hui', value: fleet.alertsToday, icon: AlertTriangle, color: 'text-orange-600' },
          { label: 'Alertes non lues', value: fleet.unreadAlerts, icon: AlertTriangle, color: fleet.unreadAlerts > 0 ? 'text-red-600' : 'text-[var(--text-muted)]' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <Icon className={`h-4 w-4 ${color}`} />
              <span className="text-xs text-[var(--text-secondary)]">{label}</span>
            </div>
            <div className={`text-2xl font-bold ${color}`}>{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Composant principal MonitoringView ──────────────────────────────────────
export function MonitoringView() {
  const [activeTab, setActiveTab] = useState<Tab>('OVERVIEW');

  const tabs: { id: Tab; label: string; icon: React.ElementType; badge?: string }[] = [
    { id: 'OVERVIEW',     label: 'Vue flotte',     icon: Users },
    { id: 'PIPELINE_GPS', label: 'Pipeline GPS',   icon: Server },
    { id: 'ALERTS',       label: 'Alertes',        icon: AlertTriangle },
    { id: 'OFFLINE',      label: 'Hors ligne',     icon: WifiOff },
    { id: 'ANOMALIES',    label: 'Anomalies',      icon: Zap },
    { id: 'SYSTEM',       label: 'Système',        icon: Cpu },
    { id: 'USERS',        label: 'Utilisateurs',   icon: Shield },
  ];

  return (
    <div className="h-full flex flex-col bg-[var(--bg-surface)]">
      {/* Header */}
      <div className="px-4 py-3 border-b bg-[var(--bg-elevated)]">
        <h2 className="text-base font-semibold text-[var(--text-primary)]">Monitoring Technique</h2>
        <p className="text-xs text-[var(--text-secondary)] mt-0.5">Surveillance temps réel du pipeline GPS et de la flotte</p>
      </div>

      {/* Onglets */}
      <div className="flex border-b bg-[var(--bg-elevated)] px-4 overflow-x-auto">
        {tabs.map(({ id, label, icon: Icon, badge }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-sm border-b-2 whitespace-nowrap transition-colors ${
              activeTab === id
                ? 'border-[var(--primary)] text-[var(--primary)] font-medium'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
            {badge && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-red-100 text-red-700 rounded-full">
                {badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Contenu */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'OVERVIEW'     && <OverviewTab />}
        {activeTab === 'PIPELINE_GPS' && <PipelineGpsTab />}
        {activeTab === 'ALERTS'    && <AlertsConsole />}
        {activeTab === 'OFFLINE'   && <OfflineTrackerList />}
        {activeTab === 'ANOMALIES' && <AnomalyDashboard />}
        {activeTab === 'SYSTEM'    && <SystemMetricsPanel />}
        {activeTab === 'USERS'     && <UserMonitoring />}
      </div>
    </div>
  );
}
