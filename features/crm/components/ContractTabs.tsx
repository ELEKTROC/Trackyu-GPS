import React, { useState } from 'react';
import { FileText, Truck, BarChart2 } from 'lucide-react';
import { Tabs } from '../../../components/Tabs';
import { ContractsView } from './ContractsView';
import { SubscriptionsView } from './SubscriptionsView';
import { BillingForecastView } from './BillingForecastView';
import type { View } from '../../../types';

interface ContractTabsProps {
  dateRange?: { start: string; end: string };
  onNavigate?: (view: View, params?: Record<string, unknown>) => void;
}

type SubTab = 'LIST' | 'SUBSCRIPTIONS' | 'FORECAST';

export const ContractTabs: React.FC<ContractTabsProps> = ({ dateRange, onNavigate }) => {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('LIST');

  const CONTRACT_SUB_TABS = [
    { id: 'LIST',          label: 'Liste des Contrats',  icon: FileText  },
    { id: 'SUBSCRIPTIONS', label: 'Abonnements',         icon: Truck     },
    { id: 'FORECAST',      label: 'Prévisionnel',        icon: BarChart2 },
  ];

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex justify-start">
        <Tabs
          tabs={CONTRACT_SUB_TABS}
          activeTab={activeSubTab}
          onTabChange={(id) => setActiveSubTab(id as SubTab)}
        />
      </div>

      <div className="flex-1 min-h-0">
        {activeSubTab === 'LIST' && <ContractsView dateRange={dateRange} />}
        {activeSubTab === 'SUBSCRIPTIONS' && (
          <SubscriptionsView
            dateRange={dateRange}
            onNavigate={onNavigate}
          />
        )}
        {activeSubTab === 'FORECAST' && <BillingForecastView />}
      </div>
    </div>
  );
};
