/**
 * TrackYu Mobile — Groupes de véhicules
 * Liste, création, modification et suppression des groupes
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
import { ArrowLeft, Plus, Edit2, Trash2, X, Check, Layers } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import groupesApi, { type Groupe, type CreateGroupeRequest } from '../../api/groupesApi';
import { useTheme } from '../../theme';
import { SearchBar } from '../../components/SearchBar';

type ThemeType = ReturnType<typeof import('../../theme').useTheme>['theme'];

interface FormState {
  nom: string;
  description: string;
  statut: 'Actif' | 'Inactif';
}

const EMPTY_FORM: FormState = { nom: '', description: '', statut: 'Actif' };

function groupeToForm(g: Groupe): FormState {
  return { nom: g.nom ?? '', description: g.description ?? '', statut: g.statut };
}

// ── Row ───────────────────────────────────────────────────────────────────────

function GroupeRow({
  groupe,
  theme,
  onEdit,
  onDelete,
}: {
  groupe: Groupe;
  theme: ThemeType;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const active = groupe.statut === 'Actif';
  return (
    <View style={row(theme).container}>
      <View style={row(theme).icon}>
        <Layers size={20} color={active ? theme.primary : theme.text.muted} strokeWidth={1.8} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={row(theme).name}>{groupe.nom}</Text>
          <View style={[row(theme).statusBadge, { backgroundColor: active ? '#22C55E20' : '#6B728020' }]}>
            <Text style={[row(theme).statusText, { color: active ? '#22C55E' : '#6B7280' }]}>
              {active ? 'Actif' : 'Inactif'}
            </Text>
          </View>
        </View>
        {groupe.description ? (
          <Text style={row(theme).sub} numberOfLines={1}>
            {groupe.description}
          </Text>
        ) : null}
        {groupe.vehicleCount != null && (
          <Text style={row(theme).sub}>
            {groupe.vehicleCount} engin{groupe.vehicleCount !== 1 ? 's' : ''}
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
    statusBadge: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
    statusText: { fontSize: 10, fontWeight: '600' },
  });

// ── Form Modal ─────────────────────────────────────────────────────────────────

function GroupeForm({
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

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg.primary }} edges={['top', 'bottom']}>
          <View style={fm(theme).header}>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <X size={22} color={theme.text.primary} />
            </TouchableOpacity>
            <Text style={fm(theme).title}>{initial.nom ? 'Modifier le groupe' : 'Nouveau groupe'}</Text>
            <TouchableOpacity onPress={() => valid && onSave(form)} disabled={!valid || saving} hitSlop={8}>
              {saving ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : (
                <Check size={22} color={valid ? theme.primary : theme.text.muted} />
              )}
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={fm(theme).body} keyboardShouldPersistTaps="handled">
            <Text style={fm(theme).label}>Nom *</Text>
            <TextInput
              editable={!saving}
              style={fm(theme).input}
              value={form.nom}
              onChangeText={(v) => set('nom', v)}
              placeholder="Nom du groupe"
              placeholderTextColor={theme.text.muted}
            />

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

            <View style={fm(theme).row}>
              <Text style={fm(theme).rowLabel}>Actif</Text>
              <Switch
                value={form.statut === 'Actif'}
                onValueChange={(v) => set('statut', v ? 'Actif' : 'Inactif')}
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

export default function GroupesScreen() {
  const { theme } = useTheme();
  const nav = useNavigation();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Groupe | null>(null);

  const { data: groupes = [], isLoading } = useQuery({
    queryKey: ['groupes'],
    queryFn: groupesApi.getAll,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return groupes;
    return groupes.filter((g) => g.nom.toLowerCase().includes(q) || (g.description ?? '').toLowerCase().includes(q));
  }, [groupes, search]);

  const saveMutation = useMutation({
    mutationFn: (form: FormState) => {
      const payload: CreateGroupeRequest = {
        nom: form.nom.trim(),
        description: form.description.trim() || undefined,
        statut: form.statut,
      };
      if (editing) return groupesApi.update(editing.id, payload);
      return groupesApi.create(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['groupes'] });
      setModalVisible(false);
      setEditing(null);
    },
    onError: (e: Error) => Alert.alert('Erreur', e?.message ?? 'Impossible de sauvegarder'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => groupesApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['groupes'] }),
    onError: (e: Error) => Alert.alert('Erreur', e?.message ?? 'Impossible de supprimer'),
  });

  const confirmDelete = (g: Groupe) =>
    Alert.alert('Supprimer', `Supprimer le groupe "${g.nom}" ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => deleteMutation.mutate(g.id) },
    ]);

  const formInitial: FormState = editing ? groupeToForm(editing) : EMPTY_FORM;

  return (
    <SafeAreaView style={s(theme).container} edges={['top']}>
      <View style={s(theme).header}>
        <TouchableOpacity
          onPress={() => nav.goBack()}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Retour"
        >
          <ArrowLeft size={22} color={theme.text.primary} />
        </TouchableOpacity>
        <Text style={s(theme).title}>Groupes</Text>
        <TouchableOpacity
          onPress={() => {
            setEditing(null);
            setModalVisible(true);
          }}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Ajouter un groupe"
        >
          <Plus size={22} color={theme.primary} />
        </TouchableOpacity>
      </View>

      <SearchBar value={search} onChangeText={setSearch} placeholder="Rechercher un groupe…" />

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={theme.primary} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(g) => g.id}
          ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: theme.border, marginLeft: 68 }} />}
          contentContainerStyle={{ paddingBottom: 80 }}
          renderItem={({ item }) => (
            <GroupeRow
              groupe={item}
              theme={theme}
              onEdit={() => {
                setEditing(item);
                setModalVisible(true);
              }}
              onDelete={() => confirmDelete(item)}
            />
          )}
          ListEmptyComponent={
            <Text style={s(theme).empty}>{search ? 'Aucun résultat' : 'Aucun groupe configuré'}</Text>
          }
        />
      )}

      <GroupeForm
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
