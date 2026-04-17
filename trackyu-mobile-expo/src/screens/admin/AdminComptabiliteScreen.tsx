/**
 * TrackYu Mobile — Admin Comptabilité Screen
 * 3 onglets essentiels (aligné sur AccountingView web) :
 *   • Vue d'ensemble → KPIs : CA, Encaissements, Impayés, Taux recouvrement
 *   • Paiements      → /api/finance/payments  (liste triée par date)
 *   • Recouvrement   → /api/finance/invoices  (filtrés OVERDUE / PARTIALLY_PAID)
 */
import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  BarChart3,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  Clock,
  CreditCard,
} from 'lucide-react-native';
import { useTheme } from '../../theme';
import { ProtectedScreen } from '../../components/ProtectedScreen';
import { EmptyState } from '../../components/EmptyState';
import { ADMIN_SCREEN_ROLES } from '../../constants/roles';
import {
  invoicesApi,
  paymentsApi,
  type Invoice,
  type Payment,
  INVOICE_STATUS_LABELS,
  INVOICE_STATUS_COLORS,
} from '../../api/financeApi';

type ThemeType = ReturnType<typeof import('../../theme').useTheme>['theme'];
type TabKey = 'overview' | 'payments' | 'recovery';

const TABS: { key: TabKey; label: string; icon: React.ComponentType<{ size: number; color: string }> }[] = [
  { key: 'overview', label: "Vue d'ensemble", icon: BarChart3 },
  { key: 'payments', label: 'Paiements', icon: DollarSign },
  { key: 'recovery', label: 'Recouvrement', icon: AlertTriangle },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtAmount(n: number): string {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' FCFA';
}

function fmtDate(str?: string): string {
  if (!str) return '–';
  return new Date(str).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Onglet Vue d'ensemble ─────────────────────────────────────────────────────

function OverviewTab({ theme }: { theme: ThemeType }) {
  const invQ = useQuery({ queryKey: ['compta-invoices'], queryFn: invoicesApi.getAll, staleTime: 60_000 });
  const payQ = useQuery({ queryKey: ['compta-payments'], queryFn: paymentsApi.getAll, staleTime: 60_000 });

  const isLoading = invQ.isLoading || payQ.isLoading;

  const kpis = useMemo(() => {
    const invoices: Invoice[] = invQ.data ?? [];
    const payments: Payment[] = payQ.data ?? [];

    const caTotal = invoices.reduce((s, i) => s + (i.amount ?? 0), 0);
    const encaisse = payments.reduce((s, p) => s + (p.amount ?? 0), 0);
    const impayes = invoices
      .filter((i) => i.status === 'OVERDUE' || i.status === 'PARTIALLY_PAID')
      .reduce((s, i) => s + ((i.balance != null ? i.balance : i.amount) ?? 0), 0);
    const tauxRecouv = caTotal > 0 ? Math.round((encaisse / caTotal) * 100) : 0;

    const overdueCount = invoices.filter((i) => i.status === 'OVERDUE').length;
    const paidCount = invoices.filter((i) => i.status === 'PAID').length;

    return { caTotal, encaisse, impayes, tauxRecouv, overdueCount, paidCount, totalInvoices: invoices.length };
  }, [invQ.data, payQ.data]);

  if (isLoading) return <ActivityIndicator color={theme.primary} style={{ marginTop: 40 }} />;

  const tauxColor = kpis.tauxRecouv >= 80 ? '#22C55E' : kpis.tauxRecouv >= 50 ? '#F59E0B' : '#EF4444';

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={invQ.isRefetching || payQ.isRefetching}
          onRefresh={() => {
            invQ.refetch();
            payQ.refetch();
          }}
          tintColor={theme.primary}
        />
      }
      contentContainerStyle={{ padding: 16, gap: 12 }}
    >
      {/* KPIs financiers */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {[
          { label: 'CA émis', value: fmtAmount(kpis.caTotal), icon: TrendingUp, color: theme.primary },
          { label: 'Encaissements', value: fmtAmount(kpis.encaisse), icon: CheckCircle, color: '#22C55E' },
          { label: 'Impayés', value: fmtAmount(kpis.impayes), icon: TrendingDown, color: '#EF4444' },
          { label: 'Taux recouvrement', value: `${kpis.tauxRecouv}%`, icon: BarChart3, color: tauxColor },
        ].map(({ label, value, icon: Icon, color }) => (
          <View key={label} style={[st(theme).kpi, { backgroundColor: color + '18', borderColor: color + '40' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <Icon size={13} color={color} />
              <Text style={{ fontSize: 11, color: theme.text.muted }}>{label}</Text>
            </View>
            <Text style={{ fontSize: 16, fontWeight: '700', color }} numberOfLines={1}>
              {value}
            </Text>
          </View>
        ))}
      </View>

      {/* Barre recouvrement */}
      <View style={[st(theme).card, { gap: 8 }]}>
        <Text style={st(theme).cardTitle}>Taux de recouvrement</Text>
        <View style={{ height: 10, backgroundColor: theme.bg.elevated, borderRadius: 5, overflow: 'hidden' }}>
          <View
            style={{
              height: '100%',
              width: `${Math.min(kpis.tauxRecouv, 100)}%`,
              backgroundColor: tauxColor,
              borderRadius: 5,
            }}
          />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 12, color: '#22C55E' }}>{kpis.paidCount} payées</Text>
          <Text style={{ fontSize: 14, fontWeight: '700', color: tauxColor }}>{kpis.tauxRecouv}%</Text>
          <Text style={{ fontSize: 12, color: '#EF4444' }}>{kpis.overdueCount} en retard</Text>
        </View>
      </View>

      {/* Résumé factures */}
      <View style={[st(theme).card, { gap: 6 }]}>
        <Text style={[st(theme).cardTitle, { marginBottom: 4 }]}>Factures</Text>
        {[
          { label: 'Total', value: kpis.totalInvoices, color: theme.text.primary },
          { label: 'Payées', value: kpis.paidCount, color: '#22C55E' },
          { label: 'En retard', value: kpis.overdueCount, color: '#EF4444' },
        ].map(({ label, value, color }) => (
          <View
            key={label}
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              paddingVertical: 5,
              borderTopWidth: 1,
              borderTopColor: theme.border,
            }}
          >
            <Text style={{ fontSize: 13, color: theme.text.secondary }}>{label}</Text>
            <Text style={{ fontSize: 13, fontWeight: '700', color }}>{value}</Text>
          </View>
        ))}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ── Onglet Paiements ──────────────────────────────────────────────────────────

const METHOD_LABELS: Record<string, string> = {
  CASH: 'Espèces',
  BANK_TRANSFER: 'Virement',
  MOBILE_MONEY: 'Mobile Money',
  CHECK: 'Chèque',
  CARD: 'Carte',
  WAVE: 'Wave',
  ORANGE_MONEY: 'Orange Money',
};

function PaymentsTab({ theme }: { theme: ThemeType }) {
  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['compta-payments'],
    queryFn: paymentsApi.getAll,
    staleTime: 60_000,
  });

  const payments: Payment[] = useMemo(
    () => [...(data ?? [])].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '')),
    [data]
  );

  if (isLoading) return <ActivityIndicator color={theme.primary} style={{ marginTop: 40 }} />;

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme.primary} />}
      contentContainerStyle={{ padding: 16 }}
    >
      {payments.length === 0 ? (
        <EmptyState
          icon={<DollarSign size={40} color={theme.text.muted} />}
          title="Aucun paiement"
          subtitle="Les paiements enregistrés apparaîtront ici"
        />
      ) : (
        payments.map((p) => (
          <View key={p.id} style={st(theme).row}>
            <View
              style={{
                width: 38,
                height: 38,
                borderRadius: 11,
                backgroundColor: '#22C55E22',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <CreditCard size={18} color="#22C55E" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: theme.text.primary }}>
                  {p.clientName ?? '–'}
                </Text>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#22C55E' }}>{fmtAmount(p.amount)}</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 2 }}>
                <Text style={{ fontSize: 11, color: theme.text.muted }}>{fmtDate(p.date)}</Text>
                {p.method && (
                  <Text style={{ fontSize: 11, color: theme.text.secondary }}>
                    {METHOD_LABELS[p.method] ?? p.method}
                  </Text>
                )}
                {p.reference && <Text style={{ fontSize: 11, color: theme.text.muted }}>Réf. {p.reference}</Text>}
              </View>
            </View>
          </View>
        ))
      )}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ── Onglet Recouvrement ───────────────────────────────────────────────────────

const RECOVERY_LABELS: Record<string, string> = {
  NONE: 'Nouveau',
  LEVEL_1: 'Relance 1',
  LEVEL_2: 'Relance 2',
  LEVEL_3: 'Relance 3',
  LITIGATION: 'Contentieux',
};
const RECOVERY_COLORS: Record<string, string> = {
  NONE: '#6B7280',
  LEVEL_1: '#F59E0B',
  LEVEL_2: '#F97316',
  LEVEL_3: '#EF4444',
  LITIGATION: '#7C3AED',
};

function RecoveryTab({ theme }: { theme: ThemeType }) {
  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['compta-invoices'],
    queryFn: invoicesApi.getAll,
    staleTime: 60_000,
  });

  const overdueInvoices: Invoice[] = useMemo(
    () =>
      (data ?? [])
        .filter((i) => i.status === 'OVERDUE' || i.status === 'PARTIALLY_PAID')
        .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? '')),
    [data]
  );

  const totalImpayes = overdueInvoices.reduce((s, i) => s + ((i.balance != null ? i.balance : i.amount) ?? 0), 0);

  if (isLoading) return <ActivityIndicator color={theme.primary} style={{ marginTop: 40 }} />;

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme.primary} />}
      contentContainerStyle={{ padding: 16 }}
    >
      {/* Résumé */}
      {overdueInvoices.length > 0 && (
        <View style={[st(theme).card, { marginBottom: 12, gap: 4 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={15} color="#EF4444" />
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#EF4444' }}>
              {overdueInvoices.length} facture{overdueInvoices.length > 1 ? 's' : ''} en souffrance
            </Text>
          </View>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#EF4444', marginTop: 4 }}>
            {fmtAmount(totalImpayes)}
          </Text>
        </View>
      )}

      {overdueInvoices.length === 0 ? (
        <EmptyState
          icon={<CheckCircle size={40} color="#22C55E" />}
          title="Aucun impayé"
          subtitle="Toutes les factures sont à jour"
        />
      ) : (
        overdueInvoices.map((inv) => {
          const statusColor = INVOICE_STATUS_COLORS[inv.status] ?? '#6B7280';
          const recovColor = RECOVERY_COLORS[inv.recoveryLevel ?? 'NONE'] ?? '#6B7280';
          const daysOverdue = inv.dueDate ? Math.floor((Date.now() - new Date(inv.dueDate).getTime()) / 86_400_000) : 0;
          const outstanding = inv.balance != null ? inv.balance : inv.amount;

          return (
            <View key={inv.id} style={[st(theme).overdue, { borderLeftColor: statusColor }]}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: theme.text.primary }} numberOfLines={1}>
                    {inv.clientName ?? '–'}
                  </Text>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#EF4444' }}>
                    {fmtAmount(outstanding ?? 0)}
                  </Text>
                </View>
                <Text style={{ fontSize: 12, color: theme.text.secondary, marginTop: 1 }}>
                  Facture {inv.number} · Échéance {fmtDate(inv.dueDate)}
                </Text>
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 5 }}>
                  <View
                    style={{
                      backgroundColor: statusColor + '22',
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      borderRadius: 4,
                    }}
                  >
                    <Text style={{ fontSize: 10, fontWeight: '600', color: statusColor }}>
                      {INVOICE_STATUS_LABELS[inv.status]}
                    </Text>
                  </View>
                  <View
                    style={{
                      backgroundColor: recovColor + '22',
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      borderRadius: 4,
                    }}
                  >
                    <Text style={{ fontSize: 10, fontWeight: '600', color: recovColor }}>
                      {RECOVERY_LABELS[inv.recoveryLevel ?? 'NONE']}
                    </Text>
                  </View>
                  {daysOverdue > 0 && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                      <Clock size={10} color="#EF4444" />
                      <Text style={{ fontSize: 10, color: '#EF4444', fontWeight: '600' }}>
                        {daysOverdue}j de retard
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          );
        })
      )}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function AdminComptabiliteScreen() {
  const { theme } = useTheme();
  const nav = useNavigation();
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  return (
    <ProtectedScreen allowedRoles={ADMIN_SCREEN_ROLES}>
      <SafeAreaView style={st(theme).container} edges={['top']}>
        {/* Header */}
        <View style={st(theme).header}>
          <TouchableOpacity
            onPress={() => nav.goBack()}
            style={st(theme).back}
            accessibilityLabel="Retour"
            accessibilityRole="button"
          >
            <ArrowLeft size={22} color={theme.text.primary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={st(theme).title}>Comptabilité</Text>
            <Text style={st(theme).subtitle}>Paiements · Recouvrement · KPIs financiers</Text>
          </View>
        </View>

        {/* Onglets */}
        <View style={st(theme).tabsRow}>
          {TABS.map((tab) => {
            const active = activeTab === tab.key;
            const Icon = tab.icon;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[st(theme).tab, active && { borderBottomColor: theme.primary, borderBottomWidth: 2 }]}
                onPress={() => setActiveTab(tab.key)}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                accessibilityLabel={tab.label}
              >
                <Icon size={13} color={active ? theme.primary : theme.text.muted} />
                <Text
                  style={[st(theme).tabLabel, { color: active ? theme.primary : theme.text.muted }]}
                  numberOfLines={1}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Contenu */}
        {activeTab === 'overview' && <OverviewTab theme={theme} />}
        {activeTab === 'payments' && <PaymentsTab theme={theme} />}
        {activeTab === 'recovery' && <RecoveryTab theme={theme} />}
      </SafeAreaView>
    </ProtectedScreen>
  );
}

const st = (theme: ThemeType) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg.primary },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingTop: 12,
      paddingHorizontal: 16,
      paddingBottom: 14,
      gap: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      backgroundColor: theme.bg.surface,
    },
    back: { padding: 4, marginTop: 4 },
    title: { fontSize: 22, fontWeight: '700', color: theme.text.primary },
    subtitle: { fontSize: 12, color: theme.text.muted, marginTop: 2 },
    tabsRow: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      backgroundColor: theme.bg.surface,
    },
    tab: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
      paddingVertical: 12,
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
    },
    tabLabel: { fontSize: 12, fontWeight: '600' },
    kpi: { flex: 1, minWidth: '45%', borderRadius: 12, borderWidth: 1, padding: 12 },
    card: {
      backgroundColor: theme.bg.surface,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: theme.border,
    },
    cardTitle: { fontSize: 13, fontWeight: '700', color: theme.text.primary },
    row: {
      backgroundColor: theme.bg.surface,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      gap: 12,
      borderWidth: 1,
      borderColor: theme.border,
      marginBottom: 8,
    },
    overdue: {
      backgroundColor: theme.bg.surface,
      borderRadius: 12,
      flexDirection: 'row',
      padding: 12,
      gap: 10,
      borderWidth: 1,
      borderColor: theme.border,
      borderLeftWidth: 4,
      marginBottom: 8,
    },
  });
