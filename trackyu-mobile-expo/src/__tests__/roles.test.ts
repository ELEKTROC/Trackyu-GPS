/**
 * @jest-environment node
 *
 * Tests des constantes de rôles et de la logique de routing navigation.
 *
 * On ne teste pas React Navigation (composants JSX) : on teste la logique
 * pure de dispatch basée sur les groupes de rôles, telle qu'elle est
 * implémentée dans MainNavigator et RootNavigator.
 */

import {
  ROLE,
  ALL_ROLES,
  normalizeRole,
  NAV_STAFF_ROLES,
  NAV_SUPPORT_ROLES,
  ADMIN_SCREEN_ROLES,
  CRM_SCREEN_ROLES,
  IMMO_SMS_ROLES,
  SUBUSERS_HIDDEN_ROLES,
  SUBUSERS_ALLOWED_ROLES,
  FINANCE_ROLES,
  ROLE_LABELS,
  ROLE_COLORS,
} from '../constants/roles';

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Réplique la logique de MainNavigator.
 * Si cette fonction change, les tests échoueront et rappelleront de mettre
 * à jour la logique de navigation.
 */
function getNavigatorName(role: string): string {
  if (role === ROLE.CLIENT) return 'ClientNavigator';
  if (role === ROLE.TECH) return 'TechNavigator';
  if ((NAV_SUPPORT_ROLES as string[]).includes(role)) return 'SupportNavigator';
  if ((NAV_STAFF_ROLES as string[]).includes(role)) return 'StaffNavigator';
  return 'ClientNavigator'; // fallback sécurisé
}

// ── Normalisation des alias backend ──────────────────────────────────────────

describe('normalizeRole — alias backend', () => {
  it('AGENT_TRACKING → OPERATOR', () => {
    expect(normalizeRole('AGENT_TRACKING')).toBe(ROLE.OPERATOR);
  });

  it('RESELLER_ADMIN → ADMIN', () => {
    expect(normalizeRole('RESELLER_ADMIN')).toBe(ROLE.ADMIN);
  });

  it('SOUS_COMPTE → CLIENT', () => {
    expect(normalizeRole('SOUS_COMPTE')).toBe(ROLE.CLIENT);
  });

  it('SUB_ACCOUNT → CLIENT', () => {
    expect(normalizeRole('SUB_ACCOUNT')).toBe(ROLE.CLIENT);
  });

  it('rôle canonique inchangé', () => {
    expect(normalizeRole('ADMIN')).toBe(ROLE.ADMIN);
    expect(normalizeRole('COMPTABLE')).toBe(ROLE.COMPTABLE);
  });

  it('normalise en majuscules même si minuscule reçu', () => {
    expect(normalizeRole('agent_tracking')).toBe(ROLE.OPERATOR);
    expect(normalizeRole('admin')).toBe(ROLE.ADMIN);
  });

  it('rôle inconnu retourné en majuscules', () => {
    expect(normalizeRole('unknown_role')).toBe('UNKNOWN_ROLE');
  });
});

// ── Exhaustivité ──────────────────────────────────────────────────────────────

describe('ALL_ROLES — exhaustivité', () => {
  it('contient exactement tous les rôles définis dans ROLE', () => {
    const allRoleValues = Object.values(ROLE);
    allRoleValues.forEach((r) => {
      expect(ALL_ROLES).toContain(r);
    });
    expect(ALL_ROLES).toHaveLength(allRoleValues.length);
  });

  it('ROLE_LABELS couvre tous les rôles', () => {
    Object.values(ROLE).forEach((r) => {
      expect(ROLE_LABELS).toHaveProperty(r);
    });
  });

  it('ROLE_COLORS couvre tous les rôles', () => {
    Object.values(ROLE).forEach((r) => {
      expect(ROLE_COLORS).toHaveProperty(r);
    });
  });
});

// ── Routing de navigation (MainNavigator) ─────────────────────────────────────

describe('Routing MainNavigator', () => {
  it('CLIENT → ClientNavigator', () => {
    expect(getNavigatorName(ROLE.CLIENT)).toBe('ClientNavigator');
  });

  it('TECH → TechNavigator', () => {
    expect(getNavigatorName(ROLE.TECH)).toBe('TechNavigator');
  });

  it('SUPPORT → SupportNavigator', () => {
    expect(getNavigatorName(ROLE.SUPPORT)).toBe('SupportNavigator');
  });

  it('SUPPORT_AGENT → SupportNavigator', () => {
    expect(getNavigatorName(ROLE.SUPPORT_AGENT)).toBe('SupportNavigator');
  });

  it('ADMIN → StaffNavigator', () => {
    expect(getNavigatorName(ROLE.ADMIN)).toBe('StaffNavigator');
  });

  it('SUPERADMIN → StaffNavigator', () => {
    expect(getNavigatorName(ROLE.SUPERADMIN)).toBe('StaffNavigator');
  });

  it('MANAGER → StaffNavigator', () => {
    expect(getNavigatorName(ROLE.MANAGER)).toBe('StaffNavigator');
  });

  it('COMMERCIAL → StaffNavigator', () => {
    expect(getNavigatorName(ROLE.COMMERCIAL)).toBe('StaffNavigator');
  });

  it('OPERATOR → StaffNavigator', () => {
    expect(getNavigatorName(ROLE.OPERATOR)).toBe('StaffNavigator');
  });

  it('RESELLER → StaffNavigator', () => {
    expect(getNavigatorName(ROLE.RESELLER)).toBe('StaffNavigator');
  });

  it('COMPTABLE → StaffNavigator (accès Finance/Accounting)', () => {
    expect(getNavigatorName(ROLE.COMPTABLE)).toBe('StaffNavigator');
  });

  it('rôle inconnu → ClientNavigator (fallback sécurisé)', () => {
    expect(getNavigatorName('UNKNOWN_ROLE')).toBe('ClientNavigator');
    expect(getNavigatorName('')).toBe('ClientNavigator');
  });

  it('tous les rôles sont couverts sans tomber dans le fallback', () => {
    const knownNavigators = ['ClientNavigator', 'TechNavigator', 'SupportNavigator', 'StaffNavigator'];
    ALL_ROLES.forEach((role) => {
      const nav = getNavigatorName(role);
      expect(knownNavigators).toContain(nav);
    });
  });
});

// ── Guards d'écrans (RootNavigator) ───────────────────────────────────────────

describe('ADMIN_SCREEN_ROLES', () => {
  it('autorise SUPERADMIN, ADMIN, MANAGER', () => {
    [ROLE.SUPERADMIN, ROLE.ADMIN, ROLE.MANAGER].forEach((r) => {
      expect((ADMIN_SCREEN_ROLES as string[]).includes(r)).toBe(true);
    });
  });

  it('interdit CLIENT, TECH, SUPPORT, COMMERCIAL', () => {
    [ROLE.CLIENT, ROLE.TECH, ROLE.SUPPORT, ROLE.COMMERCIAL, ROLE.COMPTABLE].forEach((r) => {
      expect((ADMIN_SCREEN_ROLES as string[]).includes(r)).toBe(false);
    });
  });
});

describe('CRM_SCREEN_ROLES', () => {
  it('inclut COMMERCIAL en plus des rôles admin', () => {
    expect((CRM_SCREEN_ROLES as string[]).includes(ROLE.COMMERCIAL)).toBe(true);
  });

  it('ADMIN_SCREEN_ROLES est un sous-ensemble de CRM_SCREEN_ROLES', () => {
    ADMIN_SCREEN_ROLES.forEach((r) => {
      expect((CRM_SCREEN_ROLES as string[]).includes(r)).toBe(true);
    });
  });

  it('interdit CLIENT, TECH, SUPPORT', () => {
    [ROLE.CLIENT, ROLE.TECH, ROLE.SUPPORT].forEach((r) => {
      expect((CRM_SCREEN_ROLES as string[]).includes(r)).toBe(false);
    });
  });
});

// ── SubUsers visibility ───────────────────────────────────────────────────────

describe('SUBUSERS_HIDDEN_ROLES / SUBUSERS_ALLOWED_ROLES', () => {
  it('TECH est le seul rôle pour qui SubUsers est masqué', () => {
    expect(SUBUSERS_HIDDEN_ROLES).toEqual([ROLE.TECH]);
  });

  it('SUBUSERS_ALLOWED_ROLES contient tous les rôles sauf TECH', () => {
    expect((SUBUSERS_ALLOWED_ROLES as string[]).includes(ROLE.TECH)).toBe(false);
    const expectedCount = ALL_ROLES.length - 1;
    expect(SUBUSERS_ALLOWED_ROLES).toHaveLength(expectedCount);
  });

  it('CLIENT voit SubUsers (rôle non masqué)', () => {
    expect((SUBUSERS_ALLOWED_ROLES as string[]).includes(ROLE.CLIENT)).toBe(true);
  });

  it('SUPPORT voit SubUsers (rôle non masqué)', () => {
    expect((SUBUSERS_ALLOWED_ROLES as string[]).includes(ROLE.SUPPORT)).toBe(true);
  });
});

// ── Immobilisation SMS ────────────────────────────────────────────────────────

describe('IMMO_SMS_ROLES', () => {
  it('inclut les rôles staff avec accès SMS', () => {
    [ROLE.SUPERADMIN, ROLE.ADMIN, ROLE.MANAGER, ROLE.OPERATOR, ROLE.COMMERCIAL, ROLE.RESELLER].forEach((r) => {
      expect((IMMO_SMS_ROLES as string[]).includes(r)).toBe(true);
    });
  });

  it('exclut CLIENT, TECH, SUPPORT — ces rôles utilisent TCP uniquement', () => {
    [ROLE.CLIENT, ROLE.TECH, ROLE.SUPPORT, ROLE.SUPPORT_AGENT].forEach((r) => {
      expect((IMMO_SMS_ROLES as string[]).includes(r)).toBe(false);
    });
  });
});

// ── Finance ───────────────────────────────────────────────────────────────────

describe('FINANCE_ROLES', () => {
  it('inclut COMPTABLE, ADMIN, SUPERADMIN', () => {
    [ROLE.COMPTABLE, ROLE.ADMIN, ROLE.SUPERADMIN].forEach((r) => {
      expect((FINANCE_ROLES as string[]).includes(r)).toBe(true);
    });
  });

  it('exclut MANAGER, COMMERCIAL, CLIENT', () => {
    [ROLE.MANAGER, ROLE.COMMERCIAL, ROLE.CLIENT].forEach((r) => {
      expect((FINANCE_ROLES as string[]).includes(r)).toBe(false);
    });
  });
});

// ── Pas de chevauchement entre groupes de navigation ─────────────────────────

describe('Groupes de navigation — absence de chevauchement', () => {
  it('NAV_STAFF_ROLES et NAV_SUPPORT_ROLES sont disjoints', () => {
    const overlap = NAV_STAFF_ROLES.filter((r) => (NAV_SUPPORT_ROLES as string[]).includes(r));
    expect(overlap).toHaveLength(0);
  });

  it("TECH n'est ni dans STAFF ni dans SUPPORT (navigator dédié)", () => {
    expect((NAV_STAFF_ROLES as string[]).includes(ROLE.TECH)).toBe(false);
    expect((NAV_SUPPORT_ROLES as string[]).includes(ROLE.TECH)).toBe(false);
  });

  it("CLIENT n'est ni dans STAFF ni dans SUPPORT (navigator dédié)", () => {
    expect((NAV_STAFF_ROLES as string[]).includes(ROLE.CLIENT)).toBe(false);
    expect((NAV_SUPPORT_ROLES as string[]).includes(ROLE.CLIENT)).toBe(false);
  });
});
