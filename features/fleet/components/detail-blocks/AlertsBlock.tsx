import React, { useState } from 'react';
import { Clock } from 'lucide-react';
import { ConfigurableRow } from './SharedBlocks';
import type { Alert } from '../../../../types';

const PREVIEW_COUNT = 3;

interface AlertsBlockProps {
  alerts: Alert[];
  isConfigMode: boolean;
  hiddenFields: Set<string>;
  toggleFieldVisibility: (id: string) => void;
}

export const AlertsBlock: React.FC<AlertsBlockProps> = ({
  alerts,
  isConfigMode,
  hiddenFields,
  toggleFieldVisibility,
}) => {
  const [expanded, setExpanded] = useState(false);

  if (!alerts || alerts.length === 0) {
    return (
      <div className="text-[11px] text-[var(--text-muted)] italic p-4 bg-[var(--bg-card)] rounded-[var(--brand-radius)] border border-dashed border-[var(--border)] text-center">
        Aucune alerte aujourd'hui.
      </div>
    );
  }

  const visible = expanded ? alerts : alerts.slice(0, PREVIEW_COUNT);
  const hasMore = alerts.length > PREVIEW_COUNT;

  const getSeverityClasses = (severity: string) => {
    if (severity === 'HIGH' || severity === 'CRITICAL') {
      return 'border-[var(--clr-danger)] bg-[var(--clr-danger-dim)]';
    }
    if (severity === 'MEDIUM') {
      return 'border-[var(--clr-warning)] bg-[var(--clr-warning-dim)]';
    }
    return 'border-[var(--clr-caution)] bg-[var(--clr-caution-dim)]';
  };

  return (
    <div className="space-y-3">
      {visible.map((alert) => (
        <ConfigurableRow
          key={alert.id}
          id={`alert-${alert.id}`}
          isConfigMode={isConfigMode}
          isHidden={hiddenFields.has(`alert-${alert.id}`)}
          onToggle={() => toggleFieldVisibility(`alert-${alert.id}`)}
        >
          <div
            className={`p-3 rounded-r-[var(--brand-radius)] border-l-4 transition-all ${getSeverityClasses(alert.severity)}`}
          >
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-black uppercase tracking-wider text-[var(--text-primary)]">
                {alert.type}
              </span>
              <div className="flex items-center gap-1 text-[9px] opacity-70 font-mono text-[var(--text-muted)]">
                <Clock className="w-2.5 h-2.5" />
                {new Date(alert.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
            <div className="text-[11px] mt-1 font-medium leading-relaxed text-[var(--text-secondary)]">
              {alert.message}
            </div>
          </div>
        </ConfigurableRow>
      ))}

      {hasMore && (
        <button
          onClick={() => setExpanded((e) => !e)}
          className="w-full py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/10 rounded-[var(--brand-radius)] transition-all"
        >
          {expanded ? 'Réduire' : `Voir les ${alerts.length - PREVIEW_COUNT} autres alertes`}
        </button>
      )}
    </div>
  );
};
