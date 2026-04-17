/**
 * TrackYu Mobile — SkeletonBox
 * Placeholder animé pour les états de chargement
 */
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, type ViewStyle } from 'react-native';
import { useTheme } from '../theme';

interface SkeletonBoxProps {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function SkeletonBox({ width, height = 16, borderRadius = 8, style }: SkeletonBoxProps) {
  const { theme } = useTheme();
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 600, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width: width ?? '100%',
          height,
          borderRadius,
          backgroundColor: theme.border,
          opacity,
        },
        style,
      ]}
    />
  );
}

// ── Skeletons composites ───────────────────────────────────────────────────

export function SkeletonCard({ style }: { style?: ViewStyle }) {
  const { theme } = useTheme();
  return (
    <View style={[sk.card, { backgroundColor: theme.bg.surface, borderColor: theme.border }, style]}>
      <SkeletonBox width="40%" height={13} />
      <SkeletonBox width="60%" height={22} borderRadius={6} style={{ marginTop: 8 }} />
      <SkeletonBox width="50%" height={11} style={{ marginTop: 6 }} />
    </View>
  );
}

export function SkeletonRow({ style }: { style?: ViewStyle }) {
  const { theme } = useTheme();
  return (
    <View style={[sk.row, { backgroundColor: theme.bg.surface, borderColor: theme.border }, style]}>
      <View style={{ flex: 1, gap: 6 }}>
        <SkeletonBox width="55%" height={13} />
        <SkeletonBox width="35%" height={11} />
      </View>
      <SkeletonBox width={60} height={22} borderRadius={6} />
    </View>
  );
}

export function SkeletonDashboard() {
  return (
    <View style={sk.dashboard}>
      {/* Header */}
      <View style={sk.header}>
        <SkeletonBox width="30%" height={13} />
        <SkeletonBox width="50%" height={22} borderRadius={6} style={{ marginTop: 8 }} />
        <SkeletonBox width="40%" height={11} style={{ marginTop: 6 }} />
      </View>
      {/* Grid */}
      <View style={sk.grid}>
        {[0, 1, 2, 3, 4].map((i) => (
          <SkeletonCard key={i} style={sk.statCell} />
        ))}
      </View>
      {/* Section */}
      <SkeletonBox width="40%" height={11} style={{ marginBottom: 10 }} />
      <View style={[sk.invoiceCard]}>
        <SkeletonBox width="50%" height={16} />
        <SkeletonBox width="35%" height={11} style={{ marginTop: 6 }} />
        <SkeletonBox height={1} style={{ marginVertical: 10 }} />
        <SkeletonBox width="60%" height={11} />
      </View>
    </View>
  );
}

// ── Skeleton — carte intervention (liste) ──────────────────────────────────

export function SkeletonInterventionCard({ style }: { style?: ViewStyle }) {
  const { theme } = useTheme();
  return (
    <View style={[sk.interventionCard, { backgroundColor: theme.bg.surface, borderColor: theme.border }, style]}>
      {/* Barre latérale colorée */}
      <SkeletonBox width={4} height={88} borderRadius={0} />
      <View style={{ flex: 1, padding: 12, gap: 8 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1, gap: 4 }}>
            <SkeletonBox width="25%" height={10} />
            <SkeletonBox width="55%" height={14} borderRadius={6} />
          </View>
          <SkeletonBox width={70} height={22} borderRadius={6} />
        </View>
        <SkeletonBox width="45%" height={11} />
        <SkeletonBox width="60%" height={11} />
      </View>
    </View>
  );
}

// ── Skeleton — bulles de chat (ticket detail) ──────────────────────────────

export function SkeletonChat() {
  return (
    <View style={{ padding: 16, gap: 12 }}>
      {/* Support left */}
      <View style={{ alignSelf: 'flex-start', gap: 4, maxWidth: '70%' }}>
        <SkeletonBox width={140} height={14} borderRadius={10} />
        <SkeletonBox width={100} height={14} borderRadius={10} />
        <SkeletonBox width={40} height={10} borderRadius={6} />
      </View>
      {/* Client right */}
      <View style={{ alignSelf: 'flex-end', gap: 4, maxWidth: '70%' }}>
        <SkeletonBox width={180} height={14} borderRadius={10} />
        <SkeletonBox width={40} height={10} borderRadius={6} />
      </View>
      {/* System center */}
      <View style={{ alignSelf: 'center' }}>
        <SkeletonBox width={200} height={22} borderRadius={8} />
      </View>
      {/* Support left */}
      <View style={{ alignSelf: 'flex-start', gap: 4, maxWidth: '70%' }}>
        <SkeletonBox width={160} height={14} borderRadius={10} />
        <SkeletonBox width={120} height={14} borderRadius={10} />
        <SkeletonBox width={40} height={10} borderRadius={6} />
      </View>
    </View>
  );
}

// ── Skeleton — détail (section info rows) ─────────────────────────────────

export function SkeletonDetail() {
  const { theme } = useTheme();
  return (
    <View style={{ padding: 16, gap: 20 }}>
      {/* Boutons PDF */}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <SkeletonBox height={46} borderRadius={12} style={{ flex: 1 }} />
        <SkeletonBox height={46} borderRadius={12} style={{ flex: 1 }} />
      </View>
      {/* Section 1 */}
      <View style={{ gap: 8 }}>
        <SkeletonBox width="30%" height={10} />
        <View style={[sk.detailCard, { borderColor: theme.border, backgroundColor: theme.bg.surface }]}>
          {[90, 70, 80, 60].map((w, i) => (
            <View key={i} style={sk.detailRow}>
              <SkeletonBox width={`${w}%`} height={13} />
            </View>
          ))}
        </View>
      </View>
      {/* Section 2 */}
      <View style={{ gap: 8 }}>
        <SkeletonBox width="25%" height={10} />
        <View style={[sk.detailCard, { borderColor: theme.border, backgroundColor: theme.bg.surface }]}>
          {[75, 55].map((w, i) => (
            <View key={i} style={sk.detailRow}>
              <SkeletonBox width={`${w}%`} height={13} />
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const sk = StyleSheet.create({
  dashboard: { padding: 16, paddingTop: 56, gap: 0 },
  header: { marginBottom: 24, gap: 0 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  statCell: { flex: 1, minWidth: '45%' },
  card: { borderRadius: 14, padding: 14, borderWidth: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    gap: 12,
  },
  invoiceCard: { gap: 0 },
  interventionCard: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  detailCard: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  detailRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
});
