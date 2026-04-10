import React from 'react';
import { MapPin, Copy, ExternalLink, PlayCircle } from 'lucide-react';
import { Vehicle, VehicleStatus } from '../../../../types';
import { ConfigurableRow } from './SharedBlocks';

interface ActivityBlockProps {
  vehicle: Vehicle;
  mockData: any;
  isConfigMode: boolean;
  hiddenFields: Set<string>;
  toggleFieldVisibility: (id: string) => void;
  onReplay?: () => void;
}

export const ActivityBlock: React.FC<ActivityBlockProps> = ({ 
  vehicle, 
  mockData, 
  isConfigMode, 
  hiddenFields, 
  toggleFieldVisibility,
  onReplay 
}) => {
  
  const copyLocationLink = () => {
    const link = `https://www.google.com/maps/search/?api=1&query=${vehicle.location.lat},${vehicle.location.lng}`;
    navigator.clipboard.writeText(link);
  };

  return (
    <div className="space-y-4">
         {/* Position Actuelle avec Copie */}
          <ConfigurableRow id="location" isConfigMode={isConfigMode} isHidden={hiddenFields.has('location')} onToggle={() => toggleFieldVisibility('location')}>
            <div className="bg-slate-50 p-3 rounded border border-slate-100">
                <div className="flex justify-between items-start mb-2">
                     <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-blue-500" />
                        <span className="text-sm font-bold text-slate-700">Position Actuelle</span>
                     </div>
                     <div className="flex gap-1">
                         <button onClick={copyLocationLink} title="Copier Lien" className="p-1 hover:bg-white rounded text-slate-400 hover:text-blue-600 transition-colors"><Copy className="w-3 h-3"/></button>
                         <a href={`https://www.google.com/maps?q=${vehicle.location.lat},${vehicle.location.lng}`} target="_blank" rel="noreferrer" title="Ouvrir Maps" className="p-1 hover:bg-white rounded text-slate-400 hover:text-blue-600 transition-colors"><ExternalLink className="w-3 h-3"/></a>
                     </div>
                </div>
                <p className="text-xs text-slate-600 mb-1">
                  {(vehicle as any).address || (vehicle.status === VehicleStatus.MOVING ? vehicle.departureLocation : vehicle.arrivalLocation) || `${vehicle.location?.lat?.toFixed(5)}, ${vehicle.location?.lng?.toFixed(5)}`}
                </p>
                <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
                    <span>{vehicle.location.lat.toFixed(5)}, {vehicle.location.lng.toFixed(5)}</span>
                    {mockData.geofence && mockData.geofence !== 'N/A' && (
                      <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded font-bold border border-purple-200 truncate max-w-[150px]">{mockData.geofence}</span>
                    )}
                </div>
                
                {/* REPLAY BUTTON */}
                {onReplay && (
                    <button 
                        onClick={onReplay}
                        className="w-full mt-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded flex items-center justify-center gap-2 transition-colors shadow-sm"
                    >
                        <PlayCircle className="w-4 h-4" /> Rejouer l'historique
                    </button>
                )}
            </div>
          </ConfigurableRow>

          {/* Activité Compteurs */}
          <div className="grid grid-cols-2 gap-3">
              <ConfigurableRow id="currentTrip" isConfigMode={isConfigMode} isHidden={hiddenFields.has('currentTrip')} onToggle={() => toggleFieldVisibility('currentTrip')}>
                <div className="p-2 bg-white border border-slate-100 rounded shadow-sm h-full">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Dernier trajet</span>
                    <span className="text-lg font-bold text-blue-600">{(vehicle.lastTripDistance ?? 0).toFixed(1)} km</span>
                </div>
              </ConfigurableRow>
              <ConfigurableRow id="dailyDist" isConfigMode={isConfigMode} isHidden={hiddenFields.has('dailyDist')} onToggle={() => toggleFieldVisibility('dailyDist')}>
                <div className="p-2 bg-white border border-slate-100 rounded shadow-sm h-full">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Distance (Jour)</span>
                    <span className="text-lg font-bold text-slate-800">{(vehicle.dailyMileage ?? 0).toFixed(1)} km</span>
                </div>
              </ConfigurableRow>
          </div>
          
          {/* Tableau Temps */}
          <div className="text-sm space-y-2 border-t border-slate-100 pt-2">
              <ConfigurableRow id="drivingTime" isConfigMode={isConfigMode} isHidden={hiddenFields.has('drivingTime')} onToggle={() => toggleFieldVisibility('drivingTime')} className="flex justify-between"><span className="text-slate-500">Conduite</span><span className="font-mono font-medium">{mockData.drivingTime}</span></ConfigurableRow>
              <ConfigurableRow id="idleTime" isConfigMode={isConfigMode} isHidden={hiddenFields.has('idleTime')} onToggle={() => toggleFieldVisibility('idleTime')} className="flex justify-between"><span className="text-slate-500">Ralenti</span><span className="font-mono font-medium">{mockData.idleTime}</span></ConfigurableRow>
              <ConfigurableRow id="stoppedTime" isConfigMode={isConfigMode} isHidden={hiddenFields.has('stoppedTime')} onToggle={() => toggleFieldVisibility('stoppedTime')} className="flex justify-between"><span className="text-slate-500">Arrêt</span><span className="font-mono font-medium">{mockData.stoppedTime}</span></ConfigurableRow>
              <ConfigurableRow id="offlineTime" isConfigMode={isConfigMode} isHidden={hiddenFields.has('offlineTime')} onToggle={() => toggleFieldVisibility('offlineTime')} className="flex justify-between"><span className="text-slate-500">Hors ligne</span><span className="font-mono font-medium">{mockData.offlineTime}</span></ConfigurableRow>
          </div>
    </div>
  );
};
