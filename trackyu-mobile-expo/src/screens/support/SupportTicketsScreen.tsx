/**
 * TrackYu Mobile — Support Tickets Screen
 * Liste tous les tickets du tenant avec filtres par statut.
 * Requiert VIEW_TICKETS (via VIEW_SUPPORT ou MANAGE_TICKETS — SUPPORT_AGENT les a).
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
import { TicketCheck, ChevronRight, SlidersHorizontal } from 'lucide-react-native';
import { useTheme } from '../../theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import ticketsApi, { type Ticket, type TicketStatus } from '../../api/tickets';
import {
  TICKET_STATUS_COLORS,
  TICKET_STATUS_LABELS,
  TICKET_PRIORITY_COLORS,
  TICKET_PRIORITY_LABELS,
} from '../../utils/portalColors';
import type { RootStackParamList } from '../../navigation/types';
import { SearchBar } from '../../components/SearchBar';
import { VehicleFilterPanel, type FilterBlockDef } from '../../components/VehicleFilterPanel';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type ThemeType = ReturnType<typeof import('../../theme').useTheme>['theme'];

const FILTERS: { label: string; value: TicketStatus; color: string }[] = [
  { label: 'Ouverts', value: 'OPEN', color: '#3B82F6' },
  { label: 'En cours', value: 'IN_PROGRESS', color: '#F97316' },
  { label: 'En attente', value: 'WAITING_CLIENT', color: '#8B5CF6' },
  { label: 'Résolus', value: 'RESOLVED', color: '#22C55E' },
  { label: 'Fermés', value: 'CLOSED', color: '#6B7280' },
];

function TicketCard({ item, theme, onPress }: { item: Ticket; theme: ThemeType; onPress: () => void }) {
  const statusColor = TICKET_STATUS_COLORS[item.status] ?? '#6B7280';
  const priorityColor = TICKET_PRIORITY_COLORS[item.priority] ?? '#6B7280';
  const s = cardStyles(theme);

  return (
    <TouchableOpacity
      style={[s.card, { borderLeftColor: statusColor }]}
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityLabel={`Ticket : ${item.subject} — ${TICKET_STATUS_LABELS[item.status] ?? item.status} — priorité ${TICKET_PRIORITY_LABELS[item.priority] ?? item.priority}`}
      accessibilityRole="button"
    >
      <View style={s.body}>
        <View style={s.headerRow}>
          <Text style={s.subject} numberOfLines={1}>
            {item.subject}
          </Text>
          <ChevronRight size={15} color={theme.text.muted} />
        </View>
        <View style={s.badges}>
          <View
            style={{
              backgroundColor: statusColor + '22',
              borderRadius: 5,
              paddingHorizontal: 7,
              paddingVertical: 3,
              borderWidth: 1,
              borderColor: statusColor + '55',
            }}
          >
            <Text style={{ color: statusColor, fontSize: 10, fontWeight: '600' }}>
              {TICKET_STATUS_LABELS[item.status] ?? item.status}
            </Text>
          </View>
          <View
            style={{
              backgroundColor: priorityColor + '22',
              borderRadius: 5,
              paddingHorizontal: 7,
              paddingVertical: 3,
              borderWidth: 1,
              borderColor: priorityColor + '55',
            }}
          >
            <Text style={{ color: priorityColor, fontSize: 10, fontWeight: '600' }}>
              {TICKET_PRIORITY_LABELS[item.priority] ?? item.priority}
            </Text>
          </View>
          {item.category ? (
            <View
              style={{ backgroundColor: theme.bg.elevated, borderRadius: 5, paddingHorizontal: 7, paddingVertical: 3 }}
            >
              <Text style={{ color: theme.text.muted, fontSize: 10 }}>{item.category}</Text>
            </View>
          ) : null}
        </View>
        <View style={s.metaRow}>
          {item.reseller_name ? (
            <Text style={s.metaReseller} numberOfLines={1}>
              {item.reseller_name}
            </Text>
          ) : null}
          {item.client_name ? (
            <Text style={s.meta} numberOfLines={1}>
              {item.client_name}
            </Text>
          ) : null}
          {item.assigned_user_name ? (
            <Text style={s.meta} numberOfLines={1}>
              → {item.assigned_user_name}
            </Text>
          ) : null}
          <Text style={s.metaDate}>
            {new Date(item.updated_at).toLocaleDateString('fr-FR', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
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
    body: { padding: 12, gap: 6 },
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    subject: { flex: 1, fontSize: 14, fontWeight: '600', color: theme.text.primary },
    badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
    metaReseller: {
      fontSize: 10,
      color: theme.text.muted,
      backgroundColor: theme.bg.elevated,
      paddingHorizontal: 5,
      paddingVertical: 1,
      borderRadius: 4,
    },
    meta: { fontSize: 11, color: theme.text.secondary },
    metaDate: { fontSize: 11, color: theme.text.muted, marginLeft: 'auto' },
  });

// ── Main ──────────────────────────────────────────────────────────────────────

export default function SupportTicketsScreen() {
  const { theme } = useTheme();
  const s = styles(theme);
  const nav = useNavigation<Nav>();

  const [statusFilter, setStatusFilter] = useState<TicketStatus | null>(null);
  const [search, setSearch] = useState('');
  const [resellerFilter, setResellerFilter] = useState<string | null>(null);
  const [clientFilter, setClientFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['support-tickets', statusFilter],
    queryFn: () => ticketsApi.getAll(statusFilter ? { status: statusFilter } : undefined),
    refetchInterval: 60000,
  });

  const allTickets = data?.data ?? [];

  // Listes dérivées pour VehicleFilterPanel
  const uniqueResellers = useMemo(
    () =>
      [...new Set(allTickets.map((t) => t.reseller_name).filter(Boolean) as string[])]
        .sort()
        .map((n) => ({ id: n, label: n })),
    [allTickets]
  );

  const uniqueClients = useMemo(() => {
    const pool = resellerFilter ? allTickets.filter((t) => t.reseller_name === resellerFilter) : allTickets;
    return [...new Set(pool.map((t) => t.client_name).filter(Boolean) as string[])]
      .sort()
      .map((n) => ({ id: n, label: n }));
  }, [allTickets, resellerFilter]);

  const uniqueCategories = useMemo(
    () =>
      [...new Set(allTickets.map((t) => t.category).filter(Boolean) as string[])]
        .sort()
        .map((n) => ({ id: n, label: n })),
    [allTickets]
  );

  const filterBlocks: FilterBlockDef[] = [
    {
      key: 'reseller',
      label: 'Revendeur',
      items: uniqueResellers,
      selected: resellerFilter,
      onSelect: (v) => {
        setResellerFilter(v);
        setClientFilter(null);
      },
    },
    { key: 'client', label: 'Client', items: uniqueClients, selected: clientFilter, onSelect: setClientFilter },
    {
      key: 'category',
      label: 'Catégorie',
      items: uniqueCategories,
      selected: categoryFilter,
      onSelect: setCategoryFilter,
    },
  ];

  const hasActiveFilters = !!(resellerFilter || clientFilter || categoryFilter);

  const tickets = useMemo(() => {
    let list = allTickets;
    if (resellerFilter) list = list.filter((t) => t.reseller_name === resellerFilter);
    if (clientFilter) list = list.filter((t) => t.client_name === clientFilter);
    if (categoryFilter) list = list.filter((t) => t.category === categoryFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          t.subject?.toLowerCase().includes(q) ||
          t.client_name?.toLowerCase().includes(q) ||
          t.assigned_user_name?.toLowerCase().includes(q) ||
          t.category?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [allTickets, resellerFilter, clientFilter, categoryFilter, search]);

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.title}>Tickets Support</Text>
          {data ? (
            <Text style={s.subtitle}>
              {data.total} ticket{data.total > 1 ? 's' : ''}
            </Text>
          ) : null}
        </View>
      </View>

      {/* Recherche + bouton filtre */}
      <View style={s.searchRow}>
        <View style={{ flex: 1 }}>
          <SearchBar value={search} onChangeText={setSearch} placeholder="Rechercher sujet, client…" />
        </View>
        <TouchableOpacity
          style={[
            s.filterBtn,
            (showFilters || hasActiveFilters) && { backgroundColor: theme.primary, borderColor: theme.primary },
          ]}
          onPress={() => setShowFilters((v) => !v)}
          accessibilityLabel="Filtres avancés"
          accessibilityRole="button"
        >
          <SlidersHorizontal size={16} color={showFilters || hasActiveFilters ? '#fff' : theme.text.secondary} />
          {hasActiveFilters && <View style={s.filterDot} />}
        </TouchableOpacity>
      </View>

      {/* VehicleFilterPanel */}
      <View style={{ paddingHorizontal: 16, paddingBottom: showFilters ? 8 : 0 }}>
        <VehicleFilterPanel
          visible={showFilters}
          blocks={filterBlocks}
          hasActiveFilters={hasActiveFilters}
          onReset={() => {
            setResellerFilter(null);
            setClientFilter(null);
            setCategoryFilter(null);
          }}
        />
      </View>

      {/* Filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
        {FILTERS.map((f) => {
          const active = statusFilter === f.value;
          return (
            <TouchableOpacity
              key={f.label}
              style={[
                s.chip,
                active ? { backgroundColor: f.color, borderColor: f.color } : { borderColor: f.color + '66' },
              ]}
              onPress={() => setStatusFilter(active ? null : f.value)}
              activeOpacity={0.75}
              accessibilityLabel={`Filtrer par ${f.label}`}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={[s.chipLabel, active ? { color: '#fff' } : { color: f.color }]}>{f.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {isLoading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : tickets.length === 0 ? (
        <View style={s.center}>
          <TicketCheck size={48} color={theme.text.muted} />
          <Text style={s.empty}>
            Aucun ticket
            {statusFilter ? ` ${(TICKET_STATUS_LABELS[statusFilter] ?? '').toLowerCase()}` : ''}
          </Text>
        </View>
      ) : (
        <FlatList
          data={tickets}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => (
            <TicketCard
              item={item}
              theme={theme}
              onPress={() =>
                nav.navigate('SupportTicketDetail', {
                  ticketId: item.id,
                  subject: item.subject,
                })
              }
            />
          )}
          contentContainerStyle={{ padding: 16, gap: 8 }}
          initialNumToRender={20}
          maxToRenderPerBatch={20}
          windowSize={5}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme.primary} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = (theme: ThemeType) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg.primary },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      paddingTop: 12,
      paddingHorizontal: 16,
      paddingBottom: 12,
    },
    title: { fontSize: 22, fontWeight: '700', color: theme.text.primary },
    subtitle: { fontSize: 12, color: theme.text.muted, marginTop: 2 },
    searchRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
    filterBtn: {
      width: 40,
      height: 40,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.bg.surface,
      justifyContent: 'center',
      alignItems: 'center',
    },
    filterDot: {
      position: 'absolute',
      top: 6,
      right: 6,
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: '#EF4444',
      borderWidth: 1.5,
      borderColor: theme.bg.surface,
    },
    chips: { paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
    chip: {
      borderWidth: 1.5,
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: 'transparent',
    },
    chipLabel: { fontSize: 12, fontWeight: '600' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
    empty: { fontSize: 14, color: theme.text.muted },
  });
