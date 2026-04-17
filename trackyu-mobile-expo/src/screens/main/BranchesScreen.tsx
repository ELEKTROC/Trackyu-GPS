/**
 * TrackYu Mobile — Branches
 * Liste, création, modification et suppression des branches
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
import { ArrowLeft, Plus, Edit2, Trash2, X, Check, GitBranch } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import branchesApi, { type Branch, type CreateBranchRequest } from '../../api/branchesApi';
import { useTheme } from '../../theme';
import { SearchBar } from '../../components/SearchBar';

type ThemeType = ReturnType<typeof import('../../theme').useTheme>['theme'];

interface FormState {
  name: string;
  ville: string;
  responsable: string;
  email: string;
  phone: string;
  description: string;
  isDefault: boolean;
  statut: 'ACTIVE' | 'INACTIVE';
}

const EMPTY_FORM: FormState = {
  name: '',
  ville: '',
  responsable: '',
  email: '',
  phone: '',
  description: '',
  isDefault: false,
  statut: 'ACTIVE',
};

function branchToForm(b: Branch): FormState {
  return {
    name: b.name ?? '',
    ville: b.ville ?? '',
    responsable: b.responsable ?? '',
    email: b.email ?? '',
    phone: b.phone ?? '',
    description: b.description ?? '',
    isDefault: b.isDefault ?? false,
    statut: b.statut ?? 'ACTIVE',
  };
}

// ── Row ───────────────────────────────────────────────────────────────────────

function BranchRow({
  branch,
  theme,
  onEdit,
  onDelete,
}: {
  branch: Branch;
  theme: ThemeType;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const active = branch.statut !== 'INACTIVE';
  return (
    <View style={row(theme).container}>
      <View style={row(theme).icon}>
        <GitBranch size={20} color={active ? theme.primary : theme.text.muted} strokeWidth={1.8} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={row(theme).name}>{branch.name}</Text>
          {branch.isDefault && (
            <View style={row(theme).defaultBadge}>
              <Text style={row(theme).defaultText}>défaut</Text>
            </View>
          )}
          <View style={[row(theme).statusBadge, { backgroundColor: active ? '#22C55E20' : '#6B728020' }]}>
            <Text style={[row(theme).statusText, { color: active ? '#22C55E' : '#6B7280' }]}>
              {active ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>
        {(branch.ville || branch.responsable) && (
          <Text style={row(theme).sub} numberOfLines={1}>
            {[branch.ville, branch.responsable].filter(Boolean).join(' · ')}
          </Text>
        )}
      </View>
      <TouchableOpacity onPress={onEdit} hitSlop={8} style={{ marginLeft: 8 }}>
        <Edit2 size={17} color={theme.text.muted} />
      </TouchableOpacity>
      <TouchableOpacity onPress={onDelete} hitSlop={8} style={{ marginLeft: 12 }}>
        <Trash2 size={17} color="#EF4444" />
      </TouchableOpacity>
    </View>
  );
}

const row = (t: ThemeType) =>
  StyleSheet.create({
    container: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, gap: 12 },
    icon: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: t.primary + '15',
      justifyContent: 'center',
      alignItems: 'center',
    },
    name: { fontSize: 15, fontWeight: '600', color: t.text.primary },
    sub: { fontSize: 12, color: t.text.muted, marginTop: 2 },
    defaultBadge: { backgroundColor: t.primary + '20', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
    defaultText: { fontSize: 10, fontWeight: '700', color: t.primary },
    statusBadge: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
    statusText: { fontSize: 10, fontWeight: '600' },
  });

// ── Form Modal ─────────────────────────────────────────────────────────────────

function BranchForm({
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
  const set = (k: keyof FormState, v: string | boolean) => setForm((p) => ({ ...p, [k]: v }));

  React.useEffect(() => {
    setForm(initial);
  }, [initial]);

  const valid = form.name.trim().length > 0;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg.primary }} edges={['top', 'bottom']}>
          {/* Header */}
          <View style={fm(theme).header}>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <X size={22} color={theme.text.primary} />
            </TouchableOpacity>
            <Text style={fm(theme).title}>{initial.name ? 'Modifier la branche' : 'Nouvelle branche'}</Text>
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
              editable={!saving}
              style={fm(theme).input}
              value={form.name}
              onChangeText={(v) => set('name', v)}
              placeholder="Nom de la branche"
              placeholderTextColor={theme.text.muted}
            />

            {/* Ville */}
            <Text style={fm(theme).label}>Ville</Text>
            <TextInput
              editable={!saving}
              style={fm(theme).input}
              value={form.ville}
              onChangeText={(v) => set('ville', v)}
              placeholder="Ville"
              placeholderTextColor={theme.text.muted}
            />

            {/* Responsable */}
            <Text style={fm(theme).label}>Responsable</Text>
            <TextInput
              editable={!saving}
              style={fm(theme).input}
              value={form.responsable}
              onChangeText={(v) => set('responsable', v)}
              placeholder="Nom du responsable"
              placeholderTextColor={theme.text.muted}
            />

            {/* Email */}
            <Text style={fm(theme).label}>Email</Text>
            <TextInput
              editable={!saving}
              style={fm(theme).input}
              value={form.email}
              onChangeText={(v) => set('email', v)}
              placeholder="email@example.com"
              placeholderTextColor={theme.text.muted}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            {/* Téléphone */}
            <Text style={fm(theme).label}>Téléphone</Text>
            <TextInput
              editable={!saving}
              style={fm(theme).input}
              value={form.phone}
              onChangeText={(v) => set('phone', v)}
              placeholder="+221 XX XXX XX XX"
              placeholderTextColor={theme.text.muted}
              keyboardType="phone-pad"
            />

            {/* Description */}
            <Text style={fm(theme).label}>Description</Text>
            <TextInput
              editable={!saving}
              style={[fm(theme).input, { height: 80, textAlignVertical: 'top' }]}
              value={form.description}
              onChangeText={(v) => set('description', v)}
              placeholder="Description optionnelle"
              placeholderTextColor={theme.text.muted}
              multiline
              numberOfLines={3}
            />

            {/* Toggles */}
            <View style={fm(theme).row}>
              <Text style={fm(theme).rowLabel}>Branche par défaut</Text>
              <Switch
                value={form.isDefault}
                onValueChange={(v) => set('isDefault', v)}
                trackColor={{ true: theme.primary }}
              />
            </View>
            <View style={fm(theme).row}>
              <Text style={fm(theme).rowLabel}>Active</Text>
              <Switch
                value={form.statut === 'ACTIVE'}
                onValueChange={(v) => set('statut', v ? 'ACTIVE' : 'INACTIVE')}
                trackColor={{ true: theme.primary }}
              />
            </View>
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
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: t.border,
      marginTop: 8,
    },
    rowLabel: { fontSize: 15, color: t.text.primary },
  });

// ── Main Screen ────────────────────────────────────────────────────────────────

export default function BranchesScreen() {
  const { theme } = useTheme();
  const nav = useNavigation();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);

  const { data: branches = [], isLoading } = useQuery({
    queryKey: ['branches'],
    queryFn: branchesApi.getAll,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return branches;
    return branches.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        (b.ville ?? '').toLowerCase().includes(q) ||
        (b.responsable ?? '').toLowerCase().includes(q)
    );
  }, [branches, search]);

  const saveMutation = useMutation({
    mutationFn: (form: FormState) => {
      const payload: CreateBranchRequest = {
        name: form.name.trim(),
        ville: form.ville.trim() || undefined,
        responsable: form.responsable.trim() || undefined,
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        description: form.description.trim() || undefined,
        isDefault: form.isDefault,
        statut: form.statut,
      };
      if (editing) return branchesApi.update(editing.id, payload);
      return branchesApi.create(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['branches'] });
      setModalVisible(false);
      setEditing(null);
    },
    onError: (e: Error) => Alert.alert('Erreur', e?.message ?? 'Impossible de sauvegarder'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => branchesApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['branches'] }),
    onError: (e: Error) => Alert.alert('Erreur', e?.message ?? 'Impossible de supprimer'),
  });

  const openNew = () => {
    setEditing(null);
    setModalVisible(true);
  };
  const openEdit = (b: Branch) => {
    setEditing(b);
    setModalVisible(true);
  };
  const confirmDelete = (b: Branch) =>
    Alert.alert('Supprimer', `Supprimer la branche "${b.name}" ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => deleteMutation.mutate(b.id) },
    ]);

  const formInitial: FormState = editing ? branchToForm(editing) : EMPTY_FORM;

  return (
    <SafeAreaView style={s(theme).container} edges={['top']}>
      {/* Header */}
      <View style={s(theme).header}>
        <TouchableOpacity
          onPress={() => nav.goBack()}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Retour"
        >
          <ArrowLeft size={22} color={theme.text.primary} />
        </TouchableOpacity>
        <Text style={s(theme).title}>Branches</Text>
        <TouchableOpacity
          onPress={openNew}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Ajouter une branche"
        >
          <Plus size={22} color={theme.primary} />
        </TouchableOpacity>
      </View>

      <SearchBar value={search} onChangeText={setSearch} placeholder="Rechercher une branche…" />

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={theme.primary} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(b) => b.id}
          ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: theme.border, marginLeft: 68 }} />}
          contentContainerStyle={{ paddingBottom: 80 }}
          renderItem={({ item }) => (
            <BranchRow branch={item} theme={theme} onEdit={() => openEdit(item)} onDelete={() => confirmDelete(item)} />
          )}
          ListEmptyComponent={
            <Text style={s(theme).empty}>{search ? 'Aucun résultat' : 'Aucune branche configurée'}</Text>
          }
        />
      )}

      <BranchForm
        visible={modalVisible}
        initial={formInitial}
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
    empty: { textAlign: 'center', marginTop: 60, color: t.text.muted, fontSize: 15 },
  });
