/**
 * TrackYu Mobile — App Update Banner / Modal
 *
 * - Force upgrade : modal bloquant (pas de dismiss)
 * - Soft upgrade  : banner dismissable en haut de l'écran
 */
import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Download, X } from 'lucide-react-native';
import type { VersionStatus } from '../hooks/useAppVersionCheck';
import { useTheme } from '../theme';

interface Props {
  status: VersionStatus | null;
}

export function AppUpdateBanner({ status }: Props) {
  const { theme } = useTheme();

  if (!status) return null;

  if (status.forceUpgrade) {
    return (
      <Modal visible transparent animationType="fade">
        <View style={s.overlay}>
          <View style={[s.card, { backgroundColor: theme.bg.surface, borderColor: theme.border }]}>
            <View style={[s.iconWrap, { backgroundColor: theme.primary + '22' }]}>
              <Download size={28} color={theme.primary} />
            </View>
            <Text style={[s.title, { color: theme.text.primary }]}>Mise à jour requise</Text>
            <Text style={[s.body, { color: theme.text.secondary }]}>{status.message}</Text>
            <Text style={[s.version, { color: theme.text.muted }]}>Version {status.latestVersion} disponible</Text>
            <TouchableOpacity
              style={[s.btn, { backgroundColor: theme.primary }]}
              onPress={status.openStore}
              activeOpacity={0.85}
            >
              <Download size={16} color="#fff" />
              <Text style={[s.btnText, { color: theme.text.onPrimary }]}>Mettre à jour</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  // Soft upgrade — banner non bloquant
  return (
    <View style={[s.banner, { backgroundColor: theme.primary }]}>
      <Text style={s.bannerText} numberOfLines={1}>
        {status.message}
      </Text>
      <TouchableOpacity style={s.bannerUpdate} onPress={status.openStore} activeOpacity={0.8}>
        <Text style={s.bannerUpdateText}>Mettre à jour</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={status.dismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <X size={16} color="rgba(255,255,255,0.8)" />
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  // Force modal
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: { fontSize: 20, fontWeight: '700', textAlign: 'center' },
  body: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  version: { fontSize: 12 },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginTop: 4,
  },
  btnText: { fontWeight: '700', fontSize: 15 },

  // Soft banner
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  bannerText: { flex: 1, fontSize: 12, color: '#fff', fontWeight: '500' },
  bannerUpdate: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  bannerUpdateText: { fontSize: 12, color: '#fff', fontWeight: '700' },
});
