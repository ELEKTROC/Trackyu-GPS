/**
 * TrackYu Mobile — Geofences Screen
 * Liste des zones géographiques (consultation)
 */
import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Circle, Hexagon, Route, MapPin, ToggleLeft, ToggleRight } from 'lucide-react-native';
import type { RootStackParamList } from '../../navigation/types';
import geofencesApi, { type Geofence, type GeofenceType, isCircle, toLatLng } from '../../api/geofencesApi';
import { useTheme } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Geofences'>;

type FilterType = 'ALL' | GeofenceType;

const TYPE_CONFIG: Record<GeofenceType, { label: string; icon: (c: string) => React.ReactNode }> = {
  CIRCLE: { label: 'Cercle', icon: (c) => <Circle size={14} color={c} /> },
  POLYGON: { label: 'Polygone', icon: (c) => <Hexagon size={14} color={c} /> },
  ROUTE: { label: 'Route', icon: (c) => <Route size={14} color={c} /> },
};

const FILTERS: { label: string; value: FilterType }[] = [
  { label: 'Toutes', value: 'ALL' },
  { label: 'Cercle', value: 'CIRCLE' },
  { label: 'Polygone', value: 'POLYGON' },
  { label: 'Route', value: 'ROUTE' },
];

function formatRadius(meters: number): string {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`;
}

function GeofenceCard({ item, theme }: { item: Geofence; theme: ReturnType<typeof useTheme>['theme'] }) {
  const cfg = TYPE_CONFIG[item.type];
  const color = item.color ?? '#6366F1';
  const [expanded, setExpanded] = useState(false);

  const detail = useMemo(() => {
    if (isCircle(item)) {
      const c = item.coordinates;
      return `Centre : ${c.center.lat.toFixed(5)}, ${c.center.lng.toFixed(5)}\nRayon : ${formatRadius(c.radius)}`;
    }
    const pts = toLatLng(item.coordinates as { lat: number; lng: number }[]);
    return `${pts.length} point${pts.length > 1 ? 's' : ''}`;
  }, [item]);

  return (
    <TouchableOpacity
      style={[s.card, { borderColor: theme.border, backgroundColor: theme.bg.surface }]}
      onPress={() => setExpanded((v) => !v)}
      activeOpacity={0.8}
    >
      {/* Bande couleur gauche */}
      <View style={[s.colorBar, { backgroundColor: color }]} />

      <View style={{ flex: 1, padding: 12, gap: 6 }}>
        {/* Ligne principale */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={[s.typeIcon, { backgroundColor: color + '22' }]}>{cfg.icon(color)}</View>
          <Text style={[s.name, { color: theme.text.primary }]} numberOfLines={1}>
            {item.name}
          </Text>
          <View
            style={[
              s.badge,
              {
                backgroundColor: item.is_active ? '#22C55E22' : theme.bg.elevated,
                borderColor: item.is_active ? '#22C55E' : theme.border,
              },
            ]}
          >
            {item.is_active ? (
              <ToggleRight size={11} color="#22C55E" />
            ) : (
              <ToggleLeft size={11} color={theme.text.muted} />
            )}
            <Text style={[s.badgeText, { color: item.is_active ? '#22C55E' : theme.text.muted }]}>
              {item.is_active ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>

        {/* Type */}
        <Text style={[s.typeLine, { color: theme.text.muted }]}>
          {cfg.label}
          {item.description ? ` · ${item.description}` : ''}
        </Text>

        {/* Détails dépliables */}
        {expanded && (
          <View style={[s.detailBox, { backgroundColor: theme.bg.elevated, borderColor: theme.border }]}>
            <MapPin size={11} color={theme.text.muted} />
            <Text style={[s.detailText, { color: theme.text.muted }]}>{detail}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function GeofencesScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const [filter, setFilter] = useState<FilterType>('ALL');
  const [activeOnly, setActiveOnly] = useState(false);

  const {
    data = [],
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useQuery<Geofence[]>({
    queryKey: ['geofences'],
    queryFn: geofencesApi.getAll,
    staleTime: 60_000,
  });

  const filtered = useMemo(() => {
    let list = data;
    if (filter !== 'ALL') list = list.filter((g) => g.type === filter);
    if (activeOnly) list = list.filter((g) => g.is_active);
    return list;
  }, [data, filter, activeOnly]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg.primary }} edges={['top']}>
      {/* Header */}
      <View style={[s.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[s.backBtn, { backgroundColor: theme.bg.surface, borderColor: theme.border }]}
          accessibilityLabel="Retour"
          accessibilityRole="button"
        >
          <ArrowLeft size={22} color={theme.text.primary} />
        </TouchableOpacity>
        <View>
          <Text style={[s.title, { color: theme.text.primary }]}>Zones géographiques</Text>
          <Text style={[s.subtitle, { color: theme.text.muted }]}>
            {data.length} zone{data.length !== 1 ? 's' : ''} · {data.filter((g) => g.is_active).length} active
            {data.filter((g) => g.is_active).length !== 1 ? 's' : ''}
          </Text>
        </View>
        <TouchableOpacity
          style={[
            s.activeToggle,
            {
              backgroundColor: activeOnly ? theme.primary : theme.bg.surface,
              borderColor: activeOnly ? theme.primary : theme.border,
            },
          ]}
          onPress={() => setActiveOnly((v) => !v)}
          activeOpacity={0.75}
        >
          <Text
            style={{ fontSize: 11, fontWeight: '600', color: activeOnly ? theme.text.onPrimary : theme.text.muted }}
          >
            Actives
          </Text>
        </TouchableOpacity>
      </View>

      {/* Filtres type */}
      <View style={s.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.value}
            style={[
              s.filterChip,
              {
                backgroundColor: filter === f.value ? theme.primary : theme.bg.surface,
                borderColor: filter === f.value ? theme.primary : theme.border,
              },
            ]}
            onPress={() => setFilter(f.value)}
            activeOpacity={0.75}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: '600',
                color: filter === f.value ? theme.text.onPrimary : theme.text.secondary,
              }}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Contenu */}
      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : isError ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}>
          <MapPin size={40} color={theme.text.muted} />
          <Text style={{ fontSize: 14, color: theme.text.muted, marginTop: 12, textAlign: 'center' }}>
            Impossible de charger les zones.{'\n'}Vérifiez vos permissions (VIEW_TECH).
          </Text>
          <TouchableOpacity
            style={{
              marginTop: 16,
              paddingHorizontal: 20,
              paddingVertical: 10,
              backgroundColor: theme.primary,
              borderRadius: 10,
            }}
            onPress={() => refetch()}
          >
            <Text style={{ color: theme.text.onPrimary, fontWeight: '600' }}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 12, gap: 10, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme.primary} />}
          renderItem={({ item }) => <GeofenceCard item={item} theme={theme} />}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 60, gap: 12 }}>
              <Hexagon size={40} color={theme.text.muted} />
              <Text style={{ fontSize: 14, color: theme.text.muted, textAlign: 'center' }}>
                {activeOnly ? 'Aucune zone active' : 'Aucune zone configurée'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  title: { fontSize: 17, fontWeight: '700' },
  subtitle: { fontSize: 12, marginTop: 1 },
  activeToggle: {
    marginLeft: 'auto',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  colorBar: { width: 4 },
  typeIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: { flex: 1, fontSize: 14, fontWeight: '600' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  badgeText: { fontSize: 10, fontWeight: '600' },
  typeLine: { fontSize: 12, marginLeft: 36 },
  detailBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 4,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  detailText: { fontSize: 11, flex: 1, lineHeight: 16 },
});
