import React, { useMemo } from 'react';
import { BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { FuelGauge } from './FuelGauge';

// ─── Carte de stat ────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  color,
  small = false,
  onClick,
}: {
  label: string;
  value: string;
  sub?: string;
  color: string;
  small?: boolean;
  onClick?: () => void;
}) {
  const isClickable = Boolean(onClick);
  const Component: any = isClickable ? 'button' : 'div';
  return (
    <Component
      onClick={onClick}
      className={`flex flex-col gap-0.5 p-2 rounded-lg bg-[var(--bg-elevated)] border border-transparent transition-all text-left ${small ? 'opacity-70' : ''} ${isClickable ? 'hover:border-[var(--primary)] hover:-translate-y-[1px] cursor-pointer' : ''}`}
    >
      <span
        className={`font-medium ${small ? 'text-[9px]' : 'text-[10px]'} text-[var(--text-secondary)] leading-tight`}
      >
        {label}
      </span>
      <span className={`font-bold leading-tight ${small ? 'text-[11px]' : 'text-[13px]'}`} style={{ color }}>
        {value}
      </span>
      {sub && (
        <span className={`${small ? 'text-[8px]' : 'text-[9px]'} text-[var(--text-secondary)] leading-tight`}>
          {sub}
        </span>
      )}
    </Component>
  );
}

// ─── Weekly bar chart ─────────────────────────────────────────────────────────

function levelColor(level: number): string {
  if (level < 25) return '#ef4444';
  if (level < 50) return '#f97316';
  if (level < 75) return '#fbbf24';
  return '#22c55e';
}

function getMondayOfWeek(): Date {
  const today = new Date();
  const day = today.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(today);
  mon.setDate(today.getDate() + diff);
  mon.setHours(0, 0, 0, 0);
  return mon;
}

function buildWeekData(longFuelHistory: any[], fuelRecords: any[]) {
  const monday = getMondayOfWeek();
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const days: Record<
    string,
    {
      label: string;
      volume: number;
      level: number;
      rawDate: string | null;
      debut: number;
      recharge: number;
      baisse: number;
      consommation: number;
    }
  > = {};

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    if (d > today) break;
    const key = d.toISOString().split('T')[0];
    const lbl = d.toLocaleDateString('fr-FR', { weekday: 'short' });
    days[key] = {
      label: lbl.charAt(0).toUpperCase() + lbl.slice(1, 3),
      volume: 0,
      level: 0,
      rawDate: null,
      debut: 0,
      recharge: 0,
      baisse: 0,
      consommation: 0,
    };
  }

  for (const h of longFuelHistory) {
    if (!h.rawDate) continue;
    const key = new Date(h.rawDate).toISOString().split('T')[0];
    if (!days[key]) continue;
    if (days[key].debut === 0) days[key].debut = h.volume ?? 0;
    days[key].volume = h.volume ?? 0;
    days[key].level = h.level ?? 0;
    days[key].rawDate = h.rawDate;
  }

  for (const r of fuelRecords ?? []) {
    const key = new Date(r.date).toISOString().split('T')[0];
    if (!days[key]) continue;
    if (r.type === 'REFILL') days[key].recharge += r.volume ?? 0;
    if (r.type === 'THEFT') days[key].baisse += r.volume ?? 0;
  }

  // Consommation = carburant consommé organiquement (moteur) non expliqué par les baisses flaguées.
  //   consommation = debut + recharge - baisse - fin  (jamais négatif)
  for (const key of Object.keys(days)) {
    const d = days[key];
    const raw = d.debut + d.recharge - d.baisse - d.volume;
    d.consommation = Math.max(0, Math.round(raw * 10) / 10);
  }

  return Object.values(days);
}

const WEEK_TOOLTIP_ROWS = [
  { key: 'debut', label: 'Début', color: 'var(--text-secondary)' },
  { key: 'recharge', label: 'Recharge', color: 'var(--clr-success-strong)' },
  { key: 'baisse', label: 'Baisse', color: 'var(--clr-danger-strong)' },
  { key: 'consommation', label: 'Consommation', color: 'var(--clr-warning-strong)' },
  { key: 'volume', label: 'Fin', color: 'var(--color-info)' },
] as const;

function WeekTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const dt = d.rawDate ? new Date(d.rawDate) : null;
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg shadow-lg p-2.5 text-xs min-w-[130px]">
      {dt && (
        <div className="font-bold text-[var(--text-primary)] mb-1.5">
          {dt.toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'short' })}
        </div>
      )}
      {WEEK_TOOLTIP_ROWS.map((row) => (
        <div key={row.key} className="flex justify-between gap-3 items-center py-0.5">
          <span style={{ color: row.color }} className="font-semibold">
            {row.label}
          </span>
          <span className="font-bold text-[var(--text-primary)]">{(d as any)[row.key]} L</span>
        </div>
      ))}
    </div>
  );
}

function WeeklyBarChart({ longFuelHistory, fuelRecords }: { longFuelHistory: any[]; fuelRecords: any[] }) {
  const data = useMemo(() => buildWeekData(longFuelHistory, fuelRecords), [longFuelHistory, fuelRecords]);

  const CustomBar = (props: any) => {
    const { x, y, width, height, payload } = props;
    if (!height || height <= 0) return null;
    return <rect x={x} y={y} width={width} height={height} fill={levelColor(payload.level)} rx={3} ry={3} />;
  };

  return (
    <div className="h-44 w-full mt-1">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barSize={22} barCategoryGap="25%">
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'var(--text-secondary, #64748b)', fontSize: 10, fontWeight: 600 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'var(--text-muted, #94a3b8)', fontSize: 9 }}
            unit=" L"
            domain={[0, 'auto']}
          />
          <Tooltip content={<WeekTooltip />} cursor={{ fill: 'var(--bg-elevated)', opacity: 0.4 }} />
          <Bar dataKey="volume" shape={<CustomBar />} radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface FuelBlockProps {
  mockData: any;
  isConfigMode: boolean;
  hiddenFields: Set<string>;
  toggleFieldVisibility: (id: string) => void;
  activeFuelTab: string;
  setActiveFuelTab: (tab: string) => void;
  setActiveModal: (modal: string) => void;
  idleMs: number;
  totalDistance: number;
}

// ─── FuelBlock ────────────────────────────────────────────────────────────────

export const FuelBlock: React.FC<FuelBlockProps> = ({
  mockData,
  activeFuelTab,
  setActiveFuelTab,
  setActiveModal,
  idleMs,
  totalDistance,
}) => {
  const fuelStats = mockData.fuelStats ?? {};
  const fuelHistory: any[] = mockData.fuelHistory ?? [];
  const tankCapacity: number = fuelStats.tankCapacity || 0;

  // Niveau courant : dernier point aujourd'hui ou dernier connu
  const current = useMemo(() => {
    const midnight = new Date();
    midnight.setHours(0, 0, 0, 0);
    const today = fuelHistory.filter((h) => h.rawDate && new Date(h.rawDate) >= midnight);
    return today.length > 0
      ? today[today.length - 1]
      : (fuelHistory[fuelHistory.length - 1] ?? { level: 0, volume: 0 });
  }, [fuelHistory]);

  // Consommation du jour : fuel(00:00) + recharges − baisses − fuel(maintenant)
  const consommation = useMemo(() => {
    const midnight = new Date();
    midnight.setHours(0, 0, 0, 0);
    const today = fuelHistory.filter((h) => h.rawDate && new Date(h.rawDate) >= midnight);
    if (today.length === 0) return 0;
    const start = today[0].volume ?? 0;
    const end = current.volume ?? 0;
    const refills = fuelStats.totalRefillVolume ?? 0;
    const thefts = fuelStats.totalTheftVolume ?? 0;
    return Math.max(0, Math.round((start + refills - thefts - end) * 10) / 10);
  }, [fuelHistory, current, fuelStats]);

  // Gaspillage ralenti : temps_ralenti_h × 1.89 L/h
  const idleWaste = useMemo(() => Math.round((idleMs / 3_600_000) * 1.89 * 10) / 10, [idleMs]);

  const TABS = ["Aujourd'hui", 'Cette semaine'] as const;

  const realL100 =
    totalDistance > 0 && consommation > 0 ? Math.round((consommation / totalDistance) * 100 * 10) / 10 : null;
  const idleHours = idleMs / 3_600_000;
  const idleLabel =
    idleHours >= 1
      ? `(${Math.floor(idleHours)}h${String(Math.round((idleHours % 1) * 60)).padStart(2, '0')})`
      : `(${Math.round(idleHours * 60)} min)`;

  const todayStats = (
    <div className="grid grid-cols-2 gap-2">
      <StatCard
        label="Recharge"
        value={`${fuelStats.totalRefillVolume ?? 0} L`}
        sub={`${fuelStats.refillCount ?? 0} fois`}
        color="#22c55e"
        onClick={() => setActiveModal('fuelEvents:REFILL')}
      />
      <StatCard
        label="Baisses suspectes"
        value={`${fuelStats.totalTheftVolume ?? 0} L`}
        sub={`${fuelStats.theftCount ?? 0} fois`}
        color="#ef4444"
        onClick={() => setActiveModal('fuelEvents:THEFT')}
      />
      <StatCard
        label="Consommation"
        value={`${consommation} L`}
        sub={realL100 !== null ? `${realL100} L/100km` : undefined}
        color="#fbbf24"
      />
      <StatCard
        label="Pertes au ralenti"
        value={`${idleWaste} L`}
        sub={idleMs > 0 ? idleLabel : undefined}
        color="#fbbf24"
        small
      />
    </div>
  );

  const longFuelHistory: any[] = mockData.longFuelHistory ?? [];
  const fuelRecords: any[] = mockData.fuelRecords ?? [];

  return (
    <div className="space-y-3">
      {/* Tabs */}
      <div className="flex bg-[var(--bg-elevated)] p-1 rounded-lg">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveFuelTab(tab)}
            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
              activeFuelTab === tab
                ? 'bg-[var(--bg-card)] text-[var(--primary)] shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Jauge — Aujourd'hui uniquement */}
      {activeFuelTab === "Aujourd'hui" && (
        <div className="w-full max-w-[210px] mx-auto">
          <FuelGauge level={current.volume ?? 0} percentage={current.level ?? 0} maxCapacity={tankCapacity} />
        </div>
      )}

      {/* Stats / chart semaine */}
      {activeFuelTab === "Aujourd'hui" && <div className="-mt-1">{todayStats}</div>}
      {activeFuelTab === 'Cette semaine' && (
        <WeeklyBarChart longFuelHistory={longFuelHistory} fuelRecords={fuelRecords} />
      )}

      {/* Bouton unique */}
      <button
        onClick={() => setActiveModal('fuel')}
        className="w-full py-2 text-xs text-[var(--primary)] font-bold hover:bg-[var(--primary-dim)] rounded transition-colors flex items-center justify-center gap-1 border-t border-[var(--border)] pt-3"
      >
        <BarChart3 className="w-3 h-3" /> Courbe & détails
      </button>
    </div>
  );
};
