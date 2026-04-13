import React from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Droplet, TrendingUp, DollarSign, MapPin } from 'lucide-react';

interface FuelHistoryItem {
  date: string;
  conso: number;
}

interface FuelRefill {
  id: string;
  type: string;
  date: string | Date;
  location?: string;
  volume: number;
  cost: number;
  fuelType?: string;
}

interface FuelStats {
  avgConsumption?: number;
  totalCost?: number;
  idlingWaste?: number;
}

interface RefuelingHistoryDisplay {
  id: string;
  date: string;
  location: string;
  quantity: string;
  cost: string;
  type: string;
}

interface FuelModalContentProps {
  history: FuelHistoryItem[];
  stats: FuelStats;
  refills: FuelRefill[];
}

export const FuelModalContent: React.FC<FuelModalContentProps> = ({ history = [], stats = {}, refills = [] }) => {
  const consumptionData =
    history.length > 0
      ? history
      : [
          { date: 'Juin', conso: 8.5 },
          { date: 'Juil', conso: 8.2 },
          { date: 'Août', conso: 9.1 },
          { date: 'Sept', conso: 8.8 },
          { date: 'Oct', conso: 8.4 },
          { date: 'Nov', conso: 8.6 },
        ];

  const refuelingHistory: RefuelingHistoryDisplay[] =
    refills.length > 0
      ? refills
          .filter((r) => r.type === 'REFILL')
          .map((r) => ({
            id: r.id,
            date: new Date(r.date).toLocaleDateString('fr-FR'),
            location: r.location || 'Station Inconnue',
            quantity: `${r.volume} L`,
            cost: `${r.cost}`,
            type: r.fuelType || 'Diesel',
          }))
      : [];

  return (
    <div className="p-6 space-y-8">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[var(--primary-dim)] p-4 rounded-xl border border-[var(--primary)]">
          <div className="flex items-center gap-2 text-[var(--primary)] mb-1">
            <Droplet className="w-4 h-4" />
            <span className="text-sm font-bold">Conso. Moyenne</span>
          </div>
          <div className="page-title">
            {stats?.avgConsumption || 0} L
            <span className="text-sm text-[var(--text-secondary)] font-normal">/100km</span>
          </div>
        </div>
        <div className="bg-green-50 p-4 rounded-xl border border-green-100">
          <div className="flex items-center gap-2 text-green-600 mb-1">
            <DollarSign className="w-4 h-4" />
            <span className="text-sm font-bold">Coût Total</span>
          </div>
          <div className="page-title">{stats?.totalCost || 0}</div>
        </div>
        <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
          <div className="flex items-center gap-2 text-purple-600 mb-1">
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm font-bold">Gaspillage</span>
          </div>
          <div className="page-title">{stats?.idlingWaste || 0} L</div>
        </div>
      </div>

      {/* Graphique */}
      <section className="h-64 w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl p-4 shadow-sm">
        <h3 className="text-sm font-bold text-[var(--text-secondary)] mb-4">Évolution de la consommation</h3>
        <ResponsiveContainer
          width="100%"
          height="100%"
          minHeight={200}
          minWidth={200}
          initialDimension={{ width: 200, height: 200 }}
        >
          <AreaChart data={consumptionData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorConsumption" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
            <Tooltip
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '4 4' }}
            />
            <Area
              type="monotone"
              dataKey="conso"
              stroke="#3b82f6"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorConsumption)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </section>

      {/* Historique des pleins */}
      <section>
        <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4">Derniers pleins</h3>
        <div className="space-y-3">
          {refuelingHistory.length > 0 ? (
            refuelingHistory.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 hover:bg-[var(--bg-elevated)] rounded-lg border border-transparent hover:border-[var(--border)] transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center text-[var(--text-secondary)]">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-[var(--text-primary)]">{item.location}</div>
                    <div className="text-xs text-[var(--text-muted)]">
                      {item.date} • {item.type}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-[var(--text-primary)]">{item.cost}</div>
                  <div className="text-xs font-mono text-[var(--text-secondary)]">{item.quantity}</div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-[var(--text-muted)] py-4">Aucun historique de plein disponible</div>
          )}
        </div>
      </section>
    </div>
  );
};
