/**
 * TrackYu Mobile — Centre d'Aide
 *
 * Sections :
 *   1. Recherche FAQ
 *   2. Contact rapide (WhatsApp, Appel, Email, Ticket)
 *   3. Chat IA (Gemini via /api/ai/ask)
 *   4. FAQ accordion
 *   5. Documents légaux
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Linking,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  MessageCircle,
  Phone,
  Mail,
  Ticket,
  X,
  Send,
  Bot,
  User,
  FileText,
  Shield,
  HelpCircle,
} from 'lucide-react-native';
import { SearchBar } from '../../components/SearchBar';
import { useTheme } from '../../theme';
import { helpApi } from '../../api/helpApi';
import type { RootStackParamList } from '../../navigation/types';
import { useAuthStore } from '../../store/authStore';

type Nav = NativeStackNavigationProp<RootStackParamList>;

// ── FAQ ───────────────────────────────────────────────────────────────────────

const FAQS = [
  {
    category: 'Général',
    question: 'Comment changer mon mot de passe ?',
    answer:
      'Allez dans Profil → "Changer le mot de passe". Le nouveau mot de passe doit contenir au moins 8 caractères, une majuscule et un chiffre.',
  },
  {
    category: 'Véhicules',
    question: "Pourquoi mon véhicule n'apparaît pas sur la carte ?",
    answer:
      'Vérifiez que le boîtier GPS est alimenté. Un véhicule en sous-sol ou zone blanche peut perdre le signal. Si le problème persiste plus de 24h, contactez le support.',
  },
  {
    category: 'Historique',
    question: "Comment consulter le trajet d'un véhicule ?",
    answer:
      'Depuis l\'écran Flotte, appuyez sur un véhicule → "Historique". Sélectionnez une date dans la barre de navigation en haut pour voir le trajet de ce jour.',
  },
  {
    category: 'Abonnements',
    question: 'Où trouver mes abonnements ?',
    answer:
      'Dans Profil → "Mon Espace Client" → "Abonnements". Chaque abonnement correspond à un véhicule avec sa plaque, son tarif et ses dates.',
  },
  {
    category: 'Facturation',
    question: 'Comment télécharger une facture ?',
    answer:
      'Dans Profil → "Mon Espace Client" → "Factures". Appuyez sur une facture pour voir le détail et le bouton de téléchargement PDF.',
  },
  {
    category: 'Alertes',
    question: 'Comment activer les alertes de vitesse ?',
    answer:
      'Dans Profil → section "Configuration alertes" → "Alertes de vitesse". Vous pouvez activer/désactiver les types d\'alertes que vous souhaitez recevoir.',
  },
];

// ── ChatMessage ───────────────────────────────────────────────────────────────

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

// ── AIChatModal ───────────────────────────────────────────────────────────────

function AIChatModal({
  visible,
  onClose,
  userName,
  theme,
}: {
  visible: boolean;
  onClose: () => void;
  userName: string;
  theme: ReturnType<typeof useTheme>['theme'];
}) {
  const s = chatStyles(theme);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [convId, setConvId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    };
  }, []);

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
      scrollTimerRef.current = setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
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

const chatStyles = (theme: ReturnType<typeof useTheme>['theme']) =>
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

// ── FaqItem ───────────────────────────────────────────────────────────────────

function FaqItem({ faq, theme }: { faq: (typeof FAQS)[0]; theme: ReturnType<typeof useTheme>['theme'] }) {
  const [open, setOpen] = useState(false);
  const s = faqStyles(theme);
  return (
    <View style={s.item}>
      <TouchableOpacity style={s.question} onPress={() => setOpen(!open)} activeOpacity={0.7}>
        <Text style={s.questionText}>{faq.question}</Text>
        {open ? (
          <ChevronDown size={16} color={theme.text.muted} />
        ) : (
          <ChevronRight size={16} color={theme.text.muted} />
        )}
      </TouchableOpacity>
      {open && <Text style={s.answer}>{faq.answer}</Text>}
    </View>
  );
}

const faqStyles = (theme: ReturnType<typeof useTheme>['theme']) =>
  StyleSheet.create({
    item: {
      backgroundColor: theme.bg.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      overflow: 'hidden',
    },
    question: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 14,
      gap: 8,
    },
    questionText: { flex: 1, fontSize: 14, fontWeight: '500', color: theme.text.primary },
    answer: {
      fontSize: 13,
      color: theme.text.secondary,
      lineHeight: 20,
      paddingHorizontal: 14,
      paddingBottom: 14,
    },
  });

// ── ContactButton ─────────────────────────────────────────────────────────────

function ContactBtn({
  icon,
  label,
  onPress,
  color,
  theme,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  color: string;
  theme: ReturnType<typeof useTheme>['theme'];
}) {
  return (
    <TouchableOpacity
      style={[contactBtnStyles.btn, { backgroundColor: color + '15', borderColor: color + '40' }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={[contactBtnStyles.icon, { backgroundColor: color + '25' }]}>{icon}</View>
      <Text style={[contactBtnStyles.label, { color: theme.text.primary }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const contactBtnStyles = StyleSheet.create({
  btn: { flex: 1, alignItems: 'center', gap: 8, padding: 14, borderRadius: 12, borderWidth: 1, minWidth: '45%' },
  icon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  label: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
});

// ── Main ──────────────────────────────────────────────────────────────────────

export default function HelpScreen() {
  const { theme } = useTheme();
  const s = styles(theme);
  const nav = useNavigation<Nav>();
  const user = useAuthStore((st) => st.user);
  const [search, setSearch] = useState('');
  const [chatOpen, setChatOpen] = useState(false);

  const { data: contact } = useQuery({
    queryKey: ['tenant-contact'],
    queryFn: helpApi.getTenantContact,
    staleTime: 10 * 60_000,
  });

  const filteredFaqs = FAQS.filter(
    (f) =>
      f.question.toLowerCase().includes(search.toLowerCase()) || f.answer.toLowerCase().includes(search.toLowerCase())
  );

  const openWhatsApp = () => {
    const phone = (contact?.whatsapp || contact?.phone || '').replace(/\D/g, '');
    if (!phone) {
      Alert.alert('Indisponible', 'Numéro WhatsApp non configuré.');
      return;
    }
    Linking.openURL(`whatsapp://send?phone=${phone}&text=Bonjour, j'ai besoin d'aide.`).catch(() =>
      Alert.alert('Erreur', "WhatsApp n'est pas installé sur cet appareil.")
    );
  };

  const openCall = () => {
    const phone = (contact?.phone || '').replace(/\s/g, '');
    if (!phone) {
      Alert.alert('Indisponible', 'Numéro de téléphone non configuré.');
      return;
    }
    Linking.openURL(`tel:${phone}`);
  };

  const openEmail = () => {
    const email = contact?.email || 'support@trackyugps.com';
    Linking.openURL(`mailto:${email}?subject=Support TrackYu`);
  };

  const openTicket = () => {
    nav.navigate('CreateTicket', {
      vehicleId: '',
      vehicleName: '',
      vehiclePlate: '',
    });
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => nav.goBack()}
          style={s.backBtn}
          accessibilityLabel="Retour"
          accessibilityRole="button"
        >
          <ArrowLeft size={22} color={theme.text.primary} />
        </TouchableOpacity>
        <View>
          <Text style={s.title}>Centre d'aide</Text>
          <Text style={s.subtitle}>Comment pouvons-nous vous aider ?</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        {/* Recherche */}
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Rechercher dans la FAQ…"
          style={{ marginBottom: 8 }}
        />

        {/* Contact rapide */}
        {!search && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Nous contacter</Text>
            <View style={s.contactGrid}>
              <ContactBtn
                icon={<MessageCircle size={18} color="#25D366" />}
                label="WhatsApp"
                onPress={openWhatsApp}
                color="#25D366"
                theme={theme}
              />
              <ContactBtn
                icon={<Phone size={18} color="#3B82F6" />}
                label="Appel"
                onPress={openCall}
                color="#3B82F6"
                theme={theme}
              />
              <ContactBtn
                icon={<Mail size={18} color="#F59E0B" />}
                label="Email"
                onPress={openEmail}
                color="#F59E0B"
                theme={theme}
              />
              <ContactBtn
                icon={<Ticket size={18} color="#8B5CF6" />}
                label="Ticket"
                onPress={openTicket}
                color="#8B5CF6"
                theme={theme}
              />
            </View>
          </View>
        )}

        {/* Chat IA */}
        {!search && (
          <View style={s.section}>
            <TouchableOpacity
              style={[s.chatBanner, { backgroundColor: theme.primaryDim, borderColor: theme.primary + '33' }]}
              onPress={() => setChatOpen(true)}
              activeOpacity={0.8}
            >
              <View style={[s.chatBannerIcon, { backgroundColor: theme.primary }]}>
                <Bot size={20} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.chatBannerTitle, { color: theme.primary }]}>Assistant IA TrackYu</Text>
                <Text style={[s.chatBannerSub, { color: theme.text.muted }]}>
                  Posez vos questions, obtenez une réponse immédiate
                </Text>
              </View>
              <ChevronRight size={18} color={theme.primary} />
            </TouchableOpacity>
          </View>
        )}

        {/* FAQ */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>
            {search ? `${filteredFaqs.length} résultat${filteredFaqs.length !== 1 ? 's' : ''}` : 'Questions fréquentes'}
          </Text>
          {filteredFaqs.length === 0 ? (
            <View style={s.noResult}>
              <HelpCircle size={36} color={theme.text.muted} />
              <Text style={s.noResultText}>Aucune question ne correspond à votre recherche.</Text>
              <TouchableOpacity onPress={() => setChatOpen(true)}>
                <Text style={[s.noResultLink, { color: theme.primary }]}>Poser la question à l'assistant IA →</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={s.faqList}>
              {filteredFaqs.map((f, i) => (
                <FaqItem key={i} faq={f} theme={theme} />
              ))}
            </View>
          )}
        </View>

        {/* Documents légaux */}
        {!search && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Documents</Text>
            <View style={[s.docCard, { backgroundColor: theme.bg.surface, borderColor: theme.border }]}>
              <TouchableOpacity style={s.docItem} onPress={() => Linking.openURL('https://trackyugps.com/cgu')}>
                <FileText size={16} color={theme.text.muted} />
                <Text style={[s.docLabel, { color: theme.text.primary }]}>Conditions d'utilisation</Text>
                <ChevronRight size={14} color={theme.text.muted} />
              </TouchableOpacity>
              <View style={[s.docDivider, { backgroundColor: theme.border }]} />
              <TouchableOpacity
                style={s.docItem}
                onPress={() => Linking.openURL('https://trackyugps.com/confidentialite')}
              >
                <Shield size={16} color={theme.text.muted} />
                <Text style={[s.docLabel, { color: theme.text.primary }]}>Politique de confidentialité</Text>
                <ChevronRight size={14} color={theme.text.muted} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Chat IA Modal */}
      <AIChatModal
        visible={chatOpen}
        onClose={() => setChatOpen(false)}
        userName={user?.name || 'Client'}
        theme={theme}
      />
    </SafeAreaView>
  );
}

const styles = (theme: ReturnType<typeof useTheme>['theme']) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg.primary },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 16,
    },
    backBtn: { padding: 6 },
    title: { fontSize: 20, fontWeight: '700', color: theme.text.primary },
    subtitle: { fontSize: 12, color: theme.text.muted, marginTop: 1 },
    content: { paddingHorizontal: 16, gap: 8 },
    section: { gap: 10 },
    sectionTitle: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.text.muted,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    contactGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    chatBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 14,
      borderRadius: 14,
      borderWidth: 1,
    },
    chatBannerIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    chatBannerTitle: { fontSize: 14, fontWeight: '700' },
    chatBannerSub: { fontSize: 12, marginTop: 2 },
    faqList: { gap: 8 },
    noResult: { alignItems: 'center', paddingVertical: 24, gap: 8 },
    noResultText: { fontSize: 13, color: theme.text.muted, textAlign: 'center' },
    noResultLink: { fontSize: 13, fontWeight: '600', marginTop: 4 },
    docCard: { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
    docItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
    docLabel: { flex: 1, fontSize: 14 },
    docDivider: { height: 1, marginHorizontal: 14 },
  });
