import React, { useMemo } from 'react';
import { BarChart3 } from 'lucide-react';

// ─── Gauge SVG ────────────────────────────────────────────────────────────────

const N_SEG = 20;
const G_START = 225; // angle math (0°=droite, CCW) côté "vide"
const G_SWEEP = 270; // degrés total

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy - r * Math.sin(rad) };
}

function segPath(cx: number, cy: number, r: number, i: number): string {
  const step = G_SWEEP / N_SEG;
  const a1 = G_START - i * step;
  const a2 = a1 - (step - 2.5);
  const s = polar(cx, cy, r, a1);
  const e = polar(cx, cy, r, a2);
  return `M ${s.x.toFixed(1)} ${s.y.toFixed(1)} A ${r} ${r} 0 0 1 ${e.x.toFixed(1)} ${e.y.toFixed(1)}`;
}

function segColor(i: number): string {
  const t = i / N_SEG;
  if (t < 0.25) return '#ef4444';
  if (t < 0.5) return '#f97316';
  if (t < 0.75) return '#fbbf24';
  return '#22c55e';
}

function FuelGauge({ level, volume, capacity }: { level: number; volume: number; capacity: number }) {
  const cx = 100,
    cy = 86,
    r = 68;
  const filled = Math.round((Math.min(100, Math.max(0, level)) / 100) * N_SEG);
  const p0 = polar(cx, cy, r, G_START);
  const p100 = polar(cx, cy, r, G_START - G_SWEEP);
  return (
    <svg viewBox="0 0 200 142" className="w-full">
      {Array.from({ length: N_SEG }, (_, i) => (
        <path
          key={i}
          d={segPath(cx, cy, r, i)}
          stroke={i < filled ? segColor(i) : 'var(--border, #e2e8f0)'}
          strokeWidth={12}
          fill="none"
          strokeLinecap="round"
        />
      ))}
      {/* Volume + % à l'intérieur de la jauge */}
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize="28" fontWeight="800" fill="var(--text-primary, #0f172a)">
        {Math.round(volume)}
      </text>
      <text x={cx} y={cy + 13} textAnchor="middle" fontSize="10" fill="var(--text-muted, #94a3b8)">
        ltr
      </text>
      <text x={cx} y={cy + 27} textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--text-secondary, #64748b)">
        ({level}%)
      </text>
      {/* Bornes */}
      <text x={p0.x} y={p0.y + 14} textAnchor="middle" fontSize="9" fill="var(--text-muted, #94a3b8)">
        0
      </text>
      <text x={p100.x} y={p100.y + 14} textAnchor="middle" fontSize="9" fill="var(--text-muted, #94a3b8)">
        {capacity}
      </text>
    </svg>
  );
}

// ─── Ligne de stat ────────────────────────────────────────────────────────────

function StatRow({
  label,
  value,
  sub,
  dim = false,
  accent = false,
}: {
  label: string;
  value: string;
  sub?: string;
  dim?: boolean;
  accent?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0 ${dim ? 'opacity-55' : ''}`}
    >
      <span className="text-[11px] text-[var(--text-secondary)]">{label}</span>
      <div className="text-right leading-tight">
        <span className={`text-[11px] font-bold ${accent ? 'text-red-500' : 'text-[var(--text-primary)]'}`}>
          {value}
        </span>
        {sub && <span className="text-[10px] text-[var(--text-muted)] ml-1">{sub}</span>}
      </div>
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
    <>
      <StatRow
        label="Recharge"
        value={`${fuelStats.totalRefillVolume ?? 0} L`}
        sub={`(${fuelStats.refillCount ?? 0}×)`}
      />
      <StatRow
        label="Baisses suspectes"
        value={`${fuelStats.totalTheftVolume ?? 0} L`}
        sub={`(${fuelStats.theftCount ?? 0}×)`}
        accent={(fuelStats.theftCount ?? 0) > 0}
      />
      <StatRow
        label="Consommation"
        value={`${consommation} L`}
        sub={realL100 !== null ? `(${realL100} L/100km)` : undefined}
      />
      <StatRow label="Gaspillage ralenti" value={`${idleWaste} L`} sub={idleMs > 0 ? idleLabel : undefined} dim />
    </>
  );

  const weekStats = (
    <>
      <StatRow
        label="Recharges"
        value={`${fuelStats.totalRefillVolume ?? 0} L`}
        sub={`(${fuelStats.refillCount ?? 0}×)`}
      />
      <StatRow
        label="Baisses suspectes"
        value={`${fuelStats.totalTheftVolume ?? 0} L`}
        sub={`(${fuelStats.theftCount ?? 0}×)`}
        accent={(fuelStats.theftCount ?? 0) > 0}
      />
      <StatRow
        label="Consommation"
        value={`${fuelStats.totalConsumption ?? 0} L`}
        sub={realL100 !== null ? `(${realL100} L/100km)` : undefined}
      />
      <StatRow label="Gaspillage ralenti" value="—" dim />
    </>
  );

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
                ? 'bg-[var(--card,white)] text-[var(--primary)] shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Jauge centrée */}
      <div className="w-full max-w-[210px] mx-auto">
        <FuelGauge level={current.level ?? 0} volume={current.volume ?? 0} capacity={tankCapacity} />
      </div>

      {/* Stats sous la jauge */}
      <div className="-mt-1">{activeFuelTab === "Aujourd'hui" ? todayStats : weekStats}</div>

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
