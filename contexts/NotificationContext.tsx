import type { ReactNode } from 'react';
import React, { createContext, useContext, useCallback, useEffect } from 'react';
import type { NotificationPayload } from '../hooks/useNotifications';
import { useNotifications } from '../hooks/useNotifications';
import type { ToastNotification } from '../components/NotificationToast';
import { useToastNotifications, NotificationToast } from '../components/NotificationToast';
import { getSocket } from '../services/socket';
import type { Alert } from '../types';
import { logger } from '../utils/logger';
import { useTranslation } from '../i18n';

// ============================================================
// TrackYu GPS - NotificationContext
// Contexte centralisé pour toutes les notifications temps réel
// ============================================================

interface NotificationContextValue {
  permission: NotificationPermission;
  preferences: ReturnType<typeof useNotifications>['preferences'];
  unreadCount: number;
  isSupported: boolean;
  isPushSupported: boolean;
  syncError: string | null;
  toasts: ToastNotification[];

  requestPermission: () => Promise<boolean>;
  notify: (payload: NotificationPayload) => void;
  notifyAlert: (alert: Alert) => void;
  dismissToast: (id: string | number) => void;
  dismissAllToasts: () => void;
  updatePreferences: (updates: Partial<ReturnType<typeof useNotifications>['preferences']>) => void;
  toggleAlertType: (type: keyof ReturnType<typeof useNotifications>['preferences']['alertTypes']) => void;
  clearUnreadCount: () => void;
  clearSyncError: () => void;
  markAsRead: (count?: number) => void;
  setUnreadCount: (count: number) => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export const useNotificationContext = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotificationContext must be used within NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const { t } = useTranslation();
  const notifications = useNotifications();
  const { toasts, addToast, dismissToast, dismissAllToasts } = useToastNotifications();

  // Convertir une Alert en NotificationPayload et afficher
  const notifyAlert = useCallback(
    (alert: Alert) => {
      const payload: NotificationPayload = {
        id: alert.id,
        title: t(`notifications.alertLabels.${alert.type}`) || alert.type,
        body: alert.message,
        type: alert.type,
        severity: alert.severity,
        vehicleId: alert.vehicleId,
        vehicleName: alert.vehicleName,
        link: `/map?vehicleId=${alert.vehicleId}`,
      };

      // Push notification système
      notifications.showNotification(payload);

      // Toast in-app
      addToast({
        id: alert.id,
        title: payload.title,
        message: alert.message,
        type: alert.type as ToastNotification['type'],
        severity: alert.severity,
        vehicleName: alert.vehicleName,
        link: payload.link,
        duration: alert.severity === 'CRITICAL' ? 10000 : 5000,
        timestamp: new Date(alert.createdAt),
      });
    },
    [notifications, addToast, t]
  );

  // Notification générique
  const notify = useCallback(
    (payload: NotificationPayload) => {
      notifications.showNotification(payload);

      addToast({
        id: payload.id || `notif-${Date.now()}`,
        title: payload.title,
        message: payload.body,
        type: payload.type as ToastNotification['type'],
        severity: payload.severity,
        vehicleName: payload.vehicleName,
        link: payload.link,
        duration: payload.severity === 'CRITICAL' ? 10000 : 5000,
      });
    },
    [notifications, addToast]
  );

  // Écouter les événements socket pour les alertes en temps réel
  useEffect(() => {
    const socket = getSocket();

    const handleNewAlert = (rawAlert: any) => {
      logger.debug('[NotificationContext] New alert received:', rawAlert);

      // Mapper l'alerte du backend vers notre type Alert
      const alert: Alert = {
        id: rawAlert.id,
        vehicleId: rawAlert.vehicle_id || rawAlert.vehicleId,
        vehicleName: rawAlert.vehicle_name || rawAlert.vehicleName,
        type: rawAlert.type,
        severity: rawAlert.severity || 'MEDIUM',
        message: rawAlert.message,
        isRead: false,
        createdAt: rawAlert.created_at || rawAlert.createdAt || new Date().toISOString(),
      };

      notifyAlert(alert);
    };

    socket.on('alert:new', handleNewAlert);
    // Également écouter l'ancien nom d'événement si utilisé
    socket.on('new_alert', handleNewAlert);

    const handleTicketMessage = (payload: any) => {
      logger.debug('[NotificationContext] New ticket message:', payload);
      if (!notifications.preferences.ticketMessagesEnabled) return;

      notify({
        id: `ticket-${payload.ticketId}-${payload.messageId || Date.now()}`,
        title: t('notifications.ticketMessage.title') || 'Nouveau message support',
        body: payload.subject ? `${payload.subject} — ${payload.preview || ''}` : payload.preview || 'Nouvelle réponse',
        type: 'TICKET_MESSAGE',
        severity: 'MEDIUM',
        link: `/support?ticketId=${payload.ticketId}`,
      });
    };

    socket.on('ticket:message:new', handleTicketMessage);

    // Phase 4 chantier géoloc 360 — Toast temps-réel quand un IMEI inconnu se
    // connecte au serveur GPS. Reçu uniquement par les SUPERADMIN (filtre côté
    // backend via room 'superadmin'). Debounce 5 min par IMEI pour éviter le
    // spam quand un boîtier inconnu se reconnecte en boucle.
    const unknownImeiNotifiedAt = new Map<string, number>();
    const UNKNOWN_IMEI_DEBOUNCE_MS = 5 * 60 * 1000;

    const handleUnknownImei = (payload: { imei: string; protocol: string; ip: string; lastSeen: string }) => {
      logger.debug('[NotificationContext] Unknown IMEI detected:', payload);
      const now = Date.now();
      const last = unknownImeiNotifiedAt.get(payload.imei) ?? 0;
      if (now - last < UNKNOWN_IMEI_DEBOUNCE_MS) return;
      unknownImeiNotifiedAt.set(payload.imei, now);

      notify({
        id: `unknown-imei-${payload.imei}-${now}`,
        title: t('notifications.unknownImei.title') || 'IMEI inconnu détecté',
        body:
          t('notifications.unknownImei.body', {
            imei: payload.imei,
            protocol: payload.protocol,
          }) || `${payload.imei} (${payload.protocol}) depuis ${payload.ip}`,
        type: 'INFO',
        severity: 'MEDIUM',
        link: '/admin?tab=devices',
      });
    };

    socket.on('admin:unknown-imei', handleUnknownImei);

    return () => {
      socket.off('alert:new', handleNewAlert);
      socket.off('new_alert', handleNewAlert);
      socket.off('ticket:message:new', handleTicketMessage);
      socket.off('admin:unknown-imei', handleUnknownImei);
    };
  }, [notifyAlert, notify, notifications.preferences.ticketMessagesEnabled, t]);

  // Gérer le clic sur un toast
  const handleToastClick = useCallback(
    (toast: ToastNotification) => {
      if (toast.link) {
        // Whitelist: uniquement les liens internes (commençant par /)
        const safeLink = toast.link.startsWith('/') ? toast.link : null;
        if (safeLink) {
          // L'app web n'a pas de routeur URL classique (View enum géré en
          // state). On dispatch un event que App.tsx intercepte pour appeler
          // handleNavigate(view, params). Pour les routes non câblées, le
          // listener fait un fallback window.location.href (legacy).
          window.dispatchEvent(new CustomEvent('app:navigate', { detail: { link: safeLink } }));
        }
      }
      notifications.markAsRead(1);
    },
    [notifications]
  );

  const contextValue: NotificationContextValue = {
    permission: notifications.permission,
    preferences: notifications.preferences,
    unreadCount: notifications.unreadCount,
    isSupported: notifications.isSupported,
    isPushSupported: notifications.isPushSupported,
    syncError: notifications.syncError,
    toasts,

    requestPermission: notifications.requestPermission,
    notify,
    notifyAlert,
    dismissToast,
    dismissAllToasts,
    updatePreferences: notifications.updatePreferences,
    toggleAlertType: notifications.toggleAlertType,
    clearUnreadCount: notifications.clearUnreadCount,
    clearSyncError: notifications.clearSyncError,
    markAsRead: notifications.markAsRead,
    setUnreadCount: notifications.setUnreadCount,
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}

      {/* Toast Container - rendu globalement */}
      <NotificationToast
        notifications={toasts}
        onDismiss={dismissToast}
        onDismissAll={dismissAllToasts}
        onClick={handleToastClick}
        position="top-right"
        maxVisible={4}
      />
    </NotificationContext.Provider>
  );
};

export default NotificationProvider;
