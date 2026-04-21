import React from 'react';
import { AlertOctagon, Video, EyeOff, Coffee, Phone, ShieldAlert } from 'lucide-react';
import { ConfigurableRow } from './SharedBlocks';
import type { Vehicle, Alert } from '../../../../types';

interface ViolationsBlockProps {
  vehicle: Vehicle;
  violations: Alert[];
  isConfigMode: boolean;
  hiddenFields: Set<string>;
  toggleFieldVisibility: (id: string) => void;
}

export const ViolationsBlock: React.FC<ViolationsBlockProps> = ({
  vehicle,
  violations,
  isConfigMode,
  hiddenFields,
  toggleFieldVisibility,
}) => {
  const videoEvents = vehicle.videoEvents || [];

  const getVideoIcon = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('fatigue') || t.includes('sleep')) return <Coffee className="w-4 h-4 text-red-500" />;
    if (t.includes('distraction') || t.includes('look_away')) return <EyeOff className="w-4 h-4 text-orange-500" />;
    if (t.includes('phone') || t.includes('calling')) return <Phone className="w-4 h-4 text-red-400" />;
    return <Video className="w-4 h-4 text-[var(--primary)]" />;
  };

  return (
    <div className="space-y-4">
      {/* Video AI Events (DMS/ADAS) */}
      {videoEvents.length > 0 && (
        <div className="space-y-2">
          <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase flex items-center gap-1.5 ml-2">
            <Video className="w-3 h-3" /> Analyse Vidéo IA
          </div>
          {videoEvents.slice(0, 3).map((event: any, i: number) => (
            <ConfigurableRow
              key={`vid-${i}`}
              id={`vid-${i}`}
              isConfigMode={isConfigMode}
              isHidden={hiddenFields.has(`vid-${i}`)}
              onToggle={() => toggleFieldVisibility(`vid-${i}`)}
            >
              <div className="flex items-start gap-3 p-3 bg-[var(--clr-danger-dim)] border border-red-100 dark:border-red-900/30 rounded-lg">
                <div className="shrink-0 mt-0.5">{getVideoIcon(event.type)}</div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-[var(--clr-danger-strong)] truncate">
                    {event.label || event.type}
                  </div>
                  <div className="text-[10px] text-red-600/70 dark:text-red-400/50">
                    {new Date(event.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} •
                    Confiance: {Math.round(event.confidence * 100)}%
                  </div>
                </div>
                {event.clipUrl && (
                  <button
                    className="ml-auto p-1.5 bg-[var(--bg-elevated)] rounded shadow-sm hover:scale-105 transition-transform"
                    title="Lire le clip vidéo"
                    aria-label="Lire le clip vidéo"
                    onClick={() => window.open(event.clipUrl, '_blank', 'noopener,noreferrer')}
                  >
                    <Video className="w-3 h-3 text-[var(--primary)]" />
                  </button>
                )}
              </div>
            </ConfigurableRow>
          ))}
        </div>
      )}

      {/* Violations de Règles */}
      <div className="space-y-1">
        <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase flex items-center gap-1.5 ml-2 mb-2">
          <ShieldAlert className="w-3 h-3" /> Violations de Règles
        </div>

        {violations.length === 0 ? (
          <div className="text-xs text-[var(--text-muted)] italic p-2">Aucune violation de règle aujourd'hui.</div>
        ) : (
          violations.slice(0, 3).map((v, i) => (
            <ConfigurableRow
              key={v.id}
              id={`viol-${i}`}
              isConfigMode={isConfigMode}
              isHidden={hiddenFields.has(`viol-${i}`)}
              onToggle={() => toggleFieldVisibility(`viol-${i}`)}
            >
              <div className="flex items-start gap-3 p-2 border-b border-[var(--border)] last:border-0 transition-colors">
                <AlertOctagon className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-[var(--text-primary)]">{v.type}</div>
                  <div className="text-[10px] text-[var(--text-secondary)]">{v.message}</div>
                  <div className="text-[9px] text-[var(--text-muted)] mt-0.5">
                    {new Date(v.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            </ConfigurableRow>
          ))
        )}
      </div>
    </div>
  );
};
