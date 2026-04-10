import React, { useMemo } from 'react';
import { 
  Download, Users, Trophy, Briefcase, Clock, TrendingUp, Wrench, Calendar
} from 'lucide-react';
import { Card } from '../../../components/Card';
import { useDataContext } from '../../../contexts/DataContext';
import { useDateRange, PERIOD_PRESETS, PeriodPreset } from '../../../hooks/useDateRange';

export const TechTeamView: React.FC = () => {
    const { users, interventions } = useDataContext();

    // --- DATE LOGIC ---
    const { 
        periodPreset, 
        setPeriodPreset, 
        customDateRange, 
        setCustomDateRange, 
        dateRange 
    } = useDateRange('THIS_MONTH');

    // --- DERIVED DATA ---
    const technicians = useMemo(() => users.filter(u => {
        const role = u.role?.toLowerCase() || '';
        return role === 'technician' || role === 'technicien' || role.includes('tech');
    }), [users]);

    const filteredInterventions = useMemo(() => {
        if (!dateRange) return interventions; // ALL preset — no date filter
        return interventions.filter(i => {
            if (!i.scheduledDate) return false;
            const date = i.scheduledDate.split('T')[0];
            return date >= dateRange.start && date <= dateRange.end;
        });
    }, [interventions, dateRange]);

    // --- AGGREGATION LOGIC ---
    const stats = useMemo(() => {
        const totalVolume = filteredInterventions.length;
        const installVolume = filteredInterventions.filter(i => i.type === 'INSTALLATION').length;
        const repairVolume = filteredInterventions.filter(i => i.type === 'DEPANNAGE').length;

        const techStats = technicians.map(tech => {
            const techInts = filteredInterventions.filter(i => i.technicianId === tech.id);
            const installs = techInts.filter(i => i.type === 'INSTALLATION');
            const repairs = techInts.filter(i => i.type === 'DEPANNAGE');

            const calcAvgTime = (ints: typeof techInts) => {
                const completed = ints.filter(i => i.status === 'COMPLETED' && i.duration && i.duration > 0);
                if (completed.length === 0) return 0;
                const totalMinutes = completed.reduce((acc, curr) => acc + (curr.duration || 0), 0);
                return Math.round(totalMinutes / completed.length);
            };

            return {
                id: tech.id,
                name: tech.name,
                
                // Global
                total: techInts.length,
                percentTotal: totalVolume > 0 ? Math.round((techInts.length / totalVolume) * 100) : 0,
                avgTimeGlobal: calcAvgTime(techInts),

                // Installs
                installs: installs.length,
                percentInstalls: installVolume > 0 ? Math.round((installs.length / installVolume) * 100) : 0,
                avgTimeInstall: calcAvgTime(installs),

                // Repairs
                repairs: repairs.length,
                percentRepairs: repairVolume > 0 ? Math.round((repairs.length / repairVolume) * 100) : 0,
                avgTimeRepair: calcAvgTime(repairs),
            };
        }).sort((a, b) => b.total - a.total);

        return { techStats, totalVolume, installVolume, repairVolume };
    }, [technicians, filteredInterventions]);

    // --- GLOBAL KPI ---
    const globalStats = {
        total: stats.totalVolume,
        topPerformer: stats.techStats.length > 0 ? stats.techStats[0].name : '-',
        avgPerTech: stats.techStats.length > 0 ? (stats.totalVolume / stats.techStats.length).toFixed(1) : 0,
        avgTimeGlobal: (() => {
            const completed = filteredInterventions.filter(i => i.status === 'COMPLETED' && i.duration && i.duration > 0);
            return completed.length > 0 
                ? Math.round(completed.reduce((acc, i) => acc + (i.duration || 0), 0) / completed.length) 
                : 0;
        })()
    };

    // --- EXPORT FUNCTION ---
    const handleExport = () => {
        const headers = ['Technicien', 'Total', '% Global', 'Temps Moy (min)', 'Installations', '% Installs', 'Temps Install (min)', 'SAV', '% SAV', 'Temps SAV (min)'];
        const escapeCSV = (val: string | number) => {
            const str = String(val);
            return str.includes(',') || str.includes('"') || str.includes('\n') ? `"${str.replace(/"/g, '""')}"` : str;
        };
        const rows = stats.techStats.map(s => [
            escapeCSV(s.name),
            s.total, s.percentTotal, s.avgTimeGlobal,
            s.installs, s.percentInstalls, s.avgTimeInstall,
            s.repairs, s.percentRepairs, s.avgTimeRepair
        ]);

        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `rapport_equipe_${dateRange.start}_${dateRange.end}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const formatTime = (min: number) => {
        if (min === 0) return '-';
        const h = Math.floor(min / 60);
        const m = min % 60;
        return h > 0 ? `${h}h${m}` : `${m} min`;
    };

    return (
        <div className="flex flex-col h-full space-y-4 overflow-hidden">
            
            {/* FILTERS BAR */}
            <Card className="p-3 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shrink-0">
                <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-3">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 flex-wrap">
                        <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-slate-500 shrink-0" />
                            <select
                                value={periodPreset}
                                onChange={(e) => setPeriodPreset(e.target.value as PeriodPreset)}
                                title="Sélectionner la période"
                                className="flex-1 sm:flex-none px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900 text-sm font-medium text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            >
                                {Object.entries(PERIOD_PRESETS).map(([key, label]) => (
                                    <option key={key} value={key}>{label}</option>
                                ))}
                            </select>
                        </div>
                        {periodPreset === 'CUSTOM' && (
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                <input
                                    type="date"
                                    value={customDateRange.start}
                                    onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))}
                                    title="Date de début"
                                    className="px-2 py-1.5 border border-slate-200 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900 text-sm"
                                />
                                <span className="text-slate-400 text-sm text-center">→</span>
                                <input
                                    type="date"
                                    value={customDateRange.end}
                                    onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
                                    title="Date de fin"
                                    className="px-2 py-1.5 border border-slate-200 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900 text-sm"
                                />
                            </div>
                        )}
                        <span className="text-xs text-slate-400">
                            {stats.techStats.length} technicien{stats.techStats.length > 1 ? 's' : ''} · {stats.totalVolume} intervention{stats.totalVolume > 1 ? 's' : ''}
                        </span>
                    </div>
                    <button
                        onClick={handleExport}
                        className="flex items-center justify-center gap-2 w-full sm:w-auto px-4 py-2 text-sm font-bold rounded-lg border border-green-200 text-green-600 bg-green-50 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400 hover:bg-green-100 transition-colors"
                    >
                        <Download className="w-4 h-4" /> Exporter CSV
                    </button>
                </div>
            </Card>

            {/* MINI DASHBOARD */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 shrink-0">
                <Card className="p-3 md:p-4 border-l-4 border-l-blue-500 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] md:text-xs font-bold text-slate-500 uppercase">Total</p>
                        <p className="text-xl md:text-2xl font-bold text-slate-800 dark:text-slate-100">{globalStats.total}</p>
                    </div>
                    <Briefcase className="w-6 h-6 md:w-8 md:h-8 text-blue-400 dark:text-blue-600" />
                </Card>
                <Card className="p-3 md:p-4 border-l-4 border-l-yellow-500 flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                        <p className="text-[10px] md:text-xs font-bold text-slate-500 uppercase">Top</p>
                        <p className="text-sm md:text-lg font-bold text-slate-800 dark:text-slate-100 truncate max-w-[90px] md:max-w-[150px]" title={globalStats.topPerformer}>{globalStats.topPerformer}</p>
                    </div>
                    <Trophy className="w-6 h-6 md:w-8 md:h-8 text-yellow-400 dark:text-yellow-600 shrink-0" />
                </Card>
                <Card className="p-3 md:p-4 border-l-4 border-l-purple-500 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] md:text-xs font-bold text-slate-500 uppercase">Moy / Tech</p>
                        <p className="text-xl md:text-2xl font-bold text-slate-800 dark:text-slate-100">{globalStats.avgPerTech}</p>
                    </div>
                    <Users className="w-6 h-6 md:w-8 md:h-8 text-purple-400 dark:text-purple-600" />
                </Card>
                <Card className="p-3 md:p-4 border-l-4 border-l-green-500 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] md:text-xs font-bold text-slate-500 uppercase">Tps Moyen</p>
                        <p className="text-xl md:text-2xl font-bold text-slate-800 dark:text-slate-100">{formatTime(globalStats.avgTimeGlobal)}</p>
                    </div>
                    <Clock className="w-6 h-6 md:w-8 md:h-8 text-green-400 dark:text-green-600" />
                </Card>
            </div>

            {/* MAIN CONTENT - SCROLLABLE */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-20 lg:pb-6">
                    
                    {/* TABLE 1: GLOBAL PERFORMANCE */}
                    <Card className="p-0 border-slate-200 dark:border-slate-700 overflow-hidden h-fit">
                        <div className="p-3 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4" /> Performance Globale
                        </div>
                        <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs sm:text-sm">
                            <thead className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                                <tr>
                                    <th className="px-3 sm:px-4 py-2 text-slate-500 font-medium">Technicien</th>
                                    <th className="px-3 sm:px-4 py-2 text-slate-500 font-medium text-right">Total</th>
                                    <th className="px-3 sm:px-4 py-2 text-slate-500 font-medium text-right">%</th>
                                    <th className="px-3 sm:px-4 py-2 text-slate-500 font-medium text-right">Moy.</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {stats.techStats.length === 0 && (
                                    <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400 text-sm">Aucun technicien trouvé</td></tr>
                                )}
                                {stats.techStats.map(s => (
                                    <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                        <td className="px-3 sm:px-4 py-2 font-medium">{s.name}</td>
                                        <td className="px-3 sm:px-4 py-2 text-right font-bold">{s.total}</td>
                                        <td className="px-3 sm:px-4 py-2 text-right text-slate-500">{s.percentTotal}%</td>
                                        <td className="px-3 sm:px-4 py-2 text-right font-mono text-blue-600">{formatTime(s.avgTimeGlobal)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        </div>
                    </Card>

                    {/* TABLE 2: INSTALLATIONS */}
                    <Card className="p-0 border-slate-200 dark:border-slate-700 overflow-hidden h-fit">
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800 font-bold text-blue-800 dark:text-blue-200 flex items-center gap-2">
                            <Briefcase className="w-4 h-4" /> Installations
                        </div>
                        <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs sm:text-sm">
                            <thead className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                                <tr>
                                    <th className="px-3 sm:px-4 py-2 text-slate-500 font-medium">Technicien</th>
                                    <th className="px-3 sm:px-4 py-2 text-slate-500 font-medium text-right">Vol.</th>
                                    <th className="px-3 sm:px-4 py-2 text-slate-500 font-medium text-right">%</th>
                                    <th className="px-3 sm:px-4 py-2 text-slate-500 font-medium text-right">Moy.</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {stats.techStats.length === 0 && (
                                    <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400 text-sm">Aucun technicien trouvé</td></tr>
                                )}
                                {stats.techStats.map(s => (
                                    <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                        <td className="px-3 sm:px-4 py-2 font-medium">{s.name}</td>
                                        <td className="px-3 sm:px-4 py-2 text-right font-bold">{s.installs}</td>
                                        <td className="px-3 sm:px-4 py-2 text-right text-slate-500">{s.percentInstalls}%</td>
                                        <td className="px-3 sm:px-4 py-2 text-right font-mono text-blue-600">{formatTime(s.avgTimeInstall)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        </div>
                    </Card>

                    {/* TABLE 3: SAV / DEPANNAGE */}
                    <Card className="p-0 border-slate-200 dark:border-slate-700 overflow-hidden h-fit">
                        <div className="p-3 bg-orange-50 dark:bg-orange-900/20 border-b border-orange-100 dark:border-orange-800 font-bold text-orange-800 dark:text-orange-200 flex items-center gap-2">
                            <Wrench className="w-4 h-4" /> SAV & Dépannages
                        </div>
                        <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs sm:text-sm">
                            <thead className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                                <tr>
                                    <th className="px-3 sm:px-4 py-2 text-slate-500 font-medium">Technicien</th>
                                    <th className="px-3 sm:px-4 py-2 text-slate-500 font-medium text-right">Vol.</th>
                                    <th className="px-3 sm:px-4 py-2 text-slate-500 font-medium text-right">%</th>
                                    <th className="px-3 sm:px-4 py-2 text-slate-500 font-medium text-right">Moy.</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {stats.techStats.length === 0 && (
                                    <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400 text-sm">Aucun technicien trouvé</td></tr>
                                )}
                                {stats.techStats.map(s => (
                                    <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                        <td className="px-3 sm:px-4 py-2 font-medium">{s.name}</td>
                                        <td className="px-3 sm:px-4 py-2 text-right font-bold">{s.repairs}</td>
                                        <td className="px-3 sm:px-4 py-2 text-right text-slate-500">{s.percentRepairs}%</td>
                                        <td className="px-3 sm:px-4 py-2 text-right font-mono text-blue-600">{formatTime(s.avgTimeRepair)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        </div>
                    </Card>

                    {/* TABLE 4: TEMPS MOYENS */}
                    <Card className="p-0 border-slate-200 dark:border-slate-700 overflow-hidden h-fit">
                        <div className="p-3 bg-purple-50 dark:bg-purple-900/20 border-b border-purple-100 dark:border-purple-800 font-bold text-purple-800 dark:text-purple-200 flex items-center gap-2">
                            <Clock className="w-4 h-4" /> Temps Moyens (min)
                        </div>
                        <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs sm:text-sm">
                            <thead className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                                <tr>
                                    <th className="px-3 sm:px-4 py-2 text-slate-500 font-medium">Technicien</th>
                                    <th className="px-3 sm:px-4 py-2 text-slate-500 font-medium text-right">Global</th>
                                    <th className="px-3 sm:px-4 py-2 text-slate-500 font-medium text-right">Install</th>
                                    <th className="px-3 sm:px-4 py-2 text-slate-500 font-medium text-right">SAV</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {stats.techStats.length === 0 && (
                                    <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400 text-sm">Aucun technicien trouvé</td></tr>
                                )}
                                {stats.techStats.map(s => (
                                    <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                        <td className="px-3 sm:px-4 py-2 font-medium">{s.name}</td>
                                        <td className="px-3 sm:px-4 py-2 text-right font-mono text-slate-700 dark:text-slate-300">{formatTime(s.avgTimeGlobal)}</td>
                                        <td className="px-3 sm:px-4 py-2 text-right font-mono text-blue-600">{formatTime(s.avgTimeInstall)}</td>
                                        <td className="px-3 sm:px-4 py-2 text-right font-mono text-orange-600">{formatTime(s.avgTimeRepair)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};
