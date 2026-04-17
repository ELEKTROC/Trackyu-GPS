/**
 * TrackYu Mobile — Portal Payment History
 */
import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, CreditCard, Banknote, Smartphone, FileText, ChevronRight } from 'lucide-react-native';
import { useTheme } from '../../theme';
import { portalApi, type PortalPayment } from '../../api/portal';
import { SkeletonRow } from '../../components/SkeletonBox';
import { formatCurrency } from '../../utils/formatCurrency';
import type { PortalStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<PortalStackParamList>;

function MethodIcon({ method, color }: { method?: string | null; color: string }) {
  const lower = (method ?? '').toLowerCase();
  if (lower.includes('carte') || lower.includes('card') || lower.includes('visa') || lower.includes('cb'))
    return <CreditCard size={18} color={color} />;
  if (lower.includes('mobile') || lower.includes('orange') || lower.includes('mtn') || lower.includes('wave'))
    return <Smartphone size={18} color={color} />;
  return <Banknote size={18} color={color} />;
}

export default function PortalPaymentsScreen() {
  const { theme } = useTheme();
  const s = styles(theme);
  const nav = useNavigation<Nav>();

  const { data, isLoading, refetch, isRefetching } = useQuery<PortalPayment[]>({
    queryKey: ['portal-payments'],
    queryFn: () => portalApi.getPayments(),
  });

  const fmt = formatCurrency;

  // Total paid
  const total = data?.reduce((sum, p) => sum + p.amount, 0) ?? 0;

  const renderItem = ({ item }: { item: PortalPayment }) => (
    <View style={s.card}>
      <View style={s.iconWrap}>
        <MethodIcon method={item.method} color={theme.primary} />
      </View>
      <View style={s.cardBody}>
        <View style={s.row}>
          <Text style={s.method}>{item.method ?? '–'}</Text>
          <Text style={s.amount}>{fmt(item.amount)}</Text>
        </View>
        <View style={s.row}>
          <Text style={s.date}>
            {item.payment_date
              ? new Date(item.payment_date).toLocaleDateString('fr-FR', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })
              : '–'}
          </Text>
          <TouchableOpacity
            style={s.invoiceLink}
            onPress={() =>
              item.invoice_id ? nav.navigate('PortalInvoiceDetail', { invoiceId: item.invoice_id }) : undefined
            }
            activeOpacity={item.invoice_id ? 0.7 : 1}
          >
            <FileText size={12} color={theme.primary} />
            <Text style={s.invoiceLinkText}>{item.invoice_number}</Text>
            <ChevronRight size={10} color={theme.primary} />
          </TouchableOpacity>
        </View>
        {item.note ? <Text style={s.note}>{item.note}</Text> : null}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => nav.goBack()} style={s.backBtn}>
          <ArrowLeft size={22} color={theme.text.primary} />
        </TouchableOpacity>
        <View>
          <Text style={s.title}>Historique Paiements</Text>
          {data?.length ? (
            <Text style={s.subtitle}>
              {data.length} paiement{data.length > 1 ? 's' : ''} · {fmt(total)}
            </Text>
          ) : null}
        </View>
      </View>

      {isLoading ? (
        <View style={{ padding: 16, gap: 8 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </View>
      ) : !data?.length ? (
        <View style={s.center}>
          <CreditCard size={48} color={theme.text.muted} />
          <Text style={s.empty}>Aucun paiement enregistré</Text>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(p) => p.id}
          renderItem={renderItem}
          contentContainerStyle={s.list}
          refreshing={isRefetching}
          onRefresh={refetch}
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
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
    list: { padding: 16, gap: 8 },
    empty: { fontSize: 14, color: theme.text.muted },

    card: {
      backgroundColor: theme.bg.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      gap: 12,
    },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: theme.primaryDim,
      justifyContent: 'center',
      alignItems: 'center',
    },
    cardBody: { flex: 1, gap: 5 },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    method: { fontSize: 14, fontWeight: '600', color: theme.text.primary },
    amount: { fontSize: 15, fontWeight: '700', color: theme.functional.success },
    date: { fontSize: 12, color: theme.text.muted },
    invoiceLink: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    invoiceLinkText: { fontSize: 11, color: theme.primary, fontWeight: '600' },
    note: { fontSize: 11, color: theme.text.muted, fontStyle: 'italic' },
  });
