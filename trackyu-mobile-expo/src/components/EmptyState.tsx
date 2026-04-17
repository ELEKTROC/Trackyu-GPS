/**
 * TrackYu Mobile — EmptyState
 * Composant réutilisable pour les états vides : liste vide, recherche sans résultat, etc.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme';

interface EmptyStateProps {
  /** Icône Lucide ou toute autre node React à afficher au-dessus du texte */
  icon?: React.ReactNode;
  /** Titre principal (ex : "Aucun véhicule") */
  title: string;
  /** Sous-titre optionnel (ex : "Vos engins apparaîtront ici") */
  subtitle?: string;
  /** Label du bouton d'action optionnel */
  actionLabel?: string;
  onAction?: () => void;
  /** Padding vertical autour du bloc (défaut : 48) */
  paddingVertical?: number;
}

export function EmptyState({ icon, title, subtitle, actionLabel, onAction, paddingVertical = 48 }: EmptyStateProps) {
  const { theme } = useTheme();
  const s = styles(theme, paddingVertical);

  return (
    <View style={s.container} accessibilityRole="text" accessibilityLabel={title}>
      {icon && <View style={s.iconWrap}>{icon}</View>}
      <Text style={s.title}>{title}</Text>
      {subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}
      {actionLabel && onAction ? (
        <TouchableOpacity
          style={s.button}
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
        >
          <Text style={s.buttonText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = (theme: ReturnType<typeof import('../theme').useTheme>['theme'], pv: number) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
      paddingVertical: pv,
      gap: 8,
    },
    iconWrap: { marginBottom: 4 },
    title: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text.secondary,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 13,
      color: theme.text.muted,
      textAlign: 'center',
      lineHeight: 20,
    },
    button: {
      marginTop: 8,
      paddingHorizontal: 20,
      paddingVertical: 10,
      backgroundColor: theme.primary,
      borderRadius: 10,
    },
    buttonText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '600',
    },
  });

export default EmptyState;
