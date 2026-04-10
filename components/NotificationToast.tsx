import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Bell, AlertTriangle, Fuel, MapPin, Navigation, AlertCircle, Zap, Siren } from 'lucide-react';

// ============================================================
// TrackYu GPS - NotificationToast Component
// Toast popup temps réel pour les nouvelles alertes
// ============================================================

export interface ToastNotification {
  id: string | number;
  title: string;
  message: string;
  type?: 'SPEEDING' | 'GEOFENCE' | 'FUEL_LEVEL' | 'FUEL_THEFT' | 'MAINTENANCE' | 'SOS' | 'INFO';
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  vehicleName?: string;
  link?: string;
  duration?: number; // ms, 0 = permanent
  timestamp?: Date;
}

interface NotificationToastProps {
  notifications: ToastNotification[];
  onDismiss: (id: string | number) => void;
  onDismissAll?: () => void;
  onClick?: (notification: ToastNotification) => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  maxVisible?: number;
}

// Icône selon le type d'alerte
const getAlertIcon = (type?: string) => {
  switch (type) {
    case 'SPEEDING':
      return Navigation;
    case 'GEOFENCE':
      return MapPin;
    case 'FUEL_LEVEL':
      return Fuel;
    case 'FUEL_THEFT':
      return Fuel;
    case 'MAINTENANCE':
      return AlertCircle;
    case 'SOS':
      return Siren;
    default:
      return Bell;
  }
};

// Couleurs selon la sévérité
const getSeverityStyles = (severity?: string) => {
  switch (severity) {
    case 'CRITICAL':
      return {
        bg: 'bg-red-600',
        border: 'border-red-500',
        icon: 'text-white',
        text: 'text-white',
        subtext: 'text-red-100',
        progress: 'bg-red-300',
        hover: 'hover:bg-red-700',
      };
    case 'HIGH':
      return {
        bg: 'bg-orange-500',
        border: 'border-orange-400',
        icon: 'text-white',
        text: 'text-white',
        subtext: 'text-orange-100',
        progress: 'bg-orange-300',
        hover: 'hover:bg-orange-600',
      };
    case 'MEDIUM':
      return {
        bg: 'bg-amber-500',
        border: 'border-amber-400',
        icon: 'text-white',
        text: 'text-white',
        subtext: 'text-amber-100',
        progress: 'bg-amber-300',
        hover: 'hover:bg-amber-600',
      };
    default:
      return {
        bg: 'bg-[var(--primary)]',
        border: 'border-[var(--primary)]',
        icon: 'text-white',
        text: 'text-white',
        subtext: 'text-[var(--primary)]',
        progress: 'bg-[var(--primary-dim)]',
        hover: 'hover:bg-[var(--primary-light)]',
      };
  }
};

// Single Toast Item
const ToastItem: React.FC<{
  notification: ToastNotification;
  onDismiss: () => void;
  onClick?: () => void;
  index: number;
}> = ({ notification, onDismiss, onClick, index }) => {
  const [isExiting, setIsExiting] = useState(false);
  const [progress, setProgress] = useState(100);
  const duration = notification.duration ?? 5000;
  const styles = getSeverityStyles(notification.severity);
  const Icon = getAlertIcon(notification.type);

  const handleDismiss = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      onDismiss();
    }, 300);
  }, [onDismiss]);

  // Auto-dismiss avec progress bar
  useEffect(() => {
    if (duration <= 0) return;

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);

      if (remaining <= 0) {
        handleDismiss();
      }
    }, 50);

    return () => clearInterval(interval);
  }, [duration, handleDismiss]);

  const handleClick = () => {
    if (onClick) {
      onClick();
      handleDismiss();
    }
  };

  return (
    <div
      className={`
        relative overflow-hidden rounded-xl shadow-2xl border-2
        transform transition-all duration-300 ease-out
        ${styles.bg} ${styles.border}
        ${isExiting ? 'animate-out slide-out-to-right fade-out' : 'animate-in slide-in-from-right fade-in'}
        ${onClick ? 'cursor-pointer' : ''}
        max-w-sm w-full
      `}
      style={{
        animationDelay: `${index * 50}ms`,
        zIndex: 9999 - index,
      }}
      onClick={handleClick}
    >
      {/* Content */}
      <div className="p-4 flex items-start gap-3">
        {/* Icon */}
        <div className={`p-2 rounded-full bg-white/20 ${styles.icon}`}>
          <Icon className="w-5 h-5" />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className={`font-bold text-sm ${styles.text} truncate`}>{notification.title}</h4>
            {notification.severity === 'CRITICAL' && (
              <span className="animate-pulse">
                <Zap className="w-4 h-4 text-yellow-300" />
              </span>
            )}
          </div>

          {notification.vehicleName && (
            <p className={`text-xs font-medium ${styles.subtext} opacity-80`}>{notification.vehicleName}</p>
          )}

          <p className={`text-sm ${styles.subtext} mt-1 line-clamp-2`}>{notification.message}</p>

          {notification.timestamp && (
            <p className={`text-[10px] ${styles.subtext} opacity-60 mt-1`}>
              {notification.timestamp.toLocaleTimeString('fr-FR')}
            </p>
          )}
        </div>

        {/* Close button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDismiss();
          }}
          className={`p-1 rounded-full bg-white/10 ${styles.hover} transition-colors`}
        >
          <X className={`w-4 h-4 ${styles.icon}`} />
        </button>
      </div>

      {/* Progress bar */}
      {duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
          <div
            className={`h-full ${styles.progress} transition-all duration-100 ease-linear`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
};

// Main Toast Container
export const NotificationToast: React.FC<NotificationToastProps> = ({
  notifications,
  onDismiss,
  onDismissAll,
  onClick,
  position = 'top-right',
  maxVisible = 5,
}) => {
  const visibleNotifications = notifications.slice(0, maxVisible);
  const hiddenCount = Math.max(0, notifications.length - maxVisible);

  // Position classes
  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
  };

  // Ne rien rendre s'il n'y a pas de notifications
  if (notifications.length === 0) return null;

  const content = (
    <div
      className={`fixed ${positionClasses[position]} z-[9999] flex flex-col gap-3 pointer-events-none`}
      style={{ maxHeight: 'calc(100vh - 2rem)' }}
    >
      {/* Dismiss All button si plusieurs notifications */}
      {notifications.length > 1 && onDismissAll && (
        <button
          onClick={onDismissAll}
          className="self-end pointer-events-auto px-3 py-1.5 text-xs rounded-full shadow-lg transition-colors flex items-center gap-1.5 bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:bg-[var(--border-strong)]"
        >
          <X className="w-3 h-3" />
          Tout fermer ({notifications.length})
        </button>
      )}

      {/* Toast items */}
      <div className="flex flex-col gap-2 pointer-events-auto overflow-hidden">
        {visibleNotifications.map((notification, index) => (
          <ToastItem
            key={notification.id}
            notification={notification}
            onDismiss={() => onDismiss(notification.id)}
            onClick={onClick ? () => onClick(notification) : undefined}
            index={index}
          />
        ))}

        {/* Hidden count indicator */}
        {hiddenCount > 0 && (
          <div className="text-center py-2 px-4 bg-[var(--bg-elevated)] text-[var(--text-primary)] text-xs rounded-lg shadow-lg border border-[var(--border)]">
            +{hiddenCount} autres notifications
          </div>
        )}
      </div>
    </div>
  );

  // Render via portal pour éviter les problèmes de z-index
  return createPortal(content, document.body);
};

// Hook pour gérer les toasts
export const useToastNotifications = () => {
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  const addToast = useCallback((notification: Omit<ToastNotification, 'id'> & { id?: string | number }) => {
    const id = notification.id ?? `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const toast: ToastNotification = {
      ...notification,
      id,
      timestamp: notification.timestamp ?? new Date(),
    };

    setToasts((prev) => [toast, ...prev]);
    return id;
  }, []);

  const dismissToast = useCallback((id: string | number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const dismissAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  return {
    toasts,
    addToast,
    dismissToast,
    dismissAllToasts,
  };
};

export default NotificationToast;
