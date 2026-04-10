/**
 * API Configuration for Capacitor mobile app and web
 * Detects if running in Capacitor WebView and uses absolute URL
 */

// Detect if running in Capacitor WebView
// Capacitor uses https://localhost when androidScheme is 'https'
const isCapacitorApp = typeof window !== 'undefined' && (
  window.location.protocol === 'capacitor:' ||
  window.location.protocol === 'file:' ||
  // On real mobile devices, hostname might be localhost but port is usually empty or 80/443
  // On Vite Dev, port is 5173. We want to avoid production URL on Vite Dev.
  (window.location.hostname === 'localhost' && window.location.port !== '5173' && window.location.port !== '5174') ||
  // @ts-expect-error - Capacitor injects this on native
  window.Capacitor?.isNativePlatform?.() === true ||
  !!(window as any).Capacitor
);

// Always use absolute URL on mobile app, relative on web
export const API_BASE_URL = isCapacitorApp
  ? 'https://trackyugps.com/api'
  : (import.meta.env.VITE_API_URL || '/api');

// WebSocket URL for Socket.IO
export const WS_BASE_URL = isCapacitorApp
  ? 'https://trackyugps.com'
  : '';


export default API_BASE_URL;
