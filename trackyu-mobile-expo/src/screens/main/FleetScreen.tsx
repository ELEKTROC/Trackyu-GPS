/**
 * TrackYu Mobile — Fleet Screen
 * - Regroupement par client / branche, tri intelligent (En route > Arrêt > Ralenti > Hors ligne)
 * - Recherche étendue (serveur + fallback local : clientName, IMEI, groupe, conducteur)
 * - Mode compact / détaillé (toggle header)
 * - Long press → actions rapides (carte, historique, appel conducteur)
 * - Export CSV de la liste filtrée
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  Modal,
  Share,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Truck,
  MapPin,
  Gauge,
  Fuel,
  ChevronRight,
  Zap,
  ZapOff,
  BatteryLow,
  Battery,
  Clock,
  MoreVertical,
  Wifi,
  WifiOff,
  Lock,
  LockOpen,
  Bell,
  AlertTriangle,
  Calendar,
  Check,
  Phone,
  History,
  List,
  AlignJustify,
  Share2,
  SlidersHorizontal,
  X,
} from 'lucide-react-native';
import vehiclesApi, { type Vehicle } from '../../api/vehicles';
import { useVehicleStore } from '../../store/vehicleStore';
import { FleetScreenSkeleton } from '../../components/SkeletonLoader';
import { withErrorBoundary } from '../../components/ErrorBoundary';
import { VehicleTypeIcon } from '../../components/VehicleTypeIcon';
import { GeocodedAddress } from '../../components/GeocodedAddress';
import { VehicleFilterPanel, type FilterBlockDef } from '../../components/VehicleFilterPanel';
import type { RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme';
import { SearchBar } from '../../components/SearchBar';
import { VEHICLE_STATUS_LABELS } from '../../utils/vehicleStatus';
import { VEHICLE_STATUS_COLORS } from '../../utils/vehicleStatus';

type ThemeType = ReturnType<typeof import('../../theme').useTheme>['theme'];

const FLEET_PAGE_SIZE = 50;

// Ordre de tri des statuts dans chaque section
const STATUS_SORT_ORDER: Record<string, number> = {
  moving: 0,
  stopped: 1,
  idle: 2,
  offline: 3,
};

// ── Formatters ─────────────────────────────────────────────────────────────────

const STATUS_PREFIX: Record<string, string> = {
  moving: 'En route depuis',
  idle: 'Ralenti depuis',
  stopped: 'Arrêté depuis',
  offline: 'Hors ligne depuis',
};

function formatStatusDuration(status: string, dateString?: string): string {
  if (!dateString) return '–';
  const ms = new Date(dateString).getTime();
  if (isNaN(ms)) return '–';
  const secs = Math.floor((Date.now() - ms) / 1000);
  if (secs < 60) return "à l'instant";
  const prefix = STATUS_PREFIX[status] ?? 'Depuis';
  if (secs < 3600) return `${prefix} ${Math.floor(secs / 60)} min`;
  if (secs < 86400) return `${prefix} ${Math.floor(secs / 3600)} h`;
  return `${prefix} ${Math.floor(secs / 86400)} jours`;
}

function isLongOffline(v: Vehicle): boolean {
  if (v.status !== 'offline') return false;
  const ms = new Date(v.lastUpdate).getTime();
  if (isNaN(ms)) return false;
  return Date.now() - ms > 86_400_000; // >24h
}

// ── Icon system ────────────────────────────────────────────────────────────────

type VehicleIconKey = 'gps' | 'immobilized' | 'alerts' | 'panne' | 'expiration' | 'fuel' | 'battery' | 'ignition';

const ICON_DEFS: { key: VehicleIconKey; label: string }[] = [
  { key: 'gps', label: 'GPS connecté' },
  { key: 'immobilized', label: 'Immobilisation' },
  { key: 'alerts', label: 'Alertes' },
  { key: 'panne', label: 'Panne' },
  { key: 'expiration', label: 'Expiration' },
  { key: 'fuel', label: 'Carburant' },
  { key: 'battery', label: 'Batterie' },
  { key: 'ignition', label: 'Contact' },
];

const MAX_ICONS = 5;
const DEFAULT_ICONS: VehicleIconKey[] = ['gps', 'immobilized', 'alerts', 'fuel', 'ignition'];

function iconPreview(key: VehicleIconKey, theme: ThemeType): React.ReactElement {
  switch (key) {
    case 'gps':
      return <Wifi size={16} color="#22C55E" />;
    case 'immobilized':
      return <LockOpen size={16} color="#22C55E" />;
    case 'alerts':
      return <Bell size={16} color={theme.functional.warning} />;
    case 'panne':
      return <AlertTriangle size={16} color={theme.functional.error} />;
    case 'expiration':
      return <Calendar size={16} color={theme.functional.warning} />;
    case 'fuel':
      return <Fuel size={16} color={theme.text.muted} />;
    case 'battery':
      return <BatteryLow size={16} color={theme.functional.warning} />;
    case 'ignition':
      return <Zap size={16} color="#22C55E" />;
    default:
      return <Gauge size={16} color={theme.text.muted} />;
  }
}

function renderVehicleIcon(key: VehicleIconKey, v: Vehicle, theme: ThemeType): React.ReactElement | null {
  const fuelLevel = v.fuelLevel ?? v.fuel;
  switch (key) {
    case 'gps':
      return v.status !== 'offline' ? (
        <Wifi size={14} color="#22C55E" />
      ) : (
        <WifiOff size={14} color={theme.functional.error} />
      );
    case 'immobilized':
      return v.isImmobilized ? (
        <Lock size={14} color={theme.functional.error} />
      ) : (
        <LockOpen size={14} color="#22C55E" />
      );
    case 'alerts': {
      const count = v.alertsCount ?? 0;
      return (
        <View>
          <Bell size={14} color={count > 0 ? theme.functional.warning : theme.text.muted} />
          {count > 0 && (
            <View
              style={{
                position: 'absolute',
                top: -3,
                right: -4,
                backgroundColor: theme.functional.warning,
                borderRadius: 5,
                minWidth: 10,
                height: 10,
                justifyContent: 'center',
                alignItems: 'center',
                paddingHorizontal: 2,
              }}
            >
              <Text style={{ fontSize: 7, color: '#fff', fontWeight: '700' }}>{count > 9 ? '9+' : String(count)}</Text>
            </View>
          )}
        </View>
      );
    }
    case 'panne':
      return <AlertTriangle size={14} color={v.isPanne ? theme.functional.error : theme.text.muted} />;
    case 'expiration': {
      const days = v.daysUntilExpiration;
      if (days === undefined) return <Calendar size={14} color={theme.text.muted} />;
      return (
        <Calendar
          size={14}
          color={days <= 7 ? theme.functional.error : days <= 30 ? theme.functional.warning : theme.text.muted}
        />
      );
    }
    case 'fuel':
      if (fuelLevel === undefined) return <Fuel size={14} color={theme.text.muted} />;
      return (
        <Fuel
          size={14}
          color={fuelLevel < 15 ? theme.functional.error : fuelLevel < 30 ? theme.functional.warning : theme.text.muted}
        />
      );
    case 'battery':
      if (v.battery === undefined) return <Battery size={14} color={theme.text.muted} />;
      return (
        <BatteryLow
          size={14}
          color={v.battery < 15 ? theme.functional.error : v.battery < 30 ? theme.functional.warning : '#22C55E'}
        />
      );
    case 'ignition':
      return v.ignition === true ? <Zap size={14} color="#22C55E" /> : <ZapOff size={14} color={theme.text.muted} />;
    default:
      return null;
  }
}

// ── Quick Actions Modal ────────────────────────────────────────────────────────

function QuickActionsModal({
  vehicle,
  onClose,
  navigation,
  theme,
}: {
  vehicle: Vehicle | null;
  onClose: () => void;
  navigation: NativeStackNavigationProp<RootStackParamList>;
  theme: ThemeType;
}) {
  if (!vehicle) return null;
  const driverPhone = vehicle.driverPhone ?? (vehicle.driver as { phone?: string } | undefined)?.phone;

  const actions: { icon: React.ReactElement; label: string; sub?: string; color: string; onPress: () => void }[] = [
    {
      icon: <MapPin size={20} color={theme.primary} />,
      label: 'Voir sur la carte',
      sub: vehicle.address ?? undefined,
      color: theme.primary,
      onPress: () => {
        onClose();
        navigation.navigate('Main', { screen: 'Map', params: { vehicleId: vehicle.id } } as never);
      },
    },
    {
      icon: <History size={20} color="#8B5CF6" />,
      label: 'Historique du jour',
      color: '#8B5CF6',
      onPress: () => {
        onClose();
        navigation.navigate('VehicleHistory', {
          vehicleId: vehicle.id,
          plate: vehicle.plate,
          vehicleType: vehicle.type ?? 'car',
        });
      },
    },
  ];

  if (driverPhone) {
    actions.push({
      icon: <Phone size={20} color="#22C55E" />,
      label: `Appeler ${vehicle.driverName ?? 'le conducteur'}`,
      sub: driverPhone,
      color: '#22C55E',
      onPress: () => {
        onClose();
        Linking.openURL(`tel:${driverPhone}`);
      },
    });
  }

  return (
    <Modal visible={!!vehicle} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={{ flex: 1, backgroundColor: '#00000055' }} activeOpacity={1} onPress={onClose} />
      <View
        style={{
          backgroundColor: theme.bg.surface,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          paddingBottom: 40,
        }}
      >
        {/* En-tête véhicule */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            padding: 20,
            gap: 12,
            borderBottomWidth: 1,
            borderBottomColor: theme.border,
          }}
        >
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: (theme.status[vehicle.status] ?? theme.text.muted) + '22',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <VehicleTypeIcon type={vehicle.type} color={theme.status[vehicle.status] ?? theme.text.muted} size={28} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: theme.text.primary }}>{vehicle.name}</Text>
            <Text style={{ fontSize: 12, color: theme.text.muted, fontFamily: 'monospace' }}>{vehicle.plate}</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
            <X size={20} color={theme.text.muted} />
          </TouchableOpacity>
        </View>
        {/* Actions */}
        {actions.map((a, i) => (
          <TouchableOpacity
            key={i}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 20,
              paddingVertical: 16,
              gap: 14,
              borderBottomWidth: i < actions.length - 1 ? 1 : 0,
              borderBottomColor: theme.border,
            }}
            onPress={a.onPress}
            activeOpacity={0.7}
          >
            <View
              style={{
                width: 38,
                height: 38,
                borderRadius: 11,
                backgroundColor: a.color + '18',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              {a.icon}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text.primary }}>{a.label}</Text>
              {a.sub && (
                <Text style={{ fontSize: 12, color: theme.text.muted, marginTop: 2 }} numberOfLines={1}>
                  {a.sub}
                </Text>
              )}
            </View>
            <ChevronRight size={16} color={theme.text.muted} />
          </TouchableOpacity>
        ))}
      </View>
    </Modal>
  );
}

// ── VehicleCard ────────────────────────────────────────────────────────────────

interface VehicleCardProps {
  v: Vehicle;
  theme: ThemeType;
  onPress: () => void;
  onLongPress: () => void;
  visibleIcons: VehicleIconKey[];
  compact: boolean;
}

function VehicleCard({ v, theme, onPress, onLongPress, visibleIcons, compact }: VehicleCardProps) {
  const statusColor = theme.status[v.status] ?? theme.text.muted;
  const longOffline = isLongOffline(v);

  if (compact) {
    return (
      <TouchableOpacity
        style={[cs(theme).card, { backgroundColor: statusColor + '12', borderColor: statusColor + '44' }]}
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={400}
        activeOpacity={0.75}
        accessibilityLabel={`${v.name} — ${v.plate} — ${VEHICLE_STATUS_LABELS[v.status] ?? v.status}`}
        accessibilityRole="button"
      >
        <View style={[cs(theme).leftBar, { backgroundColor: statusColor }]} />
        <View
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 12,
            paddingVertical: 10,
            gap: 10,
          }}
        >
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: statusColor }} />
          <Text style={{ flex: 1, fontSize: 13, fontWeight: '700', color: theme.text.primary }} numberOfLines={1}>
            {v.name}
          </Text>
          <Text style={{ fontSize: 11, fontFamily: 'monospace', color: theme.text.muted }}>{v.plate}</Text>
          <Text
            style={{ fontSize: 11, color: longOffline ? theme.functional.error : theme.text.muted, marginLeft: 4 }}
            numberOfLines={1}
          >
            {formatStatusDuration(v.status, v.lastUpdate)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[cs(theme).card, { backgroundColor: statusColor + '12', borderColor: statusColor + '44' }]}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={400}
      activeOpacity={0.75}
      accessibilityLabel={`${v.name} — ${v.plate} — ${VEHICLE_STATUS_LABELS[v.status] ?? v.status}`}
      accessibilityRole="button"
    >
      <View style={[cs(theme).leftBar, { backgroundColor: statusColor }]} />
      <View style={cs(theme).body}>
        {/* Ligne 1 : icône + nom + plaque + vitesse (si en route) */}
        <View style={cs(theme).row1}>
          <View style={[cs(theme).vehicleIcon, { backgroundColor: statusColor + '22', overflow: 'hidden' }]}>
            <VehicleTypeIcon type={v.type} color={statusColor} size={26} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={cs(theme).vehicleName} numberOfLines={1}>
              {v.name}
            </Text>
            <Text style={cs(theme).vehiclePlate}>{v.plate}</Text>
          </View>
          {v.status === 'moving' && (v.speed ?? 0) > 0 && (
            <View style={{ alignItems: 'center', paddingHorizontal: 8 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: statusColor }}>{Math.round(v.speed)}</Text>
              <Text style={{ fontSize: 9, color: statusColor, opacity: 0.7 }}>km/h</Text>
            </View>
          )}
        </View>

        {/* Adresse géocodée */}
        <View style={cs(theme).infoItem}>
          <MapPin size={11} color={theme.text.muted} />
          <GeocodedAddress
            lat={v.latitude}
            lng={v.longitude}
            fallbackAddress={v.address}
            style={[cs(theme).infoText, { flex: 1 }]}
            numberOfLines={1}
          />
        </View>

        {/* Expiration abonnement — visible 30j avant échéance */}
        {v.daysUntilExpiration !== undefined && v.daysUntilExpiration <= 30 && (
          <View
            style={[
              cs(theme).expirationBanner,
              {
                backgroundColor:
                  v.daysUntilExpiration <= 7 ? theme.functional.error + '22' : theme.functional.warning + '22',
                borderColor:
                  v.daysUntilExpiration <= 7 ? theme.functional.error + '66' : theme.functional.warning + '66',
              },
            ]}
          >
            <Calendar
              size={12}
              color={v.daysUntilExpiration <= 7 ? theme.functional.error : theme.functional.warning}
            />
            <Text
              style={[
                cs(theme).expirationText,
                {
                  color: v.daysUntilExpiration <= 7 ? theme.functional.error : theme.functional.warning,
                },
              ]}
            >
              {v.daysUntilExpiration <= 0
                ? 'Abonnement expiré !'
                : `Abonnement expire dans ${v.daysUntilExpiration} jour${v.daysUntilExpiration > 1 ? 's' : ''}`}
            </Text>
          </View>
        )}

        {/* Durée du statut — rouge si hors ligne >24h */}
        <View style={cs(theme).footer}>
          <Clock size={10} color={longOffline ? theme.functional.error : theme.text.muted} />
          <Text style={[cs(theme).footerTime, longOffline && { color: theme.functional.error, fontWeight: '600' }]}>
            {formatStatusDuration(v.status, v.lastUpdate)}
          </Text>
          <ChevronRight size={13} color={theme.text.muted} style={{ marginLeft: 'auto' }} />
        </View>

        {/* Icônes configurables */}
        {visibleIcons.length > 0 && (
          <View style={[cs(theme).iconsRow, { borderTopWidth: 1, borderTopColor: theme.border + '80', paddingTop: 8 }]}>
            {visibleIcons.map((key) => {
              const el = renderVehicleIcon(key, v, theme);
              if (!el) return null;
              return (
                <View key={key} style={cs(theme).iconCell}>
                  {el}
                </View>
              );
            })}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const cs = (theme: ThemeType) =>
  StyleSheet.create({
    card: { borderRadius: 14, flexDirection: 'row', overflow: 'hidden', borderWidth: 1 },
    leftBar: { width: 4 },
    body: { flex: 1, padding: 12, gap: 10 },
    row1: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    vehicleIcon: { width: 38, height: 38, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
    vehicleName: { fontSize: 14, fontWeight: '700', color: theme.text.primary },
    vehiclePlate: { fontSize: 12, color: theme.text.muted, fontFamily: 'monospace', marginTop: 1 },
    iconsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    iconCell: { justifyContent: 'center', alignItems: 'center', flex: 1 },
    infoRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
    infoItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    infoText: { fontSize: 12, color: theme.text.secondary },
    expirationBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius: 8,
      borderWidth: 1,
    },
    expirationText: { fontSize: 12, fontWeight: '700', flex: 1 },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: theme.border + '80',
    },
    footerTime: { fontSize: 11, color: theme.text.muted },
  });

// ── Icon Settings Modal ────────────────────────────────────────────────────────

function IconSettingsModal({
  visible,
  onClose,
  selected,
  onToggle,
}: {
  visible: boolean;
  onClose: () => void;
  selected: VehicleIconKey[];
  onToggle: (key: VehicleIconKey) => void;
}) {
  const { theme } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={{ flex: 1, backgroundColor: '#00000055' }} activeOpacity={1} onPress={onClose} />
      <View
        style={{
          backgroundColor: theme.bg.surface,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          padding: 20,
          paddingBottom: 40,
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: '700', color: theme.text.primary, marginBottom: 4 }}>
          Icônes du véhicule
        </Text>
        <Text style={{ fontSize: 12, color: theme.text.muted, marginBottom: 16 }}>
          Max {MAX_ICONS} icônes · {selected.length}/{MAX_ICONS} sélectionnées
        </Text>
        {ICON_DEFS.map(({ key, label }) => {
          const isSelected = selected.includes(key);
          const canToggle = isSelected || selected.length < MAX_ICONS;
          return (
            <TouchableOpacity
              key={key}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 12,
                gap: 12,
                opacity: canToggle ? 1 : 0.4,
              }}
              onPress={() => {
                if (canToggle) onToggle(key);
              }}
              activeOpacity={0.7}
            >
              {iconPreview(key, theme)}
              <Text style={{ flex: 1, fontSize: 14, color: theme.text.primary }}>{label}</Text>
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  borderWidth: 2,
                  borderColor: isSelected ? theme.primary : theme.border,
                  backgroundColor: isSelected ? theme.primary : 'transparent',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                {isSelected && <Check size={13} color="#fff" />}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </Modal>
  );
}

// ── Section type ───────────────────────────────────────────────────────────────

type VehicleSection = {
  title: string;
  count: number;
  data: Vehicle[];
};

// ── Status filter ──────────────────────────────────────────────────────────────

type StatusFilter = 'all' | 'moving' | 'idle' | 'stopped' | 'offline';

const STATUS_CHIPS: { key: StatusFilter; label: string }[] = [
  { key: 'moving', label: 'En route' },
  { key: 'stopped', label: 'Arrêté' },
  { key: 'idle', label: 'Ralenti' },
  { key: 'offline', label: 'Hors ligne' },
  { key: 'all', label: 'Tous' },
];

// ── Export CSV ─────────────────────────────────────────────────────────────────

function buildCsv(vehicles: Vehicle[]): string {
  const header = 'Nom,Plaque,Statut,Client,Branche,Conducteur,IMEI,Adresse,Dernière MAJ';
  const rows = vehicles.map((v) =>
    [
      v.name,
      v.plate,
      v.status,
      v.clientName ?? '',
      v.groupName ?? '',
      v.driverName ?? '',
      v.imei ?? '',
      v.address ?? '',
      v.lastUpdate,
    ]
      .map((s) => `"${String(s).replace(/"/g, '""')}"`)
      .join(',')
  );
  return [header, ...rows].join('\n');
}

// ── Main Screen ────────────────────────────────────────────────────────────────

export function FleetScreen() {
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [resellerFilter, setResellerFilter] = useState<string | null>(null);
  const [clientFilter, setClientFilter] = useState<string | null>(null);
  const [branchFilter, setBranchFilter] = useState<string | null>(null);
  const [vehicleFilter, setVehicleFilter] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [visibleIcons, setVisibleIcons] = useState<VehicleIconKey[]>(DEFAULT_ICONS);
  const [showIconSettings, setShowIconSettings] = useState(false);
  const [compactMode, setCompactMode] = useState(false);
  const [quickActionVehicle, setQuickActionVehicle] = useState<Vehicle | null>(null);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { setAllVehicles } = useVehicleStore();
  const s = styles(theme);

  // Debounce 300ms
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const serverStatus = statusFilter === 'all' ? undefined : statusFilter.toUpperCase();

  const { data, isLoading, isFetchingNextPage, fetchNextPage, hasNextPage, refetch, isRefetching } = useInfiniteQuery({
    queryKey: ['vehicles-page', serverStatus, debouncedSearch, clientFilter],
    queryFn: ({ pageParam }) =>
      vehiclesApi.getPage(
        { status: serverStatus, q: debouncedSearch || undefined, filterClientId: clientFilter ?? undefined },
        pageParam as number,
        FLEET_PAGE_SIZE
      ),
    getNextPageParam: (lastPage) => {
      const next = lastPage.offset + lastPage.limit;
      return next < lastPage.total ? next : undefined;
    },
    initialPageParam: 0,
    staleTime: 30_000,
  });

  const allVehicles = useMemo(() => data?.pages.flatMap((p) => p.data) ?? [], [data]);

  useEffect(() => {
    if (allVehicles.length > 0) setAllVehicles(allVehicles);
  }, [allVehicles, setAllVehicles]);

  // Base locale pour recherche étendue — chargée uniquement si recherche active
  const { data: searchBase = [] } = useQuery({
    queryKey: ['vehicles-search-base'],
    queryFn: () => vehiclesApi.getPage({}, 0, 500).then((p) => p.data),
    staleTime: 120_000,
    enabled: debouncedSearch.length >= 2,
  });

  // Compléments locaux : clientName, groupName, driverName, IMEI non trouvés par le serveur
  const localExtras = useMemo(() => {
    if (debouncedSearch.length < 2) return [];
    const q = debouncedSearch.toLowerCase();
    const serverIds = new Set(allVehicles.map((v) => v.id));
    return searchBase.filter(
      (v) =>
        !serverIds.has(v.id) &&
        (v.clientName?.toLowerCase().includes(q) ||
          v.groupName?.toLowerCase().includes(q) ||
          v.driverName?.toLowerCase().includes(q) ||
          v.imei?.toLowerCase().includes(q) ||
          v.simPhoneNumber?.includes(q))
    );
  }, [searchBase, allVehicles, debouncedSearch]);

  const effectiveVehicles = useMemo(
    () => (localExtras.length > 0 ? [...allVehicles, ...localExtras] : allVehicles),
    [allVehicles, localExtras]
  );

  // ── Compteurs statut vrais (serveur) — corrige les comptes partiels ────────
  const { data: statusCounts } = useQuery({
    queryKey: ['fleet-status-counts', debouncedSearch],
    queryFn: async () => {
      const [all, moving, stopped, idle, offline] = await Promise.all([
        vehiclesApi.getPage({ q: debouncedSearch || undefined }, 0, 1).then((p) => p.total),
        vehiclesApi.getPage({ status: 'MOVING', q: debouncedSearch || undefined }, 0, 1).then((p) => p.total),
        vehiclesApi.getPage({ status: 'STOPPED', q: debouncedSearch || undefined }, 0, 1).then((p) => p.total),
        vehiclesApi.getPage({ status: 'IDLE', q: debouncedSearch || undefined }, 0, 1).then((p) => p.total),
        vehiclesApi.getPage({ status: 'OFFLINE', q: debouncedSearch || undefined }, 0, 1).then((p) => p.total),
      ]);
      return { all, moving, stopped, idle, offline };
    },
    staleTime: 30_000,
  });

  // ── Listes uniques pour le filtre (cascade revendeur → client) ───────────
  const uniqueResellers = useMemo(() => {
    const set = new Set<string>();
    effectiveVehicles.forEach((v) => {
      if (v.resellerName) set.add(v.resellerName);
    });
    return Array.from(set).sort();
  }, [effectiveVehicles]);

  const uniqueClients = useMemo(() => {
    const base = resellerFilter
      ? effectiveVehicles.filter((v) => v.resellerName === resellerFilter)
      : effectiveVehicles;
    const map = new Map<string, string>(); // clientId → clientName
    base.forEach((v) => {
      if (v.clientId && v.clientName) map.set(v.clientId, v.clientName);
    });
    return Array.from(map.entries())
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [effectiveVehicles, resellerFilter]);

  const uniqueBranches = useMemo(() => {
    const base = clientFilter ? effectiveVehicles.filter((v) => v.clientId === clientFilter) : effectiveVehicles;
    const set = new Set<string>();
    base.forEach((v) => {
      if (v.groupName) set.add(v.groupName);
    });
    return Array.from(set).sort();
  }, [effectiveVehicles, clientFilter]);

  const filteredVehicles = useMemo(() => {
    return effectiveVehicles.filter((v) => {
      if (resellerFilter && v.resellerName !== resellerFilter) return false;
      if (clientFilter && v.clientId !== clientFilter) return false;
      if (branchFilter && v.groupName !== branchFilter) return false;
      if (vehicleFilter && v.id !== vehicleFilter) return false;
      return true;
    });
  }, [effectiveVehicles, resellerFilter, clientFilter, branchFilter, vehicleFilter]);

  // Regroupement + tri intelligent (En route > Arrêt > Ralenti > Hors ligne)
  const sections = useMemo<VehicleSection[]>(() => {
    const groups: Record<string, Vehicle[]> = {};
    filteredVehicles.forEach((v) => {
      const client = v.clientName ?? 'Sans client';
      const key = v.groupName ? `${client} › ${v.groupName}` : client;
      if (!groups[key]) groups[key] = [];
      groups[key].push(v);
    });
    return Object.entries(groups)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map((entry) => ({
        title: entry[0],
        count: entry[1].length,
        data: [...entry[1]].sort((a, b) => (STATUS_SORT_ORDER[a.status] ?? 4) - (STATUS_SORT_ORDER[b.status] ?? 4)),
      }));
  }, [filteredVehicles]);

  const toggleIcon = (key: VehicleIconKey) => {
    setVisibleIcons((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : prev.length < MAX_ICONS ? [...prev, key] : prev
    );
  };

  const exportFleet = () => {
    const csv = buildCsv(filteredVehicles);
    Share.share({
      message: csv,
      title: `Flotte TrackYu — ${filteredVehicles.length} véhicules`,
    });
  };

  const hasActiveFilter =
    statusFilter !== 'all' ||
    searchQuery.trim().length > 0 ||
    resellerFilter !== null ||
    clientFilter !== null ||
    branchFilter !== null ||
    vehicleFilter !== null;
  const hasSubFilter =
    resellerFilter !== null || clientFilter !== null || branchFilter !== null || vehicleFilter !== null;
  const onResetFilters = () => {
    setStatusFilter('all');
    setSearchQuery('');
    setResellerFilter(null);
    setClientFilter(null);
    setBranchFilter(null);
    setVehicleFilter(null);
  };

  const chipColor = (key: StatusFilter): string =>
    (
      ({
        moving: theme.status.moving,
        idle: theme.status.idle,
        stopped: theme.status.stopped,
        offline: theme.status.offline,
        all: theme.primary,
      }) as Record<string, string>
    )[key] ?? theme.primary;

  // Compteurs depuis le serveur (statusCounts) — fallback sur local si pas encore chargé
  const chipCount = (key: StatusFilter): number => {
    if (statusCounts) return key === 'all' ? statusCounts.all : statusCounts[key];
    if (key === 'all') return effectiveVehicles.length;
    return effectiveVehicles.filter((v) => v.status === key).length;
  };

  if (isLoading) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <FleetScreenSkeleton />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Flotte</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {hasActiveFilter && (
            <TouchableOpacity
              style={s.clearAllBtn}
              onPress={onResetFilters}
              accessibilityLabel="Réinitialiser les filtres"
              accessibilityRole="button"
            >
              <X size={11} color={theme.primary} />
              <Text style={s.clearAllText}>Réinitialiser</Text>
            </TouchableOpacity>
          )}
          {/* Export */}
          <TouchableOpacity
            style={s.headerBtn}
            onPress={exportFleet}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Exporter la flotte en CSV"
            accessibilityRole="button"
          >
            <Share2 size={18} color={theme.text.secondary} />
          </TouchableOpacity>
          {/* Mode compact / détaillé */}
          <TouchableOpacity
            style={s.headerBtn}
            onPress={() => setCompactMode((v) => !v)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel={compactMode ? 'Affichage détaillé' : 'Affichage compact'}
            accessibilityRole="button"
          >
            {compactMode ? (
              <AlignJustify size={18} color={theme.primary} />
            ) : (
              <List size={18} color={theme.text.secondary} />
            )}
          </TouchableOpacity>
          {/* Icônes config */}
          <TouchableOpacity
            style={s.headerBtn}
            onPress={() => setShowIconSettings(true)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Configurer les icônes"
            accessibilityRole="button"
          >
            <MoreVertical size={18} color={theme.text.secondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Recherche + bouton filtres */}
      <View
        style={{
          flexDirection: 'row',
          paddingHorizontal: 16,
          paddingTop: 10,
          paddingBottom: 8,
          gap: 8,
          alignItems: 'center',
        }}
      >
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Nom, plaque, conducteur, IMEI…"
          style={{ flex: 1 }}
        />
        <TouchableOpacity
          style={[
            s.filterToggleBtn,
            (showFilters || hasSubFilter) && { borderColor: theme.primary, backgroundColor: theme.primary + '18' },
          ]}
          onPress={() => setShowFilters((v) => !v)}
          accessibilityLabel="Filtres avancés"
        >
          <SlidersHorizontal size={16} color={hasSubFilter ? theme.primary : theme.text.muted} />
          {hasSubFilter && (
            <View style={s.filterBadge}>
              <Text style={s.filterBadgeText}>
                {(resellerFilter ? 1 : 0) + (clientFilter ? 1 : 0) + (branchFilter ? 1 : 0) + (vehicleFilter ? 1 : 0)}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Panneau filtre 4 blocs */}
      {showFilters &&
        (() => {
          const blocks: FilterBlockDef[] = [
            {
              key: 'revendeur',
              label: 'Revendeur',
              items: uniqueResellers.map((r) => ({ id: r, label: r })),
              selected: resellerFilter,
              onSelect: setResellerFilter,
            },
            {
              key: 'clients',
              label: 'Clients',
              items: uniqueClients,
              selected: clientFilter,
              onSelect: setClientFilter,
            },
            {
              key: 'branches',
              label: 'Branche',
              items: uniqueBranches.map((b) => ({ id: b, label: b })),
              selected: branchFilter,
              onSelect: setBranchFilter,
            },
            {
              key: 'vehicles',
              label: 'Véhicules',
              items: filteredVehicles.slice(0, 100).map((v) => ({
                id: v.id,
                label: v.plate,
                sublabel: v.name,
                statusColor: VEHICLE_STATUS_COLORS[v.status] ?? undefined,
              })),
              selected: vehicleFilter,
              onSelect: setVehicleFilter,
            },
          ];
          return (
            <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
              <VehicleFilterPanel
                visible
                blocks={blocks}
                hasActiveFilters={hasSubFilter}
                onReset={() => {
                  setResellerFilter(null);
                  setClientFilter(null);
                  setBranchFilter(null);
                  setVehicleFilter(null);
                }}
              />
            </View>
          );
        })()}

      {/* Chips statut */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.chipsContainer}
        style={s.chipsScroll}
      >
        {STATUS_CHIPS.map(({ key, label }) => {
          const active = statusFilter === key;
          const color = chipColor(key);
          const count = chipCount(key);
          return (
            <TouchableOpacity
              key={key}
              style={[
                s.chip,
                active
                  ? { backgroundColor: color, borderColor: color }
                  : { backgroundColor: theme.bg.surface, borderColor: theme.border },
              ]}
              onPress={() => {
                setStatusFilter(key);
              }}
              activeOpacity={0.75}
            >
              {key !== 'all' && <View style={[s.chipDot, { backgroundColor: active ? '#fff' : color }]} />}
              <Text style={[s.chipLabel, { color: active ? '#fff' : theme.text.secondary }]}>{label}</Text>
              <View style={[s.chipBadge, { backgroundColor: active ? 'rgba(255,255,255,0.25)' : theme.bg.elevated }]}>
                <Text style={[s.chipBadgeText, { color: active ? '#fff' : theme.text.muted }]}>{count}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Liste groupée */}
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <VehicleCard
            v={item}
            theme={theme}
            compact={compactMode}
            onPress={() => navigation.navigate('VehicleDetail', { vehicleId: item.id })}
            onLongPress={() => setQuickActionVehicle(item)}
            visibleIcons={compactMode ? [] : visibleIcons}
          />
        )}
        renderSectionHeader={({ section }) => (
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle} numberOfLines={1}>
              {section.title}
            </Text>
            <View style={s.sectionBadge}>
              <Text style={s.sectionBadgeText}>{section.count}</Text>
            </View>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={{ height: compactMode ? 4 : 10 }} />}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) fetchNextPage();
        }}
        onEndReachedThreshold={0.4}
        ListFooterComponent={
          isFetchingNextPage ? (
            <View style={s.loadMoreBtn}>
              <Text style={s.loadMoreText}>Chargement…</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={s.empty}>
            <Truck size={40} color={theme.text.muted} />
            <Text style={s.emptyText}>
              {hasActiveFilter ? 'Aucun véhicule ne correspond aux filtres' : 'Aucun véhicule'}
            </Text>
            {hasActiveFilter && (
              <TouchableOpacity
                style={s.emptyReset}
                onPress={() => {
                  setStatusFilter('all');
                  setSearchQuery('');
                  setClientFilter(null);
                }}
              >
                <Text style={s.emptyResetText}>Réinitialiser les filtres</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />

      {/* Modals */}
      <IconSettingsModal
        visible={showIconSettings}
        onClose={() => setShowIconSettings(false)}
        selected={visibleIcons}
        onToggle={toggleIcon}
      />
      <QuickActionsModal
        vehicle={quickActionVehicle}
        onClose={() => setQuickActionVehicle(null)}
        navigation={navigation}
        theme={theme}
      />
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = (theme: ThemeType) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg.primary },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    headerTitle: { fontSize: 22, fontWeight: '700', color: theme.text.primary },
    clearAllBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: theme.primaryDim,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
    clearAllText: { fontSize: 11, color: theme.primary, fontWeight: '600' },
    headerBtn: { padding: 4 },

    chipsScroll: { flexGrow: 0, flexShrink: 0 },
    chipsContainer: { paddingHorizontal: 16, paddingVertical: 8, gap: 8, flexDirection: 'row', alignItems: 'center' },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 20,
      borderWidth: 1,
      flexShrink: 0,
    },
    chipDot: { width: 6, height: 6, borderRadius: 3 },
    chipLabel: { fontSize: 12, fontWeight: '600' },
    chipBadge: {
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 4,
    },
    chipBadgeText: { fontSize: 10, fontWeight: '700' },

    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 2,
      paddingTop: 14,
      paddingBottom: 6,
    },
    sectionTitle: {
      flex: 1,
      fontSize: 12,
      fontWeight: '700',
      color: theme.text.secondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    sectionBadge: { backgroundColor: theme.bg.elevated, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
    sectionBadgeText: { fontSize: 11, fontWeight: '600', color: theme.text.muted },

    listContent: { padding: 16, paddingBottom: 100 },
    loadMoreBtn: { alignItems: 'center', paddingVertical: 16 },
    loadMoreText: { fontSize: 14, color: theme.primary, fontWeight: '600' },

    empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
    emptyText: { fontSize: 15, color: theme.text.secondary, textAlign: 'center', paddingHorizontal: 24 },
    emptyReset: { backgroundColor: theme.primaryDim, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
    emptyResetText: { fontSize: 13, color: theme.primary, fontWeight: '600' },

    filterToggleBtn: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: theme.bg.surface,
      borderWidth: 1,
      borderColor: theme.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    filterBadge: {
      position: 'absolute',
      top: -4,
      right: -4,
      width: 15,
      height: 15,
      borderRadius: 8,
      backgroundColor: theme.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    filterBadgeText: { fontSize: 9, fontWeight: '700', color: '#fff' },
  });

export default withErrorBoundary(FleetScreen, 'Fleet');
