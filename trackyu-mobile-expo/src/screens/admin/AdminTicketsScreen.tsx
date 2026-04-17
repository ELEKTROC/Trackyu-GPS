/**
 * TrackYu Mobile — Admin Tickets Screen
 * Vue admin/superadmin : liste tous les tickets du tenant.
 * Filtres : statut · priorité · recherche texte.
 * Pagination : 25/page, chargement infini via onEndReached.
 */
import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  TicketCheck,
  ChevronRight,
  Plus,
  X,
  Send,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
} from 'lucide-react-native';
import { useTheme } from '../../theme';
import { SearchBar } from '../../components/SearchBar';
import { ProtectedScreen } from '../../components/ProtectedScreen';
import { EmptyState } from '../../components/EmptyState';
import { ADMIN_SCREEN_ROLES } from '../../constants/roles';
import { VehicleFilterPanel, type FilterBlockDef } from '../../components/VehicleFilterPanel';
import ticketsApi, {
  type Ticket,
  type TicketStatus,
  type TicketPriority,
  type TicketCategory,
  type TicketSubCategory,
} from '../../api/tickets';
import {
  TICKET_STATUS_COLORS,
  TICKET_STATUS_LABELS,
  TICKET_PRIORITY_COLORS,
  TICKET_PRIORITY_LABELS,
  NEW_TICKET_PRIORITIES,
} from '../../utils/portalColors';
import { generateSubjectAndDesc } from '../../utils/ticketHelpers';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type ThemeType = ReturnType<typeof import('../../theme').useTheme>['theme'];

const PAGE_SIZE = 25;

// ── Filtres ───────────────────────────────────────────────────────────────────

const STATUS_FILTERS: { label: string; value: TicketStatus; color: string }[] = [
  { label: 'Ouverts', value: 'OPEN', color: '#3B82F6' },
  { label: 'En cours', value: 'IN_PROGRESS', color: '#F97316' },
  { label: 'Attente', value: 'WAITING_CLIENT', color: '#8B5CF6' },
  { label: 'Résolus', value: 'RESOLVED', color: '#22C55E' },
  { label: 'Fermés', value: 'CLOSED', color: '#6B7280' },
];

const PRIORITY_FILTERS: { label: string; value: TicketPriority; color: string }[] = [
  { label: 'Critique', value: 'CRITICAL', color: '#DC2626' },
  { label: 'Haute', value: 'HIGH', color: '#F97316' },
  { label: 'Moyenne', value: 'MEDIUM', color: '#3B82F6' },
  { label: 'Basse', value: 'LOW', color: '#22C55E' },
];

const PRIORITY_OPTIONS: TicketPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

// ── TicketCard ────────────────────────────────────────────────────────────────

function TicketCard({ item, theme, onPress }: { item: Ticket; theme: ThemeType; onPress: () => void }) {
  const statusColor = TICKET_STATUS_COLORS[item.status] ?? '#6B7280';
  const priorityColor = TICKET_PRIORITY_COLORS[item.priority] ?? '#6B7280';
  return (
    <TouchableOpacity
      style={[card(theme).wrap, { borderLeftColor: statusColor }]}
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={`Ticket : ${item.subject}`}
    >
      <View style={card(theme).body}>
        <View style={card(theme).row}>
          <Text style={card(theme).subject} numberOfLines={1}>
            {item.subject}
          </Text>
          <ChevronRight size={15} color={theme.text.muted} />
        </View>
        <View style={card(theme).badges}>
          <View style={[card(theme).badge, { backgroundColor: statusColor + '22' }]}>
            <Text style={[card(theme).badgeText, { color: statusColor }]}>
              {TICKET_STATUS_LABELS[item.status] ?? item.status}
            </Text>
          </View>
          <View style={[card(theme).badge, { backgroundColor: priorityColor + '22' }]}>
            <Text style={[card(theme).badgeText, { color: priorityColor }]}>
              {TICKET_PRIORITY_LABELS[item.priority] ?? item.priority}
            </Text>
          </View>
          {item.category ? (
            <View style={[card(theme).badge, { backgroundColor: theme.bg.elevated }]}>
              <Text style={[card(theme).badgeText, { color: theme.text.muted }]}>{item.category}</Text>
            </View>
          ) : null}
        </View>
        <View style={card(theme).meta}>
          {item.client_name ? (
            <Text style={card(theme).metaText} numberOfLines={1}>
              {item.client_name}
            </Text>
          ) : null}
          {item.assigned_user_name ? (
            <Text style={card(theme).metaText} numberOfLines={1}>
              → {item.assigned_user_name}
            </Text>
          ) : null}
          <Text style={card(theme).metaDate}>
            {new Date(item.updated_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const card = (theme: ThemeType) =>
  StyleSheet.create({
    wrap: {
      backgroundColor: theme.bg.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      borderLeftWidth: 4,
      overflow: 'hidden',
    },
    body: { padding: 12, gap: 6 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    subject: { flex: 1, fontSize: 14, fontWeight: '600', color: theme.text.primary },
    badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
    badge: { borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 },
    badgeText: { fontSize: 10, fontWeight: '600' },
    meta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
    metaText: { fontSize: 11, color: theme.text.secondary },
    metaDate: { fontSize: 11, color: theme.text.muted, marginLeft: 'auto' },
  });

// ── CreateModal ───────────────────────────────────────────────────────────────

function CreateModal({
  visible,
  onClose,
  onCreated,
  theme,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
  theme: ThemeType;
}) {
  const [selectedCategory, setSelectedCategory] = useState<TicketCategory | null>(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState<TicketSubCategory | null>(null);
  const [priority, setPriority] = useState<TicketPriority>('MEDIUM');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [showCatPicker, setShowCatPicker] = useState(false);
  const [showSubCatPicker, setShowSubCatPicker] = useState(false);

  const reset = () => {
    setSelectedCategory(null);
    setSelectedSubCategory(null);
    setPriority('MEDIUM');
    setSubject('');
    setDescription('');
    setShowCatPicker(false);
    setShowSubCatPicker(false);
  };

  const { data: categories = [], isLoading: catsLoading } = useQuery<TicketCategory[]>({
    queryKey: ['ticket-categories'],
    queryFn: ticketsApi.getCategories,
    staleTime: 5 * 60_000,
    enabled: visible,
  });

  const { data: subCategories = [] } = useQuery<TicketSubCategory[]>({
    queryKey: ['ticket-subcategories', selectedCategory?.id],
    queryFn: () => ticketsApi.getSubCategories(selectedCategory!.id),
    enabled: !!selectedCategory,
    staleTime: 5 * 60_000,
  });

  // Auto-remplissage sujet+description selon catégorie (comme vue client)
  React.useEffect(() => {
    if (!selectedCategory) return;
    const { subject: s, description: d } = generateSubjectAndDesc(
      selectedCategory.name,
      selectedSubCategory?.name ?? '',
      ''
    );
    setSubject(s);
    setDescription(d);
    const prio = (selectedSubCategory?.default_priority || selectedCategory.default_priority) as
      | TicketPriority
      | undefined;
    if (prio && ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(prio)) setPriority(prio);
  }, [selectedCategory, selectedSubCategory]);

  const mutation = useMutation({
    mutationFn: () =>
      ticketsApi.create({
        subject: subject.trim(),
        description: description.trim(),
        priority,
        category: selectedCategory?.name,
        sub_category: selectedSubCategory?.name,
      }),
    onSuccess: () => {
      reset();
      onCreated();
      onClose();
    },
    onError: (e: Error) => Alert.alert('Erreur', e.message ?? 'Impossible de créer le ticket'),
  });

  const canSubmit =
    subject.trim().length >= 3 && description.trim().length >= 10 && !!selectedCategory && !mutation.isPending;

  const f = formStyles(theme);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg.primary }} edges={['top']}>
          {/* Header */}
          <View style={f.header}>
            <TouchableOpacity
              onPress={() => nav_close(reset, onClose)}
              style={{ padding: 6 }}
              accessibilityLabel="Retour"
              accessibilityRole="button"
            >
              <ArrowLeft size={22} color={theme.text.primary} />
            </TouchableOpacity>
            <Text style={f.title}>Nouveau ticket</Text>
          </View>

          <ScrollView contentContainerStyle={f.form} keyboardShouldPersistTaps="handled">
            {/* Catégorie */}
            <View style={f.field}>
              <Text style={f.label}>
                Catégorie <Text style={f.required}>*</Text>
              </Text>
              <TouchableOpacity
                style={f.picker}
                onPress={() => {
                  setShowCatPicker((v) => !v);
                  setShowSubCatPicker(false);
                }}
                activeOpacity={0.8}
              >
                <Text style={[f.pickerText, !selectedCategory && { color: theme.text.muted }]}>
                  {selectedCategory?.name ?? 'Sélectionner une catégorie'}
                </Text>
                {showCatPicker ? (
                  <ChevronUp size={16} color={theme.text.muted} />
                ) : (
                  <ChevronDown size={16} color={theme.text.muted} />
                )}
              </TouchableOpacity>
              {showCatPicker && (
                <View style={f.dropdown}>
                  {catsLoading ? (
                    <ActivityIndicator size="small" color={theme.primary} style={{ padding: 16 }} />
                  ) : (
                    categories.map((cat) => (
                      <TouchableOpacity
                        key={cat.id}
                        style={[
                          f.dropdownItem,
                          selectedCategory?.id === cat.id && { backgroundColor: theme.primaryDim },
                        ]}
                        onPress={() => {
                          setSelectedCategory(cat);
                          setSelectedSubCategory(null);
                          setShowCatPicker(false);
                        }}
                      >
                        <Text
                          style={[
                            f.dropdownText,
                            selectedCategory?.id === cat.id && { color: theme.primary, fontWeight: '700' },
                          ]}
                        >
                          {cat.name}
                        </Text>
                      </TouchableOpacity>
                    ))
                  )}
                </View>
              )}
            </View>

            {/* Sous-catégorie */}
            {selectedCategory && subCategories.length > 0 && (
              <View style={f.field}>
                <Text style={f.label}>Sous-catégorie</Text>
                <TouchableOpacity
                  style={f.picker}
                  onPress={() => {
                    setShowSubCatPicker((v) => !v);
                    setShowCatPicker(false);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[f.pickerText, !selectedSubCategory && { color: theme.text.muted }]}>
                    {selectedSubCategory?.name ?? 'Sélectionner une sous-catégorie'}
                  </Text>
                  {showSubCatPicker ? (
                    <ChevronUp size={16} color={theme.text.muted} />
                  ) : (
                    <ChevronDown size={16} color={theme.text.muted} />
                  )}
                </TouchableOpacity>
                {showSubCatPicker && (
                  <View style={f.dropdown}>
                    {subCategories.map((sub) => (
                      <TouchableOpacity
                        key={sub.id}
                        style={[
                          f.dropdownItem,
                          selectedSubCategory?.id === sub.id && { backgroundColor: theme.primaryDim },
                        ]}
                        onPress={() => {
                          setSelectedSubCategory(sub);
                          setShowSubCatPicker(false);
                        }}
                      >
                        <Text
                          style={[
                            f.dropdownText,
                            selectedSubCategory?.id === sub.id && { color: theme.primary, fontWeight: '700' },
                          ]}
                        >
                          {sub.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Priorité */}
            <View style={f.field}>
              <Text style={f.label}>Priorité</Text>
              <View style={f.chipRow}>
                {[
                  ...NEW_TICKET_PRIORITIES,
                  { value: 'CRITICAL' as TicketPriority, label: 'Critique', color: '#DC2626' },
                ].map((p) => (
                  <TouchableOpacity
                    key={p.value}
                    style={[
                      f.chip,
                      priority === p.value
                        ? { backgroundColor: p.color, borderColor: p.color }
                        : { borderColor: theme.border },
                    ]}
                    onPress={() => setPriority(p.value as TicketPriority)}
                    activeOpacity={0.8}
                  >
                    <Text style={[f.chipText, priority === p.value && { color: '#fff' }]}>{p.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Sujet */}
            <View style={f.field}>
              <Text style={f.label}>
                Sujet <Text style={f.required}>*</Text>
              </Text>
              <TextInput
                style={f.input}
                value={subject}
                onChangeText={setSubject}
                placeholder="Résumez le problème"
                placeholderTextColor={theme.text.muted}
                maxLength={120}
              />
            </View>

            {/* Description */}
            <View style={f.field}>
              <Text style={f.label}>
                Description <Text style={f.required}>*</Text>
              </Text>
              <TextInput
                style={[f.input, f.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Décrivez le problème en détail…"
                placeholderTextColor={theme.text.muted}
                multiline
                numberOfLines={6}
                maxLength={2000}
                textAlignVertical="top"
              />
              <Text style={f.charCount}>{description.length} / 2000</Text>
            </View>

            {/* Submit */}
            <TouchableOpacity
              style={[f.submitBtn, !canSubmit && f.submitBtnDisabled]}
              onPress={() => mutation.mutate()}
              disabled={!canSubmit}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Envoyer le ticket"
            >
              {mutation.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Send size={18} color="#fff" />
                  <Text style={f.submitText}>Envoyer le ticket</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function nav_close(reset: () => void, onClose: () => void) {
  reset();
  onClose();
}

const formStyles = (theme: ThemeType) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingTop: 12,
      paddingBottom: 12,
      paddingHorizontal: 16,
      gap: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    title: { fontSize: 20, fontWeight: '700', color: theme.text.primary },
    form: { padding: 16, gap: 20, paddingBottom: 40 },
    field: { gap: 8 },
    label: { fontSize: 13, fontWeight: '600', color: theme.text.secondary },
    required: { color: '#EF4444' },
    picker: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.bg.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: 14,
      paddingVertical: 13,
    },
    pickerText: { fontSize: 14, color: theme.text.primary, flex: 1 },
    dropdown: {
      backgroundColor: theme.bg.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      overflow: 'hidden',
    },
    dropdownItem: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.border },
    dropdownText: { fontSize: 14, color: theme.text.primary },
    input: {
      backgroundColor: theme.bg.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      color: theme.text.primary,
      fontSize: 14,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    textArea: { height: 130, paddingTop: 12 },
    charCount: { fontSize: 11, color: theme.text.muted, textAlign: 'right' },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      borderRadius: 20,
      borderWidth: 1,
      paddingHorizontal: 14,
      paddingVertical: 7,
      backgroundColor: 'transparent',
    },
    chipText: { fontSize: 13, color: theme.text.secondary, fontWeight: '500' },
    submitBtn: {
      backgroundColor: theme.primary,
      borderRadius: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      paddingVertical: 15,
      marginTop: 8,
    },
    submitBtnDisabled: { opacity: 0.45 },
    submitText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  });

// ── Main ──────────────────────────────────────────────────────────────────────

export default function AdminTicketsScreen() {
  const { theme } = useTheme();
  const nav = useNavigation<Nav>();
  const qc = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<TicketStatus | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | null>(null);
  const [search, setSearch] = useState('');
  const [createVisible, setCreateVisible] = useState(false);
  const [resellerFilter, setResellerFilter] = useState<string | null>(null);
  const [clientFilter, setClientFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // ── Pagination ──────────────────────────────────────────────────────────────
  const [page, setPage] = useState(1);
  const accumulatedRef = useRef<Ticket[]>([]);
  const [allTickets, setAllTickets] = useState<Ticket[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const { isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['admin-tickets', statusFilter, page],
    queryFn: async () => {
      const res = await ticketsApi.getAll({
        limit: PAGE_SIZE,
        ...(statusFilter ? { status: statusFilter } : {}),
      });
      // React Query ne gère pas l'accumulation — on le fait manuellement
      if (page === 1) {
        accumulatedRef.current = res.data ?? [];
      } else {
        accumulatedRef.current = [...accumulatedRef.current, ...(res.data ?? [])];
      }
      setAllTickets([...accumulatedRef.current]);
      setTotalCount(res.total ?? 0);
      setIsLoadingMore(false);
      return res;
    },
    staleTime: 60_000,
  });

  // Reset pagination quand le filtre statut change
  const handleStatusChange = (v: TicketStatus | null) => {
    setStatusFilter(v);
    setPage(1);
    accumulatedRef.current = [];
    setAllTickets([]);
  };

  const handleReset = () => {
    setResellerFilter(null);
    setClientFilter(null);
    setCategoryFilter(null);
  };

  const handleRefresh = useCallback(() => {
    setPage(1);
    accumulatedRef.current = [];
    setAllTickets([]);
    refetch();
  }, [refetch]);

  const loadMore = useCallback(() => {
    if (isLoadingMore || allTickets.length >= totalCount) return;
    setIsLoadingMore(true);
    setPage((p) => p + 1);
  }, [isLoadingMore, allTickets.length, totalCount]);

  // Listes dérivées pour VehicleFilterPanel
  const uniqueResellers = useMemo(
    () =>
      [...new Set(allTickets.map((t) => t.reseller_name).filter(Boolean) as string[])]
        .sort()
        .map((n) => ({ id: n, label: n })),
    [allTickets]
  );

  const uniqueClients = useMemo(() => {
    const pool = resellerFilter ? allTickets.filter((t) => t.reseller_name === resellerFilter) : allTickets;
    return [...new Set(pool.map((t) => t.client_name).filter(Boolean) as string[])]
      .sort()
      .map((n) => ({ id: n, label: n }));
  }, [allTickets, resellerFilter]);

  const uniqueCategories = useMemo(
    () =>
      [...new Set(allTickets.map((t) => t.category).filter(Boolean) as string[])]
        .sort()
        .map((n) => ({ id: n, label: n })),
    [allTickets]
  );

  const filterBlocks: FilterBlockDef[] = [
    {
      key: 'reseller',
      label: 'Revendeur',
      items: uniqueResellers,
      selected: resellerFilter,
      onSelect: (v) => {
        setResellerFilter(v);
        setClientFilter(null);
      },
    },
    { key: 'client', label: 'Client', items: uniqueClients, selected: clientFilter, onSelect: setClientFilter },
    {
      key: 'category',
      label: 'Catégorie',
      items: uniqueCategories,
      selected: categoryFilter,
      onSelect: setCategoryFilter,
    },
  ];

  const hasActiveFilters = !!(resellerFilter || clientFilter || categoryFilter);

  // Filtre priorité + recherche + VehicleFilterPanel côté client
  const filtered = useMemo(() => {
    let list = allTickets;
    if (priorityFilter) list = list.filter((t) => t.priority === priorityFilter);
    if (resellerFilter) list = list.filter((t) => t.reseller_name === resellerFilter);
    if (clientFilter) list = list.filter((t) => t.client_name === clientFilter);
    if (categoryFilter) list = list.filter((t) => t.category === categoryFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          t.subject?.toLowerCase().includes(q) ||
          t.client_name?.toLowerCase().includes(q) ||
          t.assigned_user_name?.toLowerCase().includes(q) ||
          t.category?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [allTickets, priorityFilter, resellerFilter, clientFilter, categoryFilter, search]);

  const openCount = allTickets.filter((t) => t.status === 'OPEN').length;
  const criticalCount = allTickets.filter((t) => t.priority === 'CRITICAL').length;
  const hasMore = allTickets.length < totalCount;

  return (
    <ProtectedScreen allowedRoles={ADMIN_SCREEN_ROLES}>
      <SafeAreaView style={s(theme).container} edges={['top']}>
        {/* Header */}
        <View style={s(theme).header}>
          <TouchableOpacity
            onPress={() => nav.goBack()}
            style={s(theme).back}
            accessibilityLabel="Retour"
            accessibilityRole="button"
          >
            <ArrowLeft size={22} color={theme.text.primary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s(theme).title}>Tickets Support</Text>
            {!isLoading && (
              <Text style={s(theme).subtitle}>
                {totalCount} ticket{totalCount > 1 ? 's' : ''}
                {openCount > 0 ? ` · ${openCount} ouvert${openCount > 1 ? 's' : ''}` : ''}
                {criticalCount > 0 ? ` · ${criticalCount} critique${criticalCount > 1 ? 's' : ''}` : ''}
              </Text>
            )}
          </View>
          <TouchableOpacity
            style={s(theme).createBtn}
            onPress={() => setCreateVisible(true)}
            accessibilityLabel="Créer un ticket"
            accessibilityRole="button"
          >
            <Plus size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Recherche + bouton filtre */}
        <View style={s(theme).searchRow}>
          <View style={{ flex: 1 }}>
            <SearchBar value={search} onChangeText={setSearch} placeholder="Rechercher sujet, client…" />
          </View>
          <TouchableOpacity
            style={[
              s(theme).filterBtn,
              (showFilters || hasActiveFilters) && { backgroundColor: theme.primary, borderColor: theme.primary },
            ]}
            onPress={() => setShowFilters((v) => !v)}
            accessibilityLabel="Filtres avancés"
            accessibilityRole="button"
          >
            <SlidersHorizontal size={16} color={showFilters || hasActiveFilters ? '#fff' : theme.text.secondary} />
            {hasActiveFilters && <View style={s(theme).filterDot} />}
          </TouchableOpacity>
        </View>

        {/* VehicleFilterPanel */}
        <View style={{ paddingHorizontal: 16, paddingBottom: showFilters ? 8 : 0 }}>
          <VehicleFilterPanel
            visible={showFilters}
            blocks={filterBlocks}
            hasActiveFilters={hasActiveFilters}
            onReset={handleReset}
          />
        </View>

        {/* Filtre statut */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s(theme).chips}>
          {STATUS_FILTERS.map((f) => {
            const active = statusFilter === f.value;
            return (
              <TouchableOpacity
                key={f.label}
                style={[
                  s(theme).chip,
                  active ? { backgroundColor: f.color, borderColor: f.color } : { borderColor: f.color + '66' },
                ]}
                onPress={() => handleStatusChange(active ? null : f.value)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text style={[s(theme).chipLabel, active ? { color: '#fff' } : { color: f.color }]}>{f.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Filtre priorité */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[s(theme).chips, { paddingTop: 0, paddingBottom: 10 }]}
        >
          {PRIORITY_FILTERS.map((f) => {
            const active = priorityFilter === f.value;
            return (
              <TouchableOpacity
                key={f.label}
                style={[
                  s(theme).chip,
                  active ? { backgroundColor: f.color, borderColor: f.color } : { borderColor: f.color + '66' },
                ]}
                onPress={() => setPriorityFilter(active ? null : f.value)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text style={[s(theme).chipLabel, active ? { color: '#fff' } : { color: f.color }]}>{f.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Liste */}
        {isLoading && allTickets.length === 0 ? (
          <View style={s(theme).center}>
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
        ) : filtered.length === 0 ? (
          <View style={s(theme).center}>
            <EmptyState
              icon={<TicketCheck size={48} color={theme.text.muted} />}
              title="Aucun ticket"
              subtitle="Aucun ticket ne correspond aux filtres"
            />
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(i) => i.id}
            renderItem={({ item }) => (
              <TicketCard
                item={item}
                theme={theme}
                onPress={() => nav.navigate('SupportTicketDetail', { ticketId: item.id, subject: item.subject })}
              />
            )}
            contentContainerStyle={{ padding: 16, gap: 8 }}
            initialNumToRender={20}
            maxToRenderPerBatch={20}
            windowSize={5}
            removeClippedSubviews={true}
            onEndReached={() => {
              if (hasMore && !search && !priorityFilter) loadMore();
            }}
            onEndReachedThreshold={0.3}
            ListFooterComponent={
              hasMore && !search && !priorityFilter ? (
                <TouchableOpacity style={s(theme).loadMore} onPress={loadMore} disabled={isLoadingMore}>
                  {isLoadingMore ? (
                    <ActivityIndicator size="small" color={theme.primary} />
                  ) : (
                    <Text style={s(theme).loadMoreText}>Charger plus ({totalCount - allTickets.length} restants)</Text>
                  )}
                </TouchableOpacity>
              ) : (
                <View style={{ height: 40 }} />
              )
            }
            refreshControl={
              <RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} tintColor={theme.primary} />
            }
          />
        )}

        <CreateModal
          visible={createVisible}
          onClose={() => setCreateVisible(false)}
          onCreated={() => {
            qc.invalidateQueries({ queryKey: ['admin-tickets'] });
            handleRefresh();
          }}
          theme={theme}
        />
      </SafeAreaView>
    </ProtectedScreen>
  );
}

const s = (theme: ThemeType) =>
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
    createBtn: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: theme.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 2,
    },
    searchRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
    filterBtn: {
      width: 40,
      height: 40,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.bg.surface,
      justifyContent: 'center',
      alignItems: 'center',
    },
    filterDot: {
      position: 'absolute',
      top: 6,
      right: 6,
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: '#EF4444',
      borderWidth: 1.5,
      borderColor: theme.bg.surface,
    },
    chips: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 4, gap: 6 },
    chip: {
      borderWidth: 1.5,
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: 'transparent',
    },
    chipLabel: { fontSize: 12, fontWeight: '600' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
    loadMore: { alignItems: 'center', paddingVertical: 14 },
    loadMoreText: { fontSize: 13, color: theme.primary, fontWeight: '600' },
  });
