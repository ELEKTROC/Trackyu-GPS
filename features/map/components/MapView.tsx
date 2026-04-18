import React, { useState, useMemo, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline, Circle, Polygon } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
// Minimal cluster type (MarkerCluster is not exported from leaflet directly)
interface MarkerCluster {
  getChildCount(): number;
}
import { type Vehicle, VehicleStatus, View, type Zone, type Coordinate } from '../../../types';
import {
  MapPin,
  ChevronDown,
  ChevronRight,
  Search,
  Eye,
  EyeOff,
  Battery,
  RefreshCw,
  Plus,
  CheckSquare,
  Square,
  ChevronLeft,
  Layers,
  Hexagon,
  Truck,
  Car,
  Bike,
  Bus,
  Hammer,
  Settings2,
  X,
  AlertTriangle,
  Gauge,
  Route,
  Timer,
  Volume2,
  VolumeX,
  MapPinOff,
  Activity,
  Zap,
  Filter,
  Printer,
  Tag,
} from 'lucide-react';
import { VehicleDetailPanel } from '../../fleet/components/VehicleDetailPanel';
import { StatusBadge } from '../../../components/StatusBadge';
import { MobileFilterSheet, FilterRadioRow } from '../../../components/MobileFilterSheet';
import { useDataContext } from '../../../contexts/DataContext';
import { useToast } from '../../../contexts/ToastContext';
import { useAuth } from '../../../contexts/AuthContext';

import { renderToStaticMarkup } from 'react-dom/server';
import MarkerClusterGroup from 'react-leaflet-cluster';

import { type VehicleCardConfig } from './VehicleListCard';
import { VirtualVehicleList } from './VirtualVehicleList';
import { MapSidebarSkeleton } from '../../../components/Skeleton';
import { GoogleMapComponent } from './GoogleMapComponent';
import { ReplayControlPanel, type StopEvent, type SpeedEvent, type TripSegment } from './ReplayControlPanel';
import { HeatmapLayer } from './HeatmapLayer';
import { AnimatedVehicleMarker } from './AnimatedVehicleMarker';
import { getHeaders } from '../../../services/api/client';
import { useTranslation } from '../../../i18n';

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

// --- CUSTOM ICONS ---
const MAX_ICON_CACHE = 400;
const _vehicleIconCache = new Map<string, L.DivIcon>();

const createVehicleIcon = (vehicle: Vehicle) => {
  if (!vehicle) return DefaultIcon;
  const { status, heading = 0, type, name } = vehicle;
  // heading excluded from cache key — animated via DOM in AnimatedVehicleMarker
  const cacheKey = `${status}-${type ?? ''}-${name ?? ''}`;
  if (_vehicleIconCache.has(cacheKey)) return _vehicleIconCache.get(cacheKey)!;
  // LRU eviction
  if (_vehicleIconCache.size >= MAX_ICON_CACHE) {
    _vehicleIconCache.delete(_vehicleIconCache.keys().next().value!);
  }
  let color = '#64748b'; // Default Slate (Offline)
  if (status === VehicleStatus.MOVING)
    color = '#22c55e'; // Green
  else if (status === VehicleStatus.IDLE)
    color = '#f97316'; // Orange
  else if (status === VehicleStatus.STOPPED) color = '#ef4444'; // Red

  // Determine Icon
  let IconComponent = Car;
  if (type === 'TRUCK') IconComponent = Truck;
  else if (type === 'MOTORCYCLE') IconComponent = Bike;
  else if (type === 'BUS') IconComponent = Bus;
  else if (type === 'CONSTRUCTION') IconComponent = Hammer;
  else if (type === 'VAN') IconComponent = Truck;
  else {
    // Fallback
    const n = name.toLowerCase();
    if (n.includes('truck') || n.includes('camion')) IconComponent = Truck;
    else if (n.includes('bus')) IconComponent = Bus;
    else if (n.includes('moto')) IconComponent = Bike;
  }

  const iconHtml = renderToStaticMarkup(
    <div
      style={{
        width: '34px',
        height: '34px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        filter: `drop-shadow(0 1px 3px rgba(0,0,0,0.45)) drop-shadow(0 0 6px ${color}66)`,
      }}
    >
      <IconComponent size={30} color="white" fill={color} strokeWidth={2} />
      {/* Heading Arrow — initial heading baked in, then updated via DOM in AnimatedVehicleMarker */}
      {status === VehicleStatus.MOVING && (
        <div
          data-arrow="1"
          style={{
            position: 'absolute',
            top: -5,
            left: '50%',
            transform: `translateX(-50%) rotate(${heading}deg)`,
            transformOrigin: 'bottom center',
            height: '24px',
            width: '2px',
            transition: 'transform 1s ease',
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
  );

  const icon = L.divIcon({
    html: iconHtml,
    className: 'custom-vehicle-icon',
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
  _vehicleIconCache.set(cacheKey, icon);
  return icon;
};

// Numbered marker for stops/idle during replay
const createStopMarkerIcon = (num: number, type: 'STOP' | 'IDLE', highlighted = false) => {
  const bg = type === 'STOP' ? '#dc2626' : '#f97316';
  const size = highlighted ? 36 : 28;
  const label = type === 'STOP' ? '🅿' : '⏸';
  const html = `<div style="
    width:${size}px;height:${size}px;border-radius:50%;
    background:${bg};color:white;font-weight:700;font-size:${highlighted ? 14 : 11}px;
    display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0;
    border:${highlighted ? 3 : 2}px solid white;
    box-shadow:0 ${highlighted ? 4 : 2}px ${highlighted ? 12 : 6}px rgba(0,0,0,${highlighted ? 0.5 : 0.35});
    cursor:pointer;transition:all .15s;line-height:1">
    <span style="font-size:${highlighted ? 11 : 9}px">${label}</span>
    <span>${num}</span>
  </div>`;
  return L.divIcon({ html, className: '', iconSize: [size, size], iconAnchor: [size / 2, size / 2] });
};

// Marqueur véhicule replay avec label (plaque, vitesse, distance)
const createReplayMarkerIcon = (
  vehicle: Vehicle,
  status: VehicleStatus,
  heading: number,
  speed: number,
  distKm: number
) => {
  const color = status === VehicleStatus.MOVING ? '#22c55e' : status === VehicleStatus.IDLE ? '#f97316' : '#ef4444';
  const speedColor = speed >= 90 ? '#ef4444' : speed >= 50 ? '#f97316' : speed >= 10 ? '#22c55e' : '#94a3b8';
  const plate = vehicle.licensePlate || vehicle.name || '—';
  const typeEmoji =
    vehicle.type === 'TRUCK' ? '🚛' : vehicle.type === 'BUS' ? '🚌' : vehicle.type === 'MOTORCYCLE' ? '🏍️' : '🚗';
  const arrow =
    status === VehicleStatus.MOVING
      ? `<div style="position:absolute;top:-10px;left:50%;transform:translateX(-50%) rotate(${heading}deg);transform-origin:bottom center;height:22px;width:2px;">
           <div style="width:0;height:0;border-left:4px solid transparent;border-right:4px solid transparent;border-bottom:7px solid ${color};position:absolute;top:0;left:-4px;"></div>
         </div>`
      : '';
  const html = `
    <div style="display:flex;flex-direction:column;align-items:center;pointer-events:none;user-select:none">
      <div style="position:relative;width:40px;height:40px;background:white;border-radius:50%;border:3px solid ${color};
        box-shadow:0 3px 10px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;">
        ${arrow}
        <span style="font-size:20px;line-height:1">${typeEmoji}</span>
      </div>
      <div style="margin-top:4px;background:rgba(10,10,10,0.82);color:white;border-radius:8px;padding:3px 8px;
        text-align:center;box-shadow:0 2px 6px rgba(0,0,0,0.4);white-space:nowrap;">
        <div style="font-size:11px;font-weight:800;letter-spacing:0.5px;display:flex;align-items:center;gap:5px;justify-content:center;">
          <span style="overflow:hidden;text-overflow:ellipsis;max-width:70px">${plate}</span>
          <span style="color:${speedColor}">${Math.round(speed)} km/h</span>
          <span style="color:#94a3b8;font-size:9px">${distKm.toFixed(1)}km</span>
        </div>
      </div>
    </div>`;
  return L.divIcon({ html, className: '', iconSize: [130, 90], iconAnchor: [65, 20] });
};

// Popup enrichi : géocodage live + heure début/fin
const StopPopupContent: React.FC<{
  stop: {
    location: Coordinate;
    startTime: Date;
    endTime: Date;
    duration: number;
    type: 'STOP' | 'IDLE';
    address?: string;
  };
  index: number;
}> = ({ stop, index }) => {
  const { t } = useTranslation();
  const [address, setAddress] = React.useState<string | null>(stop.address || null);
  const [loading, setLoading] = React.useState(!stop.address);

  React.useEffect(() => {
    if (stop.address || address) return;
    setLoading(true);
    fetch(`/api/fleet/geocode?lat=${stop.location.lat}&lng=${stop.location.lng}`, {
      credentials: 'include',
      headers: getHeaders(),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setAddress(data?.address || null))
      .catch(() => setAddress(null))
      .finally(() => setLoading(false));
  }, [stop.location.lat, stop.location.lng]);

  const fmt = (d: Date) => d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const color = stop.type === 'STOP' ? '#dc2626' : '#f97316';
  const emoji = stop.type === 'STOP' ? '🅿️' : '⏸️';
  const label = stop.type === 'STOP' ? t('map.view.engineStop') : t('map.view.idle');

  return (
    <div style={{ minWidth: 200, fontFamily: 'inherit' }}>
      <p style={{ fontWeight: 700, color, marginBottom: 6, fontSize: 13 }}>
        {emoji} {label} #{index + 1}
      </p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 4, fontSize: 12 }}>
        <span>
          🕐 <strong>{fmt(stop.startTime)}</strong>
        </span>
        <span>→</span>
        <span>
          <strong>{fmt(stop.endTime)}</strong>
        </span>
      </div>
      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>
        ⏱ {Math.floor(stop.duration)}min {Math.round((stop.duration % 1) * 60)}s
      </div>
      {loading ? (
        <div style={{ fontSize: 11, color: '#94a3b8' }}>📍 Géocodage…</div>
      ) : address ? (
        <div style={{ fontSize: 11, color: '#374151', lineHeight: 1.4 }}>📍 {address}</div>
      ) : (
        <div style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'monospace' }}>
          {stop.location.lat.toFixed(5)}, {stop.location.lng.toFixed(5)}
        </div>
      )}
    </div>
  );
};

const createClusterCustomIcon = (cluster: MarkerCluster) => {
  return L.divIcon({
    html: renderToStaticMarkup(
      <div
        style={{
          backgroundColor: '#3b82f6', // Blue-500
          color: 'white',
          width: '32px',
          height: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '50%',
          fontWeight: 'bold',
          fontSize: '14px',
          border: '2px solid white',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        }}
      >
        {cluster.getChildCount()}
      </div>
    ),
    className: 'custom-cluster-icon',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

// === MOBILE VEHICLE BOTTOM SHEET COMPONENT ===
type SheetState = 'collapsed' | 'half' | 'full';

interface MobileVehicleBottomSheetProps {
  vehicle: Vehicle;
  onClose: () => void;
  onReplay?: () => void;
}

const MobileVehicleBottomSheet: React.FC<MobileVehicleBottomSheetProps> = ({ vehicle, onClose, onReplay }) => {
  const [sheetState, setSheetState] = useState<SheetState>('collapsed');
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const startYRef = useRef(0);
  const currentHeightRef = useRef(0);

  const heights = { collapsed: 25, half: 50, full: 85 };

  const getHeightForState = (state: SheetState): number => heights[state];

  const handleDragStart = (clientY: number) => {
    setIsDragging(true);
    startYRef.current = clientY;
    currentHeightRef.current = getHeightForState(sheetState);
  };

  const handleDragMove = (clientY: number) => {
    if (!isDragging) return;
    const deltaY = startYRef.current - clientY;
    const deltaVh = (deltaY / window.innerHeight) * 100;
    setDragOffset(deltaVh);
  };

  const handleDragEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    const currentHeight = currentHeightRef.current + dragOffset;

    if (currentHeight < 15) {
      onClose();
    } else if (currentHeight < 35) {
      setSheetState('collapsed');
    } else if (currentHeight < 65) {
      setSheetState('half');
    } else {
      setSheetState('full');
    }

    setDragOffset(0);
  };

  const handleTouchStart = (e: React.TouchEvent) => handleDragStart(e.touches[0].clientY);
  const handleTouchMove = (e: React.TouchEvent) => handleDragMove(e.touches[0].clientY);
  const handleTouchEnd = () => handleDragEnd();

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => handleDragMove(e.clientY);
    const handleMouseUp = () => handleDragEnd();

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  const baseHeight = getHeightForState(sheetState);
  const currentHeight = Math.max(0, Math.min(90, baseHeight + dragOffset));

  return (
    <div
      className={`lg:hidden fixed inset-x-0 bottom-0 z-40 bg-[var(--bg-surface)] rounded-t-2xl shadow-2xl border-t border-[var(--border)] ${
        isDragging ? '' : 'transition-all duration-300 ease-out'
      }`}
      style={{
        height: `${currentHeight}vh`,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {/* Drag Handle */}
      <div
        className="flex flex-col items-center pt-3 pb-2 cursor-grab active:cursor-grabbing touch-none select-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={(e) => {
          e.preventDefault();
          handleDragStart(e.clientY);
        }}
      >
        <div className="w-12 h-1.5 bg-[var(--border)] bg-[var(--bg-elevated)] rounded-full" />
        <span className="text-xs text-[var(--text-muted)] mt-1">
          {sheetState === 'collapsed' ? 'Glisser vers le haut' : sheetState === 'full' ? 'Glisser vers le bas' : ''}
        </span>
      </div>

      {/* Content — overflow-y-auto so all VehicleDetailPanel blocks are reachable */}
      <div className="overflow-y-auto" style={{ height: 'calc(100% - 48px)' }}>
        <VehicleDetailPanel vehicle={vehicle} onClose={onClose} variant="sidebar" onReplay={onReplay} />
      </div>

      {/* State indicator dots */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 pb-safe">
        {(['collapsed', 'half', 'full'] as SheetState[]).map((state) => (
          <button
            key={state}
            onClick={() => setSheetState(state)}
            className={`w-2.5 h-2.5 rounded-full transition-colors ${
              sheetState === state ? 'bg-[var(--primary)]' : 'bg-[var(--border)]'
            }`}
            aria-label={state === 'collapsed' ? 'Réduit' : state === 'half' ? 'Mi-hauteur' : 'Plein écran'}
            title={state === 'collapsed' ? 'Réduit' : state === 'half' ? 'Mi-hauteur' : 'Plein écran'}
          />
        ))}
      </div>
    </div>
  );
};

interface MapViewProps {
  vehicles: Vehicle[];
  zones?: Zone[];
  focusedVehicle?: Vehicle | null;
  replayVehicle?: Vehicle | null; // New prop for Replay Mode
  onReplayClose?: () => void; // Notifie le parent que le replay a été fermé (pour reset replayVehicle)
  onNavigate?: (view: View, params?: Record<string, string>) => void;
  onReplay?: (vehicle: Vehicle) => void; // Callback passed down to DetailPanel
}

// Types pour le clustering et l'affichage
interface Cluster {
  id: string;
  x: number;
  y: number;
  count: number;
  vehicles: Vehicle[];
  isCluster: true;
  avgLat: number;
  avgLng: number;
  _screenX?: number;
  _screenY?: number;
}

type _RenderItem = (Vehicle & { _screenX?: number; _screenY?: number }) | Cluster;
type SidebarTab = 'vehicles' | 'places' | 'drivers';

// Component to update map view when focused vehicle changes
// Ne panne que si le véhicule sort de la zone centrale visible (80% de la vue)
const ReplayFollower: React.FC<{ progress: number; path: Coordinate[] }> = ({ progress, path }) => {
  const map = useMap();
  React.useEffect(() => {
    if (path.length === 0) return;
    const idx = Math.min(Math.floor((progress / 100) * (path.length - 1)), path.length - 1);
    const pos = path[idx];
    if (!pos) return;

    const bounds = map.getBounds();
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    // Marge de 20% sur chaque bord — si le véhicule est dans les 60% centraux, on ne bouge pas
    const latMargin = (ne.lat - sw.lat) * 0.2;
    const lngMargin = (ne.lng - sw.lng) * 0.2;

    const inView =
      pos.lat > sw.lat + latMargin &&
      pos.lat < ne.lat - latMargin &&
      pos.lng > sw.lng + lngMargin &&
      pos.lng < ne.lng - lngMargin;

    if (!inView) {
      map.panTo([pos.lat, pos.lng], { animate: true, duration: 0.5 });
    }
  }, [progress, path, map]);
  return null;
};

const MapUpdater: React.FC<{
  focusedVehicle: Vehicle | null;
  selectedVehicle: Vehicle | null;
  isReplayActive: boolean;
  focusPosition?: Coordinate | null;
  onFocusHandled?: () => void;
}> = ({ focusedVehicle, selectedVehicle, isReplayActive, focusPosition, onFocusHandled }) => {
  const map = useMap();

  // CRITICAL: Force map to recalculate size on mount and window resize
  // This fixes black screen in Capacitor WebView
  useEffect(() => {
    // Initial invalidateSize with delay for WebView
    const timer1 = setTimeout(() => map.invalidateSize(), 100);
    const timer2 = setTimeout(() => map.invalidateSize(), 500);
    const timer3 = setTimeout(() => map.invalidateSize(), 1000);

    // Handle resize events
    const handleResize = () => {
      setTimeout(() => map.invalidateSize(), 100);
    };
    window.addEventListener('resize', handleResize);

    // Handle visibility change (app coming to foreground)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        setTimeout(() => map.invalidateSize(), 100);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [map]);

  useEffect(() => {
    if (focusedVehicle && !isReplayActive) {
      map.flyTo([focusedVehicle.location.lat, focusedVehicle.location.lng], 15);
    } else if (selectedVehicle && !isReplayActive) {
      map.flyTo([selectedVehicle.location.lat, selectedVehicle.location.lng], 15);
    }
  }, [focusedVehicle, selectedVehicle, isReplayActive, map]);

  // Handle replay focus position (for stops/events)
  useEffect(() => {
    if (focusPosition && isReplayActive) {
      map.flyTo([focusPosition.lat, focusPosition.lng], 16);
      if (onFocusHandled) onFocusHandled();
    }
  }, [focusPosition, isReplayActive, map, onFocusHandled]);

  return null;
};

// Helper: validate GPS coordinate bounds
const isValidCoord = (lat: number, lng: number): boolean =>
  !isNaN(lat) && !isNaN(lng) && isFinite(lat) && isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;

// --- TILE LAYER CONFIG ---
const OSM_TILE_LAYERS = {
  standard: {
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    label: 'Standard',
    icon: '🗺️',
    overlay: null as string | null,
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution:
      'Tiles &copy; Esri &mdash; Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, GIS User Community',
    label: 'Satellite',
    icon: '🛰️',
    overlay: null as string | null,
  },
  hybrid: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution:
      'Tiles &copy; Esri &mdash; Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, GIS User Community',
    label: 'Hybride',
    icon: '🌐',
    overlay:
      'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
  },
  terrain: {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution:
      'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, SRTM | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)',
    label: 'Terrain',
    icon: '⛰️',
    overlay: null as string | null,
  },
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    label: 'Nuit',
    icon: '🌙',
    overlay: null as string | null,
  },
} as const;
type OsmLayer = keyof typeof OSM_TILE_LAYERS;

export const MapView: React.FC<MapViewProps> = ({
  vehicles,
  zones = [],
  focusedVehicle,
  replayVehicle,
  onReplayClose,
  onNavigate,
  onReplay,
}) => {
  const { t } = useTranslation();
  const { getVehicleHistory, clients, branches, isSocketConnected, isDataStale, isLoading } = useDataContext();
  const { showToast } = useToast();
  const { user } = useAuth();

  // Restrict vehicles for CLIENT / SOUS_COMPTE roles
  const isClientRole = user?.role?.toUpperCase() === 'CLIENT';
  const isSousCompte = user?.role?.toUpperCase() === 'SOUS_COMPTE';
  const accessibleVehicles = useMemo(() => {
    if (isClientRole && user?.clientId) {
      return vehicles.filter((v) => v.clientId === user.clientId);
    }
    if (isSousCompte) {
      if (user?.allVehicles) return vehicles;
      if (user?.vehicleIds?.length) return vehicles.filter((v) => user.vehicleIds!.includes(v.id));
      return [];
    }
    return vehicles;
  }, [vehicles, isClientRole, isSousCompte, user]);

  // --- API FLEET STATS ---
  const [fleetStats, setFleetStats] = useState<any>(null);

  useEffect(() => {
    const loadFleetStats = async () => {
      try {
        const response = await fetch('/api/fleet/stats', {
          credentials: 'include',
          headers: getHeaders(),
        });
        if (response.ok) {
          const stats = await response.json();
          setFleetStats(stats);
        }
      } catch (err) {
        console.warn('[MapView] Fleet stats unavailable:', err);
      }
    };
    loadFleetStats();
    const interval = setInterval(loadFleetStats, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  // --- ETATS GLOBAUX ---
  // Default to leaflet, only use google if API key is available
  const [mapProvider, setMapProvider] = useState<'leaflet' | 'google'>('leaflet');
  const [googleMapsKey, setGoogleMapsKey] = useState<string | null>(null);
  const [googleMapType, setGoogleMapType] = useState<'roadmap' | 'satellite' | 'terrain' | 'hybrid'>('roadmap');
  const [osmLayer, setOsmLayer] = useState<OsmLayer>('standard');
  const [showLayerPicker, setShowLayerPicker] = useState(false);

  // Fermer le picker de couches au clic en dehors
  useEffect(() => {
    if (!showLayerPicker) return;
    const handler = () => setShowLayerPicker(false);
    window.addEventListener('click', handler, { capture: true, once: true });
    return () => window.removeEventListener('click', handler, { capture: true });
  }, [showLayerPicker]);

  useEffect(() => {
    // Fetch Google Maps Key - use dedicated map-config route (no special permissions needed)
    fetch('/api/settings/map-config', {
      credentials: 'include',
      headers: getHeaders(),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch map config');
        return res.json();
      })
      .then((data) => {
        if (data.googleMapsApiKey) {
          setGoogleMapsKey(data.googleMapsApiKey);
          setMapProvider('google');
        } else {
          setMapProvider('leaflet');
        }
      })
      .catch((_err) => {
        setMapProvider('leaflet');
      });
  }, []);

  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  // When focusedVehicle arrives from Fleet (or elsewhere), open its detail panel
  useEffect(() => {
    if (focusedVehicle) {
      setSelectedVehicle(focusedVehicle);
    }
  }, [focusedVehicle]);

  const [searchText, setSearchText] = useState('');
  const [expandedClients, setExpandedClients] = useState<Record<string, boolean>>({});
  const [expandedBranches, setExpandedBranches] = useState<Record<string, boolean>>({});
  const [showAllVehicles, setShowAllVehicles] = useState(false);
  const [showZones, setShowZones] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showVehicleLabels, setShowVehicleLabels] = useState(true);
  const [activeTab, setActiveTab] = useState<SidebarTab>('vehicles');
  const [activeStatusFilter, setActiveStatusFilter] = useState<VehicleStatus | null>(null);

  // --- CONFIGURATION CARTE ---
  const [cardConfig, setCardConfig] = useState<VehicleCardConfig>(() => {
    const defaults: VehicleCardConfig = {
      showSpeed: true,
      showFuel: true,
      showIgnition: true,
      showDriver: true,
      showTime: true,
      showStatusText: true,
      displayNameOptions: ['name'],
    };
    try {
      const saved = localStorage.getItem('map_card_config');
      if (saved) return { ...defaults, ...JSON.parse(saved) };
    } catch {
      /* ignore parse error */
    }
    return defaults;
  });
  useEffect(() => {
    try {
      localStorage.setItem('map_card_config', JSON.stringify(cardConfig));
    } catch {
      /* ignore quota error */
    }
  }, [cardConfig]);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // --- FILTRES AVANCÉS ---
  const [filterClient, setFilterClient] = useState<string>('');
  const [filterBranch, setFilterBranch] = useState<string>('');
  const [showMobileMapFilter, setShowMobileMapFilter] = useState(false);
  const [filterDeviceModel, setFilterDeviceModel] = useState<string>('');
  const [filterVehicleType, setFilterVehicleType] = useState<string>('');
  const [filterContractStatus, setFilterContractStatus] = useState<string>('');

  // --- ETATS UI MAP ---
  const [sidebarWidth, setSidebarWidth] = useState(400);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isResizing, setIsResizing] = useState(false);
  const [isMobileVehicleListOpen, setIsMobileVehicleListOpen] = useState(false);

  // --- ETATS SELECTION ---
  const [selectedVehicleIds, setSelectedVehicleIds] = useState<Set<string>>(new Set());
  // TracePoint extends Coordinate with optional timestamp (ms) for gap detection
  const [quickTracePath, setQuickTracePath] = useState<(Coordinate & { t?: number })[]>([]);

  // --- ETATS REPLAY ---
  const [isReplayActive, setIsReplayActive] = useState(false);
  const [activeReplayVehicle, setActiveReplayVehicle] = useState<Vehicle | null>(null);
  const [replayPath, setReplayPath] = useState<Coordinate[]>([]);
  const [replayHistory, setReplayHistory] = useState<any[]>([]); // Store full history for charts
  const [replayProgress, setReplayProgress] = useState(0); // 0 to 100
  const [isPlaying, setIsPlaying] = useState(false);
  const replayAnimationRef = useRef<number | null>(null);
  const replayFetchAbortRef = useRef<AbortController | null>(null);

  // Grace delay 30s avant d'afficher la bannière de déconnexion
  // Évite d'alarmer le client pour des micro-coupures normales (WiFi, proxy timeout)
  const [showSocketBanner, setShowSocketBanner] = useState(false);
  const socketBannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (isSocketConnected) {
      if (socketBannerTimerRef.current) clearTimeout(socketBannerTimerRef.current);
      setShowSocketBanner(false);
    } else {
      socketBannerTimerRef.current = setTimeout(() => setShowSocketBanner(true), 30_000);
    }
    return () => {
      if (socketBannerTimerRef.current) clearTimeout(socketBannerTimerRef.current);
    };
  }, [isSocketConnected]);
  const nominatimDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [replayDateRange, setReplayDateRange] = useState(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(); // heure actuelle — la journée n'est pas terminée
    return { start, end };
  });

  // --- ETATS MARQUEURS REPLAY (arrêts et événements) ---
  const [replayStops, setReplayStops] = useState<StopEvent[]>([]);
  const [replaySpeedEvents, setReplaySpeedEvents] = useState<SpeedEvent[]>([]);
  const [highlightedStop, setHighlightedStop] = useState<string | null>(null);
  const [highlightedEvent, setHighlightedEvent] = useState<string | null>(null);
  const [mapFocusPosition, setMapFocusPosition] = useState<Coordinate | null>(null);
  // Sélection externe (clic sur marqueur → ouvrir onglet dans le panneau)
  const [externalStopSelect, setExternalStopSelect] = useState<{ stop: StopEvent; tab: 'STOPS' | 'IDLE' } | null>(null);
  const [externalEventSelect, setExternalEventSelect] = useState<SpeedEvent | null>(null);

  // Distance cumulée par index de replayPath (pour affichage sur le marqueur)
  const replayCumDist = useMemo(() => {
    if (replayPath.length === 0) return [] as number[];
    const R = 6371;
    const dists: number[] = [0];
    for (let i = 1; i < replayPath.length; i++) {
      const prev = replayPath[i - 1];
      const curr = replayPath[i];
      const dLat = ((curr.lat - prev.lat) * Math.PI) / 180;
      const dLng = ((curr.lng - prev.lng) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((prev.lat * Math.PI) / 180) * Math.cos((curr.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
      dists.push(dists[i - 1] + R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
    }
    return dists;
  }, [replayPath]);

  // --- SPRINT 1: TEMPS RÉEL & ALERTES ---
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isAutoRefreshEnabled, _setIsAutoRefreshEnabled] = useState(true);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [showAlertsPanel, setShowAlertsPanel] = useState(false);
  const _alertSoundRef = useRef<HTMLAudioElement | null>(null);

  // --- PRINT MAP ---
  useEffect(() => {
    const style = document.createElement('style');
    style.id = 'map-print-style';
    style.textContent = [
      '@media print {',
      '  body.print-map-only * { visibility: hidden; }',
      '  body.print-map-only .map-print-target,',
      '  body.print-map-only .map-print-target * { visibility: visible; }',
      '  body.print-map-only .map-print-target { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; }',
      '}',
    ].join('\n');
    if (!document.getElementById('map-print-style')) document.head.appendChild(style);
    return () => {
      document.getElementById('map-print-style')?.remove();
    };
  }, []);
  const handlePrintMap = () => {
    document.body.classList.add('print-map-only');
    window.print();
    setTimeout(() => document.body.classList.remove('print-map-only'), 500);
  };

  // --- SPRINT 3: GEOCODING & ADRESSES ---
  const [addressCache, setAddressCache] = useState<Record<string, string>>({});
  const [searchAddress, setSearchAddress] = useState('');
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);

  // Alertes temps réel calculées
  const liveAlerts = useMemo(() => {
    const alerts: {
      id: string;
      type: 'SPEED' | 'ZONE' | 'BATTERY' | 'FUEL';
      vehicle: Vehicle;
      message: string;
      severity: 'critical' | 'warning';
    }[] = [];

    vehicles.forEach((v) => {
      // Excès de vitesse (>120 km/h par défaut ou maxSpeed du véhicule)
      const maxSpeed = v.maxSpeed || 120;
      if (v.speed > maxSpeed) {
        alerts.push({
          id: `speed-${v.id}`,
          type: 'SPEED',
          vehicle: v,
          message: `${v.name} : ${v.speed} km/h (limite: ${maxSpeed})`,
          severity: v.speed > maxSpeed + 20 ? 'critical' : 'warning',
        });
      }

      // Batterie faible (<20%)
      const batteryVehicle = v as Vehicle & { battery?: number };
      if (batteryVehicle.battery !== undefined && batteryVehicle.battery < 20) {
        alerts.push({
          id: `battery-${v.id}`,
          type: 'BATTERY',
          vehicle: v,
          message: `${v.name} : Batterie ${batteryVehicle.battery}%`,
          severity: batteryVehicle.battery < 10 ? 'critical' : 'warning',
        });
      }

      // Carburant bas (<15%)
      if (v.fuelLevel !== undefined && v.fuelLevel < 15) {
        alerts.push({
          id: `fuel-${v.id}`,
          type: 'FUEL',
          vehicle: v,
          message: `${v.name} : Carburant ${v.fuelLevel}%`,
          severity: v.fuelLevel < 5 ? 'critical' : 'warning',
        });
      }
    });

    // Vérifier véhicules hors zone (si zones définies)
    if (zones.length > 0) {
      vehicles.forEach((v) => {
        const isInsideAnyZone = zones.some((zone) => {
          if (zone.type === 'CIRCLE' && zone.center && zone.radius) {
            const dist =
              Math.sqrt(
                Math.pow((v.location.lat - zone.center.lat) * 111, 2) +
                  Math.pow((v.location.lng - zone.center.lng) * 111 * Math.cos((v.location.lat * Math.PI) / 180), 2)
              ) * 1000; // en mètres
            return dist <= zone.radius;
          }
          return false;
        });

        // Si des zones sont définies et le véhicule n'est dans aucune
        if (!isInsideAnyZone && v.status === VehicleStatus.MOVING) {
          alerts.push({
            id: `zone-${v.id}`,
            type: 'ZONE',
            vehicle: v,
            message: `${v.name} : Hors zone autorisée`,
            severity: 'warning',
          });
        }
      });
    }

    return alerts;
  }, [vehicles, zones]);

  // Jouer son d'alerte si nouvelles alertes critiques
  useEffect(() => {
    if (isSoundEnabled && liveAlerts.some((a) => a.severity === 'critical')) {
      // Créer un son simple (beep)
      try {
        const audioContext = new (
          window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
        )();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
      } catch (e) {
        // Audio non supporté
      }
    }
  }, [liveAlerts.filter((a) => a.severity === 'critical').length, isSoundEnabled]);

  // Auto-refresh toutes les 30 secondes
  useEffect(() => {
    if (!isAutoRefreshEnabled || isReplayActive) return;

    const interval = setInterval(() => {
      setLastUpdate(new Date());
      // Le refresh des véhicules se fait via le DataContext parent
      // On met juste à jour l'indicateur de fraîcheur
    }, 30000);

    return () => clearInterval(interval);
  }, [isAutoRefreshEnabled, isReplayActive]);

  // --- SPRINT 2: KPIs DASHBOARD CARTE ---
  const mapKpis = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Compteurs par statut
    const moving = vehicles.filter((v) => v.status === VehicleStatus.MOVING).length;
    const idle = vehicles.filter((v) => v.status === VehicleStatus.IDLE).length;
    const stopped = vehicles.filter((v) => v.status === VehicleStatus.STOPPED).length;
    const offline = vehicles.filter((v) => v.status === VehicleStatus.OFFLINE).length;

    // % Flotte active (moving + idle)
    const activePercent = vehicles.length > 0 ? Math.round(((moving + idle) / vehicles.length) * 100) : 0;

    // Km parcourus aujourd'hui - utiliser donnée réelle de l'API si disponible
    const realKmToday = fleetStats?.totalKmToday || 0;
    const estimatedKmToday = realKmToday > 0 ? Math.round(realKmToday) : 0;

    // Temps arrêt moyen (estimation basée sur ratio stopped/total)
    const stoppedPercent = vehicles.length > 0 ? stopped / vehicles.length : 0;
    const avgStopMinutes = Math.round(stoppedPercent * 60 * 4); // 4h de référence

    // Véhicules hors zone
    const outOfZoneCount = liveAlerts.filter((a) => a.type === 'ZONE').length;

    // Alertes critiques
    const criticalAlerts = liveAlerts.filter((a) => a.severity === 'critical').length;

    return {
      total: vehicles.length,
      moving,
      idle,
      stopped,
      offline,
      activePercent,
      estimatedKmToday,
      avgStopMinutes,
      outOfZoneCount,
      criticalAlerts,
      totalAlerts: liveAlerts.length,
    };
  }, [vehicles, liveAlerts]);

  // --- SPRINT 3: GEOCODING ---
  const geocodeAddress = async (lat: number, lng: number): Promise<string> => {
    const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    if (addressCache[cacheKey]) return addressCache[cacheKey];

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lng=${lng}&zoom=18&addressdetails=1`,
        { headers: { 'Accept-Language': 'fr' } }
      );
      const data = await response.json();
      const address = data.display_name?.split(',').slice(0, 3).join(', ') || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      setAddressCache((prev) => {
        const entries = Object.entries(prev);
        const trimmed = entries.length >= 200 ? Object.fromEntries(entries.slice(-199)) : prev;
        return { ...trimmed, [cacheKey]: address };
      });
      return address;
    } catch {
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
  };

  const searchAddressLocation = async () => {
    if (!searchAddress.trim() || isSearchingAddress) return;
    // Debounce: ignore if a request was triggered in the last 1 second
    if (nominatimDebounceRef.current) return;
    nominatimDebounceRef.current = setTimeout(() => {
      nominatimDebounceRef.current = null;
    }, 1000);
    setIsSearchingAddress(true);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchAddress)}&limit=1`,
        { headers: { 'Accept-Language': 'fr' } }
      );
      const data = await response.json();
      if (data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        if (!isValidCoord(lat, lng)) {
          showToast('Coordonnées invalides reçues pour cette adresse', 'error');
        } else {
          setMapFocusPosition({ lat, lng });
          setSearchAddress('');
        }
      } else {
        showToast(t('map.view.addressNotFound'), 'info');
      }
    } catch {
      showToast("Erreur lors de la recherche d'adresse", 'error');
    } finally {
      setIsSearchingAddress(false);
    }
  };

  // Formater le temps depuis dernière mise à jour
  const getTimeSinceUpdate = () => {
    const seconds = Math.floor((new Date().getTime() - lastUpdate.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s`;
    return `${Math.floor(seconds / 60)}min`;
  };

  // Véhicules filtrés pour la LISTE (sidebar) - sans la contrainte showAllVehicles
  const listFilteredVehicles = useMemo(() => {
    return accessibleVehicles.filter((v) => {
      // Filtre par statut (cliquable dans la barre de stats)
      if (activeStatusFilter && v.status !== activeStatusFilter) return false;

      // Filtre par client
      if (filterClient) {
        const client = clients.find((c) => c.id === v.client);
        const clientName = client?.name?.toLowerCase() || v.client?.toLowerCase() || '';
        if (!clientName.includes(filterClient.toLowerCase())) return false;
      }

      // Filtre par branche
      if (filterBranch && v.branchId !== filterBranch) return false;

      // Filtre par modèle de boîtier
      if (filterDeviceModel && v.deviceModel !== filterDeviceModel) return false;

      // Filtre par type d'engin
      if (filterVehicleType && v.type !== filterVehicleType) return false;

      // Filtre par statut paiement du client
      if (filterContractStatus) {
        const client = clients.find((c) => c.id === v.client);
        const paymentStatus = client?.paymentStatus;
        if (filterContractStatus === 'UP_TO_DATE' && paymentStatus !== 'UP_TO_DATE') return false;
        if (filterContractStatus === 'OVERDUE' && paymentStatus !== 'OVERDUE') return false;
      }

      return true;
    });
  }, [
    accessibleVehicles,
    activeStatusFilter,
    filterClient,
    filterBranch,
    filterDeviceModel,
    filterVehicleType,
    filterContractStatus,
    clients,
    branches,
  ]);

  // Véhicules filtrés pour la CARTE (avec showAllVehicles)
  const uniqueMapClients = useMemo(
    () => Array.from(new Set(accessibleVehicles.map((v) => v.client).filter(Boolean))).sort() as string[],
    [accessibleVehicles]
  );

  const uniqueMapBranches = useMemo(
    () => branches.filter((b) => accessibleVehicles.some((v) => v.branchId === b.id)),
    [accessibleVehicles, branches]
  );

  const filteredVehicles = useMemo(() => {
    return listFilteredVehicles.filter((v) => {
      const isSelected = selectedVehicleIds.has(v.id) || selectedVehicle?.id === v.id;
      if (!showAllVehicles && !isSelected) return false;
      return true;
    });
  }, [listFilteredVehicles, selectedVehicleIds, selectedVehicle, showAllVehicles]);

  // --- QUICK TRACE EFFECT ---
  useEffect(() => {
    const loadQuickTrace = async () => {
      if (selectedVehicle && !isReplayActive) {
        try {
          // Appeler API history réelle au lieu de generatePath mockée
          const today = new Date().toISOString().split('T')[0];
          const response = await fetch(`/api/fleet/vehicles/${selectedVehicle.id}/history/snapped?date=${today}`, {
            credentials: 'include',
            headers: getHeaders(),
          });
          if (response.ok) {
            const history = await response.json();
            // Prendre TOUT le trajet de la journée pour quick trace
            const recentPath = history.map(
              (point: {
                lat?: number;
                latitude?: number;
                lng?: number;
                longitude?: number;
                time?: string | number;
              }) => ({
                lat: point.lat || point.latitude,
                lng: point.lng || point.longitude,
                t: point.time ? new Date(point.time).getTime() : undefined,
              })
            );
            setQuickTracePath(recentPath.length > 0 ? recentPath : [selectedVehicle.location]);
          } else {
            // Fallback: juste position actuelle
            setQuickTracePath([selectedVehicle.location]);
          }
        } catch (err) {
          setQuickTracePath([selectedVehicle.location]);
        }
      } else {
        setQuickTracePath([]);
      }
    };
    loadQuickTrace();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVehicle?.id, isReplayActive]); // Reload only when vehicle changes, not on position update

  // --- LIVE SYNC: sync selectedVehicle data + append new GPS to quick trace ---
  useEffect(() => {
    if (!selectedVehicle || isReplayActive) return;
    const updated = vehicles.find((v) => v.id === selectedVehicle.id);
    if (!updated) return;
    const posChanged =
      updated.location?.lat !== selectedVehicle.location?.lat ||
      updated.location?.lng !== selectedVehicle.location?.lng;
    if (posChanged || updated.speed !== selectedVehicle.speed || updated.status !== selectedVehicle.status) {
      setSelectedVehicle(updated);
    }
    if (posChanged && updated.location?.lat && updated.location?.lng) {
      setQuickTracePath((prev) => {
        if (prev.length === 0) return prev;
        const last = prev[prev.length - 1];
        if (last.lat === updated.location.lat && last.lng === updated.location.lng) return prev;
        return [...prev, { ...updated.location, t: Date.now() }];
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicles]);

  // --- GESTION REPLAY MODE ---
  useEffect(() => {
    if (replayVehicle) {
      setActiveReplayVehicle(replayVehicle);
      setIsReplayActive(true);
      setIsPlaying(false); // forcer la pause immédiatement, pas d'auto-play
      setReplayProgress(0);
      setIsSidebarOpen(false);
      setSelectedVehicle(null);
    }
  }, [replayVehicle]);

  useEffect(() => {
    // Abort any in-flight request from a previous effect run
    if (replayFetchAbortRef.current) {
      replayFetchAbortRef.current.abort();
    }
    const abortController = new AbortController();
    replayFetchAbortRef.current = abortController;

    const loadReplayData = async () => {
      if (activeReplayVehicle && isReplayActive) {
        try {
          // Utiliser le même endpoint que VehicleDetailPanel → /objects/{id}/history/snapped
          // Source unique garantie : mêmes données, mêmes stats
          const rawHistory = await getVehicleHistory(activeReplayVehicle.id, replayDateRange.start);
          if (rawHistory && rawHistory.length > 0) {
            // Normaliser : l'API renvoie { lat, lng, time } — ajouter location + timestamp
            // pour que le rendu Polyline (p.location?.lat) et les marqueurs fonctionnent
            const normalized = rawHistory.map((h: any) => ({
              ...h,
              location: h.location || { lat: h.lat || h.latitude, lng: h.lng || h.longitude },
              timestamp: h.timestamp || h.time,
            }));
            setReplayPath(normalized.map((h: any) => h.location));
            setReplayHistory(normalized);
          } else {
            setReplayPath([]);
            setReplayHistory([]);
          }
        } catch (err: any) {
          if (err?.name !== 'AbortError') {
            setReplayPath([]);
            setReplayHistory([]);
          }
        }
      }
    };

    loadReplayData();
    return () => {
      abortController.abort();
    };
  }, [activeReplayVehicle, isReplayActive, replayDateRange, getVehicleHistory]);

  // --- HEATMAP DATA ---
  const [heatmapPoints, setHeatmapPoints] = useState<[number, number, number][]>([]);

  useEffect(() => {
    if (!showHeatmap) {
      setHeatmapPoints([]);
      return;
    }

    // Load heatmap data from vehicle history (last 7 days)
    const loadHeatmapData = async () => {
      try {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);

        // Aggregate all vehicle positions
        const allPoints: { lat: number; lng: number; count: number }[] = [];

        // Use current vehicle positions as base
        vehicles.forEach((vehicle) => {
          if (vehicle.location) {
            allPoints.push({
              lat: vehicle.location.lat,
              lng: vehicle.location.lng,
              count: 1,
            });
          }
        });

        // Convert to heatmap format [lat, lng, intensity]
        const heatPoints: [number, number, number][] = allPoints.map((p) => [p.lat, p.lng, p.count]);

        setHeatmapPoints(heatPoints);
      } catch (error) {
        // Heatmap data load error - non-critical
      }
    };

    loadHeatmapData();
  }, [showHeatmap, vehicles]);

  // --- REPLAY LOOP ---
  useEffect(() => {
    // Always cancel any running frame before starting a new loop
    if (replayAnimationRef.current) {
      cancelAnimationFrame(replayAnimationRef.current);
      replayAnimationRef.current = null;
    }

    if (isReplayActive && isPlaying) {
      let lastTime = performance.now();
      const animate = (time: number) => {
        const delta = time - lastTime;
        // Base : 300ms par tick à 1× → journée complète en ~60s
        // 2× = 30s, 5× = 12s, 10× = 6s, 20× = 3s
        if (delta > 300 / playbackSpeed) {
          setReplayProgress((prev) => {
            if (prev >= 100) {
              setIsPlaying(false);
              return 100;
            }
            return prev + 0.5;
          });
          lastTime = time;
        }
        replayAnimationRef.current = requestAnimationFrame(animate);
      };
      replayAnimationRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (replayAnimationRef.current) {
        cancelAnimationFrame(replayAnimationRef.current);
        replayAnimationRef.current = null;
      }
    };
  }, [isReplayActive, isPlaying, playbackSpeed]);

  // Reset advanced filters when switching away from vehicles tab
  useEffect(() => {
    if (activeTab !== 'vehicles') {
      setFilterClient('');
      setFilterDeviceModel('');
      setFilterVehicleType('');
      setFilterContractStatus('');
      setIsFilterOpen(false);
    }
  }, [activeTab]);

  // Initialiser les clients comme étendus par défaut
  useEffect(() => {
    const uniqueClients: string[] = Array.from(new Set(vehicles.map((v: Vehicle) => v.client)));
    const initialExpanded = uniqueClients.reduce(
      (acc, client: string) => {
        acc[client] = false; // Collapsed by default
        return acc;
      },
      {} as Record<string, boolean>
    );
    setExpandedClients(initialExpanded);
  }, [vehicles]);

  const toggleBranch = (branchId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedBranches((prev) => ({ ...prev, [branchId]: !prev[branchId] }));
  };

  // --- GESTION REDIMENSIONNEMENT SIDEBAR ---
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = Math.max(300, Math.min(e.clientX, 600));
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = 'default';
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const toggleClient = (clientName: string) => {
    setExpandedClients((prev) => ({ ...prev, [clientName]: !prev[clientName] }));
  };

  // --- GESTION SELECTION ---
  const toggleSelection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSet = new Set(selectedVehicleIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedVehicleIds(newSet);
  };

  // Fonction utilitaire pour obtenir les véhicules visibles dans la liste
  const getVisibleVehiclesInList = () => {
    if (activeTab !== 'vehicles') return [];
    return vehicles.filter((v) => {
      const matchesSearch =
        searchText === '' ||
        v.name.toLowerCase().includes(searchText.toLowerCase()) ||
        v.id.toLowerCase().includes(searchText.toLowerCase()) ||
        v.client.toLowerCase().includes(searchText.toLowerCase());

      const matchesStatus = activeStatusFilter === null || v.status === activeStatusFilter;

      return matchesSearch && matchesStatus;
    });
  };

  const handleSelectAll = () => {
    const visibleVehicles = getVisibleVehiclesInList();
    const allVisibleSelected = visibleVehicles.length > 0 && visibleVehicles.every((v) => selectedVehicleIds.has(v.id));
    const newSet = new Set(selectedVehicleIds);

    if (allVisibleSelected) {
      visibleVehicles.forEach((v) => newSet.delete(v.id));
    } else {
      visibleVehicles.forEach((v) => newSet.add(v.id));
    }
    setSelectedVehicleIds(newSet);
  };

  const isAllVisibleSelected = () => {
    const visibleVehicles = getVisibleVehiclesInList();
    return visibleVehicles.length > 0 && visibleVehicles.every((v) => selectedVehicleIds.has(v.id));
  };

  const handleStatusFilterClick = (status: VehicleStatus | null) => {
    if (status === null) {
      setActiveStatusFilter(null);
    } else {
      setActiveStatusFilter((prev) => (prev === status ? null : status));
    }
  };

  const focusOnVehicle = (v: Vehicle) => {
    setSelectedVehicle(v);
  };

  const focusOnZone = (z: Zone) => {
    // Logic to focus on zone (requires map ref or similar, handled by MapUpdater if we pass zone)
  };

  const handleAddVehicleClick = () => {
    if (onNavigate) {
      onNavigate(View.FLEET, { action: 'create_vehicle' });
    }
  };

  const handleCreateGeofenceClick = () => {
    if (onNavigate) {
      onNavigate(View.SETTINGS, { tab: 'geofence' });
    }
  };

  // --- STATS MINI DASHBOARD ---
  const stats = useMemo(() => {
    const s = { total: vehicles.length, moving: 0, idle: 0, stopped: 0, offline: 0 };
    vehicles.forEach((v) => {
      if (v.status === VehicleStatus.MOVING) s.moving++;
      else if (v.status === VehicleStatus.IDLE) s.idle++;
      else if (v.status === VehicleStatus.STOPPED) s.stopped++;
      else if (v.status === VehicleStatus.OFFLINE) s.offline++;
    });
    return s;
  }, [vehicles]);

  // --- DONNÉES GROUPÉES (LISTE) ---
  const groupedData = useMemo((): Record<string, any> => {
    // Use Clients from vehicles for Vehicle Tab, but for Zones we group by category
    const groups: Record<string, any> = {};

    if (activeTab === 'vehicles') {
      // Appliquer la recherche sur les véhicules filtrés pour la liste (pas pour la carte)
      const filtered = listFilteredVehicles.filter((v) => {
        if (searchText === '') return true;

        const search = searchText.toLowerCase();

        // Recherche dynamique dans tous les champs pertinents
        const client = clients.find((c) => c.id === v.client);
        const branch = branches.find((b) => b.id === v.branchId);

        const searchableFields = [
          v.name, // Nom du véhicule
          v.plate, // Plaque
          v.licensePlate, // Plaque (alias)
          v.wwPlate, // Plaque WW
          v.imei, // IMEI du boîtier
          v.sim, // Numéro SIM
          v.driver, // Chauffeur
          v.vin, // Numéro VIN
          v.brand, // Marque
          v.model, // Modèle
          v.deviceModel, // Modèle du tracker
          v.group, // Groupe
          client?.name, // Nom du client / société
          branch?.name, // Nom de la branche
        ].filter(Boolean);

        const matchesSearch = searchableFields.some((field) => field!.toLowerCase().includes(search));
        return matchesSearch;
      });

      filtered.forEach((v) => {
        const clientId = v.client;
        if (!groups[clientId]) {
          const client = clients.find((c) => c.id === clientId);
          groups[clientId] = {
            id: clientId,
            client: client,
            name: client ? client.name : clientId,
            branches: {},
            directVehicles: [],
            totalCount: 0,
            isClientGroup: true,
          };
        }

        groups[clientId].totalCount++;

        if (v.branchId) {
          const branchId = v.branchId;
          if (!groups[clientId].branches[branchId]) {
            const branch = branches.find((b) => b.id === branchId);
            groups[clientId].branches[branchId] = {
              id: branchId,
              branch: branch,
              name: branch ? branch.name : branchId,
              vehicles: [],
            };
          }
          groups[clientId].branches[branchId].vehicles.push(v);
        } else {
          groups[clientId].directVehicles.push(v);
        }
      });
    } else if (activeTab === 'places') {
      // Group zones by category
      zones.forEach((z: Zone) => {
        if (z.name.toLowerCase().includes(searchText.toLowerCase()) || searchText === '') {
          if (!groups[z.category]) groups[z.category] = [];
          groups[z.category].push(z);
        }
      });
    } else if (activeTab === 'drivers') {
      const uniqueClients: string[] = (Array.from(new Set(vehicles.map((v: Vehicle) => v.client))) as string[]).sort();
      uniqueClients.forEach((c) => (groups[c] = []));

      const filteredDriversVehicles = vehicles.filter((v) => {
        if (searchText === '') return true;
        const search = searchText.toLowerCase();
        const client = clients.find((c) => c.id === v.client);
        return (
          v.driver?.toLowerCase().includes(search) ||
          v.name?.toLowerCase().includes(search) ||
          client?.name?.toLowerCase().includes(search) ||
          client?.name?.toLowerCase().includes(search)
        );
      });
      filteredDriversVehicles.forEach((v) => {
        if (groups[v.client]) {
          groups[v.client].push({
            id: `DRV-${v.id}`,
            name: v.driver,
            currentVehicle: v.name,
            score: v.driverScore,
            status: 'Actif',
          });
        }
      });
    }
    return groups;
  }, [vehicles, zones, searchText, activeTab, clients, branches, listFilteredVehicles]);

  // Format Time Helper for Replay
  const getReplayTime = () => {
    if (replayHistory.length > 0) {
      const idx = Math.min(Math.floor((replayProgress / 100) * (replayHistory.length - 1)), replayHistory.length - 1);
      const point = replayHistory[idx];
      if (point) {
        const t = new Date(point.timestamp || point.time);
        return t.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      }
    }
    const totalMinutes = 24 * 60;
    const currentMinute = Math.floor((replayProgress / 100) * totalMinutes);
    const h = Math.floor(currentMinute / 60);
    const m = currentMinute % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  const CENTER_LAT = 5.36; // Abidjan, CI
  const CENTER_LNG = -4.0083;

  return (
    <div className="flex h-full w-full absolute inset-0 lg:relative overflow-hidden bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg select-none">
      {/* ── Socket connectivity banner — staff uniquement (invisible pour les clients) ── */}
      {showSocketBanner &&
        ['SUPER_ADMIN', 'SUPERADMIN', 'ADMIN', 'MANAGER', 'TECH', 'SUPPORT_AGENT'].includes(user?.role ?? '') && (
          <div
            className={`absolute lg:top-2 bottom-24 lg:bottom-auto left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium shadow-lg pointer-events-none transition-opacity duration-500
          ${isDataStale ? 'bg-slate-600 text-white' : 'bg-slate-500/90 text-white'}`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-white/70 animate-pulse" />
            {isDataStale ? 'Actualisation suspendue — synchronisation en cours…' : 'Synchronisation…'}
          </div>
        )}

      {/* Sidebar Gauche (HIDDEN IN REPLAY AND ON MOBILE) */}
      {isSidebarOpen && !isReplayActive && (
        <div
          style={{ width: sidebarWidth }}
          className="hidden lg:flex bg-[var(--bg-elevated)] border-r border-[var(--border)] flex-col z-10 shadow-lg shrink-0 relative transition-all duration-75 ease-linear"
        >
          {/* ... Sidebar Content ... */}
          <div className="grid grid-cols-5 gap-0 p-3 bg-slate-900 text-white text-center shrink-0 h-20 items-center select-none">
            {/* ... Stats ... */}
            <div
              onClick={() => handleStatusFilterClick(null)}
              className={`flex flex-col items-center justify-center h-full border-r border-slate-700/50 last:border-0 px-1 cursor-pointer transition-colors ${activeStatusFilter === null ? 'bg-white/10 rounded-md shadow-inner' : 'hover:bg-white/5'}`}
            >
              <span className="font-bold text-xl leading-none">{stats.total}</span>
              <span className="text-[8px] uppercase text-[var(--text-muted)] mt-1 truncate w-full">
                {t('map.view.totalLabel')}
              </span>
            </div>
            <div
              onClick={() => handleStatusFilterClick(VehicleStatus.MOVING)}
              className={`flex flex-col items-center justify-center h-full border-r border-slate-700/50 last:border-0 text-green-400 px-1 cursor-pointer transition-colors ${activeStatusFilter === VehicleStatus.MOVING ? 'bg-white/10 rounded-md shadow-inner' : 'hover:bg-white/5'}`}
            >
              <span className="font-bold text-xl leading-none">{stats.moving}</span>
              <span className="text-[8px] uppercase text-green-400/70 mt-1 truncate w-full">
                {t('map.view.statRoute')}
              </span>
            </div>
            <div
              onClick={() => handleStatusFilterClick(VehicleStatus.IDLE)}
              className={`flex flex-col items-center justify-center h-full border-r border-slate-700/50 last:border-0 text-orange-400 px-1 cursor-pointer transition-colors ${activeStatusFilter === VehicleStatus.IDLE ? 'bg-white/10 rounded-md shadow-inner' : 'hover:bg-white/5'}`}
            >
              <span className="font-bold text-xl leading-none">{stats.idle}</span>
              <span className="text-[8px] uppercase text-orange-400/70 mt-1 truncate w-full">{t('map.view.idle')}</span>
            </div>
            <div
              onClick={() => handleStatusFilterClick(VehicleStatus.STOPPED)}
              className={`flex flex-col items-center justify-center h-full border-r border-slate-700/50 last:border-0 text-red-400 px-1 cursor-pointer transition-colors ${activeStatusFilter === VehicleStatus.STOPPED ? 'bg-white/10 rounded-md shadow-inner' : 'hover:bg-white/5'}`}
            >
              <span className="font-bold text-xl leading-none">{stats.stopped}</span>
              <span className="text-[8px] uppercase text-red-400/70 mt-1 truncate w-full">
                {t('map.view.statStop')}
              </span>
            </div>
            <div
              onClick={() => handleStatusFilterClick(VehicleStatus.OFFLINE)}
              className={`flex flex-col items-center justify-center h-full text-[var(--text-muted)] px-1 cursor-pointer transition-colors ${activeStatusFilter === VehicleStatus.OFFLINE ? 'bg-white/10 rounded-md shadow-inner' : 'hover:bg-white/5'}`}
            >
              <span className="font-bold text-xl leading-none">{stats.offline}</span>
              <span className="text-[8px] uppercase text-[var(--text-secondary)] mt-1 truncate w-full">
                {t('map.vehicleCard.offline')}
              </span>
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex items-center justify-between px-4 py-2 bg-[var(--bg-elevated)] border-b border-[var(--border)] border-[var(--border)]">
            <div className="flex gap-2">
              <button
                onClick={handleAddVehicleClick}
                title={t('map.view.addVehicle')}
                className="p-2.5 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg hover:bg-[var(--primary-dim)] hover:bg-[var(--bg-elevated)] hover:text-[var(--primary)] transition-colors shadow-sm text-[var(--text-secondary)]"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                onClick={handleCreateGeofenceClick}
                title="Créer une geofence"
                className="p-2.5 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg hover:bg-[var(--primary-dim)] hover:bg-[var(--bg-elevated)] hover:text-[var(--primary)] transition-colors shadow-sm text-[var(--text-secondary)]"
              >
                <Hexagon className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setIsConfigOpen(!isConfigOpen)}
                title="Configurer l'affichage"
                className={`p-2 border border-[var(--border)] rounded hover:bg-[var(--bg-elevated)] transition-colors shadow-sm ${isConfigOpen ? 'bg-[var(--primary-dim)] text-[var(--primary)] border-[var(--border)]' : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)]'}`}
              >
                <Settings2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                title={t('map.view.advancedFilters')}
                className={`p-2 border border-[var(--border)] rounded hover:bg-[var(--bg-elevated)] transition-colors shadow-sm relative ${isFilterOpen ? 'bg-[var(--primary-dim)] text-[var(--primary)] border-[var(--border)]' : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)]'}`}
              >
                <Filter className="w-4 h-4" />
                {(filterClient || filterBranch || filterDeviceModel || filterVehicleType || filterContractStatus) && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-[var(--primary-dim)]0 rounded-full"></span>
                )}
              </button>
            </div>
          </div>

          {/* Config Panel */}
          {isConfigOpen && (
            <div className="p-3 bg-[var(--bg-elevated)] border-b border-[var(--border)] animate-in slide-in-from-top-2">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-xs font-bold uppercase text-[var(--text-secondary)]">Affichage Carte</h4>
                <button onClick={() => setIsConfigOpen(false)} aria-label="Fermer la configuration" title="Fermer">
                  <X className="w-3 h-3 text-[var(--text-muted)] hover:text-[var(--text-secondary)]" />
                </button>
              </div>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 text-xs text-[var(--text-primary)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cardConfig.showSpeed}
                    onChange={(e) => setCardConfig({ ...cardConfig, showSpeed: e.target.checked })}
                    className="rounded text-[var(--primary)] focus:ring-[var(--primary)]"
                  />
                  {t('map.view.speed')}
                </label>
                <label className="flex items-center gap-2 text-xs text-[var(--text-primary)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cardConfig.showFuel}
                    onChange={(e) => setCardConfig({ ...cardConfig, showFuel: e.target.checked })}
                    className="rounded text-[var(--primary)] focus:ring-[var(--primary)]"
                  />
                  {t('map.view.fuel')}
                </label>
                <label className="flex items-center gap-2 text-xs text-[var(--text-primary)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cardConfig.showIgnition}
                    onChange={(e) => setCardConfig({ ...cardConfig, showIgnition: e.target.checked })}
                    className="rounded text-[var(--primary)] focus:ring-[var(--primary)]"
                  />
                  {t('map.view.ignition')}
                </label>
                <label className="flex items-center gap-2 text-xs text-[var(--text-primary)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cardConfig.showDriver}
                    onChange={(e) => setCardConfig({ ...cardConfig, showDriver: e.target.checked })}
                    className="rounded text-[var(--primary)] focus:ring-[var(--primary)]"
                  />
                  {t('map.view.driver')}
                </label>
                <label className="flex items-center gap-2 text-xs text-[var(--text-primary)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cardConfig.showTime}
                    onChange={(e) => setCardConfig({ ...cardConfig, showTime: e.target.checked })}
                    className="rounded text-[var(--primary)] focus:ring-[var(--primary)]"
                  />
                  {t('map.view.time')}
                </label>
                <label className="flex items-center gap-2 text-xs text-[var(--text-primary)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cardConfig.showStatusText}
                    onChange={(e) => setCardConfig({ ...cardConfig, showStatusText: e.target.checked })}
                    className="rounded text-[var(--primary)] focus:ring-[var(--primary)]"
                  />
                  {t('map.view.statusText')}
                </label>

                <div className="mt-2 border-t border-[var(--border)] pt-2">
                  <h5 className="text-[10px] font-bold uppercase text-[var(--text-secondary)] mb-1">
                    Affichage Nom (Max 2)
                  </h5>
                  <div className="flex flex-col gap-1">
                    {['name', 'plate', 'wwPlate', 'vin'].map((opt) => (
                      <label
                        key={opt}
                        className="flex items-center gap-2 text-xs text-[var(--text-primary)] cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={cardConfig.displayNameOptions?.includes(opt as 'name' | 'plate' | 'wwPlate' | 'vin')}
                          onChange={(e) => {
                            const current = cardConfig.displayNameOptions || [];
                            let newOpts = [...current];
                            if (e.target.checked) {
                              if (newOpts.length < 2) newOpts.push(opt as 'name' | 'plate' | 'wwPlate' | 'vin');
                            } else {
                              newOpts = newOpts.filter((o) => o !== opt);
                            }
                            setCardConfig({ ...cardConfig, displayNameOptions: newOpts });
                          }}
                          className="rounded text-[var(--primary)] focus:ring-[var(--primary)]"
                        />
                        {opt === 'name' ? 'Nom' : opt === 'plate' ? 'Plaque' : opt === 'wwPlate' ? 'WW' : 'VIN'}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Filter Panel */}
          {isFilterOpen && (
            <div className="p-3 bg-[var(--bg-elevated)] border-b border-[var(--border)] animate-in slide-in-from-top-2">
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-xs font-bold uppercase text-[var(--text-secondary)]">
                  {t('map.view.advancedFiltersUpper')}
                </h4>
                <div className="flex items-center gap-2">
                  {(filterClient || filterBranch || filterDeviceModel || filterVehicleType || filterContractStatus) && (
                    <button
                      onClick={() => {
                        setFilterClient('');
                        setFilterBranch('');
                        setFilterDeviceModel('');
                        setFilterVehicleType('');
                        setFilterContractStatus('');
                      }}
                      className="text-[10px] text-red-500 hover:text-red-600 font-medium"
                    >
                      Réinitialiser
                    </button>
                  )}
                  <button onClick={() => setIsFilterOpen(false)} aria-label="Fermer les filtres" title="Fermer">
                    <X className="w-3 h-3 text-[var(--text-muted)] hover:text-[var(--text-secondary)]" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {!isClientRole && !isSousCompte && (
                  <div>
                    <label className="text-[10px] font-bold uppercase text-[var(--text-secondary)] mb-1 block">
                      Client
                    </label>
                    <select
                      value={filterClient}
                      onChange={(e) => setFilterClient(e.target.value)}
                      className="w-full text-xs border border-[var(--border)] rounded-lg px-3 py-2 bg-[var(--bg-elevated)] text-[var(--text-primary)]"
                    >
                      <option value="">Tous les clients</option>
                      {Array.from(new Set(accessibleVehicles.map((v) => v.client)))
                        .sort()
                        .map((clientId) => {
                          const client = clients.find((c) => c.id === clientId);
                          return (
                            <option key={clientId} value={client?.name || clientId}>
                              {client?.name || clientId}
                            </option>
                          );
                        })}
                    </select>
                  </div>
                )}
                {uniqueMapBranches.length > 0 && (
                  <div>
                    <label className="text-[10px] font-bold uppercase text-[var(--text-secondary)] mb-1 block">
                      Branche
                    </label>
                    <select
                      value={filterBranch}
                      onChange={(e) => setFilterBranch(e.target.value)}
                      className="w-full text-xs border border-[var(--border)] rounded-lg px-3 py-2 bg-[var(--bg-elevated)] text-[var(--text-primary)]"
                    >
                      <option value="">Toutes les branches</option>
                      {uniqueMapBranches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="text-[10px] font-bold uppercase text-[var(--text-secondary)] mb-1 block">
                    Modèle Boîtier
                  </label>
                  <select
                    value={filterDeviceModel}
                    onChange={(e) => setFilterDeviceModel(e.target.value)}
                    className="w-full text-xs border border-[var(--border)] rounded-lg px-3 py-2 bg-[var(--bg-elevated)] text-[var(--text-primary)]"
                  >
                    <option value="">Tous les modèles</option>
                    {Array.from(new Set(vehicles.map((v) => v.deviceModel).filter(Boolean)))
                      .sort()
                      .map((model) => (
                        <option key={model} value={model}>
                          {model}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-[var(--text-secondary)] mb-1 block">
                    Type d'Engin
                  </label>
                  <select
                    value={filterVehicleType}
                    onChange={(e) => setFilterVehicleType(e.target.value)}
                    className="w-full text-xs border border-[var(--border)] rounded-lg px-3 py-2 bg-[var(--bg-elevated)] text-[var(--text-primary)]"
                  >
                    <option value="">Tous les types</option>
                    <option value="CAR">Voiture</option>
                    <option value="TRUCK">Camion</option>
                    <option value="MOTORCYCLE">Moto</option>
                    <option value="VAN">Fourgon</option>
                    <option value="BUS">Bus</option>
                    <option value="CONSTRUCTION">Engin BTP</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-[var(--text-secondary)] mb-1 block">
                    Statut Paiement
                  </label>
                  <select
                    value={filterContractStatus}
                    onChange={(e) => setFilterContractStatus(e.target.value)}
                    className="w-full text-xs border border-[var(--border)] rounded-lg px-3 py-2 bg-[var(--bg-elevated)] text-[var(--text-primary)]"
                  >
                    <option value="">Tous</option>
                    <option value="UP_TO_DATE">À jour</option>
                    <option value="OVERDUE">Impayé</option>
                  </select>
                </div>
              </div>
              <div className="mt-2 text-[10px] text-[var(--text-muted)]">
                {t(
                  filteredVehicles.length === 1 ? 'map.view.vehicleCountMatch_one' : 'map.view.vehicleCountMatch_other',
                  { count: filteredVehicles.length }
                )}
              </div>
            </div>
          )}

          {/* Search Bar */}
          <div className="p-3 border-b border-[var(--border)] border-[var(--border)] bg-[var(--bg-elevated)]">
            <div className="flex items-center gap-2 mb-1">
              {activeTab === 'vehicles' && (
                <button
                  onClick={handleSelectAll}
                  className="p-2.5 text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors border border-[var(--border)] rounded-lg hover:bg-[var(--bg-elevated)] bg-[var(--bg-elevated)]"
                  aria-label="Tout sélectionner"
                  title="Tout sélectionner"
                >
                  {selectedVehicleIds.size > 0 && isAllVisibleSelected() ? (
                    <CheckSquare className="w-4 h-4 text-[var(--primary)]" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                </button>
              )}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                <input
                  type="text"
                  placeholder="Nom, plaque, IMEI, client..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 text-sm border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] bg-[var(--bg-elevated)] text-[var(--text-primary)] transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-[var(--border)] bg-[var(--bg-elevated)]">
            <button
              onClick={() => setActiveTab('vehicles')}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${activeTab === 'vehicles' ? 'border-[var(--primary)] text-[var(--primary)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}
            >
              Véhicules
            </button>
            <button
              onClick={() => setActiveTab('places')}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${activeTab === 'places' ? 'border-[var(--primary)] text-[var(--primary)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}
            >
              Geofence
            </button>
            <button
              onClick={() => setActiveTab('drivers')}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${activeTab === 'drivers' ? 'border-[var(--primary)] text-[var(--primary)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}
            >
              Chauffeurs
            </button>
          </div>

          {/* List Content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar bg-[var(--bg-surface)]">
            {/* Geofence Management Link */}
            {activeTab === 'places' && (
              <div className="p-3 border-b border-[var(--border)] border-[var(--border)] bg-[var(--primary-dim)]/50 dark:bg-[var(--primary-dim)]">
                <button
                  onClick={() => onNavigate && onNavigate(View.SETTINGS, { tab: 'geofence' })}
                  className="w-full py-2 text-xs font-bold text-[var(--primary)] dark:text-[var(--primary)] border border-[var(--border)] dark:border-[var(--primary)] rounded bg-[var(--bg-elevated)] hover:bg-[var(--primary-dim)] hover:bg-[var(--bg-elevated)] transition-colors flex items-center justify-center gap-2"
                >
                  <Hexagon className="w-3 h-3" />
                  Gérer les Geofences (CRUD)
                </button>
              </div>
            )}

            {isLoading && Object.keys(groupedData).length === 0 ? (
              <MapSidebarSkeleton />
            ) : Object.keys(groupedData).length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[200px] p-8 text-center">
                <div className="w-16 h-16 bg-[var(--bg-elevated)] rounded-full flex items-center justify-center mb-4">
                  <Car className="w-8 h-8 text-[var(--text-muted)] dark:text-[var(--text-secondary)]" />
                </div>
                <p className="text-[var(--text-muted)] text-sm font-medium">{t('map.view.noResults')}</p>
                <p className="text-[var(--text-muted)] dark:text-[var(--text-secondary)] text-xs mt-1">
                  {activeTab === 'vehicles'
                    ? t('map.view.modifyFiltersOrSearch')
                    : activeTab === 'places'
                      ? t('map.view.createGeofenceToStart')
                      : t('map.view.noDriverAssigned')}
                </p>
              </div>
            ) : (
              Object.entries(groupedData)
                .sort(([, a], [, b]) => (a.name || '').localeCompare(b.name || ''))
                .map(([groupKey, data]) => {
                  const group = data;
                  if (group.isClientGroup) {
                    return (
                      <div
                        key={groupKey}
                        className="border-b border-[var(--border)] border-[var(--border)] last:border-0"
                      >
                        <button
                          onClick={() => toggleClient(groupKey)}
                          className="w-full flex items-center justify-between px-4 py-2 bg-[var(--bg-elevated)]/50 bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)]/50 hover:bg-[var(--bg-elevated)] transition-colors"
                        >
                          <div className="flex items-center gap-2 font-bold text-[var(--text-primary)] text-xs uppercase tracking-wider">
                            {expandedClients[groupKey] ? (
                              <ChevronDown className="w-3 h-3" />
                            ) : (
                              <ChevronRight className="w-3 h-3" />
                            )}
                            {group.name}
                          </div>
                          <span className="bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-secondary)] text-[10px] px-1.5 py-0.5 rounded font-medium">
                            {group.totalCount}
                          </span>
                        </button>

                        {expandedClients[groupKey] && (
                          <div className="bg-[var(--bg-elevated)]/50">
                            {/* Branches within Client - juste un label, pas de dropdown */}
                            {(
                              Object.values(group.branches) as { id: string; name?: string; vehicles: Vehicle[] }[]
                            ).map((branch) => (
                              <div key={branch.id}>
                                {/* Branch name as simple label - aligned left */}
                                <div className="flex items-center justify-between px-4 py-2 bg-[var(--bg-elevated)]/30">
                                  <span className="font-medium text-[var(--text-secondary)] text-[11px] uppercase tracking-wider">
                                    {branch.name}
                                  </span>
                                  <span className="text-[10px] text-[var(--text-muted)] font-medium">
                                    {branch.vehicles.length}
                                  </span>
                                </div>
                                {/* Vehicles of this branch - always visible */}
                                <VirtualVehicleList
                                  vehicles={branch.vehicles}
                                  selectedVehicleIds={selectedVehicleIds}
                                  focusedVehicleId={selectedVehicle?.id}
                                  onFocus={focusOnVehicle}
                                  onToggleSelection={toggleSelection}
                                  config={cardConfig}
                                  onEdit={(v) =>
                                    onNavigate && onNavigate(View.SETTINGS, { action: 'edit_vehicle', id: v.id })
                                  }
                                />
                              </div>
                            ))}

                            {/* Direct Vehicles (sans branche) */}
                            {group.directVehicles.length > 0 && (
                              <>
                                {Object.keys(group.branches).length > 0 && (
                                  <div className="flex items-center justify-between px-4 py-2 bg-[var(--bg-elevated)]/30">
                                    <span className="font-medium text-[var(--text-secondary)] text-[11px] uppercase tracking-wider">
                                      Sans branche
                                    </span>
                                    <span className="text-[10px] text-[var(--text-muted)] font-medium">
                                      {group.directVehicles.length}
                                    </span>
                                  </div>
                                )}
                                <VirtualVehicleList
                                  vehicles={group.directVehicles}
                                  selectedVehicleIds={selectedVehicleIds}
                                  focusedVehicleId={selectedVehicle?.id}
                                  onFocus={focusOnVehicle}
                                  onToggleSelection={toggleSelection}
                                  config={cardConfig}
                                  onEdit={(v) =>
                                    onNavigate && onNavigate(View.SETTINGS, { action: 'edit_vehicle', id: v.id })
                                  }
                                />
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  } else {
                    // Legacy render for Places/Drivers where data is just Array
                    const items = data as unknown[];
                    return (
                      items &&
                      items.length > 0 && (
                        <div
                          key={groupKey}
                          className="border-b border-[var(--border)] border-[var(--border)] last:border-0"
                        >
                          <button
                            onClick={() => toggleClient(groupKey)}
                            className="w-full flex items-center justify-between px-4 py-2 bg-[var(--bg-elevated)]/50 bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)]/50 hover:bg-[var(--bg-elevated)] transition-colors"
                          >
                            <div className="flex items-center gap-2 font-bold text-[var(--text-primary)] text-xs uppercase tracking-wider">
                              {expandedClients[groupKey] ? (
                                <ChevronDown className="w-3 h-3" />
                              ) : (
                                <ChevronRight className="w-3 h-3" />
                              )}
                              {groupKey}
                            </div>
                            <span className="bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-secondary)] text-[10px] px-1.5 py-0.5 rounded font-medium">
                              {items.length}
                            </span>
                          </button>

                          {expandedClients[groupKey] && (
                            <div className="bg-[var(--bg-elevated)]/50">
                              {/* PLACE LIST */}
                              {activeTab === 'places' &&
                                (items as Zone[]).map((z: Zone) => (
                                  <div
                                    key={z.id}
                                    onClick={() => focusOnZone(z)}
                                    className="px-4 py-3 border-b border-slate-50 border-[var(--border)] cursor-pointer hover:bg-[var(--bg-elevated)]/50"
                                  >
                                    <div className="flex items-center gap-2 mb-1">
                                      <Layers className="w-4 h-4 text-[var(--text-muted)]" />
                                      <span className="text-sm font-bold text-[var(--text-primary)]">{z.name}</span>
                                    </div>
                                    <div className="flex justify-between text-xs text-[var(--text-secondary)]">
                                      <span>{z.type}</span>
                                      <span className="px-1.5 py-0.5 bg-[var(--bg-elevated)] rounded text-[10px]">
                                        {z.category}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              {/* DRIVERS LIST */}
                              {activeTab === 'drivers' &&
                                (
                                  items as Array<{ id: string; name: string; score: number; currentVehicle: string }>
                                ).map((d) => (
                                  <div
                                    key={d.id}
                                    className="px-4 py-3 border-b border-slate-50 border-[var(--border)] cursor-pointer hover:bg-[var(--bg-elevated)]/50"
                                  >
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-sm font-bold text-[var(--text-primary)]">{d.name}</span>
                                      <span className="text-[10px] font-bold text-green-600">{d.score}/100</span>
                                    </div>
                                    <div className="text-xs text-[var(--text-secondary)]">
                                      Véhicule: {d.currentVehicle}
                                    </div>
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>
                      )
                    );
                  }
                })
            )}
          </div>

          <div
            onMouseDown={() => setIsResizing(true)}
            className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-[var(--primary-dim)] bg-transparent z-20 transition-colors"
          />
        </div>
      )}

      {!isSidebarOpen && !isReplayActive && (
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="hidden lg:block absolute top-4 left-4 z-20 bg-[var(--bg-elevated)] p-2 rounded shadow-md border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--primary)]"
          aria-label="Ouvrir le panneau latéral"
          title="Ouvrir le panneau latéral"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      )}

      {isSidebarOpen && !isReplayActive && (
        <div
          className="hidden lg:flex absolute z-20 items-center justify-center w-6 h-12 bg-[var(--bg-elevated)] border border-l-0 border-[var(--border)] rounded-r-md shadow-sm cursor-pointer hover:bg-[var(--bg-elevated)] hover:text-[var(--primary)] text-[var(--text-muted)]"
          style={{ left: sidebarWidth, top: '50%', transform: 'translateY(-50%)' }}
          onClick={() => setIsSidebarOpen(false)}
        >
          <ChevronLeft className="w-4 h-4" />
        </div>
      )}

      {/* Mobile: Floating button to open vehicle list + Stats bar */}
      {!isReplayActive && !selectedVehicle && (
        <>
          {/* Mobile Stats Bar - Top */}
          <div className="lg:hidden absolute top-2 left-2 right-2 z-20 flex items-center gap-1 bg-slate-900/95 backdrop-blur text-white rounded-lg p-2 shadow-lg">
            <div
              onClick={() => {
                setActiveStatusFilter(null);
                setIsMobileVehicleListOpen(true);
              }}
              className={`flex-1 flex flex-col items-center py-1 rounded cursor-pointer ${activeStatusFilter === null ? 'bg-white/10' : ''}`}
            >
              <span className="font-bold text-sm">{stats.total}</span>
              <span className="text-[8px] text-[var(--text-muted)]">{t('map.view.totalLabel')}</span>
            </div>
            <div
              onClick={() => {
                setActiveStatusFilter(VehicleStatus.MOVING);
                setIsMobileVehicleListOpen(true);
              }}
              className={`flex-1 flex flex-col items-center py-1 rounded cursor-pointer ${activeStatusFilter === VehicleStatus.MOVING ? 'bg-white/10' : ''}`}
            >
              <span className="font-bold text-sm text-green-400">{stats.moving}</span>
              <span className="text-[8px] text-green-400/70">{t('map.view.statRoute')}</span>
            </div>
            <div
              onClick={() => {
                setActiveStatusFilter(VehicleStatus.IDLE);
                setIsMobileVehicleListOpen(true);
              }}
              className={`flex-1 flex flex-col items-center py-1 rounded cursor-pointer ${activeStatusFilter === VehicleStatus.IDLE ? 'bg-white/10' : ''}`}
            >
              <span className="font-bold text-sm text-orange-400">{stats.idle}</span>
              <span className="text-[8px] text-orange-400/70">{t('map.view.idle')}</span>
            </div>
            <div
              onClick={() => {
                setActiveStatusFilter(VehicleStatus.STOPPED);
                setIsMobileVehicleListOpen(true);
              }}
              className={`flex-1 flex flex-col items-center py-1 rounded cursor-pointer ${activeStatusFilter === VehicleStatus.STOPPED ? 'bg-white/10' : ''}`}
            >
              <span className="font-bold text-sm text-red-400">{stats.stopped}</span>
              <span className="text-[8px] text-red-400/70">{t('map.view.statStop')}</span>
            </div>
            <div
              onClick={() => {
                setActiveStatusFilter(VehicleStatus.OFFLINE);
                setIsMobileVehicleListOpen(true);
              }}
              className={`flex-1 flex flex-col items-center py-1 rounded cursor-pointer ${activeStatusFilter === VehicleStatus.OFFLINE ? 'bg-white/10' : ''}`}
            >
              <span className="font-bold text-sm text-[var(--text-muted)]">{stats.offline}</span>
              <span className="text-[8px] text-[var(--text-secondary)]">{t('map.vehicleCard.offline')}</span>
            </div>
            {/* OSM / Google toggle */}
            <div className="flex items-center bg-white/10 rounded px-1 gap-0.5 ml-1">
              <button
                onClick={() => setMapProvider('leaflet')}
                className={`text-[9px] font-bold px-1.5 py-1 rounded transition-colors ${mapProvider === 'leaflet' ? 'bg-[var(--primary)] text-white' : 'text-[var(--text-muted)]'}`}
              >
                OSM
              </button>
              <button
                onClick={() => googleMapsKey && setMapProvider('google')}
                className={`text-[9px] font-bold px-1.5 py-1 rounded transition-colors ${mapProvider === 'google' ? 'bg-[var(--primary)] text-white' : googleMapsKey ? 'text-[var(--text-muted)]' : 'text-[var(--text-secondary)] cursor-not-allowed'}`}
                disabled={!googleMapsKey}
              >
                G
              </button>
            </div>
            {/* Filter button */}
            <button
              onClick={() => setShowMobileMapFilter(true)}
              className={`relative flex items-center justify-center w-7 h-7 rounded ml-1 transition-colors ${activeStatusFilter || filterClient || filterBranch ? 'bg-[var(--primary)] text-white' : 'bg-white/10 text-[var(--text-muted)] hover:bg-white/20'}`}
              aria-label={t('map.view.filters')}
              title={t('map.view.filters')}
            >
              <Filter className="w-3.5 h-3.5" />
              {(activeStatusFilter || filterClient || filterBranch) && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-[var(--bg-primary)]" />
              )}
            </button>
            {/* Sélecteur de fond de carte unifié */}
            <div className="relative ml-1">
              <button
                onClick={() => setShowLayerPicker((v) => !v)}
                className={`flex items-center gap-1 px-2 h-7 rounded transition-colors text-xs font-medium ${showLayerPicker ? 'bg-[var(--primary)] text-white' : 'bg-white/10 text-[var(--text-muted)] hover:bg-white/20'}`}
                title="Changer le fond de carte"
              >
                <Layers className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">
                  {mapProvider === 'leaflet'
                    ? OSM_TILE_LAYERS[osmLayer].label
                    : googleMapType === 'roadmap'
                      ? 'Google'
                      : googleMapType === 'satellite'
                        ? 'G.Satellite'
                        : googleMapType === 'terrain'
                          ? 'G.Terrain'
                          : 'G.Hybride'}
                </span>
              </button>
              {showLayerPicker && (
                <div className="absolute top-full right-0 mt-1 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl shadow-2xl z-[100] p-2 min-w-[180px]">
                  <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-bold px-2 pb-1 mb-1">
                    Fond de carte
                  </p>
                  {(Object.entries(OSM_TILE_LAYERS) as [OsmLayer, (typeof OSM_TILE_LAYERS)[OsmLayer]][]).map(
                    ([key, cfg]) => (
                      <button
                        key={key}
                        onClick={() => {
                          setOsmLayer(key);
                          setMapProvider('leaflet');
                          setShowLayerPicker(false);
                        }}
                        className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-sm transition-colors ${mapProvider === 'leaflet' && osmLayer === key ? 'bg-[var(--primary)] text-white' : 'hover:bg-[var(--primary-dim)] text-[var(--text-primary)]'}`}
                      >
                        <span className="text-base">{cfg.icon}</span>
                        {cfg.label}
                      </button>
                    )
                  )}
                  {googleMapsKey && (
                    <>
                      <div className="border-t border-[var(--border)] my-2" />
                      <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-bold px-2 pb-1">
                        Google Maps
                      </p>
                      {[
                        { key: 'roadmap' as const, label: 'Google Route', icon: '🗺️' },
                        { key: 'satellite' as const, label: 'G. Satellite', icon: '🛰️' },
                        { key: 'hybrid' as const, label: 'G. Hybride', icon: '🌐' },
                        { key: 'terrain' as const, label: 'G. Terrain', icon: '⛰️' },
                      ].map(({ key, label, icon }) => (
                        <button
                          key={key}
                          onClick={() => {
                            setGoogleMapType(key);
                            setMapProvider('google');
                            setShowLayerPicker(false);
                          }}
                          className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-sm transition-colors ${mapProvider === 'google' && googleMapType === key ? 'bg-[var(--primary)] text-white' : 'hover:bg-[var(--primary-dim)] text-[var(--text-primary)]'}`}
                        >
                          <span className="text-base">{icon}</span>
                          {label}
                        </button>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Mobile Vehicle List Bottom Sheet */}
      {isMobileVehicleListOpen && !isReplayActive && (
        <div className="lg:hidden fixed inset-0 z-[51]">
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsMobileVehicleListOpen(false)} />
          {/* Bottom Sheet */}
          <div className="absolute inset-x-0 bottom-0 bg-[var(--bg-surface)] rounded-t-2xl shadow-2xl max-h-[80vh] flex flex-col animate-in slide-in-from-bottom duration-300">
            {/* Handle */}
            <div className="flex justify-center py-2 border-b border-[var(--border)]">
              <div className="w-10 h-1 bg-[var(--border)] bg-[var(--bg-elevated)] rounded-full" />
            </div>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
              <h3 className="font-bold text-[var(--text-primary)]">Véhicules ({listFilteredVehicles.length})</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsMobileVehicleListOpen(false)}
                  className="p-2 hover:bg-[var(--bg-elevated)] rounded-full"
                  aria-label="Fermer la liste"
                  title="Fermer"
                >
                  <X className="w-5 h-5 text-[var(--text-secondary)]" />
                </button>
              </div>
            </div>
            {/* Search */}
            <div className="p-3 border-b border-[var(--border)]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                <input
                  type="text"
                  placeholder="Nom, plaque, IMEI..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-[var(--bg-elevated)] border-0 rounded-lg text-sm focus:ring-2 focus:ring-[var(--primary)]"
                />
              </div>
            </div>
            {/* Vehicle List */}
            <div
              className="flex-1 overflow-y-auto overscroll-contain pb-16"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              {filteredVehicles.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                  <Filter className="w-10 h-10 text-[var(--text-muted)] dark:text-[var(--text-secondary)] mb-3" />
                  <p className="font-medium text-[var(--text-primary)] mb-1">{t('map.view.noVehicleFound')}</p>
                  <p className="text-sm text-[var(--text-secondary)] mb-4">{t('map.view.noVehicleMatch')}</p>
                  <button
                    onClick={() => {
                      setActiveStatusFilter(null);
                      setFilterClient('');
                      setFilterBranch('');
                    }}
                    className="px-4 py-2 bg-[var(--primary)] text-white text-sm font-medium rounded-lg hover:bg-[var(--primary-light)] transition-colors"
                  >
                    Effacer les filtres
                  </button>
                </div>
              )}
              {filteredVehicles.map((v) => (
                <div
                  key={v.id}
                  onClick={() => {
                    focusOnVehicle(v);
                    setIsMobileVehicleListOpen(false);
                  }}
                  className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] border-[var(--border)] active:bg-[var(--bg-elevated)] active:bg-[var(--bg-elevated)] cursor-pointer"
                >
                  <div
                    className={`w-3 h-3 rounded-full shrink-0 ${
                      v.status === VehicleStatus.MOVING
                        ? 'bg-green-500'
                        : v.status === VehicleStatus.IDLE
                          ? 'bg-orange-500'
                          : v.status === VehicleStatus.STOPPED
                            ? 'bg-red-500'
                            : 'bg-[var(--text-secondary)]'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm text-[var(--text-primary)] truncate">{v.name}</p>
                      {v.plate && (
                        <span className="text-[10px] font-mono text-[var(--text-muted)] bg-[var(--bg-elevated)] px-1.5 py-0 rounded shrink-0">
                          {v.plate}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] truncate">
                      {v.speed} km/h • {v.client || 'Non assigné'}
                    </p>
                    {(v.address || v.geofence) && (
                      <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">{v.address || v.geofence}</p>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Map Filter */}
      <MobileFilterSheet
        isOpen={showMobileMapFilter}
        onClose={() => setShowMobileMapFilter(false)}
        activeCount={(activeStatusFilter ? 1 : 0) + (filterClient ? 1 : 0) + (filterBranch ? 1 : 0)}
        onReset={() => {
          setActiveStatusFilter(null);
          setFilterClient('');
          setFilterBranch('');
        }}
        tabs={[
          {
            id: 'status',
            label: 'Statut',
            activeCount: activeStatusFilter ? 1 : 0,
            content: (
              <>
                <FilterRadioRow
                  value=""
                  label="Tous"
                  checked={activeStatusFilter === null}
                  onChange={() => setActiveStatusFilter(null)}
                  count={accessibleVehicles.length}
                />
                {Object.values(VehicleStatus).map((s) => (
                  <FilterRadioRow
                    key={s}
                    value={s}
                    label={<StatusBadge status={s} />}
                    checked={activeStatusFilter === s}
                    onChange={() => setActiveStatusFilter(s)}
                    count={accessibleVehicles.filter((v) => v.status === s).length}
                  />
                ))}
              </>
            ),
          },
          {
            id: 'client',
            label: 'Client',
            activeCount: filterClient ? 1 : 0,
            content: (
              <>
                <FilterRadioRow
                  value=""
                  label="Tous"
                  checked={filterClient === ''}
                  onChange={() => setFilterClient('')}
                  count={accessibleVehicles.length}
                />
                {uniqueMapClients.map((c) => (
                  <FilterRadioRow
                    key={c}
                    value={c}
                    label={c}
                    checked={filterClient === c}
                    onChange={() => setFilterClient(c)}
                    count={accessibleVehicles.filter((v) => v.client === c).length}
                  />
                ))}
              </>
            ),
          },
          {
            id: 'branche',
            label: 'Branche',
            activeCount: filterBranch ? 1 : 0,
            content:
              uniqueMapBranches.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)] text-center py-4">{t('map.view.noBranch')}</p>
              ) : (
                <>
                  <FilterRadioRow
                    value=""
                    label="Toutes"
                    checked={filterBranch === ''}
                    onChange={() => setFilterBranch('')}
                    count={accessibleVehicles.length}
                  />
                  {uniqueMapBranches.map((b) => (
                    <FilterRadioRow
                      key={b.id}
                      value={b.id}
                      label={b.name}
                      checked={filterBranch === b.id}
                      onChange={() => setFilterBranch(b.id)}
                      count={accessibleVehicles.filter((v) => v.branchId === b.id).length}
                    />
                  ))}
                </>
              ),
          },
        ]}
      />

      {/* MAP RENDERER */}
      <div className="map-print-target flex-1 relative bg-[var(--bg-elevated)] overflow-hidden z-0 min-h-[300px] flex items-center justify-center">
        {/* Diagnostic: Always show something even if map fails */}
        <div className="absolute inset-0 flex items-center justify-center text-[var(--text-muted)] z-[-1]">
          <div className="flex flex-col items-center gap-2">
            <RefreshCw className="w-8 h-8 animate-spin" />
            <p className="text-sm font-medium">Initialisation de la carte...</p>
            <p className="text-[10px] text-[var(--text-secondary)]">
              Si cet écran reste blanc, vérifiez votre connexion ou le fournisseur ({mapProvider})
            </p>
          </div>
        </div>

        {mapProvider === 'google' && googleMapsKey ? (
          <div className="absolute inset-0">
            <GoogleMapComponent
              apiKey={googleMapsKey}
              vehicles={isReplayActive && replayVehicle ? [replayVehicle] : filteredVehicles}
              zones={!isReplayActive && (showZones || activeTab === 'places') ? zones : []}
              replayPath={isReplayActive ? replayPath : quickTracePath}
              selectedVehicle={selectedVehicle || replayVehicle}
              onVehicleSelect={setSelectedVehicle}
              center={selectedVehicle ? selectedVehicle.location : undefined}
              mapType={googleMapType}
            />
          </div>
        ) : (
          <div className="absolute inset-0">
            <MapContainer
              center={[CENTER_LAT, CENTER_LNG]}
              zoom={6}
              style={{ height: '100%', width: '100%' }}
              className="z-0"
            >
              <TileLayer
                key={`${osmLayer}-base`}
                attribution={OSM_TILE_LAYERS[osmLayer].attribution}
                url={OSM_TILE_LAYERS[osmLayer].url}
                crossOrigin="anonymous"
              />
              {OSM_TILE_LAYERS[osmLayer].overlay && (
                <TileLayer
                  key={`${osmLayer}-overlay`}
                  url={OSM_TILE_LAYERS[osmLayer].overlay as string}
                  attribution=""
                  crossOrigin="anonymous"
                />
              )}

              <MapUpdater
                focusedVehicle={focusedVehicle ?? null}
                selectedVehicle={selectedVehicle}
                isReplayActive={isReplayActive}
                focusPosition={mapFocusPosition}
                onFocusHandled={() => setMapFocusPosition(null)}
              />

              {/* Zones Layer */}
              {!isReplayActive &&
                (showZones || activeTab === 'places') &&
                zones.map((zone) => {
                  if (zone.type === 'CIRCLE' && zone.center) {
                    return (
                      <Circle
                        key={zone.id}
                        center={[zone.center.lat, zone.center.lng]}
                        radius={zone.radius || 100}
                        pathOptions={{ color: zone.color, fillColor: zone.color, fillOpacity: 0.2 }}
                      >
                        <Popup>
                          <div className="font-bold">{zone.name}</div>
                          <div className="text-xs text-[var(--text-secondary)]">{zone.category}</div>
                        </Popup>
                      </Circle>
                    );
                  } else if (zone.type === 'POLYGON' && zone.coordinates) {
                    return (
                      <Polygon
                        key={zone.id}
                        positions={zone.coordinates.map((c) => [c.lat, c.lng])}
                        pathOptions={{ color: zone.color, fillColor: zone.color, fillOpacity: 0.2 }}
                      >
                        <Popup>
                          <div className="font-bold">{zone.name}</div>
                          <div className="text-xs text-[var(--text-secondary)]">{zone.category}</div>
                        </Popup>
                      </Polygon>
                    );
                  }
                  return null;
                })}

              {/* Quick Trace for Selected Vehicle — segmenté (gap > 10min = coupure) */}
              {!isReplayActive &&
                quickTracePath.length > 0 &&
                (() => {
                  const GAP_MS = 10 * 60 * 1000;
                  const segments: [number, number][][] = [];
                  let seg: [number, number][] = [];
                  for (let i = 0; i < quickTracePath.length; i++) {
                    const p = quickTracePath[i];
                    const prev = quickTracePath[i - 1];
                    if (i > 0 && p.t && prev?.t && p.t - prev.t > GAP_MS) {
                      if (seg.length > 1) segments.push(seg);
                      seg = [];
                    }
                    seg.push([p.lat, p.lng]);
                  }
                  if (seg.length > 1) segments.push(seg);
                  if (segments.length === 0) return null;
                  return (
                    <>
                      {/* Halo blanc pour lisibilité sur fond clair */}
                      <Polyline
                        positions={segments as any}
                        pathOptions={{ color: '#ffffff', weight: 8, opacity: 0.5 }}
                      />
                      {/* Tracé principal bleu vif */}
                      <Polyline positions={segments as any} pathOptions={{ color: '#1d4ed8', weight: 4, opacity: 1 }} />
                    </>
                  );
                })()}

              {/* Heatmap Layer */}
              {showHeatmap && heatmapPoints.length > 0 && (
                <HeatmapLayer
                  points={heatmapPoints}
                  options={{
                    radius: 25,
                    blur: 15,
                    maxZoom: 17,
                    max: 1.0,
                  }}
                />
              )}

              {/* Vehicles Markers with Clustering */}
              {!isReplayActive && (
                <MarkerClusterGroup
                  chunkedLoading
                  iconCreateFunction={createClusterCustomIcon}
                  maxClusterRadius={60}
                  spiderfyOnMaxZoom={true}
                >
                  {filteredVehicles.map((v) => (
                    <AnimatedVehicleMarker
                      key={v.id}
                      vehicle={v}
                      icon={createVehicleIcon(v)}
                      onClick={() => setSelectedVehicle(v)}
                      showLabel={showVehicleLabels}
                    />
                  ))}
                </MarkerClusterGroup>
              )}

              {/* Replay Path */}
              {isReplayActive && replayPath.length > 0 && activeReplayVehicle && (
                <>
                  {/* Polyline segmentée :
                    - Bleu  = conduite normale
                    - Rouge = excès de vitesse (speed > maxAllowed)
                    - Pas de trait sur les gaps > 5 min
                */}
                  {(() => {
                    const GAP_MS = 5 * 60 * 1000;
                    // 4-tier speed palette (mobile-inspired)
                    const speedColor = (kmh: number): string => {
                      if (kmh < 10) return '#6b7280'; // gris foncé — quasi-arrêt (plus visible)
                      if (kmh < 50) return '#22c55e'; // green — allure normale
                      if (kmh < 90) return '#f97316'; // orange — rapide
                      return '#ef4444'; // red   — excès
                    };
                    const speedWeight = (kmh: number): number => (kmh < 10 ? 2 : kmh < 50 ? 3 : 5);
                    type Seg = { coords: [number, number][]; color: string; weight: number };
                    const segs: Seg[] = [];
                    let cur: Seg | null = null;

                    for (let i = 0; i < replayHistory.length; i++) {
                      const p = replayHistory[i];
                      if (!p.location?.lat || !p.location?.lng) continue;
                      const spd = p.speed || 0;
                      const color = speedColor(spd);
                      const weight = speedWeight(spd);
                      const gap =
                        i > 0
                          ? new Date(p.timestamp).getTime() - new Date(replayHistory[i - 1].timestamp).getTime()
                          : 0;

                      // Rupture sur gap temporel ou changement de couleur
                      if (!cur || gap > GAP_MS || cur.color !== color) {
                        // Relier au dernier point du segment précédent pour éviter les trous
                        if (cur && gap <= GAP_MS) cur.coords.push([p.location.lat, p.location.lng]);
                        if (cur) segs.push(cur);
                        cur = { coords: [], color, weight };
                      }
                      cur.coords.push([p.location.lat, p.location.lng]);
                    }
                    if (cur) segs.push(cur);

                    return segs.map((s, idx) => (
                      <Polyline
                        key={`seg-${idx}`}
                        positions={s.coords}
                        pathOptions={{ color: s.color, weight: s.weight, opacity: 0.88 }}
                      />
                    ));
                  })()}

                  {/* Marqueurs numérotés Arrêts / Ralentis */}
                  {replayStops.map((stop, index) => (
                    <Marker
                      key={`stop-${stop.id}`}
                      position={[stop.location.lat, stop.location.lng]}
                      icon={createStopMarkerIcon(index + 1, stop.type, highlightedStop === stop.id)}
                      eventHandlers={{
                        click: () => {
                          setHighlightedStop(stop.id);
                          setHighlightedEvent(null);
                          setMapFocusPosition(stop.location);
                          setExternalStopSelect({ stop, tab: stop.type === 'STOP' ? 'STOPS' : 'IDLE' });
                        },
                      }}
                    >
                      <Popup>
                        <StopPopupContent stop={stop} index={index + 1} />
                      </Popup>
                    </Marker>
                  ))}

                  {/* Marqueurs excès de vitesse */}
                  {replaySpeedEvents.map((event, index) => (
                    <Circle
                      key={`event-${event.id}`}
                      center={[event.location.lat, event.location.lng]}
                      radius={highlightedEvent === event.id ? 55 : 35}
                      pathOptions={{
                        color: '#dc2626',
                        fillColor: '#fca5a5',
                        fillOpacity: highlightedEvent === event.id ? 0.9 : 0.6,
                        weight: 2,
                        dashArray: '4 3',
                      }}
                      eventHandlers={{
                        click: () => {
                          setHighlightedEvent(event.id);
                          setHighlightedStop(null);
                          setMapFocusPosition(event.location);
                          setExternalEventSelect(event);
                        },
                      }}
                    >
                      <Popup>
                        <div style={{ minWidth: 150 }} className="text-sm">
                          <p className="font-bold text-red-600 mb-1">🚨 Excès #{index + 1}</p>
                          <p className="text-[var(--text-primary)] font-medium">{Math.round(event.speed)} km/h</p>
                          <p className="text-xs text-[var(--text-secondary)]">
                            {t('map.replay.limit')} : {event.maxAllowed} km/h
                          </p>
                          <p className="text-xs text-[var(--text-secondary)]">
                            {t('map.view.duration')} : {Math.round(event.duration)}s
                          </p>
                          <p className="text-xs text-[var(--text-secondary)] mt-1">
                            {new Date(event.timestamp).toLocaleTimeString('fr-FR', {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </p>
                        </div>
                      </Popup>
                    </Circle>
                  ))}

                  {/* Marqueurs Départ / Arrivée */}
                  {replayPath.length > 1 &&
                    (() => {
                      const startIcon = L.divIcon({
                        html: `<div style="width:32px;height:32px;border-radius:50%;background:#22c55e;color:white;font-size:16px;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)">▶</div>`,
                        className: '',
                        iconSize: [32, 32],
                        iconAnchor: [16, 16],
                      });
                      const endIcon = L.divIcon({
                        html: `<div style="width:32px;height:32px;border-radius:50%;background:#3b82f6;color:white;font-size:16px;display:flex;align-items:center;justify-content:middle;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);font-weight:700;line-height:32px;text-align:center">■</div>`,
                        className: '',
                        iconSize: [32, 32],
                        iconAnchor: [16, 16],
                      });
                      const first = replayHistory[0];
                      const last = replayHistory[replayHistory.length - 1];
                      return (
                        <>
                          <Marker position={[replayPath[0].lat, replayPath[0].lng]} icon={startIcon}>
                            <Popup>
                              <div className="text-sm font-bold text-green-600">
                                🏁 {t('map.view.departure')}
                                {first && (
                                  <p className="text-xs font-normal text-[var(--text-secondary)] mt-1">
                                    {new Date(first.timestamp).toLocaleTimeString('fr-FR', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </p>
                                )}
                              </div>
                            </Popup>
                          </Marker>
                          <Marker
                            position={[replayPath[replayPath.length - 1].lat, replayPath[replayPath.length - 1].lng]}
                            icon={endIcon}
                          >
                            <Popup>
                              <div className="text-sm font-bold text-[var(--primary)]">
                                📍 {t('map.view.arrival')}
                                {last && (
                                  <p className="text-xs font-normal text-[var(--text-secondary)] mt-1">
                                    {new Date(last.timestamp).toLocaleTimeString('fr-FR', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </p>
                                )}
                              </div>
                            </Popup>
                          </Marker>
                        </>
                      );
                    })()}

                  {/* Marqueur véhicule replay — plaque + vitesse + distance cumulée */}
                  {(() => {
                    if (replayPath.length === 0) return null;
                    const pathIndex = Math.min(
                      Math.floor((replayProgress / 100) * (replayPath.length - 1)),
                      replayPath.length - 1
                    );
                    const currentPos = replayPath[pathIndex];
                    const histPoint = replayHistory[Math.min(pathIndex, replayHistory.length - 1)];
                    if (!currentPos || !activeReplayVehicle) return null;
                    const speed = histPoint?.speed ?? 0;
                    const ign = histPoint?.ignition;
                    const replayStatus: VehicleStatus =
                      speed >= 2 ? VehicleStatus.MOVING : ign === true ? VehicleStatus.IDLE : VehicleStatus.STOPPED;
                    const heading = histPoint?.heading ?? 0;
                    const distKm = replayCumDist[pathIndex] ?? 0;
                    return (
                      <Marker
                        position={[currentPos.lat, currentPos.lng]}
                        icon={createReplayMarkerIcon(activeReplayVehicle, replayStatus, heading, speed, distKm)}
                        zIndexOffset={1000}
                      />
                    );
                  })()}

                  {/* Auto-follow: pan map to current replay position every ~2s */}
                  {isPlaying && <ReplayFollower progress={replayProgress} path={replayPath} />}
                </>
              )}
            </MapContainer>
          </div>
        )}

        {!isReplayActive && (
          <>
            {/* Toolbar verticale — droite de la carte */}
            <div
              className="absolute top-16 z-[400] hidden lg:flex flex-col items-center gap-1.5 transition-all duration-300"
              style={{ right: selectedVehicle && !isReplayActive ? '400px' : '16px' }}
            >
              {/* Groupe : flotte / zones / heatmap / son */}
              <div className="flex flex-col items-center gap-1 bg-[var(--bg-elevated)]/95 backdrop-blur-sm rounded-xl shadow-lg border border-[var(--border)] p-1.5">
                <button
                  onClick={() => setShowAllVehicles(!showAllVehicles)}
                  title={showAllVehicles ? 'Masquer la flotte' : 'Voir toute la flotte'}
                  className={`p-2 rounded-lg transition-all ${showAllVehicles ? 'bg-[var(--primary)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--primary)]'}`}
                >
                  {showAllVehicles ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => setShowZones(!showZones)}
                  title={showZones ? 'Masquer les zones' : 'Voir les zones'}
                  className={`p-2 rounded-lg transition-all ${showZones ? 'bg-[var(--primary)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--primary)]'}`}
                >
                  {showZones ? <EyeOff className="w-4 h-4" /> : <Hexagon className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => setShowHeatmap(!showHeatmap)}
                  title={showHeatmap ? 'Masquer la heatmap' : 'Voir la heatmap'}
                  className={`p-2 rounded-lg transition-all ${showHeatmap ? 'bg-[var(--primary)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--primary)]'}`}
                >
                  {showHeatmap ? <EyeOff className="w-4 h-4" /> : <Activity className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => setShowVehicleLabels(!showVehicleLabels)}
                  title={showVehicleLabels ? t('map.view.hideLabels') : t('map.view.showLabels')}
                  className={`p-2 rounded-lg transition-all ${showVehicleLabels ? 'bg-[var(--primary)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--primary)]'}`}
                >
                  <Tag className="w-4 h-4" />
                </button>
                <div className="w-6 h-px bg-[var(--border)] my-0.5" />
                <button
                  onClick={() => setIsSoundEnabled(!isSoundEnabled)}
                  title={isSoundEnabled ? 'Désactiver son alertes' : 'Activer son alertes'}
                  className={`p-2 rounded-lg transition-all ${isSoundEnabled ? 'text-[var(--primary)] hover:bg-[var(--bg-surface)]' : 'text-[var(--text-muted)] hover:bg-[var(--bg-surface)]'}`}
                >
                  {isSoundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </button>
              </div>

              {/* Groupe : fournisseur carte OSM / Google */}
              <div className="flex flex-col items-center gap-1 bg-[var(--bg-elevated)]/95 backdrop-blur-sm rounded-xl shadow-lg border border-[var(--border)] p-1.5">
                <button
                  onClick={() => setMapProvider('leaflet')}
                  title="Carte OpenStreetMap"
                  className={`p-2 rounded-lg text-[10px] font-bold transition-all leading-none ${mapProvider === 'leaflet' ? 'bg-[var(--primary)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]'}`}
                >
                  OSM
                </button>
                <button
                  onClick={() => googleMapsKey && setMapProvider('google')}
                  title={googleMapsKey ? 'Carte Google Maps' : 'Google Maps (clé API requise)'}
                  disabled={!googleMapsKey}
                  className={`p-2 rounded-lg text-[10px] font-bold transition-all leading-none ${mapProvider === 'google' ? 'bg-[var(--primary)] text-white' : googleMapsKey ? 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]' : 'text-[var(--text-muted)] cursor-not-allowed opacity-40'}`}
                >
                  G
                </button>
              </div>

              {/* Groupe : couches OSM — visible uniquement en mode leaflet */}
              {mapProvider === 'leaflet' && (
                <div className="flex flex-col items-center gap-1 bg-[var(--bg-elevated)]/95 backdrop-blur-sm rounded-xl shadow-lg border border-[var(--border)] p-1.5">
                  {(Object.keys(OSM_TILE_LAYERS) as OsmLayer[]).map((layer) => {
                    const abbr: Record<string, string> = {
                      Standard: 'Std',
                      Satellite: 'Sat',
                      Hybride: 'Hyb',
                      Terrain: 'Ter',
                      Nuit: 'Nuit',
                    };
                    return (
                      <button
                        key={layer}
                        onClick={() => setOsmLayer(layer)}
                        title={OSM_TILE_LAYERS[layer].label}
                        className={`p-2 rounded-lg text-[10px] font-bold transition-all leading-none ${osmLayer === layer ? 'bg-[var(--primary)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]'}`}
                      >
                        {abbr[OSM_TILE_LAYERS[layer].label] || OSM_TILE_LAYERS[layer].label.slice(0, 3)}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Imprimer */}
              <div className="flex flex-col items-center bg-[var(--bg-elevated)]/95 backdrop-blur-sm rounded-xl shadow-lg border border-[var(--border)] p-1.5">
                <button
                  onClick={handlePrintMap}
                  title="Imprimer / Exporter la carte"
                  className="p-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--primary)] transition-colors"
                >
                  <Printer className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Barre de recherche adresse - en haut à droite (desktop only) */}
            <div
              className="hidden lg:block absolute top-4 z-[400] transition-all duration-300"
              style={{ right: selectedVehicle && !isReplayActive ? '416px' : '64px' }}
            >
              <div className="flex items-center gap-2 bg-[var(--bg-elevated)] rounded-full shadow-lg px-4 py-2 border border-[var(--border)]">
                <MapPin className="w-4 h-4 text-[var(--text-muted)]" />
                <input
                  type="text"
                  value={searchAddress}
                  onChange={(e) => setSearchAddress(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchAddressLocation()}
                  placeholder={t('map.view.searchLocation')}
                  className="bg-transparent border-none text-sm focus:outline-none w-40 text-[var(--text-primary)]"
                />
                <button
                  onClick={searchAddressLocation}
                  disabled={isSearchingAddress}
                  className="p-1 hover:bg-[var(--bg-elevated)] rounded-full transition-colors"
                >
                  {isSearchingAddress ? (
                    <RefreshCw className="w-4 h-4 text-[var(--primary)] animate-spin" />
                  ) : (
                    <Search className="w-4 h-4 text-[var(--text-secondary)]" />
                  )}
                </button>
              </div>
            </div>

            {/* SPRINT 1: Panel Alertes */}
            {showAlertsPanel && liveAlerts.length > 0 && (
              <div className="absolute top-32 right-4 z-[500] w-80 bg-[var(--bg-elevated)] rounded-lg shadow-2xl border border-[var(--border)] overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-[var(--bg-elevated)] border-b border-[var(--border)]">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    <h3 className="font-bold text-[var(--text-primary)]">Alertes en direct</h3>
                    <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300 text-xs font-bold rounded-full">
                      {liveAlerts.length}
                    </span>
                  </div>
                  <button
                    onClick={() => setShowAlertsPanel(false)}
                    className="p-1 hover:bg-[var(--bg-elevated)] rounded"
                  >
                    <X className="w-4 h-4 text-[var(--text-secondary)]" />
                  </button>
                </div>
                <div className="max-h-80 overflow-y-auto divide-y divide-[var(--border)]">
                  {liveAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      onClick={() => {
                        setSelectedVehicle(alert.vehicle);
                        setShowAlertsPanel(false);
                      }}
                      className={`px-4 py-3 cursor-pointer hover:bg-[var(--bg-elevated)] flex items-start gap-3 ${alert.severity === 'critical' ? 'bg-[var(--clr-danger-dim)]' : ''}`}
                    >
                      <div
                        className={`p-2 rounded-full ${
                          alert.type === 'SPEED'
                            ? 'bg-orange-100 text-orange-600'
                            : alert.type === 'ZONE'
                              ? 'bg-purple-100 text-purple-600'
                              : alert.type === 'BATTERY'
                                ? 'bg-yellow-100 text-yellow-600'
                                : 'bg-red-100 text-red-600'
                        }`}
                      >
                        {alert.type === 'SPEED' ? (
                          <Gauge className="w-4 h-4" />
                        ) : alert.type === 'ZONE' ? (
                          <MapPinOff className="w-4 h-4" />
                        ) : alert.type === 'BATTERY' ? (
                          <Battery className="w-4 h-4" />
                        ) : (
                          <Zap className="w-4 h-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--text-primary)] truncate">{alert.message}</p>
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                          {alert.type === 'SPEED'
                            ? 'Excès de vitesse'
                            : alert.type === 'ZONE'
                              ? 'Hors zone'
                              : alert.type === 'BATTERY'
                                ? 'Batterie faible'
                                : 'Carburant bas'}
                        </p>
                      </div>
                      {alert.severity === 'critical' && (
                        <span className="px-2 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded animate-pulse">
                          CRITIQUE
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Bouton fond de carte pendant le replay */}
        {isReplayActive && (
          <div className="absolute top-4 right-4 z-[400]">
            <div className="relative">
              <button
                onClick={() => setShowLayerPicker((v) => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full shadow-lg border text-xs font-medium transition-colors ${showLayerPicker ? 'bg-[var(--primary)] text-white border-[var(--primary)]' : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] border-[var(--border)] hover:text-[var(--primary)]'}`}
                title="Changer le fond de carte"
              >
                <Layers className="w-3.5 h-3.5" />
                {mapProvider === 'leaflet'
                  ? OSM_TILE_LAYERS[osmLayer].label
                  : googleMapType === 'roadmap'
                    ? 'Google'
                    : googleMapType === 'satellite'
                      ? 'G.Satellite'
                      : googleMapType === 'terrain'
                        ? 'G.Terrain'
                        : 'G.Hybride'}
              </button>
              {showLayerPicker && (
                <div className="absolute top-full right-0 mt-1 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl shadow-2xl z-[500] p-2 min-w-[180px]">
                  <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-bold px-2 pb-1 mb-1">
                    Fond de carte
                  </p>
                  {(Object.entries(OSM_TILE_LAYERS) as [OsmLayer, (typeof OSM_TILE_LAYERS)[OsmLayer]][]).map(
                    ([key, cfg]) => (
                      <button
                        key={key}
                        onClick={() => {
                          setOsmLayer(key);
                          setMapProvider('leaflet');
                          setShowLayerPicker(false);
                        }}
                        className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-sm transition-colors ${mapProvider === 'leaflet' && osmLayer === key ? 'bg-[var(--primary)] text-white' : 'hover:bg-[var(--primary-dim)] text-[var(--text-primary)]'}`}
                      >
                        <span className="text-base">{cfg.icon}</span>
                        {cfg.label}
                      </button>
                    )
                  )}
                  {googleMapsKey && (
                    <>
                      <div className="border-t border-[var(--border)] my-2" />
                      <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-bold px-2 pb-1">
                        Google Maps
                      </p>
                      {[
                        { key: 'roadmap' as const, label: 'Google Route', icon: '🗺️' },
                        { key: 'satellite' as const, label: 'G. Satellite', icon: '🛰️' },
                        { key: 'hybrid' as const, label: 'G. Hybride', icon: '🌐' },
                        { key: 'terrain' as const, label: 'G. Terrain', icon: '⛰️' },
                      ].map(({ key, label, icon }) => (
                        <button
                          key={key}
                          onClick={() => {
                            setGoogleMapType(key);
                            setMapProvider('google');
                            setShowLayerPicker(false);
                          }}
                          className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-sm transition-colors ${mapProvider === 'google' && googleMapType === key ? 'bg-[var(--primary)] text-white' : 'hover:bg-[var(--primary-dim)] text-[var(--text-primary)]'}`}
                        >
                          <span className="text-base">{icon}</span>
                          {label}
                        </button>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- REPLAY OVERLAY --- */}
        <ReplayControlPanel
          isOpen={isReplayActive}
          onClose={() => {
            const vehicleToRestore = activeReplayVehicle;
            setIsReplayActive(false);
            setReplayPath([]);
            setReplayHistory([]);
            setActiveReplayVehicle(null);
            setReplayStops([]);
            setReplaySpeedEvents([]);
            setHighlightedStop(null);
            setHighlightedEvent(null);
            // Notifier le parent pour reset replayVehicle → permet de re-ouvrir le replay sur le même véhicule
            onReplayClose?.();
            // Revenir à la carte avec le véhicule pré-sélectionné
            if (vehicleToRestore) setSelectedVehicle(vehicleToRestore);
          }}
          vehicles={vehicles}
          selectedVehicle={activeReplayVehicle}
          history={replayHistory}
          onVehicleChange={(v) => setActiveReplayVehicle(v)}
          isPlaying={isPlaying}
          onPlayPause={() => {
            if (replayProgress >= 100) {
              setReplayProgress(0);
              setIsPlaying(true);
            } else {
              setIsPlaying((prev) => !prev);
            }
          }}
          playbackSpeed={playbackSpeed}
          onSpeedChange={setPlaybackSpeed}
          progress={replayProgress}
          onProgressChange={setReplayProgress}
          currentTime={getReplayTime()}
          dateRange={replayDateRange}
          onDateRangeChange={(range) => {
            const now = new Date();
            const start = range.start > now ? now : range.start;
            const end = range.end > now ? now : range.end;
            if (start > end) {
              showToast('La date de début doit être antérieure à la date de fin', 'error');
              return;
            }
            setReplayDateRange({ start, end });
          }}
          onStopClick={(stop) => {
            setHighlightedStop(stop.id);
            setHighlightedEvent(null);
            // Center map on stop location
            setMapFocusPosition(stop.location);
          }}
          onEventClick={(event) => {
            setHighlightedEvent(event.id);
            setHighlightedStop(null);
            // Center map on event location
            setMapFocusPosition(event.location);
          }}
          onTripClick={(trip) => {
            setHighlightedStop(null);
            setHighlightedEvent(null);
            setMapFocusPosition(trip.startLocation);
          }}
          externalStopSelect={externalStopSelect}
          onExternalStopHandled={() => setExternalStopSelect(null)}
          externalEventSelect={externalEventSelect}
          onExternalEventHandled={() => setExternalEventSelect(null)}
          onStopsDetected={setReplayStops}
          onEventsDetected={setReplaySpeedEvents}
        />
      </div>

      {/* Panneau Détail Droite (Only if NOT replay) - Bottom sheet on mobile, sidebar on desktop */}
      {selectedVehicle && !isReplayActive && (
        <>
          {/* Desktop Sidebar - overflow-hidden car VehicleDetailPanel gère son propre scroll */}
          <div className="hidden lg:block w-96 bg-[var(--bg-surface)] border-l border-[var(--border)] shadow-2xl z-30 overflow-hidden absolute top-0 right-0 bottom-0 animate-in slide-in-from-right duration-300">
            <VehicleDetailPanel
              vehicle={selectedVehicle}
              onClose={() => setSelectedVehicle(null)}
              variant="sidebar"
              onReplay={onReplay ? () => onReplay(selectedVehicle) : undefined}
            />
          </div>

          {/* Mobile Draggable Bottom Sheet */}
          <MobileVehicleBottomSheet
            vehicle={selectedVehicle}
            onClose={() => setSelectedVehicle(null)}
            onReplay={onReplay ? () => onReplay(selectedVehicle) : undefined}
          />
        </>
      )}
    </div>
  );
};
