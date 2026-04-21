import React from 'react';
import { AlertTriangle, Shield, Clock, AlertOctagon } from 'lucide-react';
import type { Alert } from '../../../../../types';

interface ViolationsModalProps {
  safetyScore?: number;
  violations?: Alert[];
}

export const ViolationsModalContent: React.FC<ViolationsModalProps> = ({ safetyScore = 0, violations = [] }) => {
  const grade = safetyScore >= 80 ? 'A' : safetyScore >= 60 ? 'B' : 'C';
  const gradeColor = safetyScore >= 80 ? 'text-green-400' : safetyScore >= 60 ? 'text-orange-400' : 'text-red-400';
  const borderColor =
    safetyScore >= 80
      ? 'border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)]'
      : safetyScore >= 60
        ? 'border-orange-400'
        : 'border-red-500';
  const comment =
    safetyScore >= 80 ? 'Bon conducteur.' : safetyScore >= 60 ? 'Conduite à améliorer.' : 'Conduite à risque.';

  const getSeverityColor = (severity: string) => {
    if (severity === 'HIGH' || severity === 'CRITICAL') return 'bg-red-100 text-red-600 border-red-200';
    if (severity === 'MEDIUM') return 'bg-orange-100 text-orange-600 border-orange-200';
    return 'bg-yellow-100 text-yellow-600 border-yellow-200';
  };

  const getSeverityLabel = (severity: string) => {
    if (severity === 'CRITICAL') return 'Critique';
    if (severity === 'HIGH') return 'Élevé';
    if (severity === 'MEDIUM') return 'Moyen';
    return 'Mineur';
  };

  return (
    <div className="p-6 space-y-8">
      {/* Score de conduite */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 text-white flex items-center justify-between shadow-lg">
        <div>
          <h3 className="text-[var(--text-muted)] font-medium mb-1 flex items-center gap-2">
            <Shield className="w-5 h-5" /> Score de Conduite
          </h3>
          <div className="text-4xl font-bold tracking-tight">{safetyScore}/100</div>
          <p className="text-sm text-[var(--text-muted)] mt-2">{comment}</p>
        </div>
        <div className={`h-20 w-20 rounded-full border-4 flex items-center justify-center bg-slate-800 ${borderColor}`}>
          <span className={`text-2xl font-bold ${gradeColor}`}>{grade}</span>
        </div>
      </div>

      {/* Violations de règles */}
      <section>
        <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
          <AlertOctagon className="w-5 h-5 text-red-500" />
          Violations de règles
        </h3>

        {violations.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)] italic text-center py-4">
            Aucune violation de règle aujourd'hui.
          </p>
        ) : (
          <div className="space-y-4">
            {violations.map((v) => (
              <div
                key={v.id}
                className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg border ${getSeverityColor(v.severity)}`}>
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-[var(--text-primary)]">{v.type}</h4>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${getSeverityColor(v.severity)}`}>
                        {getSeverityLabel(v.severity)}
                      </span>
                    </div>
                  </div>
                  <div className="text-right text-xs text-[var(--text-secondary)] flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(v.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <div className="pl-[3.25rem]">
                  <p className="text-sm text-[var(--text-secondary)]">{v.message}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
