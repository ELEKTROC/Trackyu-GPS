/**
 * TrackYu Mobile — Users Screen (Admin)
 * Liste tous les utilisateurs du tenant.
 * Requiert VIEW_USERS (ADMIN, MANAGER, SUPERADMIN).
 * GET /users → tableau plat, pas paginé.
 */
import React, { useState, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowLeft, User, Clock } from 'lucide-react-native';
import { useTheme } from '../../theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usersApi, type TenantUser } from '../../api/users';
import type { RootStackParamList } from '../../navigation/types';
import { ROLE_LABELS, ROLE_COLORS, ADMIN_SCREEN_ROLES } from '../../constants/roles';
import { ProtectedScreen } from '../../components/ProtectedScreen';
import { SearchBar } from '../../components/SearchBar';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type ThemeType = ReturnType<typeof import('../../theme').useTheme>['theme'];

const ROLE_FILTER_OPTIONS = [
  { label: 'Tous', value: null },
  { label: 'Admin', value: 'ADMIN' },
  { label: 'Manager', value: 'MANAGER' },
  { label: 'Tech', value: 'TECH' },
  { label: 'Support', value: 'SUPPORT_AGENT' },
  { label: 'Commercial', value: 'COMMERCIAL' },
  { label: 'Client', value: 'CLIENT' },
];

// ── UserRow ───────────────────────────────────────────────────────────────────

function UserRow({ item, theme }: { item: TenantUser; theme: ThemeType }) {
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
    <View style={[row(theme).card, { borderLeftColor: roleColor }]}>
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
            <Text style={{ fontSize: 10, fontWeight: '600', color: isActive ? '#22C55E' : '#6B7280' }}>
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
    </View>
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
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string | null>(null);

  const {
    data = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['admin-users'],
    queryFn: usersApi.getAll,
    staleTime: 60_000,
  });

  const filtered = useMemo(() => {
    let list = data;
    if (roleFilter) {
      list = list.filter((u) => u.role?.toUpperCase() === roleFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (u) =>
          u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.role?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [data, search, roleFilter]);

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
            {!isLoading && (
              <Text style={s.subtitle}>
                {data.length} total · {activeCount} actifs
              </Text>
            )}
          </View>
        </View>

        {/* Search */}
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Rechercher..."
          style={{ marginHorizontal: 16, marginBottom: 10 }}
        />

        {/* Role filter chips */}
        <FlatList
          horizontal
          data={ROLE_FILTER_OPTIONS}
          keyExtractor={(i) => i.label}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.chips}
          renderItem={({ item }) => {
            const active = roleFilter === item.value;
            return (
              <TouchableOpacity
                style={[s.chip, active && { backgroundColor: theme.primary, borderColor: theme.primary }]}
                onPress={() => setRoleFilter(item.value)}
                activeOpacity={0.75}
              >
                <Text style={[s.chipLabel, active && { color: theme.text.onPrimary }]}>{item.label}</Text>
              </TouchableOpacity>
            );
          }}
        />

        {/* List */}
        {isLoading ? (
          <View style={s.center}>
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
        ) : filtered.length === 0 ? (
          <View style={s.center}>
            <User size={48} color={theme.text.muted} />
            <Text style={s.empty}>{search || roleFilter ? 'Aucun résultat' : 'Aucun utilisateur'}</Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(u) => u.id}
            renderItem={({ item }) => <UserRow item={item} theme={theme} />}
            contentContainerStyle={{ padding: 16, gap: 8 }}
            initialNumToRender={20}
            maxToRenderPerBatch={20}
            windowSize={5}
            removeClippedSubviews={true}
            refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme.primary} />}
          />
        )}
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
    chips: {
      paddingHorizontal: 16,
      paddingBottom: 12,
      gap: 8,
    },
    chip: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: theme.bg.surface,
    },
    chipLabel: { fontSize: 12, fontWeight: '500', color: theme.text.secondary },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
    empty: { fontSize: 14, color: theme.text.muted },
  });
