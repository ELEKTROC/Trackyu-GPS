/**
 * TrackYu Mobile — Support Ticket Detail
 * Vue ticket complet pour agent support : infos + messages + réponse.
 * GET /tickets/:id → { ...ticket, messages: [] }
 * POST /tickets/:id/messages → { sender, text, is_internal }
 */
import React, { useState, useRef } from 'react';
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
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Send, User, Clock } from 'lucide-react-native';
import { useTheme } from '../../theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import ticketsApi, { type TicketStatus, type TicketPriority } from '../../api/tickets';
import {
  TICKET_STATUS_COLORS,
  TICKET_STATUS_LABELS,
  TICKET_PRIORITY_COLORS,
  TICKET_PRIORITY_LABELS,
} from '../../utils/portalColors';
import type { RootStackParamList } from '../../navigation/types';
import { useAuthStore } from '../../store/authStore';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'SupportTicketDetail'>;
type ThemeType = ReturnType<typeof import('../../theme').useTheme>['theme'];

// ── Status change chips ───────────────────────────────────────────────────────

const STATUS_FLOW: TicketStatus[] = ['OPEN', 'IN_PROGRESS', 'WAITING_CLIENT', 'RESOLVED', 'CLOSED'];

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
  const [message, setMessage] = useState('');

  const { data: ticket, isLoading } = useQuery({
    queryKey: ['support-ticket', ticketId],
    queryFn: () => ticketsApi.getById(ticketId),
  });

  const updateMutation = useMutation({
    mutationFn: (status: TicketStatus) => ticketsApi.update(ticketId, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['support-ticket', ticketId] }),
  });

  const sendMutation = useMutation({
    mutationFn: (text: string) => ticketsApi.addMessage(ticketId, text, user?.name ?? 'Support', false),
    onSuccess: () => {
      setMessage('');
      qc.invalidateQueries({ queryKey: ['support-ticket', ticketId] });
      qc.invalidateQueries({ queryKey: ['support-tickets'] });
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300);
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
  });
