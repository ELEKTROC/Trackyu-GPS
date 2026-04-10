import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { ConfigurableRow } from './SharedBlocks';
import { Alert } from '../../../../types';

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
  toggleFieldVisibility
}) => {
  if (!alerts || alerts.length === 0) {
      return <div className="text-xs text-slate-400 italic p-2">Aucune alerte récente.</div>;
  }

  return (
    <div className="space-y-2">
        {alerts.map((alert) => (
            <ConfigurableRow key={alert.id} id={`alert-${alert.id}`} isConfigMode={isConfigMode} isHidden={hiddenFields.has(`alert-${alert.id}`)} onToggle={() => toggleFieldVisibility(`alert-${alert.id}`)}>
                <div className={`p-3 rounded border-l-4 ${alert.severity === 'HIGH' || alert.severity === 'CRITICAL' ? 'border-red-500 bg-red-50' : alert.severity === 'MEDIUM' ? 'border-orange-400 bg-orange-50' : 'border-yellow-400 bg-yellow-50'}`}>
                    <div className="flex justify-between items-start">
                        <span className="text-xs font-bold text-slate-700">{alert.type}</span>
                        <span className="text-[10px] text-slate-400">{new Date(alert.createdAt).toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">{alert.message}</div>
                </div>
            </ConfigurableRow>
        ))}
    </div>
  );
};
