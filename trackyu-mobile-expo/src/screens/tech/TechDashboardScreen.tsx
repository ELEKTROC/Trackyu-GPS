/**
 * TrackYu Mobile — Tech Dashboard
 *
 * Blocs :
 *  1. Mes Statistiques   — interventions + temps (jour / mois / année) + rang équipe
 *  2. Actions rapides    — raccourcis Agenda · À planifier · Mon stock · Alertes
 *  3. Interventions du jour
 *  4. À venir (top 3)
 *  5. À planifier (PENDING)
 *  6. Mes Alertes (dernières 5)
 *  7. Mon Stock
 */
import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQueries } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Trophy,
  Clock,
  Cpu,
  Package,
  ChevronRight,
  Calendar,
  Wrench,
  LayoutGrid,
  CheckCircle2,
  Bell,
  AlertTriangle,
  Zap,
  BatteryLow,
  WifiOff,
  Fuel,
  MapPin,
  BarChart2,
  ChevronDown,
  ChevronUp,
  User,
} from 'lucide-react-native';
import { useTheme } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import type { TechTabParamList, RootStackParamList } from '../../navigation/types';
import interventionsApi, { type Intervention, type InterventionStats, STATUS_COLORS } from '../../api/interventions';
import alertsApi, { type Alert as AlertItem } from '../../api/alerts';
import apiClient from '../../api/client';
import { normalizeError } from '../../utils/errorTypes';

type TabNav = BottomTabNavigationProp<TechTabParamList>;
type StackNav = NativeStackNavigationProp<RootStackParamList>;
type TH = ReturnType<typeof import('../../theme').useTheme>['theme'];

// ─── helpers ──────────────────────────────────────────────────────────────────

const pad2 = (n: number) => String(n).padStart(2, '0');

function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatHHMM(iso?: string): string {
  if (!iso) return '–';
  const d = new Date(iso);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function minutesToHM(min: number): string {
  if (min <= 0) return '–';
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}h`;
  return `${h}h${pad2(m)}`;
}

/** Durée moyenne (minutes) des interventions COMPLETED dans une liste */
function avgDuration(list: Intervention[]): number {
  const done = list.filter((i) => i.status === 'COMPLETED');
  if (done.length === 0) return 0;
  return Math.round(done.reduce((s, i) => s + (i.duration ?? 0), 0) / done.length);
}

function todayInterventions(list: Intervention[]): Intervention[] {
  const today = isoToday();
  return list.filter((i) => i.scheduledDate?.slice(0, 10) === today);
}

function upcomingInterventions(list: Intervention[]): Intervention[] {
  const today = isoToday();
  return list
    .filter((i) => !['COMPLETED', 'CANCELLED'].includes(i.status) && (i.scheduledDate?.slice(0, 10) ?? '') >= today)
    .sort((a, b) => (a.scheduledDate ?? '').localeCompare(b.scheduledDate ?? ''));
}

function getRank(stats: InterventionStats | undefined, userId: string): { rank: number; total: number } | null {
  if (!stats?.byTechnician || stats.byTechnician.length === 0) return null;
  const sorted = [...stats.byTechnician].sort((a, b) => parseInt(b.completed, 10) - parseInt(a.completed, 10));
  const idx = sorted.findIndex((t) => t.id === userId);
  if (idx === -1) return null;
  return { rank: idx + 1, total: sorted.length };
}

// ─── Composant : ligne intervention compacte ──────────────────────────────────

function IntRow({
  item,
  onPress,
  t,
  showDate,
}: {
  item: Intervention;
  onPress: () => void;
  t: TH;
  showDate?: boolean;
}) {
  const color = STATUS_COLORS[item.status] ?? '#6B7280';
  const time = showDate
    ? new Date(item.scheduledDate ?? '').toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
      }) +
      ' ' +
      formatHHMM(item.scheduledDate)
    : formatHHMM(item.scheduledDate);

  const typeLabel = item.type === 'INSTALLATION' ? 'Installation' : 'Dépannage';
  const locShort = (item.address ?? item.location)?.split(',')[0].trim();

  return (
    <TouchableOpacity
      style={[row(t).wrap, { borderLeftColor: color }]}
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityLabel={`${typeLabel} — ${item.clientName ?? ''} — ${item.nature ?? ''}`}
      accessibilityRole="button"
    >
      {/* Heure */}
      <View style={row(t).timeCol}>
        <Text style={[row(t).time, { color }]}>{time}</Text>
      </View>

      {/* Infos */}
      <View style={{ flex: 1 }}>
        {/* Type + statut */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={row(t).typeLabel}>{typeLabel}</Text>
          <View style={[row(t).chip, { backgroundColor: color + '18' }]}>
            <Text style={[row(t).chipText, { color }]}>
              {STATUS_COLORS[item.status]
                ? item.status === 'EN_ROUTE'
                  ? 'En route'
                  : item.status === 'IN_PROGRESS'
                    ? 'En cours'
                    : item.status === 'PENDING'
                      ? 'À planifier'
                      : item.status === 'SCHEDULED'
                        ? 'Planifié'
                        : item.status
                : item.status}
            </Text>
          </View>
        </View>
        {/* Nature */}
        {item.nature ? (
          <Text style={row(t).label} numberOfLines={1}>
            {item.nature}
          </Text>
        ) : null}
        {/* Client */}
        {item.clientName ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
            <User size={10} color={t.text.muted} />
            <Text style={row(t).meta} numberOfLines={1}>
              {item.clientName}
            </Text>
          </View>
        ) : null}
        {/* Lieu */}
        {locShort ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 }}>
            <MapPin size={10} color={t.text.muted} />
            <Text style={row(t).meta} numberOfLines={1}>
              {locShort}
            </Text>
          </View>
        ) : null}
      </View>

      <ChevronRight size={14} color={t.text.muted} />
    </TouchableOpacity>
  );
}

const row = (t: TH) =>
  StyleSheet.create({
    wrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: t.bg.surface,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: t.border,
      borderLeftWidth: 3,
      paddingVertical: 10,
      paddingRight: 12,
      marginBottom: 6,
      overflow: 'hidden',
    },
    timeCol: { width: 52, alignItems: 'center', paddingLeft: 8 },
    time: { fontSize: 12, fontWeight: '700' },
    typeLabel: { fontSize: 13, fontWeight: '700', color: t.text.primary },
    label: { fontSize: 12, fontWeight: '500', color: t.text.secondary, marginTop: 1 },
    meta: { fontSize: 11, color: t.text.muted },
    chip: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
    chipText: { fontSize: 10, fontWeight: '600' },
  });

// ─── Composant : cellule stat ─────────────────────────────────────────────────

function StatCell({ label, value, t }: { label: string; value: string; t: TH }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
      <Text style={{ fontSize: 16, fontWeight: '800', color: t.text.primary }}>{value}</Text>
      <Text style={{ fontSize: 10, color: t.text.muted, fontWeight: '500', textAlign: 'center' }}>{label}</Text>
    </View>
  );
}

// ─── Composant : en-tête de section ───────────────────────────────────────────

function SectionHeader({
  label,
  badge,
  linkLabel,
  onLink,
  t,
}: {
  label: string;
  badge?: number;
  linkLabel?: string;
  onLink?: () => void;
  t: TH;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
        <Text
          style={{
            fontSize: 13,
            fontWeight: '700',
            color: t.text.secondary,
            textTransform: 'uppercase',
            letterSpacing: 0.8,
          }}
        >
          {label}
        </Text>
        {badge !== undefined && badge > 0 && (
          <View style={{ backgroundColor: t.primary, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: '#fff' }}>{badge}</Text>
          </View>
        )}
      </View>
      {linkLabel && onLink && (
        <TouchableOpacity onPress={onLink} style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
          <Text style={{ fontSize: 12, color: t.primary, fontWeight: '600' }}>{linkLabel}</Text>
          <ChevronRight size={12} color={t.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Composant : ligne stock ───────────────────────────────────────────────────

function StockRow({
  icon,
  label,
  count,
  color,
  t,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  color: string;
  t: TH;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 }}>
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 9,
          backgroundColor: color + '22',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {icon}
      </View>
      <Text style={{ flex: 1, fontSize: 14, color: t.text.primary, fontWeight: '500' }}>{label}</Text>
      <View style={{ backgroundColor: color + '22', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color }}>{count}</Text>
      </View>
    </View>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────────

export default function TechDashboardScreen() {
  const { theme: t } = useTheme();
  const tabNav = useNavigation<TabNav>();
  const stackNav = useNavigation<StackNav>();
  const user = useAuthStore((st) => st.user);

  const greetHour = new Date().getHours();
  const greeting = greetHour < 12 ? 'Bonjour' : greetHour < 18 ? 'Bon après-midi' : 'Bonsoir';

  const today = isoToday();
  const curMonth = today.slice(0, 7);
  const curYear = today.slice(0, 4);

  // ── Queries ──────────────────────────────────────────────────────────────────

  const [intQuery, statsQuery, stockQuery, alertsQuery] = useQueries({
    queries: [
      {
        queryKey: ['tech-interventions', user?.id],
        queryFn: () => interventionsApi.getAll({ technicianId: user!.id }),
        refetchInterval: 60_000,
        enabled: !!user?.id,
      },
      {
        queryKey: ['tech-intervention-stats'],
        queryFn: interventionsApi.getStats,
        refetchInterval: 120_000,
      },
      {
        queryKey: ['tech-stock', user?.id],
        queryFn: async () => {
          try {
            const res = await apiClient.get(`/devices?location=TECH&technicianId=${user!.id}`);
            return Array.isArray(res.data) ? (res.data as Array<{ type: string; status: string }>) : [];
          } catch (e) {
            throw normalizeError(e);
          }
        },
        refetchInterval: 120_000,
        enabled: !!user?.id,
      },
      {
        queryKey: ['tech-alerts-recent'],
        queryFn: () => alertsApi.getPage(1, 5),
        refetchInterval: 60_000,
      },
    ],
  });

  const interventions: Intervention[] = intQuery.data ?? [];
  const stats: InterventionStats | undefined = statsQuery.data;
  const stockDevices = stockQuery.data ?? [];
  const recentAlerts: AlertItem[] = alertsQuery.data?.data ?? [];
  const unreadAlertsCount = recentAlerts.filter((a) => !a.isRead).length;

  const isLoading = intQuery.isLoading || statsQuery.isLoading;
  const isRefetching =
    intQuery.isRefetching || statsQuery.isRefetching || stockQuery.isRefetching || alertsQuery.isRefetching;
  const refetch = () => {
    intQuery.refetch();
    statsQuery.refetch();
    stockQuery.refetch();
    alertsQuery.refetch();
  };

  // ── Calculs ───────────────────────────────────────────────────────────────────

  const todayList = useMemo(() => todayInterventions(interventions), [interventions, today]);
  const upcomingList = useMemo(() => upcomingInterventions(interventions).slice(0, 3), [interventions, today]);
  const pendingList = useMemo(
    () =>
      interventions
        .filter((i) => i.status === 'PENDING')
        .sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? '')),
    [interventions]
  );

  // Statistiques personnelles depuis la liste locale (déjà filtrée par technicianId)
  const statsData = useMemo(() => {
    const todayItems = interventions.filter((i) => i.scheduledDate?.slice(0, 10) === today);
    const monthItems = interventions.filter((i) => i.scheduledDate?.slice(0, 7) === curMonth);
    const yearItems = interventions.filter((i) => i.scheduledDate?.slice(0, 4) === curYear);
    return {
      todayCount: todayItems.length,
      monthCount: monthItems.length,
      yearCount: yearItems.length,
      todayTime: minutesToHM(avgDuration(todayItems)),
      monthTime: minutesToHM(avgDuration(monthItems)),
      yearTime: minutesToHM(avgDuration(yearItems)),
    };
  }, [interventions, today, curMonth, curYear]);

  const rank = useMemo(() => (user?.id ? getRank(stats, user.id) : null), [stats, user?.id]);

  // Stock affecté au technicien (IN_STOCK uniquement)
  const stockByType = useMemo(() => {
    const inStock = stockDevices.filter((d) => d.status === 'IN_STOCK');
    return {
      BOX: inStock.filter((d) => d.type === 'BOX').length,
      SIM: inStock.filter((d) => d.type === 'SIM').length,
      SENSOR: inStock.filter((d) => d.type === 'SENSOR').length,
      ACCESSORY: inStock.filter((d) => d.type === 'ACCESSORY').length,
      total: inStock.length,
    };
  }, [stockDevices]);

  // ── Navigations ───────────────────────────────────────────────────────────────

  const [showRanking, setShowRanking] = useState(false);

  const teamRanking = useMemo(() => {
    if (!stats?.byTechnician) return [];
    return [...stats.byTechnician].sort((a, b) => parseInt(b.completed, 10) - parseInt(a.completed, 10));
  }, [stats?.byTechnician]);

  const goToIntervention = (id: string) => stackNav.navigate('InterventionDetail', { interventionId: id });
  const goToAgendaToday = () => tabNav.navigate('Agenda');
  const goToAllUpcoming = () => tabNav.navigate('Agenda');
  const goToPending = () => tabNav.navigate('Tech', { initialTab: 'interventions', initialStatus: 'PENDING' });
  const goToStock = () => tabNav.navigate('Tech', { initialTab: 'devices' });
  const goToAlerts = () => stackNav.navigate('Alerts');

  // ── Render ────────────────────────────────────────────────────────────────────

  const card = {
    backgroundColor: t.bg.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: t.border,
    padding: 14,
    marginBottom: 20,
  };

  const divider = { height: 1, backgroundColor: t.border, marginVertical: 8 };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg.primary }} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={t.primary} />}
      >
        {/* ── Header ── */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 20,
            marginTop: 4,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, color: t.text.muted }}>{greeting},</Text>
            <Text style={{ fontSize: 22, fontWeight: '700', color: t.text.primary, marginTop: 2 }}>
              {user?.name ?? 'Technicien'}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 6 }}>
            <Text style={{ fontSize: 13, color: t.text.muted, fontWeight: '500' }}>
              {new Date().toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long' })}
            </Text>
            <View style={{ backgroundColor: '#3B82F622', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
              <Text style={{ fontSize: 11, color: '#3B82F6', fontWeight: '700' }}>TECHNICIEN</Text>
            </View>
          </View>
        </View>

        {/* ── Bloc 1 : Mes Statistiques ── */}
        <SectionHeader label="Mes Statistiques" t={t} />
        <View style={card}>
          {isLoading ? (
            <ActivityIndicator color={t.primary} />
          ) : (
            <>
              {/* Rang */}
              {rank && (
                <>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 12 }}>
                    <View
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 10,
                        backgroundColor: '#F59E0B22',
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <Trophy size={18} color="#F59E0B" />
                    </View>
                    <View>
                      <Text style={{ fontSize: 20, fontWeight: '800', color: '#F59E0B' }}>
                        #{rank.rank}
                        <Text style={{ fontSize: 13, fontWeight: '500', color: t.text.muted }}>
                          {' '}
                          / {rank.total} techniciens
                        </Text>
                      </Text>
                      <Text style={{ fontSize: 11, color: t.text.muted, marginTop: 1 }}>
                        Classement équipe (interventions clôturées)
                      </Text>
                    </View>
                  </View>
                  <View style={divider} />
                </>
              )}

              {/* Grille stats */}
              <View style={{ flexDirection: 'row', paddingTop: 8 }}>
                {/* Labels colonne */}
                <View style={{ width: 90, gap: 10 }}>
                  <Text style={{ fontSize: 10, color: 'transparent' }}>{'—'}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>
                    <Calendar size={12} color={t.text.muted} />
                    <Text style={{ fontSize: 12, color: t.text.muted, fontWeight: '600' }}>Interventions</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 }}>
                    <Clock size={12} color={t.text.muted} />
                    <Text style={{ fontSize: 12, color: t.text.muted, fontWeight: '600' }}>Temps</Text>
                  </View>
                </View>

                {/* Colonnes valeurs */}
                <View style={{ flex: 1 }}>
                  {/* En-têtes colonnes */}
                  <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                    {["Aujourd'hui", 'Ce mois', 'Cette année'].map((h) => (
                      <Text
                        key={h}
                        style={{
                          flex: 1,
                          fontSize: 10,
                          color: t.text.muted,
                          fontWeight: '700',
                          textAlign: 'center',
                          textTransform: 'uppercase',
                          letterSpacing: 0.5,
                        }}
                      >
                        {h}
                      </Text>
                    ))}
                  </View>

                  {/* Ligne interventions */}
                  <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                    <StatCell label="" value={String(statsData.todayCount)} t={t} />
                    <StatCell label="" value={String(statsData.monthCount)} t={t} />
                    <StatCell label="" value={String(statsData.yearCount)} t={t} />
                  </View>

                  {/* Ligne temps */}
                  <View style={{ flexDirection: 'row' }}>
                    <StatCell label="" value={statsData.todayTime} t={t} />
                    <StatCell label="" value={statsData.monthTime} t={t} />
                    <StatCell label="" value={statsData.yearTime} t={t} />
                  </View>
                </View>
              </View>
            </>
          )}
        </View>

        {/* ── Bloc 2 : Interventions du jour ── */}
        <SectionHeader
          label="Interventions du jour"
          badge={todayList.length}
          linkLabel={todayList.length > 3 ? 'Tout voir' : 'Agenda'}
          onLink={goToAgendaToday}
          t={t}
        />
        {isLoading ? (
          <ActivityIndicator color={t.primary} style={{ marginBottom: 20 }} />
        ) : todayList.length === 0 ? (
          <View style={[card, { alignItems: 'center', paddingVertical: 20, marginBottom: 20 }]}>
            <Calendar size={28} color={t.text.muted} />
            <Text style={{ fontSize: 13, color: t.text.muted, marginTop: 8 }}>Aucune intervention aujourd'hui</Text>
          </View>
        ) : (
          <View style={{ marginBottom: 20 }}>
            {todayList.slice(0, 3).map((item) => (
              <IntRow key={item.id} item={item} onPress={() => goToIntervention(item.id)} t={t} />
            ))}
            {todayList.length > 3 && (
              <TouchableOpacity onPress={goToAgendaToday} style={{ alignItems: 'center', paddingVertical: 10 }}>
                <Text style={{ fontSize: 12, color: t.primary, fontWeight: '600' }}>
                  + {todayList.length - 3} autre{todayList.length - 3 > 1 ? 's' : ''} — Voir tout
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ── Bloc 3 : Interventions à venir ── */}
        <SectionHeader label="À venir" linkLabel="Tout voir" onLink={goToAllUpcoming} t={t} />
        {isLoading ? (
          <ActivityIndicator color={t.primary} style={{ marginBottom: 20 }} />
        ) : upcomingList.length === 0 ? (
          <View style={[card, { alignItems: 'center', paddingVertical: 20, marginBottom: 20 }]}>
            <Wrench size={28} color={t.text.muted} />
            <Text style={{ fontSize: 13, color: t.text.muted, marginTop: 8 }}>Aucune intervention planifiée</Text>
          </View>
        ) : (
          <View style={{ marginBottom: 20 }}>
            {upcomingList.map((item) => (
              <IntRow key={item.id} item={item} onPress={() => goToIntervention(item.id)} t={t} showDate />
            ))}
          </View>
        )}

        {/* ── Bloc 4 : Interventions à planifier ── */}
        <SectionHeader
          label="À planifier"
          badge={pendingList.length}
          linkLabel="Tout voir"
          onLink={goToPending}
          t={t}
        />
        {isLoading ? (
          <ActivityIndicator color={t.primary} style={{ marginBottom: 20 }} />
        ) : pendingList.length === 0 ? (
          <View style={[card, { alignItems: 'center', paddingVertical: 18, marginBottom: 20 }]}>
            <CheckCircle2 size={26} color="#22C55E" />
            <Text style={{ fontSize: 13, color: t.text.muted, marginTop: 6 }}>Aucune intervention à planifier</Text>
          </View>
        ) : (
          <View style={{ marginBottom: 20 }}>
            {pendingList.slice(0, 3).map((item) => (
              <IntRow key={item.id} item={item} onPress={() => goToIntervention(item.id)} t={t} />
            ))}
            {pendingList.length > 3 && (
              <TouchableOpacity onPress={goToPending} style={{ alignItems: 'center', paddingVertical: 10 }}>
                <Text style={{ fontSize: 12, color: t.primary, fontWeight: '600' }}>
                  + {pendingList.length - 3} autre{pendingList.length - 3 > 1 ? 's' : ''} — Voir tout
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ── Bloc 5 : Mes Alertes ── */}
        <SectionHeader
          label="Mes Alertes"
          badge={unreadAlertsCount || undefined}
          linkLabel="Voir tout"
          onLink={goToAlerts}
          t={t}
        />
        {alertsQuery.isLoading ? (
          <ActivityIndicator color={t.primary} style={{ marginBottom: 20 }} />
        ) : recentAlerts.length === 0 ? (
          <View style={[card, { alignItems: 'center', paddingVertical: 18, marginBottom: 20 }]}>
            <CheckCircle2 size={26} color="#22C55E" />
            <Text style={{ fontSize: 13, color: t.text.muted, marginTop: 6 }}>Aucune alerte récente</Text>
          </View>
        ) : (
          <View style={[card, { paddingVertical: 4, marginBottom: 20 }]}>
            {recentAlerts.map((alert, idx) => {
              // Couleurs fonctionnelles uniquement : critique=rouge, warning=orange, info=gris
              const severityColor =
                alert.severity === 'critical' ? '#EF4444' : alert.severity === 'warning' ? t.primary : t.text.muted;
              const ALERT_ICONS: Record<string, React.ReactNode> = {
                speed: <Zap size={14} color={severityColor} />,
                geofence: <MapPin size={14} color={severityColor} />,
                fuel: <Fuel size={14} color={severityColor} />,
                sos: <AlertTriangle size={14} color={severityColor} />,
                battery: <BatteryLow size={14} color={severityColor} />,
                offline: <WifiOff size={14} color={severityColor} />,
                maintenance: <Wrench size={14} color={severityColor} />,
              };
              const icon = ALERT_ICONS[alert.type] ?? <Bell size={14} color={severityColor} />;
              const ALERT_TYPE_FR: Record<string, string> = {
                speed: 'Vitesse',
                geofence: 'Géofence',
                fuel: 'Carburant',
                maintenance: 'Maintenance',
                sos: 'SOS',
                battery: 'Batterie',
                offline: 'Hors ligne',
              };
              const time = new Date(alert.createdAt).toLocaleString('fr-FR', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              });
              return (
                <View key={alert.id}>
                  {idx > 0 && <View style={divider} />}
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 10 }}>
                    <View
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 8,
                        backgroundColor: t.bg.elevated,
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginTop: 1,
                      }}
                    >
                      {icon}
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: t.text.secondary }}>
                          {ALERT_TYPE_FR[alert.type] ?? alert.type}
                        </Text>
                        {!alert.isRead && (
                          <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: severityColor }} />
                        )}
                      </View>
                      <Text
                        style={{ fontSize: 13, fontWeight: '500', color: t.text.primary, marginTop: 1 }}
                        numberOfLines={1}
                      >
                        {alert.vehicleName}
                        {alert.vehiclePlate ? ` · ${alert.vehiclePlate}` : ''}
                      </Text>
                      <Text style={{ fontSize: 12, color: t.text.muted, marginTop: 1 }} numberOfLines={1}>
                        {alert.message}
                      </Text>
                      <Text style={{ fontSize: 10, color: t.text.muted, marginTop: 2 }}>{time}</Text>
                    </View>
                  </View>
                </View>
              );
            })}
            <View style={divider} />
            <TouchableOpacity
              onPress={goToAlerts}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingTop: 10 }}
            >
              <Text style={{ fontSize: 12, color: t.primary, fontWeight: '600' }}>Voir toutes les alertes</Text>
              <ChevronRight size={12} color={t.primary} />
            </TouchableOpacity>
          </View>
        )}

        {/* ── Bloc 6 : Mon Stock ── */}
        <SectionHeader label="Mon Stock" badge={stockByType.total} linkLabel="Tout voir" onLink={goToStock} t={t} />
        <View style={card}>
          {stockQuery.isLoading ? (
            <ActivityIndicator color={t.primary} />
          ) : stockByType.total === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 12 }}>
              <Package size={28} color={t.text.muted} />
              <Text style={{ fontSize: 13, color: t.text.muted, marginTop: 6 }}>Aucun appareil affecté</Text>
            </View>
          ) : (
            <>
              {stockByType.BOX > 0 && (
                <>
                  <StockRow
                    icon={<Cpu size={16} color="#3B82F6" />}
                    label="Boîtiers GPS"
                    count={stockByType.BOX}
                    color="#3B82F6"
                    t={t}
                  />
                  {(stockByType.SIM > 0 || stockByType.SENSOR > 0 || stockByType.ACCESSORY > 0) && (
                    <View style={divider} />
                  )}
                </>
              )}
              {stockByType.SIM > 0 && (
                <>
                  <StockRow
                    icon={<LayoutGrid size={16} color="#8B5CF6" />}
                    label="Cartes SIM"
                    count={stockByType.SIM}
                    color="#8B5CF6"
                    t={t}
                  />
                  {(stockByType.SENSOR > 0 || stockByType.ACCESSORY > 0) && <View style={divider} />}
                </>
              )}
              {stockByType.SENSOR > 0 && (
                <>
                  <StockRow
                    icon={<Wrench size={16} color="#06B6D4" />}
                    label="Capteurs / Sondes"
                    count={stockByType.SENSOR}
                    color="#06B6D4"
                    t={t}
                  />
                  {stockByType.ACCESSORY > 0 && <View style={divider} />}
                </>
              )}
              {stockByType.ACCESSORY > 0 && (
                <StockRow
                  icon={<Package size={16} color="#F59E0B" />}
                  label="Accessoires"
                  count={stockByType.ACCESSORY}
                  color="#F59E0B"
                  t={t}
                />
              )}
            </>
          )}
        </View>

        {/* ── Actions rapides ── */}
        <SectionHeader label="Actions rapides" t={t} />
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: showRanking ? 12 : 24 }}>
          {/* Rapports */}
          <TouchableOpacity
            onPress={() => stackNav.navigate('Reports')}
            activeOpacity={0.75}
            accessibilityLabel="Rapports techniques"
            accessibilityRole="button"
            style={{
              flex: 1,
              backgroundColor: t.bg.surface,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: t.border,
              padding: 14,
              gap: 10,
            }}
          >
            <View
              style={{
                width: 38,
                height: 38,
                borderRadius: 11,
                backgroundColor: t.primaryDim,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <BarChart2 size={20} color={t.primary} />
            </View>
            <Text style={{ fontSize: 14, fontWeight: '700', color: t.text.primary }}>Rapports</Text>
            <Text style={{ fontSize: 11, color: t.text.muted, lineHeight: 16 }}>
              Technique · Interventions{'\n'}Nature · Temps · Stock
            </Text>
          </TouchableOpacity>

          {/* Classement */}
          <TouchableOpacity
            onPress={() => setShowRanking((v) => !v)}
            activeOpacity={0.75}
            accessibilityLabel={showRanking ? 'Masquer le classement équipe' : 'Afficher le classement équipe'}
            accessibilityRole="button"
            style={{
              flex: 1,
              backgroundColor: showRanking ? t.primaryDim : t.bg.surface,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: showRanking ? t.primary : t.border,
              padding: 14,
              gap: 10,
            }}
          >
            <View
              style={{
                width: 38,
                height: 38,
                borderRadius: 11,
                backgroundColor: t.primaryDim,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Trophy size={20} color={t.primary} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: t.text.primary }}>Classement</Text>
              {showRanking ? <ChevronUp size={14} color={t.primary} /> : <ChevronDown size={14} color={t.text.muted} />}
            </View>
            <Text style={{ fontSize: 11, color: t.text.muted, lineHeight: 16 }}>Équipe · Meilleur{'\n'}technicien</Text>
          </TouchableOpacity>
        </View>

        {/* Classement équipe (inline, visible si showRanking) */}
        {showRanking && (
          <View style={[card, { marginBottom: 20 }]}>
            {statsQuery.isLoading ? (
              <ActivityIndicator color={t.primary} />
            ) : teamRanking.length === 0 ? (
              <Text style={{ fontSize: 13, color: t.text.muted, textAlign: 'center', paddingVertical: 8 }}>
                Aucune donnée de classement disponible
              </Text>
            ) : (
              teamRanking.map((tech, i) => {
                const isMe = tech.id === user?.id;
                const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;
                return (
                  <View
                    key={tech.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 9,
                      borderBottomWidth: i < teamRanking.length - 1 ? 1 : 0,
                      borderBottomColor: t.border,
                      backgroundColor: isMe ? t.primaryDim : 'transparent',
                      borderRadius: isMe ? 8 : 0,
                      paddingHorizontal: isMe ? 8 : 0,
                    }}
                  >
                    <Text
                      style={{ width: 28, fontSize: 13, fontWeight: '700', color: isMe ? t.primary : t.text.muted }}
                    >
                      {medal ?? `#${i + 1}`}
                    </Text>
                    <Text
                      style={{
                        flex: 1,
                        fontSize: 13,
                        fontWeight: isMe ? '700' : '500',
                        color: isMe ? t.primary : t.text.primary,
                      }}
                    >
                      {tech.name}
                      {isMe ? ' (vous)' : ''}
                    </Text>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: t.text.secondary }}>
                      {tech.completed} clôturées
                    </Text>
                  </View>
                );
              })
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
