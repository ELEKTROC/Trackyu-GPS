/**
 * TrackYu Mobile — Client Portal Dashboard (Mon Espace)
 */
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { formatCurrency } from '../../utils/formatCurrency';
import {
  FileText,
  CreditCard,
  Package,
  TicketCheck,
  ChevronRight,
  AlertCircle,
  Banknote,
  Wrench,
  Car,
  AlertTriangle,
} from 'lucide-react-native';
import { useTheme } from '../../theme';
import { SkeletonDashboard } from '../../components/SkeletonBox';
import { portalApi, type PortalDashboard } from '../../api/portal';
import type { PortalStackParamList } from '../../navigation/types';
import { useAuthStore } from '../../store/authStore';
import { INVOICE_STATUS_COLORS, INVOICE_STATUS_LABELS } from '../../utils/portalColors';

type Nav = NativeStackNavigationProp<PortalStackParamList>;

function StatusBadge({ status }: { status: string }) {
  const color = INVOICE_STATUS_COLORS[status] ?? '#6B7280';
  return (
    <View style={{ backgroundColor: color + '22', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
      <Text style={{ color, fontSize: 11, fontWeight: '600' }}>{INVOICE_STATUS_LABELS[status] ?? status}</Text>
    </View>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  icon,
  color,
  onPress,
}: {
  label: string;
  value: number | string;
  sub?: string;
  icon: React.ReactNode;
  color: string;
  onPress?: () => void;
}) {
  const { theme } = useTheme();
  const s = styles(theme);
  return (
    <TouchableOpacity
      style={s.statCard}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      accessibilityLabel={`${label} : ${value}${sub ? ` — ${sub}` : ''}`}
      accessibilityRole={onPress ? 'button' : 'text'}
    >
      <View style={[s.statIcon, { backgroundColor: color + '22' }]}>{icon}</View>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
      {sub ? <Text style={s.statSub}>{sub}</Text> : null}
      {onPress ? <ChevronRight size={14} color={theme.text.muted} style={{ marginTop: 4 }} /> : null}
    </TouchableOpacity>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function ClientPortalScreen() {
  const { theme } = useTheme();
  const s = styles(theme);
  const nav = useNavigation<Nav>();
  const user = useAuthStore((st) => st.user);

  const { data, isLoading, isError, refetch, isRefetching } = useQuery<PortalDashboard>({
    queryKey: ['portal-dashboard'],
    queryFn: () => portalApi.getDashboard(),
  });

  if (isLoading) {
    return (
      <View style={[s.container]}>
        <SkeletonDashboard />
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View style={s.center}>
        <AlertCircle size={40} color={theme.functional.error} />
        <Text style={[s.empty, { marginTop: 12 }]}>Impossible de charger le tableau de bord</Text>
        <TouchableOpacity
          style={s.retryBtn}
          onPress={() => refetch()}
          accessibilityLabel="Réessayer le chargement"
          accessibilityRole="button"
        >
          <Text style={s.retryText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const fmt = formatCurrency;

  // ── Sous-titre contextuel ─────────────────────────────────────────────────
  const { statusText, statusColor } = (() => {
    if (data.invoices.totalDue > 0)
      return {
        statusText: `${data.invoices.unpaid} facture${data.invoices.unpaid > 1 ? 's' : ''} en attente de règlement`,
        statusColor: theme.functional.error,
      };
    if (data.tickets.open > 0)
      return {
        statusText: `${data.tickets.open} ticket${data.tickets.open > 1 ? 's' : ''} en cours`,
        statusColor: theme.functional.warning,
      };
    return { statusText: 'Compte à jour ✓', statusColor: theme.functional.success };
  })();

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme.primary} />}
      >
        {/* Header */}
        <View style={s.header}>
          <Text style={s.greeting}>Bonjour,</Text>
          <Text style={s.name}>{user?.name ?? user?.email ?? 'Client'}</Text>
          <Text style={[s.subtitle, { color: statusColor }]}>{statusText}</Text>
        </View>

        {/* Bannière solde dû */}
        {data.invoices.totalDue > 0 && (
          <TouchableOpacity
            style={s.dueBanner}
            onPress={() => nav.navigate('PortalInvoices')}
            activeOpacity={0.85}
            accessibilityLabel={`Solde impayé — ${fmt(data.invoices.totalDue)} en attente. Voir les factures`}
            accessibilityRole="button"
          >
            <AlertTriangle size={18} color="#fff" />
            <View style={{ flex: 1 }}>
              <Text style={s.dueBannerTitle}>Solde impayé</Text>
              <Text style={s.dueBannerSub}>{fmt(data.invoices.totalDue)} en attente de règlement</Text>
            </View>
            <ChevronRight size={16} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>
        )}

        {/* Stats grid — 2×2, chiffres réels uniquement */}
        <View style={s.grid}>
          <StatCard
            label="Abonnements actifs"
            value={data.subscriptions?.active ?? data.contracts.active}
            icon={<Package size={20} color="#22C55E" />}
            color="#22C55E"
            onPress={() => nav.navigate('PortalSubscriptions')}
          />
          <StatCard
            label="Factures impayées"
            value={data.invoices.unpaid}
            sub={data.invoices.totalDue > 0 ? fmt(data.invoices.totalDue) : undefined}
            icon={<FileText size={20} color="#EF4444" />}
            color="#EF4444"
            onPress={() => nav.navigate('PortalInvoices')}
          />
          <StatCard
            label="Tickets ouverts"
            value={data.tickets.open}
            icon={<TicketCheck size={20} color="#F59E0B" />}
            color="#F59E0B"
            onPress={() => nav.navigate('PortalTickets')}
          />
          <StatCard
            label="Contrats actifs"
            value={data.contracts.active}
            icon={<Banknote size={20} color="#10B981" />}
            color="#10B981"
            onPress={() => nav.navigate('PortalSubscriptions')}
          />
        </View>

        {/* Latest invoice */}
        {data.latestInvoice && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Dernière facture</Text>
            <TouchableOpacity
              style={s.invoiceCard}
              onPress={() => nav.navigate('PortalInvoiceDetail', { invoiceId: data.latestInvoice!.id })}
              activeOpacity={0.75}
              accessibilityLabel={`Facture ${data.latestInvoice.invoice_number} — ${fmt(data.latestInvoice.amount_ttc)}`}
              accessibilityRole="button"
            >
              <View style={s.invoiceRow}>
                <View>
                  <Text style={s.invoiceNum}>{data.latestInvoice.invoice_number}</Text>
                  <Text style={s.invoiceDate}>
                    {data.latestInvoice.date
                      ? new Date(data.latestInvoice.date).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })
                      : '–'}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 6 }}>
                  <StatusBadge status={data.latestInvoice.status} />
                  <Text style={s.invoiceAmount}>{fmt(data.latestInvoice.amount_ttc)}</Text>
                </View>
              </View>
              <View style={s.invoiceFooter}>
                <CreditCard size={14} color={theme.text.muted} />
                <Text style={s.invoiceFooterText}>Payé : {fmt(data.latestInvoice.paid_amount)}</Text>
                <ChevronRight size={14} color={theme.text.muted} style={{ marginLeft: 'auto' }} />
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Quick actions */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Actions rapides</Text>
          <View style={s.actionsRow}>
            <TouchableOpacity
              style={s.actionBtn}
              onPress={() => nav.navigate('PortalInvoices')}
              accessibilityLabel="Mes factures"
              accessibilityRole="button"
            >
              <FileText size={18} color={theme.primary} />
              <Text style={s.actionLabel}>Factures</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.actionBtn}
              onPress={() => nav.navigate('PortalSubscriptions')}
              accessibilityLabel="Mes abonnements"
              accessibilityRole="button"
            >
              <Package size={18} color={theme.primary} />
              <Text style={s.actionLabel}>Abonnements</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.actionBtn}
              onPress={() => nav.navigate('PortalPayments')}
              accessibilityLabel="Mes paiements"
              accessibilityRole="button"
            >
              <Banknote size={18} color={theme.primary} />
              <Text style={s.actionLabel}>Paiements</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.actionBtn}
              onPress={() => nav.navigate('PortalTickets')}
              accessibilityLabel="Mes tickets de support"
              accessibilityRole="button"
            >
              <TicketCheck size={18} color={theme.primary} />
              <Text style={s.actionLabel}>Support</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.actionBtn}
              onPress={() => nav.navigate('PortalNewTicket')}
              accessibilityLabel="Créer un nouveau ticket"
              accessibilityRole="button"
            >
              <AlertCircle size={18} color={theme.primary} />
              <Text style={s.actionLabel}>Nouveau ticket</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.actionBtn}
              onPress={() => nav.navigate('PortalInterventions')}
              accessibilityLabel="Mes interventions"
              accessibilityRole="button"
            >
              <Wrench size={18} color={theme.primary} />
              <Text style={s.actionLabel}>Interventions</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.actionBtn}
              onPress={() => (nav as any).navigate('Main', { screen: 'Map' })}
              accessibilityLabel="Voir mes véhicules sur la carte"
              accessibilityRole="button"
            >
              <Car size={18} color={theme.primary} />
              <Text style={s.actionLabel}>Mes véhicules</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = (theme: ReturnType<typeof useTheme>['theme']) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg.primary },
    content: { padding: 16, paddingTop: 16 },
    center: { flex: 1, backgroundColor: theme.bg.primary, justifyContent: 'center', alignItems: 'center', padding: 24 },
    header: { marginBottom: 24 },
    greeting: { fontSize: 14, color: theme.text.muted, fontWeight: '400' },
    name: { fontSize: 22, color: theme.text.primary, fontWeight: '700', marginTop: 2 },
    subtitle: {
      fontSize: 12,
      color: theme.primary,
      fontWeight: '600',
      marginTop: 4,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },

    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
    statCard: {
      flex: 1,
      minWidth: '45%',
      backgroundColor: theme.bg.surface,
      borderRadius: 14,
      padding: 14,
      alignItems: 'flex-start',
      gap: 6,
      borderWidth: 1,
      borderColor: theme.border,
    },
    statIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    statValue: { fontSize: 22, fontWeight: '700', color: theme.text.primary },
    statLabel: { fontSize: 12, color: theme.text.muted, fontWeight: '500' },
    statSub: { fontSize: 11, color: theme.functional.error, fontWeight: '600' },

    section: { marginBottom: 24 },
    sectionTitle: {
      fontSize: 13,
      color: theme.text.secondary,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: 10,
    },

    invoiceCard: {
      backgroundColor: theme.bg.surface,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: theme.border,
    },
    invoiceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
    invoiceNum: { fontSize: 15, fontWeight: '700', color: theme.text.primary },
    invoiceDate: { fontSize: 12, color: theme.text.muted, marginTop: 2 },
    invoiceAmount: { fontSize: 14, fontWeight: '700', color: theme.text.primary },
    invoiceFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    invoiceFooterText: { fontSize: 12, color: theme.text.muted },

    actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    actionBtn: {
      width: '22%',
      backgroundColor: theme.bg.surface,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 6,
      alignItems: 'center',
      gap: 6,
      borderWidth: 1,
      borderColor: theme.border,
    },
    actionLabel: { fontSize: 10, color: theme.text.secondary, fontWeight: '600', textAlign: 'center', width: '100%' },

    empty: { fontSize: 14, color: theme.text.muted, textAlign: 'center' },
    retryBtn: {
      marginTop: 16,
      backgroundColor: theme.primary,
      borderRadius: 10,
      paddingHorizontal: 20,
      paddingVertical: 10,
    },
    retryText: { color: theme.text.onPrimary, fontWeight: '600', fontSize: 14 },

    dueBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: theme.functional.error,
      borderRadius: 12,
      padding: 12,
      marginBottom: 16,
    },
    dueBannerTitle: { fontSize: 13, fontWeight: '700', color: '#fff' },
    dueBannerSub: { fontSize: 11, color: 'rgba(255,255,255,0.85)', marginTop: 1 },
  });
