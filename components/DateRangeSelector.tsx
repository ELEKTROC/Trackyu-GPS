import React from 'react';
import { Calendar } from 'lucide-react';
import { PERIOD_PRESETS, PeriodPreset } from '../hooks/useDateRange';

interface DateRangeSelectorProps {
    periodPreset: PeriodPreset;
    setPeriodPreset: (preset: PeriodPreset) => void;
    customDateRange: { start: string; end: string };
    setCustomDateRange: React.Dispatch<React.SetStateAction<{ start: string; end: string }>>;
}

export const DateRangeSelector: React.FC<DateRangeSelectorProps> = ({
    periodPreset,
    setPeriodPreset,
    customDateRange,
    setCustomDateRange
}) => {
    return (
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                <select
                    value={periodPreset}
                    onChange={(e) => setPeriodPreset(e.target.value as PeriodPreset)}
                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm py-2 px-3 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                    {Object.entries(PERIOD_PRESETS).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                    ))}
                </select>
            </div>

            {periodPreset === 'CUSTOM' && (
                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                    <input 
                        type="date" 
                        value={customDateRange.start}
                        onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))}
                        className="bg-transparent border-none text-sm focus:ring-0 text-slate-700 dark:text-slate-300"
                    />
                    <span className="text-slate-400">-</span>
                    <input 
                        type="date" 
                        value={customDateRange.end}
                        onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
                        className="bg-transparent border-none text-sm focus:ring-0 text-slate-700 dark:text-slate-300"
                    />
                </div>
            )}
        </div>
    );
};
