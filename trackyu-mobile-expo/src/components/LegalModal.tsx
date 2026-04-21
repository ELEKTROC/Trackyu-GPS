/**
 * TrackYu Mobile — LegalModal
 * Affiche un document légal (CGU / Politique de confidentialité) directement dans l'app.
 * Rendu Markdown minimal : H1/H2/H3, séparateur, puces, gras inline, tableaux simplifiés.
 */
import React from 'react';
import { Modal, View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { useTheme } from '../theme';

// ── Parser inline gras (**...**) ──────────────────────────────────────────────

function InlineText({ text, style }: { text: string; style: object }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <Text style={style}>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <Text key={i} style={{ fontWeight: '700' }}>
              {part.slice(2, -2)}
            </Text>
          );
        }
        // Italique *...*
        if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
          return (
            <Text key={i} style={{ fontStyle: 'italic' }}>
              {part.slice(1, -1)}
            </Text>
          );
        }
        return part;
      })}
    </Text>
  );
}

// ── Renderer de blocs Markdown ─────────────────────────────────────────────────

function MarkdownContent({
  content,
  theme,
}: {
  content: string;
  theme: ReturnType<typeof import('../theme').useTheme>['theme'];
}) {
  const lines = content.split('\n');

  return (
    <View style={{ gap: 0 }}>
      {lines.map((line, i) => {
        // H1
        if (line.startsWith('# ')) {
          return (
            <Text key={i} style={[s.h1, { color: theme.text.primary }]}>
              {line.slice(2)}
            </Text>
          );
        }
        // H2
        if (line.startsWith('## ')) {
          return (
            <Text key={i} style={[s.h2, { color: theme.text.primary }]}>
              {line.slice(3)}
            </Text>
          );
        }
        // H3
        if (line.startsWith('### ')) {
          return (
            <Text key={i} style={[s.h3, { color: theme.text.secondary }]}>
              {line.slice(4)}
            </Text>
          );
        }
        // Séparateur ---
        if (line.trim() === '---') {
          return <View key={i} style={[s.hr, { backgroundColor: theme.border }]} />;
        }
        // Puce - item
        if (line.startsWith('- ')) {
          return (
            <View key={i} style={s.bulletRow}>
              <View style={[s.bulletDot, { backgroundColor: theme.text.muted }]} />
              <InlineText text={line.slice(2)} style={[s.bulletText, { color: theme.text.secondary }]} />
            </View>
          );
        }
        // Tableau simplifié | col | col |
        if (line.startsWith('|')) {
          // Ignorer les lignes de séparation |---|---|
          if (line.includes('---')) return null;
          const cells = line.split('|').filter((c) => c.trim() !== '');
          return (
            <View key={i} style={[s.tableRow, { borderBottomColor: theme.border }]}>
              {cells.map((cell, ci) => (
                <InlineText
                  key={ci}
                  text={cell.trim()}
                  style={[s.tableCell, { color: theme.text.secondary, flex: 1 }]}
                />
              ))}
            </View>
          );
        }
        // Ligne vide → espacement
        if (line.trim() === '') {
          return <View key={i} style={{ height: 8 }} />;
        }
        // Italique pleine ligne *...*
        if (line.startsWith('*') && line.endsWith('*')) {
          return (
            <Text key={i} style={[s.italic, { color: theme.text.muted }]}>
              {line.slice(1, -1)}
            </Text>
          );
        }
        // Paragraphe standard (avec gras inline)
        return <InlineText key={i} text={line} style={[s.paragraph, { color: theme.text.secondary }]} />;
      })}
    </View>
  );
}

// ── Composant principal ───────────────────────────────────────────────────────

interface LegalModalProps {
  visible: boolean;
  title: string;
  content: string;
  onClose: () => void;
}

export function LegalModal({ visible, title, content, onClose }: LegalModalProps) {
  const { theme } = useTheme();

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg.primary }} edges={['top']}>
        {/* Header */}
        <View style={[legalStyles.header, { backgroundColor: theme.bg.surface, borderBottomColor: theme.border }]}>
          <Text style={[legalStyles.headerTitle, { color: theme.text.primary }]} numberOfLines={1}>
            {title}
          </Text>
          <TouchableOpacity
            onPress={onClose}
            style={[legalStyles.closeBtn, { backgroundColor: theme.bg.elevated }]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Fermer"
          >
            <X size={18} color={theme.text.muted} />
          </TouchableOpacity>
        </View>

        {/* Contenu */}
        <ScrollView contentContainerStyle={legalStyles.content} showsVerticalScrollIndicator={false}>
          <MarkdownContent content={content} theme={theme} />
          <View style={{ height: Platform.OS === 'ios' ? 40 : 24 }} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ── Styles statiques (ne dépendent pas du thème) ──────────────────────────────

const s = StyleSheet.create({
  h1: { fontSize: 20, fontWeight: '800', marginTop: 12, marginBottom: 6 },
  h2: { fontSize: 16, fontWeight: '700', marginTop: 18, marginBottom: 4 },
  h3: { fontSize: 14, fontWeight: '600', marginTop: 12, marginBottom: 3 },
  hr: { height: 1, marginVertical: 12 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginVertical: 2 },
  bulletDot: { width: 5, height: 5, borderRadius: 2.5, marginTop: 7 },
  bulletText: { flex: 1, fontSize: 13, lineHeight: 20 },
  tableRow: { flexDirection: 'row', gap: 8, paddingVertical: 6, borderBottomWidth: 1 },
  tableCell: { fontSize: 12, lineHeight: 18 },
  paragraph: { fontSize: 13, lineHeight: 21, marginVertical: 1 },
  italic: { fontSize: 12, fontStyle: 'italic', marginTop: 8 },
});

const legalStyles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', flex: 1 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  content: { padding: 16 },
});

export default LegalModal;
