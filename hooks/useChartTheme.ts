import { useMemo } from 'react';
import { useTheme } from '../contexts/ThemeContext';

/**
 * Hook centralisé pour le thème des graphiques Recharts.
 * Retourne les couleurs adaptées au mode clair/sombre.
 * 
 * Usage:
 * ```tsx
 * const { chartGrid, chartText, tooltipStyle, pieStroke, legendStyle } = useChartTheme();
 * <CartesianGrid stroke={chartGrid} />
 * <XAxis tick={{ fill: chartText, fontSize: 11 }} />
 * <Tooltip contentStyle={tooltipStyle} />
 * <Pie stroke={pieStroke} />
 * <Legend wrapperStyle={legendStyle} />
 * ```
 */
export function useChartTheme() {
  const { isDarkMode } = useTheme();

  return useMemo(() => {
    const chartGrid = isDarkMode ? '#334155' : '#e2e8f0';     // slate-700 / slate-200
    const chartText = isDarkMode ? '#94a3b8' : '#64748b';     // slate-400 / slate-500
    const tooltipBg = isDarkMode ? '#1e293b' : '#fff';        // slate-800 / white
    const tooltipBorder = isDarkMode ? '#334155' : '#e2e8f0'; // slate-700 / slate-200
    const pieStroke = isDarkMode ? '#1e293b' : '#fff';        // slate-800 / white
    const cursorFill = isDarkMode ? '#334155' : '#f8fafc';    // slate-700 / slate-50

    return {
      isDarkMode,
      chartGrid,
      chartText,
      tooltipBg,
      tooltipBorder,
      pieStroke,
      cursorFill,
      // Tooltip contentStyle prêt à utiliser
      tooltipStyle: {
        backgroundColor: tooltipBg,
        borderRadius: '8px',
        border: `1px solid ${tooltipBorder}`,
      } as React.CSSProperties,
      // Tooltip itemStyle
      tooltipItemStyle: {
        color: isDarkMode ? '#e2e8f0' : '#1e293b',
      } as React.CSSProperties,
      // Legend style
      legendStyle: {
        color: chartText,
        fontSize: '11px',
      } as React.CSSProperties,
      // Cursor pour BarChart Tooltip
      barCursor: { fill: cursorFill },
      // Tick props standard pour axes
      axisTick: { fill: chartText, fontSize: 11 },
      axisTickSm: { fill: chartText, fontSize: 10 },
    };
  }, [isDarkMode]);
}
