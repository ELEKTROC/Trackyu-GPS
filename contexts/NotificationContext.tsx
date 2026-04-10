import type { ReactNode } from 'react';
import React, { createContext, useContext, useCallback, useEffect } from 'react';
import type { NotificationPayload } from '../hooks/useNotifications';
import { useNotifications } from '../hooks/useNotifications';
import type { ToastNotification} from '../components/NotificationToast';
import { useToastNotifications, NotificationToast } from '../components/NotificationToast';
import { getSocket } from '../services/socket';
import type { Alert } from '../types';
import { logger } from '../utils/logger';

// ============================================================
// TrackYu GPS - NotificationContext
// Contexte centralisé pour toutes les notifications temps réel
// ============================================================

interface NotificationContextValue {
  // État
  permission: NotificationPermission;
  preferences: ReturnType<typeof useNotifications>['preferences'];
  unreadCount: number;
  isSupported: boolean;
  isPushSupported: boolean;
  toasts: ToastNotification[];
  
  // Actions
  requestPermission: () => Promise<boolean>;
  notify: (payload: NotificationPayload) => void;
  notifyAlert: (alert: Alert) => void;
  dismissToast: (id: string | number) => void;
  dismissAllToasts: () => void;
  updatePreferences: (updates: Partial<ReturnType<typeof useNotifications>['preferences']>) => void;
  toggleAlertType: (type: keyof ReturnType<typeof useNotifications>['preferences']['alertTypes']) => void;
  clearUnreadCount: () => void;
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

// Mapper les types d'alertes pour les labels
const ALERT_TYPE_LABELS: Record<string, string> = {
  SPEEDING: '⚡ Excès de vitesse',
  GEOFENCE: '📍 Zone géographique',
  FUEL_LEVEL: '⛽ Niveau carburant',
  FUEL_THEFT: '🚨 Vol de carburant',
  MAINTENANCE: '🔧 Maintenance',
  SOS: '🆘 SOS Urgence',
  IGNITION: '🔑 Moteur',
  IDLING: '⏱️ Ralenti excessif',
  BATTERY: '🔋 Batterie',
  TOWING: '🚗 Remorquage',
};

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const notifications = useNotifications();
  const { toasts, addToast, dismissToast, dismissAllToasts } = useToastNotifications();

  // Convertir une Alert en NotificationPayload et afficher
  const notifyAlert = useCallback((alert: Alert) => {
    const payload: NotificationPayload = {
      id: alert.id,
      title: ALERT_TYPE_LABELS[alert.type] || alert.type,
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
  }, [notifications, addToast]);

  // Notification générique
  const notify = useCallback((payload: NotificationPayload) => {
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
  }, [notifications, addToast]);

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

    return () => {
      socket.off('alert:new', handleNewAlert);
      socket.off('new_alert', handleNewAlert);
    };
  }, [notifyAlert]);

  // Gérer le clic sur un toast
  const handleToastClick = useCallback((toast: ToastNotification) => {
    if (toast.link) {
      // Whitelist: uniquement les liens internes (commençant par /)
      const safeLink = toast.link.startsWith('/') ? toast.link : null;
      if (safeLink) window.location.href = safeLink;
    }
    notifications.markAsRead(1);
  }, [notifications]);

  const contextValue: NotificationContextValue = {
    // État
    permission: notifications.permission,
    preferences: notifications.preferences,
    unreadCount: notifications.unreadCount,
    isSupported: notifications.isSupported,
    isPushSupported: notifications.isPushSupported,
    toasts,
    
    // Actions
    requestPermission: notifications.requestPermission,
    notify,
    notifyAlert,
    dismissToast,
    dismissAllToasts,
    updatePreferences: notifications.updatePreferences,
    toggleAlertType: notifications.toggleAlertType,
    clearUnreadCount: notifications.clearUnreadCount,
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
