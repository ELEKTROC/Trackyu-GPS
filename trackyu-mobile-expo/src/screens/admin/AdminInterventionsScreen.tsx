/**
 * TrackYu Mobile — Admin Interventions Screen
 * Vue admin/superadmin — 3 onglets comme TechScreen :
 *   • Interventions  → toutes, sans filtre technicien
 *   • Appareils      → /api/devices (tous)
 *   • Stock / SAV    → /api/stock-movements (tous)
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
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Wrench,
  Cpu,
  Package,
  ChevronRight,
  MapPin,
  Clock,
  User,
  RotateCcw,
  X,
  SlidersHorizontal,
  Plus,
  Trash2,
} from 'lucide-react-native';
import { useTheme } from '../../theme';
import { SearchBar } from '../../components/SearchBar';
import { VehicleFilterPanel, type FilterBlockDef } from '../../components/VehicleFilterPanel';
import { ProtectedScreen } from '../../components/ProtectedScreen';
import { EmptyState } from '../../components/EmptyState';
import { ADMIN_SCREEN_ROLES, ROLE, normalizeRole } from '../../constants/roles';
import { useAuthStore } from '../../store/authStore';
import tiersApi, { type Tier } from '../../api/tiersApi';
import interventionsApi, {
  type Intervention,
  type InterventionStatus,
  type InterventionType,
  STATUS_LABELS,
  STATUS_COLORS,
} from '../../api/interventions';
import apiClient from '../../api/client';
import { normalizeError } from '../../utils/errorTypes';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type RouteP = RouteProp<RootStackParamList, 'AdminInterventions'>;
type ThemeType = ReturnType<typeof import('../../theme').useTheme>['theme'];
type TabKey = 'interventions' | 'devices' | 'stock';

// ── Device types ──────────────────────────────────────────────────────────────

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
type DeviceType = 'BOX' | 'SIM' | 'SENSOR' | 'ACCESSORY';

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

// ── Onglets ───────────────────────────────────────────────────────────────────

const TABS: { key: TabKey; label: string; icon: React.ComponentType<{ size: number; color: string }> }[] = [
  { key: 'interventions', label: 'Interventions', icon: Wrench },
  { key: 'devices', label: 'Appareils', icon: Cpu },
  { key: 'stock', label: 'Stock / SAV', icon: Package },
];

const INT_STATUS_CHIPS: { key: InterventionStatus | 'ALL'; label: string }[] = [
  { key: 'ALL', label: 'Tous' },
  { key: 'PENDING', label: 'À planifier' },
  { key: 'SCHEDULED', label: 'Planifié' },
  { key: 'EN_ROUTE', label: 'En route' },
  { key: 'IN_PROGRESS', label: 'En cours' },
  { key: 'COMPLETED', label: 'Terminé' },
  { key: 'POSTPONED', label: 'Reporté' },
];

// ── Items ─────────────────────────────────────────────────────────────────────

function InterventionItem({
  item,
  theme,
  onPress,
  onDelete,
}: {
  item: Intervention;
  theme: ThemeType;
  onPress: () => void;
  onDelete?: () => void;
}) {
  const color = STATUS_COLORS[item.status] ?? '#6B7280';
  let dateStr = '–',
    timeStr = '';
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
      accessibilityRole="button"
      accessibilityLabel={`${item.nature ?? ''} — ${item.clientName ?? ''} — ${STATUS_LABELS[item.status] ?? item.status}`}
    >
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={li(theme).typeLabel}>{item.type === 'INSTALLATION' ? 'Installation' : 'Dépannage'}</Text>
          <View style={{ backgroundColor: color + '22', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 }}>
            <Text style={{ fontSize: 11, fontWeight: '600', color }}>{STATUS_LABELS[item.status]}</Text>
          </View>
        </View>
        <Text style={li(theme).title} numberOfLines={1}>
          {item.nature ?? '–'}
        </Text>
        {item.clientName && (
          <View style={li(theme).meta}>
            <User size={10} color={theme.text.muted} />
            <Text style={li(theme).metaText}>{item.clientName}</Text>
          </View>
        )}
        {(item.address ?? item.location) && (
          <View style={li(theme).meta}>
            <MapPin size={10} color={theme.text.muted} />
            <Text style={[li(theme).metaText, { flex: 1 }]} numberOfLines={1}>
              {item.address ?? item.location}
            </Text>
          </View>
        )}
        <View style={li(theme).meta}>
          <Clock size={10} color={theme.text.muted} />
          <Text style={li(theme).metaText}>{dateStr}</Text>
          {timeStr ? (
            <Text style={[li(theme).metaText, { color: theme.primary, fontWeight: '600' }]}> · {timeStr}</Text>
          ) : null}
        </View>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 16 }}>
        {onDelete && (
          <TouchableOpacity onPress={onDelete} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Trash2 size={15} color="#EF4444" />
          </TouchableOpacity>
        )}
        <ChevronRight size={14} color={theme.text.muted} />
      </View>
    </TouchableOpacity>
  );
}

function DeviceItem({ item, theme, onRma }: { item: DeviceItem; theme: ThemeType; onRma: (d: DeviceItem) => void }) {
  const color = DEVICE_STATUS_COLORS[item.status] ?? '#6B7280';
  const canRma = !['RMA', 'RMA_PENDING', 'SCRAPPED', 'INSTALLED'].includes(item.status);
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
            {DEVICE_TYPE_LABELS[item.type] ?? item.type} · {item.model ?? '–'}
          </Text>
          {item.vehicleName && (
            <Text style={{ fontSize: 12, color: theme.text.secondary }}>
              {item.vehiclePlate ?? ''} {item.vehicleName}
            </Text>
          )}
          {item.type === 'SIM' && item.phoneNumber && (
            <Text style={li(theme).sub}>
              {item.phoneNumber} · {item.operator ?? ''}
            </Text>
          )}
        </View>
        <View style={{ backgroundColor: color + '22', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 }}>
          <Text style={{ fontSize: 11, fontWeight: '600', color }}>
            {DEVICE_STATUS_LABELS[item.status] ?? item.status}
          </Text>
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

// ── Constantes création intervention ─────────────────────────────────────────

const INT_TYPE_OPTS: { value: InterventionType; label: string }[] = [
  { value: 'INSTALLATION', label: 'Installation' },
  { value: 'DEPANNAGE', label: 'Dépannage' },
  { value: 'REMPLACEMENT', label: 'Remplacement' },
  { value: 'RETRAIT', label: 'Retrait' },
  { value: 'REINSTALLATION', label: 'Réinstallation' },
  { value: 'TRANSFERT', label: 'Transfert' },
];

// ── Champ texte top-level (évite le remontage clavier) ────────────────────────

interface IFProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  theme: ThemeType;
  placeholder?: string;
  multiline?: boolean;
}
function IField({ label, value, onChange, theme, placeholder, multiline }: IFProps) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ fontSize: 12, color: theme.text.muted, marginBottom: 5 }}>{label}</Text>
      <TextInput
        style={{
          backgroundColor: theme.bg.elevated,
          borderWidth: 1,
          borderColor: theme.border,
          borderRadius: 10,
          paddingHorizontal: 12,
          paddingVertical: 10,
          fontSize: 14,
          color: theme.text.primary,
          ...(multiline ? { minHeight: 70, textAlignVertical: 'top' as const } : {}),
        }}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder ?? label}
        placeholderTextColor={theme.text.muted}
        multiline={multiline}
      />
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
                  {DEVICE_TYPE_LABELS[device.type] ?? device.type} · {device.imei ?? device.serialNumber ?? device.id}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={20} color={theme.text.muted} />
            </TouchableOpacity>
          </View>

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
              Raison <Text style={{ color: '#EF4444' }}>*</Text>
            </Text>
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
              placeholder="Détails supplémentaires…"
              placeholderTextColor={theme.text.muted}
              multiline
              numberOfLines={3}
            />
          </View>

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

// ── Main ──────────────────────────────────────────────────────────────────────

export default function AdminInterventionsScreen() {
  const { theme } = useTheme();
  const nav = useNavigation<Nav>();
  const route = useRoute<RouteP>();
  const qc = useQueryClient();

  const userRole = useAuthStore((s) => normalizeRole(s.user?.role?.toUpperCase() ?? ''));
  const canCreate = ([ROLE.SUPERADMIN, ROLE.ADMIN, ROLE.MANAGER] as string[]).includes(userRole);
  const canDelete = ([ROLE.SUPERADMIN, ROLE.ADMIN] as string[]).includes(userRole);

  const [activeTab, setActiveTab] = useState<TabKey>(route.params?.initialTab ?? 'interventions');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<InterventionStatus | 'ALL'>('ALL');
  const [showFilters, setShowFilters] = useState(false);
  const [resellerFilter, setResellerFilter] = useState<string | null>(null);
  const [clientFilter, setClientFilter] = useState<string | null>(null);
  const [rmaDevice, setRmaDevice] = useState<DeviceItem | null>(null);

  // Création d'intervention
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    type: '' as InterventionType | '',
    clientId: '',
    clientName: '',
    scheduledDate: '',
    address: '',
    nature: '',
    notes: '',
  });
  const [clientSearch, setClientSearch] = useState('');
  const [clientPickerOpen, setClientPickerOpen] = useState(false);

  // ── Queries ──────────────────────────────────────────────────────────────────

  const intQuery = useQuery({
    queryKey: ['admin-interventions-all'],
    queryFn: () => interventionsApi.getAll(),
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  const devQuery = useQuery({
    queryKey: ['admin-devices-all'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/devices');
        return Array.isArray(res.data) ? (res.data as DeviceItem[]) : [];
      } catch (e) {
        throw normalizeError(e);
      }
    },
    enabled: activeTab === 'devices',
    staleTime: 60_000,
  });

  const stockQuery = useQuery({
    queryKey: ['admin-stock-movements-all'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/stock-movements');
        return Array.isArray(res.data) ? (res.data as StockMovement[]) : [];
      } catch (e) {
        throw normalizeError(e);
      }
    },
    enabled: activeTab === 'stock',
  });

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
      qc.invalidateQueries({ queryKey: ['admin-devices-all'] });
      qc.invalidateQueries({ queryKey: ['admin-stock-movements-all'] });
      Alert.alert('SAV déclaré', 'Le retour SAV a été enregistré avec succès.');
    },
    onError: () => Alert.alert('Erreur', 'Impossible de soumettre le SAV.'),
  });

  // Clients pour le picker de création
  const { data: clientsList = [] } = useQuery<Tier[]>({
    queryKey: ['tiers-clients-create'],
    queryFn: () => tiersApi.getAll({ type: 'CLIENT' }),
    enabled: showCreateModal,
    staleTime: 300_000,
  });

  const filteredClients = clientsList.filter(
    (c) => !clientSearch || c.name.toLowerCase().includes(clientSearch.toLowerCase())
  );

  const createMutation = useMutation({
    mutationFn: () =>
      interventionsApi.create({
        clientId: createForm.clientId,
        type: createForm.type as InterventionType,
        nature: createForm.nature || null,
        scheduledDate: createForm.scheduledDate || null,
        address: createForm.address || null,
        notes: createForm.notes || null,
        status: 'PENDING',
      }),
    onSuccess: (newIv) => {
      qc.invalidateQueries({ queryKey: ['admin-interventions-all'] });
      setShowCreateModal(false);
      nav.navigate('InterventionDetail', { interventionId: newIv.id });
    },
    onError: () => Alert.alert('Erreur', "Impossible de créer l'intervention."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => interventionsApi.deleteIntervention(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-interventions-all'] });
    },
    onError: () => Alert.alert('Erreur', "Impossible de supprimer l'intervention."),
  });

  const confirmDeleteIntervention = (id: string, label: string) => {
    Alert.alert('Supprimer', `Supprimer "${label}" ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => deleteMutation.mutate(id) },
    ]);
  };

  const openCreateModal = () => {
    setCreateForm({ type: '', clientId: '', clientName: '', scheduledDate: '', address: '', nature: '', notes: '' });
    setClientSearch('');
    setClientPickerOpen(false);
    setShowCreateModal(true);
  };

  const submitCreate = () => {
    if (!createForm.type) {
      Alert.alert('Champ requis', "Sélectionnez un type d'intervention.");
      return;
    }
    if (!createForm.clientId) {
      Alert.alert('Champ requis', 'Sélectionnez un client.');
      return;
    }
    createMutation.mutate();
  };

  const activeQuery = activeTab === 'interventions' ? intQuery : activeTab === 'devices' ? devQuery : stockQuery;
  const isLoading = activeQuery.isLoading;
  const isRefetching = activeQuery.isRefetching;
  const refetch = activeQuery.refetch;

  // ── Filtered data ─────────────────────────────────────────────────────────────

  const q = search.toLowerCase();

  const filteredInterventions = useMemo<Intervention[]>(() => {
    let list = (intQuery.data ?? []) as Intervention[];
    if (statusFilter !== 'ALL') list = list.filter((i) => i.status === statusFilter);
    if (resellerFilter) list = list.filter((i) => i.resellerName === resellerFilter);
    if (clientFilter) list = list.filter((i) => i.clientName === clientFilter);
    if (q)
      list = list.filter(
        (i) =>
          (i.clientName ?? '').toLowerCase().includes(q) ||
          (i.nature ?? '').toLowerCase().includes(q) ||
          (i.licensePlate ?? '').includes(q) ||
          (i.vehicleName ?? '').toLowerCase().includes(q) ||
          (i.address ?? '').toLowerCase().includes(q)
      );
    return list.sort((a, b) => (b.scheduledDate ?? '').localeCompare(a.scheduledDate ?? ''));
  }, [intQuery.data, statusFilter, resellerFilter, clientFilter, q]);

  // ── Filtres cascade (interventions uniquement) ────────────────────────────
  const uniqueResellers = useMemo(() => {
    const m = new Set<string>();
    (intQuery.data ?? []).forEach((i) => {
      const n = i.resellerName?.trim();
      if (n) m.add(n);
    });
    return Array.from(m)
      .sort()
      .map((n) => ({ id: n, label: n }));
  }, [intQuery.data]);

  const uniqueClients = useMemo(() => {
    const m = new Set<string>();
    (intQuery.data ?? []).forEach((i) => {
      if (resellerFilter && i.resellerName !== resellerFilter) return;
      const n = i.clientName?.trim();
      if (n) m.add(n);
    });
    return Array.from(m)
      .sort()
      .map((n) => ({ id: n, label: n }));
  }, [intQuery.data, resellerFilter]);

  const filterBlocks: FilterBlockDef[] = useMemo(
    () => [
      {
        key: 'reseller',
        label: 'Revendeur',
        items: uniqueResellers,
        selected: resellerFilter,
        onSelect: (id) => {
          setResellerFilter(id);
          setClientFilter(null);
        },
      },
      {
        key: 'client',
        label: 'Client',
        items: uniqueClients,
        selected: clientFilter,
        onSelect: setClientFilter,
      },
    ],
    [uniqueResellers, uniqueClients, resellerFilter, clientFilter]
  );

  const hasActiveFilters = !!(resellerFilter || clientFilter);
  const resetFilters = () => {
    setResellerFilter(null);
    setClientFilter(null);
  };

  const filteredDevices = useMemo<DeviceItem[]>(() => {
    const list = (devQuery.data ?? []) as DeviceItem[];
    if (!q) return list;
    return list.filter(
      (i) =>
        (i.imei ?? '').includes(q) ||
        (i.serialNumber ?? '').includes(q) ||
        (i.vehicleName ?? '').toLowerCase().includes(q) ||
        (i.model ?? '').toLowerCase().includes(q)
    );
  }, [devQuery.data, q]);

  const filteredStock = useMemo<StockMovement[]>(() => {
    const list = (stockQuery.data ?? []) as StockMovement[];
    if (!q) return list;
    return list.filter((i) => (i.details ?? '').toLowerCase().includes(q) || (i.type ?? '').includes(q));
  }, [stockQuery.data, q]);

  const pendingCount = (intQuery.data ?? []).filter((i) => i.status === 'PENDING').length;
  const inProgressCount = (intQuery.data ?? []).filter((i) => ['EN_ROUTE', 'IN_PROGRESS'].includes(i.status)).length;

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
            <Text style={s(theme).title}>Interventions</Text>
            {!isLoading && activeTab === 'interventions' && (
              <Text style={s(theme).subtitle}>
                {filteredInterventions.length} résultat{filteredInterventions.length !== 1 ? 's' : ''}
                {pendingCount > 0 ? ` · ${pendingCount} à planifier` : ''}
                {inProgressCount > 0 ? ` · ${inProgressCount} en cours` : ''}
              </Text>
            )}
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
                onPress={() => {
                  setActiveTab(tab.key);
                  setSearch('');
                  setStatusFilter('ALL');
                }}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                accessibilityLabel={tab.label}
              >
                <Icon size={15} color={active ? theme.primary : theme.text.muted} />
                <Text style={[s(theme).tabLabel, { color: active ? theme.primary : theme.text.muted }]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Recherche + filtres (interventions uniquement) */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginVertical: 10 }}>
          <View style={{ flex: 1 }}>
            <SearchBar
              value={search}
              onChangeText={setSearch}
              placeholder={
                activeTab === 'interventions'
                  ? 'Client, nature, véhicule, adresse…'
                  : activeTab === 'devices'
                    ? 'IMEI, série, modèle, véhicule…'
                    : 'Type, détails…'
              }
            />
          </View>
          {activeTab === 'interventions' && (
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
          )}
        </View>

        {activeTab === 'interventions' && (
          <VehicleFilterPanel
            visible={showFilters}
            blocks={filterBlocks}
            hasActiveFilters={hasActiveFilters}
            onReset={resetFilters}
          />
        )}

        {/* Chips statut (interventions uniquement) */}
        {activeTab === 'interventions' && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8, gap: 6 }}
          >
            {INT_STATUS_CHIPS.map((chip) => {
              const active = statusFilter === chip.key;
              const color =
                chip.key === 'ALL' ? theme.primary : (STATUS_COLORS[chip.key as InterventionStatus] ?? '#6B7280');
              return (
                <TouchableOpacity
                  key={chip.key}
                  style={[s(theme).chip, active && { backgroundColor: color, borderColor: color }]}
                  onPress={() => setStatusFilter(chip.key as InterventionStatus | 'ALL')}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[s(theme).chipText, { color: active ? '#fff' : theme.text.secondary }]}>
                    {chip.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Liste */}
        <ScrollView
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme.primary} />}
        >
          {isLoading ? (
            <ActivityIndicator color={theme.primary} style={{ marginTop: 32 }} />
          ) : activeTab === 'interventions' ? (
            filteredInterventions.length === 0 ? (
              <EmptyState
                icon={<Wrench size={40} color={theme.text.muted} />}
                title="Aucune intervention"
                subtitle="Aucune intervention ne correspond aux filtres"
              />
            ) : (
              filteredInterventions.map((i) => (
                <InterventionItem
                  onDelete={canDelete ? () => confirmDeleteIntervention(i.id, i.nature ?? i.type) : undefined}
                  key={i.id}
                  item={i}
                  theme={theme}
                  onPress={() => nav.navigate('InterventionDetail', { interventionId: i.id })}
                />
              ))
            )
          ) : activeTab === 'devices' ? (
            filteredDevices.length === 0 ? (
              <EmptyState
                icon={<Cpu size={40} color={theme.text.muted} />}
                title="Aucun appareil"
                subtitle="Les appareils GPS apparaîtront ici"
              />
            ) : (
              filteredDevices.map((d) => <DeviceItem key={d.id} item={d} theme={theme} onRma={setRmaDevice} />)
            )
          ) : filteredStock.length === 0 ? (
            <EmptyState
              icon={<Package size={40} color={theme.text.muted} />}
              title="Aucun mouvement de stock"
              subtitle="Les mouvements SAV apparaîtront ici"
            />
          ) : (
            filteredStock.map((m) => <StockItem key={m.id} item={m} theme={theme} />)
          )}
          <View style={{ height: 40 }} />
        </ScrollView>

        <RmaModal
          device={rmaDevice}
          visible={rmaDevice !== null}
          onClose={() => setRmaDevice(null)}
          onSubmit={(data) => rmaMutation.mutate(data)}
          isLoading={rmaMutation.isPending}
          theme={theme}
        />

        {/* FAB Nouvelle intervention */}
        {canCreate && activeTab === 'interventions' && (
          <TouchableOpacity
            style={{
              position: 'absolute',
              bottom: 24,
              right: 20,
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: theme.primary,
              justifyContent: 'center',
              alignItems: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.2,
              shadowRadius: 8,
              elevation: 6,
            }}
            onPress={openCreateModal}
            accessibilityLabel="Nouvelle intervention"
            accessibilityRole="button"
          >
            <Plus size={26} color="#fff" />
          </TouchableOpacity>
        )}

        {/* Modal création intervention */}
        <Modal
          visible={showCreateModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowCreateModal(false)}
        >
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg.primary }} edges={['top']}>
              {/* Header modal */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  borderBottomWidth: 1,
                  borderBottomColor: theme.border,
                  gap: 12,
                }}
              >
                <TouchableOpacity onPress={() => setShowCreateModal(false)} style={{ padding: 4 }}>
                  <X size={22} color={theme.text.secondary} />
                </TouchableOpacity>
                <Text style={{ flex: 1, fontSize: 17, fontWeight: '700', color: theme.text.primary }}>
                  Nouvelle intervention
                </Text>
                <TouchableOpacity
                  onPress={submitCreate}
                  disabled={createMutation.isPending}
                  style={{
                    backgroundColor: theme.primary,
                    paddingHorizontal: 18,
                    paddingVertical: 8,
                    borderRadius: 10,
                    opacity: createMutation.isPending ? 0.6 : 1,
                  }}
                >
                  {createMutation.isPending ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>Créer</Text>
                  )}
                </TouchableOpacity>
              </View>

              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ padding: 16 }}
                keyboardShouldPersistTaps="handled"
              >
                {/* Type */}
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '700',
                    color: theme.text.muted,
                    marginBottom: 10,
                    letterSpacing: 0.5,
                    textTransform: 'uppercase',
                  }}
                >
                  Type d'intervention *
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                  {INT_TYPE_OPTS.map((opt) => {
                    const active = createForm.type === opt.value;
                    return (
                      <TouchableOpacity
                        key={opt.value}
                        onPress={() => setCreateForm((f) => ({ ...f, type: opt.value }))}
                        style={{
                          paddingHorizontal: 14,
                          paddingVertical: 8,
                          borderRadius: 20,
                          backgroundColor: active ? theme.primary : theme.bg.elevated,
                          borderWidth: 1,
                          borderColor: active ? theme.primary : theme.border,
                        }}
                      >
                        <Text
                          style={{ fontSize: 13, fontWeight: '600', color: active ? '#fff' : theme.text.secondary }}
                        >
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Client */}
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '700',
                    color: theme.text.muted,
                    marginBottom: 8,
                    letterSpacing: 0.5,
                    textTransform: 'uppercase',
                  }}
                >
                  Client *
                </Text>
                {createForm.clientId ? (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: theme.primaryDim,
                      borderRadius: 10,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      marginBottom: 20,
                      gap: 8,
                    }}
                  >
                    <User size={16} color={theme.primary} />
                    <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: theme.primary }}>
                      {createForm.clientName}
                    </Text>
                    <TouchableOpacity
                      onPress={() => {
                        setCreateForm((f) => ({ ...f, clientId: '', clientName: '' }));
                        setClientPickerOpen(true);
                      }}
                    >
                      <X size={16} color={theme.primary} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={{ marginBottom: 4 }}>
                    <TextInput
                      style={{
                        backgroundColor: theme.bg.elevated,
                        borderWidth: 1,
                        borderColor: clientPickerOpen ? theme.primary : theme.border,
                        borderRadius: 10,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        fontSize: 14,
                        color: theme.text.primary,
                        marginBottom: 8,
                      }}
                      value={clientSearch}
                      onChangeText={setClientSearch}
                      placeholder="Rechercher un client…"
                      placeholderTextColor={theme.text.muted}
                      onFocus={() => setClientPickerOpen(true)}
                    />
                    {clientPickerOpen && (
                      <View
                        style={{
                          backgroundColor: theme.bg.surface,
                          borderWidth: 1,
                          borderColor: theme.border,
                          borderRadius: 10,
                          maxHeight: 200,
                          marginBottom: 12,
                          overflow: 'hidden',
                        }}
                      >
                        <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled>
                          {filteredClients.length === 0 ? (
                            <Text style={{ padding: 14, fontSize: 13, color: theme.text.muted, textAlign: 'center' }}>
                              Aucun client trouvé
                            </Text>
                          ) : (
                            filteredClients.slice(0, 30).map((c) => (
                              <TouchableOpacity
                                key={c.id}
                                style={{
                                  paddingHorizontal: 14,
                                  paddingVertical: 10,
                                  borderBottomWidth: 1,
                                  borderBottomColor: theme.border,
                                }}
                                onPress={() => {
                                  setCreateForm((f) => ({ ...f, clientId: c.id, clientName: c.name }));
                                  setClientSearch('');
                                  setClientPickerOpen(false);
                                }}
                              >
                                <Text style={{ fontSize: 14, color: theme.text.primary }}>{c.name}</Text>
                                {c.phone && <Text style={{ fontSize: 12, color: theme.text.muted }}>{c.phone}</Text>}
                              </TouchableOpacity>
                            ))
                          )}
                        </ScrollView>
                      </View>
                    )}
                  </View>
                )}

                {/* Planification */}
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '700',
                    color: theme.text.muted,
                    marginBottom: 12,
                    marginTop: 4,
                    letterSpacing: 0.5,
                    textTransform: 'uppercase',
                  }}
                >
                  Planification
                </Text>
                <IField
                  label="Nature / prestation"
                  value={createForm.nature}
                  onChange={(v) => setCreateForm((f) => ({ ...f, nature: v }))}
                  theme={theme}
                  placeholder="Ex : Installation boîtier GPS"
                />
                <IField
                  label="Date prévue (YYYY-MM-DD HH:mm)"
                  value={createForm.scheduledDate}
                  onChange={(v) => setCreateForm((f) => ({ ...f, scheduledDate: v }))}
                  theme={theme}
                  placeholder="2026-04-21 09:00"
                />
                <IField
                  label="Adresse d'intervention"
                  value={createForm.address}
                  onChange={(v) => setCreateForm((f) => ({ ...f, address: v }))}
                  theme={theme}
                />
                <IField
                  label="Notes"
                  value={createForm.notes}
                  onChange={(v) => setCreateForm((f) => ({ ...f, notes: v }))}
                  theme={theme}
                  multiline
                  placeholder="Instructions, contexte…"
                />
                <View style={{ height: 32 }} />
              </ScrollView>
            </SafeAreaView>
          </KeyboardAvoidingView>
        </Modal>
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
      gap: 6,
      paddingVertical: 12,
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
    },
    tabLabel: { fontSize: 13, fontWeight: '600' },
    chip: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 5,
      backgroundColor: theme.bg.surface,
    },
    chipText: { fontSize: 11, fontWeight: '600' },
  });
