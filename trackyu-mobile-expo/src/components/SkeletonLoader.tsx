/**
 * TrackYu Mobile - Skeleton Loader
 */
import React, { useEffect, useState } from 'react';
import { Animated, StyleSheet, View, type ViewStyle } from 'react-native';

const SKELETON_COLOR = '#2A2A2E';

interface SkeletonBlockProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function SkeletonBlock({ width = '100%', height = 16, borderRadius = 8, style }: SkeletonBlockProps) {
  const [opacity] = useState(() => new Animated.Value(0.3));

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.8, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 700, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[{ width: width as number, height, borderRadius, backgroundColor: SKELETON_COLOR, opacity }, style]}
    />
  );
}

export function VehicleCardSkeleton() {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <SkeletonBlock width={36} height={36} borderRadius={10} />
        <View style={styles.cardMeta}>
          <SkeletonBlock width="55%" height={14} style={styles.mb6} />
          <SkeletonBlock width="35%" height={12} />
        </View>
        <SkeletonBlock width={72} height={26} borderRadius={8} />
      </View>
      <View style={styles.cardInfo}>
        <SkeletonBlock width="70%" height={12} style={styles.mb6} />
        <SkeletonBlock width="45%" height={12} />
      </View>
      <View style={styles.cardFooter}>
        <SkeletonBlock width={80} height={11} />
      </View>
    </View>
  );
}

export function FleetScreenSkeleton() {
  return (
    <View style={styles.container}>
      {[1, 2, 3, 4].map((i) => (
        <VehicleCardSkeleton key={i} />
      ))}
    </View>
  );
}

export function VehicleDetailSkeleton() {
  return (
    <View style={styles.detailContainer}>
      <View style={styles.detailHeader}>
        <SkeletonBlock width={36} height={36} borderRadius={10} />
        <View style={{ flex: 1, marginHorizontal: 12 }}>
          <SkeletonBlock width="50%" height={16} style={styles.mb6} />
          <SkeletonBlock width="30%" height={12} />
        </View>
        <SkeletonBlock width={88} height={28} borderRadius={10} />
      </View>
      <SkeletonBlock width="92%" height={200} borderRadius={14} style={styles.mapPlaceholder} />
      <View style={styles.kpiRow}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={styles.kpiCard}>
            <SkeletonBlock width={28} height={28} borderRadius={8} style={styles.mb8} />
            <SkeletonBlock width={36} height={20} style={styles.mb6} />
            <SkeletonBlock width={48} height={11} />
          </View>
        ))}
      </View>
      {[1, 2].map((i) => (
        <View key={i} style={styles.section}>
          <SkeletonBlock width={100} height={11} style={styles.mb12} />
          <View style={styles.infoCard}>
            {[1, 2, 3, 4].map((j) => (
              <View key={j} style={styles.infoRow}>
                <SkeletonBlock width="32%" height={13} />
                <SkeletonBlock width="42%" height={13} />
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

export function AlertCardSkeleton() {
  return (
    <View style={styles.alertCard}>
      <SkeletonBlock width={36} height={36} borderRadius={18} />
      <View style={{ flex: 1, gap: 6 }}>
        <SkeletonBlock width="70%" height={14} />
        <SkeletonBlock width="50%" height={11} />
        <SkeletonBlock width="30%" height={10} />
      </View>
      <SkeletonBlock width={8} height={8} borderRadius={4} />
    </View>
  );
}

export function AlertsListSkeleton() {
  return (
    <View style={styles.container}>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <AlertCardSkeleton key={i} />
      ))}
    </View>
  );
}

export function DashboardSkeleton() {
  return (
    <View style={{ padding: 16, gap: 14 }}>
      {/* Section titre */}
      <SkeletonBlock width={160} height={14} style={styles.mb8} />
      {/* Donut + slices */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <SkeletonBlock width={130} height={130} borderRadius={65} />
        <View style={{ flex: 1, gap: 8 }}>
          {[1, 2, 3, 4].map((i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <SkeletonBlock width={10} height={10} borderRadius={5} />
              <SkeletonBlock width="50%" height={12} />
            </View>
          ))}
        </View>
      </View>
      {/* KPI grid */}
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
        {[1, 2].map((i) => (
          <View key={i} style={[styles.kpiCard, { flex: 1 }]}>
            <SkeletonBlock width={28} height={28} borderRadius={8} style={styles.mb8} />
            <SkeletonBlock width={50} height={18} style={styles.mb6} />
            <SkeletonBlock width={70} height={11} />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 10 },
  mb6: { marginBottom: 6 },
  mb8: { marginBottom: 8 },
  mb12: { marginBottom: 12 },

  card: {
    backgroundColor: '#1A1A1E',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#2A2A2E',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 },
  cardMeta: { flex: 1 },
  cardInfo: { marginBottom: 10 },
  cardFooter: { paddingTop: 8, borderTopWidth: 1, borderTopColor: '#2A2A2E' },

  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: '#1A1A1E',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2A2E',
  },

  detailContainer: { flex: 1, backgroundColor: '#0D0D0F' },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2E',
  },
  mapPlaceholder: { alignSelf: 'center', marginVertical: 16 },
  kpiRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  kpiCard: {
    flex: 1,
    backgroundColor: '#1A1A1E',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A2E',
  },
  section: { marginTop: 20, paddingHorizontal: 16 },
  infoCard: {
    backgroundColor: '#1A1A1E',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2A2A2E',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2E',
  },
});
