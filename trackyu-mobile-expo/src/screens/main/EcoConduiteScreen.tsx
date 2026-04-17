/**
 * TrackYu Mobile — Éco-conduite
 * CRUD complet sur /eco-driving-profiles
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Plus, Leaf, Trash2, Edit2, X } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ecoDrivingApi, { type EcoDrivingProfile, type Sensitivity } from '../../api/ecoDrivingApi';
import { useTheme } from '../../theme';

type ThemeType = ReturnType<typeof import('../../theme').useTheme>['theme'];

const SENSITIVITIES: { value: Sensitivity; label: string }[] = [
  { value: 'LOW', label: 'Faible' },
  { value: 'MEDIUM', label: 'Moyen' },
  { value: 'HIGH', label: 'Élevé' },
];

interface FormState {
  name: string;
  targetScore: string;
  maxSpeedLimit: string;
  maxSpeedPenalty: string;
  harshAccelerationSensitivity: Sensitivity;
  harshAccelerationPenalty: string;
  harshBrakingSensitivity: Sensitivity;
  harshBrakingPenalty: string;
  harshCorneringSensitivity: Sensitivity;
  harshCorneringPenalty: string;
  maxIdlingDuration: string;
  idlingPenalty: string;
  allVehicles: boolean;
  status: 'ACTIVE' | 'INACTIVE';
}

const DEFAULT_FORM: FormState = {
  name: '',
  targetScore: '100',
  maxSpeedLimit: '',
  maxSpeedPenalty: '',
  harshAccelerationSensitivity: 'MEDIUM',
  harshAccelerationPenalty: '',
  harshBrakingSensitivity: 'MEDIUM',
  harshBrakingPenalty: '',
  harshCorneringSensitivity: 'MEDIUM',
  harshCorneringPenalty: '',
  maxIdlingDuration: '',
  idlingPenalty: '',
  allVehicles: false,
  status: 'ACTIVE',
};

/* ── SensitivityPicker ────────────────────────────────────────────── */
function SensitivityPicker({
  value,
  onChange,
  theme,
}: {
  value: Sensitivity;
  onChange: (v: Sensitivity) => void;
  theme: ThemeType;
}) {
  return (
    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
      {SENSITIVITIES.map((s) => {
        const on = value === s.value;
        const color = s.value === 'LOW' ? '#22C55E' : s.value === 'MEDIUM' ? '#F59E0B' : '#EF4444';
        return (
          <TouchableOpacity
            key={s.value}
            onPress={() => onChange(s.value)}
            style={{
              flex: 1,
              paddingVertical: 8,
              borderRadius: 10,
              backgroundColor: on ? color + '22' : theme.bg.elevated,
              borderWidth: 1,
              borderColor: on ? color : theme.border,
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '700', color: on ? color : theme.text.muted }}>{s.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/* ── StatusPicker ─────────────────────────────────────────────────── */
function StatusPicker({
  value,
  onChange,
  theme,
}: {
  value: 'ACTIVE' | 'INACTIVE';
  onChange: (v: 'ACTIVE' | 'INACTIVE') => void;
  theme: ThemeType;
}) {
  return (
    <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
      {(
        [
          ['ACTIVE', 'Actif'],
          ['INACTIVE', 'Inactif'],
        ] as const
      ).map(([val, label]) => {
        const on = value === val;
        return (
          <TouchableOpacity
            key={val}
            onPress={() => onChange(val)}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 10,
              backgroundColor: on ? theme.primary : theme.bg.elevated,
              borderWidth: 1,
              borderColor: on ? theme.primary : theme.border,
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: '700', color: on ? '#fff' : theme.text.muted }}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/* ── Section header ───────────────────────────────────────────────── */
function SectionTitle({ label, theme }: { label: string; theme: ThemeType }) {
  return (
    <Text
      style={{
        fontSize: 11,
        fontWeight: '700',
        color: theme.text.muted,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginTop: 6,
        marginBottom: 10,
      }}
    >
      {label}
    </Text>
  );
}

/* ── Penalty row: sensitivity + points input ──────────────────────── */
function PenaltySection({
  title,
  sensitivity,
  onSensitivity,
  penalty,
  onPenalty,
  theme,
}: {
  title: string;
  sensitivity: Sensitivity;
  onSensitivity: (v: Sensitivity) => void;
  penalty: string;
  onPenalty: (v: string) => void;
  theme: ThemeType;
}) {
  return (
    <View
      style={{
        backgroundColor: theme.bg.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.border,
        padding: 12,
        marginBottom: 12,
      }}
    >
      <Text style={{ fontSize: 13, fontWeight: '600', color: theme.text.primary, marginBottom: 8 }}>{title}</Text>
      <Text style={{ fontSize: 11, color: theme.text.muted, marginBottom: 6 }}>Sensibilité</Text>
      <SensitivityPicker value={sensitivity} onChange={onSensitivity} theme={theme} />
      <Text style={{ fontSize: 11, color: theme.text.muted, marginBottom: 6 }}>Points de pénalité</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <TextInput
          style={[styles.input(theme), { flex: 1, marginBottom: 0 }]}
          value={penalty}
          onChangeText={onPenalty}
          placeholder="Ex : 5"
          placeholderTextColor={theme.text.muted}
          keyboardType="numeric"
        />
        <Text style={{ fontSize: 13, color: theme.text.secondary }}>pts</Text>
      </View>
    </View>
  );
}

/* ── ProfileCard ──────────────────────────────────────────────────── */
function ProfileCard({
  profile,
  onEdit,
  onDelete,
  theme,
}: {
  profile: EcoDrivingProfile;
  onEdit: () => void;
  onDelete: () => void;
  theme: ThemeType;
}) {
  const active = profile.status === 'ACTIVE';
  return (
    <View
      style={{
        backgroundColor: theme.bg.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: theme.border,
        marginBottom: 12,
        padding: 14,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: theme.text.primary }}>{profile.name}</Text>
        </View>
        <View
          style={{
            backgroundColor: active ? '#22C55E18' : '#6B728018',
            borderRadius: 8,
            paddingHorizontal: 10,
            paddingVertical: 3,
            marginLeft: 8,
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: '700', color: active ? '#22C55E' : '#6B7280' }}>
            {active ? 'Actif' : 'Inactif'}
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
        <View
          style={{ backgroundColor: theme.bg.elevated, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 }}
        >
          <Text style={{ fontSize: 12, color: theme.text.secondary }}>
            Score cible : <Text style={{ fontWeight: '700', color: theme.primary }}>{profile.targetScore}</Text>
          </Text>
        </View>
        {profile.maxSpeedLimit ? (
          <View
            style={{ backgroundColor: theme.bg.elevated, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 }}
          >
            <Text style={{ fontSize: 12, color: theme.text.secondary }}>
              Vitesse max : {profile.maxSpeedLimit} km/h
            </Text>
          </View>
        ) : null}
        {profile.maxIdlingDuration ? (
          <View
            style={{ backgroundColor: theme.bg.elevated, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 }}
          >
            <Text style={{ fontSize: 12, color: theme.text.secondary }}>
              Ralenti max : {profile.maxIdlingDuration} min
            </Text>
          </View>
        ) : null}
        {profile.allVehicles ? (
          <View
            style={{ backgroundColor: theme.bg.elevated, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 }}
          >
            <Text style={{ fontSize: 12, color: theme.text.secondary }}>Tous les véhicules</Text>
          </View>
        ) : profile.vehicleIds?.length ? (
          <View
            style={{ backgroundColor: theme.bg.elevated, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 }}
          >
            <Text style={{ fontSize: 12, color: theme.text.secondary }}>
              {profile.vehicleIds.length} véhicule{profile.vehicleIds.length > 1 ? 's' : ''}
            </Text>
          </View>
        ) : null}
      </View>

      <View
        style={{
          flexDirection: 'row',
          gap: 10,
          marginTop: 4,
          paddingTop: 10,
          borderTopWidth: 1,
          borderTopColor: theme.border,
        }}
      >
        <TouchableOpacity
          onPress={onEdit}
          style={{
            flex: 1,
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 6,
            backgroundColor: theme.bg.elevated,
            borderRadius: 8,
            paddingVertical: 8,
          }}
        >
          <Edit2 size={14} color={theme.primary} />
          <Text style={{ fontSize: 13, fontWeight: '600', color: theme.primary }}>Modifier</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onDelete}
          style={{
            flex: 1,
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 6,
            backgroundColor: '#EF444418',
            borderRadius: 8,
            paddingVertical: 8,
          }}
        >
          <Trash2 size={14} color="#EF4444" />
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#EF4444' }}>Supprimer</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* ── Form Modal ────────────────────────────────────────────────────── */
function ProfileFormModal({
  visible,
  initial,
  onClose,
  onSave,
  theme,
}: {
  visible: boolean;
  initial: EcoDrivingProfile | null;
  onClose: () => void;
  onSave: (data: Omit<EcoDrivingProfile, 'id'>) => void;
  theme: ThemeType;
}) {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);

  React.useEffect(() => {
    if (visible) {
      if (initial) {
        setForm({
          name: initial.name,
          targetScore: initial.targetScore.toString(),
          maxSpeedLimit: initial.maxSpeedLimit?.toString() ?? '',
          maxSpeedPenalty: initial.maxSpeedPenalty?.toString() ?? '',
          harshAccelerationSensitivity: initial.harshAccelerationSensitivity,
          harshAccelerationPenalty: initial.harshAccelerationPenalty?.toString() ?? '',
          harshBrakingSensitivity: initial.harshBrakingSensitivity,
          harshBrakingPenalty: initial.harshBrakingPenalty?.toString() ?? '',
          harshCorneringSensitivity: initial.harshCorneringSensitivity ?? 'MEDIUM',
          harshCorneringPenalty: initial.harshCorneringPenalty?.toString() ?? '',
          maxIdlingDuration: initial.maxIdlingDuration?.toString() ?? '',
          idlingPenalty: initial.idlingPenalty?.toString() ?? '',
          allVehicles: initial.allVehicles ?? false,
          status: initial.status,
        });
      } else {
        setForm(DEFAULT_FORM);
      }
    }
  }, [visible, initial]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  const submit = () => {
    if (!form.name.trim()) {
      Alert.alert('Champ requis', 'Le nom est obligatoire.');
      return;
    }
    const payload: Omit<EcoDrivingProfile, 'id'> = {
      name: form.name.trim(),
      targetScore: Number(form.targetScore) || 100,
      maxSpeedLimit: Number(form.maxSpeedLimit) || 0,
      maxSpeedPenalty: Number(form.maxSpeedPenalty) || 0,
      harshAccelerationSensitivity: form.harshAccelerationSensitivity,
      harshAccelerationPenalty: Number(form.harshAccelerationPenalty) || 0,
      harshBrakingSensitivity: form.harshBrakingSensitivity,
      harshBrakingPenalty: Number(form.harshBrakingPenalty) || 0,
      harshCorneringSensitivity: form.harshCorneringSensitivity,
      harshCorneringPenalty: Number(form.harshCorneringPenalty) || 0,
      maxIdlingDuration: Number(form.maxIdlingDuration) || 0,
      idlingPenalty: Number(form.idlingPenalty) || 0,
      allVehicles: form.allVehicles,
      status: form.status,
    };
    onSave(payload);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg.primary }} edges={['top']}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {/* header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 16,
              paddingVertical: 14,
              borderBottomWidth: 1,
              borderBottomColor: theme.border,
              backgroundColor: theme.bg.surface,
            }}
          >
            <TouchableOpacity onPress={onClose}>
              <X size={22} color={theme.text.muted} />
            </TouchableOpacity>
            <Text style={{ fontSize: 16, fontWeight: '700', color: theme.text.primary }}>
              {initial ? 'Modifier le profil' : 'Nouveau profil'}
            </Text>
            <TouchableOpacity
              onPress={submit}
              style={{ backgroundColor: theme.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 }}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Enregistrer</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
            {/* Nom */}
            <SectionTitle label="Informations générales" theme={theme} />
            <Text style={styles.label(theme)}>Nom *</Text>
            <TextInput
              style={styles.input(theme)}
              value={form.name}
              onChangeText={(v) => set('name', v)}
              placeholder="Ex : Profil standard"
              placeholderTextColor={theme.text.muted}
            />

            <Text style={styles.label(theme)}>Score cible</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <TextInput
                style={[styles.input(theme), { flex: 1, marginBottom: 0 }]}
                value={form.targetScore}
                onChangeText={(v) => set('targetScore', v)}
                placeholder="100"
                placeholderTextColor={theme.text.muted}
                keyboardType="numeric"
              />
              <Text style={{ fontSize: 13, color: theme.text.secondary }}>pts</Text>
            </View>

            {/* Vitesse */}
            <SectionTitle label="Vitesse" theme={theme} />
            <View
              style={{
                backgroundColor: theme.bg.surface,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: theme.border,
                padding: 12,
                marginBottom: 12,
              }}
            >
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, color: theme.text.muted, marginBottom: 6 }}>Vitesse max (km/h)</Text>
                  <TextInput
                    style={[styles.input(theme), { marginBottom: 0 }]}
                    value={form.maxSpeedLimit}
                    onChangeText={(v) => set('maxSpeedLimit', v)}
                    placeholder="Ex : 120"
                    placeholderTextColor={theme.text.muted}
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, color: theme.text.muted, marginBottom: 6 }}>Pénalité (pts)</Text>
                  <TextInput
                    style={[styles.input(theme), { marginBottom: 0 }]}
                    value={form.maxSpeedPenalty}
                    onChangeText={(v) => set('maxSpeedPenalty', v)}
                    placeholder="Ex : 10"
                    placeholderTextColor={theme.text.muted}
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </View>

            {/* Accélération brusque */}
            <SectionTitle label="Comportement de conduite" theme={theme} />
            <PenaltySection
              title="Accélération brusque"
              sensitivity={form.harshAccelerationSensitivity}
              onSensitivity={(v) => set('harshAccelerationSensitivity', v)}
              penalty={form.harshAccelerationPenalty}
              onPenalty={(v) => set('harshAccelerationPenalty', v)}
              theme={theme}
            />
            <PenaltySection
              title="Freinage brusque"
              sensitivity={form.harshBrakingSensitivity}
              onSensitivity={(v) => set('harshBrakingSensitivity', v)}
              penalty={form.harshBrakingPenalty}
              onPenalty={(v) => set('harshBrakingPenalty', v)}
              theme={theme}
            />
            <PenaltySection
              title="Virage brusque"
              sensitivity={form.harshCorneringSensitivity}
              onSensitivity={(v) => set('harshCorneringSensitivity', v)}
              penalty={form.harshCorneringPenalty}
              onPenalty={(v) => set('harshCorneringPenalty', v)}
              theme={theme}
            />

            {/* Ralenti */}
            <SectionTitle label="Ralenti" theme={theme} />
            <View
              style={{
                backgroundColor: theme.bg.surface,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: theme.border,
                padding: 12,
                marginBottom: 12,
              }}
            >
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, color: theme.text.muted, marginBottom: 6 }}>Durée max (min)</Text>
                  <TextInput
                    style={[styles.input(theme), { marginBottom: 0 }]}
                    value={form.maxIdlingDuration}
                    onChangeText={(v) => set('maxIdlingDuration', v)}
                    placeholder="Ex : 5"
                    placeholderTextColor={theme.text.muted}
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, color: theme.text.muted, marginBottom: 6 }}>Pénalité (pts)</Text>
                  <TextInput
                    style={[styles.input(theme), { marginBottom: 0 }]}
                    value={form.idlingPenalty}
                    onChangeText={(v) => set('idlingPenalty', v)}
                    placeholder="Ex : 3"
                    placeholderTextColor={theme.text.muted}
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </View>

            {/* Véhicules */}
            <SectionTitle label="Véhicules" theme={theme} />
            <View style={[styles.switchRow(theme), { marginBottom: 14 }]}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text.primary }}>Tous les véhicules</Text>
                <Text style={{ fontSize: 12, color: theme.text.muted }}>Appliquer à toute la flotte</Text>
              </View>
              <Switch
                value={form.allVehicles}
                onValueChange={(v) => set('allVehicles', v)}
                trackColor={{ true: theme.primary }}
              />
            </View>

            {/* Statut */}
            <SectionTitle label="Statut" theme={theme} />
            <StatusPicker value={form.status} onChange={(v) => set('status', v)} theme={theme} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

/* ── Main Screen ──────────────────────────────────────────────────── */
export default function EcoConduiteScreen() {
  const { theme } = useTheme();
  const nav = useNavigation();
  const qc = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<EcoDrivingProfile | null>(null);

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ['eco-driving-profiles'],
    queryFn: () => ecoDrivingApi.getAll(),
    staleTime: 30_000,
  });

  const createMut = useMutation({
    mutationFn: (d: Omit<EcoDrivingProfile, 'id'>) => ecoDrivingApi.create(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['eco-driving-profiles'] });
      setModalVisible(false);
    },
    onError: (e: Error) => Alert.alert('Erreur', e?.message ?? 'Impossible de créer le profil.'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<EcoDrivingProfile> }) => ecoDrivingApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['eco-driving-profiles'] });
      setModalVisible(false);
      setEditing(null);
    },
    onError: (e: Error) => Alert.alert('Erreur', e?.message ?? 'Impossible de modifier le profil.'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => ecoDrivingApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['eco-driving-profiles'] }),
    onError: (e: Error) => Alert.alert('Erreur', e?.message ?? 'Impossible de supprimer le profil.'),
  });

  const handleSave = (data: Omit<EcoDrivingProfile, 'id'>) => {
    if (editing) updateMut.mutate({ id: editing.id, data });
    else createMut.mutate(data);
  };

  const handleDelete = (p: EcoDrivingProfile) => {
    Alert.alert('Supprimer', `Supprimer "${p.name}" ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => deleteMut.mutate(p.id) },
    ]);
  };

  const openEdit = (p: EcoDrivingProfile) => {
    setEditing(p);
    setModalVisible(true);
  };
  const openCreate = () => {
    setEditing(null);
    setModalVisible(true);
  };

  return (
    <SafeAreaView style={[StyleSheet.absoluteFill, { backgroundColor: theme.bg.primary }]} edges={['top']}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingHorizontal: 16,
          paddingVertical: 14,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
          backgroundColor: theme.bg.surface,
        }}
      >
        <TouchableOpacity
          onPress={() => nav.goBack()}
          style={{ padding: 4 }}
          accessibilityLabel="Retour"
          accessibilityRole="button"
        >
          <ArrowLeft size={22} color={theme.text.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: theme.text.primary }}>Éco-conduite</Text>
          <Text style={{ fontSize: 12, color: theme.text.muted }}>
            {profiles.length} profil{profiles.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <TouchableOpacity
          onPress={openCreate}
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            backgroundColor: theme.primary,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Plus size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={theme.primary} />
        </View>
      ) : profiles.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 20,
              backgroundColor: '#22C55E18',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 16,
            }}
          >
            <Leaf size={36} color="#22C55E" />
          </View>
          <Text style={{ fontSize: 15, color: theme.text.secondary, textAlign: 'center' }}>
            Aucun profil éco-conduite
          </Text>
          <TouchableOpacity
            onPress={openCreate}
            style={{
              marginTop: 16,
              backgroundColor: theme.primary,
              borderRadius: 10,
              paddingHorizontal: 20,
              paddingVertical: 10,
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Créer un profil</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={profiles}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <ProfileCard
              profile={item}
              onEdit={() => openEdit(item)}
              onDelete={() => handleDelete(item)}
              theme={theme}
            />
          )}
        />
      )}

      <ProfileFormModal
        visible={modalVisible}
        initial={editing}
        onClose={() => {
          setModalVisible(false);
          setEditing(null);
        }}
        onSave={handleSave}
        theme={theme}
      />
    </SafeAreaView>
  );
}

const styles = {
  label: (theme: ThemeType) => ({
    fontSize: 12 as const,
    fontWeight: '600' as const,
    color: theme.text.secondary,
    marginBottom: 6,
  }),
  input: (theme: ThemeType) => ({
    backgroundColor: theme.bg.elevated,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14 as const,
    color: theme.text.primary,
    marginBottom: 14,
  }),
  switchRow: (theme: ThemeType) => ({
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: theme.bg.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
  }),
};
