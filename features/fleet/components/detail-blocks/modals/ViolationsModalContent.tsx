import React from 'react';
import { AlertTriangle, Clock, Zap } from 'lucide-react';
import type { Alert } from '../../../../../types';

interface ViolationsModalProps {
  safetyScore?: number;
  violations?: Alert[];
}

export const ViolationsModalContent: React.FC<ViolationsModalProps> = ({ safetyScore = 0, violations = [] }) => {
  const grade = safetyScore >= 80 ? 'A' : safetyScore >= 60 ? 'B' : 'C';

  // Couleur du grade — tokens statut pour adaptation thème
  const gradeColor =
    safetyScore >= 80 ? 'var(--status-moving)' : safetyScore >= 60 ? 'var(--status-idle)' : 'var(--status-stopped)';

  const comment =
    safetyScore >= 80 ? 'Bon conducteur.' : safetyScore >= 60 ? 'Conduite à améliorer.' : 'Conduite à risque.';

  const getSeverityBorder = (severity: string) => {
    if (severity === 'HIGH' || severity === 'CRITICAL') return 'var(--clr-danger)';
    if (severity === 'MEDIUM') return 'var(--clr-warning)';
    return 'var(--clr-caution)';
  };

  const getSeverityText = (severity: string) => {
    if (severity === 'HIGH' || severity === 'CRITICAL') return 'var(--clr-danger-strong)';
    if (severity === 'MEDIUM') return 'var(--clr-warning-strong)';
    return 'var(--clr-caution-strong)';
  };

  const getSeverityLabel = (severity: string) => {
    if (severity === 'CRITICAL') return 'Critique';
    if (severity === 'HIGH') return 'Élevé';
    if (severity === 'MEDIUM') return 'Moyen';
    return 'Mineur';
  };

  return (
    <div className="space-y-6">
      {/* GRADE GÉANT + score + commentaire */}
      <div className="flex flex-col items-center justify-center p-8 bg-[var(--bg-card)] rounded-[var(--brand-radius)] border border-[var(--border)]">
        <div
          className="text-7xl font-black leading-none mb-2"
          style={{
            color: gradeColor,
            filter: `drop-shadow(0 0 20px ${gradeColor})`,
          }}
        >
          {grade}
        </div>
        <div className="text-[11px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)] mt-2">
          Indice de sécurité
        </div>
        <div className="mt-4 px-6 py-2 bg-[var(--bg-elevated)] rounded-full border border-[var(--border)] text-[10px] font-bold uppercase text-[var(--text-primary)]">
          {safetyScore}/100 points
        </div>
        <p className="text-xs text-[var(--text-secondary)] mt-3 italic">{comment}</p>
      </div>

      {/* JOURNAL DES ÉVÉNEMENTS */}
      <section>
        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-4">
          Journal des événements
        </h3>

        {violations.length === 0 ? (
          <div className="text-[11px] text-[var(--text-muted)] italic p-4 bg-[var(--bg-card)] rounded-[var(--brand-radius)] border border-dashed border-[var(--border)] text-center">
            Aucune violation de règle aujourd'hui.
          </div>
        ) : (
          <div className="space-y-3">
            {violations.map((v) => {
              const sevBorder = getSeverityBorder(v.severity);
              const sevText = getSeverityText(v.severity);
              return (
                <div
                  key={v.id}
                  className="p-4 rounded-r-[var(--brand-radius)] border-l-4 bg-[var(--bg-card)]"
                  style={{ borderLeftColor: sevBorder }}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4" style={{ color: sevText }} />
                      <span className="text-xs font-black uppercase tracking-tight text-[var(--text-primary)]">
                        {v.type}
                      </span>
                      <span
                        className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase"
                        style={{
                          backgroundColor: `${sevBorder}20`,
                          color: sevText,
                        }}
                      >
                        {getSeverityLabel(v.severity)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-[var(--text-muted)]">
                      <Clock className="w-2.5 h-2.5" />
                      {new Date(v.createdAt).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)] font-medium leading-relaxed italic">
                    {v.message}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
