/**
 * TrackYu Mobile — Create New Support Ticket (Espace Client)
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
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Send, ChevronDown, ChevronUp, Paperclip, X } from 'lucide-react-native';
import { useTheme } from '../../theme';
import { portalApi } from '../../api/portal';
import { generateSubjectAndDesc } from '../../utils/ticketHelpers';
import ticketsApi, { type TicketCategory, type TicketSubCategory } from '../../api/tickets';

type PortalPriority = 'LOW' | 'MEDIUM' | 'HIGH';
import { NEW_TICKET_PRIORITIES } from '../../utils/portalColors';
import type { PortalStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<PortalStackParamList>;
type Route = RouteProp<PortalStackParamList, 'PortalNewTicket'>;
type ThemeType = ReturnType<typeof import('../../theme').useTheme>['theme'];

export default function PortalNewTicketScreen() {
  const { theme } = useTheme();
  const s = styles(theme);
  const nav = useNavigation<Nav>();
  const route = useRoute<Route>();
  const qc = useQueryClient();

  const prefill = route.params;

  const [selectedCategory, setSelectedCategory] = useState<TicketCategory | null>(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState<TicketSubCategory | null>(null);
  const [priority, setPriority] = useState<PortalPriority>('MEDIUM');
  const [subject, setSubject] = useState(prefill?.prefillSubject ?? '');
  const [description, setDescription] = useState(prefill?.prefillDescription ?? '');
  const [showCatPicker, setShowCatPicker] = useState(false);
  const [showSubCatPicker, setShowSubCatPicker] = useState(false);

  // Pièces jointes
  type Attachment = { uri: string; mimeType: string; fileName: string };
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  const handlePickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission requise', "Autorisez l'accès à votre galerie pour joindre des photos.");
      return;
    }
    if (attachments.length >= 3) {
      Alert.alert('Limite atteinte', 'Vous pouvez joindre au maximum 3 photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsMultipleSelection: false,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setAttachments((prev) => [
        ...prev,
        {
          uri: asset.uri,
          mimeType: asset.mimeType ?? 'image/jpeg',
          fileName: asset.fileName ?? `photo_${Date.now()}.jpg`,
        },
      ]);
    }
  };

  const removeAttachment = (idx: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

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
  // Skip if subject was pre-filled (intervention pre-fill should not be overwritten by category logic)
  useEffect(() => {
    if (!selectedCategory) return;
    if (prefill?.prefillSubject) return; // keep manual pre-fill intact
    const { subject: s, description: d } = generateSubjectAndDesc(
      selectedCategory.name,
      selectedSubCategory?.name ?? '',
      ''
    );
    setSubject(s);
    setDescription(d);
    const prio = (selectedSubCategory?.default_priority || selectedCategory.default_priority) as
      | PortalPriority
      | undefined;
    if (prio && ['LOW', 'MEDIUM', 'HIGH'].includes(prio)) setPriority(prio);
  }, [selectedCategory, selectedSubCategory]);

  const mutation = useMutation({
    mutationFn: async () => {
      const ticket = await portalApi.createTicket({
        subject: subject.trim(),
        description: description.trim(),
        priority,
        category: selectedCategory?.name,
        sub_category: selectedSubCategory?.name,
      });
      // Upload pièces jointes (best-effort, non-bloquant)
      for (const att of attachments) {
        try {
          await portalApi.uploadTicketAttachment(ticket.id, att.uri, att.mimeType, att.fileName);
        } catch {
          // silently ignore individual upload failures
        }
      }
      return ticket;
    },
    onSuccess: (ticket) => {
      qc.invalidateQueries({ queryKey: ['portal-tickets'] });
      qc.invalidateQueries({ queryKey: ['portal-dashboard'] });
      nav.replace('PortalTicketDetail', { ticketId: ticket.id, subject: ticket.subject });
    },
    onError: () => Alert.alert('Erreur', 'Impossible de créer le ticket. Veuillez réessayer.'),
  });

  const canSubmit = subject.trim().length >= 3 && description.trim().length >= 10 && !!selectedCategory;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg.primary }} edges={['top']}>
      <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => nav.goBack()} style={s.backBtn}>
            <ArrowLeft size={22} color={theme.text.primary} />
          </TouchableOpacity>
          <Text style={s.title}>Nouveau Ticket</Text>
        </View>

        <ScrollView contentContainerStyle={s.form} keyboardShouldPersistTaps="handled">
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
              {NEW_TICKET_PRIORITIES.map((p) => (
                <TouchableOpacity
                  key={p.value}
                  style={[
                    s.chip,
                    priority === p.value
                      ? { backgroundColor: p.color, borderColor: p.color }
                      : { borderColor: theme.border },
                  ]}
                  onPress={() => setPriority(p.value as PortalPriority)}
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
              placeholder="Résumez votre problème"
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
              placeholder="Décrivez votre problème en détail..."
              placeholderTextColor={theme.text.muted}
              multiline
              numberOfLines={6}
              maxLength={2000}
              textAlignVertical="top"
            />
            <Text style={s.charCount}>{description.length} / 2000</Text>
          </View>

          {/* Pièces jointes */}
          <View style={s.field}>
            <Text style={s.label}>
              Photos <Text style={{ color: theme.text.muted, fontWeight: '400' }}>(max 3)</Text>
            </Text>
            <View style={s.attachRow}>
              {attachments.map((att, idx) => (
                <View key={idx} style={s.attachThumb}>
                  <Image source={{ uri: att.uri }} style={s.thumbImage} />
                  <TouchableOpacity style={s.thumbRemove} onPress={() => removeAttachment(idx)}>
                    <X size={12} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
              {attachments.length < 3 && (
                <TouchableOpacity style={s.attachAdd} onPress={handlePickPhoto} activeOpacity={0.7}>
                  <Paperclip size={20} color={theme.primary} />
                  <Text style={[s.attachAddText, { color: theme.primary }]}>Ajouter</Text>
                </TouchableOpacity>
              )}
            </View>
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
      paddingTop: 12,
      paddingBottom: 12,
      paddingHorizontal: 16,
      gap: 12,
    },
    backBtn: { padding: 6 },
    title: { fontSize: 20, fontWeight: '700', color: theme.text.primary },
    form: { padding: 16, gap: 20, paddingBottom: 40 },

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
    dropdownItem: {
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    dropdownText: { fontSize: 14, color: theme.text.primary },

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

    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      borderRadius: 20,
      borderWidth: 1,
      paddingHorizontal: 14,
      paddingVertical: 7,
      backgroundColor: 'transparent',
    },
    chipText: { fontSize: 13, color: theme.text.secondary, fontWeight: '500' },

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

    attachRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    attachThumb: { width: 72, height: 72, borderRadius: 10, overflow: 'hidden', position: 'relative' },
    thumbImage: { width: 72, height: 72, borderRadius: 10 },
    thumbRemove: {
      position: 'absolute',
      top: 4,
      right: 4,
      backgroundColor: 'rgba(0,0,0,0.55)',
      borderRadius: 10,
      width: 20,
      height: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    attachAdd: {
      width: 72,
      height: 72,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: theme.primary,
      borderStyle: 'dashed',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 4,
      backgroundColor: theme.primaryDim,
    },
    attachAddText: { fontSize: 10, fontWeight: '600' },
  });
