/**
 * TrackYu Mobile — Support Ticket Detail
 * Vue ticket complet pour agent support : infos + messages + réponse.
 * GET /tickets/:id → { ...ticket, messages: [] }
 * POST /tickets/:id/messages → { sender, text, is_internal }
 */
import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Send, User, Clock, Wrench, X } from 'lucide-react-native';
import { useTheme } from '../../theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import ticketsApi, { type TicketStatus, type TicketPriority } from '../../api/tickets';
import interventionsApi, { type InterventionType } from '../../api/interventions';
import {
  TICKET_STATUS_COLORS,
  TICKET_STATUS_LABELS,
  TICKET_PRIORITY_COLORS,
  TICKET_PRIORITY_LABELS,
} from '../../utils/portalColors';
import type { RootStackParamList } from '../../navigation/types';
import { useAuthStore } from '../../store/authStore';
import { ROLE, normalizeRole } from '../../constants/roles';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'SupportTicketDetail'>;
type ThemeType = ReturnType<typeof import('../../theme').useTheme>['theme'];

// ── Status change chips ───────────────────────────────────────────────────────

const STATUS_FLOW: TicketStatus[] = ['OPEN', 'IN_PROGRESS', 'WAITING_CLIENT', 'RESOLVED', 'CLOSED'];

// ── Intervention types offerts au créateur ───────────────────────────────────
// Alignés sur intervention_type_configs en DB, ordre du plus fréquent au plus rare.

const INTERVENTION_TYPES: { value: InterventionType; label: string; desc: string }[] = [
  { value: 'DEPANNAGE', label: 'Dépannage', desc: 'Intervention sur panne existante' },
  { value: 'INSTALLATION', label: 'Installation', desc: 'Pose boîtier + mise en service' },
  { value: 'REMPLACEMENT', label: 'Remplacement', desc: 'Échange boîtier / SIM / capteur' },
  { value: 'REINSTALLATION', label: 'Réinstallation', desc: 'Repose après retrait temporaire' },
  { value: 'RETRAIT', label: 'Retrait', desc: 'Dépose définitive du matériel' },
  { value: 'TRANSFERT', label: 'Transfert', desc: 'Changement de véhicule / client' },
];

// Rôles autorisés à créer une intervention depuis un ticket.
// Aligne ADMIN_SCREEN_ROLES + COMMERCIAL + TECH + SUPPORT (les agents support créent le squelette,
// le tech terrain complète dans InterventionDetailScreen).
const CREATE_INTERVENTION_ROLES = [
  ROLE.SUPERADMIN,
  ROLE.ADMIN,
  ROLE.MANAGER,
  ROLE.COMMERCIAL,
  ROLE.TECH,
  ROLE.SUPPORT,
  ROLE.SUPPORT_AGENT,
];

function StatusChip({ status, active, onPress }: { status: TicketStatus; active: boolean; onPress: () => void }) {
  const color = TICKET_STATUS_COLORS[status] ?? '#6B7280';
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={{
        borderRadius: 6,
        paddingHorizontal: 10,
        paddingVertical: 5,
        backgroundColor: active ? color : color + '22',
        borderWidth: 1,
        borderColor: color,
      }}
    >
      <Text style={{ fontSize: 11, fontWeight: '600', color: active ? '#fff' : color }}>
        {TICKET_STATUS_LABELS[status]}
      </Text>
    </TouchableOpacity>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function SupportTicketDetailScreen() {
  const { theme } = useTheme();
  const s = styles(theme);
  const nav = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { ticketId, subject } = route.params;
  const user = useAuthStore((st) => st.user);
  const qc = useQueryClient();
  const scrollRef = useRef<ScrollView>(null);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    return () => {
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    };
  }, []);
  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const userRole = user?.role ? normalizeRole(user.role) : '';
  const canCreateIntervention = CREATE_INTERVENTION_ROLES.includes(userRole as never);

  const { data: ticket, isLoading } = useQuery({
    queryKey: ['support-ticket', ticketId],
    queryFn: () => ticketsApi.getById(ticketId),
  });

  const updateMutation = useMutation({
    mutationFn: (status: TicketStatus) => ticketsApi.update(ticketId, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['support-ticket', ticketId] }),
  });

  const createInterventionMutation = useMutation({
    mutationFn: (type: InterventionType) => {
      if (!ticket?.client_id) {
        throw new Error("Ce ticket n'est rattaché à aucun client — impossible de créer une intervention.");
      }
      return interventionsApi.create({
        ticketId,
        clientId: ticket.client_id,
        vehicleId: ticket.vehicle_id ?? null,
        type,
        scheduledDate: new Date().toISOString(),
        status: 'PENDING',
      });
    },
    onSuccess: (newIntervention) => {
      setTypePickerOpen(false);
      qc.invalidateQueries({ queryKey: ['support-ticket', ticketId] });
      qc.invalidateQueries({ queryKey: ['interventions'] });
      nav.navigate('InterventionDetail', { interventionId: newIntervention.id });
    },
    onError: (err: Error) => {
      Alert.alert('Création impossible', err.message || 'Une erreur est survenue.');
    },
  });

  const sendMutation = useMutation({
    mutationFn: (text: string) => ticketsApi.addMessage(ticketId, text, user?.name ?? 'Support', false),
    onSuccess: () => {
      setMessage('');
      qc.invalidateQueries({ queryKey: ['support-ticket', ticketId] });
      qc.invalidateQueries({ queryKey: ['support-tickets'] });
      scrollTimerRef.current = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300);
    },
  });

  if (isLoading || !ticket) {
    return (
      <SafeAreaView style={[s.container, { justifyContent: 'center', alignItems: 'center' }]} edges={['top']}>
        {isLoading ? (
          <ActivityIndicator size="large" color={theme.primary} />
        ) : (
          <Text style={{ color: theme.text.muted }}>Ticket introuvable</Text>
        )}
      </SafeAreaView>
    );
  }

  const statusColor = TICKET_STATUS_COLORS[ticket.status] ?? '#6B7280';
  const priorityColor = TICKET_PRIORITY_COLORS[ticket.priority as TicketPriority] ?? '#6B7280';
  const messages = ticket.messages ?? [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg.primary }} edges={['top']}>
      <KeyboardAvoidingView
        style={s.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => nav.goBack()} style={s.backBtn}>
            <ArrowLeft size={22} color={theme.text.primary} />
          </TouchableOpacity>
          <Text style={s.title} numberOfLines={2}>
            {subject}
          </Text>
        </View>

        {/* Meta badges */}
        <View style={s.metaBar}>
          <View
            style={{
              backgroundColor: statusColor + '22',
              borderRadius: 6,
              paddingHorizontal: 8,
              paddingVertical: 3,
            }}
          >
            <Text style={{ color: statusColor, fontSize: 11, fontWeight: '600' }}>
              {TICKET_STATUS_LABELS[ticket.status]}
            </Text>
          </View>
          <View
            style={{
              backgroundColor: priorityColor + '22',
              borderRadius: 6,
              paddingHorizontal: 8,
              paddingVertical: 3,
            }}
          >
            <Text style={{ color: priorityColor, fontSize: 11, fontWeight: '600' }}>
              {TICKET_PRIORITY_LABELS[ticket.priority as TicketPriority]}
            </Text>
          </View>
          {ticket.client_name ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <User size={11} color={theme.text.muted} />
              <Text style={{ fontSize: 11, color: theme.text.muted }}>{ticket.client_name}</Text>
            </View>
          ) : null}
          {ticket.assigned_user_name ? (
            <Text style={{ fontSize: 11, color: theme.text.muted }}>→ {ticket.assigned_user_name}</Text>
          ) : null}
        </View>

        {/* Change status */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 10, gap: 8 }}
        >
          {STATUS_FLOW.map((s2) => (
            <StatusChip
              key={s2}
              status={s2}
              active={ticket.status === s2}
              onPress={() => {
                if (ticket.status !== s2) updateMutation.mutate(s2);
              }}
            />
          ))}
        </ScrollView>

        {/* Action : créer intervention depuis le ticket */}
        {canCreateIntervention && ticket.client_id ? (
          <View style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
            <TouchableOpacity
              onPress={() => setTypePickerOpen(true)}
              activeOpacity={0.8}
              style={s.createInterventionBtn}
              disabled={createInterventionMutation.isPending}
            >
              <Wrench size={16} color={theme.text.onPrimary} />
              <Text style={s.createInterventionBtnText}>
                {createInterventionMutation.isPending ? 'Création...' : 'Créer une intervention'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Description + messages */}
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
        >
          {ticket.description ? (
            <View style={s.descCard}>
              <Text style={s.descText}>{ticket.description}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}>
                <Clock size={10} color={theme.text.muted} />
                <Text style={{ fontSize: 10, color: theme.text.muted }}>
                  {new Date(ticket.created_at).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            </View>
          ) : null}

          {messages.map((msg) => {
            const isSupport = msg.sender !== 'CLIENT' && msg.sender !== 'SYSTEM';
            return (
              <View key={msg.id} style={[s.bubble, isSupport ? s.bubbleRight : s.bubbleLeft]}>
                <Text style={[s.bubbleSender, isSupport && { textAlign: 'right' }]}>{msg.sender}</Text>
                <Text style={[s.bubbleText, isSupport && { textAlign: 'right' }]}>{msg.text}</Text>
                <Text style={[s.bubbleDate, isSupport && { textAlign: 'right' }]}>
                  {new Date(msg.date).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            );
          })}
        </ScrollView>

        {/* Message input */}
        <View style={s.inputRow}>
          <TextInput
            style={s.input}
            value={message}
            onChangeText={setMessage}
            placeholder="Répondre..."
            placeholderTextColor={theme.text.muted}
            multiline
            maxLength={2000}
          />
          <TouchableOpacity
            style={[s.sendBtn, { backgroundColor: message.trim() ? theme.primary : theme.bg.elevated }]}
            onPress={() => {
              if (message.trim()) sendMutation.mutate(message.trim());
            }}
            disabled={!message.trim() || sendMutation.isPending}
            activeOpacity={0.8}
          >
            <Send size={18} color={message.trim() ? theme.text.onPrimary : theme.text.muted} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Type-picker modal pour créer une intervention depuis le ticket */}
      <Modal
        visible={typePickerOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setTypePickerOpen(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg.primary }} edges={['top']}>
          <View style={s.pickerHeader}>
            <Text style={s.pickerTitle}>Type d'intervention</Text>
            <TouchableOpacity onPress={() => setTypePickerOpen(false)} style={{ padding: 4 }}>
              <X size={22} color={theme.text.primary} />
            </TouchableOpacity>
          </View>
          <Text style={s.pickerHint}>
            L'intervention sera créée en statut <Text style={{ fontWeight: '700' }}>À planifier</Text> avec les infos du
            ticket. Le technicien pourra la compléter ensuite.
          </Text>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
            {INTERVENTION_TYPES.map((t) => (
              <TouchableOpacity
                key={t.value}
                onPress={() => createInterventionMutation.mutate(t.value)}
                activeOpacity={0.75}
                disabled={createInterventionMutation.isPending}
                style={s.typeCard}
              >
                <View style={{ flex: 1 }}>
                  <Text style={s.typeLabel}>{t.label}</Text>
                  <Text style={s.typeDesc}>{t.desc}</Text>
                </View>
                <Wrench size={16} color={theme.primary} />
              </TouchableOpacity>
            ))}
            {createInterventionMutation.isPending ? (
              <View style={{ alignItems: 'center', paddingTop: 10 }}>
                <ActivityIndicator color={theme.primary} />
              </View>
            ) : null}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = (theme: ThemeType) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg.primary },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingTop: 12,
      paddingHorizontal: 16,
      paddingBottom: 12,
      gap: 12,
    },
    backBtn: { padding: 4, marginTop: 2 },
    title: {
      flex: 1,
      fontSize: 18,
      fontWeight: '700',
      color: theme.text.primary,
      lineHeight: 24,
    },
    metaBar: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      paddingHorizontal: 16,
      paddingBottom: 10,
      alignItems: 'center',
    },
    descCard: {
      backgroundColor: theme.bg.surface,
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: theme.border,
    },
    descText: { fontSize: 14, color: theme.text.secondary, lineHeight: 20 },
    bubble: {
      maxWidth: '80%',
      borderRadius: 12,
      padding: 10,
    },
    bubbleLeft: {
      alignSelf: 'flex-start',
      backgroundColor: theme.bg.surface,
      borderWidth: 1,
      borderColor: theme.border,
    },
    bubbleRight: {
      alignSelf: 'flex-end',
      backgroundColor: theme.primary + '22',
    },
    bubbleSender: {
      fontSize: 10,
      fontWeight: '600',
      color: theme.text.muted,
      marginBottom: 3,
    },
    bubbleText: { fontSize: 13, color: theme.text.primary, lineHeight: 18 },
    bubbleDate: { fontSize: 10, color: theme.text.muted, marginTop: 4 },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      padding: 12,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      gap: 8,
      backgroundColor: theme.bg.surface,
    },
    input: {
      flex: 1,
      backgroundColor: theme.bg.elevated,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 14,
      color: theme.text.primary,
      maxHeight: 100,
    },
    sendBtn: {
      width: 42,
      height: 42,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    createInterventionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: theme.primary,
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 14,
    },
    createInterventionBtnText: {
      color: theme.text.onPrimary,
      fontSize: 13,
      fontWeight: '700',
    },
    pickerHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    pickerTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: theme.text.primary,
    },
    pickerHint: {
      fontSize: 12,
      color: theme.text.muted,
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 4,
      lineHeight: 17,
    },
    typeCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: theme.bg.surface,
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: theme.border,
    },
    typeLabel: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.text.primary,
    },
    typeDesc: {
      fontSize: 12,
      color: theme.text.muted,
      marginTop: 2,
    },
  });
