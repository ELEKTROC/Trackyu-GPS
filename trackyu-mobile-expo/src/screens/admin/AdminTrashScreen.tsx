/**
 * TrackYu Mobile — Corbeille Admin
 * Éléments supprimés : utilisateurs, contrats, tenants.
 * Actions : restaurer.
 * Filtres client-side : search texte + plage de dates de suppression.
 */
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ArrowLeft, Trash2, Users, FileText, Building2, RotateCcw, Calendar, X } from 'lucide-react-native';
import { useTheme } from '../../theme';
import { ProtectedScreen } from '../../components/ProtectedScreen';
import { SearchBar } from '../../components/SearchBar';
import { SUPERADMIN_ONLY_ROLES } from '../../constants/roles';
import adminApi, { type TrashUser, type TrashContract, type TrashTenant } from '../../api/adminApi';

type ThemeType = ReturnType<typeof import('../../theme').useTheme>['theme'];
type SubTab = 'all' | 'user' | 'contract' | 'tenant';

const TABS: { key: SubTab; label: string; icon: React.ComponentType<{ size: number; color: string }> }[] = [
  { key: 'all', label: 'Tous', icon: Trash2 },
  { key: 'user', label: 'Utilisateurs', icon: Users },
  { key: 'contract', label: 'Contrats', icon: FileText },
  { key: 'tenant', label: 'Tenants', icon: Building2 },
];

function dateLabel(iso?: string) {
  if (!iso) return '–';
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtShort(d: Date) {
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' });
}

type PickerField = 'from' | 'to' | null;

export default function AdminTrashScreen() {
  const { theme } = useTheme();
  const nav = useNavigation();
  const qc = useQueryClient();
  const [tab, setTab] = useState<SubTab>('all');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState<Date | null>(null);
  const [dateTo, setDateTo] = useState<Date | null>(null);
  const [pickerField, setPickerField] = useState<PickerField>(null);

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['admin-trash'],
    queryFn: adminApi.trash.list,
    staleTime: 30_000,
  });

  const restoreMutation = useMutation({
    mutationFn: ({ entityType, entityId }: { entityType: string; entityId: string }) =>
      adminApi.trash.restore(entityType, entityId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-trash'] }),
    onError: () => Alert.alert('Erreur', 'Impossible de restaurer cet élément.'),
  });

  const handleRestore = (entityType: string, entityId: string, label: string) => {
    Alert.alert('Restaurer', `Restaurer "${label}" ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Restaurer', onPress: () => restoreMutation.mutate({ entityType, entityId }) },
    ]);
  };

  type TrashItem =
    | { kind: 'user'; data: TrashUser }
    | { kind: 'contract'; data: TrashContract }
    | { kind: 'tenant'; data: TrashTenant };

  const allItems: TrashItem[] = useMemo(
    () => [
      ...(data?.users ?? []).map((d) => ({ kind: 'user' as const, data: d })),
      ...(data?.contracts ?? []).map((d) => ({ kind: 'contract' as const, data: d })),
      ...(data?.tenants ?? []).map((d) => ({ kind: 'tenant' as const, data: d })),
    ],
    [data]
  );

  const getSearchText = (item: TrashItem): string => {
    if (item.kind === 'user')
      return [item.data.name, item.data.email, item.data.id, item.data.role].filter(Boolean).join(' ');
    if (item.kind === 'contract')
      return [item.data.contract_number, item.data.client_name, item.data.vehicle_plate, item.data.id]
        .filter(Boolean)
        .join(' ');
    return [item.data.name, item.data.slug, item.data.contact_email, item.data.id].filter(Boolean).join(' ');
  };

  const filtered = useMemo(() => {
    let list = tab === 'all' ? allItems : allItems.filter((i) => i.kind === tab);

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter((i) => getSearchText(i).toLowerCase().includes(q));
    }

    if (dateFrom || dateTo) {
      const from = dateFrom ? new Date(dateFrom) : null;
      if (from) from.setHours(0, 0, 0, 0);
      const to = dateTo ? new Date(dateTo) : null;
      if (to) to.setHours(23, 59, 59, 999);

      list = list.filter((i) => {
        const iso = i.data.deleted_at;
        if (!iso) return false;
        const d = new Date(iso);
        if (from && d < from) return false;
        if (to && d > to) return false;
        return true;
      });
    }

    return list;
  }, [allItems, tab, search, dateFrom, dateTo]);

  const hasDateFilter = dateFrom !== null || dateTo !== null;

  function onPickerChange(_: unknown, selected?: Date) {
    if (Platform.OS === 'android') setPickerField(null);
    if (!selected) return;
    if (pickerField === 'from') setDateFrom(selected);
    if (pickerField === 'to') setDateTo(selected);
  }

  function clearDates() {
    setDateFrom(null);
    setDateTo(null);
  }

  const renderItem = ({ item }: { item: TrashItem }) => {
    let label = '';
    let sub = '';
    let deletedAt = '';

    if (item.kind === 'user') {
      label = item.data.name ?? item.data.email ?? item.data.id;
      sub = item.data.role ?? 'Utilisateur';
      deletedAt = item.data.deleted_at ?? '';
    } else if (item.kind === 'contract') {
      label = item.data.contract_number ?? item.data.id;
      sub = item.data.client_name ?? item.data.vehicle_plate ?? 'Contrat';
      deletedAt = item.data.deleted_at ?? '';
    } else {
      label = item.data.name ?? item.data.slug ?? item.data.id;
      sub = item.data.contact_email ?? 'Tenant';
      deletedAt = item.data.deleted_at ?? '';
    }

    const Icon = item.kind === 'user' ? Users : item.kind === 'contract' ? FileText : Building2;
    const color = item.kind === 'user' ? '#3B82F6' : item.kind === 'contract' ? '#22C55E' : '#8B5CF6';

    return (
      <View style={row(theme).wrap}>
        <View style={[row(theme).icon, { backgroundColor: color + '18' }]}>
          <Icon size={18} color={color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={row(theme).label} numberOfLines={1}>
            {label}
          </Text>
          <Text style={row(theme).sub} numberOfLines={1}>
            {sub} · Supprimé le {dateLabel(deletedAt)}
          </Text>
        </View>
        <TouchableOpacity
          style={row(theme).restoreBtn}
          onPress={() => handleRestore(item.kind, item.data.id, label)}
          disabled={restoreMutation.isPending}
          accessibilityLabel={`Restaurer ${label}`}
          accessibilityRole="button"
        >
          <RotateCcw size={16} color={theme.primary} />
        </TouchableOpacity>
      </View>
    );
  };

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
            <Text style={s(theme).title}>Corbeille</Text>
            {data && (
              <Text style={s(theme).subtitle}>
                {data.totals.total} élément{data.totals.total !== 1 ? 's' : ''}
              </Text>
            )}
          </View>
        </View>

        <SearchBar value={search} onChangeText={setSearch} placeholder="Rechercher nom, email, numéro…" />

        {/* Date range row */}
        <View style={s(theme).dateRow}>
          <Calendar size={14} color={theme.text.muted} />
          <TouchableOpacity
            style={[s(theme).datePill, dateFrom && { borderColor: theme.primary }]}
            onPress={() => setPickerField('from')}
            accessibilityLabel="Supprimé depuis"
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
            accessibilityLabel="Supprimé jusqu'à"
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

        {/* Sub-tabs */}
        <View style={s(theme).tabs}>
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                style={[s(theme).tabBtn, active && { backgroundColor: theme.primary, borderColor: theme.primary }]}
                onPress={() => setTab(t.key)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text style={[s(theme).tabLabel, active && { color: '#fff' }]}>{t.label}</Text>
                {data && t.key !== 'all' && (
                  <Text style={[s(theme).tabCount, active && { color: 'rgba(255,255,255,0.75)' }]}>
                    {t.key === 'user'
                      ? data.totals.users
                      : t.key === 'contract'
                        ? data.totals.contracts
                        : data.totals.tenants}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {isLoading ? (
          <View style={s(theme).center}>
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
        ) : filtered.length === 0 ? (
          <View style={s(theme).center}>
            <Trash2 size={48} color={theme.text.muted} />
            <Text style={s(theme).empty}>Corbeille vide</Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(i) => `${i.kind}-${i.data.id}`}
            renderItem={renderItem}
            contentContainerStyle={{ padding: 16, gap: 8 }}
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
    tabs: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 12, flexWrap: 'wrap' },
    tabBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: theme.bg.surface,
    },
    tabLabel: { fontSize: 12, fontWeight: '600', color: theme.text.secondary },
    tabCount: { fontSize: 11, color: theme.text.muted },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
    empty: { fontSize: 14, color: theme.text.muted },
  });

const row = (theme: ThemeType) =>
  StyleSheet.create({
    wrap: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.bg.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 12,
      gap: 12,
    },
    icon: { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    label: { fontSize: 14, fontWeight: '600', color: theme.text.primary },
    sub: { fontSize: 11, color: theme.text.muted, marginTop: 2 },
    restoreBtn: { padding: 8, borderRadius: 8, backgroundColor: theme.primaryDim },
  });
