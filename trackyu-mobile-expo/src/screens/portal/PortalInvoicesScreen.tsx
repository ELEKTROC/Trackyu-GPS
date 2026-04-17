/**
 * TrackYu Mobile — Portal Invoices List
 */
import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useInfiniteQuery } from '@tanstack/react-query';
import { ArrowLeft, ChevronRight, FileText } from 'lucide-react-native';
import { useTheme } from '../../theme';
import { SkeletonRow } from '../../components/SkeletonBox';
import { portalApi, type PortalInvoice } from '../../api/portal';
import { formatCurrency } from '../../utils/formatCurrency';
import { INVOICE_STATUS_COLORS, INVOICE_STATUS_LABELS } from '../../utils/portalColors';
import type { PortalStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<PortalStackParamList>;

export default function PortalInvoicesScreen() {
  const { theme } = useTheme();
  const s = styles(theme);
  const nav = useNavigation<Nav>();

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, refetch } = useInfiniteQuery({
    queryKey: ['portal-invoices'],
    queryFn: ({ pageParam = 1 }) => portalApi.getInvoices(pageParam as number, 20),
    getNextPageParam: (last, pages) => (last.data.length === 20 ? pages.length + 1 : undefined),
    initialPageParam: 1,
  });

  const invoices = data?.pages.flatMap((p) => p.data) ?? [];

  const fmt = formatCurrency;

  const renderItem = ({ item }: { item: PortalInvoice }) => {
    const color = INVOICE_STATUS_COLORS[item.status] ?? '#6B7280';
    return (
      <TouchableOpacity
        style={s.card}
        onPress={() => nav.navigate('PortalInvoiceDetail', { invoiceId: item.id })}
        activeOpacity={0.75}
      >
        <View style={[s.leftBar, { backgroundColor: color }]} />
        <View style={s.cardBody}>
          <View style={s.row}>
            <Text style={s.invoiceNum}>{item.invoice_number}</Text>
            <View style={{ backgroundColor: color + '22', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
              <Text style={{ color, fontSize: 11, fontWeight: '600' }}>
                {INVOICE_STATUS_LABELS[item.status] ?? item.status}
              </Text>
            </View>
          </View>
          <View style={s.row}>
            <Text style={s.date}>
              {item.date
                ? new Date(item.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
                : '–'}
            </Text>
            <Text style={s.amount}>{fmt(item.amount_ttc)}</Text>
          </View>
          {item.status !== 'PAID' && item.paid_amount > 0 && <Text style={s.paid}>Payé : {fmt(item.paid_amount)}</Text>}
        </View>
        <ChevronRight size={16} color={theme.text.muted} />
      </TouchableOpacity>
    );
  };

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
        <Text style={s.title}>Mes Factures</Text>
      </View>

      {isLoading ? (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 8 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </ScrollView>
      ) : invoices.length === 0 ? (
        <View style={s.center}>
          <FileText size={48} color={theme.text.muted} />
          <Text style={s.empty}>Aucune facture trouvée</Text>
        </View>
      ) : (
        <FlatList
          data={invoices}
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
    title: { fontSize: 20, fontWeight: '700', color: theme.text.primary },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
    empty: { fontSize: 14, color: theme.text.muted },

    card: {
      backgroundColor: theme.bg.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      flexDirection: 'row',
      alignItems: 'center',
      overflow: 'hidden',
    },
    leftBar: { width: 4, alignSelf: 'stretch' },
    cardBody: { flex: 1, padding: 12, gap: 6 },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    invoiceNum: { fontSize: 14, fontWeight: '700', color: theme.text.primary },
    date: { fontSize: 12, color: theme.text.muted },
    amount: { fontSize: 14, fontWeight: '700', color: theme.text.primary },
    paid: { fontSize: 11, color: theme.functional.success },
  });
