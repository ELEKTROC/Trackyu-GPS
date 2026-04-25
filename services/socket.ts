import type { Socket } from 'socket.io-client';
import { io } from 'socket.io-client';
import { API_URL } from './api/client';
import { WS_BASE_URL } from '../utils/apiConfig';
import { logger } from '../utils/logger';

// URL dynamique selon l'environnement (supporte web et mobile Capacitor)
const getSocketUrl = (): string => {
  // Mobile Capacitor : utiliser URL absolue depuis apiConfig
  if (WS_BASE_URL) {
    return WS_BASE_URL;
  }
  // Web production : utiliser même origine (nginx proxie /socket.io vers backend)
  if (import.meta.env.PROD) {
    return window.location.origin;
  }
  // Développement local
  return import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';
};

const SOCKET_URL = getSocketUrl();

let socket: Socket;

export const initSocket = (token?: string) => {
  const authToken = token || localStorage.getItem('fleet_token') || localStorage.getItem('token');

  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: false,
      path: '/socket.io',
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
      // Phase 2 chantier socket-stability — envoie les cookies httpOnly avec
      // l'upgrade WebSocket (l'access_token est en cookie côté HTTP) +
      // timeout connect plus long pour réseaux lents.
      withCredentials: true,
      timeout: 20000,
    });

    // Refresh HTTP cookie httpOnly access_token si invalide (le cookie
    // expire en 15 min, fetchWithRefresh ne s'active que sur 401 HTTP, jamais
    // côté socket). Tente un POST /auth/refresh pour obtenir un cookie frais
    // puis retry le connect.
    let isRefreshing = false;
    const refreshAndRetry = async () => {
      if (isRefreshing) return;
      isRefreshing = true;
      try {
        const r = await fetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        });
        if (r.ok) {
          logger.info('[Socket] cookie refreshed, retrying connect');
          setTimeout(() => socket.connect(), 300);
        } else {
          logger.warn(`[Socket] refresh failed (HTTP ${r.status}), user must re-login`);
        }
      } catch (e) {
        logger.warn(`[Socket] refresh error: ${(e as Error).message}`);
      } finally {
        isRefreshing = false;
      }
    };

    socket.on('connect_error', (err) => {
      logger.warn(`[Socket] connect_error: ${err.message}`);
      if (err.message === 'Invalid token' || err.message === 'Authentication required') {
        refreshAndRetry();
      }
    });

    // Diagnostic — capture la raison de chaque disconnect pour faciliter
    // l'analyse des "Actualisation suspendue" pré-existantes en prod.
    socket.on('disconnect', (reason) => {
      logger.warn(`[Socket] disconnected: ${reason}`);
      // 'io server disconnect' = serveur a fermé volontairement (souvent
      // token rejeté). Tente un refresh HTTP puis reconnect.
      if (reason === 'io server disconnect') {
        refreshAndRetry();
      }
    });

    // Refresh auth token on each reconnect attempt so stale JWTs don't block re-auth
    socket.io.on('reconnect_attempt', () => {
      const freshToken = localStorage.getItem('fleet_token') || localStorage.getItem('token');
      if (freshToken) socket.auth = { token: freshToken };
    });
  }

  if (authToken) {
    socket.auth = { token: authToken };
    if (!socket.connected) {
      socket.connect();
    }
  }

  return socket;
};

export const getSocket = () => {
  if (!socket) {
    return initSocket();
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
  }
};
