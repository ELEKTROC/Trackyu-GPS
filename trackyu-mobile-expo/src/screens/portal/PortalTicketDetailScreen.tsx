/**
 * TrackYu Mobile — Portal Ticket Detail + Reply
 */
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Send, MessageCircle, XCircle } from 'lucide-react-native';
import { useTheme } from '../../theme';
import { portalApi, type PortalTicketMessage } from '../../api/portal';
import { TICKET_STATUS_COLORS, TICKET_STATUS_LABELS } from '../../utils/portalColors';
import { SkeletonChat } from '../../components/SkeletonBox';
import type { PortalStackParamList } from '../../navigation/types';

type Route = RouteProp<PortalStackParamList, 'PortalTicketDetail'>;

export default function PortalTicketDetailScreen() {
  const { theme } = useTheme();
  const s = styles(theme);
  const nav = useNavigation();
  const route = useRoute<Route>();
  const { ticketId, subject } = route.params;
  const [reply, setReply] = useState('');
  const flatRef = useRef<FlatList>(null);
  const qc = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['portal-ticket', ticketId],
    queryFn: () => portalApi.getTicketById(ticketId),
  });

  const sendMutation = useMutation({
    mutationFn: (text: string) => portalApi.addTicketMessage(ticketId, text),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portal-ticket', ticketId] });
      setReply('');
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 200);
    },
    onError: () => Alert.alert('Erreur', "Impossible d'envoyer le message."),
  });

  const handleSend = () => {
    const text = reply.trim();
    if (!text) return;
    sendMutation.mutate(text);
  };

  const ticket = data?.ticket;
  const messages = data?.messages ?? [];
  const isClosed = ticket?.status === 'RESOLVED' || ticket?.status === 'CLOSED';

  if (isError) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => nav.goBack()} style={s.backBtn}>
            <ArrowLeft size={22} color={theme.text.primary} />
          </TouchableOpacity>
          <Text style={s.subject} numberOfLines={1}>
            {subject}
          </Text>
        </View>
        <View style={s.center}>
          <XCircle size={40} color={theme.functional.error} />
          <Text style={{ color: theme.text.muted, fontSize: 14, marginTop: 8 }}>Impossible de charger ce ticket</Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderMessage = ({ item }: { item: PortalTicketMessage }) => {
    const isClient = item.sender === 'CLIENT';
    const isSystem = item.sender === 'SYSTEM';
    if (isSystem) {
      return (
        <View style={s.systemMsg}>
          <Text style={s.systemText}>{item.text}</Text>
        </View>
      );
    }
    return (
      <View style={[s.msgWrap, isClient ? s.msgRight : s.msgLeft]}>
        <View style={[s.bubble, isClient ? s.bubbleClient : s.bubbleSupport]}>
          {!isClient && <Text style={s.senderLabel}>Support</Text>}
          <Text style={[s.msgText, isClient && { color: theme.text.onPrimary }]}>{item.text}</Text>
          <Text style={[s.msgTime, isClient && { color: theme.text.onPrimary + 'AA' }]}>
            {item.created_at
              ? (() => {
                  const d = new Date(item.created_at);
                  return isNaN(d.getTime())
                    ? ''
                    : d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                })()
              : ''}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg.primary }} edges={['top']}>
      <KeyboardAvoidingView
        style={s.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => nav.goBack()} style={s.backBtn}>
            <ArrowLeft size={22} color={theme.text.primary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.subject} numberOfLines={1}>
              {subject}
            </Text>
            {ticket && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <View
                  style={{
                    backgroundColor: (TICKET_STATUS_COLORS[ticket.status] ?? '#6B7280') + '22',
                    borderRadius: 4,
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                  }}
                >
                  <Text
                    style={{ color: TICKET_STATUS_COLORS[ticket.status] ?? '#6B7280', fontSize: 10, fontWeight: '600' }}
                  >
                    {TICKET_STATUS_LABELS[ticket.status] ?? ticket.status}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Messages */}
        {isLoading ? (
          <SkeletonChat />
        ) : (
          <FlatList
            ref={flatRef}
            data={messages}
            keyExtractor={(m) => m.id}
            renderItem={renderMessage}
            contentContainerStyle={s.messageList}
            onLayout={() => flatRef.current?.scrollToEnd({ animated: false })}
            ListEmptyComponent={
              <View style={s.emptyMsg}>
                <MessageCircle size={36} color={theme.text.muted} />
                <Text style={{ color: theme.text.muted, fontSize: 13, marginTop: 8 }}>Aucun message</Text>
              </View>
            }
          />
        )}

        {/* Reply input */}
        {!isClosed && (
          <View style={s.inputBar}>
            <TextInput
              style={s.input}
              value={reply}
              onChangeText={setReply}
              placeholder="Votre réponse..."
              placeholderTextColor={theme.text.muted}
              multiline
              maxLength={1000}
            />
            <TouchableOpacity
              style={[s.sendBtn, (!reply.trim() || sendMutation.isPending) && s.sendBtnDisabled]}
              onPress={handleSend}
              disabled={!reply.trim() || sendMutation.isPending}
              activeOpacity={0.8}
            >
              {sendMutation.isPending ? (
                <ActivityIndicator size="small" color={theme.text.onPrimary} />
              ) : (
                <Send size={18} color={theme.text.onPrimary} />
              )}
            </TouchableOpacity>
          </View>
        )}
        {isClosed && (
          <View style={s.closedBar}>
            <Text style={s.closedText}>
              Ce ticket est {TICKET_STATUS_LABELS[ticket!.status]?.toLowerCase()} — pas de nouveaux messages
            </Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = (theme: ReturnType<typeof useTheme>['theme']) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg.primary },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingTop: 12,
      paddingBottom: 12,
      paddingHorizontal: 16,
      gap: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      backgroundColor: theme.bg.surface,
    },
    backBtn: { padding: 6 },
    subject: { fontSize: 16, fontWeight: '700', color: theme.text.primary },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    messageList: { padding: 16, gap: 8 },
    msgWrap: { maxWidth: '80%' },
    msgLeft: { alignSelf: 'flex-start' },
    msgRight: { alignSelf: 'flex-end' },
    bubble: { borderRadius: 14, padding: 10, gap: 4 },
    bubbleClient: { backgroundColor: theme.primary, borderBottomRightRadius: 4 },
    bubbleSupport: {
      backgroundColor: theme.bg.surface,
      borderWidth: 1,
      borderColor: theme.border,
      borderBottomLeftRadius: 4,
    },
    senderLabel: { fontSize: 10, color: theme.text.muted, fontWeight: '600', textTransform: 'uppercase' },
    msgText: { fontSize: 14, color: theme.text.primary, lineHeight: 20 },
    msgTime: { fontSize: 10, color: theme.text.muted, alignSelf: 'flex-end' },
    systemMsg: {
      alignSelf: 'center',
      backgroundColor: theme.bg.elevated,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    systemText: { fontSize: 11, color: theme.text.muted, textAlign: 'center' },
    emptyMsg: { alignItems: 'center', paddingTop: 60 },

    inputBar: {
      flexDirection: 'row',
      gap: 10,
      padding: 12,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      backgroundColor: theme.bg.surface,
      paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    },
    input: {
      flex: 1,
      backgroundColor: theme.bg.elevated,
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 10,
      color: theme.text.primary,
      fontSize: 14,
      maxHeight: 100,
      borderWidth: 1,
      borderColor: theme.border,
    },
    sendBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: theme.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    sendBtnDisabled: { opacity: 0.4 },
    closedBar: {
      padding: 16,
      backgroundColor: theme.bg.surface,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      alignItems: 'center',
      paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    },
    closedText: { fontSize: 12, color: theme.text.muted, textAlign: 'center' },
  });
