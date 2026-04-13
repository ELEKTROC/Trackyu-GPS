import React from 'react';
import { Check, AlertCircle, Clock, Calendar, FileText, Wrench } from 'lucide-react';

export const MaintenanceModalContent: React.FC = () => {
  // Mock Data étendu pour la modale
  const maintenanceHistory = [
    {
      id: 1,
      date: '12/11/2025',
      type: 'Préventive',
      task: 'Vidange Moteur + Filtres',
      garage: 'Garage Central',
      cost: 250,
      status: 'completed',
      technician: 'Jean Dupont',
    },
    {
      id: 2,
      date: '10/09/2025',
      type: 'Corrective',
      task: 'Remplacement Plaquettes Frein',
      garage: 'Norauto Pro',
      cost: 180,
      status: 'completed',
      technician: 'Marc Martin',
    },
    {
      id: 3,
      date: '15/05/2025',
      type: 'Réglementaire',
      task: 'Contrôle Technique',
      garage: 'Dekra',
      cost: 85,
      status: 'completed',
      technician: 'Centre 12',
    },
  ];

  const upcomingMaintenance = [
    { id: 4, due: 'Dans 1500 km', task: 'Vidange Boîte de Vitesse', priority: 'medium', estimatedCost: 400 },
    { id: 5, due: 'Dans 5000 km', task: 'Remplacement Pneus (x4)', priority: 'low', estimatedCost: 600 },
  ];

  return (
    <div className="p-6 space-y-8">
      {/* Section Prochaines Interventions */}
      <section>
        <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-[var(--primary)]" />
          Interventions à venir
        </h3>
        <div className="grid gap-4">
          {upcomingMaintenance.map((item) => (
            <div
              key={item.id}
              className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg p-4 shadow-sm flex justify-between items-center"
            >
              <div className="flex items-start gap-4">
                <div
                  className={`p-2 rounded-full ${item.priority === 'high' ? 'bg-red-100 text-red-600' : item.priority === 'medium' ? 'bg-orange-100 text-orange-600' : 'bg-[var(--primary-dim)] text-[var(--primary)]'}`}
                >
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-[var(--text-primary)]">{item.task}</h4>
                  <p className="text-sm text-[var(--text-secondary)] font-medium">{item.due}</p>
                </div>
              </div>
              <div className="text-right">
                <span className="block font-mono font-bold text-[var(--text-primary)]">{item.estimatedCost}</span>
                <span className="text-xs text-[var(--text-muted)]">Estimé</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Section Historique */}
      <section>
        <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-[var(--text-secondary)]" />
          Historique d'entretien
        </h3>
        <div className="border border-[var(--border)] rounded-lg overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-[var(--bg-elevated)] text-[var(--text-secondary)] font-medium border-b border-[var(--border)]">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Intervention</th>
                <th className="px-4 py-3">Garage</th>
                <th className="px-4 py-3 text-right">Coût</th>
                <th className="px-4 py-3 text-center">Statut</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {maintenanceHistory.map((item) => (
                <tr key={item.id} className="tr-hover transition-colors">
                  <td className="px-4 py-3 font-mono text-[var(--text-secondary)]">{item.date}</td>
                  <td className="px-4 py-3">
                    <div className="font-bold text-[var(--text-primary)]">{item.task}</div>
                    <div className="text-xs text-[var(--text-muted)]">{item.type}</div>
                  </td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">{item.garage}</td>
                  <td className="px-4 py-3 text-right font-mono font-medium">{item.cost}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                      <Check className="w-3 h-3 mr-1" /> Terminé
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button className="text-[var(--primary)] hover:text-[var(--primary)] p-1 hover:bg-[var(--primary-dim)] rounded">
                      <FileText className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
