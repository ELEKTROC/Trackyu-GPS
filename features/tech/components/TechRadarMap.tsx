import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import type { Intervention, SystemUser } from '../../../types';
import { LOCATIONS_COORDS, getStatusColorHex, INTERVENTION_STATUSES } from '../constants';
import { useDataContext } from '../../../contexts/DataContext';

// Fix for default marker icon assets
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

interface TechRadarMapProps {
  technicians: SystemUser[];
  interventions: Intervention[];
  onInterventionClick: (int: Intervention) => void;
}

const createStatusIcon = (status: string) => {
  const color = getStatusColorHex(status);
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="background-color: ${color}; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
};

const createTechIcon = (avatarUrl: string, isBusy: boolean) => {
  const statusColor = isBusy ? '#f97316' : '#22c55e';
  return L.divIcon({
    className: 'tech-marker',
    html: `
            <div style="position: relative; width: 40px; height: 40px;">
                <img src="${avatarUrl}" style="width: 100%; height: 100%; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); object-fit: cover;" />
                <div style="position: absolute; bottom: 0; right: 0; width: 12px; height: 12px; background-color: ${statusColor}; border: 2px solid white; border-radius: 50%;"></div>
            </div>
        `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
};

// Helper to get coordinates safely (case-insensitive)
const getCoords = (location: string) => {
  if (!location) return null;
  // Try exact match
  if (LOCATIONS_COORDS[location]) return LOCATIONS_COORDS[location];
  // Try case-insensitive match
  const locLower = location.toLowerCase();
  const found = Object.entries(LOCATIONS_COORDS).find(([key]) => key.toLowerCase() === locLower);
  if (found) return found[1];
  // Try splitting by " - " (e.g. "Abidjan - Riviera")
  const city = location.split(' - ')[0].trim();
  if (LOCATIONS_COORDS[city]) return LOCATIONS_COORDS[city];
  const foundCity = Object.entries(LOCATIONS_COORDS).find(([key]) => key.toLowerCase() === city.toLowerCase());
  if (foundCity) return foundCity[1];
  // Try partial match (e.g. location contains a known city name)
  const partial = Object.entries(LOCATIONS_COORDS).find(([key]) => locLower.includes(key.toLowerCase()));
  if (partial) return partial[1];
  return null;
};

// Component to update map view when interventions change
const MapUpdater: React.FC<{ interventions: Intervention[] }> = ({ interventions }) => {
  const map = useMap();

  useEffect(() => {
    if (interventions.length > 0) {
      const bounds = L.latLngBounds([]);
      let hasPoints = false;

      interventions.forEach((int) => {
        const coords = getCoords(int.location);
        if (coords) {
          bounds.extend([coords.lat, coords.lng]);
          hasPoints = true;
        }
      });

      if (hasPoints) {
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [interventions, map]);

  return null;
};

export const TechRadarMap: React.FC<TechRadarMapProps> = ({ technicians, interventions, onInterventionClick }) => {
  const { tiers } = useDataContext();
  const CENTER_LAT = 5.36; // Côte d'Ivoire - Abidjan
  const CENTER_LNG = -4.0083;

  // Helper pour obtenir le nom du client
  const getClientName = (clientId: string | undefined) => {
    if (!clientId) return 'Client';
    const client = tiers.find((t) => t.id === clientId);
    return client?.name || clientId.substring(0, 8) + '...';
  };

  // Helper pour le label status français
  const getStatusLabel = (status: string) => {
    return (INTERVENTION_STATUSES as Record<string, string>)[status] || status;
  };

  return (
    <div className="relative w-full h-full bg-[var(--bg-elevated)] bg-[var(--bg-surface)] z-0">
      {/* Live Indicator */}
      <div className="absolute top-4 right-4 z-[1000] bg-white/90 bg-[var(--bg-elevated)]/90 backdrop-blur-sm px-3 py-1.5 rounded-full border border-[var(--border)] shadow-sm flex items-center gap-2">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
        </span>
        <span className="text-xs font-bold text-[var(--text-primary)]">Suivi GPS Live</span>
      </div>

      <MapContainer
        center={[CENTER_LAT, CENTER_LNG]}
        zoom={7}
        style={{ height: '100%', width: '100%', minHeight: '400px' }}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapUpdater interventions={interventions} />

        {/* Interventions Markers */}
        {interventions
          .filter((i) => i.status !== 'COMPLETED')
          .map((int) => {
            const coords = getCoords(int.location);
            if (!coords) return null;
            const clientName = getClientName(int.clientId);
            const techName = technicians.find((t) => t.id === int.technicianId)?.name;
            const time = int.scheduledDate
              ? new Date(int.scheduledDate).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
              : '';

            return (
              <Marker
                key={int.id}
                position={[coords.lat, coords.lng]}
                icon={createStatusIcon(int.status)}
                eventHandlers={{
                  click: () => onInterventionClick(int),
                }}
              >
                <Popup>
                  <div className="p-1 min-w-[140px]">
                    <h3 className="font-bold text-sm">{clientName}</h3>
                    <p className="text-xs text-[var(--text-secondary)]">{int.nature || int.type}</p>
                    {int.licensePlate && (
                      <p className="text-[10px] font-mono text-[var(--text-muted)]">{int.licensePlate}</p>
                    )}
                    <div className="flex items-center justify-between mt-1 gap-2">
                      <span
                        className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                        style={{
                          backgroundColor: getStatusColorHex(int.status) + '20',
                          color: getStatusColorHex(int.status),
                        }}
                      >
                        {getStatusLabel(int.status)}
                      </span>
                      {time && <span className="text-[10px] font-mono text-[var(--text-muted)]">{time}</span>}
                    </div>
                    {techName && <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Tech: {techName}</p>}
                    {int.location && <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{int.location}</p>}
                  </div>
                </Popup>
              </Marker>
            );
          })}

        {/* Technicians Markers */}
        {technicians
          .filter((t) => t.location)
          .map((tech) => {
            if (!tech.location) return null;
            return (
              <Marker
                key={tech.id}
                position={[tech.location.lat, tech.location.lng]}
                icon={createTechIcon(tech.avatar, tech.jobStatus === 'BUSY')}
              >
                <Popup>
                  <div className="text-center">
                    <h3 className="font-bold text-sm">{tech.name}</h3>
                    <p className="text-xs text-[var(--text-secondary)]">{tech.specialty}</p>
                    <p className="text-[10px] text-[var(--text-muted)] mt-1">
                      Dernière pos: {new Date().toLocaleTimeString('fr-FR')}
                    </p>
                  </div>
                </Popup>
              </Marker>
            );
          })}
      </MapContainer>

      {/* Legend Overlay */}
      <div className="absolute bottom-4 right-4 bg-white/90 bg-[var(--bg-elevated)]/90 backdrop-blur-sm p-3 rounded-lg border border-[var(--border)] shadow-sm text-xs space-y-2 z-[1000]">
        <p className="font-bold text-[var(--text-secondary)] mb-1 uppercase text-[10px]">Légende</p>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span>{' '}
          <span className="text-[var(--text-secondary)]">Tech Dispo</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>{' '}
          <span className="text-[var(--text-secondary)]">Tech Occupé</span>
        </div>
        <div className="h-px bg-[var(--bg-elevated)] bg-[var(--bg-elevated)] my-1"></div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[var(--primary-dim)]0"></span>{' '}
          <span className="text-[var(--text-secondary)]">Planifié</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>{' '}
          <span className="text-[var(--text-secondary)]">En route</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>{' '}
          <span className="text-[var(--text-secondary)]">En cours</span>
        </div>
      </div>
    </div>
  );
};
