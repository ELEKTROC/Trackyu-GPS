import React from 'react';
import { AlertTriangle, Shield, MapPin, Clock, AlertOctagon } from 'lucide-react';

export const ViolationsModalContent: React.FC = () => {
  // Mock Data
  const safetyScore = 85;
  
  const violations = [
    { id: 1, type: 'Excès de vitesse', severity: 'high', date: 'Aujourd\'hui, 14:30', location: 'A6 - PK 45', details: '135 km/h sur zone 110' },
    { id: 2, type: 'Freinage brusque', severity: 'medium', date: 'Hier, 09:15', location: 'Rue de la République', details: '-0.6g décélération' },
    { id: 3, type: 'Accélération brusque', severity: 'low', date: '28/11/2025', location: 'Sortie Entrepôt', details: 'Départ arrêté agressif' },
    { id: 4, type: 'Virage serré', severity: 'medium', date: '25/11/2025', location: 'D906', details: '0.5g latéral' },
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-600 border-red-200';
      case 'medium': return 'bg-orange-100 text-orange-600 border-orange-200';
      case 'low': return 'bg-yellow-100 text-yellow-600 border-yellow-200';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case 'high': return 'Critique';
      case 'medium': return 'Moyen';
      case 'low': return 'Mineur';
      default: return 'Info';
    }
  };

  return (
    <div className="p-6 space-y-8">
      {/* Score de sécurité */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 text-white flex items-center justify-between shadow-lg">
        <div>
          <h3 className="text-slate-300 font-medium mb-1 flex items-center gap-2">
            <Shield className="w-5 h-5" /> Score de Conduite
          </h3>
          <div className="text-4xl font-bold tracking-tight">{safetyScore}/100</div>
          <p className="text-sm text-slate-400 mt-2">Bon conducteur, attention aux excès de vitesse.</p>
        </div>
        <div className="h-20 w-20 rounded-full border-4 border-green-500 flex items-center justify-center bg-slate-800 shadow-[0_0_15px_rgba(34,197,94,0.3)]">
          <span className="text-2xl font-bold text-green-400">A-</span>
        </div>
      </div>

      {/* Liste des infractions */}
      <section>
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <AlertOctagon className="w-5 h-5 text-red-500" />
          Infractions récentes
        </h3>
        <div className="space-y-4">
          {violations.map((violation) => (
            <div key={violation.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg border ${getSeverityColor(violation.severity)}`}>
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800">{violation.type}</h4>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${getSeverityColor(violation.severity)} bg-opacity-20 border-none`}>
                      {getSeverityLabel(violation.severity)}
                    </span>
                  </div>
                </div>
                <div className="text-right text-xs text-slate-500 flex flex-col items-end gap-1">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {violation.date}</span>
                </div>
              </div>
              
              <div className="pl-[3.25rem]">
                <p className="text-sm text-slate-600 mb-2">{violation.details}</p>
                <div className="flex items-center gap-1 text-xs text-slate-400 bg-slate-50 p-2 rounded border border-slate-100 inline-flex">
                  <MapPin className="w-3 h-3" />
                  {violation.location}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
