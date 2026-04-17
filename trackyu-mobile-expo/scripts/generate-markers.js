#!/usr/bin/env node
'use strict';
/**
 * TrackYu Mobile — Top-Down Map Marker Generator
 * Génère 84 PNG (7 types × 4 statuts × 3 densités) dans src/assets/markers/
 * Style "vue de dessus" (bird's eye / top-down) — avant du véhicule en haut.
 * Puis écrit src/assets/markers/index.ts automatiquement.
 *
 * Usage : node scripts/generate-markers.js
 */
const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

// ── Couleurs de statut (sync vehicleStatus.ts) ─────────────────────────────
const STATUSES = {
  moving:  '#22C55E',
  stopped: '#EF4444',
  idle:    '#F97316',
  offline: '#6B7280',
};

const TYPES = ['car', 'truck', 'bus', 'moto', 'van', 'agr', 'eng'];

// ── CRC-32 (requis par le format PNG) ─────────────────────────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function pngChunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const d = Buffer.isBuffer(data) ? data : Buffer.from(data);
  const len = Buffer.alloc(4); len.writeUInt32BE(d.length);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, d])));
  return Buffer.concat([len, t, d, crc]);
}

function buildPNG(W, H, pixels) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA

  const raw = Buffer.alloc(H * (1 + W * 4));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 4)] = 0;
    for (let x = 0; x < W; x++) {
      const si = (y * W + x) * 4;
      const di = y * (1 + W * 4) + 1 + x * 4;
      raw[di]   = pixels[si];   raw[di+1] = pixels[si+1];
      raw[di+2] = pixels[si+2]; raw[di+3] = pixels[si+3];
    }
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function hexToRGB(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// ── Pixel classifier ───────────────────────────────────────────────────────
//
// Canvas : BASE_W × BASE_H (64×64) — carré pour vue de dessus
// Système de coordonnées :
//   x = (px - cx) / s  →  normalisé, ±32 pour W=64
//   y = (py - cy) / s  →  y négatif = haut (avant), y positif = bas (arrière)
//   s = W / 64          →  facteur d'échelle (1 @ 64px, 2 @ 128px …)
//
// Valeur retournée (priorité, plus haut gagne) :
//   0 = transparent
//   1 = couleur statut  (carrosserie)
//   2 = blanc           (bordure, pare-brise, vitres, détails)
//   3 = gris foncé      (roues, chenilles)
//
// Tous les véhicules : avant en HAUT (y négatif)
// ─────────────────────────────────────────────────────────────────────────
function classify(type, x, y) {

  // Rounded-rect (coords normalisées, bornes INCLUSES)
  function rr(x, y, x1, y1, x2, y2, r) {
    r = r || 0;
    if (x < x1 || x > x2 || y < y1 || y > y2) return false;
    if (!r) return true;
    const dx = x < x1 + r ? x - (x1 + r) : x > x2 - r ? x - (x2 - r) : 0;
    const dy = y < y1 + r ? y - (y1 + r) : y > y2 - r ? y - (y2 - r) : 0;
    return dx * dx + dy * dy < r * r;
  }

  switch (type) {

    // ── Voiture ─────────────────────────────────────────────────────────────
    case 'car': {
      // Zone englobante totale (inclut les roues)
      if (!rr(x,y, -19,-27, 19,27)) return 0;

      // Roues (4 coins, dépassent légèrement de la carrosserie)
      if (rr(x,y, -19,-22, -13,-11, 2)) return 3; // avant-gauche
      if (rr(x,y,  13,-22,  19,-11, 2)) return 3; // avant-droite
      if (rr(x,y, -19, 11, -13, 22, 2)) return 3; // arrière-gauche
      if (rr(x,y,  13, 11,  19, 22, 2)) return 3; // arrière-droite

      // Carrosserie externe (bordure blanche)
      const outerBody = rr(x,y, -13,-25, 13,25, 5);
      if (!outerBody) return 0;

      // Carrosserie interne (couleur statut)
      const innerBody = rr(x,y, -11,-23, 11,23, 4);
      if (!innerBody) return 2; // zone bordure blanche

      // Pare-brise (avant)
      if (rr(x,y, -9,-19, 9,-12, 1)) return 2;
      // Vitre arrière
      if (rr(x,y, -8, 13, 8, 18, 1)) return 2;

      return 1; // couleur statut
    }

    // ── Camion ──────────────────────────────────────────────────────────────
    case 'truck': {
      if (!rr(x,y, -20,-28, 20,28)) return 0;

      // Roues
      if (rr(x,y, -20,-21, -13,-10, 2)) return 3; // avant-gauche
      if (rr(x,y,  13,-21,  20,-10, 2)) return 3; // avant-droite
      if (rr(x,y, -20,  8, -13, 19, 2)) return 3; // arrière-gauche
      if (rr(x,y,  13,  8,  20, 19, 2)) return 3; // arrière-droite

      // Cabine (avant, plus étroite)
      const cabOuter = rr(x,y, -12,-26, 12, -1, 3);
      const cabInner = rr(x,y, -10,-24, 10, -3, 2);
      // Benne (arrière, plus large)
      const cargoOuter = rr(x,y, -16, -1, 16, 26, 3);
      const cargoInner = rr(x,y, -14, -1, 14, 24, 2);

      if (!cabOuter && !cargoOuter) return 0;

      // Bordure blanche
      if ((cabOuter && !cabInner) || (cargoOuter && !cargoInner)) return 2;

      // Pare-brise cabine
      if (cabInner && rr(x,y, -8,-20, 8,-12, 1)) return 2;
      // Ligne séparatrice cabine/benne
      if (y >= -2 && y <= 0) return 2;

      return 1;
    }

    // ── Bus ─────────────────────────────────────────────────────────────────
    case 'bus': {
      if (!rr(x,y, -19,-30, 19,30)) return 0;

      // 6 roues (3 paires)
      if (rr(x,y, -19,-24, -13,-15, 2)) return 3;
      if (rr(x,y,  13,-24,  19,-15, 2)) return 3;
      if (rr(x,y, -19, -5, -13,  4, 2)) return 3;
      if (rr(x,y,  13, -5,  19,  4, 2)) return 3;
      if (rr(x,y, -19, 15, -13, 24, 2)) return 3;
      if (rr(x,y,  13, 15,  19, 24, 2)) return 3;

      const outerBody = rr(x,y, -14,-28, 14,28, 3);
      const innerBody = rr(x,y, -12,-26, 12,26, 2);

      if (!outerBody) return 0;
      if (!innerBody) return 2;

      // Vitres latérales gauche (4 colonnes)
      if (rr(x,y, -12,-23, -9,-16, 1)) return 2;
      if (rr(x,y, -12, -9, -9, -2, 1)) return 2;
      if (rr(x,y, -12,  5, -9, 12, 1)) return 2;
      if (rr(x,y, -12, 18, -9, 23, 1)) return 2;
      // Vitres latérales droite
      if (rr(x,y,   9,-23, 12,-16, 1)) return 2;
      if (rr(x,y,   9, -9, 12, -2, 1)) return 2;
      if (rr(x,y,   9,  5, 12, 12, 1)) return 2;
      if (rr(x,y,   9, 18, 12, 23, 1)) return 2;

      return 1;
    }

    // ── Moto ────────────────────────────────────────────────────────────────
    case 'moto': {
      // Roue avant
      const frontWheel = rr(x,y, -8,-28, 8,-17, 3);
      // Roue arrière
      const rearWheel  = rr(x,y, -8, 17, 8, 28, 3);
      // Guidon
      const handlebar  = rr(x,y, -10,-15, 10,-12);
      // Corps étroit
      const bodyOuter  = rr(x,y, -7,-16, 7, 16, 3);
      const bodyInner  = rr(x,y, -5,-14, 5, 14, 2);

      if (!frontWheel && !rearWheel && !handlebar && !bodyOuter) return 0;

      if (frontWheel || rearWheel) return 3;
      if (handlebar) return 2;
      if (bodyOuter && !bodyInner) return 2;
      if (bodyInner) return 1;

      return 0;
    }

    // ── Utilitaire (van) ─────────────────────────────────────────────────────
    case 'van': {
      if (!rr(x,y, -18,-26, 18,26)) return 0;

      // Roues
      if (rr(x,y, -18,-20, -12,-10, 2)) return 3;
      if (rr(x,y,  12,-20,  18,-10, 2)) return 3;
      if (rr(x,y, -18, 10, -12, 20, 2)) return 3;
      if (rr(x,y,  12, 10,  18, 20, 2)) return 3;

      const outerBody = rr(x,y, -13,-24, 13,24, 3);
      const innerBody = rr(x,y, -11,-22, 11,22, 2);

      if (!outerBody) return 0;
      if (!innerBody) return 2;

      // Pare-brise large (van = cabine haute)
      if (rr(x,y, -9,-19, 9,-11, 1)) return 2;
      // Vitres latérales (longues)
      if (rr(x,y, -11,-9, -9, 8, 1)) return 2;
      if (rr(x,y,   9,-9, 11, 8, 1)) return 2;
      // Vitre arrière
      if (rr(x,y, -8, 12, 8, 17, 1)) return 2;

      return 1;
    }

    // ── Tracteur agricole ─────────────────────────────────────────────────
    case 'agr': {
      if (!rr(x,y, -22,-24, 22,24)) return 0;

      // Grandes roues arrière (asymétriques, dépassent largement)
      if (rr(x,y, -22,  2, -10, 22, 5)) return 3;
      if (rr(x,y,  10,  2,  22, 22, 5)) return 3;
      // Petites roues avant
      if (rr(x,y,  -9,-22,  -3,-10, 2)) return 3;
      if (rr(x,y,   3,-22,   9,-10, 2)) return 3;

      const outerBody = rr(x,y, -11,-22, 11, 20, 3);
      const innerBody = rr(x,y,  -9,-20,  9, 18, 2);

      if (!outerBody) return 0;
      if (!innerBody) return 2;

      // Cabine (vitre)
      if (rr(x,y, -7,-2, 7,10, 2)) return 2;
      // Capot/moteur (avant)
      if (rr(x,y, -5,-18, 5,-10, 1)) return 2;

      return 1;
    }

    // ── Engin / engin de chantier ─────────────────────────────────────────
    case 'eng': {
      if (!rr(x,y, -22,-24, 22,24)) return 0;

      // Chenilles (bandes larges des deux côtés)
      const trackL = rr(x,y, -22,-22, -11, 22, 4);
      const trackR = rr(x,y,  11,-22,  22, 22, 4);
      if (trackL || trackR) {
        // Stries de chenille (lignes blanches transversales)
        const treadIdx = Math.round((y + 21) / 7);
        const treadY   = treadIdx * 7 - 21;
        if (Math.abs(y - treadY) < 1.2) return 2;
        return 3;
      }

      const outerBody = rr(x,y, -10,-22, 10, 22, 3);
      const innerBody = rr(x,y,  -8,-20,  8, 20, 2);

      if (!outerBody) return 0;
      if (!innerBody) return 2;

      // Cabine (vitre)
      if (rr(x,y, -7,-10, 7, 4, 2)) return 2;
      // Lame frontale
      if (rr(x,y, -8,-20, 8,-17)) return 2;

      return 1;
    }

    default: return 0;
  }
}

// ── Rendu d'un marqueur vue de dessus (64×64 logical px) ─────────────────
function renderMarker(W, H, color, vehicleType) {
  const [sr, sg, sb] = hexToRGB(color);
  const cx = W / 2;
  const cy = H / 2;
  const s  = W / 64;

  const DARK_R = 45, DARK_G = 45, DARK_B = 45; // roues / chenilles

  const pixels = new Uint8Array(W * H * 4);

  for (let py = 0; py < H; py++) {
    for (let px = 0; px < W; px++) {
      const idx = (py * W + px) * 4;

      // Coordonnées normalisées centrées (espace s=1)
      const nx = (px + 0.5 - cx) / s;
      const ny = (py + 0.5 - cy) / s;

      const layer = classify(vehicleType, nx, ny);

      switch (layer) {
        case 0: // transparent
          pixels[idx + 3] = 0;
          break;
        case 1: // couleur statut
          pixels[idx] = sr; pixels[idx+1] = sg; pixels[idx+2] = sb; pixels[idx+3] = 255;
          break;
        case 2: // blanc
          pixels[idx] = 255; pixels[idx+1] = 255; pixels[idx+2] = 255; pixels[idx+3] = 255;
          break;
        case 3: // gris foncé (roues)
          pixels[idx] = DARK_R; pixels[idx+1] = DARK_G; pixels[idx+2] = DARK_B; pixels[idx+3] = 255;
          break;
      }
    }
  }
  return pixels;
}

// ── Génération ─────────────────────────────────────────────────────────────
const OUT = path.join(__dirname, '..', 'src', 'assets', 'markers');
fs.mkdirSync(OUT, { recursive: true });

const BASE_W = 32, BASE_H = 32; // 32×32 pt logiques — compact sur carte
const SCALES = [
  { suffix: '',    s: 1 }, //  64×64
  { suffix: '@2x', s: 2 }, // 128×128
  { suffix: '@3x', s: 3 }, // 192×192
];

let count = 0;
for (const [status, color] of Object.entries(STATUSES)) {
  for (const type of TYPES) {
    for (const { suffix, s } of SCALES) {
      const W = BASE_W * s, H = BASE_H * s;
      const pixels = renderMarker(W, H, color, type);
      const png    = buildPNG(W, H, pixels);
      const file   = path.join(OUT, `${type}-${status}${suffix}.png`);
      fs.writeFileSync(file, png);
      count++;
    }
  }
}

// ── Génère src/assets/markers/index.ts ────────────────────────────────────
const lines = [
  '// AUTO-GENERATED — ne pas éditer manuellement',
  '// Régénérer : node scripts/generate-markers.js',
  '',
  'export const MARKER_IMAGES = {',
];
for (const type of TYPES) {
  lines.push(`  ${type}: {`);
  for (const status of Object.keys(STATUSES)) {
    lines.push(`    ${status}: require('./${type}-${status}.png'),`);
  }
  lines.push('  },');
}
lines.push('} as const;');
lines.push('');
lines.push('export type MarkerVehicleType = keyof typeof MARKER_IMAGES;');
lines.push('export type MarkerStatus      = keyof typeof MARKER_IMAGES[MarkerVehicleType];');
lines.push('');

fs.writeFileSync(path.join(OUT, 'index.ts'), lines.join('\n'));

console.log(`✅ ${count} PNG top-down + index.ts → src/assets/markers/`);
