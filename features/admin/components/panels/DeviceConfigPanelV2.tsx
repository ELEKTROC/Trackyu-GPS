// features/admin/components/panels/DeviceConfigPanelV2.tsx
// Panneau d'administration des boîtiers GPS — Administration > Paramètres Boîtiers
// Onglets : DASHBOARD | DEVICE_HEALTH | RAW_DATA | GLOBAL_CONFIG | BULK_COMMANDS | APN_PROFILES | DISCOVERY

import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  AlertTriangle,
  Battery,
  Cpu,
  Eye,
  Radio,
  RefreshCw,
  Send,
  Settings,
  Shield,
  Wifi,
  WifiOff,
  Zap,
} from 'lucide-react';

type Tab =
  | 'DASHBOARD'
  | 'DEVICE_HEALTH'
  | 'RAW_DATA'
  | 'GLOBAL_CONFIG'
  | 'BULK_COMMANDS'
  | 'APN_PROFILES'
  | 'DISCOVERY';

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

type GT06Variant = 'CONCOX' | 'COBAN' | 'SINOTRACK' | 'GENERIC' | 'V4' | 'TELTONIKA' | 'OTHER';

interface DeviceDiagnostic {
  imei: string;
  protocol: string | null;
  vehicleName: string | null;
  vehiclePlate: string | null;
  model: string | null;
  status: string | null;
  isConnected: boolean;
  lastFix: string | null;
  lastPosition: { lat: number; lng: number } | null;
  lastSpeed: number | null;
  batteryMv: number | null;
  satellites: number | null;
  signalQuality: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'UNKNOWN';
  packetsToday: number;
  gt06Variant: GT06Variant;
  gt06VariantSource: 'live' | 'db';
  operator: string | null;
  phoneNumber: string | null;
  // legacy fields (admin route)
  deviceModel?: string | null;
  deviceStatus?: string | null;
  isUnknownImei?: boolean;
}

const GT06_VARIANT_LABELS: Record<GT06Variant, { label: string; color: string; desc: string }> = {
  CONCOX: {
    label: 'Concox / JimiIoT',
    color: 'bg-[var(--primary-dim)] text-[var(--primary)]',
    desc: 'CRC ISO-HDLC · proto 0x12',
  },
  COBAN: { label: 'Coban', color: 'bg-purple-100 text-purple-700', desc: 'CRC IBM · proto 0x22' },
  SINOTRACK: { label: 'Sinotrack', color: 'bg-indigo-100 text-indigo-700', desc: 'CRC IBM · proto 0x22' },
  V4: { label: 'GT06 V4 (4G)', color: 'bg-cyan-100 text-cyan-700', desc: 'CRC ISO-HDLC · proto 0xA0' },
  TELTONIKA: { label: 'Teltonika', color: 'bg-green-100 text-green-700', desc: 'Codec 8/8E' },
  GENERIC: { label: 'Générique', color: 'bg-gray-100 text-gray-600', desc: 'Détection auto' },
  OTHER: { label: 'Autre', color: 'bg-yellow-100 text-yellow-700', desc: 'Manuel' },
};

const SIGNAL_COLORS: Record<string, string> = {
  EXCELLENT: 'text-green-600 bg-green-50',
  GOOD: 'text-[var(--primary)] bg-[var(--primary-dim)]',
  FAIR: 'text-yellow-600 bg-yellow-50',
  POOR: 'text-red-600 bg-red-50',
  UNKNOWN: 'text-gray-500 bg-gray-50',
};

const getHeaders = () => {
  const token = localStorage.getItem('token');
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
};

// ─── Onglet Dashboard ─────────────────────────────────────────────────────────
function DashboardTab({ stats }: { stats: GpsPipelineStats | null }) {
  if (!stats) return <div className="text-center py-8 text-gray-500">Chargement des métriques…</div>;
  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Boîtiers connectés', value: stats.pipeline.activeConnections, icon: Wifi, color: 'text-green-600' },
          {
            label: 'Paquets reçus',
            value: stats.totals.packets.toLocaleString(),
            icon: Activity,
            color: 'text-[var(--primary)]',
          },
          { label: 'IMEI inconnus', value: stats.unknownImeis.length, icon: AlertTriangle, color: 'text-orange-600' },
          { label: 'Erreurs CRC', value: stats.totals.crcErrors, icon: Shield, color: 'text-red-600' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <Icon className={`h-4 w-4 ${color}`} />
              <span className="text-xs text-gray-500">{label}</span>
            </div>
            <div className={`text-2xl font-bold ${color}`}>{value}</div>
          </div>
        ))}
      </div>

      {/* Taux de succès global */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Taux de succès global</h3>
        {(() => {
          const rate = stats.totals.packets > 0 ? Math.round((stats.totals.valid / stats.totals.packets) * 100) : 0;
          const color = rate >= 95 ? 'bg-green-500' : rate >= 80 ? 'bg-yellow-500' : 'bg-red-500';
          return (
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>
                  {stats.totals.valid.toLocaleString()} valides / {stats.totals.packets.toLocaleString()} reçus
                </span>
                <span className="font-bold">{rate}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full ${color} transition-all`} style={{ width: `${rate}%` }} />
              </div>
            </div>
          );
        })()}
      </div>

      {/* Protocoles actifs */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Protocoles actifs</h3>
        <div className="flex flex-wrap gap-2">
          {stats.pipeline.activeParsers.map((p) => (
            <span
              key={p}
              className="px-3 py-1 bg-[var(--primary-dim)] text-[var(--primary)] text-xs font-medium rounded-full border border-[var(--border)]"
            >
              {p}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Onglet Device Health ─────────────────────────────────────────────────────
function DeviceHealthTab() {
  const [imeiInput, setImeiInput] = useState('');
  const [diagnostic, setDiagnostic] = useState<DeviceDiagnostic | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [commandType, setCommandType] = useState('PING');
  const [commandStatus, setCommandStatus] = useState<string | null>(null);
  const [variantEdit, setVariantEdit] = useState<GT06Variant | null>(null);
  const [variantSaving, setVariantSaving] = useState(false);
  const [variantStatus, setVariantStatus] = useState<string | null>(null);

  const fetchDiagnostic = async () => {
    if (!/^\d{10,16}$/.test(imeiInput)) {
      setError('IMEI invalide (10 à 16 chiffres)');
      return;
    }
    setLoading(true);
    setError(null);
    setVariantEdit(null);
    setVariantStatus(null);
    try {
      const res = await fetch(`/api/devices/${imeiInput}/diagnostics`, { headers: getHeaders() });
      if (!res.ok) throw new Error(await res.text());
      setDiagnostic(await res.json());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const saveVariant = async () => {
    if (!diagnostic || !variantEdit) return;
    setVariantSaving(true);
    setVariantStatus(null);
    try {
      const res = await fetch(`/api/devices/${diagnostic.imei}/variant`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ variant: variantEdit }),
      });
      const data = await res.json();
      if (res.ok) {
        setDiagnostic((prev) => (prev ? { ...prev, gt06Variant: variantEdit, gt06VariantSource: 'db' } : prev));
        setVariantStatus('✅ Variant mis à jour');
        setVariantEdit(null);
      } else {
        setVariantStatus(`❌ ${data.message}`);
      }
    } catch (e) {
      setVariantStatus(`❌ Erreur réseau`);
    } finally {
      setVariantSaving(false);
    }
  };

  const sendCommand = async () => {
    if (!diagnostic) return;
    setCommandStatus('Envoi en cours…');
    try {
      const res = await fetch(`/api/devices/${diagnostic.imei}/command`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ type: commandType, protocol: diagnostic.protocol || 'GT06' }),
      });
      const data = await res.json();
      setCommandStatus(res.ok ? `✅ ${data.description || 'Commande envoyée'}` : `❌ ${data.error || data.message}`);
    } catch (e) {
      setCommandStatus(`❌ Erreur: ${(e as Error).message}`);
    }
  };

  return (
    <div className="space-y-4">
      {/* Recherche par IMEI */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <Cpu className="h-4 w-4 text-[var(--primary)]" />
          Diagnostic boîtier par IMEI
        </h3>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Entrez l'IMEI (15 chiffres)"
            value={imeiInput}
            onChange={(e) => setImeiInput(e.target.value.replace(/\D/g, '').slice(0, 16))}
            onKeyDown={(e) => e.key === 'Enter' && fetchDiagnostic()}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono"
            maxLength={16}
          />
          <button
            onClick={fetchDiagnostic}
            disabled={loading}
            className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm hover:bg-[var(--primary-light)] disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
            Diagnostiquer
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>

      {/* Résultat diagnostic */}
      {diagnostic && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {/* En-tête */}
          <div className="px-4 py-3 bg-gray-50 border-b flex items-center justify-between">
            <div>
              <div className="font-mono text-sm font-bold text-gray-800">{diagnostic.imei}</div>
              <div className="text-xs text-gray-500">
                {diagnostic.vehicleName || 'Véhicule inconnu'}{' '}
                {diagnostic.vehiclePlate ? `· ${diagnostic.vehiclePlate}` : ''}
                {diagnostic.model || diagnostic.deviceModel ? ` · ${diagnostic.model || diagnostic.deviceModel}` : ''}
                {diagnostic.operator ? ` · ${diagnostic.operator}` : ''}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {diagnostic.isConnected ? (
                <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                  <Wifi className="h-3 w-3" /> En ligne
                </span>
              ) : (
                <span className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                  <WifiOff className="h-3 w-3" /> Hors ligne
                </span>
              )}
              <span className={`px-2 py-1 text-xs rounded-full ${SIGNAL_COLORS[diagnostic.signalQuality]}`}>
                {diagnostic.signalQuality}
              </span>
            </div>
          </div>

          {/* Variant GT06 */}
          <div className="px-4 py-3 border-b bg-gray-50">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1">
                <Cpu className="h-4 w-4 text-gray-500 shrink-0" />
                <div>
                  <div className="text-xs text-gray-500 mb-0.5">
                    Variant détecté
                    <span className="ml-1.5 text-gray-400">
                      ({diagnostic.gt06VariantSource === 'live' ? 'temps réel' : 'base de données'})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${GT06_VARIANT_LABELS[diagnostic.gt06Variant]?.color || 'bg-gray-100 text-gray-600'}`}
                    >
                      {GT06_VARIANT_LABELS[diagnostic.gt06Variant]?.label || diagnostic.gt06Variant}
                    </span>
                    <span className="text-xs text-gray-400">{GT06_VARIANT_LABELS[diagnostic.gt06Variant]?.desc}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setVariantEdit(variantEdit ? null : diagnostic.gt06Variant)}
                className="text-xs text-[var(--primary)] hover:text-[var(--primary)] underline shrink-0"
              >
                {variantEdit ? 'Annuler' : 'Modifier'}
              </button>
            </div>

            {variantEdit && (
              <div className="mt-3 flex gap-2 items-center">
                <select
                  value={variantEdit}
                  onChange={(e) => setVariantEdit(e.target.value as GT06Variant)}
                  className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-sm"
                >
                  {(Object.keys(GT06_VARIANT_LABELS) as GT06Variant[]).map((v) => (
                    <option key={v} value={v}>
                      {GT06_VARIANT_LABELS[v].label} — {GT06_VARIANT_LABELS[v].desc}
                    </option>
                  ))}
                </select>
                <button
                  onClick={saveVariant}
                  disabled={variantSaving}
                  className="px-3 py-1.5 bg-[var(--primary)] text-white rounded text-sm hover:bg-[var(--primary-light)] disabled:opacity-50"
                >
                  {variantSaving ? '…' : 'Sauvegarder'}
                </button>
              </div>
            )}
            {variantStatus && <p className="mt-2 text-xs text-gray-700">{variantStatus}</p>}
          </div>

          {/* Métriques */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-px bg-gray-100">
            {[
              { label: 'Protocole', value: diagnostic.protocol || '—', icon: Radio },
              { label: "Paquets aujourd'hui", value: diagnostic.packetsToday.toLocaleString(), icon: Activity },
              {
                label: 'Satellites',
                value: diagnostic.satellites !== null ? `${diagnostic.satellites} sats` : '—',
                icon: Radio,
              },
              {
                label: 'Batterie',
                value: diagnostic.batteryMv !== null ? `${(diagnostic.batteryMv / 1000).toFixed(2)} V` : '—',
                icon: Battery,
              },
              {
                label: 'Vitesse',
                value: diagnostic.lastSpeed !== null ? `${diagnostic.lastSpeed} km/h` : '—',
                icon: Zap,
              },
              {
                label: 'Dernier fix',
                value: diagnostic.lastFix ? new Date(diagnostic.lastFix).toLocaleString('fr-FR') : '—',
                icon: Activity,
              },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="bg-white px-4 py-3">
                <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-0.5">
                  <Icon className="h-3 w-3" />
                  {label}
                </div>
                <div className="text-sm font-semibold text-gray-800">{value}</div>
              </div>
            ))}
          </div>

          {/* Position */}
          {diagnostic.lastPosition && (
            <div className="px-4 py-3 border-t bg-gray-50 text-xs text-gray-600 font-mono">
              📍 {diagnostic.lastPosition.lat.toFixed(6)}, {diagnostic.lastPosition.lng.toFixed(6)}
            </div>
          )}

          {/* IMEI inconnu */}
          {diagnostic.isUnknownImei && (
            <div className="px-4 py-3 border-t bg-orange-50 text-sm text-orange-700 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Boîtier non enregistré dans le stock — {diagnostic.packetsToday} paquets ignorés
            </div>
          )}

          {/* Envoi commande */}
          {diagnostic.isConnected && diagnostic.protocol && (
            <div className="px-4 py-3 border-t space-y-2">
              <h4 className="text-xs font-semibold text-gray-700">Envoyer une commande</h4>
              <div className="flex gap-2">
                <select
                  value={commandType}
                  onChange={(e) => setCommandType(e.target.value)}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="PING">PING — Demande de statut</option>
                  <option value="CUT_ENGINE">COUPE MOTEUR — Immobiliser</option>
                  <option value="RESTORE_ENGINE">RESTAURER MOTEUR — Débloquer</option>
                  <option value="REBOOT">REDÉMARRER le boîtier</option>
                </select>
                <button
                  onClick={sendCommand}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm hover:bg-orange-700 flex items-center gap-2"
                >
                  <Send className="h-4 w-4" />
                  Envoyer
                </button>
              </div>
              {commandStatus && <p className="text-sm text-gray-700 bg-gray-50 rounded px-3 py-2">{commandStatus}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Onglet Config globale ────────────────────────────────────────────────────
function GlobalConfigTab() {
  const [config, setConfig] = useState({
    movingIntervalSec: 30,
    stoppedIntervalSec: 60,
    heartbeatIntervalSec: 120,
    rateLimitPerSec: 10,
    gpsAccuracy: 'high' as 'high' | 'medium' | 'low',
  });
  const [saved, setSaved] = useState(false);

  const save = async () => {
    try {
      await fetch('/api/admin/gps-config', {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(config),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      /* ignore fetch error */
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
      <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
        <Settings className="h-4 w-4" /> Configuration globale du pipeline GPS
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { label: 'Intervalle en mouvement (s)', key: 'movingIntervalSec', min: 5, max: 300, step: 5 },
          { label: "Intervalle à l'arrêt (s)", key: 'stoppedIntervalSec', min: 10, max: 3600, step: 10 },
          { label: 'Intervalle heartbeat (s)', key: 'heartbeatIntervalSec', min: 30, max: 3600, step: 30 },
          { label: 'Rate limit max (paquets/sec)', key: 'rateLimitPerSec', min: 1, max: 100, step: 1 },
        ].map(({ label, key, min, max, step }) => (
          <div key={key}>
            <label className="block text-xs text-gray-600 mb-1">{label}</label>
            <input
              type="number"
              min={min}
              max={max}
              step={step}
              value={(config as any)[key]}
              onChange={(e) => setConfig((c) => ({ ...c, [key]: parseInt(e.target.value) }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        ))}
        <div>
          <label className="block text-xs text-gray-600 mb-1">Précision GPS</label>
          <select
            value={config.gpsAccuracy}
            onChange={(e) => setConfig((c) => ({ ...c, gpsAccuracy: e.target.value as any }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="high">Haute (HDOP ≤ 2)</option>
            <option value="medium">Moyenne (HDOP ≤ 5)</option>
            <option value="low">Basse (tous les fixes)</option>
          </select>
        </div>
      </div>
      <button
        onClick={save}
        className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm hover:bg-[var(--primary-light)]"
      >
        {saved ? '✅ Enregistré' : 'Enregistrer la configuration'}
      </button>
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function DeviceConfigPanelV2() {
  const [activeTab, setActiveTab] = useState<Tab>('DASHBOARD');
  const [stats, setStats] = useState<GpsPipelineStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const res = await fetch('/api/admin/gps-stats', { headers: getHeaders() });
      if (res.ok) setStats(await res.json());
    } catch {
      /* ignore fetch error */
    } finally {
      setLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 15_000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'DASHBOARD', label: 'Vue globale', icon: Activity },
    { id: 'DEVICE_HEALTH', label: 'Santé boîtier', icon: Cpu },
    { id: 'GLOBAL_CONFIG', label: 'Configuration', icon: Settings },
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-white">
        <h2 className="text-base font-semibold text-gray-800">Paramètres Boîtiers GPS</h2>
        <button
          onClick={fetchStats}
          disabled={loadingStats}
          className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
          title="Rafraîchir"
        >
          <RefreshCw className={`h-4 w-4 ${loadingStats ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Onglets */}
      <div className="flex border-b bg-white px-4">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-sm border-b-2 transition-colors ${
              activeTab === id
                ? 'border-[var(--primary)] text-[var(--primary)] font-medium'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Contenu */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        {activeTab === 'DASHBOARD' && <DashboardTab stats={stats} />}
        {activeTab === 'DEVICE_HEALTH' && <DeviceHealthTab />}
        {activeTab === 'GLOBAL_CONFIG' && <GlobalConfigTab />}
      </div>
    </div>
  );
}
