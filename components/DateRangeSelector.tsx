import React from 'react';
import { Calendar } from 'lucide-react';
import type { PeriodPreset } from '../hooks/useDateRange';
import { PERIOD_PRESETS } from '../hooks/useDateRange';

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
  setCustomDateRange,
}) => {
  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
        <select
          value={periodPreset}
          onChange={(e) => setPeriodPreset(e.target.value as PeriodPreset)}
          className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg text-sm py-2 px-3 text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
        >
          {Object.entries(PERIOD_PRESETS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {periodPreset === 'CUSTOM' && (
        <div className="flex items-center gap-2 bg-[var(--bg-elevated)] p-1 rounded-lg border border-[var(--border)]">
          <input
            type="date"
            value={customDateRange.start}
            onChange={(e) => setCustomDateRange((prev) => ({ ...prev, start: e.target.value }))}
            className="bg-transparent border-none text-sm focus:ring-0 text-[var(--text-primary)]"
          />
          <span className="text-[var(--text-muted)]">-</span>
          <input
            type="date"
            value={customDateRange.end}
            onChange={(e) => setCustomDateRange((prev) => ({ ...prev, end: e.target.value }))}
            className="bg-transparent border-none text-sm focus:ring-0 text-[var(--text-primary)]"
          />
        </div>
      )}
    </div>
  );
};
