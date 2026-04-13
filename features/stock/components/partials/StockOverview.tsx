import React, { useMemo } from 'react';
import { AlertTriangle, Users, History } from 'lucide-react';
import { Card } from '../../../../components/Card';
import type { DeviceStock, StockMovement } from '../../../../types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell,
} from 'recharts';

interface StockStats {
  totalDevices: number;
  inStockDevices: number;
  installedDevices: number;
  rmaDevices: number;
  lostDevices: number;
  removedDevices: number;
  totalSims: number;
  activeSims: number;
  inStockSims: number;
  simsByOperator: Record<string, number>;
  totalAccessories: number;
  inStockAccessories: number;
  installedAccessories: number;
  stockByTech: Record<string, { name: string; boxes: number; sims: number; accessories: number }>;
  centralStock: number;
  siegeStock: number;
  techStock: number;
  lowStockBoxes: boolean;
  pendingRma: number;
  simsLowStock: boolean;
}

interface StockOverviewProps {
  stats: StockStats;
  stock: DeviceStock[];
  stockMovements: StockMovement[];
  historyFilter: string;
  setHistoryFilter: (filter: string) => void;
  historyPage: number;
  setHistoryPage: (page: number) => void;
  historyPerPage: number;
}

export const StockOverview: React.FC<StockOverviewProps> = ({
  stats,
  stock,
  stockMovements,
  historyFilter,
  setHistoryFilter,
  historyPage,
  setHistoryPage,
  historyPerPage,
}) => {
  // Historique filtré
  const filteredHistory = useMemo(() => {
    let filtered = stockMovements || [];
    if (historyFilter !== 'ALL') {
      filtered = filtered.filter((m) => m.type === historyFilter);
    }
    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [stockMovements, historyFilter]);

  const paginatedHistory = filteredHistory.slice((historyPage - 1) * historyPerPage, historyPage * historyPerPage);
  const totalHistoryPages = Math.ceil(filteredHistory.length / historyPerPage);

  return (
    <div className="flex-1 overflow-y-auto space-y-4 p-1 pb-16 lg:pb-1">
      {/* Alertes Stock */}
      {(stats.lowStockBoxes || stats.pendingRma > 0 || stats.simsLowStock) && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <h3 className="font-bold text-amber-800 dark:text-amber-400">Alertes Stock</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
            {stats.lowStockBoxes && (
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                Stock boîtiers bas (&lt;5 unités)
              </div>
            )}
            {stats.pendingRma > 0 && (
              <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
                <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                {stats.pendingRma} équipement(s) en RMA
              </div>
            )}
            {stats.simsLowStock && (
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                Stock SIM bas (&lt;10 unités)
              </div>
            )}
          </div>
        </div>
      )}

      {/* Graphiques principaux */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* État du Stock (Boîtiers) */}
        <Card className="p-4">
          <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3">État Boîtiers</h3>
          <div className="h-48">
            <ResponsiveContainer
              width="100%"
              height="100%"
              minHeight={180}
              minWidth={180}
              initialDimension={{ width: 180, height: 180 }}
            >
              <RePieChart>
                <Pie
                  data={[
                    { name: 'En Stock', value: stats.inStockDevices, color: '#3b82f6' },
                    { name: 'Installé', value: stats.installedDevices, color: '#22c55e' },
                    { name: 'RMA', value: stats.rmaDevices, color: '#ef4444' },
                    { name: 'Perdu', value: stats.lostDevices, color: '#6b7280' },
                  ].filter((d) => d.value > 0)}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={60}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {[
                    { name: 'En Stock', value: stats.inStockDevices, color: '#3b82f6' },
                    { name: 'Installé', value: stats.installedDevices, color: '#22c55e' },
                    { name: 'RMA', value: stats.rmaDevices, color: '#ef4444' },
                    { name: 'Perdu', value: stats.lostDevices, color: '#6b7280' },
                  ]
                    .filter((d) => d.value > 0)
                    .map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </RePieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* SIM Actives vs Inactives */}
        <Card className="p-4">
          <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3">SIMs: Actives vs Stock</h3>
          <div className="h-48">
            <ResponsiveContainer
              width="100%"
              height="100%"
              minHeight={180}
              minWidth={180}
              initialDimension={{ width: 180, height: 180 }}
            >
              <RePieChart>
                <Pie
                  data={[
                    { name: 'Actives', value: stats.activeSims, color: '#22c55e' },
                    { name: 'En Stock', value: stats.inStockSims, color: '#3b82f6' },
                  ].filter((d) => d.value > 0)}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={60}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {[
                    { name: 'Actives', value: stats.activeSims, color: '#22c55e' },
                    { name: 'En Stock', value: stats.inStockSims, color: '#3b82f6' },
                  ]
                    .filter((d) => d.value > 0)
                    .map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </RePieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* SIM par Opérateur */}
        <Card className="p-4">
          <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3">SIMs par Opérateur</h3>
          <div className="h-48">
            <ResponsiveContainer
              width="100%"
              height="100%"
              minHeight={180}
              minWidth={180}
              initialDimension={{ width: 180, height: 180 }}
            >
              <BarChart
                data={Object.entries(stats.simsByOperator).map(([name, value]) => ({ name, value }))}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Stock par Technicien et Historique */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Stock par Technicien */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-[var(--text-secondary)]" />
            <h3 className="text-sm font-bold text-[var(--text-primary)]">Stock par Technicien</h3>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {Object.entries(stats.stockByTech).length === 0 ? (
              <p className="text-sm text-[var(--text-secondary)] text-center py-4">Aucun technicien configuré</p>
            ) : (
              Object.entries(stats.stockByTech).map(([id, data]) => (
                <div key={id} className="flex items-center justify-between p-2 bg-[var(--bg-elevated)] rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] rounded-full flex items-center justify-center text-[var(--primary)] font-bold text-xs">
                      {data.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)}
                    </div>
                    <span className="text-sm font-medium text-[var(--text-primary)]">{data.name}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="px-2 py-0.5 bg-[var(--primary-dim)] text-[var(--primary)] rounded">
                      {data.boxes} GPS
                    </span>
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded">{data.sims} SIM</span>
                    <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded">{data.accessories} Acc</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Historique récent */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-[var(--text-secondary)]" />
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Historique récent</h3>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={historyFilter}
                onChange={(e) => {
                  setHistoryFilter(e.target.value);
                  setHistoryPage(1);
                }}
                className="text-xs border border-[var(--border)] rounded px-2 py-1 bg-[var(--bg-elevated)] text-[var(--text-primary)]"
              >
                <option value="ALL">Tous</option>
                <option value="ENTRY">Entrées</option>
                <option value="INSTALLATION">Installations</option>
                <option value="REMOVAL">Désinstallations</option>
                <option value="TRANSFER">Transferts</option>
                <option value="RMA_OUT">RMA Envoi</option>
                <option value="RMA_RETURN">RMA Retour</option>
                <option value="STATUS_CHANGE">Changements Statut</option>
              </select>
            </div>
          </div>
          <div className="space-y-1">
            {paginatedHistory.length === 0 ? (
              <p className="text-sm text-[var(--text-secondary)] text-center py-4">Aucun mouvement</p>
            ) : (
              paginatedHistory.map((mv: StockMovement) => {
                const device = stock.find((s) => s.id === mv.deviceId);
                const typeColors: Record<string, string> = {
                  ENTRY: 'bg-green-100 text-green-700',
                  INSTALLATION: 'bg-[var(--primary-dim)] text-[var(--primary)]',
                  REMOVAL: 'bg-orange-100 text-orange-700',
                  RMA_OUT: 'bg-red-100 text-red-700',
                  RMA_RETURN: 'bg-purple-100 text-purple-700',
                  TRANSFER: 'bg-amber-100 text-amber-700',
                  STATUS_CHANGE: 'bg-[var(--bg-elevated)] text-[var(--text-primary)]',
                };
                return (
                  <div
                    key={mv.id}
                    className="flex items-center justify-between p-2 bg-[var(--bg-elevated)] rounded text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${typeColors[mv.type] || 'bg-[var(--bg-elevated)] text-[var(--text-secondary)]'}`}
                      >
                        {mv.type}
                      </span>
                      <span className="text-[var(--text-secondary)]">
                        {device?.imei || device?.iccid || mv.deviceId}
                      </span>
                    </div>
                    <span className="text-[var(--text-secondary)]">
                      {new Date(mv.date).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                );
              })
            )}
          </div>
          {totalHistoryPages > 1 && (
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-[var(--border)]">
              <button
                onClick={() => setHistoryPage(Math.max(1, historyPage - 1))}
                disabled={historyPage === 1}
                className="text-xs text-[var(--primary)] disabled:text-[var(--text-muted)]"
              >
                ← Précédent
              </button>
              <span className="text-xs text-[var(--text-secondary)]">
                {historyPage}/{totalHistoryPages}
              </span>
              <button
                onClick={() => setHistoryPage(Math.min(totalHistoryPages, historyPage + 1))}
                disabled={historyPage === totalHistoryPages}
                className="text-xs text-[var(--primary)] disabled:text-[var(--text-muted)]"
              >
                Suivant →
              </button>
            </div>
          )}
        </Card>
      </div>

      {/* Répartition complète par type de matériel */}
      <Card className="p-4">
        <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3">Répartition complète du Stock</h3>
        <div className="h-48" style={{ minHeight: 180, minWidth: 200 }}>
          <ResponsiveContainer
            width="100%"
            height="100%"
            minHeight={180}
            minWidth={200}
            initialDimension={{ width: 200, height: 180 }}
          >
            <BarChart
              data={[
                {
                  name: 'Boîtiers GPS',
                  enStock: stats.inStockDevices,
                  installé: stats.installedDevices,
                  rma: stats.rmaDevices,
                },
                { name: 'Cartes SIM', enStock: stats.inStockSims, installé: stats.activeSims, rma: 0 },
                {
                  name: 'Accessoires',
                  enStock: stats.inStockAccessories,
                  installé: stats.installedAccessories,
                  rma: 0,
                },
              ]}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Bar dataKey="enStock" name="En Stock" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="installé" name="Installé" fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="rma" name="RMA" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
};
