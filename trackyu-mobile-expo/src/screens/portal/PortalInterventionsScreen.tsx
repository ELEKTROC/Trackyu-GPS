/**
 * TrackYu Mobile — Mes Interventions (Portal CLIENT)
 */
import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Wrench, ChevronRight, Car, CalendarClock, Clock, MapPin, CheckCircle2 } from 'lucide-react-native';
import { useTheme } from '../../theme';
import { portalApi, type PortalIntervention } from '../../api/portal';
import { SkeletonInterventionCard } from '../../components/SkeletonBox';
import type { PortalStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<PortalStackParamList>;

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'À planifier', color: '#F59E0B' },
  SCHEDULED: { label: 'Planifié', color: '#3B82F6' },
  EN_ROUTE: { label: 'En route', color: '#8B5CF6' },
  IN_PROGRESS: { label: 'En cours', color: '#06B6D4' },
  COMPLETED: { label: 'Terminé', color: '#22C55E' },
  CANCELLED: { label: 'Annulé', color: '#EF4444' },
  POSTPONED: { label: 'Reportée', color: '#F97316' },
};

const FILTER_TABS = [
  { key: 'ALL', label: 'Tous' },
  { key: 'ACTIVE', label: 'En cours' },
  { key: 'COMPLETED', label: 'Terminé' },
  { key: 'CANCELLED', label: 'Annulé' },
] as const;
type FilterKey = (typeof FILTER_TABS)[number]['key'];

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function isActive(status: string) {
  return ['PENDING', 'SCHEDULED', 'EN_ROUTE', 'IN_PROGRESS'].includes(status);
}

// ── InterventionCard ──────────────────────────────────────────────────────────

function InterventionCard({ item, onPress }: { item: PortalIntervention; onPress: () => void }) {
  const { theme } = useTheme();
  const cfg = STATUS_CONFIG[item.status] ?? { label: item.status, color: '#6B7280' };
  const plate = item.license_plate ?? item.vehicle_name ?? '—';
  const vehicleLabel = [item.vehicle_brand, item.vehicle_model].filter(Boolean).join(' ') || null;

  return (
    <TouchableOpacity
      style={[card.root, { borderColor: theme.border, backgroundColor: theme.bg.surface }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      {/* Barre statut */}
      <View style={[card.bar, { backgroundColor: cfg.color }]} />

      <View style={card.body}>
        {/* Header */}
        <View style={card.row}>
          <View style={card.titleWrap}>
            <Text style={[card.id, { color: theme.text.muted }]}>{item.id}</Text>
            <Text style={[card.nature, { color: theme.text.primary }]}>{item.nature}</Text>
          </View>
          <View style={[card.badge, { backgroundColor: cfg.color + '22' }]}>
            <Text style={[card.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
        </View>

        {/* Véhicule */}
        {plate !== '—' && (
          <View style={card.infoRow}>
            <Car size={13} color={theme.text.muted} />
            <Text style={[card.infoText, { color: theme.text.secondary }]}>
              {plate}
              {vehicleLabel ? ` · ${vehicleLabel}` : ''}
            </Text>
          </View>
        )}

        {/* Date + lieu */}
        <View style={card.infoRow}>
          <CalendarClock size={13} color={theme.text.muted} />
          <Text style={[card.infoText, { color: theme.text.muted }]}>{fmtDate(item.scheduled_date)}</Text>
          {item.location ? (
            <>
              <Text style={[card.infoText, { color: theme.text.muted }]}> · </Text>
              <MapPin size={12} color={theme.text.muted} />
              <Text style={[card.infoText, { color: theme.text.muted }]} numberOfLines={1}>
                {item.location}
              </Text>
            </>
          ) : null}
        </View>

        {/* Technicien + durée */}
        <View style={card.footer}>
          <View style={card.infoRow}>
            <Wrench size={12} color={theme.text.muted} />
            <Text style={[card.infoText, { color: theme.text.muted }]}>
              {item.technician_name ?? 'Technicien assigné'}
            </Text>
          </View>
          {item.status === 'COMPLETED' && (
            <View style={card.infoRow}>
              <CheckCircle2 size={12} color="#22C55E" />
              {item.duration ? (
                <>
                  <Clock size={12} color={theme.text.muted} />
                  <Text style={[card.infoText, { color: theme.text.muted }]}>
                    {item.duration >= 60
                      ? `${Math.floor(item.duration / 60)}h${String(item.duration % 60).padStart(2, '0')}`
                      : `${item.duration} min`}
                  </Text>
                </>
              ) : null}
            </View>
          )}
          <ChevronRight size={16} color={theme.text.muted} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const card = StyleSheet.create({
  root: { flexDirection: 'row', borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  bar: { width: 4 },
  body: { flex: 1, padding: 12, gap: 7 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  titleWrap: { flex: 1 },
  id: { fontSize: 10, fontFamily: 'monospace', marginBottom: 2 },
  nature: { fontSize: 14, fontWeight: '700' },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  badgeText: { fontSize: 10, fontWeight: '700' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  infoText: { fontSize: 12, flex: 1 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
});

// ── Main ──────────────────────────────────────────────────────────────────────

export default function PortalInterventionsScreen() {
  const { theme } = useTheme();
  const s = styles(theme);
  const nav = useNavigation<Nav>();
  const [filter, setFilter] = useState<FilterKey>('ALL');

  const {
    data = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery<PortalIntervention[]>({
    queryKey: ['portal-interventions'],
    queryFn: () => portalApi.getMyInterventions(),
  });

  const filtered = data.filter((i) => {
    if (filter === 'ALL') return true;
    if (filter === 'ACTIVE') return isActive(i.status);
    if (filter === 'COMPLETED') return i.status === 'COMPLETED';
    if (filter === 'CANCELLED') return i.status === 'CANCELLED' || i.status === 'POSTPONED';
    return true;
  });

  const completedCount = data.filter((i) => i.status === 'COMPLETED').length;
  const activeCount = data.filter((i) => isActive(i.status)).length;

  return (
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
          <Text style={s.title}>Mes Interventions</Text>
          {data.length > 0 && (
            <Text style={s.subtitle}>
              {activeCount > 0 ? `${activeCount} en cours · ` : ''}
              {completedCount} terminée{completedCount > 1 ? 's' : ''}
            </Text>
          )}
        </View>
      </View>

      {/* Filter chips */}
      <View style={s.filterRow}>
        {FILTER_TABS.map((tab) => {
          const active = filter === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[s.chip, active && { backgroundColor: theme.primary, borderColor: theme.primary }]}
              onPress={() => setFilter(tab.key)}
            >
              <Text style={[s.chipText, active && { color: theme.text.onPrimary }]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {isLoading ? (
        <View style={s.list}>
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonInterventionCard key={i} />
          ))}
        </View>
      ) : filtered.length === 0 ? (
        <View style={s.center}>
          <Wrench size={48} color={theme.text.muted} />
          <Text style={s.empty}>
            {data.length === 0 ? 'Aucune intervention enregistrée' : 'Aucune intervention dans cette catégorie'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => (
            <InterventionCard
              item={item}
              onPress={() => nav.navigate('PortalInterventionDetail', { interventionId: item.id })}
            />
          )}
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme.primary} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = (theme: ReturnType<typeof useTheme>['theme']) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg.primary },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingTop: 12,
      paddingBottom: 12,
      paddingHorizontal: 16,
      gap: 12,
    },
    backBtn: { padding: 6 },
    title: { fontSize: 20, fontWeight: '700', color: theme.text.primary },
    subtitle: { fontSize: 12, color: theme.text.muted, marginTop: 2 },
    filterRow: {
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 16,
      paddingBottom: 12,
    },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.bg.surface,
    },
    chipText: { fontSize: 12, fontWeight: '600', color: theme.text.secondary },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
    empty: { fontSize: 14, color: theme.text.muted, textAlign: 'center', paddingHorizontal: 32 },
    list: { padding: 16, gap: 10, paddingBottom: 40 },
  });
