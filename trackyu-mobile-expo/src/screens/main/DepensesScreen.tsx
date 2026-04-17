/**
 * TrackYu Mobile — Dépenses véhicules
 * CRUD complet sur /vehicle-expenses
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
import { ArrowLeft, Plus, Trash2, Edit2, X, CreditCard, Search, TrendingUp } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import expensesApi, { type VehicleExpense, type ExpenseCategory } from '../../api/expensesApi';
import vehiclesApi from '../../api/vehicles';
import { useTheme } from '../../theme';

type ThemeType = ReturnType<typeof import('../../theme').useTheme>['theme'];

const CATEGORIES: ExpenseCategory[] = [
  'Carburant',
  'Péage',
  'Réparation',
  'Assurance',
  'Entretien',
  'Lavage',
  'Amende',
  'Autre',
];

const CAT_COLOR: Record<ExpenseCategory, string> = {
  Carburant: '#F59E0B',
  Péage: '#6B7280',
  Réparation: '#EF4444',
  Assurance: '#8B5CF6',
  Entretien: '#3B82F6',
  Lavage: '#06B6D4',
  Amende: '#F97316',
  Autre: '#6B7280',
};

function fmtDate(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtAmount(amount: number, currency = 'XOF'): string {
  return `${amount.toLocaleString('fr-FR')} ${currency}`;
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
          const color = (CAT_COLOR as any)[o.value] ?? theme.primary;
          return (
            <TouchableOpacity
              key={o.value}
              onPress={() => onChange(o.value)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 7,
                borderRadius: 20,
                backgroundColor: on ? color + '22' : theme.bg.elevated,
                borderWidth: 1,
                borderColor: on ? color : theme.border,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '600', color: on ? color : theme.text.secondary }}>
                {o.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

/* ── ExpenseCard ──────────────────────────────────────────────────── */
function ExpenseCard({
  expense,
  vehicleName,
  onEdit,
  onDelete,
  theme,
}: {
  expense: VehicleExpense;
  vehicleName: string;
  onEdit: () => void;
  onDelete: () => void;
  theme: ThemeType;
}) {
  const color = CAT_COLOR[expense.category] ?? '#6B7280';
  return (
    <View
      style={{
        backgroundColor: theme.bg.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: theme.border,
        marginBottom: 10,
        padding: 14,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            backgroundColor: color + '18',
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 12,
          }}
        >
          <Text style={{ fontSize: 18 }}>
            {expense.category === 'Carburant'
              ? '⛽'
              : expense.category === 'Réparation'
                ? '🔧'
                : expense.category === 'Assurance'
                  ? '🛡'
                  : expense.category === 'Péage'
                    ? '🛣'
                    : expense.category === 'Entretien'
                      ? '⚙️'
                      : expense.category === 'Lavage'
                        ? '🚿'
                        : expense.category === 'Amende'
                          ? '⚠️'
                          : '📋'}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View>
              <Text style={{ fontSize: 15, fontWeight: '700', color: theme.text.primary }}>
                {fmtAmount(expense.amount, expense.currency)}
              </Text>
              <Text style={{ fontSize: 12, color: theme.text.muted }}>
                {vehicleName} · {fmtDate(expense.date)}
              </Text>
            </View>
            <View
              style={{
                backgroundColor: color + '18',
                borderRadius: 8,
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderWidth: 1,
                borderColor: color + '55',
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: '700', color }}>{expense.category}</Text>
            </View>
          </View>
          {expense.description ? (
            <Text style={{ fontSize: 12, color: theme.text.secondary, marginTop: 6 }} numberOfLines={2}>
              {expense.description}
            </Text>
          ) : null}
        </View>
      </View>

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

/* ── Formulaire ───────────────────────────────────────────────────── */
interface FormState {
  vehicleId: string;
  category: ExpenseCategory;
  amount: string;
  currency: string;
  date: string;
  description: string;
}

const DEFAULT_FORM: FormState = {
  vehicleId: '',
  category: 'Carburant',
  amount: '',
  currency: 'XOF',
  date: new Date().toISOString().split('T')[0],
  description: '',
};

function ExpenseFormModal({
  visible,
  initial,
  vehicles,
  onClose,
  onSave,
  theme,
}: {
  visible: boolean;
  initial: VehicleExpense | null;
  vehicles: { id: string; name: string }[];
  onClose: () => void;
  onSave: (data: Omit<VehicleExpense, 'id'>) => void;
  theme: ThemeType;
}) {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  React.useEffect(() => {
    if (!visible) return;
    if (initial) {
      setForm({
        vehicleId: initial.vehicleId,
        category: initial.category,
        amount: initial.amount.toString(),
        currency: initial.currency ?? 'XOF',
        date: initial.date?.split('T')[0] ?? new Date().toISOString().split('T')[0],
        description: initial.description ?? '',
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
    if (!form.amount || isNaN(Number(form.amount))) {
      Alert.alert('Champ requis', 'Saisissez un montant valide.');
      return;
    }
    onSave({
      vehicleId: form.vehicleId,
      category: form.category,
      amount: Number(form.amount),
      currency: form.currency || 'XOF',
      date: form.date,
      description: form.description.trim() || undefined,
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
              {initial ? 'Modifier la dépense' : 'Nouvelle dépense'}
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

            {/* Catégorie */}
            <InlinePicker
              label="Catégorie *"
              value={form.category}
              options={CATEGORIES.map((c) => ({ value: c, label: c }))}
              onChange={(v) => set('category', v)}
              theme={theme}
            />

            {/* Montant + devise */}
            <Text style={styles.label(theme)}>Montant *</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
              <TextInput
                style={[styles.input(theme), { flex: 1, marginBottom: 0 }]}
                value={form.amount}
                onChangeText={(v) => set('amount', v)}
                placeholder="0"
                placeholderTextColor={theme.text.muted}
                keyboardType="numeric"
              />
              <TextInput
                style={[styles.input(theme), { width: 80, marginBottom: 0, textAlign: 'center' }]}
                value={form.currency}
                onChangeText={(v) => set('currency', v.toUpperCase())}
                placeholder="XOF"
                placeholderTextColor={theme.text.muted}
                autoCapitalize="characters"
                maxLength={4}
              />
            </View>

            {/* Date */}
            <Text style={styles.label(theme)}>Date</Text>
            <TextInput
              style={styles.input(theme)}
              value={form.date}
              onChangeText={(v) => set('date', v)}
              placeholder="AAAA-MM-JJ"
              placeholderTextColor={theme.text.muted}
              keyboardType="numbers-and-punctuation"
            />

            {/* Description */}
            <Text style={styles.label(theme)}>Description / Référence</Text>
            <TextInput
              style={[styles.input(theme), { height: 80, textAlignVertical: 'top', paddingTop: 10 }]}
              value={form.description}
              onChangeText={(v) => set('description', v)}
              placeholder="Bon de carburant, facture, notes..."
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
export default function DepensesScreen() {
  const { theme } = useTheme();
  const nav = useNavigation();
  const qc = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<VehicleExpense | null>(null);
  const [search, setSearch] = useState('');

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ['vehicle-expenses'],
    queryFn: () => expensesApi.getAll(),
    staleTime: 30_000,
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles-all'],
    queryFn: () => vehiclesApi.getAll(),
    staleTime: 60_000,
  });

  const vehicleMap = useMemo(() => new Map(vehicles.map((v) => [v.id, v])), [vehicles]);
  const vehicleOptions = useMemo(() => vehicles.map((v) => ({ id: v.id, name: v.name })), [vehicles]);

  const filtered = useMemo(() => {
    const sorted = [...expenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (!search) return sorted;
    const q = search.toLowerCase();
    return sorted.filter(
      (e) =>
        e.category.toLowerCase().includes(q) ||
        (vehicleMap.get(e.vehicleId)?.name ?? '').toLowerCase().includes(q) ||
        (e.description ?? '').toLowerCase().includes(q)
    );
  }, [expenses, search, vehicleMap]);

  // Total du mois en cours
  const now = new Date();
  const monthTotal = expenses
    .filter((e) => {
      const d = new Date(e.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((sum, e) => sum + e.amount, 0);

  const createMut = useMutation({
    mutationFn: (d: Omit<VehicleExpense, 'id'>) => expensesApi.create(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vehicle-expenses'] });
      setModalVisible(false);
    },
    onError: (e: Error) => Alert.alert('Erreur', e?.message ?? 'Impossible de créer la dépense.'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<VehicleExpense> }) => expensesApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vehicle-expenses'] });
      setModalVisible(false);
      setEditing(null);
    },
    onError: (e: Error) => Alert.alert('Erreur', e?.message ?? 'Impossible de modifier la dépense.'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => expensesApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vehicle-expenses'] }),
    onError: (e: Error) => Alert.alert('Erreur', e?.message ?? 'Impossible de supprimer la dépense.'),
  });

  const handleSave = (data: Omit<VehicleExpense, 'id'>) => {
    if (editing) updateMut.mutate({ id: editing.id, data });
    else createMut.mutate(data);
  };

  const handleDelete = (e: VehicleExpense) => {
    Alert.alert('Supprimer', `Supprimer cette dépense de ${e.amount.toLocaleString()} ${e.currency ?? 'XOF'} ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => deleteMut.mutate(e.id) },
    ]);
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
          <Text style={{ fontSize: 18, fontWeight: '700', color: theme.text.primary }}>Dépenses</Text>
          <Text style={{ fontSize: 12, color: theme.text.muted }}>
            {expenses.length} enregistrement{expenses.length !== 1 ? 's' : ''}
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

      {/* KPI mois */}
      {monthTotal > 0 && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            paddingHorizontal: 16,
            paddingVertical: 12,
            backgroundColor: theme.bg.elevated,
            borderBottomWidth: 1,
            borderBottomColor: theme.border,
          }}
        >
          <TrendingUp size={18} color={theme.primary} />
          <View>
            <Text style={{ fontSize: 12, color: theme.text.muted }}>Total ce mois</Text>
            <Text style={{ fontSize: 16, fontWeight: '800', color: theme.text.primary }}>
              {monthTotal.toLocaleString('fr-FR')} XOF
            </Text>
          </View>
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
          placeholder="Catégorie, véhicule, description..."
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
          <CreditCard size={48} color={theme.text.muted} strokeWidth={1} />
          <Text style={{ fontSize: 15, color: theme.text.secondary, marginTop: 12, textAlign: 'center' }}>
            {search ? 'Aucun résultat' : 'Aucune dépense enregistrée'}
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
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Ajouter une dépense</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(e) => e.id}
          contentContainerStyle={{ padding: 12 }}
          renderItem={({ item }) => (
            <ExpenseCard
              expense={item}
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

      <ExpenseFormModal
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
