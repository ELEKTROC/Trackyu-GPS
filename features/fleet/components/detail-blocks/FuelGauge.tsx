/**
 * FuelGauge — Jauge carburant semi-circulaire (arc 270°) avec glow primary.
 *
 * Design : arc unique en `var(--brand-primary)` avec drop-shadow pour effet
 * "rétro-éclairé" en mode sombre. Centre affiche litres + pourcentage, bornes
 * 0 / maxCapacity en bas.
 *
 * Props :
 *   - level       : volume courant en litres (ex: 287)
 *   - percentage  : pourcentage 0-100 (ex: 82)
 *   - maxCapacity : capacité totale en litres (ex: 350)
 *
 * Réutilisable dans FuelBlock (véhicule) et potentiellement Dashboard (score).
 */
import React from 'react';

interface FuelGaugeProps {
  level: number;
  percentage: number;
  maxCapacity: number;
}

export const FuelGauge: React.FC<FuelGaugeProps> = ({ level, percentage, maxCapacity }) => {
  const safeLevel = Math.max(0, Math.round(level));
  const safePct = Math.min(100, Math.max(0, Math.round(percentage)));
  const safeMax = Math.max(0, Math.round(maxCapacity));

  // Paramètres de l'arc
  const radius = 70;
  const stroke = 12;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;

  // Arc sur 3/4 du cercle (270°, ouverture en bas)
  const arcLength = 0.75;
  const strokeDasharray = `${circumference * arcLength} ${circumference}`;
  const offset = circumference * arcLength - (safePct / 100) * (circumference * arcLength);

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div className="relative">
        <svg
          height={radius * 2}
          width={radius * 2}
          className="transform rotate-[135deg]" // centre l'ouverture de l'arc en bas
        >
          {/* Rail de fond */}
          <circle
            stroke="var(--border-ui)"
            fill="transparent"
            strokeWidth={stroke}
            strokeDasharray={strokeDasharray}
            strokeLinecap="round"
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
          {/* Arc de progression primary + glow */}
          <circle
            stroke="var(--brand-primary)"
            fill="transparent"
            strokeWidth={stroke}
            strokeDasharray={strokeDasharray}
            style={{ strokeDashoffset: offset, transition: 'stroke-dashoffset 0.8s ease' }}
            strokeLinecap="round"
            r={normalizedRadius}
            cx={radius}
            cy={radius}
            className="drop-shadow-[0_0_8px_var(--brand-primary)]"
          />
        </svg>

        {/* Valeurs centrales */}
        <div className="absolute inset-0 flex flex-col items-center justify-center mt-2">
          <span className="text-3xl font-black text-[var(--text-main)] leading-none">{safeLevel}</span>
          <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase">ltr</span>
          <span className="text-xs font-medium text-[var(--text-muted)]">({safePct}%)</span>
        </div>

        {/* Indicateurs Min / Max en bas */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-between px-2 -mb-1">
          <span className="text-[10px] font-bold text-[var(--text-muted)]">0</span>
          <span className="text-[10px] font-bold text-[var(--text-muted)]">{safeMax}</span>
        </div>
      </div>
    </div>
  );
};
