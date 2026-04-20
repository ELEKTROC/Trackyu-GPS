/**
 * TrackYu Mobile — Appareils GPS
 * Pipeline stats + diagnostic par IMEI.
 * Correspond à DeviceConfigPanelV2 (web) — onglets Dashboard + Device Health.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Cpu,
  Wifi,
  WifiOff,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Search,
  RefreshCw,
  Zap,
  Radio,
} from 'lucide-react-native';
import { useTheme } from '../../theme';
import { ProtectedScreen } from '../../components/ProtectedScreen';
import { SUPERADMIN_ONLY_ROLES } from '../../constants/roles';
import adminApi, { type GpsPipelineStats, type DeviceDiagnostic } from '../../api/adminApi';

type ThemeType = ReturnType<typeof import('../../theme').useTheme>['theme'];
type Tab = 'pipeline' | 'diagnostic';

// ── Helpers ───────────────────────────────────────────────────────────────────

function SignalBadge({ quality, theme }: { quality: DeviceDiagnostic['signalQuality']; theme: ThemeType }) {
  const meta: Record<DeviceDiagnostic['signalQuality'], { color: string; label: string }> = {
    EXCELLENT: { color: '#22C55E', label: 'Excellent' },
    GOOD: { color: '#84CC16', label: 'Bon' },
    FAIR: { color: '#F59E0B', label: 'Moyen' },
    POOR: { color: '#EF4444', label: 'Faible' },
    UNKNOWN: { color: '#6B7280', label: 'Inconnu' },
  };
  const { color, label } = meta[quality] ?? meta.UNKNOWN;
  return (
    <View style={{ backgroundColor: color + '22', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
      <Text style={{ color, fontSize: 11, fontWeight: '700' }}>{label}</Text>
    </View>
  );
}

function KpiBox({
  label,
  value,
  color,
  theme,
}: {
  label: string;
  value: string | number;
  color: string;
  theme: ThemeType;
}) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.bg.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.border,
        padding: 12,
        alignItems: 'center',
        gap: 4,
      }}
    >
      <Text style={{ fontSize: 20, fontWeight: '800', color }}>{value}</Text>
      <Text style={{ fontSize: 11, color: theme.text.muted, textAlign: 'center' }}>{label}</Text>
    </View>
  );
}

// ── Pipeline Tab ──────────────────────────────────────────────────────────────

function PipelineTab({ theme }: { theme: ThemeType }) {
  const { data, isLoading, isRefetching, refetch } = useQuery<GpsPipelineStats>({
    queryKey: ['admin-gps-stats'],
    queryFn: adminApi.gps.getStats,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  if (isLoading)
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );

  if (!data)
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 }}>
        <AlertTriangle size={48} color={theme.text.muted} />
        <Text style={{ color: theme.text.muted, fontSize: 14 }}>Pipeline inaccessible</Text>
        <TouchableOpacity
          onPress={() => refetch()}
          style={{ backgroundColor: theme.primary, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 }}
        >
          <Text style={{ color: '#fff', fontWeight: '600' }}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, gap: 16 }}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme.primary} />}
    >
      {/* KPI connexions */}
      <View>
        <Text style={s(theme).sectionTitle}>Pipeline GPS</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <KpiBox
            label="Connexions actives"
            value={data.pipeline.activeConnections}
            color={theme.primary}
            theme={theme}
          />
          <KpiBox label="Parsers actifs" value={data.pipeline.activeParsers.length} color="#22C55E" theme={theme} />
        </View>
      </View>

      {/* KPI paquets */}
      <View>
        <Text style={s(theme).sectionTitle}>Totaux paquets</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          <KpiBox label="Total" value={data.totals.packets} color={theme.text.primary} theme={theme} />
          <KpiBox label="Valides" value={data.totals.valid} color="#22C55E" theme={theme} />
          <KpiBox label="Rejetés" value={data.totals.rejected} color="#EF4444" theme={theme} />
          <KpiBox label="Erreurs CRC" value={data.totals.crcErrors} color="#F59E0B" theme={theme} />
        </View>
      </View>

      {/* Parsers */}
      {data.parsers.length > 0 && (
        <View>
          <Text style={s(theme).sectionTitle}>Parsers ({data.parsers.length})</Text>
          <View style={{ gap: 8 }}>
            {data.parsers.map((p) => (
              <View
                key={p.name}
                style={{
                  backgroundColor: theme.bg.surface,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: theme.border,
                  padding: 12,
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 8,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Radio size={16} color={theme.primary} />
                    <Text style={{ fontSize: 14, fontWeight: '700', color: theme.text.primary }}>{p.name}</Text>
                  </View>
                  <View
                    style={{
                      backgroundColor:
                        (p.successRate >= 95 ? '#22C55E' : p.successRate >= 80 ? '#F59E0B' : '#EF4444') + '22',
                      borderRadius: 8,
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '700',
                        color: p.successRate >= 95 ? '#22C55E' : p.successRate >= 80 ? '#F59E0B' : '#EF4444',
                      }}
                    >
                      {p.successRate.toFixed(1)}%
                    </Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 16 }}>
                  <Text style={{ fontSize: 11, color: theme.text.muted }}>
                    Total : <Text style={{ color: theme.text.primary, fontWeight: '600' }}>{p.totalPackets}</Text>
                  </Text>
                  <Text style={{ fontSize: 11, color: theme.text.muted }}>
                    Valides : <Text style={{ color: '#22C55E', fontWeight: '600' }}>{p.validPackets}</Text>
                  </Text>
                  <Text style={{ fontSize: 11, color: theme.text.muted }}>
                    Rejetés : <Text style={{ color: '#EF4444', fontWeight: '600' }}>{p.rejectedPackets}</Text>
                  </Text>
                </View>
                {p.lastSeen && (
                  <Text style={{ fontSize: 10, color: theme.text.muted, marginTop: 6 }}>
                    Dernier paquet : {new Date(p.lastSeen).toLocaleString('fr-FR')}
                  </Text>
                )}
              </View>
            ))}
          </View>
        </View>
      )}

      {/* IMEIs inconnus */}
      {data.unknownImeis.length > 0 && (
        <View>
          <Text style={[s(theme).sectionTitle, { color: '#EF4444' }]}>IMEIs inconnus ({data.unknownImeis.length})</Text>
          <View style={{ gap: 6 }}>
            {data.unknownImeis.slice(0, 10).map((u) => (
              <View
                key={u.imei}
                style={{
                  backgroundColor: '#EF444410',
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: '#EF444430',
                  padding: 10,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#EF4444', fontFamily: 'monospace' }}>
                  {u.imei}
                </Text>
                <Text style={{ fontSize: 11, color: '#EF4444' }}>{u.packetCount} paquets</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ── Diagnostic Tab ────────────────────────────────────────────────────────────

function DiagnosticTab({ theme }: { theme: ThemeType }) {
  const [imei, setImei] = useState('');
  const [searched, setSearched] = useState('');
  const [loading, setLoading] = useState(false);
  const [diag, setDiag] = useState<DeviceDiagnostic | null>(null);

  const fetchDiag = async () => {
    if (imei.trim().length < 10) {
      Alert.alert('IMEI invalide', 'Saisissez un IMEI complet (min. 10 chiffres).');
      return;
    }
    setLoading(true);
    try {
      const result = await adminApi.gps.getDiagnostic(imei.trim());
      setDiag(result);
      setSearched(imei.trim());
    } catch {
      Alert.alert('Introuvable', `Aucun diagnostic pour l'IMEI ${imei.trim()}.`);
      setDiag(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
      {/* Recherche IMEI */}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <TextInput
          style={{
            flex: 1,
            backgroundColor: theme.bg.surface,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: theme.border,
            paddingHorizontal: 14,
            paddingVertical: 12,
            color: theme.text.primary,
            fontSize: 14,
            fontFamily: 'monospace',
          }}
          placeholder="IMEI du boîtier…"
          placeholderTextColor={theme.text.muted}
          value={imei}
          onChangeText={setImei}
          keyboardType="number-pad"
          returnKeyType="search"
          onSubmitEditing={fetchDiag}
        />
        <TouchableOpacity
          style={{
            backgroundColor: theme.primary,
            borderRadius: 12,
            paddingHorizontal: 16,
            justifyContent: 'center',
            alignItems: 'center',
          }}
          onPress={fetchDiag}
          disabled={loading}
          accessibilityLabel="Rechercher IMEI"
          accessibilityRole="button"
        >
          {loading ? <ActivityIndicator size="small" color="#fff" /> : <Search size={20} color="#fff" />}
        </TouchableOpacity>
      </View>

      {diag && (
        <View style={{ gap: 12 }}>
          {/* Status */}
          <View
            style={{
              backgroundColor: theme.bg.surface,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: theme.border,
              padding: 16,
              gap: 10,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: theme.text.primary, fontFamily: 'monospace' }}>
                {searched}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {diag.isConnected ? (
                  <>
                    <Wifi size={16} color="#22C55E" />
                    <Text style={{ color: '#22C55E', fontWeight: '600', fontSize: 12 }}>Connecté</Text>
                  </>
                ) : (
                  <>
                    <WifiOff size={16} color="#EF4444" />
                    <Text style={{ color: '#EF4444', fontWeight: '600', fontSize: 12 }}>Déconnecté</Text>
                  </>
                )}
              </View>
            </View>
            {diag.vehicleName && (
              <Text style={{ fontSize: 14, color: theme.text.secondary }}>
                {diag.vehicleName}
                {diag.vehiclePlate ? ` · ${diag.vehiclePlate}` : ''}
              </Text>
            )}
            <SignalBadge quality={diag.signalQuality} theme={theme} />
          </View>

          {/* Stats */}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <KpiBox label="Protocole" value={diag.protocol ?? '–'} color={theme.primary} theme={theme} />
            <KpiBox label="Paquets aujourd'hui" value={diag.packetsToday} color="#22C55E" theme={theme} />
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <KpiBox
              label="Vitesse km/h"
              value={diag.lastSpeed != null ? diag.lastSpeed : '–'}
              color="#F59E0B"
              theme={theme}
            />
            <KpiBox label="Satellites" value={diag.satellites ?? '–'} color="#8B5CF6" theme={theme} />
          </View>

          {/* Détails */}
          <View
            style={{
              backgroundColor: theme.bg.surface,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: theme.border,
              padding: 14,
              gap: 8,
            }}
          >
            {[
              { label: 'Modèle', value: diag.model },
              { label: 'Variant GT06', value: diag.gt06Variant },
              { label: 'Opérateur', value: diag.operator },
              { label: 'Téléphone', value: diag.phoneNumber },
              { label: 'Dernière fix', value: diag.lastFix ? new Date(diag.lastFix).toLocaleString('fr-FR') : null },
              {
                label: 'Position',
                value: diag.lastPosition
                  ? `${diag.lastPosition.lat.toFixed(5)}, ${diag.lastPosition.lng.toFixed(5)}`
                  : null,
              },
              { label: 'Batterie', value: diag.batteryMv != null ? `${diag.batteryMv} mV` : null },
            ]
              .filter((r) => r.value)
              .map((r) => (
                <View key={r.label} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12, color: theme.text.muted }}>{r.label}</Text>
                  <Text style={{ fontSize: 12, color: theme.text.primary, fontWeight: '600' }}>{r.value}</Text>
                </View>
              ))}
          </View>
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function AdminDevicesScreen() {
  const { theme } = useTheme();
  const nav = useNavigation();
  const [tab, setTab] = useState<Tab>('pipeline');

  return (
    <ProtectedScreen allowedRoles={SUPERADMIN_ONLY_ROLES}>
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg.primary }} edges={['top']}>
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
            <Text style={s(theme).title}>Appareils GPS</Text>
            <Text style={s(theme).subtitle}>Pipeline & diagnostics</Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={s(theme).tabs}>
          {(
            [
              { key: 'pipeline', label: 'Pipeline', icon: Activity },
              { key: 'diagnostic', label: 'Diagnostic IMEI', icon: Cpu },
            ] as const
          ).map((t) => {
            const active = tab === t.key;
            const Icon = t.icon;
            return (
              <TouchableOpacity
                key={t.key}
                style={[s(theme).tabBtn, active && { backgroundColor: theme.primary, borderColor: theme.primary }]}
                onPress={() => setTab(t.key)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Icon size={14} color={active ? '#fff' : theme.text.secondary} />
                <Text style={[s(theme).tabLabel, active && { color: '#fff' }]}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {tab === 'pipeline' ? <PipelineTab theme={theme} /> : <DiagnosticTab theme={theme} />}
      </SafeAreaView>
    </ProtectedScreen>
  );
}

const s = (theme: ThemeType) =>
  StyleSheet.create({
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
    tabs: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingVertical: 12 },
    tabBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 8,
      backgroundColor: theme.bg.surface,
    },
    tabLabel: { fontSize: 13, fontWeight: '600', color: theme.text.secondary },
    sectionTitle: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.text.muted,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: 8,
    },
  });
