/**
 * @jest-environment node
 *
 * Tests du store Zustand authStore.
 * Les dépendances natives et réseau sont toutes mockées :
 *   - authApi  → mock complet des appels API
 *   - secureStorage → mock de react-native-keychain
 *   - queryClient   → mock de QueryClient
 */

// ── Mocks modules natifs (non disponibles en Node.js) ─────────────────────────

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { executionEnvironment: 'standalone', appOwnership: null },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn().mockResolvedValue(undefined),
    removeItem: jest.fn().mockResolvedValue(undefined),
    clear: jest.fn().mockResolvedValue(undefined),
  },
}));

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('../api/auth', () => ({
  authApi: {
    login: jest.fn(),
    logout: jest.fn().mockResolvedValue(undefined),
    getStoredUser: jest.fn().mockResolvedValue(null),
    isAuthenticated: jest.fn().mockResolvedValue(false),
  },
}));

jest.mock('../lib/queryClient', () => ({
  queryClient: { clear: jest.fn() },
}));

// react-native-keychain n'existe pas en env node → on le remplace entièrement
jest.mock('react-native-keychain', () => ({
  setGenericPassword: jest.fn().mockResolvedValue(true),
  getGenericPassword: jest.fn().mockResolvedValue(false),
  resetGenericPassword: jest.fn().mockResolvedValue(true),
}));

// ── Imports ───────────────────────────────────────────────────────────────────

import { useAuthStore } from '../store/authStore';
import { authApi } from '../api/auth';
import { queryClient } from '../lib/queryClient';
import { triggerAuthReset, triggerSessionExpired } from '../utils/authReset';
import type { User } from '../api/auth';

const mockAuthApi = authApi as jest.Mocked<typeof authApi>;
const mockQueryClient = queryClient as unknown as { clear: jest.Mock };

// ── Helpers ───────────────────────────────────────────────────────────────────

const FAKE_USER: User = {
  id: 'u1',
  name: 'Alice Admin',
  email: 'alice@example.com',
  role: 'ADMIN',
  permissions: [],
};

function resetStore() {
  useAuthStore.setState({
    user: null,
    isLoading: false,
    isAuthenticated: false,
    sessionExpired: false,
    error: null,
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  resetStore();
});

describe('authStore — login', () => {
  it('login succès : user, isAuthenticated, no error', async () => {
    mockAuthApi.login.mockResolvedValueOnce({ token: 'jwt-abc', user: FAKE_USER });

    const ok = await useAuthStore.getState().login({ email: 'alice@example.com', password: 'secret' });

    expect(ok).toBe(true);
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user).toEqual(FAKE_USER);
    expect(state.error).toBeNull();
    expect(state.isLoading).toBe(false);
  });

  it('login échec réseau : isAuthenticated false + message erreur par défaut', async () => {
    mockAuthApi.login.mockRejectedValueOnce(new Error('Network Error'));

    const ok = await useAuthStore.getState().login({ email: 'x@x.com', password: 'wrong' });

    expect(ok).toBe(false);
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.error).toMatch(/connexion/i);
  });

  it('login échec API : message serveur utilisé quand disponible', async () => {
    const apiError = Object.assign(new Error('Unauthorized'), {
      response: { data: { message: 'Identifiants invalides' } },
    });
    mockAuthApi.login.mockRejectedValueOnce(apiError);

    await useAuthStore.getState().login({ email: 'x@x.com', password: 'wrong' });

    expect(useAuthStore.getState().error).toBe('Identifiants invalides');
  });

  it('sessionExpired remis à false après login réussi', async () => {
    useAuthStore.setState({ sessionExpired: true });
    mockAuthApi.login.mockResolvedValueOnce({ token: 'jwt-abc', user: FAKE_USER });

    await useAuthStore.getState().login({ email: 'alice@example.com', password: 'secret' });

    expect(useAuthStore.getState().sessionExpired).toBe(false);
  });
});

describe('authStore — logout', () => {
  it('logout vide user, isAuthenticated et queryClient cache', async () => {
    useAuthStore.setState({ user: FAKE_USER, isAuthenticated: true });

    await useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(mockQueryClient.clear).toHaveBeenCalledTimes(1);
  });

  it('logout appelle authApi.logout', async () => {
    await useAuthStore.getState().logout();
    expect(mockAuthApi.logout).toHaveBeenCalledTimes(1);
  });
});

describe('authStore — checkAuth', () => {
  it('token présent + user stocké → isAuthenticated true', async () => {
    mockAuthApi.getStoredUser.mockResolvedValueOnce(FAKE_USER);
    mockAuthApi.isAuthenticated.mockResolvedValueOnce(true);

    await useAuthStore.getState().checkAuth();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user).toEqual(FAKE_USER);
    expect(state.isLoading).toBe(false);
  });

  it('token absent → isAuthenticated false, user null même si user stocké', async () => {
    // Guard : user en cache mais token absent → on n'expose pas le user
    mockAuthApi.getStoredUser.mockResolvedValueOnce(FAKE_USER);
    mockAuthApi.isAuthenticated.mockResolvedValueOnce(false);

    await useAuthStore.getState().checkAuth();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
  });

  it('met isLoading à false dans tous les cas', async () => {
    useAuthStore.setState({ isLoading: true });
    mockAuthApi.getStoredUser.mockResolvedValueOnce(null);
    mockAuthApi.isAuthenticated.mockResolvedValueOnce(false);

    await useAuthStore.getState().checkAuth();

    expect(useAuthStore.getState().isLoading).toBe(false);
  });
});

describe('authStore — updateUser', () => {
  it('merge le patch dans user et persiste', async () => {
    useAuthStore.setState({ user: FAKE_USER });

    await useAuthStore.getState().updateUser({ name: 'Alice Updated', phone: '+33600000000' });

    const updated = useAuthStore.getState().user;
    expect(updated?.name).toBe('Alice Updated');
    expect(updated?.phone).toBe('+33600000000');
    expect(updated?.email).toBe(FAKE_USER.email); // champs non patchés préservés
  });

  it('ne fait rien si user est null', async () => {
    useAuthStore.setState({ user: null });
    // Ne doit pas throw
    await expect(useAuthStore.getState().updateUser({ name: 'Ghost' })).resolves.toBeUndefined();
  });
});

describe('authStore — normalisation des rôles backend', () => {
  it('AGENT_TRACKING normalisé en OPERATOR au login', async () => {
    mockAuthApi.login.mockResolvedValueOnce({
      token: 'jwt-abc',
      user: { ...FAKE_USER, role: 'AGENT_TRACKING' },
    });
    await useAuthStore.getState().login({ email: 'agent@example.com', password: 'secret' });
    expect(useAuthStore.getState().user?.role).toBe('OPERATOR');
  });

  it('RESELLER_ADMIN normalisé en ADMIN au login', async () => {
    mockAuthApi.login.mockResolvedValueOnce({
      token: 'jwt-abc',
      user: { ...FAKE_USER, role: 'RESELLER_ADMIN' },
    });
    await useAuthStore.getState().login({ email: 'reseller@example.com', password: 'secret' });
    expect(useAuthStore.getState().user?.role).toBe('ADMIN');
  });

  it('SOUS_COMPTE normalisé en CLIENT au checkAuth', async () => {
    mockAuthApi.getStoredUser.mockResolvedValueOnce({ ...FAKE_USER, role: 'SOUS_COMPTE' });
    mockAuthApi.isAuthenticated.mockResolvedValueOnce(true);
    await useAuthStore.getState().checkAuth();
    expect(useAuthStore.getState().user?.role).toBe('CLIENT');
  });

  it('rôle canonique (ADMIN) non modifié', async () => {
    mockAuthApi.login.mockResolvedValueOnce({ token: 'jwt-abc', user: FAKE_USER });
    await useAuthStore.getState().login({ email: 'alice@example.com', password: 'secret' });
    expect(useAuthStore.getState().user?.role).toBe('ADMIN');
  });
});

describe('authStore — clearError / dismissSessionExpired', () => {
  it('clearError remet error à null', () => {
    useAuthStore.setState({ error: 'Une erreur' });
    useAuthStore.getState().clearError();
    expect(useAuthStore.getState().error).toBeNull();
  });

  it('dismissSessionExpired remet sessionExpired, isAuthenticated, user', () => {
    useAuthStore.setState({ sessionExpired: true, isAuthenticated: true, user: FAKE_USER });
    useAuthStore.getState().dismissSessionExpired();

    const state = useAuthStore.getState();
    expect(state.sessionExpired).toBe(false);
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
  });
});

describe('authStore — handlers authReset', () => {
  it("triggerAuthReset vide tout le state d'auth", () => {
    useAuthStore.setState({ user: FAKE_USER, isAuthenticated: true, error: 'e', sessionExpired: true });

    triggerAuthReset();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.error).toBeNull();
    expect(state.sessionExpired).toBe(false);
  });

  it('triggerSessionExpired marque sessionExpired et déconnecte', () => {
    useAuthStore.setState({ user: FAKE_USER, isAuthenticated: true });

    triggerSessionExpired();

    const state = useAuthStore.getState();
    expect(state.sessionExpired).toBe(true);
    expect(state.isAuthenticated).toBe(false);
    // user conservé pour pré-remplir l'email de reconnexion
  });
});
