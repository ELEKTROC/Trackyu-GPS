/**
 * TrackYu Mobile — Button
 *
 * Bouton réutilisable avec 4 variantes, 3 tailles et état loading.
 *
 * Variants :
 *   primary  — fond theme.primary, texte blanc (CTA principal)
 *   secondary — bordure theme.primary, texte theme.primary (action secondaire)
 *   ghost    — transparent, texte theme.text.secondary (action tertiaire)
 *   danger   — fond theme.functional.error, texte blanc (action destructrice)
 *
 * Sizes :
 *   sm — paddingVertical 7,  paddingHorizontal 14, fontSize 13, borderRadius 8
 *   md — paddingVertical 12, paddingHorizontal 20, fontSize 14, borderRadius 10  (défaut)
 *   lg — paddingVertical 15, paddingHorizontal 24, fontSize 15, borderRadius 12
 *
 * Usage :
 *   <Button onPress={save} loading={isPending}>Enregistrer</Button>
 *   <Button variant="danger" size="sm" onPress={del}>Supprimer</Button>
 *   <Button variant="secondary" leftIcon={<Plus size={16} color={theme.primary} />}>Ajouter</Button>
 */
import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, View, StyleSheet } from 'react-native';
import { useTheme } from '../theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps {
  onPress?: () => void;
  children: React.ReactNode;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  style?: object;
  testID?: string;
  accessibilityLabel?: string;
}

const SIZE_STYLES: Record<
  Size,
  { paddingVertical: number; paddingHorizontal: number; fontSize: number; borderRadius: number }
> = {
  sm: { paddingVertical: 7, paddingHorizontal: 14, fontSize: 13, borderRadius: 8 },
  md: { paddingVertical: 12, paddingHorizontal: 20, fontSize: 14, borderRadius: 10 },
  lg: { paddingVertical: 15, paddingHorizontal: 24, fontSize: 15, borderRadius: 12 },
};

export function Button({
  onPress,
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  style,
  testID,
  accessibilityLabel,
}: ButtonProps) {
  const { theme } = useTheme();
  const sz = SIZE_STYLES[size];
  const isDisabled = disabled || loading;

  const containerStyle = (() => {
    const base = {
      paddingVertical: sz.paddingVertical,
      paddingHorizontal: sz.paddingHorizontal,
      borderRadius: sz.borderRadius,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: 8,
      opacity: isDisabled ? 0.6 : 1,
      alignSelf: fullWidth ? undefined : ('auto' as const),
    };
    switch (variant) {
      case 'primary':
        return { ...base, backgroundColor: theme.primary };
      case 'secondary':
        return { ...base, backgroundColor: 'transparent', borderWidth: 1.5, borderColor: theme.primary };
      case 'ghost':
        return { ...base, backgroundColor: 'transparent' };
      case 'danger':
        return { ...base, backgroundColor: theme.functional.error };
    }
  })();

  const textColor = (() => {
    switch (variant) {
      case 'primary':
        return '#fff';
      case 'secondary':
        return theme.primary;
      case 'ghost':
        return theme.text.secondary;
      case 'danger':
        return '#fff';
    }
  })();

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.82}
      style={[containerStyle, fullWidth && styles.fullWidth, style]}
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <>
          {leftIcon}
          <Text style={{ fontSize: sz.fontSize, fontWeight: '700', color: textColor }}>{children}</Text>
          {rightIcon}
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fullWidth: { alignSelf: 'stretch' },
});
