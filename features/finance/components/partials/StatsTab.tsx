import React from 'react';
import { Capacitor } from '@capacitor/core';
import { Card } from '../../../../components/Card';
import { TrendingUp, DollarSign, Calendar, FileText, Banknote, Building2, History, Target, Clock } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
  Line,
  ComposedChart,
} from 'recharts';
import { useTheme } from '../../../../contexts/ThemeContext';
import { useCurrency } from '../../../../hooks/useCurrency';

interface StatsTabProps {
  financeKPIs: {
    totalCAEmis: number;
    totalEncaissements: number;
    totalCharges: number;
    resultatNet: number;
    margePercent: number;
    tauxRecouvrement: number;
    dso?: number; // Days Sales Outstanding
  };
  top5ClientsImpayes: Array<{
    clientId: string;
    clientName: string;
    totalUnpaid: number;
    invoiceCount: number;
  }>;
  balanceStructure: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  agingBalance?: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  monthlyRevenueData: Array<{
    month: string;
    encaissements: number;
    depenses: number;
    solde: number;
  }>;
  bankBalanceData: Array<{
    month: string;
    solde: number;
  }>;
  budgetData: Array<{
    category: string;
    budget: number;
    reel: number;
    ecart: number;
  }>;
  recentActivity: Array<{
    id: string;
    type: 'payment' | 'invoice' | 'expense' | 'entry';
    description: string;
    amount: number;
    date: string;
  }>;
  isSuperAdmin?: boolean;
}

export const StatsTab: React.FC<StatsTabProps> = ({
  financeKPIs,
  top5ClientsImpayes,
  balanceStructure,
  agingBalance = [],
  monthlyRevenueData,
  bankBalanceData,
  budgetData,
  recentActivity,
}) => {
  const { formatPrice } = useCurrency();
  const { isDarkMode } = useTheme();

  const chartGridColor = isDarkMode ? '#334155' : '#e2e8f0';
  const chartTextColor = isDarkMode ? '#94a3b8' : '#64748b';
  const tooltipBg = isDarkMode ? '#1e293b' : '#fff';
  const tooltipBorder = isDarkMode ? '#334155' : '#e2e8f0';

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'payment':
        return '💰';
      case 'invoice':
        return '📄';
      case 'expense':
        return '💸';
      case 'entry':
        return '📝';
      default:
        return '📋';
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'payment':
        return 'text-emerald-600';
      case 'invoice':
        return 'text-[var(--primary)]';
      case 'expense':
        return 'text-red-600';
      case 'entry':
        return 'text-purple-600';
      default:
        return 'text-[var(--text-secondary)]';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 overflow-y-auto max-h-[calc(100vh-220px)] custom-scrollbar pr-2">
      {/* ═══════════════════════════════════════════════════════════════════
                SECTION 1: KPIs ROW (5 colonnes)
            ═══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {/* CA Émis */}
        <div className="bg-[var(--bg-elevated)] p-3 rounded-lg border border-[var(--border)] shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-1.5">
            <div className="p-1.5 bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] rounded-lg text-[var(--primary)]">
              <FileText className="w-4 h-4" />
            </div>
            <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase">CA Émis</span>
          </div>
          <p className="text-base font-bold text-[var(--text-primary)]">{formatPrice(financeKPIs.totalCAEmis || 0)}</p>
          <p className="text-xs text-[var(--primary)] mt-0.5">Factures émises</p>
        </div>

        {/* Encaissements */}
        <div className="bg-[var(--bg-elevated)] p-3 rounded-lg border border-[var(--border)] shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-1.5">
            <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/20 rounded-lg text-emerald-600">
              <Banknote className="w-4 h-4" />
            </div>
            <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase">Encaissé</span>
          </div>
          <p className="text-base font-bold text-[var(--text-primary)]">
            {formatPrice(financeKPIs.totalEncaissements || 0)}
          </p>
          <p className="text-xs text-emerald-600 mt-0.5">Taux: {financeKPIs.tauxRecouvrement}%</p>
        </div>

        {/* Charges */}
        <div className="bg-[var(--bg-elevated)] p-3 rounded-lg border border-[var(--border)] shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-1.5">
            <div className="p-1.5 bg-red-100 dark:bg-red-900/20 rounded-lg text-red-600">
              <TrendingUp className="w-4 h-4 transform rotate-180" />
            </div>
            <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase">Charges</span>
          </div>
          <p className="text-base font-bold text-[var(--text-primary)]">{formatPrice(financeKPIs.totalCharges || 0)}</p>
          <p className="text-xs text-red-600 mt-0.5">Classe 6</p>
        </div>

        {/* Résultat Net */}
        <div className="bg-[var(--bg-elevated)] p-3 rounded-lg border border-[var(--border)] shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-1.5">
            <div
              className={`p-1.5 rounded-lg ${financeKPIs.resultatNet >= 0 ? 'bg-green-100 dark:bg-green-900/20 text-green-600' : 'bg-red-100 dark:bg-red-900/20 text-red-600'}`}
            >
              <DollarSign className="w-4 h-4" />
            </div>
            <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase">Résultat</span>
          </div>
          <p className={`text-base font-bold ${financeKPIs.resultatNet >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatPrice(financeKPIs.resultatNet || 0)}
          </p>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">Marge {financeKPIs.margePercent}%</p>
        </div>

        {/* DSO (Délai Moyen Paiement) */}
        <div className="bg-[var(--bg-elevated)] p-3 rounded-lg border border-[var(--border)] shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-1.5">
            <div className="p-1.5 bg-[var(--bg-elevated)] bg-[var(--bg-surface)]/20 rounded-lg text-[var(--text-secondary)]">
              <Clock className="w-4 h-4" />
            </div>
            <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase">DSO</span>
          </div>
          <p className="text-base font-bold text-[var(--text-primary)]">{financeKPIs.dso || 0} Jours</p>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">Délai moyen paiement</p>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
                SECTION 2: Graphiques principaux (Encaissements/Dépenses + Solde Bancaire)
            ═══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Graphique Encaissements vs Dépenses (6 mois) */}
        <Card title="📊 Encaissements vs Dépenses (6 mois)" className="h-[320px]">
          <div className="h-[250px] w-full">
            {monthlyRevenueData.every((d) => d.encaissements === 0 && d.depenses === 0) ? (
              <div className="h-full flex items-center justify-center text-[var(--text-muted)]">
                <div className="text-center">
                  <TrendingUp className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Aucune donnée disponible</p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer
                width="100%"
                height="100%"
                minHeight={230}
                minWidth={200}
                initialDimension={{ width: 200, height: 230 }}
              >
                <ComposedChart data={monthlyRevenueData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorEncaissements" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorDepenses" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartGridColor} />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: chartTextColor, fontSize: 11 }}
                  />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: chartTextColor, fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: tooltipBg,
                      borderRadius: '8px',
                      border: `1px solid ${tooltipBorder}`,
                    }}
                    formatter={(value: number) => formatPrice(value)}
                  />
                  <Bar dataKey="encaissements" fill="#10b981" name="Encaissements" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="depenses" fill="#ef4444" name="Dépenses" radius={[4, 4, 0, 0]} />
                  <Line
                    type="monotone"
                    dataKey="solde"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6', r: 4 }}
                    name="Solde net"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Évolution du Solde Bancaire */}
        <Card title="🏦 Évolution du Solde Bancaire" className="h-[320px]">
          <div className="h-[250px] w-full">
            {bankBalanceData.every((d) => d.solde === 0) ? (
              <div className="h-full flex items-center justify-center text-[var(--text-muted)]">
                <div className="text-center">
                  <Building2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Aucune donnée bancaire</p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer
                width="100%"
                height="100%"
                minHeight={230}
                minWidth={200}
                initialDimension={{ width: 200, height: 230 }}
              >
                <AreaChart data={bankBalanceData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSoldeBancaire" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartGridColor} />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: chartTextColor, fontSize: 11 }}
                  />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: chartTextColor, fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: tooltipBg,
                      borderRadius: '8px',
                      border: `1px solid ${tooltipBorder}`,
                    }}
                    formatter={(value: number) => formatPrice(value)}
                  />
                  <Area
                    type="monotone"
                    dataKey="solde"
                    stroke="#6366f1"
                    strokeWidth={2}
                    fill="url(#colorSoldeBancaire)"
                    name="Solde"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
                SECTION 2.5: Balance Âgée
            ═══════════════════════════════════════════════════════════════════ */}
      {agingBalance && agingBalance.length > 0 && (
        <Card title="⏳ Balance Âgée (Créances Clients)" className="h-[320px]">
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={agingBalance} margin={{ top: 20, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartGridColor} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: chartTextColor, fontSize: 12 }} />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: chartTextColor, fontSize: 11 }}
                  tickFormatter={(value) => formatPrice(value)}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: tooltipBg,
                    borderRadius: '8px',
                    border: `1px solid ${tooltipBorder}`,
                  }}
                  formatter={(value: number) => formatPrice(value)}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {agingBalance.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
                SECTION 3: Suivi Budgétaire + Top 5 Impayés + Structure Bilan
            ═══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Suivi Budgétaire */}
        <Card title="🎯 Suivi Budgétaire" className="lg:col-span-1 h-[320px]">
          <div className="h-[250px] w-full">
            {budgetData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-[var(--text-muted)]">
                <div className="text-center">
                  <Target className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Aucun budget défini</p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer
                width="100%"
                height="100%"
                minHeight={230}
                minWidth={200}
                initialDimension={{ width: 200, height: 230 }}
              >
                <BarChart data={budgetData} layout="vertical" margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke={chartGridColor} />
                  <XAxis
                    type="number"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: chartTextColor, fontSize: 10 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="category"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: chartTextColor, fontSize: 10 }}
                    width={80}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: tooltipBg,
                      borderRadius: '8px',
                      border: `1px solid ${tooltipBorder}`,
                    }}
                    formatter={(value: number) => formatPrice(value)}
                  />
                  <Bar dataKey="budget" fill="#94a3b8" name="Budget" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="reel" fill="#3b82f6" name="Réel" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* TOP 5 CLIENTS IMPAYÉS */}
        <Card title="🔴 Top 5 Clients Impayés" className="lg:col-span-1 h-[320px]">
          <div className="space-y-2 overflow-y-auto max-h-[250px] custom-scrollbar">
            {top5ClientsImpayes.length === 0 ? (
              <div className="text-center py-8 text-[var(--text-muted)]">
                <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Aucun impayé 🎉</p>
              </div>
            ) : (
              <>
                {top5ClientsImpayes.map((client, index) => (
                  <div
                    key={client.clientId}
                    className={`flex items-center justify-between p-2 rounded-lg ${
                      index === 0
                        ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                        : 'bg-[var(--bg-elevated)]/50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          index === 0
                            ? 'bg-red-500 text-white'
                            : index === 1
                              ? 'bg-orange-500 text-white'
                              : index === 2
                                ? 'bg-yellow-500 text-white'
                                : 'bg-[var(--text-secondary)] text-white'
                        }`}
                      >
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-medium text-xs text-[var(--text-primary)] truncate max-w-[100px]">
                          {client.clientName}
                        </p>
                        <p className="text-[10px] text-[var(--text-secondary)]">{client.invoiceCount} fact.</p>
                      </div>
                    </div>
                    <span
                      className={`text-xs font-bold ${index === 0 ? 'text-red-600' : 'text-[var(--text-primary)]'}`}
                    >
                      {formatPrice(client.totalUnpaid)}
                    </span>
                  </div>
                ))}
                <div className="pt-2 border-t border-[var(--border)] mt-2">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-[var(--text-secondary)]">Total</span>
                    <span className="font-bold text-red-600">
                      {formatPrice(top5ClientsImpayes.reduce((sum, c) => sum + c.totalUnpaid, 0))}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        </Card>

        {/* Structure du Bilan */}
        <Card title="📊 Structure du Bilan" className="lg:col-span-1 h-[320px]">
          <div className="h-[250px] w-full flex items-center justify-center" style={{ minHeight: 200, minWidth: 200 }}>
            <ResponsiveContainer
              width="100%"
              height="100%"
              minHeight={200}
              minWidth={200}
              initialDimension={{ width: 200, height: 200 }}
            >
              <RePieChart>
                <Pie
                  data={balanceStructure}
                  cx="50%"
                  cy="45%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {balanceStructure.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: tooltipBg,
                    borderRadius: '8px',
                    border: `1px solid ${tooltipBorder}`,
                  }}
                  formatter={(value: number) => formatPrice(value)}
                />
                <Legend verticalAlign="bottom" height={30} iconSize={10} wrapperStyle={{ fontSize: '11px' }} />
              </RePieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
                SECTION 4: Historique des activités récentes
            ═══════════════════════════════════════════════════════════════════ */}
      <Card title="📜 Historique Récent" className="h-auto">
        <div className="overflow-x-auto">
          {recentActivity.length === 0 ? (
            <div className="text-center py-8 text-[var(--text-muted)]">
              <History className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Aucune activité récente</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-[var(--text-secondary)] border-b border-[var(--border)]">
                  <th className="pb-2 font-medium">Type</th>
                  <th className="pb-2 font-medium">Description</th>
                  <th className="pb-2 font-medium text-right">Montant</th>
                  <th className="pb-2 font-medium text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {recentActivity.slice(0, 10).map((activity) => (
                  <tr key={activity.id} className="tr-hover/50">
                    <td className="py-2">
                      <span className="text-lg">{getActivityIcon(activity.type)}</span>
                    </td>
                    <td className="py-2 text-[var(--text-primary)] max-w-[200px] truncate">{activity.description}</td>
                    <td className={`py-2 text-right font-mono font-medium ${getActivityColor(activity.type)}`}>
                      {activity.type === 'expense' ? '-' : '+'}
                      {formatPrice(activity.amount)}
                    </td>
                    <td className="py-2 text-right text-[var(--text-secondary)] text-xs">
                      {new Date(activity.date).toLocaleDateString('fr-FR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
};
