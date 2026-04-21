/**
 * TrackYu Mobile — SearchBar
 *
 * Barre de recherche standardisée : icône Search à gauche, TextInput,
 * bouton X pour effacer quand la valeur est non-vide.
 *
 * Usage :
 *   <SearchBar
 *     value={search}
 *     onChangeText={setSearch}
 *     placeholder="Nom, plaque..."
 *   />
 *
 *   // Avec style conteneur personnalisé
 *   <SearchBar
 *     value={search}
 *     onChangeText={setSearch}
 *     placeholder="Rechercher..."
 *     style={{ margin: 12 }}
 *     height={38}
 *   />
 */
import React from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, type ViewStyle } from 'react-native';
import { Search, X } from 'lucide-react-native';
import { useTheme } from '../theme';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  style?: ViewStyle;
  height?: number;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: boolean;
}

export function SearchBar({
  value,
  onChangeText,
  placeholder = 'Rechercher...',
  style,
  height = 44,
  autoCapitalize = 'none',
  autoCorrect = false,
}: SearchBarProps) {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          height,
          backgroundColor: theme.bg.surface,
          borderColor: theme.border,
        },
        style,
      ]}
    >
      <Search size={16} color={theme.text.muted} />
      <TextInput
        style={[styles.input, { color: theme.text.primary }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.text.muted}
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCorrect}
        accessibilityLabel={placeholder}
      />
      {value.length > 0 && (
        <TouchableOpacity
          onPress={() => onChangeText('')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Effacer"
        >
          <X size={16} color={theme.text.muted} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
});
