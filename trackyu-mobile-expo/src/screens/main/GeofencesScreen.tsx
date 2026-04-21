/**
 * TrackYu Mobile — Geofences Screen
 * CRUD zones géographiques — CIRCLE uniquement sur mobile (POLYGON/ROUTE : lecture seule).
 * Permissions lecture : VIEW_TECH | Permissions écriture : MANAGE_FLEET
 */
import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TextInput,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Circle,
  Hexagon,
  Route,
  MapPin,
  ToggleLeft,
  ToggleRight,
  SlidersHorizontal,
  Plus,
  X,
  Save,
  Trash2,
  Power,
  Lock,
} from 'lucide-react-native';
import type { RootStackParamList } from '../../navigation/types';
import geofencesApi, {
  type Geofence,
  type GeofenceType,
  type CreateCircleRequest,
  isCircle,
  toLatLng,
  formatRadius,
} from '../../api/geofencesApi';
import { useTheme } from '../../theme';
import { VehicleFilterPanel, type FilterBlockDef } from '../../components/VehicleFilterPanel';
import { useAuthStore } from '../../store/authStore';
import { ROLE, normalizeRole } from '../../constants/roles';

type Props = NativeStackScreenProps<RootStackParamList, 'Geofences'>;
type ThemeType = ReturnType<typeof import('../../theme').useTheme>['theme'];

// Rôles qui peuvent créer / modifier des géofences (MANAGE_FLEET)
const WRITE_ROLES = [ROLE.SUPERADMIN, ROLE.ADMIN, ROLE.MANAGER];

// ── Constantes ────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<GeofenceType, { label: string; Icon: React.ComponentType<{ size: number; color: string }> }> =
  {
    CIRCLE: { label: 'Cercle', Icon: Circle },
    POLYGON: { label: 'Polygone', Icon: Hexagon },
    ROUTE: { label: 'Route', Icon: Route },
  };

const TYPE_FILTER_ITEMS = [
  { id: 'CIRCLE', label: 'Cercle' },
  { id: 'POLYGON', label: 'Polygone' },
  { id: 'ROUTE', label: 'Route' },
];
const STATUS_FILTER_ITEMS = [
  { id: 'active', label: 'Active' },
  { id: 'inactive', label: 'Inactive' },
];

const COLOR_PALETTE = [
  { value: '#F97316', label: 'Orange' },
  { value: '#3B82F6', label: 'Bleu' },
  { value: '#22C55E', label: 'Vert' },
  { value: '#EF4444', label: 'Rouge' },
  { value: '#8B5CF6', label: 'Violet' },
  { value: '#06B6D4', label: 'Cyan' },
  { value: '#F59E0B', label: 'Ambre' },
  { value: '#6B7280', label: 'Gris' },
];

// ── GeofenceCard ──────────────────────────────────────────────────────────────

function GeofenceCard({
  item,
  theme,
  canWrite,
  onPress,
  onToggle,
}: {
  item: Geofence;
  theme: ThemeType;
  canWrite: boolean;
  onPress: () => void;
  onToggle: () => void;
}) {
  const cfg = TYPE_CONFIG[item.type] ?? TYPE_CONFIG['CIRCLE'];
  const color = item.color ?? '#6366F1';
  const isEditableType = item.type === 'CIRCLE';

  const detail = useMemo(() => {
    if (isCircle(item)) {
      const c = item.coordinates;
      return `${c.center.lat.toFixed(5)}, ${c.center.lng.toFixed(5)}  ·  ${formatRadius(c.radius)}`;
    }
    const pts = toLatLng(item.coordinates as { lat: number; lng: number }[]);
    return `${pts.length} point${pts.length > 1 ? 's' : ''}`;
  }, [item]);

  return (
    <TouchableOpacity
      onPress={canWrite && isEditableType ? onPress : undefined}
      activeOpacity={canWrite && isEditableType ? 0.75 : 1}
      style={[
        {
          borderRadius: 12,
          borderWidth: 1,
          borderColor: theme.border,
          backgroundColor: theme.bg.surface,
          flexDirection: 'row',
          overflow: 'hidden',
        },
      ]}
      accessibilityRole={canWrite && isEditableType ? 'button' : 'none'}
      accessibilityLabel={`Zone ${item.name}${canWrite && isEditableType ? '. Toucher pour modifier.' : ''}`}
    >
      <View style={{ width: 4, backgroundColor: color }} />
      <View style={{ flex: 1, padding: 12, gap: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              backgroundColor: color + '22',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <cfg.Icon size={14} color={color} />
          </View>
          <Text style={{ flex: 1, fontSize: 14, fontWeight: '700', color: theme.text.primary }} numberOfLines={1}>
            {item.name}
          </Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 3,
              borderRadius: 6,
              paddingHorizontal: 6,
              paddingVertical: 3,
              backgroundColor: item.is_active ? '#22C55E22' : theme.bg.elevated,
              borderWidth: 1,
              borderColor: item.is_active ? '#22C55E' : theme.border,
            }}
          >
            {item.is_active ? (
              <ToggleRight size={11} color="#22C55E" />
            ) : (
              <ToggleLeft size={11} color={theme.text.muted} />
            )}
            <Text style={{ fontSize: 10, fontWeight: '600', color: item.is_active ? '#22C55E' : theme.text.muted }}>
              {item.is_active ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <MapPin size={11} color={theme.text.muted} />
            <Text style={{ fontSize: 11, color: theme.text.muted }}>{detail}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {!isEditableType ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Lock size={10} color={theme.text.muted} />
                <Text style={{ fontSize: 10, color: theme.text.muted }}>Web uniquement</Text>
              </View>
            ) : null}
            {canWrite ? (
              <TouchableOpacity
                onPress={onToggle}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  backgroundColor: theme.bg.elevated,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Power size={13} color={item.is_active ? '#F59E0B' : '#22C55E'} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── Form modal ────────────────────────────────────────────────────────────────

type FormState = {
  name: string;
  centerLat: string;
  centerLng: string;
  radius: string;
  color: string;
  isActive: boolean;
};

const EMPTY_FORM: FormState = {
  name: '',
  centerLat: '',
  centerLng: '',
  radius: '500',
  color: '#F97316',
  isActive: true,
};

function geofenceToForm(g: Geofence): FormState {
  if (!isCircle(g)) return EMPTY_FORM;
  const c = g.coordinates;
  return {
    name: g.name,
    centerLat: String(c.center.lat),
    centerLng: String(c.center.lng),
    radius: String(c.radius),
    color: g.color ?? '#F97316',
    isActive: g.is_active,
  };
}

// Top-level pour éviter remount TextInput
type FieldProps = {
  theme: ThemeType;
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric' | 'decimal-pad';
};
function GeoField({ theme, label, value, onChangeText, placeholder, keyboardType }: FieldProps) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ fontSize: 12, fontWeight: '600', color: theme.text.secondary, marginBottom: 6 }}>{label}</Text>
      <TextInput
        style={{
          backgroundColor: theme.bg.surface,
          borderWidth: 1,
          borderColor: theme.border,
          borderRadius: 10,
          paddingHorizontal: 12,
          paddingVertical: 10,
          fontSize: 14,
          color: theme.text.primary,
        }}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.text.muted}
        keyboardType={keyboardType ?? 'default'}
      />
    </View>
  );
}

function GeofenceFormModal({
  visible,
  geofence,
  onClose,
  onSubmit,
  onDelete,
  isPending,
}: {
  visible: boolean;
  geofence: Geofence | null;
  onClose: () => void;
  onSubmit: (payload: CreateCircleRequest) => void;
  onDelete: () => void;
  isPending: boolean;
}) {
  const { theme } = useTheme();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const isEdit = Boolean(geofence);

  useEffect(() => {
    if (visible) setForm(geofence ? geofenceToForm(geofence) : EMPTY_FORM);
  }, [visible, geofence]);

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = () => {
    if (!form.name.trim()) {
      Alert.alert('Champ requis', 'Le nom de la zone est obligatoire.');
      return;
    }
    const lat = parseFloat(form.centerLat);
    const lng = parseFloat(form.centerLng);
    const radius = parseFloat(form.radius);
    if (isNaN(lat) || lat < -90 || lat > 90) {
      Alert.alert('Latitude invalide', 'La latitude doit être entre -90 et 90.');
      return;
    }
    if (isNaN(lng) || lng < -180 || lng > 180) {
      Alert.alert('Longitude invalide', 'La longitude doit être entre -180 et 180.');
      return;
    }
    if (isNaN(radius) || radius <= 0) {
      Alert.alert('Rayon invalide', 'Le rayon doit être un nombre positif (en mètres).');
      return;
    }
    onSubmit({
      name: form.name.trim(),
      type: 'CIRCLE',
      coordinates: [{ lat, lng }],
      radius,
      color: form.color,
      isActive: form.isActive,
    });
  };

  const handleDelete = () => {
    Alert.alert('Supprimer la zone', `Supprimer définitivement « ${geofence?.name ?? 'cette zone'} » ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: onDelete },
    ]);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg.primary }} edges={['top']}>
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 16,
              paddingTop: 8,
              paddingBottom: 12,
              borderBottomWidth: 1,
              borderBottomColor: theme.border,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Circle size={18} color={form.color} />
              <Text style={{ fontSize: 17, fontWeight: '700', color: theme.text.primary }}>
                {isEdit ? 'Modifier la zone' : 'Nouvelle zone (cercle)'}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {isEdit ? (
                <TouchableOpacity onPress={handleDelete} style={{ padding: 4 }}>
                  <Trash2 size={20} color="#EF4444" />
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
                <X size={22} color={theme.text.primary} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
            <GeoField
              theme={theme}
              label="Nom de la zone *"
              value={form.name}
              onChangeText={(v) => update('name', v)}
              placeholder="ex: Zone Abidjan Centre"
            />

            <Text
              style={{
                fontSize: 11,
                fontWeight: '700',
                color: theme.text.muted,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                marginBottom: 10,
                marginTop: 4,
              }}
            >
              Centre du cercle
            </Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <GeoField
                  theme={theme}
                  label="Latitude"
                  value={form.centerLat}
                  onChangeText={(v) => update('centerLat', v)}
                  keyboardType="decimal-pad"
                  placeholder="ex: 5.34936"
                />
              </View>
              <View style={{ flex: 1 }}>
                <GeoField
                  theme={theme}
                  label="Longitude"
                  value={form.centerLng}
                  onChangeText={(v) => update('centerLng', v)}
                  keyboardType="decimal-pad"
                  placeholder="ex: -4.00833"
                />
              </View>
            </View>

            <GeoField
              theme={theme}
              label="Rayon (mètres)"
              value={form.radius}
              onChangeText={(v) => update('radius', v)}
              keyboardType="numeric"
              placeholder="ex: 500"
            />

            {/* Couleur */}
            <Text style={{ fontSize: 12, fontWeight: '600', color: theme.text.secondary, marginBottom: 8 }}>
              Couleur
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {COLOR_PALETTE.map((c) => (
                <TouchableOpacity
                  key={c.value}
                  onPress={() => update('color', c.value)}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 17,
                    backgroundColor: c.value,
                    borderWidth: form.color === c.value ? 3 : 1,
                    borderColor: form.color === c.value ? theme.text.primary : c.value + '80',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                  accessibilityLabel={c.label}
                />
              ))}
            </View>

            {/* Statut actif */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: theme.bg.surface,
                borderRadius: 12,
                padding: 14,
                borderWidth: 1,
                borderColor: theme.border,
              }}
            >
              <View>
                <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text.primary }}>Zone active</Text>
                <Text style={{ fontSize: 11, color: theme.text.muted, marginTop: 2 }}>
                  Active = utilisée pour les alertes
                </Text>
              </View>
              <Switch
                value={form.isActive}
                onValueChange={(v) => update('isActive', v)}
                trackColor={{ false: theme.bg.elevated, true: theme.primary + '88' }}
                thumbColor={form.isActive ? theme.primary : theme.text.muted}
              />
            </View>
          </ScrollView>

          {/* Footer */}
          <View
            style={{
              flexDirection: 'row',
              gap: 10,
              padding: 16,
              borderTopWidth: 1,
              borderTopColor: theme.border,
              backgroundColor: theme.bg.surface,
            }}
          >
            <TouchableOpacity
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 10,
                backgroundColor: theme.bg.elevated,
                alignItems: 'center',
              }}
              onPress={onClose}
              disabled={isPending}
            >
              <Text style={{ color: theme.text.secondary, fontSize: 14, fontWeight: '600' }}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                flex: 1,
                flexDirection: 'row',
                gap: 6,
                paddingVertical: 12,
                borderRadius: 10,
                backgroundColor: theme.primary,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: isPending ? 0.6 : 1,
              }}
              onPress={handleSubmit}
              disabled={isPending}
            >
              {isPending ? (
                <ActivityIndicator color={theme.text.onPrimary} />
              ) : (
                <>
                  <Save size={16} color={theme.text.onPrimary} />
                  <Text style={{ color: theme.text.onPrimary, fontSize: 14, fontWeight: '700' }}>
                    {isEdit ? 'Enregistrer' : 'Créer'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function GeofencesScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const qc = useQueryClient();
  const user = useAuthStore((st) => st.user);
  const canWrite = WRITE_ROLES.includes(normalizeRole(user?.role ?? '') as never);

  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Geofence | null>(null);

  const {
    data = [],
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useQuery<Geofence[]>({
    queryKey: ['geofences'],
    queryFn: geofencesApi.getAll,
    staleTime: 60_000,
  });

  const filterBlocks: FilterBlockDef[] = useMemo(
    () => [
      { key: 'type', label: 'Type', items: TYPE_FILTER_ITEMS, selected: typeFilter, onSelect: setTypeFilter },
      { key: 'status', label: 'Statut', items: STATUS_FILTER_ITEMS, selected: statusFilter, onSelect: setStatusFilter },
    ],
    [typeFilter, statusFilter]
  );

  const hasActiveFilters = !!(typeFilter || statusFilter);
  const resetFilters = () => {
    setTypeFilter(null);
    setStatusFilter(null);
  };

  const filtered = useMemo(() => {
    let list = data;
    if (typeFilter) list = list.filter((g) => g.type === (typeFilter as GeofenceType));
    if (statusFilter === 'active') list = list.filter((g) => g.is_active);
    else if (statusFilter === 'inactive') list = list.filter((g) => !g.is_active);
    return list;
  }, [data, typeFilter, statusFilter]);

  const createMutation = useMutation({
    mutationFn: (payload: CreateCircleRequest) => geofencesApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['geofences'] });
      setModalOpen(false);
      setEditing(null);
    },
    onError: (err: Error) => Alert.alert('Création impossible', err.message || 'Erreur inconnue.'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CreateCircleRequest }) => geofencesApi.update(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['geofences'] });
      setModalOpen(false);
      setEditing(null);
    },
    onError: (err: Error) => Alert.alert('Mise à jour impossible', err.message || 'Erreur inconnue.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => geofencesApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['geofences'] });
      setModalOpen(false);
      setEditing(null);
    },
    onError: (err: Error) => Alert.alert('Suppression impossible', err.message || 'Erreur inconnue.'),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => geofencesApi.toggleActive(id, isActive),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['geofences'] }),
    onError: (err: Error) => Alert.alert('Action impossible', err.message || 'Erreur inconnue.'),
  });

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (g: Geofence) => {
    setEditing(g);
    setModalOpen(true);
  };

  const handleSubmit = (payload: CreateCircleRequest) => {
    if (editing) {
      updateMutation.mutate({ id: editing.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleToggle = (g: Geofence) => {
    const verb = g.is_active ? 'désactiver' : 'activer';
    Alert.alert('Confirmer', `Voulez-vous ${verb} la zone « ${g.name} » ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Confirmer', onPress: () => toggleMutation.mutate({ id: g.id, isActive: !g.is_active }) },
    ]);
  };

  const isPending = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg.primary }} edges={['top']}>
      {/* Header */}
      <View style={[s.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[s.backBtn, { backgroundColor: theme.bg.surface, borderColor: theme.border }]}
          accessibilityLabel="Retour"
        >
          <ArrowLeft size={22} color={theme.text.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[s.title, { color: theme.text.primary }]}>Zones géographiques</Text>
          <Text style={[s.subtitle, { color: theme.text.muted }]}>
            {data.length} zone{data.length !== 1 ? 's' : ''} · {data.filter((g) => g.is_active).length} active
            {data.filter((g) => g.is_active).length !== 1 ? 's' : ''}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setShowFilters((p) => !p)}
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            backgroundColor: showFilters ? theme.primary : theme.bg.surface,
            borderWidth: 1,
            borderColor: theme.border,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <SlidersHorizontal size={18} color={showFilters ? theme.text.onPrimary : theme.text.primary} />
          {hasActiveFilters && !showFilters ? (
            <View
              style={{
                position: 'absolute',
                top: 6,
                right: 6,
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

      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : isError ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}>
          <MapPin size={40} color={theme.text.muted} />
          <Text style={{ fontSize: 14, color: theme.text.muted, marginTop: 12, textAlign: 'center' }}>
            Impossible de charger les zones.{'\n'}Vérifiez vos permissions (VIEW_TECH).
          </Text>
          <TouchableOpacity
            style={{
              marginTop: 16,
              paddingHorizontal: 20,
              paddingVertical: 10,
              backgroundColor: theme.primary,
              borderRadius: 10,
            }}
            onPress={() => refetch()}
          >
            <Text style={{ color: theme.text.onPrimary, fontWeight: '600' }}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 12, gap: 10, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme.primary} />}
          renderItem={({ item }) => (
            <GeofenceCard
              item={item}
              theme={theme}
              canWrite={canWrite}
              onPress={() => openEdit(item)}
              onToggle={() => handleToggle(item)}
            />
          )}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 60, gap: 12 }}>
              <Hexagon size={40} color={theme.text.muted} />
              <Text style={{ fontSize: 14, color: theme.text.muted, textAlign: 'center' }}>
                {hasActiveFilters ? 'Aucun résultat' : 'Aucune zone configurée'}
              </Text>
            </View>
          }
        />
      )}

      {/* FAB — uniquement si permission d'écriture */}
      {canWrite ? (
        <TouchableOpacity
          onPress={openCreate}
          style={[s.fab, { backgroundColor: theme.primary }]}
          activeOpacity={0.85}
          accessibilityLabel="Créer une zone cercle"
        >
          <Plus size={26} color={theme.text.onPrimary} />
        </TouchableOpacity>
      ) : null}

      <GeofenceFormModal
        visible={modalOpen}
        geofence={editing}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSubmit={handleSubmit}
        onDelete={() => editing && deleteMutation.mutate(editing.id)}
        isPending={isPending}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  title: { fontSize: 17, fontWeight: '700' },
  subtitle: { fontSize: 12, marginTop: 1 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
});
