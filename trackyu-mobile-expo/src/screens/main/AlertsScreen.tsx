/**
 * TrackYu Mobile - Alerts Screen
 * Pagination infinie + toast temps réel via WebSocket
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  Zap,
  MapPin,
  Fuel,
  Wrench,
  AlertTriangle,
  BatteryLow,
  Radio,
  CheckCheck,
  Clock,
  Lock,
} from 'lucide-react-native';
import alertsApi, { type Alert, setAlertLocale } from '../../api/alerts';
import { wsService, type CommandAckPayload } from '../../services/websocket';
import storage from '../../utils/storage';
import { useTheme } from '../../theme';

// ── Toast temps réel ──────────────────────────────────────────────────────────
function RealtimeToast({
  alert,
  onDismiss,
  severityColor,
  theme,
}: {
  alert: Alert;
  onDismiss: () => void;
  severityColor: string;
  theme: ReturnType<typeof import('../../theme').useTheme>['theme'];
}) {
  const [opacity] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.delay(4000),
      Animated.timing(opacity, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]).start(onDismiss);
  }, [opacity, onDismiss]);

  return (
    <Animated.View
      style={[
        {
          backgroundColor: theme.bg.elevated,
          borderRadius: 12,
          padding: 14,
          borderLeftWidth: 4,
          position: 'absolute',
          top: 80,
          left: 16,
          right: 16,
          zIndex: 100,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.4,
          shadowRadius: 8,
          elevation: 8,
        },
        { opacity, borderLeftColor: severityColor },
      ]}
    >
      <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text.primary }}>{alert.title}</Text>
      <Text style={{ fontSize: 12, color: theme.text.secondary, marginTop: 2 }}>{alert.vehicleName}</Text>
    </Animated.View>
  );
}

// ── Icône alerte ──────────────────────────────────────────────────────────────
function AlertIcon({ type, color }: { type: Alert['type']; color: string }) {
  const props = { size: 18, color };
  switch (type) {
    case 'speed':
      return <Zap {...props} />;
    case 'geofence':
      return <MapPin {...props} />;
    case 'fuel':
      return <Fuel {...props} />;
    case 'maintenance':
      return <Wrench {...props} />;
    case 'sos':
      return <AlertTriangle {...props} />;
    case 'battery':
      return <BatteryLow {...props} />;
    case 'offline':
      return <Radio {...props} />;
    case 'idle':
      return <Clock {...props} />;
    case 'immobilization':
      return <Lock {...props} />;
    default:
      return <Bell {...props} />;
  }
}

// ── Composant principal ───────────────────────────────────────────────────────
type AlertPeriodFilter = 'today' | 'yesterday' | 'week' | 'all';
const PERIOD_FILTERS: { key: AlertPeriodFilter; label: string }[] = [
  { key: 'today', label: "Aujourd'hui" },
  { key: 'yesterday', label: 'Hier' },
  { key: 'week', label: 'Cette semaine' },
  { key: 'all', label: 'Tout' },
];

export function AlertsScreen() {
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const [toastAlert, setToastAlert] = useState<Alert | null>(null);
  const [periodFilter, setPeriodFilter] = useState<AlertPeriodFilter>('today');
  const s = styles(theme);

  const getSeverityColor = (severity: Alert['severity']) => {
    switch (severity) {
      case 'critical':
        return theme.functional.error;
      case 'warning':
        return theme.functional.warning;
      case 'info':
        return theme.functional.info;
      default:
        return theme.text.muted;
    }
  };

  const { data, isLoading, isFetchingNextPage, fetchNextPage, hasNextPage, refetch, isRefetching } = useInfiniteQuery({
    queryKey: ['alerts'],
    queryFn: ({ pageParam = 1 }) => alertsApi.getPage(pageParam as number),
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
    initialPageParam: 1,
  });

  const alerts = React.useMemo(() => data?.pages.flatMap((p) => p.data) ?? [], [data]);

  useEffect(() => {
    const unsub = wsService.onAlertNew((newAlert) => {
      queryClient.setQueryData(['alerts'], (old: typeof data) => {
        if (!old || !old.pages?.length) return old;
        const firstPage = old.pages[0];
        return {
          ...old,
          pages: [{ ...firstPage, data: [newAlert, ...(firstPage.data ?? [])] }, ...old.pages.slice(1)],
        };
      });
      setToastAlert(newAlert);
    });
    return unsub;
  }, [queryClient]);

  useEffect(() => {
    const unsub = wsService.onAlertAck((ack: CommandAckPayload) => {
      // Mettre à jour le titre de l'alerte liée dans le cache React Query
      queryClient.setQueryData(['alerts'], (old: typeof data) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            data: page.data.map((alert) => {
              if (String(alert.id) !== String(ack.alertId)) return alert;
              // Mettre à jour le titre avec le statut ACK
              const newTitle =
                alert.title.replace(/·\s*(En attente|Envoyé|Succès|Échec|Débloqué)$/, '').trimEnd() +
                ' · ' +
                ack.ackLabel;
              return { ...alert, title: newTitle.slice(0, 80) };
            }),
          })),
        };
      });
    });
    return unsub;
  }, [queryClient]);

  // Charge la locale au montage pour les libellés d'alertes
  useEffect(() => {
    storage.getString('pref_language').then((lang) => {
      if (lang) setAlertLocale(lang);
    });
  }, []);

  const markAsReadMutation = useMutation({
    mutationFn: alertsApi.markAsRead,
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ['alerts'] });
      queryClient.setQueryData(['alerts'], (old: typeof data) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((p) => ({
            ...p,
            data: p.data.map((a) => (a.id === id ? { ...a, isRead: true } : a)),
          })),
        };
      });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['alerts'] }),
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: alertsApi.markAllAsRead,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['alerts'] });
      queryClient.setQueryData(['alerts'], (old: typeof data) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((p) => ({
            ...p,
            data: p.data.map((a) => ({ ...a, isRead: true })),
          })),
        };
      });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['alerts'] }),
  });

  const formatDate = (dateString?: string): string => {
    if (!dateString) return '–';
    const ts = new Date(dateString).getTime();
    if (isNaN(ts)) return '–';
    // eslint-disable-next-line react-hooks/purity
    const diffMs = Date.now() - ts;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return "À l'instant";
    if (diffMins < 60) return `${diffMins} min`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}j`;
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const sections = React.useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);

    const filtered = alerts.filter(Boolean).filter((alert) => {
      const d = new Date(alert.createdAt);
      if (periodFilter === 'today') return d >= todayStart;
      if (periodFilter === 'yesterday') return d >= yesterdayStart && d < todayStart;
      if (periodFilter === 'week') return d >= weekStart;
      return true;
    });

    if (periodFilter !== 'all') {
      return filtered.length > 0
        ? [{ title: PERIOD_FILTERS.find((p) => p.key === periodFilter)?.label ?? '', data: filtered }]
        : [];
    }

    const groups: { title: string; data: Alert[] }[] = [
      { title: "Aujourd'hui", data: [] },
      { title: 'Hier', data: [] },
      { title: 'Plus ancien', data: [] },
    ];
    filtered.forEach((alert) => {
      const d = new Date(alert.createdAt);
      d.setHours(0, 0, 0, 0);
      if (d.getTime() === todayStart.getTime()) groups[0].data.push(alert);
      else if (d.getTime() === yesterdayStart.getTime()) groups[1].data.push(alert);
      else groups[2].data.push(alert);
    });
    return groups.filter((g) => g.data.length > 0);
  }, [alerts, periodFilter]);

  const unreadCount = alerts.filter((a) => !a.isRead).length;

  const renderAlert = ({ item: alert }: { item: Alert }) => {
    const severityColor = getSeverityColor(alert.severity);
    return (
      <TouchableOpacity
        style={[s.alertCard, !alert.isRead && { borderColor: severityColor + '44' }]}
        onPress={() => {
          if (!alert.isRead) markAsReadMutation.mutate(alert.id);
        }}
        activeOpacity={0.7}
        accessibilityLabel={`Alerte ${alert.title} — ${alert.vehicleName}${!alert.isRead ? ' (non lue)' : ''}`}
        accessibilityRole="button"
        accessibilityState={{ selected: !alert.isRead }}
      >
        <View style={[s.severityBar, { backgroundColor: severityColor }]} />
        <View style={s.alertBody}>
          <View style={s.alertHeader}>
            <View style={[s.alertIconWrap, { backgroundColor: severityColor + '22' }]}>
              <AlertIcon type={alert.type} color={severityColor} />
            </View>
            <View style={s.alertMeta}>
              <Text style={s.alertTitle}>{alert.title}</Text>
              <Text style={s.alertVehicle}>
                {alert.vehicleName} · {alert.vehiclePlate}
              </Text>
            </View>
            <Text style={s.alertTime}>{formatDate(alert.createdAt)}</Text>
          </View>
          <Text style={s.alertMessage} numberOfLines={2}>
            {alert.customMessage ?? alert.message}
          </Text>
        </View>
        {!alert.isRead && <View style={[s.unreadDot, { backgroundColor: theme.primary }]} />}
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={s.centered} edges={['top']}>
        <ActivityIndicator size="large" color={theme.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <Text style={s.headerTitle}>Alertes</Text>
          {unreadCount > 0 && (
            <View style={[s.badge, { backgroundColor: theme.functional.error }]}>
              <Text style={s.badgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity
            style={s.markAllBtn}
            onPress={() => markAllAsReadMutation.mutate()}
            disabled={markAllAsReadMutation.isPending}
            testID="btn-mark-all-read"
            accessibilityLabel="Marquer toutes les alertes comme lues"
            accessibilityRole="button"
            accessibilityState={{ busy: markAllAsReadMutation.isPending }}
          >
            <CheckCheck size={14} color={theme.primary} />
            <Text style={[s.markAllText, { color: theme.primary }]}>
              {markAllAsReadMutation.isPending ? '…' : 'Tout lire'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filtre période */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 8 }}>
        {PERIOD_FILTERS.map(({ key, label }) => (
          <TouchableOpacity
            key={key}
            onPress={() => setPeriodFilter(key)}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 6,
              borderRadius: 20,
              backgroundColor: periodFilter === key ? theme.primary : theme.bg.surface,
              borderWidth: 1,
              borderColor: periodFilter === key ? theme.primary : theme.border,
            }}
            accessibilityLabel={`Filtrer par ${label}`}
            accessibilityRole="button"
            accessibilityState={{ selected: periodFilter === key }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: '600',
                color: periodFilter === key ? theme.text.onPrimary : theme.text.secondary,
              }}
            >
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Toast temps réel */}
      {toastAlert && (
        <RealtimeToast
          alert={toastAlert}
          severityColor={getSeverityColor(toastAlert.severity)}
          onDismiss={() => setToastAlert(null)}
          theme={theme}
        />
      )}

      {/* Liste */}
      <SectionList
        sections={sections}
        renderItem={renderAlert}
        renderSectionHeader={({ section }) => (
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>{section.title}</Text>
          </View>
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
        ListFooterComponent={
          hasNextPage ? (
            <TouchableOpacity
              style={s.loadMore}
              onPress={() => fetchNextPage()}
              accessibilityLabel="Charger plus d'alertes"
              accessibilityRole="button"
            >
              {isFetchingNextPage ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : (
                <Text style={[s.loadMoreText, { color: theme.primary }]}>Charger plus</Text>
              )}
            </TouchableOpacity>
          ) : null
        }
        ListEmptyComponent={
          <View style={s.empty}>
            <Bell size={40} color={theme.text.muted} />
            <Text style={s.emptyTitle}>Aucune alerte</Text>
            <Text style={s.emptySubtitle}>Vos alertes apparaîtront ici</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = (theme: ReturnType<typeof import('../../theme').useTheme>['theme']) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg.primary },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.bg.primary },

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    headerTitle: { fontSize: 22, fontWeight: '700', color: theme.text.primary },
    badge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 10,
      minWidth: 24,
      alignItems: 'center',
    },
    badgeText: { fontSize: 12, fontWeight: '700', color: '#fff' },
    markAllBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 12,
      paddingVertical: 7,
      backgroundColor: theme.primaryDim,
      borderRadius: 10,
    },
    markAllText: { fontSize: 13, fontWeight: '600' },

    listContent: { padding: 16, paddingBottom: 100 },

    sectionHeader: { marginTop: 4, marginBottom: 10 },
    sectionTitle: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.text.secondary,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },

    alertCard: {
      flexDirection: 'row',
      backgroundColor: theme.bg.surface,
      borderRadius: 12,
      marginBottom: 10,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: theme.border,
    },
    severityBar: { width: 3 },
    alertBody: { flex: 1, padding: 12 },
    alertHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6, gap: 10 },
    alertIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
    },
    alertMeta: { flex: 1 },
    alertTitle: { fontSize: 14, fontWeight: '600', color: theme.text.primary },
    alertVehicle: { fontSize: 12, color: theme.text.secondary, marginTop: 2 },
    alertTime: { fontSize: 11, color: theme.text.secondary },
    alertMessage: { fontSize: 13, color: theme.text.secondary, lineHeight: 18 },
    unreadDot: {
      position: 'absolute',
      top: 10,
      right: 10,
      width: 8,
      height: 8,
      borderRadius: 4,
    },

    loadMore: { alignItems: 'center', paddingVertical: 16 },
    loadMoreText: { fontSize: 14, fontWeight: '600' },

    empty: { alignItems: 'center', paddingVertical: 60, gap: 10 },
    emptyTitle: { fontSize: 16, fontWeight: '600', color: theme.text.secondary },
    emptySubtitle: { fontSize: 13, color: theme.text.muted },
  });

export default AlertsScreen;
