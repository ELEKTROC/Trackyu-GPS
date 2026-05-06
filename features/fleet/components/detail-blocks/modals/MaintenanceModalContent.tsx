import React from 'react';
import { Check, AlertCircle, Wrench } from 'lucide-react';

export const MaintenanceModalContent: React.FC = () => {
  // Mock data (à remplacer par props maintenanceRecords + nextMaintenance depuis VehicleDetailPanel)
  const upcomingMaintenance = [
    {
      id: 4,
      due: 'Dans 1 500 km',
      task: 'Vidange Boîte de Vitesse',
      priority: 'medium' as const,
      estimatedCost: 400,
    },
    {
      id: 5,
      due: 'Dans 5 000 km',
      task: 'Remplacement Pneus (x4)',
      priority: 'low' as const,
      estimatedCost: 600,
    },
  ];

  const maintenanceHistory = [
    { id: 1, date: '12/11/2025', task: 'Vidange Moteur + Filtres', garage: 'Garage Central', cost: 250 },
    { id: 2, date: '10/09/2025', task: 'Remplacement Plaquettes Frein', garage: 'Norauto Pro', cost: 180 },
    { id: 3, date: '15/05/2025', task: 'Contrôle Technique', garage: 'Dekra', cost: 85 },
  ];

  const priorityColor = (p: 'high' | 'medium' | 'low') =>
    p === 'high' ? 'var(--clr-danger)' : p === 'medium' ? 'var(--clr-warning)' : 'var(--brand-primary)';

  // Première échéance = la plus proche (critique si high, sinon alerte proche)
  const nextCritical = upcomingMaintenance[0];
  const alertColor = priorityColor(nextCritical?.priority ?? 'low');

  return (
    <div className="space-y-6">
      {/* PROCHAINE ÉCHÉANCE CRITIQUE */}
      {nextCritical && (
        <div
          className="p-5 rounded-[var(--brand-radius)] flex items-center justify-between"
          style={{
            backgroundColor: `${alertColor}0D`, // ~5% opacity
            border: `1px solid ${alertColor}33`, // ~20% opacity
          }}
        >
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ backgroundColor: `${alertColor}1A`, color: alertColor }}
            >
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <div
                className="text-[10px] font-black uppercase tracking-widest"
                style={{ color: alertColor, opacity: 0.8 }}
              >
                Alerte proche
              </div>
              <div className="text-sm font-black text-[var(--text-primary)] uppercase">{nextCritical.task}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-black font-mono text-[var(--text-primary)]">{nextCritical.due}</div>
            <div className="text-[9px] text-[var(--text-muted)] uppercase mt-0.5">
              ~{nextCritical.estimatedCost} F estimé
            </div>
          </div>
        </div>
      )}

      {/* INTERVENTIONS À VENIR (hors 1ère) */}
      {upcomingMaintenance.length > 1 && (
        <section>
          <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-3">
            Interventions planifiées
          </h3>
          <div className="space-y-2">
            {upcomingMaintenance.slice(1).map((item) => {
              const color = priorityColor(item.priority);
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 bg-[var(--bg-card)] rounded-[var(--brand-radius)] border border-[var(--border)]"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg" style={{ backgroundColor: `${color}1A`, color }}>
                      <Wrench className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-black text-[var(--text-primary)] uppercase">{item.task}</div>
                      <div className="text-[10px] font-medium text-[var(--text-muted)]">{item.due}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black font-mono text-[var(--text-primary)]">
                      {item.estimatedCost} F
                    </div>
                    <div className="text-[9px] text-[var(--text-muted)] uppercase">estimé</div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* HISTORIQUE INTERVENTIONS — style timeline */}
      <section>
        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-3">
          Historique interventions
        </h3>
        {maintenanceHistory.length === 0 ? (
          <div className="text-[11px] text-[var(--text-muted)] italic p-4 bg-[var(--bg-card)] rounded-[var(--brand-radius)] border border-dashed border-[var(--border)] text-center">
            Aucune intervention enregistrée.
          </div>
        ) : (
          <div className="space-y-2">
            {maintenanceHistory.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-4 bg-[var(--bg-card)] rounded-[var(--brand-radius)] border border-[var(--border)]"
              >
                <div className="flex flex-col">
                  <span className="text-xs font-black uppercase text-[var(--text-primary)]">{item.task}</span>
                  <span className="text-[10px] font-medium text-[var(--text-muted)]">
                    {item.garage} · {item.date}
                  </span>
                </div>
                <div className="flex items-center gap-3 font-mono font-bold text-xs">
                  <span className="text-[var(--text-muted)]">{item.cost} F</span>
                  <div className="p-1.5 bg-[var(--clr-success-dim)] text-[var(--clr-success-strong)] rounded-lg">
                    <Check className="w-4 h-4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
