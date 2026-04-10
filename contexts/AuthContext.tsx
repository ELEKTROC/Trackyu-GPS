import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Permission, User } from '../types';
import { API_BASE_URL } from '../utils/apiConfig';
import { pushNotificationService } from '../services/pushNotificationService';
import { logger } from '../utils/logger';
import { getSocket } from '../services/socket';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
  requirePasswordChange: boolean;
  changePassword: (currentPassword: string | null, newPassword: string) => Promise<void>;
  hasPermission: (permission: Permission) => boolean;
  updateProfile: (data: Partial<User>) => void;
  impersonate: (tenantId: string, resellerId?: string) => void;
  stopImpersonation: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Permission definitions — synchronisé avec les profils mobiles validés
const ROLE_DEFINITIONS: Record<string, Permission[]> = {
  SUPERADMIN: [
    'VIEW_DASHBOARD',
    'VIEW_MAP',
    'VIEW_FLEET',
    'VIEW_REPORTS',
    'VIEW_CRM',
    'MANAGE_LEADS',
    'MANAGE_CLIENTS',
    'MANAGE_CONTRACTS',
    'VIEW_FINANCE',
    'MANAGE_INVOICES',
    'VIEW_PAYMENTS',
    'APPROVE_PAYMENTS',
    'VIEW_TECH',
    'MANAGE_INTERVENTIONS',
    'MANAGE_STOCK',
    'MANAGE_DEVICES',
    'VIEW_SUPPORT',
    'MANAGE_TICKETS',
    'VIEW_ADMIN',
    'MANAGE_USERS',
    'MANAGE_ROLES',
    'VIEW_LOGS',
    'MANAGE_TENANTS',
    'MANAGE_SETTINGS',
    'MANAGE_FAQ',
    'VIEW_ALERTS',
    'MANAGE_ALERTS',
    'MANAGE_FLEET',
  ],
  ADMIN: [
    'VIEW_DASHBOARD',
    'VIEW_MAP',
    'VIEW_FLEET',
    'VIEW_REPORTS',
    'VIEW_CRM',
    'MANAGE_LEADS',
    'MANAGE_CLIENTS',
    'MANAGE_CONTRACTS',
    'VIEW_FINANCE',
    'MANAGE_INVOICES',
    'VIEW_PAYMENTS',
    'APPROVE_PAYMENTS',
    'VIEW_TECH',
    'MANAGE_INTERVENTIONS',
    'MANAGE_STOCK',
    'MANAGE_DEVICES',
    'VIEW_SUPPORT',
    'MANAGE_TICKETS',
    'VIEW_ADMIN',
    'MANAGE_USERS',
    'MANAGE_ROLES',
    'VIEW_ALERTS',
    'MANAGE_ALERTS',
    'MANAGE_FLEET',
    'MANAGE_SETTINGS',
  ],
  RESELLER_ADMIN: [
    'VIEW_DASHBOARD',
    'VIEW_MAP',
    'VIEW_FLEET',
    'VIEW_REPORTS',
    'VIEW_CRM',
    'MANAGE_LEADS',
    'MANAGE_CLIENTS',
    'MANAGE_CONTRACTS',
    'VIEW_FINANCE',
    'MANAGE_INVOICES',
    'VIEW_PAYMENTS',
    'APPROVE_PAYMENTS',
    'VIEW_TECH',
    'MANAGE_INTERVENTIONS',
    'MANAGE_STOCK',
    'MANAGE_DEVICES',
    'VIEW_SUPPORT',
    'MANAGE_TICKETS',
    'VIEW_ADMIN',
    'MANAGE_USERS',
    'VIEW_ALERTS',
    'MANAGE_ALERTS',
    'MANAGE_FLEET',
  ],
  MANAGER: [
    'VIEW_DASHBOARD',
    'VIEW_MAP',
    'VIEW_FLEET',
    'VIEW_REPORTS',
    'VIEW_CRM',
    'MANAGE_LEADS',
    'MANAGE_CLIENTS',
    'MANAGE_CONTRACTS',
    'VIEW_FINANCE',
    'VIEW_PAYMENTS',
    'APPROVE_PAYMENTS',
    'VIEW_TECH',
    'MANAGE_INTERVENTIONS',
    'VIEW_SUPPORT',
    'MANAGE_TICKETS',
    'VIEW_ALERTS',
    'MANAGE_FLEET',
  ],
  CLIENT: ['VIEW_DASHBOARD', 'VIEW_MAP', 'VIEW_FLEET', 'VIEW_REPORTS'],
  SOUS_COMPTE: ['VIEW_DASHBOARD', 'VIEW_MAP', 'VIEW_FLEET', 'VIEW_REPORTS'],
  TECH: [
    'VIEW_DASHBOARD',
    'VIEW_MAP',
    'VIEW_FLEET',
    'VIEW_TECH',
    'MANAGE_INTERVENTIONS',
    'MANAGE_STOCK',
    'MANAGE_DEVICES',
    'VIEW_ALERTS',
  ],
  AGENT_TRACKING: [
    'VIEW_DASHBOARD',
    'VIEW_MAP',
    'VIEW_FLEET',
    'VIEW_REPORTS',
    'VIEW_TECH',
    'MANAGE_DEVICES',
    'VIEW_SUPPORT',
    'MANAGE_TICKETS',
    'VIEW_ALERTS',
    'MANAGE_FLEET',
  ],
  COMMERCIAL: [
    'VIEW_DASHBOARD',
    'VIEW_MAP',
    'VIEW_FLEET',
    'VIEW_REPORTS',
    'VIEW_CRM',
    'MANAGE_LEADS',
    'MANAGE_CLIENTS',
    'MANAGE_CONTRACTS',
    'VIEW_FINANCE',
    'MANAGE_INVOICES',
    'VIEW_TECH',
    'MANAGE_INTERVENTIONS',
    'VIEW_SUPPORT',
    'MANAGE_TICKETS',
  ],
  SALES: [
    'VIEW_DASHBOARD',
    'VIEW_MAP',
    'VIEW_FLEET',
    'VIEW_REPORTS',
    'VIEW_CRM',
    'MANAGE_LEADS',
    'MANAGE_CLIENTS',
    'MANAGE_CONTRACTS',
    'VIEW_FINANCE',
    'MANAGE_INVOICES',
    'VIEW_TECH',
    'MANAGE_INTERVENTIONS',
    'VIEW_SUPPORT',
    'MANAGE_TICKETS',
  ],
  COMPTABLE: [
    'VIEW_DASHBOARD',
    'VIEW_REPORTS',
    'VIEW_FINANCE',
    'MANAGE_INVOICES',
    'VIEW_PAYMENTS',
    'APPROVE_PAYMENTS',
    'VIEW_CRM',
    'MANAGE_CLIENTS',
    'VIEW_FLEET',
    'VIEW_TECH',
    'MANAGE_STOCK',
    'VIEW_SUPPORT',
    'MANAGE_TICKETS',
  ],
  SUPPORT_AGENT: [
    'VIEW_DASHBOARD',
    'VIEW_MAP',
    'VIEW_FLEET',
    'VIEW_REPORTS',
    'VIEW_SUPPORT',
    'MANAGE_TICKETS',
    'MANAGE_CLIENTS',
    'VIEW_CRM',
    'VIEW_TECH',
    'MANAGE_INTERVENTIONS',
    'MANAGE_STOCK',
  ],
  // Legacy — conservé pour compatibilité
  USER: ['VIEW_DASHBOARD', 'VIEW_MAP', 'VIEW_FLEET', 'VIEW_REPORTS'],
  CLIENT_ADMIN: ['VIEW_DASHBOARD', 'VIEW_MAP', 'VIEW_FLEET', 'VIEW_REPORTS', 'VIEW_SUPPORT', 'VIEW_FINANCE'],
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [originalUser, setOriginalUser] = useState<User | null>(null); // For impersonation
  const [isLoading, setIsLoading] = useState(true);
  const [requirePasswordChange, setRequirePasswordChange] = useState(false);

  const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

  // --- SESSION TIMEOUT ---
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (user) {
        // 30 minutes timeout
        timeoutId = setTimeout(
          () => {
            logger.debug('Session timeout - Auto logout');
            logout();
          },
          30 * 60 * 1000
        );
      }
    };

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    const handleActivity = () => resetTimer();

    if (user) {
      events.forEach((event) => document.addEventListener(event, handleActivity));
      resetTimer(); // Start timer
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach((event) => document.removeEventListener(event, handleActivity));
    };
  }, [user]);

  useEffect(() => {
    const storedUser = localStorage.getItem('fleet_user');

    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        // Restauration optimiste : l'access_token httpOnly cookie valide la session
        // Le premier appel API échouera (401) si le cookie est expiré → refresh automatique
        setUser(parsedUser);
      } catch (e) {
        logger.error('Session read error', e);
        localStorage.removeItem('fleet_user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    // Helper for mock login - utilise des variables d'environnement pour la sécurité
    const performMockLogin = async () => {
      const demoEmail = import.meta.env.VITE_DEMO_EMAIL;
      const demoPassword = import.meta.env.VITE_DEMO_PASSWORD;

      // Vérifier que les credentials de démo sont configurés
      if (!demoEmail || !demoPassword) {
        throw new Error('Mode démo non configuré');
      }

      if (email === demoEmail && password === demoPassword) {
        const mockUser: User = {
          id: 'USR-001',
          name: 'Demo Admin',
          email: email,
          role: 'Superadmin',
          avatar: 'https://i.pravatar.cc/150?u=thomas',
          permissions: ROLE_DEFINITIONS.SUPERADMIN,
        };
        setUser(mockUser);
        localStorage.setItem('fleet_user', JSON.stringify(mockUser));
        return;
      }
      throw new Error('Identifiants invalides');
    };

    if (USE_MOCK) {
      await performMockLogin();
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Required for httpOnly refresh token cookie
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        if (errorData) {
          const msg = errorData.message || 'Erreur inconnue';
          const detail = errorData.error ? ` (${errorData.error})` : '';
          throw new Error(`${msg}${detail}`);
        }
        throw new Error(`Erreur de connexion (${response.status})`);
      }

      const data = await response.json();
      const { user: apiUser } = data; // token n'est plus dans le corps — httpOnly cookie uniquement

      // Normalize role lookup (Handle 'Superadmin' vs 'SUPERADMIN')
      let roleKey = apiUser.role ? apiUser.role.toUpperCase() : '';

      // Fix for DB inconsistency (SUPER_ADMIN vs SUPERADMIN)
      if (roleKey === 'SUPER_ADMIN') roleKey = 'SUPERADMIN';

      // FIX: Check if permissions array is empty OR undefined, fallback to role-based permissions
      const apiPermissions = apiUser.permissions;
      const hasValidPermissions = Array.isArray(apiPermissions) && apiPermissions.length > 0;
      const effectivePermissions = hasValidPermissions ? apiPermissions : ROLE_DEFINITIONS[roleKey] || [];

      // Log seulement en mode développement
      if (import.meta.env.DEV) {
        logger.debug(`Login: Role=${apiUser.role}, Perms=${effectivePermissions.length}`);
      }

      // Map API user to Frontend User structure
      const mappedUser: User = {
        id: apiUser.id,
        name: apiUser.name,
        email: apiUser.email,
        role: apiUser.role,
        avatar: apiUser.avatar || 'https://i.pravatar.cc/150?u=default',
        tenantId: apiUser.tenant_id,
        permissions: effectivePermissions,
        mobileTabs: apiUser.mobileTabs || undefined,
        clientId: apiUser.client_id || undefined,
        branchId: apiUser.branch_id || undefined,
        vehicleIds: Array.isArray(apiUser.vehicle_ids) ? apiUser.vehicle_ids : undefined,
        allVehicles: apiUser.all_vehicles ?? undefined,
      };

      setUser(mappedUser);
      localStorage.setItem('fleet_user', JSON.stringify(mappedUser));
      setRequirePasswordChange(!!apiUser.requirePasswordChange);

      // Initialiser les notifications push après login réussi
      try {
        await pushNotificationService.initialize();
      } catch (error) {
        logger.warn("Impossible d'initialiser les notifications push:", error);
        // Non-bloquant : l'utilisateur peut continuer même si les notifs échouent
      }
    } catch (err) {
      logger.error('API Login failed', err);
      throw err;
    }
  };

  const changePassword = async (currentPassword: string | null, newPassword: string) => {
    const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
      method: 'POST',
      credentials: 'include', // access_token httpOnly cookie
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Erreur lors du changement de mot de passe');
    }
    setRequirePasswordChange(false);
  };

  const logout = () => {
    // Désinscrire les notifications push
    pushNotificationService.unregister().catch((err) => {
      logger.warn('Erreur désinscription push:', err);
    });

    // Revoke refresh token on server (non-blocking)
    if (!USE_MOCK) {
      fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      }).catch((err) => logger.warn('Erreur logout côté serveur:', err));
    }

    setUser(null);
    setOriginalUser(null);
    localStorage.removeItem('fleet_user');
    localStorage.removeItem('impersonate_tenant_id');
    localStorage.removeItem('impersonate_reseller_id');
    localStorage.removeItem('impersonate_expiry');
  };

  // Écoute les mises à jour de permissions en temps réel (P3)
  useEffect(() => {
    if (!user || USE_MOCK) return;
    const socket = getSocket();

    const handleRoleUpdate = async (data: { roleName: string }) => {
      if (data.roleName?.toUpperCase() !== user.role?.toUpperCase()) return;
      try {
        const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        });
        if (!res.ok) return;
        const { user: fresh } = await res.json();
        const updated: User = { ...user, permissions: fresh.permissions || [], mobileTabs: fresh.mobileTabs };
        setUser(updated);
        localStorage.setItem('fleet_user', JSON.stringify(updated));
        logger.info('[Auth] Permissions rechargées suite à mise à jour du rôle:', data.roleName);
      } catch (err) {
        logger.warn('[Auth] Impossible de recharger les permissions:', err);
      }
    };

    socket.on('role:permissions_updated', handleRoleUpdate);
    return () => {
      socket.off('role:permissions_updated', handleRoleUpdate);
    };
  }, [user?.role, USE_MOCK]);

  const hasPermission = (permission: Permission): boolean => {
    if (!user) return false;
    return user.permissions.includes(permission);
  };

  const updateProfile = (data: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...data };
      setUser(updatedUser);
      localStorage.setItem('fleet_user', JSON.stringify(updatedUser));
    }
  };

  const impersonate = (tenantId: string, resellerId?: string) => {
    if (!user) return;

    // Only SUPERADMIN can impersonate
    const normalizedRole = user.role?.toUpperCase().replace('_', '');
    if (normalizedRole !== 'SUPERADMIN') {
      logger.error('[Auth] Unauthorized impersonation attempt by role:', user.role);
      return;
    }

    // Prevent nested impersonation
    if (originalUser) return;

    setOriginalUser(user);

    const impersonatedUser: User = {
      ...user,
      tenantId: tenantId,
      resellerId: resellerId,
      role: `Impersonating ${resellerId || tenantId}`,
      permissions: ROLE_DEFINITIONS.RESELLER_ADMIN,
    };

    setUser(impersonatedUser);
    // Store impersonation context with expiry (1 hour)
    const expiry = Date.now() + 60 * 60 * 1000;
    localStorage.setItem('impersonate_tenant_id', tenantId);
    localStorage.setItem('impersonate_expiry', String(expiry));
    if (resellerId) {
      localStorage.setItem('impersonate_reseller_id', resellerId);
    }
  };

  const stopImpersonation = () => {
    if (originalUser) {
      setUser(originalUser);
      setOriginalUser(null);
      localStorage.removeItem('impersonate_tenant_id');
      localStorage.removeItem('impersonate_reseller_id');
      localStorage.removeItem('impersonate_expiry');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isAuthenticated: !!user,
        isLoading,
        requirePasswordChange,
        changePassword,
        hasPermission,
        updateProfile,
        impersonate,
        stopImpersonation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
