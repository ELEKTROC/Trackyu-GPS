import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Cpu, Activity, HardDrive, Clock, Database, 
  Zap, Radio, RefreshCw, TrendingUp, AlertCircle, Users,
  Wifi, WifiOff, BarChart3, ArrowUp, ArrowDown
} from 'lucide-react';
import { Card } from '../../../../components/Card';
import { api } from '../../../../services/apiLazy';

interface SystemStats {
  cpu: { count: number; percent: number };
  memory: { total: number; used: number; percent: number };
  disk: { percent: number };
  uptime: number;
  platform: string;
}

interface GpsMetrics {
  gps: {
    activeConnections: number;
    messagesReceived: number;
    messagesSuccess: number;
    messagesError: number;
    positionsSaved: number;
    parsingErrors: number;
    processing: { count: number; sum: number; avgMs: number };
  };
  cache: {
    hits: number;
    misses: number;
    hitRate: number;
    latency: { count: number; sum: number; avgMs: number };
  };
  database: {
    poolTotal: number;
    poolActive: number;
    poolIdle: number;
    poolWaiting: number;
    queries: number;
    queryLatency: { count: number; sum: number; avgMs: number };
    bufferSize: number;
    batchInserts: number;
  };
  websocket: {
    activeClients: number;
    messagesEmitted: number;
    messagesThrottled: number;
  };
  business: {
    activeVehicles: number;
    alertsGenerated: number;
  };
  timestamp: string;
}

const StatCard: React.FC<{
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  color: 'blue' | 'purple' | 'green' | 'orange' | 'red' | 'cyan' | 'pink' | 'yellow';
  trend?: 'up' | 'down' | 'stable';
}> = ({ title, value, subtitle, icon: Icon, color, trend }) => {
  const colors = {
    blue: 'bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] border-[var(--border)] dark:border-[var(--primary)]',
    purple: 'bg-[var(--clr-info-dim)] border-[var(--clr-info-border)]',
    green: 'bg-[var(--clr-success-dim)] border-[var(--clr-success-border)]',
    orange: 'bg-[var(--clr-warning-dim)] border-[var(--clr-warning-border)]',
    red: 'bg-[var(--clr-danger-dim)] border-[var(--clr-danger-border)]',
    cyan: 'bg-cyan-50 dark:bg-cyan-900/20 border-cyan-200 dark:border-cyan-800',
    pink: 'bg-pink-50 dark:bg-pink-900/20 border-pink-200 dark:border-pink-800',
    yellow: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
  };

  const iconColors = {
    blue: 'text-[var(--primary)]',
    purple: 'text-purple-600',
    green: 'text-green-600',
    orange: 'text-orange-600',
    red: 'text-red-600',
    cyan: 'text-cyan-600',
    pink: 'text-pink-600',
    yellow: 'text-yellow-600',
  };

  const textColors = {
    blue: 'text-[var(--primary)] dark:text-[var(--primary)]',
    purple: 'text-[var(--clr-info-strong)]',
    green: 'text-[var(--clr-success-strong)]',
    orange: 'text-[var(--clr-warning-strong)]',
    red: 'text-[var(--clr-danger-strong)]',
    cyan: 'text-cyan-800 dark:text-cyan-300',
    pink: 'text-pink-800 dark:text-pink-300',
    yellow: 'text-yellow-800 dark:text-yellow-300',
  };

  return (
    <Card className={`${colors[color]} border`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Icon className={`w-5 h-5 ${iconColors[color]}`} />
          <div>
            <p className={`text-xs font-bold ${textColors[color]}`}>{title}</p>
            <p className={`text-lg font-bold ${textColors[color]}`}>{value}</p>
            {subtitle && (
              <p className="text-xs text-[var(--text-secondary)]">{subtitle}</p>
            )}
          </div>
        </div>
        {trend && (
          <div className={`${trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-[var(--text-muted)]'}`}>
            {trend === 'up' ? <ArrowUp className="w-4 h-4" /> : 
             trend === 'down' ? <ArrowDown className="w-4 h-4" /> : null}
          </div>
        )}
      </div>
    </Card>
  );
};

const ProgressBar: React.FC<{
  value: number;
  max?: number;
  color?: string;
  label?: string;
}> = ({ value, max = 100, color = 'bg-[var(--primary-dim)]0', label }) => {
  const percent = Math.min((value / max) * 100, 100);
  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between text-xs text-[var(--text-secondary)] mb-1">
          <span>{label}</span>
          <span>{value.toFixed(1)}%</span>
        </div>
      )}
      <div className="w-full bg-[var(--bg-elevated)] bg-[var(--bg-elevated)] rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
};

export const SystemMetricsPanel: React.FC = () => {
  // Requête pour les stats système OS
  const { data: systemStats, isLoading: loadingSystem } = useQuery<SystemStats>({
    queryKey: ['systemStats'],
    queryFn: api.system.stats,
    refetchInterval: 5000,
  });

  // Requête pour les métriques GPS/Pipeline
  const { data: gpsMetrics, isLoading: loadingGps, refetch } = useQuery<GpsMetrics>({
    queryKey: ['systemMetrics'],
    queryFn: api.system.metrics,
    refetchInterval: 3000,
  });

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toFixed(0);
  };

  const formatBytes = (bytes: number): string => {
    if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(1)} GB`;
    if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}j ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header avec bouton refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-[var(--text-primary)]">
            Métriques Système & Pipeline GPS
          </h3>
          <p className="text-sm text-[var(--text-secondary)]">
            Mis à jour toutes les 3 secondes • 
            <span className="ml-1 text-xs text-[var(--text-muted)]">
              {gpsMetrics?.timestamp ? new Date(gpsMetrics.timestamp).toLocaleTimeString('fr-FR') : '...'}
            </span>
          </p>
        </div>
        <button
          onClick={() => refetch()}
          title="Rafraîchir les métriques"
          aria-label="Rafraîchir les métriques"
          className="p-2 rounded-lg bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)] transition-colors"
        >
          <RefreshCw className={`w-4 h-4 text-[var(--text-secondary)] ${loadingGps ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Section 1: Ressources Serveur */}
      <Card title="🖥️ Ressources Serveur" className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <StatCard
            icon={Cpu}
            title="CPU"
            value={loadingSystem ? '...' : `${systemStats?.cpu?.percent?.toFixed(1) ?? '?'}%`}
            subtitle={systemStats ? `${systemStats.cpu?.count ?? '?'} cores` : ''}
            color="blue"
          />
          <StatCard
            icon={Activity}
            title="Mémoire"
            value={loadingSystem ? '...' : `${systemStats?.memory?.percent?.toFixed(1) ?? '?'}%`}
            subtitle={systemStats ? formatBytes(systemStats.memory?.used ?? 0) : ''}
            color="purple"
          />
          <StatCard
            icon={HardDrive}
            title="Disque"
            value={loadingSystem ? '...' : `${systemStats?.disk?.percent?.toFixed(1) ?? '?'}%`}
            color="orange"
          />
          <StatCard
            icon={Clock}
            title="Uptime"
            value={loadingSystem ? '...' : formatUptime(systemStats?.uptime || 0)}
            subtitle={systemStats?.platform || ''}
            color="green"
          />
        </div>
        
        {/* Barres de progression */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ProgressBar
            value={systemStats?.cpu.percent || 0}
            label="CPU"
            color={systemStats && systemStats.cpu.percent > 80 ? 'bg-red-500' : 'bg-[var(--primary-dim)]0'}
          />
          <ProgressBar
            value={systemStats?.memory.percent || 0}
            label="Mémoire"
            color={systemStats && systemStats.memory.percent > 80 ? 'bg-red-500' : 'bg-purple-500'}
          />
          <ProgressBar
            value={systemStats?.disk.percent || 0}
            label="Disque"
            color={systemStats && systemStats.disk.percent > 80 ? 'bg-red-500' : 'bg-orange-500'}
          />
        </div>
      </Card>

      {/* Section 2: Pipeline GPS */}
      <Card title="📡 Pipeline GPS" className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <StatCard
            icon={Radio}
            title="Connexions TCP"
            value={loadingGps ? '...' : gpsMetrics?.gps.activeConnections || 0}
            subtitle="Trackers actifs"
            color="cyan"
          />
          <StatCard
            icon={Zap}
            title="Messages reçus"
            value={loadingGps ? '...' : formatNumber(gpsMetrics?.gps.messagesReceived || 0)}
            subtitle="Total cumulé"
            color="green"
          />
          <StatCard
            icon={TrendingUp}
            title="Positions sauvées"
            value={loadingGps ? '...' : formatNumber(gpsMetrics?.gps.positionsSaved || 0)}
            color="blue"
          />
          <StatCard
            icon={AlertCircle}
            title="Erreurs parsing"
            value={loadingGps ? '...' : gpsMetrics?.gps.parsingErrors || 0}
            color={gpsMetrics && gpsMetrics.gps.parsingErrors > 0 ? 'red' : 'green'}
          />
          <StatCard
            icon={Clock}
            title="Latence moy."
            value={loadingGps ? '...' : `${gpsMetrics?.gps?.processing?.avgMs?.toFixed(2) ?? '?'}ms`}
            subtitle="Traitement message"
            color="yellow"
          />
          <StatCard
            icon={BarChart3}
            title="Buffer"
            value={loadingGps ? '...' : gpsMetrics?.database.bufferSize || 0}
            subtitle="Positions en attente"
            color="purple"
          />
        </div>
      </Card>

      {/* Section 3: Cache Redis & Base de données */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="⚡ Cache Redis" className="p-4">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <StatCard
              icon={Zap}
              title="Hit Rate"
            value={loadingGps ? '...' : `${gpsMetrics?.cache?.hitRate || 0}%`}
            color={gpsMetrics && (gpsMetrics.cache?.hitRate ?? 0) > 80 ? 'green' : 'orange'}
            />
            <StatCard
              icon={Clock}
              title="Latence cache"
              value={loadingGps ? '...' : `${gpsMetrics?.cache?.latency?.avgMs?.toFixed(3) ?? '?'}ms`}
              color="cyan"
            />
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-[var(--text-secondary)]">
                Hits: {formatNumber(gpsMetrics?.cache.hits || 0)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-[var(--text-secondary)]">
                Misses: {formatNumber(gpsMetrics?.cache.misses || 0)}
              </span>
            </div>
          </div>
          <div className="mt-4">
            <ProgressBar
              value={gpsMetrics?.cache.hitRate || 0}
              label="Cache Hit Rate"
              color={gpsMetrics && gpsMetrics.cache.hitRate > 80 ? 'bg-green-500' : 'bg-orange-500'}
            />
          </div>
        </Card>

        <Card title="🗄️ Base de données PostgreSQL" className="p-4">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <StatCard
              icon={Database}
              title="Pool Connexions"
              value={loadingGps ? '...' : `${gpsMetrics?.database.poolActive || 0}/${gpsMetrics?.database.poolTotal || 0}`}
              subtitle={`${gpsMetrics?.database.poolWaiting || 0} en attente`}
              color="blue"
            />
            <StatCard
              icon={Clock}
              title="Latence requête"
              value={loadingGps ? '...' : `${gpsMetrics?.database?.queryLatency?.avgMs?.toFixed(2) ?? '?'}ms`}
              color="purple"
            />
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-[var(--text-secondary)]">
                Requêtes: {formatNumber(gpsMetrics?.database.queries || 0)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[var(--primary-dim)]0" />
              <span className="text-[var(--text-secondary)]">
                Batch inserts: {formatNumber(gpsMetrics?.database.batchInserts || 0)}
              </span>
            </div>
          </div>
          <div className="mt-4">
            <ProgressBar
              value={gpsMetrics?.database.poolActive || 0}
              max={gpsMetrics?.database.poolTotal || 20}
              label="Utilisation Pool"
              color="bg-[var(--primary-dim)]0"
            />
          </div>
        </Card>
      </div>

      {/* Section 4: WebSocket & Business */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="🔌 WebSocket (Temps réel)" className="p-4">
          <div className="grid grid-cols-3 gap-4">
            <StatCard
              icon={Users}
              title="Clients connectés"
              value={loadingGps ? '...' : gpsMetrics?.websocket.activeClients || 0}
              color="green"
            />
            <StatCard
              icon={Wifi}
              title="Messages émis"
              value={loadingGps ? '...' : formatNumber(gpsMetrics?.websocket.messagesEmitted || 0)}
              color="blue"
            />
            <StatCard
              icon={WifiOff}
              title="Throttled"
              value={loadingGps ? '...' : formatNumber(gpsMetrics?.websocket.messagesThrottled || 0)}
              color="orange"
            />
          </div>
        </Card>

        <Card title="📊 Métriques Business" className="p-4">
          <div className="grid grid-cols-2 gap-4">
            <StatCard
              icon={Radio}
              title="Véhicules actifs"
              value={loadingGps ? '...' : gpsMetrics?.business.activeVehicles || 0}
              subtitle="Position < 5 min"
              color="green"
            />
            <StatCard
              icon={AlertCircle}
              title="Alertes générées"
              value={loadingGps ? '...' : formatNumber(gpsMetrics?.business.alertsGenerated || 0)}
              color="red"
            />
          </div>
        </Card>
      </div>

      {/* Lien vers Grafana */}
      <Card className="p-4 bg-gradient-to-r from-orange-500/10 to-red-500/10 border-[var(--clr-warning-border)]">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-bold text-[var(--text-primary)]">
              📈 Dashboards Grafana
            </h4>
            <p className="text-sm text-[var(--text-secondary)]">
              Pour des graphiques avancés et l'historique des métriques
            </p>
          </div>
          <a
            href={import.meta.env.VITE_GRAFANA_URL || 'https://monitoring.trackyugps.com'}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors"
          >
            Ouvrir Grafana →
          </a>
        </div>
      </Card>
    </div>
  );
};
