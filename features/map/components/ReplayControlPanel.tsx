import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import type { Vehicle, Coordinate } from '../../../types';
import { useToast } from '../../../contexts/ToastContext';
import { 
  Calendar, Download, Printer, Share2, X, 
  Play, Pause, FastForward, Rewind, ChevronUp, ChevronDown,
  MapPin, Navigation, AlertCircle, Fuel, Gauge, Zap, 
  TrendingUp, TrendingDown, Timer, Route, StopCircle, Camera, Search,
  PauseCircle, Key
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Area, AreaChart } from 'recharts';
import { loadHtml2Canvas } from '../../../services/pdfLoader';
import { PERIOD_PRESETS, type PeriodPreset } from '../../../hooks/useDateRange';
import { exportToGPX, exportToKML, downloadFile } from '../../../utils/gpsExport';

// Types pour les événements et arrêts
export interface StopEvent {
  id: string;
  startTime: Date;
  endTime: Date;
  duration: number; // minutes
  location: Coordinate;
  address?: string;
  type: 'STOP' | 'IDLE'; // STOP = engine off, IDLE = engine on but speed=0
}

export interface SpeedEvent {
  id: string;
  timestamp: Date;
  speed: number;
  maxAllowed: number;
  location: Coordinate;
  duration: number; // seconds over limit
}

export interface TripSegment {
  id: string;
  startTime: Date;
  endTime: Date;
  startLocation: Coordinate;
  endLocation: Coordinate;
  distance: number; // km
  duration: number; // minutes
  avgSpeed: number;
  maxSpeed: number;
}

export interface TripStats {
  totalDistance: number; // km
  totalDuration: number; // minutes
  drivingTime: number; // minutes
  stoppedTime: number; // minutes
  idleTime: number; // minutes
  avgSpeed: number; // km/h
  maxSpeed: number; // km/h
  fuelConsumed?: number; // liters
  stopCount: number;
  speedingEvents: number;
}

interface ReplayControlPanelProps {
  isOpen: boolean;
  onClose: () => void;
  vehicles: Vehicle[];
  selectedVehicle: Vehicle | null;
  onVehicleChange: (vehicle: Vehicle) => void;
  
  // Playback Controls
  isPlaying: boolean;
  onPlayPause: () => void;
  playbackSpeed: number;
  onSpeedChange: (speed: number) => void;
  progress: number;
  onProgressChange: (progress: number) => void;
  currentTime: string;
  
  // Date Range
  dateRange: { start: Date; end: Date };
  onDateRangeChange: (range: { start: Date; end: Date }) => void;
  
  // Data
  history?: any[];
  
  // Callbacks for map markers
  onStopClick?: (stop: StopEvent) => void;
  onEventClick?: (event: SpeedEvent) => void;
  
  // Sync stops and events to parent (MapView)
  onStopsDetected?: (stops: StopEvent[]) => void;
  onEventsDetected?: (events: SpeedEvent[]) => void;
}

type TabType = 'STATS' | 'STOPS' | 'TRIPS' | 'EVENTS' | 'SPEED' | 'FUEL' | 'IDLE';

// Utility function to calculate distance between two coordinates (Haversine)
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

/**
 * Filtre de dérive GPS 50 m — élimine les faux mouvements quand le véhicule est à l'arrêt.
 * Si speed < 2 km/h ET distance depuis le dernier point retenu < 50 m → point ignoré.
 */
function filterDriftGPS(points: any[]): any[] {
  if (points.length === 0) return [];
  const kept: any[] = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const p = points[i];
    const prev = kept[kept.length - 1];
    const speed = p.speed || 0;
    if (speed < 2) {
      const prevLoc = prev.location || { lat: prev.lat, lng: prev.lng };
      const currLoc = p.location   || { lat: p.lat,   lng: p.lng   };
      const distKm = calculateDistance(prevLoc.lat, prevLoc.lng, currLoc.lat, currLoc.lng);
      if (distKm * 1000 < 50) continue; // skip drift < 50 m
    }
    kept.push(p);
  }
  return kept;
}

// Format duration in human-readable format
const formatDuration = (minutes: number): string => {
  if (minutes < 1) return '< 1 min';
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
};

export const ReplayControlPanel: React.FC<ReplayControlPanelProps> = ({
  isOpen,
  onClose,
  vehicles,
  selectedVehicle,
  onVehicleChange,
  isPlaying,
  onPlayPause,
  playbackSpeed,
  onSpeedChange,
  progress,
  onProgressChange,
  currentTime,
  dateRange,
  onDateRangeChange,
  history = [],
  onStopClick,
  onEventClick,
  onStopsDetected,
  onEventsDetected
}) => {
  const { showToast } = useToast();
  const [isBottomPanelOpen, setIsBottomPanelOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('STATS');
  const [isExporting, setIsExporting] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  
  // Vehicle search and filter
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [isVehicleDropdownOpen, setIsVehicleDropdownOpen] = useState(false);
  
  // Date range preset
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('TODAY');
  
  // Fuel chart options
  const [showSpeedOnFuelChart, setShowSpeedOnFuelChart] = useState(false);
  const [showIgnitionOnFuelChart, setShowIgnitionOnFuelChart] = useState(false);
  
  // W1 — Filtre dérive GPS 50 m (appliqué avant tous les calculs)
  const filteredHistory = useMemo(() => filterDriftGPS(history), [history]);

  // Filter vehicles based on search (name or client)
  const filteredVehicles = useMemo(() => {
    if (!vehicleSearch.trim()) return vehicles;
    const search = vehicleSearch.toLowerCase();
    return vehicles.filter(v => 
      v.name.toLowerCase().includes(search) || 
      (v.client && v.client.toLowerCase().includes(search))
    );
  }, [vehicles, vehicleSearch]);
  
  // Group vehicles by client
  const vehiclesByClient = useMemo(() => {
    const groups: Record<string, Vehicle[]> = {};
    filteredVehicles.forEach(v => {
      const client = v.client || 'Sans client';
      if (!groups[client]) groups[client] = [];
      groups[client].push(v);
    });
    return groups;
  }, [filteredVehicles]);
  
  // Handle period preset change
  useEffect(() => {
    const now = new Date();
    let start = new Date();
    let end = new Date();
    
    switch (periodPreset) {
      case 'TODAY':
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'YESTERDAY':
        start.setDate(now.getDate() - 1);
        start.setHours(0, 0, 0, 0);
        end.setDate(now.getDate() - 1);
        end.setHours(23, 59, 59, 999);
        break;
      case 'THIS_WEEK':
        const day = now.getDay() || 7;
        start.setDate(now.getDate() - day + 1);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'LAST_WEEK':
        const currentDay = now.getDay() || 7;
        start.setDate(now.getDate() - currentDay - 6);
        start.setHours(0, 0, 0, 0);
        end.setDate(now.getDate() - currentDay);
        end.setHours(23, 59, 59, 999);
        break;
      case 'THIS_MONTH':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'LAST_MONTH':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        start.setHours(0, 0, 0, 0);
        end = new Date(now.getFullYear(), now.getMonth(), 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'CUSTOM':
        // Don't change dates for custom
        return;
      default:
        break;
    }
    
    onDateRangeChange({ start, end });
  }, [periodPreset]);
  
  const tabs: { id: TabType; label: string; icon: React.ElementType }[] = [
    { id: 'STATS', label: 'Résumé', icon: TrendingUp },
    { id: 'STOPS', label: 'Arrêts', icon: MapPin },
    { id: 'TRIPS', label: 'Trajets', icon: Navigation },
    { id: 'EVENTS', label: 'Événements', icon: AlertCircle },
    { id: 'SPEED', label: 'Vitesse', icon: Gauge },
    { id: 'FUEL', label: 'Carburant', icon: Fuel },
    { id: 'IDLE', label: 'Ralenti', icon: PauseCircle },
  ];

  // Calculate stops and idle periods from history
  // STOP  = engine off (ignition=false) + speed=0 for > 2 min
  // IDLE  = engine on  (ignition=true)  + speed=0 for > 1 min
  // When ignition is unknown (null), use speed-only: treat as STOP
  const stops = useMemo<StopEvent[]>(() => {
    if (!filteredHistory || filteredHistory.length < 2) return [];

    const MIN_STOP_DURATION = 2; // minutes
    const MIN_IDLE_DURATION = 1; // minute
    const detectedStops: StopEvent[] = [];
    let stopStart: any = null;

    const flush = (endPoint: any) => {
      if (!stopStart) return;
      const startTime = new Date(stopStart.timestamp || stopStart.time);
      const endTime = new Date(endPoint.timestamp || endPoint.time);
      const duration = (endTime.getTime() - startTime.getTime()) / 60000;
      // STOP = ignition explicitly false (engine off) OR unknown ignition + long duration (>15min)
      // IDLE = ignition explicitly true OR unknown ignition + short duration
      const ign = stopStart.ignition;
      const type: 'STOP' | 'IDLE' =
        ign === false ? 'STOP' :
        ign === true  ? 'IDLE' :
        duration >= 15 ? 'STOP' : 'IDLE'; // null/unknown: long pause = STOP, short = IDLE
      const minDuration = type === 'STOP' ? MIN_STOP_DURATION : MIN_IDLE_DURATION;
      if (duration >= minDuration) {
        detectedStops.push({
          id: `stop_${detectedStops.length}`,
          startTime,
          endTime,
          duration,
          location: stopStart.location || { lat: stopStart.lat, lng: stopStart.lng },
          address: stopStart.address,
          type,
        });
      }
      stopStart = null;
    };

    for (let i = 0; i < filteredHistory.length; i++) {
      const point = filteredHistory[i];
      const speed = point.speed || 0;
      if (speed < 2) {
        if (!stopStart) stopStart = point;
      } else {
        flush(point);
      }
    }
    // Handle last segment still stopped
    if (stopStart && filteredHistory.length > 0) flush(filteredHistory[filteredHistory.length - 1]);

    return detectedStops;
  }, [filteredHistory]);

  // Calculate speeding events (speed > maxSpeed for > 10 seconds)
  const speedingEvents = useMemo<SpeedEvent[]>(() => {
    if (!filteredHistory || filteredHistory.length < 2) return [];

    const MAX_SPEED = selectedVehicle?.maxSpeed || 120; // Default max speed
    const events: SpeedEvent[] = [];
    let overSpeedStart: any = null;

    for (let i = 0; i < filteredHistory.length; i++) {
      const point = filteredHistory[i];
      const speed = point.speed || 0;
      
      if (speed > MAX_SPEED) {
        if (!overSpeedStart) {
          overSpeedStart = point;
        }
      } else {
        if (overSpeedStart) {
          const startTime = new Date(overSpeedStart.timestamp || overSpeedStart.time);
          const endTime = new Date(point.timestamp || point.time);
          const duration = (endTime.getTime() - startTime.getTime()) / 1000; // seconds
          
          if (duration >= 10) { // At least 10 seconds
            events.push({
              id: `speed_${events.length}`,
              timestamp: startTime,
              speed: overSpeedStart.speed,
              maxAllowed: MAX_SPEED,
              location: overSpeedStart.location || { lat: overSpeedStart.lat, lng: overSpeedStart.lng },
              duration
            });
          }
          overSpeedStart = null;
        }
      }
    }
    
    return events;
  }, [filteredHistory, selectedVehicle]);

  // Calculate trip segments (between stops)
  const tripSegments = useMemo<TripSegment[]>(() => {
    if (!filteredHistory || filteredHistory.length < 2) return [];
    
    const segments: TripSegment[] = [];
    let segmentStart = filteredHistory[0];
    let segmentDistance = 0;
    let segmentMaxSpeed = 0;
    let segmentSpeeds: number[] = [];

    for (let i = 1; i < filteredHistory.length; i++) {
      const prev = filteredHistory[i - 1];
      const curr = filteredHistory[i];
      const speed = curr.speed || 0;
      
      // Calculate distance
      const prevLoc = prev.location || { lat: prev.lat, lng: prev.lng };
      const currLoc = curr.location || { lat: curr.lat, lng: curr.lng };
      
      if (prevLoc && currLoc) {
        segmentDistance += calculateDistance(prevLoc.lat, prevLoc.lng, currLoc.lat, currLoc.lng);
      }
      
      if (speed > 0) {
        segmentSpeeds.push(speed);
        if (speed > segmentMaxSpeed) segmentMaxSpeed = speed;
      }
      
      // Check if this is a stop point
      const isStop = stops.some(s => {
        const pointTime = new Date(curr.timestamp || curr.time).getTime();
        return pointTime >= s.startTime.getTime() && pointTime <= s.endTime.getTime();
      });
      
      if (isStop && segmentDistance > 0.1) { // At least 100m
        const startTime = new Date(segmentStart.timestamp || segmentStart.time);
        const endTime = new Date(curr.timestamp || curr.time);
        const duration = (endTime.getTime() - startTime.getTime()) / 60000;
        
        segments.push({
          id: `trip_${segments.length}`,
          startTime,
          endTime,
          startLocation: segmentStart.location || { lat: segmentStart.lat, lng: segmentStart.lng },
          endLocation: currLoc,
          distance: segmentDistance,
          duration,
          avgSpeed: segmentSpeeds.length > 0 ? segmentSpeeds.reduce((a, b) => a + b, 0) / segmentSpeeds.length : 0,
          maxSpeed: segmentMaxSpeed
        });
        
        // Reset for next segment
        segmentStart = curr;
        segmentDistance = 0;
        segmentMaxSpeed = 0;
        segmentSpeeds = [];
      }
    }
    
    // Add final segment if there's remaining distance
    if (segmentDistance > 0.1 && filteredHistory.length > 0) {
      const lastPoint = filteredHistory[filteredHistory.length - 1];
      const startTime = new Date(segmentStart.timestamp || segmentStart.time);
      const endTime = new Date(lastPoint.timestamp || lastPoint.time);
      const duration = (endTime.getTime() - startTime.getTime()) / 60000;
      
      segments.push({
        id: `trip_${segments.length}`,
        startTime,
        endTime,
        startLocation: segmentStart.location || { lat: segmentStart.lat, lng: segmentStart.lng },
        endLocation: lastPoint.location || { lat: lastPoint.lat, lng: lastPoint.lng },
        distance: segmentDistance,
        duration,
        avgSpeed: segmentSpeeds.length > 0 ? segmentSpeeds.reduce((a, b) => a + b, 0) / segmentSpeeds.length : 0,
        maxSpeed: segmentMaxSpeed
      });
    }
    
    return segments;
  }, [filteredHistory, stops]);

  // Calculate overall trip statistics
  const tripStats = useMemo<TripStats>(() => {
    if (!filteredHistory || filteredHistory.length < 2) {
      return {
        totalDistance: 0,
        totalDuration: 0,
        drivingTime: 0,
        stoppedTime: 0,
        idleTime: 0,
        avgSpeed: 0,
        maxSpeed: 0,
        stopCount: 0,
        speedingEvents: 0
      };
    }
    
    const firstPoint = filteredHistory[0];
    const lastPoint = filteredHistory[filteredHistory.length - 1];
    const startTime = new Date(firstPoint.timestamp || firstPoint.time);
    const endTime = new Date(lastPoint.timestamp || lastPoint.time);
    const totalDuration = (endTime.getTime() - startTime.getTime()) / 60000; // minutes

    // Calculate total distance
    let totalDistance = 0;
    let maxSpeed = 0;
    let speedSum = 0;
    let speedCount = 0;

    for (let i = 1; i < filteredHistory.length; i++) {
      const prev = filteredHistory[i - 1];
      const curr = filteredHistory[i];
      
      const prevLoc = prev.location || { lat: prev.lat, lng: prev.lng };
      const currLoc = curr.location || { lat: curr.lat, lng: curr.lng };
      
      if (prevLoc && currLoc) {
        totalDistance += calculateDistance(prevLoc.lat, prevLoc.lng, currLoc.lat, currLoc.lng);
      }
      
      const speed = curr.speed || 0;
      if (speed > maxSpeed) maxSpeed = speed;
      if (speed > 0) {
        speedSum += speed;
        speedCount++;
      }
    }
    
    const stoppedTime = stops.filter(s => s.type === 'STOP').reduce((acc, s) => acc + s.duration, 0);
    const idleTime = stops.filter(s => s.type === 'IDLE').reduce((acc, s) => acc + s.duration, 0);
    const drivingTime = totalDuration - stoppedTime - idleTime;

    return {
      totalDistance,
      totalDuration,
      drivingTime: Math.max(0, drivingTime),
      stoppedTime,
      idleTime,
      avgSpeed: speedCount > 0 ? speedSum / speedCount : 0,
      maxSpeed,
      stopCount: stops.length,
      speedingEvents: speedingEvents.length
    };
  }, [filteredHistory, stops, speedingEvents]);

  // Sync stops and events to parent component (MapView)
  useEffect(() => {
    if (onStopsDetected) {
      onStopsDetected(stops);
    }
  }, [stops, onStopsDetected]);

  useEffect(() => {
    if (onEventsDetected) {
      onEventsDetected(speedingEvents);
    }
  }, [speedingEvents, onEventsDetected]);

  // Prepare Chart Data from History
  const chartData = useMemo(() => {
    if (!filteredHistory || filteredHistory.length === 0) return [];

    const step = Math.ceil(filteredHistory.length / 100);
    return filteredHistory.filter((_, i) => i % step === 0).map(h => ({
      time: new Date(h.timestamp || h.time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      speed: h.speed || 0,
      fuel: h.fuelLevel || 0,
      ignition: h.ignition ? 100 : 0, // Scale to 0-100 for chart visibility
      maxSpeed: selectedVehicle?.maxSpeed || 120
    }));
  }, [filteredHistory, selectedVehicle]);

  // Detect fuel events (refills and suspicious losses)
  interface FuelEvent {
    id: string;
    type: 'REFILL' | 'LOSS' | 'ALERT';
    timestamp: Date;
    location: Coordinate;
    fuelBefore: number;
    fuelAfter: number;
    delta: number;
    duration?: number; // minutes for losses
  }
  
  const fuelEvents = useMemo<FuelEvent[]>(() => {
    if (!filteredHistory || filteredHistory.length < 2) return [];

    const events: FuelEvent[] = [];
    const REFILL_THRESHOLD = 5; // % increase = refill
    const LOSS_THRESHOLD = -3; // % drop in short time = suspicious loss

    for (let i = 1; i < filteredHistory.length; i++) {
      const prev = filteredHistory[i - 1];
      const curr = filteredHistory[i];
      const prevFuel = prev.fuelLevel || 0;
      const currFuel = curr.fuelLevel || 0;
      const delta = currFuel - prevFuel;
      
      const prevTime = new Date(prev.timestamp || prev.time);
      const currTime = new Date(curr.timestamp || curr.time);
      const duration = (currTime.getTime() - prevTime.getTime()) / 60000; // minutes
      
      // Detect refill (fuel increase > threshold)
      if (delta > REFILL_THRESHOLD) {
        events.push({
          id: `refill_${events.length}`,
          type: 'REFILL',
          timestamp: currTime,
          location: curr.location || { lat: curr.lat, lng: curr.lng },
          fuelBefore: prevFuel,
          fuelAfter: currFuel,
          delta
        });
      }
      
      // Detect suspicious loss (fuel drop > threshold in short time without engine running long)
      if (delta < LOSS_THRESHOLD && duration < 30) { // Rapid drop in < 30 min
        events.push({
          id: `loss_${events.length}`,
          type: 'LOSS',
          timestamp: currTime,
          location: curr.location || { lat: curr.lat, lng: curr.lng },
          fuelBefore: prevFuel,
          fuelAfter: currFuel,
          delta,
          duration
        });
      }
    }
    
    return events;
  }, [filteredHistory]);

  // Export screenshot
  const handleExportVideo = useCallback(async () => {
    setIsExporting(true);
    
    try {
      const html2canvas = await loadHtml2Canvas();
      const canvas = await html2canvas(document.body, {
        useCORS: true,
        allowTaint: true,
        scale: 1
      });
      
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `replay_${selectedVehicle?.name || 'vehicle'}_${new Date().toISOString().split('T')[0]}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      }, 'image/png');
      
    } catch {
      // Export error - non-critical
    } finally {
      setIsExporting(false);
    }
  }, [selectedVehicle]);

  const handlePrintReport = useCallback(() => {
    window.print();
  }, []);

  // Export to GPX
  const handleExportGPX = useCallback(() => {
    if (!history || history.length === 0) {
      showToast('Aucune donnée d\'historique à exporter', 'warning');
      return;
    }

    const points = history.map(point => ({
      lat: point.location.lat,
      lng: point.location.lng,
      timestamp: point.timestamp,
      speed: point.speed,
      heading: point.heading
    }));

    const trackName = `${selectedVehicle?.name || 'Vehicle'} - ${dateRange.start.toLocaleDateString('fr-FR')}`;
    const gpxContent = exportToGPX(points, trackName, selectedVehicle?.name || 'Vehicle');
    
    const filename = `${selectedVehicle?.name || 'vehicle'}_${dateRange.start.toISOString().split('T')[0]}.gpx`;
    downloadFile(gpxContent, filename, 'application/gpx+xml');
  }, [history, selectedVehicle, dateRange]);

  // Export to KML
  const handleExportKML = useCallback(() => {
    if (!history || history.length === 0) {
      showToast('Aucune donnée d\'historique à exporter', 'warning');
      return;
    }

    const points = history.map(point => ({
      lat: point.location.lat,
      lng: point.location.lng,
      timestamp: point.timestamp,
      speed: point.speed,
      heading: point.heading
    }));

    const trackName = `${selectedVehicle?.name || 'Vehicle'} - ${dateRange.start.toLocaleDateString('fr-FR')}`;
    const kmlContent = exportToKML(points, trackName, selectedVehicle?.name || 'Vehicle');
    
    const filename = `${selectedVehicle?.name || 'vehicle'}_${dateRange.start.toISOString().split('T')[0]}.kml`;
    downloadFile(kmlContent, filename, 'application/vnd.google-earth.kml+xml');
  }, [history, selectedVehicle, dateRange]);

  if (!isOpen) return null;

  return (
    <div ref={panelRef} className="absolute inset-0 pointer-events-none z-[1000] flex flex-col justify-between print:relative print:z-0">
      
      {/* TOP TOOLBAR */}
      <div className="pointer-events-auto bg-white/95 backdrop-blur-sm shadow-md p-4 m-4 rounded-lg border border-slate-200 flex flex-wrap items-center gap-4 justify-between print:hidden">
        <div className="flex items-center gap-4">
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600"
            title="Quitter le mode Replay"
          >
            <X size={20} />
          </button>
          
          {/* Vehicle Selector with Search */}
          <div className="relative border-r border-slate-200 pr-4">
            <div 
              className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 cursor-pointer min-w-[250px]"
              onClick={() => setIsVehicleDropdownOpen(!isVehicleDropdownOpen)}
            >
              <Search size={16} className="text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher véhicule ou client..."
                value={vehicleSearch}
                onChange={(e) => {
                  setVehicleSearch(e.target.value);
                  setIsVehicleDropdownOpen(true);
                }}
                onClick={(e) => e.stopPropagation()}
                className="bg-transparent border-none text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] flex-1"
              />
              {selectedVehicle && !vehicleSearch && (
                <span className="text-sm font-medium text-slate-700">{selectedVehicle.name}</span>
              )}
            </div>
            
            {isVehicleDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-[350px] bg-white border border-slate-200 rounded-lg shadow-xl z-50 max-h-[400px] overflow-y-auto">
                {Object.entries(vehiclesByClient).length === 0 ? (
                  <div className="p-4 text-center text-slate-500 text-sm">Aucun véhicule trouvé</div>
                ) : (
                  Object.entries(vehiclesByClient).map(([client, clientVehicles]) => (
                    <div key={client}>
                      <div className="px-3 py-2 bg-slate-100 text-xs font-semibold text-slate-500 uppercase sticky top-0">
                        {client} ({clientVehicles.length})
                      </div>
                      {clientVehicles.map(v => (
                        <div
                          key={v.id}
                          onClick={() => {
                            onVehicleChange(v);
                            setVehicleSearch('');
                            setIsVehicleDropdownOpen(false);
                          }}
                          className={`px-4 py-2 cursor-pointer hover:bg-[var(--primary-dim)] flex items-center justify-between ${selectedVehicle?.id === v.id ? 'bg-[var(--primary-dim)] border-l-2 border-[var(--primary)]' : ''}`}
                        >
                          <div>
                            <p className="text-sm font-medium text-slate-700">{v.name}</p>
                            <p className="text-xs text-slate-500">{v.plate || 'N/A'}</p>
                          </div>
                          <span className={`w-2 h-2 rounded-full ${v.status === 'MOVING' ? 'bg-green-500' : v.status === 'IDLE' ? 'bg-orange-500' : 'bg-slate-400'}`}></span>
                        </div>
                      ))}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Date Range Selector */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-slate-500" />
              <select 
                value={periodPreset}
                onChange={(e) => setPeriodPreset(e.target.value as PeriodPreset)}
                className="bg-slate-50 border border-slate-200 rounded-lg text-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                title="Période"
              >
                {Object.entries(PERIOD_PRESETS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            
            {periodPreset === 'CUSTOM' && (
              <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-md border border-slate-200">
                <input 
                  type="date" 
                  className="bg-transparent border-none text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  value={dateRange.start.toISOString().split('T')[0]}
                  onChange={(e) => {
                    const date = new Date(e.target.value);
                    date.setHours(0, 0, 0, 0);
                    onDateRangeChange({ ...dateRange, start: date });
                  }}
                  title="Date de début"
                />
                <span className="text-slate-400">-</span>
                <input 
                  type="date" 
                  className="bg-transparent border-none text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  value={dateRange.end.toISOString().split('T')[0]}
                  onChange={(e) => {
                    const date = new Date(e.target.value);
                    date.setHours(23, 59, 59, 999);
                    onDateRangeChange({ ...dateRange, end: date });
                  }}
                  title="Date de fin"
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={handleExportVideo}
            disabled={isExporting}
            className="flex items-center gap-2 px-3 py-1.5 bg-[var(--primary-dim)] text-[var(--primary)] rounded-md hover:bg-[var(--primary-dim)] transition-colors text-sm font-medium disabled:opacity-50"
          >
            {isExporting ? (
              <div className="w-4 h-4 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
            ) : (
              <Camera size={16} />
            )}
            <span>Capture</span>
          </button>
          
          <button 
            onClick={handleExportGPX}
            className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-600 rounded-md hover:bg-green-100 transition-colors text-sm font-medium"
            title="Exporter en format GPX (GPS)"
          >
            <Download size={16} />
            <span>GPX</span>
          </button>
          
          <button 
            onClick={handleExportKML}
            className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 text-purple-600 rounded-md hover:bg-purple-100 transition-colors text-sm font-medium"
            title="Exporter en format KML (Google Earth)"
          >
            <Download size={16} />
            <span>KML</span>
          </button>
          
          <button 
            onClick={handlePrintReport}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-md transition-colors" 
            title="Imprimer le rapport"
          >
            <Printer size={18} />
          </button>
          <button className="p-2 text-slate-600 hover:bg-slate-100 rounded-md transition-colors" title="Partager">
            <Share2 size={18} />
          </button>
        </div>
      </div>

      {/* BOTTOM PANEL */}
      <div className="pointer-events-auto m-4 flex flex-col items-center print:m-0">
        {/* Playback Controls */}
        <div className="bg-white shadow-lg rounded-full px-6 py-2 mb-4 flex items-center gap-6 border border-slate-200 print:hidden">
          <button 
            className="text-slate-500 hover:text-[var(--primary)] transition-colors"
            onClick={() => onProgressChange(Math.max(0, progress - 10))}
            title="Reculer de 10%"
          >
            <Rewind size={20} />
          </button>
          <button 
            className={`w-10 h-10 rounded-full flex items-center justify-center text-white transition-colors ${isPlaying ? 'bg-amber-500 hover:bg-amber-600' : 'bg-[var(--primary)] hover:bg-[var(--primary-light)]'}`}
            onClick={onPlayPause}
            title={isPlaying ? 'Pause' : 'Lecture'}
          >
            {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1" />}
          </button>
          <button 
            className="text-slate-500 hover:text-[var(--primary)] transition-colors"
            onClick={() => onProgressChange(Math.min(100, progress + 10))}
            title="Avancer de 10%"
          >
            <FastForward size={20} />
          </button>
          <div className="h-4 w-px bg-slate-300 mx-2"></div>
          <select 
            className="bg-transparent text-sm font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] cursor-pointer"
            value={playbackSpeed}
            onChange={(e) => onSpeedChange(Number(e.target.value))}
            title="Vitesse de lecture"
          >
            <option value="0.5">0.5x</option>
            <option value="1">1x</option>
            <option value="2">2x</option>
            <option value="5">5x</option>
            <option value="10">10x</option>
            <option value="20">20x</option>
          </select>
          <div className="h-4 w-px bg-slate-300 mx-2"></div>
          <div className="text-sm font-mono font-bold text-slate-700 min-w-[60px] text-center">
            {currentTime}
          </div>
          {/* Progress bar */}
          <div className="w-32 h-2 bg-slate-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-[var(--primary)] transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs text-slate-500">{progress.toFixed(0)}%</span>
        </div>

        {/* Data Panel */}
        <div className={`w-full max-w-6xl bg-white rounded-t-xl shadow-[0_-4px_20px_rgba(0,0,0,0.1)] border border-slate-200 transition-all duration-300 ease-in-out flex flex-col print:shadow-none print:border-0 ${isBottomPanelOpen ? 'h-96' : 'h-12'}`}>
          
          {/* Tabs */}
          <div className="flex items-center justify-between px-4 border-b border-slate-100 h-12 shrink-0 cursor-pointer print:cursor-default" onClick={() => setIsBottomPanelOpen(!isBottomPanelOpen)}>
            <div className="flex items-center gap-1 h-full" onClick={(e) => e.stopPropagation()}>
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setIsBottomPanelOpen(true);
                  }}
                  className={`flex items-center gap-2 px-4 h-full border-b-2 transition-colors text-sm font-medium ${
                    activeTab === tab.id 
                      ? 'border-[var(--primary)] text-[var(--primary)] bg-[var(--primary-dim)]/50' 
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <tab.icon size={16} />
                  {tab.label}
                  {tab.id === 'STOPS' && stops.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 text-xs bg-[var(--primary-dim)] text-[var(--primary)] rounded-full">{stops.length}</span>
                  )}
                  {tab.id === 'EVENTS' && speedingEvents.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 text-xs bg-red-100 text-red-600 rounded-full">{speedingEvents.length}</span>
                  )}
                </button>
              ))}
            </div>
            <button className="text-slate-400 hover:text-slate-600 print:hidden" title="Réduire/Agrandir">
              {isBottomPanelOpen ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden p-4 bg-slate-50/50">
            
            {/* STATS TAB */}
            {activeTab === 'STATS' && (
              <div className="h-full overflow-y-auto">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  <StatCard icon={Route} label="Distance totale" value={`${tripStats.totalDistance.toFixed(1)} km`} color="blue" />
                  <StatCard icon={Timer} label="Durée totale" value={formatDuration(tripStats.totalDuration)} color="purple" />
                  <StatCard icon={Navigation} label="Temps conduite" value={formatDuration(tripStats.drivingTime)} color="green" />
                  <StatCard icon={StopCircle} label="Temps arrêt" value={formatDuration(tripStats.stoppedTime)} color="orange" />
                  <StatCard icon={PauseCircle} label="Temps ralenti" value={formatDuration(tripStats.idleTime)} color="yellow" />
                  <StatCard icon={Gauge} label="Vitesse moyenne" value={`${tripStats.avgSpeed.toFixed(0)} km/h`} color="cyan" />
                  <StatCard icon={Zap} label="Vitesse max" value={`${tripStats.maxSpeed.toFixed(0)} km/h`} color={tripStats.maxSpeed > (selectedVehicle?.maxSpeed || 120) ? 'red' : 'green'} />
                  <StatCard icon={MapPin} label="Nombre d'arrêts" value={`${tripStats.stopCount}`} color="blue" />
                  <StatCard icon={AlertCircle} label="Excès vitesse" value={`${tripStats.speedingEvents}`} color={tripStats.speedingEvents > 0 ? 'red' : 'green'} />
                </div>
                
                {/* Mini speed chart */}
                <div className="mt-4 h-32 bg-white rounded-lg border border-slate-200 p-2">
                  <ResponsiveContainer width="100%" height="100%" minHeight={100} minWidth={150} initialDimension={{ width: 150, height: 100 }}>
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="speedGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="time" hide />
                      <YAxis hide />
                      <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} formatter={(value: number) => [`${value.toFixed(0)} km/h`, 'Vitesse']} />
                      <ReferenceLine y={selectedVehicle?.maxSpeed || 120} stroke="#ef4444" strokeDasharray="3 3" />
                      <Area type="linear" dataKey="speed" stroke="#3b82f6" fill="url(#speedGradient)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* STOPS TAB */}
            {activeTab === 'STOPS' && (
              <div className="h-full overflow-y-auto">
                {stops.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-500">
                    <div className="text-center">
                      <MapPin className="w-12 h-12 mx-auto mb-2 opacity-30" />
                      <p>Aucun arrêt détecté pour cette période</p>
                      <p className="text-sm text-slate-400">Les arrêts de moins de 2 minutes ne sont pas comptabilisés</p>
                    </div>
                  </div>
                ) : (
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-100 dark:bg-slate-800/50 sticky top-0">
                      <tr>
                        <th className="px-4 py-2">#</th>
                        <th className="px-4 py-2">Type</th>
                        <th className="px-4 py-2">Heure début</th>
                        <th className="px-4 py-2">Heure fin</th>
                        <th className="px-4 py-2">Durée</th>
                        <th className="px-4 py-2">Position</th>
                        <th className="px-4 py-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-900">
                      {stops.map((stop, index) => (
                        <tr key={stop.id} className="hover:bg-[var(--primary-dim)]/50 dark:hover:bg-[var(--primary-dim)]/20 cursor-pointer" onClick={() => onStopClick?.(stop)}>
                          <td className="px-4 py-2 font-medium text-slate-700 dark:text-slate-300">{index + 1}</td>
                          <td className="px-4 py-2">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${stop.type === 'STOP' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                              {stop.type === 'STOP' ? 'Arrêt' : 'Ralenti'}
                            </span>
                          </td>
                          <td className="px-4 py-2">{stop.startTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</td>
                          <td className="px-4 py-2">{stop.endTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</td>
                          <td className="px-4 py-2">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${stop.duration > 30 ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                              {formatDuration(stop.duration)}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-slate-500 dark:text-slate-400">
                            {stop.address || `${stop.location.lat.toFixed(4)}, ${stop.location.lng.toFixed(4)}`}
                          </td>
                          <td className="px-4 py-2">
                            <button className="text-[var(--primary)] hover:text-[var(--primary)] text-xs font-medium">Voir sur carte</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* TRIPS TAB */}
            {activeTab === 'TRIPS' && (
              <div className="h-full overflow-y-auto">
                {tripSegments.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-500">
                    <div className="text-center">
                      <Navigation className="w-12 h-12 mx-auto mb-2 opacity-30" />
                      <p>Aucun trajet détecté pour cette période</p>
                    </div>
                  </div>
                ) : (
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-100 dark:bg-slate-800/50 sticky top-0">
                      <tr>
                        <th className="px-4 py-2">#</th>
                        <th className="px-4 py-2">Départ</th>
                        <th className="px-4 py-2">Arrivée</th>
                        <th className="px-4 py-2">Distance</th>
                        <th className="px-4 py-2">Durée</th>
                        <th className="px-4 py-2">Vit. Moy</th>
                        <th className="px-4 py-2">Vit. Max</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-900">
                      {tripSegments.map((trip, index) => (
                        <tr key={trip.id} className="hover:bg-[var(--primary-dim)]/50 dark:hover:bg-[var(--primary-dim)]/20">
                          <td className="px-4 py-2 font-medium text-slate-700 dark:text-slate-300">{index + 1}</td>
                          <td className="px-4 py-2">{trip.startTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</td>
                          <td className="px-4 py-2">{trip.endTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</td>
                          <td className="px-4 py-2 font-medium">{trip.distance.toFixed(1)} km</td>
                          <td className="px-4 py-2">{formatDuration(trip.duration)}</td>
                          <td className="px-4 py-2">{trip.avgSpeed.toFixed(0)} km/h</td>
                          <td className="px-4 py-2">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${trip.maxSpeed > (selectedVehicle?.maxSpeed || 120) ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                              {trip.maxSpeed.toFixed(0)} km/h
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* EVENTS TAB */}
            {activeTab === 'EVENTS' && (
              <div className="h-full overflow-y-auto">
                {speedingEvents.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-500">
                    <div className="text-center">
                      <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-30 text-green-500" />
                      <p className="text-green-600 font-medium">Aucun excès de vitesse détecté</p>
                      <p className="text-sm text-slate-400">Bonne conduite ! 🎉</p>
                    </div>
                  </div>
                ) : (
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-100 dark:bg-slate-800/50 sticky top-0">
                      <tr>
                        <th className="px-4 py-2">#</th>
                        <th className="px-4 py-2">Heure</th>
                        <th className="px-4 py-2">Vitesse</th>
                        <th className="px-4 py-2">Limite</th>
                        <th className="px-4 py-2">Dépassement</th>
                        <th className="px-4 py-2">Durée</th>
                        <th className="px-4 py-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-900">
                      {speedingEvents.map((event, index) => (
                        <tr key={event.id} className="hover:bg-red-50/50 dark:hover:bg-red-900/20 cursor-pointer" onClick={() => onEventClick?.(event)}>
                          <td className="px-4 py-2 font-medium text-slate-700 dark:text-slate-300">{index + 1}</td>
                          <td className="px-4 py-2">{event.timestamp.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</td>
                          <td className="px-4 py-2">
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">{event.speed.toFixed(0)} km/h</span>
                          </td>
                          <td className="px-4 py-2">{event.maxAllowed} km/h</td>
                          <td className="px-4 py-2 font-medium text-red-600">+{(event.speed - event.maxAllowed).toFixed(0)} km/h</td>
                          <td className="px-4 py-2">{event.duration.toFixed(0)}s</td>
                          <td className="px-4 py-2">
                            <button className="text-[var(--primary)] hover:text-[var(--primary)] text-xs font-medium">Voir sur carte</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* SPEED TAB */}
            {activeTab === 'SPEED' && (
              <div className="h-full w-full bg-white p-2 rounded-lg border border-slate-200">
                <ResponsiveContainer width="100%" height="100%" minHeight={200} minWidth={200} initialDimension={{ width: 200, height: 200 }}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} />
                    <YAxis stroke="#94a3b8" fontSize={12} domain={[0, 'auto']} />
                    <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }} formatter={(value: number, name: string) => [`${value.toFixed(0)} km/h`, name === 'speed' ? 'Vitesse' : 'Limite']} />
                    <ReferenceLine y={selectedVehicle?.maxSpeed || 120} stroke="#ef4444" strokeDasharray="5 5" label={{ value: 'Limite', position: 'right', fill: '#ef4444', fontSize: 12 }} />
                    <Line type="linear" dataKey="speed" stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#3b82f6' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* FUEL TAB */}
            {activeTab === 'FUEL' && (
              <div className="h-full w-full bg-white p-2 rounded-lg border border-slate-200 overflow-hidden">
                <div className="h-full flex flex-col">
                  {/* Header with stats and controls */}
                  <div className="flex items-center justify-between mb-2 px-2 flex-wrap gap-2">
                    <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <Fuel className="w-4 h-4 text-green-500" />
                      Carburant
                    </h3>
                    
                    {/* Stats */}
                    {chartData.length > 0 && chartData[0].fuel !== undefined && (
                      <div className="flex gap-3 text-xs">
                        <span className="text-slate-500">Début: <strong className="text-slate-700">{chartData[0].fuel.toFixed(0)}%</strong></span>
                        <span className="text-slate-500">Fin: <strong className="text-slate-700">{chartData[chartData.length - 1]?.fuel?.toFixed(0) || 0}%</strong></span>
                        <span className={`font-medium ${(chartData[0].fuel - (chartData[chartData.length - 1]?.fuel || 0)) > 10 ? 'text-red-600' : 'text-green-600'}`}>
                          Δ {((chartData[0].fuel || 0) - (chartData[chartData.length - 1]?.fuel || 0)).toFixed(1)}%
                        </span>
                      </div>
                    )}
                    
                    {/* Checkboxes for additional curves */}
                    <div className="flex items-center gap-4 text-xs">
                      <label className="flex items-center gap-1.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={showSpeedOnFuelChart}
                          onChange={(e) => setShowSpeedOnFuelChart(e.target.checked)}
                          className="w-3.5 h-3.5 rounded border-slate-300 text-[var(--primary)] focus:ring-[var(--primary)]"
                        />
                        <Gauge className="w-3.5 h-3.5 text-[var(--primary)]" />
                        <span className="text-slate-600">Vitesse</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={showIgnitionOnFuelChart}
                          onChange={(e) => setShowIgnitionOnFuelChart(e.target.checked)}
                          className="w-3.5 h-3.5 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                        />
                        <Key className="w-3.5 h-3.5 text-orange-500" />
                        <span className="text-slate-600">Contact</span>
                      </label>
                    </div>
                  </div>
                  
                  {/* Event badges */}
                  {fuelEvents.length > 0 && (
                    <div className="flex gap-2 px-2 mb-2 flex-wrap">
                      {fuelEvents.filter(e => e.type === 'REFILL').length > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          <Fuel className="w-3 h-3" />
                          {fuelEvents.filter(e => e.type === 'REFILL').length} Ravitaillement(s)
                        </span>
                      )}
                      {fuelEvents.filter(e => e.type === 'LOSS').length > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                          <TrendingDown className="w-3 h-3" />
                          {fuelEvents.filter(e => e.type === 'LOSS').length} Perte(s) suspecte(s)
                        </span>
                      )}
                    </div>
                  )}
                  
                  {/* Chart */}
                  <div className="flex-1 min-h-0">
                    <ResponsiveContainer width="100%" height="100%" minHeight={200} minWidth={200} initialDimension={{ width: 200, height: 200 }}>
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="fuelGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="ignitionGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f97316" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} />
                        <YAxis 
                          yAxisId="fuel" 
                          stroke="#22c55e" 
                          fontSize={10} 
                          domain={[0, 100]} 
                          tickFormatter={(v) => `${v}%`}
                          orientation="left"
                        />
                        {showSpeedOnFuelChart && (
                          <YAxis 
                            yAxisId="speed" 
                            stroke="#3b82f6" 
                            fontSize={10} 
                            domain={[0, 'auto']} 
                            tickFormatter={(v) => `${v}`}
                            orientation="right"
                          />
                        )}
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} 
                          formatter={(value: number, name: string) => {
                            if (name === 'fuel') return [`${value.toFixed(1)}%`, 'Carburant'];
                            if (name === 'speed') return [`${value.toFixed(0)} km/h`, 'Vitesse'];
                            if (name === 'ignition') return [value > 0 ? 'ON' : 'OFF', 'Contact'];
                            return [value, name];
                          }} 
                        />
                        <ReferenceLine yAxisId="fuel" y={20} stroke="#ef4444" strokeDasharray="5 5" label={{ value: 'Réserve', position: 'insideTopRight', fill: '#ef4444', fontSize: 9 }} />
                        
                        {/* Ignition area (background) */}
                        {showIgnitionOnFuelChart && (
                          <Area 
                            yAxisId="fuel" 
                            type="stepAfter" 
                            dataKey="ignition" 
                            stroke="#f97316" 
                            fill="url(#ignitionGradient)" 
                            strokeWidth={0}
                            dot={false}
                          />
                        )}
                        
                        {/* Fuel line (main) */}
                        <Area 
                          yAxisId="fuel" 
                          type="monotone" 
                          dataKey="fuel" 
                          stroke="#22c55e" 
                          fill="url(#fuelGradient)" 
                          strokeWidth={2} 
                        />
                        
                        {/* Speed line (optional) */}
                        {showSpeedOnFuelChart && (
                          <Line 
                            yAxisId="speed" 
                            type="monotone" 
                            dataKey="speed" 
                            stroke="#3b82f6" 
                            strokeWidth={1.5} 
                            dot={false}
                            strokeDasharray="3 3"
                          />
                        )}
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  
                  {/* Fuel events list */}
                  {fuelEvents.length > 0 && (
                    <div className="mt-2 border-t border-slate-200 pt-2 max-h-32 overflow-y-auto">
                      <table className="w-full text-xs">
                        <thead className="text-slate-500 uppercase bg-slate-50">
                          <tr>
                            <th className="px-2 py-1 text-left">Type</th>
                            <th className="px-2 py-1 text-left">Heure</th>
                            <th className="px-2 py-1 text-left">Avant</th>
                            <th className="px-2 py-1 text-left">Après</th>
                            <th className="px-2 py-1 text-left">Δ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {fuelEvents.map((event) => (
                            <tr key={event.id} className={`hover:bg-slate-50 ${event.type === 'LOSS' ? 'bg-red-50/50' : 'bg-green-50/50'}`}>
                              <td className="px-2 py-1">
                                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${
                                  event.type === 'REFILL' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                }`}>
                                  {event.type === 'REFILL' ? <Fuel className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                  {event.type === 'REFILL' ? 'Ravit.' : 'Perte'}
                                </span>
                              </td>
                              <td className="px-2 py-1 text-slate-600">
                                {event.timestamp.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                              </td>
                              <td className="px-2 py-1 text-slate-600">{event.fuelBefore.toFixed(0)}%</td>
                              <td className="px-2 py-1 text-slate-600">{event.fuelAfter.toFixed(0)}%</td>
                              <td className={`px-2 py-1 font-medium ${event.delta > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {event.delta > 0 ? '+' : ''}{event.delta.toFixed(1)}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* IDLE TAB */}
            {activeTab === 'IDLE' && (
              <div className="h-full overflow-y-auto">
                {(() => {
                  const idleEvents = stops.filter(s => s.type === 'IDLE');
                  const totalIdleTime = tripStats.idleTime;
                  return idleEvents.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-500">
                      <div className="text-center">
                        <PauseCircle className="w-12 h-12 mx-auto mb-2 opacity-30 text-green-500" />
                        <p className="text-green-600 font-medium">Aucun ralenti détecté</p>
                        <p className="text-sm text-slate-400">Moteur allumé à l'arrêt &gt; 1 min</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <PauseCircle className="w-8 h-8 text-orange-500" />
                          <div>
                            <p className="text-sm font-medium text-orange-700">Temps de ralenti total</p>
                            <p className="text-xs text-orange-600">Moteur allumé sans mouvement (&gt;1 min)</p>
                          </div>
                        </div>
                        <p className="text-2xl font-bold text-orange-700">{formatDuration(totalIdleTime)}</p>
                      </div>
                      <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-100 sticky top-0">
                          <tr>
                            <th className="px-4 py-2">#</th>
                            <th className="px-4 py-2">Heure début</th>
                            <th className="px-4 py-2">Heure fin</th>
                            <th className="px-4 py-2">Durée</th>
                            <th className="px-4 py-2">Position</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 bg-white">
                          {idleEvents.map((event, index) => (
                            <tr key={event.id} className="hover:bg-orange-50/50">
                              <td className="px-4 py-2 font-medium text-slate-700">{index + 1}</td>
                              <td className="px-4 py-2">{event.startTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</td>
                              <td className="px-4 py-2">{event.endTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</td>
                              <td className="px-4 py-2">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${event.duration > 15 ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                                  {formatDuration(event.duration)}
                                </span>
                              </td>
                              <td className="px-4 py-2 text-slate-500 text-xs">
                                {event.address || `${event.location.lat.toFixed(4)}, ${event.location.lng.toFixed(4)}`}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Stat Card Component
const StatCard: React.FC<{
  icon: React.ElementType;
  label: string;
  value: string;
  color: 'blue' | 'purple' | 'green' | 'orange' | 'red' | 'cyan';
}> = ({ icon: Icon, label, value, color }) => {
  const colors = {
    blue: 'bg-[var(--primary-dim)] border-[var(--border)] text-[var(--primary)]',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    cyan: 'bg-cyan-50 border-cyan-200 text-cyan-700',
  };

  const iconColors = {
    blue: 'text-[var(--primary)]',
    purple: 'text-purple-500',
    green: 'text-green-500',
    orange: 'text-orange-500',
    red: 'text-red-500',
    cyan: 'text-cyan-500',
  };

  return (
    <div className={`p-3 rounded-lg border ${colors[color]}`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-4 h-4 ${iconColors[color]}`} />
        <span className="text-xs font-medium opacity-80">{label}</span>
      </div>
      <p className="text-lg font-bold">{value}</p>
    </div>
  );
};
