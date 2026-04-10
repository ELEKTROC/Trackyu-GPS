import React, { useMemo, useState } from 'react';
import { Card } from '../../../components/Card';
import { useDataContext } from '../../../contexts/DataContext';
import { useIsMobile } from '../../../hooks/useIsMobile';
import {
    DollarSign, Users, FileText, TrendingUp, AlertCircle, CheckCircle,
    ArrowUpRight, ArrowDownRight, Calendar, RefreshCw, Target, Zap, Building2
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    AreaChart, Area, PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts';
import { useDateRange } from '../../../hooks/useDateRange';
import { useCurrency } from '../../../hooks/useCurrency';
import { DateRangeSelector } from '../../../components/DateRangeSelector';
import { MobileFilterSheet, FilterRadioRow, type MobileFilterTab } from '../../../components/MobileFilterSheet';

export const SalesDashboard: React.FC<{ dateRange?: { start: string; end: string }; onNavigate?: (tab: string) => void }> = ({ dateRange: externalDateRange, onNavigate }) => {
    const { invoices, contracts, tiers, leads } = useDataContext();
    const { formatPrice, currency } = useCurrency();
    const isMobile = useIsMobile();
    const [resellerFilter, setResellerFilter] = useState<string>('ALL');
    const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

    // --- DATE LOGIC ---
    const {
        periodPreset,
        setPeriodPreset,
        customDateRange,
        setCustomDateRange,
        dateRange: internalDateRange
    } = useDateRange();

    const dateRange = externalDateRange || internalDateRange;

    // --- Reseller filter ---
    const resellers = useMemo(() => {
        const map = new Map<string, string>();
        contracts.forEach(c => { if (c.tenantId && c.resellerName) map.set(c.tenantId, c.resellerName); });
        return Array.from(map.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
    }, [contracts]);

    const filteredContracts = useMemo(() =>
        resellerFilter === 'ALL' ? contracts : contracts.filter(c => c.tenantId === resellerFilter),
        [contracts, resellerFilter]
    );

    // --- KPI CALCULATIONS ---
    const stats = useMemo(() => {
        const activeContracts = filteredContracts.filter(c => c.status === 'ACTIVE');
        const mrr = activeContracts.reduce((sum, c) => sum + (c.monthlyFee || 0), 0);
        const arr = mrr * 12; // Annual Recurring Revenue
        
        const filteredInvoices = dateRange ? invoices.filter(i => {
            const d = new Date(i.date).toISOString().split('T')[0];
            return d >= dateRange.start && d <= dateRange.end;
        }) : invoices;
        
        const totalInvoiced = filteredInvoices.reduce((sum, i) => sum + (i.amount || 0), 0);
        
        const unpaidInvoices = invoices.filter(i => i.status === 'SENT' || i.status === 'OVERDUE');
        const totalUnpaid = unpaidInvoices.reduce((sum, i) => sum + (i.amount - (i.paidAmount || 0)), 0);
        
        const activeClients = tiers.filter(t => t.type === 'CLIENT' && t.status === 'ACTIVE').length;
        const totalClients = tiers.filter(t => t.type === 'CLIENT').length;
        
        // Calcul réel du Churn Rate (contrats expirés/résiliés ce mois vs actifs)
        const expiredThisMonth = filteredContracts.filter(c => {
            if (c.status !== 'EXPIRED' && c.status !== 'TERMINATED') return false;
            const endDate = new Date(c.endDate);
            const now = new Date();
            return endDate.getMonth() === now.getMonth() && endDate.getFullYear() === now.getFullYear();
        }).length;
        const churnRate = activeContracts.length > 0 ? ((expiredThisMonth / activeContracts.length) * 100).toFixed(1) : 0;
        
        // LTV estimé (MRR moyen × durée moyenne en mois)
        const avgContractDuration = activeContracts.length > 0 
            ? activeContracts.reduce((sum, c) => {
                const start = new Date(c.startDate);
                const end = new Date(c.endDate);
                return sum + Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30));
            }, 0) / activeContracts.length 
            : 12;
        const avgMrrPerClient = activeClients > 0 ? mrr / activeClients : 0;
        const ltv = Math.round(avgMrrPerClient * avgContractDuration);
        
        // Prévision CA (trend basé sur les 3 derniers mois)
        const last3Months = [];
        for (let i = 2; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const monthInvoices = invoices.filter(inv => {
                const invDate = new Date(inv.date);
                return invDate.getMonth() === d.getMonth() && invDate.getFullYear() === d.getFullYear();
            });
            last3Months.push(monthInvoices.reduce((s, inv) => s + (inv.amount || 0), 0));
        }
        const avgGrowth = last3Months.length >= 2 
            ? ((last3Months[2] - last3Months[0]) / (last3Months[0] || 1)) * 100 / 2 
            : 0;
        const forecastNextMonth = Math.round(last3Months[2] * (1 + avgGrowth / 100));

        return { 
            mrr, arr, totalInvoiced, totalUnpaid, activeClients, totalClients,
            unpaidCount: unpaidInvoices.length, churnRate, ltv, avgContractDuration: Math.round(avgContractDuration),
            forecastNextMonth, avgGrowth: avgGrowth.toFixed(1)
        };
    }, [invoices, filteredContracts, tiers, dateRange, resellerFilter]);

    // --- CHART DATA ---
    const revenueData = useMemo(() => {
        const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
        const currentMonth = new Date().getMonth();
        const data = [];

        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(currentMonth - i);
            const monthIdx = d.getMonth();
            const year = d.getFullYear();
            
            const monthInvoices = invoices.filter(inv => {
                const invDate = new Date(inv.date);
                return invDate.getMonth() === monthIdx && invDate.getFullYear() === year;
            });

            const amount = monthInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
            data.push({ name: months[monthIdx], amount });
        }
        // Ajouter prévision
        const nextMonth = new Date();
        nextMonth.setMonth(currentMonth + 1);
        data.push({ name: months[nextMonth.getMonth()] + ' (Prévu)', amount: stats.forecastNextMonth, forecast: true });
        return data;
    }, [invoices, stats.forecastNextMonth]);

    // Contrats par statut (PieChart)
    const contractStatusData = useMemo(() => {
        const statusCounts = filteredContracts.reduce((acc, c) => {
            acc[c.status] = (acc[c.status] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        return [
            { name: 'Actifs', value: statusCounts['ACTIVE'] || 0, color: '#10b981' },
            { name: 'Suspendus', value: statusCounts['SUSPENDED'] || 0, color: '#f59e0b' },
            { name: 'Expirés', value: statusCounts['EXPIRED'] || 0, color: '#ef4444' },
            { name: 'Résiliés', value: statusCounts['TERMINATED'] || 0, color: '#6b7280' },
        ].filter(d => d.value > 0);
    }, [filteredContracts]);

    // Pipeline Leads (Funnel)
    const pipelineData = useMemo(() => {
        const stages = [
            { stage: 'Nouveaux', status: 'NEW', color: '#94a3b8' },
            { stage: 'Qualifiés', status: 'QUALIFIED', color: '#3b82f6' },
            { stage: 'Proposition', status: 'PROPOSAL', color: '#8b5cf6' },
            { stage: 'Gagnés', status: 'WON', color: '#10b981' },
        ];
        return stages.map(s => ({
            name: s.stage,
            value: (leads || []).filter(l => l.status === s.status).length,
            fill: s.color
        }));
    }, [leads]);

    // Pipeline Value
    const pipelineValue = useMemo(() => {
        return (leads || []).reduce((sum, l) => sum + (l.estimatedValue || 0), 0);
    }, [leads]);

    // Renouvellements prochains 7 jours
    const upcomingRenewals = useMemo(() => {
        const today = new Date();
        const in7Days = new Date();
        in7Days.setDate(today.getDate() + 7);
        return filteredContracts.filter(c => {
            if (c.status !== 'ACTIVE') return false;
            const endDate = new Date(c.endDate);
            return endDate >= today && endDate <= in7Days;
        }).sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());
    }, [filteredContracts]);

    return (
        <div className="space-y-6 h-full overflow-y-auto custom-scrollbar p-1">
            {/* Header: date selector + reseller filter */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                {!externalDateRange && (
                    <DateRangeSelector
                        periodPreset={periodPreset}
                        setPeriodPreset={setPeriodPreset}
                        customDateRange={customDateRange}
                        setCustomDateRange={setCustomDateRange}
                    />
                )}
                <div className="flex items-center gap-2 ml-auto">
                    {/* Mobile filter button */}
                    {isMobile && (
                        <button
                            onClick={() => setMobileFilterOpen(true)}
                            className="relative flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-600 dark:text-slate-300"
                        >
                            <Building2 className="w-4 h-4" />
                            Revendeur
                            {resellerFilter !== 'ALL' && (
                                <span className="absolute -top-1.5 -right-1.5 bg-blue-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">1</span>
                            )}
                        </button>
                    )}
                    {/* Desktop reseller filter */}
                    {!isMobile && resellers.length > 1 && (
                        <div className="relative">
                            <Building2 className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            <select
                                value={resellerFilter}
                                onChange={e => setResellerFilter(e.target.value)}
                                className="pl-8 pr-3 py-2 rounded-lg text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 appearance-none cursor-pointer"
                            >
                                <option value="ALL">Tous revendeurs</option>
                                {resellers.map(r => (
                                    <option key={r.id} value={r.id}>{r.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
            </div>
            {/* KPI CARDS - Hidden on mobile */}
            <div className="hidden sm:grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <Card className="p-4 border-slate-200 dark:border-slate-700 bg-gradient-to-br from-blue-50 to-white dark:from-slate-800 dark:to-slate-900">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                            <TrendingUp className="w-5 h-5" />
                        </div>
                    </div>
                    <p className="text-xs text-slate-500 font-medium uppercase">MRR</p>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white mt-1">
                        {(stats.mrr ?? 0).toLocaleString('fr-FR')}
                    </h3>
                    <p className="text-[10px] text-slate-400">Revenu mensuel récurrent</p>
                </Card>

                <Card className="p-4 border-slate-200 dark:border-slate-700 bg-gradient-to-br from-purple-50 to-white dark:from-slate-800 dark:to-slate-900">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400">
                            <DollarSign className="w-5 h-5" />
                        </div>
                    </div>
                    <p className="text-xs text-slate-500 font-medium uppercase">ARR</p>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white mt-1">
                        {(stats.arr ?? 0).toLocaleString('fr-FR')}
                    </h3>
                    <p className="text-[10px] text-slate-400">Revenu annuel récurrent</p>
                </Card>

                <Card className="p-4 border-slate-200 dark:border-slate-700">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-600 dark:text-green-400">
                            <CheckCircle className="w-5 h-5" />
                        </div>
                    </div>
                    <p className="text-xs text-slate-500 font-medium uppercase">Facturé</p>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white mt-1">
                        {(stats.totalInvoiced ?? 0).toLocaleString('fr-FR')}
                    </h3>
                    <p className="text-[10px] text-slate-400">Période sélectionnée</p>
                </Card>

                <Card className="p-4 border-slate-200 dark:border-slate-700">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg text-orange-600 dark:text-orange-400">
                            <AlertCircle className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-bold text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded">
                            {stats.unpaidCount}
                        </span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium uppercase">Impayés</p>
                    <h3 className="text-xl font-bold text-red-600 mt-1">
                        {(stats.totalUnpaid ?? 0).toLocaleString('fr-FR')}
                    </h3>
                    <p className="text-[10px] text-slate-400">Factures en attente</p>
                </Card>

                <Card className="p-4 border-slate-200 dark:border-slate-700">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg text-emerald-600 dark:text-emerald-400">
                            <Users className="w-5 h-5" />
                        </div>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            Number(stats.churnRate) > 5 ? 'text-red-600 bg-red-100' : 'text-green-600 bg-green-100'
                        }`}>
                            Churn: {stats.churnRate}%
                        </span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium uppercase">Clients</p>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white mt-1">
                        {stats.activeClients} <span className="text-sm font-normal text-slate-400">/ {stats.totalClients}</span>
                    </h3>
                    <p className="text-[10px] text-slate-400">Actifs</p>
                </Card>

                <Card className="p-4 border-slate-200 dark:border-slate-700">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg text-cyan-600 dark:text-cyan-400">
                            <Target className="w-5 h-5" />
                        </div>
                    </div>
                    <p className="text-xs text-slate-500 font-medium uppercase">LTV Client</p>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white mt-1">
                        {(stats.ltv ?? 0).toLocaleString('fr-FR')}
                    </h3>
                    <p className="text-[10px] text-slate-400">~{stats.avgContractDuration} mois moy.</p>
                </Card>
            </div>

            {/* PIPELINE VALUE + FORECAST */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-4 border-l-4 border-l-violet-500 bg-gradient-to-r from-violet-50 to-white dark:from-slate-800 dark:to-slate-900">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase">Pipeline Commercial</p>
                            <p className="text-2xl font-bold text-violet-600 mt-1">{formatPrice(pipelineValue ?? 0)}</p>
                            <p className="text-xs text-slate-500">{(leads || []).length} leads en cours</p>
                        </div>
                        <div className="flex gap-1">
                            {pipelineData.map(p => (
                                <div key={p.name} className="text-center px-2">
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: p.fill }}>
                                        {p.value}
                                    </div>
                                    <p className="text-[9px] text-slate-500 mt-1">{p.name}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </Card>

                <Card className="p-4 border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50 to-white dark:from-slate-800 dark:to-slate-900">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase">Prévision Mois Prochain</p>
                            <p className="text-2xl font-bold text-blue-600 mt-1">{formatPrice(stats.forecastNextMonth ?? 0)}</p>
                            <p className="text-xs text-slate-500 flex items-center gap-1">
                                {Number(stats.avgGrowth) >= 0 ? (
                                    <><ArrowUpRight className="w-3 h-3 text-green-500" /> +{stats.avgGrowth}% tendance</>
                                ) : (
                                    <><ArrowDownRight className="w-3 h-3 text-red-500" /> {stats.avgGrowth}% tendance</>
                                )}
                            </p>
                        </div>
                        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-600">
                            <Zap className="w-8 h-8" />
                        </div>
                    </div>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* REVENUE CHART + FORECAST */}
                <Card className="lg:col-span-2 p-6 border-slate-200 dark:border-slate-700">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">Évolution du Chiffre d'Affaires</h3>
                        <span className="text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">+ Prévision</span>
                    </div>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%" minHeight={200} minWidth={200} initialDimension={{ width: 200, height: 200 }}>
                            <AreaChart data={revenueData}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} tickFormatter={(value) => `${value / 1000}k`} />
                                <Tooltip 
                                    contentStyle={{backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                                    formatter={(value: number, _name: string, props: { payload?: { forecast?: boolean } }) => [
                                        formatPrice(value), 
                                        props.payload.forecast ? 'Prévision' : 'CA Réalisé'
                                    ]}
                                />
                                <Area type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* CONTRACTS PIE CHART */}
                <Card className="p-6 border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Répartition Contrats</h3>
                    <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%" minHeight={180} minWidth={180} initialDimension={{ width: 180, height: 180 }}>
                            <PieChart>
                                <Pie
                                    data={contractStatusData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={40}
                                    outerRadius={70}
                                    paddingAngle={3}
                                    dataKey="value"
                                >
                                    {contractStatusData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value: number) => [value, 'Contrats']} />
                                <Legend 
                                    layout="horizontal" 
                                    verticalAlign="bottom"
                                    formatter={(value) => <span className="text-xs text-slate-600">{value}</span>}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <p className="text-center text-xs text-slate-500 mt-2">{filteredContracts.length} contrats total</p>
                </Card>
            </div>

            {/* ROW 3: RENEWALS ALERTS + RECENT ACTIVITY */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* UPCOMING RENEWALS */}
                <Card className="p-6 border-slate-200 dark:border-slate-700 border-l-4 border-l-orange-500">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <RefreshCw className="w-5 h-5 text-orange-500" />
                            Renouvellements (7 jours)
                        </h3>
                        {upcomingRenewals.length > 0 && (
                            <span className="text-xs font-bold text-orange-600 bg-orange-100 px-2 py-1 rounded-full animate-pulse">
                                {upcomingRenewals.length} à traiter
                            </span>
                        )}
                    </div>
                    {upcomingRenewals.length === 0 ? (
                        <div className="text-center py-8 text-slate-400">
                            <Calendar className="w-12 h-12 mx-auto mb-2 opacity-30" />
                            <p className="text-sm">Aucun renouvellement imminent</p>
                        </div>
                    ) : (
                        <div className="space-y-3 max-h-48 overflow-y-auto custom-scrollbar">
                            {upcomingRenewals.map(c => {
                                const daysLeft = Math.ceil((new Date(c.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                                return (
                                    <div key={c.id} className="flex items-center gap-3 p-3 bg-orange-50 dark:bg-orange-900/10 rounded-lg border border-orange-200 dark:border-orange-800">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                                            daysLeft <= 2 ? 'bg-red-500' : daysLeft <= 5 ? 'bg-orange-500' : 'bg-yellow-500'
                                        }`}>
                                            {daysLeft}j
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-bold text-slate-800 dark:text-white">{c.clientName || tiers.find(t => t.id === c.clientId)?.name || 'Client'}</p>
                                            <p className="text-xs text-slate-500">{c.contractNumber || c.id} - {formatPrice(c.monthlyFee ?? 0)}</p>
                                        </div>
                                        <button 
                                            onClick={() => onNavigate?.('CONTRACTS')}
                                            className="px-3 py-1 bg-orange-500 text-white text-xs font-bold rounded hover:bg-orange-600 transition-colors"
                                        >
                                            Renouveler
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </Card>

                {/* RECENT ACTIVITY */}
                <Card className="p-6 border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Activités Récentes</h3>
                    <div className="space-y-3 max-h-48 overflow-y-auto custom-scrollbar">
                        {invoices.slice(0, 5).map(inv => (
                            <div key={inv.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                    inv.status === 'PAID' ? 'bg-green-100 text-green-600' : 
                                    inv.status === 'OVERDUE' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                                }`}>
                                    <FileText className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-slate-800 dark:text-white truncate">Facture {inv.number}</p>
                                    <p className="text-xs text-slate-500 truncate">{inv.clientName}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold text-slate-800 dark:text-white">{(inv.amount ?? 0).toLocaleString('fr-FR')}</p>
                                    <p className="text-[10px] text-slate-400">{new Date(inv.date).toLocaleDateString('fr-FR')}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>

            {/* Mobile Filter Sheet */}
            <MobileFilterSheet
                isOpen={mobileFilterOpen}
                onClose={() => setMobileFilterOpen(false)}
                activeCount={resellerFilter !== 'ALL' ? 1 : 0}
                onReset={() => setResellerFilter('ALL')}
                tabs={[
                    {
                        id: 'reseller',
                        label: 'Revendeur',
                        activeCount: resellerFilter !== 'ALL' ? 1 : 0,
                        content: (
                            <>
                                <FilterRadioRow value="ALL" label="Tous" checked={resellerFilter === 'ALL'} onChange={() => setResellerFilter('ALL')} />
                                {resellers.map(r => (
                                    <FilterRadioRow key={r.id} value={r.id} label={r.name} checked={resellerFilter === r.id} onChange={() => setResellerFilter(r.id)} />
                                ))}
                            </>
                        ),
                    },
                ] as MobileFilterTab[]}
            />
        </div>
    );
};