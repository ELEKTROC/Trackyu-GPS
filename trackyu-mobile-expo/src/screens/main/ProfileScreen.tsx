/**
 * TrackYu Mobile - Profile Screen
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  User,
  Lock,
  Briefcase,
  Bell,
  Palette,
  Globe,
  Zap,
  HelpCircle,
  Mail,
  FileText,
  FileSignature,
  Shield,
  LogOut,
  ChevronRight,
  BadgeCheck,
  X,
  Eye,
  EyeOff,
  Check,
} from 'lucide-react-native';
import Constants from 'expo-constants';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme';
import type { ThemePreset } from '../../theme/themes';
import storage from '../../utils/storage';
import { LegalModal } from '../../components/LegalModal';
import { AIChatModal } from '../../components/AIChatModal';
import { CGU_CONTENT, PRIVACY_CONTENT } from '../../constants/legalContent';
import { portalApi, type ClientProfile, type AlertPreferences } from '../../api/portal';
import usersApi from '../../api/users';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../api/client';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import { ROLE_LABELS } from '../../constants/roles';

type ThemeType = ReturnType<typeof import('../../theme').useTheme>['theme'];

// ── MenuItem ─────────────────────────────────────────────────────────────────

interface MenuItemProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  showArrow?: boolean;
  rightComponent?: React.ReactNode;
  theme: ThemeType;
  last?: boolean;
}

function MenuItem({ icon, title, subtitle, onPress, showArrow = true, rightComponent, theme, last }: MenuItemProps) {
  return (
    <TouchableOpacity
      style={[
        menuStyles.item,
        { borderBottomWidth: last ? 0 : 1, borderBottomColor: theme.border, backgroundColor: theme.bg.surface },
      ]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[menuStyles.iconWrap, { backgroundColor: theme.primaryDim }]}>{icon}</View>
      <View style={menuStyles.content}>
        <Text style={{ fontSize: 15, color: theme.text.primary }}>{title}</Text>
        {subtitle ? <Text style={{ fontSize: 12, color: theme.text.muted, marginTop: 2 }}>{subtitle}</Text> : null}
      </View>
      {rightComponent}
      {showArrow && !rightComponent ? <ChevronRight size={16} color={theme.text.muted} /> : null}
    </TouchableOpacity>
  );
}

const menuStyles = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 16 },
  iconWrap: { width: 34, height: 34, borderRadius: 9, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  content: { flex: 1 },
});

// ── SectionBlock ──────────────────────────────────────────────────────────────

function SectionBlock({ title, children, theme }: { title: string; children: React.ReactNode; theme: ThemeType }) {
  return (
    <View style={{ marginTop: 24 }}>
      <Text
        style={{
          fontSize: 11,
          fontWeight: '700',
          color: theme.text.muted,
          textTransform: 'uppercase',
          letterSpacing: 1,
          paddingHorizontal: 16,
          marginBottom: 8,
        }}
      >
        {title}
      </Text>
      <View style={{ borderTopWidth: 1, borderBottomWidth: 1, borderColor: theme.border }}>{children}</View>
    </View>
  );
}

// ── ModalShell ────────────────────────────────────────────────────────────────

function ModalShell({
  visible,
  title,
  onClose,
  theme,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  theme: ThemeType;
  children: React.ReactNode;
}) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg.primary }} edges={['top']}>
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 16,
              paddingTop: 12,
              paddingBottom: 16,
              borderBottomWidth: 1,
              borderBottomColor: theme.border,
              backgroundColor: theme.bg.surface,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: '700', color: theme.text.primary }}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
              <X size={22} color={theme.text.muted} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }} showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Field ──────────────────────────────────────────────────────────────────────

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  editable = true,
  secureTextEntry,
  theme,
  rightIcon,
}: {
  label: string;
  value: string;
  onChangeText?: (v: string) => void;
  placeholder?: string;
  editable?: boolean;
  secureTextEntry?: boolean;
  theme: ThemeType;
  rightIcon?: React.ReactNode;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text
        style={{
          fontSize: 12,
          fontWeight: '600',
          color: theme.text.secondary,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        }}
      >
        {label}
      </Text>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: editable ? theme.bg.surface : theme.bg.elevated,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: editable ? theme.border : theme.bg.elevated,
          paddingHorizontal: 14,
          height: 48,
        }}
      >
        <TextInput
          style={{ flex: 1, fontSize: 15, color: editable ? theme.text.primary : theme.text.muted }}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.text.muted}
          editable={editable}
          secureTextEntry={secureTextEntry}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {rightIcon}
      </View>
    </View>
  );
}

// ── Modals ────────────────────────────────────────────────────────────────────

// ── Section header dans le modal ─────────────────────────────────────────────

function ModalSection({ title, theme }: { title: string; theme: ThemeType }) {
  return (
    <Text
      style={{
        fontSize: 11,
        fontWeight: '700',
        color: theme.text.muted,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginTop: 8,
        marginBottom: 2,
      }}
    >
      {title}
    </Text>
  );
}

// ── Affichage lecture seule ────────────────────────────────────────────────────

function ReadonlyField({ label, value, theme }: { label: string; value?: string; theme: ThemeType }) {
  if (!value) return null;
  return (
    <View style={{ gap: 4 }}>
      <Text
        style={{
          fontSize: 11,
          fontWeight: '600',
          color: theme.text.secondary,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        }}
      >
        {label}
      </Text>
      <View
        style={{
          backgroundColor: theme.bg.elevated,
          borderRadius: 10,
          paddingHorizontal: 14,
          paddingVertical: 12,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <Text style={{ flex: 1, fontSize: 14, color: theme.text.secondary }}>{value}</Text>
        <Lock size={12} color={theme.text.muted} />
      </View>
    </View>
  );
}

// ── EditProfileModal enrichi ──────────────────────────────────────────────────

function EditProfileModal({ visible, onClose, theme }: { visible: boolean; onClose: () => void; theme: ThemeType }) {
  const { user, updateUser } = useAuthStore();

  // Champs éditables — utilisateur auth
  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');

  // Champs éditables — profil client
  const [phone2, setPhone2] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [cni, setCni] = useState('');
  const [rc, setRc] = useState('');
  const [cc, setCc] = useState('');

  const [saving, setSaving] = useState(false);

  // Données client enrichies (lecture seule)
  const { data: clientProfile, isLoading: loadingProfile } = useQuery<ClientProfile>({
    queryKey: ['client-profile'],
    queryFn: () => portalApi.getClientProfile(),
    enabled: visible,
    staleTime: 5 * 60_000,
    retry: false,
  });

  // Pré-remplir les champs à l'ouverture
  useEffect(() => {
    if (visible) {
      setName(user?.name ?? '');
      setPhone(user?.phone ?? '');
      if (clientProfile) {
        setPhone2(clientProfile.phone2 ?? '');
        setAddress(clientProfile.address ?? '');
        setCity(clientProfile.city ?? '');
        setCountry(clientProfile.country ?? '');
        setCni(clientProfile.cni ?? '');
        setRc(clientProfile.rc ?? '');
        setCc(clientProfile.cc ?? '');
      }
    }
  }, [visible, user, clientProfile]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Erreur', 'Le nom est requis.');
      return;
    }
    setSaving(true);
    try {
      // 1. Mise à jour profil utilisateur auth
      const updated = await usersApi.updateProfile(user!.id, {
        name: name.trim(),
        phone: phone.trim() || undefined,
      });
      await updateUser({ name: updated.name, phone: updated.phone });

      // 2. Mise à jour données client (best-effort si endpoint disponible)
      try {
        await portalApi.updateClientProfile({
          phone2: phone2.trim() || undefined,
          address: address.trim() || undefined,
          city: city.trim() || undefined,
          country: country.trim() || undefined,
          cni: cni.trim() || undefined,
          rc: rc.trim() || undefined,
          cc: cc.trim() || undefined,
        });
      } catch {
        // Non bloquant — l'endpoint backend sera disponible prochainement
      }

      onClose();
    } catch {
      Alert.alert('Erreur', 'Impossible de mettre à jour le profil. Réessayez.');
    } finally {
      setSaving(false);
    }
  };

  const isB2B = clientProfile?.type === 'B2B';
  const isStaff = user?.role !== 'CLIENT';

  return (
    <ModalShell visible={visible} title="Mon profil" onClose={onClose} theme={theme}>
      {/* ── Informations personnelles ── */}
      <ModalSection title="Informations personnelles" theme={theme} />
      <Field label="Nom complet" value={name} onChangeText={setName} placeholder="Votre nom" theme={theme} />
      <Field
        label="Email"
        value={user?.email ?? ''}
        editable={false}
        theme={theme}
        rightIcon={<Lock size={14} color={theme.text.muted} />}
      />
      <Field
        label="Téléphone principal"
        value={phone}
        onChangeText={setPhone}
        placeholder="+225 07 00 00 00 00"
        theme={theme}
      />
      <Field
        label="Contact secondaire"
        value={phone2}
        onChangeText={setPhone2}
        placeholder="+225 01 00 00 00 00"
        theme={theme}
      />

      {/* ── Adresse ── */}
      <ModalSection title="Adresse" theme={theme} />
      <Field label="Adresse" value={address} onChangeText={setAddress} placeholder="Rue, BP…" theme={theme} />
      <Field label="Ville" value={city} onChangeText={setCity} placeholder="Abidjan" theme={theme} />
      <Field label="Pays" value={country} onChangeText={setCountry} placeholder="Côte d'Ivoire" theme={theme} />

      {/* ── Compte client (lecture seule) ── */}
      <ModalSection title="Compte client" theme={theme} />
      {loadingProfile ? (
        <ActivityIndicator color={theme.primary} size="small" style={{ marginVertical: 8 }} />
      ) : clientProfile ? (
        <>
          <ReadonlyField label="N° compte" value={clientProfile.code} theme={theme} />
          <ReadonlyField label="Type de client" value={clientProfile.type} theme={theme} />
          <ReadonlyField label="Plan d'abonnement" value={clientProfile.subscriptionPlan} theme={theme} />
          <ReadonlyField label="Revendeur" value={clientProfile.resellerName} theme={theme} />
          <ReadonlyField label="Segment" value={clientProfile.segment} theme={theme} />
          <ReadonlyField label="Secteur d'activité" value={clientProfile.sector} theme={theme} />
          <ReadonlyField label="Conditions de paiement" value={clientProfile.paymentTerms} theme={theme} />
          <ReadonlyField label="Langue" value={clientProfile.language} theme={theme} />
        </>
      ) : (
        <Text style={{ fontSize: 12, color: theme.text.muted, fontStyle: 'italic' }}>
          Données compte non disponibles
        </Text>
      )}

      {/* ── Identité légale ── */}
      <ModalSection title="Identité légale" theme={theme} />
      {!isB2B && <Field label="N° CNI" value={cni} onChangeText={setCni} placeholder="CI-0000-00000" theme={theme} />}
      {isB2B && (
        <>
          <Field label="RCCM" value={rc} onChangeText={setRc} placeholder="RCC-ABJ-2020-B-0000" theme={theme} />
          <Field
            label="N° Compte contribuable (CC)"
            value={cc}
            onChangeText={setCc}
            placeholder="0000000A"
            theme={theme}
          />
        </>
      )}

      {/* ── Personnes à contacter ── */}
      {clientProfile?.contacts && clientProfile.contacts.length > 0 && (
        <>
          <ModalSection title="Personnes à contacter" theme={theme} />
          {clientProfile.contacts.map((c) => (
            <View
              key={c.id}
              style={{
                backgroundColor: theme.bg.elevated,
                borderRadius: 10,
                padding: 12,
                gap: 2,
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text.primary }}>{c.name}</Text>
              {c.role ? <Text style={{ fontSize: 12, color: theme.primary }}>{c.role}</Text> : null}
              {c.phone ? <Text style={{ fontSize: 12, color: theme.text.muted }}>{c.phone}</Text> : null}
              {c.email ? <Text style={{ fontSize: 12, color: theme.text.muted }}>{c.email}</Text> : null}
            </View>
          ))}
        </>
      )}

      {/* ── Informations professionnelles (staff uniquement, lecture seule) ── */}
      {isStaff && (
        <>
          <ModalSection title="Informations professionnelles" theme={theme} />
          <ReadonlyField label="Matricule" value={user?.matricule || '—'} theme={theme} />
          <ReadonlyField label="Département" value={user?.departement || '—'} theme={theme} />
          <ReadonlyField label="Poste" value={user?.poste || '—'} theme={theme} />
          <ReadonlyField label="Type de contrat" value={user?.typeContrat || '—'} theme={theme} />
          <ReadonlyField
            label="Date d'embauche"
            value={
              user?.dateEmbauche
                ? (() => {
                    try {
                      return new Date(user.dateEmbauche!).toLocaleDateString('fr-FR');
                    } catch {
                      return user.dateEmbauche!;
                    }
                  })()
                : '—'
            }
            theme={theme}
          />
        </>
      )}

      {/* ── Bouton enregistrer ── */}
      <TouchableOpacity
        style={{
          backgroundColor: saving ? theme.primaryDim : theme.primary,
          borderRadius: 12,
          height: 50,
          justifyContent: 'center',
          alignItems: 'center',
          marginTop: 12,
        }}
        onPress={handleSave}
        disabled={saving}
        activeOpacity={0.8}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>Enregistrer</Text>
        )}
      </TouchableOpacity>
    </ModalShell>
  );
}

function ChangePasswordModal({ visible, onClose, theme }: { visible: boolean; onClose: () => void; theme: ThemeType }) {
  const { user } = useAuthStore();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setCurrent('');
      setNext('');
      setConfirm('');
    }
  }, [visible]);

  const validate = () => {
    if (!current) return 'Saisissez votre mot de passe actuel.';
    if (next.length < 8) return 'Le nouveau mot de passe doit contenir au moins 8 caractères.';
    if (!/[A-Z]/.test(next)) return 'Le mot de passe doit contenir au moins une majuscule.';
    if (!/[0-9]/.test(next)) return 'Le mot de passe doit contenir au moins un chiffre.';
    if (next !== confirm) return 'Les mots de passe ne correspondent pas.';
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) {
      Alert.alert('Erreur', err);
      return;
    }
    setSaving(true);
    try {
      await usersApi.changePassword(user!.id, { currentPassword: current, newPassword: next });
      Alert.alert('Succès', 'Mot de passe modifié avec succès.', [{ text: 'OK', onPress: onClose }]);
    } catch {
      Alert.alert('Erreur', 'Mot de passe actuel incorrect ou erreur serveur.');
    } finally {
      setSaving(false);
    }
  };

  const eyeBtn = (show: boolean, toggle: () => void) => (
    <TouchableOpacity onPress={toggle} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
      {show ? <EyeOff size={16} color={theme.text.muted} /> : <Eye size={16} color={theme.text.muted} />}
    </TouchableOpacity>
  );

  return (
    <ModalShell visible={visible} title="Changer le mot de passe" onClose={onClose} theme={theme}>
      <Field
        label="Mot de passe actuel"
        value={current}
        onChangeText={setCurrent}
        secureTextEntry={!showCurrent}
        theme={theme}
        rightIcon={eyeBtn(showCurrent, () => setShowCurrent((v) => !v))}
      />
      <Field
        label="Nouveau mot de passe"
        value={next}
        onChangeText={setNext}
        secureTextEntry={!showNext}
        theme={theme}
        rightIcon={eyeBtn(showNext, () => setShowNext((v) => !v))}
      />
      <Field
        label="Confirmer le mot de passe"
        value={confirm}
        onChangeText={setConfirm}
        secureTextEntry={!showNext}
        theme={theme}
      />
      <View
        style={{
          backgroundColor: theme.bg.surface,
          borderRadius: 10,
          padding: 12,
          borderLeftWidth: 3,
          borderLeftColor: theme.primary,
        }}
      >
        <Text style={{ fontSize: 12, color: theme.text.muted, lineHeight: 18 }}>
          {'Minimum 8 caractères, 1 majuscule, 1 chiffre.'}
        </Text>
      </View>
      <TouchableOpacity
        style={{
          backgroundColor: saving ? theme.primaryDim : theme.primary,
          borderRadius: 12,
          height: 50,
          justifyContent: 'center',
          alignItems: 'center',
          marginTop: 8,
        }}
        onPress={handleSave}
        disabled={saving}
        activeOpacity={0.8}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>Enregistrer</Text>
        )}
      </TouchableOpacity>
    </ModalShell>
  );
}

const LANGUAGES = [
  { code: 'fr', label: 'Français' },
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
] as const;

type LangCode = (typeof LANGUAGES)[number]['code'];

const THEME_OPTIONS: { id: ThemePreset; label: string; dot: string; bg: string }[] = [
  { id: 'dark', label: 'Dark', dot: '#E8771A', bg: '#1A1A1E' },
  { id: 'ocean', label: 'Ocean', dot: '#3B82F6', bg: '#0F1B2D' },
  { id: 'light', label: 'Light', dot: '#E8771A', bg: '#FFFFFF' },
];

function ThemeModal({
  visible,
  onClose,
  current,
  onSelect,
  theme,
}: {
  visible: boolean;
  onClose: () => void;
  current: ThemePreset;
  onSelect: (t: ThemePreset) => void;
  theme: ThemeType;
}) {
  return (
    <ModalShell visible={visible} title="Thème" onClose={onClose} theme={theme}>
      {THEME_OPTIONS.map((t) => {
        const selected = current === t.id;
        return (
          <TouchableOpacity
            key={t.id}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: theme.bg.surface,
              borderRadius: 12,
              padding: 14,
              borderWidth: 2,
              borderColor: selected ? theme.primary : theme.border,
            }}
            onPress={() => {
              onSelect(t.id);
              onClose();
            }}
            activeOpacity={0.75}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: t.bg,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: t.dot }} />
              </View>
              <Text style={{ fontSize: 15, fontWeight: selected ? '700' : '400', color: theme.text.primary }}>
                {t.label}
              </Text>
            </View>
            {selected && <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: theme.primary }} />}
          </TouchableOpacity>
        );
      })}
    </ModalShell>
  );
}

// ── LanguageModal ──────────────────────────────────────────────────────────────

function LanguageModal({
  visible,
  onClose,
  current,
  onSelect,
  theme,
}: {
  visible: boolean;
  onClose: () => void;
  current: LangCode;
  onSelect: (c: LangCode) => void;
  theme: ThemeType;
}) {
  return (
    <ModalShell visible={visible} title="Langue" onClose={onClose} theme={theme}>
      {LANGUAGES.map((lang) => (
        <TouchableOpacity
          key={lang.code}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: theme.bg.surface,
            borderRadius: 12,
            padding: 16,
            borderWidth: 2,
            borderColor: current === lang.code ? theme.primary : theme.border,
          }}
          onPress={() => {
            onSelect(lang.code);
            onClose();
          }}
          activeOpacity={0.75}
        >
          <Text style={{ fontSize: 16, color: theme.text.primary, fontWeight: current === lang.code ? '700' : '400' }}>
            {lang.label}
          </Text>
          {current === lang.code && (
            <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: theme.primary }} />
          )}
        </TouchableOpacity>
      ))}
    </ModalShell>
  );
}

// ── AlertConfigModal ──────────────────────────────────────────────────────────

interface NotifChannelPrefs {
  pushEnabled: boolean;
  emailAlerts: boolean;
  smsAlerts: boolean;
}

function AlertConfigModal({ visible, onClose, theme }: { visible: boolean; onClose: () => void; theme: ThemeType }) {
  const qc = useQueryClient();

  // Seuils d'alertes (schedule_rules)
  const { data: prefs, isLoading: loadingPrefs } = useQuery({
    queryKey: ['alert-preferences'],
    queryFn: portalApi.getAlertPreferences,
    enabled: visible,
    staleTime: 60_000,
  });

  // Canaux de notification (notifications/preferences)
  const { data: notifPrefs, isLoading: loadingNotif } = useQuery({
    queryKey: ['notif-preferences'],
    queryFn: () => apiClient.get('/notifications/preferences').then((r) => r.data),
    enabled: visible,
    staleTime: 60_000,
  });

  const [local, setLocal] = React.useState<AlertPreferences>({
    speed: { enabled: false, threshold: 90 },
    fuel: { enabled: false, threshold: 20 },
    offline: { enabled: false, threshold: 30 },
  });

  const [channels, setChannels] = React.useState<NotifChannelPrefs>({
    pushEnabled: true,
    emailAlerts: false,
    smsAlerts: false,
  });

  React.useEffect(() => {
    if (prefs) setLocal(prefs);
  }, [prefs]);
  React.useEffect(() => {
    if (notifPrefs) {
      setChannels({
        pushEnabled: notifPrefs.pushEnabled !== false,
        emailAlerts: notifPrefs.emailAlerts === true,
        smsAlerts: notifPrefs.smsAlerts === true,
      });
    }
  }, [notifPrefs]);

  const mutation = useMutation({
    mutationFn: async () => {
      await Promise.all([
        portalApi.updateAlertPreferences(local),
        apiClient.put('/notifications/preferences', channels),
      ]);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alert-preferences'] });
      qc.invalidateQueries({ queryKey: ['notif-preferences'] });
      onClose();
    },
    onError: () => Alert.alert('Erreur', 'Impossible de sauvegarder. Réessayez.'),
  });

  const updateField = (key: keyof AlertPreferences, field: 'enabled' | 'threshold', value: boolean | string) => {
    setLocal((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: field === 'threshold' ? parseInt(String(value), 10) || prev[key].threshold : value,
      },
    }));
  };

  const rows: { key: keyof AlertPreferences; label: string; unit: string; min: number; max: number; step: number }[] = [
    { key: 'speed', label: 'Excès de vitesse', unit: 'km/h', min: 30, max: 200, step: 10 },
    { key: 'fuel', label: 'Niveau carburant', unit: '%', min: 5, max: 50, step: 5 },
    { key: 'offline', label: 'Hors ligne', unit: 'min', min: 5, max: 120, step: 5 },
  ];

  const channelRows: { key: keyof NotifChannelPrefs; label: string; subtitle: string }[] = [
    { key: 'pushEnabled', label: 'Notification push', subtitle: 'Alerte immédiate sur votre téléphone' },
    { key: 'emailAlerts', label: 'Email', subtitle: 'Envoi à votre adresse email' },
    { key: 'smsAlerts', label: 'SMS', subtitle: 'Message texte sur votre téléphone' },
  ];

  const isLoading = loadingPrefs || loadingNotif;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={{ flex: 1, backgroundColor: '#00000066', justifyContent: 'flex-end' }}>
          <View
            style={{
              backgroundColor: theme.bg.surface,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              paddingBottom: Platform.OS === 'ios' ? 40 : 24,
              maxHeight: '90%',
            }}
          >
            {/* Header */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 20,
                paddingBottom: 12,
              }}
            >
              <Text style={{ fontSize: 17, fontWeight: '700', color: theme.text.primary }}>Configuration alertes</Text>
              <TouchableOpacity onPress={onClose}>
                <X size={20} color={theme.text.muted} />
              </TouchableOpacity>
            </View>

            {isLoading ? (
              <ActivityIndicator color={theme.primary} style={{ paddingVertical: 32 }} />
            ) : (
              <ScrollView style={{ paddingHorizontal: 20 }} showsVerticalScrollIndicator={false}>
                {/* Section seuils */}
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '700',
                    color: theme.text.muted,
                    textTransform: 'uppercase',
                    letterSpacing: 0.8,
                    marginBottom: 8,
                  }}
                >
                  Seuils de déclenchement
                </Text>
                {rows.map((row) => (
                  <View
                    key={row.key}
                    style={{ gap: 8, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.border }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text.primary }}>{row.label}</Text>
                      <Switch
                        value={local[row.key].enabled}
                        onValueChange={(v) => updateField(row.key, 'enabled', v)}
                        thumbColor={local[row.key].enabled ? theme.primary : '#f4f3f4'}
                        trackColor={{ false: theme.border, true: theme.primaryDim }}
                      />
                    </View>
                    {local[row.key].enabled && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <Text style={{ fontSize: 12, color: theme.text.muted, flex: 1 }}>Seuil d'alerte</Text>
                        <TouchableOpacity
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            backgroundColor: theme.bg.elevated,
                            borderWidth: 1,
                            borderColor: theme.border,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          onPress={() =>
                            updateField(
                              row.key,
                              'threshold',
                              String(Math.max(row.min, local[row.key].threshold - row.step))
                            )
                          }
                        >
                          <Text style={{ fontSize: 18, color: theme.text.primary, lineHeight: 22 }}>−</Text>
                        </TouchableOpacity>
                        <View style={{ minWidth: 70, alignItems: 'center' }}>
                          <Text style={{ fontSize: 16, fontWeight: '700', color: theme.primary }}>
                            {local[row.key].threshold} {row.unit}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            backgroundColor: theme.bg.elevated,
                            borderWidth: 1,
                            borderColor: theme.border,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          onPress={() =>
                            updateField(
                              row.key,
                              'threshold',
                              String(Math.min(row.max, local[row.key].threshold + row.step))
                            )
                          }
                        >
                          <Text style={{ fontSize: 18, color: theme.text.primary, lineHeight: 22 }}>+</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ))}

                {/* Section canaux */}
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '700',
                    color: theme.text.muted,
                    textTransform: 'uppercase',
                    letterSpacing: 0.8,
                    marginTop: 20,
                    marginBottom: 8,
                  }}
                >
                  Canaux de notification
                </Text>
                {channelRows.map((ch, idx) => (
                  <View
                    key={ch.key}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 10,
                      borderBottomWidth: idx < channelRows.length - 1 ? 1 : 0,
                      borderBottomColor: theme.border,
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text.primary }}>{ch.label}</Text>
                      <Text style={{ fontSize: 12, color: theme.text.muted, marginTop: 1 }}>{ch.subtitle}</Text>
                    </View>
                    <Switch
                      value={channels[ch.key]}
                      onValueChange={(v) => setChannels((prev) => ({ ...prev, [ch.key]: v }))}
                      thumbColor={channels[ch.key] ? theme.primary : '#f4f3f4'}
                      trackColor={{ false: theme.border, true: theme.primaryDim }}
                    />
                  </View>
                ))}

                {/* Bouton sauvegarder */}
                <TouchableOpacity
                  style={{
                    backgroundColor: theme.primary,
                    borderRadius: 12,
                    paddingVertical: 14,
                    alignItems: 'center',
                    opacity: mutation.isPending ? 0.6 : 1,
                    marginTop: 20,
                    marginBottom: 8,
                  }}
                  onPress={() => mutation.mutate()}
                  disabled={mutation.isPending}
                >
                  {mutation.isPending ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Enregistrer</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function ProfileScreen() {
  const { theme, setTheme, preset } = useTheme();
  const { user, logout } = useAuthStore();
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [language, setLanguage] = useState<LangCode>('fr');

  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showLanguage, setShowLanguage] = useState(false);
  const [showTheme, setShowTheme] = useState(false);
  const [showAlertConfig, setShowAlertConfig] = useState(false);
  const [showCGU, setShowCGU] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);

  const s = styles(theme);

  useEffect(() => {
    // Charger langue depuis storage local
    storage.getString('pref_language').then((lang) => {
      if (lang === 'fr' || lang === 'en' || lang === 'es') setLanguage(lang);
    });
    // Charger préférence notifications depuis le backend (source de vérité)
    apiClient
      .get('/notifications/preferences')
      .then(({ data }) => {
        const enabled = data?.pushEnabled !== false;
        setNotificationsEnabled(enabled);
        storage.set('pref_notifications', enabled);
      })
      .catch(() => {
        // Fallback sur valeur locale
        storage.getString('pref_notifications').then((v) => {
          if (v !== null) setNotificationsEnabled(v === 'true');
        });
      });
  }, []);

  const handleNotificationsChange = async (value: boolean) => {
    setNotificationsEnabled(value);
    await storage.set('pref_notifications', value);
    // Sync avec le backend pour que ruleEvaluationService respecte la préférence
    try {
      await apiClient.put('/notifications/preferences', { pushEnabled: value });
    } catch {
      // Silencieux — la valeur locale reste cohérente
    }
  };

  const handleLanguageSelect = async (code: LangCode) => {
    setLanguage(code);
    await storage.set('pref_language', code);
  };

  const handleLogout = () => {
    Alert.alert('Déconnexion', 'Êtes-vous sûr de vouloir vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Déconnexion', style: 'destructive', onPress: logout },
    ]);
  };

  const getInitials = () => {
    if (!user?.name) return '?';
    return user.name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const isClient = user?.role === 'CLIENT';
  const isTech = user?.role === 'TECH';

  const getRoleDisplay = () => ROLE_LABELS[user?.role ?? ''] ?? user?.role ?? 'Utilisateur';

  const langLabel = LANGUAGES.find((l) => l.code === language)?.label ?? 'Français';
  const iconProps = { size: 16, color: theme.primary };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ── Header ── */}
        <View style={s.profileHeader}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{getInitials()}</Text>
          </View>
          <Text style={s.userName}>{user?.name || 'Utilisateur'}</Text>
          <Text style={s.userEmail}>{user?.email}</Text>
          {user?.phone ? <Text style={[s.userEmail, { marginTop: 1 }]}>{user.phone}</Text> : null}
          <View style={[s.roleBadge, { backgroundColor: theme.primaryDim }]}>
            <Text style={[s.roleBadgeText, { color: theme.primary }]}>{getRoleDisplay()}</Text>
          </View>
        </View>

        {/* ── Compte ── */}
        <SectionBlock title="Compte" theme={theme}>
          <MenuItem
            theme={theme}
            icon={<User {...iconProps} />}
            title="Modifier le profil"
            subtitle="Nom, téléphone"
            onPress={() => setShowEditProfile(true)}
          />
          <MenuItem
            theme={theme}
            icon={<Lock {...iconProps} />}
            title="Changer le mot de passe"
            onPress={() => setShowChangePassword(true)}
            last={!isClient}
          />
          {isClient && (
            <MenuItem
              theme={theme}
              icon={<FileSignature {...iconProps} />}
              title="Mon contrat"
              subtitle="Voir et télécharger le document"
              onPress={() => nav.navigate('PortalContractDocument')}
              last
            />
          )}
        </SectionBlock>

        {/* ── Mon Espace (CLIENT uniquement) ── */}
        {isClient && (
          <SectionBlock title="Mon Espace Client" theme={theme}>
            <MenuItem
              theme={theme}
              icon={<Briefcase {...iconProps} />}
              title="Mon espace"
              subtitle="Factures, abonnements, tickets"
              onPress={() => nav.navigate('Portal')}
            />
          </SectionBlock>
        )}

        {/* ── Support — après Mon Espace Client ── */}
        <SectionBlock title="Support" theme={theme}>
          <MenuItem
            theme={theme}
            icon={<HelpCircle {...iconProps} />}
            title="Aide & FAQ"
            subtitle="Questions fréquentes"
            onPress={() => nav.navigate('Help', { mode: 'faq' })}
          />
          <MenuItem
            theme={theme}
            icon={<Mail {...iconProps} />}
            title="Contacter le support"
            subtitle="WhatsApp, appel, email, ticket"
            onPress={() => nav.navigate('Help', { mode: 'contact' })}
          />
          <MenuItem
            theme={theme}
            icon={<FileText {...iconProps} />}
            title="Conditions d'utilisation"
            onPress={() => setShowCGU(true)}
          />
          <MenuItem
            theme={theme}
            icon={<Shield {...iconProps} />}
            title="Politique de confidentialité"
            onPress={() => setShowPrivacy(true)}
            last
          />
        </SectionBlock>

        {/* ── Préférences ── */}
        <SectionBlock title="Préférences" theme={theme}>
          <MenuItem
            theme={theme}
            icon={<Bell {...iconProps} />}
            title="Notifications"
            showArrow={false}
            rightComponent={
              <Switch
                value={notificationsEnabled}
                onValueChange={handleNotificationsChange}
                trackColor={{ false: theme.border, true: theme.primary }}
                thumbColor="#fff"
              />
            }
          />
          <MenuItem
            theme={theme}
            icon={<Palette {...iconProps} />}
            title="Thème"
            subtitle={THEME_OPTIONS.find((t) => t.id === preset)?.label ?? preset}
            onPress={() => setShowTheme(true)}
          />
          <MenuItem
            theme={theme}
            icon={<Globe {...iconProps} />}
            title="Langue"
            subtitle={langLabel}
            onPress={() => setShowLanguage(true)}
            last
          />
        </SectionBlock>

        {/* ── Alertes ── (masqué pour TECH) */}
        {!isTech && (
          <SectionBlock title="Configuration alertes" theme={theme}>
            <MenuItem
              theme={theme}
              icon={<Zap {...iconProps} />}
              title="Alertes rapides"
              subtitle="Vitesse, carburant, hors ligne, canaux"
              onPress={() => setShowAlertConfig(true)}
              last
            />
          </SectionBlock>
        )}

        {/* ── Assistant IA ── */}
        <SectionBlock title="Assistant" theme={theme}>
          <MenuItem
            theme={theme}
            icon={<HelpCircle {...iconProps} />}
            title="Assistant IA TrackYu"
            subtitle="Posez vos questions, réponse immédiate"
            onPress={() => setShowAIChat(true)}
            last
          />
        </SectionBlock>

        {/* ── App info ── */}
        <View style={s.appInfo}>
          <Text style={s.appVersion}>TrackYu Mobile v{Constants.expoConfig?.version ?? '1.0.0'}</Text>
          <Text style={s.appCopyright}>© 2026 TrackYu</Text>
        </View>

        {/* ── Déconnexion ── */}
        <TouchableOpacity
          style={s.logoutBtn}
          onPress={handleLogout}
          activeOpacity={0.8}
          testID="btn-logout"
          accessibilityLabel="Se déconnecter"
          accessibilityRole="button"
        >
          <LogOut size={18} color="#fff" />
          <Text style={s.logoutText}>Déconnexion</Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── Modals ── */}
      <EditProfileModal visible={showEditProfile} onClose={() => setShowEditProfile(false)} theme={theme} />
      <ChangePasswordModal visible={showChangePassword} onClose={() => setShowChangePassword(false)} theme={theme} />
      <ThemeModal
        visible={showTheme}
        onClose={() => setShowTheme(false)}
        current={preset}
        onSelect={setTheme}
        theme={theme}
      />
      <LanguageModal
        visible={showLanguage}
        onClose={() => setShowLanguage(false)}
        current={language}
        onSelect={handleLanguageSelect}
        theme={theme}
      />
      <AlertConfigModal visible={showAlertConfig} onClose={() => setShowAlertConfig(false)} theme={theme} />
      <LegalModal
        visible={showCGU}
        title="Conditions d'utilisation"
        content={CGU_CONTENT}
        onClose={() => setShowCGU(false)}
      />
      <LegalModal
        visible={showPrivacy}
        title="Politique de confidentialité"
        content={PRIVACY_CONTENT}
        onClose={() => setShowPrivacy(false)}
      />
      <AIChatModal
        visible={showAIChat}
        onClose={() => setShowAIChat(false)}
        userName={user?.name ?? user?.email ?? 'vous'}
      />
    </SafeAreaView>
  );
}

const styles = (theme: ThemeType) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg.primary },
    profileHeader: {
      alignItems: 'center',
      paddingVertical: 28,
      backgroundColor: theme.bg.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    avatar: {
      width: 80,
      height: 80,
      borderRadius: 24,
      backgroundColor: theme.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 12,
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.35,
      shadowRadius: 12,
      elevation: 6,
    },
    avatarText: { fontSize: 26, fontWeight: '700', color: '#fff' },
    userName: { fontSize: 20, fontWeight: '700', color: theme.text.primary },
    userEmail: { fontSize: 13, color: theme.text.muted, marginTop: 3 },
    roleBadge: { marginTop: 10, paddingHorizontal: 14, paddingVertical: 5, borderRadius: 12 },
    roleBadgeText: { fontSize: 12, fontWeight: '600' },
    appInfo: { alignItems: 'center', paddingVertical: 24 },
    appVersion: { fontSize: 13, color: theme.text.secondary },
    appCopyright: { fontSize: 12, color: theme.text.muted, marginTop: 3 },
    logoutBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginHorizontal: 16,
      paddingVertical: 14,
      backgroundColor: theme.functional.error,
      borderRadius: 14,
    },
    logoutText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  });

export default ProfileScreen;
