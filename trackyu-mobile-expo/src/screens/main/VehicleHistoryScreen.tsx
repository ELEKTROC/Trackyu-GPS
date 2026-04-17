/**
 * TrackYu Mobile — Vehicle History / Route Replay
 * v4 — pills km/jour · filtre 50m · heatmap vitesse · stop markers · Chaikin · Replay · tap trajet
 */
import React, { useState, useMemo, useCallback, useRef, useEffect, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  Platform,
  LayoutChangeEvent,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Polyline, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Clock,
  Route,
  Gauge,
  SlidersHorizontal,
  X,
  ParkingSquare,
  Pause,
  Play,
  SkipBack,
  ChevronRight,
} from 'lucide-react-native';
import type { RootStackParamList } from '../../navigation/types';
import vehiclesApi, { type Trip, type VehicleAlert } from '../../api/vehicles';
import { useTheme } from '../../theme';
import { vehicleStatus } from '../../theme/tokens';
import { Image } from 'react-native';
import { MARKER_IMAGES } from '../../assets/markers';
import { getTypeKey } from '../../utils/mapUtils';
import { toISO } from '../../utils/ticketHelpers';

type Props = NativeStackScreenProps<RootStackParamList, 'VehicleHistory'>;
type ThemeType = ReturnType<typeof import('../../theme').useTheme>['theme'];
type Position = {
  latitude: number;
  longitude: number;
  timestamp: string;
  speed?: number;
  heading?: number;
  ignition?: boolean | null;
};
type Coord = { latitude: number; longitude: number };
type StopMarker = { coord: Coord; duration: number; type: 'STOP' | 'IDLE'; startTime: string; endTime: string };
type DailyInfo = { date: string; tripsCount: number; totalDistance: number };

// ── Constants ─────────────────────────────────────────────────────────────────

const DRIFT_FILTER_MAX_SPEED = 2;
const DRIFT_FILTER_MAX_DIST = 50;
const STOP_MIN_DURATION_MS = 2 * 60 * 1000;
const STOP_LONG_DURATION_MS = 15 * 60 * 1000;
const REPLAY_TICK_MS = 200; // interval between animation frames

const SPEED_COLORS = {
  slow: '#9CA3AF',
  normal: '#22C55E',
  fast: '#F59E0B',
  excess: '#EF4444',
} as const;

const REPLAY_SPEEDS = [1, 2, 3, 4, 5, 6];

const SCREEN_H = Dimensions.get('window').height;
const SHEET_COLLAPSED = 140;
const SHEET_HALF = Math.round(SCREEN_H * 0.5);
const SHEET_EXPANDED = Math.round(SCREEN_H * 0.88);

function speedColor(kmh: number): string {
  if (kmh < 10) return SPEED_COLORS.slow;
  if (kmh < 50) return SPEED_COLORS.normal;
  if (kmh < 80) return SPEED_COLORS.fast;
  return SPEED_COLORS.excess;
}

// ── Pure helpers ──────────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function nowTimeStr() {
  return new Date().toTimeString().slice(0, 5);
}

function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function filterDrift(positions: Position[]): Position[] {
  if (positions.length === 0) return [];
  const kept: Position[] = [positions[0]];
  for (let i = 1; i < positions.length; i++) {
    const p = positions[i];
    const prev = kept[kept.length - 1];
    if ((p.speed ?? 0) < DRIFT_FILTER_MAX_SPEED) {
      if (haversineM(prev.latitude, prev.longitude, p.latitude, p.longitude) < DRIFT_FILTER_MAX_DIST) continue;
    }
    kept.push(p);
  }
  return kept;
}

function chaikinSmooth(coords: Coord[], passes = 2): Coord[] {
  if (coords.length < 3) return coords;
  let pts = coords;
  for (let p = 0; p < passes; p++) {
    const next: Coord[] = [pts[0]];
    for (let i = 0; i < pts.length - 1; i++) {
      const p1 = pts[i],
        p2 = pts[i + 1];
      next.push({
        latitude: p1.latitude * 0.75 + p2.latitude * 0.25,
        longitude: p1.longitude * 0.75 + p2.longitude * 0.25,
      });
      next.push({
        latitude: p1.latitude * 0.25 + p2.latitude * 0.75,
        longitude: p1.longitude * 0.25 + p2.longitude * 0.75,
      });
    }
    next.push(pts[pts.length - 1]);
    pts = next;
  }
  return pts;
}

type SpeedSegment = { coords: Coord[]; color: string };
function buildSpeedSegments(positions: Position[]): SpeedSegment[] {
  if (positions.length < 2) return [];
  const segments: SpeedSegment[] = [];
  let current: Coord[] = [{ latitude: positions[0].latitude, longitude: positions[0].longitude }];
  let currentColor = speedColor(positions[0].speed ?? 0);
  for (let i = 1; i < positions.length; i++) {
    const p = positions[i];
    const color = speedColor(p.speed ?? 0);
    const coord = { latitude: p.latitude, longitude: p.longitude };
    if (color === currentColor) {
      current.push(coord);
    } else {
      current.push(coord);
      segments.push({ coords: current, color: currentColor });
      current = [coord];
      currentColor = color;
    }
  }
  if (current.length >= 1) segments.push({ coords: current, color: currentColor });
  return segments;
}

function detectStops(positions: Position[]): StopMarker[] {
  if (positions.length < 2) return [];
  const stops: StopMarker[] = [];
  let stopStart: Position | null = null;
  const flush = (endPos: Position) => {
    if (!stopStart) return;
    const duration = new Date(endPos.timestamp).getTime() - new Date(stopStart.timestamp).getTime();
    const ign = stopStart.ignition;
    const type: 'STOP' | 'IDLE' =
      ign === false ? 'STOP' : ign === true ? 'IDLE' : duration >= STOP_LONG_DURATION_MS ? 'STOP' : 'IDLE';
    if (duration >= STOP_MIN_DURATION_MS) {
      stops.push({
        coord: { latitude: stopStart.latitude, longitude: stopStart.longitude },
        duration: Math.round(duration / 60000),
        type,
        startTime: stopStart.timestamp,
        endTime: endPos.timestamp,
      });
    }
    stopStart = null;
  };
  for (const p of positions) {
    if ((p.speed ?? 0) < DRIFT_FILTER_MAX_SPEED) {
      if (!stopStart) stopStart = p;
    } else flush(p);
  }
  if (stopStart) flush(positions[positions.length - 1]);
  return stops;
}

function fmtDuration(min: number): string {
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)}h${(min % 60).toString().padStart(2, '0')}`;
}

function fmtTime(iso: string | null): string {
  if (!iso) return '–';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '–' : d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function fmtDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}

function fmtTripDuration(sec: number | null): string {
  if (!sec) return '–';
  const h = Math.floor(sec / 3600),
    m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${m} min`;
}

function tripRegion(trip: Trip) {
  const lats = [trip.start_lat, trip.end_lat].filter(Boolean) as number[];
  const lngs = [trip.start_lng, trip.end_lng].filter(Boolean) as number[];
  if (lats.length === 0) return null;
  const minLat = Math.min(...lats),
    maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs),
    maxLng = Math.max(...lngs);
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max(maxLat - minLat, 0.005) * 1.6,
    longitudeDelta: Math.max(maxLng - minLng, 0.005) * 1.6,
  };
}

// ── Custom range modal ────────────────────────────────────────────────────────

interface CustomRange {
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
}

function CustomRangeModal({
  visible,
  onClose,
  onApply,
  theme,
}: {
  visible: boolean;
  onClose: () => void;
  onApply: (r: CustomRange) => void;
  theme: ThemeType;
}) {
  const [startDt, setStartDt] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [endDt, setEndDt] = useState<Date>(() => {
    const d = new Date();
    d.setHours(23, 59, 0, 0);
    return d;
  });
  const [pickerOpen, setPickerOpen] = useState<'startDate' | 'startTime' | 'endDate' | 'endTime' | null>(null);

  const canApply = startDt < endDt;

  const pickerMode = pickerOpen === 'startDate' || pickerOpen === 'endDate' ? 'date' : 'time';
  const pickerValue = pickerOpen === 'startDate' || pickerOpen === 'startTime' ? startDt : endDt;

  const handlePickerChange = (_: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setPickerOpen(null);
    if (!date) return;
    if (pickerOpen === 'startDate') {
      setStartDt((prev) => {
        const d = new Date(date);
        d.setHours(prev.getHours(), prev.getMinutes(), 0, 0);
        return d;
      });
    } else if (pickerOpen === 'startTime') {
      setStartDt((prev) => {
        const d = new Date(prev);
        d.setHours(date.getHours(), date.getMinutes(), 0, 0);
        return d;
      });
    } else if (pickerOpen === 'endDate') {
      setEndDt((prev) => {
        const d = new Date(date);
        d.setHours(prev.getHours(), prev.getMinutes(), 0, 0);
        return d;
      });
    } else if (pickerOpen === 'endTime') {
      setEndDt((prev) => {
        const d = new Date(prev);
        d.setHours(date.getHours(), date.getMinutes(), 0, 0);
        return d;
      });
    }
  };

  const applyShortcut = (
    daysBackStart: number,
    daysBackEnd: number,
    sh: number,
    sm: number,
    eh: number,
    em: number
  ) => {
    const s = new Date();
    s.setDate(s.getDate() - daysBackStart);
    s.setHours(sh, sm, 0, 0);
    const e = new Date();
    e.setDate(e.getDate() - daysBackEnd);
    e.setHours(eh, em, 0, 0);
    setStartDt(s);
    setEndDt(e);
  };

  const fmtDate = (d: Date) => d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const fmtTime = (d: Date) => d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  const pad2 = (n: number) => n.toString().padStart(2, '0');
  const toCustomRange = (): CustomRange => ({
    startDate: startDt.toISOString().slice(0, 10),
    startTime: `${pad2(startDt.getHours())}:${pad2(startDt.getMinutes())}`,
    endDate: endDt.toISOString().slice(0, 10),
    endTime: `${pad2(endDt.getHours())}:${pad2(endDt.getMinutes())}`,
  });

  const dateTimeRow = (label: string, dt: Date, dateKey: 'startDate' | 'endDate', timeKey: 'startTime' | 'endTime') => (
    <View style={{ marginBottom: 14 }}>
      <Text
        style={{
          fontSize: 12,
          fontWeight: '700',
          color: theme.text.secondary,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          marginBottom: 8,
        }}
      >
        {label}
      </Text>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <TouchableOpacity
          onPress={() => setPickerOpen((prev) => (prev === dateKey ? null : dateKey))}
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            backgroundColor: theme.bg.primary,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: pickerOpen === dateKey ? theme.primary : theme.border,
            paddingHorizontal: 12,
            paddingVertical: 11,
          }}
        >
          <Calendar size={15} color={pickerOpen === dateKey ? theme.primary : theme.text.muted} />
          <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text.primary }}>{fmtDate(dt)}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setPickerOpen((prev) => (prev === timeKey ? null : timeKey))}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            backgroundColor: theme.bg.primary,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: pickerOpen === timeKey ? theme.primary : theme.border,
            paddingHorizontal: 12,
            paddingVertical: 11,
          }}
        >
          <Clock size={15} color={pickerOpen === timeKey ? theme.primary : theme.text.muted} />
          <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text.primary }}>{fmtTime(dt)}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity
        style={{ flex: 1, backgroundColor: '#00000055' }}
        activeOpacity={1}
        onPress={() => {
          setPickerOpen(null);
          onClose();
        }}
      />
      <View
        style={{
          backgroundColor: theme.bg.surface,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          padding: 20,
          paddingBottom: 34,
        }}
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 18 }}>
          <SlidersHorizontal size={18} color={theme.primary} />
          <Text style={{ fontSize: 16, fontWeight: '700', color: theme.text.primary, flex: 1, marginLeft: 8 }}>
            Période personnalisée
          </Text>
          <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
            <X size={20} color={theme.text.muted} />
          </TouchableOpacity>
        </View>

        {dateTimeRow('Début', startDt, 'startDate', 'startTime')}
        {dateTimeRow('Fin', endDt, 'endDate', 'endTime')}

        {/* iOS inline picker */}
        {Platform.OS === 'ios' && pickerOpen !== null && (
          <DateTimePicker
            value={pickerValue}
            mode={pickerMode}
            display="spinner"
            onChange={handlePickerChange}
            maximumDate={pickerMode === 'date' ? new Date() : undefined}
            style={{ marginBottom: 8 }}
          />
        )}

        {/* Shortcuts */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[
              { label: "Aujourd'hui", action: () => applyShortcut(0, 0, 0, 0, 23, 59) },
              { label: 'Hier', action: () => applyShortcut(1, 1, 0, 0, 23, 59) },
              { label: '7 jours', action: () => applyShortcut(7, 0, 0, 0, 23, 59) },
              { label: '30 jours', action: () => applyShortcut(30, 0, 0, 0, 23, 59) },
            ].map((sh) => (
              <TouchableOpacity
                key={sh.label}
                style={{
                  backgroundColor: theme.primaryDim,
                  borderRadius: 14,
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                }}
                onPress={sh.action}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', color: theme.primary }}>{sh.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <TouchableOpacity
          style={{
            backgroundColor: canApply ? theme.primary : theme.border,
            borderRadius: 12,
            paddingVertical: 14,
            alignItems: 'center',
          }}
          disabled={!canApply}
          onPress={() => {
            onApply(toCustomRange());
            onClose();
          }}
        >
          <Text style={{ color: canApply ? theme.text.onPrimary : theme.text.muted, fontWeight: '700', fontSize: 15 }}>
            Appliquer
          </Text>
        </TouchableOpacity>
      </View>

      {/* Android native picker dialog */}
      {Platform.OS === 'android' && pickerOpen !== null && (
        <DateTimePicker
          value={pickerValue}
          mode={pickerMode}
          display="default"
          onChange={handlePickerChange}
          maximumDate={pickerMode === 'date' ? new Date() : undefined}
        />
      )}
    </Modal>
  );
}

// ── Date selector ─────────────────────────────────────────────────────────────

function DateSelector({
  selected,
  onChange,
  onPerso,
  isPerso,
  dailyMap,
  theme,
}: {
  selected: string;
  onChange: (d: string) => void;
  onPerso: () => void;
  isPerso: boolean;
  dailyMap: Record<string, DailyInfo>;
  theme: ThemeType;
}) {
  const days = useMemo(() => {
    const arr: { label: string; value: string }[] = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const val = d.toISOString().slice(0, 10);
      const label =
        i === 0 ? 'Auj.' : i === 1 ? 'Hier' : d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' });
      arr.push({ label, value: val });
    }
    return arr;
  }, []);

  const persoBtn = (
    <TouchableOpacity
      key="perso"
      style={{
        width: 52,
        height: 72,
        borderRadius: 12,
        backgroundColor: isPerso ? theme.primary : theme.bg.surface,
        borderWidth: 1,
        borderColor: isPerso ? theme.primary : theme.border,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
      }}
      onPress={onPerso}
      activeOpacity={0.75}
    >
      <SlidersHorizontal size={14} color={isPerso ? theme.text.onPrimary : theme.text.secondary} />
      <Text style={{ fontSize: 10, fontWeight: '700', color: isPerso ? theme.text.onPrimary : theme.text.secondary }}>
        Perso.
      </Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 6, paddingHorizontal: 14, paddingVertical: 8 }}
    >
      {days.map((d, idx) => {
        const info = dailyMap[d.value];
        const isSelected = !isPerso && selected === d.value;
        const hasTrips = !!info?.tripsCount;
        const km = info?.totalDistance != null ? Number(info.totalDistance).toFixed(1) : null;
        return (
          <React.Fragment key={d.value}>
            <TouchableOpacity
              style={{
                width: 56,
                height: 72,
                borderRadius: 12,
                backgroundColor: isSelected ? theme.primary : theme.bg.surface,
                borderWidth: 1,
                borderColor: isSelected ? theme.primary : theme.border,
                alignItems: 'center',
                justifyContent: 'center',
                gap: 3,
                opacity: hasTrips || isSelected ? 1 : 0.4,
              }}
              onPress={() => onChange(d.value)}
              activeOpacity={0.75}
            >
              <Text
                style={{ fontSize: 10, fontWeight: '600', color: isSelected ? theme.text.onPrimary : theme.text.muted }}
              >
                {d.label}
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '800',
                  color: isSelected ? theme.text.onPrimary : theme.text.primary,
                  lineHeight: 16,
                }}
              >
                {km ?? '–'}
              </Text>
              <Text style={{ fontSize: 9, color: isSelected ? theme.text.onPrimary : theme.text.muted }}>km</Text>
            </TouchableOpacity>
            {idx === 1 && persoBtn}
          </React.Fragment>
        );
      })}
    </ScrollView>
  );
}

// ── Stats bar ─────────────────────────────────────────────────────────────────

function StatsBar({
  positions,
  trips,
  alertsCount,
  theme,
}: {
  positions: Position[];
  trips: Trip[];
  alertsCount: number;
  theme: ThemeType;
}) {
  const stats = useMemo(() => {
    let distance =
      trips.length > 0
        ? trips.reduce((s, t) => s + (Number(t.distance_km) || 0), 0)
        : positions.length >= 2
          ? (() => {
              let d = 0;
              for (let i = 1; i < positions.length; i++)
                d +=
                  haversineM(
                    positions[i - 1].latitude,
                    positions[i - 1].longitude,
                    positions[i].latitude,
                    positions[i].longitude
                  ) / 1000;
              return d;
            })()
          : 0;
    const start = positions[0]?.timestamp ? new Date(positions[0].timestamp).getTime() : NaN;
    const end = positions[positions.length - 1]?.timestamp
      ? new Date(positions[positions.length - 1].timestamp).getTime()
      : NaN;
    const durationMin =
      trips.length > 0
        ? Math.round(trips.reduce((s, t) => s + (t.duration_seconds ?? 0), 0) / 60)
        : isNaN(start) || isNaN(end)
          ? 0
          : Math.round((end - start) / 60000);
    return { distance: Math.round(distance * 10) / 10, durationMin, tripsCount: trips.length };
  }, [positions, trips]);

  return (
    <View style={{ flexDirection: 'row', paddingHorizontal: 12, gap: 8, marginBottom: 6 }}>
      {[
        { icon: <Route size={13} color={theme.primary} />, value: `${stats.distance} km`, label: 'Distance' },
        {
          icon: <Clock size={13} color={theme.primary} />,
          value:
            stats.durationMin >= 60
              ? `${Math.floor(stats.durationMin / 60)}h${String(stats.durationMin % 60).padStart(2, '0')}`
              : `${stats.durationMin} min`,
          label: 'Durée',
        },
        { icon: <Gauge size={13} color={theme.primary} />, value: `${stats.tripsCount}`, label: 'Trajets' },
        { icon: <MapPin size={13} color={theme.primary} />, value: `${alertsCount}`, label: 'Alertes' },
      ].map((item, i) => (
        <View
          key={i}
          style={{
            flex: 1,
            backgroundColor: theme.bg.surface,
            borderRadius: 10,
            padding: 8,
            borderWidth: 1,
            borderColor: theme.border,
            alignItems: 'center',
            gap: 3,
          }}
        >
          {item.icon}
          <Text style={{ fontSize: 12, fontWeight: '700', color: theme.text.primary }}>{item.value}</Text>
          <Text style={{ fontSize: 9, color: theme.text.muted }}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

// ── Speed legend ──────────────────────────────────────────────────────────────

function SpeedLegend({ theme }: { theme: ThemeType }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 12, paddingVertical: 3 }}>
      {(
        [
          { color: SPEED_COLORS.slow, label: '< 10' },
          { color: SPEED_COLORS.normal, label: '10–50' },
          { color: SPEED_COLORS.fast, label: '50–80' },
          { color: SPEED_COLORS.excess, label: '> 80 km/h' },
        ] as const
      ).map((item) => (
        <View key={item.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <View style={{ width: 14, height: 4, borderRadius: 2, backgroundColor: item.color }} />
          <Text style={{ fontSize: 9, color: theme.text.muted }}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

// ── M7 — Replay controls bar ──────────────────────────────────────────────────

function ReplayBar({
  positions,
  replayIndex,
  isPlaying,
  replaySpeed,
  onTogglePlay,
  onReset,
  onSeek,
  onSpeedChange,
  theme,
}: {
  positions: Position[];
  replayIndex: number;
  isPlaying: boolean;
  replaySpeed: number;
  onTogglePlay: () => void;
  onReset: () => void;
  onSeek: (idx: number) => void;
  onSpeedChange: (s: number) => void;
  theme: ThemeType;
}) {
  const [barWidth, setBarWidth] = useState(0);
  const progress = positions.length > 1 ? replayIndex / (positions.length - 1) : 0;
  const current = positions[replayIndex];
  const currentTime = current?.timestamp
    ? new Date(current.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '–';
  const currentSpeed = current?.speed != null ? `${Math.round(current.speed)} km/h` : '';

  const handleBarPress = useCallback(
    (evt: { nativeEvent: { locationX: number } }) => {
      if (barWidth === 0 || positions.length < 2) return;
      const ratio = Math.max(0, Math.min(1, evt.nativeEvent.locationX / barWidth));
      onSeek(Math.round(ratio * (positions.length - 1)));
    },
    [barWidth, positions.length, onSeek]
  );

  return (
    <View
      style={{
        backgroundColor: theme.bg.surface,
        borderTopWidth: 1,
        borderTopColor: theme.border,
        paddingHorizontal: 12,
        paddingVertical: 8,
        gap: 6,
      }}
    >
      {/* Time + Speed info */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: 12, fontWeight: '600', color: theme.text.primary, fontFamily: 'monospace' }}>
          {currentTime}
        </Text>
        <Text style={{ fontSize: 12, color: speedColor(current?.speed ?? 0), fontWeight: '700' }}>{currentSpeed}</Text>
      </View>

      {/* Progress bar (scrubable) */}
      <TouchableOpacity
        onLayout={(e: LayoutChangeEvent) => setBarWidth(e.nativeEvent.layout.width)}
        onPress={handleBarPress}
        activeOpacity={1}
        style={{ height: 20, justifyContent: 'center' }}
      >
        <View style={{ height: 4, backgroundColor: theme.border, borderRadius: 2, overflow: 'hidden' }}>
          <View
            style={{ width: `${progress * 100}%`, height: '100%', backgroundColor: theme.primary, borderRadius: 2 }}
          />
        </View>
        {/* Thumb */}
        <View
          style={{
            position: 'absolute',
            left: `${progress * 100}%` as any,
            marginLeft: -7,
            width: 14,
            height: 14,
            borderRadius: 7,
            backgroundColor: theme.primary,
            borderWidth: 2,
            borderColor: '#fff',
            top: 3,
          }}
        />
      </TouchableOpacity>

      {/* Controls row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {/* Reset */}
        <TouchableOpacity onPress={onReset} style={{ padding: 6 }}>
          <SkipBack size={18} color={theme.text.secondary} />
        </TouchableOpacity>

        {/* Play/Pause */}
        <TouchableOpacity
          onPress={onTogglePlay}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: theme.primary,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {isPlaying ? (
            <Pause size={16} color={theme.text.onPrimary} fill={theme.text.onPrimary} />
          ) : (
            <Play size={16} color={theme.text.onPrimary} fill={theme.text.onPrimary} style={{ marginLeft: 2 }} />
          )}
        </TouchableOpacity>

        {/* Speed selector */}
        <View style={{ flexDirection: 'row', gap: 4, flex: 1, justifyContent: 'flex-end' }}>
          {REPLAY_SPEEDS.map((s) => (
            <TouchableOpacity
              key={s}
              onPress={() => onSpeedChange(s)}
              style={{
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 8,
                backgroundColor: replaySpeed === s ? theme.primary : theme.bg.elevated,
                borderWidth: 1,
                borderColor: replaySpeed === s ? theme.primary : theme.border,
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '700',
                  color: replaySpeed === s ? theme.text.onPrimary : theme.text.secondary,
                }}
              >
                {s}×
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

// ── StopCard — geocoded address per stop ──────────────────────────────────────

const StopCard = memo(function StopCard({
  stop,
  onPress,
  theme,
}: {
  stop: StopMarker;
  onPress: () => void;
  theme: ThemeType;
}) {
  const { data: address } = useQuery<string | null>({
    queryKey: ['geocode', stop.coord.latitude.toFixed(4), stop.coord.longitude.toFixed(4)],
    queryFn: () => vehiclesApi.geocodeCoord(stop.coord.latitude, stop.coord.longitude),
    staleTime: Infinity,
  });

  return (
    <TouchableOpacity style={stopCardStyle(theme)} onPress={onPress} activeOpacity={0.75}>
      <View style={[stopIconStyle(theme), stop.type === 'IDLE' && { backgroundColor: vehicleStatus.idle }]}>
        {stop.type === 'STOP' ? <ParkingSquare size={13} color="#fff" /> : <Pause size={13} color="#fff" />}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: theme.text.primary }}>{fmtTime(stop.startTime)}</Text>
          <Text style={{ fontSize: 11, color: theme.text.secondary }}>→</Text>
          <Text style={{ fontSize: 13, fontWeight: '700', color: theme.text.primary }}>{fmtTime(stop.endTime)}</Text>
        </View>
        <Text style={{ fontSize: 11, color: theme.text.secondary }}>
          {stop.type === 'STOP' ? 'Arrêt moteur' : 'Ralenti'} · {fmtDuration(stop.duration)}
        </Text>
        {address ? (
          <Text style={{ fontSize: 11, color: theme.text.muted }} numberOfLines={1}>
            {address}
          </Text>
        ) : (
          <Text style={{ fontSize: 11, color: theme.text.muted, fontFamily: 'monospace' }}>
            {stop.coord.latitude.toFixed(4)}, {stop.coord.longitude.toFixed(4)}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
});

function stopCardStyle(theme: ThemeType) {
  return {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  };
}
function stopIconStyle(theme: ThemeType) {
  return {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: vehicleStatus.stopped,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  };
}

// ── AlertCard — geocoded address per alert ────────────────────────────────────

const AlertCard = memo(function AlertCard({
  alert,
  onPress,
  theme,
}: {
  alert: VehicleAlert;
  onPress?: () => void;
  theme: ThemeType;
}) {
  const hasCoord =
    typeof alert.latitude === 'number' &&
    typeof alert.longitude === 'number' &&
    alert.latitude !== 0 &&
    alert.longitude !== 0;

  const { data: address } = useQuery<string | null>({
    queryKey: ['geocode', (alert.latitude ?? 0).toFixed(4), (alert.longitude ?? 0).toFixed(4)],
    queryFn: () => vehiclesApi.geocodeCoord(alert.latitude!, alert.longitude!),
    staleTime: Infinity,
    enabled: hasCoord,
  });

  const sev = alert.severity?.toLowerCase();
  const dot = sev === 'critical' || sev === 'high' ? '#EF4444' : sev === 'medium' ? '#F59E0B' : theme.primary;

  return (
    <TouchableOpacity
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: theme.border,
      }}
      onPress={onPress}
      activeOpacity={onPress ? 0.75 : 1}
    >
      <View
        style={{
          width: 30,
          height: 30,
          borderRadius: 15,
          backgroundColor: dot + '22',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: dot }} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontSize: 13, fontWeight: '700', color: theme.text.primary }} numberOfLines={1}>
          {alert.message}
        </Text>
        <Text style={{ fontSize: 11, color: theme.text.secondary }}>{fmtTime(alert.created_at)}</Text>
        {hasCoord &&
          (address ? (
            <Text style={{ fontSize: 11, color: theme.text.muted }} numberOfLines={1}>
              {address}
            </Text>
          ) : (
            <Text style={{ fontSize: 11, color: theme.text.muted, fontFamily: 'monospace' }}>
              {alert.latitude!.toFixed(4)}, {alert.longitude!.toFixed(4)}
            </Text>
          ))}
      </View>
      <Text
        style={{
          fontSize: 11,
          fontWeight: '600',
          color: dot,
          backgroundColor: theme.bg.surface,
          paddingHorizontal: 7,
          paddingVertical: 2,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: dot + '44',
          overflow: 'hidden',
        }}
      >
        {alert.type}
      </Text>
    </TouchableOpacity>
  );
});

// ── TripCard — with reverse geocoding for missing start/end addresses ─────────

const TripCard = memo(function TripCard({
  trip,
  index,
  isFocused,
  isPerso,
  theme,
  onPress,
  maxSpeedLimit,
}: {
  trip: Trip;
  index: number;
  isFocused: boolean;
  isPerso: boolean;
  theme: ThemeType;
  onPress: () => void;
  maxSpeedLimit?: number;
}) {
  const hasStartCoord = trip.start_lat != null && trip.start_lng != null;
  const hasEndCoord = trip.end_lat != null && trip.end_lng != null;

  const { data: startAddr } = useQuery<string | null>({
    queryKey: ['geocode', Number(trip.start_lat).toFixed(4), Number(trip.start_lng).toFixed(4)],
    queryFn: () => vehiclesApi.geocodeCoord(Number(trip.start_lat), Number(trip.start_lng)),
    staleTime: Infinity,
    enabled: hasStartCoord && !trip.start_address,
  });

  const { data: endAddr } = useQuery<string | null>({
    queryKey: ['geocode', Number(trip.end_lat).toFixed(4), Number(trip.end_lng).toFixed(4)],
    queryFn: () => vehiclesApi.geocodeCoord(Number(trip.end_lat), Number(trip.end_lng)),
    staleTime: Infinity,
    enabled: hasEndCoord && !trip.end_address,
  });

  const startLabel =
    trip.start_address ||
    startAddr ||
    (hasStartCoord ? `${Number(trip.start_lat).toFixed(4)}, ${Number(trip.start_lng).toFixed(4)}` : '–');
  const endLabel =
    trip.end_address ||
    endAddr ||
    (hasEndCoord ? `${Number(trip.end_lat).toFixed(4)}, ${Number(trip.end_lng).toFixed(4)}` : '–');

  const limit = maxSpeedLimit ?? 120;
  const maxSpeedOver = trip.max_speed_kmh != null && Number(trip.max_speed_kmh) > limit;

  return (
    <TouchableOpacity
      style={[styles_trip.card, isFocused && styles_trip.cardFocused(theme)]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={styles_trip.header}>
        {/* Numéro de trajet */}
        <View
          style={{
            width: 22,
            height: 22,
            borderRadius: 11,
            backgroundColor: isFocused ? theme.primary : theme.primaryDim,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Text style={{ fontSize: 10, fontWeight: '700', color: isFocused ? theme.text.onPrimary : theme.primary }}>
            {index}
          </Text>
        </View>
        <Text style={styles_trip.time(theme)}>
          {isPerso ? `${fmtDate(trip.start_time)} ` : ''}
          {fmtTime(trip.start_time)}
        </Text>
        <Text style={[styles_trip.label(theme), { flex: 1 }]}>→ {fmtTime(trip.end_time)}</Text>
        <Text style={[styles_trip.badge(theme), isFocused && styles_trip.badgeFocused(theme)]}>
          {fmtTripDuration(trip.duration_seconds)}
        </Text>
        <ChevronRight size={14} color={isFocused ? theme.primary : theme.text.muted} />
      </View>
      <View style={styles_trip.meta}>
        <Text style={styles_trip.addr(theme)} numberOfLines={1}>
          <Text style={{ color: '#22C55E' }}>D </Text>
          {startLabel}
        </Text>
        <Text style={styles_trip.addr(theme)} numberOfLines={1}>
          <Text style={{ color: '#EF4444' }}>A </Text>
          {endLabel}
        </Text>
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 4, flexWrap: 'wrap' }}>
          {trip.distance_km != null && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Route size={11} color={theme.text.muted} />
              <Text style={styles_trip.stat(theme)}>{Number(trip.distance_km).toFixed(1)} km</Text>
            </View>
          )}
          {trip.avg_speed_kmh != null && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Gauge size={11} color={theme.text.muted} />
              <Text style={styles_trip.stat(theme)}>{Math.round(Number(trip.avg_speed_kmh))} km/h moy</Text>
            </View>
          )}
          {trip.max_speed_kmh != null && (
            <View
              style={{
                backgroundColor: maxSpeedOver ? '#FEE2E2' : '#DCFCE7',
                paddingHorizontal: 6,
                paddingVertical: 1,
                borderRadius: 8,
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: '600', color: maxSpeedOver ? '#DC2626' : '#16A34A' }}>
                {Math.round(Number(trip.max_speed_kmh))} km/h max
              </Text>
            </View>
          )}
          {trip.driver_name ? <Text style={styles_trip.stat(theme)}>{trip.driver_name}</Text> : null}
        </View>
      </View>
    </TouchableOpacity>
  );
});

const styles_trip = {
  card: { paddingVertical: 10, borderBottomWidth: 1 as const } as const,
  cardFocused: (t: ThemeType) => ({
    backgroundColor: t.primaryDim,
    borderRadius: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 0 as const,
    marginBottom: 2,
  }),
  header: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 } as const,
  time: (t: ThemeType) => ({ fontSize: 13, fontWeight: '700' as const, color: t.text.primary }),
  label: (t: ThemeType) => ({ fontSize: 12, color: t.text.secondary }),
  badge: (t: ThemeType) => ({
    fontSize: 11,
    fontWeight: '600' as const,
    color: t.primary,
    backgroundColor: t.bg.surface,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: t.border,
  }),
  badgeFocused: (t: ThemeType) => ({ backgroundColor: t.primary, color: t.text.onPrimary, borderColor: t.primary }),
  meta: { paddingLeft: 18, gap: 2 } as const,
  addr: (t: ThemeType) => ({ fontSize: 11, color: t.text.secondary }),
  stat: (t: ThemeType) => ({ fontSize: 11, color: t.text.muted }),
};

// ── Main ──────────────────────────────────────────────────────────────────────

export default function VehicleHistoryScreen({ route, navigation }: Props) {
  const { theme } = useTheme();
  const s = styles(theme);
  const { vehicleId, plate, vehicleType } = route.params;
  const mapRef = useRef<MapView>(null);

  // Mesure exacte du bloc Header+DateSelector → hauteur carte calculée en px réels
  const insets = useSafeAreaInsets();
  const [topAreaH, setTopAreaH] = useState(0);
  const mapH = topAreaH > 0 ? SCREEN_H - insets.top - topAreaH - SHEET_COLLAPSED - 8 : 0;

  // Date selection
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [showPersoModal, setShowPersoModal] = useState(false);
  const [customRange, setCustomRange] = useState<CustomRange | null>(null);
  const isPerso = customRange !== null;

  // M7 — Replay state
  const [replayIndex, setReplayIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [replaySpeed, setReplaySpeed] = useState(1);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const speedRef = useRef(replaySpeed);
  useEffect(() => {
    speedRef.current = replaySpeed;
  }, [replaySpeed]);

  // M8 — Focused trip
  const [focusedTripId, setFocusedTripId] = useState<string | null>(null);

  // Bottom sheet
  const [activeTab, setActiveTab] = useState<'trajets' | 'arrets' | 'alertes'>('trajets');
  const sheetHeight = useRef(new Animated.Value(SHEET_COLLAPSED)).current;
  const sheetH = useRef(SHEET_COLLAPSED);

  useEffect(() => {
    const id = sheetHeight.addListener(({ value }) => {
      sheetH.current = value;
    });
    return () => sheetHeight.removeListener(id);
  }, [sheetHeight]);

  const panResponder = useMemo(() => {
    let startH = SHEET_COLLAPSED;
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        startH = sheetH.current;
        sheetHeight.stopAnimation();
      },
      onPanResponderMove: (_, gs) => {
        const h = Math.max(SHEET_COLLAPSED, Math.min(SHEET_EXPANDED, startH - gs.dy));
        sheetHeight.setValue(h);
      },
      onPanResponderRelease: (_, gs) => {
        const h = sheetH.current;
        // 3 snaps : collapsed → half → expanded
        let snapTo: number;
        if (gs.vy < -0.8) {
          // glissement rapide vers le haut → snap au niveau suivant
          snapTo = h < SHEET_HALF ? SHEET_HALF : SHEET_EXPANDED;
        } else if (gs.vy > 0.8) {
          // glissement rapide vers le bas → snap au niveau précédent
          snapTo = h > SHEET_HALF ? SHEET_HALF : SHEET_COLLAPSED;
        } else {
          // snap au plus proche des 3 positions
          const d1 = Math.abs(h - SHEET_COLLAPSED);
          const d2 = Math.abs(h - SHEET_HALF);
          const d3 = Math.abs(h - SHEET_EXPANDED);
          snapTo = d1 <= d2 && d1 <= d3 ? SHEET_COLLAPSED : d2 <= d3 ? SHEET_HALF : SHEET_EXPANDED;
        }
        Animated.spring(sheetHeight, { toValue: snapTo, useNativeDriver: false, tension: 80, friction: 12 }).start();
      },
    });
  }, [sheetHeight]);

  // ── Queries ────────────────────────────────────────────────────────────────
  const rangeStart = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    return d.toISOString().slice(0, 10);
  }, []);

  const { data: dailyRaw = [] } = useQuery<DailyInfo[]>({
    queryKey: ['vehicle-daily-range', vehicleId, rangeStart, todayStr()],
    queryFn: () => vehiclesApi.getDailyRange(vehicleId, rangeStart, todayStr()),
    staleTime: 5 * 60_000,
  });

  const dailyMap = useMemo(() => {
    const m: Record<string, DailyInfo> = {};
    for (const d of dailyRaw) m[d.date] = d;
    return m;
  }, [dailyRaw]);

  const historyParams = useMemo(() => {
    if (customRange)
      return {
        date: '',
        startTime: toISO(customRange.startDate, customRange.startTime),
        endTime: toISO(customRange.endDate, customRange.endTime),
      };
    return { date: selectedDate, startTime: undefined, endTime: undefined };
  }, [selectedDate, customRange]);

  const tripsParams = useMemo(() => {
    if (customRange)
      return {
        startDate: toISO(customRange.startDate, customRange.startTime),
        endDate: toISO(customRange.endDate, customRange.endTime),
      };
    return { startDate: selectedDate, endDate: `${selectedDate}T23:59:59` };
  }, [selectedDate, customRange]);

  const historyKey = isPerso
    ? ['vehicle-history', vehicleId, historyParams.startTime, historyParams.endTime]
    : ['vehicle-history', vehicleId, selectedDate];

  const tripsKey = isPerso
    ? ['vehicle-trips', vehicleId, tripsParams.startDate, tripsParams.endDate]
    : ['vehicle-trips', vehicleId, selectedDate];

  const { data: rawPositions = [], isLoading } = useQuery<Position[]>({
    queryKey: historyKey,
    queryFn: () =>
      vehiclesApi.getHistory(vehicleId, historyParams.date, historyParams.startTime, historyParams.endTime),
  });

  const { data: trips = [], isLoading: tripsLoading } = useQuery<Trip[]>({
    queryKey: tripsKey,
    queryFn: () => vehiclesApi.getTrips(vehicleId, tripsParams.startDate, tripsParams.endDate),
  });

  const alertsKey = isPerso
    ? ['vehicle-alerts', vehicleId, tripsParams.startDate, tripsParams.endDate]
    : ['vehicle-alerts', vehicleId, selectedDate];

  const { data: alerts = [] } = useQuery<VehicleAlert[]>({
    queryKey: alertsKey,
    queryFn: () => vehiclesApi.getAlerts(vehicleId, 100, undefined, tripsParams.startDate, tripsParams.endDate),
  });

  // ── Derived data ───────────────────────────────────────────────────────────
  const positions = useMemo(() => filterDrift(rawPositions), [rawPositions]);
  const speedSegments = useMemo(() => buildSpeedSegments(positions), [positions]);
  const stopMarkers = useMemo(() => detectStops(positions), [positions]);

  const region = useMemo(() => {
    if (positions.length === 0) return undefined;
    const lats = positions.map((p) => p.latitude),
      lngs = positions.map((p) => p.longitude);
    const minLat = Math.min(...lats),
      maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs),
      maxLng = Math.max(...lngs);
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max(maxLat - minLat, 0.01) * 1.4,
      longitudeDelta: Math.max(maxLng - minLng, 0.01) * 1.4,
    };
  }, [positions]);

  const first = positions[0];
  const last = positions[positions.length - 1];
  const replayPos = positions[replayIndex] ?? null;

  // ── Reset replay when positions change (date change) ──────────────────────
  useEffect(() => {
    stopReplay();
    setReplayIndex(0);
    setFocusedTripId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positions]);

  // ── Replay engine ──────────────────────────────────────────────────────────
  function stopReplay() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPlaying(false);
  }

  function startReplay() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsPlaying(true);
    intervalRef.current = setInterval(() => {
      setReplayIndex((prev) => {
        const next = Math.min(prev + speedRef.current, positions.length - 1);
        if (next >= positions.length - 1) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          setIsPlaying(false);
        }
        return next;
      });
    }, REPLAY_TICK_MS);
  }

  // Follow camera during replay
  useEffect(() => {
    if (!isPlaying || !replayPos || !mapRef.current) return;
    mapRef.current.animateCamera(
      { center: { latitude: replayPos.latitude, longitude: replayPos.longitude } },
      { duration: REPLAY_TICK_MS }
    );
  }, [replayIndex, isPlaying]);

  // Cleanup on unmount
  useEffect(
    () => () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    },
    []
  );

  const handleTogglePlay = useCallback(() => {
    if (isPlaying) {
      stopReplay();
      return;
    }
    if (replayIndex >= positions.length - 1) setReplayIndex(0);
    startReplay();
  }, [isPlaying, replayIndex, positions.length]);

  const handleReset = useCallback(() => {
    stopReplay();
    setReplayIndex(0);
    if (positions.length > 0 && mapRef.current) {
      mapRef.current.fitToCoordinates(
        positions.map((p) => ({ latitude: p.latitude, longitude: p.longitude })),
        { edgePadding: { top: 60, right: 30, bottom: SHEET_COLLAPSED + 40, left: 30 }, animated: true }
      );
    }
  }, [positions]);

  const handleSeek = useCallback((idx: number) => {
    stopReplay();
    setReplayIndex(idx);
  }, []);

  // Re-center map when positions change (date/range change)
  useEffect(() => {
    if (positions.length === 0 || !mapRef.current) return;
    mapRef.current.fitToCoordinates(
      positions.map((p) => ({ latitude: p.latitude, longitude: p.longitude })),
      { edgePadding: { top: 60, right: 30, bottom: SHEET_COLLAPSED + 40, left: 30 }, animated: true }
    );
  }, [positions]);

  const handleSpeedChange = useCallback(
    (s: number) => {
      setReplaySpeed(s);
      speedRef.current = s;
      if (isPlaying) {
        // Restart interval with new speed
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = setInterval(() => {
          setReplayIndex((prev) => {
            const next = Math.min(prev + s, positions.length - 1);
            if (next >= positions.length - 1) {
              if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
              }
              setIsPlaying(false);
            }
            return next;
          });
        }, REPLAY_TICK_MS);
      }
    },
    [isPlaying, positions.length]
  );

  // ── M8 — Trip tap → zoom ──────────────────────────────────────────────────
  const handleTripTap = useCallback(
    (trip: Trip) => {
      const id = trip.id ?? '';
      if (focusedTripId === id) {
        setFocusedTripId(null);
        if (positions.length > 0)
          mapRef.current?.fitToCoordinates(
            positions.map((p) => ({ latitude: p.latitude, longitude: p.longitude })),
            { edgePadding: { top: 60, right: 30, bottom: SHEET_COLLAPSED + 40, left: 30 }, animated: true }
          );
        return;
      }
      setFocusedTripId(id);
      stopReplay();
      const r = tripRegion(trip);
      if (r && mapRef.current) mapRef.current.animateToRegion(r, 500);
    },
    [focusedTripId, positions]
  );

  const handleDateChange = useCallback((d: string) => {
    setCustomRange(null);
    setSelectedDate(d);
  }, []);
  const rangeLabel =
    isPerso && customRange
      ? `${customRange.startDate} ${customRange.startTime} → ${customRange.endDate} ${customRange.endTime}`
      : null;

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header + DateSelector — mesurés ensemble pour calculer mapH */}
      <View
        onLayout={(e) => {
          const h = e.nativeEvent.layout.height;
          if (h > 0) setTopAreaH(h);
        }}
      >
        <View style={s.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={s.backBtn}
            accessibilityLabel="Retour"
            accessibilityRole="button"
          >
            <ArrowLeft size={22} color={theme.text.primary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>Historique</Text>
            <Text style={s.subtitle} numberOfLines={1}>
              {rangeLabel ?? plate}
            </Text>
          </View>
          <TouchableOpacity onPress={() => setShowPersoModal(true)} style={s.calBtn}>
            <Calendar size={18} color={theme.text.muted} />
          </TouchableOpacity>
        </View>

        <DateSelector
          selected={selectedDate}
          onChange={handleDateChange}
          onPerso={() => setShowPersoModal(true)}
          isPerso={isPerso}
          dailyMap={dailyMap}
          theme={theme}
        />
      </View>

      {/* Carte — hauteur pixel exacte calculée depuis onLayout ci-dessus */}
      {mapH > 0 && (
        <View style={[s.mapWrapper, { height: mapH, marginHorizontal: 12, marginTop: 4 }]}>
          {isLoading ? (
            <View style={s.mapPlaceholder}>
              <ActivityIndicator size="large" color={theme.primary} />
            </View>
          ) : positions.length === 0 ? (
            <View style={s.mapPlaceholder}>
              <MapPin size={32} color={theme.text.muted} />
              <Text style={s.emptyText}>Aucune position enregistrée sur cette période</Text>
            </View>
          ) : (
            <MapView ref={mapRef} style={{ flex: 1 }} provider={PROVIDER_GOOGLE} initialRegion={region}>
              {speedSegments.map((seg, i) => (
                <Polyline key={i} coordinates={chaikinSmooth(seg.coords, 1)} strokeColor={seg.color} strokeWidth={4} />
              ))}
              {!isPlaying && first && (
                <Marker coordinate={{ latitude: first.latitude, longitude: first.longitude }} title="Départ">
                  <View style={s.markerStart}>
                    <Text style={s.markerLabel}>D</Text>
                  </View>
                </Marker>
              )}
              {!isPlaying && last && last !== first && (
                <Marker coordinate={{ latitude: last.latitude, longitude: last.longitude }} title="Arrivée">
                  <View style={s.markerEnd}>
                    <Text style={s.markerLabel}>A</Text>
                  </View>
                </Marker>
              )}
              {!isPlaying &&
                stopMarkers.map((stop, i) => (
                  <Marker key={`stop-${i}`} coordinate={stop.coord} anchor={{ x: 0.5, y: 1 }}>
                    <View style={[s.stopMarker, stop.type === 'IDLE' && s.stopMarkerIdle]}>
                      {stop.type === 'STOP' ? (
                        <ParkingSquare size={10} color="#fff" />
                      ) : (
                        <Pause size={10} color="#fff" />
                      )}
                      <Text style={s.stopLabel}>{fmtDuration(stop.duration)}</Text>
                    </View>
                  </Marker>
                ))}
              {/* Replay marker — icône véhicule top-down + étiquette plaque */}
              {replayPos && (
                <Marker
                  coordinate={{ latitude: replayPos.latitude, longitude: replayPos.longitude }}
                  anchor={{ x: 0.5, y: 0.5 }}
                  tracksViewChanges={isPlaying}
                >
                  <View style={{ alignItems: 'center' }} collapsable={false}>
                    <Image
                      source={
                        MARKER_IMAGES[getTypeKey(vehicleType ?? 'car')][
                          (replayPos.speed ?? 0) > 0 ? 'moving' : 'stopped'
                        ]
                      }
                      style={{ width: 40, height: 40 }}
                      fadeDuration={0}
                    />
                    <View style={s.plateTag}>
                      <Text style={s.plateTagText}>{plate}</Text>
                    </View>
                  </View>
                </Marker>
              )}
            </MapView>
          )}
        </View>
      )}

      {/* ── Bottom sheet ─────────────────────────────────────────────────────── */}
      <Animated.View style={[s.bottomSheet, { height: sheetHeight }]}>
        {/* Drag handle */}
        <View {...panResponder.panHandlers} style={s.sheetHandleArea}>
          <View style={s.handleBar} />
        </View>

        {/* Replay + Stats + légende (quand positions disponibles) */}
        {positions.length > 0 && (
          <View style={{ paddingBottom: 4 }}>
            {positions.length > 1 && (
              <ReplayBar
                positions={positions}
                replayIndex={replayIndex}
                isPlaying={isPlaying}
                replaySpeed={replaySpeed}
                onTogglePlay={handleTogglePlay}
                onReset={handleReset}
                onSeek={handleSeek}
                onSpeedChange={handleSpeedChange}
                theme={theme}
              />
            )}
            <StatsBar positions={positions} trips={trips} alertsCount={alerts.length} theme={theme} />
            <SpeedLegend theme={theme} />
          </View>
        )}

        {/* Tab bar */}
        <View style={s.tabBar}>
          {(
            [
              { key: 'trajets', label: `Trajets${trips.length > 0 ? ` (${trips.length})` : ''}` },
              { key: 'arrets', label: `Arrêts${stopMarkers.length > 0 ? ` (${stopMarkers.length})` : ''}` },
              { key: 'alertes', label: 'Alertes' },
            ] as const
          ).map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[s.tab, activeTab === tab.key && s.tabActive]}
              onPress={() => {
                setActiveTab(tab.key);
                setFocusedTripId(null);
              }}
            >
              <Text style={[s.tabText, activeTab === tab.key && s.tabTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab content */}
        <View style={{ flex: 1 }}>
          {/* ── Trajets ── */}
          {activeTab === 'trajets' && (
            <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 4 }}>
              {focusedTripId && (
                <TouchableOpacity
                  onPress={() => {
                    setFocusedTripId(null);
                    if (positions.length > 0)
                      mapRef.current?.fitToCoordinates(
                        positions.map((p) => ({ latitude: p.latitude, longitude: p.longitude })),
                        { edgePadding: { top: 60, right: 30, bottom: SHEET_COLLAPSED + 40, left: 30 }, animated: true }
                      );
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    alignSelf: 'flex-end',
                    backgroundColor: theme.primaryDim,
                    borderRadius: 10,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    marginBottom: 6,
                  }}
                >
                  <X size={11} color={theme.primary} />
                  <Text style={{ fontSize: 10, color: theme.primary, fontWeight: '600' }}>Vue globale</Text>
                </TouchableOpacity>
              )}
              {tripsLoading ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : trips.length === 0 ? (
                <Text style={s.timelineLabel}>Aucun trajet enregistré sur cette période</Text>
              ) : (
                <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 20 }}>
                  {trips.map((trip, i) => (
                    <TripCard
                      key={trip.id ?? i}
                      trip={trip}
                      index={i + 1}
                      isFocused={focusedTripId === (trip.id ?? '')}
                      isPerso={isPerso}
                      theme={theme}
                      onPress={() => handleTripTap(trip)}
                    />
                  ))}
                </ScrollView>
              )}
            </View>
          )}

          {/* ── Arrêts ── */}
          {activeTab === 'arrets' &&
            (() => {
              const motorStops = stopMarkers.filter((s) => s.type === 'STOP');
              const idleStops = stopMarkers.filter((s) => s.type === 'IDLE');
              if (stopMarkers.length === 0)
                return (
                  <Text style={[s.timelineLabel, { marginTop: 12, paddingHorizontal: 16 }]}>
                    Aucun arrêt détecté sur cette période
                  </Text>
                );
              return (
                <ScrollView
                  style={{ flex: 1, paddingHorizontal: 16 }}
                  contentContainerStyle={{ paddingTop: 4, paddingBottom: 20 }}
                >
                  {motorStops.length > 0 && (
                    <>
                      <View
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, marginBottom: 4 }}
                      >
                        <ParkingSquare size={12} color={vehicleStatus.stopped} />
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: '700',
                            color: vehicleStatus.stopped,
                            textTransform: 'uppercase',
                            letterSpacing: 0.5,
                          }}
                        >
                          Arrêts moteur ({motorStops.length})
                        </Text>
                      </View>
                      {motorStops.map((stop, i) => (
                        <StopCard
                          key={`stop-${i}`}
                          stop={stop}
                          onPress={() =>
                            mapRef.current?.animateToRegion(
                              {
                                latitude: stop.coord.latitude,
                                longitude: stop.coord.longitude,
                                latitudeDelta: 0.005,
                                longitudeDelta: 0.005,
                              },
                              400
                            )
                          }
                          theme={theme}
                        />
                      ))}
                    </>
                  )}
                  {idleStops.length > 0 && (
                    <>
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6,
                          marginTop: motorStops.length > 0 ? 16 : 8,
                          marginBottom: 4,
                        }}
                      >
                        <Pause size={12} color={vehicleStatus.idle} />
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: '700',
                            color: vehicleStatus.idle,
                            textTransform: 'uppercase',
                            letterSpacing: 0.5,
                          }}
                        >
                          Ralentis ({idleStops.length})
                        </Text>
                      </View>
                      {idleStops.map((stop, i) => (
                        <StopCard
                          key={`idle-${i}`}
                          stop={stop}
                          onPress={() =>
                            mapRef.current?.animateToRegion(
                              {
                                latitude: stop.coord.latitude,
                                longitude: stop.coord.longitude,
                                latitudeDelta: 0.005,
                                longitudeDelta: 0.005,
                              },
                              400
                            )
                          }
                          theme={theme}
                        />
                      ))}
                    </>
                  )}
                </ScrollView>
              );
            })()}

          {/* ── Alertes ── */}
          {activeTab === 'alertes' &&
            (alerts.length === 0 ? (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10, paddingBottom: 20 }}>
                <MapPin size={28} color={theme.text.muted} />
                <Text style={s.timelineLabel}>Aucune alerte sur cette période</Text>
              </View>
            ) : (
              <ScrollView
                style={{ flex: 1, paddingHorizontal: 16 }}
                contentContainerStyle={{ paddingTop: 4, paddingBottom: 20 }}
              >
                {alerts.map((alert) => (
                  <AlertCard
                    key={alert.id}
                    alert={alert}
                    onPress={
                      alert.latitude && alert.longitude
                        ? () =>
                            mapRef.current?.animateToRegion(
                              {
                                latitude: alert.latitude!,
                                longitude: alert.longitude!,
                                latitudeDelta: 0.005,
                                longitudeDelta: 0.005,
                              },
                              400
                            )
                        : undefined
                    }
                    theme={theme}
                  />
                ))}
              </ScrollView>
            ))}
        </View>
      </Animated.View>

      <CustomRangeModal
        visible={showPersoModal}
        onClose={() => setShowPersoModal(false)}
        onApply={(r) => setCustomRange(r)}
        theme={theme}
      />
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = (theme: ThemeType) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg.primary },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    backBtn: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: theme.bg.surface,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.border,
    },
    calBtn: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: theme.bg.surface,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.border,
    },
    title: { fontSize: 17, fontWeight: '700', color: theme.text.primary },
    subtitle: { fontSize: 11, color: theme.text.muted, fontFamily: 'monospace' },

    mapWrapper: {
      backgroundColor: theme.bg.elevated,
      borderRadius: 16,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: theme.border,
    },
    mapPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
    emptyText: { fontSize: 13, color: theme.text.muted, textAlign: 'center', paddingHorizontal: 24 },

    markerStart: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: '#22C55E',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: '#fff',
    },
    markerEnd: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: '#EF4444',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: '#fff',
    },
    markerLabel: { fontSize: 9, color: '#fff', fontWeight: '700' },

    stopMarker: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      backgroundColor: vehicleStatus.stopped,
      borderRadius: 8,
      paddingHorizontal: 6,
      paddingVertical: 3,
      borderWidth: 1,
      borderColor: '#fff',
    },
    stopMarkerIdle: { backgroundColor: vehicleStatus.idle },
    stopLabel: { fontSize: 9, color: '#fff', fontWeight: '600' },

    replayMarker: {
      width: 26,
      height: 26,
      borderRadius: 13,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: '#fff',
      shadowColor: '#000',
      shadowOpacity: 0.3,
      shadowRadius: 3,
      elevation: 4,
    },
    replayMarkerIcon: { fontSize: 10, color: '#fff' },

    sectionLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.text.muted,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 8,
    },
    timelineDot: { width: 10, height: 10, borderRadius: 5 },
    timelineTime: { fontSize: 13, fontWeight: '700', color: theme.text.primary },
    timelineLabel: { fontSize: 12, color: theme.text.secondary },

    tripCard: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.border, gap: 6 },
    tripHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    tripMeta: { paddingLeft: 18, gap: 2 },
    tripBadge: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.primary,
      backgroundColor: theme.bg.surface,
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.border,
    },
    tripAddr: { fontSize: 11, color: theme.text.muted },
    tripStat: { fontSize: 11, color: theme.text.muted },

    // Plate tag on replay marker
    plateTag: {
      backgroundColor: 'rgba(0,0,0,0.65)',
      borderRadius: 4,
      paddingHorizontal: 5,
      paddingVertical: 1,
      marginTop: 2,
    },
    plateTagText: { fontSize: 9, color: '#fff', fontWeight: '700' },

    // Bottom sheet
    bottomSheet: {
      backgroundColor: theme.bg.surface,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      borderTopWidth: 1,
      borderColor: theme.border,
      shadowColor: '#000',
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 10,
    },
    sheetHandleArea: { paddingTop: 10, paddingBottom: 6, alignItems: 'center' },
    handleBar: { width: 36, height: 4, borderRadius: 2, backgroundColor: theme.border },

    // Tabs
    tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: theme.border, paddingHorizontal: 16 },
    tab: { flex: 1, paddingVertical: 9, alignItems: 'center' },
    tabActive: { borderBottomWidth: 2, borderBottomColor: theme.primary },
    tabText: { fontSize: 12, fontWeight: '600', color: theme.text.muted },
    tabTextActive: { color: theme.primary, fontWeight: '700' },

    // Stops tab
    stopCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    stopCardIcon: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: vehicleStatus.stopped,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });
