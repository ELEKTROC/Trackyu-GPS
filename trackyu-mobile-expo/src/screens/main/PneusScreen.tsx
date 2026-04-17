/**
 * TrackYu Mobile — Gestion des pneus
 * CRUD complet sur /vehicle-tires
 * Supporte voitures (4 roues) et camions (multi-essieux avec doubles montages)
 */
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Plus, Trash2, Edit2, X, Circle, Search, AlertTriangle } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import tiresApi, { type Tire, type TirePosition } from '../../api/tiresApi';
import vehiclesApi from '../../api/vehicles';
import { useTheme } from '../../theme';

type ThemeType = ReturnType<typeof import('../../theme').useTheme>['theme'];

// Groupes de positions pour affichage structuré
const POSITION_GROUPS = [
  { label: 'Avant', positions: ['AV.G', 'AV.D'] as TirePosition[] },
  { label: 'Arrière (simple)', positions: ['AR.G', 'AR.D'] as TirePosition[] },
  { label: 'Essieu 1 (double)', positions: ['E1.GE', 'E1.GI', 'E1.DE', 'E1.DI'] as TirePosition[] },
  { label: 'Essieu 2', positions: ['E2.GE', 'E2.GI', 'E2.DE', 'E2.DI'] as TirePosition[] },
  { label: 'Essieu 3', positions: ['E3.GE', 'E3.GI', 'E3.DE', 'E3.DI'] as TirePosition[] },
  { label: 'Autre', positions: ['Secours'] as TirePosition[] },
];
const ALL_POSITIONS: TirePosition[] = POSITION_GROUPS.flatMap((g) => g.positions);
const STATUTS: Tire['status'][] = ['Actif', 'Remplacé', 'Hors service'];

function fmtDate(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function kmUsed(tire: Tire): number {
  if (!tire.currentMileage) return 0;
  return Math.max(0, tire.currentMileage - tire.mileageAtMount);
}

function lifePct(tire: Tire): number {
  const used = kmUsed(tire);
  if (!tire.targetMileage) return 0;
  return Math.min(100, Math.round((used / tire.targetMileage) * 100));
}

function lifeColor(pct: number): string {
  if (pct >= 90) return '#EF4444';
  if (pct >= 70) return '#F59E0B';
  return '#22C55E';
}

/* ── InlinePicker ─────────────────────────────────────────────────── */
function InlinePicker<T extends string>({
  label,
  value,
  options,
  onChange,
  theme,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  theme: ThemeType;
}) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.label(theme)}>{label}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {options.map((o) => {
          const on = value === o.value;
          return (
            <TouchableOpacity
              key={o.value}
              onPress={() => onChange(o.value)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 7,
                borderRadius: 20,
                backgroundColor: on ? theme.primary : theme.bg.elevated,
                borderWidth: 1,
                borderColor: on ? theme.primary : theme.border,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '600', color: on ? '#fff' : theme.text.secondary }}>
                {o.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

/* ── PositionPicker : par groupe ─────────────────────────────────── */
function PositionPicker({
  value,
  onChange,
  theme,
}: {
  value: TirePosition;
  onChange: (v: TirePosition) => void;
  theme: ThemeType;
}) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.label(theme)}>Position *</Text>
      {POSITION_GROUPS.map((g) => (
        <View key={g.label} style={{ marginBottom: 8 }}>
          <Text
            style={{
              fontSize: 10,
              color: theme.text.muted,
              fontWeight: '700',
              textTransform: 'uppercase',
              marginBottom: 4,
            }}
          >
            {g.label}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {g.positions.map((p) => {
              const on = value === p;
              return (
                <TouchableOpacity
                  key={p}
                  onPress={() => onChange(p)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 8,
                    backgroundColor: on ? theme.primary : theme.bg.elevated,
                    borderWidth: 1,
                    borderColor: on ? theme.primary : theme.border,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: on ? '#fff' : theme.text.secondary }}>
                    {p}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}

/* ── TireCard ─────────────────────────────────────────────────────── */
function TireCard({
  tire,
  vehicleName,
  onEdit,
  onDelete,
  theme,
}: {
  tire: Tire;
  vehicleName: string;
  onEdit: () => void;
  onDelete: () => void;
  theme: ThemeType;
}) {
  const pct = lifePct(tire);
  const color = lifeColor(pct);
  const used = kmUsed(tire);
  const isActive = tire.status === 'Actif';

  return (
    <View
      style={{
        backgroundColor: theme.bg.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: theme.border,
        marginBottom: 12,
        padding: 14,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 }}>
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            backgroundColor: color + '18',
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 12,
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: '800', color }}>{tire.position}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: theme.text.primary }}>
            {tire.brand ? `${tire.brand} ` : ''}
            <Text style={{ color: theme.text.muted, fontWeight: '400' }}>#{tire.serialNumber}</Text>
          </Text>
          <Text style={{ fontSize: 12, color: theme.text.muted }}>{vehicleName}</Text>
        </View>
        <View
          style={{
            backgroundColor: isActive ? '#22C55E18' : '#6B728018',
            borderRadius: 8,
            paddingHorizontal: 8,
            paddingVertical: 3,
          }}
        >
          <Text style={{ fontSize: 10, fontWeight: '700', color: isActive ? '#22C55E' : '#6B7280' }}>
            {tire.status}
          </Text>
        </View>
      </View>

      {/* Barre de vie */}
      {isActive && tire.targetMileage > 0 && (
        <View style={{ marginBottom: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={{ fontSize: 11, color: theme.text.muted }}>
              {used.toLocaleString()} / {tire.targetMileage.toLocaleString()} km
            </Text>
            <Text style={{ fontSize: 11, fontWeight: '700', color }}>{pct}%</Text>
          </View>
          <View style={{ height: 6, backgroundColor: theme.bg.elevated, borderRadius: 3, overflow: 'hidden' }}>
            <View style={{ height: 6, width: `${pct}%` as `${number}%`, backgroundColor: color, borderRadius: 3 }} />
          </View>
          <Text
            style={{
              fontSize: 10,
              marginTop: 3,
              color: pct >= 90 ? '#EF4444' : pct >= 70 ? '#F59E0B' : theme.text.muted,
            }}
          >
            {pct >= 90
              ? '⚠ Remplacement urgent'
              : pct >= 70
                ? '⚡ À surveiller'
                : `${(tire.targetMileage - used).toLocaleString()} km restants`}
          </Text>
        </View>
      )}

      <View style={{ flexDirection: 'row', gap: 16, marginBottom: 10 }}>
        <View>
          <Text style={{ fontSize: 10, color: theme.text.muted }}>POSE</Text>
          <Text style={{ fontSize: 12, color: theme.text.secondary }}>{fmtDate(tire.mountDate)}</Text>
        </View>
        <View>
          <Text style={{ fontSize: 10, color: theme.text.muted }}>KM POSE</Text>
          <Text style={{ fontSize: 12, color: theme.text.secondary }}>{tire.mileageAtMount.toLocaleString()} km</Text>
        </View>
        <View>
          <Text style={{ fontSize: 10, color: theme.text.muted }}>CIBLE</Text>
          <Text style={{ fontSize: 12, color: theme.text.secondary }}>{tire.targetMileage.toLocaleString()} km</Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: theme.border }}>
        <TouchableOpacity
          onPress={onEdit}
          style={{
            flex: 1,
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 6,
            backgroundColor: theme.bg.elevated,
            borderRadius: 8,
            paddingVertical: 8,
          }}
        >
          <Edit2 size={14} color={theme.primary} />
          <Text style={{ fontSize: 13, fontWeight: '600', color: theme.primary }}>Modifier</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onDelete}
          style={{
            flex: 1,
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 6,
            backgroundColor: '#EF444418',
            borderRadius: 8,
            paddingVertical: 8,
          }}
        >
          <Trash2 size={14} color="#EF4444" />
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#EF4444' }}>Supprimer</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* ── Formulaire ───────────────────────────────────────────────────── */
interface FormState {
  vehicleId: string;
  serialNumber: string;
  brand: string;
  position: TirePosition;
  mountDate: string;
  mileageAtMount: string;
  targetMileage: string;
  currentMileage: string;
  status: Tire['status'];
  notes: string;
}

const DEFAULT_FORM: FormState = {
  vehicleId: '',
  serialNumber: '',
  brand: '',
  position: 'AV.G',
  mountDate: new Date().toISOString().split('T')[0],
  mileageAtMount: '',
  targetMileage: '80000',
  currentMileage: '',
  status: 'Actif',
  notes: '',
};

function TireFormModal({
  visible,
  initial,
  vehicles,
  onClose,
  onSave,
  theme,
}: {
  visible: boolean;
  initial: Tire | null;
  vehicles: { id: string; name: string; odometer?: number }[];
  onClose: () => void;
  onSave: (data: Omit<Tire, 'id'>) => void;
  theme: ThemeType;
}) {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  React.useEffect(() => {
    if (!visible) return;
    if (initial) {
      setForm({
        vehicleId: initial.vehicleId,
        serialNumber: initial.serialNumber,
        brand: initial.brand ?? '',
        position: initial.position,
        mountDate: initial.mountDate?.split('T')[0] ?? new Date().toISOString().split('T')[0],
        mileageAtMount: initial.mileageAtMount.toString(),
        targetMileage: initial.targetMileage.toString(),
        currentMileage: initial.currentMileage?.toString() ?? '',
        status: initial.status,
        notes: initial.notes ?? '',
      });
    } else {
      setForm(DEFAULT_FORM);
    }
  }, [visible, initial]);

  const submit = () => {
    if (!form.vehicleId) {
      Alert.alert('Champ requis', 'Sélectionnez un véhicule.');
      return;
    }
    if (!form.serialNumber.trim()) {
      Alert.alert('Champ requis', 'Le numéro de série est obligatoire.');
      return;
    }
    onSave({
      vehicleId: form.vehicleId,
      serialNumber: form.serialNumber.trim(),
      brand: form.brand.trim() || undefined,
      position: form.position,
      mountDate: form.mountDate,
      mileageAtMount: Number(form.mileageAtMount) || 0,
      targetMileage: Number(form.targetMileage) || 80000,
      currentMileage: form.currentMileage ? Number(form.currentMileage) : undefined,
      status: form.status,
      notes: form.notes.trim() || undefined,
    });
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg.primary }} edges={['top']}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 16,
              paddingVertical: 14,
              borderBottomWidth: 1,
              borderBottomColor: theme.border,
              backgroundColor: theme.bg.surface,
            }}
          >
            <TouchableOpacity onPress={onClose}>
              <X size={22} color={theme.text.muted} />
            </TouchableOpacity>
            <Text style={{ fontSize: 16, fontWeight: '700', color: theme.text.primary }}>
              {initial ? 'Modifier le pneu' : 'Nouveau pneu'}
            </Text>
            <TouchableOpacity
              onPress={submit}
              style={{ backgroundColor: theme.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 }}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Enregistrer</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
            {/* Véhicule */}
            <Text style={styles.label(theme)}>Véhicule *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {vehicles.map((v) => {
                  const on = form.vehicleId === v.id;
                  return (
                    <TouchableOpacity
                      key={v.id}
                      onPress={() => set('vehicleId', v.id)}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 9,
                        borderRadius: 10,
                        backgroundColor: on ? theme.primary : theme.bg.elevated,
                        borderWidth: 1,
                        borderColor: on ? theme.primary : theme.border,
                      }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: '600', color: on ? '#fff' : theme.text.secondary }}>
                        {v.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            {/* Position par groupes */}
            <PositionPicker value={form.position} onChange={(v) => set('position', v)} theme={theme} />

            {/* N° série */}
            <Text style={styles.label(theme)}>Numéro de série *</Text>
            <TextInput
              style={styles.input(theme)}
              value={form.serialNumber}
              onChangeText={(v) => set('serialNumber', v)}
              placeholder="Ex : ABC123456"
              placeholderTextColor={theme.text.muted}
            />

            {/* Marque */}
            <Text style={styles.label(theme)}>Marque</Text>
            <TextInput
              style={styles.input(theme)}
              value={form.brand}
              onChangeText={(v) => set('brand', v)}
              placeholder="Michelin, Bridgestone, Goodyear..."
              placeholderTextColor={theme.text.muted}
            />

            {/* Date de pose */}
            <Text style={styles.label(theme)}>Date de pose</Text>
            <TextInput
              style={styles.input(theme)}
              value={form.mountDate}
              onChangeText={(v) => set('mountDate', v)}
              placeholder="AAAA-MM-JJ"
              placeholderTextColor={theme.text.muted}
              keyboardType="numbers-and-punctuation"
            />

            {/* Km à la pose + km actuel */}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label(theme)}>Km à la pose</Text>
                <TextInput
                  style={styles.input(theme)}
                  value={form.mileageAtMount}
                  onChangeText={(v) => set('mileageAtMount', v)}
                  placeholder="0"
                  placeholderTextColor={theme.text.muted}
                  keyboardType="numeric"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label(theme)}>Km actuel</Text>
                <TextInput
                  style={styles.input(theme)}
                  value={form.currentMileage}
                  onChangeText={(v) => set('currentMileage', v)}
                  placeholder="0"
                  placeholderTextColor={theme.text.muted}
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Km cible */}
            <Text style={styles.label(theme)}>Km cible de remplacement</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <TextInput
                style={[styles.input(theme), { flex: 1, marginBottom: 0 }]}
                value={form.targetMileage}
                onChangeText={(v) => set('targetMileage', v)}
                placeholder="80000"
                placeholderTextColor={theme.text.muted}
                keyboardType="numeric"
              />
              <Text style={{ fontSize: 13, color: theme.text.secondary, fontWeight: '600' }}>km</Text>
            </View>

            {/* Statut */}
            <InlinePicker
              label="Statut"
              value={form.status}
              options={STATUTS.map((s) => ({ value: s, label: s }))}
              onChange={(v) => set('status', v)}
              theme={theme}
            />

            {/* Notes */}
            <Text style={styles.label(theme)}>Notes</Text>
            <TextInput
              style={[styles.input(theme), { height: 72, textAlignVertical: 'top', paddingTop: 10 }]}
              value={form.notes}
              onChangeText={(v) => set('notes', v)}
              placeholder="Observations, références..."
              placeholderTextColor={theme.text.muted}
              multiline
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

/* ── Écran principal ──────────────────────────────────────────────── */
export default function PneusScreen() {
  const { theme } = useTheme();
  const nav = useNavigation();
  const qc = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Tire | null>(null);
  const [search, setSearch] = useState('');

  const { data: tires = [], isLoading } = useQuery({
    queryKey: ['vehicle-tires'],
    queryFn: () => tiresApi.getAll(),
    staleTime: 30_000,
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles-all'],
    queryFn: () => vehiclesApi.getAll(),
    staleTime: 60_000,
  });

  const vehicleMap = useMemo(() => new Map(vehicles.map((v) => [v.id, v])), [vehicles]);
  const vehicleOptions = useMemo(
    () => vehicles.map((v) => ({ id: v.id, name: v.name, odometer: v.odometer })),
    [vehicles]
  );

  const filtered = useMemo(() => {
    const activeTires = tires.filter((t) => t.status === 'Actif');
    const list = search
      ? activeTires.filter((t) => {
          const q = search.toLowerCase();
          return (
            t.serialNumber.toLowerCase().includes(q) ||
            (t.brand ?? '').toLowerCase().includes(q) ||
            t.position.toLowerCase().includes(q) ||
            (vehicleMap.get(t.vehicleId)?.name ?? '').toLowerCase().includes(q)
          );
        })
      : activeTires;
    // Tri : urgents en premier
    return list.sort((a, b) => lifePct(b) - lifePct(a));
  }, [tires, search, vehicleMap]);

  const allActive = tires.filter((t) => t.status === 'Actif');
  const needsReplacement = allActive.filter((t) => lifePct(t) >= 90).length;
  const toWatch = allActive.filter((t) => lifePct(t) >= 70 && lifePct(t) < 90).length;

  const createMut = useMutation({
    mutationFn: (d: Omit<Tire, 'id'>) => tiresApi.create(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vehicle-tires'] });
      setModalVisible(false);
    },
    onError: (e: Error) => Alert.alert('Erreur', e?.message ?? 'Impossible de créer le pneu.'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Tire> }) => tiresApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vehicle-tires'] });
      setModalVisible(false);
      setEditing(null);
    },
    onError: (e: Error) => Alert.alert('Erreur', e?.message ?? 'Impossible de modifier le pneu.'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => tiresApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vehicle-tires'] }),
    onError: (e: Error) => Alert.alert('Erreur', e?.message ?? 'Impossible de supprimer le pneu.'),
  });

  const handleSave = (data: Omit<Tire, 'id'>) => {
    if (editing) updateMut.mutate({ id: editing.id, data });
    else createMut.mutate(data);
  };

  const handleDelete = (t: Tire) => {
    Alert.alert('Supprimer', `Supprimer le pneu ${t.position} (${t.serialNumber}) ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => deleteMut.mutate(t.id) },
    ]);
  };

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
          accessibilityLabel="Retour"
          accessibilityRole="button"
        >
          <ArrowLeft size={22} color={theme.text.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: theme.text.primary }}>Gestion des pneus</Text>
          <Text style={{ fontSize: 12, color: theme.text.muted }}>
            {allActive.length} pneu{allActive.length !== 1 ? 's' : ''} actif{allActive.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => {
            setEditing(null);
            setModalVisible(true);
          }}
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            backgroundColor: theme.primary,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Plus size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Alertes */}
      {(needsReplacement > 0 || toWatch > 0) && (
        <View
          style={{
            flexDirection: 'row',
            gap: 10,
            paddingHorizontal: 12,
            paddingVertical: 8,
            backgroundColor: theme.bg.elevated,
          }}
        >
          {needsReplacement > 0 && (
            <View
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                backgroundColor: '#EF444418',
                borderRadius: 10,
                padding: 10,
              }}
            >
              <AlertTriangle size={15} color="#EF4444" />
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#EF4444' }}>{needsReplacement} à remplacer</Text>
            </View>
          )}
          {toWatch > 0 && (
            <View
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                backgroundColor: '#F59E0B18',
                borderRadius: 10,
                padding: 10,
              }}
            >
              <AlertTriangle size={15} color="#F59E0B" />
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#F59E0B' }}>{toWatch} à surveiller</Text>
            </View>
          )}
        </View>
      )}

      {/* Recherche */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          margin: 12,
          backgroundColor: theme.bg.surface,
          borderRadius: 10,
          paddingHorizontal: 12,
          borderWidth: 1,
          borderColor: theme.border,
          height: 44,
        }}
      >
        <Search size={16} color={theme.text.muted} />
        <TextInput
          style={{ flex: 1, marginLeft: 8, fontSize: 14, color: theme.text.primary }}
          value={search}
          onChangeText={setSearch}
          placeholder="N° série, marque, position, véhicule..."
          placeholderTextColor={theme.text.muted}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')}>
            <X size={16} color={theme.text.muted} />
          </TouchableOpacity>
        ) : null}
      </View>

      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={theme.primary} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
          <Circle size={48} color={theme.text.muted} strokeWidth={1} />
          <Text style={{ fontSize: 15, color: theme.text.secondary, marginTop: 12, textAlign: 'center' }}>
            {search ? 'Aucun résultat' : 'Aucun pneu enregistré'}
          </Text>
          {!search && (
            <TouchableOpacity
              onPress={() => {
                setEditing(null);
                setModalVisible(true);
              }}
              style={{
                marginTop: 16,
                backgroundColor: theme.primary,
                borderRadius: 10,
                paddingHorizontal: 20,
                paddingVertical: 10,
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Ajouter un pneu</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(t) => t.id}
          contentContainerStyle={{ padding: 12 }}
          renderItem={({ item }) => (
            <TireCard
              tire={item}
              vehicleName={vehicleMap.get(item.vehicleId)?.name ?? '—'}
              onEdit={() => {
                setEditing(item);
                setModalVisible(true);
              }}
              onDelete={() => handleDelete(item)}
              theme={theme}
            />
          )}
        />
      )}

      <TireFormModal
        visible={modalVisible}
        initial={editing}
        vehicles={vehicleOptions}
        onClose={() => {
          setModalVisible(false);
          setEditing(null);
        }}
        onSave={handleSave}
        theme={theme}
      />
    </SafeAreaView>
  );
}

const styles = {
  label: (theme: ThemeType) => ({
    fontSize: 12 as const,
    fontWeight: '600' as const,
    color: theme.text.secondary,
    marginBottom: 6,
  }),
  input: (theme: ThemeType) => ({
    backgroundColor: theme.bg.elevated,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14 as const,
    color: theme.text.primary,
    marginBottom: 14,
  }),
};
