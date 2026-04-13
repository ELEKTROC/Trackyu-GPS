import React, { useState, useMemo } from 'react';
import { Card } from '../../../../components/Card';
import { MobileCard, MobileCardList, MobileCardAction } from '../../../../components/MobileCard';
import { AlertTriangle, Battery, Zap, Radio, Activity, Wrench, MessageSquare, Fuel, Clock } from 'lucide-react';
import { useToast } from '../../../../contexts/ToastContext';
import type { Anomaly} from '../../../../types';
import { type Ticket } from '../../../../types';
import { useDataContext } from '../../../../contexts/DataContext';
import { useTableSort } from '../../../../hooks/useTableSort';
import { SortableHeader } from '../../../../components/SortableHeader';
import { api } from '../../../../services/apiLazy';
import { useIsMobile } from '../../../../hooks/useIsMobile';

const getTimeAgo = (dateStr: string | Date | undefined): string => {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'à l\'instant';
  if (diffMins < 60) return `il y a ${diffMins} min`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `il y a ${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  return `il y a ${diffDays}j`;
};

export const AnomalyDashboard: React.FC = () => {
  const isMobile = useIsMobile();
  const { showToast } = useToast();
  const { anomalies, addTicket, vehicles } = useDataContext();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const displayAnomalies: Anomaly[] = anomalies && anomalies.length > 0 ? anomalies : [];

  const lastAnalysisTime = useMemo(() => {
    if (displayAnomalies.length === 0) return null;
    const sorted = [...displayAnomalies].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return sorted[0]?.timestamp;
  }, [displayAnomalies]);

  const getIcon = (code: string) => {
    switch (code) {
      case 'BATTERY_LOW': return <Battery className="w-5 h-5 text-orange-500" />;
      case 'POWER_CUT': return <Zap className="w-5 h-5 text-yellow-500" />;
      case 'GPS_JUMP': return <Activity className="w-5 h-5 text-[var(--primary)]" />;
      case 'JAMMING': return <Radio className="w-5 h-5 text-red-500" />;
      case 'FUEL_SUSPECT_LOSS': return <Fuel className="w-5 h-5 text-red-600" />;
      case 'LONG_IDLE': return <Clock className="w-5 h-5 text-[var(--text-secondary)]" />;
      default: return <AlertTriangle className="w-5 h-5 text-[var(--text-secondary)]" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'bg-red-100 text-red-800 border-red-200';
      case 'WARNING': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'INFO': return 'bg-[var(--primary-dim)] text-[var(--primary)] border-[var(--border)]';
      default: return 'bg-[var(--bg-elevated)] text-[var(--text-primary)] border-[var(--border)]';
    }
  };

  const handleAction = async (action: string, anomaly: Anomaly) => {
    const actionKey = `${action}-${anomaly.id}`;
    if (loadingAction) return;
    setLoadingAction(actionKey);
    try {
      if (action === 'DIAGNOSTIC') {
        const vehicle = vehicles.find(v => v.id === anomaly.vehicleId);
        await api.commands.create({
          id: `CMD-${Date.now()}`,
          deviceId: vehicle?.imei || '',
          vehicleId: anomaly.vehicleId,
          commandType: 'DIAGNOSTIC',
          payload: { anomalyType: anomaly.type, anomalyCode: anomaly.code },
          status: 'PENDING',
          sentAt: new Date().toISOString()
        } as unknown as Parameters<typeof api.commands.create>[0]);
        showToast(`Diagnostic lancé pour ${anomaly.vehicleName}`, 'success');
      } else if (action === 'TICKET') {
        await addTicket({
          id: `TK-${Date.now()}`,
          subject: `[ANOMALIE] ${anomaly.label || anomaly.type} - ${anomaly.vehicleName}`,
          description: `Anomalie détectée : ${anomaly.description}\nVéhicule : ${anomaly.vehicleName}\nType : ${anomaly.type}\nSévérité : ${anomaly.severity}\nDate : ${new Date(anomaly.timestamp).toLocaleString()}`,
          priority: anomaly.severity === 'CRITICAL' ? 'URGENT' : 'HIGH',
          status: 'OPEN',
          category: 'TECHNICAL',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        } as unknown as Ticket);
        showToast(`Ticket créé pour ${anomaly.vehicleName}`, 'success');
      }
    } catch (error) {
      showToast(`Erreur lors de ${action} pour ${anomaly.vehicleName}`, 'error');
    } finally {
      setLoadingAction(null);
    }
  };

  const { sortedItems: sortedAnomalies, sortConfig: anomalySortConfig, handleSort: handleAnomalySort } = useTableSort(
    displayAnomalies,
    { key: 'timestamp', direction: 'desc' }
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
      {/* Summary Cards */}
      <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 border-l-4 border-l-red-500">
          <div className="flex justify-between items-start">
            <div>
              <p className="section-title">Anomalies Critiques</p>
              <h3 className="text-2xl font-bold text-[var(--text-primary)] mt-1">
                {displayAnomalies.filter(a => a.severity === 'CRITICAL').length}
              </h3>
            </div>
            <div className="p-2 bg-red-50 rounded-lg text-red-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
        </Card>
        <Card className="p-4 border-l-4 border-l-orange-500">
          <div className="flex justify-between items-start">
            <div>
              <p className="section-title">Batteries Faibles</p>
              <h3 className="text-2xl font-bold text-[var(--text-primary)] mt-1">
                {displayAnomalies.filter(a => a.code === 'BATTERY_LOW').length}
              </h3>
            </div>
            <div className="p-2 bg-orange-50 rounded-lg text-orange-600">
              <Battery className="w-5 h-5" />
            </div>
          </div>
        </Card>
        <Card className="p-4 border-l-4 border-l-yellow-500">
          <div className="flex justify-between items-start">
            <div>
              <p className="section-title">Alim. Instable</p>
              <h3 className="text-2xl font-bold text-[var(--text-primary)] mt-1">
                {displayAnomalies.filter(a => a.code === 'POWER_CUT').length}
              </h3>
            </div>
            <div className="p-2 bg-yellow-50 rounded-lg text-yellow-600">
              <Zap className="w-5 h-5" />
            </div>
          </div>
        </Card>
        <Card className="p-4 border-l-4 border-l-blue-500">
          <div className="flex justify-between items-start">
            <div>
              <p className="section-title">Sauts GPS</p>
              <h3 className="text-2xl font-bold text-[var(--text-primary)] mt-1">
                {displayAnomalies.filter(a => a.code === 'GPS_JUMP').length}
              </h3>
            </div>
            <div className="p-2 bg-[var(--primary-dim)] rounded-lg text-[var(--primary)]">
              <Activity className="w-5 h-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Main List */}
      <Card className="lg:col-span-2 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-[var(--border)] bg-[var(--bg-elevated)] flex justify-between items-center">
          <h3 className="font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Activity className="w-5 h-5 text-[var(--primary)]" />
            Détection d'Anomalies
          </h3>
          <span className="text-xs text-[var(--text-secondary)]">Dernière analyse: {lastAnalysisTime ? getTimeAgo(lastAnalysisTime) : 'Aucune donnée'}</span>
        </div>
        <div className="flex-1 overflow-auto p-0">
          {isMobile ? (
            <MobileCardList bordered={false}>
              {sortedAnomalies.length === 0 ? (
                <div className="p-8 text-center text-[var(--text-muted)]">
                  <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="font-medium">Aucune anomalie détectée</p>
                </div>
              ) : sortedAnomalies.map((anomaly) => {
                const severityBorder = anomaly.severity === 'CRITICAL' ? 'border-l-red-500'
                  : anomaly.severity === 'WARNING' ? 'border-l-orange-500'
                  : 'border-l-slate-400';
                return (
                  <MobileCard key={anomaly.id} borderColor={severityBorder}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          {getIcon(anomaly.code)}
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getSeverityColor(anomaly.severity)}`}>{anomaly.label}</span>
                        </div>
                        <p className="text-sm font-bold text-[var(--text-primary)] truncate">{anomaly.vehicleName}</p>
                        <p className="text-xs text-[var(--text-secondary)] truncate">{anomaly.description}</p>
                      </div>
                      <span className="shrink-0 text-[10px] text-[var(--text-muted)]">{new Date(anomaly.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <MobileCardAction icon={<Wrench className="w-3 h-3" />} color="blue" onClick={() => handleAction('DIAGNOSTIC', anomaly)}>Diagnostic</MobileCardAction>
                      <MobileCardAction icon={<MessageSquare className="w-3 h-3" />} color="slate" onClick={() => handleAction('TICKET', anomaly)}>Ticket</MobileCardAction>
                    </div>
                  </MobileCard>
                );
              })}
            </MobileCardList>
          ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-[var(--bg-elevated)] text-[var(--text-secondary)] uppercase font-bold text-xs sticky top-0">
              <tr>
                <SortableHeader label="Type" sortKey="code" currentSortKey={anomalySortConfig.key} currentDirection={anomalySortConfig.direction} onSort={handleAnomalySort} />
                <SortableHeader label="Véhicule" sortKey="vehicleName" currentSortKey={anomalySortConfig.key} currentDirection={anomalySortConfig.direction} onSort={handleAnomalySort} />
                <SortableHeader label="Description" sortKey="description" currentSortKey={anomalySortConfig.key} currentDirection={anomalySortConfig.direction} onSort={handleAnomalySort} />
                <SortableHeader label="Détecté" sortKey="timestamp" currentSortKey={anomalySortConfig.key} currentDirection={anomalySortConfig.direction} onSort={handleAnomalySort} />
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {sortedAnomalies.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-[var(--text-muted)]">
                    <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="font-medium">Aucune anomalie détectée</p>
                    <p className="text-xs mt-1">Le système surveille en continu vos véhicules</p>
                  </td>
                </tr>
              ) : sortedAnomalies.map((anomaly) => (
                <tr key={anomaly.id} className="hover:bg-[var(--bg-elevated)] transition-colors group">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {getIcon(anomaly.code)}
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getSeverityColor(anomaly.severity)}`}>
                        {anomaly.label}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium text-[var(--text-primary)]">
                    {anomaly.vehicleName}
                  </td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">
                    {anomaly.description}
                  </td>
                  <td className="px-4 py-3 text-[var(--text-secondary)] text-xs">
                    {new Date(anomaly.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleAction('DIAGNOSTIC', anomaly)}
                        className="p-1.5 hover:bg-[var(--primary-dim)] text-[var(--primary)] rounded disabled:opacity-50" 
                        title="Lancer Diagnostic"
                        disabled={loadingAction === `DIAGNOSTIC-${anomaly.id}`}
                      >
                        <Wrench className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleAction('TICKET', anomaly)}
                        className="p-1.5 hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] rounded disabled:opacity-50" 
                        title="Créer Ticket"
                        disabled={loadingAction === `TICKET-${anomaly.id}`}
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          )}
        </div>
      </Card>

      {/* Recommendations Panel - Dynamique */}
      <Card className="p-0 flex flex-col overflow-hidden bg-[var(--bg-elevated)] border-[var(--border)]">
        <div className="p-4 border-b border-[var(--border)] bg-[var(--bg-elevated)]">
          <h3 className="font-bold text-[var(--text-primary)]">Recommandations IA</h3>
        </div>
        <div className="p-4 space-y-4 overflow-auto">
            {(() => {
                const jammingAnomalies = displayAnomalies.filter(a => a.code === 'JAMMING');
                if (jammingAnomalies.length === 0) return null;
                return (
                    <div className="p-3 bg-red-50 border border-red-100 rounded-lg">
                        <h4 className="text-sm font-bold text-red-800 mb-1 flex items-center gap-2">
                            <Radio className="w-4 h-4" /> Brouillage Détecté ({jammingAnomalies.length})
                        </h4>
                        <p className="text-xs text-red-700 mb-2">
                            Suspicion de brouillage GSM sur : {jammingAnomalies.map(a => <strong key={a.id}>{a.vehicleName}</strong>).reduce((prev, curr, i) => i === 0 ? [curr] : [...prev, ', ', curr], [] as React.ReactNode[])}.
                            Vérifiez l'emplacement physique du tracker.
                        </p>
                        <button className="w-full py-1.5 bg-red-600 text-white text-xs font-bold rounded hover:bg-red-700 transition-colors">
                            Activer Mode Vol
                        </button>
                    </div>
                );
            })()}
            
            {(() => {
                const fuelAnomalies = displayAnomalies.filter(a => a.code === 'FUEL_SUSPECT_LOSS');
                if (fuelAnomalies.length === 0) return null;
                return (
                    <div className="p-3 bg-orange-50 border border-orange-100 rounded-lg">
                        <h4 className="text-sm font-bold text-orange-800 mb-1 flex items-center gap-2">
                            <Fuel className="w-4 h-4" /> Vol Carburant Probable ({fuelAnomalies.length})
                        </h4>
                        <p className="text-xs text-orange-700 mb-2">
                            Baisse anormale détectée sur : {fuelAnomalies.map(a => <strong key={a.id}>{a.vehicleName}</strong>).reduce((prev, curr, i) => i === 0 ? [curr] : [...prev, ', ', curr], [] as React.ReactNode[])}.
                            Vérifiez les caméras ou contactez le chauffeur.
                        </p>
                        <button className="w-full py-1.5 bg-orange-600 text-white text-xs font-bold rounded hover:bg-orange-700 transition-colors">
                            Voir Graphique Jauge
                        </button>
                    </div>
                );
            })()}

            {(() => {
                const batteryAnomalies = displayAnomalies.filter(a => a.code === 'BATTERY_LOW');
                if (batteryAnomalies.length === 0) return null;
                return (
                    <div className="p-3 bg-[var(--primary-dim)] border border-[var(--primary)] rounded-lg">
                        <h4 className="text-sm font-bold text-[var(--primary)] mb-1">Maintenance Préventive</h4>
                        <p className="text-xs text-[var(--primary)]">
                            {batteryAnomalies.length} véhicule{batteryAnomalies.length > 1 ? 's' : ''} présente{batteryAnomalies.length > 1 ? 'nt' : ''} des signes de batterie faible ({batteryAnomalies.map(a => a.vehicleName).join(', ')}). Planifiez un remplacement avant panne.
                        </p>
                    </div>
                );
            })()}

            {(() => {
                const powerCutAnomalies = displayAnomalies.filter(a => a.code === 'POWER_CUT');
                if (powerCutAnomalies.length === 0) return null;
                return (
                    <div className="p-3 bg-yellow-50 border border-yellow-100 rounded-lg">
                        <h4 className="text-sm font-bold text-yellow-800 mb-1 flex items-center gap-2">
                            <Zap className="w-4 h-4" /> Alimentation Instable ({powerCutAnomalies.length})
                        </h4>
                        <p className="text-xs text-yellow-700">
                            Coupures d'alimentation fréquentes sur : {powerCutAnomalies.map(a => a.vehicleName).join(', ')}. Vérifiez le câblage du boîtier GPS.
                        </p>
                    </div>
                );
            })()}

            {(() => {
                const idleAnomalies = displayAnomalies.filter(a => a.code === 'LONG_IDLE');
                if (idleAnomalies.length === 0) return null;
                return (
                    <div className="p-3 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg">
                        <h4 className="text-sm font-bold text-[var(--text-primary)] mb-1 flex items-center gap-2">
                            <Clock className="w-4 h-4" /> Véhicules Immobiles ({idleAnomalies.length})
                        </h4>
                        <p className="text-xs text-[var(--text-secondary)]">
                            {idleAnomalies.map(a => a.vehicleName).join(', ')} — stationnement prolongé détecté. Vérifiez que le véhicule n'est pas en zone non autorisée.
                        </p>
                    </div>
                );
            })()}

            {displayAnomalies.length === 0 && (
                <div className="text-center py-6 text-[var(--text-muted)]">
                    <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Aucune anomalie détectée</p>
                </div>
            )}
        </div>
      </Card>
    </div>
  );
};
