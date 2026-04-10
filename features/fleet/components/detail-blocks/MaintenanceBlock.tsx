import React from 'react';
import { AlertCircle, Check, Bell } from 'lucide-react';
import { ConfigurableRow } from './SharedBlocks';

interface MaintenanceBlockProps {
  mockData: any;
  isConfigMode: boolean;
  hiddenFields: Set<string>;
  toggleFieldVisibility: (id: string) => void;
  setActiveModal: (modal: string) => void;
}

export const MaintenanceBlock: React.FC<MaintenanceBlockProps> = ({
  mockData,
  isConfigMode,
  hiddenFields,
  toggleFieldVisibility,
  setActiveModal
}) => {
  return (
    <div className="space-y-3">
        {mockData.maintenanceList.map((task: any, i: number) => (
            <ConfigurableRow key={i} id={`maint-${i}`} isConfigMode={isConfigMode} isHidden={hiddenFields.has(`maint-${i}`)} onToggle={() => toggleFieldVisibility(`maint-${i}`)}>
                <div className="flex items-center justify-between p-2 border border-slate-100 rounded hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                        {task.status === 'warning' ? <AlertCircle className="w-4 h-4 text-orange-500" /> : <Check className="w-4 h-4 text-green-500" />}
                        <div>
                            <div className="text-xs font-bold text-slate-700">{task.task}</div>
                            <div className={`text-[10px] ${task.status === 'warning' ? 'text-orange-500 font-bold' : 'text-slate-400'}`}>{task.due}</div>
                        </div>
                    </div>
                    <span className="text-xs font-mono text-slate-500">{task.cost}</span>
                </div>
            </ConfigurableRow>
        ))}
        <button onClick={() => setActiveModal('maintenance')} className="w-full text-xs text-blue-600 hover:underline mt-2">Voir le carnet complet</button>
    </div>
  );
};
