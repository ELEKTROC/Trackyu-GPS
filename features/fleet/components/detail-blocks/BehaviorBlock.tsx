import React from 'react';
import { TrendingDown } from 'lucide-react';
import { ConfigurableRow } from './SharedBlocks';

interface BehaviorBlockProps {
  mockData: any;
  isConfigMode: boolean;
  hiddenFields: Set<string>;
  toggleFieldVisibility: (id: string) => void;
}

export const BehaviorBlock: React.FC<BehaviorBlockProps> = ({
  mockData,
  isConfigMode,
  hiddenFields,
  toggleFieldVisibility
}) => {
  return (
    <div className="space-y-4">
        <div className="flex items-center justify-center py-2">
            <div className="relative w-24 h-24 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                    <circle cx="48" cy="48" r="40" stroke="#e2e8f0" strokeWidth="8" fill="none" />
                    <circle cx="48" cy="48" r="40" stroke={mockData.safetyScore > 80 ? "#22c55e" : mockData.safetyScore > 60 ? "#f97316" : "#ef4444"} strokeWidth="8" fill="none" strokeDasharray="251.2" strokeDashoffset={251.2 * (1 - mockData.safetyScore / 100)} className="transition-all duration-1000 ease-out" />
                </svg>
                <div className="absolute text-center">
                    <span className="text-2xl font-bold text-slate-700">{mockData.safetyScore}</span>
                    <span className="block text-[8px] text-slate-400 uppercase">Score</span>
                </div>
            </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
            <ConfigurableRow id="harshBraking" isConfigMode={isConfigMode} isHidden={hiddenFields.has('harshBraking')} onToggle={() => toggleFieldVisibility('harshBraking')}>
                <div className="p-2 bg-slate-50 rounded">
                    <span className="block text-lg font-bold text-slate-700">{mockData.harshBraking}</span>
                    <span className="text-[9px] text-slate-400 uppercase">Freinages</span>
                </div>
            </ConfigurableRow>
            <ConfigurableRow id="harshAccel" isConfigMode={isConfigMode} isHidden={hiddenFields.has('harshAccel')} onToggle={() => toggleFieldVisibility('harshAccel')}>
                <div className="p-2 bg-slate-50 rounded">
                    <span className="block text-lg font-bold text-slate-700">{mockData.harshAccel}</span>
                    <span className="text-[9px] text-slate-400 uppercase">Accél.</span>
                </div>
            </ConfigurableRow>
            <ConfigurableRow id="sharpTurn" isConfigMode={isConfigMode} isHidden={hiddenFields.has('sharpTurn')} onToggle={() => toggleFieldVisibility('sharpTurn')}>
                <div className="p-2 bg-slate-50 rounded">
                    <span className="block text-lg font-bold text-slate-700">{mockData.sharpTurn}</span>
                    <span className="text-[9px] text-slate-400 uppercase">Virages</span>
                </div>
            </ConfigurableRow>
        </div>
    </div>
  );
};
