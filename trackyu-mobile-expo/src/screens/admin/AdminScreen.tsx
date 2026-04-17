/**
 * TrackYu Mobile — Administration Screen
 * Hub d'administration pour SUPERADMIN / ADMIN.
 * 3 sections : Équipe · Gestion · Système
 */
import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Users, Building2, Trash2, Cpu, ClipboardList, ChevronRight } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../../theme';
import { usersApi } from '../../api/users';
import { ProtectedScreen } from '../../components/ProtectedScreen';
import { ADMIN_SCREEN_ROLES } from '../../constants/roles';
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

function Section({ title, children, theme }: { title: string; children: React.ReactNode; theme: ThemeType }) {
  return (
    <View style={{ marginBottom: 24 }}>
      <Text style={s(theme).sectionTitle}>{title.toUpperCase()}</Text>
      <View style={s(theme).sectionBlock}>{children}</View>
    </View>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function AdminScreen() {
  const { theme } = useTheme();
  const nav = useNavigation<Nav>();

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

          {/* ── Gestion ───────────────────────────────────────────────────── */}
          <Section title="Gestion" theme={theme}>
            <Tile
              icon={<Building2 size={22} color="#10B981" />}
              label="Revendeurs"
              subtitle="Gérer les tenants revendeurs"
              color="#10B981"
              onPress={() => nav.navigate('AdminResellers')}
              theme={theme}
              isFirst
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

          {/* ── Système ───────────────────────────────────────────────────── */}
          <Section title="Système" theme={theme}>
            <Tile
              icon={<Cpu size={22} color="#8B5CF6" />}
              label="Appareils GPS"
              subtitle="État du pipeline et des trackers"
              color="#8B5CF6"
              onPress={() => nav.navigate('AdminDevices')}
              theme={theme}
              isFirst
              isLast={false}
            />
            <Tile
              icon={<ClipboardList size={22} color="#F59E0B" />}
              label="Journaux d'audit"
              subtitle="Dernières actions et connexions"
              color="#F59E0B"
              onPress={() => nav.navigate('AdminAuditLogs')}
              theme={theme}
              isFirst={false}
              isLast
            />
          </Section>

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
    sectionTitle: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.text.muted,
      letterSpacing: 1,
      marginBottom: 8,
      paddingHorizontal: 2,
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
