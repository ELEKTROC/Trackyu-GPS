import React from 'react';
import { TrendingDown, Zap, CornerUpRight } from 'lucide-react';
import { ConfigurableRow } from './SharedBlocks';

interface BehaviorBlockProps {
  mockData: any;
  isConfigMode: boolean;
  hiddenFields: Set<string>;
  toggleFieldVisibility: (id: string) => void;
  setActiveModal: (modal: string) => void;
}

export const BehaviorBlock: React.FC<BehaviorBlockProps> = ({
  mockData,
  isConfigMode,
  hiddenFields,
  toggleFieldVisibility,
  setActiveModal,
}) => {
  const score = Math.min(100, Math.max(0, mockData.safetyScore ?? 0));

  // Couleur arc selon le score — tokens statut pour adaptation thème
  const scoreColor =
    score >= 80
      ? 'var(--status-moving)' // vert
      : score >= 60
        ? 'var(--status-idle)' // orange
        : 'var(--status-stopped)'; // rouge

  // Paramètres arc
  const radius = 48;
  const stroke = 6;
  const r = radius - stroke * 2;
  const circumference = r * 2 * Math.PI;
  const offset = circumference * (1 - score / 100);

  return (
    <div className="space-y-4">
      {/* JAUGE SCORE CIRCULAIRE */}
      <div className="flex flex-col items-center justify-center py-2">
        <div className="relative w-28 h-28 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90" viewBox={`0 0 ${radius * 2} ${radius * 2}`}>
            {/* Rail de fond */}
            <circle
              cx={radius}
              cy={radius}
              r={r}
              stroke="var(--border-ui)"
              strokeWidth={stroke}
              fill="none"
              opacity={0.5}
            />
            {/* Progression */}
            <circle
              cx={radius}
              cy={radius}
              r={r}
              stroke={scoreColor}
              strokeWidth={stroke + 1}
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              className="drop-shadow-[0_0_6px_var(--brand-primary)] transition-all duration-1000 ease-out"
              style={{ filter: `drop-shadow(0 0 6px ${scoreColor})` }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-black font-mono tracking-tighter text-[var(--text-primary)]">{score}</span>
            <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)] mt-0.5">
              Score
            </span>
          </div>
        </div>
      </div>

      {/* GRILLE 3 STATS — freinages / accél / virages */}
      <div className="grid grid-cols-3 gap-2">
        <ConfigurableRow
          id="harshBraking"
          isConfigMode={isConfigMode}
          isHidden={hiddenFields.has('harshBraking')}
          onToggle={() => toggleFieldVisibility('harshBraking')}
        >
          <div className="p-3 bg-[var(--bg-card)] rounded-[var(--brand-radius)] flex flex-col items-center text-center h-full">
            <div className="text-[var(--text-muted)] mb-1 opacity-70">
              <Zap className="w-3 h-3" />
            </div>
            <span className="block text-sm font-black font-mono text-[var(--text-primary)]">
              {mockData.harshBraking ?? 0}
            </span>
            <span className="text-[9px] text-[var(--text-muted)] uppercase font-bold tracking-tight mt-0.5">
              Freinages
            </span>
          </div>
        </ConfigurableRow>
        <ConfigurableRow
          id="harshAccel"
          isConfigMode={isConfigMode}
          isHidden={hiddenFields.has('harshAccel')}
          onToggle={() => toggleFieldVisibility('harshAccel')}
        >
          <div className="p-3 bg-[var(--bg-card)] rounded-[var(--brand-radius)] flex flex-col items-center text-center h-full">
            <div className="text-[var(--text-muted)] mb-1 opacity-70">
              <TrendingDown className="w-3 h-3" />
            </div>
            <span className="block text-sm font-black font-mono text-[var(--text-primary)]">
              {mockData.harshAccel ?? 0}
            </span>
            <span className="text-[9px] text-[var(--text-muted)] uppercase font-bold tracking-tight mt-0.5">
              Accél.
            </span>
          </div>
        </ConfigurableRow>
        <ConfigurableRow
          id="sharpTurn"
          isConfigMode={isConfigMode}
          isHidden={hiddenFields.has('sharpTurn')}
          onToggle={() => toggleFieldVisibility('sharpTurn')}
        >
          <div className="p-3 bg-[var(--bg-card)] rounded-[var(--brand-radius)] flex flex-col items-center text-center h-full">
            <div className="text-[var(--text-muted)] mb-1 opacity-70">
              <CornerUpRight className="w-3 h-3" />
            </div>
            <span className="block text-sm font-black font-mono text-[var(--text-primary)]">
              {mockData.sharpTurn ?? 0}
            </span>
            <span className="text-[9px] text-[var(--text-muted)] uppercase font-bold tracking-tight mt-0.5">
              Virages
            </span>
          </div>
        </ConfigurableRow>
      </div>

      {/* CTA rapport complet */}
      <button
        onClick={() => setActiveModal('violations')}
        className="w-full py-2.5 text-[10px] font-black uppercase tracking-widest text-[var(--brand-primary)] bg-[var(--brand-primary)]/5 hover:bg-[var(--brand-primary)]/15 border border-[var(--brand-primary)]/20 rounded-[var(--brand-radius)] transition-all"
      >
        Détails des infractions
      </button>
    </div>
  );
};
