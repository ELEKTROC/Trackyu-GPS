/**
 * TrackYu Mobile — VehicleTypeIcon
 * Icônes pseudo-3D SVG pour chaque type de véhicule (top-down + dégradés + ombre portée).
 * Usage : <VehicleTypeIcon type="car" color="#F59E0B" size={40} />
 */
import React from 'react';
import Svg, { Defs, LinearGradient, RadialGradient, Stop, Rect, Ellipse, Circle, Path, G } from 'react-native-svg';

export type VehicleType =
  | 'car'
  | 'voiture'
  | 'sedan'
  | 'truck'
  | 'camion'
  | 'motorcycle'
  | 'moto'
  | 'bike'
  | 'bus'
  | 'autobus'
  | 'van'
  | 'utilitaire'
  | 'pickup'
  | 'tractor'
  | 'tracteur'
  | 'engin'
  | string;

function isValidHex(hex: string): boolean {
  return typeof hex === 'string' && /^#[0-9A-Fa-f]{6}$/.test(hex);
}

function lighten(hex: string, pct: number): string {
  if (!isValidHex(hex)) return hex || '#F59E0B';
  const n = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, ((n >> 16) & 0xff) + Math.round(255 * pct));
  const g = Math.min(255, ((n >> 8) & 0xff) + Math.round(255 * pct));
  const b = Math.min(255, (n & 0xff) + Math.round(255 * pct));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function darken(hex: string, pct: number): string {
  if (!isValidHex(hex)) return hex || '#F59E0B';
  const n = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, ((n >> 16) & 0xff) - Math.round(255 * pct));
  const g = Math.max(0, ((n >> 8) & 0xff) - Math.round(255 * pct));
  const b = Math.max(0, (n & 0xff) - Math.round(255 * pct));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// ── Car ───────────────────────────────────────────────────────────────────────
function CarSvg({ color, s }: { color: string; s: number }) {
  const light = lighten(color, 0.25);
  const dark = darken(color, 0.2);
  const id = `car_${color.replace('#', '')}`;
  return (
    <Svg width={s} height={s * 0.65} viewBox="0 0 60 39">
      <Defs>
        <RadialGradient id={`${id}_sh`} cx="0.5" cy="0.6" r="0.5">
          <Stop offset="0" stopColor="#000" stopOpacity="0.35" />
          <Stop offset="1" stopColor="#000" stopOpacity="0" />
        </RadialGradient>
        <LinearGradient id={`${id}_body`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={light} />
          <Stop offset="1" stopColor={dark} />
        </LinearGradient>
        <LinearGradient id={`${id}_roof`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={lighten(color, 0.35)} />
          <Stop offset="1" stopColor={color} />
        </LinearGradient>
      </Defs>
      {/* Ombre portée */}
      <Ellipse cx="30" cy="36.5" rx="23" ry="2.5" fill={`url(#${id}_sh)`} />
      {/* Carrosserie */}
      <Rect x="4" y="14" width="52" height="20" rx="5" fill={`url(#${id}_body)`} />
      {/* Côté gauche (ombre) */}
      <Path d="M4 18 Q4 14 9 14 L9 34 Q4 34 4 30 Z" fill={dark} opacity="0.4" />
      {/* Habitacle / toit */}
      <Rect x="13" y="7" width="34" height="15" rx="6" fill={`url(#${id}_roof)`} />
      {/* Vitre avant */}
      <Rect x="14" y="8" width="13" height="9" rx="3" fill="#90CAF9" opacity="0.75" />
      {/* Vitre arrière */}
      <Rect x="33" y="8" width="13" height="9" rx="3" fill="#90CAF9" opacity="0.75" />
      {/* Phares avant */}
      <Ellipse cx="54" cy="17" rx="2.5" ry="1.8" fill="#FFFDE7" opacity="0.9" />
      <Ellipse cx="54" cy="27" rx="2.5" ry="1.8" fill="#FFFDE7" opacity="0.9" />
      {/* Feux arrière */}
      <Ellipse cx="6" cy="17" rx="2" ry="1.5" fill="#EF5350" opacity="0.85" />
      <Ellipse cx="6" cy="27" rx="2" ry="1.5" fill="#EF5350" opacity="0.85" />
      {/* Roues */}
      {[
        [11, 12],
        [49, 12],
        [11, 32],
        [49, 32],
      ].map(([cx, cy], i) => (
        <G key={i}>
          <Ellipse cx={cx} cy={cy} rx="5" ry="4" fill="#1A1A2E" />
          <Ellipse cx={cx} cy={cy} rx="3" ry="2.4" fill="#37474F" />
          <Circle cx={cx} cy={cy} r="1.2" fill="#546E7A" />
        </G>
      ))}
    </Svg>
  );
}

// ── Truck ─────────────────────────────────────────────────────────────────────
function TruckSvg({ color, s }: { color: string; s: number }) {
  const light = lighten(color, 0.2);
  const dark = darken(color, 0.25);
  const id = `truck_${color.replace('#', '')}`;
  return (
    <Svg width={s * 1.4} height={s * 0.65} viewBox="0 0 84 39">
      <Defs>
        <RadialGradient id={`${id}_sh`} cx="0.5" cy="0.6" r="0.5">
          <Stop offset="0" stopColor="#000" stopOpacity="0.3" />
          <Stop offset="1" stopColor="#000" stopOpacity="0" />
        </RadialGradient>
        <LinearGradient id={`${id}_cab`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={light} />
          <Stop offset="1" stopColor={dark} />
        </LinearGradient>
        <LinearGradient id={`${id}_cargo`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={lighten(color, 0.1)} />
          <Stop offset="1" stopColor={darken(color, 0.35)} />
        </LinearGradient>
      </Defs>
      {/* Ombre */}
      <Ellipse cx="42" cy="36.5" rx="36" ry="2.5" fill={`url(#${id}_sh)`} />
      {/* Remorque / cargo */}
      <Rect x="4" y="12" width="52" height="22" rx="3" fill={`url(#${id}_cargo)`} />
      <Path d="M4 15 Q4 12 7 12 L7 34 Q4 34 4 31 Z" fill={dark} opacity="0.45" />
      {/* Cabine */}
      <Rect x="56" y="10" width="24" height="24" rx="5" fill={`url(#${id}_cab)`} />
      <Path d="M56 14 Q56 10 60 10 L60 34 Q56 34 56 30 Z" fill={dark} opacity="0.4" />
      {/* Vitre cabine */}
      <Rect x="66" y="11" width="12" height="10" rx="3" fill="#90CAF9" opacity="0.8" />
      {/* Phares */}
      <Ellipse cx="79" cy="16" rx="2" ry="1.5" fill="#FFFDE7" opacity="0.9" />
      <Ellipse cx="79" cy="28" rx="2" ry="1.5" fill="#FFFDE7" opacity="0.9" />
      {/* Feux arrière */}
      <Ellipse cx="6" cy="16" rx="1.8" ry="1.4" fill="#EF5350" opacity="0.85" />
      <Ellipse cx="6" cy="28" rx="1.8" ry="1.4" fill="#EF5350" opacity="0.85" />
      {/* Roues cargo */}
      {[
        [12, 33],
        [30, 33],
        [48, 33],
      ].map(([cx, cy], i) => (
        <G key={i}>
          <Ellipse cx={cx} cy={cy} rx="5" ry="4" fill="#1A1A2E" />
          <Ellipse cx={cx} cy={cy} rx="3" ry="2.4" fill="#37474F" />
          <Circle cx={cx} cy={cy} r="1.2" fill="#546E7A" />
        </G>
      ))}
      {/* Roues cabine */}
      {[
        [63, 33],
        [75, 33],
      ].map(([cx, cy], i) => (
        <G key={i + 10}>
          <Ellipse cx={cx} cy={cy} rx="5" ry="4" fill="#1A1A2E" />
          <Ellipse cx={cx} cy={cy} rx="3" ry="2.4" fill="#37474F" />
          <Circle cx={cx} cy={cy} r="1.2" fill="#546E7A" />
        </G>
      ))}
    </Svg>
  );
}

// ── Motorcycle ────────────────────────────────────────────────────────────────
function MotorcycleSvg({ color, s }: { color: string; s: number }) {
  const light = lighten(color, 0.3);
  const dark = darken(color, 0.2);
  const id = `moto_${color.replace('#', '')}`;
  return (
    <Svg width={s * 0.6} height={s * 0.8} viewBox="0 0 36 48">
      <Defs>
        <RadialGradient id={`${id}_sh`} cx="0.5" cy="0.6" r="0.5">
          <Stop offset="0" stopColor="#000" stopOpacity="0.3" />
          <Stop offset="1" stopColor="#000" stopOpacity="0" />
        </RadialGradient>
        <LinearGradient id={`${id}_body`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={light} />
          <Stop offset="1" stopColor={dark} />
        </LinearGradient>
      </Defs>
      {/* Ombre */}
      <Ellipse cx="18" cy="45.5" rx="12" ry="2" fill={`url(#${id}_sh)`} />
      {/* Roue arrière */}
      <Ellipse cx="18" cy="38" rx="8" ry="7" fill="#1A1A2E" />
      <Ellipse cx="18" cy="38" rx="5" ry="4.5" fill="#37474F" />
      <Circle cx="18" cy="38" r="2" fill="#546E7A" />
      {/* Roue avant */}
      <Ellipse cx="18" cy="11" rx="8" ry="7" fill="#1A1A2E" />
      <Ellipse cx="18" cy="11" rx="5" ry="4.5" fill="#37474F" />
      <Circle cx="18" cy="11" r="2" fill="#546E7A" />
      {/* Cadre / corps */}
      <Rect x="14" y="14" width="8" height="20" rx="3" fill={`url(#${id}_body)`} />
      {/* Réservoir / carénage */}
      <Ellipse cx="18" cy="22" rx="6" ry="7" fill={color} />
      <Ellipse cx="18" cy="19" rx="4" ry="3" fill={light} opacity="0.7" />
      {/* Guidon */}
      <Rect x="10" y="14" width="16" height="2.5" rx="1.5" fill="#78909C" />
      {/* Selle */}
      <Ellipse cx="18" cy="30" rx="4" ry="3" fill={dark} />
    </Svg>
  );
}

// ── Bus ───────────────────────────────────────────────────────────────────────
function BusSvg({ color, s }: { color: string; s: number }) {
  const light = lighten(color, 0.2);
  const dark = darken(color, 0.3);
  const id = `bus_${color.replace('#', '')}`;
  return (
    <Svg width={s * 1.5} height={s * 0.65} viewBox="0 0 90 39">
      <Defs>
        <RadialGradient id={`${id}_sh`} cx="0.5" cy="0.6" r="0.5">
          <Stop offset="0" stopColor="#000" stopOpacity="0.3" />
          <Stop offset="1" stopColor="#000" stopOpacity="0" />
        </RadialGradient>
        <LinearGradient id={`${id}_body`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={light} />
          <Stop offset="1" stopColor={dark} />
        </LinearGradient>
        <LinearGradient id={`${id}_roof`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={lighten(color, 0.4)} />
          <Stop offset="1" stopColor={light} />
        </LinearGradient>
      </Defs>
      {/* Ombre */}
      <Ellipse cx="45" cy="36.5" rx="40" ry="2.5" fill={`url(#${id}_sh)`} />
      {/* Corps principal */}
      <Rect x="3" y="10" width="84" height="24" rx="4" fill={`url(#${id}_body)`} />
      {/* Toit */}
      <Rect x="3" y="10" width="84" height="6" rx="3" fill={`url(#${id}_roof)`} />
      {/* Côté ombre */}
      <Path d="M3 14 Q3 10 6 10 L6 34 Q3 34 3 30 Z" fill={dark} opacity="0.45" />
      {/* Fenêtres */}
      {[10, 24, 38, 52, 66].map((x, i) => (
        <Rect key={i} x={x} y="13" width="10" height="7" rx="2" fill="#90CAF9" opacity="0.75" />
      ))}
      {/* Porte */}
      <Rect x="76" y="14" width="8" height="16" rx="2" fill="#78909C" opacity="0.5" />
      {/* Phares avant */}
      <Ellipse cx="86" cy="15" rx="2" ry="1.5" fill="#FFFDE7" opacity="0.9" />
      <Ellipse cx="86" cy="27" rx="2" ry="1.5" fill="#FFFDE7" opacity="0.9" />
      {/* Feux arrière */}
      <Rect x="3" y="13" width="3" height="5" rx="1" fill="#EF5350" opacity="0.85" />
      <Rect x="3" y="24" width="3" height="5" rx="1" fill="#EF5350" opacity="0.85" />
      {/* Roues */}
      {[
        [12, 33],
        [30, 33],
        [60, 33],
        [78, 33],
      ].map(([cx, cy], i) => (
        <G key={i}>
          <Ellipse cx={cx} cy={cy} rx="5.5" ry="4.5" fill="#1A1A2E" />
          <Ellipse cx={cx} cy={cy} rx="3.5" ry="2.8" fill="#37474F" />
          <Circle cx={cx} cy={cy} r="1.4" fill="#546E7A" />
        </G>
      ))}
    </Svg>
  );
}

// ── Van / Utilitaire ──────────────────────────────────────────────────────────
function VanSvg({ color, s }: { color: string; s: number }) {
  const light = lighten(color, 0.22);
  const dark = darken(color, 0.28);
  const id = `van_${color.replace('#', '')}`;
  return (
    <Svg width={s * 1.1} height={s * 0.7} viewBox="0 0 66 42">
      <Defs>
        <RadialGradient id={`${id}_sh`} cx="0.5" cy="0.6" r="0.5">
          <Stop offset="0" stopColor="#000" stopOpacity="0.3" />
          <Stop offset="1" stopColor="#000" stopOpacity="0" />
        </RadialGradient>
        <LinearGradient id={`${id}_body`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={light} />
          <Stop offset="1" stopColor={dark} />
        </LinearGradient>
        <LinearGradient id={`${id}_roof`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={lighten(color, 0.4)} />
          <Stop offset="1" stopColor={color} />
        </LinearGradient>
      </Defs>
      {/* Ombre */}
      <Ellipse cx="33" cy="39.5" rx="28" ry="2.5" fill={`url(#${id}_sh)`} />
      {/* Corps */}
      <Rect x="4" y="12" width="58" height="24" rx="4" fill={`url(#${id}_body)`} />
      {/* Toit plat (utilitaire) */}
      <Rect x="4" y="8" width="58" height="8" rx="3" fill={`url(#${id}_roof)`} />
      {/* Côté ombre */}
      <Path d="M4 16 Q4 12 8 12 L8 36 Q4 36 4 32 Z" fill={dark} opacity="0.45" />
      {/* Vitres avant */}
      <Rect x="48" y="9" width="12" height="8" rx="2.5" fill="#90CAF9" opacity="0.8" />
      {/* Fenêtre côté */}
      <Rect x="12" y="14" width="20" height="9" rx="2" fill="#90CAF9" opacity="0.6" />
      {/* Phares */}
      <Ellipse cx="61" cy="17" rx="2" ry="1.5" fill="#FFFDE7" opacity="0.9" />
      <Ellipse cx="61" cy="29" rx="2" ry="1.5" fill="#FFFDE7" opacity="0.9" />
      {/* Feux arrière */}
      <Ellipse cx="6" cy="16" rx="1.8" ry="1.4" fill="#EF5350" opacity="0.85" />
      <Ellipse cx="6" cy="28" rx="1.8" ry="1.4" fill="#EF5350" opacity="0.85" />
      {/* Roues */}
      {[
        [13, 34],
        [53, 34],
      ].map(([cx, cy], i) => (
        <G key={i}>
          <Ellipse cx={cx} cy={cy} rx="5.5" ry="4.5" fill="#1A1A2E" />
          <Ellipse cx={cx} cy={cy} rx="3.5" ry="2.8" fill="#37474F" />
          <Circle cx={cx} cy={cy} r="1.4" fill="#546E7A" />
        </G>
      ))}
    </Svg>
  );
}

// ── Tractor / Engin ───────────────────────────────────────────────────────────
function TractorSvg({ color, s }: { color: string; s: number }) {
  const light = lighten(color, 0.25);
  const dark = darken(color, 0.3);
  const id = `trac_${color.replace('#', '')}`;
  return (
    <Svg width={s * 1.1} height={s * 0.8} viewBox="0 0 66 48">
      <Defs>
        <RadialGradient id={`${id}_sh`} cx="0.5" cy="0.7" r="0.5">
          <Stop offset="0" stopColor="#000" stopOpacity="0.35" />
          <Stop offset="1" stopColor="#000" stopOpacity="0" />
        </RadialGradient>
        <LinearGradient id={`${id}_body`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={light} />
          <Stop offset="1" stopColor={dark} />
        </LinearGradient>
      </Defs>
      {/* Ombre */}
      <Ellipse cx="33" cy="45" rx="26" ry="3" fill={`url(#${id}_sh)`} />
      {/* Grande roue arrière */}
      <Ellipse cx="20" cy="34" rx="13" ry="12" fill="#1A1A2E" />
      <Ellipse cx="20" cy="34" rx="9" ry="8" fill="#37474F" />
      <Circle cx="20" cy="34" r="4" fill="#546E7A" />
      {/* Petite roue avant */}
      <Ellipse cx="52" cy="37" rx="8" ry="7" fill="#1A1A2E" />
      <Ellipse cx="52" cy="37" rx="5" ry="4.5" fill="#37474F" />
      <Circle cx="52" cy="37" r="2.5" fill="#546E7A" />
      {/* Corps principal */}
      <Rect x="18" y="16" width="40" height="20" rx="4" fill={`url(#${id}_body)`} />
      {/* Cabine */}
      <Rect x="38" y="8" width="20" height="16" rx="4" fill={color} />
      {/* Vitre cabine */}
      <Rect x="44" y="9" width="12" height="8" rx="2.5" fill="#90CAF9" opacity="0.8" />
      {/* Capot moteur */}
      <Rect x="20" y="18" width="18" height="14" rx="3" fill={lighten(color, 0.1)} />
      {/* Pot d'échappement */}
      <Rect x="30" y="10" width="4" height="10" rx="2" fill="#546E7A" />
      {/* Phares */}
      <Ellipse cx="57" cy="17" rx="2" ry="1.5" fill="#FFFDE7" opacity="0.9" />
      <Ellipse cx="57" cy="26" rx="2" ry="1.5" fill="#FFFDE7" opacity="0.9" />
    </Svg>
  );
}

// ── Default ───────────────────────────────────────────────────────────────────
function DefaultSvg({ color, s }: { color: string; s: number }) {
  return <CarSvg color={color} s={s} />;
}

// ── Résolution du type ────────────────────────────────────────────────────────
function resolveType(type: string): 'car' | 'truck' | 'motorcycle' | 'bus' | 'van' | 'tractor' {
  const t = (type ?? '').toLowerCase();
  if (['car', 'voiture', 'sedan', 'suv', 'berline', 'citadine', 'coupe'].some((k) => t.includes(k))) return 'car';
  if (['truck', 'camion', 'semi', 'remorque', 'poids lourd'].some((k) => t.includes(k))) return 'truck';
  if (['moto', 'motorcycle', 'bike', 'scooter', 'deux-roues'].some((k) => t.includes(k))) return 'motorcycle';
  if (['bus', 'autobus', 'autocar', 'minibus', 'coach'].some((k) => t.includes(k))) return 'bus';
  if (['van', 'utilitaire', 'pickup', 'fourgon', 'fourgonnette', 'break'].some((k) => t.includes(k))) return 'van';
  if (['tractor', 'tracteur', 'engin', 'bulldozer', 'pelleteuse', 'chariot', 'grue'].some((k) => t.includes(k)))
    return 'tractor';
  return 'car';
}

// ── Export principal ──────────────────────────────────────────────────────────
export function VehicleTypeIcon({
  type = '',
  color = '#F59E0B',
  size = 40,
}: {
  type?: string;
  color?: string;
  size?: number;
}) {
  const resolved = resolveType(type);
  switch (resolved) {
    case 'truck':
      return <TruckSvg color={color} s={size} />;
    case 'motorcycle':
      return <MotorcycleSvg color={color} s={size} />;
    case 'bus':
      return <BusSvg color={color} s={size} />;
    case 'van':
      return <VanSvg color={color} s={size} />;
    case 'tractor':
      return <TractorSvg color={color} s={size} />;
    default:
      return <DefaultSvg color={color} s={size} />;
  }
}

export default VehicleTypeIcon;
