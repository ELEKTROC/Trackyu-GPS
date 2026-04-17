/**
 * TrackYu Mobile — Leads CRM Screen
 * Liste des leads du tenant avec filtres statut et recherche.
 * Requiert VIEW_CRM (COMMERCIAL, COMPTABLE, MANAGER, ADMIN).
 * GET /crm/leads → Lead[] (tableau plat snake_case)
 */
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowLeft, Briefcase, TrendingUp, Phone } from 'lucide-react-native';
import { useTheme } from '../../theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import crmApi, {
  type Lead,
  type LeadStatus,
  LEAD_STATUS_COLORS,
  LEAD_STATUS_LABELS,
  LEAD_FILTER_STATUSES,
} from '../../api/crmApi';
import { useAuthStore } from '../../store/authStore';
import type { RootStackParamList } from '../../navigation/types';
import { CRM_SCREEN_ROLES } from '../../constants/roles';
import { ProtectedScreen } from '../../components/ProtectedScreen';
import { SearchBar } from '../../components/SearchBar';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type ThemeType = ReturnType<typeof import('../../theme').useTheme>['theme'];

const FILTERS: { label: string; value: LeadStatus | null }[] = [
  { label: 'Tous', value: null },
  ...LEAD_FILTER_STATUSES.map((s) => ({
    label: LEAD_STATUS_LABELS[s],
    value: s,
  })),
];

function formatValue(v: number | null): string {
  if (v == null) return '–';
  return v.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 });
}

// ── LeadCard ──────────────────────────────────────────────────────────────────

function LeadCard({ item, theme }: { item: Lead; theme: ThemeType }) {
  const statusColor = LEAD_STATUS_COLORS[item.status] ?? '#6B7280';
  const s = cardStyles(theme);

  return (
    <View style={[s.card, { borderLeftColor: statusColor }]}>
      <View style={s.body}>
        {/* En-tête : nom entreprise + statut */}
        <View style={s.headerRow}>
          <Text style={s.company} numberOfLines={1}>
            {item.company_name}
          </Text>
          <View
            style={{
              backgroundColor: statusColor + '22',
              borderRadius: 6,
              paddingHorizontal: 7,
              paddingVertical: 3,
            }}
          >
            <Text style={{ fontSize: 10, fontWeight: '700', color: statusColor }}>
              {LEAD_STATUS_LABELS[item.status] ?? item.status}
            </Text>
          </View>
        </View>

        {/* Contact */}
        {item.contact_name ? (
          <Text style={s.contact} numberOfLines={1}>
            {item.contact_name}
            {item.email ? ` · ${item.email}` : ''}
          </Text>
        ) : null}

        {/* Méta : téléphone + valeur potentielle + score */}
        <View style={s.metaRow}>
          {item.phone ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Phone size={10} color={theme.text.muted} />
              <Text style={s.meta}>{item.phone}</Text>
            </View>
          ) : null}
          {item.potential_value != null ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <TrendingUp size={10} color="#10B981" />
              <Text style={[s.meta, { color: '#10B981' }]}>{formatValue(item.potential_value)}</Text>
            </View>
          ) : null}
          {item.score != null ? (
            <View
              style={{
                backgroundColor: theme.bg.elevated,
                borderRadius: 5,
                paddingHorizontal: 6,
                paddingVertical: 2,
              }}
            >
              <Text style={{ fontSize: 10, color: theme.text.muted }}>Score {item.score}</Text>
            </View>
          ) : null}
          {item.source ? <Text style={[s.meta, { marginLeft: 'auto' }]}>{item.source}</Text> : null}
        </View>
      </View>
    </View>
  );
}

const cardStyles = (theme: ThemeType) =>
  StyleSheet.create({
    card: {
      backgroundColor: theme.bg.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      borderLeftWidth: 4,
      overflow: 'hidden',
    },
    body: { padding: 12, gap: 5 },
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    company: { flex: 1, fontSize: 14, fontWeight: '700', color: theme.text.primary },
    contact: { fontSize: 12, color: theme.text.secondary },
    metaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginTop: 2 },
    meta: { fontSize: 11, color: theme.text.muted },
  });

// ── KPI bar ───────────────────────────────────────────────────────────────────

function KpiBar({ leads, theme }: { leads: Lead[]; theme: ThemeType }) {
  const won = leads.filter((l) => l.status === 'WON').length;
  const active = leads.filter((l) => !['WON', 'LOST'].includes(l.status)).length;
  const totalValue = leads.filter((l) => l.status !== 'LOST').reduce((s, l) => s + (l.potential_value ?? 0), 0);

  return (
    <View
      style={{
        flexDirection: 'row',
        gap: 10,
        paddingHorizontal: 16,
        paddingBottom: 12,
      }}
    >
      {[
        { label: 'Total', value: leads.length, color: theme.primary },
        { label: 'Actifs', value: active, color: '#F59E0B' },
        { label: 'Gagnés', value: won, color: '#22C55E' },
        {
          label: 'Valeur',
          value: totalValue > 0 ? (totalValue / 1000000).toFixed(1) + 'M' : '–',
          color: '#10B981',
        },
      ].map((k) => (
        <View
          key={k.label}
          style={{
            flex: 1,
            backgroundColor: theme.bg.surface,
            borderRadius: 10,
            padding: 10,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: theme.border,
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: '800', color: k.color }}>{k.value}</Text>
          <Text style={{ fontSize: 10, color: theme.text.muted, marginTop: 2 }}>{k.label}</Text>
        </View>
      ))}
    </View>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function LeadsScreen() {
  const { theme } = useTheme();
  const s = styles(theme);
  const nav = useNavigation<Nav>();
  const user = useAuthStore((st) => st.user);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<LeadStatus | null>(null);

  const {
    data = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['crm-leads'],
    queryFn: crmApi.getLeads,
    staleTime: 60_000,
  });

  const filtered = useMemo(() => {
    let list = data;
    if (statusFilter) {
      list = list.filter((l) => l.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (l) =>
          l.company_name?.toLowerCase().includes(q) ||
          l.contact_name?.toLowerCase().includes(q) ||
          l.email?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [data, search, statusFilter]);

  return (
    <ProtectedScreen allowedRoles={CRM_SCREEN_ROLES}>
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
            <Text style={s.title}>Leads CRM</Text>
            <Text style={s.subtitle}>{user?.name ?? ''}</Text>
          </View>
        </View>

        {/* KPI bar */}
        {!isLoading && data.length > 0 && <KpiBar leads={data} theme={theme} />}

        {/* Search */}
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Entreprise, contact, email..."
          style={{ marginHorizontal: 16, marginBottom: 10 }}
        />

        {/* Status filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
          {FILTERS.map((f) => {
            const active = statusFilter === f.value;
            const color = f.value ? LEAD_STATUS_COLORS[f.value] : theme.primary;
            return (
              <TouchableOpacity
                key={f.label}
                style={[s.chip, active && { backgroundColor: color, borderColor: color }]}
                onPress={() => setStatusFilter(f.value)}
                activeOpacity={0.75}
              >
                <Text style={[s.chipLabel, active && { color: '#fff' }]}>{f.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* List */}
        {isLoading ? (
          <View style={s.center}>
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
        ) : filtered.length === 0 ? (
          <View style={s.center}>
            <Briefcase size={48} color={theme.text.muted} />
            <Text style={s.empty}>{search || statusFilter ? 'Aucun résultat' : 'Aucun lead'}</Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(l) => l.id}
            renderItem={({ item }) => <LeadCard item={item} theme={theme} />}
            contentContainerStyle={{ padding: 16, gap: 8 }}
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
    chips: { paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
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
