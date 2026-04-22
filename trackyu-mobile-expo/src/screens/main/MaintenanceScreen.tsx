/**
 * TrackYu Mobile — Maintenance & Entretien
 * Liste des règles + Créer / Modifier / Supprimer
 */
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Plus, Wrench, Trash2, Edit2, X, Check, ChevronDown, SlidersHorizontal } from 'lucide-react-native';
import { Button } from '../../components/Button';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import maintenanceApi, {
  type MaintenanceRule,
  type MaintenanceCategory,
  type MaintenanceTrigger,
  type MaintenanceUnit,
} from '../../api/maintenanceApi';
import vehiclesApi from '../../api/vehicles';
import { useTheme } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import { ROLE } from '../../constants/roles';
import { SearchBar } from '../../components/SearchBar';
import { VehicleFilterPanel, type FilterBlockDef } from '../../components/VehicleFilterPanel';

type ThemeType = ReturnType<typeof import('../../theme').useTheme>['theme'];

const CATEGORIES: MaintenanceCategory[] = [
  'Visite technique',
  'Assurance',
  'Patente',
  'Permis de conduire',
  'Carte de transporteur',
  'Maintenance Mécanique',
  'Autre',
];
const TRIGGERS: MaintenanceTrigger[] = ['Kilométrage', 'Durée', 'Date', 'Heures Moteur'];
const UNITS: Record<MaintenanceTrigger, { value: string; label: string }[]> = {
  Kilométrage: [{ value: 'km', label: 'km' }],
  Durée: [
    { value: 'mois', label: 'Mois' },
    { value: 'jours', label: 'Jours' },
    { value: 'ans', label: 'Ans' },
  ],
  Date: [],
  'Heures Moteur': [{ value: 'h', label: 'Heures' }],
};

const CAT_COLOR: Record<string, string> = {
  'Visite technique': '#3B82F6',
  Assurance: '#8B5CF6',
  Patente: '#F59E0B',
  'Permis de conduire': '#22C55E',
  'Carte de transporteur': '#06B6D4',
  'Maintenance Mécanique': '#EF4444',
  Autre: '#6B7280',
};

interface FormState {
  nom: string;
  category: MaintenanceCategory;
  type: MaintenanceTrigger;
  intervalle: string;
  unit: string;
  reminderValue: string;
  reminderUnit: string;
  isRecurring: boolean;
  notifyEmail: boolean;
  notifySms: boolean;
  notifyPush: boolean;
  description: string;
  statut: 'Actif' | 'Inactif';
  vehicleIds: string[];
}

const EMPTY: FormState = {
  nom: '',
  category: 'Visite technique',
  type: 'Kilométrage',
  intervalle: '',
  unit: 'km',
  reminderValue: '',
  reminderUnit: 'km',
  isRecurring: false,
  notifyEmail: false,
  notifySms: false,
  notifyPush: false,
  description: '',
  statut: 'Actif',
  vehicleIds: [],
};

// ── Sélecteur inline ──────────────────────────────────────────────────────────

function Picker<T extends string>({
  label,
  value,
  options,
  onChange,
  theme,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  theme: ThemeType;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value)?.label ?? value;
  return (
    <View style={{ gap: 4 }}>
      <Text
        style={{
          fontSize: 11,
          fontWeight: '700',
          color: theme.text.secondary,
          textTransform: 'uppercase',
          letterSpacing: 0.8,
        }}
      >
        {label}
      </Text>
      <TouchableOpacity
        onPress={() => setOpen(!open)}
        style={{
          backgroundColor: theme.bg.surface,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: open ? theme.primary : theme.border,
          paddingHorizontal: 14,
          height: 46,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Text style={{ fontSize: 14, color: theme.text.primary }}>{selected}</Text>
        <ChevronDown size={14} color={theme.text.muted} />
      </TouchableOpacity>
      {open && (
        <View
          style={{
            backgroundColor: theme.bg.surface,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: theme.border,
            overflow: 'hidden',
            marginTop: 2,
          }}
        >
          {options.map((o) => (
            <TouchableOpacity
              key={o.value}
              onPress={() => {
                onChange(o.value);
                setOpen(false);
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 14,
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: theme.border,
              }}
            >
              <Text style={{ fontSize: 14, color: o.value === value ? theme.primary : theme.text.primary }}>
                {o.label}
              </Text>
              {o.value === value && <Check size={14} color={theme.primary} />}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// ── Formulaire ────────────────────────────────────────────────────────────────

function MaintenanceFormModal({
  visible,
  rule,
  onClose,
  theme,
}: {
  visible: boolean;
  rule: MaintenanceRule | null;
  onClose: () => void;
  theme: ThemeType;
}) {
  const qc = useQueryClient();
  const isEdit = !!rule;
  const [form, setForm] = useState<FormState>(EMPTY);

  React.useEffect(() => {
    if (visible) {
      setForm(
        rule
          ? {
              nom: rule.nom,
              category: rule.category,
              type: rule.type,
              intervalle: String(rule.intervalle ?? ''),
              unit: rule.unit ?? 'km',
              reminderValue: String(rule.reminderValue ?? ''),
              reminderUnit: rule.reminderUnit ?? 'km',
              isRecurring: rule.isRecurring,
              notifyEmail: rule.notifyEmail,
              notifySms: rule.notifySms,
              notifyPush: rule.notifyPush,
              description: rule.description ?? '',
              statut: rule.statut,
              vehicleIds: rule.vehicleIds ?? [],
            }
          : EMPTY
      );
    }
  }, [visible, rule]);

  const sf = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((p) => ({ ...p, [k]: v }));

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles-all'],
    queryFn: () => vehiclesApi.getAll(),
    staleTime: 60_000,
  });

  const createMut = useMutation({
    mutationFn: (d: FormState) =>
      maintenanceApi.create({
        nom: d.nom,
        category: d.category,
        type: d.type,
        intervalle: d.intervalle,
        unit: d.unit as MaintenanceUnit,
        reminderValue: d.reminderValue,
        reminderUnit: d.reminderUnit,
        isRecurring: d.isRecurring,
        notifyEmail: d.notifyEmail,
        notifySms: d.notifySms,
        notifyPush: d.notifyPush,
        description: d.description,
        statut: d.statut,
        vehicleIds: d.vehicleIds,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['maintenance-rules'] });
      onClose();
    },
    onError: (e: Error) => Alert.alert('Erreur', e?.message ?? 'Impossible de créer la règle.'),
  });

  const updateMut = useMutation({
    mutationFn: (d: FormState) =>
      maintenanceApi.update(rule!.id, {
        nom: d.nom,
        category: d.category,
        type: d.type,
        intervalle: d.intervalle,
        unit: d.unit as MaintenanceUnit,
        reminderValue: d.reminderValue,
        reminderUnit: d.reminderUnit,
        isRecurring: d.isRecurring,
        notifyEmail: d.notifyEmail,
        notifySms: d.notifySms,
        notifyPush: d.notifyPush,
        description: d.description,
        statut: d.statut,
        vehicleIds: d.vehicleIds,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['maintenance-rules'] });
      onClose();
    },
    onError: (e: Error) => Alert.alert('Erreur', e?.message ?? 'Impossible de modifier la règle.'),
  });

  const isPending = createMut.isPending || updateMut.isPending;
  const handleSave = () => {
    if (!form.nom.trim()) {
      Alert.alert('Champ requis', 'Le nom est obligatoire.');
      return;
    }
    isEdit ? updateMut.mutate(form) : createMut.mutate(form);
  };

  const inp = {
    backgroundColor: theme.bg.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 14,
    height: 46,
    color: theme.text.primary,
    fontSize: 14,
  };
  const lbl = {
    fontSize: 11,
    fontWeight: '700' as const,
    color: theme.text.secondary,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
    marginBottom: 4,
  };
  const unitOptions = UNITS[form.type].map((u) => ({ value: u.value as MaintenanceUnit, label: u.label }));

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg.primary }} edges={['top']}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 16,
              paddingTop: 12,
              paddingBottom: 16,
              backgroundColor: theme.bg.surface,
              borderBottomWidth: 1,
              borderBottomColor: theme.border,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: '700', color: theme.text.primary }}>
              {isEdit ? 'Modifier la règle' : 'Nouvelle règle'}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <X size={22} color={theme.text.muted} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} keyboardShouldPersistTaps="handled">
            {/* Nom */}
            <View>
              <Text style={lbl}>NOM DE LA RÈGLE</Text>
              <TextInput
                style={inp}
                value={form.nom}
                onChangeText={(v) => sf('nom', v)}
                placeholder="Ex: Vidange tous les 10 000 km"
                placeholderTextColor={theme.text.muted}
              />
            </View>

            {/* Catégorie */}
            <Picker
              label="CATÉGORIE"
              value={form.category}
              options={CATEGORIES.map((c) => ({ value: c, label: c }))}
              onChange={(v) => sf('category', v)}
              theme={theme}
            />

            {/* Type */}
            <Picker
              label="TYPE DE DÉCLENCHEUR"
              value={form.type}
              options={TRIGGERS.map((t) => ({ value: t, label: t }))}
              onChange={(v) => {
                sf('type', v);
                sf('unit', UNITS[v][0]?.value ?? '');
              }}
              theme={theme}
            />

            {/* Intervalle */}
            {form.type !== 'Date' ? (
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={lbl}>INTERVALLE</Text>
                  <TextInput
                    style={inp}
                    value={form.intervalle}
                    onChangeText={(v) => sf('intervalle', v)}
                    placeholder="Ex: 10000"
                    placeholderTextColor={theme.text.muted}
                    keyboardType="numeric"
                  />
                </View>
                {unitOptions.length > 0 && (
                  <View style={{ width: 110 }}>
                    <Picker
                      label="UNITÉ"
                      value={form.unit as MaintenanceUnit}
                      options={unitOptions}
                      onChange={(v) => sf('unit', v)}
                      theme={theme}
                    />
                  </View>
                )}
              </View>
            ) : (
              <View>
                <Text style={lbl}>DATE FIXE</Text>
                <TextInput
                  style={inp}
                  value={form.intervalle}
                  onChangeText={(v) => sf('intervalle', v)}
                  placeholder="AAAA-MM-JJ"
                  placeholderTextColor={theme.text.muted}
                />
              </View>
            )}

            {/* Rappel */}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={lbl}>RAPPEL AVANT</Text>
                <TextInput
                  style={inp}
                  value={form.reminderValue}
                  onChangeText={(v) => sf('reminderValue', v)}
                  placeholder="Ex: 500"
                  placeholderTextColor={theme.text.muted}
                  keyboardType="numeric"
                />
              </View>
              <View style={{ width: 110 }}>
                <Picker
                  label="UNITÉ"
                  value={form.reminderUnit as MaintenanceUnit}
                  options={[
                    { value: 'km', label: 'km' },
                    { value: 'jours', label: 'Jours' },
                    { value: 'h', label: 'Heures' },
                  ]}
                  onChange={(v) => sf('reminderUnit', v)}
                  theme={theme}
                />
              </View>
            </View>

            {/* Récurrente */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: theme.bg.surface,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: theme.border,
                paddingHorizontal: 14,
                paddingVertical: 12,
              }}
            >
              <Text style={{ fontSize: 14, color: theme.text.primary }}>Règle récurrente (périodique)</Text>
              <Switch
                value={form.isRecurring}
                onValueChange={(v) => sf('isRecurring', v)}
                trackColor={{ false: theme.border, true: theme.primary }}
                thumbColor="#fff"
              />
            </View>

            {/* Notifications */}
            <View style={{ gap: 8 }}>
              <Text style={lbl}>NOTIFICATIONS</Text>
              {[
                { key: 'notifyEmail', label: 'Email' },
                { key: 'notifySms', label: 'SMS' },
                { key: 'notifyPush', label: 'Application (Push)' },
              ].map(({ key, label }) => (
                <View
                  key={key}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: theme.bg.surface,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: theme.border,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                  }}
                >
                  <Text style={{ fontSize: 14, color: theme.text.primary }}>{label}</Text>
                  <Switch
                    value={form[key as keyof FormState] as boolean}
                    onValueChange={(v) => sf(key as keyof FormState, v as any)}
                    trackColor={{ false: theme.border, true: theme.primary }}
                    thumbColor="#fff"
                  />
                </View>
              ))}
            </View>

            {/* Véhicules */}
            <View style={{ gap: 8 }}>
              <Text style={lbl}>
                VÉHICULES CONCERNÉS ({form.vehicleIds.length === 0 ? 'Tous' : form.vehicleIds.length})
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {vehicles.slice(0, 20).map((v) => {
                  const sel = form.vehicleIds.includes(v.id);
                  return (
                    <TouchableOpacity
                      key={v.id}
                      onPress={() =>
                        sf('vehicleIds', sel ? form.vehicleIds.filter((id) => id !== v.id) : [...form.vehicleIds, v.id])
                      }
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: sel ? theme.primary : theme.border,
                        backgroundColor: sel ? theme.primary + '18' : 'transparent',
                      }}
                    >
                      <Text style={{ fontSize: 12, color: sel ? theme.primary : theme.text.secondary }}>{v.plate}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Description */}
            <View>
              <Text style={lbl}>DESCRIPTION / NOTES</Text>
              <TextInput
                style={[inp, { height: 80, textAlignVertical: 'top', paddingTop: 12 }]}
                value={form.description}
                onChangeText={(v) => sf('description', v)}
                multiline
                placeholder="Détails sur l'entretien à effectuer..."
                placeholderTextColor={theme.text.muted}
              />
            </View>

            {/* Statut */}
            <Picker
              label="STATUT"
              value={form.statut}
              options={[
                { value: 'Actif', label: 'Actif' },
                { value: 'Inactif', label: 'Inactif' },
              ]}
              onChange={(v) => sf('statut', v)}
              theme={theme}
            />

            <Button onPress={handleSave} loading={isPending} size="lg" fullWidth style={{ marginTop: 8 }}>
              Enregistrer
            </Button>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Carte règle ───────────────────────────────────────────────────────────────

function RuleCard({
  rule,
  theme,
  onEdit,
  onDelete,
}: {
  rule: MaintenanceRule;
  theme: ThemeType;
  onEdit: () => void;
  onDelete?: () => void;
}) {
  const color = CAT_COLOR[rule.category] ?? '#6B7280';
  const isActive = rule.statut === 'Actif';
  return (
    <View
      style={{
        backgroundColor: theme.bg.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: theme.border,
        padding: 14,
        marginBottom: 8,
        borderLeftWidth: 3,
        borderLeftColor: color,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: theme.text.primary }}>{rule.nom}</Text>
          <Text style={{ fontSize: 12, color: theme.text.muted, marginTop: 2 }}>{rule.category}</Text>
        </View>
        <View
          style={{
            backgroundColor: isActive ? '#22C55E18' : '#6B728018',
            borderRadius: 6,
            paddingHorizontal: 8,
            paddingVertical: 3,
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: '700', color: isActive ? '#22C55E' : '#6B7280' }}>
            {rule.statut}
          </Text>
        </View>
        <TouchableOpacity onPress={onEdit} style={{ padding: 6 }}>
          <Edit2 size={16} color={theme.primary} />
        </TouchableOpacity>
        {onDelete && (
          <TouchableOpacity onPress={onDelete} style={{ padding: 6 }}>
            <Trash2 size={16} color="#EF4444" />
          </TouchableOpacity>
        )}
      </View>
      <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
        <Text style={{ fontSize: 12, color: theme.text.secondary }}>
          {rule.type}
          {rule.intervalle ? ` · ${rule.intervalle} ${rule.unit ?? ''}` : ''}
        </Text>
        {rule.isRecurring && <Text style={{ fontSize: 12, color: theme.primary }}>Récurrente</Text>}
        {(rule.vehicleIds?.length ?? 0) > 0 && (
          <Text style={{ fontSize: 12, color: theme.text.muted }}>
            {rule.vehicleIds!.length} engin{rule.vehicleIds!.length > 1 ? 's' : ''}
          </Text>
        )}
      </View>
    </View>
  );
}

// ── Écran principal ───────────────────────────────────────────────────────────

export default function MaintenanceScreen() {
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const isClient = (user?.role ?? '').toUpperCase() === ROLE.CLIENT;
  const nav = useNavigation();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editRule, setEditRule] = useState<MaintenanceRule | null>(null);
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ['maintenance-rules'],
    queryFn: () => maintenanceApi.getAll(),
    staleTime: 60_000,
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => maintenanceApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['maintenance-rules'] }),
    onError: (e: Error) => Alert.alert('Erreur', e?.message ?? 'Suppression impossible.'),
  });

  const handleDelete = (rule: MaintenanceRule) => {
    Alert.alert('Supprimer', `Supprimer "${rule.nom}" ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => deleteMut.mutate(rule.id) },
    ]);
  };

  // ── Filtres ────────────────────────────────────────────────────────────────
  const uniqueCategories = useMemo(
    () =>
      [...new Set(data.map((r) => r.category).filter(Boolean) as string[])].sort().map((c) => ({ id: c, label: c })),
    [data]
  );
  const uniqueStatuses = useMemo(
    () => [...new Set(data.map((r) => r.statut).filter(Boolean) as string[])].sort().map((s) => ({ id: s, label: s })),
    [data]
  );
  const uniqueTypes = useMemo(
    () => [...new Set(data.map((r) => r.type).filter(Boolean) as string[])].sort().map((t) => ({ id: t, label: t })),
    [data]
  );

  const filterBlocks: FilterBlockDef[] = [
    {
      key: 'category',
      label: 'Catégorie',
      items: uniqueCategories,
      selected: categoryFilter,
      onSelect: setCategoryFilter,
    },
    { key: 'status', label: 'Statut', items: uniqueStatuses, selected: statusFilter, onSelect: setStatusFilter },
    { key: 'type', label: 'Type', items: uniqueTypes, selected: typeFilter, onSelect: setTypeFilter },
  ];

  const hasActiveFilters = !!(categoryFilter || statusFilter || typeFilter);

  const handleReset = () => {
    setCategoryFilter(null);
    setStatusFilter(null);
    setTypeFilter(null);
  };

  const filtered = useMemo(() => {
    let list = data;
    if (categoryFilter) list = list.filter((r) => r.category === categoryFilter);
    if (statusFilter) list = list.filter((r) => r.statut === statusFilter);
    if (typeFilter) list = list.filter((r) => r.type === typeFilter);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) =>
          r.nom?.toLowerCase().includes(q) ||
          r.category?.toLowerCase().includes(q) ||
          r.description?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [data, categoryFilter, statusFilter, typeFilter, search]);

  const activeCount = data.filter((r) => r.statut === 'Actif').length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg.primary }} edges={['top', 'bottom']}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingHorizontal: 16,
          paddingVertical: 14,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
          backgroundColor: theme.bg.surface,
        }}
      >
        <TouchableOpacity
          onPress={() => nav.goBack()}
          style={{ padding: 4 }}
          accessibilityLabel="Retour"
          accessibilityRole="button"
        >
          <ArrowLeft size={22} color={theme.text.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: theme.text.primary }}>Maintenance</Text>
          <Text style={{ fontSize: 12, color: theme.text.muted }}>
            {data.length} règle{data.length !== 1 ? 's' : ''} · {activeCount} active{activeCount !== 1 ? 's' : ''}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => {
            setEditRule(null);
            setShowForm(true);
          }}
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            backgroundColor: theme.primary,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Plus size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Recherche + bouton filtre */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 10, gap: 8 }}>
        <View style={{ flex: 1 }}>
          <SearchBar value={search} onChangeText={setSearch} placeholder="Rechercher règle, catégorie…" />
        </View>
        <TouchableOpacity
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: showFilters || hasActiveFilters ? theme.primary : theme.border,
            backgroundColor: showFilters || hasActiveFilters ? theme.primary : theme.bg.surface,
            justifyContent: 'center',
            alignItems: 'center',
          }}
          onPress={() => setShowFilters((v) => !v)}
          accessibilityLabel="Filtres avancés"
          accessibilityRole="button"
        >
          <SlidersHorizontal size={16} color={showFilters || hasActiveFilters ? '#fff' : theme.text.secondary} />
          {hasActiveFilters && (
            <View
              style={{
                position: 'absolute',
                top: 6,
                right: 6,
                width: 7,
                height: 7,
                borderRadius: 4,
                backgroundColor: '#EF4444',
                borderWidth: 1.5,
                borderColor: theme.bg.surface,
              }}
            />
          )}
        </TouchableOpacity>
      </View>

      {/* VehicleFilterPanel */}
      <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: showFilters ? 4 : 0 }}>
        <VehicleFilterPanel
          visible={showFilters}
          blocks={filterBlocks}
          hasActiveFilters={hasActiveFilters}
          onReset={handleReset}
        />
      </View>

      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={theme.primary} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
          <Wrench size={48} color={theme.text.muted} strokeWidth={1} />
          <Text style={{ fontSize: 15, color: theme.text.secondary, marginTop: 12, textAlign: 'center' }}>
            {data.length === 0 ? 'Aucune règle de maintenance' : 'Aucun résultat'}
          </Text>
          <Text style={{ fontSize: 12, color: theme.text.muted, marginTop: 6, textAlign: 'center' }}>
            {data.length === 0
              ? 'Appuyez sur + pour créer la première règle.'
              : 'Ajustez vos filtres pour élargir la recherche.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{ padding: 12 }}
          renderItem={({ item }) => (
            <RuleCard
              rule={item}
              theme={theme}
              onEdit={() => {
                setEditRule(item);
                setShowForm(true);
              }}
              onDelete={isClient ? undefined : () => handleDelete(item)}
            />
          )}
        />
      )}

      <MaintenanceFormModal visible={showForm} rule={editRule} onClose={() => setShowForm(false)} theme={theme} />
    </SafeAreaView>
  );
}
