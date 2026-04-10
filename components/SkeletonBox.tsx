/**
 * TrackYu Web — SkeletonBox + composites
 * Miroir du composant mobile SkeletonBox.tsx
 *
 * Usage :
 *   <SkeletonBox width="60%" height={14} />
 *   <SkeletonCard />
 *   <SkeletonRow />
 *   <SkeletonVehicleCard />
 */
import React from 'react';

interface SkeletonBoxProps {
  width?: string | number;
  height?: number;
  borderRadius?: number;
  className?: string;
}

/**
 * Bloc squelette animé — base primitive (pulse opacity)
 */
export function SkeletonBox({
  width = '100%',
  height = 16,
  borderRadius = 8,
  className = '',
}: SkeletonBoxProps) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height,
        borderRadius,
      }}
      aria-hidden="true"
    />
  );
}

/**
 * Carte statistique squelette (miroir SkeletonCard mobile)
 * label + valeur + sous-label
 */
export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div
      className={`rounded-[14px] border border-[var(--border)] bg-[var(--bg-surface)] p-[14px] ${className}`}
    >
      <SkeletonBox width="40%" height={13} />
      <SkeletonBox width="60%" height={22} borderRadius={6} className="mt-2" />
      <SkeletonBox width="50%" height={11} className="mt-1.5" />
    </div>
  );
}

/**
 * Ligne liste squelette (miroir SkeletonRow mobile)
 * texte gauche + badge droit
 */
export function SkeletonRow({ className = '' }: { className?: string }) {
  return (
    <div
      className={`flex items-center gap-3 rounded-[12px] border border-[var(--border)] bg-[var(--bg-surface)] p-[14px] ${className}`}
    >
      <div className="flex-1 flex flex-col gap-1.5">
        <SkeletonBox width="55%" height={13} />
        <SkeletonBox width="35%" height={11} />
      </div>
      <SkeletonBox width={60} height={22} borderRadius={6} />
    </div>
  );
}

/**
 * Carte véhicule squelette (miroir VehicleCardSkeleton mobile)
 */
export function SkeletonVehicleCard({ className = '' }: { className?: string }) {
  return (
    <div
      className={`rounded-[14px] border border-[var(--border)] bg-[var(--bg-surface)] p-3 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-2.5">
        <SkeletonBox width={36} height={36} borderRadius={10} />
        <div className="flex-1 flex flex-col gap-1.5">
          <SkeletonBox width="55%" height={14} />
          <SkeletonBox width="35%" height={12} />
        </div>
        <SkeletonBox width={72} height={26} borderRadius={8} />
      </div>
      {/* Info */}
      <div className="flex flex-col gap-1.5 mb-2.5">
        <SkeletonBox width="70%" height={12} />
        <SkeletonBox width="45%" height={12} />
      </div>
      {/* Footer */}
      <div className="pt-2 border-t border-[var(--border)]">
        <SkeletonBox width={80} height={11} />
      </div>
    </div>
  );
}

/**
 * Rangée info-detail squelette (label + valeur côte-à-côte)
 * Miroir du pattern SkeletonDetail / infoRow mobile
 */
export function SkeletonInfoRow({ className = '' }: { className?: string }) {
  return (
    <div
      className={`flex items-center justify-between px-[14px] py-[11px] border-b border-[var(--border)] last:border-b-0 ${className}`}
    >
      <SkeletonBox width="32%" height={13} />
      <SkeletonBox width="42%" height={13} />
    </div>
  );
}

/**
 * Section détail avec titre + N rangées info
 */
export function SkeletonDetailSection({
  rows = 4,
  label = true,
  className = '',
}: {
  rows?: number;
  label?: boolean;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {label && <SkeletonBox width="30%" height={10} />}
      <div className="rounded-[12px] border border-[var(--border)] bg-[var(--bg-surface)] overflow-hidden">
        {Array.from({ length: rows }).map((_, i) => (
          <SkeletonInfoRow key={i} />
        ))}
      </div>
    </div>
  );
}

export default SkeletonBox;
