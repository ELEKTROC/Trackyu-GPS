import React, { useEffect, useRef } from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import type { Vehicle } from '../../../types';
import { useAnimatedPosition } from '../../../hooks/useAnimatedPosition';

interface AnimatedVehicleMarkerProps {
  vehicle: Vehicle;
  icon: L.Icon | L.DivIcon;
  onClick: () => void;
}

export const AnimatedVehicleMarker: React.FC<AnimatedVehicleMarkerProps> = ({
  vehicle,
  icon,
  onClick
}) => {
  const markerRef = useRef<L.Marker | null>(null);
  
  // Animate position changes
  const animatedPosition = useAnimatedPosition(
    vehicle.location,
    1000 // 1 second animation
  );

  // Smooth marker movement
  useEffect(() => {
    if (!markerRef.current || !animatedPosition) return;

    const marker = markerRef.current;
    const newLatLng = L.latLng(animatedPosition.lat, animatedPosition.lng);
    
    // Use Leaflet's built-in smooth panning
    marker.setLatLng(newLatLng);
  }, [animatedPosition]);

  if (!animatedPosition) return null;

  return (
    <Marker
      ref={markerRef}
      position={[animatedPosition.lat, animatedPosition.lng]}
      icon={icon}
      eventHandlers={{
        click: onClick
      }}
    >
      <Popup>
        <div className="p-2 min-w-[160px]">
          <h3 className="font-bold text-sm">{vehicle.name}</h3>
          {vehicle.plate && <p className="text-xs text-slate-500">{vehicle.plate}</p>}
          {vehicle.id?.startsWith('ABO-') && <p className="text-[10px] font-mono text-blue-600">{vehicle.id}</p>}
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-slate-500">{vehicle.status}</span>
            <span className="text-xs font-medium">{vehicle.speed} km/h</span>
          </div>
        </div>
      </Popup>
    </Marker>
  );
};
