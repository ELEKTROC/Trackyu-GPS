/**
 * VehicleFilterPanel — panneau filtre 2 colonnes réutilisable
 * Colonne gauche : liste de blocs (catégories)
 * Colonne droite : items de la catégorie sélectionnée + barre de recherche
 *
 * Usage :
 *   <VehicleFilterPanel visible={showFilters} blocks={blocks} onReset={onReset} theme={theme} />
 */
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Search, X, Check } from 'lucide-react-native';
import { useTheme } from '../theme';

// ── Types ────────────────────────────────────────────────────────────────────

export interface FilterItem {
  id: string;
  label: string;
  sublabel?: string;
  /** Petit point coloré (statut véhicule) */
  statusColor?: string;
}

export interface FilterBlockDef {
  key: string;
  label: string;
  items: FilterItem[];
  selected: string | null;
  onSelect: (id: string | null) => void;
}

interface VehicleFilterPanelProps {
  visible: boolean;
  blocks: FilterBlockDef[];
  /** true si au moins un filtre est actif (pour afficher le bouton Reset) */
  hasActiveFilters: boolean;
  onReset: () => void;
}

// ── Component ────────────────────────────────────────────────────────────────

export function VehicleFilterPanel({ visible, blocks, hasActiveFilters, onReset }: VehicleFilterPanelProps) {
  const { theme } = useTheme();
  const s = styles(theme);

  const [activeKey, setActiveKey] = useState<string>(blocks[0]?.key ?? '');
  const [search, setSearch] = useState('');

  if (!visible || blocks.length === 0) return null;

  const activeBlock = blocks.find((b) => b.key === activeKey) ?? blocks[0];
  const q = search.trim().toLowerCase();

  const filteredItems = activeBlock.items.filter(
    (item) => !q || item.label.toLowerCase().includes(q) || (item.sublabel ?? '').toLowerCase().includes(q)
  );

  const isAllSelected = activeBlock.selected === null;

  return (
    <View style={s.panel}>
      {/* Barre de recherche interne */}
      <View style={s.searchRow}>
        <Search size={12} color={theme.text.muted} />
        <TextInput
          style={s.searchInput}
          placeholder="Rechercher…"
          placeholderTextColor={theme.text.muted}
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
          autoCapitalize="characters"
        />
        {search.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearch('')}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            accessibilityRole="button"
            accessibilityLabel="Effacer la recherche"
          >
            <X size={11} color={theme.text.muted} />
          </TouchableOpacity>
        )}
      </View>

      {/* 2 colonnes */}
      <View style={s.columns}>
        {/* ── Gauche : catégories ── */}
        <View style={s.catCol}>
          {blocks.map((block) => {
            const isActive = block.key === activeKey;
            const hasSel = block.selected !== null;
            return (
              <TouchableOpacity
                key={block.key}
                style={[s.catBtn, isActive && s.catBtnActive]}
                onPress={() => {
                  setActiveKey(block.key);
                  setSearch('');
                }}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel={block.label}
                accessibilityState={{ selected: isActive }}
              >
                {hasSel && <View style={s.catDot} />}
                <Text style={[s.catLabel, isActive && s.catLabelActive]} numberOfLines={1}>
                  {block.label}
                </Text>
              </TouchableOpacity>
            );
          })}

          {/* Reset global */}
          {hasActiveFilters && (
            <TouchableOpacity
              style={s.resetBtn}
              onPress={onReset}
              accessibilityRole="button"
              accessibilityLabel="Réinitialiser les filtres"
            >
              <X size={10} color={theme.functional.error} />
              <Text style={[s.catLabel, { color: theme.functional.error }]}>Reset</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Droite : items ── */}
        <ScrollView style={s.itemCol} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* "Tous" */}
          <TouchableOpacity
            style={[s.item, isAllSelected && s.itemActive]}
            onPress={() => activeBlock.onSelect(null)}
            accessibilityRole="button"
            accessibilityLabel="Tous"
            accessibilityState={{ selected: isAllSelected }}
          >
            <Text style={[s.itemLabel, isAllSelected && { color: theme.primary, fontWeight: '700' as const }]}>
              Tous
            </Text>
            {isAllSelected && <Check size={12} color={theme.primary} />}
          </TouchableOpacity>

          {/* Items filtrés */}
          {filteredItems.length === 0 ? (
            <Text style={s.emptyText}>Aucun résultat</Text>
          ) : (
            filteredItems.map((item) => {
              const isSel = activeBlock.selected === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[s.item, isSel && s.itemActive]}
                  onPress={() => activeBlock.onSelect(isSel ? null : item.id)}
                  activeOpacity={0.75}
                  accessibilityRole="button"
                  accessibilityLabel={item.label}
                  accessibilityState={{ selected: isSel }}
                >
                  {item.statusColor && (
                    <View
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: 4,
                        backgroundColor: item.statusColor,
                        marginRight: 4,
                        flexShrink: 0,
                      }}
                    />
                  )}
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[s.itemLabel, isSel && { color: theme.primary, fontWeight: '600' as const }]}
                      numberOfLines={1}
                    >
                      {item.label}
                    </Text>
                    {item.sublabel ? (
                      <Text style={s.itemSublabel} numberOfLines={1}>
                        {item.sublabel}
                      </Text>
                    ) : null}
                  </View>
                  {isSel && <Check size={12} color={theme.primary} />}
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = (theme: ReturnType<typeof import('../theme').useTheme>['theme']) =>
  StyleSheet.create({
    panel: {
      backgroundColor: theme.bg.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      overflow: 'hidden',
    },
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    searchInput: {
      flex: 1,
      fontSize: 12,
      color: theme.text.primary,
      padding: 0,
    },
    columns: {
      flexDirection: 'row',
      height: 180,
    },
    catCol: {
      width: 94,
      paddingVertical: 6,
      paddingHorizontal: 4,
      gap: 2,
      borderRightWidth: 1,
      borderRightColor: theme.border,
    },
    catBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 8,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    catBtnActive: {
      backgroundColor: theme.primary + '22',
      borderColor: theme.primary,
    },
    catDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: theme.primary,
      flexShrink: 0,
    },
    catLabel: {
      fontSize: 11,
      color: theme.text.secondary,
      flex: 1,
    },
    catLabelActive: {
      color: theme.primary,
      fontWeight: '700',
    },
    resetBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 7,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.functional.error + '80',
      marginTop: 4,
    },
    itemCol: { flex: 1 },
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 9,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      gap: 4,
    },
    itemActive: { backgroundColor: theme.primary + '14' },
    itemLabel: { fontSize: 12, color: theme.text.primary, flex: 1 },
    itemSublabel: { fontSize: 10, color: theme.text.muted },
    emptyText: {
      fontSize: 12,
      color: theme.text.muted,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
  });

export default VehicleFilterPanel;
