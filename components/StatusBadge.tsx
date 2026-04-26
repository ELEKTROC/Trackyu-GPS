import React from 'react';
import { VehicleStatus } from '../types';
import { useAppearance } from '../contexts/AppearanceContext';

/**
 * StatusBadge — Code couleur sémantique strict :
 *   MOVING  → couleur d'accentuation de la marque (configurable, défaut vert)
 *   IDLE    → orange  (ralenti, attention)
 *   STOPPED → rouge   (arrêté)
 *   OFFLINE → gris    (hors ligne)
 *
 * Toutes les couleurs utilisent des styles inline pour un rendu
 * correct en dark/light sans classes dark: hardcodées.
 */

// Couleurs statiques par statut (hex pour calcul d'opacité bg/border)
const STATUS_COLORS: Partial<Record<VehicleStatus, { color: string; bg: string; border: string }>> = {
  [VehicleStatus.IDLE]: { color: '#D97706', bg: '#F59E0B1a', border: '#F59E0B40' },
  [VehicleStatus.STOPPED]: { color: '#DC2626', bg: '#EF44441a', border: '#EF444440' },
  [VehicleStatus.OFFLINE]: { color: '#6B7280', bg: '#6B72801a', border: '#6B728040' },
};

const labels: Record<VehicleStatus, string> = {
  [VehicleStatus.MOVING]: 'EN MOUVEMENT',
  [VehicleStatus.IDLE]: 'RALENTI',
  [VehicleStatus.STOPPED]: 'ARRÊTÉ',
  [VehicleStatus.OFFLINE]: 'HORS LIGNE',
};

export const StatusBadge: React.FC<{ status: VehicleStatus }> = ({ status }) => {
  const { appearance } = useAppearance();

  // MOVING : inline style branché sur --brand-accent
  if (status === VehicleStatus.MOVING) {
    const accent = appearance.accentColor || '#10b981';
    const bgHex = accent + '1a';
    const bdrHex = accent + '40';
    return (
      <span
        className="px-2.5 py-0.5 rounded-full text-xs font-bold border inline-flex items-center gap-1"
        style={{ backgroundColor: bgHex, color: accent, borderColor: bdrHex }}
      >
        <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: accent }} />
        {labels[VehicleStatus.MOVING]}
      </span>
    );
  }

  const s = STATUS_COLORS[status];
  if (s) {
    return (
      <span
        className="px-2.5 py-0.5 rounded-full text-xs font-bold border inline-flex items-center"
        style={{ backgroundColor: s.bg, color: s.color, borderColor: s.border }}
      >
        {labels[status]}
      </span>
    );
  }

  // Fallback
  return (
    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold border bg-[var(--bg-elevated)] text-[var(--text-muted)] border-[var(--border)]">
      {labels[status] ?? 'HORS LIGNE'}
    </span>
  );
};
