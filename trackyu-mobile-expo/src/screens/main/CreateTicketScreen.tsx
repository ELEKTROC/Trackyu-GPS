/**
 * TrackYu Mobile — Create Ticket (prefill véhicule)
 * Catégories + sous-catégories depuis la DB (GET /support/settings/categories)
 * Auto-génération sujet + description selon logique web
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Send, ChevronDown, ChevronUp, Truck } from 'lucide-react-native';
import { useTheme } from '../../theme';
import { haptics } from '../../utils/haptics';
import { generateSubjectAndDesc } from '../../utils/ticketHelpers';
import ticketsApi, { type TicketCategory, type TicketSubCategory, type TicketPriority } from '../../api/tickets';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateTicket'>;
type ThemeType = ReturnType<typeof import('../../theme').useTheme>['theme'];

const PRIORITIES: { value: TicketPriority; label: string; color: string }[] = [
  { value: 'LOW', label: 'Faible', color: '#22C55E' },
  { value: 'MEDIUM', label: 'Moyenne', color: '#F59E0B' },
  { value: 'HIGH', label: 'Élevée', color: '#EF4444' },
  { value: 'CRITICAL', label: 'Critique', color: '#7C3AED' },
];

export default function CreateTicketScreen({ route }: Props) {
  const { vehicleId, vehicleName, vehiclePlate } = route.params;
  const { theme } = useTheme();
  const s = styles(theme);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const qc = useQueryClient();

  const [selectedCategory, setSelectedCategory] = useState<TicketCategory | null>(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState<TicketSubCategory | null>(null);
  const [priority, setPriority] = useState<TicketPriority>('MEDIUM');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [showCatPicker, setShowCatPicker] = useState(false);
  const [showSubCatPicker, setShowSubCatPicker] = useState(false);

  const { data: categories = [], isLoading: catsLoading } = useQuery<TicketCategory[]>({
    queryKey: ['ticket-categories'],
    queryFn: ticketsApi.getCategories,
    staleTime: 5 * 60_000,
  });

  const { data: subCategories = [] } = useQuery<TicketSubCategory[]>({
    queryKey: ['ticket-subcategories', selectedCategory?.id],
    queryFn: () => ticketsApi.getSubCategories(selectedCategory!.id),
    enabled: !!selectedCategory,
    staleTime: 5 * 60_000,
  });

  // Auto-update sujet + description quand catégorie / sous-catégorie change
  useEffect(() => {
    if (!selectedCategory) return;
    const { subject: s, description: d } = generateSubjectAndDesc(
      selectedCategory.name,
      selectedSubCategory?.name ?? '',
      vehiclePlate
    );
    setSubject(s);
    setDescription(d);
    // Priorité par défaut de la sous-catégorie ou catégorie
    const prio = (selectedSubCategory?.default_priority || selectedCategory.default_priority) as
      | TicketPriority
      | undefined;
    if (prio && ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(prio)) setPriority(prio);
  }, [selectedCategory, selectedSubCategory, vehiclePlate]);

  const mutation = useMutation({
    mutationFn: () =>
      ticketsApi.create({
        subject: subject.trim(),
        description: description.trim(),
        priority,
        category: selectedCategory?.name,
        sub_category: selectedSubCategory?.name,
        vehicle_id: vehicleId,
      }),
    onSuccess: () => {
      haptics.success();
      qc.invalidateQueries({ queryKey: ['tickets'] });
      Alert.alert('Ticket créé', 'Votre ticket a été soumis avec succès.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    },
    onError: () => {
      haptics.error();
      Alert.alert('Erreur', 'Impossible de créer le ticket. Veuillez réessayer.');
    },
  });

  const canSubmit = subject.trim().length >= 3 && description.trim().length >= 10 && !!selectedCategory;

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={s.backBtn}
            accessibilityLabel="Retour"
            accessibilityRole="button"
          >
            <ArrowLeft size={20} color={theme.text.primary} />
          </TouchableOpacity>
          <Text style={s.title}>Nouveau ticket</Text>
        </View>

        <ScrollView contentContainerStyle={s.form} keyboardShouldPersistTaps="handled">
          {/* Véhicule (lecture seule) */}
          <View style={s.vehicleBadge}>
            <Truck size={14} color={theme.primary} />
            <Text style={s.vehicleBadgeText}>
              {vehicleName} · {vehiclePlate}
            </Text>
          </View>

          {/* Catégorie */}
          <View style={s.field}>
            <Text style={s.label}>
              Catégorie <Text style={s.required}>*</Text>
            </Text>
            <TouchableOpacity
              style={s.picker}
              onPress={() => {
                setShowCatPicker((v) => !v);
                setShowSubCatPicker(false);
              }}
              activeOpacity={0.8}
            >
              <Text style={[s.pickerText, !selectedCategory && { color: theme.text.muted }]}>
                {selectedCategory?.name ?? 'Sélectionner une catégorie'}
              </Text>
              {showCatPicker ? (
                <ChevronUp size={16} color={theme.text.muted} />
              ) : (
                <ChevronDown size={16} color={theme.text.muted} />
              )}
            </TouchableOpacity>
            {showCatPicker && (
              <View style={s.dropdown}>
                {catsLoading ? (
                  <ActivityIndicator size="small" color={theme.primary} style={{ padding: 16 }} />
                ) : (
                  categories.map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      style={[s.dropdownItem, selectedCategory?.id === cat.id && { backgroundColor: theme.primaryDim }]}
                      onPress={() => {
                        setSelectedCategory(cat);
                        setSelectedSubCategory(null);
                        setShowCatPicker(false);
                      }}
                    >
                      <Text
                        style={[
                          s.dropdownText,
                          selectedCategory?.id === cat.id && { color: theme.primary, fontWeight: '700' },
                        ]}
                      >
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}
          </View>

          {/* Sous-catégorie */}
          {selectedCategory && subCategories.length > 0 && (
            <View style={s.field}>
              <Text style={s.label}>Sous-catégorie</Text>
              <TouchableOpacity
                style={s.picker}
                onPress={() => {
                  setShowSubCatPicker((v) => !v);
                  setShowCatPicker(false);
                }}
                activeOpacity={0.8}
              >
                <Text style={[s.pickerText, !selectedSubCategory && { color: theme.text.muted }]}>
                  {selectedSubCategory?.name ?? 'Sélectionner une sous-catégorie'}
                </Text>
                {showSubCatPicker ? (
                  <ChevronUp size={16} color={theme.text.muted} />
                ) : (
                  <ChevronDown size={16} color={theme.text.muted} />
                )}
              </TouchableOpacity>
              {showSubCatPicker && (
                <View style={s.dropdown}>
                  {subCategories.map((sub) => (
                    <TouchableOpacity
                      key={sub.id}
                      style={[
                        s.dropdownItem,
                        selectedSubCategory?.id === sub.id && { backgroundColor: theme.primaryDim },
                      ]}
                      onPress={() => {
                        setSelectedSubCategory(sub);
                        setShowSubCatPicker(false);
                      }}
                    >
                      <Text
                        style={[
                          s.dropdownText,
                          selectedSubCategory?.id === sub.id && { color: theme.primary, fontWeight: '700' },
                        ]}
                      >
                        {sub.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Priorité */}
          <View style={s.field}>
            <Text style={s.label}>Priorité</Text>
            <View style={s.chipRow}>
              {PRIORITIES.map((p) => (
                <TouchableOpacity
                  key={p.value}
                  style={[
                    s.chip,
                    priority === p.value
                      ? { backgroundColor: p.color, borderColor: p.color }
                      : { borderColor: theme.border },
                  ]}
                  onPress={() => setPriority(p.value)}
                  activeOpacity={0.8}
                >
                  <Text style={[s.chipText, priority === p.value && { color: '#fff' }]}>{p.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Sujet */}
          <View style={s.field}>
            <Text style={s.label}>
              Sujet <Text style={s.required}>*</Text>
            </Text>
            <TextInput
              style={s.input}
              value={subject}
              onChangeText={setSubject}
              placeholder="Résumez le problème"
              placeholderTextColor={theme.text.muted}
              maxLength={120}
            />
          </View>

          {/* Description */}
          <View style={s.field}>
            <Text style={s.label}>
              Description <Text style={s.required}>*</Text>
            </Text>
            <TextInput
              style={[s.input, s.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Décrivez le problème en détail..."
              placeholderTextColor={theme.text.muted}
              multiline
              numberOfLines={6}
              maxLength={2000}
              textAlignVertical="top"
            />
            <Text style={s.charCount}>{description.length} / 2000</Text>
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[s.submitBtn, (!canSubmit || mutation.isPending) && s.submitBtnDisabled]}
            onPress={() => mutation.mutate()}
            disabled={!canSubmit || mutation.isPending}
            activeOpacity={0.8}
          >
            {mutation.isPending ? (
              <ActivityIndicator size="small" color={theme.text.onPrimary} />
            ) : (
              <>
                <Send size={18} color={theme.text.onPrimary} />
                <Text style={s.submitText}>Envoyer le ticket</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = (theme: ThemeType) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg.primary },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    backBtn: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: theme.bg.surface,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.border,
    },
    title: { fontSize: 17, fontWeight: '700', color: theme.text.primary },
    form: { padding: 16, gap: 20, paddingBottom: 60 },

    vehicleBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: theme.primaryDim,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 12,
    },
    vehicleBadgeText: { fontSize: 13, fontWeight: '600', color: theme.primary },

    field: { gap: 8 },
    label: { fontSize: 13, fontWeight: '600', color: theme.text.secondary },
    required: { color: theme.functional.error },

    picker: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.bg.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: 14,
      paddingVertical: 13,
    },
    pickerText: { fontSize: 14, color: theme.text.primary, flex: 1 },
    dropdown: {
      backgroundColor: theme.bg.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      overflow: 'hidden',
    },
    dropdownItem: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.border },
    dropdownText: { fontSize: 14, color: theme.text.primary },

    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      borderRadius: 20,
      borderWidth: 1,
      paddingHorizontal: 14,
      paddingVertical: 7,
      backgroundColor: 'transparent',
    },
    chipText: { fontSize: 13, color: theme.text.secondary, fontWeight: '500' },

    input: {
      backgroundColor: theme.bg.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      color: theme.text.primary,
      fontSize: 14,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    textArea: { height: 130, paddingTop: 12 },
    charCount: { fontSize: 11, color: theme.text.muted, textAlign: 'right' },

    submitBtn: {
      backgroundColor: theme.primary,
      borderRadius: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      paddingVertical: 15,
      marginTop: 8,
    },
    submitBtnDisabled: { opacity: 0.45 },
    submitText: { color: theme.text.onPrimary, fontWeight: '700', fontSize: 15 },
  });
