/**
 * TrackYu Mobile - Auth Store (Zustand)
 */
import { create } from 'zustand';
import { authApi, type User, type LoginRequest } from '../api/auth';
import { setAuthResetHandler, setSessionExpiredHandler, setRefreshHandler } from '../utils/authReset';
import secureStorage from '../utils/secureStorage';
import { queryClient } from '../lib/queryClient';
import { normalizeRole } from '../constants/roles';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  sessionExpired: boolean;
  error: string | null;

  // Actions
  login: (credentials: LoginRequest) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  updateUser: (patch: Partial<User>) => Promise<void>;
  clearError: () => void;
  dismissSessionExpired: () => void;
}

export const useAuthStore = create<AuthState>((set, _get) => {
  // Hard logout — token complètement invalide
  setAuthResetHandler(() => {
    set({ user: null, isAuthenticated: false, isLoading: false, error: null, sessionExpired: false });
  });

  // Soft reset — JWT expiré, on garde l'email pour pré-remplir la reconnexion
  setSessionExpiredHandler(() => {
    queryClient.clear(); // Vide le cache pour éviter l'affichage de données confidentielles
    set({ sessionExpired: true, isAuthenticated: false });
  });

  // Refresh silencieux — délègue à authApi.refresh() sans créer de dépendance
  // circulaire (client.ts → authReset → authStore → authApi → client.ts).
  setRefreshHandler(() => authApi.refresh());

  return {
    user: null,
    isLoading: true,
    isAuthenticated: false,
    sessionExpired: false,
    error: null,

    login: async (credentials: LoginRequest) => {
      set({ isLoading: true, error: null });
      try {
        const response = await authApi.login(credentials);
        const user = { ...response.user, role: normalizeRole(response.user.role) };
        set({
          user,
          isAuthenticated: true,
          isLoading: false,
          sessionExpired: false,
          error: null,
        });
        return true;
      } catch (error: unknown) {
        const message =
          error instanceof Error && 'response' in error
            ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
            : undefined;
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: message ?? 'Erreur de connexion. Vérifiez votre connexion internet.',
        });
        return false;
      }
    },

    logout: async () => {
      await authApi.logout(); // efface aussi le refreshToken via secureStorage.clearAll()
      // Vider le cache React Query : évite qu'un autre utilisateur sur le
      // même appareil voie brièvement les données de la session précédente.
      queryClient.clear();
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    },

    // Fix race condition : parallel fetch, atomic set
    checkAuth: async () => {
      const [storedUser, isAuthenticated] = await Promise.all([authApi.getStoredUser(), authApi.isAuthenticated()]);
      const user = storedUser ? { ...storedUser, role: normalizeRole(storedUser.role) } : null;
      // Guard: if no valid token, never expose a stale user object
      set({
        user: isAuthenticated ? user : null,
        isAuthenticated,
        isLoading: false,
      });
    },

    updateUser: async (patch: Partial<User>) => {
      const { user } = _get();
      if (!user) return;
      const updated = { ...user, ...patch };
      await secureStorage.setUser(updated);
      set({ user: updated });
    },

    clearError: () => {
      set({ error: null });
    },

    dismissSessionExpired: () => {
      set({ sessionExpired: false, user: null, isAuthenticated: false });
    },
  };
});

export default useAuthStore;
