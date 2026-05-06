import React from 'react';
import { MapPin, Copy, ExternalLink, PlayCircle, Clock } from 'lucide-react';
import type { Vehicle } from '../../../../types';
import { VehicleStatus } from '../../../../types';
import { ConfigurableRow } from './SharedBlocks';

interface ActivityBlockProps {
  vehicle: Vehicle;
  mockData: any;
  totalDistance?: number;
  isConfigMode: boolean;
  hiddenFields: Set<string>;
  toggleFieldVisibility: (id: string) => void;
  onReplay?: () => void;
}

export const ActivityBlock: React.FC<ActivityBlockProps> = ({
  vehicle,
  mockData,
  totalDistance,
  isConfigMode,
  hiddenFields,
  toggleFieldVisibility,
  onReplay,
}) => {
  const copyLocationLink = () => {
    if (!vehicle.location) return;
    const link = `https://www.google.com/maps/search/?api=1&query=${vehicle.location.lat},${vehicle.location.lng}`;
    navigator.clipboard.writeText(link);
  };

  return (
    <div className="space-y-4">
      {/* 1. POSITION ACTUELLE — glass card */}
      <ConfigurableRow
        id="location"
        isConfigMode={isConfigMode}
        isHidden={hiddenFields.has('location')}
        onToggle={() => toggleFieldVisibility('location')}
      >
        <div className="bg-[var(--bg-card)] p-4 rounded-[var(--brand-radius)] shadow-sm transition-all hover:ring-1 hover:ring-[var(--brand-primary)]/30">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-[var(--brand-primary)]/10 rounded-lg">
                <MapPin className="w-4 h-4 text-[var(--brand-primary)]" />
              </div>
              <span className="text-sm font-bold tracking-tight text-[var(--text-primary)]">Position Actuelle</span>
            </div>
            <div className="flex gap-1">
              <button
                onClick={copyLocationLink}
                title="Copier le lien"
                className="p-1.5 rounded-md text-[var(--text-muted)] hover:bg-[var(--bg-app)] hover:text-[var(--brand-primary)] transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
              <a
                href={`https://www.google.com/maps?q=${vehicle.location?.lat},${vehicle.location?.lng}`}
                target="_blank"
                rel="noreferrer"
                title="Ouvrir dans Maps"
                className="p-1.5 rounded-md text-[var(--text-muted)] hover:bg-[var(--bg-app)] hover:text-[var(--brand-primary)] transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          <p className="text-xs text-[var(--text-secondary)] mb-3 leading-relaxed">
            {(vehicle as any).address ||
              (vehicle.status === VehicleStatus.MOVING ? vehicle.departureLocation : vehicle.arrivalLocation) ||
              `${vehicle.location?.lat?.toFixed(5)}, ${vehicle.location?.lng?.toFixed(5)}`}
          </p>

          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 text-[10px] font-mono text-[var(--text-muted)] bg-[var(--bg-app)] px-2 py-1 rounded">
              <span>
                {vehicle.location?.lat?.toFixed(5)}, {vehicle.location?.lng?.toFixed(5)}
              </span>
            </div>
            {mockData.geofence && mockData.geofence !== 'N/A' && (
              <span className="px-2 py-0.5 bg-[var(--color-info)]/10 text-[var(--color-info)] border border-[var(--color-info)]/20 rounded text-[10px] font-bold truncate max-w-[160px]">
                {mockData.geofence}
              </span>
            )}
          </div>

          {onReplay && (
            <button
              onClick={onReplay}
              className="mt-4 w-full py-2 bg-[var(--brand-primary)]/15 hover:bg-[var(--brand-primary)] text-[var(--brand-primary)] hover:text-white text-[11px] font-bold rounded-[var(--brand-radius)] flex items-center justify-center gap-2 transition-all border border-[var(--brand-primary)]/40"
            >
              <PlayCircle className="w-3.5 h-3.5" /> REJOUER LE TRAJET
            </button>
          )}
        </div>
      </ConfigurableRow>

      {/* 2. COMPTEURS DISTANCE — 2 cols télémétrie */}
      <div className="grid grid-cols-2 gap-3">
        <ConfigurableRow
          id="currentTrip"
          isConfigMode={isConfigMode}
          isHidden={hiddenFields.has('currentTrip')}
          onToggle={() => toggleFieldVisibility('currentTrip')}
        >
          <div className="p-3 bg-[var(--bg-card)] rounded-[var(--brand-radius)] flex flex-col items-center text-center group h-full">
            <span className="text-[10px] text-[var(--text-secondary)] uppercase font-black tracking-widest mb-1">
              Dernier trajet
            </span>
            <span className="text-xl font-black text-[var(--brand-primary)] group-hover:opacity-80 transition-opacity">
              {(vehicle.lastTripDistance ?? 0).toFixed(1)} <small className="text-[10px] font-normal">KM</small>
            </span>
          </div>
        </ConfigurableRow>
        <ConfigurableRow
          id="dailyDist"
          isConfigMode={isConfigMode}
          isHidden={hiddenFields.has('dailyDist')}
          onToggle={() => toggleFieldVisibility('dailyDist')}
        >
          <div className="p-3 bg-[var(--bg-card)] rounded-[var(--brand-radius)] flex flex-col items-center text-center group h-full">
            <span className="text-[10px] text-[var(--text-secondary)] uppercase font-black tracking-widest mb-1">
              Distance (Jour)
            </span>
            <span className="text-xl font-black text-[var(--text-primary)] group-hover:text-[var(--brand-primary)] transition-colors">
              {(totalDistance ?? vehicle.dailyMileage ?? 0).toFixed(1)}{' '}
              <small className="text-[10px] font-normal">KM</small>
            </span>
          </div>
        </ConfigurableRow>
      </div>

      {/* 3. RÉPARTITION TEMPS — liste avec dots couleur statut */}
      <div className="bg-[var(--bg-card)] p-4 rounded-[var(--brand-radius)] space-y-2">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
            Répartition du temps
          </span>
        </div>

        {[
          {
            id: 'drivingTime',
            label: 'Conduite',
            value: mockData.drivingTime,
            color: 'var(--status-moving)',
          },
          {
            id: 'idleTime',
            label: 'Ralenti',
            value: mockData.idleTime,
            color: 'var(--status-idle)',
          },
          {
            id: 'stoppedTime',
            label: 'Arrêt',
            value: mockData.stoppedTime,
            color: 'var(--status-stopped)',
          },
          {
            id: 'offlineTime',
            label: 'Hors ligne',
            value: mockData.offlineTime,
            color: 'var(--status-offline)',
          },
        ].map((item) => (
          <ConfigurableRow
            key={item.id}
            id={item.id}
            isConfigMode={isConfigMode}
            isHidden={hiddenFields.has(item.id)}
            onToggle={() => toggleFieldVisibility(item.id)}
            className="flex justify-between items-center group"
          >
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-xs text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
                {item.label}
              </span>
            </div>
            <span className="font-mono text-xs font-bold">{item.value}</span>
          </ConfigurableRow>
        ))}
      </div>
    </div>
  );
};
