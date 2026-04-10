import { useState, useMemo } from 'react';

export const PERIOD_PRESETS = {
  ALL: 'Tout',
  TODAY: "Aujourd'hui",
  YESTERDAY: 'Hier',
  THIS_WEEK: 'Cette semaine',
  LAST_WEEK: 'Semaine précédente',
  THIS_MONTH: 'Ce mois',
  LAST_MONTH: 'Mois précédent',
  THIS_YEAR: 'Cette année',
  LAST_YEAR: 'Année précédente',
  CUSTOM: 'Personnaliser',
} as const;

export type PeriodPreset = keyof typeof PERIOD_PRESETS;

export const useDateRange = (initialPreset: PeriodPreset = 'THIS_YEAR') => {
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>(initialPreset);
  const [customDateRange, setCustomDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });

  const dateRange = useMemo(() => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const start = new Date(now);
    const end = new Date(now);

    switch (periodPreset) {
      case 'TODAY':
        return { start: today, end: today };
      case 'YESTERDAY':
        start.setDate(now.getDate() - 1);
        return { start: start.toISOString().split('T')[0], end: start.toISOString().split('T')[0] };
      case 'THIS_WEEK': {
        const day = now.getDay() || 7;
        if (day !== 1) start.setHours(-24 * (day - 1));
        return { start: start.toISOString().split('T')[0], end: today };
      }
      case 'LAST_WEEK':
        start.setDate(now.getDate() - (now.getDay() || 7) - 6);
        end.setDate(now.getDate() - (now.getDay() || 7));
        return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
      case 'THIS_MONTH':
        return { start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0], end: today };
      case 'LAST_MONTH':
        return {
          start: new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0],
          end: new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0],
        };
      case 'THIS_YEAR':
        return { start: new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0], end: today };
      case 'LAST_YEAR':
        return {
          start: new Date(now.getFullYear() - 1, 0, 1).toISOString().split('T')[0],
          end: new Date(now.getFullYear() - 1, 11, 31).toISOString().split('T')[0],
        };
      case 'CUSTOM':
        return customDateRange;
      case 'ALL':
        return null; // No date filtering
      default:
        return null; // Default to no filtering
    }
  }, [periodPreset, customDateRange]);

  return {
    periodPreset,
    setPeriodPreset,
    customDateRange,
    setCustomDateRange,
    dateRange,
  };
};
