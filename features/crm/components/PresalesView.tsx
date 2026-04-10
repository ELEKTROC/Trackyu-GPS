import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../../../components/Card';
import { CRMView } from './CRMView';
import { FinanceView } from '../../finance/components/FinanceView';
import { Users, FileDigit, BookOpen, TrendingUp, CheckCircle, AlertCircle, Briefcase, PieChart, ListTodo, Zap, Target, Clock, XCircle, Flame, Thermometer, Snowflake, ArrowRight, UserPlus } from 'lucide-react';
import { Lead, Quote } from '../../../types';
import { useDataContext } from '../../../contexts/DataContext';
import { Tabs } from '../../../components/Tabs';
import { MobileTabLayout } from '../../../components/MobileTabLayout';
import { useDateRange } from '../../../hooks/useDateRange';
import { useCurrency } from '../../../hooks/useCurrency';
import { DateRangeSelector } from '../../../components/DateRangeSelector';
import { TasksView } from './TasksView';
import { AutomationRulesView } from './AutomationRulesView';
import { PipelineView } from './PipelineView';
import { RegistrationRequestsPanel } from '../../admin/components/panels/RegistrationRequestsPanel';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart as RePieChart, Pie, Cell } from 'recharts';
import { useIsMobile } from '../../../hooks/useIsMobile';

type Tab = 'OVERVIEW' | 'LEADS' | 'QUOTES' | 'CATALOG' | 'TASKS' | 'AUTOMATION' | 'REGISTRATION' | 'PIPELINE';

interface PresalesViewProps {
  initialTab?: string;
}

export const PresalesView: React.FC<PresalesViewProps> = ({ initialTab }) => {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<Tab>('OVERVIEW');
  const [quoteDraft, setQuoteDraft] = useState<any>(null);
  const { leads, quotes, catalogItems: catalog, updateLeadStatus } = useDataContext();
  const { currency } = useCurrency();

  // --- DATE LOGIC --- Défaut: Cette année
  const { 
      periodPreset, 
      setPeriodPreset, 
      customDateRange, 
      setCustomDateRange, 
      dateRange 
  } = useDateRange('THIS_YEAR');

  useEffect(() => {
    if (initialTab && (initialTab === 'OVERVIEW' || initialTab === 'LEADS' || initialTab === 'QUOTES' || initialTab === 'CATALOG')) {
      setActiveTab(initialTab as Tab);
    }
  }, [initialTab]);

  const filteredLeads = useMemo(() => {
      if (!dateRange) return leads; // No date filter when dateRange is null
      return leads.filter(l => {
          const date = new Date(l.createdAt).toISOString().split('T')[0];
          return date >= dateRange.start && date <= dateRange.end;
      });
  }, [leads, dateRange]);

  const kpis = useMemo(() => {
    const newLeads = filteredLeads.filter(l => l.status === 'NEW').length;
    const qualifiedLeads = filteredLeads.filter(l => l.status === 'QUALIFIED').length;
    const proposalLeads = filteredLeads.filter(l => l.status === 'PROPOSAL').length;
    const wonLeads = filteredLeads.filter(l => l.status === 'WON').length;
    const lostLeads = filteredLeads.filter(l => l.status === 'LOST').length;
    const conversionRate = filteredLeads.length > 0 ? (wonLeads / filteredLeads.length) * 100 : 0;

    // Pipeline Value (somme des estimatedValue)
    const pipelineValue = filteredLeads
        .filter(l => l.status !== 'LOST' && l.status !== 'WON')
        .reduce((sum, l) => sum + (l.estimatedValue || 0), 0);

    // Temps moyen de conversion (NEW → WON)
    const wonLeadsWithDates = filteredLeads.filter(l => l.status === 'WON' && l.createdAt && l.updatedAt);
    const avgConversionDays = wonLeadsWithDates.length > 0
        ? Math.round(wonLeadsWithDates.reduce((sum, l) => {
            const created = new Date(l.createdAt);
            const updated = new Date(l.updatedAt || l.createdAt);
            return sum + Math.ceil((updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
        }, 0) / wonLeadsWithDates.length)
        : 0;

    // Leads dormants (>7 jours sans activité, non clôturés)
    const now = new Date();
    const dormantLeads = filteredLeads.filter(l => {
        if (l.status === 'WON' || l.status === 'LOST') return false;
        const lastActivity = new Date(l.updatedAt || l.createdAt);
        const daysSince = Math.ceil((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));
        return daysSince > 7;
    });

    // Scoring leads (Hot/Warm/Cold basé sur valeur et ancienneté)
    const scoredLeads = filteredLeads.filter(l => l.status !== 'WON' && l.status !== 'LOST').map(l => {
        const value = l.estimatedValue || 0;
        const daysSinceCreation = Math.ceil((now.getTime() - new Date(l.createdAt).getTime()) / (1000 * 60 * 60 * 24));
        let score = 'COLD';
        if (value > 500000 || (l.status === 'PROPOSAL' && daysSinceCreation < 14)) score = 'HOT';
        else if (value > 100000 || l.status === 'QUALIFIED') score = 'WARM';
        return { ...l, score };
    });
    const hotLeads = scoredLeads.filter(l => l.score === 'HOT').length;
    const warmLeads = scoredLeads.filter(l => l.score === 'WARM').length;
    const coldLeads = scoredLeads.filter(l => l.score === 'COLD').length;

    return {
        totalLeads: filteredLeads.length,
        newLeads,
        qualifiedLeads,
        proposalLeads,
        wonLeads,
        lostLeads,
        conversionRate,
        pipelineValue,
        avgConversionDays,
        dormantLeads: dormantLeads.length,
        dormantList: dormantLeads.slice(0, 5),
        hotLeads,
        warmLeads,
        coldLeads
    };
  }, [filteredLeads]);

  // Funnel Data
  const funnelData = useMemo(() => [
    { name: 'Nouveaux', value: kpis.newLeads, fill: '#94a3b8' },
    { name: 'Qualifiés', value: kpis.qualifiedLeads, fill: '#3b82f6' },
    { name: 'Proposition', value: kpis.proposalLeads, fill: '#8b5cf6' },
    { name: 'Gagnés', value: kpis.wonLeads, fill: '#22c55e' },
  ], [kpis]);

  const catalogKpis = useMemo(() => {
    const totalItems = catalog.length;
    const categories = new Set(catalog.map(i => i.category)).size;
    const activeItems = catalog.filter(i => i.status === 'ACTIVE').length;
    // Assuming price is available
    const avgPrice = totalItems > 0 ? catalog.reduce((acc, curr) => acc + (curr.price || 0), 0) / totalItems : 0;

    return {
      totalItems,
      categories,
      activeItems,
      avgPrice
    };
  }, [catalog]);

  const handleCreateQuote = (lead: Lead) => {
    setQuoteDraft({
        clientId: '', // Pas de client tant que le lead n'est pas converti
        clientName: lead.companyName,
        status: 'DRAFT',
        items: lead.interestedProducts?.map(p => ({
            description: p.name,
            quantity: p.quantity || 1,
            price: p.price
        })) || [],
        notes: `Devis créé depuis le lead: ${lead.companyName} (${lead.contactName})`,
        leadId: lead.id, // Pass Lead ID
        subject: `Proposition commerciale pour ${lead.companyName}`
    });
    setActiveTab('QUOTES');
  };

  const handleQuoteSaved = (item: unknown) => {
      const quote = item as Quote & { leadId?: string };
      if (quote.leadId) {
          const lead = leads.find(l => l.id === quote.leadId);
          if (lead && (lead.status === 'NEW' || lead.status === 'QUALIFIED')) {
              updateLeadStatus(lead.id, 'PROPOSAL');
          }
      }
  };

  const PRESALES_TABS_ALL = [
    { id: 'OVERVIEW',     label: "Vue d'ensemble",  icon: PieChart,   color: 'bg-blue-500',   description: 'KPIs et statistiques' },
    { id: 'LEADS',        label: 'Leads & Pistes',  icon: Users,      color: 'bg-orange-500', description: 'Pipeline commercial' },
    { id: 'PIPELINE',     label: 'Pipeline',        icon: TrendingUp, color: 'bg-purple-500', description: 'Vue pipeline Kanban' },
    { id: 'QUOTES',       label: 'Devis',           icon: FileDigit,  color: 'bg-green-500',  description: 'Propositions commerciales' },
    { id: 'CATALOG',      label: 'Catalogue',       icon: BookOpen,   color: 'bg-teal-500',   description: 'Produits et services' },
    { id: 'TASKS',        label: 'Tâches',          icon: ListTodo,   color: 'bg-slate-500',  description: 'Suivi des tâches' },
    { id: 'AUTOMATION',   label: 'Automatisations', icon: Zap,        color: 'bg-yellow-500', description: 'Règles automatiques' },
    { id: 'REGISTRATION', label: 'Inscriptions',    icon: UserPlus,   color: 'bg-indigo-500', description: 'Demandes entrantes' },
  ];

  const PRESALES_TABS = isMobile
    ? PRESALES_TABS_ALL.filter(t => !['PIPELINE', 'TASKS', 'AUTOMATION'].includes(t.id))
    : PRESALES_TABS_ALL;

  const handleTabChange = (id: string) => {
    setActiveTab(id as Tab);
    if (id === 'QUOTES') setQuoteDraft(null);
  };

  return (
    <div className="h-full flex flex-col space-y-3 sm:space-y-4 animate-in fade-in duration-500">
      
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-4">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white">Prévente & Leads</h1>
          <DateRangeSelector 
              periodPreset={periodPreset}
              setPeriodPreset={setPeriodPreset}
              customDateRange={customDateRange}
              setCustomDateRange={setCustomDateRange}
          />
      </div>

      {/* Desktop tabs */}
      {!isMobile && <Tabs tabs={PRESALES_TABS} activeTab={activeTab} onTabChange={handleTabChange} />}

      <MobileTabLayout tabs={PRESALES_TABS} activeTab={activeTab} onTabChange={handleTabChange} backLabel="Prévente">
      {/* Content Area */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {/* OVERVIEW TAB */}
        {activeTab === 'OVERVIEW' && (
          <div className="space-y-6 overflow-y-auto h-full custom-scrollbar p-1">
              {/* KPI CARDS - Hidden on mobile */}
              <div className="hidden sm:grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  <Card className="p-4 border-l-4 border-l-blue-500">
                      <div className="flex items-center justify-between">
                          <div>
                              <p className="text-xs font-bold text-slate-500 uppercase">Total Leads</p>
                              <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{kpis.totalLeads}</p>
                          </div>
                          <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-full text-blue-600">
                              <Users className="w-5 h-5" />
                          </div>
                      </div>
                </Card>
                <Card className="p-4 border-l-4 border-l-green-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase">Gagnés</p>
                            <p className="text-2xl font-bold text-green-600 mt-1">{kpis.wonLeads}</p>
                        </div>
                        <div className="p-2 bg-green-50 dark:bg-green-900/30 rounded-full text-green-600">
                            <CheckCircle className="w-5 h-5" />
                        </div>
                    </div>
                </Card>
                <Card className="p-4 border-l-4 border-l-red-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase">Perdus</p>
                            <p className="text-2xl font-bold text-red-600 mt-1">{kpis.lostLeads}</p>
                        </div>
                        <div className="p-2 bg-red-50 dark:bg-red-900/30 rounded-full text-red-600">
                            <XCircle className="w-5 h-5" />
                        </div>
                    </div>
                </Card>
                <Card className="p-4 border-l-4 border-l-purple-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase">Taux Conv.</p>
                            <p className="text-2xl font-bold text-purple-600 mt-1">{kpis.conversionRate.toFixed(1)}%</p>
                        </div>
                        <div className="p-2 bg-purple-50 dark:bg-purple-900/30 rounded-full text-purple-600">
                            <Target className="w-5 h-5" />
                        </div>
                    </div>
                </Card>
                <Card className="p-4 border-l-4 border-l-cyan-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase">Temps Conv.</p>
                            <p className="text-2xl font-bold text-cyan-600 mt-1">{kpis.avgConversionDays}j</p>
                        </div>
                        <div className="p-2 bg-cyan-50 dark:bg-cyan-900/30 rounded-full text-cyan-600">
                            <Clock className="w-5 h-5" />
                        </div>
                    </div>
                </Card>
                <Card className="p-4 border-l-4 border-l-violet-500 bg-gradient-to-r from-violet-50 to-white dark:from-slate-800 dark:to-slate-900">
                    <div>
                        <p className="text-xs font-bold text-slate-500 uppercase">Pipeline Value</p>
                        <p className="text-xl font-bold text-violet-600 mt-1">{(kpis.pipelineValue ?? 0).toLocaleString('fr-FR')}</p>
                        <p className="text-[10px] text-slate-400">{currency} en cours</p>
                    </div>
                </Card>
            </div>

            {/* SCORING + DORMANT ALERTS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Lead Scoring */}
                <Card className="p-4 border-slate-200 dark:border-slate-700">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                        <Thermometer className="w-4 h-4 text-orange-500" /> Scoring Leads
                    </h3>
                    <div className="flex items-center gap-4">
                        <div className="flex-1 text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                            <Flame className="w-6 h-6 text-red-500 mx-auto mb-1" />
                            <p className="text-2xl font-bold text-red-600">{kpis.hotLeads}</p>
                            <p className="text-[10px] text-red-500 font-bold uppercase">Hot</p>
                        </div>
                        <div className="flex-1 text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                            <Thermometer className="w-6 h-6 text-orange-500 mx-auto mb-1" />
                            <p className="text-2xl font-bold text-orange-600">{kpis.warmLeads}</p>
                            <p className="text-[10px] text-orange-500 font-bold uppercase">Warm</p>
                        </div>
                        <div className="flex-1 text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                            <Snowflake className="w-6 h-6 text-blue-500 mx-auto mb-1" />
                            <p className="text-2xl font-bold text-blue-600">{kpis.coldLeads}</p>
                            <p className="text-[10px] text-blue-500 font-bold uppercase">Cold</p>
                        </div>
                    </div>
                </Card>

                {/* Leads Dormants */}
                <Card className={`p-4 border-l-4 ${kpis.dormantLeads > 0 ? 'border-l-amber-500 bg-amber-50/50 dark:bg-amber-900/10' : 'border-l-slate-300'}`}>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                        <AlertCircle className={`w-4 h-4 ${kpis.dormantLeads > 0 ? 'text-amber-500 animate-pulse' : 'text-slate-400'}`} />
                        Leads Dormants (&gt;7 jours)
                        {kpis.dormantLeads > 0 && (
                            <span className="ml-auto text-xs font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
                                {kpis.dormantLeads} à relancer
                            </span>
                        )}
                    </h3>
                    {kpis.dormantLeads === 0 ? (
                        <p className="text-sm text-slate-400 text-center py-4">✓ Aucun lead dormant</p>
                    ) : (
                        <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
                            {kpis.dormantList.map((lead: Lead) => (
                                <div key={lead.id} className="flex items-center gap-2 p-2 bg-white dark:bg-slate-800 rounded border border-amber-200 dark:border-amber-800">
                                    <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-xs font-bold">
                                        {Math.ceil((new Date().getTime() - new Date(lead.updatedAt || lead.createdAt).getTime()) / (1000 * 60 * 60 * 24))}j
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{lead.companyName}</p>
                                        <p className="text-[10px] text-slate-500">{lead.contactName}</p>
                                    </div>
                                    <button 
                                        onClick={() => setActiveTab('LEADS')}
                                        className="px-2 py-1 bg-amber-500 text-white text-[10px] font-bold rounded hover:bg-amber-600"
                                    >
                                        Relancer
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            </div>

            {/* CHARTS - FUNNEL + PERFORMANCE */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* FUNNEL CHART */}
                <Card className="p-6">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                        <ArrowRight className="w-5 h-5 text-blue-500" /> Entonnoir Commercial
                    </h3>
                    <div className="h-64" style={{ minHeight: 200, minWidth: 200 }}>
                        <ResponsiveContainer width="100%" height="100%" minHeight={200} minWidth={200} initialDimension={{ width: 200, height: 200 }}>
                            <BarChart
                                layout="vertical"
                                data={funnelData}
                                margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" />
                                <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} />
                                <Tooltip formatter={(value: number) => [value, 'Leads']} />
                                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                    {funnelData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex justify-center gap-4 mt-4 text-xs">
                        {funnelData.map((item, i) => (
                            <div key={item.name} className="flex items-center gap-1">
                                <div className="w-3 h-3 rounded" style={{ backgroundColor: item.fill }}></div>
                                <span className="text-slate-600">{item.name}: {item.value}</span>
                            </div>
                        ))}
                    </div>
                </Card>
                
                {/* PIE CHART */}
                <Card className="p-6">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Répartition par Statut</h3>
                    <div className="h-64" style={{ minHeight: 200, minWidth: 200 }}>
                        <ResponsiveContainer width="100%" height="100%" minHeight={200} minWidth={200} initialDimension={{ width: 200, height: 200 }}>
                            <RePieChart>
                                <Pie
                                    data={[
                                        { name: 'Nouveau', value: kpis.newLeads, color: '#94a3b8' },
                                        { name: 'Qualifié', value: kpis.qualifiedLeads, color: '#3b82f6' },
                                        { name: 'Proposition', value: kpis.proposalLeads, color: '#8b5cf6' },
                                        { name: 'Gagné', value: kpis.wonLeads, color: '#22c55e' },
                                        { name: 'Perdu', value: kpis.lostLeads, color: '#ef4444' },
                                    ].filter(d => d.value > 0)}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={80}
                                    paddingAngle={3}
                                    dataKey="value"
                                >
                                    {[
                                        { name: 'Nouveau', value: kpis.newLeads, color: '#94a3b8' },
                                        { name: 'Qualifié', value: kpis.qualifiedLeads, color: '#3b82f6' },
                                        { name: 'Proposition', value: kpis.proposalLeads, color: '#8b5cf6' },
                                        { name: 'Gagné', value: kpis.wonLeads, color: '#22c55e' },
                                        { name: 'Perdu', value: kpis.lostLeads, color: '#ef4444' },
                                    ].filter(d => d.value > 0).map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </RePieChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>
        </div>
      )}

      {/* LEADS TAB */}
      {activeTab === 'LEADS' && (
      <div className="hidden sm:grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase">Total Leads</p>
              <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{kpis.totalLeads}</p>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-full text-blue-600">
              <Users className="w-6 h-6" />
            </div>
          </div>
        </Card>
        <Card className="p-4 border-l-4 border-l-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase">Nouveaux (Mois)</p>
              <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">+{kpis.newLeads}</p>
            </div>
            <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-full text-green-600">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
        </Card>
        <Card className="p-4 border-l-4 border-l-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase">Qualifiés</p>
              <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{kpis.qualifiedLeads}</p>
            </div>
            <div className="p-3 bg-purple-50 dark:bg-purple-900/30 rounded-full text-purple-600">
              <CheckCircle className="w-6 h-6" />
            </div>
          </div>
        </Card>
        <Card className="p-4 border-l-4 border-l-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase">Taux Conversion</p>
              <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{kpis.conversionRate.toFixed(1)}%</p>
            </div>
            <div className="p-3 bg-orange-50 dark:bg-orange-900/30 rounded-full text-orange-600">
              <Briefcase className="w-6 h-6" />
            </div>
          </div>
        </Card>
      </div>
        )}

        {/* CATALOG TAB with KPI Cards */}
        {activeTab === 'CATALOG' && (
          <div className="space-y-4 overflow-y-auto h-full custom-scrollbar">
            <div className="hidden sm:grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="p-4 border-l-4 border-l-indigo-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase">Total Articles</p>
                    <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{catalogKpis.totalItems}</p>
                  </div>
                  <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-full text-indigo-600">
                    <BookOpen className="w-6 h-6" />
                  </div>
                </div>
              </Card>
              <Card className="p-4 border-l-4 border-l-pink-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase">Catégories</p>
                    <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{catalogKpis.categories}</p>
                  </div>
                  <div className="p-3 bg-pink-50 dark:bg-pink-900/30 rounded-full text-pink-600">
                    <FileDigit className="w-6 h-6" />
                  </div>
                </div>
              </Card>
              <Card className="p-4 border-l-4 border-l-teal-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase">Actifs</p>
                    <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{catalogKpis.activeItems}</p>
                  </div>
                  <div className="p-3 bg-teal-50 dark:bg-teal-900/30 rounded-full text-teal-600">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                </div>
              </Card>
              <Card className="p-4 border-l-4 border-l-amber-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase">Prix Moyen</p>
                    <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{catalogKpis.avgPrice.toFixed(2)}</p>
                  </div>
                  <div className="p-3 bg-amber-50 dark:bg-amber-900/30 rounded-full text-amber-600">
                    <Briefcase className="w-6 h-6" />
                  </div>
                </div>
              </Card>
            </div>
            <CRMView mode="CATALOG" />
          </div>
        )}

        {activeTab === 'LEADS' && <CRMView mode="LEADS" onCreateQuote={handleCreateQuote} dateRange={dateRange} />}
        {activeTab === 'PIPELINE' && (
          <div className="h-full overflow-y-auto pb-4">
            <PipelineView />
          </div>
        )}
        {activeTab === 'QUOTES' && <FinanceView mode="QUOTES" initialData={quoteDraft} dateRange={dateRange} onSaveSuccess={handleQuoteSaved} />}
        {activeTab === 'TASKS' && <TasksView />}
        {activeTab === 'AUTOMATION' && <AutomationRulesView />}
        {activeTab === 'REGISTRATION' && <RegistrationRequestsPanel />}
      </div>
      </MobileTabLayout>
    </div>
  );
};
