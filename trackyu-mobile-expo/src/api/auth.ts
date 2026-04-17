/**
 * TrackYu Mobile - Auth API
 */
import apiClient from './client';
import secureStorage from '../utils/secureStorage';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  avatar?: string;
  tenantId?: string;
  organization?: string;
  permissions: string[];
  // Informations professionnelles (lecture seule — gérées par l'admin)
  matricule?: string;
  departement?: string;
  poste?: string;
  typeContrat?: string;
  dateEmbauche?: string;
}

export interface LoginResponse {
  token: string;
  refreshToken?: string;
  user: User;
}

export const authApi = {
  /**
   * Login with email and password
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>('/auth/login', credentials);

    // Store token, refresh token and user in secure storage (Keystore/Keychain)
    await secureStorage.setToken(response.data.token);
    if (response.data.refreshToken) {
      await secureStorage.setRefreshToken(response.data.refreshToken);
    }
    await secureStorage.setUser(response.data.user);

    // Stocker les credentials chiffrés pour la reconnexion biométrique
    try {
      await secureStorage.setBiometricCredentials(credentials.email, credentials.password);
    } catch {
      // Non bloquant : la biométrie reste optionnelle
    }

    return response.data;
  },

  /**
   * Refresh silencieux — échange le refresh token contre un nouveau couple
   * access token / refresh token (rotation). Stocke automatiquement les
   * nouveaux tokens. Lance une exception si le refresh token est absent ou
   * rejeté par le serveur (→ l'intercepteur déclenchera SessionExpired).
   */
  async refresh(): Promise<string> {
    const refreshToken = await secureStorage.getRefreshToken();
    if (!refreshToken) throw new Error('no_refresh_token');

    // L'appel direct à apiClient éviterait une boucle infinie si le refresh
    // échoue avec 401 (l'intercepteur exclut déjà /auth/refresh).
    const response = await apiClient.post<{ token: string; refreshToken?: string }>('/auth/refresh', { refreshToken });
    await secureStorage.setToken(response.data.token);
    if (response.data.refreshToken) {
      await secureStorage.setRefreshToken(response.data.refreshToken);
    }
    return response.data.token;
  },

  /**
   * Logout - Invalide la session côté serveur puis efface les credentials locaux.
   * L'appel serveur est en best-effort : s'il échoue (réseau, endpoint absent),
   * le logout local s'effectue quand même.
   */
  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Silencieux : le token sera expiré naturellement côté serveur
    }
    await secureStorage.clearAll();
  },

  /**
   * Get stored user from secure storage
   */
  async getStoredUser(): Promise<User | null> {
    return secureStorage.getUser<User>();
  },

  /**
   * Check if user is authenticated (token present in secure storage)
   */
  async isAuthenticated(): Promise<boolean> {
    const token = await secureStorage.getToken();
    return !!token;
  },
};

export default authApi;
