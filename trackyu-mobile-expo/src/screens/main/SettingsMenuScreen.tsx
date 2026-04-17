/**
 * TrackYu Mobile — Settings Menu Screen
 *
 * Hub de navigation vers les sous-sections Paramètres.
 *   COMPTE       — Profil, Utilisateurs, Sous-utilisateurs
 *   FLOTTE       — Véhicules, Conducteurs, Maintenance, Pneus, Température
 *   OPÉRATIONNEL — Alertes (+ badge non lues), Règles, Géofences, Éco-conduite, Dépenses
 *   SYSTÈME      — Synchronisation & Cache, Notifications push  (ADMIN+)
 *   AIDE         — Centre d'aide, À propos
 */
import React, { useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  User,
  Users,
  Truck,
  Bell,
  MapPin,
  ShieldCheck,
  Leaf,
  CreditCard,
  Circle,
  Thermometer,
  UserCog,
  ChevronRight,
  Wrench,
  RefreshCw,
  HelpCircle,
  Info,
  BellRing,
  GitBranch,
  Layers,
  Zap,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import { SUBUSERS_HIDDEN_ROLES, ROLE } from '../../constants/roles';
import alertsApi from '../../api/alerts';

const APP_VERSION = '1.0.0';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type ThemeType = ReturnType<typeof import('../../theme').useTheme>['theme'];

// ── Types ──────────────────────────────────────────────────────────────────────

interface Tile {
  id?: keyof RootStackParamList;
  label: string;
  subtitle: string;
  Icon: React.ComponentType<{ size: number; color: string; strokeWidth?: number }>;
  hiddenForRoles?: string[];
  visibleForRoles?: string[];
  /** Si true, affiche le badge du nombre d'alertes non lues */
  showAlertBadge?: boolean;
  /** Petit badge texte coloré à droite (ex: numéro de version) */
  badgeText?: string;
  /** Action directe au lieu de navigation (sync, à propos, etc.) */
  action?: () => void;
}

interface Section {
  key: string;
  title: string;
  tiles: Tile[];
}

// ── Données ────────────────────────────────────────────────────────────────────

// Rôles qui ne voient PAS la tile Utilisateurs (CLIENT + TECH)
const USERS_TILE_HIDDEN_ROLES = [ROLE.CLIENT, ROLE.TECH];
// Rôles qui voient la section Système
const SYSTEM_ROLES = [ROLE.ADMIN, ROLE.SUPERADMIN, ROLE.TECH];

function buildSections(onSync: () => void, onAbout: () => void): Section[] {
  return [
    {
      key: 'compte',
      title: 'Compte',
      tiles: [
        { id: 'Profile', label: 'Profil', subtitle: 'Compte, mot de passe, préférences', Icon: User },
        {
          id: 'AdminUsers',
          label: 'Utilisateurs',
          subtitle: 'Gérer les utilisateurs du tenant',
          Icon: Users,
          hiddenForRoles: USERS_TILE_HIDDEN_ROLES,
        },
        {
          id: 'SubUsers',
          label: 'Sous-utilisateurs',
          subtitle: 'Gérer les accès de votre équipe',
          Icon: Users,
          hiddenForRoles: SUBUSERS_HIDDEN_ROLES,
        },
        {
          id: 'Branches',
          label: 'Branches',
          subtitle: 'Créer et gérer les branches',
          Icon: GitBranch,
          hiddenForRoles: [ROLE.CLIENT, ROLE.TECH],
        },
        {
          id: 'Groupes',
          label: 'Groupes de véhicules',
          subtitle: 'Organiser la flotte par groupes',
          Icon: Layers,
          hiddenForRoles: [ROLE.CLIENT, ROLE.TECH],
        },
        {
          id: 'Alerts',
          label: 'Centre de notifications',
          subtitle: 'Historique des alertes et événements',
          Icon: Bell,
          showAlertBadge: true,
        },
      ],
    },
    {
      key: 'flotte',
      title: 'Flotte',
      tiles: [
        {
          id: 'VehiclesList',
          label: 'Liste des véhicules',
          subtitle: 'Plaque, branche, date installation',
          Icon: Truck,
          hiddenForRoles: [ROLE.TECH],
        },
        {
          id: 'Drivers',
          label: 'Conducteurs',
          subtitle: 'Gestion des conducteurs',
          Icon: UserCog,
          hiddenForRoles: [ROLE.TECH],
        },
        {
          id: 'Maintenance',
          label: 'Maintenance',
          subtitle: 'Entretien et révisions des engins',
          Icon: Wrench,
          hiddenForRoles: [ROLE.TECH],
        },
        {
          id: 'Pneus',
          label: 'Gestion des pneus',
          subtitle: 'Suivi usure et remplacement',
          Icon: Circle,
          hiddenForRoles: [ROLE.TECH],
        },
        {
          id: 'Temperature',
          label: 'Température',
          subtitle: 'Surveillance capteurs température',
          Icon: Thermometer,
          hiddenForRoles: [ROLE.TECH],
        },
      ],
    },
    {
      key: 'operationnel',
      title: 'Opérationnel',
      tiles: [
        {
          id: 'AlertRules',
          label: 'Alertes',
          subtitle: "Règles d'alerte — créer, modifier, activer",
          Icon: Zap,
          hiddenForRoles: [ROLE.TECH],
        },
        {
          id: 'Rules',
          label: 'Règles de conduite',
          subtitle: 'Plages horaires, distances et vitesses',
          Icon: ShieldCheck,
          hiddenForRoles: [ROLE.TECH],
        },
        {
          id: 'Geofences',
          label: 'Zones géographiques',
          subtitle: 'Créer et gérer des zones de surveillance',
          Icon: MapPin,
          hiddenForRoles: [ROLE.TECH],
        },
        {
          id: 'EcoConduite',
          label: 'Éco-conduite',
          subtitle: 'Profils de conduite et scores cibles',
          Icon: Leaf,
          hiddenForRoles: [ROLE.TECH],
        },
        {
          id: 'Depenses',
          label: 'Dépenses',
          subtitle: 'Suivi des coûts par véhicule',
          Icon: CreditCard,
          hiddenForRoles: [ROLE.TECH],
        },
      ],
    },
    {
      key: 'systeme',
      title: 'Système',
      tiles: [
        {
          label: 'Synchronisation',
          subtitle: 'Forcer le rechargement de toutes les données',
          Icon: RefreshCw,
          visibleForRoles: SYSTEM_ROLES,
          action: onSync,
        },
        {
          label: 'Notifications push',
          subtitle: 'Gérer les autorisations de notification',
          Icon: BellRing,
          action: () => Linking.openSettings(),
        },
      ],
    },
    {
      key: 'aide',
      title: 'Aide',
      tiles: [
        { id: 'Help', label: "Centre d'aide", subtitle: 'FAQ, contact et assistant IA', Icon: HelpCircle },
        {
          label: 'À propos',
          subtitle: `TrackYu GPS — version ${APP_VERSION}`,
          Icon: Info,
          badgeText: `v${APP_VERSION}`,
          action: onAbout,
        },
      ],
    },
  ];
}

// ── Sous-composants ────────────────────────────────────────────────────────────

function AlertBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <View
      style={{
        minWidth: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#EF4444',
        paddingHorizontal: 5,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Text style={{ fontSize: 11, fontWeight: '800', color: '#fff' }}>{count > 99 ? '99+' : count}</Text>
    </View>
  );
}

function TileItem({
  tile,
  theme,
  onPress,
  unreadCount,
}: {
  tile: Tile;
  theme: ThemeType;
  onPress: () => void;
  unreadCount: number;
}) {
  const { Icon } = tile;
  return (
    <TouchableOpacity
      style={s(theme).tile}
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityLabel={tile.label}
      accessibilityHint={tile.subtitle}
      accessibilityRole="button"
    >
      <View style={s(theme).tileIcon}>
        <Icon size={22} color={theme.primary} strokeWidth={1.8} />
      </View>
      <View style={s(theme).tileBody}>
        <Text style={s(theme).tileLabel}>{tile.label}</Text>
        <Text style={s(theme).tileSub}>{tile.subtitle}</Text>
      </View>
      {tile.showAlertBadge && <AlertBadge count={unreadCount} />}
      {tile.badgeText && (
        <View style={s(theme).versionBadge}>
          <Text style={s(theme).versionBadgeText}>{tile.badgeText}</Text>
        </View>
      )}
      <ChevronRight
        size={16}
        color={theme.text.muted}
        style={tile.showAlertBadge || tile.badgeText ? { marginLeft: 6 } : undefined}
      />
    </TouchableOpacity>
  );
}

function SectionHeader({ title, theme }: { title: string; theme: ThemeType }) {
  return <Text style={s(theme).sectionTitle}>{title.toUpperCase()}</Text>;
}

// ── Écran principal ────────────────────────────────────────────────────────────

export default function SettingsMenuScreen() {
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const nav = useNavigation<Nav>();
  const queryClient = useQueryClient();
  const userRole = (user?.role ?? '').toUpperCase();

  /** Nombre d'alertes non lues — rechargé toutes les 60 s, silencieux en cas d'erreur */
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['alerts-unread-count'],
    queryFn: () => alertsApi.getUnreadCount(),
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  const handleSync = useCallback(() => {
    queryClient.invalidateQueries();
    Alert.alert('Synchronisation', 'Toutes les données ont été rechargées.');
  }, [queryClient]);

  const handleAbout = useCallback(() => {
    Alert.alert(
      'À propos de TrackYu GPS',
      `Version ${APP_VERSION}\n\nPlateforme de gestion de flotte GPS.\n© ${new Date().getFullYear()} TrackYu — Tous droits réservés.\n\nsupport@trackyugps.com`,
      [{ text: 'OK' }]
    );
  }, []);

  const sections = buildSections(handleSync, handleAbout);

  const visibleSections: Section[] = sections
    .map((section) => ({
      ...section,
      tiles: section.tiles.filter((tile) => {
        if (tile.hiddenForRoles?.includes(userRole)) return false;
        if (tile.visibleForRoles && !tile.visibleForRoles.includes(userRole)) return false;
        return true;
      }),
    }))
    .filter((section) => section.tiles.length > 0);

  return (
    <SafeAreaView style={s(theme).container} edges={['top']}>
      <View style={s(theme).header}>
        <Text style={s(theme).title}>Paramètres</Text>
        {user?.name ? <Text style={s(theme).subtitle}>{user.name}</Text> : null}
      </View>

      <ScrollView contentContainerStyle={s(theme).content} showsVerticalScrollIndicator={false}>
        {visibleSections.map((section, si) => (
          <View key={section.key} style={si > 0 ? { marginTop: 24 } : undefined}>
            <SectionHeader title={section.title} theme={theme} />
            <View style={s(theme).sectionBlock}>
              {section.tiles.map((tile, ti) => {
                const key = tile.id ?? tile.label;
                return (
                  <React.Fragment key={key}>
                    {ti > 0 && <View style={s(theme).separator} />}
                    <TileItem
                      tile={tile}
                      theme={theme}
                      onPress={tile.action ?? (() => tile.id && nav.navigate(tile.id as never))}
                      unreadCount={tile.showAlertBadge ? unreadCount : 0}
                    />
                  </React.Fragment>
                );
              })}
            </View>
          </View>
        ))}
        <View style={{ height: 80 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const s = (theme: ThemeType) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg.primary },
    header: {
      paddingHorizontal: 16,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      backgroundColor: theme.bg.surface,
    },
    title: { fontSize: 22, fontWeight: '700', color: theme.text.primary },
    subtitle: { fontSize: 13, color: theme.text.muted, marginTop: 2 },
    content: { paddingHorizontal: 16, paddingTop: 20 },
    sectionTitle: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.text.muted,
      textTransform: 'uppercase',
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
    separator: { height: 1, backgroundColor: theme.border, marginLeft: 72 },
    tile: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 14, gap: 14 },
    tileIcon: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: theme.primary + '18',
      justifyContent: 'center',
      alignItems: 'center',
    },
    tileBody: { flex: 1 },
    tileLabel: { fontSize: 15, fontWeight: '600', color: theme.text.primary },
    tileSub: { fontSize: 12, color: theme.text.muted, marginTop: 2 },
    versionBadge: { backgroundColor: theme.border, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
    versionBadgeText: { fontSize: 11, fontWeight: '600', color: theme.text.muted },
  });
