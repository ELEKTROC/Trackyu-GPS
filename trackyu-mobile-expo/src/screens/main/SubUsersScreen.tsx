/**
 * TrackYu Mobile — Sous-utilisateurs
 * Liste + Créer / Modifier / Activer / Désactiver
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
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Plus, UserCheck, UserX, Edit2, X } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import usersApi, { type TenantUser, type CreateUserRequest, type UpdateUserRequest } from '../../api/users';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme';
import { SUBUSERS_ALLOWED_ROLES } from '../../constants/roles';
import { ProtectedScreen } from '../../components/ProtectedScreen';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { SearchBar } from '../../components/SearchBar';

type ThemeType = ReturnType<typeof import('../../theme').useTheme>['theme'];

const ROLE_OPTIONS = [
  { value: 'CLIENT', label: 'Client' },
  { value: 'OPERATOR', label: 'Opérateur' },
  { value: 'COMMERCIAL', label: 'Commercial' },
  { value: 'TECH', label: 'Technicien' },
];

// ── Formulaire création/édition ───────────────────────────────────────────────

interface UserFormData {
  name: string;
  email: string;
  password: string;
  role: string;
  phone: string;
  poste: string;
}

const EMPTY_FORM: UserFormData = { name: '', email: '', password: '', role: 'OPERATOR', phone: '', poste: '' };

function UserFormModal({
  visible,
  user,
  onClose,
  theme,
}: {
  visible: boolean;
  user: TenantUser | null;
  onClose: () => void;
  theme: ThemeType;
}) {
  const qc = useQueryClient();
  const isEdit = !!user;
  const [form, setForm] = useState<UserFormData>(EMPTY_FORM);

  React.useEffect(() => {
    if (visible) {
      setForm(
        user
          ? {
              name: user.name,
              email: user.email,
              password: '',
              role: user.role,
              phone: user.phone ?? '',
              poste: user.poste ?? '',
            }
          : EMPTY_FORM
      );
    }
  }, [visible, user]);

  const sf = <K extends keyof UserFormData>(k: K, v: UserFormData[K]) => setForm((p) => ({ ...p, [k]: v }));

  const createMut = useMutation({
    mutationFn: (data: CreateUserRequest) => usersApi.createUser(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      onClose();
    },
    onError: (e: Error) => Alert.alert('Erreur', e?.message ?? "Impossible de créer l'utilisateur."),
  });

  const updateMut = useMutation({
    mutationFn: (data: UpdateUserRequest) => usersApi.updateUser(user!.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      onClose();
    },
    onError: (e: Error) => Alert.alert('Erreur', e?.message ?? "Impossible de modifier l'utilisateur."),
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

    if (isEdit) {
      const data: UpdateUserRequest = {
        name: form.name,
        email: form.email,
        phone: form.phone || undefined,
        role: form.role,
        poste: form.poste || undefined,
      };
      updateMut.mutate(data);
    } else {
      const data: CreateUserRequest = {
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role,
        phone: form.phone || undefined,
        poste: form.poste || undefined,
      };
      createMut.mutate(data);
    }
  };

  const inp = {
    backgroundColor: theme.bg.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 14,
    height: 46,
    color: theme.text.primary,
    fontSize: 14,
  };
  const lbl = {
    fontSize: 11,
    fontWeight: '700' as const,
    color: theme.text.secondary,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
    marginBottom: 6,
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg.primary }} edges={['top']}>
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 16,
              paddingTop: 12,
              paddingBottom: 16,
              backgroundColor: theme.bg.surface,
              borderBottomWidth: 1,
              borderBottomColor: theme.border,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: '700', color: theme.text.primary }}>
              {isEdit ? "Modifier l'utilisateur" : 'Nouveau sous-utilisateur'}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <X size={22} color={theme.text.muted} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }} keyboardShouldPersistTaps="handled">
            {/* Nom */}
            <View>
              <Text style={lbl}>NOM COMPLET</Text>
              <TextInput
                style={inp}
                value={form.name}
                onChangeText={(v) => sf('name', v)}
                placeholder="Prénom Nom"
                placeholderTextColor={theme.text.muted}
              />
            </View>

            {/* Email */}
            <View>
              <Text style={lbl}>EMAIL</Text>
              <TextInput
                style={inp}
                value={form.email}
                onChangeText={(v) => sf('email', v)}
                placeholder="email@entreprise.com"
                placeholderTextColor={theme.text.muted}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* Mot de passe (création uniquement) */}
            {!isEdit && (
              <View>
                <Text style={lbl}>MOT DE PASSE</Text>
                <TextInput
                  style={inp}
                  value={form.password}
                  onChangeText={(v) => sf('password', v)}
                  placeholder="Minimum 8 caractères"
                  placeholderTextColor={theme.text.muted}
                  secureTextEntry
                />
              </View>
            )}

            {/* Téléphone */}
            <View>
              <Text style={lbl}>TÉLÉPHONE (optionnel)</Text>
              <TextInput
                style={inp}
                value={form.phone}
                onChangeText={(v) => sf('phone', v)}
                placeholder="+225 00 00 00 00"
                placeholderTextColor={theme.text.muted}
                keyboardType="phone-pad"
              />
            </View>

            {/* Poste */}
            <View>
              <Text style={lbl}>POSTE (optionnel)</Text>
              <TextInput
                style={inp}
                value={form.poste}
                onChangeText={(v) => sf('poste', v)}
                placeholder="Responsable flotte, Chauffeur..."
                placeholderTextColor={theme.text.muted}
              />
            </View>

            {/* Rôle */}
            <View>
              <Text style={lbl}>RÔLE</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {ROLE_OPTIONS.map((r) => (
                  <TouchableOpacity
                    key={r.value}
                    onPress={() => sf('role', r.value)}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      borderRadius: 10,
                      borderWidth: 1.5,
                      borderColor: form.role === r.value ? theme.primary : theme.border,
                      backgroundColor: form.role === r.value ? theme.primary + '18' : 'transparent',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: '600',
                        color: form.role === r.value ? theme.primary : theme.text.secondary,
                      }}
                    >
                      {r.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Bouton Enregistrer */}
            <Button onPress={handleSave} loading={isPending} size="lg" fullWidth style={{ marginTop: 8 }}>
              Enregistrer
            </Button>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Carte utilisateur ─────────────────────────────────────────────────────────

function UserCard({
  user,
  theme,
  onEdit,
  onToggle,
}: {
  user: TenantUser;
  theme: ThemeType;
  onEdit: () => void;
  onToggle: () => void;
}) {
  const isActive = user.status === 'Actif';
  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          backgroundColor: isActive ? theme.primary + '18' : theme.bg.elevated,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Text style={{ fontSize: 15, fontWeight: '700', color: isActive ? theme.primary : theme.text.muted }}>
          {initials}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: '600', color: theme.text.primary }}>{user.name}</Text>
        <Text style={{ fontSize: 12, color: theme.text.muted }}>{user.email}</Text>
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
          <View
            style={{
              backgroundColor: isActive ? '#22C55E18' : '#6B728018',
              borderRadius: 6,
              paddingHorizontal: 8,
              paddingVertical: 2,
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: '700', color: isActive ? '#22C55E' : '#6B7280' }}>
              {isActive ? 'Actif' : 'Inactif'}
            </Text>
          </View>
          <View
            style={{ backgroundColor: theme.primary + '14', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 }}
          >
            <Text style={{ fontSize: 11, fontWeight: '600', color: theme.primary }}>{user.role}</Text>
          </View>
        </View>
      </View>
      <TouchableOpacity onPress={onEdit} style={{ padding: 8 }}>
        <Edit2 size={16} color={theme.primary} />
      </TouchableOpacity>
      <TouchableOpacity onPress={onToggle} style={{ padding: 8 }}>
        {isActive ? <UserX size={16} color="#EF4444" /> : <UserCheck size={16} color="#22C55E" />}
      </TouchableOpacity>
    </Card>
  );
}

// ── Écran principal ───────────────────────────────────────────────────────────

export default function SubUsersScreen() {
  const { theme } = useTheme();
  const { user: me } = useAuthStore();
  const nav = useNavigation();
  const qc = useQueryClient();

  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState<TenantUser | null>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.getAll(),
    staleTime: 60_000,
  });

  // Sous-utilisateurs = tous sauf moi-même
  const subUsers = useMemo(
    () =>
      data.filter(
        (u) =>
          u.id !== me?.id &&
          (search === '' ||
            u.name.toLowerCase().includes(search.toLowerCase()) ||
            u.email.toLowerCase().includes(search.toLowerCase()))
      ),
    [data, me, search]
  );

  const toggleMut = useMutation({
    mutationFn: ({ userId, status }: { userId: string; status: 'Actif' | 'Inactif' }) =>
      usersApi.toggleStatus(userId, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
    onError: (e: Error) => Alert.alert('Erreur', e?.message ?? 'Action impossible.'),
  });

  const handleToggle = (u: TenantUser) => {
    const next = u.status === 'Actif' ? 'Inactif' : 'Actif';
    Alert.alert(
      next === 'Inactif' ? 'Désactiver' : 'Activer',
      `${next === 'Inactif' ? 'Désactiver' : 'Activer'} le compte de ${u.name} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Confirmer', onPress: () => toggleMut.mutate({ userId: u.id, status: next }) },
      ]
    );
  };

  const activeCount = subUsers.filter((u) => u.status === 'Actif').length;

  return (
    <ProtectedScreen allowedRoles={SUBUSERS_ALLOWED_ROLES}>
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
            <Text style={{ fontSize: 18, fontWeight: '700', color: theme.text.primary }}>Sous-utilisateurs</Text>
            <Text style={{ fontSize: 12, color: theme.text.muted }}>
              {subUsers.length} utilisateur{subUsers.length !== 1 ? 's' : ''} · {activeCount} actif
              {activeCount !== 1 ? 's' : ''}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              setEditUser(null);
              setShowForm(true);
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

        {/* Barre de recherche */}
        <SearchBar value={search} onChangeText={setSearch} placeholder="Rechercher..." style={{ margin: 12 }} />

        {/* Liste */}
        {isLoading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator color={theme.primary} />
          </View>
        ) : subUsers.length === 0 ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text.secondary, textAlign: 'center' }}>
              {search ? 'Aucun résultat' : 'Aucun sous-utilisateur'}
            </Text>
            {!search && (
              <Text style={{ fontSize: 13, color: theme.text.muted, textAlign: 'center', marginTop: 8 }}>
                Appuyez sur + pour créer le premier sous-utilisateur.
              </Text>
            )}
          </View>
        ) : (
          <FlatList
            data={subUsers}
            keyExtractor={(u) => u.id}
            contentContainerStyle={{ padding: 12, gap: 8 }}
            renderItem={({ item }) => (
              <UserCard
                user={item}
                theme={theme}
                onEdit={() => {
                  setEditUser(item);
                  setShowForm(true);
                }}
                onToggle={() => handleToggle(item)}
              />
            )}
          />
        )}

        <UserFormModal visible={showForm} user={editUser} onClose={() => setShowForm(false)} theme={theme} />
      </SafeAreaView>
    </ProtectedScreen>
  );
}
