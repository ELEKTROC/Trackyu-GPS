/**
 * FuelAnalysisModal — Analyseur carburant avancé par engin
 *
 * 6 couches toggleables :
 *   raw       → Courbe niveau carburant brut (fuel events type='normal')
 *   refills   → Approvisionnements (pompe verte + quantité + localisation)
 *   drops     → Baisses détectées (pompe rouge + quantité + localisation)
 *   speed     → Courbe de vitesse (panneau secondaire)
 *   contact   → Périodes de contact/ignition (zones hachurées)
 *   slowdrain → Slow drain auto-détecté (segments violet)
 *
 * Période max : 7 jours (position history lourde)
 * Algorithme slow drain : auto-calculé depuis les taux de consommation réels
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { G, Line, Rect, Circle, Path, Text as SvgText, Defs, Pattern } from 'react-native-svg';
import {
  X,
  Fuel,
  TrendingDown,
  Zap,
  Activity,
  Gauge,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react-native';
import vehiclesApi, { type Vehicle, type FuelEvent } from '../../../api/vehicles';
import { runWithConcurrency } from '../../../utils/pLimit';
import { useTheme } from '../../../theme';

// ── Constantes layout ─────────────────────────────────────────────────────────

const SW = Dimensions.get('window').width;
const PAD_L = 44; // espace axe Y
const PAD_R = 12;
const PAD_T = 18;
const PAD_B = 36; // espace axe X
const FUEL_H = 200; // hauteur panneau carburant
const SPEED_H = 80; // hauteur panneau vitesse
const GAP = 10; // espace entre panneaux
const PIX_PER_H = 48; // pixels par heure → scrollable
const MAX_DAYS = 7;

// ── Types ──────────────────────────────────────────────────────────────────────

interface PosPoint {
  ts: number; // epoch ms
  speed: number;
  ignition: boolean | null;
  lat: number;
  lng: number;
}

interface SlowDrain {
  startTs: number;
  endTs: number;
  startLevel: number;
  endLevel: number;
  ratePerHour: number; // % par heure
}

interface AnalysisData {
  rawEvents: FuelEvent[]; // tous les events fuel triés
  positions: PosPoint[]; // toutes les positions triées
  slowDrains: SlowDrain[];
  startTs: number;
  endTs: number;
  maxSpeed: number;
}

type LayerKey = 'raw' | 'refills' | 'drops' | 'speed' | 'contact' | 'slowdrain';

const LAYER_CONFIG: {
  key: LayerKey;
  label: string;
  color: string;
  Icon: React.ComponentType<{ size: number; color: string }>;
}[] = [
  { key: 'raw', label: 'Données brutes', color: '#3B82F6', Icon: Activity },
  { key: 'refills', label: 'Approvisionnements', color: '#22C55E', Icon: Fuel },
  { key: 'drops', label: 'Baisses', color: '#EF4444', Icon: TrendingDown },
  { key: 'speed', label: 'Vitesse', color: '#F97316', Icon: Gauge },
  { key: 'contact', label: 'Contact (ignition)', color: '#94A3B8', Icon: Zap },
  { key: 'slowdrain', label: 'Slow drain', color: '#8B5CF6', Icon: AlertTriangle },
];

// ── Algorithme slow drain ─────────────────────────────────────────────────────

function detectSlowDrains(events: FuelEvent[], positions: PosPoint[]): SlowDrain[] {
  const normal = events
    .filter((e) => e.type === 'normal')
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  if (normal.length < 2) return [];

  // Calcul du taux de consommation pendant la conduite (speed > 20 km/h)
  const drivingRates: number[] = [];
  for (let i = 1; i < normal.length; i++) {
    const prev = normal[i - 1],
      curr = normal[i];
    const dt = (new Date(curr.timestamp).getTime() - new Date(prev.timestamp).getTime()) / 3_600_000;
    if (dt <= 0 || curr.level >= prev.level) continue;
    const drop = prev.level - curr.level;
    const midTs = (new Date(prev.timestamp).getTime() + new Date(curr.timestamp).getTime()) / 2;
    // Vitesse moyenne pendant cet intervalle
    const nearby = positions.filter((p) => Math.abs(p.ts - midTs) < dt * 1_800_000);
    const avgSpeed = nearby.length ? nearby.reduce((s, p) => s + p.speed, 0) / nearby.length : 0;
    if (avgSpeed > 20) drivingRates.push(drop / dt);
  }

  // Seuil : 40% du taux médian de consommation en conduite
  // Si pas de données → 2%/heure par défaut
  const sorted = [...drivingRates].sort((a, b) => a - b);
  const median = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 5;
  const threshold = Math.max(median * 0.4, 2);

  const slowDrains: SlowDrain[] = [];
  for (let i = 1; i < normal.length; i++) {
    const prev = normal[i - 1],
      curr = normal[i];
    const startTs = new Date(prev.timestamp).getTime();
    const endTs = new Date(curr.timestamp).getTime();
    const dt = (endTs - startTs) / 3_600_000;
    if (dt <= 0 || curr.level >= prev.level) continue;
    const drop = prev.level - curr.level;
    const rate = drop / dt;
    if (rate <= threshold) continue;

    // Vérifier que l'engin n'est pas en conduite active
    const midTs = (startTs + endTs) / 2;
    const nearby = positions.filter((p) => Math.abs(p.ts - midTs) < dt * 1_800_000);
    const avgSpeed = nearby.length ? nearby.reduce((s, p) => s + p.speed, 0) / nearby.length : 0;
    const ignOn = nearby.filter((p) => p.ignition === true).length / Math.max(nearby.length, 1);

    // Slow drain = perte anormale hors conduite (speed < 10 km/h OU ignition off > 50%)
    if (avgSpeed < 10 || ignOn < 0.5) {
      slowDrains.push({ startTs, endTs, startLevel: prev.level, endLevel: curr.level, ratePerHour: rate });
    }
  }
  return slowDrains;
}

// ── Composant principal ───────────────────────────────────────────────────────

interface Props {
  visible: boolean;
  onClose: () => void;
  vehicle: Vehicle | null;
  startDate: Date;
  endDate: Date;
}

export function FuelAnalysisModal({ visible, onClose, vehicle, startDate, endDate }: Props) {
  const { theme } = useTheme();

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AnalysisData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [layers, setLayers] = useState<Record<LayerKey, boolean>>({
    raw: true,
    refills: true,
    drops: true,
    speed: false,
    contact: true,
    slowdrain: true,
  });
  const [selectedEvent, setSelectedEvent] = useState<{
    type: 'refill' | 'drop' | 'slowdrain';
    label: string;
    detail: string;
    lat?: number;
    lng?: number;
  } | null>(null);

  // Limite période
  const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / 86_400_000);
  const overLimit = daysDiff > MAX_DAYS;

  const loadData = useCallback(async () => {
    if (!vehicle || overLimit) return;
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const startStr = startDate.toISOString().split('T')[0];
      const endStr = endDate.toISOString().split('T')[0];

      // Fuel events
      const rawEvents = await vehiclesApi.getFuelHistory(vehicle.id, startStr, endStr).catch(() => [] as FuelEvent[]);
      rawEvents.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      // Position history : 1 appel par jour
      const days: string[] = [];
      const cursor = new Date(startDate);
      while (cursor <= endDate && days.length <= MAX_DAYS) {
        days.push(cursor.toISOString().split('T')[0]);
        cursor.setDate(cursor.getDate() + 1);
      }

      const allPositions: PosPoint[] = [];
      await runWithConcurrency(
        days.map((day) => async () => {
          const pts = await vehiclesApi.getHistory(vehicle.id, day).catch(() => []);
          for (const p of pts) {
            if (!p.timestamp) continue;
            allPositions.push({
              ts: new Date(p.timestamp).getTime(),
              speed: p.speed ?? 0,
              ignition: p.ignition ?? null,
              lat: p.latitude,
              lng: p.longitude,
            });
          }
        })
      );
      allPositions.sort((a, b) => a.ts - b.ts);

      const startTs = startDate.getTime();
      const endTs = endDate.getTime();
      const maxSpeed = Math.max(...allPositions.map((p) => p.speed), 1);
      const slowDrains = detectSlowDrains(rawEvents, allPositions);

      setData({ rawEvents, positions: allPositions, slowDrains, startTs, endTs, maxSpeed });
    } catch (e) {
      setError('Impossible de charger les données.');
    } finally {
      setLoading(false);
    }
  }, [vehicle, startDate, endDate, overLimit]);

  useEffect(() => {
    if (visible) loadData();
  }, [visible, loadData]);

  const toggleLayer = (k: LayerKey) => setLayers((p) => ({ ...p, [k]: !p[k] }));

  const showSpeed = layers.speed;
  const totalSvgH = PAD_T + FUEL_H + PAD_B + (showSpeed ? GAP + SPEED_H : 0);

  // ── Calcul dimensions chart ──────────────────────────────────────────────────
  const chartW = useMemo(() => {
    if (!data) return SW - PAD_L - PAD_R;
    const hours = (data.endTs - data.startTs) / 3_600_000;
    return Math.max(SW - PAD_L - PAD_R, hours * PIX_PER_H);
  }, [data]);

  // ── Helpers de projection ────────────────────────────────────────────────────
  const xOf = useCallback(
    (ts: number): number => {
      if (!data || data.endTs === data.startTs) return PAD_L;
      return PAD_L + ((ts - data.startTs) / (data.endTs - data.startTs)) * chartW;
    },
    [data, chartW]
  );

  const yFuel = useCallback((level: number): number => PAD_T + FUEL_H - (level / 100) * FUEL_H, []);

  const ySpeed = useCallback(
    (speed: number): number => {
      if (!data) return PAD_T + FUEL_H + GAP + SPEED_H;
      return PAD_T + FUEL_H + GAP + SPEED_H - (speed / data.maxSpeed) * SPEED_H;
    },
    [data]
  );

  // ── Rendu du chart SVG ───────────────────────────────────────────────────────
  const renderChart = () => {
    if (!data) return null;
    const { rawEvents, positions, slowDrains, startTs, endTs } = data;
    const totalW = PAD_L + chartW + PAD_R;

    // Grille Y carburant
    const yGridFuel = [0, 20, 40, 60, 80, 100].map((pct) => ({
      pct,
      y: yFuel(pct),
      color: pct < 20 ? '#FEE2E2' : pct < 40 ? '#FEF3C7' : '#F0FDF4',
    }));

    // Construire le path des données brutes
    const normalEvents = rawEvents.filter((e) => e.type === 'normal');
    let rawPath = '';
    normalEvents.forEach((e, i) => {
      const x = xOf(new Date(e.timestamp).getTime());
      const y = yFuel(e.level);
      rawPath += i === 0 ? `M${x} ${y}` : ` L${x} ${y}`;
    });

    // Périodes d'ignition (contact)
    const contactPeriods: { x1: number; x2: number }[] = [];
    if (positions.length > 1) {
      let inContact = false;
      let cStart = 0;
      for (const p of positions) {
        if (p.ignition === true && !inContact) {
          inContact = true;
          cStart = p.ts;
        }
        if (p.ignition !== true && inContact) {
          inContact = false;
          contactPeriods.push({ x1: xOf(cStart), x2: xOf(p.ts) });
        }
      }
      if (inContact) contactPeriods.push({ x1: xOf(cStart), x2: xOf(endTs) });
    }

    // X axis labels (toutes les 4h ou 1 jour)
    const xLabels: { x: number; label: string }[] = [];
    const totalHours = (endTs - startTs) / 3_600_000;
    const step = totalHours <= 24 ? 4 : totalHours <= 72 ? 12 : 24;
    for (let h = 0; h <= totalHours; h += step) {
      const ts = startTs + h * 3_600_000;
      const dt = new Date(ts);
      const lbl = step >= 24 ? `${dt.getDate()}/${dt.getMonth() + 1}` : `${String(dt.getHours()).padStart(2, '0')}:00`;
      xLabels.push({ x: xOf(ts), label: lbl });
    }

    const refills = rawEvents.filter((e) => e.type === 'refill');
    const drops = rawEvents.filter((e) => e.type === 'theft');

    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={true} style={{ flex: 1 }}>
        <Svg width={totalW} height={totalSvgH}>
          <Defs>
            <Pattern id="hatch" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
              <Line x1="0" y1="0" x2="0" y2="8" stroke="#94A3B8" strokeWidth="2" strokeOpacity="0.35" />
            </Pattern>
          </Defs>

          {/* ── Fond zones seuil carburant ───────────────────────────────── */}
          <Rect x={PAD_L} y={yFuel(20)} width={chartW} height={yFuel(0) - yFuel(20)} fill="#FEE2E2" opacity={0.3} />
          <Rect x={PAD_L} y={yFuel(40)} width={chartW} height={yFuel(20) - yFuel(40)} fill="#FEF3C7" opacity={0.3} />

          {/* ── Grille horizontale Y ─────────────────────────────────────── */}
          {yGridFuel.map(({ pct, y }) => (
            <G key={pct}>
              <Line
                x1={PAD_L}
                y1={y}
                x2={PAD_L + chartW}
                y2={y}
                stroke="#E5E7EB"
                strokeWidth="1"
                strokeDasharray="3,3"
              />
              <SvgText x={PAD_L - 4} y={y + 3} textAnchor="end" fontSize="9" fill="#9CA3AF">
                {pct}%
              </SvgText>
            </G>
          ))}

          {/* ── Axes ────────────────────────────────────────────────────── */}
          <Line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={PAD_T + FUEL_H} stroke="#D1D5DB" strokeWidth="1" />
          <Line
            x1={PAD_L}
            y1={PAD_T + FUEL_H}
            x2={PAD_L + chartW}
            y2={PAD_T + FUEL_H}
            stroke="#D1D5DB"
            strokeWidth="1"
          />

          {/* ── Contact (ignition) hachures ──────────────────────────────── */}
          {layers.contact &&
            contactPeriods.map((cp, i) => (
              <Rect key={i} x={cp.x1} y={PAD_T} width={Math.max(cp.x2 - cp.x1, 1)} height={FUEL_H} fill="url(#hatch)" />
            ))}

          {/* ── Slow drain segments ──────────────────────────────────────── */}
          {layers.slowdrain &&
            slowDrains.map((sd, i) => (
              <G key={i}>
                <Rect
                  x={xOf(sd.startTs)}
                  y={yFuel(sd.startLevel)}
                  width={Math.max(xOf(sd.endTs) - xOf(sd.startTs), 2)}
                  height={yFuel(sd.endLevel) - yFuel(sd.startLevel)}
                  fill="#8B5CF6"
                  opacity={0.18}
                />
                <Line
                  x1={xOf(sd.startTs)}
                  y1={PAD_T}
                  x2={xOf(sd.startTs)}
                  y2={PAD_T + FUEL_H}
                  stroke="#8B5CF6"
                  strokeWidth="1"
                  strokeDasharray="4,2"
                />
              </G>
            ))}

          {/* ── Courbe données brutes ────────────────────────────────────── */}
          {layers.raw && rawPath !== '' && (
            <Path d={rawPath} fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinejoin="round" />
          )}

          {/* ── Marqueurs approvisionnements ────────────────────────────── */}
          {layers.refills &&
            refills.map((e, i) => {
              const x = xOf(new Date(e.timestamp).getTime());
              const y = yFuel(e.level);
              const vol = e.volume != null ? `${e.volume.toFixed(1)} L` : '';
              return (
                <G
                  key={i}
                  onPress={() => {
                    const pos = data.positions.reduce(
                      (best, p) =>
                        Math.abs(p.ts - new Date(e.timestamp).getTime()) <
                        Math.abs(best.ts - new Date(e.timestamp).getTime())
                          ? p
                          : best,
                      data.positions[0] ?? { ts: 0, lat: 0, lng: 0, speed: 0, ignition: null }
                    );
                    setSelectedEvent({
                      type: 'refill',
                      label: `Approvisionnement +${vol}`,
                      detail: `Niveau après : ${e.level}% · ${new Date(e.timestamp).toLocaleString('fr-FR')}`,
                      lat: pos?.lat,
                      lng: pos?.lng,
                    });
                  }}
                >
                  <Line
                    x1={x}
                    y1={PAD_T}
                    x2={x}
                    y2={PAD_T + FUEL_H}
                    stroke="#22C55E"
                    strokeWidth="1.5"
                    strokeDasharray="3,2"
                  />
                  <Circle cx={x} cy={y} r={7} fill="#22C55E" />
                  <SvgText x={x} y={y - 10} textAnchor="middle" fontSize="8" fill="#15803D" fontWeight="700">
                    {vol}
                  </SvgText>
                </G>
              );
            })}

          {/* ── Marqueurs baisses ────────────────────────────────────────── */}
          {layers.drops &&
            drops.map((e, i) => {
              const x = xOf(new Date(e.timestamp).getTime());
              const y = yFuel(e.level);
              const vol = e.volume != null ? `−${e.volume.toFixed(1)} L` : '';
              return (
                <G
                  key={i}
                  onPress={() => {
                    const pos = data.positions.reduce(
                      (best, p) =>
                        Math.abs(p.ts - new Date(e.timestamp).getTime()) <
                        Math.abs(best.ts - new Date(e.timestamp).getTime())
                          ? p
                          : best,
                      data.positions[0] ?? { ts: 0, lat: 0, lng: 0, speed: 0, ignition: null }
                    );
                    setSelectedEvent({
                      type: 'drop',
                      label: `Baisse détectée ${vol}`,
                      detail: `Niveau constaté : ${e.level}% · ${new Date(e.timestamp).toLocaleString('fr-FR')}`,
                      lat: pos?.lat,
                      lng: pos?.lng,
                    });
                  }}
                >
                  <Line
                    x1={x}
                    y1={PAD_T}
                    x2={x}
                    y2={PAD_T + FUEL_H}
                    stroke="#EF4444"
                    strokeWidth="1.5"
                    strokeDasharray="3,2"
                  />
                  <Circle cx={x} cy={y} r={7} fill="#EF4444" />
                  <SvgText x={x} y={y - 10} textAnchor="middle" fontSize="8" fill="#DC2626" fontWeight="700">
                    {vol}
                  </SvgText>
                </G>
              );
            })}

          {/* ── Étiquettes X (temps) ─────────────────────────────────────── */}
          {xLabels.map(({ x, label }, i) => (
            <G key={i}>
              <Line x1={x} y1={PAD_T + FUEL_H} x2={x} y2={PAD_T + FUEL_H + 4} stroke="#D1D5DB" strokeWidth="1" />
              <SvgText x={x} y={PAD_T + FUEL_H + 14} textAnchor="middle" fontSize="8" fill="#9CA3AF">
                {label}
              </SvgText>
            </G>
          ))}

          {/* ── Panneau vitesse (optionnel) ──────────────────────────────── */}
          {showSpeed && (
            <G>
              <Line
                x1={PAD_L}
                y1={PAD_T + FUEL_H + GAP}
                x2={PAD_L + chartW}
                y2={PAD_T + FUEL_H + GAP}
                stroke="#E5E7EB"
                strokeWidth="1"
              />
              <SvgText x={PAD_L - 4} y={PAD_T + FUEL_H + GAP + 8} textAnchor="end" fontSize="8" fill="#F97316">
                km/h
              </SvgText>
              {positions
                .filter((_, i) => i % Math.max(1, Math.floor(positions.length / 300)) === 0)
                .map((p, i) => {
                  const x = xOf(p.ts);
                  const bh = Math.max((p.speed / data.maxSpeed) * SPEED_H, p.speed > 0 ? 2 : 0);
                  const y = PAD_T + FUEL_H + GAP + SPEED_H - bh;
                  return <Rect key={i} x={x - 1} y={y} width={2} height={bh} fill="#F97316" opacity={0.7} />;
                })}
              {[0, Math.round(data.maxSpeed / 2), data.maxSpeed].map((spd) => (
                <SvgText key={spd} x={PAD_L - 4} y={ySpeed(spd) + 3} textAnchor="end" fontSize="8" fill="#9CA3AF">
                  {spd}
                </SvgText>
              ))}
            </G>
          )}
        </Svg>
      </ScrollView>
    );
  };

  // ── Rendu modal ───────────────────────────────────────────────────────────────

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg.primary }}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: theme.border,
          }}
        >
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <X size={22} color={theme.text.secondary as string} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: theme.text.primary as string }}>
              Analyse carburant
            </Text>
            <Text style={{ fontSize: 12, color: theme.text.muted as string }} numberOfLines={1}>
              {vehicle?.name} · {vehicle?.plate}
            </Text>
          </View>
          {!loading && data && (
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 10, color: theme.text.muted as string }}>
                {data.rawEvents.filter((e) => e.type === 'normal').length} relevés
              </Text>
              <Text style={{ fontSize: 10, color: '#8B5CF6' }}>
                {data.slowDrains.length} slow drain{data.slowDrains.length !== 1 ? 's' : ''} détecté
                {data.slowDrains.length !== 1 ? 's' : ''}
              </Text>
            </View>
          )}
        </View>

        {/* Limite période */}
        {overLimit && (
          <View
            style={{
              margin: 16,
              padding: 14,
              backgroundColor: '#FEF3C7',
              borderRadius: 10,
              borderWidth: 1,
              borderColor: '#F59E0B',
            }}
          >
            <Text style={{ fontSize: 13, color: '#92400E', fontWeight: '600' }}>Période trop longue</Text>
            <Text style={{ fontSize: 12, color: '#92400E', marginTop: 4 }}>
              L'analyse détaillée est limitée à {MAX_DAYS} jours. Réduisez la période dans les filtres du rapport.
            </Text>
          </View>
        )}

        {/* Toggles couches */}
        {!overLimit && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ maxHeight: 52 }}
            contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8, gap: 8, flexDirection: 'row' }}
          >
            {LAYER_CONFIG.map(({ key, label, color, Icon }) => (
              <TouchableOpacity
                key={key}
                onPress={() => toggleLayer(key)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 5,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 20,
                  borderWidth: 1.5,
                  borderColor: layers[key] ? color : theme.border,
                  backgroundColor: layers[key] ? color + '18' : 'transparent',
                }}
                activeOpacity={0.8}
              >
                <Icon size={12} color={layers[key] ? color : (theme.text.muted as string)} />
                <Text
                  style={{ fontSize: 11, fontWeight: '600', color: layers[key] ? color : (theme.text.muted as string) }}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Légende */}
        {!overLimit && !loading && data && (
          <View style={{ paddingHorizontal: 16, paddingBottom: 6 }}>
            <Text style={{ fontSize: 9, color: theme.text.muted as string }}>
              Zones : 🔴 critique (&lt;20%) · 🟡 bas (20-40%) · Hachures = contact allumé · Violet = slow drain · Faire
              défiler →
            </Text>
          </View>
        )}

        {/* Chart area */}
        <View style={{ flex: 1 }}>
          {loading && (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <ActivityIndicator size="large" color={theme.primary} />
              <Text style={{ fontSize: 13, color: theme.text.muted as string }}>Chargement des données…</Text>
            </View>
          )}

          {error && !loading && (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
              <Text style={{ fontSize: 14, color: '#EF4444', textAlign: 'center' }}>{error}</Text>
              <TouchableOpacity
                onPress={loadData}
                style={{
                  marginTop: 12,
                  paddingHorizontal: 20,
                  paddingVertical: 10,
                  backgroundColor: theme.primary,
                  borderRadius: 8,
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>Réessayer</Text>
              </TouchableOpacity>
            </View>
          )}

          {!loading && !error && data && !overLimit && renderChart()}

          {!loading &&
            !error &&
            data &&
            !overLimit &&
            data.rawEvents.filter((e) => e.type === 'normal').length === 0 && (
              <View style={{ padding: 24, alignItems: 'center' }}>
                <Text style={{ fontSize: 13, color: theme.text.muted as string, textAlign: 'center' }}>
                  Aucune donnée carburant sur cette période pour cet engin.
                </Text>
              </View>
            )}
        </View>

        {/* KPIs résumé */}
        {!loading && data && !overLimit && (
          <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: theme.border }}>
            {[
              {
                label: 'Recharges',
                value: String(data.rawEvents.filter((e) => e.type === 'refill').length),
                color: '#22C55E',
              },
              {
                label: 'Vol. rechargé',
                value: `${Math.round(data.rawEvents.filter((e) => e.type === 'refill').reduce((s, e) => s + (e.volume ?? 0), 0))} L`,
                color: '#3B82F6',
              },
              {
                label: 'Baisses',
                value: String(data.rawEvents.filter((e) => e.type === 'theft').length),
                color: '#EF4444',
              },
              { label: 'Slow drains', value: String(data.slowDrains.length), color: '#8B5CF6' },
            ].map(({ label, value, color }) => (
              <View key={label} style={{ flex: 1, alignItems: 'center', paddingVertical: 10 }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color }}>{value}</Text>
                <Text style={{ fontSize: 9, color: theme.text.muted as string, marginTop: 2 }}>{label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Popup event sélectionné */}
        {selectedEvent && (
          <View
            style={{
              position: 'absolute',
              bottom: 80,
              left: 16,
              right: 16,
              backgroundColor: theme.bg.surface,
              borderRadius: 14,
              padding: 16,
              shadowColor: '#000',
              shadowOpacity: 0.18,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 4 },
              borderWidth: 1,
              borderColor: selectedEvent.type === 'refill' ? '#22C55E' : '#EF4444',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '700',
                  color: selectedEvent.type === 'refill' ? '#22C55E' : '#EF4444',
                }}
              >
                {selectedEvent.label}
              </Text>
              <TouchableOpacity onPress={() => setSelectedEvent(null)}>
                <X size={18} color={theme.text.muted as string} />
              </TouchableOpacity>
            </View>
            <Text style={{ fontSize: 12, color: theme.text.secondary as string, marginTop: 6 }}>
              {selectedEvent.detail}
            </Text>
            {selectedEvent.lat && selectedEvent.lng && (
              <TouchableOpacity
                onPress={() => Linking.openURL(`https://maps.google.com/?q=${selectedEvent.lat},${selectedEvent.lng}`)}
                style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 6 }}
              >
                <Text style={{ fontSize: 12, color: '#3B82F6', fontWeight: '600', textDecorationLine: 'underline' }}>
                  📍 Voir la localisation
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}
