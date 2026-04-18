/**
 * TrackYu Mobile — Température & Capteurs
 * Lecture des données télémétrique depuis la liste des véhicules :
 * température moteur, batterie, ignition
 */
import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Thermometer, Zap, Power, AlertTriangle, SlidersHorizontal } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import vehiclesApi, { type Vehicle } from '../../api/vehicles';
import { useTheme } from '../../theme';
import { Card } from '../../components/Card';
import { SearchBar } from '../../components/SearchBar';
import { VehicleFilterPanel, type FilterBlockDef } from '../../components/VehicleFilterPanel';
import { VEHICLE_STATUS_COLORS, VEHICLE_STATUS_LABELS } from '../../utils/vehicleStatus';

type ThemeType = ReturnType<typeof import('../../theme').useTheme>['theme'];

function tempColor(temp?: number): string {
  if (temp == null) return '#6B7280';
  if (temp > 100) return '#EF4444';
  if (temp > 80) return '#F59E0B';
  return '#22C55E';
}

function battColor(v?: number): string {
  if (v == null) return '#6B7280';
  if (v < 11.5) return '#EF4444';
  if (v < 12.0) return '#F59E0B';
  return '#22C55E';
}

/* ── Sensor Card ──────────────────────────────────────────────────── */
function SensorCard({ vehicle, theme }: { vehicle: Vehicle; theme: ThemeType }) {
  const statusColor = VEHICLE_STATUS_COLORS[vehicle.status] ?? VEHICLE_STATUS_COLORS.offline;
  const temp = (vehicle as any).temperature as number | undefined;
  const batt = vehicle.battery;
  const ign = vehicle.ignition;

  const hasData = temp != null || batt != null || ign != null;

  return (
    <Card style={{ marginBottom: 10 }}>
      {/* En-tête */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: theme.text.primary }}>{vehicle.name}</Text>
          <Text style={{ fontSize: 11, color: theme.text.muted }}>{vehicle.plate}</Text>
        </View>
        <View
          style={{
            backgroundColor: statusColor + '18',
            borderRadius: 8,
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderWidth: 1,
            borderColor: statusColor + '55',
          }}
        >
          <Text style={{ fontSize: 10, fontWeight: '700', color: statusColor }}>
            {VEHICLE_STATUS_LABELS[vehicle.status] ?? vehicle.status}
          </Text>
        </View>
      </View>

      {/* Capteurs */}
      {hasData ? (
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {/* Température */}
          <View
            style={{ flex: 1, backgroundColor: theme.bg.elevated, borderRadius: 10, padding: 10, alignItems: 'center' }}
          >
            <Thermometer size={18} color={tempColor(temp)} />
            <Text style={{ fontSize: 18, fontWeight: '800', color: tempColor(temp), marginTop: 4 }}>
              {temp != null ? `${temp}°C` : '—'}
            </Text>
            <Text style={{ fontSize: 9, color: theme.text.muted, marginTop: 2 }}>TEMP. MOTEUR</Text>
            {temp != null && temp > 100 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 }}>
                <AlertTriangle size={10} color="#EF4444" />
                <Text style={{ fontSize: 9, color: '#EF4444', fontWeight: '700' }}>Surchauffe</Text>
              </View>
            )}
          </View>

          {/* Batterie */}
          <View
            style={{ flex: 1, backgroundColor: theme.bg.elevated, borderRadius: 10, padding: 10, alignItems: 'center' }}
          >
            <Zap size={18} color={battColor(batt)} />
            <Text style={{ fontSize: 18, fontWeight: '800', color: battColor(batt), marginTop: 4 }}>
              {batt != null ? `${batt.toFixed(1)}V` : '—'}
            </Text>
            <Text style={{ fontSize: 9, color: theme.text.muted, marginTop: 2 }}>BATTERIE</Text>
            {batt != null && batt < 11.5 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 }}>
                <AlertTriangle size={10} color="#EF4444" />
                <Text style={{ fontSize: 9, color: '#EF4444', fontWeight: '700' }}>Faible</Text>
              </View>
            )}
          </View>

          {/* Ignition */}
          <View
            style={{ flex: 1, backgroundColor: theme.bg.elevated, borderRadius: 10, padding: 10, alignItems: 'center' }}
          >
            <Power size={18} color={ign ? '#22C55E' : '#6B7280'} />
            <Text style={{ fontSize: 14, fontWeight: '800', color: ign ? '#22C55E' : '#6B7280', marginTop: 4 }}>
              {ign == null ? '—' : ign ? 'ON' : 'OFF'}
            </Text>
            <Text style={{ fontSize: 9, color: theme.text.muted, marginTop: 2 }}>CONTACT</Text>
          </View>
        </View>
      ) : (
        <View style={{ backgroundColor: theme.bg.elevated, borderRadius: 10, padding: 12, alignItems: 'center' }}>
          <Text style={{ fontSize: 12, color: theme.text.muted }}>Aucune donnée capteur disponible</Text>
        </View>
      )}
    </Card>
  );
}

/* ── Écran principal ──────────────────────────────────────────────── */
export default function TemperatureScreen() {
  const { theme } = useTheme();
  const nav = useNavigation();
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [resellerFilter, setResellerFilter] = useState<string | null>(null);
  const [clientFilter, setClientFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [alertFilter, setAlertFilter] = useState<string | null>(null); // overheat | lowBatt | normal

  const { data: vehicles = [], isLoading } = useQuery({
    queryKey: ['vehicles-all'],
    queryFn: () => vehiclesApi.getAll(),
    staleTime: 30_000,
  });

  // ── Listes dérivées ──────────────────────────────────────────────────────
  const uniqueResellers = useMemo(
    () =>
      [...new Set(vehicles.map((v) => v.resellerName).filter(Boolean) as string[])]
        .sort()
        .map((n) => ({ id: n, label: n })),
    [vehicles]
  );

  const uniqueClients = useMemo(() => {
    const pool = resellerFilter ? vehicles.filter((v) => v.resellerName === resellerFilter) : vehicles;
    return [...new Set(pool.map((v) => v.clientName).filter(Boolean) as string[])]
      .sort()
      .map((n) => ({ id: n, label: n }));
  }, [vehicles, resellerFilter]);

  const uniqueStatuses = useMemo(
    () =>
      [...new Set(vehicles.map((v) => v.status).filter(Boolean) as string[])]
        .sort()
        .map((s) => ({ id: s, label: VEHICLE_STATUS_LABELS[s] ?? s })),
    [vehicles]
  );

  const alertOptions = [
    { id: 'overheat', label: 'Surchauffe' },
    { id: 'lowBatt', label: 'Batterie faible' },
    { id: 'noData', label: 'Sans capteur' },
  ];

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
    { key: 'status', label: 'Statut', items: uniqueStatuses, selected: statusFilter, onSelect: setStatusFilter },
    { key: 'alert', label: 'Alerte', items: alertOptions, selected: alertFilter, onSelect: setAlertFilter },
  ];

  const hasActiveFilters = !!(resellerFilter || clientFilter || statusFilter || alertFilter);

  const handleReset = () => {
    setResellerFilter(null);
    setClientFilter(null);
    setStatusFilter(null);
    setAlertFilter(null);
  };

  // Trier : véhicules avec données capteurs en premier, puis par statut
  const filtered = useMemo(() => {
    let list = vehicles;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((v) => v.name.toLowerCase().includes(q) || v.plate.toLowerCase().includes(q));
    }
    if (resellerFilter) list = list.filter((v) => v.resellerName === resellerFilter);
    if (clientFilter) list = list.filter((v) => v.clientName === clientFilter);
    if (statusFilter) list = list.filter((v) => v.status === statusFilter);
    if (alertFilter === 'overheat') list = list.filter((v) => ((v as any).temperature ?? 0) > 100);
    else if (alertFilter === 'lowBatt') list = list.filter((v) => v.battery != null && v.battery < 11.5);
    else if (alertFilter === 'noData') list = list.filter((v) => (v as any).temperature == null && v.battery == null);

    return [...list].sort((a, b) => {
      const hasA = (a as any).temperature != null || a.battery != null;
      const hasB = (b as any).temperature != null || b.battery != null;
      if (hasA && !hasB) return -1;
      if (!hasA && hasB) return 1;
      // Alertes en premier
      const alertA = ((a as any).temperature ?? 0) > 100 || (a.battery ?? 99) < 11.5 ? 1 : 0;
      const alertB = ((b as any).temperature ?? 0) > 100 || (b.battery ?? 99) < 11.5 ? 1 : 0;
      return alertB - alertA;
    });
  }, [vehicles, search, resellerFilter, clientFilter, statusFilter, alertFilter]);

  const withTemp = vehicles.filter((v) => (v as any).temperature != null).length;
  const overTemp = vehicles.filter((v) => ((v as any).temperature ?? 0) > 100).length;
  const lowBatt = vehicles.filter((v) => v.battery != null && v.battery < 11.5).length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg.primary }} edges={['top', 'bottom']}>
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
          <Text style={{ fontSize: 18, fontWeight: '700', color: theme.text.primary }}>Température & Capteurs</Text>
          <Text style={{ fontSize: 12, color: theme.text.muted }}>
            {withTemp} véhicule{withTemp !== 1 ? 's' : ''} avec capteur
          </Text>
        </View>
      </View>

      {/* Alertes */}
      {(overTemp > 0 || lowBatt > 0) && (
        <View
          style={{
            flexDirection: 'row',
            gap: 10,
            paddingHorizontal: 12,
            paddingVertical: 8,
            backgroundColor: theme.bg.elevated,
          }}
        >
          {overTemp > 0 && (
            <View
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                backgroundColor: '#EF444418',
                borderRadius: 10,
                padding: 10,
              }}
            >
              <AlertTriangle size={14} color="#EF4444" />
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#EF4444' }}>
                {overTemp} surchauffe{overTemp > 1 ? 's' : ''}
              </Text>
            </View>
          )}
          {lowBatt > 0 && (
            <View
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                backgroundColor: '#F59E0B18',
                borderRadius: 10,
                padding: 10,
              }}
            >
              <AlertTriangle size={14} color="#F59E0B" />
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#F59E0B' }}>
                {lowBatt} batterie{lowBatt > 1 ? 's' : ''} faible{lowBatt > 1 ? 's' : ''}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Recherche + bouton filtre */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 12, gap: 8 }}>
        <View style={{ flex: 1 }}>
          <SearchBar value={search} onChangeText={setSearch} placeholder="Nom ou plaque..." />
        </View>
        <TouchableOpacity
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: showFilters || hasActiveFilters ? theme.primary : theme.border,
            backgroundColor: showFilters || hasActiveFilters ? theme.primary : theme.bg.surface,
            justifyContent: 'center',
            alignItems: 'center',
          }}
          onPress={() => setShowFilters((v) => !v)}
          accessibilityLabel="Filtres avancés"
          accessibilityRole="button"
        >
          <SlidersHorizontal size={16} color={showFilters || hasActiveFilters ? '#fff' : theme.text.secondary} />
          {hasActiveFilters && (
            <View
              style={{
                position: 'absolute',
                top: 6,
                right: 6,
                width: 7,
                height: 7,
                borderRadius: 4,
                backgroundColor: '#EF4444',
                borderWidth: 1.5,
                borderColor: theme.bg.surface,
              }}
            />
          )}
        </TouchableOpacity>
      </View>

      {/* VehicleFilterPanel */}
      <View style={{ paddingHorizontal: 12, paddingTop: 8, paddingBottom: showFilters ? 4 : 0 }}>
        <VehicleFilterPanel
          visible={showFilters}
          blocks={filterBlocks}
          hasActiveFilters={hasActiveFilters}
          onReset={handleReset}
        />
      </View>

      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={theme.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(v) => v.id}
          contentContainerStyle={{ padding: 12 }}
          renderItem={({ item }) => <SensorCard vehicle={item} theme={theme} />}
        />
      )}
    </SafeAreaView>
  );
}
