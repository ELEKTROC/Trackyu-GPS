/**
 * TrackYu Mobile — Portal Tickets List
 */
import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useInfiniteQuery } from '@tanstack/react-query';
import { ArrowLeft, TicketCheck, Plus, ChevronRight } from 'lucide-react-native';
import { useTheme } from '../../theme';
import { SkeletonRow } from '../../components/SkeletonBox';
import { portalApi, type PortalTicket } from '../../api/portal';
import {
  TICKET_STATUS_COLORS,
  TICKET_STATUS_LABELS,
  TICKET_PRIORITY_COLORS,
  TICKET_PRIORITY_LABELS,
} from '../../utils/portalColors';
import type { PortalStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<PortalStackParamList>;

export default function PortalTicketsScreen() {
  const { theme } = useTheme();
  const s = styles(theme);
  const nav = useNavigation<Nav>();

  const { data, isLoading, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['portal-tickets'],
    queryFn: ({ pageParam = 1 }) => portalApi.getMyTickets(pageParam as number, 20),
    getNextPageParam: (last, pages) => (last.data.length === 20 ? pages.length + 1 : undefined),
    initialPageParam: 1,
  });

  const tickets = data?.pages.flatMap((p) => p.data) ?? [];

  const renderItem = ({ item }: { item: PortalTicket }) => {
    const statusColor = TICKET_STATUS_COLORS[item.status] ?? '#6B7280';
    const priorityColor = TICKET_PRIORITY_COLORS[item.priority] ?? '#6B7280';
    return (
      <TouchableOpacity
        style={s.card}
        onPress={() => nav.navigate('PortalTicketDetail', { ticketId: item.id, subject: item.subject })}
        activeOpacity={0.75}
      >
        <View style={[s.leftBar, { backgroundColor: statusColor }]} />
        <View style={s.cardBody}>
          <View style={s.row}>
            <Text style={s.subject} numberOfLines={1}>
              {item.subject}
            </Text>
            <ChevronRight size={16} color={theme.text.muted} />
          </View>
          <View style={s.badges}>
            <View
              style={{ backgroundColor: statusColor + '22', borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2 }}
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
                paddingVertical: 2,
              }}
            >
              <Text style={{ color: priorityColor, fontSize: 10, fontWeight: '600' }}>
                {TICKET_PRIORITY_LABELS[item.priority] ?? item.priority}
              </Text>
            </View>
            {item.category ? (
              <View
                style={{
                  backgroundColor: theme.bg.elevated,
                  borderRadius: 5,
                  paddingHorizontal: 7,
                  paddingVertical: 2,
                }}
              >
                <Text style={{ color: theme.text.muted, fontSize: 10 }}>{item.category}</Text>
              </View>
            ) : null}
          </View>
          <Text style={s.date}>
            {new Date(item.updated_at).toLocaleDateString('fr-FR', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => nav.goBack()} style={s.backBtn}>
          <ArrowLeft size={22} color={theme.text.primary} />
        </TouchableOpacity>
        <Text style={s.title}>Mes Tickets</Text>
        <TouchableOpacity style={s.newBtn} onPress={() => nav.navigate('PortalNewTicket')} activeOpacity={0.8}>
          <Plus size={18} color={theme.text.onPrimary} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 8 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </ScrollView>
      ) : !tickets.length ? (
        <View style={s.center}>
          <TicketCheck size={48} color={theme.text.muted} />
          <Text style={s.empty}>Aucun ticket trouvé</Text>
          <TouchableOpacity style={s.createBtn} onPress={() => nav.navigate('PortalNewTicket')} activeOpacity={0.8}>
            <Plus size={16} color={theme.text.onPrimary} />
            <Text style={s.createBtnText}>Créer un ticket</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={tickets}
          keyExtractor={(i) => i.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, gap: 8 }}
          onEndReached={() => hasNextPage && !isFetchingNextPage && fetchNextPage()}
          onEndReachedThreshold={0.3}
          refreshing={false}
          onRefresh={refetch}
          ListFooterComponent={
            isFetchingNextPage ? <ActivityIndicator color={theme.primary} style={{ marginVertical: 16 }} /> : null
          }
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
    title: { fontSize: 20, fontWeight: '700', color: theme.text.primary, flex: 1 },
    newBtn: {
      backgroundColor: theme.primary,
      width: 36,
      height: 36,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
    },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
    empty: { fontSize: 14, color: theme.text.muted },
    createBtn: {
      backgroundColor: theme.primary,
      borderRadius: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    createBtnText: { color: theme.text.onPrimary, fontWeight: '600', fontSize: 14 },

    card: {
      backgroundColor: theme.bg.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      flexDirection: 'row',
      overflow: 'hidden',
    },
    leftBar: { width: 4 },
    cardBody: { flex: 1, padding: 12, gap: 6 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    subject: { flex: 1, fontSize: 14, fontWeight: '600', color: theme.text.primary },
    badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    date: { fontSize: 11, color: theme.text.muted },
  });
