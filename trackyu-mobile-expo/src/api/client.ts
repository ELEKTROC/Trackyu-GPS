/**
 * TrackYu Mobile - API Client
 */
import axios from 'axios';
import secureStorage from '../utils/secureStorage';
import { triggerSessionExpired, attemptTokenRefresh } from '../utils/authReset';
import { checkCircuit, recordSuccess, recordFailure, resetCircuit } from '../utils/circuitBreaker';
import { API_URL } from './config';

export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'x-api-version': '1',
  },
});

// Request interceptor - Add auth token + circuit breaker check
apiClient.interceptors.request.use(
  async (config) => {
    // Circuit breaker : rejette immédiatement si le serveur est connu indisponible
    checkCircuit();

    const token = await secureStorage.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Refresh token — gestion des 401 silencieux ───────────────────────────────
//
// Problème : si 5 requêtes parallèles reçoivent 401 en même temps, on ne
// veut pas lancer 5 refreshs concurrents. Le pattern "queue" résout ça :
//   - La 1ère requête 401 déclenche le refresh et met `_isRefreshing = true`.
//   - Les suivantes s'abonnent via `_refreshSubscribers` et attendent.
//   - Une fois le refresh réussi, toutes les requêtes en attente retentent
//     avec le nouveau token.
//   - En cas d'échec du refresh → SessionExpired pour tous.

let _isRefreshing = false;
type TokenCallback = (newToken: string) => void;
let _refreshSubscribers: TokenCallback[] = [];

function _subscribeRefresh(cb: TokenCallback) {
  _refreshSubscribers.push(cb);
}
function _notifyRefreshSuccess(token: string) {
  _refreshSubscribers.forEach((cb) => cb(token));
  _refreshSubscribers = [];
}
function _notifyRefreshFailure() {
  _refreshSubscribers = [];
}

// Guard anti-doublons : un seul triggerSessionExpired par fenêtre de 5 secondes.
// Évite que des requêtes parallèles génèrent plusieurs modaux de reconnexion.
let _sessionExpiredAt = 0;
const SESSION_EXPIRED_DEBOUNCE_MS = 5_000;

// Response interceptor - Handle auth errors + rate limiting + circuit breaker
apiClient.interceptors.response.use(
  (response) => {
    // Réponse réussie → circuit breaker referme le circuit si besoin
    recordSuccess();
    return response;
  },
  async (error) => {
    const status = error.response?.status;

    // ── Circuit breaker ───────────────────────────────────────────────────────
    // Erreur réseau (pas de response) ou 5xx → incrémente le compteur d'échecs.
    // Les 4xx sont des réponses valides du serveur, on ne les compte pas.
    if (!status || status >= 500) {
      recordFailure();
    }

    // ── 429 Rate Limit — respecter le header Retry-After ─────────────────────
    if (status === 429) {
      const retryAfter = error.response?.headers?.['retry-after'];
      const delayMs = retryAfter
        ? isNaN(Number(retryAfter))
          ? Math.max(0, new Date(retryAfter).getTime() - Date.now())
          : Number(retryAfter) * 1000
        : 5_000; // fallback 5s si header absent

      if (delayMs > 0 && delayMs <= 60_000 && error.config && !error.config.__retried) {
        // Un seul retry automatique si le délai est raisonnable (≤ 60s)
        error.config.__retried = true;
        await new Promise((r) => setTimeout(r, delayMs));
        return apiClient(error.config);
      }
    }

    // ── 401 — tentative de refresh silencieux ────────────────────────────────
    if (status === 401) {
      const url = (error.config?.url as string | undefined) ?? '';

      // /auth/login : mauvais mot de passe → laisser authStore gérer l'erreur.
      // /auth/refresh : refresh expiré → passer directement au SessionExpired.
      const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/refresh');
      if (!isAuthEndpoint && error.config) {
        // ── Requête déjà en attente d'un refresh en cours ──────────────────
        if (_isRefreshing) {
          return new Promise<string>((resolve, reject) => {
            _subscribeRefresh((newToken) => {
              error.config!.headers = error.config!.headers ?? {};
              error.config!.headers.Authorization = `Bearer ${newToken}`;
              resolve(apiClient(error.config!));
            });
          });
        }

        // ── Première requête à recevoir le 401 : lancer le refresh ─────────
        _isRefreshing = true;
        try {
          const newToken = await attemptTokenRefresh();
          _isRefreshing = false;
          recordSuccess(); // refresh réussi = serveur accessible
          _notifyRefreshSuccess(newToken);
          error.config.headers = error.config.headers ?? {};
          error.config.headers.Authorization = `Bearer ${newToken}`;
          return apiClient(error.config);
        } catch {
          // Refresh échoué (token expiré, révoqué, backend absent) → SessionExpired
          _isRefreshing = false;
          _notifyRefreshFailure();
          const now = Date.now();
          if (now - _sessionExpiredAt > SESSION_EXPIRED_DEBOUNCE_MS) {
            _sessionExpiredAt = now;
            triggerSessionExpired();
          }
        }
      } else if (!isAuthEndpoint) {
        // Pas de config pour retry → SessionExpired direct
        const now = Date.now();
        if (now - _sessionExpiredAt > SESSION_EXPIRED_DEBOUNCE_MS) {
          _sessionExpiredAt = now;
          triggerSessionExpired();
        }
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
