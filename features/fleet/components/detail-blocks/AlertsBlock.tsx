import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
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
    return <div className="text-xs text-[var(--text-muted)] italic p-2">Aucune alerte aujourd'hui.</div>;
  }

  const visible = expanded ? alerts : alerts.slice(0, PREVIEW_COUNT);
  const hasMore = alerts.length > PREVIEW_COUNT;

  return (
    <div className="space-y-2">
      {visible.map((alert) => (
        <ConfigurableRow
          key={alert.id}
          id={`alert-${alert.id}`}
          isConfigMode={isConfigMode}
          isHidden={hiddenFields.has(`alert-${alert.id}`)}
          onToggle={() => toggleFieldVisibility(`alert-${alert.id}`)}
        >
          <div
            className={`p-3 rounded border-l-4 ${
              alert.severity === 'HIGH' || alert.severity === 'CRITICAL'
                ? 'border-[var(--clr-danger)] bg-[var(--clr-danger-dim)]'
                : alert.severity === 'MEDIUM'
                  ? 'border-[var(--clr-warning)] bg-[var(--clr-warning-dim)]'
                  : 'border-[var(--clr-caution)] bg-[var(--clr-caution-dim)]'
            }`}
          >
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold text-[var(--text-primary)]">{alert.type}</span>
              <span className="text-[10px] text-[var(--text-muted)]">
                {new Date(alert.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div className="text-[10px] text-[var(--text-secondary)] mt-1">{alert.message}</div>
          </div>
        </ConfigurableRow>
      ))}

      {hasMore && (
        <button
          onClick={() => setExpanded((e) => !e)}
          className="w-full py-2 text-xs text-[var(--primary)] hover:bg-[var(--primary-dim)] font-medium rounded transition-colors"
        >
          {expanded ? 'Réduire' : `Voir toutes les alertes (${alerts.length})`}
        </button>
      )}
    </div>
  );
};
