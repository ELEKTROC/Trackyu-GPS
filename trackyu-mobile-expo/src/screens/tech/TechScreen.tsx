/**
 * TrackYu Mobile — Tech Screen (TECH)
 * Aligné avec features/tech/components/TechView.tsx (PWA)
 *
 * 3 onglets :
 *   - Interventions  → /api/tech/interventions
 *   - Appareils      → /api/devices (filtré par technicianId pour TECH)
 *   - Stock          → /api/devices?location=TECH&technicianId=...
 *
 * Statuts interventions : PENDING | SCHEDULED | EN_ROUTE | IN_PROGRESS | COMPLETED | CANCELLED | POSTPONED
 * Statuts appareils     : IN_STOCK | INSTALLED | RMA | REMOVED | SCRAPPED | LOST
 */
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Wrench,
  Cpu,
  Package,
  ChevronRight,
  MapPin,
  Clock,
  User,
  AlertCircle,
  RotateCcw,
  X,
  Check,
  SlidersHorizontal,
} from 'lucide-react-native';
import { SearchBar } from '../../components/SearchBar';
import { VehicleFilterPanel, type FilterBlockDef } from '../../components/VehicleFilterPanel';
import { useTheme } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList, TechTabParamList } from '../../navigation/types';
import interventionsApi, {
  type Intervention,
  type InterventionStatus,
  STATUS_LABELS,
  STATUS_COLORS,
  NATURE_LABELS,
} from '../../api/interventions';
import apiClient from '../../api/client';
import { normalizeError } from '../../utils/errorTypes';

type ThemeType = ReturnType<typeof import('../../theme').useTheme>['theme'];
type TabKey = 'interventions' | 'devices' | 'stock';

// ── Device types (alignés avec types/tech.ts) ─────────────────────────────────

type DeviceType = 'BOX' | 'SIM' | 'SENSOR' | 'ACCESSORY';
type DeviceStatus =
  | 'IN_STOCK'
  | 'INSTALLED'
  | 'RMA'
  | 'RMA_PENDING'
  | 'SENT_TO_SUPPLIER'
  | 'REPLACED_BY_SUPPLIER'
  | 'SCRAPPED'
  | 'LOST'
  | 'REMOVED';

interface DeviceItem {
  id: string;
  status: DeviceStatus;
  type: DeviceType;
  imei?: string;
  serialNumber?: string;
  iccid?: string;
  vehicleName?: string;
  vehiclePlate?: string;
  model?: string;
  phoneNumber?: string;
  operator?: string;
}

interface StockMovement {
  id: string;
  type: string;
  date?: string;
  details?: string;
  fromLocation?: string;
  toLocation?: string;
}

const DEVICE_STATUS_LABELS: Record<DeviceStatus, string> = {
  IN_STOCK: 'Disponible',
  INSTALLED: 'Installé',
  RMA: 'En SAV',
  RMA_PENDING: 'SAV en attente',
  SENT_TO_SUPPLIER: 'Envoyé fournisseur',
  REPLACED_BY_SUPPLIER: 'Remplacé',
  SCRAPPED: 'Mis au rebut',
  LOST: 'Perdu',
  REMOVED: 'Retiré',
};

const DEVICE_STATUS_COLORS: Partial<Record<DeviceStatus, string>> = {
  IN_STOCK: '#22C55E',
  INSTALLED: '#3B82F6',
  RMA: '#F97316',
  LOST: '#EF4444',
  REMOVED: '#6B7280',
};

const DEVICE_TYPE_LABELS: Record<DeviceType, string> = {
  BOX: 'Boîtier GPS',
  SIM: 'Carte SIM',
  SENSOR: 'Capteur/Sonde',
  ACCESSORY: 'Accessoire',
};

// ── Status filter chips ───────────────────────────────────────────────────────

const INT_STATUS_CHIPS: { key: InterventionStatus; label: string; color: string }[] = [
  { key: 'PENDING', label: 'À planifier', color: '#6B7280' },
  { key: 'SCHEDULED', label: 'Planifié', color: '#3B82F6' },
  { key: 'EN_ROUTE', label: 'En route', color: '#F59E0B' },
  { key: 'IN_PROGRESS', label: 'En cours', color: '#F97316' },
  { key: 'COMPLETED', label: 'Terminé', color: '#22C55E' },
  { key: 'POSTPONED', label: 'Reporté', color: '#8B5CF6' },
];

// ── Tab Bar ───────────────────────────────────────────────────────────────────

const TABS: { key: TabKey; label: string; icon: React.ComponentType<{ size: number; color: string }> }[] = [
  { key: 'interventions', label: 'Interventions', icon: Wrench },
  { key: 'devices', label: 'Appareils', icon: Cpu },
  { key: 'stock', label: 'Stock / SAV', icon: Package },
];

// ── Intervention Item ─────────────────────────────────────────────────────────

function InterventionItem({ item, theme, onPress }: { item: Intervention; theme: ThemeType; onPress: () => void }) {
  const color = STATUS_COLORS[item.status] ?? '#6B7280';

  // Date + Heure
  let dateStr = '–';
  let timeStr = '';
  if (item.scheduledDate) {
    const d = new Date(item.scheduledDate);
    dateStr = d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
    timeStr = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <TouchableOpacity
      style={[li(theme).card, { borderLeftColor: color }]}
      activeOpacity={0.75}
      onPress={onPress}
      accessibilityLabel={`${NATURE_LABELS[item.nature] ?? item.nature} — ${item.clientName ?? ''} — ${STATUS_LABELS[item.status] ?? item.status}`}
      accessibilityRole="button"
    >
      <View style={{ flex: 1 }}>
        {/* En-tête : type (gras) + statut */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={li(theme).typeLabel}>{item.type === 'INSTALLATION' ? 'Installation' : 'Dépannage'}</Text>
          <View style={{ backgroundColor: color + '22', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 }}>
            <Text style={{ fontSize: 11, fontWeight: '600', color }}>{STATUS_LABELS[item.status]}</Text>
          </View>
        </View>
        {/* Nature sur même ligne que type via sous-titre */}
        <Text style={li(theme).title} numberOfLines={1}>
          {NATURE_LABELS[item.nature] ?? item.nature}
        </Text>

        {/* Client */}
        {item.clientName && (
          <View style={li(theme).meta}>
            <User size={10} color={theme.text.muted} />
            <Text style={li(theme).metaText}>{item.clientName}</Text>
          </View>
        )}

        {/* Lieu */}
        {(item.address ?? item.location) && (
          <View style={li(theme).meta}>
            <MapPin size={10} color={theme.text.muted} />
            <Text style={[li(theme).metaText, { flex: 1 }]} numberOfLines={1}>
              {item.address ?? item.location}
            </Text>
          </View>
        )}

        {/* Date + Heure */}
        <View style={li(theme).meta}>
          <Clock size={10} color={theme.text.muted} />
          <Text style={li(theme).metaText}>{dateStr}</Text>
          {timeStr ? (
            <Text style={[li(theme).metaText, { color: theme.primary, fontWeight: '600' }]}> · {timeStr}</Text>
          ) : null}
        </View>
      </View>
      <ChevronRight size={14} color={theme.text.muted} style={{ marginTop: 4 }} />
    </TouchableOpacity>
  );
}

// ── Device Item ───────────────────────────────────────────────────────────────

function DeviceItem({
  item,
  theme,
  onRma,
}: {
  item: DeviceItem;
  theme: ThemeType;
  onRma: (device: DeviceItem) => void;
}) {
  const status: DeviceStatus = item.status;
  const color = DEVICE_STATUS_COLORS[status] ?? '#6B7280';
  const type: DeviceType = item.type;
  // Peut déclarer RMA si l'appareil est dans les mains du tech (pas déjà en SAV)
  const canRma = !['RMA', 'RMA_PENDING', 'SCRAPPED', 'INSTALLED'].includes(status);

  return (
    <View style={[li(theme).card2, { flexDirection: 'column', gap: 10 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 11,
            backgroundColor: color + '22',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Cpu size={18} color={color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={li(theme).title}>{item.imei ?? item.serialNumber ?? item.iccid ?? 'Appareil'}</Text>
          <Text style={li(theme).sub}>
            {DEVICE_TYPE_LABELS[type] ?? type} · {item.model ?? '–'}
          </Text>
          {item.vehicleName && (
            <Text style={{ fontSize: 12, color: theme.text.secondary }}>
              {item.vehiclePlate ?? ''} {item.vehicleName}
            </Text>
          )}
          {type === 'SIM' && item.phoneNumber && (
            <Text style={li(theme).sub}>
              {item.phoneNumber} · {item.operator ?? ''}
            </Text>
          )}
        </View>
        <View style={{ backgroundColor: color + '22', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 }}>
          <Text style={{ fontSize: 11, fontWeight: '600', color }}>{DEVICE_STATUS_LABELS[status] ?? status}</Text>
        </View>
      </View>
      {canRma && (
        <TouchableOpacity
          onPress={() => onRma(item)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            alignSelf: 'flex-start',
            backgroundColor: '#F9731618',
            borderRadius: 8,
            paddingHorizontal: 10,
            paddingVertical: 6,
          }}
          activeOpacity={0.75}
        >
          <RotateCcw size={13} color="#F97316" />
          <Text style={{ fontSize: 12, fontWeight: '600', color: '#F97316' }}>Déclarer SAV / RMA</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── RMA Modal ─────────────────────────────────────────────────────────────────

const RMA_PRIORITIES = [
  { value: 'LOW', label: 'Faible', color: '#22C55E' },
  { value: 'MEDIUM', label: 'Moyen', color: '#F59E0B' },
  { value: 'HIGH', label: 'Urgent', color: '#EF4444' },
] as const;

function RmaModal({
  device,
  visible,
  onClose,
  onSubmit,
  isLoading,
  theme,
}: {
  device: DeviceItem | null;
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: {
    deviceId: string;
    reason: string;
    description?: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH';
  }) => void;
  isLoading: boolean;
  theme: ThemeType;
}) {
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');

  const reset = () => {
    setReason('');
    setDescription('');
    setPriority('MEDIUM');
  };

  const handleClose = () => {
    reset();
    onClose();
  };
  const handleSubmit = () => {
    if (!device || !reason.trim()) return;
    onSubmit({ deviceId: device.id, reason: reason.trim(), description: description.trim() || undefined, priority });
  };

  if (!device) return null;

  const deviceLabel = device.imei ?? device.serialNumber ?? device.iccid ?? device.id;
  const typeLabel = DEVICE_TYPE_LABELS[device.type] ?? device.type;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: '#00000055' }} activeOpacity={1} onPress={handleClose} />
        <View
          style={{
            backgroundColor: theme.bg.surface,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            padding: 20,
            gap: 16,
          }}
        >
          {/* En-tête */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: '#F9731622',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <RotateCcw size={18} color="#F97316" />
              </View>
              <View>
                <Text style={{ fontSize: 15, fontWeight: '700', color: theme.text.primary }}>
                  Déclarer en SAV / RMA
                </Text>
                <Text style={{ fontSize: 12, color: theme.text.muted }}>
                  {typeLabel} · {deviceLabel}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={20} color={theme.text.muted} />
            </TouchableOpacity>
          </View>

          {/* Priorité */}
          <View style={{ gap: 6 }}>
            <Text
              style={{
                fontSize: 11,
                fontWeight: '700',
                color: theme.text.muted,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}
            >
              Priorité
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {RMA_PRIORITIES.map((p) => (
                <TouchableOpacity
                  key={p.value}
                  onPress={() => setPriority(p.value)}
                  style={{
                    flex: 1,
                    alignItems: 'center',
                    paddingVertical: 8,
                    borderRadius: 10,
                    borderWidth: 1.5,
                    borderColor: priority === p.value ? p.color : theme.border,
                    backgroundColor: priority === p.value ? p.color + '22' : theme.bg.elevated,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '700',
                      color: priority === p.value ? p.color : theme.text.muted,
                    }}
                  >
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Raison */}
          <View style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', gap: 3 }}>
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '700',
                  color: theme.text.muted,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}
              >
                Raison
              </Text>
              <Text style={{ fontSize: 11, color: '#EF4444' }}>*</Text>
            </View>
            <TextInput
              style={{
                backgroundColor: theme.bg.elevated,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: reason.trim() ? theme.border : '#EF444455',
                paddingHorizontal: 12,
                paddingVertical: 10,
                fontSize: 14,
                color: theme.text.primary,
              }}
              value={reason}
              onChangeText={setReason}
              placeholder="Ex : Boîtier défectueux, plus de signal…"
              placeholderTextColor={theme.text.muted}
            />
          </View>

          {/* Description */}
          <View style={{ gap: 6 }}>
            <Text
              style={{
                fontSize: 11,
                fontWeight: '700',
                color: theme.text.muted,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}
            >
              Description (optionnel)
            </Text>
            <TextInput
              style={{
                backgroundColor: theme.bg.elevated,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: theme.border,
                paddingHorizontal: 12,
                paddingVertical: 10,
                fontSize: 14,
                color: theme.text.primary,
                minHeight: 70,
                textAlignVertical: 'top',
              }}
              value={description}
              onChangeText={setDescription}
              placeholder="Détails supplémentaires, historique du problème…"
              placeholderTextColor={theme.text.muted}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* CTA */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={!reason.trim() || isLoading}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              height: 50,
              borderRadius: 14,
              backgroundColor: reason.trim() ? '#F97316' : theme.bg.elevated,
              borderWidth: reason.trim() ? 0 : 1,
              borderColor: theme.border,
            }}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <RotateCcw size={17} color={reason.trim() ? '#fff' : theme.text.muted} />
                <Text style={{ fontSize: 15, fontWeight: '700', color: reason.trim() ? '#fff' : theme.text.muted }}>
                  Soumettre le SAV
                </Text>
              </>
            )}
          </TouchableOpacity>
          <View style={{ height: 8 }} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Stock Item (mouvements) ───────────────────────────────────────────────────

function StockItem({ item, theme }: { item: StockMovement; theme: ThemeType }) {
  const MOVEMENT_LABELS: Record<string, string> = {
    ENTRY: 'Entrée',
    TRANSFER: 'Transfert',
    INSTALLATION: 'Installation',
    REMOVAL: 'Dépose',
    RMA: 'Retour SAV',
    STATUS_CHANGE: 'Changement statut',
  };
  const date = item.date
    ? new Date(item.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
    : '–';
  const isEntry = item.type === 'ENTRY' || item.toLocation === 'TECH';

  return (
    <View style={li(theme).card2}>
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: 11,
          backgroundColor: isEntry ? '#22C55E22' : '#F59E0B22',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Package size={18} color={isEntry ? '#22C55E' : '#F59E0B'} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={li(theme).title}>{MOVEMENT_LABELS[item.type] ?? item.type}</Text>
        {item.details && (
          <Text style={li(theme).sub} numberOfLines={1}>
            {item.details}
          </Text>
        )}
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 2 }}>
          {item.fromLocation && <Text style={li(theme).tag}>{item.fromLocation}</Text>}
          {item.toLocation && <Text style={li(theme).tag}>{item.toLocation}</Text>}
        </View>
      </View>
      <Text style={{ fontSize: 11, color: theme.text.muted }}>{date}</Text>
    </View>
  );
}

const li = (theme: ThemeType) =>
  StyleSheet.create({
    card: {
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
    card2: {
      backgroundColor: theme.bg.surface,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      gap: 12,
      borderWidth: 1,
      borderColor: theme.border,
      marginBottom: 8,
    },
    typeLabel: { fontSize: 14, fontWeight: '700', color: theme.text.primary },
    title: { fontSize: 13, fontWeight: '500', color: theme.text.secondary, marginTop: 1 },
    typeTag: { fontSize: 11, color: theme.text.muted, fontWeight: '500', marginTop: 1 },
    sub: { fontSize: 12, color: theme.text.secondary, marginTop: 1 },
    meta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
    metaText: { fontSize: 11, color: theme.text.muted },
    tag: {
      fontSize: 11,
      color: theme.text.muted,
      backgroundColor: theme.bg.elevated,
      paddingHorizontal: 5,
      paddingVertical: 2,
      borderRadius: 4,
    },
  });

// ── Main ──────────────────────────────────────────────────────────────────────

type TechScreenRoute = RouteProp<TechTabParamList, 'Tech'>;

export default function TechScreen() {
  const { theme } = useTheme();
  const s = styles(theme);
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<TechScreenRoute>();
  const user = useAuthStore((st) => st.user);
  const isTech = user?.role?.toUpperCase() === 'TECH';

  const initialTab = (route.params?.initialTab ?? 'interventions') as TabKey;
  const initialStatus = route.params?.initialStatus ?? null;
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<InterventionStatus | null>(initialStatus);
  const [resellerFilter, setResellerFilter] = useState<string | null>(null);
  const [clientFilter, setClientFilter] = useState<string | null>(null);
  const [vehicleFilter, setVehicleFilter] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [rmaDevice, setRmaDevice] = useState<DeviceItem | null>(null);
  const queryClient = useQueryClient();

  const rmaMutation = useMutation({
    mutationFn: async (data: {
      deviceId: string;
      reason: string;
      description?: string;
      priority: 'LOW' | 'MEDIUM' | 'HIGH';
    }) => {
      const res = await apiClient.post('/rma', data);
      return res.data;
    },
    onSuccess: () => {
      setRmaDevice(null);
      queryClient.invalidateQueries({ queryKey: ['tech-devices'] });
      queryClient.invalidateQueries({ queryKey: ['tech-stock-movements'] });
      Alert.alert('SAV déclaré', 'Le retour SAV a été enregistré avec succès.');
    },
    onError: () => Alert.alert('Erreur', 'Impossible de soumettre le SAV. Vérifiez votre connexion.'),
  });

  // ── Queries ──

  const intQuery = useQuery({
    queryKey: ['tech-interventions', isTech ? user?.id : 'all'],
    queryFn: () => interventionsApi.getAll(isTech ? { technicianId: user!.id } : undefined),
    refetchInterval: 60000,
  });

  const devQuery = useQuery({
    queryKey: ['tech-devices', isTech ? user?.id : 'all'],
    queryFn: async () => {
      try {
        const params = isTech ? `?location=TECH&technicianId=${user!.id}` : '';
        const res = await apiClient.get(`/devices${params}`);
        return Array.isArray(res.data) ? res.data : [];
      } catch (e) {
        throw normalizeError(e);
      }
    },
    enabled: activeTab === 'devices',
    retry: 1,
    staleTime: 60_000,
  });

  const stockQuery = useQuery({
    queryKey: ['tech-stock-movements', isTech ? user?.id : 'all'],
    queryFn: async () => {
      try {
        const params = isTech ? `?technicianId=${user!.id}` : '';
        const res = await apiClient.get(`/stock-movements${params}`);
        return Array.isArray(res.data) ? res.data : [];
      } catch (e) {
        throw normalizeError(e);
      }
    },
    enabled: activeTab === 'stock',
  });

  // Active query
  const activeQuery = activeTab === 'interventions' ? intQuery : activeTab === 'devices' ? devQuery : stockQuery;
  const isLoading = activeQuery.isLoading;
  const isRefetching = activeQuery.isRefetching;
  const isError = activeQuery.isError;
  const refetch = activeQuery.refetch;

  // ── Filtered data ──

  const q = search.toLowerCase();

  const allInterventions = (intQuery.data ?? []) as Intervention[];

  const uniqueResellers = useMemo(
    () =>
      [...new Set(allInterventions.map((i) => i.resellerName).filter(Boolean) as string[])]
        .sort()
        .map((n) => ({ id: n, label: n })),
    [allInterventions]
  );

  const uniqueClients = useMemo(() => {
    const pool = resellerFilter ? allInterventions.filter((i) => i.resellerName === resellerFilter) : allInterventions;
    return [...new Set(pool.map((i) => i.clientName).filter(Boolean) as string[])]
      .sort()
      .map((n) => ({ id: n, label: n }));
  }, [allInterventions, resellerFilter]);

  const uniqueVehicles = useMemo(() => {
    const pool = clientFilter
      ? allInterventions.filter((i) => i.clientName === clientFilter)
      : resellerFilter
        ? allInterventions.filter((i) => i.resellerName === resellerFilter)
        : allInterventions;
    return [...new Set(pool.map((i) => i.licensePlate ?? i.vehicleName).filter(Boolean) as string[])]
      .sort()
      .map((n) => ({ id: n, label: n }));
  }, [allInterventions, clientFilter, resellerFilter]);

  const filterBlocks: FilterBlockDef[] = [
    {
      key: 'reseller',
      label: 'Revendeur',
      items: uniqueResellers,
      selected: resellerFilter,
      onSelect: (v) => {
        setResellerFilter(v);
        setClientFilter(null);
        setVehicleFilter(null);
      },
    },
    {
      key: 'client',
      label: 'Client',
      items: uniqueClients,
      selected: clientFilter,
      onSelect: (v) => {
        setClientFilter(v);
        setVehicleFilter(null);
      },
    },
    { key: 'vehicle', label: 'Véhicule', items: uniqueVehicles, selected: vehicleFilter, onSelect: setVehicleFilter },
  ];

  const hasActiveFilters = !!(resellerFilter || clientFilter || vehicleFilter);

  const filteredInterventions: Intervention[] = useMemo(() => {
    let list = allInterventions;
    if (statusFilter) list = list.filter((i) => i.status === statusFilter);
    if (resellerFilter) list = list.filter((i) => i.resellerName === resellerFilter);
    if (clientFilter) list = list.filter((i) => i.clientName === clientFilter);
    if (vehicleFilter) list = list.filter((i) => (i.licensePlate ?? i.vehicleName) === vehicleFilter);
    if (q)
      list = list.filter(
        (i) =>
          (i.clientName ?? '').toLowerCase().includes(q) ||
          (i.nature ?? '').toLowerCase().includes(q) ||
          (i.licensePlate ?? '').includes(q) ||
          (i.vehicleName ?? '').toLowerCase().includes(q) ||
          (i.address ?? '').toLowerCase().includes(q) ||
          (i.imei ?? '').includes(q)
      );
    return list.sort((a, b) => (b.scheduledDate ?? '').localeCompare(a.scheduledDate ?? ''));
  }, [allInterventions, statusFilter, resellerFilter, clientFilter, vehicleFilter, q]);

  const filteredDevices = useMemo(() => {
    const list = (devQuery.data ?? []) as DeviceItem[];
    if (!q) return list;
    return list.filter(
      (i) =>
        (i.imei ?? '').includes(q) ||
        (i.serialNumber ?? '').includes(q) ||
        (i.iccid ?? '').includes(q) ||
        (i.vehicleName ?? '').toLowerCase().includes(q) ||
        (i.model ?? '').toLowerCase().includes(q)
    );
  }, [devQuery.data, q]);

  const filteredStock = useMemo(() => {
    const list = (stockQuery.data ?? []) as StockMovement[];
    if (!q) return list;
    return list.filter((i) => (i.details ?? '').toLowerCase().includes(q) || (i.type ?? '').includes(q));
  }, [stockQuery.data, q]);

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>Tech</Text>
        {activeTab === 'interventions' && (
          <View
            style={{ backgroundColor: theme.primaryDim, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}
          >
            <Text style={{ fontSize: 12, color: theme.primary, fontWeight: '600' }}>
              {filteredInterventions.length} résultat{filteredInterventions.length !== 1 ? 's' : ''}
            </Text>
          </View>
        )}
      </View>

      {/* Tabs */}
      <View style={s.tabsRow}>
        {TABS.map((tab) => {
          const active = activeTab === tab.key;
          const Icon = tab.icon;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[s.tab, active && { borderBottomColor: theme.primary, borderBottomWidth: 2 }]}
              onPress={() => {
                setActiveTab(tab.key);
                setSearch('');
                setStatusFilter(null);
              }}
              accessibilityLabel={tab.label}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
            >
              <Icon size={15} color={active ? theme.primary : theme.text.muted} />
              <Text style={[s.tabLabel, { color: active ? theme.primary : theme.text.muted }]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Recherche + bouton filtre (interventions uniquement) */}
      <View style={s.searchRow}>
        <View style={{ flex: 1 }}>
          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder={
              activeTab === 'interventions'
                ? 'Client, plaque, IMEI, adresse…'
                : activeTab === 'devices'
                  ? 'IMEI, série, modèle, véhicule…'
                  : 'Type, détails…'
            }
          />
        </View>
        {activeTab === 'interventions' && (
          <TouchableOpacity
            style={[
              s.filterBtn,
              (showFilters || hasActiveFilters) && { backgroundColor: theme.primary, borderColor: theme.primary },
            ]}
            onPress={() => setShowFilters((v) => !v)}
            accessibilityLabel="Filtres avancés"
            accessibilityRole="button"
          >
            <SlidersHorizontal size={16} color={showFilters || hasActiveFilters ? '#fff' : theme.text.secondary} />
            {hasActiveFilters && <View style={s.filterDot} />}
          </TouchableOpacity>
        )}
      </View>

      {/* VehicleFilterPanel (interventions) */}
      {activeTab === 'interventions' && (
        <View style={{ paddingHorizontal: 16, paddingBottom: showFilters ? 8 : 0 }}>
          <VehicleFilterPanel
            visible={showFilters}
            blocks={filterBlocks}
            hasActiveFilters={hasActiveFilters}
            onReset={() => {
              setResellerFilter(null);
              setClientFilter(null);
              setVehicleFilter(null);
            }}
          />
        </View>
      )}

      {/* Status chips — sticky au-dessus de la liste */}
      {activeTab === 'interventions' && (
        <View style={{ flexShrink: 0 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8, gap: 6 }}
          >
            {INT_STATUS_CHIPS.map((chip) => {
              const active = statusFilter === chip.key;
              return (
                <TouchableOpacity
                  key={chip.key}
                  style={[
                    s.chip,
                    active
                      ? { backgroundColor: chip.color, borderColor: chip.color }
                      : { borderColor: chip.color + '66' },
                  ]}
                  onPress={() => setStatusFilter(active ? null : chip.key)}
                  accessibilityLabel={`Filtrer par ${chip.label}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[s.chipText, { color: active ? '#fff' : chip.color }]}>{chip.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Liste */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme.primary} />}
      >
        {isLoading ? (
          <ActivityIndicator color={theme.primary} style={{ marginTop: 32 }} />
        ) : isError ? (
          <View style={s.empty}>
            <AlertCircle size={36} color="#EF4444" />
            <Text style={[s.emptyText, { color: '#EF4444' }]}>Erreur de chargement</Text>
            <TouchableOpacity
              onPress={() => refetch()}
              style={{
                marginTop: 8,
                paddingHorizontal: 16,
                paddingVertical: 8,
                backgroundColor: theme.primaryDim,
                borderRadius: 10,
              }}
            >
              <Text style={{ fontSize: 13, color: theme.primary, fontWeight: '600' }}>Réessayer</Text>
            </TouchableOpacity>
          </View>
        ) : activeTab === 'interventions' ? (
          filteredInterventions.length === 0 ? (
            <View style={s.empty}>
              <Text style={s.emptyText}>Aucune intervention</Text>
            </View>
          ) : (
            filteredInterventions.map((item) => (
              <InterventionItem
                key={item.id}
                item={item}
                theme={theme}
                onPress={() => nav.navigate('InterventionDetail', { interventionId: item.id })}
              />
            ))
          )
        ) : activeTab === 'devices' ? (
          filteredDevices.length === 0 ? (
            <View style={s.empty}>
              <Text style={s.emptyText}>Aucun appareil</Text>
            </View>
          ) : (
            filteredDevices.map((item) => <DeviceItem key={item.id} item={item} theme={theme} onRma={setRmaDevice} />)
          )
        ) : filteredStock.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyText}>Aucun mouvement</Text>
          </View>
        ) : (
          filteredStock.map((item) => <StockItem key={item.id} item={item} theme={theme} />)
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      <RmaModal
        device={rmaDevice}
        visible={!!rmaDevice}
        onClose={() => setRmaDevice(null)}
        onSubmit={(data) => rmaMutation.mutate(data)}
        isLoading={rmaMutation.isPending}
        theme={theme}
      />
    </SafeAreaView>
  );
}

const styles = (theme: ThemeType) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg.primary },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    title: { fontSize: 22, fontWeight: '700', color: theme.text.primary },
    tabsRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: theme.border },
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
    searchRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
    filterBtn: {
      width: 40,
      height: 40,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.bg.surface,
      justifyContent: 'center',
      alignItems: 'center',
    },
    filterDot: {
      position: 'absolute',
      top: 6,
      right: 6,
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: '#EF4444',
      borderWidth: 1.5,
      borderColor: theme.bg.surface,
    },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1.5,
      backgroundColor: 'transparent',
    },
    chipText: { fontSize: 12, fontWeight: '600' },
    list: { padding: 16, paddingBottom: 100 },
    empty: { alignItems: 'center', paddingVertical: 48 },
    emptyText: { fontSize: 14, color: theme.text.muted },
  });
