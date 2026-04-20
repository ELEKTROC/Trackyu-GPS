/**
 * TrackYu Mobile — Constantes de rôles centralisées
 *
 * SOURCE UNIQUE DE VÉRITÉ pour tous les rôles de l'application.
 * Importer depuis ce fichier plutôt que de déclarer des strings inline.
 */

// ── Rôles individuels ─────────────────────────────────────────────────────────

export const ROLE = {
  SUPERADMIN: 'SUPERADMIN',
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  COMMERCIAL: 'COMMERCIAL',
  OPERATOR: 'OPERATOR',
  RESELLER: 'RESELLER',
  TECH: 'TECH',
  SUPPORT: 'SUPPORT',
  SUPPORT_AGENT: 'SUPPORT_AGENT',
  COMPTABLE: 'COMPTABLE',
  CLIENT: 'CLIENT',
} as const;

export type RoleValue = (typeof ROLE)[keyof typeof ROLE];

// ── Labels d'affichage (français) ─────────────────────────────────────────────

export const ROLE_LABELS: Record<string, string> = {
  SUPERADMIN: 'Super Admin',
  ADMIN: 'Administrateur',
  MANAGER: 'Gestionnaire',
  COMMERCIAL: 'Commercial',
  OPERATOR: 'Opérateur',
  RESELLER: 'Revendeur',
  TECH: 'Technicien',
  SUPPORT: 'Support',
  SUPPORT_AGENT: 'Support',
  COMPTABLE: 'Comptable',
  CLIENT: 'Client',
  // Alias lowercase (rétro-compatibilité backend)
  admin: 'Administrateur',
  manager: 'Gestionnaire',
  operator: 'Opérateur',
};

// ── Couleurs de badge ─────────────────────────────────────────────────────────

export const ROLE_COLORS: Record<string, string> = {
  SUPERADMIN: '#7C3AED',
  ADMIN: '#DC2626',
  MANAGER: '#2563EB',
  COMMERCIAL: '#16A34A',
  TECH: '#0891B2',
  SUPPORT_AGENT: '#D97706',
  SUPPORT: '#D97706',
  COMPTABLE: '#DB2777',
  OPERATOR: '#6B7280',
  RESELLER: '#F59E0B',
  CLIENT: '#6B7280',
};

// ── Alias backend → rôle canonique mobile ────────────────────────────────────
// Le backend peut envoyer ces strings dans le JWT. On les normalise côté mobile
// pour éviter de les propager dans tous les guards et groupes de navigation.

const ROLE_ALIAS_MAP: Record<string, string> = {
  AGENT_TRACKING: ROLE.OPERATOR, // agent terrain = opérateur mobile
  RESELLER_ADMIN: ROLE.ADMIN, // admin revendeur = admin mobile
  SOUS_COMPTE: ROLE.CLIENT, // sous-compte = client mobile
  SUB_ACCOUNT: ROLE.CLIENT, // alias anglais
};

/**
 * Normalise un rôle reçu du backend vers le rôle canonique mobile.
 * Retourne le rôle en majuscules si pas d'alias connu.
 */
export function normalizeRole(role: string): string {
  const upper = role.toUpperCase();
  return ROLE_ALIAS_MAP[upper] ?? upper;
}

// ── Groupes pour la navigation (MainNavigator) ────────────────────────────────

/** Rôles qui utilisent StaffNavigator (Dashboard full + Finance) */
export const NAV_STAFF_ROLES = [
  ROLE.SUPERADMIN,
  ROLE.ADMIN,
  ROLE.MANAGER,
  ROLE.COMMERCIAL,
  ROLE.OPERATOR,
  ROLE.RESELLER,
  ROLE.COMPTABLE,
];

/** Rôles qui utilisent SupportNavigator (onglet Tickets, pas Finance) */
export const NAV_SUPPORT_ROLES = [ROLE.SUPPORT, ROLE.SUPPORT_AGENT];

// ── Groupes pour l'accès aux écrans (RootNavigator guards) ───────────────────

/** Accès à l'écran AdminUsers (gestion des utilisateurs) */
export const ADMIN_SCREEN_ROLES = [ROLE.SUPERADMIN, ROLE.ADMIN, ROLE.MANAGER];

/**
 * Accès réservé au staff SUPERADMIN (tenant_default TKY).
 * Utilisé pour les écrans cross-tenant qui n'ont aucun sens pour un ADMIN/MANAGER
 * de tenant isolé : liste des revendeurs, pool boîtiers global, journaux globaux,
 * corbeille globale.
 */
export const SUPERADMIN_ONLY_ROLES = [ROLE.SUPERADMIN];

/** Accès à l'écran CRMLeads */
export const CRM_SCREEN_ROLES = [ROLE.SUPERADMIN, ROLE.ADMIN, ROLE.MANAGER, ROLE.COMMERCIAL];

// ── Groupes fonctionnels ──────────────────────────────────────────────────────

/** Rôles pouvant utiliser le mode SMS pour l'immobilisation */
export const IMMO_SMS_ROLES = [
  ROLE.SUPERADMIN,
  ROLE.ADMIN,
  ROLE.MANAGER,
  ROLE.OPERATOR,
  ROLE.COMMERCIAL,
  ROLE.RESELLER,
];

/** Rôles pour lesquels SubUsers est masqué dans Paramètres */
export const SUBUSERS_HIDDEN_ROLES = [ROLE.TECH];

/** Rôles pouvant accéder aux rapports financiers */
export const FINANCE_ROLES = [ROLE.COMPTABLE, ROLE.ADMIN, ROLE.SUPERADMIN];

/** Tous les rôles connus */
export const ALL_ROLES = [
  ROLE.CLIENT,
  ROLE.TECH,
  ROLE.COMMERCIAL,
  ROLE.COMPTABLE,
  ROLE.OPERATOR,
  ROLE.RESELLER,
  ROLE.SUPPORT,
  ROLE.SUPPORT_AGENT,
  ROLE.MANAGER,
  ROLE.ADMIN,
  ROLE.SUPERADMIN,
];

/** Rôles pouvant accéder à SubUsers (tous sauf TECH) */
export const SUBUSERS_ALLOWED_ROLES = ALL_ROLES.filter((r) => !(SUBUSERS_HIDDEN_ROLES as string[]).includes(r));
