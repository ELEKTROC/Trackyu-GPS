import React, { useState, useEffect } from 'react';
import { TiersView } from './TiersView';
import { FinanceView } from '../../finance/components/FinanceView';
import { DollarSign, FileText, Users, LayoutDashboard } from 'lucide-react';
import type { View } from '../../../types';
import { ContractTabs } from './ContractTabs';
import { SalesDashboard } from './SalesDashboard';
import { Tabs } from '../../../components/Tabs';
import { MobileTabLayout } from '../../../components/MobileTabLayout';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { useDateRange } from '../../../hooks/useDateRange';
import { DateRangeSelector } from '../../../components/DateRangeSelector';

type Tab = 'DASHBOARD' | 'TIERS' | 'INVOICES' | 'CONTRACTS';

interface SalesViewProps {
  initialTab?: string;
  onNavigate?: (view: View, params?: Record<string, string>) => void;
}

export const SalesView: React.FC<SalesViewProps> = ({ initialTab, onNavigate }) => {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<Tab>('DASHBOARD');

  // --- DATE LOGIC ---
  const { periodPreset, setPeriodPreset, customDateRange, setCustomDateRange, dateRange } = useDateRange('THIS_YEAR');

  useEffect(() => {
    if (initialTab) {
      if (['DASHBOARD', 'INVOICES', 'CONTRACTS', 'TIERS'].includes(initialTab)) {
        setActiveTab(initialTab as Tab);
      }
    }
  }, [initialTab]);

  const SALES_TABS = [
    {
      id: 'DASHBOARD',
      label: "Vue d'ensemble",
      icon: LayoutDashboard,
      color: 'bg-[var(--primary-dim)]0',
      description: 'KPIs et indicateurs ventes',
    },
    {
      id: 'TIERS',
      label: 'Clients & Tiers',
      icon: Users,
      color: 'bg-teal-500',
      description: 'Clients, revendeurs, partenaires',
    },
    { id: 'CONTRACTS', label: 'Contrats', icon: FileText, color: 'bg-indigo-500', description: 'Gestion des contrats' },
    {
      id: 'INVOICES',
      label: 'Factures',
      icon: DollarSign,
      color: 'bg-green-500',
      description: 'Factures et paiements',
    },
  ];

  return (
    <div className="sm:h-full sm:flex sm:flex-col space-y-3 sm:space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-4">
        <h1 className="text-xl sm:page-title">Ventes & Facturation</h1>
        <DateRangeSelector
          periodPreset={periodPreset}
          setPeriodPreset={setPeriodPreset}
          customDateRange={customDateRange}
          setCustomDateRange={setCustomDateRange}
        />
      </div>

      {/* Desktop tabs */}
      {!isMobile && <Tabs tabs={SALES_TABS} activeTab={activeTab} onTabChange={(id) => setActiveTab(id as Tab)} />}

      <MobileTabLayout
        tabs={SALES_TABS}
        activeTab={activeTab}
        onTabChange={(id) => setActiveTab(id as Tab)}
        backLabel="Ventes"
      >
        {/* Content Area */}
        <div className="sm:flex-1 sm:min-h-0 sm:overflow-hidden">
          {activeTab === 'DASHBOARD' && (
            <SalesDashboard onNavigate={(tab) => setActiveTab(tab as Tab)} dateRange={dateRange} />
          )}
          {activeTab === 'TIERS' && <TiersView onNavigate={onNavigate} dateRange={dateRange} />}
          {activeTab === 'INVOICES' && <FinanceView mode="INVOICES" dateRange={dateRange} />}
          {activeTab === 'CONTRACTS' && <ContractTabs dateRange={dateRange} onNavigate={onNavigate} />}
        </div>
      </MobileTabLayout>
    </div>
  );
};
