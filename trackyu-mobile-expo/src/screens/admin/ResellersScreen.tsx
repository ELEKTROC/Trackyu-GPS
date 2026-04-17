/**
 * TrackYu Mobile — Revendeurs Screen
 * Liste des tenants revendeurs avec statut, clients et véhicules.
 * Réservé SUPERADMIN / ADMIN.
 */
import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Building2, Users, Truck, CheckCircle2, XCircle, PauseCircle } from 'lucide-react-native';
import { useTheme } from '../../theme';
import { SearchBar } from '../../components/SearchBar';
import { ProtectedScreen } from '../../components/ProtectedScreen';
import { ADMIN_SCREEN_ROLES } from '../../constants/roles';
import tiersApi, { type Tier, type TierStatus } from '../../api/tiersApi';

type ThemeType = ReturnType<typeof import('../../theme').useTheme>['theme'];

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

function ResellerCard({ item, theme }: { item: Tier; theme: ThemeType }) {
  const color = STATUS_COLORS[item.status] ?? '#6B7280';
  const label = STATUS_LABELS[item.status] ?? item.status;
  const Icon = STATUS_ICONS[item.status] ?? XCircle;
  return (
    <View
      style={[card(theme).wrap, { borderLeftColor: color }]}
      accessibilityRole="none"
      accessibilityLabel={`Revendeur ${item.name} — ${label}`}
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
      <View style={card(theme).meta}>
        {item.tenantId ? <Text style={card(theme).metaText}>Tenant : {item.tenantId}</Text> : null}
        <Text style={card(theme).metaDate}>
          Créé le{' '}
          {new Date(item.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
        </Text>
      </View>
    </View>
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
      gap: 8,
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
    meta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    metaText: { fontSize: 11, color: theme.text.muted },
    metaDate: { fontSize: 11, color: theme.text.muted },
  });

export default function ResellersScreen() {
  const { theme } = useTheme();
  const nav = useNavigation();
  const [search, setSearch] = useState('');

  const {
    data = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['admin-resellers'],
    queryFn: tiersApi.getResellers,
    staleTime: 120_000,
  });

  const filtered = search.trim()
    ? data.filter(
        (r) =>
          r.name.toLowerCase().includes(search.toLowerCase()) || r.email?.toLowerCase().includes(search.toLowerCase())
      )
    : data;

  return (
    <ProtectedScreen allowedRoles={ADMIN_SCREEN_ROLES}>
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg.primary }} edges={['top']}>
        {/* Header */}
        <View style={s(theme).header}>
          <TouchableOpacity
            onPress={() => nav.goBack()}
            style={s(theme).back}
            accessibilityLabel="Retour"
            accessibilityRole="button"
          >
            <ArrowLeft size={22} color={theme.text.primary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s(theme).title}>Revendeurs</Text>
            {!isLoading && (
              <Text style={s(theme).subtitle}>
                {data.length} revendeur{data.length !== 1 ? 's' : ''}
              </Text>
            )}
          </View>
        </View>

        <SearchBar value={search} onChangeText={setSearch} placeholder="Rechercher un revendeur…" />

        {isLoading ? (
          <View style={s(theme).center}>
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
        ) : filtered.length === 0 ? (
          <View style={s(theme).center}>
            <Building2 size={48} color={theme.text.muted} />
            <Text style={s(theme).empty}>{search ? 'Aucun résultat' : 'Aucun revendeur'}</Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(i) => i.id}
            renderItem={({ item }) => <ResellerCard item={item} theme={theme} />}
            contentContainerStyle={{ padding: 16, gap: 10 }}
            refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme.primary} />}
          />
        )}
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
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
    empty: { fontSize: 14, color: theme.text.muted },
  });
