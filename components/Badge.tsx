import React from 'react';

// Statuts véhicule (alignés sur feedback_vehicle_status_colors + tokens.ts mobile)
export type VehicleStatus = 'moving' | 'idle' | 'stopped' | 'offline' | 'alert';
// Badges fonctionnels génériques
export type BadgeVariant = VehicleStatus | 'success' | 'warning' | 'error' | 'info' | 'neutral';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  dot?: boolean;
  className?: string;
}

const BADGE_CLASSES: Record<BadgeVariant, string> = {
  moving:  'badge-moving',
  idle:    'badge-idle',
  stopped: 'badge-stopped',
  offline: 'badge-offline',
  alert:   'badge-alert',
  success: 'badge-success',
  warning: 'badge-warning',
  error:   'badge-error',
  info:    'badge-info',
  neutral: 'badge-neutral',
};

// Couleurs des dots correspondant aux statuts véhicule
const DOT_COLORS: Partial<Record<BadgeVariant, string>> = {
  moving:  'var(--status-moving)',
  idle:    'var(--status-idle)',
  stopped: 'var(--status-stopped)',
  offline: 'var(--status-offline)',
  alert:   'var(--status-alert)',
  success: 'var(--color-success)',
  warning: 'var(--color-warning)',
  error:   'var(--color-error)',
  info:    'var(--color-info)',
};

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  children,
  dot = false,
  className = '',
}) => {
  return (
    <span className={`badge ${BADGE_CLASSES[variant]} ${className}`}>
      {dot && (
        <span
          className="inline-block rounded-full shrink-0"
          style={{
            width: 6,
            height: 6,
            backgroundColor: DOT_COLORS[variant] ?? 'currentColor',
          }}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
};

// Utilitaire : convertit un statut brut (string API) en variant Badge
export const vehicleStatusToVariant = (status: string): VehicleStatus => {
  const s = status?.toLowerCase();
  if (s === 'moving' || s === 'en mouvement') return 'moving';
  if (s === 'idle' || s === 'ralenti')        return 'idle';
  if (s === 'stopped' || s === 'arrêté')      return 'stopped';
  if (s === 'alert' || s === 'alerte')        return 'alert';
  return 'offline';
};

export default Badge;
