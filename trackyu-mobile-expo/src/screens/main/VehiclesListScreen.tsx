/**
 * TrackYu Mobile — Liste des véhicules
 * Plaque · Branche · Date d'installation · Édition inline
 */
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Truck, Edit2, X, Check } from 'lucide-react-native';
import { SearchBar } from '../../components/SearchBar';
import { VEHICLE_STATUS_COLORS, VEHICLE_STATUS_LABELS } from '../../utils/vehicleStatus';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import vehiclesApi, { type Vehicle } from '../../api/vehicles';
import driversApi, { type Driver } from '../../api/driversApi';
import groupesApi, { type Groupe } from '../../api/groupesApi';
import { useTheme } from '../../theme';
import { EmptyState } from '../../components/EmptyState';

type ThemeType = ReturnType<typeof import('../../theme').useTheme>['theme'];

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Edit Modal ────────────────────────────────────────────────────────────────

interface EditForm {
  name: string;
  plate: string;
  driverId: string;
  groupId: string;
}

function EditVehicleModal({
  vehicle,
  drivers,
  groupes,
  visible,
  onClose,
  onSave,
  saving,
  theme,
}: {
  vehicle: Vehicle | null;
  drivers: Driver[];
  groupes: Groupe[];
  visible: boolean;
  onClose: () => void;
  onSave: (form: EditForm) => void;
  saving: boolean;
  theme: ThemeType;
}) {
  const [form, setForm] = useState<EditForm>({ name: '', plate: '', driverId: '', groupId: '' });
  const [driverSearch, setDriverSearch] = useState('');
  const [groupSearch, setGroupSearch] = useState('');
  const [showDriverPicker, setShowDriverPicker] = useState(false);
  const [showGroupPicker, setShowGroupPicker] = useState(false);

  React.useEffect(() => {
    if (vehicle) {
      setForm({
        name: vehicle.name ?? '',
        plate: vehicle.plate ?? '',
        driverId: vehicle.driver?.id ?? '',
        groupId: '',
      });
      setDriverSearch('');
      setGroupSearch('');
    }
  }, [vehicle]);

  const set = (k: keyof EditForm, v: string) => setForm((p) => ({ ...p, [k]: v }));
  const valid = form.name.trim().length > 0 && form.plate.trim().length > 0;

  const selectedDriver = drivers.find((d) => d.id === form.driverId);
  const selectedGroup = groupes.find((g) => g.id === form.groupId);

  const filteredDrivers = useMemo(() => {
    const q = driverSearch.toLowerCase();
    if (!q) return drivers;
    return drivers.filter((d) => d.nom.toLowerCase().includes(q));
  }, [drivers, driverSearch]);

  const filteredGroupes = useMemo(() => {
    const q = groupSearch.toLowerCase();
    if (!q) return groupes;
    return groupes.filter((g) => g.nom.toLowerCase().includes(q));
  }, [groupes, groupSearch]);

  if (!vehicle) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg.primary }} edges={['top', 'bottom']}>
          {/* Header */}
          <View style={em(theme).header}>
            <TouchableOpacity onPress={onClose} hitSlop={8} accessibilityRole="button" accessibilityLabel="Annuler">
              <X size={22} color={theme.text.primary} />
            </TouchableOpacity>
            <Text style={em(theme).title}>Modifier le véhicule</Text>
            <TouchableOpacity
              onPress={() => valid && onSave(form)}
              disabled={!valid || saving}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Enregistrer"
            >
              {saving ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : (
                <Check size={22} color={valid ? theme.primary : theme.text.muted} />
              )}
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={em(theme).body} keyboardShouldPersistTaps="handled">
            <Text style={em(theme).label}>Nom du véhicule *</Text>
            <TextInput
              style={em(theme).input}
              value={form.name}
              onChangeText={(v) => set('name', v)}
              placeholder="Nom du véhicule"
              placeholderTextColor={theme.text.muted}
            />

            <Text style={em(theme).label}>Plaque d'immatriculation *</Text>
            <TextInput
              style={em(theme).input}
              value={form.plate}
              onChangeText={(v) => set('plate', v)}
              placeholder="00-A-0000"
              placeholderTextColor={theme.text.muted}
              autoCapitalize="characters"
            />

            {/* Conducteur */}
            <Text style={em(theme).label}>Conducteur assigné</Text>
            {showDriverPicker ? (
              <View style={em(theme).picker}>
                <TextInput
                  style={[em(theme).input, { marginBottom: 8 }]}
                  value={driverSearch}
                  onChangeText={setDriverSearch}
                  placeholder="Rechercher…"
                  placeholderTextColor={theme.text.muted}
                  autoFocus
                />
                <TouchableOpacity
                  onPress={() => {
                    set('driverId', '');
                    setShowDriverPicker(false);
                  }}
                  style={[em(theme).pickerRow, { borderBottomWidth: 1, borderBottomColor: theme.border }]}
                >
                  <Text style={{ color: theme.text.muted, fontSize: 14 }}>— Aucun conducteur —</Text>
                  {form.driverId === '' && <Check size={16} color={theme.primary} />}
                </TouchableOpacity>
                {filteredDrivers.slice(0, 20).map((d) => (
                  <TouchableOpacity
                    key={d.id}
                    onPress={() => {
                      set('driverId', d.id);
                      setShowDriverPicker(false);
                    }}
                    style={em(theme).pickerRow}
                  >
                    <Text style={{ fontSize: 14, color: theme.text.primary }}>{d.nom}</Text>
                    {form.driverId === d.id && <Check size={16} color={theme.primary} />}
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <TouchableOpacity style={em(theme).selector} onPress={() => setShowDriverPicker(true)}>
                <Text style={{ color: selectedDriver ? theme.text.primary : theme.text.muted, fontSize: 15 }}>
                  {selectedDriver ? selectedDriver.nom : 'Sélectionner un conducteur'}
                </Text>
              </TouchableOpacity>
            )}

            {/* Groupe */}
            <Text style={em(theme).label}>Groupe de véhicules</Text>
            {showGroupPicker ? (
              <View style={em(theme).picker}>
                <TextInput
                  style={[em(theme).input, { marginBottom: 8 }]}
                  value={groupSearch}
                  onChangeText={setGroupSearch}
                  placeholder="Rechercher…"
                  placeholderTextColor={theme.text.muted}
                  autoFocus
                />
                <TouchableOpacity
                  onPress={() => {
                    set('groupId', '');
                    setShowGroupPicker(false);
                  }}
                  style={[em(theme).pickerRow, { borderBottomWidth: 1, borderBottomColor: theme.border }]}
                >
                  <Text style={{ color: theme.text.muted, fontSize: 14 }}>— Aucun groupe —</Text>
                  {form.groupId === '' && <Check size={16} color={theme.primary} />}
                </TouchableOpacity>
                {filteredGroupes.slice(0, 20).map((g) => (
                  <TouchableOpacity
                    key={g.id}
                    onPress={() => {
                      set('groupId', g.id);
                      setShowGroupPicker(false);
                    }}
                    style={em(theme).pickerRow}
                  >
                    <Text style={{ fontSize: 14, color: theme.text.primary }}>{g.nom}</Text>
                    {form.groupId === g.id && <Check size={16} color={theme.primary} />}
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <TouchableOpacity style={em(theme).selector} onPress={() => setShowGroupPicker(true)}>
                <Text style={{ color: selectedGroup ? theme.text.primary : theme.text.muted, fontSize: 15 }}>
                  {selectedGroup ? selectedGroup.nom : (vehicle.groupName ?? 'Sélectionner un groupe')}
                </Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const em = (t: ThemeType) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: t.border,
    },
    title: { fontSize: 17, fontWeight: '600', color: t.text.primary },
    body: { padding: 16, paddingBottom: 40 },
    label: { fontSize: 13, fontWeight: '600', color: t.text.secondary, marginTop: 14, marginBottom: 4 },
    input: {
      backgroundColor: t.bg.surface,
      borderWidth: 1,
      borderColor: t.border,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 11,
      fontSize: 15,
      color: t.text.primary,
    },
    selector: {
      backgroundColor: t.bg.surface,
      borderWidth: 1,
      borderColor: t.border,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 13,
    },
    picker: {
      backgroundColor: t.bg.surface,
      borderWidth: 1,
      borderColor: t.border,
      borderRadius: 10,
      overflow: 'hidden',
    },
    pickerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
  });

// ── Main Screen ────────────────────────────────────────────────────────────────

export default function VehiclesListScreen() {
  const { theme } = useTheme();
  const nav = useNavigation();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

  const { data: vehicles = [], isLoading } = useQuery({
    queryKey: ['vehicles-all'],
    queryFn: () => vehiclesApi.getAll(),
    staleTime: 60_000,
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers'],
    queryFn: driversApi.getAll,
    staleTime: 120_000,
  });

  const { data: groupes = [] } = useQuery({
    queryKey: ['groupes'],
    queryFn: groupesApi.getAll,
    staleTime: 120_000,
  });

  const filtered = useMemo(() => {
    if (!search) return vehicles;
    const q = search.toLowerCase();
    return vehicles.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        v.plate.toLowerCase().includes(q) ||
        (v.clientName ?? v.groupName ?? '').toLowerCase().includes(q)
    );
  }, [vehicles, search]);

  const updateMutation = useMutation({
    mutationFn: ({ id, form }: { id: string; form: EditForm }) =>
      vehiclesApi.update(id, {
        name: form.name.trim(),
        plate: form.plate.trim(),
        driverId: form.driverId || undefined,
        groupId: form.groupId || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vehicles-all'] });
      setEditingVehicle(null);
    },
    onError: (e: Error) => Alert.alert('Erreur', e?.message ?? 'Impossible de modifier le véhicule'),
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg.primary }} edges={['top', 'bottom']}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingHorizontal: 16,
          paddingVertical: 14,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
          backgroundColor: theme.bg.surface,
        }}
      >
        <TouchableOpacity
          onPress={() => nav.goBack()}
          style={{ padding: 4 }}
          accessibilityRole="button"
          accessibilityLabel="Retour"
        >
          <ArrowLeft size={22} color={theme.text.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: theme.text.primary }}>Liste des véhicules</Text>
          <Text style={{ fontSize: 12, color: theme.text.muted }}>
            {filtered.length} engin{filtered.length !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      {/* Recherche */}
      <SearchBar value={search} onChangeText={setSearch} placeholder="Plaque, nom, branche..." style={{ margin: 12 }} />

      {/* Table header */}
      <View
        style={{
          flexDirection: 'row',
          paddingHorizontal: 16,
          paddingVertical: 8,
          backgroundColor: theme.bg.elevated,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
        }}
      >
        <Text style={[col(theme), { flex: 1.2 }]}>ENGIN / PLAQUE</Text>
        <Text style={[col(theme), { flex: 1 }]}>BRANCHE</Text>
        <Text style={[col(theme), { flex: 1 }]}>INSTALLATION</Text>
        <Text style={[col(theme), { width: 50 }]}>STATUT</Text>
        <Text style={[col(theme), { width: 32 }]}> </Text>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={theme.primary} />
        </View>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Truck size={48} color={theme.text.muted} strokeWidth={1} />}
          title={search ? 'Aucun résultat' : 'Aucun véhicule'}
          subtitle={search ? 'Essayez un autre terme de recherche.' : undefined}
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(v) => v.id}
          initialNumToRender={15}
          maxToRenderPerBatch={10}
          windowSize={10}
          renderItem={({ item: v, index }) => {
            const statusColor = VEHICLE_STATUS_COLORS[v.status] ?? '#6B7280';
            const branch = v.clientName ?? v.groupName ?? '—';
            const installDate = fmtDate((v as any).installDate ?? (v as any).install_date);
            return (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: theme.border,
                  backgroundColor: index % 2 === 0 ? theme.bg.surface : theme.bg.primary,
                }}
              >
                <View style={{ flex: 1.2 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: theme.text.primary }} numberOfLines={1}>
                    {v.name}
                  </Text>
                  <Text style={{ fontSize: 11, color: theme.text.muted }}>{v.plate}</Text>
                </View>
                <Text style={{ flex: 1, fontSize: 12, color: theme.text.secondary }} numberOfLines={1}>
                  {branch}
                </Text>
                <Text style={{ flex: 1, fontSize: 12, color: theme.text.secondary }}>{installDate}</Text>
                <View style={{ width: 50 }}>
                  <View
                    style={{
                      backgroundColor: statusColor + '26',
                      borderRadius: 6,
                      paddingHorizontal: 5,
                      paddingVertical: 3,
                      alignSelf: 'flex-start',
                    }}
                  >
                    <Text style={{ fontSize: 9, fontWeight: '700', color: statusColor }} numberOfLines={1}>
                      {VEHICLE_STATUS_LABELS[v.status] ?? v.status}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => setEditingVehicle(v)}
                  hitSlop={8}
                  style={{ width: 32, alignItems: 'center' }}
                  accessibilityRole="button"
                  accessibilityLabel={`Modifier ${v.name}`}
                >
                  <Edit2 size={15} color={theme.text.muted} />
                </TouchableOpacity>
              </View>
            );
          }}
        />
      )}

      <EditVehicleModal
        vehicle={editingVehicle}
        drivers={drivers}
        groupes={groupes}
        visible={!!editingVehicle}
        onClose={() => setEditingVehicle(null)}
        onSave={(form) => editingVehicle && updateMutation.mutate({ id: editingVehicle.id, form })}
        saving={updateMutation.isPending}
        theme={theme}
      />
    </SafeAreaView>
  );
}

const col = (theme: ThemeType) => ({
  fontSize: 10 as const,
  fontWeight: '700' as const,
  color: theme.text.muted,
  textTransform: 'uppercase' as const,
  letterSpacing: 0.6,
});
