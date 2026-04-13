import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Droplet, BarChart3, List } from 'lucide-react';
import { ConfigurableRow } from './SharedBlocks';

interface FuelBlockProps {
  mockData: any;
  isConfigMode: boolean;
  hiddenFields: Set<string>;
  toggleFieldVisibility: (id: string) => void;
  activeFuelTab: string;
  setActiveFuelTab: (tab: string) => void;
  setActiveModal: (modal: string) => void;
}

export const FuelBlock: React.FC<FuelBlockProps> = ({
  mockData,
  isConfigMode,
  hiddenFields,
  toggleFieldVisibility,
  activeFuelTab,
  setActiveFuelTab,
  setActiveModal,
}) => {
  const currentFuel = mockData.fuelHistory?.[mockData.fuelHistory.length - 1] || { level: 0, volume: 0 };

  return (
    <div className="space-y-4">
      <div className="flex bg-[var(--bg-elevated)] p-1 rounded-lg mb-3">
        {['Synthèse', 'Historique'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveFuelTab(tab)}
            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${activeFuelTab === tab ? 'bg-[var(--bg-elevated)] text-[var(--primary)] shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeFuelTab === 'Synthèse' ? (
        <>
          <ConfigurableRow
            id="fuelLevel"
            isConfigMode={isConfigMode}
            isHidden={hiddenFields.has('fuelLevel')}
            onToggle={() => toggleFieldVisibility('fuelLevel')}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="section-title">Niveau Actuel</span>
              <span className="text-lg font-bold text-[var(--text-primary)]">
                {currentFuel.level}%{' '}
                <span className="text-xs text-[var(--text-muted)] font-normal">({currentFuel.volume}L)</span>
              </span>
            </div>
            <div className="h-2 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
              <div
                className="h-full bg-orange-500 transition-all duration-500"
                style={{ width: `${currentFuel.level}%` }}
              ></div>
            </div>
          </ConfigurableRow>

          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 bg-[var(--bg-elevated)] rounded border border-[var(--border)]">
              <div className="text-[10px] text-[var(--text-muted)] uppercase font-bold">Conso. Moyenne</div>
              <div className="text-sm font-bold text-[var(--text-primary)]">
                {mockData.fuelStats?.avgConsumption || 0} L/100km
              </div>
            </div>
            <div className="p-2 bg-[var(--bg-elevated)] rounded border border-[var(--border)]">
              <div className="text-[10px] text-[var(--text-muted)] uppercase font-bold">Gaspillage Ralenti</div>
              <div className="text-sm font-bold text-red-600">{mockData.fuelStats?.idlingWaste || 0} L</div>
            </div>
          </div>

          <ConfigurableRow
            id="fuelChart"
            isConfigMode={isConfigMode}
            isHidden={hiddenFields.has('fuelChart')}
            onToggle={() => toggleFieldVisibility('fuelChart')}
          >
            <div className="h-32 mt-4">
              <ResponsiveContainer
                width="100%"
                height="100%"
                minHeight={120}
                minWidth={150}
                initialDimension={{ width: 150, height: 120 }}
              >
                <BarChart data={mockData.fuelHistory}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: 'none',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    }}
                    cursor={{ fill: '#f1f5f9' }}
                  />
                  <Bar dataKey="conso" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ConfigurableRow>
        </>
      ) : (
        <div className="space-y-2">
          {mockData.refillsList.map((refill: any, i: number) => (
            <div
              key={i}
              className="flex items-center justify-between p-2 border border-[var(--border)] rounded bg-[var(--bg-elevated)]"
            >
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-green-100 text-green-600 rounded">
                  <Droplet className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-[var(--text-primary)]">{refill.volume}</div>
                  <div className="text-[10px] text-[var(--text-muted)]">{refill.date}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-bold text-[var(--text-primary)]">{refill.cost}</div>
                <div className="text-[10px] text-[var(--text-muted)] truncate max-w-[80px]">{refill.place}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => setActiveModal('fuel')}
        className="w-full py-2 text-xs text-[var(--primary)] font-bold hover:bg-[var(--primary-dim)] rounded transition-colors flex items-center justify-center gap-1"
      >
        <List className="w-3 h-3" /> Voir tous les détails
      </button>
    </div>
  );
};
