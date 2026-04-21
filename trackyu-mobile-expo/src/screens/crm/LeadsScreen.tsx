/**
 * TrackYu Mobile — Leads CRM Screen
 * CRUD complet : liste + KPI bar + filtres + formulaire (quickMode / complet) +
 * bouton "Convertir en client" (POST /crm/leads/:id/convert).
 * GET /crm/leads — requiert VIEW_CRM (COMMERCIAL, MANAGER, ADMIN, SUPERADMIN).
 */
import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TextInput,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ArrowLeft,
  Briefcase,
  TrendingUp,
  Phone,
  SlidersHorizontal,
  Plus,
  X,
  Save,
  Trash2,
  ChevronDown,
  ChevronUp,
  UserCheck,
} from 'lucide-react-native';
import { useTheme } from '../../theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import crmApi, {
  type Lead,
  type LeadStatus,
  type LeadType,
  type CreateLeadRequest,
  LEAD_STATUS_COLORS,
  LEAD_STATUS_LABELS,
  LEAD_FILTER_STATUSES,
  LEAD_SECTORS,
  LEAD_SOURCES,
} from '../../api/crmApi';
import { useAuthStore } from '../../store/authStore';
import type { RootStackParamList } from '../../navigation/types';
import { CRM_SCREEN_ROLES } from '../../constants/roles';
import { ProtectedScreen } from '../../components/ProtectedScreen';
import { SearchBar } from '../../components/SearchBar';
import { VehicleFilterPanel, type FilterBlockDef } from '../../components/VehicleFilterPanel';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type ThemeType = ReturnType<typeof import('../../theme').useTheme>['theme'];

// ── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_FILTER_ITEMS = LEAD_FILTER_STATUSES.map((s) => ({
  id: s as string,
  label: LEAD_STATUS_LABELS[s],
}));

function formatValue(v: number | null): string {
  if (v == null) return '–';
  return v.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 });
}

// ── LeadCard ──────────────────────────────────────────────────────────────────

function LeadCard({ item, theme, onPress }: { item: Lead; theme: ThemeType; onPress: () => void }) {
  const statusColor = LEAD_STATUS_COLORS[item.status] ?? '#6B7280';
  const s = cardStyles(theme);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[s.card, { borderLeftColor: statusColor }]}
      accessibilityRole="button"
      accessibilityLabel={`Lead ${item.company_name}. Toucher pour modifier.`}
    >
      <View style={s.body}>
        <View style={s.headerRow}>
          <Text style={s.company} numberOfLines={1}>
            {item.company_name}
          </Text>
          <View
            style={{ backgroundColor: statusColor + '22', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 }}
          >
            <Text style={{ fontSize: 10, fontWeight: '700', color: statusColor }}>
              {LEAD_STATUS_LABELS[item.status] ?? item.status}
            </Text>
          </View>
        </View>

        {item.contact_name ? (
          <Text style={s.contact} numberOfLines={1}>
            {item.contact_name}
            {item.email ? ` · ${item.email}` : ''}
          </Text>
        ) : null}

        <View style={s.metaRow}>
          {item.phone ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Phone size={10} color={theme.text.muted} />
              <Text style={s.meta}>{item.phone}</Text>
            </View>
          ) : null}
          {item.potential_value != null ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <TrendingUp size={10} color="#10B981" />
              <Text style={[s.meta, { color: '#10B981' }]}>{formatValue(item.potential_value)}</Text>
            </View>
          ) : null}
          {item.source ? <Text style={[s.meta, { marginLeft: 'auto' }]}>{item.source}</Text> : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const cardStyles = (theme: ThemeType) =>
  StyleSheet.create({
    card: {
      backgroundColor: theme.bg.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      borderLeftWidth: 4,
      overflow: 'hidden',
    },
    body: { padding: 12, gap: 5 },
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    company: { flex: 1, fontSize: 14, fontWeight: '700', color: theme.text.primary },
    contact: { fontSize: 12, color: theme.text.secondary },
    metaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginTop: 2 },
    meta: { fontSize: 11, color: theme.text.muted },
  });

// ── KPI bar ───────────────────────────────────────────────────────────────────

function KpiBar({ leads, theme }: { leads: Lead[]; theme: ThemeType }) {
  const won = leads.filter((l) => l.status === 'WON').length;
  const active = leads.filter((l) => !['WON', 'LOST'].includes(l.status)).length;
  const totalValue = leads.filter((l) => l.status !== 'LOST').reduce((s, l) => s + (l.potential_value ?? 0), 0);

  return (
    <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 12 }}>
      {[
        { label: 'Total', value: leads.length, color: theme.primary },
        { label: 'Actifs', value: active, color: '#F59E0B' },
        { label: 'Gagnés', value: won, color: '#22C55E' },
        { label: 'Valeur', value: totalValue > 0 ? (totalValue / 1000000).toFixed(1) + 'M' : '–', color: '#10B981' },
      ].map((k) => (
        <View
          key={k.label}
          style={{
            flex: 1,
            backgroundColor: theme.bg.surface,
            borderRadius: 10,
            padding: 10,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: theme.border,
          }}
        >
          <Text style={{ fontSize: 17, fontWeight: '800', color: k.color }}>{k.value}</Text>
          <Text style={{ fontSize: 10, color: theme.text.muted, marginTop: 2 }}>{k.label}</Text>
        </View>
      ))}
    </View>
  );
}

// ── Form ──────────────────────────────────────────────────────────────────────

type FormState = {
  companyName: string;
  contactName: string;
  phone: string;
  email: string;
  status: LeadStatus;
  type: LeadType;
  sector: string;
  source: string;
  potentialValue: string;
  notes: string;
};

const EMPTY_FORM: FormState = {
  companyName: '',
  contactName: '',
  phone: '',
  email: '',
  status: 'NEW',
  type: 'B2B',
  sector: '',
  source: '',
  potentialValue: '',
  notes: '',
};

function leadToForm(l: Lead): FormState {
  return {
    companyName: l.company_name ?? '',
    contactName: l.contact_name ?? '',
    phone: l.phone ?? '',
    email: l.email ?? '',
    status: l.status,
    type: l.type ?? 'B2B',
    sector: l.sector ?? '',
    source: l.source ?? '',
    potentialValue: l.potential_value != null ? String(l.potential_value) : '',
    notes: l.notes ?? '',
  };
}

function formToPayload(f: FormState): CreateLeadRequest {
  const v = parseFloat(f.potentialValue);
  return {
    companyName: f.companyName.trim(),
    contactName: f.contactName.trim() || undefined,
    phone: f.phone.trim() || undefined,
    email: f.email.trim() || undefined,
    status: f.status,
    type: f.type,
    sector: f.sector || undefined,
    source: f.source || undefined,
    potentialValue: isNaN(v) ? undefined : v,
    notes: f.notes.trim() || undefined,
  };
}

// Top-level pour éviter le remount TextInput à chaque keystroke
type FieldProps = {
  theme: ThemeType;
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'numeric';
  autoCapitalize?: 'none' | 'sentences' | 'words';
  multiline?: boolean;
};
function Field({
  theme,
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoCapitalize,
  multiline,
}: FieldProps) {
  const border = theme.border;
  const bg = theme.bg.surface;
  const textColor = theme.text.primary;
  const mutedColor = theme.text.muted;
  const secondaryColor = theme.text.secondary;
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ fontSize: 12, fontWeight: '600', color: secondaryColor, marginBottom: 6 }}>{label}</Text>
      <TextInput
        style={{
          backgroundColor: bg,
          borderWidth: 1,
          borderColor: border,
          borderRadius: 10,
          paddingHorizontal: 12,
          paddingVertical: multiline ? 10 : 10,
          fontSize: 14,
          color: textColor,
          minHeight: multiline ? 80 : undefined,
          textAlignVertical: multiline ? 'top' : undefined,
        }}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={mutedColor}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        multiline={multiline}
      />
    </View>
  );
}

type ChipPickerProps = {
  theme: ThemeType;
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onSelect: (v: string) => void;
};
function ChipPicker({ theme, label, value, options, onSelect }: ChipPickerProps) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ fontSize: 12, fontWeight: '600', color: theme.text.secondary, marginBottom: 8 }}>{label}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {options.map((opt) => {
          const active = value === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              onPress={() => onSelect(active ? '' : opt.value)}
              style={{
                borderRadius: 8,
                paddingHorizontal: 10,
                paddingVertical: 6,
                backgroundColor: active ? theme.primary : theme.bg.elevated,
                borderWidth: 1,
                borderColor: active ? theme.primary : theme.border,
              }}
            >
              <Text
                style={{ fontSize: 12, fontWeight: '600', color: active ? theme.text.onPrimary : theme.text.secondary }}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const STATUS_OPTIONS = LEAD_FILTER_STATUSES.map((s) => ({
  value: s,
  label: LEAD_STATUS_LABELS[s],
}));
const TYPE_OPTIONS = [
  { value: 'B2B', label: 'Société (B2B)' },
  { value: 'B2C', label: 'Particulier (B2C)' },
];

function LeadFormModal({
  visible,
  lead,
  onClose,
  onSubmit,
  onDelete,
  onConvert,
  isPending,
  isConverting,
}: {
  visible: boolean;
  lead: Lead | null;
  onClose: () => void;
  onSubmit: (payload: CreateLeadRequest) => void;
  onDelete: () => void;
  onConvert: () => void;
  isPending: boolean;
  isConverting: boolean;
}) {
  const { theme } = useTheme();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [showDetails, setShowDetails] = useState(false);
  const isEdit = Boolean(lead);

  useEffect(() => {
    if (visible) {
      setForm(lead ? leadToForm(lead) : EMPTY_FORM);
      setShowDetails(false);
    }
  }, [visible, lead]);

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = () => {
    if (!form.companyName.trim()) {
      Alert.alert('Champ requis', 'Le nom de la société est obligatoire.');
      return;
    }
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      Alert.alert('Email invalide', "Le format de l'email est incorrect.");
      return;
    }
    onSubmit(formToPayload(form));
  };

  const handleDelete = () => {
    Alert.alert('Supprimer le lead', `Supprimer définitivement « ${lead?.company_name ?? 'ce lead'} » ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: onDelete },
    ]);
  };

  const handleConvert = () => {
    Alert.alert(
      'Convertir en client',
      `Convertir « ${lead?.company_name ?? 'ce lead'} » en client TrackYu ?\n\nUn fiche client sera créée automatiquement.`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Convertir', onPress: onConvert },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg.primary }} edges={['top']}>
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 16,
              paddingTop: 8,
              paddingBottom: 12,
              borderBottomWidth: 1,
              borderBottomColor: theme.border,
            }}
          >
            <Text style={{ fontSize: 17, fontWeight: '700', color: theme.text.primary }}>
              {isEdit ? 'Modifier le lead' : 'Nouveau lead'}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {isEdit ? (
                <TouchableOpacity onPress={handleDelete} style={{ padding: 4 }} accessibilityLabel="Supprimer">
                  <Trash2 size={20} color="#EF4444" />
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity onPress={onClose} style={{ padding: 4 }} accessibilityLabel="Fermer">
                <X size={22} color={theme.text.primary} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
            {/* Champs rapides */}
            <Field
              theme={theme}
              label="Société / Nom *"
              value={form.companyName}
              onChangeText={(v) => update('companyName', v)}
              autoCapitalize="words"
              placeholder="Nom de l'entreprise ou du contact"
            />
            <Field
              theme={theme}
              label="Contact principal"
              value={form.contactName}
              onChangeText={(v) => update('contactName', v)}
              autoCapitalize="words"
              placeholder="Nom du contact"
            />
            <Field
              theme={theme}
              label="Téléphone"
              value={form.phone}
              onChangeText={(v) => update('phone', v)}
              keyboardType="phone-pad"
              placeholder="+225 ..."
            />

            {/* Statut (toujours visible) */}
            <ChipPicker
              theme={theme}
              label="Statut"
              value={form.status}
              options={STATUS_OPTIONS}
              onSelect={(v) => update('status', (v || 'NEW') as LeadStatus)}
            />

            {/* Toggle détails */}
            <TouchableOpacity
              onPress={() => setShowDetails((p) => !p)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                marginBottom: 14,
                paddingVertical: 8,
                borderRadius: 8,
                backgroundColor: theme.bg.elevated,
                borderWidth: 1,
                borderColor: theme.border,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '600', color: theme.primary }}>
                {showDetails ? 'Masquer les détails' : 'Afficher tous les champs'}
              </Text>
              {showDetails ? (
                <ChevronUp size={15} color={theme.primary} />
              ) : (
                <ChevronDown size={15} color={theme.primary} />
              )}
            </TouchableOpacity>

            {showDetails ? (
              <>
                {/* Type */}
                <ChipPicker
                  theme={theme}
                  label="Type de lead"
                  value={form.type}
                  options={TYPE_OPTIONS}
                  onSelect={(v) => update('type', (v || 'B2B') as LeadType)}
                />

                <Field
                  theme={theme}
                  label="Email"
                  value={form.email}
                  onChangeText={(v) => update('email', v)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholder="email@societe.com"
                />

                <ChipPicker
                  theme={theme}
                  label="Secteur d'activité"
                  value={form.sector}
                  options={LEAD_SECTORS}
                  onSelect={(v) => update('sector', v)}
                />

                <ChipPicker
                  theme={theme}
                  label="Source"
                  value={form.source}
                  options={LEAD_SOURCES}
                  onSelect={(v) => update('source', v)}
                />

                <Field
                  theme={theme}
                  label="Valeur potentielle (FCFA)"
                  value={form.potentialValue}
                  onChangeText={(v) => update('potentialValue', v)}
                  keyboardType="numeric"
                  placeholder="ex: 150000"
                />

                <Field
                  theme={theme}
                  label="Notes"
                  value={form.notes}
                  onChangeText={(v) => update('notes', v)}
                  autoCapitalize="sentences"
                  multiline
                  placeholder="Contexte, remarques, prochaine étape..."
                />
              </>
            ) : null}
          </ScrollView>

          {/* Footer */}
          <View
            style={{
              borderTopWidth: 1,
              borderTopColor: theme.border,
              backgroundColor: theme.bg.surface,
              padding: 12,
              gap: 8,
            }}
          >
            {/* Bouton convertir — visible uniquement en édition, statut QUALIFIED+ */}
            {isEdit && lead && !['LOST'].includes(lead.status) ? (
              <TouchableOpacity
                onPress={handleConvert}
                disabled={isConverting || isPending}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  backgroundColor: '#22C55E18',
                  borderRadius: 10,
                  paddingVertical: 10,
                  borderWidth: 1,
                  borderColor: '#22C55E55',
                }}
              >
                {isConverting ? (
                  <ActivityIndicator color="#22C55E" size="small" />
                ) : (
                  <>
                    <UserCheck size={16} color="#22C55E" />
                    <Text style={{ color: '#22C55E', fontSize: 13, fontWeight: '700' }}>Convertir en client</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : null}

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 10,
                  backgroundColor: theme.bg.elevated,
                  alignItems: 'center',
                }}
                onPress={onClose}
                disabled={isPending}
              >
                <Text style={{ color: theme.text.secondary, fontSize: 14, fontWeight: '600' }}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  gap: 6,
                  paddingVertical: 12,
                  borderRadius: 10,
                  backgroundColor: theme.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: isPending ? 0.6 : 1,
                }}
                onPress={handleSubmit}
                disabled={isPending}
              >
                {isPending ? (
                  <ActivityIndicator color={theme.text.onPrimary} />
                ) : (
                  <>
                    <Save size={16} color={theme.text.onPrimary} />
                    <Text style={{ color: theme.text.onPrimary, fontSize: 14, fontWeight: '700' }}>
                      {isEdit ? 'Enregistrer' : 'Créer'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function LeadsScreen() {
  const { theme } = useTheme();
  const s = styles(theme);
  const nav = useNavigation<Nav>();
  const user = useAuthStore((st) => st.user);
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<string | null>(null);
  const [sectorFilter, setSectorFilter] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Lead | null>(null);

  const {
    data = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['crm-leads'],
    queryFn: crmApi.getLeads,
    staleTime: 60_000,
  });

  const uniqueSources = useMemo(() => {
    const m = new Set<string>();
    data.forEach((l) => {
      if (l.source?.trim()) m.add(l.source.trim());
    });
    return Array.from(m)
      .sort()
      .map((s2) => ({ id: s2, label: s2 }));
  }, [data]);

  const uniqueSectors = useMemo(() => {
    const m = new Set<string>();
    data.forEach((l) => {
      if (l.sector?.trim()) m.add(l.sector.trim());
    });
    return Array.from(m)
      .sort()
      .map((s2) => ({ id: s2, label: s2 }));
  }, [data]);

  const filterBlocks: FilterBlockDef[] = useMemo(
    () => [
      { key: 'status', label: 'Statut', items: STATUS_FILTER_ITEMS, selected: statusFilter, onSelect: setStatusFilter },
      { key: 'source', label: 'Source', items: uniqueSources, selected: sourceFilter, onSelect: setSourceFilter },
      { key: 'sector', label: 'Secteur', items: uniqueSectors, selected: sectorFilter, onSelect: setSectorFilter },
    ],
    [statusFilter, uniqueSources, sourceFilter, uniqueSectors, sectorFilter]
  );

  const hasActiveFilters = !!(statusFilter || sourceFilter || sectorFilter);
  const resetFilters = () => {
    setStatusFilter(null);
    setSourceFilter(null);
    setSectorFilter(null);
  };

  const filtered = useMemo(() => {
    let list = data;
    if (statusFilter) list = list.filter((l) => l.status === (statusFilter as LeadStatus));
    if (sourceFilter) list = list.filter((l) => l.source === sourceFilter);
    if (sectorFilter) list = list.filter((l) => l.sector === sectorFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (l) =>
          l.company_name?.toLowerCase().includes(q) ||
          l.contact_name?.toLowerCase().includes(q) ||
          l.email?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [data, search, statusFilter, sourceFilter, sectorFilter]);

  const createMutation = useMutation({
    mutationFn: (payload: CreateLeadRequest) => crmApi.createLead(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-leads'] });
      setModalOpen(false);
      setEditing(null);
    },
    onError: (err: Error) => Alert.alert('Création impossible', err.message || 'Erreur inconnue.'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CreateLeadRequest }) => crmApi.updateLead(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-leads'] });
      setModalOpen(false);
      setEditing(null);
    },
    onError: (err: Error) => Alert.alert('Mise à jour impossible', err.message || 'Erreur inconnue.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => crmApi.deleteLead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-leads'] });
      setModalOpen(false);
      setEditing(null);
    },
    onError: (err: Error) => Alert.alert('Suppression impossible', err.message || 'Erreur inconnue.'),
  });

  const convertMutation = useMutation({
    mutationFn: (id: string) => crmApi.convertToClient(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-leads'] });
      setModalOpen(false);
      setEditing(null);
      Alert.alert('Client créé', 'Le lead a été converti en client avec succès.');
    },
    onError: (err: Error) => Alert.alert('Conversion impossible', err.message || 'Erreur inconnue.'),
  });

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (l: Lead) => {
    setEditing(l);
    setModalOpen(true);
  };
  const handleSubmit = (payload: CreateLeadRequest) => {
    if (editing) {
      updateMutation.mutate({ id: editing.id, payload });
    } else {
      createMutation.mutate({ ...payload, assignedTo: user?.id ?? undefined });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <ProtectedScreen allowedRoles={CRM_SCREEN_ROLES}>
      <SafeAreaView style={s.container} edges={['top']}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => nav.goBack()} style={s.backBtn} accessibilityLabel="Retour">
            <ArrowLeft size={22} color={theme.text.primary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>Leads CRM</Text>
            {!isLoading && (
              <Text style={s.subtitle}>
                {filtered.length} lead{filtered.length !== 1 ? 's' : ''}
              </Text>
            )}
          </View>
        </View>

        {/* KPI bar */}
        {!isLoading && data.length > 0 ? <KpiBar leads={data} theme={theme} /> : null}

        {/* Search + filtres */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginBottom: 10 }}>
          <View style={{ flex: 1 }}>
            <SearchBar value={search} onChangeText={setSearch} placeholder="Entreprise, contact, email…" />
          </View>
          <TouchableOpacity
            onPress={() => setShowFilters((p) => !p)}
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              backgroundColor: showFilters ? theme.primary : theme.bg.surface,
              borderWidth: 1,
              borderColor: theme.border,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <SlidersHorizontal size={18} color={showFilters ? theme.text.onPrimary : theme.text.primary} />
            {hasActiveFilters && !showFilters ? (
              <View
                style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: '#EF4444',
                }}
              />
            ) : null}
          </TouchableOpacity>
        </View>

        <VehicleFilterPanel
          visible={showFilters}
          blocks={filterBlocks}
          hasActiveFilters={hasActiveFilters}
          onReset={resetFilters}
        />

        {/* Liste */}
        {isLoading ? (
          <View style={s.center}>
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
        ) : filtered.length === 0 ? (
          <View style={s.center}>
            <Briefcase size={48} color={theme.text.muted} />
            <Text style={s.empty}>{search || hasActiveFilters ? 'Aucun résultat' : 'Aucun lead'}</Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(l) => l.id}
            renderItem={({ item }) => <LeadCard item={item} theme={theme} onPress={() => openEdit(item)} />}
            contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: 100 }}
            refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme.primary} />}
          />
        )}

        {/* FAB */}
        <TouchableOpacity
          onPress={openCreate}
          style={[s.fab, { backgroundColor: theme.primary }]}
          activeOpacity={0.85}
          accessibilityLabel="Créer un lead"
        >
          <Plus size={26} color={theme.text.onPrimary} />
        </TouchableOpacity>

        <LeadFormModal
          visible={modalOpen}
          lead={editing}
          onClose={() => {
            setModalOpen(false);
            setEditing(null);
          }}
          onSubmit={handleSubmit}
          onDelete={() => editing && deleteMutation.mutate(editing.id)}
          onConvert={() => editing && convertMutation.mutate(editing.id)}
          isPending={isPending || deleteMutation.isPending}
          isConverting={convertMutation.isPending}
        />
      </SafeAreaView>
    </ProtectedScreen>
  );
}

const styles = (theme: ThemeType) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg.primary },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingTop: 12,
      paddingHorizontal: 16,
      paddingBottom: 12,
      gap: 12,
    },
    backBtn: { padding: 4, marginTop: 4 },
    title: { fontSize: 22, fontWeight: '700', color: theme.text.primary },
    subtitle: { fontSize: 12, color: theme.text.muted, marginTop: 2 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
    empty: { fontSize: 14, color: theme.text.muted },
    fab: {
      position: 'absolute',
      right: 20,
      bottom: 24,
      width: 56,
      height: 56,
      borderRadius: 28,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 6,
      elevation: 5,
    },
  });
