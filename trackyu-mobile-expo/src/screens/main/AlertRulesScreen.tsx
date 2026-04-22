/**
 * TrackYu Mobile — Règles d'alertes
 * Liste, création, modification, suppression et activation/désactivation
 * des configurations d'alertes via /monitoring/alert-configs
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
  Switch,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Plus,
  Edit2,
  Trash2,
  X,
  Check,
  Zap,
  Gauge,
  MapPin,
  Fuel,
  Wrench,
  Wifi,
  Thermometer,
  ChevronDown,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import alertConfigsApi, { type AlertConfig, type AlertType, type AlertPriority } from '../../api/alertConfigsApi';
import { useAuthStore } from '../../store/authStore';
import { ROLE } from '../../constants/roles';
import { useTheme } from '../../theme';
import { SearchBar } from '../../components/SearchBar';

type ThemeType = ReturnType<typeof import('../../theme').useTheme>['theme'];

// ── Constantes ────────────────────────────────────────────────────────────────

const ALERT_TYPES: { value: AlertType | string; label: string }[] = [
  { value: 'speed', label: 'Excès de vitesse' },
  { value: 'geofence', label: 'Zone géographique' },
  { value: 'fuel', label: 'Niveau carburant' },
  { value: 'fuel_drop', label: 'Baisse carburant' },
  { value: 'fuel_refill', label: 'Recharge carburant' },
  { value: 'sos', label: 'SOS' },
  { value: 'battery', label: 'Batterie faible' },
  { value: 'offline', label: 'Hors ligne' },
  { value: 'harsh_driving', label: 'Conduite brusque' },
  { value: 'ignition', label: 'Allumage/Extinction' },
  { value: 'temperature', label: 'Température' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'idle', label: 'Ralenti prolongé' },
];

const PRIORITIES: AlertPriority[] = ['Faible', 'Moyenne', 'Haute', 'Critique'];

const PRIORITY_COLORS: Record<AlertPriority, string> = {
  Faible: '#22C55E',
  Moyenne: '#F59E0B',
  Haute: '#F97316',
  Critique: '#EF4444',
};

function typeLabel(t: string): string {
  return ALERT_TYPES.find((a) => a.value === t)?.label ?? t;
}

function typeIcon(t: string, color: string, size = 18) {
  const props = { size, color, strokeWidth: 1.8 };
  if (t === 'speed') return <Gauge {...props} />;
  if (t === 'geofence') return <MapPin {...props} />;
  if (t === 'fuel' || t === 'fuel_drop' || t === 'fuel_refill') return <Fuel {...props} />;
  if (t === 'battery') return <Wifi {...props} />;
  if (t === 'temperature') return <Thermometer {...props} />;
  if (t === 'maintenance') return <Wrench {...props} />;
  return <Zap {...props} />;
}

// ── Row ───────────────────────────────────────────────────────────────────────

function AlertRuleRow({
  config,
  theme,
  onEdit,
  onDelete,
  onToggle,
  toggling,
}: {
  config: AlertConfig;
  theme: ThemeType;
  onEdit: () => void;
  onDelete?: () => void;
  onToggle: (v: boolean) => void;
  toggling: boolean;
}) {
  const active = config.statut === 'Actif' || config.is_active === true;
  const pColor = PRIORITY_COLORS[config.priorite as AlertPriority] ?? '#6B7280';

  return (
    <View style={row(theme).container}>
      <View style={[row(theme).icon, { backgroundColor: (active ? pColor : '#6B7280') + '26' }]}>
        {typeIcon(config.type, active ? pColor : '#6B7280')}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={row(theme).name} numberOfLines={1}>
          {config.nom}
        </Text>
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 3 }}>
          <Text style={[row(theme).badge, { color: pColor, backgroundColor: pColor + '26' }]}>{config.priorite}</Text>
          <Text style={row(theme).type}>{typeLabel(config.type)}</Text>
        </View>
      </View>
      {toggling ? (
        <ActivityIndicator size="small" color={theme.primary} style={{ marginHorizontal: 4 }} />
      ) : (
        <Switch value={active} onValueChange={onToggle} trackColor={{ true: theme.primary }} />
      )}
      <TouchableOpacity onPress={onEdit} hitSlop={8} style={{ marginLeft: 8 }}>
        <Edit2 size={17} color={theme.text.muted} />
      </TouchableOpacity>
      {onDelete && (
        <TouchableOpacity onPress={onDelete} hitSlop={8} style={{ marginLeft: 10 }}>
          <Trash2 size={17} color="#EF4444" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const row = (t: ThemeType) =>
  StyleSheet.create({
    container: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, gap: 10 },
    icon: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    name: { fontSize: 15, fontWeight: '600', color: t.text.primary },
    badge: { fontSize: 10, fontWeight: '700', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
    type: { fontSize: 12, color: t.text.muted, alignSelf: 'center' },
  });

// ── Form Modal ─────────────────────────────────────────────────────────────────

interface FormState {
  nom: string;
  type: string;
  priorite: AlertPriority;
  conditionValue: string;
  description: string;
  allVehicles: boolean;
  notifyEmail: boolean;
  notifySms: boolean;
  notifyPush: boolean;
  statut: 'Actif' | 'Inactif';
}

const EMPTY_FORM: FormState = {
  nom: '',
  type: 'speed',
  priorite: 'Moyenne',
  conditionValue: '',
  description: '',
  allVehicles: true,
  notifyEmail: false,
  notifySms: false,
  notifyPush: true,
  statut: 'Actif',
};

function configToForm(c: AlertConfig): FormState {
  return {
    nom: c.nom ?? '',
    type: c.type ?? 'speed',
    priorite: (c.priorite as AlertPriority) ?? 'Moyenne',
    conditionValue: c.conditionValue != null ? String(c.conditionValue) : '',
    description: c.description ?? '',
    allVehicles: c.allVehicles ?? true,
    notifyEmail: c.notifyEmail ?? false,
    notifySms: c.notifySms ?? false,
    notifyPush: c.notifyPush ?? true,
    statut: c.statut ?? 'Actif',
  };
}

function TypePicker({ value, onChange, theme }: { value: string; onChange: (v: string) => void; theme: ThemeType }) {
  const [open, setOpen] = useState(false);
  const label = typeLabel(value);
  return (
    <>
      <TouchableOpacity style={fp(theme).trigger} onPress={() => setOpen(true)}>
        <Text style={fp(theme).triggerText}>{label}</Text>
        <ChevronDown size={16} color={theme.text.muted} />
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={fp(theme).overlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={fp(theme).picker}>
            <Text style={fp(theme).pickerTitle}>Type d'alerte</Text>
            {ALERT_TYPES.map((t) => (
              <TouchableOpacity
                key={t.value}
                style={fp(theme).option}
                onPress={() => {
                  onChange(t.value);
                  setOpen(false);
                }}
              >
                <Text style={[fp(theme).optionText, value === t.value && { color: theme.primary, fontWeight: '700' }]}>
                  {t.label}
                </Text>
                {value === t.value && <Check size={16} color={theme.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const fp = (t: ThemeType) =>
  StyleSheet.create({
    trigger: {
      backgroundColor: t.bg.surface,
      borderWidth: 1,
      borderColor: t.border,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 11,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    triggerText: { fontSize: 15, color: t.text.primary },
    overlay: { flex: 1, backgroundColor: '#00000060', justifyContent: 'center', alignItems: 'center', padding: 24 },
    picker: { backgroundColor: t.bg.surface, borderRadius: 16, paddingVertical: 8, width: '100%', maxHeight: 420 },
    pickerTitle: { fontSize: 13, fontWeight: '700', color: t.text.muted, paddingHorizontal: 16, paddingVertical: 10 },
    option: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 13,
      borderTopWidth: 1,
      borderTopColor: t.border,
    },
    optionText: { fontSize: 15, color: t.text.primary },
  });

function AlertRuleForm({
  visible,
  initial,
  onClose,
  onSave,
  saving,
  theme,
}: {
  visible: boolean;
  initial: FormState;
  onClose: () => void;
  onSave: (f: FormState) => void;
  saving: boolean;
  theme: ThemeType;
}) {
  const [form, setForm] = useState<FormState>(initial);
  React.useEffect(() => {
    setForm(initial);
  }, [initial]);
  const set = (k: keyof FormState, v: string | boolean) => setForm((p) => ({ ...p, [k]: v }));
  const valid = form.nom.trim().length > 0;

  const needsValue = ['speed', 'fuel', 'temperature', 'idle', 'fuel_drop'].includes(form.type);
  const valuePlaceholder: Record<string, string> = {
    speed: 'Limite km/h (ex: 100)',
    fuel: 'Seuil % (ex: 20)',
    temperature: 'Seuil °C (ex: 90)',
    idle: 'Durée minutes (ex: 15)',
    fuel_drop: 'Baisse % (ex: 10)',
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg.primary }} edges={['top', 'bottom']}>
          <View style={fm(theme).header}>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <X size={22} color={theme.text.primary} />
            </TouchableOpacity>
            <Text style={fm(theme).title}>{initial.nom ? "Modifier l'alerte" : 'Nouvelle alerte'}</Text>
            <TouchableOpacity onPress={() => valid && onSave(form)} disabled={!valid || saving} hitSlop={8}>
              {saving ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : (
                <Check size={22} color={valid ? theme.primary : theme.text.muted} />
              )}
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={fm(theme).body} keyboardShouldPersistTaps="handled">
            {/* Nom */}
            <Text style={fm(theme).label}>Nom *</Text>
            <TextInput
              style={fm(theme).input}
              value={form.nom}
              onChangeText={(v) => set('nom', v)}
              placeholder="Nom de la règle"
              placeholderTextColor={theme.text.muted}
            />

            {/* Type */}
            <Text style={fm(theme).label}>Type d'alerte</Text>
            <TypePicker value={form.type} onChange={(v) => set('type', v)} theme={theme} />

            {/* Valeur seuil (conditionnel) */}
            {needsValue && (
              <>
                <Text style={fm(theme).label}>Seuil / Valeur</Text>
                <TextInput
                  style={fm(theme).input}
                  value={form.conditionValue}
                  onChangeText={(v) => set('conditionValue', v)}
                  placeholder={valuePlaceholder[form.type] ?? 'Valeur'}
                  placeholderTextColor={theme.text.muted}
                  keyboardType="numeric"
                />
              </>
            )}

            {/* Priorité */}
            <Text style={fm(theme).label}>Priorité</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {PRIORITIES.map((p) => (
                <TouchableOpacity
                  key={p}
                  onPress={() => set('priorite', p)}
                  style={[
                    fm(theme).priorityBtn,
                    form.priorite === p && { backgroundColor: PRIORITY_COLORS[p], borderColor: PRIORITY_COLORS[p] },
                  ]}
                >
                  <Text
                    style={[
                      fm(theme).priorityText,
                      form.priorite === p ? { color: '#fff' } : { color: PRIORITY_COLORS[p] },
                    ]}
                  >
                    {p}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Description */}
            <Text style={fm(theme).label}>Description</Text>
            <TextInput
              style={[fm(theme).input, { height: 70, textAlignVertical: 'top' }]}
              value={form.description}
              onChangeText={(v) => set('description', v)}
              placeholder="Description optionnelle"
              placeholderTextColor={theme.text.muted}
              multiline
              numberOfLines={3}
            />

            {/* Toggles */}
            {[
              { key: 'notifyPush', label: 'Notification push' },
              { key: 'notifyEmail', label: 'Notification email' },
              { key: 'notifySms', label: 'Notification SMS' },
              { key: 'allVehicles', label: 'Tous les véhicules' },
              { key: 'statut', label: 'Active', isStatut: true },
            ].map(({ key, label, isStatut }) => (
              <View key={key} style={fm(theme).row}>
                <Text style={fm(theme).rowLabel}>{label}</Text>
                <Switch
                  value={isStatut ? form.statut === 'Actif' : !!(form as any)[key]}
                  onValueChange={(v) => set(key as keyof FormState, isStatut ? (v ? 'Actif' : 'Inactif') : v)}
                  trackColor={{ true: theme.primary }}
                />
              </View>
            ))}
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const fm = (t: ThemeType) =>
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
    body: { padding: 16, gap: 4 },
    label: { fontSize: 13, fontWeight: '600', color: t.text.secondary, marginTop: 12, marginBottom: 4 },
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
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 13,
      borderBottomWidth: 1,
      borderBottomColor: t.border,
      marginTop: 8,
    },
    rowLabel: { fontSize: 15, color: t.text.primary },
    priorityBtn: {
      flex: 1,
      borderRadius: 8,
      borderWidth: 1.5,
      borderColor: t.border,
      paddingVertical: 8,
      alignItems: 'center',
    },
    priorityText: { fontSize: 12, fontWeight: '600' },
  });

// ── Main Screen ────────────────────────────────────────────────────────────────

export default function AlertRulesScreen() {
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const isClient = (user?.role ?? '').toUpperCase() === ROLE.CLIENT;
  const nav = useNavigation();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<AlertConfig | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ['alert-configs'],
    queryFn: alertConfigsApi.getAll,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return configs;
    return configs.filter((c) => c.nom.toLowerCase().includes(q) || typeLabel(c.type).toLowerCase().includes(q));
  }, [configs, search]);

  const saveMutation = useMutation({
    mutationFn: (form: FormState) => {
      const payload = {
        nom: form.nom.trim(),
        type: form.type,
        priorite: form.priorite,
        conditionValue: form.conditionValue ? Number(form.conditionValue) || form.conditionValue : undefined,
        description: form.description.trim() || undefined,
        allVehicles: form.allVehicles,
        notifyEmail: form.notifyEmail,
        notifySms: form.notifySms,
        notifyPush: form.notifyPush,
        statut: form.statut,
        is_active: form.statut === 'Actif',
      };
      if (editing) return alertConfigsApi.update(editing.id, payload);
      return alertConfigsApi.create(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alert-configs'] });
      setModalVisible(false);
      setEditing(null);
    },
    onError: (e: Error) => Alert.alert('Erreur', e.message ?? 'Impossible de sauvegarder'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => alertConfigsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alert-configs'] }),
    onError: (e: Error) => Alert.alert('Erreur', e.message ?? 'Impossible de supprimer'),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => alertConfigsApi.toggle(id, active),
    onMutate: async ({ id, active }) => {
      // Optimistic update : on applique le changement côté cache immédiatement
      await qc.cancelQueries({ queryKey: ['alert-configs'] });
      const previous = qc.getQueryData<AlertConfig[]>(['alert-configs']);
      qc.setQueryData<AlertConfig[]>(['alert-configs'], (old = []) =>
        old.map((c) => (c.id === id ? { ...c, is_active: active, statut: active ? 'Actif' : 'Inactif' } : c))
      );
      return { previous };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alert-configs'] });
      setTogglingId(null);
    },
    onError: (e: Error, _vars, ctx) => {
      // Rollback en cas d'erreur
      if (ctx?.previous) qc.setQueryData(['alert-configs'], ctx.previous);
      setTogglingId(null);
      Alert.alert('Erreur', e?.message ?? 'Impossible de modifier');
    },
  });

  const confirmDelete = (c: AlertConfig) =>
    Alert.alert('Supprimer', `Supprimer l'alerte "${c.nom}" ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => deleteMutation.mutate(c.id) },
    ]);

  const handleToggle = (c: AlertConfig, active: boolean) => {
    setTogglingId(c.id);
    toggleMutation.mutate({ id: c.id, active });
  };

  // Résumé : actives / inactives
  const activeCount = configs.filter((c) => c.statut === 'Actif' || c.is_active).length;

  return (
    <SafeAreaView style={s(theme).container} edges={['top']}>
      <View style={s(theme).header}>
        <TouchableOpacity onPress={() => nav.goBack()} hitSlop={8}>
          <ArrowLeft size={22} color={theme.text.primary} />
        </TouchableOpacity>
        <View>
          <Text style={s(theme).title}>Alertes</Text>
          {configs.length > 0 && (
            <Text style={s(theme).count}>
              {activeCount} active{activeCount !== 1 ? 's' : ''} / {configs.length}
            </Text>
          )}
        </View>
        <TouchableOpacity
          onPress={() => {
            setEditing(null);
            setModalVisible(true);
          }}
          hitSlop={8}
        >
          <Plus size={22} color={theme.primary} />
        </TouchableOpacity>
      </View>

      <SearchBar value={search} onChangeText={setSearch} placeholder="Rechercher une alerte…" />

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={theme.primary} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(c) => c.id}
          ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: theme.border, marginLeft: 66 }} />}
          contentContainerStyle={{ paddingBottom: 80 }}
          renderItem={({ item }) => (
            <AlertRuleRow
              config={item}
              theme={theme}
              onEdit={() => {
                setEditing(item);
                setModalVisible(true);
              }}
              onDelete={isClient ? undefined : () => confirmDelete(item)}
              onToggle={(v) => handleToggle(item, v)}
              toggling={togglingId === item.id}
            />
          )}
          ListEmptyComponent={
            <Text style={s(theme).empty}>{search ? 'Aucun résultat' : "Aucune règle d'alerte configurée"}</Text>
          }
        />
      )}

      <AlertRuleForm
        visible={modalVisible}
        initial={editing ? configToForm(editing) : EMPTY_FORM}
        onClose={() => {
          setModalVisible(false);
          setEditing(null);
        }}
        onSave={(f) => saveMutation.mutate(f)}
        saving={saveMutation.isPending}
        theme={theme}
      />
    </SafeAreaView>
  );
}

const s = (t: ThemeType) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: t.bg.primary },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: t.border,
      backgroundColor: t.bg.surface,
    },
    title: { fontSize: 18, fontWeight: '700', color: t.text.primary },
    count: { fontSize: 11, color: t.text.muted, marginTop: 1 },
    empty: { textAlign: 'center', marginTop: 60, color: t.text.muted, fontSize: 15 },
  });
