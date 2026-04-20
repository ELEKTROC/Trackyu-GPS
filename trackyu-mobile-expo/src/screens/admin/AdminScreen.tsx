/**
 * TrackYu Mobile — Administration Screen
 * Hub d'administration pour SUPERADMIN / ADMIN / MANAGER.
 * 4 sections : Équipe · Opérations · Finance · Système (SUPERADMIN only)
 */
import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Users,
  Building2,
  Trash2,
  Cpu,
  ClipboardList,
  ChevronRight,
  Activity,
  TicketCheck,
  Wrench,
  Calendar,
  Wallet,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../../theme';
import { usersApi } from '../../api/users';
import { ProtectedScreen } from '../../components/ProtectedScreen';
import { ADMIN_SCREEN_ROLES, ROLE } from '../../constants/roles';
import { useAuthStore } from '../../store/authStore';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type ThemeType = ReturnType<typeof import('../../theme').useTheme>['theme'];

// ── Tile ──────────────────────────────────────────────────────────────────────

function Tile({
  icon,
  label,
  subtitle,
  badge,
  color,
  onPress,
  theme,
  isFirst,
  isLast,
}: {
  icon: React.ReactNode;
  label: string;
  subtitle: string;
  badge?: number | string;
  color: string;
  onPress: () => void;
  theme: ThemeType;
  isFirst: boolean;
  isLast: boolean;
}) {
  return (
    <TouchableOpacity
      style={[
        s(theme).tile,
        isFirst && s(theme).tileFirst,
        isLast && s(theme).tileLast,
        !isLast && s(theme).tileBorder,
      ]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={[s(theme).tileIcon, { backgroundColor: color + '1A' }]}>{icon}</View>
      <View style={s(theme).tileBody}>
        <Text style={s(theme).tileLabel}>{label}</Text>
        <Text style={s(theme).tileSub}>{subtitle}</Text>
      </View>
      {badge !== undefined && (
        <View style={[s(theme).badge, { backgroundColor: color + '22' }]}>
          <Text style={[s(theme).badgeText, { color }]}>{badge}</Text>
        </View>
      )}
      <ChevronRight size={16} color={theme.text.muted} style={{ marginLeft: 4 }} />
    </TouchableOpacity>
  );
}

// ── Section ───────────────────────────────────────────────────────────────────

function Section({
  title,
  hint,
  children,
  theme,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
  theme: ThemeType;
}) {
  return (
    <View style={{ marginBottom: 24 }}>
      <View style={s(theme).sectionTitleRow}>
        <Text style={s(theme).sectionTitle}>{title.toUpperCase()}</Text>
        {hint && <Text style={s(theme).sectionHint}>{hint}</Text>}
      </View>
      <View style={s(theme).sectionBlock}>{children}</View>
    </View>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function AdminScreen() {
  const { theme } = useTheme();
  const nav = useNavigation<Nav>();
  const user = useAuthStore((st) => st.user);
  const isSuperAdmin = user?.role?.toUpperCase() === ROLE.SUPERADMIN;

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: usersApi.getAll,
    staleTime: 60_000,
  });

  const staffCount = useMemo(() => users.filter((u) => u.role?.toUpperCase() !== 'CLIENT').length, [users]);
  const activeStaffCount = useMemo(
    () => users.filter((u) => u.role?.toUpperCase() !== 'CLIENT' && u.status === 'Actif').length,
    [users]
  );

  return (
    <ProtectedScreen allowedRoles={ADMIN_SCREEN_ROLES}>
      <SafeAreaView style={s(theme).container} edges={['top']}>
        {/* Header */}
        <View style={s(theme).header}>
          <TouchableOpacity
            onPress={() => nav.goBack()}
            style={s(theme).backBtn}
            accessibilityLabel="Retour"
            accessibilityRole="button"
          >
            <ArrowLeft size={22} color={theme.text.primary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s(theme).title}>Administration</Text>
            <Text style={s(theme).subtitle}>
              {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={s(theme).content} showsVerticalScrollIndicator={false}>
          {/* ── Équipe ────────────────────────────────────────────────────── */}
          <Section title="Équipe" theme={theme}>
            <Tile
              icon={
                isLoading ? (
                  <ActivityIndicator size="small" color={theme.primary} />
                ) : (
                  <Users size={22} color={theme.primary} />
                )
              }
              label="Utilisateurs staff"
              subtitle={isLoading ? 'Chargement…' : `${activeStaffCount} actifs sur ${staffCount}`}
              badge={isLoading ? undefined : staffCount}
              color={theme.primary}
              onPress={() => nav.navigate('AdminUsers')}
              theme={theme}
              isFirst
              isLast
            />
          </Section>

          {/* ── Opérations ────────────────────────────────────────────────── */}
          <Section title="Opérations" theme={theme}>
            <Tile
              icon={<Activity size={22} color="#22C55E" />}
              label="Monitoring"
              subtitle="Alertes, anomalies, santé flotte"
              color="#22C55E"
              onPress={() => nav.navigate('AdminMonitoring')}
              theme={theme}
              isFirst
              isLast={false}
            />
            <Tile
              icon={<TicketCheck size={22} color="#F59E0B" />}
              label="Tickets"
              subtitle="Support et réclamations"
              color="#F59E0B"
              onPress={() => nav.navigate('AdminTickets')}
              theme={theme}
              isFirst={false}
              isLast={false}
            />
            <Tile
              icon={<Wrench size={22} color="#6366F1" />}
              label="Interventions"
              subtitle="Installations et maintenances"
              color="#6366F1"
              onPress={() => nav.navigate('AdminInterventions', { initialTab: 'interventions' })}
              theme={theme}
              isFirst={false}
              isLast={false}
            />
            <Tile
              icon={<Calendar size={22} color="#3B82F6" />}
              label="Agenda"
              subtitle="Planning équipe et interventions"
              color="#3B82F6"
              onPress={() => nav.navigate('AdminAgenda')}
              theme={theme}
              isFirst={false}
              isLast
            />
          </Section>

          {/* ── Finance ───────────────────────────────────────────────────── */}
          <Section title="Finance" theme={theme}>
            <Tile
              icon={<Wallet size={22} color="#EC4899" />}
              label="Comptabilité"
              subtitle="Factures, paiements, relances"
              color="#EC4899"
              onPress={() => nav.navigate('AdminComptabilite')}
              theme={theme}
              isFirst
              isLast
            />
          </Section>

          {/* ── Système (SUPERADMIN only) ─────────────────────────────────── */}
          {isSuperAdmin && (
            <Section title="Système" hint="Superadmin" theme={theme}>
              <Tile
                icon={<Building2 size={22} color="#10B981" />}
                label="Revendeurs"
                subtitle="Tenants revendeurs et clients"
                color="#10B981"
                onPress={() => nav.navigate('AdminResellers')}
                theme={theme}
                isFirst
                isLast={false}
              />
              <Tile
                icon={<Cpu size={22} color="#8B5CF6" />}
                label="Appareils GPS"
                subtitle="Pool boîtiers et état pipeline"
                color="#8B5CF6"
                onPress={() => nav.navigate('AdminDevices')}
                theme={theme}
                isFirst={false}
                isLast={false}
              />
              <Tile
                icon={<ClipboardList size={22} color="#F59E0B" />}
                label="Journaux d'audit"
                subtitle="Actions et connexions globales"
                color="#F59E0B"
                onPress={() => nav.navigate('AdminAuditLogs')}
                theme={theme}
                isFirst={false}
                isLast={false}
              />
              <Tile
                icon={<Trash2 size={22} color="#EF4444" />}
                label="Corbeille"
                subtitle="Éléments supprimés récemment"
                color="#EF4444"
                onPress={() => nav.navigate('AdminTrash')}
                theme={theme}
                isFirst={false}
                isLast
              />
            </Section>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </ProtectedScreen>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

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
    backBtn: { padding: 4, marginTop: 4 },
    title: { fontSize: 22, fontWeight: '700', color: theme.text.primary },
    subtitle: { fontSize: 12, color: theme.text.muted, marginTop: 2 },
    content: { paddingHorizontal: 16, paddingTop: 24 },
    sectionTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
      paddingHorizontal: 2,
    },
    sectionTitle: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.text.muted,
      letterSpacing: 1,
    },
    sectionHint: {
      fontSize: 10,
      fontWeight: '700',
      color: theme.primary,
      letterSpacing: 0.5,
      backgroundColor: theme.primary + '1A',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 8,
      textTransform: 'uppercase',
    },
    sectionBlock: {
      backgroundColor: theme.bg.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.border,
      overflow: 'hidden',
    },
    tile: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 14, gap: 14 },
    tileFirst: { borderTopLeftRadius: 14, borderTopRightRadius: 14 },
    tileLast: { borderBottomLeftRadius: 14, borderBottomRightRadius: 14 },
    tileBorder: { borderBottomWidth: 1, borderBottomColor: theme.border },
    tileIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    tileBody: { flex: 1 },
    tileLabel: { fontSize: 15, fontWeight: '600', color: theme.text.primary },
    tileSub: { fontSize: 12, color: theme.text.muted, marginTop: 2 },
    badge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
    badgeText: { fontSize: 12, fontWeight: '700' },
  });
