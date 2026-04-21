/**
 * TrackYu Mobile — ProtectedScreen
 *
 * Garde de rôle au niveau composant (2e niveau de défense après RootNavigator).
 * Affiche un écran d'accès refusé si le rôle de l'utilisateur n'est pas autorisé.
 *
 * Usage :
 *   export default function AdminScreen() {
 *     return (
 *       <ProtectedScreen allowedRoles={ADMIN_SCREEN_ROLES}>
 *         { contenu protégé }
 *       </ProtectedScreen>
 *     );
 *   }
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ShieldOff } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../theme';

interface Props {
  /** Rôles autorisés à voir le contenu (insensible à la casse) */
  allowedRoles: readonly string[];
  children: React.ReactNode;
}

export function ProtectedScreen({ allowedRoles, children }: Props) {
  const { theme } = useTheme();
  const user = useAuthStore((s) => s.user);
  const nav = useNavigation();
  const role = user?.role?.toUpperCase() ?? '';

  if (!(allowedRoles as string[]).includes(role)) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.bg.primary }]} edges={['top']}>
        <View style={styles.inner}>
          <View style={[styles.iconWrap, { backgroundColor: theme.functional.error + '18' }]}>
            <ShieldOff size={40} color={theme.functional.error} strokeWidth={1.5} />
          </View>
          <Text style={[styles.title, { color: theme.text.primary }]}>Accès refusé</Text>
          <Text style={[styles.subtitle, { color: theme.text.muted }]}>
            Vous n'avez pas les droits nécessaires pour accéder à cette section.
          </Text>
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: theme.primary }]}
            onPress={() => nav.goBack()}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Retour"
          >
            <Text style={[styles.btnText, { color: theme.text.onPrimary }]}>Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 16 },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: { fontSize: 22, fontWeight: '700', textAlign: 'center' },
  subtitle: { fontSize: 14, textAlign: 'center', lineHeight: 22 },
  btn: { marginTop: 8, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12 },
  btnText: { fontSize: 15, fontWeight: '700' },
});

export default ProtectedScreen;
