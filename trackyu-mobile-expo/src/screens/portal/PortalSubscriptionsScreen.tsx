/**
 * TrackYu Mobile — Mes Abonnements (1 card = 1 véhicule)
 *
 * Champs affichés par card :
 *   Plaque · Véhicule · Montant · Périodicité · Statut
 *   Date d'installation · Date de renouvellement · Dernière facturation
 */
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Package,
  Car,
  CalendarClock,
  Wrench,
  RefreshCw,
  Receipt,
  AlertTriangle,
  Plus,
} from 'lucide-react-native';
import { useTheme } from '../../theme';
import { portalApi, type PortalSubscription } from '../../api/portal';
import type { PortalStackParamList } from '../../navigation/types';
import { formatCurrency } from '../../utils/formatCurrency';

type Nav = NativeStackNavigationProp<PortalStackParamList>;

// ── Constantes ────────────────────────────────────────────────────────────────

const CYCLE_LABELS: Record<string, string> = {
  MONTHLY: 'Mensuel',
  QUARTERLY: 'Trimestriel',
  SEMESTRIAL: 'Semestriel',
  ANNUAL: 'Annuel',
  YEARLY: 'Annuel',
};

const CYCLE_MONTHS: Record<string, number> = {
  MONTHLY: 1,
  QUARTERLY: 3,
  SEMESTRIAL: 6,
  ANNUAL: 12,
  YEARLY: 12,
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: 'Actif', color: '#22C55E' },
  INACTIVE: { label: 'Inactif', color: '#6B7280' },
  PENDING: { label: 'En attente', color: '#F59E0B' },
  CANCELLED: { label: 'Résilié', color: '#EF4444' },
  SUSPENDED: { label: 'Suspendu', color: '#F97316' },
  EXPIRED: { label: 'Expiré', color: '#EF4444' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/** Calcule la dernière facturation = next_billing_date - 1 cycle */
function lastBillingDate(nextBilling: string | null | undefined, cycle: string): string {
  if (!nextBilling) return '—';
  const d = new Date(nextBilling);
  const months = CYCLE_MONTHS[cycle?.toUpperCase()] ?? 1;
  d.setMonth(d.getMonth() - months);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Jours restants jusqu'à une date (négatif = dépassé) */
function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// ── Card ──────────────────────────────────────────────────────────────────────

function SubscriptionCard({ sub, nav }: { sub: PortalSubscription; nav: Nav }) {
  const { theme } = useTheme();
  const s = cardStyles(theme);
  const cfg = STATUS_CONFIG[sub.status] ?? { label: sub.status, color: '#6B7280' };
  const plate = sub.vehicle_plate ?? '—';
  const vehicleLabel = [sub.vehicle_brand, sub.vehicle_model].filter(Boolean).join(' ') || sub.vehicle_name || '—';
  const cycle = CYCLE_LABELS[sub.billing_cycle?.toUpperCase()] ?? sub.billing_cycle;

  // Countdown prochaine échéance
  const billingDate = sub.next_billing_date ?? sub.end_date;
  const days = daysUntil(billingDate);
  const countdownColor = days !== null && days <= 7 ? '#EF4444' : days !== null && days <= 30 ? '#F59E0B' : '#22C55E';
  const countdownLabel =
    days === null ? null : days < 0 ? `Expiré il y a ${Math.abs(days)}j` : days === 0 ? "Aujourd'hui" : `J-${days}`;

  const handleInterventionRequest = () => {
    const subject = plate !== '—' ? `Intervention — ${plate}` : "Demande d'intervention";
    const description = [
      plate !== '—' ? `Véhicule : ${plate}` : '',
      vehicleLabel !== '—' ? `Modèle : ${vehicleLabel}` : '',
      sub.contract_number ? `Contrat : ${sub.contract_number}` : '',
    ]
      .filter(Boolean)
      .join('\n');
    nav.navigate('PortalNewTicket', { prefillSubject: subject, prefillDescription: description });
  };

  return (
    <View style={s.card}>
      {/* Barre statut */}
      <View style={[s.statusBar, { backgroundColor: cfg.color }]} />

      <View style={s.body}>
        {/* Header : plaque + statut + countdown */}
        <View style={s.headerRow}>
          <View style={s.plateWrap}>
            <Car size={14} color={theme.primary} />
            <Text style={s.plate}>{plate}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {countdownLabel && sub.status === 'ACTIVE' && (
              <View style={[s.countdownChip, { backgroundColor: countdownColor + '22' }]}>
                {days !== null && days <= 7 && <AlertTriangle size={10} color={countdownColor} />}
                <Text style={[s.countdownText, { color: countdownColor }]}>{countdownLabel}</Text>
              </View>
            )}
            <View style={[s.statusBadge, { backgroundColor: cfg.color + '22' }]}>
              <Text style={[s.statusText, { color: cfg.color }]}>{cfg.label}</Text>
            </View>
          </View>
        </View>

        {/* Véhicule */}
        {vehicleLabel !== '—' && <Text style={s.vehicleLabel}>{vehicleLabel}</Text>}

        <View style={s.divider} />

        {/* Montant + périodicité */}
        <View style={s.amountRow}>
          <Text style={s.amount}>{formatCurrency(sub.monthly_fee)}</Text>
          <Text style={s.cycle}>/ {cycle.toLowerCase()}</Text>
        </View>

        <View style={s.divider} />

        {/* Infos dates */}
        <View style={s.infoGrid}>
          <InfoRow
            icon={<Wrench size={13} color={theme.text.muted} />}
            label="Installation"
            value={fmtDate(sub.vehicle_install_date)}
            theme={theme}
          />
          <InfoRow
            icon={<CalendarClock size={13} color={theme.text.muted} />}
            label="Renouvellement"
            value={fmtDate(billingDate)}
            theme={theme}
          />
          <InfoRow
            icon={<Receipt size={13} color={theme.text.muted} />}
            label="Dernière facturation"
            value={lastBillingDate(sub.next_billing_date, sub.billing_cycle)}
            theme={theme}
          />
          {sub.contract_number && (
            <InfoRow
              icon={<RefreshCw size={13} color={theme.text.muted} />}
              label="Contrat"
              value={sub.contract_number}
              theme={theme}
            />
          )}
        </View>

        {/* Demander une intervention */}
        <TouchableOpacity style={s.interventionBtn} onPress={handleInterventionRequest} activeOpacity={0.8}>
          <Plus size={14} color={theme.primary} />
          <Text style={[s.interventionBtnText, { color: theme.primary }]}>Demander une intervention</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
  theme,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  theme: ReturnType<typeof useTheme>['theme'];
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 3 }}>
      {icon}
      <Text style={{ fontSize: 12, color: theme.text.muted, flex: 1 }}>{label}</Text>
      <Text style={{ fontSize: 12, color: theme.text.primary, fontWeight: '600' }}>{value}</Text>
    </View>
  );
}

const cardStyles = (theme: ReturnType<typeof useTheme>['theme']) =>
  StyleSheet.create({
    card: {
      backgroundColor: theme.bg.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.border,
      overflow: 'hidden',
    },
    statusBar: { height: 4 },
    body: { padding: 14, gap: 10 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    plateWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    plate: { fontSize: 16, fontWeight: '800', color: theme.text.primary, letterSpacing: 0.5 },
    vehicleLabel: { fontSize: 13, color: theme.text.secondary },
    statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    statusText: { fontSize: 11, fontWeight: '700' },
    divider: { height: 1, backgroundColor: theme.border },
    amountRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
    amount: { fontSize: 20, fontWeight: '800', color: theme.primary },
    cycle: { fontSize: 13, color: theme.text.muted },
    infoGrid: { gap: 2 },
    countdownChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      borderRadius: 6,
      paddingHorizontal: 7,
      paddingVertical: 3,
    },
    countdownText: { fontSize: 10, fontWeight: '700' },
    interventionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.primary,
      paddingHorizontal: 12,
      paddingVertical: 8,
      justifyContent: 'center',
      marginTop: 2,
    },
    interventionBtnText: { fontSize: 13, fontWeight: '600' },
  });

// ── Main ──────────────────────────────────────────────────────────────────────

export default function PortalSubscriptionsScreen() {
  const { theme } = useTheme();
  const s = styles(theme);
  const nav = useNavigation<Nav>();

  const { data, isLoading, refetch, isRefetching } = useQuery<PortalSubscription[]>({
    queryKey: ['portal-subscriptions'],
    queryFn: () => portalApi.getSubscriptions(),
  });

  const activeCount = data?.filter((s) => s.status === 'ACTIVE').length ?? 0;

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => nav.goBack()} style={s.backBtn}>
          <ArrowLeft size={22} color={theme.text.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Mes Abonnements</Text>
          {data && data.length > 0 && (
            <Text style={s.subtitle}>
              {activeCount} actif{activeCount > 1 ? 's' : ''} · {data.length} au total
            </Text>
          )}
        </View>
      </View>

      {isLoading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : !data?.length ? (
        <View style={s.center}>
          <Package size={48} color={theme.text.muted} />
          <Text style={s.empty}>Aucun abonnement trouvé</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme.primary} />}
        >
          {data.map((sub) => (
            <SubscriptionCard key={sub.id} sub={sub} nav={nav} />
          ))}
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
      paddingTop: 12,
      paddingBottom: 12,
      paddingHorizontal: 16,
      gap: 12,
    },
    backBtn: { padding: 6 },
    title: { fontSize: 20, fontWeight: '700', color: theme.text.primary },
    subtitle: { fontSize: 12, color: theme.text.muted, marginTop: 2 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
    list: { padding: 16, gap: 12, paddingBottom: 40 },
    empty: { fontSize: 14, color: theme.text.muted },
  });
