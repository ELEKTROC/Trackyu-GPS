/**
 * TrackYu Mobile — Card
 *
 * Conteneur de surface standard : bg.surface, borderRadius 14, bordure 1px.
 *
 * Props :
 *   padding   — padding interne (défaut : 14)
 *   accent    — couleur de la barre latérale gauche (optionnel)
 *   accentWidth — épaisseur de la barre (défaut : 4)
 *   style     — style supplémentaire sur le conteneur
 *
 * Usage :
 *   <Card>...</Card>
 *   <Card padding={20} style={{ marginBottom: 12 }}>...</Card>
 *   <Card accent={theme.functional.error} accentWidth={3}>...</Card>
 */
import React from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { useTheme } from '../theme';

interface CardProps {
  children: React.ReactNode;
  padding?: number;
  accent?: string;
  accentWidth?: number;
  style?: ViewStyle;
}

export function Card({ children, padding = 14, accent, accentWidth = 4, style }: CardProps) {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: theme.bg.surface,
          borderColor: theme.border,
          padding: accent ? 0 : padding,
          overflow: accent ? 'hidden' : 'visible',
        },
        style,
      ]}
    >
      {accent ? (
        <View style={{ flexDirection: 'row', flex: 1 }}>
          <View style={{ width: accentWidth, backgroundColor: accent }} />
          <View style={{ flex: 1, padding }}>{children}</View>
        </View>
      ) : (
        children
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 14,
    borderWidth: 1,
  },
});
