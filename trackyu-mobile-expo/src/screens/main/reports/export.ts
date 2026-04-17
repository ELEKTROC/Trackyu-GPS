/**
 * TrackYu Mobile — Reports: export helpers (CSV / PDF / Courbe)
 *
 * Les fonctions acceptent un `periodLabel` optionnel
 * (produit par `formatPeriodLabel(filters)`) qui est inclus dans le
 * nom du fichier et dans le sous-titre du PDF.
 *
 * Export Excel retiré : dépendance xlsx (SheetJS) exposait
 * Prototype Pollution + ReDoS sans correctif upstream (GHSA-4r6h-8v6p-xvw6
 * et GHSA-5pgg-2g8v-p4x9). CSV couvre le besoin tableur.
 */
import { Share, Alert } from 'react-native';
import { ReportResult, ChartItem } from './types';

// ── CSV ────────────────────────────────────────────────────────────────────────

export const buildCSV = (cols: string[], rows: string[][]): string => {
  const esc = (s: string) => `"${(s ?? '').replace(/"/g, '""')}"`;
  return [cols.map(esc).join(','), ...rows.map((r) => r.map(esc).join(','))].join('\n');
};

export const shareCSV = async (result: ReportResult, periodLabel?: string): Promise<void> => {
  const csv = buildCSV(result.columns, result.rows);
  const suffix = periodLabel ? ` — ${periodLabel}` : '';
  await Share.share({
    message: csv,
    title: `${result.title}${suffix}.csv`,
  });
};

// ── PDF ────────────────────────────────────────────────────────────────────────

const buildHTML = (r: ReportResult, color: string, periodLabel?: string): string => {
  const generated = new Date().toLocaleString('fr-FR');
  const periodLine = periodLabel ? ` · ${periodLabel}` : '';

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
body{font-family:Arial,sans-serif;margin:20px;color:#1f2937;font-size:11px}
h1{color:${color};font-size:16px;margin:0 0 2px}
.sub{font-size:9px;color:#6b7280;margin-bottom:14px}
.kpis{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px}
.kpi{background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:8px 12px;min-width:80px}
.kv{font-size:18px;font-weight:700}.kl{font-size:9px;color:#6b7280;margin-top:1px}
table{width:100%;border-collapse:collapse;font-size:9px}
th{background:${color};color:#fff;padding:5px 7px;text-align:left}
td{padding:4px 7px;border-bottom:1px solid #e5e7eb}
tr:nth-child(even)td{background:#f9fafb}
.foot{margin-top:12px;font-size:8px;color:#9ca3af;text-align:center}
${r.note ? '.note{margin-bottom:12px;padding:8px 12px;background:#fef3c7;border-radius:6px;font-size:10px;color:#92400e}' : ''}
</style></head><body>
<h1>${r.title}</h1>
<div class="sub">Généré le ${generated} — TrackYu GPS${periodLine}</div>
${r.note ? `<div class="note">${r.note}</div>` : ''}
<div class="kpis">${r.kpis.map((k) => `<div class="kpi"><div class="kv" style="color:${k.color}">${k.value}</div><div class="kl">${k.label}</div></div>`).join('')}</div>
<table>
  <thead><tr>${r.columns.map((c) => `<th>${c}</th>`).join('')}</tr></thead>
  <tbody>${r.rows
    .map(
      (row) =>
        `<tr>${row
          .map((c) => {
            if (typeof c === 'string' && c.startsWith('https://')) {
              return `<td><a href="${c}" style="color:#3B82F6;text-decoration:underline;font-size:9px">📍 Voir</a></td>`;
            }
            return `<td>${c ?? '—'}</td>`;
          })
          .join('')}</tr>`
    )
    .join('')}</tbody>
</table>
<div class="foot">TrackYu GPS · Rapport auto-généré · ${r.rows.length} ligne${r.rows.length !== 1 ? 's' : ''}</div>
</body></html>`;
};

export const exportPDF = async (result: ReportResult, color: string, periodLabel?: string): Promise<void> => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Print = require('expo-print') as typeof import('expo-print');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Sharing = require('expo-sharing') as typeof import('expo-sharing');
    const html = buildHTML(result, color, periodLabel);
    const { uri } = await Print.printToFileAsync({ html, base64: false });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
    }
  } catch {
    Alert.alert('Erreur export', 'Impossible de générer le PDF.');
  }
};

// ── Courbe SVG ─────────────────────────────────────────────────────────────────

const buildSVG = (items: ChartItem[], title: string, color: string): string => {
  const W = 540,
    H = 240;
  const padL = 44,
    padR = 16,
    padT = 24,
    padB = 64;
  const cW = W - padL - padR;
  const cH = H - padT - padB;
  const maxVal = Math.max(...items.map((i) => i.value), 1);
  const barW = Math.max(8, Math.min(44, cW / items.length - 8));
  const step = items.length > 1 ? (cW - barW) / (items.length - 1) : 0;

  const bars = items
    .map((item, i) => {
      const bh = Math.max(2, Math.round((item.value / maxVal) * cH));
      const x = padL + i * step;
      const y = padT + cH - bh;
      const lbl = item.label.length > 9 ? item.label.slice(0, 8) + '…' : item.label;
      const rx = x + barW / 2;
      const ry = padT + cH + 13;
      return [
        `<rect x="${x}" y="${y}" width="${barW}" height="${bh}" fill="${item.color}" rx="3"/>`,
        `<text x="${x + barW / 2}" y="${y - 4}" text-anchor="middle" font-size="9" fill="#374151">${item.value}</text>`,
        `<text x="${rx}" y="${ry}" text-anchor="end" font-size="8" fill="#6B7280" transform="rotate(-35 ${rx} ${ry})">${lbl}</text>`,
      ].join('');
    })
    .join('');

  const yLines = [0, 0.25, 0.5, 0.75, 1]
    .map((pct) => {
      const y = padT + cH - pct * cH;
      const val = Math.round(pct * maxVal);
      return [
        `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="#E5E7EB" stroke-width="1"/>`,
        `<text x="${padL - 4}" y="${y + 3}" text-anchor="end" font-size="8" fill="#9CA3AF">${val}</text>`,
      ].join('');
    })
    .join('');

  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <text x="${padL}" y="14" font-size="11" font-weight="bold" fill="${color}">${title}</text>
  ${yLines}
  <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT + cH}" stroke="#D1D5DB" stroke-width="1"/>
  <line x1="${padL}" y1="${padT + cH}" x2="${W - padR}" y2="${padT + cH}" stroke="#D1D5DB" stroke-width="1"/>
  ${bars}
</svg>`;
};

const buildChartHTML = (r: ReportResult, color: string, periodLabel?: string): string => {
  const items = r.chart?.items ?? [];
  const generated = new Date().toLocaleString('fr-FR');
  const periodLine = periodLabel ? ` · ${periodLabel}` : '';
  const svg = buildSVG(items, r.chart?.title ?? r.title, color);
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
body{font-family:Arial,sans-serif;margin:24px;color:#1f2937;font-size:11px}
h1{color:${color};font-size:16px;margin:0 0 2px}
.sub{font-size:9px;color:#6b7280;margin-bottom:20px}
</style></head><body>
<h1>${r.title}</h1>
<div class="sub">Généré le ${generated} — TrackYu GPS${periodLine}</div>
${svg}
</body></html>`;
};

export const exportChart = async (result: ReportResult, color: string, periodLabel?: string): Promise<void> => {
  if (!result.chart?.items.length) {
    Alert.alert('Pas de graphique', 'Ce rapport ne contient pas de données graphiques.');
    return;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Print = require('expo-print') as typeof import('expo-print');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Sharing = require('expo-sharing') as typeof import('expo-sharing');
    const html = buildChartHTML(result, color, periodLabel);
    const { uri } = await Print.printToFileAsync({ html, base64: false });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
    }
  } catch {
    Alert.alert('Erreur export', 'Impossible de générer la courbe.');
  }
};
