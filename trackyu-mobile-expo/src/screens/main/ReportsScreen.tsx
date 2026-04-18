/**
 * TrackYu Mobile — Reports Screen
 *
 * Flow : Module → Sous-rapport → Filtres → Résultats
 *
 * Fonctionnalités :
 *  - CLIENT : client/branche pré-remplis, lecture seule
 *  - STAFF  : dropdown clients + branche + revendeur
 *  - Filtres mémorisés lors du changement de sous-rapport (même module)
 *  - Pagination des résultats (50 lignes / page)
 *  - Seuil 500 lignes → bannière "privilégiez l'export"
 *  - Largeurs de colonnes adaptatives dans DataTable
 *  - Résumé de période affiché avec les résultats
 *  - Nom de fichier export incluant la période
 *  - ProgrammerModal connecté à l'API réelle
 */
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  FlatList,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import {
  ChevronRight,
  X,
  Check,
  Download,
  FileText,
  Search,
  Filter,
  SlidersHorizontal,
  Calendar,
  Clock,
  Send,
  AlertTriangle,
  ChevronLeft,
  Columns,
  BarChart2,
} from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../../theme';
import { useVehicleStore } from '../../store/vehicleStore';
import { useAuthStore } from '../../store/authStore';
import { usersApi } from '../../api/users';
import reportsApi from '../../api/reportsApi';
import techSettingsApi from '../../api/techSettingsApi';
import type { ScheduleFrequency, ScheduleFormat } from '../../api/reportsApi';

import REPORT_MODULES from './reports/config';
import {
  ReportModule,
  SubReport,
  ReportFilters,
  FilterKey,
  DEFAULT_FILTERS,
  ReportResult,
  ReportKPI,
  ReportGroup,
  formatPeriodLabel,
  getPeriodRange,
} from './reports/types';
import { ALERT_TYPE_LIST } from './reports/generators/alerts';
import { generateReport } from './reports/generators/index';
import { shareCSV, exportPDF, exportChart } from './reports/export';
import { FuelAnalysisModal } from './reports/FuelAnalysisModal';
import { ChartSection } from './reports/charts';
import type { Vehicle } from '../../api/vehicles';
import { ADMIN_SCREEN_ROLES } from '../../constants/roles';
import { VEHICLE_STATUS_COLORS, VEHICLE_STATUS_LABELS } from '../../utils/vehicleStatus';
import { VehicleFilterPanel, type FilterBlockDef } from '../../components/VehicleFilterPanel';

type ThemeType = ReturnType<typeof import('../../theme').useTheme>['theme'];

const IS_CLIENT = (role: string) => role === 'CLIENT';
const IS_TECH = (role: string) => role === 'TECH';
const IS_STAFF = (role: string) => !IS_CLIENT(role);

// ── Periods ────────────────────────────────────────────────────────────────────

const PERIODS: { key: ReportFilters['period']; label: string }[] = [
  { key: '0', label: 'Auj.' },
  { key: '7', label: '7 j' },
  { key: '30', label: '30 j' },
  { key: '90', label: '3 mois' },
  { key: 'custom', label: 'Perso.' },
];

// ── Style helpers ──────────────────────────────────────────────────────────────

const lbl = (theme: ThemeType) => ({
  fontSize: 11 as const,
  fontWeight: '700' as const,
  color: theme.text.secondary,
  textTransform: 'uppercase' as const,
  letterSpacing: 0.8,
});
const inp = (theme: ThemeType) => ({
  backgroundColor: theme.bg.surface,
  borderRadius: 10,
  borderWidth: 1,
  borderColor: theme.border,
  paddingHorizontal: 14,
  height: 46,
  color: theme.text.primary,
  fontSize: 14,
});
const chk = () => ({
  width: 22,
  height: 22,
  borderRadius: 6,
  borderWidth: 2,
  justifyContent: 'center' as const,
  alignItems: 'center' as const,
  marginRight: 12,
});

// ── DateField — bouton qui ouvre le DateTimePicker natif ──────────────────────

function DateField({
  label,
  value,
  onChange,
  theme,
  accentColor,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  theme: ThemeType;
  accentColor: string;
}) {
  const [show, setShow] = useState(false);
  const date = value ? new Date(value) : new Date();

  const handleChange = (_: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setShow(false);
    if (selected) {
      const iso = selected.toISOString().slice(0, 10);
      onChange(iso);
    }
  };

  const displayVal = value
    ? new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'Sélectionner';

  return (
    <View style={{ flex: 1, gap: 4 }}>
      <Text style={[lbl(theme), { fontSize: 10 }]}>{label}</Text>
      <TouchableOpacity
        onPress={() => setShow(true)}
        style={[inp(theme), { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
        activeOpacity={0.8}
      >
        <Text style={{ fontSize: 13, color: value ? theme.text.primary : theme.text.muted }}>{displayVal}</Text>
        <Calendar size={15} color={accentColor} />
      </TouchableOpacity>
      {show && (
        <DateTimePicker
          value={date}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          maximumDate={new Date()}
          onChange={handleChange}
          onTouchCancel={() => setShow(false)}
        />
      )}
    </View>
  );
}

// ── ClientDropdown — sélecteur client pour STAFF ───────────────────────────────

function ClientDropdown({
  value,
  onChange,
  theme,
  accentColor,
}: {
  value: string;
  onChange: (v: string) => void;
  theme: ThemeType;
  accentColor: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const { data: users = [] } = useQuery({
    queryKey: ['users-for-reports'],
    queryFn: () => usersApi.getAll(),
    staleTime: 5 * 60_000,
  });

  const clients = useMemo(
    () => users.filter((u) => u.role === 'CLIENT' && u.status === 'Actif').sort((a, b) => a.name.localeCompare(b.name)),
    [users]
  );

  const filtered = search ? clients.filter((c) => c.name.toLowerCase().includes(search.toLowerCase())) : clients;

  return (
    <>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        style={[inp(theme), { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
        activeOpacity={0.8}
      >
        <Text style={{ fontSize: 14, color: value ? theme.text.primary : theme.text.muted, flex: 1 }} numberOfLines={1}>
          {value || 'Tous les clients'}
        </Text>
        {value ? (
          <TouchableOpacity onPress={() => onChange('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <X size={14} color={theme.text.muted} />
          </TouchableOpacity>
        ) : (
          <ChevronRight size={15} color={theme.text.muted} />
        )}
      </TouchableOpacity>

      <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setOpen(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg.primary }} edges={['top']}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 16,
              paddingTop: 12,
              paddingBottom: 12,
              backgroundColor: theme.bg.surface,
              borderBottomWidth: 1,
              borderBottomColor: theme.border,
            }}
          >
            <Text style={{ fontSize: 17, fontWeight: '700', color: theme.text.primary }}>Sélectionner un client</Text>
            <TouchableOpacity onPress={() => setOpen(false)}>
              <X size={22} color={theme.text.muted} />
            </TouchableOpacity>
          </View>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              margin: 12,
              backgroundColor: theme.bg.surface,
              borderRadius: 10,
              paddingHorizontal: 12,
              borderWidth: 1,
              borderColor: theme.border,
              height: 44,
            }}
          >
            <Search size={16} color={theme.text.muted} />
            <TextInput
              style={{ flex: 1, marginLeft: 8, fontSize: 14, color: theme.text.primary }}
              value={search}
              onChangeText={setSearch}
              placeholder="Rechercher..."
              placeholderTextColor={theme.text.muted}
            />
          </View>
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 16,
              paddingVertical: 14,
              borderBottomWidth: 1,
              borderBottomColor: theme.border,
            }}
            onPress={() => {
              onChange('');
              setOpen(false);
            }}
          >
            <Text style={{ fontSize: 14, color: theme.text.primary, fontStyle: 'italic', flex: 1 }}>
              Tous les clients
            </Text>
            {!value && <Check size={16} color={accentColor} />}
          </TouchableOpacity>
          <FlatList
            data={filtered}
            keyExtractor={(u) => u.id}
            renderItem={({ item: u }) => (
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: theme.border,
                }}
                onPress={() => {
                  onChange(u.name);
                  setOpen(false);
                  setSearch('');
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text.primary }}>{u.name}</Text>
                  <Text style={{ fontSize: 12, color: theme.text.muted }}>{u.email}</Text>
                </View>
                {value === u.name && <Check size={16} color={accentColor} />}
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
      </Modal>
    </>
  );
}

// ── VehiclePicker ──────────────────────────────────────────────────────────────

function VehiclePickerModal({
  visible,
  onClose,
  selected,
  onConfirm,
  theme,
}: {
  visible: boolean;
  onClose: () => void;
  selected: string[];
  onConfirm: (ids: string[]) => void;
  theme: ThemeType;
}) {
  const { getVehicleList } = useVehicleStore();
  const all = getVehicleList();
  const [search, setSearch] = useState('');
  const [local, setLocal] = useState<string[]>(selected);
  const [showFilters, setShowFilters] = useState(false);
  const [resellerFilter, setResellerFilter] = useState<string | null>(null);
  const [clientFilter, setClientFilter] = useState<string | null>(null);

  const uniqueResellers = useMemo(() => {
    const m = new Set<string>();
    all.forEach((v) => {
      const n = v.resellerName?.trim();
      if (n) m.add(n);
    });
    return Array.from(m)
      .sort()
      .map((n) => ({ id: n, label: n }));
  }, [all]);

  const uniqueClients = useMemo(() => {
    const m = new Set<string>();
    all.forEach((v) => {
      if (resellerFilter && v.resellerName !== resellerFilter) return;
      const n = v.clientName?.trim();
      if (n) m.add(n);
    });
    return Array.from(m)
      .sort()
      .map((n) => ({ id: n, label: n }));
  }, [all, resellerFilter]);

  const filterBlocks: FilterBlockDef[] = useMemo(
    () => [
      {
        key: 'reseller',
        label: 'Revendeur',
        items: uniqueResellers,
        selected: resellerFilter,
        onSelect: (id) => {
          setResellerFilter(id);
          setClientFilter(null);
        },
      },
      {
        key: 'client',
        label: 'Client',
        items: uniqueClients,
        selected: clientFilter,
        onSelect: setClientFilter,
      },
    ],
    [uniqueResellers, uniqueClients, resellerFilter, clientFilter]
  );

  const hasActiveFilters = !!(resellerFilter || clientFilter);
  const resetFilters = () => {
    setResellerFilter(null);
    setClientFilter(null);
  };

  const shown = all.filter((v) => {
    if (resellerFilter && v.resellerName !== resellerFilter) return false;
    if (clientFilter && v.clientName !== clientFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return v.name.toLowerCase().includes(q) || v.plate.toLowerCase().includes(q);
  });

  const toggle = (id: string) => setLocal((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg.primary }} edges={['top']}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: 12,
            backgroundColor: theme.bg.surface,
            borderBottomWidth: 1,
            borderBottomColor: theme.border,
          }}
        >
          <Text style={{ fontSize: 17, fontWeight: '700', color: theme.text.primary }}>Sélectionner les engins</Text>
          <TouchableOpacity onPress={onClose}>
            <X size={22} color={theme.text.muted} />
          </TouchableOpacity>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, margin: 12 }}>
          <View
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: theme.bg.surface,
              borderRadius: 10,
              paddingHorizontal: 12,
              borderWidth: 1,
              borderColor: theme.border,
              height: 44,
            }}
          >
            <Search size={16} color={theme.text.muted} />
            <TextInput
              style={{ flex: 1, marginLeft: 8, fontSize: 14, color: theme.text.primary }}
              value={search}
              onChangeText={setSearch}
              placeholder="Rechercher..."
              placeholderTextColor={theme.text.muted}
            />
          </View>
          <TouchableOpacity
            onPress={() => setShowFilters((p) => !p)}
            accessibilityRole="button"
            accessibilityLabel="Filtres"
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
            <SlidersHorizontal size={18} color={showFilters ? '#fff' : theme.text.primary} />
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

        <TouchableOpacity
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: theme.border,
          }}
          onPress={() => setLocal(local.length === 0 ? shown.map((v) => v.id) : [])}
        >
          <View
            style={[
              chk(),
              { backgroundColor: local.length === 0 ? theme.primary : 'transparent', borderColor: theme.primary },
            ]}
          >
            {local.length === 0 && <Check size={13} color="#fff" />}
          </View>
          <Text style={{ fontSize: 14, color: theme.text.primary, fontStyle: 'italic' }}>
            {hasActiveFilters ? `Tous les engins filtrés (${shown.length})` : 'Tous les engins'}
          </Text>
        </TouchableOpacity>
        <FlatList
          data={shown}
          keyExtractor={(v) => v.id}
          renderItem={({ item: v }) => (
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: theme.border,
              }}
              onPress={() => toggle(v.id)}
            >
              <View
                style={[
                  chk(),
                  { backgroundColor: local.includes(v.id) ? theme.primary : 'transparent', borderColor: theme.primary },
                ]}
              >
                {local.includes(v.id) && <Check size={13} color="#fff" />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, color: theme.text.primary, fontWeight: '600' }}>{v.name}</Text>
                <Text style={{ fontSize: 12, color: theme.text.muted }}>{v.plate}</Text>
              </View>
              <Text style={{ fontSize: 12, color: VEHICLE_STATUS_COLORS[v.status] ?? theme.text.muted }}>
                {VEHICLE_STATUS_LABELS[v.status] ?? v.status}
              </Text>
            </TouchableOpacity>
          )}
        />
        <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: theme.border }}>
          <TouchableOpacity
            style={{
              backgroundColor: theme.primary,
              borderRadius: 12,
              height: 50,
              justifyContent: 'center',
              alignItems: 'center',
            }}
            onPress={() => {
              onConfirm(local);
              onClose();
            }}
            activeOpacity={0.8}
          >
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>
              Confirmer {local.length > 0 ? `(${local.length})` : '(Tous)'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

// ── KPI Bar ────────────────────────────────────────────────────────────────────

function KPIBar({ kpis, theme }: { kpis: ReportKPI[]; theme: ThemeType }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
      {kpis.map((k, i) => (
        <View
          key={i}
          style={{
            backgroundColor: theme.bg.surface,
            borderRadius: 12,
            padding: 14,
            minWidth: 100,
            borderWidth: 1,
            borderColor: theme.border,
          }}
        >
          <Text style={{ fontSize: 22, fontWeight: '800', color: k.color }}>{k.value}</Text>
          <Text style={{ fontSize: 11, color: theme.text.muted, marginTop: 3 }}>{k.label}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

// ── Data Table ─────────────────────────────────────────────────────────────────

/**
 * Détermine la largeur optimale d'une colonne d'après son libellé :
 *  - 180px : colonnes textuelles longues (adresse, description, message…)
 *  - 85px  : colonnes courtes (date, heure, n°, km, score…)
 *  - 110px : largeur standard pour tout le reste
 */
function colWidth(col: string): number {
  const c = col.toLowerCase();
  if (/adresse|localisation|description|observation|message|lieu|remarque|commentaire/.test(c)) return 180;
  if (/^(n°|#|date|heure|km\b|h\b|durée|score|état|statut|type)/.test(c) || c.length <= 4) return 85;
  return 110;
}

const ROWS_PER_PAGE = 50;
const EXPORT_SUGGEST_THRESHOLD = 500;

function DataTable({ columns, rows, theme }: { columns: string[]; rows: string[][]; theme: ThemeType }) {
  const [page, setPage] = useState(0);

  // Remet à zéro la page quand les données changent
  useEffect(() => {
    setPage(0);
  }, [rows]);

  if (!rows.length) {
    return (
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator style={{ marginTop: 4 }}>
          <View>
            <View style={{ flexDirection: 'row', backgroundColor: theme.bg.elevated }}>
              {columns.map((c, i) => (
                <View
                  key={i}
                  style={{ width: colWidth(c), padding: 8, borderRightWidth: 1, borderRightColor: theme.border }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: theme.text.secondary }} numberOfLines={2}>
                    {c}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
        <View style={{ padding: 20, alignItems: 'center' }}>
          <Text style={{ fontSize: 13, color: theme.text.muted, fontStyle: 'italic' }}>
            Aucune donnée pour ces filtres
          </Text>
        </View>
      </View>
    );
  }

  const totalPages = Math.ceil(rows.length / ROWS_PER_PAGE);
  const pageRows = rows.slice(page * ROWS_PER_PAGE, (page + 1) * ROWS_PER_PAGE);
  const firstRow = page * ROWS_PER_PAGE + 1;
  const lastRow = Math.min((page + 1) * ROWS_PER_PAGE, rows.length);

  return (
    <View>
      {/* Bannière volume important */}
      {rows.length >= EXPORT_SUGGEST_THRESHOLD && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            backgroundColor: '#FEF3C7',
            borderRadius: 10,
            padding: 10,
            marginBottom: 8,
            borderWidth: 1,
            borderColor: '#F59E0B',
          }}
        >
          <AlertTriangle size={15} color="#92400E" />
          <Text style={{ fontSize: 12, color: '#92400E', flex: 1, lineHeight: 17 }}>
            {rows.length} lignes — volume important, privilégiez l'export PDF ou CSV.
          </Text>
        </View>
      )}

      {/* Info pagination */}
      {rows.length > ROWS_PER_PAGE && (
        <Text style={{ fontSize: 11, color: theme.text.muted, marginBottom: 6, textAlign: 'right' }}>
          Lignes {firstRow}–{lastRow} sur {rows.length}
        </Text>
      )}

      {/* Table */}
      <ScrollView horizontal showsHorizontalScrollIndicator style={{ marginTop: 4 }}>
        <View>
          {/* En-tête */}
          <View style={{ flexDirection: 'row', backgroundColor: theme.bg.elevated }}>
            {columns.map((c, i) => (
              <View
                key={i}
                style={{ width: colWidth(c), padding: 8, borderRightWidth: 1, borderRightColor: theme.border }}
              >
                <Text style={{ fontSize: 11, fontWeight: '700', color: theme.text.secondary }} numberOfLines={2}>
                  {c}
                </Text>
              </View>
            ))}
          </View>
          {/* Lignes */}
          {pageRows.map((row, ri) => (
            <View
              key={ri}
              style={{ flexDirection: 'row', backgroundColor: ri % 2 === 0 ? theme.bg.surface : theme.bg.primary }}
            >
              {row.map((cell, ci) => {
                const isUrl = typeof cell === 'string' && cell.startsWith('https://');
                return (
                  <View
                    key={ci}
                    style={{
                      width: colWidth(columns[ci] ?? ''),
                      padding: 8,
                      borderRightWidth: 1,
                      borderRightColor: theme.border,
                      borderTopWidth: 1,
                      borderTopColor: theme.border,
                      justifyContent: 'center',
                    }}
                  >
                    {isUrl ? (
                      <TouchableOpacity onPress={() => Linking.openURL(cell)} activeOpacity={0.7}>
                        <Text
                          style={{
                            fontSize: 11,
                            color: theme.primary,
                            fontWeight: '600',
                            textDecorationLine: 'underline',
                          }}
                        >
                          📍 Voir
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <Text style={{ fontSize: 11, color: theme.text.primary }} numberOfLines={2}>
                        {cell ?? '—'}
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Contrôles pagination */}
      {totalPages > 1 && (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 10 }}>
          <TouchableOpacity
            disabled={page === 0}
            onPress={() => setPage((p) => p - 1)}
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: page === 0 ? theme.border : theme.primary,
              justifyContent: 'center',
              alignItems: 'center',
              opacity: page === 0 ? 0.4 : 1,
            }}
          >
            <ChevronLeft size={18} color={theme.primary} />
          </TouchableOpacity>
          <Text style={{ fontSize: 13, fontWeight: '600', color: theme.text.primary }}>
            {page + 1} / {totalPages}
          </Text>
          <TouchableOpacity
            disabled={page === totalPages - 1}
            onPress={() => setPage((p) => p + 1)}
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: page === totalPages - 1 ? theme.border : theme.primary,
              justifyContent: 'center',
              alignItems: 'center',
              opacity: page === totalPages - 1 ? 0.4 : 1,
            }}
          >
            <ChevronRight size={18} color={theme.primary} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ── Grouped Data Table (expandable rows avec vue détail) ──────────────────────

function GroupedDataTable({ columns, groups, theme }: { columns: string[]; groups: ReportGroup[]; theme: ThemeType }) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const toggle = (i: number) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  if (!groups.length) {
    return (
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator style={{ marginTop: 4 }}>
          <View>
            <View style={{ flexDirection: 'row', backgroundColor: theme.bg.elevated }}>
              {columns.map((c, i) => (
                <View
                  key={i}
                  style={{ width: colWidth(c), padding: 8, borderRightWidth: 1, borderRightColor: theme.border }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: theme.text.secondary }} numberOfLines={2}>
                    {c}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
        <View style={{ padding: 20, alignItems: 'center' }}>
          <Text style={{ fontSize: 13, color: theme.text.muted, fontStyle: 'italic' }}>
            Aucune donnée pour ces filtres
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator style={{ marginTop: 4 }}>
      <View>
        {/* En-tête */}
        <View style={{ flexDirection: 'row', backgroundColor: theme.bg.elevated }}>
          {columns.map((c, i) => (
            <View
              key={i}
              style={{ width: colWidth(c), padding: 8, borderRightWidth: 1, borderRightColor: theme.border }}
            >
              <Text style={{ fontSize: 11, fontWeight: '700', color: theme.text.secondary }} numberOfLines={2}>
                {c}
              </Text>
            </View>
          ))}
          <View style={{ width: 44, padding: 8, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: theme.text.secondary }}>Détail</Text>
          </View>
        </View>

        {/* Groupes */}
        {groups.map((g, gi) => (
          <View key={gi}>
            {/* Ligne résumé */}
            <View style={{ flexDirection: 'row', backgroundColor: gi % 2 === 0 ? theme.bg.surface : theme.bg.primary }}>
              {g.summary.map((cell, ci) => (
                <View
                  key={ci}
                  style={{
                    width: colWidth(columns[ci] ?? ''),
                    padding: 8,
                    borderRightWidth: 1,
                    borderRightColor: theme.border,
                    borderTopWidth: 1,
                    borderTopColor: theme.border,
                  }}
                >
                  <Text style={{ fontSize: 11, color: theme.text.primary }} numberOfLines={2}>
                    {cell ?? '—'}
                  </Text>
                </View>
              ))}
              <TouchableOpacity
                onPress={() => toggle(gi)}
                style={{
                  width: 44,
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderTopWidth: 1,
                  borderTopColor: theme.border,
                }}
                activeOpacity={0.7}
              >
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 6,
                    backgroundColor: theme.primary + '20',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ fontSize: 15, fontWeight: '800', color: theme.primary, lineHeight: 18 }}>
                    {expanded.has(gi) ? '−' : '+'}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Sous-table détail (expandée) */}
            {expanded.has(gi) && (
              <View>
                {/* En-tête sous-table */}
                <View style={{ flexDirection: 'row', backgroundColor: theme.primary + '18' }}>
                  {g.detailColumns.map((c, i) => (
                    <View
                      key={i}
                      style={{ width: colWidth(c), padding: 6, borderRightWidth: 1, borderRightColor: theme.border }}
                    >
                      <Text style={{ fontSize: 10, fontWeight: '700', color: theme.primary }} numberOfLines={1}>
                        {c}
                      </Text>
                    </View>
                  ))}
                </View>
                {/* Lignes détail */}
                {g.details.length > 0 ? (
                  g.details.map((dRow, dri) => (
                    <View
                      key={dri}
                      style={{
                        flexDirection: 'row',
                        backgroundColor: dri % 2 === 0 ? theme.bg.elevated : theme.bg.primary,
                      }}
                    >
                      {dRow.map((cell, ci) => (
                        <View
                          key={ci}
                          style={{
                            width: colWidth(g.detailColumns[ci] ?? ''),
                            padding: 6,
                            borderRightWidth: 1,
                            borderRightColor: theme.border,
                            borderTopWidth: 1,
                            borderTopColor: theme.border,
                          }}
                        >
                          <Text style={{ fontSize: 10, color: theme.text.secondary }} numberOfLines={3}>
                            {cell ?? '—'}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ))
                ) : (
                  <View style={{ padding: 10 }}>
                    <Text style={{ fontSize: 11, color: theme.text.muted, fontStyle: 'italic' }}>
                      Aucune alerte dans ce groupe
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

// ── Programmer Modal ───────────────────────────────────────────────────────────

const FREQ_MAP: Record<string, ScheduleFrequency> = {
  Quotidien: 'daily',
  Hebdomadaire: 'weekly',
  Mensuel: 'monthly',
};

function ProgrammerModal({
  visible,
  onClose,
  subReport,
  moduleId,
  theme,
  accentColor,
}: {
  visible: boolean;
  onClose: () => void;
  subReport: SubReport | null;
  moduleId: string;
  theme: ThemeType;
  accentColor: string;
}) {
  const FREQS = ['Quotidien', 'Hebdomadaire', 'Mensuel'] as const;
  const FMTS = ['PDF', 'CSV'] as const;

  const [freq, setFreq] = useState<(typeof FREQS)[number]>('Hebdomadaire');
  const [fmt, setFmt] = useState<(typeof FMTS)[number]>('PDF');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  // Remet le formulaire à zéro à chaque ouverture
  useEffect(() => {
    if (visible) {
      setFreq('Hebdomadaire');
      setFmt('PDF');
      setEmail('');
    }
  }, [visible]);

  if (!subReport) return null;

  const handleSave = async () => {
    const recipients = email
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (recipients.length === 0) {
      Alert.alert('Email requis', 'Saisissez au moins une adresse email destinataire.');
      return;
    }

    // Validation email basique
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalid = recipients.filter((r) => !emailRe.test(r));
    if (invalid.length > 0) {
      Alert.alert('Email invalide', `Les adresses suivantes semblent incorrectes :\n${invalid.join('\n')}`);
      return;
    }

    setLoading(true);
    try {
      await reportsApi.createSchedule({
        reportModule: moduleId,
        reportSubId: subReport.id,
        reportTitle: subReport.title,
        frequency: FREQ_MAP[freq],
        format: fmt as ScheduleFormat,
        recipients,
        active: true,
      });
      Alert.alert(
        'Programmation enregistrée',
        `Le rapport "${subReport.title}" sera envoyé ${freq.toLowerCase()} en ${fmt} à :\n${recipients.join(', ')}`,
        [{ text: 'OK', onPress: onClose }]
      );
    } catch {
      Alert.alert('Erreur', "La programmation n'a pas pu être enregistrée. Vérifiez votre connexion et réessayez.");
    } finally {
      setLoading(false);
    }
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
              paddingTop: 12,
              paddingBottom: 16,
              backgroundColor: theme.bg.surface,
              borderBottomWidth: 1,
              borderBottomColor: theme.border,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Clock size={20} color={accentColor} />
              <Text style={{ fontSize: 17, fontWeight: '700', color: theme.text.primary }}>Programmer l'envoi</Text>
            </View>
            <TouchableOpacity onPress={onClose} disabled={loading}>
              <X size={22} color={theme.text.muted} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, gap: 18 }}>
            {/* Rapport cible */}
            <View
              style={{
                backgroundColor: theme.bg.surface,
                borderRadius: 12,
                padding: 12,
                borderWidth: 1,
                borderColor: theme.border,
              }}
            >
              <Text style={{ fontSize: 12, color: theme.text.muted }}>Rapport</Text>
              <Text style={{ fontSize: 15, fontWeight: '700', color: theme.text.primary, marginTop: 2 }}>
                {subReport.title}
              </Text>
            </View>

            {/* Fréquence */}
            <View style={{ gap: 8 }}>
              <Text style={lbl(theme)}>FRÉQUENCE</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {FREQS.map((f) => (
                  <TouchableOpacity
                    key={f}
                    onPress={() => setFreq(f)}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      borderRadius: 10,
                      borderWidth: 1.5,
                      borderColor: freq === f ? accentColor : theme.border,
                      backgroundColor: freq === f ? accentColor + '18' : 'transparent',
                      alignItems: 'center',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '700',
                        color: freq === f ? accentColor : theme.text.secondary,
                      }}
                    >
                      {f}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Format */}
            <View style={{ gap: 8 }}>
              <Text style={lbl(theme)}>FORMAT</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {FMTS.map((f) => (
                  <TouchableOpacity
                    key={f}
                    onPress={() => setFmt(f)}
                    style={{
                      paddingHorizontal: 20,
                      paddingVertical: 10,
                      borderRadius: 10,
                      borderWidth: 1.5,
                      borderColor: fmt === f ? accentColor : theme.border,
                      backgroundColor: fmt === f ? accentColor + '18' : 'transparent',
                    }}
                  >
                    <Text
                      style={{ fontSize: 13, fontWeight: '700', color: fmt === f ? accentColor : theme.text.secondary }}
                    >
                      {f}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Destinataires */}
            <View style={{ gap: 8 }}>
              <Text style={lbl(theme)}>DESTINATAIRES (séparés par une virgule)</Text>
              <TextInput
                style={[inp(theme), { height: 80, textAlignVertical: 'top', paddingTop: 12 }]}
                multiline
                value={email}
                onChangeText={setEmail}
                placeholder="ex: contact@entreprise.com, dg@firm.ci"
                placeholderTextColor={theme.text.muted}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!loading}
              />
            </View>

            {/* Bouton enregistrer */}
            <TouchableOpacity
              style={{
                backgroundColor: loading ? theme.primary + '80' : accentColor,
                borderRadius: 12,
                height: 50,
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 10,
                marginTop: 8,
              }}
              onPress={handleSave}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Send size={16} color="#fff" />
                  <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>Enregistrer la programmation</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Alert Type Picker Modal ────────────────────────────────────────────────────

function AlertTypePickerModal({
  visible,
  onClose,
  selected,
  onConfirm,
  theme,
  accentColor,
}: {
  visible: boolean;
  onClose: () => void;
  selected: string[];
  onConfirm: (types: string[]) => void;
  theme: ThemeType;
  accentColor: string;
}) {
  const [local, setLocal] = useState<string[]>(selected);

  useEffect(() => {
    if (visible) setLocal(selected);
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (key: string) =>
    setLocal((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  const allSelected = local.length === ALERT_TYPE_LIST.length;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg.primary }} edges={['top']}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: 14,
            backgroundColor: theme.bg.surface,
            borderBottomWidth: 1,
            borderBottomColor: theme.border,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <AlertTriangle size={18} color={accentColor} />
            <Text style={{ fontSize: 17, fontWeight: '700', color: theme.text.primary }}>Types d'alertes</Text>
          </View>
          <TouchableOpacity onPress={onClose}>
            <X size={22} color={theme.text.muted} />
          </TouchableOpacity>
        </View>

        {/* Tout sélectionner / désélectionner */}
        <TouchableOpacity
          onPress={() => setLocal(allSelected ? [] : ALERT_TYPE_LIST.map((t) => t.key))}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: theme.border,
            gap: 12,
          }}
        >
          <View
            style={[
              chk(),
              {
                borderColor: allSelected ? accentColor : theme.border,
                backgroundColor: allSelected ? accentColor : 'transparent',
              },
            ]}
          >
            {allSelected && <Check size={13} color="#fff" />}
          </View>
          <Text style={{ fontSize: 14, color: theme.text.secondary, fontStyle: 'italic' }}>
            {allSelected ? 'Tout désélectionner' : 'Tous les types'}
          </Text>
          {local.length > 0 && !allSelected && (
            <Text style={{ fontSize: 12, color: accentColor, marginLeft: 'auto' }}>
              {local.length} sélectionné{local.length > 1 ? 's' : ''}
            </Text>
          )}
        </TouchableOpacity>

        <ScrollView>
          {ALERT_TYPE_LIST.map((t) => {
            const on = local.includes(t.key);
            return (
              <TouchableOpacity
                key={t.key}
                onPress={() => toggle(t.key)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 16,
                  paddingVertical: 13,
                  borderBottomWidth: 1,
                  borderBottomColor: theme.border,
                  gap: 12,
                }}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    chk(),
                    { borderColor: on ? t.color : theme.border, backgroundColor: on ? t.color : 'transparent' },
                  ]}
                >
                  {on && <Check size={13} color="#fff" />}
                </View>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: t.color }} />
                <Text style={{ fontSize: 14, color: on ? theme.text.primary : theme.text.muted, flex: 1 }}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
          <View style={{ height: 30 }} />
        </ScrollView>

        {/* Appliquer */}
        <View
          style={{ padding: 16, borderTopWidth: 1, borderTopColor: theme.border, backgroundColor: theme.bg.surface }}
        >
          <TouchableOpacity
            style={{
              backgroundColor: accentColor,
              borderRadius: 12,
              height: 50,
              justifyContent: 'center',
              alignItems: 'center',
            }}
            onPress={() => {
              onConfirm(local);
              onClose();
            }}
            activeOpacity={0.85}
          >
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>
              {local.length === 0
                ? 'Tous les types'
                : `${local.length} type${local.length > 1 ? 's' : ''} sélectionné${local.length > 1 ? 's' : ''}`}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

// ── Column Picker Modal ────────────────────────────────────────────────────────

function ColumnPickerModal({
  visible,
  onClose,
  columns,
  visibleIndices,
  onChange,
  theme,
  accentColor,
}: {
  visible: boolean;
  onClose: () => void;
  columns: string[];
  visibleIndices: Set<number>;
  onChange: (indices: Set<number>) => void;
  theme: ThemeType;
  accentColor: string;
}) {
  const [local, setLocal] = useState<Set<number>>(new Set(visibleIndices));

  useEffect(() => {
    if (visible) setLocal(new Set(visibleIndices));
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (i: number) =>
    setLocal((prev) => {
      const next = new Set(prev);
      if (next.has(i)) {
        if (next.size <= 1) return prev; // au moins 1 colonne visible
        next.delete(i);
      } else {
        next.add(i);
      }
      return next;
    });

  const allVisible = local.size === columns.length;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg.primary }} edges={['top']}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: 14,
            backgroundColor: theme.bg.surface,
            borderBottomWidth: 1,
            borderBottomColor: theme.border,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Columns size={18} color={accentColor} />
            <Text style={{ fontSize: 17, fontWeight: '700', color: theme.text.primary }}>Colonnes affichées</Text>
          </View>
          <TouchableOpacity onPress={onClose}>
            <X size={22} color={theme.text.muted} />
          </TouchableOpacity>
        </View>

        {/* Tout cocher / décocher */}
        <TouchableOpacity
          onPress={() => setLocal(allVisible ? new Set([0]) : new Set(columns.map((_, i) => i)))}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: theme.border,
            gap: 12,
          }}
        >
          <View
            style={[
              chk(),
              {
                borderColor: allVisible ? accentColor : theme.border,
                backgroundColor: allVisible ? accentColor : 'transparent',
              },
            ]}
          >
            {allVisible && <Check size={13} color="#fff" />}
          </View>
          <Text style={{ fontSize: 14, color: theme.text.secondary, fontStyle: 'italic' }}>
            {allVisible ? 'Tout désélectionner' : 'Tout sélectionner'}
          </Text>
        </TouchableOpacity>

        <ScrollView>
          {columns.map((col, i) => {
            const on = local.has(i);
            return (
              <TouchableOpacity
                key={i}
                onPress={() => toggle(i)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  borderBottomWidth: 1,
                  borderBottomColor: theme.border,
                  gap: 12,
                }}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    chk(),
                    { borderColor: on ? accentColor : theme.border, backgroundColor: on ? accentColor : 'transparent' },
                  ]}
                >
                  {on && <Check size={13} color="#fff" />}
                </View>
                <Text style={{ fontSize: 14, color: on ? theme.text.primary : theme.text.muted, flex: 1 }}>{col}</Text>
              </TouchableOpacity>
            );
          })}
          <View style={{ height: 30 }} />
        </ScrollView>

        {/* Appliquer */}
        <View
          style={{ padding: 16, borderTopWidth: 1, borderTopColor: theme.border, backgroundColor: theme.bg.surface }}
        >
          <TouchableOpacity
            style={{
              backgroundColor: accentColor,
              borderRadius: 12,
              height: 50,
              justifyContent: 'center',
              alignItems: 'center',
            }}
            onPress={() => {
              onChange(local);
              onClose();
            }}
            activeOpacity={0.85}
          >
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>
              Appliquer — {local.size} colonne{local.size > 1 ? 's' : ''}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

// ── SubReport List Modal ───────────────────────────────────────────────────────

function SubReportListModal({
  module: mod,
  visible,
  onClose,
  onSelect,
  theme,
}: {
  module: ReportModule | null;
  visible: boolean;
  onClose: () => void;
  onSelect: (sub: SubReport) => void;
  theme: ThemeType;
}) {
  if (!mod) return null;
  const Icon = mod.IconComponent;
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg.primary }} edges={['top']}>
        <View
          style={{
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: 16,
            backgroundColor: theme.bg.surface,
            borderBottomWidth: 1,
            borderBottomColor: theme.border,
          }}
        >
          <TouchableOpacity onPress={onClose} style={{ alignSelf: 'flex-end', padding: 4, marginBottom: 10 }}>
            <X size={22} color={theme.text.muted} />
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                backgroundColor: theme.primary + '18',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Icon size={22} color={theme.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 20, fontWeight: '800', color: theme.text.primary }}>{mod.title}</Text>
              <Text style={{ fontSize: 13, color: theme.text.muted, marginTop: 2 }}>{mod.subtitle}</Text>
            </View>
          </View>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
          <Text style={[lbl(theme), { marginBottom: 4 }]}>RAPPORTS DISPONIBLES ({mod.subReports.length})</Text>
          {mod.subReports.map((sub) => {
            const SubIcon = sub.IconComponent ?? ChevronRight;
            return (
              <TouchableOpacity
                key={sub.id}
                style={{
                  backgroundColor: theme.bg.surface,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: theme.border,
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: 16,
                  gap: 14,
                }}
                onPress={() => {
                  onSelect(sub);
                  onClose();
                }}
                activeOpacity={0.75}
              >
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    backgroundColor: theme.primary + '14',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <SubIcon size={18} color={theme.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: theme.text.primary }}>{sub.title}</Text>
                  <Text style={{ fontSize: 12, color: theme.text.muted, marginTop: 2 }}>{sub.description}</Text>
                </View>
                <ChevronRight size={16} color={theme.text.muted} />
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ── Report Modal (filtres + résultats) ────────────────────────────────────────

function ReportModal({
  module: mod,
  subReport,
  visible,
  onClose,
  theme,
}: {
  module: ReportModule | null;
  subReport: SubReport | null;
  visible: boolean;
  onClose: () => void;
  theme: ThemeType;
}) {
  const { user } = useAuthStore();
  const { getVehicleList } = useVehicleStore();

  const isClient = IS_CLIENT(user?.role ?? '');
  const isStaff = IS_STAFF(user?.role ?? '');
  const isAdminOrSuperAdmin = (ADMIN_SCREEN_ROLES as string[]).includes(user?.role?.toUpperCase() ?? '');

  const clientName = user?.name ?? '';

  const [filters, setFilters] = useState<ReportFilters>(() => ({
    ...DEFAULT_FILTERS,
    client: isClient ? clientName : '',
  }));
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReportResult | null>(null);
  const [filtersCollapsed, setFiltersCollapsed] = useState(false);
  const [visibleColIndices, setVisibleColIndices] = useState<Set<number>>(new Set());
  const [showColPicker, setShowColPicker] = useState(false);
  const [exportMode, setExportMode] = useState<'summary' | 'detail'>('summary');
  const [showAlertTypePicker, setShowAlertTypePicker] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [showProgrammer, setShowProgrammer] = useState(false);
  const [exporting, setExporting] = useState<'pdf' | 'csv' | 'chart' | null>(null);
  const [showFuelAnalysis, setShowFuelAnalysis] = useState(false);
  const [fuelAnalysisVehicle, setFuelAnalysisVehicle] = useState<Vehicle | null>(null);

  const vehicles: Vehicle[] = getVehicleList();
  const has = (k: string) => subReport?.filterKeys.includes(k as FilterKey) ?? false;

  const { data: interventionTypes = [] } = useQuery({
    queryKey: ['tech-settings-types'],
    queryFn: techSettingsApi.getTypes,
    staleTime: 300_000,
    enabled: has('interventionType'),
  });

  const sf = <K extends keyof ReportFilters>(k: K, v: ReportFilters[K]) => setFilters((p) => ({ ...p, [k]: v }));

  /**
   * Changement de module → réinitialisation complète (période + filtres + résultats).
   * Changement de sous-rapport dans le même module → on conserve la période et
   * les filtres client/branche, on efface seulement les résultats et la sélection
   * d'engins si le nouveau sous-rapport ne supporte pas ce filtre.
   */
  useEffect(() => {
    setResult(null);
    setFiltersCollapsed(false);
    setVisibleColIndices(new Set());
    setFilters({ ...DEFAULT_FILTERS, client: isClient ? clientName : '' });
  }, [mod?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setResult(null);
    setFiltersCollapsed(false);
    setVisibleColIndices(new Set());
    // Si le nouveau sous-rapport ne supporte pas le filtre 'vehicle', on vide la sélection
    if (subReport && !subReport.filterKeys.includes('vehicle')) {
      setFilters((prev) => ({ ...prev, vehicleIds: [] }));
    }
  }, [subReport?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleGenerate = useCallback(async () => {
    if (!mod || !subReport) return;
    setLoading(true);
    setResult(null);
    setFiltersCollapsed(false);
    try {
      const r = await generateReport(mod.id, subReport.id, vehicles, filters);
      setResult(r);
      setVisibleColIndices(new Set(r.columns.map((_, i) => i)));
      setExportMode('summary');
      setFiltersCollapsed(true);
    } catch {
      Alert.alert('Erreur', 'Impossible de charger les données du rapport.');
    } finally {
      setLoading(false);
    }
  }, [mod, subReport, vehicles, filters]);

  const handleExport = async (fmt: 'pdf' | 'csv' | 'chart') => {
    if (!result) return;
    setExporting(fmt);
    try {
      const periodLabel = formatPeriodLabel(filters);
      let exportResult: ReportResult;

      if (result.groups && exportMode === 'detail') {
        // Mode détaillé : aplatir toutes les lignes de détail avec label groupe
        const detailCols = result.groups[0]?.detailColumns ?? [];
        const flatRows: string[][] = [];
        for (const g of result.groups) {
          const label = g.summary[0] ?? ''; // première cellule = label du groupe
          for (const row of g.details) {
            flatRows.push([label, ...row]);
          }
        }
        exportResult = {
          ...result,
          columns: ['Groupe', ...detailCols],
          rows: flatRows,
          groups: undefined,
        };
      } else if (result.groups) {
        // Mode résumé : lignes résumé filtrées par colonnes visibles
        const cols = result.columns.filter((_, i) => visibleColIndices.size === 0 || visibleColIndices.has(i));
        const rows = result.groups.map((g) =>
          g.summary.filter((_, i) => visibleColIndices.size === 0 || visibleColIndices.has(i))
        );
        exportResult = { ...result, columns: cols, rows, groups: undefined };
      } else {
        // Rapport plat : filtre colonnes visibles
        exportResult =
          visibleColIndices.size > 0 && visibleColIndices.size < result.columns.length
            ? {
                ...result,
                columns: result.columns.filter((_, i) => visibleColIndices.has(i)),
                rows: result.rows.map((row) => row.filter((_, i) => visibleColIndices.has(i))),
              }
            : result;
      }

      if (fmt === 'csv') await shareCSV(exportResult, periodLabel);
      else if (fmt === 'chart') await exportChart(exportResult, accentColor, periodLabel);
      else await exportPDF(exportResult, theme.primary, periodLabel);
    } finally {
      setExporting(null);
    }
  };

  if (!mod || !subReport) return null;

  const SubIcon = subReport.IconComponent ?? Filter;
  const vehicleLabel =
    filters.vehicleIds.length === 0
      ? 'Tous les engins'
      : `${filters.vehicleIds.length} engin${filters.vehicleIds.length > 1 ? 's' : ''}`;
  const accentColor = theme.primary;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg.primary }} edges={['top']}>
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              paddingHorizontal: 16,
              paddingTop: 12,
              paddingBottom: 14,
              backgroundColor: theme.bg.surface,
              borderBottomWidth: 1,
              borderBottomColor: theme.border,
            }}
          >
            <View
              style={{
                width: 38,
                height: 38,
                borderRadius: 11,
                backgroundColor: accentColor + '22',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <SubIcon size={20} color={accentColor} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 17, fontWeight: '700', color: theme.text.primary }}>{subReport.title}</Text>
              <Text style={{ fontSize: 12, color: theme.text.muted }}>{mod.title}</Text>
            </View>
            {/* Bouton Programmer */}
            <TouchableOpacity
              onPress={() => setShowProgrammer(true)}
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: accentColor + '18',
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 4,
              }}
            >
              <Clock size={18} color={accentColor} />
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
              <X size={22} color={theme.text.muted} />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: result ? 90 : 40 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* ── Toggle filtres (visible uniquement quand résultat affiché) ── */}
            {result && (
              <TouchableOpacity
                onPress={() => setFiltersCollapsed((v) => !v)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: theme.bg.surface,
                  borderRadius: 10,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderWidth: 1,
                  borderColor: theme.border,
                }}
                activeOpacity={0.75}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Filter size={14} color={accentColor} />
                  <Text style={{ fontSize: 13, fontWeight: '600', color: accentColor }}>
                    {filtersCollapsed ? 'Modifier les filtres' : 'Masquer les filtres'}
                  </Text>
                </View>
                <ChevronLeft
                  size={16}
                  color={accentColor}
                  style={{ transform: [{ rotate: filtersCollapsed ? '-90deg' : '90deg' }] }}
                />
              </TouchableOpacity>
            )}

            {/* ── Filtres (masqués si rapport affiché) ── */}
            {!filtersCollapsed && (
              <>
                {/* ── Période ── */}
                <View style={{ gap: 8 }}>
                  <Text style={lbl(theme)}>PÉRIODE</Text>
                  <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                    {PERIODS.map((p) => (
                      <TouchableOpacity
                        key={p.key}
                        style={{
                          paddingHorizontal: 14,
                          paddingVertical: 9,
                          borderRadius: 10,
                          backgroundColor: filters.period === p.key ? accentColor : theme.bg.surface,
                          borderWidth: 1,
                          borderColor: filters.period === p.key ? accentColor : theme.border,
                        }}
                        onPress={() => sf('period', p.key)}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={{
                            fontSize: 13,
                            fontWeight: '600',
                            color: filters.period === p.key ? '#fff' : theme.text.primary,
                          }}
                        >
                          {p.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {filters.period === 'custom' && (
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <DateField
                        label="DU"
                        value={filters.customStart}
                        onChange={(v) => sf('customStart', v)}
                        theme={theme}
                        accentColor={accentColor}
                      />
                      <DateField
                        label="AU"
                        value={filters.customEnd}
                        onChange={(v) => sf('customEnd', v)}
                        theme={theme}
                        accentColor={accentColor}
                      />
                    </View>
                  )}
                </View>

                {/* ── CLIENT : lecture seule ── */}
                {isClient && has('client') && (
                  <View style={{ gap: 6 }}>
                    <Text style={lbl(theme)}>CLIENT</Text>
                    <View style={[inp(theme), { justifyContent: 'center', opacity: 0.75 }]}>
                      <Text style={{ fontSize: 14, color: theme.text.primary, fontWeight: '600' }}>{clientName}</Text>
                    </View>
                  </View>
                )}
                {isClient && has('branche') && (
                  <View style={{ gap: 6 }}>
                    <Text style={lbl(theme)}>BRANCHE</Text>
                    <View style={[inp(theme), { justifyContent: 'center', opacity: 0.75 }]}>
                      <Text style={{ fontSize: 14, color: theme.text.muted }}>—</Text>
                    </View>
                  </View>
                )}

                {/* ── STAFF : dropdown client ── */}
                {isStaff && has('client') && (
                  <View style={{ gap: 6 }}>
                    <Text style={lbl(theme)}>CLIENT</Text>
                    <ClientDropdown
                      value={filters.client}
                      onChange={(v) => sf('client', v)}
                      theme={theme}
                      accentColor={accentColor}
                    />
                  </View>
                )}

                {/* ── STAFF : branche ── */}
                {isStaff && has('branche') && (
                  <View style={{ gap: 6 }}>
                    <Text style={lbl(theme)}>BRANCHE</Text>
                    <TextInput
                      style={inp(theme)}
                      value={filters.branche}
                      onChangeText={(v) => sf('branche', v)}
                      placeholder="Filtrer par branche"
                      placeholderTextColor={theme.text.muted}
                      autoCapitalize="none"
                    />
                  </View>
                )}

                {/* ── ADMIN/SUPERADMIN : revendeur ── */}
                {isAdminOrSuperAdmin && has('revendeur') && (
                  <View style={{ gap: 6 }}>
                    <Text style={lbl(theme)}>REVENDEUR</Text>
                    <TextInput
                      style={inp(theme)}
                      value={filters.revendeur}
                      onChangeText={(v) => sf('revendeur', v)}
                      placeholder="Filtrer par revendeur"
                      placeholderTextColor={theme.text.muted}
                      autoCapitalize="none"
                    />
                  </View>
                )}

                {/* ── Types d'alertes ── */}
                {has('alertType') && (
                  <View style={{ gap: 6 }}>
                    <Text style={lbl(theme)}>TYPE(S) D'ALERTE</Text>
                    <TouchableOpacity
                      style={[
                        inp(theme),
                        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
                      ]}
                      onPress={() => setShowAlertTypePicker(true)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          color: filters.alertTypes.length > 0 ? theme.text.primary : theme.text.muted,
                          flex: 1,
                        }}
                        numberOfLines={1}
                      >
                        {filters.alertTypes.length === 0
                          ? 'Tous les types'
                          : filters.alertTypes.length === 1
                            ? (ALERT_TYPE_LIST.find((t) => t.key === filters.alertTypes[0])?.label ??
                              filters.alertTypes[0])
                            : `${filters.alertTypes.length} types sélectionnés`}
                      </Text>
                      {filters.alertTypes.length > 0 ? (
                        <TouchableOpacity
                          onPress={() => sf('alertTypes', [])}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <X size={14} color={theme.text.muted} />
                        </TouchableOpacity>
                      ) : (
                        <ChevronRight size={16} color={theme.text.muted} />
                      )}
                    </TouchableOpacity>
                  </View>
                )}

                {/* ── Sélecteur engins ── */}
                {has('vehicle') && (
                  <View style={{ gap: 6 }}>
                    <Text style={lbl(theme)}>ENGIN(S)</Text>
                    <TouchableOpacity
                      style={[
                        inp(theme),
                        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
                      ]}
                      onPress={() => setShowPicker(true)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          color: filters.vehicleIds.length > 0 ? theme.text.primary : theme.text.muted,
                        }}
                      >
                        {vehicleLabel}
                      </Text>
                      <ChevronRight size={16} color={theme.text.muted} />
                    </TouchableOpacity>
                  </View>
                )}

                {/* ── Type d'intervention ── */}
                {has('interventionType') && (
                  <View style={{ gap: 8 }}>
                    <Text style={lbl(theme)}>TYPE D'INTERVENTION</Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {(
                        [
                          { key: '', label: 'Tous' },
                          ...interventionTypes.map((t) => ({ key: t.code, label: t.label })),
                        ] as { key: string; label: string }[]
                      ).map((opt) => (
                        <TouchableOpacity
                          key={opt.key}
                          style={{
                            paddingHorizontal: 14,
                            paddingVertical: 9,
                            borderRadius: 10,
                            backgroundColor: filters.interventionType === opt.key ? accentColor : theme.bg.surface,
                            borderWidth: 1,
                            borderColor: filters.interventionType === opt.key ? accentColor : theme.border,
                          }}
                          onPress={() => sf('interventionType', opt.key)}
                          activeOpacity={0.8}
                        >
                          <Text
                            style={{
                              fontSize: 13,
                              fontWeight: '600',
                              color: filters.interventionType === opt.key ? '#fff' : theme.text.primary,
                            }}
                          >
                            {opt.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {/* ── Technicien ── */}
                {has('technicianName') && (
                  <View style={{ gap: 6 }}>
                    <Text style={lbl(theme)}>TECHNICIEN</Text>
                    <TextInput
                      style={inp(theme)}
                      value={filters.technicianName}
                      onChangeText={(v) => sf('technicianName', v)}
                      placeholder="Filtrer par nom de technicien…"
                      placeholderTextColor={theme.text.muted}
                      autoCapitalize="words"
                    />
                  </View>
                )}

                {/* ── Bouton Générer ── */}
                <TouchableOpacity
                  style={{
                    backgroundColor: loading ? theme.primaryDim : accentColor,
                    borderRadius: 12,
                    height: 50,
                    flexDirection: 'row',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: 10,
                  }}
                  onPress={handleGenerate}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Filter size={16} color="#fff" />
                      <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>Générer le rapport</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}

            {/* ── Résultats ── */}
            {result && (
              <>
                <View style={{ height: 1, backgroundColor: theme.border }} />

                {/* Note éventuelle */}
                {result.note && (
                  <View
                    style={{
                      backgroundColor: theme.bg.elevated,
                      borderRadius: 8,
                      padding: 10,
                      borderWidth: 1,
                      borderColor: theme.border,
                    }}
                  >
                    <Text style={{ fontSize: 12, color: theme.text.secondary }}>{result.note}</Text>
                  </View>
                )}

                {/* Résumé période */}
                {(() => {
                  const count = result.groups ? result.groups.length : result.rows.length;
                  const unit = result.groups ? 'groupe' : 'ligne';
                  return (
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        backgroundColor: theme.bg.surface,
                        borderRadius: 10,
                        padding: 10,
                        borderWidth: 1,
                        borderColor: theme.border,
                      }}
                    >
                      <Calendar size={14} color={accentColor} />
                      <Text style={{ fontSize: 12, color: theme.text.secondary, flex: 1 }}>
                        <Text style={{ fontWeight: '700' }}>Période : </Text>
                        {formatPeriodLabel(filters)}
                      </Text>
                      <Text style={{ fontSize: 11, color: theme.text.muted }}>
                        {count} {unit}
                        {count !== 1 ? 's' : ''}
                      </Text>
                    </View>
                  );
                })()}

                {(() => {
                  const visCols = result.columns.filter(
                    (_, i) => visibleColIndices.size === 0 || visibleColIndices.has(i)
                  );
                  const visRows = result.rows.map((row) =>
                    row.filter((_, i) => visibleColIndices.size === 0 || visibleColIndices.has(i))
                  );
                  const count = result.groups ? result.groups.length : result.rows.length;
                  const hidden = result.columns.length - visCols.length;
                  return (
                    <>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={[lbl(theme), { color: theme.text.secondary, flex: 1 }]}>
                          RÉSULTATS — {count} {result.groups ? 'groupe(s)' : `ligne${count !== 1 ? 's' : ''}`}
                        </Text>
                        <TouchableOpacity
                          onPress={() => setShowColPicker(true)}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 5,
                            paddingHorizontal: 10,
                            paddingVertical: 5,
                            borderRadius: 8,
                            borderWidth: 1,
                            borderColor: hidden > 0 ? accentColor : theme.border,
                            backgroundColor: hidden > 0 ? accentColor + '15' : 'transparent',
                          }}
                          activeOpacity={0.75}
                        >
                          <Columns size={13} color={hidden > 0 ? accentColor : theme.text.muted} />
                          <Text
                            style={{
                              fontSize: 11,
                              fontWeight: '600',
                              color: hidden > 0 ? accentColor : theme.text.muted,
                            }}
                          >
                            {visCols.length}/{result.columns.length}
                          </Text>
                        </TouchableOpacity>
                      </View>

                      <KPIBar kpis={result.kpis} theme={theme} />
                      {result.chart && <ChartSection chart={result.chart} theme={theme} />}

                      {/* ── Bouton Analyser (fuel/consumption uniquement) ── */}
                      {mod?.id === 'fuel' && subReport?.id === 'consumption' && (
                        <TouchableOpacity
                          onPress={() => {
                            const sel =
                              filters.vehicleIds.length === 1
                                ? (vehicles.find((v) => v.id === filters.vehicleIds[0]) ?? vehicles[0])
                                : vehicles[0];
                            setFuelAnalysisVehicle(sel ?? null);
                            setShowFuelAnalysis(true);
                          }}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                            marginVertical: 8,
                            paddingVertical: 12,
                            borderRadius: 12,
                            borderWidth: 1.5,
                            borderColor: '#F59E0B',
                            backgroundColor: '#FEF3C7',
                          }}
                          activeOpacity={0.8}
                        >
                          <BarChart2 size={16} color="#F59E0B" />
                          <Text style={{ fontSize: 13, fontWeight: '700', color: '#92400E' }}>
                            Analyser un engin en détail
                          </Text>
                        </TouchableOpacity>
                      )}

                      {result.groups ? (
                        <GroupedDataTable
                          columns={visCols}
                          groups={result.groups.map((g) => ({
                            ...g,
                            summary: g.summary.filter(
                              (_, i) => visibleColIndices.size === 0 || visibleColIndices.has(i)
                            ),
                          }))}
                          theme={theme}
                        />
                      ) : (
                        <DataTable columns={visCols} rows={visRows} theme={theme} />
                      )}
                    </>
                  );
                })()}
              </>
            )}
          </ScrollView>

          {/* ── Export bar (visible uniquement si résultats) ── */}
          {result && (
            <View
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                backgroundColor: theme.bg.surface,
                borderTopWidth: 1,
                borderTopColor: theme.border,
              }}
            >
              {/* Toggle résumé / détaillé — uniquement pour rapports groupés */}
              {result.groups && (
                <View
                  style={{
                    flexDirection: 'row',
                    marginHorizontal: 12,
                    marginTop: 10,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: theme.border,
                    overflow: 'hidden',
                  }}
                >
                  {(['summary', 'detail'] as const).map((mode) => (
                    <TouchableOpacity
                      key={mode}
                      onPress={() => setExportMode(mode)}
                      style={{
                        flex: 1,
                        paddingVertical: 7,
                        alignItems: 'center',
                        backgroundColor: exportMode === mode ? accentColor : 'transparent',
                      }}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '700',
                          color: exportMode === mode ? '#fff' : theme.text.muted,
                        }}
                      >
                        {mode === 'summary' ? 'Résumé' : 'Détaillé'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <View style={{ flexDirection: 'row', gap: 8, padding: 12 }}>
                {(
                  [
                    { fmt: 'csv', label: 'CSV', Icon: Download },
                    { fmt: 'pdf', label: 'PDF', Icon: FileText },
                    { fmt: 'chart', label: 'Courbe', Icon: BarChart2 },
                  ] as const
                ).map(({ fmt, label, Icon: EIcon }) => (
                  <TouchableOpacity
                    key={fmt}
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                      height: 44,
                      borderRadius: 10,
                      borderWidth: 1.5,
                      borderColor: accentColor,
                      backgroundColor: exporting === fmt ? accentColor + '22' : 'transparent',
                    }}
                    onPress={() => handleExport(fmt)}
                    disabled={exporting !== null}
                    activeOpacity={0.8}
                  >
                    {exporting === fmt ? (
                      <ActivityIndicator size="small" color={accentColor} />
                    ) : (
                      <>
                        <EIcon size={13} color={accentColor} />
                        <Text style={{ fontSize: 12, fontWeight: '700', color: accentColor }}>{label}</Text>
                      </>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <VehiclePickerModal
            visible={showPicker}
            onClose={() => setShowPicker(false)}
            selected={filters.vehicleIds}
            onConfirm={(ids) => sf('vehicleIds', ids)}
            theme={theme}
          />
          <ProgrammerModal
            visible={showProgrammer}
            onClose={() => setShowProgrammer(false)}
            subReport={subReport}
            moduleId={mod.id}
            theme={theme}
            accentColor={accentColor}
          />
          <AlertTypePickerModal
            visible={showAlertTypePicker}
            onClose={() => setShowAlertTypePicker(false)}
            selected={filters.alertTypes}
            onConfirm={(types) => sf('alertTypes', types)}
            theme={theme}
            accentColor={accentColor}
          />
          {result && (
            <ColumnPickerModal
              visible={showColPicker}
              onClose={() => setShowColPicker(false)}
              columns={result.columns}
              visibleIndices={visibleColIndices}
              onChange={setVisibleColIndices}
              theme={theme}
              accentColor={accentColor}
            />
          )}
          <FuelAnalysisModal
            visible={showFuelAnalysis}
            onClose={() => setShowFuelAnalysis(false)}
            vehicle={fuelAnalysisVehicle}
            startDate={getPeriodRange(filters).start}
            endDate={getPeriodRange(filters).end}
          />
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Main Screen ────────────────────────────────────────────────────────────────

export default function ReportsScreen() {
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const { getVehicleList } = useVehicleStore();
  const s = styles(theme);

  const [selModule, setSelModule] = useState<ReportModule | null>(null);
  const [selSub, setSelSub] = useState<SubReport | null>(null);
  const [showSubModal, setShowSubModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  const vehicles = getVehicleList();
  const moving = vehicles.filter((v) => v.status === 'moving').length;
  const offline = vehicles.filter((v) => v.status === 'offline').length;

  const userRole = user?.role ?? '';
  const isTech = IS_TECH(userRole);

  // TECH : uniquement le module Technique
  const visibleModules = REPORT_MODULES.filter((m) => m.roles.includes(userRole))
    .filter((m) => !isTech || m.id === 'technique')
    .map((m) => {
      // TECH : restreindre la liste des sous-rapports aux IDs autorisés
      if (isTech && m.techSubReportIds) {
        return { ...m, subReports: m.subReports.filter((s) => m.techSubReportIds!.includes(s.id)) };
      }
      return m;
    });

  const openModule = (m: ReportModule) => {
    setSelModule(m);
    setShowSubModal(true);
  };
  const openSub = (sub: SubReport) => {
    setSelSub(sub);
    setShowReportModal(true);
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <Text style={s.title}>Rapports</Text>
        <Text style={s.subtitle}>
          {vehicles.length} engins · {moving} en route · {offline} hors ligne
        </Text>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text style={s.sectionLabel}>MODULES ({visibleModules.length})</Text>
        {visibleModules.map((mod) => {
          const Icon = mod.IconComponent;
          return (
            <TouchableOpacity key={mod.id} style={s.card} onPress={() => openModule(mod)} activeOpacity={0.75}>
              <View style={[s.cardIcon, { backgroundColor: theme.primary + '18' }]}>
                <Icon size={22} color={theme.primary} />
              </View>
              <View style={s.cardBody}>
                <Text style={s.cardTitle}>{mod.title}</Text>
                <Text style={s.cardDesc}>{mod.subtitle}</Text>
                <View style={{ marginTop: 7 }}>
                  <View
                    style={{
                      backgroundColor: theme.primary + '14',
                      alignSelf: 'flex-start',
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 6,
                    }}
                  >
                    <Text style={{ fontSize: 11, color: theme.primary, fontWeight: '700' }}>
                      {mod.subReports.length} rapport{mod.subReports.length > 1 ? 's' : ''}
                    </Text>
                  </View>
                </View>
              </View>
              <ChevronRight size={16} color={theme.text.muted} />
            </TouchableOpacity>
          );
        })}
        <View style={{ height: 100 }} />
      </ScrollView>

      <SubReportListModal
        module={selModule}
        visible={showSubModal}
        onClose={() => setShowSubModal(false)}
        onSelect={openSub}
        theme={theme}
      />
      <ReportModal
        module={selModule}
        subReport={selSub}
        visible={showReportModal}
        onClose={() => setShowReportModal(false)}
        theme={theme}
      />
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = (theme: ThemeType) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg.primary },
    header: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.border },
    title: { fontSize: 22, fontWeight: '700', color: theme.text.primary },
    subtitle: { fontSize: 12, color: theme.text.muted, marginTop: 2 },
    content: { padding: 16 },
    sectionLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.text.muted,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 12,
    },
    card: {
      backgroundColor: theme.bg.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.border,
      flexDirection: 'row',
      alignItems: 'center',
      padding: 14,
      marginBottom: 10,
      gap: 12,
    },
    cardIcon: { width: 46, height: 46, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    cardBody: { flex: 1 },
    cardTitle: { fontSize: 15, fontWeight: '700', color: theme.text.primary },
    cardDesc: { fontSize: 12, color: theme.text.muted, marginTop: 2 },
  });
