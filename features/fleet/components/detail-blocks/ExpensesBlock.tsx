import React from 'react';
import { DollarSign, ArrowUp, ArrowDown } from 'lucide-react';
import { ConfigurableRow } from './SharedBlocks';

interface ExpensesBlockProps {
  mockData: any;
  isConfigMode: boolean;
  hiddenFields: Set<string>;
  toggleFieldVisibility: (id: string) => void;
}

export const ExpensesBlock: React.FC<ExpensesBlockProps> = ({
  mockData,
  isConfigMode,
  hiddenFields,
  toggleFieldVisibility
}) => {
  return (
    <div className="grid grid-cols-2 gap-3">
        <ConfigurableRow id="expMonth" isConfigMode={isConfigMode} isHidden={hiddenFields.has('expMonth')} onToggle={() => toggleFieldVisibility('expMonth')}>
            <div className="p-3 bg-white border border-slate-100 rounded shadow-sm">
                <div className="text-[10px] text-slate-400 uppercase font-bold mb-1">Ce Mois</div>
                <div className="text-lg font-bold text-slate-800">{mockData.expenses.month}</div>
                <div className="text-[9px] text-green-500 flex items-center gap-0.5"><ArrowDown className="w-2 h-2" /> 12% vs N-1</div>
            </div>
        </ConfigurableRow>
        <ConfigurableRow id="expYear" isConfigMode={isConfigMode} isHidden={hiddenFields.has('expYear')} onToggle={() => toggleFieldVisibility('expYear')}>
            <div className="p-3 bg-white border border-slate-100 rounded shadow-sm">
                <div className="text-[10px] text-slate-400 uppercase font-bold mb-1">Cette Année</div>
                <div className="text-lg font-bold text-slate-800">{(mockData.expenses.year / 1000).toFixed(1)} k</div>
                <div className="text-[9px] text-red-500 flex items-center gap-0.5"><ArrowUp className="w-2 h-2" /> 5% vs N-1</div>
            </div>
        </ConfigurableRow>
    </div>
  );
};
