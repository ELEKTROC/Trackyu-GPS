// features/admin/components/panels/DeviceConfigPanelV2.tsx
// Panneau d'administration des boîtiers GPS — Administration > Paramètres Boîtiers
// Onglets : DASHBOARD | DEVICE_HEALTH | RAW_DATA | GLOBAL_CONFIG | BULK_COMMANDS | APN_PROFILES | DISCOVERY

import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  AlertTriangle,
  Battery,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Cpu,
  Edit2,
  Eye,
  Package,
  Plus,
  Radio,
  RefreshCw,
  Send,
  Settings,
  Shield,
  Tag,
  Terminal,
  Trash2,
  Wifi,
  WifiOff,
  X,
  Zap,
} from 'lucide-react';
import { getHeaders } from '../../../../services/api/client';

type Tab = 'DASHBOARD' | 'DEVICE_HEALTH' | 'MODELS_PROTOCOLS' | 'DISCOVERY' | 'GLOBAL_CONFIG';

interface DeviceModelConfig {
  id: string;
  brand: string | null;
  model: string;
  protocol: string | null;
  imei_prefixes: string[];
  specifications: Record<string, unknown>;
  supported_commands: string[];
  is_active: boolean;
  is_system: boolean;
  description: string | null;
  default_price: number;
  display_order: number;
}

interface ParcByModel {
  model: string | null;
  config_id: string | null;
  brand: string | null;
  protocol: string | null;
  imei_prefixes: string[] | null;
  total: number;
  installed: number;
}

interface ParcByPrefix {
  prefix: string;
  nb: number;
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
  GENERIC: { label: 'Générique', color: 'bg-[var(--bg-surface)] text-[var(--text-secondary)]', desc: 'Détection auto' },
  OTHER: { label: 'Autre', color: 'bg-yellow-100 text-yellow-700', desc: 'Manuel' },
};

const SIGNAL_COLORS: Record<string, string> = {
  EXCELLENT: 'text-green-600 bg-green-50',
  GOOD: 'text-[var(--primary)] bg-[var(--primary-dim)]',
  FAIR: 'text-yellow-600 bg-yellow-50',
  POOR: 'text-red-600 bg-red-50',
  UNKNOWN: 'text-[var(--text-secondary)] bg-[var(--bg-surface)]',
};

// ─── Onglet Dashboard ─────────────────────────────────────────────────────────
function DashboardTab({ stats }: { stats: GpsPipelineStats | null }) {
  if (!stats) return <div className="text-center py-8 text-[var(--text-secondary)]">Chargement des métriques…</div>;
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
          <div key={label} className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <Icon className={`h-4 w-4 ${color}`} />
              <span className="text-xs text-[var(--text-secondary)]">{label}</span>
            </div>
            <div className={`text-2xl font-bold ${color}`}>{value}</div>
          </div>
        ))}
      </div>

      {/* Taux de succès global */}
      <div className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg p-4">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Taux de succès global</h3>
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
              <div className="h-2 bg-[var(--bg-surface)] rounded-full overflow-hidden">
                <div className={`h-full ${color} transition-all`} style={{ width: `${rate}%` }} />
              </div>
            </div>
          );
        })()}
      </div>

      {/* Protocoles actifs */}
      <div className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg p-4">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Protocoles actifs</h3>
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
      <div className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg p-4">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
          <Cpu className="h-4 w-4 text-[var(--primary)]" />
          Diagnostic boîtier par IMEI
        </h3>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Entrez l'IMEI"
            value={imeiInput}
            onChange={(e) => setImeiInput(e.target.value.replace(/\D/g, '').slice(0, 20))}
            onKeyDown={(e) => e.key === 'Enter' && fetchDiagnostic()}
            className="flex-1 border border-[var(--border)] rounded-lg px-3 py-2 text-sm font-mono"
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
        <div className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg overflow-hidden">
          {/* En-tête */}
          <div className="px-4 py-3 bg-[var(--bg-surface)] border-b flex items-center justify-between">
            <div>
              <div className="font-mono text-sm font-bold text-[var(--text-primary)]">{diagnostic.imei}</div>
              <div className="text-xs text-[var(--text-secondary)]">
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
          <div className="px-4 py-3 border-b bg-[var(--bg-surface)]">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1">
                <Cpu className="h-4 w-4 text-[var(--text-secondary)] shrink-0" />
                <div>
                  <div className="text-xs text-[var(--text-secondary)] mb-0.5">
                    Variant détecté
                    <span className="ml-1.5 text-[var(--text-muted)]">
                      ({diagnostic.gt06VariantSource === 'live' ? 'temps réel' : 'base de données'})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${GT06_VARIANT_LABELS[diagnostic.gt06Variant]?.color || 'bg-[var(--bg-surface)] text-[var(--text-secondary)]'}`}
                    >
                      {GT06_VARIANT_LABELS[diagnostic.gt06Variant]?.label || diagnostic.gt06Variant}
                    </span>
                    <span className="text-xs text-[var(--text-muted)]">
                      {GT06_VARIANT_LABELS[diagnostic.gt06Variant]?.desc}
                    </span>
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
                  className="flex-1 border border-[var(--border)] rounded px-2 py-1.5 text-sm"
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
            {variantStatus && <p className="mt-2 text-xs text-[var(--text-primary)]">{variantStatus}</p>}
          </div>

          {/* Métriques */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-px bg-[var(--bg-surface)]">
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
              <div key={label} className="bg-[var(--bg-elevated)] px-4 py-3">
                <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] mb-0.5">
                  <Icon className="h-3 w-3" />
                  {label}
                </div>
                <div className="text-sm font-semibold text-[var(--text-primary)]">{value}</div>
              </div>
            ))}
          </div>

          {/* Position */}
          {diagnostic.lastPosition && (
            <div className="px-4 py-3 border-t bg-[var(--bg-surface)] text-xs text-[var(--text-secondary)] font-mono">
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
              <h4 className="text-xs font-semibold text-[var(--text-primary)]">Envoyer une commande</h4>
              <div className="flex gap-2">
                <select
                  value={commandType}
                  onChange={(e) => setCommandType(e.target.value)}
                  className="flex-1 border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
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
              {commandStatus && (
                <p className="text-sm text-[var(--text-primary)] bg-[var(--bg-surface)] rounded px-3 py-2">
                  {commandStatus}
                </p>
              )}
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
    gpsAccuracy: 'medium' as 'high' | 'medium' | 'low',
  });
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(false);

  useEffect(() => {
    fetch('/api/admin/gps-config', { headers: getHeaders() })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data)
          setConfig({
            movingIntervalSec: data.movingIntervalSec ?? 30,
            stoppedIntervalSec: data.stoppedIntervalSec ?? 60,
            heartbeatIntervalSec: data.heartbeatIntervalSec ?? 120,
            rateLimitPerSec: data.rateLimitPerSec ?? 10,
            gpsAccuracy: data.gpsAccuracy ?? 'medium',
          });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    try {
      const res = await fetch('/api/admin/gps-config', {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(config),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error('[DeviceConfig] save error:', e);
      setSaveError(true);
      setTimeout(() => setSaveError(false), 3000);
    }
  };

  if (loading)
    return (
      <div className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg p-6 text-center text-sm text-[var(--text-secondary)]">
        Chargement de la configuration…
      </div>
    );

  return (
    <div className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg p-4 space-y-4">
      <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
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
            <label className="block text-xs text-[var(--text-secondary)] mb-1">{label}</label>
            <input
              type="number"
              min={min}
              max={max}
              step={step}
              value={config[key as keyof typeof config] as number}
              onChange={(e) => setConfig((c) => ({ ...c, [key]: parseInt(e.target.value) }))}
              className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
            />
          </div>
        ))}
        <div>
          <label className="block text-xs text-[var(--text-secondary)] mb-1">Précision GPS</label>
          <select
            value={config.gpsAccuracy}
            onChange={(e) => setConfig((c) => ({ ...c, gpsAccuracy: e.target.value as 'high' | 'medium' | 'low' }))}
            className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
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
        {saved ? '✅ Enregistré' : saveError ? '❌ Erreur — réessayer' : 'Enregistrer la configuration'}
      </button>
    </div>
  );
}

// ─── Référence commandes par protocole ───────────────────────────────────────

interface ProtocolCommand {
  fn: string;
  format: string;
  note?: string;
  reply?: string;
}

interface ProtocolSection {
  title: string;
  commands: ProtocolCommand[];
}

interface ProtocolRef {
  description: string;
  warning?: string;
  sections: ProtocolSection[];
}

const PROTOCOL_COMMANDS: Record<string, ProtocolRef> = {
  'CK508D-JT (JT808 ASCII)': {
    description:
      'Boîtiers IMEI 15042xxx (modèle JT808 BLE — capteur fuel BLE livre directement le volume) — password par défaut 1234',
    warning: "Commandes ASCII vendor, pas du JT808 binaire. Acceptation TCP non confirmée — tester d'abord via SMS.",
    sections: [
      {
        title: 'Paramètres généraux',
        commands: [
          { fn: 'Set one IP', format: '*SET*P:1234*U:120.77.144.129,808,1#', reply: 'IP:120.77.144.129,808,1>' },
          { fn: 'Set two IPs', format: '*SET*P:1234*U:ip1,port1,1,ip2,port2,1#' },
          { fn: 'Set device ID', format: '*SET*P:1234*N:13601408888#', note: '11 chiffres' },
          { fn: 'Set APN', format: '*SET*P:1234*A:CMNET,CMNET,CMNET,#', note: '3 virgules obligatoires' },
          { fn: 'Set APN (sans login)', format: '*SET*P:1234*A:CMNET,,,#', note: '3 virgules obligatoires' },
          { fn: 'GPS upload interval', format: '*SET*P:1234*E:1,x,y#', note: 'x=ACC ON (s), y=ACC OFF (s)' },
          { fn: 'Set time zone (GMT)', format: '*SET*P:1234*T:0#', note: '0 = UTC' },
          { fn: 'Check device status', format: '*SET*P:1234*C#', reply: 'P1:...,IP2:...,APN:...' },
          { fn: 'Reboot device', format: '*SET*P:1234*B#', reply: '<Restart...>' },
          { fn: 'Check firmware', format: '*SET*P:1234*V#', reply: 'APP:CK508D-JT-V...' },
          { fn: 'Reset odometer', format: '*SET*P:1234*M:105,0#' },
        ],
      },
      {
        title: 'Capteurs Bluetooth',
        commands: [
          {
            fn: 'ADD MAC',
            format: 'BLEn,A,E04E7A401882#',
            note: 'n=1 fuel · 2 door · 3 speed · 4 heart rate',
            reply: 'BLE2 SET OK',
          },
          { fn: 'Check MAC', format: 'BLEn,C#', reply: 'BLE2,C,E04E7A401882#' },
          { fn: 'Delete MAC', format: 'BLEn,D#', reply: 'BLE2 CLR OK' },
        ],
      },
    ],
  },
  'GT06 / Concox': {
    description:
      'Tous les modèles GT06 (J16 JimiIoT, X3, GT800, ET25, Seeworld, ST901, TK309, BW09, Unknown_xxx) — 99.5 % du parc',
    warning: 'Mode "SMS via TCP" — encapsulation 0x80 (paquet binaire) pas encore implémentée côté serveur.',
    sections: [
      {
        title: 'Commandes implémentées (commandFactory.js)',
        commands: [
          { fn: 'CUT_ENGINE', format: 'Relay,1#', note: 'Coupe-circuit carburant / allumage' },
          { fn: 'RESTORE_ENGINE', format: 'Relay,0#', note: 'Restaure allumage' },
          { fn: 'CONFIGURE_APN', format: 'APN,<apn>,<user>,<pass>#' },
          { fn: 'CONFIGURE_SERVER', format: 'SERVER,1,<ip>,<port>,0#' },
          { fn: 'PING', format: 'STATUS#', note: 'Demande statut device' },
        ],
      },
    ],
  },
  H02: {
    description: 'Boîtiers Sinotrack, TK103, GT02H — parser en réception, aucun boîtier actif en prod',
    sections: [
      {
        title: 'Commandes implémentées (commandFactory.js)',
        commands: [
          { fn: 'CUT_ENGINE', format: '*HQ,<imei>,S20,010,1#' },
          { fn: 'RESTORE_ENGINE', format: '*HQ,<imei>,S20,010,0#' },
          { fn: 'CONFIGURE_APN', format: '*HQ,<imei>,APN,<apn>#' },
          { fn: 'CONFIGURE_SERVER', format: '*HQ,<imei>,IP,<ip>,<port>#' },
          { fn: 'PING', format: '*HQ,<imei>,V1#' },
        ],
      },
    ],
  },
  Meitrack: {
    description: 'MVT600, T399, T1 — parser en réception, aucun boîtier actif en prod',
    sections: [
      {
        title: 'Commandes implémentées (commandFactory.js)',
        commands: [
          { fn: 'CUT_ENGINE', format: '@@<len><imei>,C01,0,12222*00\\r\\n' },
          { fn: 'RESTORE_ENGINE', format: '@@<len><imei>,C01,0,02222*00\\r\\n' },
          { fn: 'CONFIGURE_APN', format: '@@<len><imei>,A11,<apn>*00\\r\\n' },
          { fn: 'PING', format: '@@<len><imei>,A10*00\\r\\n' },
        ],
      },
    ],
  },
  Teltonika: {
    description: 'FMB120, FMB920, FMB640 — parser en réception, aucun boîtier actif en prod',
    warning: "Codec 12 (binaire) non encapsulé — commandes non fonctionnelles en l'état.",
    sections: [
      {
        title: 'Commandes implémentées (commandFactory.js)',
        commands: [
          { fn: 'CUT_ENGINE', format: 'setdigout 1' },
          { fn: 'RESTORE_ENGINE', format: 'setdigout 0' },
          { fn: 'CONFIGURE_APN', format: 'setparam 2001:<apn>' },
          { fn: 'PING', format: 'getstatus' },
        ],
      },
    ],
  },
  'Wialon IPS': {
    description: 'Boîtiers compatibles Wialon — parser en réception, aucun boîtier actif en prod',
    sections: [
      {
        title: 'Commandes implémentées (commandFactory.js)',
        commands: [
          { fn: 'CUT_ENGINE', format: '#M#relay,1\\r\\n' },
          { fn: 'RESTORE_ENGINE', format: '#M#relay,0\\r\\n' },
          { fn: 'PING', format: '#P#\\r\\n' },
        ],
      },
    ],
  },
};

function ProtocolCommandsReference() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copy = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1500);
    } catch {
      // noop
    }
  };

  return (
    <div className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg overflow-hidden">
      <div className="px-4 py-2.5 bg-[var(--bg-surface)] border-b border-[var(--border)] flex items-center gap-2">
        <Terminal className="h-4 w-4 text-[var(--primary)]" />
        <span className="text-sm font-semibold text-[var(--text-primary)]">Référence commandes par protocole</span>
        <span className="text-xs text-[var(--text-secondary)]">
          ({Object.keys(PROTOCOL_COMMANDS).length} protocoles)
        </span>
      </div>
      <div className="divide-y divide-[var(--border)]">
        {Object.entries(PROTOCOL_COMMANDS).map(([protoName, ref]) => {
          const isOpen = expanded === protoName;
          return (
            <div key={protoName}>
              <button
                onClick={() => setExpanded(isOpen ? null : protoName)}
                className="w-full px-4 py-2.5 flex items-center gap-2 hover:bg-[var(--bg-surface)] text-left transition-colors"
              >
                {isOpen ? (
                  <ChevronDown className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
                )}
                <span className="text-sm font-mono font-semibold text-[var(--primary)]">{protoName}</span>
                <span className="text-xs text-[var(--text-secondary)] flex-1 truncate">— {ref.description}</span>
              </button>
              {isOpen && (
                <div className="px-4 py-3 bg-[var(--bg-primary)] space-y-3">
                  {ref.warning && (
                    <div className="flex items-start gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded text-xs text-amber-900 dark:text-amber-200">
                      <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                      <span>{ref.warning}</span>
                    </div>
                  )}
                  {ref.sections.map((section) => (
                    <div key={section.title}>
                      <h4 className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wide mb-2">
                        {section.title}
                      </h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-left text-[var(--text-secondary)]">
                              <th className="py-1.5 pr-3 font-medium">Fonction</th>
                              <th className="py-1.5 pr-3 font-medium">Format</th>
                              <th className="py-1.5 pr-3 font-medium">Note</th>
                              <th className="py-1.5 pr-3 font-medium">Réponse</th>
                              <th className="py-1.5 w-10"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--border)]">
                            {section.commands.map((cmd, i) => {
                              const key = `${protoName}-${section.title}-${i}`;
                              const isCopied = copiedKey === key;
                              return (
                                <tr key={key} className="hover:bg-[var(--bg-surface)]">
                                  <td className="py-1.5 pr-3 text-[var(--text-primary)] font-medium">{cmd.fn}</td>
                                  <td className="py-1.5 pr-3">
                                    <code className="px-1.5 py-0.5 bg-[var(--bg-elevated)] border border-[var(--border)] rounded text-[11px] text-[var(--primary)] font-mono">
                                      {cmd.format}
                                    </code>
                                  </td>
                                  <td className="py-1.5 pr-3 text-[var(--text-secondary)]">{cmd.note || '—'}</td>
                                  <td className="py-1.5 pr-3 text-[var(--text-secondary)] font-mono text-[11px]">
                                    {cmd.reply || '—'}
                                  </td>
                                  <td className="py-1.5">
                                    <button
                                      onClick={() => copy(key, cmd.format)}
                                      className="p-1 rounded hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors"
                                      title="Copier"
                                    >
                                      {isCopied ? (
                                        <Check className="h-3.5 w-3.5 text-green-600" />
                                      ) : (
                                        <Copy className="h-3.5 w-3.5" />
                                      )}
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Onglet Modèles & Protocoles ─────────────────────────────────────────────
function ModelsProtocolsTab() {
  const [models, setModels] = useState<DeviceModelConfig[]>([]);
  const [parc, setParc] = useState<{ byModel: ParcByModel[]; byPrefix: ParcByPrefix[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrefixes, setEditPrefixes] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newModel, setNewModel] = useState({ brand: '', model: '', protocol: 'GT06', imeiPrefixes: '' });
  const [addStatus, setAddStatus] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [modelsRes, parcRes] = await Promise.all([
        fetch('/api/tech-settings/device-models', { headers: getHeaders() }),
        fetch('/api/admin/device-parc', { headers: getHeaders() }),
      ]);
      if (modelsRes.ok) setModels(await modelsRes.json());
      if (parcRes.ok) setParc(await parcRes.json());
    } catch (e) {
      console.error('[ModelsTab] load error', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const getParcForModel = (modelName: string | null): ParcByModel | undefined =>
    parc?.byModel.find((p) => p.model === modelName);

  const startEdit = (m: DeviceModelConfig) => {
    setEditingId(m.id);
    setEditPrefixes((m.imei_prefixes || []).join(', '));
    setSaveStatus(null);
  };

  const savePrefixes = async (m: DeviceModelConfig) => {
    setSaving(true);
    try {
      const prefixes = editPrefixes
        .split(/[,\s]+/)
        .map((p) => p.trim())
        .filter((p) => p.length > 0);
      const res = await fetch(`/api/tech-settings/device-models/${m.id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ imeiPrefixes: prefixes }),
      });
      if (res.ok) {
        setModels((prev) => prev.map((x) => (x.id === m.id ? { ...x, imei_prefixes: prefixes } : x)));
        setEditingId(null);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus(null), 2000);
      } else {
        const data = await res.json();
        setSaveStatus(`error: ${data.error || 'Erreur'}`);
      }
    } finally {
      setSaving(false);
    }
  };

  const deleteModel = async (m: DeviceModelConfig) => {
    if (!confirm(`Supprimer le modèle "${m.brand} ${m.model}" ?`)) return;
    const res = await fetch(`/api/tech-settings/device-models/${m.id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (res.ok) setModels((prev) => prev.filter((x) => x.id !== m.id));
  };

  const addModel = async () => {
    if (!newModel.model.trim()) {
      setAddStatus('Modèle requis');
      return;
    }
    setAddStatus(null);
    const prefixes = newModel.imeiPrefixes
      .split(/[,\s]+/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
    const res = await fetch('/api/tech-settings/device-models', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        brand: newModel.brand || null,
        model: newModel.model,
        protocol: newModel.protocol,
        imeiPrefixes: prefixes,
        type: 'BOX',
        specifications: {},
        isActive: true,
      }),
    });
    if (res.ok) {
      await load();
      setShowAddForm(false);
      setNewModel({ brand: '', model: '', protocol: 'GT06', imeiPrefixes: '' });
    } else {
      const data = await res.json();
      setAddStatus(`Erreur: ${data.error || 'inconnue'}`);
    }
  };

  if (loading)
    return <div className="py-8 text-center text-sm text-[var(--text-secondary)]">Chargement des modèles…</div>;

  // Group by brand for display
  const uniqueBrands = [...new Set(models.map((m) => m.brand || '—'))].sort();

  return (
    <div className="space-y-4">
      {/* KPIs Parc */}
      {parc && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {parc.byModel.slice(0, 4).map((row) => (
            <div
              key={row.model || 'unknown'}
              className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg p-3"
            >
              <div className="text-xs text-[var(--text-secondary)] mb-1 truncate">
                {row.brand || '—'} {row.model || 'Inconnu'}
              </div>
              <div className="text-xl font-bold text-[var(--text-primary)]">{row.total}</div>
              <div className="text-xs text-[var(--text-secondary)]">{row.installed} installés</div>
            </div>
          ))}
        </div>
      )}

      {/* Référence commandes par protocole */}
      <ProtocolCommandsReference />

      {/* Bouton ajouter */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
          <Package className="h-4 w-4 text-[var(--primary)]" />
          Catalogue modèles ({models.length})
        </h3>
        <button
          onClick={() => setShowAddForm((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--primary)] text-white rounded-lg text-xs hover:bg-[var(--primary-light)]"
        >
          <Plus className="h-3.5 w-3.5" />
          Nouveau modèle
        </button>
      </div>

      {/* Formulaire ajout */}
      {showAddForm && (
        <div className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg p-4 space-y-3">
          <h4 className="text-sm font-medium text-[var(--text-primary)]">Nouveau modèle</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[var(--text-secondary)] mb-1 block">Marque</label>
              <input
                value={newModel.brand}
                onChange={(e) => setNewModel((n) => ({ ...n, brand: e.target.value }))}
                placeholder="Concox, Teltonika…"
                className="w-full border border-[var(--border)] rounded px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-[var(--text-secondary)] mb-1 block">Modèle *</label>
              <input
                value={newModel.model}
                onChange={(e) => setNewModel((n) => ({ ...n, model: e.target.value }))}
                placeholder="GT06N, FMB920…"
                className="w-full border border-[var(--border)] rounded px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-[var(--text-secondary)] mb-1 block">Protocole</label>
              <select
                value={newModel.protocol}
                onChange={(e) => setNewModel((n) => ({ ...n, protocol: e.target.value }))}
                className="w-full border border-[var(--border)] rounded px-2 py-1.5 text-sm"
              >
                <option value="GT06">GT06</option>
                <option value="TELTONIKA">Teltonika</option>
                <option value="Coban">Coban</option>
                <option value="OSMAND">OsmAnd</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-[var(--text-secondary)] mb-1 block">Préfixes IMEI</label>
              <input
                value={newModel.imeiPrefixes}
                onChange={(e) => setNewModel((n) => ({ ...n, imeiPrefixes: e.target.value }))}
                placeholder="86287, 86730…"
                className="w-full border border-[var(--border)] rounded px-2 py-1.5 text-sm font-mono"
              />
            </div>
          </div>
          {addStatus && <p className="text-xs text-red-600">{addStatus}</p>}
          <div className="flex gap-2">
            <button onClick={addModel} className="px-3 py-1.5 bg-[var(--primary)] text-white rounded text-sm">
              Ajouter
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 border border-[var(--border)] rounded text-sm"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {saveStatus === 'saved' && (
        <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2 text-sm">
          <Check className="h-4 w-4" /> Préfixes mis à jour
        </div>
      )}

      {/* Table modèles par marque */}
      {uniqueBrands.map((brand) => {
        const brandModels = models.filter((m) => (m.brand || '—') === brand);
        return (
          <div key={brand} className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg overflow-hidden">
            <div className="px-4 py-2 bg-[var(--bg-surface)] border-b flex items-center gap-2">
              <Tag className="h-3.5 w-3.5 text-[var(--primary)]" />
              <span className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wide">{brand}</span>
              <span className="text-xs text-[var(--text-secondary)]">({brandModels.length} modèles)</span>
            </div>
            <div className="divide-y divide-[var(--border)]">
              {brandModels.map((m) => {
                const stats = getParcForModel(m.model);
                const isEditing = editingId === m.id;
                return (
                  <div key={m.id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-[var(--text-primary)]">{m.model}</span>
                          {m.protocol && (
                            <span className="px-1.5 py-0.5 bg-[var(--primary-dim)] text-[var(--primary)] text-xs rounded font-mono">
                              {m.protocol}
                            </span>
                          )}
                          {stats && (
                            <span className="text-xs text-[var(--text-secondary)]">
                              {stats.total} boîtiers · {stats.installed} installés
                            </span>
                          )}
                        </div>
                        {/* Préfixes IMEI */}
                        <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                          {isEditing ? (
                            <div className="flex items-center gap-2 w-full mt-1">
                              <input
                                value={editPrefixes}
                                onChange={(e) => setEditPrefixes(e.target.value)}
                                placeholder="86287, 86730 (séparés par virgule ou espace)"
                                className="flex-1 border border-[var(--primary)] rounded px-2 py-1 text-xs font-mono"
                                autoFocus
                              />
                              <button
                                onClick={() => savePrefixes(m)}
                                disabled={saving}
                                className="p-1.5 bg-[var(--primary)] text-white rounded hover:bg-[var(--primary-light)] disabled:opacity-50"
                              >
                                <Check className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="p-1.5 border border-[var(--border)] rounded hover:bg-[var(--bg-surface)]"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            <>
                              {(m.imei_prefixes || []).length > 0 ? (
                                (m.imei_prefixes || []).map((p) => (
                                  <span
                                    key={p}
                                    className="px-1.5 py-0.5 bg-[var(--bg-surface)] border border-[var(--border)] text-xs rounded font-mono text-[var(--text-secondary)]"
                                  >
                                    {p}…
                                  </span>
                                ))
                              ) : (
                                <span className="text-xs text-[var(--text-muted)] italic">Aucun préfixe IMEI</span>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      {!isEditing && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => startEdit(m)}
                            className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--primary)] hover:bg-[var(--primary-dim)] rounded"
                            title="Modifier les préfixes IMEI"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          {!m.is_system && (
                            <button
                              onClick={() => deleteModel(m)}
                              className="p-1.5 text-[var(--text-secondary)] hover:text-red-600 hover:bg-red-50 rounded"
                              title="Supprimer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Préfixes non mappés */}
      {parc && parc.byPrefix.length > 0 && (
        <div className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg overflow-hidden">
          <div className="px-4 py-2 bg-[var(--bg-surface)] border-b">
            <span className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wide">
              Préfixes IMEI dans le parc
            </span>
          </div>
          <div className="p-3 flex flex-wrap gap-2">
            {parc.byPrefix.map((row) => {
              const mapped = models.some((m) => (m.imei_prefixes || []).includes(row.prefix));
              return (
                <span
                  key={row.prefix}
                  className={`px-2 py-1 rounded text-xs font-mono border ${
                    mapped
                      ? 'bg-green-50 border-green-200 text-green-700'
                      : 'bg-orange-50 border-orange-200 text-orange-700'
                  }`}
                >
                  {row.prefix}… ({row.nb}){!mapped && <span className="ml-1 text-orange-500">⚠</span>}
                </span>
              );
            })}
          </div>
          <div className="px-4 pb-3 text-xs text-[var(--text-secondary)]">
            Vert = préfixe mappé à un modèle · Orange = préfixe sans correspondance
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Onglet IMEI Inconnus ─────────────────────────────────────────────────────
function DiscoveryTab({ unknownImeis }: { unknownImeis: GpsPipelineStats['unknownImeis'] }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-orange-500" />
          IMEI inconnus détectés ({unknownImeis.length})
        </h3>
        <span className="text-xs text-[var(--text-secondary)]">
          Boîtiers qui envoient des données sans être enregistrés
        </span>
      </div>

      {unknownImeis.length === 0 ? (
        <div className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg p-6 text-center">
          <Check className="h-8 w-8 text-green-500 mx-auto mb-2" />
          <p className="text-sm text-[var(--text-secondary)]">
            Aucun IMEI inconnu — tous les boîtiers sont enregistrés
          </p>
        </div>
      ) : (
        <div className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg overflow-hidden">
          <div className="divide-y divide-[var(--border)]">
            {unknownImeis.map((item) => (
              <div key={item.imei} className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-orange-400 rounded-full shrink-0" />
                  <div>
                    <div className="font-mono text-sm font-semibold text-[var(--text-primary)]">{item.imei}</div>
                    <div className="text-xs text-[var(--text-secondary)]">
                      Préfixe : <span className="font-mono">{item.imei.slice(0, 5)}…</span>
                      {item.packetCount > 0 && ` · ${item.packetCount} paquets`}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-[var(--text-secondary)]">
                    {item.lastSeen
                      ? new Date(item.lastSeen).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                      : '—'}
                  </div>
                  <div className="text-xs text-orange-600 font-medium">Non enregistré</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-xs text-orange-800">
        <strong>Action requise :</strong> Pour enregistrer un boîtier, allez dans Administration &gt; Flotte et créez un
        véhicule avec cet IMEI. Le boîtier sera automatiquement associé dès le prochain paquet GPS.
      </div>
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
    } catch (e) {
      console.error('[DeviceConfig] fetchStats error:', e);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 15_000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  const tabs: { id: Tab; label: string; icon: React.ElementType; badge?: number }[] = [
    { id: 'DASHBOARD', label: 'Vue globale', icon: Activity },
    { id: 'DEVICE_HEALTH', label: 'Santé boîtier', icon: Cpu },
    { id: 'MODELS_PROTOCOLS', label: 'Modèles & Protocoles', icon: Package },
    {
      id: 'DISCOVERY',
      label: 'IMEI Inconnus',
      icon: AlertTriangle,
      badge: stats?.unknownImeis.length || 0,
    },
    { id: 'GLOBAL_CONFIG', label: 'Configuration', icon: Settings },
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-[var(--bg-elevated)]">
        <h2 className="text-base font-semibold text-[var(--text-primary)]">Paramètres Boîtiers GPS</h2>
        <button
          onClick={fetchStats}
          disabled={loadingStats}
          className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-surface)]"
          title="Rafraîchir"
        >
          <RefreshCw className={`h-4 w-4 ${loadingStats ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Onglets */}
      <div className="flex border-b bg-[var(--bg-elevated)] px-4">
        {tabs.map(({ id, label, icon: Icon, badge }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-sm border-b-2 transition-colors whitespace-nowrap ${
              activeTab === id
                ? 'border-[var(--primary)] text-[var(--primary)] font-medium'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
            {badge != null && badge > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-orange-500 text-white text-xs rounded-full leading-none">
                {badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Contenu */}
      <div className="flex-1 overflow-y-auto p-4 bg-[var(--bg-surface)]">
        {activeTab === 'DASHBOARD' && <DashboardTab stats={stats} />}
        {activeTab === 'DEVICE_HEALTH' && <DeviceHealthTab />}
        {activeTab === 'MODELS_PROTOCOLS' && <ModelsProtocolsTab />}
        {activeTab === 'DISCOVERY' && <DiscoveryTab unknownImeis={stats?.unknownImeis ?? []} />}
        {activeTab === 'GLOBAL_CONFIG' && <GlobalConfigTab />}
      </div>
    </div>
  );
}
