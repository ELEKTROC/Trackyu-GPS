/**
 * TrackYu Mobile — Users Screen (Admin)
 * Liste + CRUD sous-utilisateurs du tenant (SUPERADMIN = cross-tenant).
 * Requiert VIEW_USERS (ADMIN, MANAGER, SUPERADMIN).
 * Backend : GET/POST/PUT /users
 */
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowLeft, User, Clock, SlidersHorizontal, Plus, X, UserCheck, UserX } from 'lucide-react-native';
import { useTheme } from '../../theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usersApi, type TenantUser, type CreateUserRequest, type UpdateUserRequest } from '../../api/users';
import type { RootStackParamList } from '../../navigation/types';
import { ROLE_LABELS, ROLE_COLORS, ADMIN_SCREEN_ROLES, ROLE } from '../../constants/roles';
import { ProtectedScreen } from '../../components/ProtectedScreen';
import { SearchBar } from '../../components/SearchBar';
import { Button } from '../../components/Button';
import { VehicleFilterPanel, type FilterBlockDef } from '../../components/VehicleFilterPanel';
import { useAuthStore } from '../../store/authStore';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type ThemeType = ReturnType<typeof import('../../theme').useTheme>['theme'];

const ROLE_FILTER_ITEMS = [
  { id: 'SUPERADMIN', label: 'Super Admin' },
  { id: 'ADMIN', label: 'Admin' },
  { id: 'MANAGER', label: 'Manager' },
  { id: 'COMPTABLE', label: 'Comptable' },
  { id: 'RESELLER', label: 'Revendeur' },
  { id: 'COMMERCIAL', label: 'Commercial' },
  { id: 'OPERATOR', label: 'Opérateur' },
  { id: 'TECH', label: 'Tech' },
  { id: 'SUPPORT', label: 'Support' },
  { id: 'SUPPORT_AGENT', label: 'Support Agent' },
  { id: 'CLIENT', label: 'Client' },
];

const STATUS_FILTER_ITEMS = [
  { id: 'Actif', label: 'Actif' },
  { id: 'Inactif', label: 'Inactif' },
];

/** Rôles assignables selon le rôle de l'utilisateur courant. */
function getAssignableRoles(currentRole: string | undefined): { value: string; label: string }[] {
  const upper = (currentRole ?? '').toUpperCase();
  if (upper === ROLE.SUPERADMIN) {
    return [
      { value: ROLE.ADMIN, label: 'Administrateur' },
      { value: ROLE.MANAGER, label: 'Gestionnaire' },
      { value: ROLE.COMMERCIAL, label: 'Commercial' },
      { value: ROLE.COMPTABLE, label: 'Comptable' },
      { value: ROLE.OPERATOR, label: 'Opérateur' },
      { value: ROLE.TECH, label: 'Technicien' },
      { value: ROLE.SUPPORT_AGENT, label: 'Support' },
      { value: ROLE.CLIENT, label: 'Client' },
    ];
  }
  // ADMIN / MANAGER tenant
  return [
    { value: ROLE.MANAGER, label: 'Gestionnaire' },
    { value: ROLE.COMMERCIAL, label: 'Commercial' },
    { value: ROLE.COMPTABLE, label: 'Comptable' },
    { value: ROLE.OPERATOR, label: 'Opérateur' },
    { value: ROLE.TECH, label: 'Technicien' },
    { value: ROLE.SUPPORT_AGENT, label: 'Support' },
    { value: ROLE.CLIENT, label: 'Client' },
  ];
}

// ── UserFormModal ─────────────────────────────────────────────────────────────

interface UserFormData {
  name: string;
  email: string;
  password: string;
  role: string;
  phone: string;
  departement: string;
  poste: string;
}

const EMPTY_FORM: UserFormData = {
  name: '',
  email: '',
  password: '',
  role: ROLE.OPERATOR,
  phone: '',
  departement: '',
  poste: '',
};

function UserFormModal({
  visible,
  user,
  theme,
  onClose,
  currentRole,
}: {
  visible: boolean;
  user: TenantUser | null;
  theme: ThemeType;
  onClose: () => void;
  currentRole: string | undefined;
}) {
  const qc = useQueryClient();
  const isEdit = !!user;
  const [form, setForm] = useState<UserFormData>(EMPTY_FORM);

  const assignableRoles = useMemo(() => getAssignableRoles(currentRole), [currentRole]);

  React.useEffect(() => {
    if (visible) {
      setForm(
        user
          ? {
              name: user.name,
              email: user.email,
              password: '',
              role: user.role?.toUpperCase() ?? ROLE.OPERATOR,
              phone: user.phone ?? '',
              departement: user.departement ?? '',
              poste: user.poste ?? '',
            }
          : { ...EMPTY_FORM, role: assignableRoles[0]?.value ?? ROLE.OPERATOR }
      );
    }
  }, [visible, user, assignableRoles]);

  const sf = <K extends keyof UserFormData>(k: K, v: UserFormData[K]) => setForm((p) => ({ ...p, [k]: v }));

  const createMut = useMutation({
    mutationFn: (data: CreateUserRequest) => usersApi.createUser(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      onClose();
    },
    onError: (e: Error) => Alert.alert('Erreur', e?.message ?? 'Création impossible.'),
  });

  const updateMut = useMutation({
    mutationFn: (data: UpdateUserRequest) => usersApi.updateUser(user!.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      onClose();
    },
    onError: (e: Error) => Alert.alert('Erreur', e?.message ?? 'Modification impossible.'),
  });

  const isPending = createMut.isPending || updateMut.isPending;

  const handleSave = () => {
    if (!form.name.trim()) {
      Alert.alert('Champ requis', 'Le nom est obligatoire.');
      return;
    }
    if (!form.email.trim()) {
      Alert.alert('Champ requis', "L'email est obligatoire.");
      return;
    }
    if (!isEdit && !form.password.trim()) {
      Alert.alert('Champ requis', 'Le mot de passe est obligatoire.');
      return;
    }
    if (!isEdit && form.password.length < 8) {
      Alert.alert('Mot de passe trop court', 'Minimum 8 caractères.');
      return;
    }

    if (isEdit) {
      const data: UpdateUserRequest = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        role: form.role,
        departement: form.departement.trim() || undefined,
        poste: form.poste.trim() || undefined,
      };
      updateMut.mutate(data);
    } else {
      const data: CreateUserRequest = {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
        phone: form.phone.trim() || undefined,
        departement: form.departement.trim() || undefined,
        poste: form.poste.trim() || undefined,
      };
      createMut.mutate(data);
    }
  };

  const f = fm(theme);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg.primary }} edges={['top']}>
          {/* Header */}
          <View style={f.header}>
            <TouchableOpacity onPress={onClose} hitSlop={8} accessibilityLabel="Fermer">
              <X size={22} color={theme.text.muted} />
            </TouchableOpacity>
            <Text style={f.title}>{isEdit ? "Modifier l'utilisateur" : 'Nouvel utilisateur'}</Text>
            <TouchableOpacity
              onPress={handleSave}
              disabled={isPending}
              style={[f.saveBtn, { backgroundColor: theme.primary, opacity: isPending ? 0.6 : 1 }]}
              accessibilityLabel="Enregistrer"
            >
              {isPending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={f.saveTxt}>Enregistrer</Text>}
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} keyboardShouldPersistTaps="handled">
            {/* Nom */}
            <View>
              <Text style={f.label}>NOM COMPLET *</Text>
              <TextInput
                style={f.input}
                value={form.name}
                onChangeText={(v) => sf('name', v)}
                placeholder="Prénom Nom"
                placeholderTextColor={theme.text.muted}
                editable={!isPending}
              />
            </View>

            {/* Email */}
            <View>
              <Text style={f.label}>EMAIL *</Text>
              <TextInput
                style={f.input}
                value={form.email}
                onChangeText={(v) => sf('email', v)}
                placeholder="email@entreprise.com"
                placeholderTextColor={theme.text.muted}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!isPending}
              />
            </View>

            {/* Mot de passe — création uniquement */}
            {!isEdit && (
              <View>
                <Text style={f.label}>MOT DE PASSE *</Text>
                <TextInput
                  style={f.input}
                  value={form.password}
                  onChangeText={(v) => sf('password', v)}
                  placeholder="Minimum 8 caractères"
                  placeholderTextColor={theme.text.muted}
                  secureTextEntry
                  editable={!isPending}
                />
              </View>
            )}

            {/* Téléphone */}
            <View>
              <Text style={f.label}>TÉLÉPHONE</Text>
              <TextInput
                style={f.input}
                value={form.phone}
                onChangeText={(v) => sf('phone', v)}
                placeholder="+225 00 00 00 00"
                placeholderTextColor={theme.text.muted}
                keyboardType="phone-pad"
                editable={!isPending}
              />
            </View>

            {/* Département */}
            <View>
              <Text style={f.label}>DÉPARTEMENT</Text>
              <TextInput
                style={f.input}
                value={form.departement}
                onChangeText={(v) => sf('departement', v)}
                placeholder="Flotte, Commercial, Tech..."
                placeholderTextColor={theme.text.muted}
                editable={!isPending}
              />
            </View>

            {/* Poste */}
            <View>
              <Text style={f.label}>POSTE</Text>
              <TextInput
                style={f.input}
                value={form.poste}
                onChangeText={(v) => sf('poste', v)}
                placeholder="Responsable flotte, Chauffeur..."
                placeholderTextColor={theme.text.muted}
                editable={!isPending}
              />
            </View>

            {/* Rôle */}
            <View>
              <Text style={f.label}>RÔLE *</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {assignableRoles.map((r) => {
                  const on = form.role === r.value;
                  const color = ROLE_COLORS[r.value] ?? theme.primary;
                  return (
                    <TouchableOpacity
                      key={r.value}
                      onPress={() => sf('role', r.value)}
                      disabled={isPending}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 9,
                        borderRadius: 10,
                        borderWidth: 1.5,
                        borderColor: on ? color : theme.border,
                        backgroundColor: on ? color + '18' : 'transparent',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: '600',
                          color: on ? color : theme.text.secondary,
                        }}
                      >
                        {r.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
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
      backgroundColor: t.bg.surface,
    },
    title: { fontSize: 16, fontWeight: '700', color: t.text.primary },
    saveBtn: { borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8, minWidth: 90, alignItems: 'center' },
    saveTxt: { color: '#fff', fontWeight: '700', fontSize: 13 },
    label: {
      fontSize: 11,
      fontWeight: '700',
      color: t.text.secondary,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: 6,
    },
    input: {
      backgroundColor: t.bg.surface,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: t.border,
      paddingHorizontal: 14,
      height: 46,
      color: t.text.primary,
      fontSize: 14,
    },
  });

// ── UserRow ───────────────────────────────────────────────────────────────────

function UserRow({
  item,
  theme,
  onPress,
  onToggle,
}: {
  item: TenantUser;
  theme: ThemeType;
  onPress: () => void;
  onToggle: () => void;
}) {
  const roleColor = ROLE_COLORS[item.role?.toUpperCase()] ?? '#6B7280';
  const isActive = item.status === 'Actif';

  const lastLoginText = useMemo(() => {
    if (!item.last_login) return 'Jamais connecté';
    const d = new Date(item.last_login);
    if (isNaN(d.getTime())) return '–';
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }, [item.last_login]);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={[row(theme).card, { borderLeftColor: roleColor }]}>
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: roleColor + '22',
          justifyContent: 'center',
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        <User size={18} color={roleColor} />
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text.primary }} numberOfLines={1}>
            {item.name}
          </Text>
          <View
            style={{
              backgroundColor: roleColor + '22',
              borderRadius: 5,
              paddingHorizontal: 6,
              paddingVertical: 2,
            }}
          >
            <Text style={{ fontSize: 10, fontWeight: '600', color: roleColor }}>
              {ROLE_LABELS[item.role?.toUpperCase()] ?? item.role}
            </Text>
          </View>
          <View
            style={{
              borderRadius: 5,
              paddingHorizontal: 6,
              paddingVertical: 2,
              backgroundColor: isActive ? '#22C55E22' : '#6B728022',
            }}
          >
            <Text
              style={{
                fontSize: 10,
                fontWeight: '600',
                color: isActive ? '#22C55E' : '#6B7280',
              }}
            >
              {item.status ?? 'Inactif'}
            </Text>
          </View>
        </View>
        <Text style={{ fontSize: 12, color: theme.text.secondary }} numberOfLines={1}>
          {item.email}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Clock size={10} color={theme.text.muted} />
          <Text style={{ fontSize: 11, color: theme.text.muted }}>{lastLoginText}</Text>
        </View>
      </View>
      <TouchableOpacity
        onPress={onToggle}
        style={{ padding: 8 }}
        hitSlop={8}
        accessibilityLabel={isActive ? 'Désactiver' : 'Activer'}
      >
        {isActive ? <UserX size={18} color="#EF4444" /> : <UserCheck size={18} color="#22C55E" />}
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const row = (theme: ThemeType) =>
  StyleSheet.create({
    card: {
      backgroundColor: theme.bg.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      borderLeftWidth: 4,
      padding: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
  });

// ── Main ──────────────────────────────────────────────────────────────────────

export default function UsersScreen() {
  const { theme } = useTheme();
  const s = styles(theme);
  const nav = useNavigation<Nav>();
  const qc = useQueryClient();
  const { user: me } = useAuthStore();

  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [departementFilter, setDepartementFilter] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState<TenantUser | null>(null);

  const [debouncedSearch, setDebouncedSearch] = useState('');
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const shouldLoadData = !!(roleFilter || statusFilter || departementFilter || debouncedSearch.trim().length >= 2);

  const {
    data = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['admin-users'],
    queryFn: usersApi.getAll,
    staleTime: 60_000,
    enabled: shouldLoadData,
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'Actif' | 'Inactif' }) => usersApi.toggleStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
    onError: (e: Error) => Alert.alert('Erreur', e?.message ?? 'Action impossible.'),
  });

  const confirmToggle = (u: TenantUser) => {
    const willBe: 'Actif' | 'Inactif' = u.status === 'Actif' ? 'Inactif' : 'Actif';
    Alert.alert(
      willBe === 'Inactif' ? 'Désactiver cet utilisateur ?' : 'Réactiver cet utilisateur ?',
      `${u.name} (${u.email})`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: willBe === 'Inactif' ? 'Désactiver' : 'Activer',
          style: willBe === 'Inactif' ? 'destructive' : 'default',
          onPress: () => toggleMut.mutate({ id: u.id, status: willBe }),
        },
      ]
    );
  };

  const openCreate = () => {
    setEditUser(null);
    setShowForm(true);
  };

  const openEdit = (u: TenantUser) => {
    if (u.id === me?.id) {
      Alert.alert('Non autorisé', 'Modifiez votre propre profil depuis Paramètres → Mon compte.');
      return;
    }
    setEditUser(u);
    setShowForm(true);
  };

  const uniqueDepartements = useMemo(() => {
    const m = new Set<string>();
    data.forEach((u) => {
      const d = u.departement?.trim();
      if (d) m.add(d);
    });
    return Array.from(m)
      .sort()
      .map((d) => ({ id: d, label: d }));
  }, [data]);

  const filterBlocks: FilterBlockDef[] = useMemo(
    () => [
      {
        key: 'role',
        label: 'Rôle',
        items: ROLE_FILTER_ITEMS,
        selected: roleFilter,
        onSelect: setRoleFilter,
      },
      {
        key: 'status',
        label: 'Statut',
        items: STATUS_FILTER_ITEMS,
        selected: statusFilter,
        onSelect: setStatusFilter,
      },
      {
        key: 'departement',
        label: 'Département',
        items: uniqueDepartements,
        selected: departementFilter,
        onSelect: setDepartementFilter,
      },
    ],
    [roleFilter, statusFilter, uniqueDepartements, departementFilter]
  );

  const hasActiveFilters = !!(roleFilter || statusFilter || departementFilter);
  const resetFilters = () => {
    setRoleFilter(null);
    setStatusFilter(null);
    setDepartementFilter(null);
  };

  const filtered = useMemo(() => {
    let list = data;
    if (roleFilter) list = list.filter((u) => u.role?.toUpperCase() === roleFilter);
    if (statusFilter) list = list.filter((u) => u.status === statusFilter);
    if (departementFilter) list = list.filter((u) => u.departement === departementFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (u) =>
          u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.role?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [data, search, roleFilter, statusFilter, departementFilter]);

  const activeCount = data.filter((u) => u.status === 'Actif').length;

  return (
    <ProtectedScreen allowedRoles={ADMIN_SCREEN_ROLES}>
      <SafeAreaView style={s.container} edges={['top']}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity
            onPress={() => nav.goBack()}
            style={s.backBtn}
            accessibilityLabel="Retour"
            accessibilityRole="button"
          >
            <ArrowLeft size={22} color={theme.text.primary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>Utilisateurs</Text>
            {shouldLoadData && !isLoading && (
              <Text style={s.subtitle}>
                {data.length} total · {activeCount} actifs
              </Text>
            )}
          </View>
        </View>

        {/* Search + filtres */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            marginHorizontal: 16,
            marginBottom: 10,
          }}
        >
          <View style={{ flex: 1 }}>
            <SearchBar value={search} onChangeText={setSearch} placeholder="Rechercher..." />
          </View>
          <TouchableOpacity
            onPress={() => setShowFilters((p) => !p)}
            accessibilityRole="button"
            accessibilityLabel="Filtres"
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              backgroundColor: showFilters ? theme.primary : theme.bg.surface,
              borderWidth: 1,
              borderColor: theme.border,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <SlidersHorizontal size={18} color={showFilters ? '#fff' : theme.text.primary} />
            {hasActiveFilters && !showFilters ? (
              <View
                style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
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

        {/* List */}
        {!shouldLoadData ? (
          <View style={s.center}>
            <SlidersHorizontal size={48} color={theme.text.muted} />
            <Text style={s.empty}>Appliquez un filtre ou lancez une recherche</Text>
            <Text style={[s.empty, { fontSize: 12 }]}>pour afficher les utilisateurs</Text>
          </View>
        ) : isLoading ? (
          <View style={s.center}>
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
        ) : filtered.length === 0 ? (
          <View style={s.center}>
            <User size={48} color={theme.text.muted} />
            <Text style={s.empty}>Aucun résultat</Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(u) => u.id}
            renderItem={({ item }) => (
              <UserRow item={item} theme={theme} onPress={() => openEdit(item)} onToggle={() => confirmToggle(item)} />
            )}
            contentContainerStyle={{ padding: 16, paddingBottom: 96, gap: 8 }}
            initialNumToRender={20}
            maxToRenderPerBatch={20}
            windowSize={5}
            removeClippedSubviews={true}
            refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme.primary} />}
          />
        )}

        {/* FAB Créer */}
        <TouchableOpacity
          onPress={openCreate}
          style={[s.fab, { backgroundColor: theme.primary }]}
          accessibilityLabel="Nouvel utilisateur"
          accessibilityRole="button"
        >
          <Plus size={26} color="#fff" />
        </TouchableOpacity>

        <UserFormModal
          visible={showForm}
          user={editUser}
          theme={theme}
          currentRole={me?.role}
          onClose={() => setShowForm(false)}
        />
      </SafeAreaView>
    </ProtectedScreen>
  );
}

const styles = (theme: ThemeType) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg.primary },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingTop: 12,
      paddingHorizontal: 16,
      paddingBottom: 12,
      gap: 12,
    },
    backBtn: { padding: 4, marginTop: 4 },
    title: { fontSize: 22, fontWeight: '700', color: theme.text.primary },
    subtitle: { fontSize: 12, color: theme.text.muted, marginTop: 2 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
    empty: { fontSize: 14, color: theme.text.muted },
    fab: {
      position: 'absolute',
      right: 20,
      bottom: 24,
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.25,
      shadowRadius: 6,
      elevation: 6,
    },
  });
