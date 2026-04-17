/**
 * TrackYu Mobile — Fleet Analytics
 * Statistiques agrégées flotte : trajets, distances, vitesses, utilisation
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, BarChart3, Route, Gauge, Fuel, Truck, CalendarRange } from 'lucide-react-native';
import type { RootStackParamList } from '../../navigation/types';
import vehiclesApi, { type FleetAnalytics } from '../../api/vehicles';
import { useTheme } from '../../theme';
import { useTenantDateFormat, isoToDisplay, displayToIso, datePlaceholder } from '../../hooks/useTenantDateFormat';

type Props = NativeStackScreenProps<RootStackParamList, 'FleetAnalytics'>;

type Period = '7d' | '30d' | '90d' | 'custom';
const PERIODS: { label: string; value: Period }[] = [
  { label: '7 jours', value: '7d' },
  { label: '30 jours', value: '30d' },
  { label: '90 jours', value: '90d' },
  { label: 'Perso.', value: 'custom' },
];

// YYYY-MM-DD depuis un objet Date
function toDateStr(d: Date) {
  return d.toISOString().split('T')[0];
}

function KpiCard({
  icon,
  label,
  value,
  sub,
  theme,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  theme: ReturnType<typeof useTheme>['theme'];
}) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.bg.surface,
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: theme.border,
        gap: 6,
      }}
    >
      {icon}
      <Text style={{ fontSize: 20, fontWeight: '700', color: theme.text.primary }}>{value}</Text>
      <Text style={{ fontSize: 11, color: theme.text.muted }}>{label}</Text>
      {sub ? <Text style={{ fontSize: 10, color: theme.text.muted }}>{sub}</Text> : null}
    </View>
  );
}

export default function FleetAnalyticsScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const s = styles(theme);
  const [period, setPeriod] = useState<Period>('30d');
  const dateFormat = useTenantDateFormat();

  // Custom date range — stocké en format d'affichage, API reçoit YYYY-MM-DD
  const defaultStartIso = toDateStr(new Date(Date.now() - 30 * 86400_000));
  const defaultEndIso = toDateStr(new Date());
  const [startInput, setStartInput] = useState(() => isoToDisplay(defaultStartIso, dateFormat));
  const [endInput, setEndInput] = useState(() => isoToDisplay(defaultEndIso, dateFormat));
  // Dates appliquées en ISO (déclenchent la query uniquement après "Appliquer")
  const [appliedStart, setAppliedStart] = useState(defaultStartIso);
  const [appliedEnd, setAppliedEnd] = useState(defaultEndIso);

  const { data, isLoading, isError } = useQuery<FleetAnalytics>({
    queryKey: ['fleet-analytics', period, appliedStart, appliedEnd],
    queryFn: () =>
      period === 'custom'
        ? vehiclesApi.getFleetAnalytics('custom', appliedStart, appliedEnd)
        : vehiclesApi.getFleetAnalytics(period),
    staleTime: 60_000,
  });

  const trips = data?.tripStatistics;
  const fuel = data?.fuelEfficiency;
  const util = data?.utilization;

  const utilPct =
    util && parseInt(util.total_vehicles) > 0
      ? Math.round((parseInt(util.active_vehicles) / parseInt(util.total_vehicles)) * 100)
      : null;

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={s.backBtn}
          accessibilityLabel="Retour"
          accessibilityRole="button"
        >
          <ArrowLeft size={22} color={theme.text.primary} />
        </TouchableOpacity>
        <View>
          <Text style={s.title}>Analytique Flotte</Text>
          <Text style={s.subtitle}>Statistiques agrégées</Text>
        </View>
        <BarChart3 size={20} color={theme.text.muted} style={{ marginLeft: 'auto' }} />
      </View>

      {/* Period selector */}
      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 12 }}>
        {PERIODS.map((p) => (
          <TouchableOpacity
            key={p.value}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 20,
              backgroundColor: period === p.value ? theme.primary : theme.bg.surface,
              borderWidth: 1,
              borderColor: period === p.value ? theme.primary : theme.border,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
            }}
            onPress={() => setPeriod(p.value)}
            activeOpacity={0.75}
          >
            {p.value === 'custom' && (
              <CalendarRange size={12} color={period === 'custom' ? theme.text.onPrimary : theme.text.muted} />
            )}
            <Text
              style={{
                fontSize: 13,
                fontWeight: '600',
                color: period === p.value ? theme.text.onPrimary : theme.text.secondary,
              }}
            >
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Custom date range picker */}
      {period === 'custom' && (
        <View
          style={{
            marginHorizontal: 16,
            marginBottom: 8,
            backgroundColor: theme.bg.surface,
            borderRadius: 12,
            padding: 12,
            borderWidth: 1,
            borderColor: theme.border,
            gap: 10,
          }}
        >
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ fontSize: 10, fontWeight: '600', color: theme.text.muted, textTransform: 'uppercase' }}>
                Début
              </Text>
              <TextInput
                value={startInput}
                onChangeText={setStartInput}
                placeholder={datePlaceholder(dateFormat)}
                placeholderTextColor={theme.text.muted}
                keyboardType="numbers-and-punctuation"
                maxLength={10}
                style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: theme.text.primary,
                  backgroundColor: theme.bg.elevated,
                  borderRadius: 8,
                  paddingHorizontal: 10,
                  paddingVertical: 8,
                  borderWidth: 1,
                  borderColor: theme.border,
                  fontFamily: 'monospace',
                }}
              />
            </View>
            <Text style={{ fontSize: 16, color: theme.text.muted, marginTop: 16 }}>→</Text>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ fontSize: 10, fontWeight: '600', color: theme.text.muted, textTransform: 'uppercase' }}>
                Fin
              </Text>
              <TextInput
                value={endInput}
                onChangeText={setEndInput}
                placeholder={datePlaceholder(dateFormat)}
                placeholderTextColor={theme.text.muted}
                keyboardType="numbers-and-punctuation"
                maxLength={10}
                style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: theme.text.primary,
                  backgroundColor: theme.bg.elevated,
                  borderRadius: 8,
                  paddingHorizontal: 10,
                  paddingVertical: 8,
                  borderWidth: 1,
                  borderColor: theme.border,
                  fontFamily: 'monospace',
                }}
              />
            </View>
          </View>
          <TouchableOpacity
            style={{
              backgroundColor: theme.primary,
              borderRadius: 8,
              paddingVertical: 10,
              alignItems: 'center',
            }}
            onPress={() => {
              const isoStart = displayToIso(startInput, dateFormat);
              const isoEnd = displayToIso(endInput, dateFormat);
              if (isoStart && isoEnd) {
                setAppliedStart(isoStart);
                setAppliedEnd(isoEnd);
              }
            }}
            activeOpacity={0.8}
          >
            <Text style={{ fontSize: 13, fontWeight: '700', color: theme.text.onPrimary }}>Appliquer</Text>
          </TouchableOpacity>
        </View>
      )}

      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : isError ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}>
          <BarChart3 size={40} color={theme.text.muted} />
          <Text style={{ fontSize: 14, color: theme.text.muted, marginTop: 12, textAlign: 'center' }}>
            Données analytiques non disponibles
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
          {/* Trajets */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Trajets</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <KpiCard
                icon={<Route size={16} color={theme.primary} />}
                label="Trajets"
                value={trips?.totalTrips?.toString() ?? '–'}
                theme={theme}
              />
              <KpiCard
                icon={<Route size={16} color={theme.primary} />}
                label="Distance totale"
                value={
                  trips?.totalDistance != null ? `${Math.round(trips.totalDistance).toLocaleString('fr-FR')} km` : '–'
                }
                theme={theme}
              />
            </View>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
              <KpiCard
                icon={<Route size={16} color={theme.text.muted} />}
                label="Distance moyenne"
                value={trips?.avgTripDistance != null ? `${Number(trips.avgTripDistance).toFixed(1)} km` : '–'}
                sub="par trajet"
                theme={theme}
              />
              <KpiCard
                icon={<Gauge size={16} color={theme.text.muted} />}
                label="Vitesse max moy."
                value={trips?.avgMaxSpeed != null ? `${Math.round(trips.avgMaxSpeed)} km/h` : '–'}
                theme={theme}
              />
            </View>
          </View>

          {/* Utilisation */}
          {util && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Utilisation</Text>
              <View
                style={{
                  backgroundColor: theme.bg.surface,
                  borderRadius: 12,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: theme.border,
                  gap: 12,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Truck size={16} color={theme.primary} />
                    <Text style={{ fontSize: 14, color: theme.text.secondary }}>Véhicules actifs</Text>
                  </View>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: theme.text.primary }}>
                    {util.active_vehicles} / {util.total_vehicles}
                  </Text>
                </View>
                {utilPct !== null && (
                  <>
                    <View style={{ height: 8, backgroundColor: theme.border, borderRadius: 4, overflow: 'hidden' }}>
                      <View
                        style={{
                          width: `${utilPct}%`,
                          height: '100%',
                          backgroundColor: utilPct >= 70 ? '#22C55E' : utilPct >= 40 ? '#F59E0B' : '#EF4444',
                          borderRadius: 4,
                        }}
                      />
                    </View>
                    <Text style={{ fontSize: 12, color: theme.text.muted, textAlign: 'right' }}>
                      {utilPct}% d'utilisation
                    </Text>
                  </>
                )}
              </View>
            </View>
          )}

          {/* Consommation */}
          {fuel && fuel.avgConsumptionPer100km != null && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Consommation</Text>
              <View
                style={{
                  backgroundColor: theme.bg.surface,
                  borderRadius: 12,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: theme.border,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <Fuel size={24} color={theme.primary} />
                <View>
                  <Text style={{ fontSize: 24, fontWeight: '700', color: theme.text.primary }}>
                    {Number(fuel.avgConsumptionPer100km).toFixed(1)} L
                  </Text>
                  <Text style={{ fontSize: 12, color: theme.text.muted }}>consommation moyenne / 100 km</Text>
                </View>
              </View>
            </View>
          )}
        </ScrollView>
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
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    backBtn: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: theme.bg.surface,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.border,
    },
    title: { fontSize: 17, fontWeight: '700', color: theme.text.primary },
    subtitle: { fontSize: 12, color: theme.text.muted },
    section: { gap: 10 },
    sectionTitle: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.text.muted,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
  });
