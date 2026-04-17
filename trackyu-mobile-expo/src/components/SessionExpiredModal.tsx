/**
 * TrackYu Mobile — Session Expired Modal
 * Reconnexion après expiration JWT.
 * Priorité : biométrie (empreinte / Face ID) → mot de passe en fallback.
 */
import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Lock, Eye, EyeOff, Fingerprint } from 'lucide-react-native';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../theme';
import { useBiometrics } from '../hooks/useBiometrics';

export function SessionExpiredModal() {
  const { theme } = useTheme();
  const { user, sessionExpired, login, dismissSessionExpired } = useAuthStore();
  const { available: bioAvailable, biometricType, authenticate } = useBiometrics();

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Ne pas afficher si pas de session précédente
  if (!sessionExpired || !user?.email) return null;

  // Dès que la modale apparaît, tenter la biométrie automatiquement si disponible
  useEffect(() => {
    if (sessionExpired && bioAvailable) {
      handleBiometric();
    }
  }, [sessionExpired, bioAvailable]);

  const handleBiometric = async () => {
    setLoading(true);
    setError('');
    const creds = await authenticate();
    if (creds) {
      const ok = await login(creds);
      setLoading(false);
      if (!ok) {
        setError('Échec de la reconnexion automatique.');
        setShowPasswordForm(true);
      }
    } else {
      setLoading(false);
      // L'utilisateur a annulé ou la biométrie a échoué → afficher le formulaire mot de passe
      setShowPasswordForm(true);
    }
  };

  const handlePasswordLogin = async () => {
    if (!user?.email || !password.trim()) return;
    setLoading(true);
    setError('');
    const ok = await login({ email: user.email, password });
    setLoading(false);
    if (!ok) {
      setError('Mot de passe incorrect. Réessayez ou déconnectez-vous.');
    } else {
      setPassword('');
    }
  };

  const bioLabel = biometricType === 'faceid' ? 'Face ID' : 'Empreinte digitale';
  const BioIcon = () => <Fingerprint size={22} color="#fff" />;

  return (
    <Modal visible transparent animationType="fade">
      <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={[s.card, { backgroundColor: theme.bg.surface, borderColor: theme.border }]}>
          {/* Icône */}
          <View style={[s.iconWrap, { backgroundColor: theme.functional.warning + '22' }]}>
            <Lock size={28} color={theme.functional.warning} />
          </View>

          <Text style={[s.title, { color: theme.text.primary }]}>Session expirée</Text>
          <Text style={[s.subtitle, { color: theme.text.secondary }]}>
            Votre session a expiré. Veuillez confirmer votre identité pour continuer.
          </Text>

          {/* Email affiché */}
          {user?.email && (
            <View style={[s.emailRow, { backgroundColor: theme.bg.elevated, borderColor: theme.border }]}>
              <Text style={[s.emailText, { color: theme.text.muted }]} numberOfLines={1}>
                {user.email}
              </Text>
            </View>
          )}

          {/* ── État chargement biométrie ── */}
          {loading && !showPasswordForm && (
            <View style={s.bioLoading}>
              <ActivityIndicator color={theme.primary} size="large" />
              <Text style={[s.bioLoadingText, { color: theme.text.muted }]}>Vérification en cours…</Text>
            </View>
          )}

          {/* ── Bouton biométrie (si dispo et formulaire pas encore affiché) ── */}
          {!loading && bioAvailable && !showPasswordForm && (
            <TouchableOpacity
              style={[s.bioBtn, { backgroundColor: theme.primary }]}
              onPress={handleBiometric}
              activeOpacity={0.85}
            >
              <BioIcon />
              <Text style={s.bioBtnText}>Se reconnecter avec {bioLabel}</Text>
            </TouchableOpacity>
          )}

          {/* ── Formulaire mot de passe ── */}
          {(showPasswordForm || !bioAvailable) && !loading && (
            <>
              <View
                style={[
                  s.input,
                  { backgroundColor: theme.bg.elevated, borderColor: error ? theme.functional.error : theme.border },
                ]}
              >
                <TextInput
                  style={{ flex: 1, fontSize: 15, color: theme.text.primary }}
                  placeholder="Mot de passe"
                  placeholderTextColor={theme.text.muted}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={(t) => {
                    setPassword(t);
                    setError('');
                  }}
                  onSubmitEditing={handlePasswordLogin}
                  autoFocus
                />
                <TouchableOpacity
                  onPress={() => setShowPassword((v) => !v)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  {showPassword ? (
                    <EyeOff size={16} color={theme.text.muted} />
                  ) : (
                    <Eye size={16} color={theme.text.muted} />
                  )}
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[s.btn, { backgroundColor: theme.primary, opacity: !password.trim() || loading ? 0.5 : 1 }]}
                onPress={handlePasswordLogin}
                disabled={!password.trim() || loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={[s.btnText, { color: theme.text.onPrimary }]}>Se reconnecter</Text>
                )}
              </TouchableOpacity>

              {/* Réessayer la biométrie si disponible */}
              {bioAvailable && (
                <TouchableOpacity style={s.retryBioBtn} onPress={handleBiometric}>
                  <Text style={[s.retryBioText, { color: theme.primary }]}>Réessayer avec {bioLabel}</Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {error ? <Text style={[s.errorText, { color: theme.functional.error }]}>{error}</Text> : null}

          <TouchableOpacity style={s.logoutBtn} onPress={dismissSessionExpired}>
            <Text style={[s.logoutText, { color: theme.text.muted }]}>Me déconnecter</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    borderRadius: 20,
    padding: 24,
    gap: 12,
    borderWidth: 1,
    alignItems: 'center',
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
  subtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 4 },
  emailRow: {
    width: '100%',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  emailText: { fontSize: 13 },

  // Biométrie
  bioLoading: { alignItems: 'center', gap: 10, paddingVertical: 8 },
  bioLoadingText: { fontSize: 13 },
  bioBtn: {
    width: '100%',
    borderRadius: 27,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  bioBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  retryBioBtn: { paddingVertical: 4 },
  retryBioText: { fontSize: 13, fontWeight: '600' },

  // Mot de passe
  input: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorText: { fontSize: 12, textAlign: 'center' },
  btn: {
    width: '100%',
    borderRadius: 27,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  btnText: { fontWeight: '700', fontSize: 15 },
  logoutBtn: { paddingVertical: 8 },
  logoutText: { fontSize: 13 },
});
