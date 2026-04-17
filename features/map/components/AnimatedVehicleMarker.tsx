import React, { useEffect, useRef } from 'react';
import { Marker, Popup, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import type { Vehicle } from '../../../types';
import { VehicleStatus } from '../../../types';
import { useAnimatedPosition } from '../../../hooks/useAnimatedPosition';

interface AnimatedVehicleMarkerProps {
  vehicle: Vehicle;
  icon: L.Icon | L.DivIcon;
  onClick: () => void;
  showLabel?: boolean;
}

const STATUS_COLOR: Record<VehicleStatus, string> = {
  [VehicleStatus.MOVING]: '#22c55e',
  [VehicleStatus.IDLE]: '#f97316',
  [VehicleStatus.STOPPED]: '#ef4444',
  [VehicleStatus.OFFLINE]: '#64748b',
};

const STATUS_FR: Record<VehicleStatus, string> = {
  [VehicleStatus.MOVING]: 'En route',
  [VehicleStatus.IDLE]: 'Ralenti',
  [VehicleStatus.STOPPED]: 'Arrêté',
  [VehicleStatus.OFFLINE]: 'Hors ligne',
};

export const AnimatedVehicleMarker: React.FC<AnimatedVehicleMarkerProps> = ({
  vehicle,
  icon,
  onClick,
  showLabel = true,
}) => {
  const markerRef = useRef<L.Marker | null>(null);
  const prevHeadingRef = useRef<number>(vehicle.heading ?? 0);

  // Animate position changes
  const animatedPosition = useAnimatedPosition(
    vehicle.location,
    1000 // 1 second animation
  );

  // Smooth marker movement
  useEffect(() => {
    if (!markerRef.current || !animatedPosition) return;
    markerRef.current.setLatLng(L.latLng(animatedPosition.lat, animatedPosition.lng));
  }, [animatedPosition]);

  // Smooth heading animation via direct DOM manipulation (CSS transition 1s)
  useEffect(() => {
    if (vehicle.status !== VehicleStatus.MOVING) return;
    const el = markerRef.current?.getElement();
    if (!el) return;
    const arrow = el.querySelector('[data-arrow]') as HTMLElement | null;
    if (!arrow) return;

    // Normalize rotation delta to avoid 359°→1° going the long way around
    const target = vehicle.heading ?? 0;
    const prev = prevHeadingRef.current;
    let delta = target - prev;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    const normalized = prev + delta;

    arrow.style.transition = 'transform 1s ease';
    arrow.style.transform = `translateX(-50%) rotate(${normalized}deg)`;
    prevHeadingRef.current = normalized;
  }, [vehicle.heading, vehicle.status]);

  if (!animatedPosition) return null;

  const color = STATUS_COLOR[vehicle.status] ?? '#64748b';
  const statusFr = STATUS_FR[vehicle.status] ?? vehicle.status;
  const plate = vehicle.licensePlate || vehicle.name || '—';
  const speed = Math.round(vehicle.speed ?? 0);
  const address = (vehicle as any).address as string | undefined;

  // Build label parts
  const parts: string[] = [plate, `${speed} km/h`, statusFr];
  if (address) parts.push(address);
  const labelText = parts.join(' · ');

  return (
    <Marker
      ref={markerRef}
      position={[animatedPosition.lat, animatedPosition.lng]}
      icon={icon}
      eventHandlers={{
        click: onClick,
      }}
    >
      {/* Étiquette permanente — une seule ligne, couleur du statut */}
      {showLabel && (
        <Tooltip permanent direction="right" offset={[14, 0]} className="vehicle-label-tooltip" interactive={false}>
          <span
            style={{
              display: 'inline-block',
              background: 'rgba(15,15,20,0.82)',
              border: `1.5px solid ${color}`,
              borderRadius: '6px',
              padding: '2px 7px',
              fontSize: '11px',
              fontWeight: 700,
              color: color,
              whiteSpace: 'nowrap',
              letterSpacing: '0.3px',
              boxShadow: `0 0 6px ${color}44`,
              lineHeight: 1.4,
              maxWidth: '220px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {labelText}
          </span>
        </Tooltip>
      )}

      <Popup>
        <div className="p-2 min-w-[160px]">
          <h3 className="font-bold text-sm">{vehicle.name}</h3>
          {vehicle.plate && <p className="text-xs text-[var(--text-secondary)]">{vehicle.plate}</p>}
          {vehicle.id?.startsWith('ABO-') && (
            <p className="text-[10px] font-mono text-[var(--primary)]">{vehicle.id}</p>
          )}
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-[var(--text-secondary)]">{vehicle.status}</span>
            <span className="text-xs font-medium">{vehicle.speed} km/h</span>
          </div>
        </div>
      </Popup>
    </Marker>
  );
};
