/**
 * TrackYu Mobile — Finance Screen
 * Modules : Factures · Devis · Abonnements · Contrats · Paiements
 * Filtres  : Période · Statut · Client · Recherche textuelle
 * Actions  : Créer devis, facture, paiement
 */
import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Modal,
  FlatList,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileText,
  Receipt,
  FileSignature,
  CreditCard,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Plus,
  X,
  Search,
  Filter,
  RefreshCw,
  Package,
} from 'lucide-react-native';
import { useTheme } from '../../theme';
import { SearchBar } from '../../components/SearchBar';
import {
  invoicesApi,
  quotesApi,
  contractsApi,
  subscriptionsApi,
  paymentsApi,
  INVOICE_STATUS_LABELS,
  INVOICE_STATUS_COLORS,
  QUOTE_STATUS_LABELS,
  QUOTE_STATUS_COLORS,
  CONTRACT_STATUS_LABELS,
  CONTRACT_STATUS_COLORS,
  SUBSCRIPTION_STATUS_LABELS,
  SUBSCRIPTION_STATUS_COLORS,
  type Invoice,
  type Quote,
  type Contract,
  type Payment,
  type Subscription,
} from '../../api/financeApi';
import tiersApi, { type Tier } from '../../api/tiersApi';

type ThemeType = ReturnType<typeof import('../../theme').useTheme>['theme'];
type ModuleKey = 'invoices' | 'quotes' | 'subscriptions' | 'contracts' | 'payments';
type Period = 'today' | '7d' | '30d' | 'year';

// ── Constantes ────────────────────────────────────────────────────────────────

const PERIOD_LABELS: Record<Period, string> = {
  today: 'Auj.',
  '7d': '7 jours',
  '30d': '30 jours',
  year: 'Cette année',
};

const MODULES: {
  key: ModuleKey;
  label: string;
  icon: React.ComponentType<{ size: number; color: string }>;
  color: string;
}[] = [
  { key: 'invoices', label: 'Factures', icon: Receipt, color: '#3B82F6' },
  { key: 'quotes', label: 'Devis', icon: FileText, color: '#8B5CF6' },
  { key: 'subscriptions', label: 'Abonnements', icon: Package, color: '#F97316' },
  { key: 'contracts', label: 'Contrats', icon: FileSignature, color: '#22C55E' },
  { key: 'payments', label: 'Paiements', icon: CreditCard, color: '#F59E0B' },
];

const STATUS_FILTERS: Record<ModuleKey, { value: string; label: string }[]> = {
  invoices: [
    { value: '', label: 'Tout' },
    { value: 'DRAFT', label: 'Brouillon' },
    { value: 'SENT', label: 'Envoyée' },
    { value: 'PAID', label: 'Payée' },
    { value: 'PARTIALLY_PAID', label: 'Partiel' },
    { value: 'OVERDUE', label: 'En retard' },
    { value: 'CANCELLED', label: 'Annulée' },
  ],
  quotes: [
    { value: '', label: 'Tout' },
    { value: 'DRAFT', label: 'Brouillon' },
    { value: 'SENT', label: 'Envoyé' },
    { value: 'ACCEPTED', label: 'Accepté' },
    { value: 'REJECTED', label: 'Refusé' },
    { value: 'EXPIRED', label: 'Expiré' },
  ],
  subscriptions: [
    { value: '', label: 'Tout' },
    { value: 'ACTIVE', label: 'Actif' },
    { value: 'PENDING', label: 'En attente' },
    { value: 'EXPIRED', label: 'Expiré' },
    { value: 'CANCELLED', label: 'Résilié' },
    { value: 'SUSPENDED', label: 'Suspendu' },
  ],
  contracts: [
    { value: '', label: 'Tout' },
    { value: 'ACTIVE', label: 'Actif' },
    { value: 'DRAFT', label: 'Brouillon' },
    { value: 'SUSPENDED', label: 'Suspendu' },
    { value: 'EXPIRED', label: 'Expiré' },
    { value: 'TERMINATED', label: 'Résilié' },
  ],
  payments: [],
};

const BILLING_LABELS: Record<string, string> = {
  MONTHLY: 'Mensuel',
  QUARTERLY: 'Trim.',
  SEMESTRIAL: 'Semestriel',
  ANNUAL: 'Annuel',
};
const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: 'Espèces',
  BANK_TRANSFER: 'Virement',
  CHECK: 'Chèque',
  MOBILE_MONEY: 'Mobile Money',
  CARD: 'Carte',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatAmount(amount: number | string | null | undefined, currency = 'XOF'): string {
  const n = Number(amount);
  if (isNaN(n)) return '—';
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);
}

function formatDate(iso?: string | null): string {
  if (!iso) return '–';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '–';
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function inPeriod(iso?: string | null, period?: Period): boolean {
  if (!period || !iso) return true;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return true;
  const now = new Date();
  if (period === 'today') return d.toDateString() === now.toDateString();
  if (period === '7d') {
    const s = new Date();
    s.setDate(s.getDate() - 6);
    return d >= s;
  }
  if (period === '30d') {
    const s = new Date();
    s.setDate(s.getDate() - 29);
    return d >= s;
  }
  if (period === 'year') return d.getFullYear() === now.getFullYear();
  return true;
}

// ── Row components ─────────────────────────────────────────────────────────────

function InvoiceRow({ item, theme }: { item: Invoice; theme: ThemeType }) {
  const rawStatus = (item.status?.toUpperCase?.() ?? 'DRAFT') as string;
  const status = Object.keys(INVOICE_STATUS_COLORS).includes(rawStatus) ? rawStatus : 'DRAFT';
  const color = INVOICE_STATUS_COLORS[status as keyof typeof INVOICE_STATUS_COLORS] ?? '#6B7280';
  const isOverdue = status === 'OVERDUE';
  return (
    <TouchableOpacity
      style={[row(theme).wrap, { borderLeftColor: color }]}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={`Facture ${item.number ?? ''}`}
    >
      <View style={{ flex: 1 }}>
        <View style={row(theme).top}>
          <Text style={row(theme).ref} numberOfLines={1}>
            {item.number ?? item.id.slice(0, 8)}
          </Text>
          <View style={[row(theme).badge, { backgroundColor: color + '22' }]}>
            {isOverdue && <AlertCircle size={10} color={color} />}
            <Text style={[row(theme).badgeText, { color }]}>
              {INVOICE_STATUS_LABELS[status as keyof typeof INVOICE_STATUS_LABELS] ?? status}
            </Text>
          </View>
        </View>
        <Text style={row(theme).client} numberOfLines={1}>
          {item.clientName ?? '–'}
        </Text>
        {item.subject ? (
          <Text style={row(theme).sub} numberOfLines={1}>
            {item.subject}
          </Text>
        ) : null}
        <View style={row(theme).footer}>
          <Text style={row(theme).date}>Éch. {formatDate(item.dueDate)}</Text>
          {item.balance != null && item.balance > 0 && (
            <Text style={{ fontSize: 11, color: isOverdue ? '#EF4444' : theme.text.muted }}>
              Reste : {formatAmount(item.balance, item.currency)}
            </Text>
          )}
        </View>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <Text style={[row(theme).amount, { color: status === 'PAID' ? '#22C55E' : theme.text.primary }]}>
          {formatAmount(item.amount, item.currency)}
        </Text>
        <ChevronRight size={14} color={theme.text.muted} />
      </View>
    </TouchableOpacity>
  );
}

function QuoteRow({ item, theme }: { item: Quote; theme: ThemeType }) {
  const color = QUOTE_STATUS_COLORS[item.status] ?? '#6B7280';
  return (
    <TouchableOpacity
      style={[row(theme).wrap, { borderLeftColor: color }]}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={`Devis ${item.number ?? ''}`}
    >
      <View style={{ flex: 1 }}>
        <View style={row(theme).top}>
          <Text style={row(theme).ref} numberOfLines={1}>
            {item.number ?? item.id.slice(0, 8)}
          </Text>
          <View style={[row(theme).badge, { backgroundColor: color + '22' }]}>
            <Text style={[row(theme).badgeText, { color }]}>{QUOTE_STATUS_LABELS[item.status] ?? item.status}</Text>
          </View>
        </View>
        <Text style={row(theme).client} numberOfLines={1}>
          {item.clientName ?? '–'}
        </Text>
        {item.subject ? (
          <Text style={row(theme).sub} numberOfLines={1}>
            {item.subject}
          </Text>
        ) : null}
        <View style={row(theme).footer}>
          <Text style={row(theme).date}>Créé {formatDate(item.date ?? item.createdAt)}</Text>
          {item.validUntil && (
            <Text style={{ fontSize: 11, color: theme.text.muted }}>
              Val. {formatDate(typeof item.validUntil === 'string' ? item.validUntil : String(item.validUntil))}
            </Text>
          )}
        </View>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <Text style={row(theme).amount}>{formatAmount(item.amount, item.currency)}</Text>
        <ChevronRight size={14} color={theme.text.muted} />
      </View>
    </TouchableOpacity>
  );
}

function SubscriptionRow({ item, theme }: { item: Subscription; theme: ThemeType }) {
  const color = SUBSCRIPTION_STATUS_COLORS[item.status] ?? '#6B7280';
  const label = SUBSCRIPTION_STATUS_LABELS[item.status] ?? item.status;
  const expiring = item.daysUntilExpiry != null && item.daysUntilExpiry >= 0 && item.daysUntilExpiry <= 30;
  return (
    <TouchableOpacity
      style={[row(theme).wrap, { borderLeftColor: color }]}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={`Abonnement ${item.id}`}
    >
      <View style={{ flex: 1 }}>
        <View style={row(theme).top}>
          <Text style={row(theme).ref} numberOfLines={1}>
            {item.vehiclePlate ?? item.vehicleName ?? item.id.slice(0, 8)}
          </Text>
          <View style={[row(theme).badge, { backgroundColor: color + '22' }]}>
            <Text style={[row(theme).badgeText, { color }]}>{label}</Text>
          </View>
        </View>
        <Text style={row(theme).client} numberOfLines={1}>
          {item.clientName ?? '–'}
        </Text>
        {item.contractNumber ? (
          <Text style={row(theme).sub} numberOfLines={1}>
            Contrat : {item.contractNumber}
          </Text>
        ) : null}
        <View style={row(theme).footer}>
          <Text style={row(theme).date}>
            {BILLING_LABELS[item.billingCycle] ?? item.billingCycle} · Début {formatDate(item.startDate)}
          </Text>
          {item.nextBillingDate ? (
            <Text style={{ fontSize: 11, color: expiring ? '#F59E0B' : theme.text.muted }}>
              Prochaine : {formatDate(item.nextBillingDate)}
            </Text>
          ) : null}
        </View>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <Text style={row(theme).amount}>
          {formatAmount(item.monthlyFee)}
          <Text style={{ fontSize: 11, fontWeight: '400', color: theme.text.muted }}>/mois</Text>
        </Text>
        <ChevronRight size={14} color={theme.text.muted} />
      </View>
    </TouchableOpacity>
  );
}

function ContractRow({ item, theme }: { item: Contract; theme: ThemeType }) {
  const color = CONTRACT_STATUS_COLORS[item.status] ?? '#6B7280';
  return (
    <TouchableOpacity
      style={[row(theme).wrap, { borderLeftColor: color }]}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={`Contrat ${item.contractNumber ?? ''}`}
    >
      <View style={{ flex: 1 }}>
        <View style={row(theme).top}>
          <Text style={row(theme).ref} numberOfLines={1}>
            {item.contractNumber ?? item.id.slice(0, 8)}
          </Text>
          <View style={[row(theme).badge, { backgroundColor: color + '22' }]}>
            {item.status === 'ACTIVE' && <CheckCircle2 size={10} color={color} />}
            <Text style={[row(theme).badgeText, { color }]}>{CONTRACT_STATUS_LABELS[item.status] ?? item.status}</Text>
          </View>
        </View>
        <Text style={row(theme).client} numberOfLines={1}>
          {item.clientName ?? '–'}
        </Text>
        <View style={row(theme).footer}>
          <Text style={row(theme).date}>
            {item.endDate
              ? `${formatDate(item.startDate)} → ${formatDate(item.endDate)}`
              : item.nextBillingDate
                ? `Prochaine : ${formatDate(item.nextBillingDate)}`
                : `Début ${formatDate(item.startDate)}`}
          </Text>
          <Text style={{ fontSize: 11, color: theme.text.muted }}>
            {item.vehicleCount} véh. · {BILLING_LABELS[item.billingCycle] ?? item.billingCycle}
          </Text>
        </View>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <Text style={row(theme).amount}>
          {formatAmount(item.monthlyFee)}
          <Text style={{ fontSize: 11, fontWeight: '400', color: theme.text.muted }}>/mois</Text>
        </Text>
        <ChevronRight size={14} color={theme.text.muted} />
      </View>
    </TouchableOpacity>
  );
}

function PaymentRow({ item, theme }: { item: Payment; theme: ThemeType }) {
  return (
    <View style={[row(theme).wrap, { borderLeftColor: '#22C55E' }]}>
      <View style={{ flex: 1 }}>
        <View style={row(theme).top}>
          <Text style={row(theme).ref} numberOfLines={1}>
            {item.reference ?? item.id.slice(0, 8)}
          </Text>
          <View style={[row(theme).badge, { backgroundColor: '#22C55E22' }]}>
            <Text style={[row(theme).badgeText, { color: '#22C55E' }]}>Reçu</Text>
          </View>
        </View>
        <Text style={row(theme).client} numberOfLines={1}>
          {item.clientName ?? '–'}
        </Text>
        <View style={row(theme).footer}>
          <Text style={row(theme).date}>{formatDate(item.date)}</Text>
          {item.method ? (
            <Text style={{ fontSize: 11, color: theme.text.muted }}>
              {PAYMENT_METHOD_LABELS[item.method] ?? item.method}
            </Text>
          ) : null}
        </View>
      </View>
      <Text style={[row(theme).amount, { color: '#22C55E' }]}>{formatAmount(item.amount)}</Text>
    </View>
  );
}

const row = (theme: ThemeType) =>
  StyleSheet.create({
    wrap: {
      backgroundColor: theme.bg.surface,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      gap: 10,
      borderWidth: 1,
      borderColor: theme.border,
      borderLeftWidth: 4,
      marginBottom: 8,
    },
    top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
    ref: { fontSize: 13, fontWeight: '700', color: theme.text.primary, flex: 1, marginRight: 8 },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: 6,
      flexShrink: 0,
    },
    badgeText: { fontSize: 11, fontWeight: '600' },
    client: { fontSize: 13, color: theme.text.secondary },
    sub: { fontSize: 12, color: theme.text.muted, marginTop: 1 },
    footer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
    date: { fontSize: 11, color: theme.text.muted },
    amount: { fontSize: 15, fontWeight: '700', color: theme.text.primary },
  });

// ── KPI Bar ───────────────────────────────────────────────────────────────────

function KpiBar({
  invoices,
  quotes,
  contracts,
  subscriptions,
  subsLoaded,
  theme,
}: {
  invoices: Invoice[];
  quotes: Quote[];
  contracts: Contract[];
  subscriptions: Subscription[];
  subsLoaded: boolean;
  theme: ThemeType;
}) {
  const overdueTotal = invoices
    .filter((i) => i.status === 'OVERDUE')
    .reduce((s, i) => s + Number(i.balance ?? i.amount ?? 0), 0);
  const pendingQuotes = quotes.filter((q) => q.status === 'SENT').length;
  const activeSubs = subscriptions.filter((s) => s.status === 'ACTIVE').length;
  const activeContracts = contracts.filter((c) => c.status === 'ACTIVE').length;

  const kpis = [
    {
      icon: <TrendingUp size={13} color="#EF4444" />,
      val: formatAmount(overdueTotal),
      lbl: 'En retard',
      color: '#EF4444',
    },
    {
      icon: <FileText size={13} color="#8B5CF6" />,
      val: String(pendingQuotes),
      lbl: 'Devis envoyés',
      color: '#8B5CF6',
    },
    {
      icon: <Package size={13} color="#F97316" />,
      val: subsLoaded ? String(activeSubs) : '–',
      lbl: 'Abonnements',
      color: '#F97316',
    },
    {
      icon: <CheckCircle2 size={13} color="#22C55E" />,
      val: String(activeContracts),
      lbl: 'Contrats actifs',
      color: '#22C55E',
    },
  ];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 10, gap: 10 }}
    >
      {kpis.map((k, i) => (
        <View
          key={i}
          style={{
            backgroundColor: theme.bg.surface,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: theme.border,
            padding: 12,
            minWidth: 110,
            gap: 4,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            {k.icon}
            <Text style={{ fontSize: 15, fontWeight: '800', color: k.color }}>{k.val}</Text>
          </View>
          <Text style={{ fontSize: 10, color: theme.text.muted }}>{k.lbl}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

// ── Client Picker Modal ───────────────────────────────────────────────────────

function ClientPickerModal({
  visible,
  tiers,
  selected,
  onSelect,
  onClose,
  theme,
}: {
  visible: boolean;
  tiers: Tier[];
  selected: Tier | null;
  onSelect: (t: Tier | null) => void;
  onClose: () => void;
  theme: ThemeType;
}) {
  const [q, setQ] = useState('');
  const filtered = q.trim()
    ? tiers.filter(
        (t) => t.name.toLowerCase().includes(q.toLowerCase()) || t.email?.toLowerCase().includes(q.toLowerCase())
      )
    : tiers;
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg.primary }} edges={['top']}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 14,
            borderBottomWidth: 1,
            borderBottomColor: theme.border,
          }}
        >
          <Text style={{ flex: 1, fontSize: 17, fontWeight: '700', color: theme.text.primary }}>
            Filtrer par client
          </Text>
          <TouchableOpacity onPress={onClose} accessibilityLabel="Fermer" accessibilityRole="button">
            <X size={22} color={theme.text.muted} />
          </TouchableOpacity>
        </View>
        <View style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: theme.bg.surface,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: theme.border,
              paddingHorizontal: 12,
              gap: 8,
            }}
          >
            <Search size={16} color={theme.text.muted} />
            <TextInput
              style={{ flex: 1, paddingVertical: 10, color: theme.text.primary, fontSize: 14 }}
              placeholder="Rechercher un client…"
              placeholderTextColor={theme.text.muted}
              value={q}
              onChangeText={setQ}
            />
          </View>
        </View>
        <FlatList
          data={[
            {
              id: '__all__',
              name: 'Tous les clients',
              email: undefined,
              type: 'CLIENT',
              status: 'ACTIVE',
              tenantId: '',
              createdAt: '',
              updatedAt: '',
            } as Tier,
            ...filtered,
          ]}
          keyExtractor={(t) => t.id}
          renderItem={({ item }) => {
            const isAll = item.id === '__all__';
            const isActive = isAll ? selected === null : selected?.id === item.id;
            return (
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  borderBottomWidth: 1,
                  borderBottomColor: theme.border,
                  backgroundColor: isActive ? theme.primaryDim : 'transparent',
                }}
                onPress={() => {
                  onSelect(isAll ? null : item);
                  onClose();
                }}
                accessibilityRole="button"
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: isActive ? '700' : '400',
                      color: isActive ? theme.primary : theme.text.primary,
                    }}
                  >
                    {item.name}
                  </Text>
                  {item.email ? (
                    <Text style={{ fontSize: 12, color: theme.text.muted, marginTop: 2 }}>{item.email}</Text>
                  ) : null}
                </View>
                {isActive && <CheckCircle2 size={18} color={theme.primary} />}
              </TouchableOpacity>
            );
          }}
        />
      </SafeAreaView>
    </Modal>
  );
}

// ── Create Modal ──────────────────────────────────────────────────────────────

function CreateModal({
  visible,
  module: mod,
  tiers,
  onClose,
  onCreated,
  theme,
}: {
  visible: boolean;
  module: ModuleKey;
  tiers: Tier[];
  onClose: () => void;
  onCreated: () => void;
  theme: ThemeType;
}) {
  const qc = useQueryClient();
  const [clientId, setClientId] = useState('');
  const [subject, setSubject] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [method, setMethod] = useState('CASH');
  const [clientSearch, setClientSearch] = useState('');
  const [showClientList, setShowClientList] = useState(false);

  const reset = () => {
    setClientId('');
    setSubject('');
    setAmount('');
    setDescription('');
    setDueDate('');
    setMethod('CASH');
    setClientSearch('');
    setShowClientList(false);
  };

  const filteredTiers = clientSearch.trim()
    ? tiers.filter((t) => t.name.toLowerCase().includes(clientSearch.toLowerCase()))
    : tiers.slice(0, 20);

  const selectedClient = tiers.find((t) => t.id === clientId);

  const invMutation = useMutation({
    mutationFn: (p: Parameters<typeof invoicesApi.create>[0]) => invoicesApi.create(p),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance-invoices'] });
      onCreated();
      reset();
      onClose();
    },
    onError: (e: Error) => Alert.alert('Erreur', e.message),
  });
  const qtMutation = useMutation({
    mutationFn: (p: Parameters<typeof quotesApi.create>[0]) => quotesApi.create(p),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance-quotes'] });
      onCreated();
      reset();
      onClose();
    },
    onError: (e: Error) => Alert.alert('Erreur', e.message),
  });
  const payMutation = useMutation({
    mutationFn: (p: Parameters<typeof paymentsApi.create>[0]) => paymentsApi.create(p),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance-payments'] });
      onCreated();
      reset();
      onClose();
    },
    onError: (e: Error) => Alert.alert('Erreur', e.message),
  });

  const isPending = invMutation.isPending || qtMutation.isPending || payMutation.isPending;

  const handleSubmit = () => {
    if (!clientId && mod !== 'payments') {
      Alert.alert('Client requis', 'Sélectionnez un client.');
      return;
    }
    const amt = Number(amount);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert('Montant invalide', 'Saisissez un montant valide.');
      return;
    }
    const items = [{ description: description || subject || 'Prestation', quantity: 1, price: amt }];
    if (mod === 'invoices') {
      invMutation.mutate({ tier_id: clientId, subject, items, due_date: dueDate || undefined, vat_rate: 0 });
    } else if (mod === 'quotes') {
      qtMutation.mutate({ tier_id: clientId, subject, items, valid_until: dueDate || undefined, vat_rate: 0 });
    } else if (mod === 'payments') {
      payMutation.mutate({
        tier_id: clientId || undefined,
        amount: amt,
        method,
        reference: subject || undefined,
        date: new Date().toISOString().split('T')[0],
      });
    }
  };

  const titles: Partial<Record<ModuleKey, string>> = {
    invoices: 'Nouvelle facture',
    quotes: 'Nouveau devis',
    payments: 'Nouveau paiement',
  };
  const title = titles[mod] ?? 'Nouveau';

  if (!['invoices', 'quotes', 'payments'].includes(mod)) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg.primary }} edges={['top']}>
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 16,
              paddingVertical: 14,
              borderBottomWidth: 1,
              borderBottomColor: theme.border,
            }}
          >
            <Text style={{ flex: 1, fontSize: 17, fontWeight: '700', color: theme.text.primary }}>{title}</Text>
            <TouchableOpacity
              onPress={() => {
                reset();
                onClose();
              }}
              accessibilityLabel="Fermer"
              accessibilityRole="button"
            >
              <X size={22} color={theme.text.muted} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
            {/* Client */}
            <View>
              <Text style={crf(theme).label}>Client {mod !== 'payments' ? '*' : ''}</Text>
              <TouchableOpacity
                style={[crf(theme).input, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}
                onPress={() => setShowClientList((v) => !v)}
              >
                <Text style={{ flex: 1, color: selectedClient ? theme.text.primary : theme.text.muted, fontSize: 14 }}>
                  {selectedClient ? selectedClient.name : 'Sélectionner un client…'}
                </Text>
                <ChevronRight size={16} color={theme.text.muted} />
              </TouchableOpacity>
              {showClientList && (
                <View
                  style={{
                    backgroundColor: theme.bg.surface,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: theme.border,
                    marginTop: 4,
                    maxHeight: 200,
                  }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 12,
                      borderBottomWidth: 1,
                      borderBottomColor: theme.border,
                    }}
                  >
                    <Search size={14} color={theme.text.muted} />
                    <TextInput
                      style={{
                        flex: 1,
                        paddingVertical: 10,
                        paddingHorizontal: 8,
                        color: theme.text.primary,
                        fontSize: 13,
                      }}
                      placeholder="Chercher…"
                      placeholderTextColor={theme.text.muted}
                      value={clientSearch}
                      onChangeText={setClientSearch}
                    />
                  </View>
                  <FlatList
                    data={filteredTiers}
                    keyExtractor={(t) => t.id}
                    style={{ maxHeight: 160 }}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 10,
                          borderBottomWidth: 1,
                          borderBottomColor: theme.border,
                        }}
                        onPress={() => {
                          setClientId(item.id);
                          setShowClientList(false);
                          setClientSearch('');
                        }}
                      >
                        <Text style={{ fontSize: 13, color: theme.text.primary }}>{item.name}</Text>
                        {item.email ? (
                          <Text style={{ fontSize: 11, color: theme.text.muted }}>{item.email}</Text>
                        ) : null}
                      </TouchableOpacity>
                    )}
                  />
                </View>
              )}
            </View>

            {/* Objet / Référence */}
            <View>
              <Text style={crf(theme).label}>{mod === 'payments' ? 'Référence' : 'Objet / Description'}</Text>
              <TextInput
                style={crf(theme).input}
                placeholder={mod === 'payments' ? 'Référence paiement…' : 'Ex. Renouvellement abonnement GPS…'}
                placeholderTextColor={theme.text.muted}
                value={subject}
                onChangeText={setSubject}
              />
            </View>

            {/* Montant */}
            <View>
              <Text style={crf(theme).label}>Montant (F CFA) *</Text>
              <TextInput
                style={crf(theme).input}
                placeholder="Ex. 15000"
                placeholderTextColor={theme.text.muted}
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
              />
            </View>

            {/* Date échéance / validité */}
            {mod !== 'payments' && (
              <View>
                <Text style={crf(theme).label}>
                  {mod === 'invoices' ? "Date d'échéance" : "Valable jusqu'au"} (AAAA-MM-JJ)
                </Text>
                <TextInput
                  style={crf(theme).input}
                  placeholder="Ex. 2026-06-30"
                  placeholderTextColor={theme.text.muted}
                  value={dueDate}
                  onChangeText={setDueDate}
                  keyboardType="numbers-and-punctuation"
                />
              </View>
            )}

            {/* Méthode paiement */}
            {mod === 'payments' && (
              <View>
                <Text style={crf(theme).label}>Mode de paiement</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
                >
                  {Object.entries(PAYMENT_METHOD_LABELS).map(([k, v]) => (
                    <TouchableOpacity
                      key={k}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 20,
                        borderWidth: 1,
                        borderColor: method === k ? theme.primary : theme.border,
                        backgroundColor: method === k ? theme.primaryDim : theme.bg.surface,
                      }}
                      onPress={() => setMethod(k)}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: '600',
                          color: method === k ? theme.primary : theme.text.secondary,
                        }}
                      >
                        {v}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Submit */}
            <TouchableOpacity
              style={{
                backgroundColor: theme.primary,
                borderRadius: 12,
                paddingVertical: 14,
                alignItems: 'center',
                marginTop: 8,
                opacity: isPending ? 0.7 : 1,
              }}
              onPress={handleSubmit}
              disabled={isPending}
              accessibilityRole="button"
            >
              {isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>Créer</Text>
              )}
            </TouchableOpacity>

            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const crf = (theme: ThemeType) =>
  StyleSheet.create({
    label: { fontSize: 13, fontWeight: '600', color: theme.text.secondary, marginBottom: 6 },
    input: {
      backgroundColor: theme.bg.surface,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: 14,
      paddingVertical: 12,
      color: theme.text.primary,
      fontSize: 14,
    },
  });

// ── Main ──────────────────────────────────────────────────────────────────────

export default function FinanceScreen() {
  const { theme } = useTheme();
  const [activeModule, setActiveModule] = useState<ModuleKey>('invoices');
  const [period, setPeriod] = useState<Period | ''>('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<Tier | null>(null);
  const [clientPickerVisible, setClientPickerVisible] = useState(false);
  const [createVisible, setCreateVisible] = useState(false);

  // ── Queries ──────────────────────────────────────────────────────────────────
  const invQuery = useQuery({
    queryKey: ['finance-invoices'],
    queryFn: invoicesApi.getAll,
    staleTime: 60_000,
    refetchInterval: 120_000,
  });
  const qtQuery = useQuery({
    queryKey: ['finance-quotes'],
    queryFn: quotesApi.getAll,
    staleTime: 60_000,
    refetchInterval: 120_000,
    enabled: activeModule === 'quotes' || activeModule === 'invoices',
  });
  const subQuery = useQuery({
    queryKey: ['finance-subscriptions'],
    queryFn: subscriptionsApi.getAll,
    staleTime: 60_000,
    refetchInterval: 120_000,
    enabled: activeModule === 'subscriptions',
  });
  const ctQuery = useQuery({
    queryKey: ['finance-contracts'],
    queryFn: contractsApi.getAll,
    staleTime: 60_000,
    refetchInterval: 120_000,
    enabled: activeModule === 'contracts',
  });
  const payQuery = useQuery({
    queryKey: ['finance-payments'],
    queryFn: paymentsApi.getAll,
    staleTime: 60_000,
    refetchInterval: 120_000,
    enabled: activeModule === 'payments',
  });

  const { data: tiers = [] } = useQuery({
    queryKey: ['finance-tiers-lookup'],
    queryFn: () => tiersApi.getAll(),
    staleTime: 300_000,
  });
  const clientNameMap = useMemo(() => {
    const m = new Map<string, string>();
    tiers.forEach((t) => m.set(t.id, t.name));
    return m;
  }, [tiers]);

  function enrichClientName<T extends { clientId?: string; clientName?: string }>(item: T): T {
    if (item.clientName || !item.clientId) return item;
    const name = clientNameMap.get(item.clientId);
    return name ? { ...item, clientName: name } : item;
  }

  const activeQuery =
    activeModule === 'invoices'
      ? invQuery
      : activeModule === 'quotes'
        ? qtQuery
        : activeModule === 'subscriptions'
          ? subQuery
          : activeModule === 'contracts'
            ? ctQuery
            : payQuery;

  const isLoading = activeQuery.isLoading;
  const isRefetching = activeQuery.isRefetching;
  const refetch = activeQuery.refetch;

  // ── Filters ──────────────────────────────────────────────────────────────────
  const q = search.toLowerCase();
  const clientId = selectedClient?.id;

  const filteredInvoices = useMemo(() => {
    let list = (invQuery.data ?? []).map(enrichClientName);
    if (clientId) list = list.filter((i) => i.clientId === clientId);
    if (period) list = list.filter((i) => inPeriod(i.date, period as Period));
    if (statusFilter) list = list.filter((i) => i.status?.toUpperCase() === statusFilter);
    if (q)
      list = list.filter((i) =>
        [i.number ?? '', i.clientName ?? '', i.subject ?? ''].some((v) => v.toLowerCase().includes(q))
      );
    return list;
  }, [invQuery.data, clientId, period, statusFilter, q, clientNameMap]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredQuotes = useMemo(() => {
    let list = (qtQuery.data ?? []).map(enrichClientName);
    if (clientId) list = list.filter((i) => i.clientId === clientId);
    if (period) list = list.filter((i) => inPeriod(i.createdAt, period as Period));
    if (statusFilter) list = list.filter((i) => i.status?.toUpperCase() === statusFilter);
    if (q)
      list = list.filter((i) =>
        [i.number ?? '', i.clientName ?? '', i.subject ?? ''].some((v) => v.toLowerCase().includes(q))
      );
    return list;
  }, [qtQuery.data, clientId, period, statusFilter, q, clientNameMap]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredSubs = useMemo(() => {
    let list = (subQuery.data ?? []).map(enrichClientName);
    if (clientId) list = list.filter((s) => s.clientId === clientId);
    if (statusFilter) list = list.filter((s) => s.status?.toUpperCase() === statusFilter);
    if (q)
      list = list.filter((s) =>
        [s.vehiclePlate ?? '', s.vehicleName ?? '', s.clientName ?? ''].some((v) => v.toLowerCase().includes(q))
      );
    return list;
  }, [subQuery.data, clientId, statusFilter, q, clientNameMap]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredContracts = useMemo(() => {
    let list = (ctQuery.data ?? []).map(enrichClientName);
    if (clientId) list = list.filter((c) => c.clientId === clientId);
    if (statusFilter) list = list.filter((c) => c.status?.toUpperCase() === statusFilter);
    if (q)
      list = list.filter((c) => [c.contractNumber ?? '', c.clientName ?? ''].some((v) => v.toLowerCase().includes(q)));
    return list;
  }, [ctQuery.data, clientId, statusFilter, q, clientNameMap]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredPayments = useMemo(() => {
    let list = (payQuery.data ?? []).map(enrichClientName);
    if (clientId) list = list.filter((p) => p.clientId === clientId);
    if (period) list = list.filter((p) => inPeriod(p.date, period as Period));
    if (q) list = list.filter((p) => [p.reference ?? '', p.clientName ?? ''].some((v) => v.toLowerCase().includes(q)));
    return list;
  }, [payQuery.data, clientId, period, q, clientNameMap]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleModuleChange = (mod: ModuleKey) => {
    setActiveModule(mod);
    setStatusFilter('');
    setSearch('');
  };

  const statusOptions = STATUS_FILTERS[activeModule];
  const canCreate = ['invoices', 'quotes', 'payments'].includes(activeModule);

  const currentModule = MODULES.find((m) => m.key === activeModule)!;

  return (
    <SafeAreaView style={s(theme).container} edges={['top']}>
      {/* Header */}
      <View style={s(theme).header}>
        <Text style={s(theme).title}>Finance</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {/* Client filter */}
          <TouchableOpacity
            style={[
              s(theme).headerBtn,
              selectedClient && { borderColor: theme.primary, backgroundColor: theme.primaryDim },
            ]}
            onPress={() => setClientPickerVisible(true)}
            accessibilityLabel="Filtrer par client"
            accessibilityRole="button"
          >
            <Filter size={15} color={selectedClient ? theme.primary : theme.text.muted} />
            <Text
              style={{ fontSize: 12, color: selectedClient ? theme.primary : theme.text.muted, fontWeight: '600' }}
              numberOfLines={1}
            >
              {selectedClient ? selectedClient.name.split(' ')[0] : 'Client'}
            </Text>
            {selectedClient && (
              <TouchableOpacity
                onPress={() => setSelectedClient(null)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={12} color={theme.primary} />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
          {/* Refresh */}
          <TouchableOpacity
            style={s(theme).headerBtn}
            onPress={() => refetch()}
            accessibilityLabel="Actualiser"
            accessibilityRole="button"
          >
            <RefreshCw size={15} color={theme.text.muted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* KPI Bar */}
      <KpiBar
        invoices={invQuery.data ?? []}
        quotes={qtQuery.data ?? []}
        contracts={ctQuery.data ?? []}
        subscriptions={subQuery.data ?? []}
        subsLoaded={subQuery.isFetched}
        theme={theme}
      />

      {/* Module tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s(theme).moduleTabs}>
        {MODULES.map((mod) => {
          const active = activeModule === mod.key;
          const Icon = mod.icon;
          return (
            <TouchableOpacity
              key={mod.key}
              style={[s(theme).moduleTab, active && { backgroundColor: mod.color, borderColor: mod.color }]}
              onPress={() => handleModuleChange(mod.key)}
              activeOpacity={0.8}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
            >
              <Text style={[s(theme).moduleTabText, { color: active ? '#fff' : theme.text.secondary }]}>
                {mod.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Période + Status filters */}
      <View style={{ borderBottomWidth: 1, borderBottomColor: theme.border }}>
        {/* Période */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6, gap: 8 }}
        >
          <TouchableOpacity
            style={[s(theme).chip, !period && { backgroundColor: theme.primary, borderColor: theme.primary }]}
            onPress={() => setPeriod('')}
          >
            <Text style={[s(theme).chipLabel, !period && { color: '#fff' }]}>Toujours</Text>
          </TouchableOpacity>
          {(Object.entries(PERIOD_LABELS) as [Period, string][]).map(([k, v]) => {
            const active = period === k;
            return (
              <TouchableOpacity
                key={k}
                style={[s(theme).chip, active && { backgroundColor: theme.primary, borderColor: theme.primary }]}
                onPress={() => setPeriod(k)}
              >
                <Text style={[s(theme).chipLabel, active && { color: '#fff' }]}>{v}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Status chips */}
        {statusOptions.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 10, gap: 8 }}
          >
            {statusOptions.map((opt) => {
              const active = statusFilter === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    s(theme).chip,
                    active && { backgroundColor: currentModule.color, borderColor: currentModule.color },
                  ]}
                  onPress={() => setStatusFilter(opt.value)}
                >
                  <Text style={[s(theme).chipLabel, active && { color: '#fff' }]}>{opt.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* Recherche */}
      <SearchBar
        value={search}
        onChangeText={setSearch}
        placeholder={`Rechercher dans ${currentModule.label.toLowerCase()}…`}
        style={{ marginHorizontal: 16, marginVertical: 10 }}
      />

      {/* Liste */}
      <ScrollView
        contentContainerStyle={s(theme).list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme.primary} />}
      >
        {isLoading ? (
          <ActivityIndicator color={theme.primary} style={{ marginTop: 32 }} />
        ) : activeModule === 'invoices' ? (
          filteredInvoices.length === 0 ? (
            <View style={s(theme).empty}>
              <Receipt size={40} color={theme.text.muted} />
              <Text style={s(theme).emptyText}>Aucune facture</Text>
            </View>
          ) : (
            filteredInvoices.map((i) => <InvoiceRow key={i.id} item={i} theme={theme} />)
          )
        ) : activeModule === 'quotes' ? (
          filteredQuotes.length === 0 ? (
            <View style={s(theme).empty}>
              <FileText size={40} color={theme.text.muted} />
              <Text style={s(theme).emptyText}>Aucun devis</Text>
            </View>
          ) : (
            filteredQuotes.map((i) => <QuoteRow key={i.id} item={i} theme={theme} />)
          )
        ) : activeModule === 'subscriptions' ? (
          filteredSubs.length === 0 ? (
            <View style={s(theme).empty}>
              <Package size={40} color={theme.text.muted} />
              <Text style={s(theme).emptyText}>Aucun abonnement</Text>
            </View>
          ) : (
            filteredSubs.map((i) => <SubscriptionRow key={i.id} item={i} theme={theme} />)
          )
        ) : activeModule === 'contracts' ? (
          filteredContracts.length === 0 ? (
            <View style={s(theme).empty}>
              <FileSignature size={40} color={theme.text.muted} />
              <Text style={s(theme).emptyText}>Aucun contrat</Text>
            </View>
          ) : (
            filteredContracts.map((i) => <ContractRow key={i.id} item={i} theme={theme} />)
          )
        ) : filteredPayments.length === 0 ? (
          <View style={s(theme).empty}>
            <CreditCard size={40} color={theme.text.muted} />
            <Text style={s(theme).emptyText}>Aucun paiement</Text>
          </View>
        ) : (
          filteredPayments.map((i) => <PaymentRow key={i.id} item={i} theme={theme} />)
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FAB Créer */}
      {canCreate && (
        <TouchableOpacity
          style={[s(theme).fab, { backgroundColor: currentModule.color }]}
          onPress={() => setCreateVisible(true)}
          accessibilityLabel={`Créer ${currentModule.label.toLowerCase()}`}
          accessibilityRole="button"
        >
          <Plus size={24} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Modals */}
      <ClientPickerModal
        visible={clientPickerVisible}
        tiers={tiers}
        selected={selectedClient}
        onSelect={setSelectedClient}
        onClose={() => setClientPickerVisible(false)}
        theme={theme}
      />

      <CreateModal
        visible={createVisible}
        module={activeModule}
        tiers={tiers}
        onClose={() => setCreateVisible(false)}
        onCreated={() => {}}
        theme={theme}
      />
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = (theme: ThemeType) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg.primary },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    title: { fontSize: 22, fontWeight: '700', color: theme.text.primary },
    headerBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.bg.surface,
    },
    moduleTabs: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
    moduleTab: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.bg.surface,
    },
    moduleTabText: { fontSize: 13, fontWeight: '600' },
    chip: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: theme.bg.surface,
    },
    chipLabel: { fontSize: 12, fontWeight: '600', color: theme.text.secondary },
    list: { paddingHorizontal: 16, paddingBottom: 100, paddingTop: 4 },
    empty: { alignItems: 'center', paddingVertical: 48, gap: 12 },
    emptyText: { fontSize: 14, color: theme.text.muted },
    fab: {
      position: 'absolute',
      bottom: 24,
      right: 24,
      width: 56,
      height: 56,
      borderRadius: 28,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 6,
      shadowColor: '#000',
      shadowOpacity: 0.2,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 3 },
    },
  });
