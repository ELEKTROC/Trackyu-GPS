/**
 * TrackYu Mobile — Revendeurs Screen
 * CRUD revendeurs (tiers type=RESELLER). Version allégée : Société + Admin,
 * sans white-label / quotas / modules.
 * Réservé SUPERADMIN (staff TKY cross-tenant).
 *
 * Lazy-load : rien n'est chargé tant qu'aucune recherche ni "Tout afficher"
 * n'est déclenché (cohérent avec le pattern shouldLoadData).
 */
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  XCircle,
  PauseCircle,
  Plus,
  X,
  Save,
  Power,
  UserCog,
} from 'lucide-react-native';
import { useTheme } from '../../theme';
import { SearchBar } from '../../components/SearchBar';
import { ProtectedScreen } from '../../components/ProtectedScreen';
import { SUPERADMIN_ONLY_ROLES } from '../../constants/roles';
import tiersApi, {
  type Tier,
  type TierStatus,
  type CreateResellerRequest,
  type ResellerData,
} from '../../api/tiersApi';

type ThemeType = ReturnType<typeof import('../../theme').useTheme>['theme'];

// ── Constantes d'affichage ───────────────────────────────────────────────────

const STATUS_COLORS: Record<TierStatus, string> = {
  ACTIVE: '#22C55E',
  INACTIVE: '#6B7280',
  SUSPENDED: '#F59E0B',
  CHURNED: '#EF4444',
};
const STATUS_LABELS: Record<TierStatus, string> = {
  ACTIVE: 'Actif',
  INACTIVE: 'Inactif',
  SUSPENDED: 'Suspendu',
  CHURNED: 'Résilié',
};
const STATUS_ICONS: Record<TierStatus, React.ComponentType<{ size: number; color: string }>> = {
  ACTIVE: CheckCircle2,
  INACTIVE: XCircle,
  SUSPENDED: PauseCircle,
  CHURNED: XCircle,
};

// ── Card revendeur ───────────────────────────────────────────────────────────

function ResellerCard({
  item,
  theme,
  onPress,
  onToggleStatus,
}: {
  item: Tier;
  theme: ThemeType;
  onPress: () => void;
  onToggleStatus: () => void;
}) {
  const color = STATUS_COLORS[item.status] ?? '#6B7280';
  const label = STATUS_LABELS[item.status] ?? item.status;
  const Icon = STATUS_ICONS[item.status] ?? XCircle;
  const admin = item.resellerData?.adminName;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[card(theme).wrap, { borderLeftColor: color }]}
      accessibilityRole="button"
      accessibilityLabel={`Revendeur ${item.name} — ${label}. Toucher pour modifier.`}
    >
      <View style={card(theme).row}>
        <View style={[card(theme).avatar, { backgroundColor: color + '22' }]}>
          <Building2 size={20} color={color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={card(theme).name} numberOfLines={1}>
            {item.name}
          </Text>
          {item.email ? (
            <Text style={card(theme).email} numberOfLines={1}>
              {item.email}
            </Text>
          ) : null}
        </View>
        <View style={[card(theme).badge, { backgroundColor: color + '18', borderWidth: 1, borderColor: color + '55' }]}>
          <Icon size={11} color={color} />
          <Text style={[card(theme).badgeText, { color }]}>{label}</Text>
        </View>
      </View>
      {admin ? (
        <View style={card(theme).adminRow}>
          <UserCog size={12} color={theme.text.muted} />
          <Text style={card(theme).adminText} numberOfLines={1}>
            {admin}
            {item.resellerData?.adminEmail ? ` · ${item.resellerData.adminEmail}` : ''}
          </Text>
        </View>
      ) : null}
      <View style={card(theme).footer}>
        <Text style={card(theme).metaDate}>
          Créé le{' '}
          {new Date(item.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
        </Text>
        <TouchableOpacity
          onPress={onToggleStatus}
          style={card(theme).statusBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel={item.status === 'ACTIVE' ? 'Suspendre' : 'Activer'}
        >
          <Power size={14} color={item.status === 'ACTIVE' ? '#F59E0B' : '#22C55E'} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const card = (theme: ThemeType) =>
  StyleSheet.create({
    wrap: {
      backgroundColor: theme.bg.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      borderLeftWidth: 4,
      padding: 14,
      gap: 10,
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    avatar: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    name: { fontSize: 15, fontWeight: '700', color: theme.text.primary },
    email: { fontSize: 12, color: theme.text.muted, marginTop: 2 },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    badgeText: { fontSize: 11, fontWeight: '600' },
    adminRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    adminText: { fontSize: 11, color: theme.text.secondary, flex: 1 },
    footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    metaDate: { fontSize: 11, color: theme.text.muted },
    statusBtn: {
      width: 32,
      height: 32,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.bg.elevated,
    },
  });

// ── Form modal ───────────────────────────────────────────────────────────────

type FormState = {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  accountingCode: string;
  // admin
  adminName: string;
  adminEmail: string;
  adminPhone: string;
  // metadata
  managerName: string;
  activity: string;
  rccm: string;
};

const EMPTY_FORM: FormState = {
  name: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  country: "Côte d'Ivoire",
  accountingCode: '',
  adminName: '',
  adminEmail: '',
  adminPhone: '',
  managerName: '',
  activity: '',
  rccm: '',
};

function tierToForm(t: Tier): FormState {
  const rd: ResellerData = t.resellerData ?? {};
  return {
    name: t.name ?? '',
    email: t.email ?? '',
    phone: t.phone ?? '',
    address: t.address ?? '',
    city: t.city ?? '',
    country: t.country ?? "Côte d'Ivoire",
    accountingCode: t.accountingCode ?? '',
    adminName: rd.adminName ?? '',
    adminEmail: rd.adminEmail ?? '',
    adminPhone: rd.adminPhone ?? '',
    managerName: rd.managerName ?? '',
    activity: rd.activity ?? '',
    rccm: rd.rccm ?? '',
  };
}

function formToPayload(f: FormState): CreateResellerRequest {
  const resellerData: ResellerData = {};
  if (f.adminName.trim()) resellerData.adminName = f.adminName.trim();
  if (f.adminEmail.trim()) resellerData.adminEmail = f.adminEmail.trim();
  if (f.adminPhone.trim()) resellerData.adminPhone = f.adminPhone.trim();
  if (f.managerName.trim()) resellerData.managerName = f.managerName.trim();
  if (f.activity.trim()) resellerData.activity = f.activity.trim();
  if (f.rccm.trim()) resellerData.rccm = f.rccm.trim();

  return {
    name: f.name.trim(),
    email: f.email.trim() || undefined,
    phone: f.phone.trim() || undefined,
    address: f.address.trim() || undefined,
    city: f.city.trim() || undefined,
    country: f.country.trim() || undefined,
    accountingCode: f.accountingCode.trim() || undefined,
    resellerData: Object.keys(resellerData).length > 0 ? resellerData : undefined,
  };
}

// Extrait au top-level pour éviter le remount du TextInput à chaque keystroke
// (si défini dans le corps du parent, React voit un "nouveau composant" à chaque
// re-render et démonte le TextInput → perte de focus).
type FieldProps = {
  theme: ThemeType;
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words';
  required?: boolean;
};
function Field({ theme, label, value, onChangeText, placeholder, keyboardType, autoCapitalize, required }: FieldProps) {
  const s = fm(theme);
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={s.label}>
        {label}
        {required ? <Text style={{ color: '#EF4444' }}> *</Text> : null}
      </Text>
      <TextInput
        style={s.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.text.muted}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
      />
    </View>
  );
}

function ResellerFormModal({
  visible,
  reseller,
  onClose,
  onSubmit,
  isPending,
}: {
  visible: boolean;
  reseller: Tier | null;
  onClose: () => void;
  onSubmit: (payload: CreateResellerRequest) => void;
  isPending: boolean;
}) {
  const { theme } = useTheme();
  const s = fm(theme);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const isEdit = Boolean(reseller);

  useEffect(() => {
    if (visible) {
      setForm(reseller ? tierToForm(reseller) : EMPTY_FORM);
    }
  }, [visible, reseller]);

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = () => {
    if (form.name.trim().length < 2) {
      Alert.alert('Champ requis', 'Le nom de la société doit contenir au moins 2 caractères.');
      return;
    }
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      Alert.alert('Email invalide', "L'email de la société n'est pas au bon format.");
      return;
    }
    if (form.adminEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.adminEmail.trim())) {
      Alert.alert('Email admin invalide', "L'email de l'admin n'est pas au bon format.");
      return;
    }
    onSubmit(formToPayload(form));
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg.primary }} edges={['top']}>
          <View style={s.header}>
            <Text style={s.title}>{isEdit ? 'Modifier le revendeur' : 'Nouveau revendeur'}</Text>
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }} accessibilityLabel="Fermer">
              <X size={22} color={theme.text.primary} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
            <Text style={s.section}>Société</Text>
            <Field
              theme={theme}
              label="Nom"
              value={form.name}
              onChangeText={(v) => update('name', v)}
              required
              autoCapitalize="words"
            />
            <Field
              theme={theme}
              label="Email"
              value={form.email}
              onChangeText={(v) => update('email', v)}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="contact@societe.com"
            />
            <Field
              theme={theme}
              label="Téléphone"
              value={form.phone}
              onChangeText={(v) => update('phone', v)}
              keyboardType="phone-pad"
              placeholder="+225 ..."
            />
            <Field
              theme={theme}
              label="Adresse"
              value={form.address}
              onChangeText={(v) => update('address', v)}
              autoCapitalize="sentences"
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Field
                  theme={theme}
                  label="Ville"
                  value={form.city}
                  onChangeText={(v) => update('city', v)}
                  autoCapitalize="words"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Field
                  theme={theme}
                  label="Pays"
                  value={form.country}
                  onChangeText={(v) => update('country', v)}
                  autoCapitalize="words"
                />
              </View>
            </View>
            <Field
              theme={theme}
              label="Code comptable"
              value={form.accountingCode}
              onChangeText={(v) => update('accountingCode', v)}
              autoCapitalize="none"
              placeholder="411REV001"
            />

            <Text style={s.section}>Informations légales</Text>
            <Field
              theme={theme}
              label="Gérant"
              value={form.managerName}
              onChangeText={(v) => update('managerName', v)}
              autoCapitalize="words"
            />
            <Field
              theme={theme}
              label="Activité"
              value={form.activity}
              onChangeText={(v) => update('activity', v)}
              autoCapitalize="sentences"
              placeholder="Distribution GPS"
            />
            <Field
              theme={theme}
              label="RCCM"
              value={form.rccm}
              onChangeText={(v) => update('rccm', v)}
              autoCapitalize="none"
            />

            <Text style={s.section}>Admin revendeur</Text>
            <Text style={s.hint}>
              Identifiant du contact principal du revendeur. Note : ceci enregistre les infos de contact. La création
              effective du compte utilisateur se fait dans Utilisateurs.
            </Text>
            <Field
              theme={theme}
              label="Nom admin"
              value={form.adminName}
              onChangeText={(v) => update('adminName', v)}
              autoCapitalize="words"
            />
            <Field
              theme={theme}
              label="Email admin"
              value={form.adminEmail}
              onChangeText={(v) => update('adminEmail', v)}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="admin@societe.com"
            />
            <Field
              theme={theme}
              label="Téléphone admin"
              value={form.adminPhone}
              onChangeText={(v) => update('adminPhone', v)}
              keyboardType="phone-pad"
            />
          </ScrollView>

          <View style={s.footer}>
            <TouchableOpacity style={s.cancelBtn} onPress={onClose} disabled={isPending}>
              <Text style={s.cancelBtnText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.submitBtn, isPending && { opacity: 0.6 }]}
              onPress={handleSubmit}
              disabled={isPending}
            >
              {isPending ? (
                <ActivityIndicator color={theme.text.onPrimary} />
              ) : (
                <>
                  <Save size={16} color={theme.text.onPrimary} />
                  <Text style={s.submitBtnText}>{isEdit ? 'Enregistrer' : 'Créer'}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const fm = (theme: ThemeType) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    title: { fontSize: 17, fontWeight: '700', color: theme.text.primary },
    section: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.text.muted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginTop: 14,
      marginBottom: 10,
    },
    hint: { fontSize: 11, color: theme.text.muted, marginBottom: 10, lineHeight: 15 },
    label: { fontSize: 12, fontWeight: '600', color: theme.text.secondary, marginBottom: 6 },
    input: {
      backgroundColor: theme.bg.surface,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      color: theme.text.primary,
    },
    footer: {
      flexDirection: 'row',
      gap: 10,
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      backgroundColor: theme.bg.surface,
    },
    cancelBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 10,
      backgroundColor: theme.bg.elevated,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cancelBtnText: { color: theme.text.secondary, fontSize: 14, fontWeight: '600' },
    submitBtn: {
      flex: 1,
      flexDirection: 'row',
      gap: 6,
      paddingVertical: 12,
      borderRadius: 10,
      backgroundColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    submitBtnText: { color: theme.text.onPrimary, fontSize: 14, fontWeight: '700' },
  });

// ── Main screen ──────────────────────────────────────────────────────────────

export default function ResellersScreen() {
  const { theme } = useTheme();
  const nav = useNavigation();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Tier | null>(null);

  // Debounce recherche
  useEffect(() => {
    const h = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(h);
  }, [search]);

  const shouldLoadData = showAll || debouncedSearch.length >= 2;

  const {
    data = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['admin-resellers'],
    queryFn: tiersApi.getResellers,
    enabled: shouldLoadData,
    staleTime: 120_000,
  });

  const filtered = useMemo(() => {
    const q = debouncedSearch.toLowerCase();
    if (!q) return data;
    return data.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.email?.toLowerCase().includes(q) ||
        r.resellerData?.adminName?.toLowerCase().includes(q) ||
        r.resellerData?.adminEmail?.toLowerCase().includes(q)
    );
  }, [data, debouncedSearch]);

  const createMutation = useMutation({
    mutationFn: (payload: CreateResellerRequest) => tiersApi.createReseller(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-resellers'] });
      setModalOpen(false);
      setEditing(null);
    },
    onError: (err: Error) => Alert.alert('Création impossible', err.message || 'Erreur inconnue.'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CreateResellerRequest }) =>
      tiersApi.updateReseller(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-resellers'] });
      setModalOpen(false);
      setEditing(null);
    },
    onError: (err: Error) => Alert.alert('Mise à jour impossible', err.message || 'Erreur inconnue.'),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TierStatus }) => tiersApi.toggleStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-resellers'] }),
    onError: (err: Error) => Alert.alert('Action impossible', err.message || 'Erreur inconnue.'),
  });

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (t: Tier) => {
    setEditing(t);
    setModalOpen(true);
  };
  const handleSubmit = (payload: CreateResellerRequest) => {
    if (editing) {
      updateMutation.mutate({ id: editing.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };
  const handleToggleStatus = (t: Tier) => {
    const nextStatus: TierStatus = t.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    const verb = nextStatus === 'SUSPENDED' ? 'suspendre' : 'réactiver';
    Alert.alert(
      'Confirmer',
      `Voulez-vous ${verb} le revendeur « ${t.name} » ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Confirmer', onPress: () => toggleStatusMutation.mutate({ id: t.id, status: nextStatus }) },
      ],
      { cancelable: true }
    );
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <ProtectedScreen allowedRoles={SUPERADMIN_ONLY_ROLES}>
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg.primary }} edges={['top']}>
        <View style={s(theme).header}>
          <TouchableOpacity onPress={() => nav.goBack()} style={s(theme).back} accessibilityLabel="Retour">
            <ArrowLeft size={22} color={theme.text.primary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s(theme).title}>Revendeurs</Text>
            {shouldLoadData && !isLoading ? (
              <Text style={s(theme).subtitle}>
                {filtered.length} revendeur{filtered.length !== 1 ? 's' : ''}
              </Text>
            ) : null}
          </View>
        </View>

        <SearchBar value={search} onChangeText={setSearch} placeholder="Rechercher (nom, email, admin)…" />

        {!shouldLoadData ? (
          <View style={s(theme).center}>
            <Building2 size={48} color={theme.text.muted} />
            <Text style={s(theme).empty}>Recherchez un revendeur (≥ 2 caractères)</Text>
            <TouchableOpacity style={s(theme).loadAllBtn} onPress={() => setShowAll(true)} activeOpacity={0.8}>
              <Text style={s(theme).loadAllBtnText}>Tout afficher</Text>
            </TouchableOpacity>
          </View>
        ) : isLoading ? (
          <View style={s(theme).center}>
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
        ) : filtered.length === 0 ? (
          <View style={s(theme).center}>
            <Building2 size={48} color={theme.text.muted} />
            <Text style={s(theme).empty}>{debouncedSearch ? 'Aucun résultat' : 'Aucun revendeur'}</Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(i) => i.id}
            renderItem={({ item }) => (
              <ResellerCard
                item={item}
                theme={theme}
                onPress={() => openEdit(item)}
                onToggleStatus={() => handleToggleStatus(item)}
              />
            )}
            contentContainerStyle={{ padding: 16, paddingBottom: 100, gap: 10 }}
            refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme.primary} />}
          />
        )}

        {/* FAB créer */}
        <TouchableOpacity
          onPress={openCreate}
          style={[s(theme).fab, { backgroundColor: theme.primary }]}
          activeOpacity={0.85}
          accessibilityLabel="Créer un revendeur"
        >
          <Plus size={26} color={theme.text.onPrimary} />
        </TouchableOpacity>

        <ResellerFormModal
          visible={modalOpen}
          reseller={editing}
          onClose={() => {
            setModalOpen(false);
            setEditing(null);
          }}
          onSubmit={handleSubmit}
          isPending={isPending}
        />
      </SafeAreaView>
    </ProtectedScreen>
  );
}

const s = (theme: ThemeType) =>
  StyleSheet.create({
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
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 14, paddingHorizontal: 32 },
    empty: { fontSize: 14, color: theme.text.muted, textAlign: 'center' },
    loadAllBtn: {
      backgroundColor: theme.primary + '18',
      borderRadius: 10,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: theme.primary + '55',
    },
    loadAllBtnText: { color: theme.primary, fontSize: 13, fontWeight: '700' },
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
