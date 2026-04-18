import React, { useState, useEffect, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, Polyline, Polygon, Circle, OverlayView } from '@react-google-maps/api';
import { type Vehicle, type Zone, type Coordinate, VehicleStatus } from '../../../types';
import { Truck, Car, Bike, Bus, Hammer } from 'lucide-react';

interface GoogleMapComponentProps {
  apiKey: string;
  vehicles: Vehicle[];
  zones?: Zone[];
  replayPath?: Coordinate[];
  selectedVehicle?: Vehicle | null;
  onVehicleSelect: (vehicle: Vehicle) => void;
  center?: Coordinate;
  zoom?: number;
  mapType?: 'roadmap' | 'satellite' | 'terrain' | 'hybrid';
}

const containerStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
};

const defaultCenter = {
  lat: 5.36, // Abidjan
  lng: -4.0083,
};

// Define libraries outside component to prevent re-renders
const LIBRARIES: ('places' | 'geometry' | 'drawing' | 'visualization')[] = ['geometry'];

// --- CUSTOM ICON GENERATOR (Reused logic adapted for Google Maps) ---
const getVehicleIconColor = (status: VehicleStatus) => {
  if (status === VehicleStatus.MOVING) return '#22c55e'; // Green
  if (status === VehicleStatus.IDLE) return '#f97316'; // Orange
  if (status === VehicleStatus.STOPPED) return '#ef4444'; // Red
  return '#64748b'; // Slate (Offline)
};

const getVehicleIconComponent = (type: string | undefined, name: string) => {
  let IconComponent = Car;
  if (type === 'TRUCK') IconComponent = Truck;
  else if (type === 'MOTORCYCLE') IconComponent = Bike;
  else if (type === 'BUS') IconComponent = Bus;
  else if (type === 'CONSTRUCTION') IconComponent = Hammer;
  else if (type === 'VAN') IconComponent = Truck;
  else {
    const n = name.toLowerCase();
    if (n.includes('truck') || n.includes('camion')) IconComponent = Truck;
    else if (n.includes('bus')) IconComponent = Bus;
    else if (n.includes('moto')) IconComponent = Bike;
  }
  return IconComponent;
};

export const GoogleMapComponent: React.FC<GoogleMapComponentProps> = ({
  apiKey,
  vehicles,
  zones = [],
  replayPath = [],
  selectedVehicle,
  onVehicleSelect,
  center,
  zoom = 12,
  mapType = 'roadmap',
}) => {
  const { isLoaded } = useJsApiLoader({
    id: 'fleet-google-map-script', // Unique ID to prevent HMR conflicts
    googleMapsApiKey: apiKey,
    libraries: LIBRARIES,
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);

  const onLoad = useCallback(function callback(map: google.maps.Map) {
    setMap(map);
    // Trigger resize after a short delay to ensure proper sizing
    setTimeout(() => {
      window.google?.maps?.event?.trigger(map, 'resize');
    }, 100);
  }, []);

  const onUnmount = useCallback(function callback(_map: google.maps.Map) {
    setMap(null);
  }, []);

  // Force resize when map changes or window resizes
  useEffect(() => {
    if (map) {
      const handleResize = () => {
        window.google?.maps?.event?.trigger(map, 'resize');
      };
      window.addEventListener('resize', handleResize);
      // Also trigger resize on mount
      handleResize();
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [map]);

  // Update center when selected vehicle changes
  useEffect(() => {
    if (map && selectedVehicle) {
      map.panTo({ lat: selectedVehicle.location.lat, lng: selectedVehicle.location.lng });
      map.setZoom(15);
    }
  }, [selectedVehicle, map]);

  // Update center when prop changes (if not selecting vehicle)
  useEffect(() => {
    if (map && center && !selectedVehicle) {
      map.panTo(center);
    }
  }, [center, map, selectedVehicle]);

  // Sync mapType (roadmap / satellite)
  useEffect(() => {
    if (map) map.setMapTypeId(mapType);
  }, [map, mapType]);

  if (!isLoaded)
    return (
      <div className="w-full h-full flex items-center justify-center bg-[var(--bg-elevated)] bg-[var(--bg-surface)] text-[var(--text-secondary)]">
        Chargement Google Maps...
      </div>
    );

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={center || defaultCenter}
      zoom={zoom}
      onLoad={onLoad}
      onUnmount={onUnmount}
      options={{
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }],
          },
        ],
      }}
    >
      {/* ZONES */}
      {zones.map((zone) => {
        if (zone.type === 'CIRCLE' && zone.center && zone.radius) {
          return (
            <Circle
              key={zone.id}
              center={zone.center}
              radius={zone.radius}
              options={{
                fillColor: zone.color,
                fillOpacity: 0.2,
                strokeColor: zone.color,
                strokeOpacity: 0.8,
                strokeWeight: 2,
              }}
            />
          );
        } else if (zone.type === 'POLYGON' && zone.coordinates) {
          return (
            <Polygon
              key={zone.id}
              paths={zone.coordinates}
              options={{
                fillColor: zone.color,
                fillOpacity: 0.2,
                strokeColor: zone.color,
                strokeOpacity: 0.8,
                strokeWeight: 2,
              }}
            />
          );
        }
        return null;
      })}

      {/* REPLAY PATH */}
      {replayPath.length > 0 && (
        <Polyline
          path={replayPath}
          options={{
            strokeColor: '#3b82f6',
            strokeOpacity: 0.8,
            strokeWeight: 4,
          }}
        />
      )}

      {/* VEHICLES */}
      {vehicles.map((vehicle) => {
        const color = getVehicleIconColor(vehicle.status);
        const IconComponent = getVehicleIconComponent(vehicle.type, vehicle.name);

        // Using OverlayView for custom HTML markers (similar to Leaflet divIcon)
        // Note: OverlayView requires position to be set
        return (
          <OverlayView key={vehicle.id} position={vehicle.location} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
            <div
              onClick={() => onVehicleSelect(vehicle)}
              style={{
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'white',
                borderRadius: '50%',
                border: `2px solid ${color}`,
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                position: 'absolute',
                transform: 'translate(-50%, -50%)', // Center the icon
                cursor: 'pointer',
              }}
            >
              <IconComponent size={20} color={color} fill={color} fillOpacity={0.1} />
              {vehicle.status === VehicleStatus.MOVING && (
                <div
                  style={{
                    position: 'absolute',
                    top: -5,
                    left: '50%',
                    transform: `translateX(-50%) rotate(${vehicle.heading || 0}deg)`,
                    transformOrigin: 'bottom center',
                    height: '24px',
                    width: '2px',
                  }}
                >
                  <div
                    style={{
                      width: 0,
                      height: 0,
                      borderLeft: '4px solid transparent',
                      borderRight: '4px solid transparent',
                      borderBottom: `6px solid ${color}`,
                      position: 'absolute',
                      top: 0,
                      left: '-4px',
                    }}
                  />
                </div>
              )}
            </div>
          </OverlayView>
        );
      })}
    </GoogleMap>
  );
};
