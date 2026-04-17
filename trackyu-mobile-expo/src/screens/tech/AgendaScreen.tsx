/**
 * TrackYu Mobile — Agenda Screen (TECH)
 * Aligné avec features/agenda/components/AgendaView.tsx (PWA)
 *
 * Combine :
 *   - Interventions tech  (scheduledDate, status PENDING→POSTPONED)
 *   - Tâches CRM business (dueDate, status TODO→BLOCKED)
 *
 * TECH user : auto-filtre sur technicianId = user.id
 */
import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQueries } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, CalendarDays, MapPin, Clock, User, Cpu, Briefcase } from 'lucide-react-native';
import { useTheme } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import interventionsApi, { type Intervention, STATUS_LABELS, STATUS_COLORS } from '../../api/interventions';
import tasksApi, { type Task, TASK_STATUS_LABELS, TASK_STATUS_COLORS } from '../../api/tasks';

type Nav = NativeStackNavigationProp<RootStackParamList>;

type ThemeType = ReturnType<typeof import('../../theme').useTheme>['theme'];
type FilterType = 'ALL' | 'TECH' | 'BUSINESS';

// ── Helpers ───────────────────────────────────────────────────────────────────

const DAYS_FR = ['D', 'L', 'M', 'M', 'J', 'V', 'S']; // 1 lettre pour petit écran
const DAYS_FULL = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']; // pour le header texte
const MONTHS_FR = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
];

function getWeekDays(ref: Date): Date[] {
  const day = ref.getDay();
  const mon = new Date(ref);
  mon.setDate(ref.getDate() - ((day + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    return d;
  });
}

function isSameDay(a: Date, b: Date) {
  return a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
}

function formatTime(iso?: string) {
  if (!iso) return '–';
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

// ── Event Cards ───────────────────────────────────────────────────────────────

function TechEventCard({ item, theme }: { item: Intervention; theme: ThemeType }) {
  const color = STATUS_COLORS[item.status] ?? '#6B7280';
  const typeLabel =
    item.type === 'INSTALLATION' ? 'Installation' : item.type === 'DEPANNAGE' ? 'Dépannage' : (item.type ?? '');
  return (
    <View style={[card(theme).wrap, { borderLeftColor: color }]}>
      <View style={card(theme).timeCol}>
        <Text style={card(theme).time}>{formatTime(item.scheduledDate)}</Text>
        <View style={[card(theme).dot, { backgroundColor: color }]} />
      </View>
      <View style={card(theme).body}>
        <View style={card(theme).row}>
          <View style={[card(theme).badge, { backgroundColor: '#3B82F622' }]}>
            <Cpu size={10} color="#3B82F6" />
            <Text style={[card(theme).badgeText, { color: '#3B82F6' }]}>TECH</Text>
          </View>
          <View style={[card(theme).badge, { backgroundColor: color + '22' }]}>
            <Text style={[card(theme).badgeText, { color }]}>{STATUS_LABELS[item.status]}</Text>
          </View>
        </View>
        {/* Type en premier, en gras */}
        {typeLabel ? (
          <Text style={card(theme).typeLabel} numberOfLines={1}>
            {typeLabel}
          </Text>
        ) : null}
        {/* Nature */}
        <Text style={card(theme).title} numberOfLines={1}>
          {item.nature} {item.vehicleName ? `– ${item.vehicleName}` : ''}
        </Text>
        {item.clientName && (
          <View style={card(theme).meta}>
            <User size={11} color={theme.text.muted} />
            <Text style={card(theme).metaText}>{item.clientName}</Text>
          </View>
        )}
        {(item.address ?? item.location) ? (
          <View style={card(theme).meta}>
            <MapPin size={11} color={theme.text.muted} />
            <Text style={[card(theme).metaText, { flex: 1 }]} numberOfLines={1}>
              {item.address ?? item.location}
            </Text>
          </View>
        ) : null}
        {(item.licensePlate || item.wwPlate) && (
          <View style={card(theme).meta}>
            <Cpu size={11} color={theme.text.muted} />
            <Text style={card(theme).metaText}>{item.licensePlate ?? item.wwPlate}</Text>
            {item.imei && <Text style={{ fontSize: 11, color: theme.text.muted }}> · {item.imei}</Text>}
          </View>
        )}
      </View>
    </View>
  );
}

function BusinessEventCard({ item, theme }: { item: Task; theme: ThemeType }) {
  const color = TASK_STATUS_COLORS[item.status] ?? '#6B7280';
  return (
    <View style={[card(theme).wrap, { borderLeftColor: color }]}>
      <View style={card(theme).timeCol}>
        <Text style={card(theme).time}>{formatTime(item.dueDate)}</Text>
        <View style={[card(theme).dot, { backgroundColor: color }]} />
      </View>
      <View style={card(theme).body}>
        <View style={card(theme).row}>
          <View style={[card(theme).badge, { backgroundColor: '#F59E0B22' }]}>
            <Briefcase size={10} color="#F59E0B" />
            <Text style={[card(theme).badgeText, { color: '#F59E0B' }]}>CRM</Text>
          </View>
          <View style={[card(theme).badge, { backgroundColor: color + '22' }]}>
            <Text style={[card(theme).badgeText, { color }]}>{TASK_STATUS_LABELS[item.status]}</Text>
          </View>
        </View>
        <Text style={card(theme).title} numberOfLines={1}>
          {item.title}
        </Text>
        {item.clientName && (
          <View style={card(theme).meta}>
            <User size={11} color={theme.text.muted} />
            <Text style={card(theme).metaText}>{item.clientName}</Text>
          </View>
        )}
        {item.relatedTo?.name && (
          <View style={card(theme).meta}>
            <Briefcase size={11} color={theme.text.muted} />
            <Text style={card(theme).metaText}>
              {item.relatedTo.type} · {item.relatedTo.name}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const card = (theme: ThemeType) =>
  StyleSheet.create({
    wrap: {
      backgroundColor: theme.bg.surface,
      borderRadius: 12,
      flexDirection: 'row',
      borderWidth: 1,
      borderColor: theme.border,
      borderLeftWidth: 4,
      overflow: 'hidden',
      marginBottom: 10,
    },
    timeCol: { width: 50, alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 14 },
    time: { fontSize: 11, fontWeight: '700', color: theme.text.secondary },
    dot: { width: 7, height: 7, borderRadius: 4 },
    body: { flex: 1, padding: 12, gap: 5 },
    row: { flexDirection: 'row', gap: 6, marginBottom: 2 },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingHorizontal: 6,
      paddingVertical: 3,
      borderRadius: 5,
    },
    badgeText: { fontSize: 10, fontWeight: '700' },
    typeLabel: { fontSize: 14, fontWeight: '700', color: theme.text.primary },
    title: { fontSize: 13, fontWeight: '500', color: theme.text.secondary },
    meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    metaText: { fontSize: 12, color: theme.text.secondary },
  });

// ── Filter Chips ──────────────────────────────────────────────────────────────

function FilterChip({
  label,
  active,
  color,
  count,
  onPress,
  theme,
}: {
  label: string;
  active: boolean;
  color: string;
  count: number;
  onPress: () => void;
  theme: ThemeType;
}) {
  return (
    <TouchableOpacity
      style={[fc(theme).chip, active && { backgroundColor: color, borderColor: color }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Text style={[fc(theme).label, { color: active ? '#fff' : theme.text.secondary }]}>{label}</Text>
      <View style={[fc(theme).badge, { backgroundColor: active ? 'rgba(255,255,255,0.25)' : theme.bg.elevated }]}>
        <Text style={[fc(theme).badgeN, { color: active ? '#fff' : theme.text.muted }]}>{count}</Text>
      </View>
    </TouchableOpacity>
  );
}

const fc = (theme: ThemeType) =>
  StyleSheet.create({
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.bg.surface,
    },
    label: { fontSize: 12, fontWeight: '600' },
    badge: {
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 4,
    },
    badgeN: { fontSize: 10, fontWeight: '700' },
  });

// ── Main ──────────────────────────────────────────────────────────────────────

export default function AgendaScreen() {
  const { theme } = useTheme();
  const s = styles(theme);
  const nav = useNavigation<Nav>();
  const user = useAuthStore((st) => st.user);
  const isTech = user?.role?.toUpperCase() === 'TECH';

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weekOffset, setWeekOffset] = useState(0);
  const [filter, setFilter] = useState<FilterType>('ALL');

  const referenceDate = new Date();
  referenceDate.setDate(referenceDate.getDate() + weekOffset * 7);
  const weekDays = getWeekDays(referenceDate);

  const [intQuery, taskQuery] = useQueries({
    queries: [
      {
        queryKey: ['tech-interventions', isTech ? user?.id : 'all'],
        queryFn: () => interventionsApi.getAll(isTech ? { technicianId: user!.id } : undefined),
        refetchInterval: 60000,
      },
      {
        queryKey: ['crm-tasks', isTech ? user?.id : 'all'],
        queryFn: () => tasksApi.getAll(isTech ? { assignedTo: user!.id } : undefined),
        refetchInterval: 60000,
        // TECH n'a pas VIEW_CRM — on désactive pour éviter le 403
        enabled: !isTech,
      },
    ],
  });

  const interventions: Intervention[] = useMemo(() => intQuery.data ?? [], [intQuery.data]);
  const tasks: Task[] = useMemo(() => taskQuery.data ?? [], [taskQuery.data]);

  const isLoading = intQuery.isLoading || taskQuery.isLoading;
  const isRefetching = intQuery.isRefetching || taskQuery.isRefetching;
  const refetch = () => {
    intQuery.refetch();
    taskQuery.refetch();
  };

  // Événements du jour sélectionné, filtrés par type
  const dayEvents = useMemo(() => {
    const techEvents = interventions.filter(
      (i) => i.scheduledDate && isSameDay(new Date(i.scheduledDate), selectedDate)
    );
    const bizEvents = tasks.filter((t) => t.dueDate && isSameDay(new Date(t.dueDate), selectedDate));

    const all: Array<{ type: 'TECH' | 'BUSINESS'; time: string; data: Intervention | Task }> = [];

    if (filter !== 'BUSINESS') {
      techEvents.forEach((i) => all.push({ type: 'TECH', time: i.scheduledDate, data: i }));
    }
    if (filter !== 'TECH') {
      bizEvents.forEach((t) => all.push({ type: 'BUSINESS', time: t.dueDate ?? '', data: t }));
    }

    return all.sort((a, b) => a.time.localeCompare(b.time));
  }, [interventions, tasks, selectedDate, filter]);

  // Compte d'événements par jour (pour les points sous les dates)
  const countForDay = (day: Date) =>
    interventions.filter((i) => i.scheduledDate && isSameDay(new Date(i.scheduledDate), day)).length +
    tasks.filter((t) => t.dueDate && isSameDay(new Date(t.dueDate), day)).length;

  const techCount = interventions.filter(
    (i) => i.scheduledDate && isSameDay(new Date(i.scheduledDate), selectedDate)
  ).length;
  const bizCount = tasks.filter((t) => t.dueDate && isSameDay(new Date(t.dueDate), selectedDate)).length;

  const monthLabel = `${MONTHS_FR[weekDays[0].getMonth()]} ${weekDays[0].getFullYear()}`;

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>Agenda</Text>
        <TouchableOpacity
          style={s.todayBtn}
          onPress={() => {
            setSelectedDate(new Date());
            setWeekOffset(0);
          }}
        >
          <CalendarDays size={14} color={theme.primary} />
          <Text style={s.todayText}>Aujourd'hui</Text>
        </TouchableOpacity>
      </View>

      {/* Navigation semaine */}
      <View style={s.weekNav}>
        <TouchableOpacity
          onPress={() => setWeekOffset((w) => w - 1)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ChevronLeft size={20} color={theme.text.secondary} />
        </TouchableOpacity>
        <Text style={s.monthLabel}>{monthLabel}</Text>
        <TouchableOpacity
          onPress={() => setWeekOffset((w) => w + 1)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ChevronRight size={20} color={theme.text.secondary} />
        </TouchableOpacity>
      </View>

      {/* Jours semaine */}
      <View style={s.daysRow}>
        {weekDays.map((day, i) => {
          const isSelected = isSameDay(day, selectedDate);
          const isToday = isSameDay(day, new Date());
          const count = countForDay(day);
          return (
            <TouchableOpacity
              key={i}
              style={[s.dayBtn, isSelected && { backgroundColor: theme.primary }]}
              onPress={() => setSelectedDate(day)}
              activeOpacity={0.8}
            >
              <Text style={[s.dayName, isSelected && { color: '#fff' }]}>{DAYS_FR[day.getDay()]}</Text>
              <View
                style={[
                  s.dayNumWrap,
                  count > 0 && !isSelected && { backgroundColor: theme.primary + '28' },
                  isToday && !isSelected && !count && { borderWidth: 1.5, borderColor: theme.primary },
                ]}
              >
                <Text
                  style={[
                    s.dayNum,
                    isToday && !isSelected && { color: theme.primary, fontWeight: '700' },
                    count > 0 && !isSelected && { color: theme.primary, fontWeight: '700' },
                    isSelected && { color: '#fff' },
                  ]}
                >
                  {day.getDate()}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Filtres TECH / BUSINESS / ALL */}
      <View style={s.filtersRow}>
        <FilterChip
          label="Tous"
          active={filter === 'ALL'}
          color={theme.primary}
          count={techCount + bizCount}
          onPress={() => setFilter('ALL')}
          theme={theme}
        />
        <FilterChip
          label="Interventions"
          active={filter === 'TECH'}
          color="#3B82F6"
          count={techCount}
          onPress={() => setFilter('TECH')}
          theme={theme}
        />
        {/* Les tâches CRM ne sont disponibles que pour les rôles non-TECH */}
        {!isTech && (
          <FilterChip
            label="Tâches CRM"
            active={filter === 'BUSINESS'}
            color="#F59E0B"
            count={bizCount}
            onPress={() => setFilter('BUSINESS')}
            theme={theme}
          />
        )}
      </View>

      {/* Liste événements */}
      <ScrollView
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme.primary} />}
      >
        <Text style={s.dayHeader}>
          {DAYS_FULL[selectedDate.getDay()]} {selectedDate.getDate()} {MONTHS_FR[selectedDate.getMonth()]}
          {'  '}
          <Text style={{ color: theme.text.muted, fontSize: 13, fontWeight: '400' }}>
            {dayEvents.length} événement{dayEvents.length !== 1 ? 's' : ''}
          </Text>
        </Text>

        {isLoading ? (
          <ActivityIndicator color={theme.primary} style={{ marginTop: 24 }} />
        ) : dayEvents.length === 0 ? (
          <View style={s.empty}>
            <CalendarDays size={40} color={theme.text.muted} />
            <Text style={s.emptyText}>Aucun événement ce jour</Text>
          </View>
        ) : (
          dayEvents.map((ev, idx) =>
            ev.type === 'TECH' ? (
              <TouchableOpacity
                key={`t-${ev.data.id ?? idx}`}
                onPress={() => nav.navigate('InterventionDetail', { interventionId: ev.data.id })}
                activeOpacity={0.85}
              >
                <TechEventCard item={ev.data as Intervention} theme={theme} />
              </TouchableOpacity>
            ) : (
              <BusinessEventCard key={`b-${ev.data.id ?? idx}`} item={ev.data as Task} theme={theme} />
            )
          )
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = (theme: ThemeType) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg.primary },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    title: { fontSize: 22, fontWeight: '700', color: theme.text.primary },
    todayBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: theme.primaryDim,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 10,
    },
    todayText: { fontSize: 12, color: theme.primary, fontWeight: '600' },
    weekNav: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    monthLabel: { fontSize: 15, fontWeight: '600', color: theme.text.primary },
    daysRow: { flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 10, gap: 3 },
    dayBtn: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 12, gap: 3 },
    dayName: { fontSize: 10, color: theme.text.muted, fontWeight: '500', textTransform: 'uppercase' },
    dayNumWrap: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    dayNum: { fontSize: 15, fontWeight: '600', color: theme.text.primary },
    filtersRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 10 },
    list: { padding: 16, paddingBottom: 100 },
    dayHeader: { fontSize: 15, fontWeight: '700', color: theme.text.primary, marginBottom: 14 },
    empty: { alignItems: 'center', paddingVertical: 48, gap: 12 },
    emptyText: { fontSize: 14, color: theme.text.muted },
  });
