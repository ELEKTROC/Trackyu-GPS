import React, { useState, useMemo, useEffect } from 'react';
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
} from 'recharts';
import { MapPin } from 'lucide-react';
import { geocodeCoordCached } from '../../../../../utils/geocoding';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FuelPoint {
  date: string;
  rawDate?: string;
  level: number;
  volume: number;
  conso?: number;
}

interface FuelRefill {
  id: string;
  type: string;
  date: string | Date;
  location?: string;
  volume: number;
  cost: number;
  fuelType?: string;
}

interface FuelModalContentProps {
  todayHistory: FuelPoint[];
  weekHistory: FuelPoint[];
  stats: any;
  refills: FuelRefill[];
  positionHistory: any[];
  idleMs: number;
  totalDistance: number;
  onOpenEvents?: (type: 'REFILL' | 'THEFT') => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function findNearestPosition(positions: any[], rawDate: string): any | null {
  if (!positions.length || !rawDate) return null;
  const ts = new Date(rawDate).getTime();
  return positions.reduce((best, p) => {
    const d = Math.abs(new Date(p.time ?? p.timestamp).getTime() - ts);
    const bd = Math.abs(new Date(best.time ?? best.timestamp).getTime() - ts);
    return d < bd ? p : best;
  });
}

function computeIdleWasteCurve(fuelPoints: FuelPoint[], positions: any[]): (FuelPoint & { idleWaste: number })[] {
  if (!positions.length) return fuelPoints.map((fp) => ({ ...fp, idleWaste: 0 }));
  const sorted = [...positions].sort(
    (a, b) => new Date(a.time ?? a.timestamp).getTime() - new Date(b.time ?? b.timestamp).getTime()
  );
  return fuelPoints.map((fp) => {
    if (!fp.rawDate) return { ...fp, idleWaste: 0 };
    const fpTs = new Date(fp.rawDate).getTime();
    let idleMs = 0;
    for (let i = 0; i < sorted.length - 1; i++) {
      const curr = sorted[i];
      const next = sorted[i + 1];
      const currTs = new Date(curr.time ?? curr.timestamp).getTime();
      const nextTs = new Date(next.time ?? next.timestamp).getTime();
      if (currTs >= fpTs) break;
      if (curr.status === 'idle') {
        idleMs += Math.min(nextTs, fpTs) - currTs;
      }
    }
    return { ...fp, idleWaste: Math.round((idleMs / 3_600_000) * 1.89 * 10) / 10 };
  });
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────

function FuelTooltip({
  active,
  payload,
  positionHistory,
  weekMode,
}: {
  active?: boolean;
  payload?: any[];
  positionHistory: any[];
  weekMode?: boolean;
}) {
  const [address, setAddress] = useState<string | null>(null);
  const point = payload?.[0]?.payload as (FuelPoint & { idleWaste?: number }) | undefined;

  useEffect(() => {
    if (!active || !point?.rawDate || weekMode) {
      setAddress(null);
      return;
    }
    const pos = findNearestPosition(positionHistory, point.rawDate);
    if (!pos) return;
    const lat = pos.location?.lat ?? pos.lat;
    const lng = pos.location?.lng ?? pos.lng;
    if (lat && lng) geocodeCoordCached(lat, lng).then(setAddress);
  }, [active, point?.rawDate, weekMode]);

  if (!active || !point) return null;

  const dt = point.rawDate ? new Date(point.rawDate) : null;

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg shadow-lg p-3 text-xs min-w-[160px]">
      <div className="font-bold text-[14px] text-[var(--text-primary)]">{point.volume} L</div>
      <div className="text-[var(--text-secondary)]">{point.level}%</div>
      {dt && (
        <div className="text-[var(--text-secondary)] mt-1">
          {dt.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' })}
          {' · '}
          {dt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
        </div>
      )}
      {!weekMode &&
        (address ? (
          <div className="text-[var(--text-muted)] mt-1 leading-tight flex gap-1">
            <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
            {address}
          </div>
        ) : (
          <div className="text-[var(--text-muted)] mt-1 italic text-[10px]">Localisation…</div>
        ))}
      {point.idleWaste != null && point.idleWaste > 0 && (
        <div className="text-orange-400 mt-1">Pertes ralenti : {point.idleWaste} L</div>
      )}
    </div>
  );
}

// ─── Tooltip événement (refill/baisse) ────────────────────────────────────────

function EventTooltip({
  event,
  positionHistory,
}: {
  event: FuelRefill & { x: string; y: number };
  positionHistory: any[];
}) {
  const [address, setAddress] = useState<string | null>(null);

  useEffect(() => {
    const rawDate = typeof event.date === 'string' ? event.date : event.date.toISOString();
    const pos = findNearestPosition(positionHistory, rawDate);
    if (!pos) return;
    const lat = pos.location?.lat ?? pos.lat;
    const lng = pos.location?.lng ?? pos.lng;
    if (lat && lng) geocodeCoordCached(lat, lng).then(setAddress);
  }, [event.date]);

  const isRefill = event.type === 'REFILL';
  const dt = new Date(event.date);

  return (
    <div
      className={`bg-[var(--bg-card)] border rounded-lg shadow-lg p-3 text-xs min-w-[160px] ${isRefill ? 'border-green-400' : 'border-red-400'}`}
    >
      <div className={`font-bold text-[13px] ${isRefill ? 'text-green-600' : 'text-red-500'}`}>
        {isRefill ? '⛽' : '⚠'} {isRefill ? '+' : '-'}
        {event.volume} L
      </div>
      <div className="text-[var(--text-secondary)] mt-1">
        {dt.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
        {' · '}
        {dt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
      </div>
      {address ? (
        <div className="text-[var(--text-muted)] mt-1 flex gap-1">
          <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
          {address}
        </div>
      ) : (
        <div className="text-[var(--text-muted)] mt-1 italic text-[10px]">Localisation…</div>
      )}
    </div>
  );
}

// ─── Carte KPI ────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  color,
  onClick,
}: {
  label: string;
  value: string;
  sub?: string;
  color: string;
  onClick?: () => void;
}) {
  const isClickable = Boolean(onClick);
  const Component: any = isClickable ? 'button' : 'div';
  return (
    <Component
      onClick={onClick}
      className={`flex flex-col gap-1 p-4 rounded-[var(--brand-radius)] bg-[var(--bg-card)] text-left transition-all ${
        isClickable ? 'hover:ring-1 hover:ring-[var(--brand-primary)]/30 hover:-translate-y-px cursor-pointer' : ''
      }`}
    >
      <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">{label}</span>
      <span className="font-black font-mono text-xl leading-tight" style={{ color }}>
        {value}
      </span>
      {sub && <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-tight">{sub}</span>}
    </Component>
  );
}

// ─── FuelModalContent ─────────────────────────────────────────────────────────

export const FuelModalContent: React.FC<FuelModalContentProps> = ({
  todayHistory,
  weekHistory,
  stats = {},
  refills = [],
  positionHistory = [],
  idleMs,
  totalDistance,
  onOpenEvents,
}) => {
  const [activeTab, setActiveTab] = useState<"Aujourd'hui" | 'Cette semaine'>("Aujourd'hui");
  const [hoveredEvent, setHoveredEvent] = useState<string | null>(null);

  // ── Calculs Aujourd'hui ──
  const midnight = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const todayPoints = useMemo(
    () => todayHistory.filter((h) => h.rawDate && new Date(h.rawDate) >= midnight),
    [todayHistory, midnight]
  );

  const consommation = useMemo(() => {
    if (todayPoints.length === 0) return 0;
    const start = todayPoints[0].volume ?? 0;
    const end = todayPoints[todayPoints.length - 1].volume ?? 0;
    const refillTotal = stats.totalRefillVolume ?? 0;
    const theftTotal = stats.totalTheftVolume ?? 0;
    return Math.max(0, Math.round((start + refillTotal - theftTotal - end) * 10) / 10);
  }, [todayPoints, stats]);

  const realL100 =
    totalDistance > 0 && consommation > 0 ? Math.round((consommation / totalDistance) * 100 * 10) / 10 : null;

  const idleWasteTotal = Math.round((idleMs / 3_600_000) * 1.89 * 10) / 10;
  const idleHours = idleMs / 3_600_000;
  const idleLabel =
    idleHours >= 1
      ? `${Math.floor(idleHours)}h${String(Math.round((idleHours % 1) * 60)).padStart(2, '0')}`
      : `${Math.round(idleHours * 60)} min`;

  // ── Données chart Aujourd'hui avec courbe ralenti ──
  const todayChartData = useMemo(
    () => computeIdleWasteCurve(todayPoints.length > 0 ? todayPoints : todayHistory, positionHistory),
    [todayPoints, todayHistory, positionHistory]
  );

  // ── Données chart Cette semaine (7 derniers jours) avec courbe ralenti ──
  const weekChartData = useMemo(() => {
    const weekStart = new Date(midnight);
    weekStart.setDate(weekStart.getDate() - 6);
    const filtered = weekHistory.filter((h) => !h.rawDate || new Date(h.rawDate) >= weekStart);
    return computeIdleWasteCurve(filtered, positionHistory);
  }, [weekHistory, midnight, positionHistory]);

  // ── Enrichissement des points avec marqueurs événements (point le plus proche, sans seuil) ──
  const enrichedChartData = useMemo(() => {
    const base = activeTab === "Aujourd'hui" ? todayChartData : weekChartData;
    if (!refills.length) return base;
    const eventsByIndex = new Map<
      number,
      { isRefill: boolean; isTheft: boolean; refillVol?: number; theftVol?: number }
    >();
    for (const r of refills) {
      if (r.type !== 'REFILL' && r.type !== 'THEFT') continue;
      const ts = new Date(r.date).getTime();
      let nearestIdx = 0;
      let nearestDist = Infinity;
      for (let i = 0; i < base.length; i++) {
        const p = base[i];
        if (!p.rawDate) continue;
        const d = Math.abs(new Date(p.rawDate).getTime() - ts);
        if (d < nearestDist) {
          nearestDist = d;
          nearestIdx = i;
        }
      }
      const existing = eventsByIndex.get(nearestIdx) ?? { isRefill: false, isTheft: false };
      if (r.type === 'REFILL') {
        existing.isRefill = true;
        existing.refillVol = r.volume;
      }
      if (r.type === 'THEFT') {
        existing.isTheft = true;
        existing.theftVol = r.volume;
      }
      eventsByIndex.set(nearestIdx, existing);
    }
    return base.map((point, idx) => {
      const evt = eventsByIndex.get(idx);
      return evt ? { ...point, ...evt } : point;
    });
  }, [activeTab, todayChartData, weekChartData, refills]);

  // ── Niveau actuel ──
  const currentFuel = todayHistory.length > 0 ? todayHistory[todayHistory.length - 1] : null;

  // ── KPIs semaine (données partielles côté backend) ──
  const weekKpis = {
    consommation: stats.totalConsumption ?? consommation,
    recharges: stats.totalRefillVolume ?? 0,
    baisses: stats.totalTheftVolume ?? 0,
    ralenti: idleWasteTotal,
  };

  const currentChartData = enrichedChartData;
  const yDomain: [number | string, number | string] = ['auto', 'auto'];

  const TABS = ["Aujourd'hui", 'Cette semaine'] as const;

  return (
    <div className="p-5 space-y-5">
      {/* Tabs */}
      <div className="flex bg-[var(--bg-elevated)] p-1 rounded-lg">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as typeof activeTab)}
            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
              activeTab === tab
                ? 'bg-[var(--bg-card)] text-[var(--primary)] shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3">
        <KpiCard
          label="Consommation"
          value={`${activeTab === "Aujourd'hui" ? consommation : weekKpis.consommation} L`}
          sub={realL100 !== null ? `${realL100} L/100 km` : undefined}
          color="var(--clr-warning-strong)"
        />
        <KpiCard
          label="Recharges"
          value={`${activeTab === "Aujourd'hui" ? (stats.totalRefillVolume ?? 0) : weekKpis.recharges} L`}
          sub={`${stats.refillCount ?? 0} fois`}
          color="var(--clr-success-strong)"
          onClick={onOpenEvents ? () => onOpenEvents('REFILL') : undefined}
        />
        <KpiCard
          label="Baisses suspectes"
          value={`${activeTab === "Aujourd'hui" ? (stats.totalTheftVolume ?? 0) : weekKpis.baisses} L`}
          sub={`${stats.theftCount ?? 0} fois`}
          color="var(--clr-danger-strong)"
          onClick={onOpenEvents ? () => onOpenEvents('THEFT') : undefined}
        />
        <KpiCard
          label="Niveau actuel"
          value={
            stats.tankCapacity
              ? `${currentFuel?.volume ?? 0} / ${Number(stats.tankCapacity)} L`
              : `${currentFuel?.volume ?? 0} L`
          }
          sub={currentFuel ? `${currentFuel.level}% · capacité ${stats.tankCapacity ?? '—'} L` : undefined}
          color="var(--color-info)"
        />
      </div>
      {/* Pertes au ralenti — retrait */}
      {idleMs > 0 && (
        <div className="text-[10px] text-[var(--text-muted)] flex gap-1 -mt-2 px-1">
          <span>Pertes au ralenti :</span>
          <span className="font-medium text-orange-400">{idleWasteTotal} L</span>
          <span>({idleLabel})</span>
        </div>
      )}

      {/* Graphique */}
      <section>
        <h3 className="text-xs font-bold text-[var(--text-secondary)] mb-3 uppercase tracking-wide">
          Niveau de carburant
        </h3>
        {currentChartData.length > 0 ? (
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={currentChartData} margin={{ top: 5, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="fuelGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border, #e2e8f0)" />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--text-muted, #94a3b8)', fontSize: 10 }}
                  interval="preserveStartEnd"
                  dy={6}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--text-muted, #94a3b8)', fontSize: 10 }}
                  domain={yDomain}
                  unit=" L"
                />
                <Tooltip
                  content={(props: any) => (
                    <FuelTooltip
                      active={props.active}
                      payload={props.payload}
                      positionHistory={positionHistory}
                      weekMode={activeTab === 'Cette semaine'}
                    />
                  )}
                />
                {/* Courbe niveau carburant */}
                <Area
                  type="monotone"
                  dataKey="volume"
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  fill="url(#fuelGrad)"
                  dot={(props: any) => {
                    const { cx, cy, payload } = props;
                    if (payload.isRefill)
                      return (
                        <g key={`r-${cx}`}>
                          <circle cx={cx} cy={cy} r={8} fill="#22c55e" stroke="white" strokeWidth={2} />
                          <text x={cx} y={cy + 4} textAnchor="middle" fontSize="10" fill="white">
                            ⛽
                          </text>
                        </g>
                      );
                    if (payload.isTheft)
                      return (
                        <g key={`t-${cx}`}>
                          <circle cx={cx} cy={cy} r={8} fill="#ef4444" stroke="white" strokeWidth={2} />
                          <text x={cx} y={cy + 4} textAnchor="middle" fontSize="10" fill="white">
                            ⚠
                          </text>
                        </g>
                      );
                    return <g key={`n-${cx}`} />;
                  }}
                  activeDot={{ r: 4, fill: '#3b82f6' }}
                />
                {/* Courbe pertes au ralenti */}
                <Line
                  type="monotone"
                  dataKey="idleWaste"
                  stroke="#f97316"
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                  dot={false}
                  activeDot={{ r: 3, fill: '#f97316' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-36 flex items-center justify-center text-[var(--text-muted)] text-sm">
            Aucune donnée disponible
          </div>
        )}
        {/* Légende */}
        <div className="flex gap-4 mt-2 text-[10px] text-[var(--text-secondary)]">
          <span className="flex items-center gap-1">
            <span className="inline-block w-4 h-0.5 bg-blue-500 rounded" /> Niveau (L)
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-4 border-t-2 border-dashed border-orange-400" /> Pertes ralenti
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-green-500" /> Recharge
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-red-500" /> Baisse
          </span>
        </div>
      </section>

      {/* Dernières recharges */}
      <section>
        <h3 className="text-xs font-bold text-[var(--text-secondary)] mb-3 uppercase tracking-wide">
          Dernières recharges
        </h3>
        <div className="space-y-2">
          {refills.filter((r) => r.type === 'REFILL').length > 0 ? (
            refills
              .filter((r) => r.type === 'REFILL')
              .map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between p-3 rounded-xl border border-[var(--border)] hover:bg-[var(--bg-elevated)] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center text-green-600 text-base">
                      ⛽
                    </div>
                    <div>
                      <div className="text-[12px] font-bold text-[var(--text-primary)]">
                        {r.location || 'Station inconnue'}
                      </div>
                      <div className="text-[10px] text-[var(--text-muted)]">
                        {new Date(r.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                        {' · '}
                        {new Date(r.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        {r.fuelType ? ` · ${r.fuelType}` : ''}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[13px] font-bold text-green-600">+{r.volume} L</div>
                    {r.cost > 0 && <div className="text-[10px] text-[var(--text-muted)]">{r.cost}</div>}
                  </div>
                </div>
              ))
          ) : (
            <div className="text-center text-[var(--text-muted)] text-sm py-4">Aucun plein enregistré</div>
          )}
        </div>
      </section>
    </div>
  );
};
