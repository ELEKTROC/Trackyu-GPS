/**
 * TrackYu Mobile - Login Screen
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Eye, EyeOff, Lock, Mail, X, User, Phone, Building2, ChevronDown, Check } from 'lucide-react-native';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme';
import apiClient from '../../api/client';
import { haptics } from '../../utils/haptics';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254;
const MAX_PASSWORD_LENGTH = 128;

type RequestType = 'demo' | 'inscription' | 'info';

const REQUEST_TYPES: { id: RequestType; label: string; emoji: string; msgPrefix: string }[] = [
  { id: 'demo', label: 'Démo gratuite', emoji: '🎯', msgPrefix: 'DEMO' },
  { id: 'inscription', label: 'Ouvrir un compte', emoji: '✅', msgPrefix: 'INSCRIPTION' },
  { id: 'info', label: 'Renseignement', emoji: '💬', msgPrefix: 'INFO' },
];

export function LoginScreen() {
  const { theme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const { login, isLoading, error, clearError } = useAuthStore();

  // ── Rate limiting ──
  const [failCount, setFailCount] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(0); // timestamp ms
  const [lockSeconds, setLockSeconds] = useState(0);

  useEffect(() => {
    if (lockedUntil <= Date.now()) return;
    const interval = setInterval(() => {
      const rem = Math.ceil((lockedUntil - Date.now()) / 1000);
      if (rem <= 0) {
        setLockSeconds(0);
        clearInterval(interval);
      } else setLockSeconds(rem);
    }, 500);
    setLockSeconds(Math.ceil((lockedUntil - Date.now()) / 1000));
    return () => clearInterval(interval);
  }, [lockedUntil]);

  const isLocked = lockSeconds > 0;

  // ── Modal inscription ──
  const [modalVisible, setModalVisible] = useState(false);
  const [reqType, setReqType] = useState<RequestType>('demo');
  const [reqDropdownOpen, setReqDropdownOpen] = useState(false);
  const [reqName, setReqName] = useState('');
  const [reqEmail, setReqEmail] = useState('');
  const [reqPhone, setReqPhone] = useState('');
  const [reqCompany, setReqCompany] = useState('');
  const [reqMessage, setReqMessage] = useState('');
  const [reqLoading, setReqLoading] = useState(false);

  // ── Modal mot de passe oublié ──
  const [forgotVisible, setForgotVisible] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotEmailError, setForgotEmailError] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  const handleSendRequest = async () => {
    if (!reqName.trim() || !reqEmail.trim()) {
      Alert.alert('Champs requis', 'Veuillez renseigner votre nom et email.');
      return;
    }
    if (!EMAIL_REGEX.test(reqEmail.trim())) {
      Alert.alert('Email invalide', 'Veuillez saisir une adresse email valide.');
      return;
    }
    const prefix = REQUEST_TYPES.find((t) => t.id === reqType)?.msgPrefix ?? 'INFO';
    const fullMessage = [
      prefix,
      reqCompany ? `Société: ${reqCompany}` : null,
      reqPhone ? `Tél: ${reqPhone}` : null,
      reqMessage ? reqMessage : null,
    ]
      .filter(Boolean)
      .join(' | ');

    setReqLoading(true);
    try {
      await apiClient.post('/auth/demo-request', {
        name: reqName.trim(),
        email: reqEmail.trim(),
        message: fullMessage,
      });
      setModalVisible(false);
      setReqName('');
      setReqEmail('');
      setReqPhone('');
      setReqCompany('');
      setReqMessage('');
      Alert.alert('Demande envoyée ✓', 'Votre demande a bien été reçue. Notre équipe vous contactera dans les 24h.');
    } catch {
      Alert.alert('Erreur', "Impossible d'envoyer la demande. Vérifiez votre connexion.");
    } finally {
      setReqLoading(false);
    }
  };

  const s = styles(theme);

  const handleLogin = async () => {
    if (isLocked) return;
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password.trim()) {
      Alert.alert('Champs requis', 'Veuillez remplir tous les champs.');
      return;
    }
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      setEmailError('Format de compte invalide (ex: nom@domaine.com)');
      return;
    }
    setEmailError('');
    const success = await login({ email: trimmedEmail, password });
    if (success) {
      haptics.success();
      setFailCount(0);
    } else {
      haptics.error();
      setPassword('');
      const newCount = failCount + 1;
      setFailCount(newCount);
      if (newCount >= 3) {
        setLockedUntil(Date.now() + 30_000);
        Alert.alert('Trop de tentatives', 'Veuillez patienter 30 secondes avant de réessayer.');
      } else {
        // Lire l'erreur depuis le store après résolution (la closure capture une valeur stale)
        const freshError = useAuthStore.getState().error;
        Alert.alert('Erreur de connexion', freshError ?? 'Identifiants incorrects ou serveur indisponible.');
      }
      clearError();
    }
  };

  const handleEmailChange = (text: string) => {
    setEmail(text);
    if (emailError && EMAIL_REGEX.test(text.trim())) setEmailError('');
  };

  const handleForgotPassword = () => {
    setForgotEmail(EMAIL_REGEX.test(email.trim()) ? email.trim() : '');
    setForgotEmailError('');
    setForgotSent(false);
    setForgotVisible(true);
  };

  const handleSubmitForgot = async () => {
    const trimmed = forgotEmail.trim();
    if (!trimmed) {
      setForgotEmailError('Veuillez saisir votre adresse email.');
      return;
    }
    if (!EMAIL_REGEX.test(trimmed)) {
      setForgotEmailError('Format invalide (ex: nom@domaine.com)');
      return;
    }
    setForgotEmailError('');
    setForgotLoading(true);
    try {
      await apiClient.post('/auth/forgot-password', { email: trimmed });
      setForgotSent(true);
    } catch {
      setForgotEmailError('Erreur réseau. Vérifiez votre connexion.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.keyboardView}>
        <View style={s.content}>
          {/* ── Logo + Brand ── */}
          <View style={s.logoSection}>
            {/* Icône GPS stylisée — remplacer par <Image source={...} /> une fois le logo PNG dispo */}
            <View style={s.logoMark}>
              <View style={s.logoArrow} />
            </View>
            <Text style={s.brandName}>TrackYu</Text>
            <Text style={s.brandTagline}>Le Futur de la Gestion de Flotte</Text>
            <View style={s.welcomeBox}>
              <Text style={s.welcomeTitle}>Bienvenue</Text>
              <Text style={s.welcomeText}>Connectez-vous pour accéder à votre compte de suivi en temps réel.</Text>
            </View>
          </View>

          {/* ── Formulaire ── */}
          <View style={s.form}>
            {/* Compte */}
            <View style={s.fieldGroup}>
              <Text style={s.fieldLabel}>Compte</Text>
              <View style={[s.inputRow, emailError ? s.inputRowError : null]}>
                <Mail size={16} color={emailError ? theme.functional.error : theme.text.muted} style={s.inputIcon} />
                <TextInput
                  style={s.input}
                  placeholder="votre@email.com"
                  placeholderTextColor={theme.text.muted}
                  value={email}
                  onChangeText={handleEmailChange}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  maxLength={MAX_EMAIL_LENGTH}
                  editable={!isLoading}
                  testID="input-email"
                />
              </View>
              {emailError ? <Text style={s.fieldError}>{emailError}</Text> : null}
            </View>

            {/* Mot de passe */}
            <View style={s.fieldGroup}>
              <Text style={s.fieldLabel}>Mot de passe</Text>
              <View style={s.inputRow}>
                <Lock size={16} color={theme.text.muted} style={s.inputIcon} />
                <TextInput
                  style={s.input}
                  placeholder="••••••••"
                  placeholderTextColor={theme.text.muted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                  textContentType="password"
                  maxLength={MAX_PASSWORD_LENGTH}
                  editable={!isLoading}
                  testID="input-password"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={s.eyeButton}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  accessibilityRole="button"
                >
                  {showPassword ? (
                    <EyeOff size={16} color={theme.text.muted} />
                  ) : (
                    <Eye size={16} color={theme.text.muted} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Bouton connexion */}
            <TouchableOpacity
              style={[s.loginButton, (isLoading || isLocked) && s.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={isLoading || isLocked}
              activeOpacity={0.85}
              testID="btn-login"
              accessibilityRole="button"
              accessibilityLabel={
                isLocked ? `Connexion bloquée, réessayez dans ${lockSeconds} secondes` : 'Se connecter'
              }
              accessibilityState={{ disabled: isLoading || isLocked, busy: isLoading }}
            >
              {isLoading ? (
                <ActivityIndicator color={theme.text.onPrimary} />
              ) : isLocked ? (
                <Text style={s.loginButtonText}>Réessayez dans {lockSeconds}s</Text>
              ) : (
                <Text style={s.loginButtonText}>Se connecter</Text>
              )}
            </TouchableOpacity>

            {/* Mot de passe oublié */}
            <TouchableOpacity style={s.forgotButton} onPress={handleForgotPassword}>
              <Text style={s.forgotText}>Mot de passe oublié ?</Text>
            </TouchableOpacity>
          </View>

          {/* ── Inscription ── */}
          <View style={{ alignItems: 'center', marginTop: 8 }}>
            <Text style={{ fontSize: 13, color: theme.text.muted }}>
              Première connexion ?{' '}
              <Text style={{ color: theme.primary, fontWeight: '600' }} onPress={() => setModalVisible(true)}>
                Demander un accès
              </Text>
            </Text>
          </View>

          {/* ── Footer ── */}
          <Text style={s.footer}>TrackYu GPS v1.0.0</Text>
        </View>
      </KeyboardAvoidingView>

      {/* ── Modal mot de passe oublié ── */}
      <Modal visible={forgotVisible} animationType="fade" transparent onRequestClose={() => setForgotVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', paddingHorizontal: 24 }}>
          <View style={{ backgroundColor: theme.bg.primary, borderRadius: 20, padding: 24 }}>
            {/* Header */}
            <View
              style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}
            >
              <Text style={{ fontSize: 18, fontWeight: '700', color: theme.text.primary }}>Mot de passe oublié</Text>
              <TouchableOpacity
                onPress={() => setForgotVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityLabel="Fermer"
                accessibilityRole="button"
              >
                <X size={20} color={theme.text.muted} />
              </TouchableOpacity>
            </View>

            {forgotSent ? (
              /* ── État succès ── */
              <View style={{ alignItems: 'center', paddingVertical: 16 }}>
                <View
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    backgroundColor: theme.functional.success + '22',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginBottom: 14,
                  }}
                >
                  <Check size={28} color={theme.functional.success} />
                </View>
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: '600',
                    color: theme.text.primary,
                    textAlign: 'center',
                    marginBottom: 8,
                  }}
                >
                  Email envoyé
                </Text>
                <Text style={{ fontSize: 13, color: theme.text.muted, textAlign: 'center', lineHeight: 19 }}>
                  Si un compte existe pour cette adresse, vous recevrez un lien de réinitialisation dans quelques
                  minutes.
                </Text>
                <TouchableOpacity
                  onPress={() => setForgotVisible(false)}
                  style={{
                    marginTop: 20,
                    height: 48,
                    width: '100%',
                    backgroundColor: theme.primary,
                    borderRadius: 12,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ fontSize: 15, fontWeight: '700', color: theme.text.onPrimary }}>Fermer</Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* ── Formulaire ── */
              <>
                <Text style={{ fontSize: 13, color: theme.text.muted, marginBottom: 16, lineHeight: 19 }}>
                  Saisissez votre adresse email. Vous recevrez un lien pour réinitialiser votre mot de passe.
                </Text>
                <View
                  style={[
                    {
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: theme.bg.surface,
                      borderWidth: 1,
                      borderColor: forgotEmailError ? theme.functional.error : theme.border,
                      borderRadius: 12,
                      paddingHorizontal: 14,
                      height: 52,
                    },
                  ]}
                >
                  <Mail size={16} color={forgotEmailError ? theme.functional.error : theme.text.muted} />
                  <TextInput
                    style={{ flex: 1, fontSize: 15, color: theme.text.primary, marginLeft: 10 }}
                    placeholder="votre@email.com"
                    placeholderTextColor={theme.text.muted}
                    value={forgotEmail}
                    onChangeText={(t) => {
                      setForgotEmail(t);
                      if (forgotEmailError) setForgotEmailError('');
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoFocus
                  />
                </View>
                {forgotEmailError ? (
                  <Text style={{ fontSize: 12, color: theme.functional.error, marginTop: 4 }}>{forgotEmailError}</Text>
                ) : null}
                <TouchableOpacity
                  onPress={handleSubmitForgot}
                  disabled={forgotLoading}
                  style={{
                    marginTop: 20,
                    height: 52,
                    backgroundColor: theme.primary,
                    borderRadius: 12,
                    justifyContent: 'center',
                    alignItems: 'center',
                    opacity: forgotLoading ? 0.6 : 1,
                  }}
                  testID="btn-forgot-submit"
                  accessibilityLabel="Envoyer le lien de réinitialisation"
                  accessibilityRole="button"
                  accessibilityState={{ disabled: forgotLoading, busy: forgotLoading }}
                >
                  {forgotLoading ? (
                    <ActivityIndicator color={theme.text.onPrimary} />
                  ) : (
                    <Text style={{ fontSize: 15, fontWeight: '700', color: theme.text.onPrimary }}>
                      Envoyer le lien
                    </Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ── Modal demande d'accès ── */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg.primary }}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={{ padding: 24 }} keyboardShouldPersistTaps="handled">
              {/* Header */}
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 24,
                }}
              >
                <Text style={{ fontSize: 20, fontWeight: '700', color: theme.text.primary }}>Demander un accès</Text>
                <TouchableOpacity
                  onPress={() => setModalVisible(false)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityLabel="Fermer"
                  accessibilityRole="button"
                >
                  <X size={22} color={theme.text.muted} />
                </TouchableOpacity>
              </View>

              {/* Type de demande — Dropdown */}
              <Text style={{ fontSize: 13, fontWeight: '600', color: theme.text.secondary, marginBottom: 8 }}>
                Type de demande
              </Text>
              <View style={{ marginBottom: 20, zIndex: 10 }}>
                <TouchableOpacity
                  onPress={() => setReqDropdownOpen((o) => !o)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: theme.bg.surface,
                    borderWidth: 1.5,
                    borderColor: reqDropdownOpen ? theme.primary : theme.border,
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    height: 50,
                  }}
                >
                  <Text style={{ fontSize: 15, color: theme.text.primary }}>
                    {REQUEST_TYPES.find((t) => t.id === reqType)?.emoji}{' '}
                    {REQUEST_TYPES.find((t) => t.id === reqType)?.label}
                  </Text>
                  <ChevronDown
                    size={18}
                    color={theme.text.muted}
                    style={{ transform: [{ rotate: reqDropdownOpen ? '180deg' : '0deg' }] }}
                  />
                </TouchableOpacity>
                {reqDropdownOpen && (
                  <View
                    style={{
                      position: 'absolute',
                      top: 54,
                      left: 0,
                      right: 0,
                      backgroundColor: theme.bg.surface,
                      borderWidth: 1,
                      borderColor: theme.border,
                      borderRadius: 12,
                      overflow: 'hidden',
                      elevation: 8,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.12,
                      shadowRadius: 8,
                    }}
                  >
                    {REQUEST_TYPES.map((t, i) => (
                      <TouchableOpacity
                        key={t.id}
                        onPress={() => {
                          setReqType(t.id);
                          setReqDropdownOpen(false);
                        }}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          paddingHorizontal: 16,
                          paddingVertical: 14,
                          borderTopWidth: i === 0 ? 0 : 1,
                          borderTopColor: theme.border,
                        }}
                      >
                        <Text style={{ fontSize: 15, color: theme.text.primary }}>
                          {t.emoji} {t.label}
                        </Text>
                        {reqType === t.id && <Check size={16} color={theme.primary} />}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Champs */}
              {[
                {
                  label: 'Nom complet *',
                  icon: <User size={16} color={theme.text.muted} />,
                  value: reqName,
                  set: setReqName,
                  placeholder: 'Jean Dupont',
                  keyboard: 'default' as const,
                },
                {
                  label: 'Email *',
                  icon: <Mail size={16} color={theme.text.muted} />,
                  value: reqEmail,
                  set: setReqEmail,
                  placeholder: 'jean@exemple.com',
                  keyboard: 'email-address' as const,
                },
                {
                  label: 'Téléphone',
                  icon: <Phone size={16} color={theme.text.muted} />,
                  value: reqPhone,
                  set: setReqPhone,
                  placeholder: '+225 0700000000',
                  keyboard: 'phone-pad' as const,
                },
                {
                  label: 'Société',
                  icon: <Building2 size={16} color={theme.text.muted} />,
                  value: reqCompany,
                  set: setReqCompany,
                  placeholder: 'Nom de votre entreprise',
                  keyboard: 'default' as const,
                },
              ].map((field) => (
                <View key={field.label} style={{ marginBottom: 14 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: theme.text.secondary, marginBottom: 6 }}>
                    {field.label}
                  </Text>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: theme.bg.surface,
                      borderWidth: 1,
                      borderColor: theme.border,
                      borderRadius: 12,
                      paddingHorizontal: 14,
                      height: 50,
                    }}
                  >
                    {field.icon}
                    <TextInput
                      style={{ flex: 1, fontSize: 15, color: theme.text.primary, marginLeft: 10 }}
                      placeholder={field.placeholder}
                      placeholderTextColor={theme.text.muted}
                      value={field.value}
                      onChangeText={field.set}
                      keyboardType={field.keyboard}
                      autoCapitalize="none"
                    />
                  </View>
                </View>
              ))}

              {/* Message */}
              <View style={{ marginBottom: 24 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: theme.text.secondary, marginBottom: 6 }}>
                  Message (optionnel)
                </Text>
                <TextInput
                  style={{
                    backgroundColor: theme.bg.surface,
                    borderWidth: 1,
                    borderColor: theme.border,
                    borderRadius: 12,
                    padding: 14,
                    fontSize: 15,
                    color: theme.text.primary,
                    minHeight: 90,
                    textAlignVertical: 'top',
                  }}
                  placeholder="Décrivez votre besoin, nombre de véhicules..."
                  placeholderTextColor={theme.text.muted}
                  value={reqMessage}
                  onChangeText={setReqMessage}
                  multiline
                  numberOfLines={4}
                />
              </View>

              {/* Submit */}
              <TouchableOpacity
                style={{
                  height: 52,
                  backgroundColor: theme.primary,
                  borderRadius: 14,
                  justifyContent: 'center',
                  alignItems: 'center',
                  opacity: reqLoading ? 0.6 : 1,
                }}
                onPress={handleSendRequest}
                disabled={reqLoading}
                testID="btn-request-submit"
                accessibilityLabel="Envoyer ma demande d'accès"
                accessibilityRole="button"
                accessibilityState={{ disabled: reqLoading, busy: reqLoading }}
              >
                {reqLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>Envoyer ma demande</Text>
                )}
              </TouchableOpacity>

              <Text style={{ textAlign: 'center', fontSize: 12, color: theme.text.muted, marginTop: 16 }}>
                Réponse sous 24h · support@trackyugps.com
              </Text>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// ── Styles dynamiques ─────────────────────────────────────────────────────────
const styles = (theme: ReturnType<typeof import('../../theme').useTheme>['theme']) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.bg.primary,
    },
    keyboardView: { flex: 1 },
    content: {
      flex: 1,
      paddingHorizontal: 28,
      justifyContent: 'center',
    },

    // Logo
    logoSection: {
      alignItems: 'center',
      marginBottom: 28,
    },
    logoMark: {
      width: 72,
      height: 72,
      borderRadius: 20,
      backgroundColor: theme.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 16,
      elevation: 8,
    },
    logoArrow: {
      width: 0,
      height: 0,
      borderLeftWidth: 14,
      borderRightWidth: 14,
      borderBottomWidth: 26,
      borderLeftColor: 'transparent',
      borderRightColor: 'transparent',
      borderBottomColor: '#fff',
      marginBottom: 4,
    },
    brandName: {
      fontSize: 32,
      fontWeight: '700',
      color: theme.text.primary,
      letterSpacing: -0.5,
    },
    brandTagline: {
      fontSize: 13,
      color: theme.text.muted,
      marginTop: 4,
      letterSpacing: 0.2,
    },
    welcomeBox: {
      marginTop: 14,
      paddingHorizontal: 8,
      alignItems: 'center',
    },
    welcomeTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.text.primary,
      marginBottom: 6,
    },
    welcomeText: {
      fontSize: 13,
      color: theme.text.muted,
      textAlign: 'center',
      lineHeight: 19,
    },

    // Formulaire
    form: { gap: 16 },
    fieldGroup: { gap: 6 },
    fieldLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text.primary,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.bg.surface,
      borderWidth: 1.5,
      borderColor: theme.border,
      borderRadius: 16,
      paddingHorizontal: 14,
      height: 54,
    },
    inputRowError: {
      borderColor: theme.functional.error,
    },
    fieldError: {
      fontSize: 12,
      color: theme.functional.error,
      marginTop: 4,
    },
    inputIcon: {
      marginRight: 10,
    },
    input: {
      flex: 1,
      fontSize: 15,
      color: theme.text.primary,
    },
    eyeButton: {
      padding: 4,
    },

    // Bouton
    loginButton: {
      height: 54,
      backgroundColor: theme.primary,
      borderRadius: 27,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 8,
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 10,
      elevation: 6,
    },
    loginButtonDisabled: {
      opacity: 0.6,
    },
    loginButtonText: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.text.onPrimary,
      letterSpacing: 0.3,
    },
    forgotButton: {
      alignItems: 'center',
      paddingVertical: 14,
    },
    forgotText: {
      fontSize: 14,
      color: theme.primary,
    },

    // Footer
    footer: {
      textAlign: 'center',
      fontSize: 10,
      color: theme.border,
      marginTop: 24,
    },
  });

export default LoginScreen;
