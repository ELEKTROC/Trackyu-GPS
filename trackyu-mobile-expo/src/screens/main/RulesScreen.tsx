/**
 * TrackYu Mobile — Règles de planification
 * CRUD complet sur /schedule-rules
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
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Plus, List, Trash2, Edit2, X, Check, Clock, Gauge, Route, Timer } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import scheduleRulesApi, { type ScheduleRule, type TimeRange } from '../../api/scheduleRulesApi';
import vehiclesApi from '../../api/vehicles';
import { useTheme } from '../../theme';

type ThemeType = ReturnType<typeof import('../../theme').useTheme>['theme'];

const DAYS_FR = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const DAYS_SHORT = ['D', 'L', 'Ma', 'Me', 'J', 'V', 'S'];

interface FormState {
  name: string;
  enableTimeRestriction: boolean;
  timeRanges: TimeRange[];
  enableDistanceLimit: boolean;
  maxDistancePerDay: string;
  enableSpeedLimit: boolean;
  maxSpeed: string;
  enableEngineHoursLimit: boolean;
  maxEngineHoursPerDay: string;
  vehicleIds: string[];
  status: 'ACTIVE' | 'INACTIVE';
}

const DEFAULT_FORM: FormState = {
  name: '',
  enableTimeRestriction: false,
  timeRanges: [{ start: '08:00', end: '18:00', days: [1, 2, 3, 4, 5] }],
  enableDistanceLimit: false,
  maxDistancePerDay: '',
  enableSpeedLimit: false,
  maxSpeed: '',
  enableEngineHoursLimit: false,
  maxEngineHoursPerDay: '',
  vehicleIds: [],
  status: 'ACTIVE',
};

/* ── small inline picker ─────────────────────────────────────────── */
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
      <Text style={{ fontSize: 12, fontWeight: '600', color: theme.text.secondary, marginBottom: 6 }}>{label}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {options.map((o) => (
          <TouchableOpacity
            key={o.value}
            onPress={() => onChange(o.value)}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 7,
              borderRadius: 20,
              backgroundColor: value === o.value ? theme.primary : theme.bg.elevated,
              borderWidth: 1,
              borderColor: value === o.value ? theme.primary : theme.border,
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: '600', color: value === o.value ? '#fff' : theme.text.secondary }}>
              {o.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

/* ── day chip row ─────────────────────────────────────────────────── */
function DayChips({
  selected,
  onChange,
  theme,
}: {
  selected: number[];
  onChange: (d: number[]) => void;
  theme: ThemeType;
}) {
  const toggle = (d: number) => {
    if (selected.includes(d)) onChange(selected.filter((x) => x !== d));
    else onChange([...selected, d].sort());
  };
  return (
    <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10 }}>
      {DAYS_SHORT.map((label, idx) => {
        const on = selected.includes(idx);
        return (
          <TouchableOpacity
            key={idx}
            onPress={() => toggle(idx)}
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              backgroundColor: on ? theme.primary : theme.bg.elevated,
              borderWidth: 1,
              borderColor: on ? theme.primary : theme.border,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '700', color: on ? '#fff' : theme.text.muted }}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/* ── RuleCard ─────────────────────────────────────────────────────── */
function RuleCard({
  rule,
  onEdit,
  onDelete,
  theme,
}: {
  rule: ScheduleRule;
  onEdit: () => void;
  onDelete: () => void;
  theme: ThemeType;
}) {
  const active = rule.status === 'ACTIVE';
  const lines: string[] = [];
  if (rule.enableSpeedLimit && rule.maxSpeed) lines.push(`Vitesse max : ${rule.maxSpeed} km/h`);
  if (rule.enableDistanceLimit && rule.maxDistancePerDay) lines.push(`Distance/jour : ${rule.maxDistancePerDay} km`);
  if (rule.enableEngineHoursLimit && rule.maxEngineHoursPerDay)
    lines.push(`Heures moteur : ${rule.maxEngineHoursPerDay} h/j`);
  if (rule.enableTimeRestriction && rule.timeRanges?.length) {
    const tr = rule.timeRanges[0];
    const dayLabels = tr.days.map((d) => DAYS_FR[d]).join(', ');
    lines.push(`Horaires : ${tr.start}–${tr.end} (${dayLabels})`);
  }

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
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: theme.text.primary }}>{rule.name}</Text>
        </View>
        <View
          style={{
            backgroundColor: active ? '#22C55E18' : '#6B728018',
            borderRadius: 8,
            paddingHorizontal: 10,
            paddingVertical: 3,
            marginLeft: 8,
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: '700', color: active ? '#22C55E' : '#6B7280' }}>
            {active ? 'Actif' : 'Inactif'}
          </Text>
        </View>
      </View>
      {lines.map((l, i) => (
        <Text key={i} style={{ fontSize: 12, color: theme.text.secondary, marginBottom: 2 }}>
          {l}
        </Text>
      ))}
      {rule.vehicleIds?.length ? (
        <Text style={{ fontSize: 12, color: theme.text.muted, marginTop: 4 }}>
          {rule.vehicleIds.length} véhicule{rule.vehicleIds.length > 1 ? 's' : ''}
        </Text>
      ) : null}
      <View
        style={{
          flexDirection: 'row',
          gap: 10,
          marginTop: 12,
          paddingTop: 10,
          borderTopWidth: 1,
          borderTopColor: theme.border,
        }}
      >
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

/* ── Form Modal ────────────────────────────────────────────────────── */
function RuleFormModal({
  visible,
  initial,
  onClose,
  onSave,
  theme,
}: {
  visible: boolean;
  initial: ScheduleRule | null;
  onClose: () => void;
  onSave: (data: Omit<ScheduleRule, 'id'>) => void;
  theme: ThemeType;
}) {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);

  React.useEffect(() => {
    if (visible) {
      if (initial) {
        setForm({
          name: initial.name,
          enableTimeRestriction: initial.enableTimeRestriction,
          timeRanges: initial.timeRanges?.length
            ? initial.timeRanges
            : [{ start: '08:00', end: '18:00', days: [1, 2, 3, 4, 5] }],
          enableDistanceLimit: initial.enableDistanceLimit,
          maxDistancePerDay: initial.maxDistancePerDay?.toString() ?? '',
          enableSpeedLimit: initial.enableSpeedLimit,
          maxSpeed: initial.maxSpeed?.toString() ?? '',
          enableEngineHoursLimit: initial.enableEngineHoursLimit,
          maxEngineHoursPerDay: initial.maxEngineHoursPerDay?.toString() ?? '',
          vehicleIds: initial.vehicleIds ?? [],
          status: initial.status,
        });
      } else {
        setForm(DEFAULT_FORM);
      }
    }
  }, [visible, initial]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  const submit = () => {
    if (!form.name.trim()) {
      Alert.alert('Champ requis', 'Le nom est obligatoire.');
      return;
    }
    const payload: Omit<ScheduleRule, 'id'> = {
      name: form.name.trim(),
      enableTimeRestriction: form.enableTimeRestriction,
      timeRanges: form.enableTimeRestriction ? form.timeRanges : undefined,
      enableDistanceLimit: form.enableDistanceLimit,
      maxDistancePerDay:
        form.enableDistanceLimit && form.maxDistancePerDay ? Number(form.maxDistancePerDay) : undefined,
      enableSpeedLimit: form.enableSpeedLimit,
      maxSpeed: form.enableSpeedLimit && form.maxSpeed ? Number(form.maxSpeed) : undefined,
      enableEngineHoursLimit: form.enableEngineHoursLimit,
      maxEngineHoursPerDay:
        form.enableEngineHoursLimit && form.maxEngineHoursPerDay ? Number(form.maxEngineHoursPerDay) : undefined,
      vehicleIds: form.vehicleIds.length ? form.vehicleIds : undefined,
      status: form.status,
    };
    onSave(payload);
  };

  const timeRange = form.timeRanges[0] ?? { start: '08:00', end: '18:00', days: [1, 2, 3, 4, 5] };
  const setTimeRange = (tr: Partial<TimeRange>) => set('timeRanges', [{ ...timeRange, ...tr }]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg.primary }} edges={['top']}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {/* header */}
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
              {initial ? 'Modifier la règle' : 'Nouvelle règle'}
            </Text>
            <TouchableOpacity
              onPress={submit}
              style={{ backgroundColor: theme.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 }}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Enregistrer</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 16, gap: 4 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Nom */}
            <Text style={styles.label(theme)}>Nom *</Text>
            <TextInput
              style={styles.input(theme)}
              value={form.name}
              onChangeText={(v) => set('name', v)}
              placeholder="Ex : Règle journée standard"
              placeholderTextColor={theme.text.muted}
            />

            {/* Restriction horaire */}
            <View style={styles.switchRow(theme)}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text.primary }}>Restriction horaire</Text>
                <Text style={{ fontSize: 12, color: theme.text.muted }}>Limite les plages d'utilisation</Text>
              </View>
              <Switch
                value={form.enableTimeRestriction}
                onValueChange={(v) => set('enableTimeRestriction', v)}
                trackColor={{ true: theme.primary }}
              />
            </View>
            {form.enableTimeRestriction && (
              <View
                style={{
                  backgroundColor: theme.bg.surface,
                  borderRadius: 12,
                  padding: 12,
                  borderWidth: 1,
                  borderColor: theme.border,
                  marginBottom: 14,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', color: theme.text.secondary, marginBottom: 8 }}>
                  Jours autorisés
                </Text>
                <DayChips selected={timeRange.days} onChange={(d) => setTimeRange({ days: d })} theme={theme} />
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11, color: theme.text.muted, marginBottom: 4 }}>Début</Text>
                    <TextInput
                      style={[styles.input(theme), { textAlign: 'center' }]}
                      value={timeRange.start}
                      onChangeText={(v) => setTimeRange({ start: v })}
                      placeholder="08:00"
                      placeholderTextColor={theme.text.muted}
                      keyboardType="numbers-and-punctuation"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11, color: theme.text.muted, marginBottom: 4 }}>Fin</Text>
                    <TextInput
                      style={[styles.input(theme), { textAlign: 'center' }]}
                      value={timeRange.end}
                      onChangeText={(v) => setTimeRange({ end: v })}
                      placeholder="18:00"
                      placeholderTextColor={theme.text.muted}
                      keyboardType="numbers-and-punctuation"
                    />
                  </View>
                </View>
              </View>
            )}

            {/* Limite distance */}
            <View style={styles.switchRow(theme)}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text.primary }}>Limite de distance</Text>
                <Text style={{ fontSize: 12, color: theme.text.muted }}>Distance maximale par jour</Text>
              </View>
              <Switch
                value={form.enableDistanceLimit}
                onValueChange={(v) => set('enableDistanceLimit', v)}
                trackColor={{ true: theme.primary }}
              />
            </View>
            {form.enableDistanceLimit && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <TextInput
                  style={[styles.input(theme), { flex: 1 }]}
                  value={form.maxDistancePerDay}
                  onChangeText={(v) => set('maxDistancePerDay', v)}
                  placeholder="Ex : 200"
                  placeholderTextColor={theme.text.muted}
                  keyboardType="numeric"
                />
                <Text style={{ fontSize: 14, color: theme.text.secondary, fontWeight: '600' }}>km/jour</Text>
              </View>
            )}

            {/* Limite vitesse */}
            <View style={styles.switchRow(theme)}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text.primary }}>Limite de vitesse</Text>
                <Text style={{ fontSize: 12, color: theme.text.muted }}>Vitesse maximale autorisée</Text>
              </View>
              <Switch
                value={form.enableSpeedLimit}
                onValueChange={(v) => set('enableSpeedLimit', v)}
                trackColor={{ true: theme.primary }}
              />
            </View>
            {form.enableSpeedLimit && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <TextInput
                  style={[styles.input(theme), { flex: 1 }]}
                  value={form.maxSpeed}
                  onChangeText={(v) => set('maxSpeed', v)}
                  placeholder="Ex : 120"
                  placeholderTextColor={theme.text.muted}
                  keyboardType="numeric"
                />
                <Text style={{ fontSize: 14, color: theme.text.secondary, fontWeight: '600' }}>km/h</Text>
              </View>
            )}

            {/* Limite heures moteur */}
            <View style={styles.switchRow(theme)}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text.primary }}>Heures moteur</Text>
                <Text style={{ fontSize: 12, color: theme.text.muted }}>Limite d'heures moteur par jour</Text>
              </View>
              <Switch
                value={form.enableEngineHoursLimit}
                onValueChange={(v) => set('enableEngineHoursLimit', v)}
                trackColor={{ true: theme.primary }}
              />
            </View>
            {form.enableEngineHoursLimit && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <TextInput
                  style={[styles.input(theme), { flex: 1 }]}
                  value={form.maxEngineHoursPerDay}
                  onChangeText={(v) => set('maxEngineHoursPerDay', v)}
                  placeholder="Ex : 8"
                  placeholderTextColor={theme.text.muted}
                  keyboardType="numeric"
                />
                <Text style={{ fontSize: 14, color: theme.text.secondary, fontWeight: '600' }}>h/jour</Text>
              </View>
            )}

            {/* Statut */}
            <InlinePicker
              label="Statut"
              value={form.status}
              options={[
                { value: 'ACTIVE', label: 'Actif' },
                { value: 'INACTIVE', label: 'Inactif' },
              ]}
              onChange={(v) => set('status', v)}
              theme={theme}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

/* ── Main Screen ──────────────────────────────────────────────────── */
export default function RulesScreen() {
  const { theme } = useTheme();
  const nav = useNavigation();
  const qc = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<ScheduleRule | null>(null);

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['schedule-rules'],
    queryFn: () => scheduleRulesApi.getAll(),
    staleTime: 30_000,
  });

  const createMut = useMutation({
    mutationFn: (d: Omit<ScheduleRule, 'id'>) => scheduleRulesApi.create(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['schedule-rules'] });
      setModalVisible(false);
    },
    onError: (e: Error) => Alert.alert('Erreur', e?.message ?? 'Impossible de créer la règle.'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ScheduleRule> }) => scheduleRulesApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['schedule-rules'] });
      setModalVisible(false);
      setEditing(null);
    },
    onError: (e: Error) => Alert.alert('Erreur', e?.message ?? 'Impossible de modifier la règle.'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => scheduleRulesApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['schedule-rules'] }),
    onError: (e: Error) => Alert.alert('Erreur', e?.message ?? 'Impossible de supprimer la règle.'),
  });

  const handleSave = (data: Omit<ScheduleRule, 'id'>) => {
    if (editing) updateMut.mutate({ id: editing.id, data });
    else createMut.mutate(data);
  };

  const handleDelete = (rule: ScheduleRule) => {
    Alert.alert('Supprimer', `Supprimer "${rule.name}" ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => deleteMut.mutate(rule.id) },
    ]);
  };

  const openEdit = (rule: ScheduleRule) => {
    setEditing(rule);
    setModalVisible(true);
  };
  const openCreate = () => {
    setEditing(null);
    setModalVisible(true);
  };

  return (
    <SafeAreaView style={[StyleSheet.absoluteFill, { backgroundColor: theme.bg.primary }]} edges={['top']}>
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
          <Text style={{ fontSize: 18, fontWeight: '700', color: theme.text.primary }}>Règles</Text>
          <Text style={{ fontSize: 12, color: theme.text.muted }}>
            {rules.length} règle{rules.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <TouchableOpacity
          onPress={openCreate}
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

      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={theme.primary} />
        </View>
      ) : rules.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
          <List size={48} color={theme.text.muted} strokeWidth={1} />
          <Text style={{ fontSize: 15, color: theme.text.secondary, marginTop: 12, textAlign: 'center' }}>
            Aucune règle configurée
          </Text>
          <TouchableOpacity
            onPress={openCreate}
            style={{
              marginTop: 16,
              backgroundColor: theme.primary,
              borderRadius: 10,
              paddingHorizontal: 20,
              paddingVertical: 10,
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Créer une règle</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={rules}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <RuleCard rule={item} onEdit={() => openEdit(item)} onDelete={() => handleDelete(item)} theme={theme} />
          )}
        />
      )}

      <RuleFormModal
        visible={modalVisible}
        initial={editing}
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
    backgroundColor: theme.bg.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14 as const,
    color: theme.text.primary,
    marginBottom: 14,
  }),
  switchRow: (theme: ThemeType) => ({
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: theme.bg.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
  }),
};
