/**
 * TrackYu Mobile — Conducteurs
 * Liste, création, modification et suppression des conducteurs
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
import { ArrowLeft, Plus, Edit2, Trash2, X, Check, UserCog, Phone, Mail, CreditCard, Truck } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import driversApi, { type Driver, type CreateDriverRequest, type DriverStatus } from '../../api/driversApi';
import { useTheme } from '../../theme';
import { SearchBar } from '../../components/SearchBar';

type ThemeType = ReturnType<typeof import('../../theme').useTheme>['theme'];

// ── Status helpers ──────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<DriverStatus, string> = {
  ACTIVE: 'Actif',
  INACTIVE: 'Inactif',
  ON_LEAVE: 'En congé',
};

const STATUS_COLORS: Record<DriverStatus, string> = {
  ACTIVE: '#22C55E',
  INACTIVE: '#EF4444',
  ON_LEAVE: '#F59E0B',
};

// ── Form state ─────────────────────────────────────────────────────────────────

interface FormState {
  nom: string;
  email: string;
  telephone: string;
  adresse: string;
  permis: string;
  permisCategories: string;
  permisExpiration: string;
  rfidTag: string;
  contactUrgence: string;
  statut: DriverStatus;
}

const EMPTY_FORM: FormState = {
  nom: '',
  email: '',
  telephone: '',
  adresse: '',
  permis: '',
  permisCategories: '',
  permisExpiration: '',
  rfidTag: '',
  contactUrgence: '',
  statut: 'ACTIVE',
};

function driverToForm(d: Driver): FormState {
  return {
    nom: d.nom ?? '',
    email: d.email ?? '',
    telephone: d.telephone ?? '',
    adresse: d.adresse ?? '',
    permis: d.permis ?? '',
    permisCategories: d.permisCategories ?? '',
    permisExpiration: d.permisExpiration ?? '',
    rfidTag: d.rfidTag ?? '',
    contactUrgence: d.contactUrgence ?? '',
    statut: d.statut ?? 'ACTIVE',
  };
}

// ── Row ────────────────────────────────────────────────────────────────────────

function DriverRow({
  driver,
  theme,
  onEdit,
  onDelete,
}: {
  driver: Driver;
  theme: ThemeType;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const initials = driver.nom
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  const statusColor = STATUS_COLORS[driver.statut] ?? '#6B7280';

  return (
    <View style={row(theme).container}>
      <View
        style={[
          row(theme).avatar,
          { backgroundColor: statusColor + '18', borderWidth: 1, borderColor: statusColor + '55' },
        ]}
      >
        <Text style={[row(theme).initials, { color: statusColor }]}>{initials}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Text style={row(theme).name}>{driver.nom}</Text>
          <View
            style={[
              row(theme).badge,
              { backgroundColor: statusColor + '18', borderWidth: 1, borderColor: statusColor + '55' },
            ]}
          >
            <Text style={[row(theme).badgeText, { color: statusColor }]}>
              {STATUS_LABELS[driver.statut] ?? driver.statut}
            </Text>
          </View>
        </View>
        {driver.telephone ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
            <Phone size={10} color={theme.text.muted} />
            <Text style={row(theme).sub}>{driver.telephone}</Text>
          </View>
        ) : null}
        {driver.vehicleName ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
            <Truck size={10} color={theme.text.muted} />
            <Text style={row(theme).sub}>{driver.vehicleName}</Text>
          </View>
        ) : null}
        {driver.permis ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
            <CreditCard size={10} color={theme.text.muted} />
            <Text style={row(theme).sub}>
              {driver.permis}
              {driver.permisCategories ? ` — ${driver.permisCategories}` : ''}
            </Text>
          </View>
        ) : null}
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
    container: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 16, gap: 12 },
    avatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
    initials: { fontSize: 16, fontWeight: '700' },
    name: { fontSize: 15, fontWeight: '600', color: t.text.primary },
    sub: { fontSize: 11, color: t.text.muted },
    badge: { borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2 },
    badgeText: { fontSize: 10, fontWeight: '700' },
  });

// ── Status Picker ──────────────────────────────────────────────────────────────

function StatusPicker({
  value,
  onChange,
  theme,
}: {
  value: DriverStatus;
  onChange: (v: DriverStatus) => void;
  theme: ThemeType;
}) {
  const options: DriverStatus[] = ['ACTIVE', 'INACTIVE', 'ON_LEAVE'];
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {options.map((opt) => {
        const selected = value === opt;
        const color = STATUS_COLORS[opt];
        return (
          <TouchableOpacity
            key={opt}
            onPress={() => onChange(opt)}
            style={{
              flex: 1,
              borderRadius: 8,
              paddingVertical: 9,
              alignItems: 'center',
              backgroundColor: selected ? color + '20' : fm(theme).input.backgroundColor,
              borderWidth: 1.5,
              borderColor: selected ? color : theme.border,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '700', color: selected ? color : theme.text.muted }}>
              {STATUS_LABELS[opt]}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ── Form Modal ─────────────────────────────────────────────────────────────────

function DriverForm({
  visible,
  initial,
  isEdit,
  onClose,
  onSave,
  saving,
  theme,
}: {
  visible: boolean;
  initial: FormState;
  isEdit: boolean;
  onClose: () => void;
  onSave: (f: FormState) => void;
  saving: boolean;
  theme: ThemeType;
}) {
  const [form, setForm] = useState<FormState>(initial);
  React.useEffect(() => {
    setForm(initial);
  }, [initial]);
  const set = (k: keyof FormState, v: string) => setForm((p) => ({ ...p, [k]: v }));
  const valid = form.nom.trim().length > 0;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg.primary }} edges={['top', 'bottom']}>
          {/* Header */}
          <View style={fm(theme).header}>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <X size={22} color={theme.text.primary} />
            </TouchableOpacity>
            <Text style={fm(theme).title}>{isEdit ? 'Modifier le conducteur' : 'Nouveau conducteur'}</Text>
            <TouchableOpacity onPress={() => valid && onSave(form)} disabled={!valid || saving} hitSlop={8}>
              {saving ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : (
                <Check size={22} color={valid ? theme.primary : theme.text.muted} />
              )}
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={fm(theme).body} keyboardShouldPersistTaps="handled">
            {/* Statut */}
            <Text style={fm(theme).label}>Statut</Text>
            <StatusPicker value={form.statut} onChange={(v) => setForm((p) => ({ ...p, statut: v }))} theme={theme} />

            {/* Identité */}
            <Text style={fm(theme).label}>Nom complet *</Text>
            <TextInput
              editable={!saving}
              style={fm(theme).input}
              value={form.nom}
              onChangeText={(v) => set('nom', v)}
              placeholder="Nom et prénom"
              placeholderTextColor={theme.text.muted}
            />

            <Text style={fm(theme).label}>Téléphone</Text>
            <TextInput
              editable={!saving}
              style={fm(theme).input}
              value={form.telephone}
              onChangeText={(v) => set('telephone', v)}
              placeholder="+212 6 00 00 00 00"
              placeholderTextColor={theme.text.muted}
              keyboardType="phone-pad"
            />

            <Text style={fm(theme).label}>Email</Text>
            <TextInput
              editable={!saving}
              style={fm(theme).input}
              value={form.email}
              onChangeText={(v) => set('email', v)}
              placeholder="conducteur@exemple.com"
              placeholderTextColor={theme.text.muted}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={fm(theme).label}>Adresse</Text>
            <TextInput
              editable={!saving}
              style={[fm(theme).input, { height: 70, textAlignVertical: 'top' }]}
              value={form.adresse}
              onChangeText={(v) => set('adresse', v)}
              placeholder="Adresse"
              placeholderTextColor={theme.text.muted}
              multiline
              numberOfLines={2}
            />

            {/* Permis */}
            <Text style={[fm(theme).label, { marginTop: 20 }]}>Permis de conduire</Text>
            <TextInput
              editable={!saving}
              style={fm(theme).input}
              value={form.permis}
              onChangeText={(v) => set('permis', v)}
              placeholder="Numéro de permis"
              placeholderTextColor={theme.text.muted}
            />

            <Text style={fm(theme).label}>Catégories (ex: B, C, D)</Text>
            <TextInput
              editable={!saving}
              style={fm(theme).input}
              value={form.permisCategories}
              onChangeText={(v) => set('permisCategories', v)}
              placeholder="B, C"
              placeholderTextColor={theme.text.muted}
              autoCapitalize="characters"
            />

            <Text style={fm(theme).label}>Date d'expiration</Text>
            <TextInput
              editable={!saving}
              style={fm(theme).input}
              value={form.permisExpiration}
              onChangeText={(v) => set('permisExpiration', v)}
              placeholder="JJ/MM/AAAA"
              placeholderTextColor={theme.text.muted}
            />

            {/* Extra */}
            <Text style={[fm(theme).label, { marginTop: 20 }]}>Tag RFID</Text>
            <TextInput
              editable={!saving}
              style={fm(theme).input}
              value={form.rfidTag}
              onChangeText={(v) => set('rfidTag', v)}
              placeholder="Identifiant RFID"
              placeholderTextColor={theme.text.muted}
            />

            <Text style={fm(theme).label}>Contact d'urgence</Text>
            <TextInput
              editable={!saving}
              style={fm(theme).input}
              value={form.contactUrgence}
              onChangeText={(v) => set('contactUrgence', v)}
              placeholder="Nom et téléphone"
              placeholderTextColor={theme.text.muted}
            />
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
  });

// ── Main Screen ────────────────────────────────────────────────────────────────

export default function DriversScreen() {
  const { theme } = useTheme();
  const nav = useNavigation();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Driver | null>(null);

  const { data: drivers = [], isLoading } = useQuery({
    queryKey: ['drivers'],
    queryFn: driversApi.getAll,
    staleTime: 60_000,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return drivers;
    return drivers.filter(
      (d) =>
        d.nom.toLowerCase().includes(q) ||
        (d.telephone ?? '').includes(q) ||
        (d.vehicleName ?? '').toLowerCase().includes(q) ||
        (d.vehiclePlate ?? '').toLowerCase().includes(q)
    );
  }, [drivers, search]);

  const saveMutation = useMutation({
    mutationFn: (form: FormState) => {
      const payload: CreateDriverRequest = {
        nom: form.nom.trim(),
        email: form.email.trim() || undefined,
        telephone: form.telephone.trim() || undefined,
        adresse: form.adresse.trim() || undefined,
        permis: form.permis.trim() || undefined,
        permisCategories: form.permisCategories.trim() || undefined,
        permisExpiration: form.permisExpiration.trim() || undefined,
        rfidTag: form.rfidTag.trim() || undefined,
        contactUrgence: form.contactUrgence.trim() || undefined,
        statut: form.statut,
      };
      if (editing) return driversApi.update(editing.id, payload);
      return driversApi.create(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['drivers'] });
      setModalVisible(false);
      setEditing(null);
    },
    onError: (e: Error) => Alert.alert('Erreur', e?.message ?? 'Impossible de sauvegarder'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => driversApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['drivers'] }),
    onError: (e: Error) => Alert.alert('Erreur', e?.message ?? 'Impossible de supprimer'),
  });

  const confirmDelete = (d: Driver) =>
    Alert.alert('Supprimer', `Supprimer le conducteur "${d.nom}" ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => deleteMutation.mutate(d.id) },
    ]);

  const actives = drivers.filter((d) => d.statut === 'ACTIVE').length;

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
        <View style={{ flex: 1 }}>
          <Text style={s(theme).title}>Conducteurs</Text>
          <Text style={s(theme).subtitle}>
            {actives} actif{actives !== 1 ? 's' : ''} / {drivers.length} total
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => {
            setEditing(null);
            setModalVisible(true);
          }}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Ajouter un conducteur"
        >
          <Plus size={22} color={theme.primary} />
        </TouchableOpacity>
      </View>

      <SearchBar value={search} onChangeText={setSearch} placeholder="Nom, téléphone, véhicule…" />

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={theme.primary} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(d) => d.id}
          ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: theme.border, marginLeft: 72 }} />}
          contentContainerStyle={{ paddingBottom: 80 }}
          renderItem={({ item }) => (
            <DriverRow
              driver={item}
              theme={theme}
              onEdit={() => {
                setEditing(item);
                setModalVisible(true);
              }}
              onDelete={() => confirmDelete(item)}
            />
          )}
          ListEmptyComponent={
            <View style={{ paddingTop: 60, alignItems: 'center' }}>
              <UserCog size={48} color={theme.text.muted} strokeWidth={1} />
              <Text style={s(theme).empty}>{search ? 'Aucun résultat' : 'Aucun conducteur enregistré'}</Text>
            </View>
          }
        />
      )}

      <DriverForm
        visible={modalVisible}
        initial={editing ? driverToForm(editing) : EMPTY_FORM}
        isEdit={!!editing}
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
    subtitle: { fontSize: 12, color: t.text.muted, marginTop: 1 },
    empty: { textAlign: 'center', marginTop: 16, color: t.text.muted, fontSize: 15 },
  });
