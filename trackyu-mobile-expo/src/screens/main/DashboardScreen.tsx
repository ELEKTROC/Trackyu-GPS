/**
 * TrackYu Mobile — Dashboard
 * CLIENT : mini-dashboard mixte flotte + espace client
 * Staff / autres rôles : KPIs flotte + finance inchangés
 */
import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  FlatList,
  Platform,
  useWindowDimensions,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { G, Path, Circle, Polyline, Line, Text as SvgText } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Truck,
  Zap,
  AlertTriangle,
  MapPin,
  ChevronRight,
  Gauge,
  WifiOff,
  Clock,
  TrendingUp,
  Briefcase,
  Receipt,
  FileText,
  Users,
  Wallet,
  ContactRound,
  BarChart3,
  Lock,
  TicketCheck,
  CreditCard,
  Wrench,
  Calendar,
  X,
  Search,
  Bell,
  History,
  Activity,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Package,
  Building2,
  SlidersHorizontal,
} from 'lucide-react-native';
import { useTheme } from '../../theme';
import { VehicleFilterPanel, type FilterBlockDef } from '../../components/VehicleFilterPanel';
import { DashboardSkeleton } from '../../components/SkeletonLoader';
import { GeocodedAddress } from '../../components/GeocodedAddress';
import { useVehicleStore } from '../../store/vehicleStore';
import { useAuthStore } from '../../store/authStore';
import type { RootStackParamList } from '../../navigation/types';
import vehiclesApi, { type Vehicle } from '../../api/vehicles';
import alertsApi from '../../api/alerts';
import { invoicesApi, contractsApi, quotesApi } from '../../api/financeApi';
import { portalApi } from '../../api/portal';
import { formatCurrency } from '../../utils/formatCurrency';
import { ADMIN_SCREEN_ROLES } from '../../constants/roles';
import { VEHICLE_STATUS_COLORS, vehicleStatusColor } from '../../utils/vehicleStatus';
import interventionsApi from '../../api/interventions';
import ticketsApi from '../../api/tickets';
import tiersApi, { type Tier as TierModel } from '../../api/tiersApi';
import stockApi from '../../api/stockApi';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type ThemeType = ReturnType<typeof import('../../theme').useTheme>['theme'];

// ── Role family ───────────────────────────────────────────────────────────────
type RoleFamily = 'CLIENT' | 'COMMERCIAL' | 'FINANCE' | 'SUPPORT' | 'FULL';

function getRoleFamily(role: string | undefined): RoleFamily {
  const r = (role || '').toUpperCase();
  if (r === 'CLIENT') return 'CLIENT';
  if (r === 'COMMERCIAL' || r === 'SALES') return 'COMMERCIAL';
  if (r === 'COMPTABLE') return 'FINANCE';
  if (r === 'SUPPORT' || r === 'SUPPORT_AGENT' || r === 'SUPPORTAGENT') return 'SUPPORT';
  return 'FULL';
}

const fmt = (n: number) => (n ?? 0).toLocaleString('fr-FR');

// ── Helpers date ──────────────────────────────────────────────────────────────
type Period = '1d' | '7d' | '30d';

function getDateRange(period: Period): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date();
  if (period === '7d') start.setDate(start.getDate() - 6);
  else if (period === '30d') start.setDate(start.getDate() - 29);
  const fmt = (d: Date) => d.toISOString().split('T')[0];
  return { startDate: fmt(start), endDate: fmt(end) };
}

// Plage semaine courante clippée (Lundi 00:00 → aujourd'hui)
function getCurrentWeekRange(): { startDate: string; endDate: string } {
  const now = new Date();
  const day = now.getDay(); // 0=Dim, 1=Lun, ..., 6=Sam
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  const fmt = (d: Date) => d.toISOString().split('T')[0];
  return { startDate: fmt(monday), endDate: fmt(now) };
}

// ── Admin period filter ────────────────────────────────────────────────────────
type AdminPeriod = 'today' | 'month' | 'year';

function inPeriod(dateStr: string | null | undefined, period: AdminPeriod): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;
  const now = new Date();
  if (period === 'today') return d.toDateString() === now.toDateString();
  if (period === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  return d.getFullYear() === now.getFullYear();
}

// ── Donut SVG ─────────────────────────────────────────────────────────────────

interface DonutSlice {
  value: number;
  color: string;
  label: string;
}

function DonutChart({
  slices,
  size = 140,
  strokeWidth = 22,
  centerLabel,
  centerSub,
}: {
  slices: DonutSlice[];
  size?: number;
  strokeWidth?: number;
  centerLabel?: string;
  centerSub?: string;
}) {
  const { theme } = useTheme();
  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const total = slices.reduce((s, d) => s + d.value, 0);

  const polarToCartesian = (angle: number) => ({
    x: cx + r * Math.cos((angle - 90) * (Math.PI / 180)),
    y: cy + r * Math.sin((angle - 90) * (Math.PI / 180)),
  });

  const describeArc = (startAngle: number, endAngle: number) => {
    const s = polarToCartesian(startAngle);
    const e = polarToCartesian(endAngle);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${largeArc} 1 ${e.x} ${e.y}`;
  };

  if (total === 0) {
    return (
      <Svg width={size} height={size}>
        <Circle cx={cx} cy={cy} r={r} stroke={theme.border} strokeWidth={strokeWidth} fill="none" />
      </Svg>
    );
  }

  let currentAngle = 0;
  const paths = slices
    .filter((s) => s.value > 0)
    .map((slice, i) => {
      const angle = (slice.value / total) * 360;
      const start = currentAngle;
      const end = currentAngle + angle - 1.5; // gap
      currentAngle += angle;
      return (
        <Path
          key={i}
          d={describeArc(start, end)}
          stroke={slice.color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
        />
      );
    });

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Circle cx={cx} cy={cy} r={r} stroke={theme.border} strokeWidth={strokeWidth} fill="none" />
        <G>{paths}</G>
        {centerLabel && (
          <SvgText x={cx} y={cy - 6} textAnchor="middle" fontSize="20" fontWeight="800" fill={theme.text.primary}>
            {centerLabel}
          </SvgText>
        )}
        {centerSub && (
          <SvgText x={cx} y={cy + 14} textAnchor="middle" fontSize="10" fill={theme.text.muted}>
            {centerSub}
          </SvgText>
        )}
      </Svg>
    </View>
  );
}

// ── Distance Chart SVG (axe Y + labels sur les pics) ─────────────────────────

function DistanceChart({
  data,
  dates,
  color,
  width = 320,
}: {
  data: number[];
  dates: string[];
  color: string;
  width?: number;
}) {
  const { theme } = useTheme();
  const CHART_H = 72;
  const TOP_PAD = 18; // espace labels pics
  const BOT_PAD = 16; // espace labels dates
  const LEFT_PAD = 40; // espace axe Y
  const RIGHT_PAD = 6;
  const TOTAL_H = CHART_H + TOP_PAD + BOT_PAD;
  const chartW = width - LEFT_PAD - RIGHT_PAD;

  if (!data.length || data.every((d) => d === 0)) {
    return (
      <Svg width={width} height={TOTAL_H}>
        <Line
          x1={LEFT_PAD}
          y1={TOP_PAD + CHART_H / 2}
          x2={width - RIGHT_PAD}
          y2={TOP_PAD + CHART_H / 2}
          stroke={theme.border}
          strokeWidth={1}
          strokeDasharray="4 4"
        />
        <SvgText x={LEFT_PAD - 4} y={TOP_PAD + CHART_H / 2 + 4} fontSize={9} fill={theme.text.muted} textAnchor="end">
          0 km
        </SvgText>
      </Svg>
    );
  }

  const rawMax = Math.max(...data, 1);
  const niceMax = Math.ceil(rawMax / 10) * 10;
  const step = data.length > 1 ? chartW / (data.length - 1) : chartW;

  const pts = data.map((v, i) => ({
    x: LEFT_PAD + i * step,
    y: TOP_PAD + CHART_H - (v / niceMax) * CHART_H,
    v,
  }));

  const polyline = pts.map((p) => `${p.x},${p.y}`).join(' ');
  const areaPath =
    `M ${pts[0].x} ${TOP_PAD + CHART_H} ` +
    pts.map((p) => `L ${p.x} ${p.y}`).join(' ') +
    ` L ${pts[pts.length - 1].x} ${TOP_PAD + CHART_H} Z`;

  const yLabels = [
    { val: niceMax, y: TOP_PAD },
    { val: Math.round(niceMax / 2), y: TOP_PAD + CHART_H / 2 },
    { val: 0, y: TOP_PAD + CHART_H },
  ];

  return (
    <Svg width={width} height={TOTAL_H}>
      {/* Grille + labels axe Y */}
      {yLabels.map((l) => (
        <G key={l.val}>
          <Line
            x1={LEFT_PAD}
            y1={l.y}
            x2={width - RIGHT_PAD}
            y2={l.y}
            stroke={theme.border}
            strokeWidth={1}
            strokeDasharray="3 3"
          />
          <SvgText x={LEFT_PAD - 4} y={l.y + 4} fontSize={9} fill={theme.text.muted} textAnchor="end">
            {l.val} km
          </SvgText>
        </G>
      ))}
      {/* Aire sous la courbe */}
      <Path d={areaPath} fill={color + '18'} />
      {/* Ligne */}
      <Polyline
        points={polyline}
        fill="none"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Points + labels pics */}
      {pts.map((p, i) => (
        <G key={i}>
          <Circle cx={p.x} cy={p.y} r={3.5} fill={color} />
          {p.v > 0 && (
            <SvgText x={p.x} y={p.y - 6} fontSize={8} fill={color} textAnchor="middle" fontWeight="700">
              {Math.round(p.v)}
            </SvgText>
          )}
          {dates[i] && (
            <SvgText x={p.x} y={TOTAL_H} fontSize={8} fill={theme.text.muted} textAnchor="middle">
              {dates[i].slice(5)}
            </SvgText>
          )}
        </G>
      ))}
    </Svg>
  );
}

// ── ImmobilizeModal (réutilisé depuis VehicleDetailScreen) ────────────────────

function ImmobilizeModal({
  visible,
  vehicleId,
  vehicleName,
  isCurrentlyImmobilized,
  onClose,
  theme,
}: {
  visible: boolean;
  vehicleId: string;
  vehicleName: string;
  isCurrentlyImmobilized: boolean;
  onClose: () => void;
  theme: ThemeType;
}) {
  const [pw, setPw] = useState('');
  const qc = useQueryClient();

  useEffect(() => {
    if (!visible) setPw('');
  }, [visible]);

  const mutation = useMutation({
    mutationFn: () => vehiclesApi.toggleImmobilize(vehicleId, !isCurrentlyImmobilized),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vehicles'] });
      onClose();
    },
  });

  const willImmobilize = !isCurrentlyImmobilized;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={{ flex: 1, backgroundColor: '#00000077', justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: theme.bg.surface, borderRadius: 16, padding: 20, gap: 14 }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: '700',
                color: willImmobilize ? theme.functional.error : theme.functional.success,
              }}
            >
              {willImmobilize ? '⚠️ Immobiliser le véhicule' : '✅ Remettre en marche'}
            </Text>
            <Text style={{ fontSize: 13, color: theme.text.primary, fontWeight: '600' }}>{vehicleName}</Text>
            <Text style={{ fontSize: 13, color: theme.text.secondary, lineHeight: 20 }}>
              {willImmobilize
                ? "Cette action va couper le moteur à distance. Assurez-vous que le véhicule est à l'arrêt complet."
                : 'Cette action va remettre le véhicule en marche. Vérifiez la situation avant de procéder.'}
            </Text>
            <Text style={{ fontSize: 13, fontWeight: '600', color: theme.text.primary }}>
              Confirmez avec votre mot de passe :
            </Text>
            <TextInput
              style={{
                backgroundColor: theme.bg.primary,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: theme.border,
                paddingHorizontal: 14,
                paddingVertical: 11,
                color: theme.text.primary,
                fontSize: 14,
              }}
              value={pw}
              onChangeText={setPw}
              secureTextEntry
              placeholder="Mot de passe"
              placeholderTextColor={theme.text.muted}
              autoFocus
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: theme.border,
                  paddingVertical: 12,
                  alignItems: 'center',
                }}
                onPress={onClose}
              >
                <Text style={{ color: theme.text.secondary, fontWeight: '600' }}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flex: 1,
                  borderRadius: 10,
                  backgroundColor: willImmobilize ? theme.functional.error : theme.functional.success,
                  paddingVertical: 12,
                  alignItems: 'center',
                  opacity: pw.length < 4 || mutation.isPending ? 0.5 : 1,
                }}
                onPress={() => pw.length >= 4 && mutation.mutate()}
                disabled={pw.length < 4 || mutation.isPending}
              >
                {mutation.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={{ color: '#fff', fontWeight: '700' }}>
                    {willImmobilize ? 'Immobiliser' : 'Remettre en marche'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── VehiclePickerModal ─────────────────────────────────────────────────────────

function VehiclePickerModal({
  visible,
  vehicles,
  onSelect,
  onClose,
  theme,
}: {
  visible: boolean;
  vehicles: Vehicle[];
  onSelect: (v: Vehicle) => void;
  onClose: () => void;
  theme: ThemeType;
}) {
  const [search, setSearch] = useState('');
  const filtered = vehicles.filter(
    (v) =>
      (v.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (v.plate ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#00000066', justifyContent: 'flex-end' }}>
        <View
          style={{
            backgroundColor: theme.bg.surface,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            maxHeight: '75%',
            paddingBottom: Platform.OS === 'ios' ? 34 : 16,
          }}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: 16,
              borderBottomWidth: 1,
              borderBottomColor: theme.border,
            }}
          >
            <Text style={{ flex: 1, fontSize: 16, fontWeight: '700', color: theme.text.primary }}>
              Sélectionner un véhicule
            </Text>
            <TouchableOpacity onPress={onClose}>
              <X size={20} color={theme.text.muted} />
            </TouchableOpacity>
          </View>
          {/* Search */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              margin: 12,
              backgroundColor: theme.bg.elevated,
              borderRadius: 10,
              paddingHorizontal: 12,
              gap: 8,
              borderWidth: 1,
              borderColor: theme.border,
            }}
          >
            <Search size={14} color={theme.text.muted} />
            <TextInput
              style={{ flex: 1, color: theme.text.primary, fontSize: 14, paddingVertical: 10 }}
              placeholder="Plaque ou nom..."
              placeholderTextColor={theme.text.muted}
              value={search}
              onChangeText={setSearch}
            />
          </View>
          {/* List */}
          <FlatList
            data={filtered}
            keyExtractor={(v) => v.id}
            initialNumToRender={15}
            maxToRenderPerBatch={10}
            windowSize={10}
            renderItem={({ item }) => {
              const statusColor = vehicleStatusColor(item.status);
              return (
                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: theme.border,
                    gap: 12,
                  }}
                  onPress={() => {
                    onSelect(item);
                    setSearch('');
                  }}
                  activeOpacity={0.75}
                >
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: statusColor }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text.primary }}>{item.name}</Text>
                    <Text style={{ fontSize: 12, color: theme.text.muted, fontFamily: 'monospace' }}>{item.plate}</Text>
                  </View>
                  {item.isImmobilized && (
                    <View
                      style={{
                        backgroundColor: '#EF444422',
                        borderRadius: 6,
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                      }}
                    >
                      <Text style={{ fontSize: 10, color: '#EF4444', fontWeight: '700' }}>Immobilisé</Text>
                    </View>
                  )}
                  <ChevronRight size={14} color={theme.text.muted} />
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={{ padding: 32, alignItems: 'center' }}>
                <Text style={{ color: theme.text.muted, fontSize: 13 }}>Aucun véhicule trouvé</Text>
              </View>
            }
          />
        </View>
      </View>
    </Modal>
  );
}

// ── Sub-components Staff ───────────────────────────────────────────────────────

function KpiTile({
  value,
  label,
  subtitle,
  color,
  icon,
  theme,
  onPress,
}: {
  value: number | string;
  label: string;
  subtitle?: string;
  color: string;
  icon: React.ReactNode;
  theme: ThemeType;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      style={{
        flex: 1,
        backgroundColor: theme.bg.surface,
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: theme.border,
        gap: 6,
      }}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.75 : 1}
    >
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 9,
          backgroundColor: color + '22',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {icon}
      </View>
      <Text style={{ fontSize: 22, fontWeight: '800', color }}>{value}</Text>
      <Text style={{ fontSize: 11, color: theme.text.muted, fontWeight: '500' }}>{label}</Text>
      {subtitle && <Text style={{ fontSize: 10, color: theme.text.muted }}>{subtitle}</Text>}
    </TouchableOpacity>
  );
}

function SectionHeader({ title, onSeeAll, theme }: { title: string; onSeeAll?: () => void; theme: ThemeType }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
      <Text
        style={{
          fontSize: 13,
          fontWeight: '700',
          color: theme.text.secondary,
          textTransform: 'uppercase',
          letterSpacing: 0.8,
        }}
      >
        {title}
      </Text>
      {onSeeAll && (
        <TouchableOpacity onPress={onSeeAll} style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
          <Text style={{ fontSize: 12, color: theme.primary, fontWeight: '600' }}>Tout voir</Text>
          <ChevronRight size={12} color={theme.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const ALERT_TYPE_LABELS: Record<string, string> = {
  speed: 'Excès de vitesse',
  geofence: 'Zone géographique',
  fuel: 'Carburant',
  maintenance: 'Maintenance',
  battery: 'Batterie faible',
  offline: 'Hors ligne',
  sos: 'SOS / Urgence',
  idle: 'Ralenti excessif',
  immobilization: 'Immobilisation',
};
const SEVERITY_COLORS: Record<string, string> = {
  critical: '#EF4444',
  high: '#F97316',
  medium: '#F59E0B',
  low: '#6B7280',
  warning: '#F59E0B',
  info: '#3B82F6',
};

// ── CLIENT Dashboard ──────────────────────────────────────────────────────────

function ClientDashboard({
  vehicles,
  isRefetching,
  onRefresh,
  nav,
  theme,
}: {
  vehicles: Vehicle[];
  isRefetching: boolean;
  onRefresh: () => void;
  nav: Nav;
  theme: ThemeType;
}) {
  const s = clientStyles(theme);
  const user = useAuthStore((st) => st.user);
  const { width: screenWidth } = useWindowDimensions();
  const chartWidth = screenWidth - 64;
  const [pickerVisible, setPickerVisible] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [immoVisible, setImmoVisible] = useState(false);
  const [historyPickerVisible, setHistoryPickerVisible] = useState(false);
  const [activityFilter, setActivityFilter] = useState<'today' | 'week' | 'month' | 'all'>('all');
  const [activityExpanded, setActivityExpanded] = useState(false);

  const { startDate, endDate } = getCurrentWeekRange();

  // Portal dashboard (factures, tickets, interventions, abonnements)
  const { data: portalData } = useQuery({
    queryKey: ['portal-dashboard'],
    queryFn: () => portalApi.getDashboard(),
    staleTime: 60_000,
  });

  // Alertes récentes
  const { data: alertsPage } = useQuery({
    queryKey: ['alerts-recent'],
    queryFn: () => alertsApi.getPage(1, 50),
    staleTime: 30_000,
  });

  const allAlerts = alertsPage?.data ?? [];

  // Abonnements (pour détecter expiration < 30j)
  const { data: subscriptions = [] } = useQuery({
    queryKey: ['portal-subscriptions-dash'],
    queryFn: portalApi.getSubscriptions,
    staleTime: 300_000,
  });

  // Flux activité — factures, tickets, interventions
  const { data: invoicesPage } = useQuery({
    queryKey: ['portal-invoices-dash'],
    queryFn: () => portalApi.getInvoices(1, 30),
    staleTime: 60_000,
  });

  const { data: ticketsPage } = useQuery({
    queryKey: ['portal-tickets-dash'],
    queryFn: () => portalApi.getMyTickets(1, 20),
    staleTime: 60_000,
  });

  const { data: feedInterventions = [] } = useQuery({
    queryKey: ['portal-interventions-dash'],
    queryFn: portalApi.getMyInterventions,
    staleTime: 60_000,
  });

  // Distance par jour (sparkline) — aggrégée sur tous les véhicules
  // On utilise getDailyRange sur le premier véhicule disponible comme proxy global
  // (les données sont déjà filtrées par clientId côté backend)
  const { data: dailyRangeData = [] } = useQuery({
    queryKey: ['daily-range-all', startDate, endDate, vehicles[0]?.id],
    queryFn: async () => {
      if (!vehicles.length) return [];
      // On agrège les données de tous les véhicules (max 10 pour éviter N+1)
      const results = await Promise.all(
        vehicles.slice(0, 10).map((v) => vehiclesApi.getDailyRange(v.id, startDate, endDate).catch(() => []))
      );
      // Fusionner par date
      const byDate: Record<string, number> = {};
      results.flat().forEach((r) => {
        byDate[r.date] = (byDate[r.date] ?? 0) + r.totalDistance;
      });
      // Générer toutes les dates de la période
      const days: { date: string; dist: number }[] = [];
      const cursor = new Date(startDate);
      const endD = new Date(endDate);
      while (cursor <= endD) {
        const k = cursor.toISOString().split('T')[0];
        days.push({ date: k, dist: Math.round((byDate[k] ?? 0) * 10) / 10 });
        cursor.setDate(cursor.getDate() + 1);
      }
      return days;
    },
    enabled: vehicles.length > 0,
    staleTime: 60_000,
  });

  // KPIs flotte
  const moving = vehicles.filter((v) => v.status === 'moving').length;
  const stopped = vehicles.filter((v) => v.status === 'stopped').length;
  const idle = vehicles.filter((v) => v.status === 'idle').length;
  const offline = vehicles.filter((v) => v.status === 'offline').length;
  const total = vehicles.length;

  // 3 alertes récentes par criticité
  const SEVERITY_ORDER: Record<string, number> = { critical: 0, warning: 1, info: 2 };
  const recentAlertsByPriority = useMemo(
    () =>
      [...allAlerts]
        .sort((a, b) => {
          const sa = SEVERITY_ORDER[a.severity] ?? 9;
          const sb = SEVERITY_ORDER[b.severity] ?? 9;
          if (sa !== sb) return sa - sb;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        })
        .slice(0, 3),
    [allAlerts]
  );

  // Badge non lues
  const unreadCount = allAlerts.filter((a) => !a.isRead).length;

  // Distance totale semaine courante (Lun → Dim) + distance du jour
  const totalDistancePeriod = dailyRangeData.reduce((s, d) => s + d.dist, 0);
  const todayKey = new Date().toISOString().split('T')[0];
  const todayDistance = dailyRangeData.find((d) => d.date === todayKey)?.dist ?? 0;
  const sparklineData = dailyRangeData.map((d) => d.dist);

  // Donut slices
  const donutSlices: DonutSlice[] = [
    { value: moving, color: VEHICLE_STATUS_COLORS.moving, label: 'En route' },
    { value: stopped, color: VEHICLE_STATUS_COLORS.stopped, label: 'Arrêté' },
    { value: idle, color: VEHICLE_STATUS_COLORS.idle, label: 'Ralenti' },
    { value: offline, color: VEHICLE_STATUS_COLORS.offline, label: 'Hors ligne' },
  ];

  // Abonnement expirant dans < 30 jours
  const expiringSubscription = useMemo(
    () =>
      subscriptions.find((s) => {
        if (s.status !== 'ACTIVE' || !s.end_date) return false;
        const daysLeft = Math.ceil((new Date(s.end_date).getTime() - Date.now()) / 86_400_000);
        return daysLeft >= 0 && daysLeft <= 30;
      }) ?? null,
    [subscriptions]
  );

  // Flux d'activité — factures + tickets + interventions + immobilisations
  type ActivityItem = {
    id: string;
    icon: React.ReactNode;
    iconBg: string;
    title: string;
    subtitle: string;
    plate?: string;
    dateStr: string;
    dateTs: number;
    onPress?: () => void;
  };

  const fmtRelDate = (d: string | null): string => {
    if (!d) return '';
    const ts = new Date(d);
    if (isNaN(ts.getTime())) return '';
    const diffDays = Math.floor((Date.now() - ts.getTime()) / 86_400_000);
    if (diffDays === 0) return 'Auj.';
    if (diffDays === 1) return 'Hier';
    if (diffDays < 7) return `il y a ${diffDays} j.`;
    return ts.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  const activityFeed = useMemo<ActivityItem[]>(() => {
    const items: ActivityItem[] = [];

    (invoicesPage?.data ?? []).forEach((inv) => {
      const isPaid = inv.status === 'PAID';
      const isOverdue = inv.status === 'OVERDUE';
      const iconColor = isPaid ? '#22C55E' : isOverdue ? '#EF4444' : '#3B82F6';
      const statusLabel = isPaid ? 'payée' : isOverdue ? 'en retard' : inv.status === 'SENT' ? 'envoyée' : 'en attente';
      const ts = new Date(inv.date).getTime();
      if (!isNaN(ts))
        items.push({
          id: `inv-${inv.id}`,
          icon: isPaid ? (
            <CheckCircle2 size={15} color={iconColor} />
          ) : isOverdue ? (
            <AlertCircle size={15} color={iconColor} />
          ) : (
            <FileText size={15} color={iconColor} />
          ),
          iconBg: iconColor + '22',
          title: `Facture ${inv.invoice_number}`,
          subtitle: `${formatCurrency(inv.amount_ttc)} · ${statusLabel}`,
          dateStr: fmtRelDate(inv.date),
          dateTs: ts,
          onPress: () => nav.navigate('Portal'),
        });
    });

    (ticketsPage?.data ?? []).forEach((t) => {
      const isClosed = t.status === 'CLOSED' || t.status === 'RESOLVED';
      const iconColor = isClosed
        ? '#6B7280'
        : t.priority === 'HIGH' || t.priority === 'CRITICAL'
          ? '#EF4444'
          : '#F59E0B';
      const statusMap: Record<string, string> = {
        OPEN: 'ouvert',
        IN_PROGRESS: 'en cours',
        WAITING_CLIENT: 'en attente',
        RESOLVED: 'résolu',
        CLOSED: 'fermé',
      };
      const ts = new Date(t.created_at).getTime();
      if (!isNaN(ts))
        items.push({
          id: `ticket-${t.id}`,
          icon: <TicketCheck size={15} color={iconColor} />,
          iconBg: iconColor + '22',
          title: `Ticket ${statusMap[t.status] ?? t.status}`,
          subtitle: t.subject.length > 38 ? t.subject.slice(0, 38) + '…' : t.subject,
          dateStr: fmtRelDate(t.created_at),
          dateTs: ts,
          onPress: () => nav.navigate('Portal'),
        });
    });

    feedInterventions.forEach((i) => {
      const isDone = i.status === 'COMPLETED';
      const iconColor = isDone ? '#22C55E' : '#8B5CF6';
      const ts = new Date(i.scheduled_date).getTime();
      if (!isNaN(ts))
        items.push({
          id: `int-${i.id}`,
          icon: <Wrench size={15} color={iconColor} />,
          iconBg: iconColor + '22',
          title: `Intervention ${isDone ? 'terminée' : 'planifiée'}`,
          subtitle: [i.vehicle_name, i.location].filter(Boolean).join(' · ') || '–',
          plate: i.license_plate ?? undefined,
          dateStr: fmtRelDate(i.scheduled_date),
          dateTs: ts,
          onPress: () => nav.navigate('Portal'),
        });
    });

    vehicles
      .filter((v) => v.isImmobilized)
      .forEach((v) => {
        items.push({
          id: `immo-${v.id}`,
          icon: <Lock size={15} color="#EF4444" />,
          iconBg: '#EF444422',
          title: 'Véhicule immobilisé',
          subtitle: v.name ?? '–',
          plate: v.plate ?? undefined,
          dateStr: 'Maintenant',
          dateTs: Date.now(),
          onPress: () => nav.navigate('VehicleDetail', { vehicleId: v.id }),
        });
      });

    return items.sort((a, b) => b.dateTs - a.dateTs);
  }, [invoicesPage, ticketsPage, feedInterventions, vehicles]);

  const filteredFeed = useMemo(() => {
    const now = Date.now();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    return activityFeed.filter((item) => {
      if (activityFilter === 'today') return item.dateTs >= todayStart.getTime();
      if (activityFilter === 'week') return item.dateTs >= now - 7 * 86_400_000;
      if (activityFilter === 'month') return item.dateTs >= now - 30 * 86_400_000;
      return true;
    });
  }, [activityFeed, activityFilter]);

  const greetHour = new Date().getHours();
  const greeting = greetHour < 12 ? 'Bonjour' : greetHour < 18 ? 'Bon après-midi' : 'Bonsoir';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg.primary }} edges={['top']}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingTop: 12, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={theme.primary} />}
      >
        {/* Header */}
        <View style={s.header}>
          <View style={{ flex: 1 }}>
            <Text style={s.greeting}>{greeting}</Text>
            <Text style={s.name}>{user?.name ?? 'Client'}</Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <Text style={{ fontSize: 13, color: theme.text.muted, fontWeight: '500' }}>
              {new Date().toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long' })}
            </Text>
            {unreadCount > 0 && (
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  backgroundColor: '#EF444422',
                  borderRadius: 8,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                }}
                onPress={() => nav.navigate('Alerts')}
                activeOpacity={0.8}
              >
                <Bell size={11} color="#EF4444" />
                <Text style={{ fontSize: 11, color: '#EF4444', fontWeight: '700' }}>
                  {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── Bloc Situation financière ─────────────────────────────────────── */}
        <View style={s.card}>
          <SectionHeader
            title="Situation financière"
            onSeeAll={() => nav.navigate('Portal', { screen: 'PortalInvoices' } as never)}
            theme={theme}
          />
          {(portalData?.invoices?.totalDue ?? 0) > 0 ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  backgroundColor: '#EF444422',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <AlertTriangle size={20} color="#EF4444" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#EF4444' }}>
                  {formatCurrency(portalData!.invoices.totalDue)}
                </Text>
                <Text style={{ fontSize: 12, color: theme.text.muted }}>
                  {portalData!.invoices.unpaid} facture{portalData!.invoices.unpaid > 1 ? 's' : ''} impayée
                  {portalData!.invoices.unpaid > 1 ? 's' : ''}
                </Text>
              </View>
              <TouchableOpacity
                style={{ backgroundColor: '#EF4444', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 }}
                onPress={() => nav.navigate('Portal', { screen: 'PortalInvoices' } as never)}
                activeOpacity={0.8}
              >
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>Payer</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 }}>
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 9,
                  backgroundColor: '#22C55E22',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <CheckCircle2 size={15} color="#22C55E" />
              </View>
              <Text style={{ fontSize: 13, color: theme.text.muted, fontStyle: 'italic' }}>
                Félicitations, vous êtes à jour !
              </Text>
            </View>
          )}
        </View>

        {/* ── Bloc 1 — Flotte ────────────────────────────────────────────────── */}
        <View style={s.card}>
          <SectionHeader
            title="Ma flotte"
            onSeeAll={() => nav.navigate('Main', { screen: 'Fleet' } as never)}
            theme={theme}
          />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            {/* Donut */}
            <DonutChart
              slices={donutSlices}
              size={130}
              strokeWidth={20}
              centerLabel={String(total)}
              centerSub="véhicules"
            />
            {/* Légende */}
            <View style={{ flex: 1, gap: 8 }}>
              {donutSlices.map((slice) => (
                <View key={slice.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: slice.color }} />
                  <Text style={{ flex: 1, fontSize: 12, color: theme.text.secondary }}>{slice.label}</Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: slice.color }}>{slice.value}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Abonnement expirant < 30j */}
          {expiringSubscription && (
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                backgroundColor: '#F59E0B18',
                borderRadius: 10,
                padding: 10,
                borderWidth: 1,
                borderColor: '#F59E0B44',
                marginTop: 12,
              }}
              onPress={() => nav.navigate('Portal')}
              activeOpacity={0.8}
            >
              <Calendar size={14} color="#F59E0B" />
              <Text style={{ flex: 1, fontSize: 12, color: '#92400E', fontWeight: '500' }}>
                Abonnement expire dans{' '}
                {Math.ceil((new Date(expiringSubscription.end_date!).getTime() - Date.now()) / 86_400_000)} jours
              </Text>
              <ChevronRight size={13} color="#F59E0B" />
            </TouchableOpacity>
          )}

          {/* Lien Voir ma flotte */}
          {vehicles.length > 0 && (
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                marginTop: 12,
                paddingTop: 12,
                borderTopWidth: 1,
                borderTopColor: theme.border,
              }}
              onPress={() => nav.navigate('Main', { screen: 'Fleet' } as never)}
              activeOpacity={0.75}
              accessibilityLabel="Voir ma flotte"
            >
              <Truck size={14} color={theme.primary} />
              <Text style={{ fontSize: 13, fontWeight: '600', color: theme.primary }}>Voir ma flotte</Text>
              <ChevronRight size={13} color={theme.primary} />
            </TouchableOpacity>
          )}
        </View>

        {/* ── Bloc 2 — Distance parcourue (sparkline) ────────────────────────── */}
        <View style={s.card}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: 10,
            }}
          >
            <Text style={s.cardTitle}>Distance parcourue</Text>
            <TrendingUp size={20} color={theme.primary} />
          </View>
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 10 }}>
            {/* Aujourd'hui */}
            <View
              style={{
                flex: 1,
                backgroundColor: theme.bg.elevated,
                borderRadius: 10,
                padding: 10,
                borderWidth: 1,
                borderColor: theme.border,
              }}
            >
              <Text style={{ fontSize: 11, color: theme.text.muted, marginBottom: 2 }}>Aujourd'hui</Text>
              <Text style={{ fontSize: 20, fontWeight: '800', color: theme.primary }}>
                {todayDistance >= 1000 ? `${(todayDistance / 1000).toFixed(1)}k` : `${Math.round(todayDistance)}`}
                <Text style={{ fontSize: 12, fontWeight: '500', color: theme.text.muted }}> km</Text>
              </Text>
            </View>
            {/* Cette semaine (Lun → Dim) */}
            <View
              style={{
                flex: 1,
                backgroundColor: theme.bg.elevated,
                borderRadius: 10,
                padding: 10,
                borderWidth: 1,
                borderColor: theme.border,
              }}
            >
              <Text style={{ fontSize: 11, color: theme.text.muted, marginBottom: 2 }}>Cette semaine (Lun–Dim)</Text>
              <Text style={{ fontSize: 20, fontWeight: '800', color: theme.text.primary }}>
                {totalDistancePeriod >= 1000
                  ? `${(totalDistancePeriod / 1000).toFixed(1)}k`
                  : `${Math.round(totalDistancePeriod)}`}
                <Text style={{ fontSize: 12, fontWeight: '500', color: theme.text.muted }}> km</Text>
              </Text>
            </View>
          </View>
          {sparklineData.length > 1 ? (
            <DistanceChart
              data={sparklineData}
              dates={dailyRangeData.map((d) => d.date)}
              color={theme.primary}
              width={chartWidth}
            />
          ) : (
            <Text style={{ fontSize: 12, color: theme.text.muted, marginTop: 8 }}>
              Repassez demain pour voir l'évolution sur plusieurs jours.
            </Text>
          )}

          {/* Lien Historique */}
          {vehicles.length > 0 && (
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                marginTop: 12,
                paddingTop: 12,
                borderTopWidth: 1,
                borderTopColor: theme.border,
              }}
              onPress={() => {
                if (vehicles.length === 1) {
                  nav.navigate('VehicleHistory', {
                    vehicleId: vehicles[0].id,
                    plate: vehicles[0].plate ?? '',
                    vehicleType: vehicles[0].type ?? 'car',
                  });
                } else {
                  setHistoryPickerVisible(true);
                }
              }}
              activeOpacity={0.75}
              accessibilityLabel="Voir l'historique"
            >
              <History size={14} color={theme.primary} />
              <Text style={{ fontSize: 13, fontWeight: '600', color: theme.primary }}>Voir l'historique</Text>
              <ChevronRight size={13} color={theme.primary} />
            </TouchableOpacity>
          )}
        </View>

        {/* ── Bloc 3 — Mes Alertes ────────────────────────────────────────────── */}
        <View style={s.card}>
          <SectionHeader title="Mes alertes" onSeeAll={() => nav.navigate('Alerts')} theme={theme} />
          {recentAlertsByPriority.length === 0 ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 }}>
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 9,
                  backgroundColor: '#22C55E22',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <CheckCircle2 size={15} color="#22C55E" />
              </View>
              <Text style={{ fontSize: 13, color: theme.text.muted, fontStyle: 'italic' }}>
                Aucune alerte reçue ce jour
              </Text>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {recentAlertsByPriority.map((a) => {
                const sColor = SEVERITY_COLORS[a.severity] ?? '#6B7280';
                const timeStr = (() => {
                  const d = new Date(a.createdAt);
                  return isNaN(d.getTime())
                    ? '–'
                    : d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                })();
                return (
                  <TouchableOpacity
                    key={a.id}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
                    onPress={() => nav.navigate('Alerts')}
                    activeOpacity={0.75}
                  >
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 9,
                        backgroundColor: sColor + '22',
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <AlertTriangle size={15} color={sColor} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: theme.text.primary }} numberOfLines={1}>
                        {ALERT_TYPE_LABELS[a.type] ?? a.type}
                      </Text>
                      <Text style={{ fontSize: 11, color: theme.text.muted }} numberOfLines={1}>
                        {a.vehicleName ?? '–'}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 11, color: theme.text.muted }}>{timeStr}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* ── Bloc 4 — Mes Opérations ────────────────────────────────────────── */}
        <View style={s.card}>
          <View
            style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}
          >
            <Text style={s.cardTitle}>Mes Opérations</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Activity size={14} color={theme.text.muted} />
              <TouchableOpacity
                onPress={() => nav.navigate('Portal')}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}
              >
                <Text style={{ fontSize: 12, color: theme.primary, fontWeight: '600' }}>Mon Espace</Text>
                <ChevronRight size={12} color={theme.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Filtres — visibles uniquement quand étendu */}
          {activityExpanded && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 10, marginHorizontal: -4 }}
            >
              <View style={{ flexDirection: 'row', gap: 6, paddingHorizontal: 4 }}>
                {(['all', 'today', 'week', 'month'] as const).map((f) => {
                  const labels = { all: 'Tout', today: 'Auj.', week: 'Cette sem.', month: 'Ce mois' };
                  const active = activityFilter === f;
                  return (
                    <TouchableOpacity
                      key={f}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 5,
                        borderRadius: 20,
                        backgroundColor: active ? theme.primary : theme.bg.elevated,
                        borderWidth: 1,
                        borderColor: active ? theme.primary : theme.border,
                      }}
                      onPress={() => setActivityFilter(f)}
                      activeOpacity={0.75}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '600', color: active ? '#fff' : theme.text.secondary }}>
                        {labels[f]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          )}

          {/* Items */}
          {filteredFeed.length === 0 ? (
            <Text style={{ fontSize: 13, color: theme.text.muted, textAlign: 'center', paddingVertical: 16 }}>
              Aucune opération récente
            </Text>
          ) : (
            <View>
              {(activityExpanded ? filteredFeed : filteredFeed.slice(0, 3)).map((item, i) => (
                <TouchableOpacity
                  key={item.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                    paddingVertical: 9,
                    borderBottomWidth:
                      i < (activityExpanded ? filteredFeed.length : Math.min(filteredFeed.length, 3)) - 1 ? 1 : 0,
                    borderBottomColor: theme.border,
                  }}
                  onPress={item.onPress}
                  activeOpacity={item.onPress ? 0.75 : 1}
                  disabled={!item.onPress}
                >
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 9,
                      backgroundColor: item.iconBg,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    {item.icon}
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text
                        style={{ fontSize: 13, fontWeight: '600', color: theme.text.primary, flex: 1 }}
                        numberOfLines={1}
                      >
                        {item.title}
                      </Text>
                      {item.plate && (
                        <View
                          style={{
                            backgroundColor: theme.bg.elevated,
                            borderRadius: 4,
                            paddingHorizontal: 5,
                            paddingVertical: 1,
                            borderWidth: 1,
                            borderColor: theme.border,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 9,
                              color: theme.text.secondary,
                              fontFamily: 'monospace',
                              fontWeight: '700',
                              letterSpacing: 0.5,
                            }}
                          >
                            {item.plate}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={{ fontSize: 11, color: theme.text.muted }} numberOfLines={1}>
                      {item.subtitle}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 10, color: theme.text.muted, textAlign: 'right' }}>{item.dateStr}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Voir plus / Réduire */}
          {filteredFeed.length > 3 && (
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                paddingTop: 10,
                marginTop: 2,
              }}
              onPress={() => setActivityExpanded((v) => !v)}
              activeOpacity={0.75}
            >
              <Text style={{ fontSize: 12, color: theme.primary, fontWeight: '600' }}>
                {activityExpanded ? 'Réduire' : `Voir plus (${filteredFeed.length - 3})`}
              </Text>
              <ChevronRight size={12} color={theme.primary} />
            </TouchableOpacity>
          )}
        </View>

        {/* ── Bloc 5 — Actions rapides ───────────────────────────────────────── */}
        <View style={s.card}>
          <SectionHeader title="Actions rapides" theme={theme} />
          <View style={s.actionsGrid}>
            {/* Immobiliser */}
            <TouchableOpacity style={s.actionBtn} onPress={() => setPickerVisible(true)} activeOpacity={0.8}>
              <View style={[s.actionIcon, { backgroundColor: '#EF444422' }]}>
                <Lock size={20} color="#EF4444" />
              </View>
              <Text style={s.actionLabel}>Immobiliser</Text>
            </TouchableOpacity>

            {/* Créer un ticket */}
            <TouchableOpacity
              style={s.actionBtn}
              onPress={() => nav.navigate('Portal', { screen: 'PortalNewTicket' } as never)}
              activeOpacity={0.8}
            >
              <View style={[s.actionIcon, { backgroundColor: '#F59E0B22' }]}>
                <TicketCheck size={20} color="#F59E0B" />
              </View>
              <Text style={s.actionLabel}>Créer un{'\n'}ticket</Text>
            </TouchableOpacity>

            {/* Demander intervention */}
            <TouchableOpacity
              style={s.actionBtn}
              onPress={() =>
                nav.navigate('Portal', {
                  screen: 'PortalNewTicket',
                  params: { prefillSubject: "Demande d'intervention" },
                } as never)
              }
              activeOpacity={0.8}
            >
              <View style={[s.actionIcon, { backgroundColor: '#8B5CF622' }]}>
                <Wrench size={20} color="#8B5CF6" />
              </View>
              <Text style={s.actionLabel}>Demander{'\n'}intervention</Text>
            </TouchableOpacity>

            {/* Payer */}
            <TouchableOpacity
              style={s.actionBtn}
              onPress={() => nav.navigate('Portal', { screen: 'PortalInvoices' } as never)}
              activeOpacity={0.8}
            >
              <View style={[s.actionIcon, { backgroundColor: '#22C55E22' }]}>
                <CreditCard size={20} color="#22C55E" />
              </View>
              <Text style={s.actionLabel}>Payer</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Modals */}
        {/* Immobiliser — picker + modal confirmation */}
        <VehiclePickerModal
          visible={pickerVisible}
          vehicles={vehicles}
          onSelect={(v) => {
            setSelectedVehicle(v);
            setPickerVisible(false);
            setImmoVisible(true);
          }}
          onClose={() => setPickerVisible(false)}
          theme={theme}
        />
        {selectedVehicle && (
          <ImmobilizeModal
            visible={immoVisible}
            vehicleId={selectedVehicle.id}
            vehicleName={`${selectedVehicle.name} — ${selectedVehicle.plate}`}
            isCurrentlyImmobilized={selectedVehicle.isImmobilized ?? false}
            onClose={() => {
              setImmoVisible(false);
              setSelectedVehicle(null);
            }}
            theme={theme}
          />
        )}
        {/* Historique — picker véhicule */}
        <VehiclePickerModal
          visible={historyPickerVisible}
          vehicles={vehicles}
          onSelect={(v) => {
            setHistoryPickerVisible(false);
            nav.navigate('VehicleHistory', { vehicleId: v.id, plate: v.plate ?? '', vehicleType: v.type ?? 'car' });
          }}
          onClose={() => setHistoryPickerVisible(false)}
          theme={theme}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const clientStyles = (theme: ThemeType) =>
  StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 },
    greeting: { fontSize: 12, color: theme.text.muted },
    name: { fontSize: 20, fontWeight: '700', color: theme.text.primary, marginTop: 2 },
    periodRow: {
      flexDirection: 'row',
      backgroundColor: theme.bg.surface,
      borderRadius: 10,
      padding: 3,
      borderWidth: 1,
      borderColor: theme.border,
      gap: 2,
    },
    periodBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
    periodLabel: { fontSize: 12, fontWeight: '600', color: theme.text.muted },

    card: {
      backgroundColor: theme.bg.surface,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.border,
      marginBottom: 14,
    },
    cardTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.text.secondary,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    portalTile: {
      width: 100,
      backgroundColor: theme.bg.elevated,
      borderRadius: 12,
      padding: 12,
      gap: 6,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.border,
    },
    portalTileIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    portalTileValue: { fontSize: 20, fontWeight: '800', color: theme.text.primary },
    portalTileLabel: { fontSize: 10, color: theme.text.muted, textAlign: 'center', lineHeight: 14 },
    actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    actionBtn: { width: '18%', minWidth: 56, alignItems: 'center', gap: 6 },
    actionIcon: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    actionLabel: { fontSize: 10, color: theme.text.secondary, fontWeight: '500', textAlign: 'center', lineHeight: 13 },
  });

// ── KpiCell + ModuleCard ──────────────────────────────────────────────────────

interface KpiDef {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}

function KpiCell({
  label,
  value,
  sub,
  color,
  borderRight,
  theme,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  borderRight?: boolean;
  theme: ThemeType;
}) {
  return (
    <View
      style={{
        flex: 1,
        padding: 12,
        borderRightWidth: borderRight ? 1 : 0,
        borderRightColor: theme.border,
      }}
    >
      <Text style={{ fontSize: 10, color: theme.text.muted, fontWeight: '500', marginBottom: 4 }}>{label}</Text>
      <Text style={{ fontSize: 20, fontWeight: '800', color: color ?? theme.text.primary }}>{value}</Text>
      {sub ? <Text style={{ fontSize: 10, color: theme.text.muted, marginTop: 2 }}>{sub}</Text> : null}
    </View>
  );
}

function ModuleCard({
  icon,
  title,
  kpis,
  theme,
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  kpis: KpiDef[];
  theme: ThemeType;
  onPress?: () => void;
}) {
  return (
    <View style={{ marginBottom: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, paddingHorizontal: 2 }}>
        {icon}
        <Text
          style={{
            fontSize: 12,
            fontWeight: '700',
            color: theme.text.muted,
            textTransform: 'uppercase',
            letterSpacing: 0.8,
          }}
        >
          {title}
        </Text>
        {onPress && <ChevronRight size={13} color={theme.text.muted} style={{ marginLeft: 'auto' }} />}
      </View>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={onPress ? 0.75 : 1}
        style={{
          backgroundColor: theme.bg.surface,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: theme.border,
          overflow: 'hidden',
        }}
        accessibilityRole={onPress ? 'button' : 'none'}
        accessibilityLabel={onPress ? `Voir ${title}` : undefined}
      >
        <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: theme.border }}>
          <KpiCell
            label={kpis[0].label}
            value={kpis[0].value}
            sub={kpis[0].sub}
            color={kpis[0].color}
            borderRight
            theme={theme}
          />
          <KpiCell label={kpis[1].label} value={kpis[1].value} sub={kpis[1].sub} color={kpis[1].color} theme={theme} />
        </View>
        <View style={{ flexDirection: 'row' }}>
          <KpiCell
            label={kpis[2].label}
            value={kpis[2].value}
            sub={kpis[2].sub}
            color={kpis[2].color}
            borderRight
            theme={theme}
          />
          <KpiCell label={kpis[3].label} value={kpis[3].value} sub={kpis[3].sub} color={kpis[3].color} theme={theme} />
        </View>
      </TouchableOpacity>
    </View>
  );
}

// ── SuperAdminDashboard ───────────────────────────────────────────────────────

function SuperAdminDashboard({
  vehicles,
  isRefetching,
  onRefresh,
  nav,
  theme,
}: {
  vehicles: Vehicle[];
  isRefetching: boolean;
  onRefresh: () => void;
  nav: Nav;
  theme: ThemeType;
}) {
  const user = useAuthStore((st) => st.user);
  const isSuperAdmin = user?.role?.toUpperCase() === 'SUPERADMIN';
  const [period, setPeriod] = useState<AdminPeriod>('month');
  const [selectedReseller, setSelectedReseller] = useState<TierModel | null>(null);
  const [clientFilterId, setClientFilterId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Flotte stats
  const moving = vehicles.filter((v) => v.status === 'moving').length;
  const stopped = vehicles.filter((v) => v.status === 'stopped').length;
  const idle = vehicles.filter((v) => v.status === 'idle').length;
  const offline = vehicles.filter((v) => v.status === 'offline').length;
  const total = vehicles.length;
  const staffDonutSlices = [
    { value: moving, color: VEHICLE_STATUS_COLORS.moving, label: 'En route' },
    { value: stopped, color: VEHICLE_STATUS_COLORS.stopped, label: 'Arrêté' },
    { value: idle, color: VEHICLE_STATUS_COLORS.idle, label: 'Ralenti' },
    { value: offline, color: VEHICLE_STATUS_COLORS.offline, label: 'Hors ligne' },
  ];

  // Queries — toutes les données, filtrées client-side par période
  const { data: quotes = [] } = useQuery({ queryKey: ['adm-quotes'], queryFn: quotesApi.getAll, staleTime: 120_000 });
  const { data: invoices = [] } = useQuery({
    queryKey: ['adm-invoices'],
    queryFn: invoicesApi.getAll,
    staleTime: 120_000,
  });
  const { data: contracts = [] } = useQuery({
    queryKey: ['adm-contracts'],
    queryFn: contractsApi.getAll,
    staleTime: 120_000,
  });
  const { data: clients = [] } = useQuery({
    queryKey: ['adm-clients'],
    queryFn: () => tiersApi.getAll({ type: 'CLIENT' }),
    staleTime: 120_000,
  });
  const { data: interventions = [] } = useQuery({
    queryKey: ['adm-interventions'],
    queryFn: () => interventionsApi.getAll(),
    staleTime: 120_000,
  });
  const { data: stockMovements = [] } = useQuery({
    queryKey: ['adm-stock'],
    queryFn: stockApi.getAll,
    staleTime: 120_000,
  });
  const { data: ticketsPage } = useQuery({
    queryKey: ['adm-tickets'],
    queryFn: () => ticketsApi.getAll({ limit: 500 }),
    staleTime: 120_000,
  });
  const { data: resellers = [] } = useQuery({
    queryKey: ['adm-resellers'],
    queryFn: tiersApi.getResellers,
    enabled: isSuperAdmin,
    staleTime: 300_000,
  });

  const tickets = ticketsPage?.data ?? [];

  const fmtAmt = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
    return String(Math.round(n));
  };

  // Sous-ensembles filtrés par période
  const pQuotes = useMemo(() => quotes.filter((q) => inPeriod(q.createdAt, period)), [quotes, period]);
  const pInvoices = useMemo(() => invoices.filter((i) => inPeriod(i.date, period)), [invoices, period]);
  const pInterventions = useMemo(
    () => interventions.filter((i) => inPeriod(i.scheduledDate, period)),
    [interventions, period]
  );
  const pStock = useMemo(() => stockMovements.filter((s) => inPeriod(s.date, period)), [stockMovements, period]);
  const pTickets = useMemo(() => tickets.filter((t) => inPeriod(t.created_at, period)), [tickets, period]);

  // Clients filtrés par revendeur sélectionné (cascade revendeur → client)
  const filteredClients = useMemo(() => {
    if (!selectedReseller) return clients;
    return clients.filter((c) => c.resellerId === selectedReseller.id);
  }, [clients, selectedReseller]);

  // IDs des clients à appliquer aux KPIs (null = pas de filtre)
  // - clientFilterId présent → uniquement ce client
  // - sinon revendeur sélectionné → tous ses clients
  // - sinon → null (aucun filtre)
  const resellerClientIds = useMemo(() => {
    if (clientFilterId) return new Set([clientFilterId]);
    if (!selectedReseller) return null;
    return new Set(filteredClients.map((c) => c.id));
  }, [filteredClients, selectedReseller, clientFilterId]);

  // ── Blocs filtre VehicleFilterPanel (Revendeur → Client cascade) ─────────────
  const filterBlocks: FilterBlockDef[] = useMemo(() => {
    const blocks: FilterBlockDef[] = [];
    if (isSuperAdmin && resellers.length > 0) {
      blocks.push({
        key: 'reseller',
        label: 'Revendeur',
        items: resellers.map((r) => ({ id: r.id, label: r.name })),
        selected: selectedReseller?.id ?? null,
        onSelect: (id) => {
          const next = id ? (resellers.find((r) => r.id === id) ?? null) : null;
          setSelectedReseller(next);
          setClientFilterId(null); // cascade reset
        },
      });
    }
    blocks.push({
      key: 'client',
      label: 'Client',
      items: filteredClients.map((c) => ({ id: c.id, label: c.name })),
      selected: clientFilterId,
      onSelect: setClientFilterId,
    });
    return blocks;
  }, [isSuperAdmin, resellers, selectedReseller, clientFilterId, filteredClients]);

  const hasActiveFilters = !!(selectedReseller || clientFilterId);
  const resetFilters = () => {
    setSelectedReseller(null);
    setClientFilterId(null);
  };

  // ── KPIs par module ──────────────────────────────────────────────────────────

  const quotesKpis = useMemo((): KpiDef[] => {
    const list = resellerClientIds ? pQuotes.filter((q) => q.clientId && resellerClientIds.has(q.clientId)) : pQuotes;
    const accepted = list.filter((q) => q.status === 'ACCEPTED');
    const acceptedAmt = accepted.reduce((s, q) => s + (q.amount ?? 0), 0);
    return [
      { label: 'Créés', value: list.length, color: theme.text.primary },
      { label: 'Acceptés', value: accepted.length, sub: fmtAmt(acceptedAmt), color: '#22C55E' },
      { label: 'Envoyés', value: list.filter((q) => q.status === 'SENT').length, color: '#3B82F6' },
      {
        label: 'Refusés',
        value: list.filter((q) => q.status === 'REJECTED' || q.status === 'EXPIRED').length,
        color: '#EF4444',
      },
    ];
  }, [pQuotes, resellerClientIds, theme]);

  const invoicesKpis = useMemo((): KpiDef[] => {
    const list = resellerClientIds
      ? pInvoices.filter((i) => i.clientId && resellerClientIds.has(i.clientId))
      : pInvoices;
    const paid = list.filter((i) => i.status === 'PAID');
    const overdue = list.filter((i) => i.status === 'OVERDUE');
    return [
      { label: 'Brouillon', value: list.filter((i) => i.status === 'DRAFT').length, color: '#6B7280' },
      { label: 'Envoyées', value: list.filter((i) => i.status === 'SENT').length, color: '#3B82F6' },
      { label: 'Payées', value: fmtAmt(paid.reduce((s, i) => s + (i.amount ?? 0), 0)), color: '#22C55E' },
      {
        label: 'Impayées',
        value: fmtAmt(overdue.reduce((s, i) => s + (i.amount ?? 0), 0)),
        color: overdue.length > 0 ? '#EF4444' : '#6B7280',
      },
    ];
  }, [pInvoices, resellerClientIds]);

  const contractsKpis = useMemo((): KpiDef[] => {
    const now30 = Date.now() + 30 * 86_400_000;
    const list = resellerClientIds
      ? contracts.filter((c) => c.clientId && resellerClientIds.has(c.clientId))
      : contracts;
    const active = list.filter((c) => c.status === 'ACTIVE');
    const expired = list.filter((c) => c.status === 'EXPIRED' || c.status === 'TERMINATED').length;
    const expiring = active.filter((c) => c.endDate && new Date(c.endDate).getTime() <= now30).length;
    const mrr = active.reduce((s, c) => s + (c.monthlyFee ?? 0), 0);
    return [
      { label: 'Actifs', value: active.length, color: '#22C55E' },
      { label: 'Expirés', value: expired, color: '#EF4444' },
      { label: 'À expirer <30j', value: expiring, color: expiring > 0 ? '#F59E0B' : '#6B7280' },
      { label: 'MRR', value: fmtAmt(mrr), color: '#8B5CF6' },
    ];
  }, [contracts, resellerClientIds]);

  const clientsKpis = useMemo((): KpiDef[] => {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);
    return [
      { label: 'Total', value: filteredClients.length, color: theme.primary },
      {
        label: "Aujourd'hui",
        value: filteredClients.filter((c) => new Date(c.createdAt) >= todayStart).length,
        color: theme.text.primary,
      },
      {
        label: 'Ce mois',
        value: filteredClients.filter((c) => new Date(c.createdAt) >= monthStart).length,
        color: theme.text.primary,
      },
      {
        label: 'Cette année',
        value: filteredClients.filter((c) => new Date(c.createdAt) >= yearStart).length,
        color: theme.text.primary,
      },
    ];
  }, [filteredClients, theme]);

  const interventionsKpis = useMemo(
    (): KpiDef[] => [
      { label: 'Planifiées', value: pInterventions.filter((i) => i.status === 'SCHEDULED').length, color: '#3B82F6' },
      {
        label: 'En cours',
        value: pInterventions.filter((i) => i.status === 'IN_PROGRESS' || i.status === 'EN_ROUTE').length,
        color: '#06B6D4',
      },
      { label: 'Terminées', value: pInterventions.filter((i) => i.status === 'COMPLETED').length, color: '#22C55E' },
      { label: 'En attente', value: pInterventions.filter((i) => i.status === 'PENDING').length, color: '#F59E0B' },
    ],
    [pInterventions]
  );

  const stockKpis = useMemo(
    (): KpiDef[] => [
      { label: 'Entrées', value: pStock.filter((s) => s.type === 'ENTRY').length, color: '#22C55E' },
      { label: 'Sorties', value: pStock.filter((s) => s.type === 'REMOVAL').length, color: '#EF4444' },
      { label: 'Transferts', value: pStock.filter((s) => s.type === 'TRANSFER').length, color: '#3B82F6' },
      {
        label: 'Autres',
        value: pStock.filter((s) => !['ENTRY', 'REMOVAL', 'TRANSFER'].includes(s.type)).length,
        color: '#6B7280',
      },
    ],
    [pStock]
  );

  const ticketsKpis = useMemo((): KpiDef[] => {
    const critical = pTickets.filter((t) => t.priority === 'CRITICAL').length;
    return [
      { label: 'Ouverts', value: pTickets.filter((t) => t.status === 'OPEN').length, color: '#EF4444' },
      {
        label: 'En cours',
        value: pTickets.filter((t) => t.status === 'IN_PROGRESS' || t.status === 'WAITING_CLIENT').length,
        color: '#F59E0B',
      },
      {
        label: 'Résolus',
        value: pTickets.filter((t) => t.status === 'RESOLVED' || t.status === 'CLOSED').length,
        color: '#22C55E',
      },
      { label: 'Critiques', value: critical, color: critical > 0 ? '#EF4444' : '#6B7280' },
    ];
  }, [pTickets]);

  const greetHour = new Date().getHours();
  const greeting = greetHour < 12 ? 'Bonjour' : greetHour < 18 ? 'Bon après-midi' : 'Bonsoir';
  const PERIOD_LABELS: Record<AdminPeriod, string> = { today: 'Auj.', month: 'Ce mois', year: 'Cette année' };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg.primary }} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingTop: 12, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={theme.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, color: theme.text.muted }}>{greeting},</Text>
            <Text style={{ fontSize: 22, fontWeight: '700', color: theme.text.primary, marginTop: 2 }}>
              {user?.name ?? 'Admin'}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 6 }}>
            <View
              style={{ paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10, backgroundColor: theme.primaryDim }}
            >
              <Text style={{ fontSize: 11, color: theme.primary, fontWeight: '600' }}>{user?.role ?? '–'}</Text>
            </View>
            <Text style={{ fontSize: 11, color: theme.text.muted }}>
              {new Date().toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long' })}
            </Text>
          </View>
        </View>

        {/* Filtres période */}
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: theme.bg.surface,
            borderRadius: 12,
            padding: 3,
            borderWidth: 1,
            borderColor: theme.border,
            marginBottom: 14,
            alignSelf: 'flex-start',
          }}
        >
          {(['today', 'month', 'year'] as AdminPeriod[]).map((p) => {
            const active = period === p;
            return (
              <TouchableOpacity
                key={p}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 6,
                  borderRadius: 9,
                  backgroundColor: active ? theme.primary : 'transparent',
                }}
                onPress={() => setPeriod(p)}
                activeOpacity={0.75}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', color: active ? '#fff' : theme.text.muted }}>
                  {PERIOD_LABELS[p]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Filtre Revendeur → Client (cascade) */}
        {(isSuperAdmin || filteredClients.length > 0) && (
          <View style={{ marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  backgroundColor: theme.bg.surface,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: hasActiveFilters ? theme.primary : theme.border,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                }}
              >
                <Building2 size={16} color={hasActiveFilters ? theme.primary : theme.text.muted} />
                <Text
                  style={{
                    flex: 1,
                    fontSize: 13,
                    color: hasActiveFilters ? theme.primary : theme.text.secondary,
                    fontWeight: '500',
                  }}
                  numberOfLines={1}
                >
                  {clientFilterId
                    ? (filteredClients.find((c) => c.id === clientFilterId)?.name ?? 'Client')
                    : selectedReseller
                      ? selectedReseller.name
                      : 'Tous les revendeurs et clients'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowFilters((p) => !p)}
                accessibilityRole="button"
                accessibilityLabel="Filtres"
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  backgroundColor: showFilters ? theme.primary : theme.bg.surface,
                  borderWidth: 1,
                  borderColor: theme.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <SlidersHorizontal size={18} color={showFilters ? '#fff' : theme.text.primary} />
                {hasActiveFilters && !showFilters ? (
                  <View
                    style={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: '#EF4444',
                    }}
                  />
                ) : null}
              </TouchableOpacity>
            </View>
            <VehicleFilterPanel
              visible={showFilters}
              blocks={filterBlocks}
              hasActiveFilters={hasActiveFilters}
              onReset={resetFilters}
            />
          </View>
        )}

        {/* Flotte */}
        <View
          style={{
            backgroundColor: theme.bg.surface,
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: theme.border,
            marginBottom: 20,
          }}
        >
          <SectionHeader
            title="Flotte en temps réel"
            onSeeAll={() => nav.navigate('Main', { screen: 'Fleet' } as never)}
            theme={theme}
          />
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => nav.navigate('Main', { screen: 'Fleet' } as never)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}
          >
            <DonutChart
              slices={staffDonutSlices}
              size={120}
              strokeWidth={18}
              centerLabel={String(total)}
              centerSub="véhicules"
            />
            <View style={{ flex: 1, gap: 8 }}>
              {staffDonutSlices.map((slice) => (
                <View key={slice.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: slice.color }} />
                  <Text style={{ flex: 1, fontSize: 12, color: theme.text.secondary }}>{slice.label}</Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: slice.color }}>{slice.value}</Text>
                </View>
              ))}
            </View>
          </TouchableOpacity>
        </View>

        {/* Modules KPI */}
        <ModuleCard
          icon={<FileText size={16} color="#3B82F6" />}
          title="Devis"
          kpis={quotesKpis}
          theme={theme}
          onPress={() => nav.navigate('Main', { screen: 'Finance' } as never)}
        />
        <ModuleCard
          icon={<Receipt size={16} color="#22C55E" />}
          title="Factures"
          kpis={invoicesKpis}
          theme={theme}
          onPress={() => nav.navigate('Main', { screen: 'Finance' } as never)}
        />
        <ModuleCard
          icon={<Briefcase size={16} color="#8B5CF6" />}
          title="Abonnements"
          kpis={contractsKpis}
          theme={theme}
          onPress={() => nav.navigate('Main', { screen: 'Finance' } as never)}
        />
        <ModuleCard
          icon={<Users size={16} color={theme.primary} />}
          title="Clients"
          kpis={clientsKpis}
          theme={theme}
          onPress={() => nav.navigate('CRMLeads')}
        />
        <ModuleCard
          icon={<Wrench size={16} color="#6366F1" />}
          title="Interventions"
          kpis={interventionsKpis}
          theme={theme}
          onPress={() => nav.navigate('Reports')}
        />
        <ModuleCard
          icon={<Package size={16} color="#F97316" />}
          title="Stock"
          kpis={stockKpis}
          theme={theme}
          onPress={() => nav.navigate('Reports')}
        />
        <ModuleCard
          icon={<TicketCheck size={16} color="#F59E0B" />}
          title="Tickets"
          kpis={ticketsKpis}
          theme={theme}
          onPress={() => nav.navigate('Reports')}
        />

        {/* Accès rapides */}
        <View
          style={{
            backgroundColor: theme.bg.surface,
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: theme.border,
          }}
        >
          <SectionHeader title="Accès rapides" theme={theme} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {[
              {
                label: 'Analytique',
                icon: <BarChart3 size={20} color="#6366F1" />,
                onPress: () => nav.navigate('FleetAnalytics'),
              },
              {
                label: 'Administration',
                icon: <ShieldCheck size={20} color="#7C3AED" />,
                onPress: () => nav.navigate('Admin'),
              },
              {
                label: 'Leads CRM',
                icon: <ContactRound size={20} color="#8B5CF6" />,
                onPress: () => nav.navigate('CRMLeads'),
              },
              {
                label: 'Rapports',
                icon: <TrendingUp size={20} color="#10B981" />,
                onPress: () => nav.navigate('Reports'),
              },
              {
                label: 'Tickets',
                icon: <TicketCheck size={20} color="#F59E0B" />,
                onPress: () => nav.navigate('AdminTickets'),
              },
              {
                label: 'Interventions',
                icon: <Wrench size={20} color="#6366F1" />,
                onPress: () => nav.navigate('AdminInterventions', { initialTab: 'interventions' }),
              },
              {
                label: 'Agenda',
                icon: <Calendar size={20} color="#3B82F6" />,
                onPress: () => nav.navigate('AdminAgenda'),
              },
              {
                label: 'Monitoring',
                icon: <Activity size={20} color="#22C55E" />,
                onPress: () => nav.navigate('AdminMonitoring'),
              },
              {
                label: 'Comptabilité',
                icon: <Wallet size={20} color="#EC4899" />,
                onPress: () => nav.navigate('AdminComptabilite'),
              },
            ].map((item, i) => (
              <TouchableOpacity
                key={i}
                style={{
                  width: '30%',
                  backgroundColor: theme.bg.elevated,
                  borderRadius: 14,
                  paddingVertical: 14,
                  paddingHorizontal: 8,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: theme.border,
                }}
                onPress={item.onPress}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel={item.label}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    backgroundColor: theme.bg.surface,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  {item.icon}
                </View>
                <Text
                  style={{
                    fontSize: 10,
                    color: theme.text.secondary,
                    fontWeight: '500',
                    marginTop: 6,
                    textAlign: 'center',
                  }}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Main DashboardScreen ──────────────────────────────────────────────────────

export default function DashboardScreen() {
  const { theme } = useTheme();
  const s = styles(theme);
  const nav = useNavigation<Nav>();
  const user = useAuthStore((st) => st.user);
  const { getVehicleList, setAllVehicles } = useVehicleStore();
  const roleFamily = getRoleFamily(user?.role);
  const needsFinance = roleFamily === 'COMMERCIAL' || roleFamily === 'FINANCE' || roleFamily === 'FULL';
  const isAdminRole = (ADMIN_SCREEN_ROLES as string[]).includes(user?.role?.toUpperCase() ?? '');

  const {
    data: vehiclesData,
    isLoading: vehiclesLoading,
    isError: vehiclesError,
    refetch: refetchVehicles,
    isRefetching,
  } = useQuery({
    queryKey: ['vehicles'],
    queryFn: vehiclesApi.getAll,
    staleTime: 30_000,
  });

  React.useEffect(() => {
    if (vehiclesData) setAllVehicles(vehiclesData);
  }, [vehiclesData, setAllVehicles]);

  const { data: alertsData } = useQuery({
    queryKey: ['alerts-recent'],
    queryFn: () => alertsApi.getPage(1, 20),
    staleTime: 30_000,
  });

  const { data: invoicesData } = useQuery({
    queryKey: ['dashboard-invoices'],
    queryFn: invoicesApi.getAll,
    enabled: needsFinance,
    staleTime: 60_000,
  });

  const { data: contractsData } = useQuery({
    queryKey: ['dashboard-contracts'],
    queryFn: contractsApi.getAll,
    enabled: needsFinance,
    staleTime: 60_000,
  });

  const vehicles = getVehicleList();
  const moving = vehicles.filter((v) => v.status === 'moving').length;
  const stopped = vehicles.filter((v) => v.status === 'stopped').length;
  const idle = vehicles.filter((v) => v.status === 'idle').length;
  const offline = vehicles.filter((v) => v.status === 'offline').length;
  const total = vehicles.length;
  const activityRate = total > 0 ? Math.round((moving / total) * 100) : 0;
  const availabilityRate = total > 0 ? Math.round(((total - offline) / total) * 100) : 0;
  const staffDonutSlices = [
    { value: moving, color: VEHICLE_STATUS_COLORS.moving, label: 'En route' },
    { value: stopped, color: VEHICLE_STATUS_COLORS.stopped, label: 'Arrêté' },
    { value: idle, color: VEHICLE_STATUS_COLORS.idle, label: 'Ralenti' },
    { value: offline, color: VEHICLE_STATUS_COLORS.offline, label: 'Hors ligne' },
  ];
  const recentAlerts = useMemo(
    () =>
      (alertsData?.data ?? [])
        .filter((a) => (a.severity as string) === 'critical' || (a.severity as string) === 'high')
        .slice(0, 5),
    [alertsData]
  );

  const finKpi = useMemo(() => {
    const inv = invoicesData ?? [];
    const con = contractsData ?? [];
    const activeContracts = con.filter((c) => c.status === 'ACTIVE').length;
    const mrr = con.filter((c) => c.status === 'ACTIVE').reduce((s, c) => s + (c.monthlyFee ?? 0), 0);
    const paidInv = inv.filter((i) => i.status === 'PAID');
    const overdueInv = inv.filter((i) => i.status === 'OVERDUE');
    const revenue = paidInv.reduce((s, i) => s + (i.amount ?? 0), 0);
    const overdueAmt = overdueInv.reduce((s, i) => s + (i.amount ?? 0), 0);
    const collectionRate = inv.length > 0 ? Math.round((paidInv.length / inv.length) * 100) : 0;
    return { activeContracts, mrr, revenue, overdueAmt, overdueCount: overdueInv.length, collectionRate };
  }, [invoicesData, contractsData]);

  const greetHour = new Date().getHours();
  const greeting = greetHour < 12 ? 'Bonjour' : greetHour < 18 ? 'Bon après-midi' : 'Bonsoir';

  // ── CLIENT → composant dédié ──────────────────────────────────────────────
  if (roleFamily === 'CLIENT') {
    return (
      <ClientDashboard
        vehicles={vehicles}
        isRefetching={isRefetching}
        onRefresh={refetchVehicles}
        nav={nav}
        theme={theme}
      />
    );
  }

  // ── ADMIN / SUPERADMIN → dashboard KPI modules ────────────────────────────
  if (isAdminRole) {
    return (
      <SuperAdminDashboard
        vehicles={vehicles}
        isRefetching={isRefetching}
        onRefresh={refetchVehicles}
        nav={nav}
        theme={theme}
      />
    );
  }

  // ── Staff / autres rôles ──────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.content}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetchVehicles} tintColor={theme.primary} />
        }
      >
        {/* Header */}
        <View style={s.header}>
          <View style={{ flex: 1 }}>
            <Text style={s.greeting}>{greeting},</Text>
            <Text style={s.name}>{user?.name ?? 'Utilisateur'}</Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 6 }}>
            <View style={[s.roleBadge, { backgroundColor: theme.primaryDim }]}>
              <Text style={{ fontSize: 11, color: theme.primary, fontWeight: '600' }}>{user?.role ?? '–'}</Text>
            </View>
            <Text style={{ fontSize: 11, color: theme.text.muted }}>
              {new Date().toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long' })}
            </Text>
          </View>
        </View>

        {/* KPIs */}
        <View style={s.section}>
          {roleFamily === 'COMMERCIAL' ? (
            <>
              <SectionHeader
                title="Business & Finance"
                onSeeAll={() => nav.navigate('Main', { screen: 'Finance' })}
                theme={theme}
              />
              <View style={s.kpiGrid}>
                <KpiTile
                  value={finKpi.activeContracts}
                  label="Contrats actifs"
                  subtitle={`MRR: ${fmt(finKpi.mrr)}`}
                  color="#22C55E"
                  icon={<Briefcase size={16} color="#22C55E" />}
                  theme={theme}
                  onPress={() => nav.navigate('Main', { screen: 'Finance' })}
                />
                <KpiTile
                  value={fmt(finKpi.revenue)}
                  label="Revenus"
                  color="#10B981"
                  icon={<TrendingUp size={16} color="#10B981" />}
                  theme={theme}
                  onPress={() => nav.navigate('Main', { screen: 'Finance' })}
                />
                <KpiTile
                  value={fmt(finKpi.overdueAmt)}
                  label="Impayés"
                  subtitle={`${finKpi.overdueCount} factures`}
                  color={finKpi.overdueCount > 0 ? theme.functional.error : theme.functional.success}
                  icon={
                    <FileText
                      size={16}
                      color={finKpi.overdueCount > 0 ? theme.functional.error : theme.functional.success}
                    />
                  }
                  theme={theme}
                  onPress={() => nav.navigate('Main', { screen: 'Finance' })}
                />
                <KpiTile
                  value={`${finKpi.collectionRate}%`}
                  label="Recouvrement"
                  color={finKpi.collectionRate >= 80 ? theme.functional.success : theme.functional.warning}
                  icon={
                    <Receipt
                      size={16}
                      color={finKpi.collectionRate >= 80 ? theme.functional.success : theme.functional.warning}
                    />
                  }
                  theme={theme}
                />
              </View>
            </>
          ) : roleFamily === 'FINANCE' ? (
            <>
              <SectionHeader
                title="Tableau financier"
                onSeeAll={() => nav.navigate('Main', { screen: 'Finance' })}
                theme={theme}
              />
              <View style={s.kpiGrid}>
                <KpiTile
                  value={fmt(finKpi.revenue)}
                  label="Revenus"
                  color="#10B981"
                  icon={<TrendingUp size={16} color="#10B981" />}
                  theme={theme}
                  onPress={() => nav.navigate('Main', { screen: 'Finance' })}
                />
                <KpiTile
                  value={fmt(finKpi.overdueAmt)}
                  label="Impayés"
                  subtitle={`${finKpi.overdueCount} fact.`}
                  color={finKpi.overdueCount > 0 ? theme.functional.error : theme.functional.success}
                  icon={
                    <FileText
                      size={16}
                      color={finKpi.overdueCount > 0 ? theme.functional.error : theme.functional.success}
                    />
                  }
                  theme={theme}
                  onPress={() => nav.navigate('Main', { screen: 'Finance' })}
                />
                <KpiTile
                  value={finKpi.activeContracts}
                  label="Contrats"
                  color="#22C55E"
                  icon={<Briefcase size={16} color="#22C55E" />}
                  theme={theme}
                  onPress={() => nav.navigate('Main', { screen: 'Finance' })}
                />
                <KpiTile
                  value={`${finKpi.collectionRate}%`}
                  label="Recouvrement"
                  color={finKpi.collectionRate >= 80 ? theme.functional.success : theme.functional.warning}
                  icon={
                    <Receipt
                      size={16}
                      color={finKpi.collectionRate >= 80 ? theme.functional.success : theme.functional.warning}
                    />
                  }
                  theme={theme}
                />
              </View>
            </>
          ) : roleFamily === 'SUPPORT' ? (
            <>
              <SectionHeader title="Suivi alertes & flotte" onSeeAll={() => nav.navigate('Alerts')} theme={theme} />
              <View style={s.kpiGrid}>
                <KpiTile
                  value={recentAlerts.filter((a) => a.severity === 'critical').length}
                  label="Critiques"
                  color={theme.functional.error}
                  icon={<AlertTriangle size={16} color={theme.functional.error} />}
                  theme={theme}
                  onPress={() => nav.navigate('Alerts')}
                />
                <KpiTile
                  value={recentAlerts.length}
                  label="Alertes"
                  color={theme.functional.warning}
                  icon={<Zap size={16} color={theme.functional.warning} />}
                  theme={theme}
                  onPress={() => nav.navigate('Alerts')}
                />
                <KpiTile
                  value={vehicles.length}
                  label="Véhicules"
                  color={theme.primary}
                  icon={<Truck size={16} color={theme.primary} />}
                  theme={theme}
                  onPress={() => nav.navigate('Main', { screen: 'Fleet' })}
                />
                <KpiTile
                  value={moving}
                  label="En route"
                  color={theme.status.moving}
                  icon={<Gauge size={16} color={theme.status.moving} />}
                  theme={theme}
                  onPress={() => nav.navigate('Main', { screen: 'Fleet' })}
                />
              </View>
            </>
          ) : (
            // FULL
            <>
              <SectionHeader
                title="Flotte en temps réel"
                onSeeAll={() => nav.navigate('Main', { screen: 'Fleet' })}
                theme={theme}
              />
              {vehiclesError ? (
                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                    padding: 12,
                    backgroundColor: theme.functional.error + '12',
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: theme.functional.error + '33',
                  }}
                  onPress={() => refetchVehicles()}
                  activeOpacity={0.75}
                >
                  <WifiOff size={16} color={theme.functional.error} />
                  <Text style={{ flex: 1, fontSize: 13, color: theme.functional.error, fontWeight: '500' }}>
                    Impossible de charger les véhicules
                  </Text>
                  <Text style={{ fontSize: 12, color: theme.functional.error, fontWeight: '700' }}>Réessayer</Text>
                </TouchableOpacity>
              ) : vehiclesLoading ? (
                <DashboardSkeleton />
              ) : (
                <>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => nav.navigate('Main', { screen: 'Fleet' })}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 10 }}
                  >
                    <DonutChart
                      slices={staffDonutSlices}
                      size={130}
                      strokeWidth={20}
                      centerLabel={String(total)}
                      centerSub="véhicules"
                    />
                    <View style={{ flex: 1, gap: 8 }}>
                      {staffDonutSlices.map((slice) => (
                        <View key={slice.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: slice.color }} />
                          <Text style={{ flex: 1, fontSize: 12, color: theme.text.secondary }}>{slice.label}</Text>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: slice.color }}>{slice.value}</Text>
                        </View>
                      ))}
                    </View>
                  </TouchableOpacity>
                  {needsFinance && (
                    <View style={[s.kpiGrid, { marginTop: 10 }]}>
                      <KpiTile
                        value={finKpi.activeContracts}
                        label="Contrats"
                        subtitle={`MRR: ${fmt(finKpi.mrr)}`}
                        color="#22C55E"
                        icon={<Briefcase size={16} color="#22C55E" />}
                        theme={theme}
                        onPress={() => nav.navigate('Main', { screen: 'Finance' })}
                      />
                      <KpiTile
                        value={fmt(finKpi.revenue)}
                        label="Revenus"
                        color="#10B981"
                        icon={<TrendingUp size={16} color="#10B981" />}
                        theme={theme}
                        onPress={() => nav.navigate('Main', { screen: 'Finance' })}
                      />
                      <KpiTile
                        value={recentAlerts.length}
                        label="Alertes"
                        color={recentAlerts.length > 0 ? theme.functional.error : theme.functional.success}
                        icon={
                          <Zap
                            size={16}
                            color={recentAlerts.length > 0 ? theme.functional.error : theme.functional.success}
                          />
                        }
                        theme={theme}
                        onPress={() => nav.navigate('Alerts')}
                      />
                      <KpiTile
                        value={fmt(finKpi.overdueAmt)}
                        label="Impayés"
                        subtitle={`${finKpi.overdueCount}`}
                        color={finKpi.overdueCount > 0 ? theme.functional.error : theme.functional.success}
                        icon={
                          <FileText
                            size={16}
                            color={finKpi.overdueCount > 0 ? theme.functional.error : theme.functional.success}
                          />
                        }
                        theme={theme}
                        onPress={() => nav.navigate('Main', { screen: 'Finance' })}
                      />
                    </View>
                  )}
                </>
              )}
            </>
          )}
        </View>

        {/* Véhicules en mouvement */}
        {vehicles.filter((v) => v.status === 'moving').length > 0 && (
          <View style={s.section}>
            <SectionHeader title="En route" theme={theme} />
            <View style={{ gap: 8 }}>
              {vehicles
                .filter((v) => v.status === 'moving')
                .slice(0, 3)
                .map((v) => (
                  <TouchableOpacity
                    key={v.id}
                    style={s.vehicleRow}
                    onPress={() => nav.navigate('VehicleDetail', { vehicleId: v.id })}
                    activeOpacity={0.75}
                  >
                    <View style={[s.vehicleRowBar, { backgroundColor: theme.status.moving }]} />
                    <View style={{ flex: 1, paddingHorizontal: 12, paddingVertical: 10 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text.primary }}>{v.name}</Text>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: theme.status.moving }}>
                          {v.speed ?? 0} km/h
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                        <Text style={{ fontSize: 12, color: theme.text.muted, fontFamily: 'monospace' }}>
                          {v.plate}
                        </Text>
                        <Text style={{ fontSize: 12, color: theme.border }}>·</Text>
                        <MapPin size={10} color={theme.text.muted} />
                        <GeocodedAddress
                          lat={v.latitude}
                          lng={v.longitude}
                          fallbackAddress={v.address}
                          style={{ fontSize: 12, color: theme.text.muted, flex: 1 }}
                          numberOfLines={1}
                        />
                      </View>
                    </View>
                    <ChevronRight size={15} color={theme.text.muted} style={{ marginRight: 10 }} />
                  </TouchableOpacity>
                ))}
            </View>
          </View>
        )}

        {/* Alertes récentes */}
        {recentAlerts.length > 0 && (
          <View style={s.section}>
            <SectionHeader title="Alertes récentes" onSeeAll={() => nav.navigate('Alerts')} theme={theme} />
            <View style={{ gap: 8 }}>
              {recentAlerts.map((a) => {
                const scolor = SEVERITY_COLORS[a.severity ?? 'low'] ?? '#6B7280';
                return (
                  <View key={a.id} style={s.alertRow}>
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 9,
                        backgroundColor: scolor + '22',
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <AlertTriangle size={15} color={scolor} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: theme.text.primary }}>
                        {ALERT_TYPE_LABELS[a.type] ?? a.type}
                      </Text>
                      <Text style={{ fontSize: 12, color: theme.text.muted }}>{a.vehicleName ?? '–'}</Text>
                    </View>
                    <Text style={{ fontSize: 11, color: theme.text.muted }}>
                      {(() => {
                        const d = new Date(a.createdAt);
                        return isNaN(d.getTime())
                          ? '–'
                          : d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                      })()}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Accès rapides Staff */}
        <View style={s.section}>
          <SectionHeader title="Accès rapides" theme={theme} />
          <View style={s.quickGrid}>
            {(isAdminRole
              ? [
                  {
                    label: 'Analytique',
                    icon: <BarChart3 size={20} color="#6366F1" />,
                    onPress: () => nav.navigate('FleetAnalytics'),
                  },
                  {
                    label: 'Administration',
                    icon: <ShieldCheck size={20} color="#7C3AED" />,
                    onPress: () => nav.navigate('Admin'),
                  },
                ]
              : roleFamily === 'COMMERCIAL'
                ? [
                    {
                      label: 'Carte',
                      icon: <MapPin size={20} color={theme.primary} />,
                      onPress: () => nav.navigate('Main', { screen: 'Map' } as never),
                    },
                    {
                      label: 'Leads',
                      icon: <ContactRound size={20} color="#8B5CF6" />,
                      onPress: () => nav.navigate('CRMLeads'),
                    },
                    {
                      label: 'Rapports',
                      icon: <Wallet size={20} color="#10B981" />,
                      onPress: () => nav.navigate('Main', { screen: 'Finance' } as never),
                    },
                    {
                      label: 'Alertes',
                      icon: <Zap size={20} color="#EF4444" />,
                      onPress: () => nav.navigate('Alerts'),
                    },
                  ]
                : [
                    {
                      label: 'Carte',
                      icon: <MapPin size={20} color={theme.primary} />,
                      onPress: () => nav.navigate('Main', { screen: 'Map' } as never),
                    },
                    {
                      label: 'Rapports',
                      icon: <TrendingUp size={20} color="#F59E0B" />,
                      onPress: () => nav.navigate('Main', { screen: 'Finance' } as never),
                    },
                    {
                      label: 'Flotte',
                      icon: <Wallet size={20} color="#10B981" />,
                      onPress: () => nav.navigate('Main', { screen: 'Fleet' } as never),
                    },
                    {
                      label: 'Alertes',
                      icon: <Zap size={20} color="#EF4444" />,
                      onPress: () => nav.navigate('Alerts'),
                    },
                  ]
            ).map((item, i) => (
              <TouchableOpacity key={i} style={s.quickBtn} onPress={item.onPress} activeOpacity={0.75}>
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    backgroundColor: theme.bg.elevated,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  {item.icon}
                </View>
                <Text style={{ fontSize: 11, color: theme.text.secondary, fontWeight: '500', marginTop: 6 }}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = (theme: ThemeType) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg.primary },
    content: { padding: 16, paddingTop: 12 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
    greeting: { fontSize: 13, color: theme.text.muted },
    name: { fontSize: 22, fontWeight: '700', color: theme.text.primary, marginTop: 2 },
    roleBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10 },
    section: { marginBottom: 24 },
    kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    vehicleRow: {
      backgroundColor: theme.bg.surface,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.border,
      overflow: 'hidden',
    },
    vehicleRowBar: { width: 4, alignSelf: 'stretch' },
    alertRow: {
      backgroundColor: theme.bg.surface,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      gap: 12,
      borderWidth: 1,
      borderColor: theme.border,
    },
    quickGrid: { flexDirection: 'row', gap: 10 },
    quickBtn: {
      flex: 1,
      backgroundColor: theme.bg.surface,
      borderRadius: 14,
      padding: 14,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.border,
    },
  });
