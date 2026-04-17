/**
 * TrackYu Mobile — AIChatModal
 * Assistant IA TrackYu (Gemini via /api/ai/ask).
 * Composant partagé : utilisé depuis ProfileScreen et HelpScreen.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bot, X, Send } from 'lucide-react-native';
import { useTheme } from '../theme';
import { helpApi } from '../api/helpApi';

interface ChatMessage {
  id: string;
  from: 'user' | 'ai';
  text: string;
  time: string;
  loading?: boolean;
}

function now() {
  return new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

interface AIChatModalProps {
  visible: boolean;
  onClose: () => void;
  userName?: string;
}

export function AIChatModal({ visible, onClose, userName = 'vous' }: AIChatModalProps) {
  const { theme } = useTheme();
  const s = chatStyles(theme);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [convId, setConvId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    if (visible && messages.length === 0) {
      setMessages([
        {
          id: '0',
          from: 'ai',
          text: `Bonjour ${userName} 👋 Je suis l'assistant TrackYu. Comment puis-je vous aider ?`,
          time: now(),
        },
      ]);
    }
  }, [visible]);

  const send = async () => {
    const q = input.trim();
    if (!q || sending) return;
    setInput('');
    setSending(true);

    const userMsg: ChatMessage = { id: Date.now().toString(), from: 'user', text: q, time: now() };
    const loadingMsg: ChatMessage = { id: 'loading', from: 'ai', text: '', time: now(), loading: true };
    setMessages((prev) => [...prev, userMsg, loadingMsg]);

    try {
      const res = await helpApi.askAI(q, convId);
      if (res.conversationId) setConvId(res.conversationId);
      setMessages((prev) =>
        prev
          .filter((m) => m.id !== 'loading')
          .concat({ id: Date.now().toString(), from: 'ai', text: res.response, time: now() })
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '';
      const errText =
        msg.includes('503') || msg.includes('indisponible')
          ? 'Le service IA est temporairement indisponible. Créez un ticket pour contacter notre équipe.'
          : 'Une erreur est survenue. Réessayez ou créez un ticket.';
      setMessages((prev) =>
        prev
          .filter((m) => m.id !== 'loading')
          .concat({ id: Date.now().toString(), from: 'ai', text: errText, time: now() })
      );
    } finally {
      setSending(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const renderMsg = ({ item }: { item: ChatMessage }) => (
    <View style={[s.bubble, item.from === 'user' ? s.bubbleUser : s.bubbleAI]}>
      {item.from === 'ai' && (
        <View style={s.aiAvatar}>
          <Bot size={14} color={theme.primary} />
        </View>
      )}
      <View style={[s.bubbleInner, item.from === 'user' ? s.bubbleInnerUser : s.bubbleInnerAI]}>
        {item.loading ? (
          <ActivityIndicator size="small" color={theme.text.muted} />
        ) : (
          <Text style={[s.bubbleText, item.from === 'user' && { color: '#fff' }]}>{item.text}</Text>
        )}
        <Text style={[s.bubbleTime, item.from === 'user' && { color: 'rgba(255,255,255,0.6)' }]}>{item.time}</Text>
      </View>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={[s.modal, { backgroundColor: theme.bg.primary }]} edges={['top']}>
          {/* Header */}
          <View style={[s.modalHeader, { backgroundColor: theme.bg.surface, borderBottomColor: theme.border }]}>
            <View style={s.modalHeaderLeft}>
              <View style={[s.botBadge, { backgroundColor: theme.primaryDim }]}>
                <Bot size={18} color={theme.primary} />
              </View>
              <View>
                <Text style={[s.modalTitle, { color: theme.text.primary }]}>Assistant TrackYu</Text>
                <Text style={[s.modalSub, { color: theme.functional.success }]}>• En ligne</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={s.closeBtn}>
              <X size={20} color={theme.text.muted} />
            </TouchableOpacity>
          </View>

          {/* Messages */}
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            renderItem={renderMsg}
            contentContainerStyle={s.messageList}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          />

          {/* Input */}
          <View style={[s.inputRow, { backgroundColor: theme.bg.surface, borderTopColor: theme.border }]}>
            <TextInput
              style={[s.chatInput, { color: theme.text.primary, backgroundColor: theme.bg.elevated }]}
              value={input}
              onChangeText={setInput}
              placeholder="Posez votre question…"
              placeholderTextColor={theme.text.muted}
              onSubmitEditing={send}
              returnKeyType="send"
              multiline
            />
            <TouchableOpacity
              style={[s.sendBtn, { backgroundColor: sending || !input.trim() ? theme.primaryDim : theme.primary }]}
              onPress={send}
              disabled={sending || !input.trim()}
            >
              {sending ? <ActivityIndicator size="small" color="#fff" /> : <Send size={16} color="#fff" />}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const chatStyles = (theme: ReturnType<typeof import('../theme').useTheme>['theme']) =>
  StyleSheet.create({
    modal: { flex: 1 },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 14,
      borderBottomWidth: 1,
    },
    modalHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    botBadge: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    modalTitle: { fontSize: 16, fontWeight: '700' },
    modalSub: { fontSize: 12, marginTop: 1 },
    closeBtn: { padding: 6 },
    messageList: { padding: 16, gap: 12 },
    bubble: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
    bubbleUser: { flexDirection: 'row-reverse' },
    bubbleAI: {},
    aiAvatar: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: theme.primaryDim,
      justifyContent: 'center',
      alignItems: 'center',
    },
    bubbleInner: { maxWidth: '78%', borderRadius: 14, padding: 10, gap: 4 },
    bubbleInnerUser: { backgroundColor: theme.primary, borderBottomRightRadius: 4 },
    bubbleInnerAI: {
      backgroundColor: theme.bg.surface,
      borderBottomLeftRadius: 4,
      borderWidth: 1,
      borderColor: theme.border,
    },
    bubbleText: { fontSize: 14, color: theme.text.primary, lineHeight: 20 },
    bubbleTime: { fontSize: 10, color: theme.text.muted, alignSelf: 'flex-end' },
    inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, padding: 12, borderTopWidth: 1 },
    chatInput: {
      flex: 1,
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 14,
      maxHeight: 100,
    },
    sendBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  });

export default AIChatModal;
