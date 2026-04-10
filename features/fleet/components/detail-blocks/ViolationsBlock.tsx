import React from 'react';
import { AlertOctagon, Video, EyeOff, Coffee, Phone, ShieldAlert } from 'lucide-react';
import { ConfigurableRow } from './SharedBlocks';
import type { Vehicle } from '../../../../types';

interface ViolationsBlockProps {
  vehicle: Vehicle;
  mockData: any;
  isConfigMode: boolean;
  hiddenFields: Set<string>;
  toggleFieldVisibility: (id: string) => void;
  setActiveModal: (modal: string) => void;
}

export const ViolationsBlock: React.FC<ViolationsBlockProps> = ({
  vehicle,
  mockData,
  isConfigMode,
  hiddenFields,
  toggleFieldVisibility,
  setActiveModal
}) => {
  const videoEvents = vehicle.videoEvents || [];
  
  // Map Video Events to Icons
  const getVideoIcon = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('fatigue') || t.includes('sleep')) return <Coffee className="w-4 h-4 text-red-500" />;
    if (t.includes('distraction') || t.includes('look_away')) return <EyeOff className="w-4 h-4 text-orange-500" />;
    if (t.includes('phone') || t.includes('calling')) return <Phone className="w-4 h-4 text-red-400" />;
    return <Video className="w-4 h-4 text-[var(--primary)]" />;
  };

  return (
    <div className="space-y-4">
        {/* Video AI Specific Events (DMS/ADAS) */}
        {videoEvents.length > 0 && (
          <div className="space-y-2">
            <div className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1.5 ml-2">
              <Video className="w-3 h-3" /> Analyse Vidéo IA
            </div>
            {videoEvents.slice(0, 3).map((event: any, i: number) => (
              <ConfigurableRow key={`vid-${i}`} id={`vid-${i}`} isConfigMode={isConfigMode} isHidden={hiddenFields.has(`vid-${i}`)} onToggle={() => toggleFieldVisibility(`vid-${i}`)}>
                <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-lg">
                  <div className="shrink-0 mt-0.5">{getVideoIcon(event.type)}</div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-red-700 dark:text-red-400 truncate">{event.label || event.type}</div>
                    <div className="text-[10px] text-red-600/70 dark:text-red-400/50">{new Date(event.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} • Confiance: {Math.round(event.confidence * 100)}%</div>
                  </div>
                  {event.clipUrl && (
                    <button className="ml-auto p-1.5 bg-white dark:bg-slate-800 rounded shadow-sm hover:scale-105 transition-transform">
                      <Video className="w-3 h-3 text-[var(--primary)]" />
                    </button>
                  )}
                </div>
              </ConfigurableRow>
            ))}
          </div>
        )}

        {/* Traditional Logic Violations */}
        <div className="space-y-1">
          <div className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1.5 ml-2 mb-2">
            <ShieldAlert className="w-3 h-3" /> Violations de Conduite
          </div>
          {mockData.violationsList.slice(0, 5).map((v: any, i: number) => (
              <ConfigurableRow key={i} id={`viol-${i}`} isConfigMode={isConfigMode} isHidden={hiddenFields.has(`viol-${i}`)} onToggle={() => toggleFieldVisibility(`viol-${i}`)}>
                  <div className="flex items-start gap-3 p-2 border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      <AlertOctagon className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      <div>
                          <div className="text-xs font-bold text-slate-700 dark:text-slate-300">{v.type}</div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-500">{v.details}</div>
                          <div className="text-[9px] text-slate-400 mt-0.5">{v.time}</div>
                      </div>
                  </div>
              </ConfigurableRow>
          ))}
        </div>

        <button 
          onClick={() => setActiveModal('violations')} 
          className="w-full py-2 text-xs text-[var(--primary)] dark:text-[var(--primary)] hover:bg-[var(--primary-dim)] dark:hover:bg-[var(--primary-dim)]/20 font-medium rounded transition-colors"
        >
          Voir le rapport de sécurité complet
        </button>
    </div>
  );
};

