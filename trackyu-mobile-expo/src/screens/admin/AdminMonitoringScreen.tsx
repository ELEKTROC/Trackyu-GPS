/**
 * TrackYu Mobile — Admin Monitoring Screen
 * 3 onglets essentiels (aligné sur MonitoringView web) :
 *   • Alertes    → /monitoring/alerts          (console alertes temps réel)
 *   • Hors ligne → vehiclesApi + filtre offline (trackers déconnectés)
 *   • Anomalies  → /monitoring/anomalies       (anomalies détectées)
 */
import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  AlertTriangle,
  WifiOff,
  Zap,
  CheckCircle,
  XCircle,
  Clock,
  Battery,
  Radio,
  Activity,
  Fuel,
  MapPin,
} from 'lucide-react-native';
import { useTheme } from '../../theme';
import { ProtectedScreen } from '../../components/ProtectedScreen';
import { EmptyState } from '../../components/EmptyState';
import { ADMIN_SCREEN_ROLES } from '../../constants/roles';
import apiClient from '../../api/client';
import alertsApi, { type Alert } from '../../api/alerts';
import vehiclesApi, { type Vehicle } from '../../api/vehicles';
import { normalizeError } from '../../utils/errorTypes';

type ThemeType = ReturnType<typeof import('../../theme').useTheme>['theme'];
type TabKey = 'alerts' | 'offline' | 'anomalies';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Anomaly {
  id: string;
  vehicleId: string;
  vehicleName: string;
  type: 'FUEL' | 'GEOFENCE' | 'SPEED' | 'IDLE' | 'MAINTENANCE' | 'OTHER';
  code?: string;
  label?: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  timestamp: string;
  description: string;
  value?: string | number;
  unit?: string;
  duration?: number;
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED';
}

const TABS: { key: TabKey; label: string; icon: React.ComponentType<{ size: number; color: string }> }[] = [
  { key: 'alerts', label: 'Alertes', icon: AlertTriangle },
  { key: 'offline', label: 'Hors ligne', icon: WifiOff },
  { key: 'anomalies', label: 'Anomalies', icon: Activity },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return '–';
  const diff = Date.now() - new Date(dateStr).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `il y a ${secs}s`;
  if (secs < 3600) return `il y a ${Math.floor(secs / 60)}min`;
  if (secs < 86400) return `il y a ${Math.floor(secs / 3600)}h`;
  return `il y a ${Math.floor(secs / 86400)}j`;
}

// ── Tab : Alertes ─────────────────────────────────────────────────────────────

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#EF4444',
  warning: '#F97316',
  info: '#3B82F6',
};
const SEVERITY_LABELS: Record<string, string> = {
  critical: 'CRITIQUE',
  warning: 'AVERT.',
  info: 'INFO',
};

function AlertsTab({ theme }: { theme: ThemeType }) {
  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['admin-monitoring-alerts'],
    queryFn: () => alertsApi.getPage(1, 50),
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  const alerts: Alert[] = data?.data ?? [];
  const unread = alerts.filter((a) => !a.isRead).length;

  if (isLoading) return <ActivityIndicator color={theme.primary} style={{ marginTop: 40 }} />;

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme.primary} />}
      contentContainerStyle={{ padding: 16 }}
    >
      {/* Résumé */}
      {unread > 0 && (
        <View style={[s(theme).summaryCard, { borderColor: '#EF444466', backgroundColor: '#EF444411' }]}>
          <AlertTriangle size={16} color="#EF4444" />
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#EF4444' }}>
            {unread} alerte{unread > 1 ? 's' : ''} non lue{unread > 1 ? 's' : ''}
          </Text>
        </View>
      )}

      {alerts.length === 0 ? (
        <EmptyState
          icon={<CheckCircle size={40} color="#22C55E" />}
          title="Aucune alerte"
          subtitle="Toutes les alertes ont été lues"
        />
      ) : (
        alerts.map((a) => {
          const color = SEVERITY_COLORS[a.severity] ?? '#6B7280';
          return (
            <View key={a.id} style={[s(theme).listCard, { borderLeftColor: color }]}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View
                    style={{ backgroundColor: color + '22', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}
                  >
                    <Text style={{ fontSize: 10, fontWeight: '700', color }}>
                      {SEVERITY_LABELS[a.severity] ?? a.severity}
                    </Text>
                  </View>
                  {!a.isRead && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />}
                  <Text style={{ fontSize: 11, color: theme.text.muted, marginLeft: 'auto' }}>
                    {timeAgo(a.createdAt)}
                  </Text>
                </View>
                <Text
                  style={{ fontSize: 13, fontWeight: '600', color: theme.text.primary, marginTop: 4 }}
                  numberOfLines={1}
                >
                  {a.title}
                </Text>
                <Text style={{ fontSize: 12, color: theme.text.secondary, marginTop: 2 }} numberOfLines={2}>
                  {a.message}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                  <MapPin size={10} color={theme.text.muted} />
                  <Text style={{ fontSize: 11, color: theme.text.muted }}>
                    {a.vehicleName}
                    {a.vehiclePlate ? ` · ${a.vehiclePlate}` : ''}
                  </Text>
                  {a.clientName && <Text style={{ fontSize: 11, color: theme.text.muted }}>· {a.clientName}</Text>}
                </View>
              </View>
            </View>
          );
        })
      )}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ── Tab : Hors ligne ──────────────────────────────────────────────────────────

// Seuils alignés sur MONITORING_THRESHOLDS web
const OFFLINE_THRESHOLDS = {
  H24: 24 * 3600 * 1000,
  H48: 48 * 3600 * 1000,
  D7: 7 * 86400 * 1000,
  ZOMBIE: 30 * 86400 * 1000,
};

function offlineDuration(v: Vehicle): number {
  if (!v.lastUpdate) return Infinity;
  return Date.now() - new Date(v.lastUpdate).getTime();
}

function offlineLabel(ms: number): { label: string; color: string } {
  if (ms >= OFFLINE_THRESHOLDS.ZOMBIE) return { label: 'Zombie +30j', color: '#7C3AED' };
  if (ms >= OFFLINE_THRESHOLDS.D7) return { label: '+7 jours', color: '#EF4444' };
  if (ms >= OFFLINE_THRESHOLDS.H48) return { label: '+48h', color: '#F97316' };
  if (ms >= OFFLINE_THRESHOLDS.H24) return { label: '+24h', color: '#F59E0B' };
  return { label: 'Récent', color: '#6B7280' };
}

function OfflineTab({ theme }: { theme: ThemeType }) {
  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['vehicles'],
    queryFn: vehiclesApi.getAll,
    staleTime: 30_000,
  });

  const offlineVehicles = useMemo<Vehicle[]>(() => {
    const all = data ?? [];
    return all.filter((v) => v.status === 'offline').sort((a, b) => offlineDuration(b) - offlineDuration(a));
  }, [data]);

  if (isLoading) return <ActivityIndicator color={theme.primary} style={{ marginTop: 40 }} />;

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme.primary} />}
      contentContainerStyle={{ padding: 16 }}
    >
      {/* Résumé */}
      {offlineVehicles.length > 0 && (
        <View style={[s(theme).summaryCard, { borderColor: '#EF444466', backgroundColor: '#EF444411' }]}>
          <WifiOff size={16} color="#EF4444" />
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#EF4444' }}>
            {offlineVehicles.length} tracker{offlineVehicles.length > 1 ? 's' : ''} hors ligne
          </Text>
        </View>
      )}

      {offlineVehicles.length === 0 ? (
        <EmptyState icon={<CheckCircle size={40} color="#22C55E" />} title="Tous les trackers sont en ligne" />
      ) : (
        offlineVehicles.map((v) => {
          const ms = offlineDuration(v);
          const { label: durLabel, color: durColor } = offlineLabel(ms);

          return (
            <View key={v.id} style={[s(theme).listCard, { borderLeftColor: durColor }]}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: theme.text.primary }} numberOfLines={1}>
                    {v.name}
                  </Text>
                  <View
                    style={{
                      backgroundColor: durColor + '22',
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      borderRadius: 4,
                    }}
                  >
                    <Text style={{ fontSize: 10, fontWeight: '700', color: durColor }}>{durLabel}</Text>
                  </View>
                </View>
                <Text style={{ fontSize: 12, color: theme.text.secondary, marginTop: 1 }}>{v.plate}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                  <Clock size={10} color={theme.text.muted} />
                  <Text style={{ fontSize: 11, color: theme.text.muted }}>Dernier fix : {timeAgo(v.lastUpdate)}</Text>
                </View>
              </View>
            </View>
          );
        })
      )}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ── Tab : Anomalies ───────────────────────────────────────────────────────────

const ANOMALY_SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: '#EF4444',
  WARNING: '#F97316',
  INFO: '#3B82F6',
};

function getAnomalyIcon(code?: string, type?: string): React.ComponentType<{ size: number; color: string }> {
  switch (code ?? type) {
    case 'BATTERY_LOW':
    case 'BATTERY':
      return Battery;
    case 'JAMMING':
    case 'GEOFENCE':
      return Radio;
    case 'GPS_JUMP':
    case 'SPEED':
      return Activity;
    case 'FUEL_SUSPECT_LOSS':
    case 'FUEL':
      return Fuel;
    case 'LONG_IDLE':
    case 'IDLE':
      return Clock;
    default:
      return AlertTriangle;
  }
}

function AnomaliesTab({ theme }: { theme: ThemeType }) {
  const { data, isLoading, isRefetching, refetch } = useQuery<Anomaly[]>({
    queryKey: ['admin-anomalies'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/monitoring/anomalies');
        return Array.isArray(res.data) ? (res.data as Anomaly[]) : [];
      } catch (e) {
        throw normalizeError(e);
      }
    },
    staleTime: 60_000,
  });

  const anomalies = useMemo<Anomaly[]>(
    () => [...(data ?? [])].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    [data]
  );

  const openCount = anomalies.filter((a) => a.status === 'OPEN').length;

  if (isLoading) return <ActivityIndicator color={theme.primary} style={{ marginTop: 40 }} />;

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme.primary} />}
      contentContainerStyle={{ padding: 16 }}
    >
      {/* Résumé */}
      {openCount > 0 && (
        <View style={[s(theme).summaryCard, { borderColor: '#F9731666', backgroundColor: '#F9731611' }]}>
          <Zap size={16} color="#F97316" />
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#F97316' }}>
            {openCount} anomalie{openCount > 1 ? 's' : ''} ouvertes
          </Text>
        </View>
      )}

      {anomalies.length === 0 ? (
        <EmptyState
          icon={<CheckCircle size={40} color="#22C55E" />}
          title="Aucune anomalie détectée"
          subtitle="Le système ne signale aucun problème"
        />
      ) : (
        anomalies.map((a) => {
          const color = ANOMALY_SEVERITY_COLORS[a.severity] ?? '#6B7280';
          const AnoIcon = getAnomalyIcon(a.code, a.type);
          const isOpen = a.status === 'OPEN';

          return (
            <View key={a.id} style={[s(theme).listCard, { borderLeftColor: color }]}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: color + '22',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <AnoIcon size={18} color={color} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: theme.text.primary }} numberOfLines={1}>
                    {a.vehicleName}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 5 }}>
                    <View
                      style={{
                        backgroundColor: color + '22',
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        borderRadius: 4,
                      }}
                    >
                      <Text style={{ fontSize: 10, fontWeight: '700', color }}>{a.severity}</Text>
                    </View>
                    {isOpen ? <XCircle size={14} color="#EF4444" /> : <CheckCircle size={14} color="#22C55E" />}
                  </View>
                </View>
                <Text style={{ fontSize: 12, color: theme.text.secondary, marginTop: 2 }} numberOfLines={2}>
                  {a.label ?? a.description}
                </Text>
                {a.value != null && (
                  <Text style={{ fontSize: 11, color: color, marginTop: 2 }}>
                    Valeur : {a.value}
                    {a.unit ? ` ${a.unit}` : ''}
                  </Text>
                )}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                  <Clock size={10} color={theme.text.muted} />
                  <Text style={{ fontSize: 11, color: theme.text.muted }}>{timeAgo(a.timestamp)}</Text>
                </View>
              </View>
            </View>
          );
        })
      )}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function AdminMonitoringScreen() {
  const { theme } = useTheme();
  const nav = useNavigation();
  const [activeTab, setActiveTab] = useState<TabKey>('alerts');

  return (
    <ProtectedScreen allowedRoles={ADMIN_SCREEN_ROLES}>
      <SafeAreaView style={s(theme).container} edges={['top']}>
        {/* Header */}
        <View style={s(theme).header}>
          <TouchableOpacity
            onPress={() => nav.goBack()}
            style={s(theme).back}
            accessibilityLabel="Retour"
            accessibilityRole="button"
          >
            <ArrowLeft size={22} color={theme.text.primary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s(theme).title}>Monitoring</Text>
            <Text style={s(theme).subtitle}>Surveillance temps réel de la flotte</Text>
          </View>
        </View>

        {/* Onglets */}
        <View style={s(theme).tabsRow}>
          {TABS.map((tab) => {
            const active = activeTab === tab.key;
            const Icon = tab.icon;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[s(theme).tab, active && { borderBottomColor: theme.primary, borderBottomWidth: 2 }]}
                onPress={() => setActiveTab(tab.key)}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                accessibilityLabel={tab.label}
              >
                <Icon size={14} color={active ? theme.primary : theme.text.muted} />
                <Text style={[s(theme).tabLabel, { color: active ? theme.primary : theme.text.muted }]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Contenu */}
        {activeTab === 'alerts' && <AlertsTab theme={theme} />}
        {activeTab === 'offline' && <OfflineTab theme={theme} />}
        {activeTab === 'anomalies' && <AnomaliesTab theme={theme} />}
      </SafeAreaView>
    </ProtectedScreen>
  );
}

const s = (theme: ThemeType) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg.primary },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingTop: 12,
      paddingHorizontal: 16,
      paddingBottom: 14,
      gap: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      backgroundColor: theme.bg.surface,
    },
    back: { padding: 4, marginTop: 4 },
    title: { fontSize: 22, fontWeight: '700', color: theme.text.primary },
    subtitle: { fontSize: 12, color: theme.text.muted, marginTop: 2 },
    tabsRow: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      backgroundColor: theme.bg.surface,
    },
    tab: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
      paddingVertical: 12,
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
    },
    tabLabel: { fontSize: 12, fontWeight: '600' },
    listCard: {
      backgroundColor: theme.bg.surface,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'flex-start',
      padding: 12,
      gap: 10,
      borderWidth: 1,
      borderColor: theme.border,
      borderLeftWidth: 4,
      marginBottom: 8,
    },
    summaryCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderRadius: 10,
      borderWidth: 1,
      padding: 10,
      marginBottom: 12,
    },
  });
