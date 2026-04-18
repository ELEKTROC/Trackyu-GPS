import type { Socket } from 'socket.io-client';
import { io } from 'socket.io-client';
import { WS_BASE_URL } from '../utils/apiConfig';

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
    });

    socket.on('connect_error', () => {
      // Silent — avoid leaking connection error details
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
