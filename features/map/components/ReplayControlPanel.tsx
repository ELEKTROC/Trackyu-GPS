import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import type { Vehicle, Coordinate } from '../../../types';
import { useToast } from '../../../contexts/ToastContext';
import {
  Calendar,
  Download,
  Printer,
  Share2,
  X,
  Play,
  Pause,
  FastForward,
  Rewind,
  ChevronUp,
  ChevronDown,
  MapPin,
  Navigation,
  AlertCircle,
  Fuel,
  Gauge,
  Zap,
  TrendingUp,
  TrendingDown,
  Timer,
  Route,
  StopCircle,
  Camera,
  Search,
  PauseCircle,
  Key,
  WifiOff,
  Droplets,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  AreaChart,
} from 'recharts';
import { loadHtml2Canvas } from '../../../services/pdfLoader';
import { PERIOD_PRESETS, type PeriodPreset } from '../../../hooks/useDateRange';
import { exportToGPX, exportToKML, downloadFile } from '../../../utils/gpsExport';
import { formatHumanDuration } from '../../../utils/computeVehicleStats';
import { useVehicleStats } from '../../../hooks/useVehicleStats';
import { API_URL, getHeaders } from '../../../services/api/client';
import { useTranslation } from '../../../i18n';

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
  onTripClick?: (trip: TripSegment) => void;

  // Sélection externe (clic marqueur carte → ouvrir onglet)
  externalStopSelect?: { stop: StopEvent; tab: 'STOPS' | 'IDLE' } | null;
  onExternalStopHandled?: () => void;
  externalEventSelect?: SpeedEvent | null;
  onExternalEventHandled?: () => void;

  // Sync stops and events to parent (MapView)
  onStopsDetected?: (stops: StopEvent[]) => void;
  onEventsDetected?: (events: SpeedEvent[]) => void;
}

type TabType = 'STATS' | 'STOPS' | 'TRIPS' | 'EVENTS' | 'SPEED' | 'FUEL' | 'IDLE';

// Utility function to calculate distance between two coordinates (Haversine)
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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
      const currLoc = p.location || { lat: p.lat, lng: p.lng };
      const distKm = calculateDistance(prevLoc.lat, prevLoc.lng, currLoc.lat, currLoc.lng);
      if (distKm * 1000 < 50) continue; // skip drift < 50 m
    }
    kept.push(p);
  }
  return kept;
}

// Helper adaptateur : formatHumanDuration prend des ms, nos tripStats stockent des minutes.
const formatDuration = (minutes: number): string => formatHumanDuration(minutes * 60_000);

// Composant autonome pour géocodage live dans les tableaux (STOPS/IDLE)
// IMPORTANT : défini en dehors du composant principal — ne jamais mettre un composant avec hooks dans un useCallback
const GeocodedCell: React.FC<{ lat: number; lng: number; address?: string }> = ({ lat, lng, address }) => {
  const [addr, setAddr] = React.useState<string | null>(address || null);
  React.useEffect(() => {
    if (addr) return;
    fetch(`${API_URL}/fleet/geocode?lat=${lat}&lng=${lng}`, { credentials: 'include', headers: getHeaders() })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setAddr(d?.address || null))
      .catch(() => {});
  }, [lat, lng]);
  return <span className="text-xs">{addr || `${lat.toFixed(4)}, ${lng.toFixed(4)}`}</span>;
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
  onTripClick,
  externalStopSelect,
  onExternalStopHandled,
  externalEventSelect,
  onExternalEventHandled,
  onStopsDetected,
  onEventsDetected,
}) => {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [isBottomPanelOpen, setIsBottomPanelOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('STATS');
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  // Trajets depuis le serveur (source unique)
  const [serverTrips, setServerTrips] = useState<any[]>([]);
  const [serverTripsLoading, setServerTripsLoading] = useState(false);

  useEffect(() => {
    if (!selectedVehicle?.id) return;
    setServerTripsLoading(true);
    const startDate = dateRange.start.toISOString();
    const endDate = dateRange.end.toISOString();
    fetch(`${API_URL}/fleet/vehicles/${selectedVehicle.id}/trips?startDate=${startDate}&endDate=${endDate}`, {
      headers: getHeaders(),
    })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setServerTrips(Array.isArray(data) ? data : []))
      .catch(() => setServerTrips([]))
      .finally(() => setServerTripsLoading(false));
  }, [selectedVehicle?.id, dateRange.start.toISOString(), dateRange.end.toISOString()]);

  // Réagir aux sélections depuis la carte (clic sur marqueur stop/idle/alerte)
  useEffect(() => {
    if (!externalStopSelect) return;
    setActiveTab(externalStopSelect.tab);
    setSelectedRowId(externalStopSelect.stop.id);
    setIsBottomPanelOpen(true);
    onExternalStopHandled?.();
  }, [externalStopSelect]);

  useEffect(() => {
    if (!externalEventSelect) return;
    setActiveTab('EVENTS');
    setSelectedRowId(externalEventSelect.id);
    setIsBottomPanelOpen(true);
    onExternalEventHandled?.();
  }, [externalEventSelect]);
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

  // filteredHistory = données filtrées anti-drift pour l'affichage carte uniquement (polyline, marqueurs)
  // Pour les stats et la détection d'arrêts, on utilise `history` brut = même source que VehicleDetailPanel
  const filteredHistory = useMemo(() => filterDriftGPS(history), [history]);

  // Phase 5 chantier géoloc 360 — stats depuis le backend (source unique serveur).
  // Remplace les anciens appels directs à computeVehicleStats() qui recalculaient
  // côté client (violation règle CLAUDE.md "calculs source serveur uniquement").
  // Le hook fait le fallback client tout seul si l'endpoint est down.
  const { stats: replayStats } = useVehicleStats(
    selectedVehicle ? { id: selectedVehicle.id, status: selectedVehicle.status ?? '' } : null,
    {
      period: { start: dateRange.start, end: dateRange.end },
      enabled: history.length >= 2,
    }
  );

  // Filter vehicles based on search (name or client)
  const filteredVehicles = useMemo(() => {
    if (!vehicleSearch.trim()) return vehicles;
    const search = vehicleSearch.toLowerCase();
    return vehicles.filter(
      (v) => v.name.toLowerCase().includes(search) || (v.client && v.client.toLowerCase().includes(search))
    );
  }, [vehicles, vehicleSearch]);

  // Group vehicles by client
  const vehiclesByClient = useMemo(() => {
    const groups: Record<string, Vehicle[]> = {};
    filteredVehicles.forEach((v) => {
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
        // end = new Date() déjà initialisé → heure actuelle, pas 23:59:59
        break;
      case 'YESTERDAY':
        start.setDate(now.getDate() - 1);
        start.setHours(0, 0, 0, 0);
        end.setDate(now.getDate() - 1);
        end.setHours(23, 59, 59, 999);
        break;
      case 'THIS_WEEK': {
        const day = now.getDay() || 7;
        start.setDate(now.getDate() - day + 1);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      }
      case 'LAST_WEEK': {
        const currentDay = now.getDay() || 7;
        start.setDate(now.getDate() - currentDay - 6);
        start.setHours(0, 0, 0, 0);
        end.setDate(now.getDate() - currentDay);
        end.setHours(23, 59, 59, 999);
        break;
      }
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
    { id: 'STATS', label: t('map.replay.summary'), icon: TrendingUp },
    { id: 'STOPS', label: t('map.replay.stops'), icon: MapPin },
    { id: 'TRIPS', label: t('map.replay.trips'), icon: Navigation },
    { id: 'EVENTS', label: t('map.replay.events'), icon: AlertCircle },
    { id: 'SPEED', label: t('map.replay.speed'), icon: Gauge },
    { id: 'FUEL', label: t('map.replay.fuel'), icon: Fuel },
    { id: 'IDLE', label: t('map.replay.idle'), icon: PauseCircle },
  ];

  // Calculate stops and idle periods from history
  // STOP  = engine off (ignition=false) + speed=0 for > 2 min
  // IDLE  = engine on  (ignition=true)  + speed=0 for > 1 min
  // When ignition is unknown (null), use speed-only: treat as STOP
  const stops = useMemo<StopEvent[]>(() => {
    if (!history || history.length < 2) return [];

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
      const type: 'STOP' | 'IDLE' = ign === false ? 'STOP' : ign === true ? 'IDLE' : duration >= 15 ? 'STOP' : 'IDLE'; // null/unknown: long pause = STOP, short = IDLE
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

    for (let i = 0; i < history.length; i++) {
      const point = history[i];
      const speed = point.speed || 0;
      if (speed < 2) {
        if (!stopStart) stopStart = point;
      } else {
        flush(point);
      }
    }
    // Handle last segment still stopped
    // Si le dernier point est aujourd'hui et que le véhicule est toujours arrêté → utiliser now comme fin (comme VehicleDetailPanel)
    if (stopStart && history.length > 0) {
      const lastPoint = history[history.length - 1];
      const lastTs = new Date(lastPoint.timestamp || lastPoint.time);
      const now = new Date();
      const isToday = lastTs.toDateString() === now.toDateString();
      const cappedNow = isToday ? new Date(Math.min(now.getTime(), lastTs.getTime() + 30 * 60 * 1000)) : lastTs;
      // Synthetic end point with capped now
      flush({ ...lastPoint, timestamp: cappedNow.toISOString(), time: cappedNow.toISOString() });
    }

    return detectedStops;
  }, [history]);

  // Calculate speeding events (speed > maxSpeed for > 10 seconds)
  const speedingEvents = useMemo<SpeedEvent[]>(() => {
    if (!history || history.length < 2) return [];

    const MAX_SPEED = selectedVehicle?.maxSpeed || 120; // Default max speed
    const events: SpeedEvent[] = [];
    let overSpeedStart: any = null;

    for (let i = 0; i < history.length; i++) {
      const point = history[i];
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

          if (duration >= 10) {
            // At least 10 seconds
            events.push({
              id: `speed_${events.length}`,
              timestamp: startTime,
              speed: overSpeedStart.speed,
              maxAllowed: MAX_SPEED,
              location: overSpeedStart.location || { lat: overSpeedStart.lat, lng: overSpeedStart.lng },
              duration,
            });
          }
          overSpeedStart = null;
        }
      }
    }

    return events;
  }, [history, selectedVehicle]);

  // Calculate trip segments — délimités par les stops, durée = temps de conduite uniquement
  const tripSegments = useMemo<TripSegment[]>(() => {
    if (!history || history.length < 2) return [];

    const getTime = (p: any) => new Date(p.timestamp || p.time).getTime();
    const firstTime = getTime(history[0]);
    const lastTime = getTime(history[history.length - 1]);

    // Construire les fenêtres de conduite : intervalles entre la fin d'un stop et le début du suivant
    const sortedStops = [...stops].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
    const windows: { start: number; end: number }[] = [];
    let cursor = firstTime;
    for (const s of sortedStops) {
      if (s.startTime.getTime() > cursor) {
        windows.push({ start: cursor, end: s.startTime.getTime() });
      }
      cursor = s.endTime.getTime();
    }
    if (cursor < lastTime) windows.push({ start: cursor, end: lastTime });

    return windows
      .map((w, i) => {
        const pts = history.filter((p) => {
          const t = getTime(p);
          return t >= w.start && t <= w.end;
        });
        if (pts.length < 2) return null;

        let distance = 0,
          maxSpeed = 0,
          speedSum = 0,
          speedCount = 0;
        let segDrivingMs = 0;
        const SEG_SPEED_THRESHOLD = 2;
        const SEG_MAX_GAP_MS = 5 * 60 * 1000;
        for (let j = 1; j < pts.length; j++) {
          const prevLoc = pts[j - 1].location || { lat: pts[j - 1].lat, lng: pts[j - 1].lng };
          const currLoc = pts[j].location || { lat: pts[j].lat, lng: pts[j].lng };
          if (prevLoc && currLoc) distance += calculateDistance(prevLoc.lat, prevLoc.lng, currLoc.lat, currLoc.lng);
          const spd = pts[j].speed || 0;
          const prevSpd = pts[j - 1].speed || 0;
          if (spd > maxSpeed) maxSpeed = spd;
          if (spd > 0) {
            speedSum += spd;
            speedCount++;
          }
          const dt = getTime(pts[j]) - getTime(pts[j - 1]);
          if ((prevSpd > SEG_SPEED_THRESHOLD || spd > SEG_SPEED_THRESHOLD) && dt < SEG_MAX_GAP_MS) {
            segDrivingMs += dt;
          }
        }
        if (distance < 0.1) return null;

        // Durée = temps effectivement en mouvement dans ce segment
        const duration = segDrivingMs > 0 ? segDrivingMs / 60000 : (w.end - w.start) / 60000;
        return {
          id: `trip_${i}`,
          startTime: new Date(w.start),
          endTime: new Date(w.end),
          startLocation: pts[0].location || { lat: pts[0].lat, lng: pts[0].lng },
          endLocation: pts[pts.length - 1].location || { lat: pts[pts.length - 1].lat, lng: pts[pts.length - 1].lng },
          distance,
          duration,
          avgSpeed: speedCount > 0 ? speedSum / speedCount : 0,
          maxSpeed,
        } as TripSegment;
      })
      .filter((s): s is TripSegment => s !== null);
  }, [history, stops]);

  // Calculate overall trip statistics — depuis le hook useVehicleStats (backend).
  const tripStats = useMemo<TripStats>(() => {
    const now = new Date();
    const periodEnd = dateRange.end > now ? now : dateRange.end;
    const totalDuration = (periodEnd.getTime() - dateRange.start.getTime()) / 60000;
    if (!replayStats || history.length < 2) {
      return {
        totalDistance: 0,
        totalDuration: 0,
        drivingTime: 0,
        stoppedTime: 0,
        idleTime: 0,
        avgSpeed: 0,
        maxSpeed: 0,
        stopCount: stops.length,
        speedingEvents: speedingEvents.length,
      };
    }
    return {
      totalDistance: replayStats.totalDistance,
      totalDuration,
      drivingTime: replayStats.movingMs / 60000,
      stoppedTime: replayStats.stoppedMs / 60000,
      idleTime: replayStats.idleMs / 60000,
      avgSpeed: replayStats.avgSpeed,
      maxSpeed: replayStats.maxSpeed,
      stopCount: stops.length,
      speedingEvents: speedingEvents.length,
    };
  }, [replayStats, history.length, stops, speedingEvents, dateRange]);

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
    return filteredHistory
      .filter((_, i) => i % step === 0)
      .map((h) => ({
        time: new Date(h.timestamp || h.time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        speed: h.speed || 0,
        fuel: h.fuelLevel || 0,
        ignition: h.ignition ? 100 : 0, // Scale to 0-100 for chart visibility
        maxSpeed: selectedVehicle?.maxSpeed || 120,
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
          delta,
        });
      }

      // Detect suspicious loss (fuel drop > threshold in short time without engine running long)
      if (delta < LOSS_THRESHOLD && duration < 30) {
        // Rapid drop in < 30 min
        events.push({
          id: `loss_${events.length}`,
          type: 'LOSS',
          timestamp: currTime,
          location: curr.location || { lat: curr.lat, lng: curr.lng },
          fuelBefore: prevFuel,
          fuelAfter: currFuel,
          delta,
          duration,
        });
      }
    }

    return events;
  }, [filteredHistory]);

  // Carburant consommé = (premier niveau - dernier niveau) + somme des recharges
  const fuelConsumed = useMemo<number | null>(() => {
    const withFuel = filteredHistory.filter((h) => h.fuelLevel != null && h.fuelLevel > 0);
    if (withFuel.length < 2) return null;
    const first = withFuel[0].fuelLevel as number;
    const last = withFuel[withFuel.length - 1].fuelLevel as number;
    const totalRefill = fuelEvents.filter((e) => e.type === 'REFILL').reduce((s, e) => s + e.delta, 0);
    return Math.max(0, first - last + totalRefill);
  }, [filteredHistory, fuelEvents]);

  // Niveau de carburant actuel (dernier point avec donnée)
  const currentFuelLevel = useMemo<number | null>(() => {
    const withFuel = filteredHistory.filter((h) => h.fuelLevel != null && h.fuelLevel > 0);
    return withFuel.length > 0 ? (withFuel[withFuel.length - 1].fuelLevel as number) : null;
  }, [filteredHistory]);

  // Coupures GPS — dérivées du hook useVehicleStats (backend source unique).
  // Note : l'ancien calcul utilisait filteredHistory (anti-drift) alors que
  // tripStats utilisait history brut. Cet alignement sur le backend fait
  // disparaître cette incohérence (le backend travaille sur les positions brutes
  // stockées).
  const { offlineGaps, offlineTimeMin } = useMemo(() => {
    if (!replayStats) return { offlineGaps: 0, offlineTimeMin: 0 };
    return { offlineGaps: replayStats.offlineGaps, offlineTimeMin: replayStats.offlineMs / 60000 };
  }, [replayStats]);

  // Export screenshot
  const handleExportVideo = useCallback(async () => {
    setIsExporting(true);

    try {
      const html2canvas = await loadHtml2Canvas();
      const canvas = await html2canvas(document.body, {
        useCORS: true,
        allowTaint: true,
        scale: 1,
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
      showToast(t('map.replay.noHistoryToExport'), 'warning');
      return;
    }

    const points = history.map((point) => ({
      lat: point.location.lat,
      lng: point.location.lng,
      timestamp: point.timestamp,
      speed: point.speed,
      heading: point.heading,
    }));

    const trackName = `${selectedVehicle?.name || 'Vehicle'} - ${dateRange.start.toLocaleDateString('fr-FR')}`;
    const gpxContent = exportToGPX(points, trackName, selectedVehicle?.name || 'Vehicle');

    const filename = `${selectedVehicle?.name || 'vehicle'}_${dateRange.start.toISOString().split('T')[0]}.gpx`;
    downloadFile(gpxContent, filename, 'application/gpx+xml');
  }, [history, selectedVehicle, dateRange, t]);

  // Export to KML
  const handleExportKML = useCallback(() => {
    if (!history || history.length === 0) {
      showToast(t('map.replay.noHistoryToExport'), 'warning');
      return;
    }

    const points = history.map((point) => ({
      lat: point.location.lat,
      lng: point.location.lng,
      timestamp: point.timestamp,
      speed: point.speed,
      heading: point.heading,
    }));

    const trackName = `${selectedVehicle?.name || 'Vehicle'} - ${dateRange.start.toLocaleDateString('fr-FR')}`;
    const kmlContent = exportToKML(points, trackName, selectedVehicle?.name || 'Vehicle');

    const filename = `${selectedVehicle?.name || 'vehicle'}_${dateRange.start.toISOString().split('T')[0]}.kml`;
    downloadFile(kmlContent, filename, 'application/vnd.google-earth.kml+xml');
  }, [history, selectedVehicle, dateRange, t]);

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      className="absolute inset-0 pointer-events-none z-[1000] flex flex-col justify-between print:relative print:z-0"
    >
      {/* TOP TOOLBAR */}
      <div className="pointer-events-auto bg-[var(--bg-elevated)]/95 backdrop-blur-sm shadow-md p-4 m-4 rounded-lg border border-[var(--border)] flex flex-wrap items-center gap-4 justify-between print:hidden">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="p-2 hover:bg-[var(--bg-elevated)] rounded-full transition-colors text-[var(--text-secondary)]"
            title="Quitter le mode Replay"
          >
            <X size={20} />
          </button>

          {/* Vehicle Selector with Search */}
          <div className="relative border-r border-[var(--border)] pr-4">
            <div
              className="flex items-center gap-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg px-3 py-2 cursor-pointer min-w-[250px]"
              onClick={() => setIsVehicleDropdownOpen(!isVehicleDropdownOpen)}
            >
              <Search size={16} className="text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder={t('map.replay.searchPlaceholder')}
                value={vehicleSearch}
                onChange={(e) => {
                  setVehicleSearch(e.target.value);
                  setIsVehicleDropdownOpen(true);
                }}
                onClick={(e) => e.stopPropagation()}
                className="bg-transparent border-none text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] flex-1"
              />
              {selectedVehicle && !vehicleSearch && (
                <span className="text-sm font-medium text-[var(--text-primary)]">{selectedVehicle.name}</span>
              )}
            </div>

            {isVehicleDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-[350px] bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg shadow-xl z-50 max-h-[400px] overflow-y-auto">
                {Object.entries(vehiclesByClient).length === 0 ? (
                  <div className="p-4 text-center text-[var(--text-secondary)] text-sm">
                    {t('map.replay.noVehicleFound')}
                  </div>
                ) : (
                  Object.entries(vehiclesByClient).map(([client, clientVehicles]) => (
                    <div key={client}>
                      <div className="px-3 py-2 bg-[var(--bg-elevated)] text-xs font-semibold text-[var(--text-secondary)] uppercase sticky top-0">
                        {client} ({clientVehicles.length})
                      </div>
                      {clientVehicles.map((v) => (
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
                            <p className="text-sm font-medium text-[var(--text-primary)]">{v.name}</p>
                            <p className="text-xs text-[var(--text-secondary)]">{v.plate || 'N/A'}</p>
                          </div>
                          <span
                            className={`w-2 h-2 rounded-full ${v.status === 'MOVING' ? 'bg-green-500' : v.status === 'IDLE' ? 'bg-orange-500' : 'bg-[var(--text-secondary)]'}`}
                          ></span>
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
              <Calendar size={16} className="text-[var(--text-secondary)]" />
              <select
                value={periodPreset}
                onChange={(e) => setPeriodPreset(e.target.value as PeriodPreset)}
                className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg text-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                title={t('map.replay.period')}
              >
                {Object.entries(PERIOD_PRESETS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {periodPreset === 'CUSTOM' && (
              <div className="flex items-center gap-2 bg-[var(--bg-elevated)] px-3 py-1.5 rounded-md border border-[var(--border)]">
                <input
                  type="date"
                  className="bg-transparent border-none text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  value={dateRange.start.toISOString().split('T')[0]}
                  onChange={(e) => {
                    const date = new Date(e.target.value);
                    date.setHours(0, 0, 0, 0);
                    onDateRangeChange({ ...dateRange, start: date });
                  }}
                  title={t('map.replay.startDate')}
                />
                <span className="text-[var(--text-muted)]">-</span>
                <input
                  type="date"
                  className="bg-transparent border-none text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  value={dateRange.end.toISOString().split('T')[0]}
                  onChange={(e) => {
                    const date = new Date(e.target.value);
                    const today = new Date();
                    const isToday = date.toDateString() === today.toDateString();
                    if (isToday) {
                      date.setHours(today.getHours(), today.getMinutes(), today.getSeconds(), 0);
                    } else {
                      date.setHours(23, 59, 59, 999);
                    }
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
            className="p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] rounded-md transition-colors"
            title="Imprimer le rapport"
          >
            <Printer size={18} />
          </button>
          <button
            className="p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] rounded-md transition-colors"
            title="Partager"
          >
            <Share2 size={18} />
          </button>
        </div>
      </div>

      {/* BOTTOM PANEL */}
      <div className="pointer-events-auto w-full flex flex-col print:m-0">
        {/* Playback Controls — centrés avec marges latérales */}
        <div className="flex flex-col items-center px-4 mb-2">
          <div className="bg-[var(--bg-elevated)] shadow-lg rounded-full px-6 py-2 mb-2 flex items-center gap-6 border border-[var(--border)] print:hidden">
            <button
              className="text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors"
              onClick={() => onProgressChange(Math.max(0, progress - 10))}
              title={t('map.replay.back10')}
            >
              <Rewind size={20} />
            </button>
            <button
              className={`w-10 h-10 rounded-full flex items-center justify-center text-white transition-colors ${isPlaying ? 'bg-amber-500 hover:bg-amber-600' : 'bg-[var(--primary)] hover:bg-[var(--primary-light)]'}`}
              onClick={onPlayPause}
              title={isPlaying ? 'Pause' : 'Lecture'}
            >
              {isPlaying ? (
                <Pause size={20} fill="currentColor" />
              ) : (
                <Play size={20} fill="currentColor" className="ml-1" />
              )}
            </button>
            <button
              className="text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors"
              onClick={() => onProgressChange(Math.min(100, progress + 10))}
              title={t('map.replay.forward10')}
            >
              <FastForward size={20} />
            </button>
            <div className="h-4 w-px bg-[var(--border)] mx-2"></div>
            <div className="flex items-center gap-1" title={t('map.replay.playbackSpeed')}>
              {[1, 2, 5, 10, 20].map((s) => (
                <button
                  key={s}
                  onClick={() => onSpeedChange(s)}
                  className={`px-2 py-0.5 rounded text-xs font-bold border transition-colors ${
                    playbackSpeed === s
                      ? 'bg-[var(--primary)] text-white border-[var(--primary)]'
                      : 'bg-transparent text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--primary)] hover:text-[var(--primary)]'
                  }`}
                >
                  {s}×
                </button>
              ))}
            </div>
            <div className="h-4 w-px bg-[var(--border)] mx-2"></div>
            <div className="text-sm font-mono font-bold text-[var(--text-primary)] min-w-[60px] text-center">
              {currentTime}
            </div>
            {/* Scrubable progress bar */}
            <div
              className="relative flex-1 min-w-[80px] max-w-[200px] h-5 flex items-center cursor-pointer"
              title={`${progress.toFixed(0)}%`}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                onProgressChange(Math.round(ratio * 100));
              }}
            >
              <div className="w-full h-2 bg-[var(--border)] rounded-full relative">
                <div
                  className="h-full bg-[var(--primary)] rounded-full transition-all duration-100"
                  style={{ width: `${progress}%` }}
                />
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-[var(--primary)] rounded-full border-2 border-white shadow"
                  style={{ left: `calc(${progress}% - 6px)` }}
                />
              </div>
            </div>
            <span className="text-xs font-mono text-[var(--text-secondary)] min-w-[32px] text-right">
              {progress.toFixed(0)}%
            </span>
          </div>

          {/* Speed Legend */}
          <div className="flex items-center justify-center gap-5 py-1.5 text-xs text-[var(--text-muted)] print:hidden">
            {(
              [
                { color: '#6b7280', label: '< 10 km/h' },
                { color: '#22c55e', label: '10–50 km/h' },
                { color: '#f97316', label: '50–90 km/h' },
                { color: '#ef4444', label: '> 90 km/h' },
              ] as const
            ).map((item) => (
              <div key={item.label} className="flex items-center gap-1.5">
                <span style={{ backgroundColor: item.color }} className="inline-block w-5 h-1.5 rounded" />
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
        {/* fin wrapper centré */}

        {/* Data Panel — pleine largeur, colle aux bords */}
        <div
          className={`w-full bg-[var(--bg-elevated)] shadow-[0_-4px_20px_rgba(0,0,0,0.1)] border-t border-[var(--border)] transition-all duration-300 ease-in-out flex flex-col print:shadow-none print:border-0 ${isBottomPanelOpen ? 'h-80' : 'h-12'}`}
        >
          {/* Tabs */}
          <div
            className="flex items-center justify-between px-4 border-b border-[var(--border)] h-12 shrink-0 cursor-pointer print:cursor-default"
            onClick={() => setIsBottomPanelOpen(!isBottomPanelOpen)}
          >
            <div className="flex items-center gap-1 h-full" onClick={(e) => e.stopPropagation()}>
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setIsBottomPanelOpen(true);
                  }}
                  className={`flex items-center gap-2 px-4 h-full border-b-2 transition-colors text-sm font-medium ${
                    activeTab === tab.id
                      ? 'border-[var(--primary)] text-[var(--primary)] bg-[var(--primary-dim)]/50'
                      : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
                  }`}
                >
                  <tab.icon size={16} />
                  {tab.label}
                  {tab.id === 'STOPS' && stops.filter((s) => s.type === 'STOP').length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 text-xs bg-[var(--primary-dim)] text-[var(--primary)] rounded-full">
                      {stops.filter((s) => s.type === 'STOP').length}
                    </span>
                  )}
                  {tab.id === 'TRIPS' && tripSegments.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 text-xs bg-[var(--primary-dim)] text-[var(--primary)] rounded-full">
                      {tripSegments.length}
                    </span>
                  )}
                  {tab.id === 'IDLE' && stops.filter((s) => s.type === 'IDLE').length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 text-xs bg-orange-100 text-orange-600 rounded-full">
                      {stops.filter((s) => s.type === 'IDLE').length}
                    </span>
                  )}
                  {tab.id === 'EVENTS' && speedingEvents.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 text-xs bg-red-100 text-red-600 rounded-full">
                      {speedingEvents.length}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <button
              className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] print:hidden"
              title={t('map.replay.collapseToggle')}
            >
              {isBottomPanelOpen ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden bg-[var(--bg-elevated)]/50">
            {/* STATS TAB — 3 colonnes verticales pleine largeur */}
            {activeTab === 'STATS' && (
              <div className="grid grid-cols-3 divide-x divide-[var(--border)] h-full">
                {/* Colonne 1 — Trajet */}
                <div className="flex flex-col overflow-y-auto px-4 py-3">
                  <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] mb-3">
                    {t('map.replay.tripSection')}
                  </p>
                  <StatRow
                    icon={Route}
                    label={t('map.replay.distance')}
                    value={`${tripStats.totalDistance.toFixed(1)} km`}
                    color="blue"
                  />
                  <StatRow
                    icon={Navigation}
                    label={t('map.replay.drivingTime')}
                    value={formatDuration(tripStats.drivingTime)}
                    color="green"
                  />
                  <StatRow
                    icon={StopCircle}
                    label={t('map.replay.idleTime')}
                    value={formatDuration(tripStats.stoppedTime)}
                    color="red"
                  />
                  <StatRow
                    icon={PauseCircle}
                    label={t('map.replay.idleTimeRow')}
                    value={formatDuration(tripStats.idleTime)}
                    color="orange"
                  />
                  <StatRow
                    icon={WifiOff}
                    label={t('map.replay.offlineTime')}
                    value={formatDuration(offlineTimeMin)}
                    color="gray"
                  />
                </div>

                {/* Colonne 2 — Vitesse & Alertes */}
                <div className="flex flex-col overflow-y-auto px-4 py-3">
                  <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] mb-3">
                    {t('map.replay.speedAlertsSection')}
                  </p>
                  <StatRow
                    icon={Gauge}
                    label={t('map.replay.avgSpeed')}
                    value={`${tripStats.avgSpeed.toFixed(0)} km/h`}
                    color="cyan"
                  />
                  <StatRow
                    icon={Zap}
                    label={t('map.replay.maxSpeed')}
                    value={`${tripStats.maxSpeed.toFixed(0)} km/h`}
                    color={tripStats.maxSpeed > (selectedVehicle?.maxSpeed || 120) ? 'red' : 'green'}
                  />
                  <StatRow
                    icon={MapPin}
                    label={t('map.replay.stopsDetected')}
                    value={`${tripStats.stopCount}`}
                    color="blue"
                  />
                  <StatRow
                    icon={AlertCircle}
                    label={t('map.replay.speeding')}
                    value={`${tripStats.speedingEvents}`}
                    color={tripStats.speedingEvents > 0 ? 'red' : 'green'}
                  />
                  <StatRow
                    icon={WifiOff}
                    label={t('map.replay.gpsOutages')}
                    value={`${offlineGaps}`}
                    color={offlineGaps > 0 ? 'red' : 'green'}
                  />
                </div>

                {/* Colonne 3 — Carburant */}
                <div className="flex flex-col overflow-y-auto px-4 py-3">
                  <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] mb-3">
                    {t('map.replay.fuelSection')}
                  </p>
                  <StatRow
                    icon={Fuel}
                    label={t('map.replay.consumed')}
                    value={fuelConsumed != null ? `${fuelConsumed.toFixed(1)}%` : '–'}
                    color="purple"
                  />
                  <StatRow
                    icon={Droplets}
                    label={t('map.replay.currentLevel')}
                    value={currentFuelLevel != null ? `${currentFuelLevel.toFixed(0)}%` : '–'}
                    color={currentFuelLevel != null && currentFuelLevel < 20 ? 'red' : 'green'}
                  />
                  <StatRow
                    icon={TrendingDown}
                    label={t('map.replay.suspiciousDrops')}
                    value={`${fuelEvents.filter((e) => e.type === 'LOSS').length}`}
                    color={fuelEvents.some((e) => e.type === 'LOSS') ? 'red' : 'green'}
                  />
                  <StatRow
                    icon={TrendingUp}
                    label={t('map.replay.refills')}
                    value={`${fuelEvents.filter((e) => e.type === 'REFILL').length}`}
                    color="blue"
                  />
                </div>
              </div>
            )}

            {/* STOPS TAB — uniquement les arrêts moteur (STOP), pas les ralentis */}
            {activeTab === 'STOPS' &&
              (() => {
                const stopOnly = stops.filter((s) => s.type === 'STOP');
                return (
                  <div className="h-full overflow-y-auto">
                    {stopOnly.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-[var(--text-secondary)]">
                        <div className="text-center">
                          <MapPin className="w-12 h-12 mx-auto mb-2 opacity-30" />
                          <p>{t('map.replay.noStopsDetected')}</p>
                          <p className="text-sm text-[var(--text-muted)]">{t('map.replay.noStopsHint')}</p>
                        </div>
                      </div>
                    ) : (
                      <table className="w-full text-sm text-left">
                        <thead className="text-xs text-[var(--text-secondary)] uppercase bg-[var(--bg-elevated)]/50 sticky top-0">
                          <tr>
                            <th className="px-4 py-2">#</th>
                            <th className="px-4 py-2">{t('map.replay.timeStart')}</th>
                            <th className="px-4 py-2">{t('map.replay.timeEnd')}</th>
                            <th className="px-4 py-2">{t('map.replay.duration')}</th>
                            <th className="px-4 py-2">{t('map.replay.position')}</th>
                            <th className="px-4 py-2">{t('map.replay.actions')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border)] bg-[var(--bg-surface)]">
                          {stopOnly.map((stop, index) => (
                            <tr
                              key={stop.id}
                              className={`cursor-pointer transition-colors ${
                                selectedRowId === stop.id
                                  ? 'bg-[var(--primary-dim)] border-l-4 border-l-[var(--primary)]'
                                  : 'hover:bg-[var(--primary-dim)]/40'
                              }`}
                              onClick={() => {
                                setSelectedRowId(stop.id);
                                onStopClick?.(stop);
                              }}
                            >
                              <td className="px-4 py-2 font-medium text-[var(--text-primary)]">{index + 1}</td>
                              <td className="px-4 py-2">
                                {stop.startTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                              </td>
                              <td className="px-4 py-2">
                                {stop.endTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                              </td>
                              <td className="px-4 py-2">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${stop.duration > 30 ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}
                                >
                                  {formatDuration(stop.duration)}
                                </span>
                              </td>
                              <td className="px-4 py-2 text-[var(--text-secondary)]">
                                <GeocodedCell lat={stop.location.lat} lng={stop.location.lng} address={stop.address} />
                              </td>
                              <td className="px-4 py-2">
                                <span
                                  className={`text-xs font-medium ${selectedRowId === stop.id ? 'text-[var(--primary)]' : 'text-[var(--text-muted)]'}`}
                                >
                                  {selectedRowId === stop.id ? t('map.replay.onMap') : t('map.replay.clickAction')}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                );
              })()}

            {/* TRIPS TAB */}
            {activeTab === 'TRIPS' && (
              <div className="h-full overflow-y-auto px-3 py-2 space-y-2">
                {serverTripsLoading ? (
                  <div className="h-full flex items-center justify-center text-[var(--text-secondary)]">
                    <div className="text-center">
                      <div className="animate-spin w-6 h-6 border-2 border-[var(--primary)] border-t-transparent rounded-full mx-auto mb-2" />
                      <p className="text-sm">{t('map.replay.loadingTrips')}</p>
                    </div>
                  </div>
                ) : serverTrips.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-[var(--text-secondary)]">
                    <div className="text-center">
                      <Navigation className="w-12 h-12 mx-auto mb-2 opacity-30" />
                      <p>{t('map.replay.noTrips')}</p>
                    </div>
                  </div>
                ) : (
                  serverTrips.map((trip, index) => {
                    const maxLimit = selectedVehicle?.maxSpeed || 120;
                    const maxOver = trip.max_speed_kmh != null && Number(trip.max_speed_kmh) > maxLimit;
                    const isSelected = selectedRowId === trip.id;
                    const fmtTime = (iso: string | null) =>
                      iso ? new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '–';
                    const fmtDur = (sec: number | null) => {
                      if (!sec) return '–';
                      const m = Math.round(sec / 60);
                      return m < 60 ? `${m} min` : `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}`;
                    };
                    const startAddr =
                      trip.start_address ||
                      (trip.start_lat
                        ? `${Number(trip.start_lat).toFixed(4)}, ${Number(trip.start_lng).toFixed(4)}`
                        : null);
                    const endAddr =
                      trip.end_address ||
                      (trip.end_lat ? `${Number(trip.end_lat).toFixed(4)}, ${Number(trip.end_lng).toFixed(4)}` : null);
                    return (
                      <div
                        key={trip.id ?? index}
                        onClick={() => {
                          const newId = isSelected ? null : trip.id;
                          setSelectedRowId(newId);
                          if (!isSelected && trip.start_lat && trip.start_lng) {
                            onTripClick?.({
                              id: trip.id,
                              startTime: new Date(trip.start_time),
                              endTime: new Date(trip.end_time || trip.start_time),
                              startLocation: { lat: Number(trip.start_lat), lng: Number(trip.start_lng) },
                              endLocation: {
                                lat: Number(trip.end_lat ?? trip.start_lat),
                                lng: Number(trip.end_lng ?? trip.start_lng),
                              },
                              distance: Number(trip.distance_km ?? 0),
                              duration: Number(trip.duration_seconds ?? 0) / 60,
                              avgSpeed: Number(trip.avg_speed_kmh ?? 0),
                              maxSpeed: Number(trip.max_speed_kmh ?? 0),
                            });
                          }
                        }}
                        className={`cursor-pointer rounded-lg border px-3 py-2 transition-all ${
                          isSelected
                            ? 'border-l-4 border-[var(--primary)] bg-[var(--primary-dim)]'
                            : 'border-[var(--border)] bg-[var(--bg-surface)] hover:bg-[var(--primary-dim)]/40'
                        }`}
                      >
                        {/* Ligne 1 : # + heures + durée + stats */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${isSelected ? 'bg-[var(--primary)] text-white' : 'bg-[var(--primary-dim)] text-[var(--primary)]'}`}
                          >
                            {index + 1}
                          </span>
                          <span className="text-sm font-bold text-[var(--text-primary)]">
                            {fmtTime(trip.start_time)} → {fmtTime(trip.end_time)}
                          </span>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full border bg-[var(--bg-elevated)] text-[var(--primary)] border-[var(--border)]">
                            {fmtDur(trip.duration_seconds)}
                          </span>
                          <div className="flex items-center gap-2 ml-auto flex-wrap">
                            {trip.distance_km != null && (
                              <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                                <Route className="w-3 h-3" />
                                {Number(trip.distance_km).toFixed(1)} km
                              </span>
                            )}
                            {trip.avg_speed_kmh != null && (
                              <span className="text-xs text-[var(--text-muted)]">
                                {Math.round(Number(trip.avg_speed_kmh))} km/h moy
                              </span>
                            )}
                            {trip.max_speed_kmh != null && (
                              <span
                                className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${maxOver ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}
                              >
                                {Math.round(Number(trip.max_speed_kmh))} max
                              </span>
                            )}
                          </div>
                        </div>
                        {/* Ligne 2 : Départ → Arrivée */}
                        {(startAddr || endAddr) && (
                          <div className="flex items-start gap-1 mt-1 text-xs text-[var(--text-secondary)] min-w-0">
                            {startAddr && (
                              <span className="truncate flex-1">
                                <span className="font-semibold text-green-600">{t('map.replay.departure')} </span>
                                {startAddr}
                              </span>
                            )}
                            {startAddr && endAddr && <span className="flex-shrink-0">→</span>}
                            {endAddr && (
                              <span className="truncate flex-1 text-right">
                                <span className="font-semibold text-red-500">{t('map.replay.arrival')} </span>
                                {endAddr}
                              </span>
                            )}
                          </div>
                        )}
                        {trip.driver_name && (
                          <p className="text-xs text-[var(--text-muted)] mt-0.5">{trip.driver_name}</p>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* EVENTS TAB */}
            {activeTab === 'EVENTS' && (
              <div className="h-full overflow-y-auto">
                {speedingEvents.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-[var(--text-secondary)]">
                    <div className="text-center">
                      <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-30 text-green-500" />
                      <p className="text-green-600 font-medium">{t('map.replay.noSpeeding')}</p>
                      <p className="text-sm text-[var(--text-muted)]">{t('map.replay.goodDriving')}</p>
                    </div>
                  </div>
                ) : (
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-[var(--text-secondary)] uppercase bg-[var(--bg-elevated)]/50 sticky top-0">
                      <tr>
                        <th className="px-4 py-2">#</th>
                        <th className="px-4 py-2">{t('map.replay.time')}</th>
                        <th className="px-4 py-2">{t('map.replay.speed')}</th>
                        <th className="px-4 py-2">{t('map.replay.limit')}</th>
                        <th className="px-4 py-2">{t('map.replay.excess')}</th>
                        <th className="px-4 py-2">{t('map.replay.duration')}</th>
                        <th className="px-4 py-2">{t('map.replay.actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)] bg-[var(--bg-surface)]">
                      {speedingEvents.map((event, index) => (
                        <tr
                          key={event.id}
                          className={`cursor-pointer transition-colors ${
                            selectedRowId === event.id
                              ? 'bg-red-50 dark:bg-red-900/30 border-l-4 border-l-red-500'
                              : 'hover:bg-red-50/50 dark:hover:bg-red-900/20'
                          }`}
                          onClick={() => {
                            setSelectedRowId(event.id);
                            onEventClick?.(event);
                          }}
                        >
                          <td className="px-4 py-2 font-medium text-[var(--text-primary)]">{index + 1}</td>
                          <td className="px-4 py-2">
                            {event.timestamp.toLocaleTimeString('fr-FR', {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </td>
                          <td className="px-4 py-2">
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                              {event.speed.toFixed(0)} km/h
                            </span>
                          </td>
                          <td className="px-4 py-2">{event.maxAllowed} km/h</td>
                          <td className="px-4 py-2 font-medium text-red-600">
                            +{(event.speed - event.maxAllowed).toFixed(0)} km/h
                          </td>
                          <td className="px-4 py-2">{event.duration.toFixed(0)}s</td>
                          <td className="px-4 py-2">
                            <button className="text-[var(--primary)] hover:text-[var(--primary)] text-xs font-medium">
                              Voir sur carte
                            </button>
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
              <div className="h-full w-full bg-[var(--bg-elevated)] p-2 rounded-lg border border-[var(--border)]">
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                  minHeight={200}
                  minWidth={200}
                  initialDimension={{ width: 200, height: 200 }}
                >
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} />
                    <YAxis stroke="#94a3b8" fontSize={12} domain={[0, 'auto']} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                      formatter={(value: unknown, name: unknown) =>
                        [
                          `${(value as number).toFixed(0)} km/h`,
                          name === 'speed' ? t('map.replay.speed') : t('map.replay.limit'),
                        ] as [string, string]
                      }
                    />
                    <ReferenceLine
                      y={selectedVehicle?.maxSpeed || 120}
                      stroke="#ef4444"
                      strokeDasharray="5 5"
                      label={{ value: t('map.replay.limit'), position: 'right', fill: '#ef4444', fontSize: 12 }}
                    />
                    <Line
                      type="linear"
                      dataKey="speed"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, fill: '#3b82f6' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* FUEL TAB */}
            {activeTab === 'FUEL' && (
              <div className="h-full w-full bg-[var(--bg-elevated)] p-2 rounded-lg border border-[var(--border)] overflow-hidden">
                <div className="h-full flex flex-col">
                  {/* Header with stats and controls */}
                  <div className="flex items-center justify-between mb-2 px-2 flex-wrap gap-2">
                    <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                      <Fuel className="w-4 h-4 text-green-500" />
                      {t('map.replay.fuel')}
                    </h3>

                    {/* Stats */}
                    {chartData.length > 0 && chartData[0].fuel !== undefined && (
                      <div className="flex gap-3 text-xs">
                        <span className="text-[var(--text-secondary)]">
                          {t('map.replay.start')}:{' '}
                          <strong className="text-[var(--text-primary)]">{chartData[0].fuel.toFixed(0)}%</strong>
                        </span>
                        <span className="text-[var(--text-secondary)]">
                          {t('map.replay.end')}:{' '}
                          <strong className="text-[var(--text-primary)]">
                            {chartData[chartData.length - 1]?.fuel?.toFixed(0) || 0}%
                          </strong>
                        </span>
                        <span
                          className={`font-medium ${chartData[0].fuel - (chartData[chartData.length - 1]?.fuel || 0) > 10 ? 'text-red-600' : 'text-green-600'}`}
                        >
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
                          className="w-3.5 h-3.5 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
                        />
                        <Gauge className="w-3.5 h-3.5 text-[var(--primary)]" />
                        <span className="text-[var(--text-secondary)]">{t('map.replay.speed')}</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={showIgnitionOnFuelChart}
                          onChange={(e) => setShowIgnitionOnFuelChart(e.target.checked)}
                          className="w-3.5 h-3.5 rounded border-[var(--border)] text-orange-600 focus:ring-orange-500"
                        />
                        <Key className="w-3.5 h-3.5 text-orange-500" />
                        <span className="text-[var(--text-secondary)]">{t('map.replay.ignition')}</span>
                      </label>
                    </div>
                  </div>

                  {/* Event badges */}
                  {fuelEvents.length > 0 && (
                    <div className="flex gap-2 px-2 mb-2 flex-wrap">
                      {fuelEvents.filter((e) => e.type === 'REFILL').length > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          <Fuel className="w-3 h-3" />
                          {fuelEvents.filter((e) => e.type === 'REFILL').length}{' '}
                          {t(
                            fuelEvents.filter((e) => e.type === 'REFILL').length === 1
                              ? 'map.replay.refillsLabel_one'
                              : 'map.replay.refillsLabel_other'
                          )}
                        </span>
                      )}
                      {fuelEvents.filter((e) => e.type === 'LOSS').length > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                          <TrendingDown className="w-3 h-3" />
                          {fuelEvents.filter((e) => e.type === 'LOSS').length}{' '}
                          {t(
                            fuelEvents.filter((e) => e.type === 'LOSS').length === 1
                              ? 'map.replay.lossesLabel_one'
                              : 'map.replay.lossesLabel_other'
                          )}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Chart */}
                  <div className="flex-1 min-h-0">
                    <ResponsiveContainer
                      width="100%"
                      height="100%"
                      minHeight={200}
                      minWidth={200}
                      initialDimension={{ width: 200, height: 200 }}
                    >
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="fuelGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="ignitionGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f97316" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
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
                          contentStyle={{
                            backgroundColor: '#fff',
                            borderRadius: '8px',
                            border: '1px solid #e2e8f0',
                            fontSize: '12px',
                          }}
                          formatter={(value: unknown, name: unknown) => {
                            const v = value as number;
                            if (name === 'fuel') return [`${v.toFixed(1)}%`, t('map.replay.fuel')] as [string, string];
                            if (name === 'speed')
                              return [`${v.toFixed(0)} km/h`, t('map.replay.speed')] as [string, string];
                            if (name === 'ignition')
                              return [v > 0 ? 'ON' : 'OFF', t('map.replay.ignition')] as [string, string];
                            return [v, name as string] as [number, string];
                          }}
                        />
                        <ReferenceLine
                          yAxisId="fuel"
                          y={20}
                          stroke="#ef4444"
                          strokeDasharray="5 5"
                          label={{
                            value: t('map.replay.reserve'),
                            position: 'insideTopRight',
                            fill: '#ef4444',
                            fontSize: 9,
                          }}
                        />

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
                    <div className="mt-2 border-t border-[var(--border)] pt-2 max-h-32 overflow-y-auto">
                      <table className="w-full text-xs">
                        <thead className="text-[var(--text-secondary)] uppercase bg-[var(--bg-elevated)]">
                          <tr>
                            <th className="px-2 py-1 text-left">{t('map.replay.type')}</th>
                            <th className="px-2 py-1 text-left">{t('map.replay.time')}</th>
                            <th className="px-2 py-1 text-left">{t('map.replay.before')}</th>
                            <th className="px-2 py-1 text-left">{t('map.replay.after')}</th>
                            <th className="px-2 py-1 text-left">Δ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border)]">
                          {fuelEvents.map((event) => (
                            <tr
                              key={event.id}
                              className={`hover:bg-[var(--bg-elevated)] ${event.type === 'LOSS' ? 'bg-red-50/50' : 'bg-green-50/50'}`}
                            >
                              <td className="px-2 py-1">
                                <span
                                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${
                                    event.type === 'REFILL' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                  }`}
                                >
                                  {event.type === 'REFILL' ? (
                                    <Fuel className="w-3 h-3" />
                                  ) : (
                                    <TrendingDown className="w-3 h-3" />
                                  )}
                                  {event.type === 'REFILL' ? t('map.replay.refillShort') : t('map.replay.lossShort')}
                                </span>
                              </td>
                              <td className="px-2 py-1 text-[var(--text-secondary)]">
                                {event.timestamp.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                              </td>
                              <td className="px-2 py-1 text-[var(--text-secondary)]">{event.fuelBefore.toFixed(0)}%</td>
                              <td className="px-2 py-1 text-[var(--text-secondary)]">{event.fuelAfter.toFixed(0)}%</td>
                              <td
                                className={`px-2 py-1 font-medium ${event.delta > 0 ? 'text-green-600' : 'text-red-600'}`}
                              >
                                {event.delta > 0 ? '+' : ''}
                                {event.delta.toFixed(1)}%
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
                  const idleEvents = stops.filter((s) => s.type === 'IDLE');
                  const totalIdleTime = tripStats.idleTime;
                  return idleEvents.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-[var(--text-secondary)]">
                      <div className="text-center">
                        <PauseCircle className="w-12 h-12 mx-auto mb-2 opacity-30 text-green-500" />
                        <p className="text-green-600 font-medium">{t('map.replay.noIdle')}</p>
                        <p className="text-sm text-[var(--text-muted)]">{t('map.replay.idleDescription')}</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <PauseCircle className="w-8 h-8 text-orange-500" />
                          <div>
                            <p className="text-sm font-medium text-orange-700">{t('map.replay.totalIdleTime')}</p>
                            <p className="text-xs text-orange-600">{t('map.replay.idleSubtitle')}</p>
                          </div>
                        </div>
                        <p className="text-2xl font-bold text-orange-700">{formatDuration(totalIdleTime)}</p>
                      </div>
                      <table className="w-full text-sm text-left">
                        <thead className="text-xs text-[var(--text-secondary)] uppercase bg-[var(--bg-elevated)] sticky top-0">
                          <tr>
                            <th className="px-4 py-2">#</th>
                            <th className="px-4 py-2">{t('map.replay.timeStart')}</th>
                            <th className="px-4 py-2">{t('map.replay.timeEnd')}</th>
                            <th className="px-4 py-2">{t('map.replay.duration')}</th>
                            <th className="px-4 py-2">{t('map.replay.position')}</th>
                            <th className="px-4 py-2">{t('map.replay.map')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border)] bg-[var(--bg-elevated)]">
                          {idleEvents.map((event, index) => (
                            <tr
                              key={event.id}
                              className={`cursor-pointer transition-colors ${
                                selectedRowId === event.id
                                  ? 'bg-orange-50 dark:bg-orange-900/20 border-l-4 border-l-orange-500'
                                  : 'hover:bg-orange-50/50'
                              }`}
                              onClick={() => {
                                setSelectedRowId(event.id);
                                onStopClick?.(event);
                              }}
                            >
                              <td className="px-4 py-2 font-medium text-[var(--text-primary)]">{index + 1}</td>
                              <td className="px-4 py-2">
                                {event.startTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                              </td>
                              <td className="px-4 py-2">
                                {event.endTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                              </td>
                              <td className="px-4 py-2">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${event.duration > 15 ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}
                                >
                                  {formatDuration(event.duration)}
                                </span>
                              </td>
                              <td className="px-4 py-2 text-[var(--text-secondary)] text-xs">
                                {event.address || `${event.location.lat.toFixed(4)}, ${event.location.lng.toFixed(4)}`}
                              </td>
                              <td className="px-4 py-2">
                                <span
                                  className={`text-xs font-medium ${selectedRowId === event.id ? 'text-orange-600' : 'text-[var(--text-muted)]'}`}
                                >
                                  {selectedRowId === event.id ? t('map.replay.onMap') : t('map.replay.clickAction')}
                                </span>
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

// Ligne de stat pour l'onglet STATS — label gauche, valeur droite, lisible
const StatRow: React.FC<{
  icon: React.ElementType;
  label: string;
  value: string;
  color: 'blue' | 'purple' | 'green' | 'orange' | 'red' | 'cyan' | 'gray';
}> = ({ icon: Icon, label, value, color }) => {
  const iconColor = {
    blue: 'text-[var(--primary)]',
    purple: 'text-purple-500',
    green: 'text-green-500',
    orange: 'text-orange-500',
    red: 'text-red-500',
    cyan: 'text-cyan-500',
    gray: 'text-gray-400',
  }[color];
  const valueColor = {
    blue: 'text-[var(--primary)]',
    purple: 'text-purple-600',
    green: 'text-green-600',
    orange: 'text-orange-600',
    red: 'text-red-600',
    cyan: 'text-cyan-600',
    gray: 'text-gray-500',
  }[color];
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-[var(--border)]/50 last:border-0">
      <div className="flex items-center gap-2.5">
        <Icon size={16} className={`shrink-0 ${iconColor}`} />
        <span className="text-sm text-[var(--text-secondary)]">{label}</span>
      </div>
      <span className={`text-base font-bold ${valueColor}`}>{value}</span>
    </div>
  );
};
