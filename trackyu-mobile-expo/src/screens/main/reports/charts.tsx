/**
 * TrackYu Mobile — Reports: SVG chart components
 */
import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import Svg, { Rect, G, Text as SvgText, Path } from 'react-native-svg';
import { ChartData, ChartItem } from './types';

type Theme = {
  text: { muted: unknown; primary: unknown; secondary: unknown };
  bg: { surface: string };
  border: string;
};

// ── Bar Chart ──────────────────────────────────────────────────────────────────

export function BarChart({
  data,
  chartHeight = 130,
  theme,
}: {
  data: ChartItem[];
  chartHeight?: number;
  theme: Theme;
}) {
  if (!data.length) return null;
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const barW = 48,
    gap = 10,
    paddingTop = 22,
    labelH = 28;
  const totalH = chartHeight + paddingTop + labelH;
  const totalW = data.length * (barW + gap) + gap;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
      <Svg width={Math.max(totalW, 280)} height={totalH}>
        {data.map((d, i) => {
          const barH = Math.max((d.value / maxVal) * chartHeight, d.value > 0 ? 4 : 0);
          const x = gap + i * (barW + gap);
          const y = paddingTop + chartHeight - barH;
          const lbl = d.label.length > 7 ? d.label.slice(0, 6) + '…' : d.label;
          return (
            <G key={i}>
              <Rect x={x} y={y} width={barW} height={barH} rx={5} fill={d.color} opacity={0.88} />
              {d.value > 0 && (
                <SvgText x={x + barW / 2} y={y - 5} textAnchor="middle" fontSize="11" fontWeight="700" fill={d.color}>
                  {String(d.value)}
                </SvgText>
              )}
              <SvgText
                x={x + barW / 2}
                y={paddingTop + chartHeight + 16}
                textAnchor="middle"
                fontSize="10"
                fill={theme.text.muted as string}
              >
                {lbl}
              </SvgText>
            </G>
          );
        })}
      </Svg>
    </ScrollView>
  );
}

// ── Pie / Donut ────────────────────────────────────────────────────────────────

export function PieDonut({ data, size = 150, theme }: { data: ChartItem[]; size?: number; theme: Theme }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;

  const cx = size / 2,
    cy = size / 2;
  const r = size * 0.38,
    innerR = size * 0.22;
  const paths: { d: string; color: string }[] = [];
  let angle = -Math.PI / 2;

  data.forEach((seg) => {
    if (seg.value === 0) return;
    const slice = (seg.value / total) * 2 * Math.PI;
    const end = angle + slice;
    const la = slice > Math.PI ? 1 : 0;
    const x1o = cx + r * Math.cos(angle),
      y1o = cy + r * Math.sin(angle);
    const x2o = cx + r * Math.cos(end),
      y2o = cy + r * Math.sin(end);
    const x1i = cx + innerR * Math.cos(end),
      y1i = cy + innerR * Math.sin(end);
    const x2i = cx + innerR * Math.cos(angle),
      y2i = cy + innerR * Math.sin(angle);
    paths.push({
      d: `M${x1o} ${y1o} A${r} ${r} 0 ${la} 1 ${x2o} ${y2o} L${x1i} ${y1i} A${innerR} ${innerR} 0 ${la} 0 ${x2i} ${y2i}Z`,
      color: seg.color,
    });
    angle = end;
  });

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 4 }}>
      <Svg width={size} height={size}>
        {paths.map((p, i) => (
          <Path key={i} d={p.d} fill={p.color} />
        ))}
      </Svg>
      <View style={{ flex: 1, gap: 7 }}>
        {data
          .filter((d) => d.value > 0)
          .map((d, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: d.color }} />
              <Text style={{ fontSize: 12, color: theme.text.secondary as string, flex: 1 }} numberOfLines={1}>
                {d.label}
              </Text>
              <Text style={{ fontSize: 12, color: theme.text.primary as string, fontWeight: '700' }}>{d.value}</Text>
            </View>
          ))}
      </View>
    </View>
  );
}

// ── Chart Section wrapper ──────────────────────────────────────────────────────

export function ChartSection({ chart, theme }: { chart: ChartData; theme: Theme }) {
  return (
    <View
      style={{
        backgroundColor: theme.bg.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.border,
        padding: 14,
        gap: 8,
      }}
    >
      <Text
        style={{
          fontSize: 11,
          fontWeight: '700',
          color: theme.text.secondary as string,
          textTransform: 'uppercase',
          letterSpacing: 0.8,
        }}
      >
        {chart.title}
      </Text>
      {chart.type === 'bar' ? (
        <BarChart data={chart.items} theme={theme} />
      ) : (
        <PieDonut data={chart.items} theme={theme} />
      )}
    </View>
  );
}
