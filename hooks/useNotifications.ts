import { useState, useEffect, useCallback, useRef } from 'react';
import { logger } from '../utils/logger';
import { api } from '../services/apiLazy';

// ============================================================
// TrackYu GPS - useNotifications Hook
// Gère les notifications push, sons, vibrations et badges
// ============================================================

export interface NotificationPreferences {
  pushEnabled: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  soundVolume: number; // 0-100
  ticketMessagesEnabled: boolean;
  alertTypes: {
    SPEEDING: boolean;
    GEOFENCE: boolean;
    FUEL_LEVEL: boolean;
    FUEL_THEFT: boolean;
    MAINTENANCE: boolean;
    SOS: boolean;
    HARSH_DRIVING: boolean;
    IDLING: boolean;
    BATTERY: boolean;
    POWER: boolean;
    TOWING: boolean;
    OFFLINE: boolean;
    JAMMING: boolean;
  };
}

type AlertTypeGroup = keyof NotificationPreferences['alertTypes'];

const ALERT_TYPE_TO_GROUP: Record<string, AlertTypeGroup> = {
  SPEEDING: 'SPEEDING',
  GEOFENCE: 'GEOFENCE',
  FUEL_LEVEL: 'FUEL_LEVEL',
  FUEL_THEFT: 'FUEL_THEFT',
  FUEL_SUSPECT_LOSS: 'FUEL_THEFT',
  MAINTENANCE: 'MAINTENANCE',
  RULE_VIOLATION: 'MAINTENANCE',
  SOS: 'SOS',
  CRASH: 'SOS',
  TAMPERING: 'SOS',
  IMMOBILIZATION: 'SOS',
  HARSH_BRAKING: 'HARSH_DRIVING',
  HARSH_ACCEL: 'HARSH_DRIVING',
  SHARP_TURN: 'HARSH_DRIVING',
  IDLING: 'IDLING',
  LONG_IDLE: 'IDLING',
  BATTERY: 'BATTERY',
  BATTERY_LOW: 'BATTERY',
  POWER_CUT: 'POWER',
  IGNITION: 'POWER',
  TOWING: 'TOWING',
  OFFLINE: 'OFFLINE',
  COMMUNICATION_LOST: 'OFFLINE',
  JAMMING: 'JAMMING',
  GPS_JUMP: 'JAMMING',
};

export interface NotificationPayload {
  id?: string | number;
  title: string;
  body: string;
  type?: string;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  vehicleId?: string;
  vehicleName?: string;
  link?: string;
  data?: Record<string, any>;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  pushEnabled: true,
  soundEnabled: true,
  vibrationEnabled: true,
  soundVolume: 70,
  ticketMessagesEnabled: true,
  alertTypes: {
    SPEEDING: true,
    GEOFENCE: true,
    FUEL_LEVEL: true,
    FUEL_THEFT: true,
    MAINTENANCE: true,
    SOS: true,
    HARSH_DRIVING: true,
    IDLING: true,
    BATTERY: true,
    POWER: true,
    TOWING: true,
    OFFLINE: true,
    JAMMING: true,
  },
};

const STORAGE_KEY_PREFIX = 'trackyu_notification_prefs';

const getStorageKey = (): string => {
  try {
    const raw = localStorage.getItem('fleet_user');
    if (!raw) return STORAGE_KEY_PREFIX;
    const u = JSON.parse(raw);
    return u?.id ? `${STORAGE_KEY_PREFIX}_${u.id}` : STORAGE_KEY_PREFIX;
  } catch {
    return STORAGE_KEY_PREFIX;
  }
};

// Sons d'alerte (base64 beep court)
const ALERT_SOUNDS = {
  LOW: '/sounds/notification-low.mp3',
  MEDIUM: '/sounds/notification-medium.mp3',
  HIGH: '/sounds/notification-high.mp3',
  CRITICAL: '/sounds/notification-critical.mp3',
  DEFAULT:
    'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodHMsHs0HkuD0ereyJFPKDCA1fDk0K5uPjN/0e7f0rJ9RDl/0e3c0LKBSz160e3b0LSETkN10e7c0bSFUkdv0u/e07WHVklq0fDg1riKWUtl0fLj2ruNXE1g0vPm3b2PX1Bc0/To38CSYlFX1PXr4cOUZVNT1fbv48aXaFVP1fny58maa1hM1vr158ydbltI1/z46M+gcF1E2P375dKjc2BB2f/84tSmdn8+2wD/4NeoeoE72gD/39SrfYM42f/+3dKugYU12P793dCwhog02P793c+wh4o02P793c6vh4s12P793c6vh4s22P793c2uhow42P793cythYs52P793cythos82P793cythos+2P793c2thYtB2f/+3c6uhoxE2f/+3dCwhY1I2v//3dGxhI5M3AD/3tOzg5BQ3gH/4NW1gpNV3wL/4te3gJZa4QL/5Nm6fp1g4gP/5ty9fKFl4gP/6N++e6Rq4gP/6uHBebBw4QT/7eTEd7l34AT/8OfGdr1+3wX/8+rJc8GF3gb/9ezLccaM3Qf/9+/NbsyT2wj/+fHPbNGa2Qr/+vPQadac1wz/+vTRZ9qj1A7/+/XSZd6pzxH/+/XSY+KwyhT/+/XSYea2xhj/+/XSYOnAwhv/+vTRYOzGvh7/+vPQX+/Luh//+fHOXvLQuBz/+O/MXfTUs///+O7LXPbYsP/38+rHW/ndqvr08OfFWvnhpPXv7OTDWvjjn/Lq6eDAWvfmm+7k5d29Wvbom+rh4dq6Wvbqmufb3de4Wvbsmeba2dS2Wvfsn+LX1tG0Wvfun+DU0s6zWvfwoN/R0MqxWvfyod3Ozsiwb/byot7Lzsawb/fzpN/I08Wub/f0pd7G0cOsb/f1pt/D0cCrb/f2qN/B0L6pb/f2qeDAwL2ob/f3q+G+wLunb/f4rOK9v7qmb/f4reO8v7mlb/f5ruO7v7ikb/f5r+S6v7ejb/f6sOS5v7aib/b6seW4vrWhb/b6suW3vrSgb/b7s+a2vbOfb/b7tOa1vLKeb/b7tea0vLGdb/b7t+ezvLCcb/b7uOeyu7Cbb/b7uuiyu6+ab/b7u+ixu66Zb/b7vOmwuq2Yb/b7vemvuqyXb/X7vumvuauWb/X8v+muuaqVb/X8wOmtuamUb/X8wemtuaiTb/X8wumsuKeScPX8xOqrt6aSb/X8xeqrt6WRb/X8x+urt6SQb/X8yOutt6OPb/X8y+ytt6KOb/X9zeystaGNb/X90O2ttaCMb/X90+6stZ+LcPX91e6stJ6Kb/X92O+ss52Jb/X92/CssZyIb/X93/GssJuHb/X+4fKrr5qGb/X+5POrr5mFb/X+5/SrrpiFb/X+6vWqrpeDcPX+7faqrZaCb/X+8Peqq5WBb/X+8/ipq5R/b/X+9fmqq5N+b/b/+Pqpq5J9b/b/+/upqpF8b/b//vyoqZB7b/cA/v2oqY96b/cA/v6nqI55b/cB/v+nqI14b/cB//+mqI12b/cC//+mqY11b/cC//+mqo50b/cC//+nqo1zb/cC//+nqoxzbvcC//+nqotybvcD//+nqopxbvcD//+nqolwbvcD//+nqohvbvcD//+oqYhubvcD//+pqYhtbfcE//+qqYhsbPcE//+sqYdrbPcE//+sqYdqa/cE//+sqIdpavgE//+sqYdoafgF//+tqIZnaPgF//+uqIZmZ/gF//+vqIVlZvgF//+wqIVkZfkF//+wqIRkZPkF//+xqIRjY/kG//+yqINiYvkG//+zp4NhYfkG//+0p4NgX/kH//+1p4JfXvkH//+2poFeXfkH//+3poFdXPkH//+4poFcW/oH//+5pYBbWvoI//+6pX9aWfoI//+7pH9ZV/oI//+8pH5YVvoI//+9pH1XV/oI//++o31WVfoJ//+/o3xVVPoJ//+/onxTU/oJ//+/o3tTUvsJ//++o3pSUPsK//++onpQT/sK//+9onlPTvsK//+9oXhOTfsK//+8oXdNTPsL//+8oHZMSvsL//+7oHVLSfsL//+6n3VKSPsL//+5nnRJRvsL//+4nnNIRfwL//+3nXNGRPwL//+2nHJFQ/wM//+1nHFEQvwM//+0m29DP/0M//+zm25CPf0M//+ymm0/PP0M//+xmWw+Ov0N//+wmGs9OP0N//+vl2o8N/0N//+ulWg6Nf0N//+tlGc5M/0O//+rkmc3Mf0O//+qkWU2L/4O//+okGQzLf4O//+mj2IxK/4P//+ljGAwKf4P//+ki18uJ/4P//+iiV0sJf8P//+ghVopIv8P//+dfFcnH/8Q//+adFUkHP8Q//+WbFIhGP8R//+SZE4eE/8R//+MWEoZD/8R//+GS0YUCf8S//9/PkAO//////',
};

export const useNotifications = () => {
  const [preferences, setPreferences] = useState<NotificationPreferences>(() => {
    try {
      const saved = localStorage.getItem(getStorageKey());
      const parsed = saved ? JSON.parse(saved) : null;
      return parsed
        ? {
            ...DEFAULT_PREFERENCES,
            ...parsed,
            alertTypes: { ...DEFAULT_PREFERENCES.alertTypes, ...(parsed.alertTypes || {}) },
          }
        : DEFAULT_PREFERENCES;
    } catch {
      return DEFAULT_PREFERENCES;
    }
  });

  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [syncError, setSyncError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    localStorage.setItem(getStorageKey(), JSON.stringify(preferences));
  }, [preferences]);

  // Initialiser le Service Worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          logger.debug('[Notifications] SW registered:', registration.scope);
          setSwRegistration(registration);
        })
        .catch((err) => {
          logger.error('[Notifications] SW registration failed:', err);
        });
    }

    // Vérifier la permission actuelle
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }

    // Charger les préférences du backend
    const fetchPrefs = async () => {
      try {
        const data = await api.notifications.getPreferences();
        if (data && typeof data === 'object') {
          setPreferences((prev) => ({
            ...prev,
            ...data,
            alertTypes: { ...prev.alertTypes, ...(data.alertTypes || {}) },
          }));
        }
      } catch (err) {
        logger.warn('[Notifications] Backend prefs not available, using local:', err);
      }
    };
    fetchPrefs();
  }, []);

  // Mettre à jour le badge
  useEffect(() => {
    if ('setAppBadge' in navigator) {
      if (unreadCount > 0) {
        (navigator as any).setAppBadge(unreadCount);
      } else {
        (navigator as any).clearAppBadge?.();
      }
    }
  }, [unreadCount]);

  // Demander la permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!('Notification' in window)) return false;
    try {
      const status = await Notification.requestPermission();
      setPermission(status);
      return status === 'granted';
    } catch (err) {
      logger.error('[Notifications] Permission request failed:', err);
      return false;
    }
  }, []);

  // Jouer un son
  const playSound = useCallback(
    async (severity: string = 'DEFAULT') => {
      if (!preferences.soundEnabled) return;

      try {
        const soundUrl = ALERT_SOUNDS[severity as keyof typeof ALERT_SOUNDS] || ALERT_SOUNDS.DEFAULT;

        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.src = '';
        }

        const audio = new Audio(soundUrl);
        audio.volume = Math.max(0, Math.min(1, preferences.soundVolume / 100));
        audioRef.current = audio;
        await audio.play();
      } catch (err) {
        logger.error('[Notifications] Sound error:', err);
      }
    },
    [preferences.soundEnabled, preferences.soundVolume]
  );

  // Vibrer
  const vibrate = useCallback(
    (pattern: number | number[] = [200, 100, 200]) => {
      if (!preferences.vibrationEnabled) return;
      if (!('vibrate' in navigator)) return;

      try {
        navigator.vibrate(pattern);
      } catch (err) {
        logger.warn('[Notifications] Vibration failed:', err);
      }
    },
    [preferences.vibrationEnabled]
  );

  // Envoyer une notification
  const showNotification = useCallback(
    async (payload: NotificationPayload) => {
      const { title, body, type, severity = 'MEDIUM', vehicleName, data } = payload;

      if (type) {
        const group = ALERT_TYPE_TO_GROUP[type];
        if (group && preferences.alertTypes[group] === false) {
          logger.debug(`[Notifications] Type ${type} (group ${group}) is disabled`);
          return;
        }
      }

      // Jouer son + vibration
      playSound(severity);

      const vibrationPattern =
        severity === 'CRITICAL' ? [200, 100, 200, 100, 200] : severity === 'HIGH' ? [200, 100, 200] : [100];
      vibrate(vibrationPattern);

      if (permission === 'granted' && preferences.pushEnabled) {
        const notifBody = vehicleName ? `${vehicleName}: ${body}` : body;
        const options: NotificationOptions = {
          body: notifBody,
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          tag: payload.id ? String(payload.id) : undefined,
          data: { ...data, type, severity, vehicleName, link: payload.link },
        };

        try {
          if (swRegistration) {
            swRegistration
              .showNotification(title, options)
              .catch((err) => logger.warn('[Notifications] SW push failed', err));
          } else {
            new Notification(title, options);
          }
        } catch (err) {
          logger.warn('[Notifications] Push failed', err);
        }
      }

      // Incrémenter le compteur
      setUnreadCount((c) => c + 1);
    },
    [permission, preferences, playSound, vibrate]
  );

  const syncPrefs = (next: NotificationPreferences) => {
    api.notifications
      .updatePreferences(next)
      .then(() => setSyncError(null))
      .catch((err) => {
        logger.error('[Notifications] Failed to sync preferences:', err);
        setSyncError(err?.message || 'Erreur de synchronisation des préférences');
      });
  };

  const updatePreferences = useCallback(async (updates: Partial<NotificationPreferences>) => {
    setPreferences((prev) => {
      const next = { ...prev, ...updates };
      syncPrefs(next);
      return next;
    });
  }, []);

  const toggleAlertType = useCallback((type: keyof NotificationPreferences['alertTypes']) => {
    setPreferences((prev) => {
      const next = {
        ...prev,
        alertTypes: { ...prev.alertTypes, [type]: !prev.alertTypes[type] },
      };
      syncPrefs(next);
      return next;
    });
  }, []);

  const clearSyncError = useCallback(() => setSyncError(null), []);

  // Réinitialiser le compteur
  const clearUnreadCount = useCallback(() => {
    setUnreadCount(0);
  }, []);

  // Marquer comme lu (décrémente le compteur)
  const markAsRead = useCallback((count: number = 1) => {
    setUnreadCount((prev) => Math.max(0, prev - count));
  }, []);

  return {
    permission,
    preferences,
    unreadCount,
    syncError,
    isSupported: true,
    isPushSupported: true,

    requestPermission,
    showNotification,
    playSound,
    vibrate,
    updatePreferences,
    toggleAlertType,
    clearUnreadCount,
    clearSyncError,
    markAsRead,
    setUnreadCount,
  };
};

export default useNotifications;
