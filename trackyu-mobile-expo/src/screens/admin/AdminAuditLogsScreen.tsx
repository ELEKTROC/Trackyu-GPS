/**
 * TrackYu Mobile — Journal d'Audit
 * Timeline des actions : connexions, modifications, suppressions.
 * Filtres : action, recherche texte, plage de dates (from/to).
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
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useInfiniteQuery } from '@tanstack/react-query';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  ArrowLeft,
  Activity,
  LogIn,
  LogOut,
  Edit2,
  Trash2,
  Plus,
  Shield,
  User,
  Key,
  ChevronDown,
  ChevronUp,
  Calendar,
  X,
} from 'lucide-react-native';
import { useTheme } from '../../theme';
import { SearchBar } from '../../components/SearchBar';
import { ProtectedScreen } from '../../components/ProtectedScreen';
import { EmptyState } from '../../components/EmptyState';
import { SUPERADMIN_ONLY_ROLES } from '../../constants/roles';
import adminApi, { type AuditLog } from '../../api/adminApi';

type ThemeType = ReturnType<typeof import('../../theme').useTheme>['theme'];

const ACTION_META: Record<
  string,
  { icon: React.ComponentType<{ size: number; color: string }>; color: string; label: string }
> = {
  LOGIN: { icon: LogIn, color: '#22C55E', label: 'Connexion' },
  LOGOUT: { icon: LogOut, color: '#6B7280', label: 'Déconnexion' },
  CREATE: { icon: Plus, color: '#3B82F6', label: 'Création' },
  UPDATE: { icon: Edit2, color: '#F59E0B', label: 'Modification' },
  DELETE: { icon: Trash2, color: '#EF4444', label: 'Suppression' },
  RESTORE: { icon: Shield, color: '#8B5CF6', label: 'Restauration' },
  IMPERSONATE: { icon: User, color: '#EC4899', label: 'Impersonation' },
  PERMISSION: { icon: Key, color: '#06B6D4', label: 'Permission' },
};

function getActionMeta(action?: string) {
  if (!action) return { icon: Activity, color: '#6B7280', label: action ?? 'Action' };
  const upper = action.toUpperCase();
  for (const key of Object.keys(ACTION_META)) {
    if (upper.includes(key)) return ACTION_META[key];
  }
  return { icon: Activity, color: '#6B7280', label: action };
}

function fmtDate(iso?: string) {
  if (!iso) return '–';
  const d = new Date(iso);
  return (
    d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) +
    ' ' +
    d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  );
}

function fmtShort(d: Date) {
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' });
}

// ── LogRow ────────────────────────────────────────────────────────────────────

function LogRow({ item, theme }: { item: AuditLog; theme: ThemeType }) {
  const [expanded, setExpanded] = useState(false);
  const ts = item.created_at ?? item.timestamp;
  const { icon: Icon, color, label } = getActionMeta(item.action);
  const hasDetails = item.details && Object.keys(item.details).length > 0;

  return (
    <TouchableOpacity
      style={row(theme).wrap}
      onPress={() => hasDetails && setExpanded((e) => !e)}
      activeOpacity={hasDetails ? 0.75 : 1}
      accessibilityRole={hasDetails ? 'button' : 'none'}
      accessibilityLabel={`${label} par ${item.user_name ?? item.user_email ?? '–'}`}
    >
      <View style={[row(theme).dot, { backgroundColor: color }]} />
      <View style={[row(theme).iconWrap, { backgroundColor: color + '18' }]}>
        <Icon size={16} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={[row(theme).action, { color }]}>{label}</Text>
          {item.entity_type ? (
            <View style={[row(theme).entityBadge, { backgroundColor: theme.bg.elevated }]}>
              <Text style={row(theme).entityText}>{item.entity_type}</Text>
            </View>
          ) : null}
        </View>
        <Text style={row(theme).user} numberOfLines={1}>
          {item.user_name ?? item.user_email ?? 'Système'}
          {item.user_role ? ` · ${item.user_role}` : ''}
        </Text>
        {item.ip_address ? <Text style={row(theme).meta}>{item.ip_address}</Text> : null}
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <Text style={row(theme).date}>{fmtDate(ts)}</Text>
        {hasDetails ? (
          expanded ? (
            <ChevronUp size={14} color={theme.text.muted} />
          ) : (
            <ChevronDown size={14} color={theme.text.muted} />
          )
        ) : null}
      </View>
      {expanded && hasDetails && (
        <View style={[row(theme).details, { borderTopColor: theme.border }]}>
          <Text style={row(theme).detailsText} numberOfLines={10}>
            {JSON.stringify(item.details, null, 2)}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const row = (theme: ThemeType) =>
  StyleSheet.create({
    wrap: {
      backgroundColor: theme.bg.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 12,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      flexWrap: 'wrap',
    },
    dot: { width: 6, height: 6, borderRadius: 3, marginTop: 7 },
    iconWrap: { width: 34, height: 34, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
    action: { fontSize: 13, fontWeight: '700' },
    entityBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    entityText: { fontSize: 10, color: theme.text.muted, fontWeight: '500' },
    user: { fontSize: 11, color: theme.text.secondary, marginTop: 3 },
    meta: { fontSize: 10, color: theme.text.muted, marginTop: 2 },
    date: { fontSize: 10, color: theme.text.muted },
    details: { width: '100%', marginTop: 8, paddingTop: 8, borderTopWidth: 1 },
    detailsText: { fontSize: 10, color: theme.text.secondary, fontFamily: 'monospace' },
  });

// ── Constants ─────────────────────────────────────────────────────────────────

const FILTERS = ['Tout', 'LOGIN', 'CREATE', 'UPDATE', 'DELETE'] as const;
const ENTITY_FILTERS = [
  'Tout',
  'user',
  'contract',
  'invoice',
  'quote',
  'payment',
  'vehicle',
  'tier',
  'device',
] as const;
const PAGE_SIZE = 100;
type PickerField = 'from' | 'to' | null;

// ── Main screen ───────────────────────────────────────────────────────────────

export default function AdminAuditLogsScreen() {
  const { theme } = useTheme();
  const nav = useNavigation();
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('Tout');
  const [entityFilter, setEntityFilter] = useState<string>('Tout');
  const [dateFrom, setDateFrom] = useState<Date | null>(null);
  const [dateTo, setDateTo] = useState<Date | null>(null);
  const [pickerField, setPickerField] = useState<PickerField>(null);

  // Filtres serveur (action, entity_type, from, to) → pagination propre
  // Search reste client-side (pas de support texte fuzzy côté API)
  const { data, isLoading, isRefetching, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: [
      'admin-audit-logs',
      actionFilter,
      entityFilter,
      dateFrom?.toISOString() ?? null,
      dateTo?.toISOString() ?? null,
    ],
    queryFn: ({ pageParam }) =>
      adminApi.auditLogs.list({
        limit: PAGE_SIZE,
        offset: (pageParam as number) ?? 0,
        action: actionFilter !== 'Tout' ? actionFilter : undefined,
        entity_type: entityFilter !== 'Tout' ? entityFilter : undefined,
        from: dateFrom
          ? (() => {
              const d = new Date(dateFrom);
              d.setHours(0, 0, 0, 0);
              return d.toISOString();
            })()
          : undefined,
        to: dateTo
          ? (() => {
              const d = new Date(dateTo);
              d.setHours(23, 59, 59, 999);
              return d.toISOString();
            })()
          : undefined,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => (lastPage.length === PAGE_SIZE ? allPages.length * PAGE_SIZE : undefined),
    staleTime: 60_000,
  });

  const allLogs = useMemo(() => data?.pages.flat() ?? [], [data]);

  const filtered = useMemo(
    () =>
      allLogs.filter((log) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return [log.user_name, log.user_email, log.action, log.entity_type].some((v) => v?.toLowerCase().includes(q));
      }),
    [allLogs, search]
  );

  const hasDateFilter = dateFrom !== null || dateTo !== null;

  function onPickerChange(_: unknown, selected?: Date) {
    if (Platform.OS === 'android') setPickerField(null); // auto-close on Android
    if (!selected) return;
    if (pickerField === 'from') setDateFrom(selected);
    if (pickerField === 'to') setDateTo(selected);
  }

  function clearDates() {
    setDateFrom(null);
    setDateTo(null);
  }

  return (
    <ProtectedScreen allowedRoles={SUPERADMIN_ONLY_ROLES}>
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
            <Text style={s(theme).title}>Journal d'audit</Text>
            {!isLoading && (
              <Text style={s(theme).subtitle}>
                {filtered.length} événement{filtered.length !== 1 ? 's' : ''}
              </Text>
            )}
          </View>
        </View>

        <SearchBar value={search} onChangeText={setSearch} placeholder="Rechercher utilisateur, action…" />

        {/* Date range row */}
        <View style={s(theme).dateRow}>
          <Calendar size={14} color={theme.text.muted} />
          <TouchableOpacity
            style={[s(theme).datePill, dateFrom && { borderColor: theme.primary }]}
            onPress={() => setPickerField('from')}
            accessibilityLabel="Date de début"
            accessibilityRole="button"
          >
            <Text style={[s(theme).datePillLabel, dateFrom && { color: theme.primary }]}>
              {dateFrom ? fmtShort(dateFrom) : 'Du…'}
            </Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 12, color: theme.text.muted }}>→</Text>
          <TouchableOpacity
            style={[s(theme).datePill, dateTo && { borderColor: theme.primary }]}
            onPress={() => setPickerField('to')}
            accessibilityLabel="Date de fin"
            accessibilityRole="button"
          >
            <Text style={[s(theme).datePillLabel, dateTo && { color: theme.primary }]}>
              {dateTo ? fmtShort(dateTo) : 'Au…'}
            </Text>
          </TouchableOpacity>
          {hasDateFilter && (
            <TouchableOpacity
              onPress={clearDates}
              style={s(theme).clearBtn}
              accessibilityLabel="Effacer dates"
              accessibilityRole="button"
            >
              <X size={14} color={theme.text.muted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Action filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s(theme).chips}>
          {FILTERS.map((f) => {
            const active = actionFilter === f;
            return (
              <TouchableOpacity
                key={f}
                style={[s(theme).chip, active && { backgroundColor: theme.primary, borderColor: theme.primary }]}
                onPress={() => setActionFilter(f)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text style={[s(theme).chipLabel, active && { color: '#fff' }]}>{f}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Entity type filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s(theme).chips}>
          {ENTITY_FILTERS.map((f) => {
            const active = entityFilter === f;
            return (
              <TouchableOpacity
                key={f}
                style={[s(theme).chip, active && { backgroundColor: theme.primary, borderColor: theme.primary }]}
                onPress={() => setEntityFilter(f)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text style={[s(theme).chipLabel, active && { color: '#fff' }]}>{f}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* List */}
        {isLoading ? (
          <View style={s(theme).center}>
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
        ) : filtered.length === 0 ? (
          <View style={s(theme).center}>
            <EmptyState
              icon={<Activity size={48} color={theme.text.muted} />}
              title="Aucun événement"
              subtitle="Aucun log ne correspond aux filtres ou à la période"
            />
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(i) => i.id}
            renderItem={({ item }) => <LogRow item={item} theme={theme} />}
            contentContainerStyle={{ padding: 16, gap: 8 }}
            initialNumToRender={25}
            maxToRenderPerBatch={25}
            windowSize={5}
            removeClippedSubviews={true}
            onEndReachedThreshold={0.3}
            onEndReached={() => {
              if (hasNextPage && !isFetchingNextPage) fetchNextPage();
            }}
            ListFooterComponent={
              isFetchingNextPage ? (
                <View style={{ paddingVertical: 16 }}>
                  <ActivityIndicator color={theme.primary} />
                </View>
              ) : null
            }
            refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme.primary} />}
          />
        )}

        {/* Native date picker */}
        {pickerField !== null && (
          <DateTimePicker
            value={
              pickerField === 'from'
                ? (dateFrom ?? new Date())
                : pickerField === 'to'
                  ? (dateTo ?? new Date())
                  : new Date()
            }
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            minimumDate={pickerField === 'to' && dateFrom ? dateFrom : undefined}
            maximumDate={pickerField === 'from' && dateTo ? dateTo : new Date()}
            onChange={onPickerChange}
            onTouchCancel={() => setPickerField(null)}
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
    dateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 8,
      gap: 8,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    datePill: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 16,
      paddingHorizontal: 10,
      paddingVertical: 5,
      backgroundColor: theme.bg.surface,
    },
    datePillLabel: { fontSize: 12, fontWeight: '500', color: theme.text.secondary },
    clearBtn: { padding: 4 },
    chips: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
    chip: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: theme.bg.surface,
    },
    chipLabel: { fontSize: 12, fontWeight: '600', color: theme.text.secondary },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  });
