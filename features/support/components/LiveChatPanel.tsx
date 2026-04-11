import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MessageSquare,
  Send,
  X,
  User,
  Clock,
  Headset,
  Wifi,
  WifiOff,
  RefreshCw,
  ChevronLeft,
  Circle,
  AlertCircle,
  CheckCircle2,
  Users,
  Plus,
  Search,
} from 'lucide-react';
import { Card } from '../../../components/Card';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import { TOAST } from '../../../constants/toastMessages';
import { mapError } from '../../../utils/errorMapper';
import { api } from '../../../services/apiLazy';
import { getSocket } from '../../../services/socket';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { logger } from '../../../utils/logger';

// ============================================================================
// TYPES
// ============================================================================
interface SupportConversation {
  id: string;
  tenant_id: string;
  user_id: string;
  user_name?: string;
  user_email?: string;
  status: 'open' | 'assigned' | 'closed';
  assigned_agent_id: string | null;
  agent_name?: string;
  ticket_id: string | null;
  conversation_type?: 'support' | 'internal';
  created_at: string;
  updated_at: string;
  last_message?: string;
  unread_count?: number;
}

interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name?: string;
  sender_role: 'user' | 'agent' | 'system';
  message: string;
  created_at: string;
}

interface AgentInfo {
  id: string;
  name: string;
  email: string;
  role: string;
  tenant_id?: string;
}

type ChatTab = 'support' | 'internal';

// ============================================================================
// STATUS CONFIG
// ============================================================================
const STATUS_CONFIG = {
  open: {
    label: 'En attente',
    color: 'text-orange-500',
    bg: 'bg-orange-100 dark:bg-orange-900/30',
    dot: 'bg-orange-500',
  },
  assigned: {
    label: 'En cours',
    color: 'text-[var(--primary)]',
    bg: 'bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)]',
    dot: 'bg-[var(--primary-dim)]0',
  },
  closed: { label: 'Fermée', color: 'text-[var(--text-muted)]', bg: 'bg-[var(--bg-elevated)]', dot: 'bg-slate-400' },
};

const ROLE_LABELS: Record<string, string> = {
  SUPERADMIN: 'Super Admin',
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  SUPPORT: 'Support',
  TECHNICIAN: 'Technicien',
  TECH: 'Technicien',
  SUPPORT_AGENT: 'Agent Support',
  AGENT_TRACKING: 'Agent Tracking',
  COMMERCIAL: 'Commercial',
  COMPTABLE: 'Comptable',
};

// ============================================================================
// LIVE CHAT PANEL COMPONENT
// ============================================================================
export const LiveChatPanel: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  // State
  const [chatTab, setChatTab] = useState<ChatTab>('support');
  const [conversations, setConversations] = useState<SupportConversation[]>([]);
  const [internalConversations, setInternalConversations] = useState<SupportConversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<SupportConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'open' | 'assigned' | 'all'>('open');
  const [showMobileList, setShowMobileList] = useState(true);

  // Agent list for new internal conversations
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [showNewInternalModal, setShowNewInternalModal] = useState(false);
  const [agentSearch, setAgentSearch] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ========== SOCKET CONNECTION ==========
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    setIsConnected(socket.connected);

    // Join the agent support room
    socket.emit('support:join-agent');

    // New conversation from a client
    socket.on(
      'support:new-conversation',
      (data: { conversationId: string; userName: string; tenantId: string; timestamp: string }) => {
        showToast(TOAST.SUPPORT.NEW_SUPPORT_REQUEST(data.userName), 'info');
        loadConversations();
      }
    );

    // New message in any joined conversation
    socket.on(
      'support:new-message',
      (data: {
        conversationId: string;
        senderId: string;
        senderName: string;
        senderRole: string;
        message: string;
        timestamp: string;
      }) => {
        // If this message belongs to the active conversation, add it
        setActiveConversation((prev) => {
          if (prev && prev.id === data.conversationId) {
            const newMsg: ChatMessage = {
              id: `rt-${Date.now()}`,
              conversation_id: data.conversationId,
              sender_id: data.senderId,
              sender_name: data.senderName,
              sender_role: data.senderRole as 'user' | 'agent' | 'system',
              message: data.message,
              created_at: data.timestamp,
            };
            setMessages((prevMsgs) => [...prevMsgs, newMsg]);
          }
          return prev;
        });
        // Also update last_message in conversation list
        setConversations((prev) =>
          prev.map((c) =>
            c.id === data.conversationId ? { ...c, last_message: data.message, updated_at: data.timestamp } : c
          )
        );
      }
    );

    // Typing indicator
    socket.on('support:typing', (data: { userName: string }) => {
      setTypingUser(data.userName);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => setTypingUser(null), 3000);
    });

    // Conversation closed
    socket.on('support:conversation-closed', (data: { conversationId: string; closedBy: string }) => {
      setConversations((prev) => prev.map((c) => (c.id === data.conversationId ? { ...c, status: 'closed' } : c)));
      setActiveConversation((prev) => {
        if (prev && prev.id === data.conversationId) {
          return { ...prev, status: 'closed' };
        }
        return prev;
      });
    });

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('support:new-conversation');
      socket.off('support:new-message');
      socket.off('support:typing');
      socket.off('support:conversation-closed');
    };
  }, []);

  // ========== LOAD CONVERSATIONS ==========
  const loadConversations = useCallback(async () => {
    try {
      setIsLoading(true);
      const filterParam = statusFilter === 'all' ? '' : statusFilter;
      const data = await api.ai.getConversations(filterParam || 'open');
      setConversations(Array.isArray(data) ? data : data.conversations || []);
    } catch (error) {
      logger.error('Error loading conversations:', error);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  const loadInternalConversations = useCallback(async () => {
    try {
      setIsLoading(true);
      const filterParam = statusFilter === 'all' ? 'all' : statusFilter === 'open' ? 'assigned' : statusFilter;
      const data = await api.ai.getInternalConversations(filterParam);
      setInternalConversations(Array.isArray(data) ? data : data.conversations || []);
    } catch (error) {
      logger.error('Error loading internal conversations:', error);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  const loadAgents = useCallback(async () => {
    try {
      const data = await api.ai.listAgents();
      setAgents(Array.isArray(data) ? data : []);
    } catch (error) {
      logger.error('Error loading agents:', error);
    }
  }, []);

  useEffect(() => {
    if (chatTab === 'support') {
      loadConversations();
    } else {
      loadInternalConversations();
    }
  }, [chatTab, loadConversations, loadInternalConversations]);

  // Load agents when opening new internal chat modal
  useEffect(() => {
    if (showNewInternalModal) loadAgents();
  }, [showNewInternalModal, loadAgents]);

  // ========== LOAD MESSAGES ==========
  const openConversation = async (conv: SupportConversation) => {
    setActiveConversation(conv);
    setShowMobileList(false);
    setIsLoadingMessages(true);

    try {
      // Join the socket room for this conversation
      const socket = getSocket();
      if (socket) {
        socket.emit('support:join-conversation', { conversationId: conv.id });
      }

      const isInternal = conv.conversation_type === 'internal' || chatTab === 'internal';
      const data = isInternal ? await api.ai.getInternalMessages(conv.id) : await api.ai.getMessages(conv.id);
      setMessages(Array.isArray(data) ? data : data.messages || []);
    } catch (error) {
      logger.error('Error loading messages:', error);
      showToast(TOAST.CRUD.ERROR_LOAD('messages'), 'error');
    } finally {
      setIsLoadingMessages(false);
    }
  };

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ========== SEND MESSAGE ==========
  const sendMessage = async () => {
    if (!messageInput.trim() || !activeConversation) return;

    const text = messageInput.trim();
    setMessageInput('');

    const isInternal = activeConversation.conversation_type === 'internal' || chatTab === 'internal';

    try {
      // Optimistic: add locally
      const optimisticMsg: ChatMessage = {
        id: `opt-${Date.now()}`,
        conversation_id: activeConversation.id,
        sender_id: user?.id || '',
        sender_name: user?.name || user?.email || 'Agent',
        sender_role: 'agent',
        message: text,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimisticMsg]);

      // Socket emit for real-time
      const socket = getSocket();
      if (socket) {
        socket.emit('support:send-message', {
          conversationId: activeConversation.id,
          message: text,
          senderRole: 'agent',
        });
      }

      // Persist via REST API
      if (isInternal) {
        await api.ai.sendInternalMessage(activeConversation.id, text);
      } else {
        await api.ai.sendMessage(activeConversation.id, text);
      }
    } catch (error) {
      logger.error('Error sending message:', error);
      showToast(TOAST.SUPPORT.MESSAGE_ERROR, 'error');
    }
  };

  // ========== CLOSE CONVERSATION ==========
  const closeConversation = async (convId: string) => {
    try {
      const socket = getSocket();
      if (socket) {
        socket.emit('support:close-conversation', { conversationId: convId });
      }
      setConversations((prev) => prev.map((c) => (c.id === convId ? { ...c, status: 'closed' } : c)));
      setInternalConversations((prev) => prev.map((c) => (c.id === convId ? { ...c, status: 'closed' } : c)));
      if (activeConversation?.id === convId) {
        setActiveConversation((prev) => (prev ? { ...prev, status: 'closed' } : null));
      }
      showToast(TOAST.COMM.CHAT_CLOSED, 'success');
    } catch (error) {
      showToast(mapError(error, 'conversation'), 'error');
    }
  };

  // ========== START INTERNAL CHAT ==========
  const startInternalChat = async (targetAgent: AgentInfo) => {
    try {
      const data = await api.ai.createInternalConversation(targetAgent.id);
      const convId = data.conversationId;

      // Close modal
      setShowNewInternalModal(false);
      setAgentSearch('');

      // Join socket room
      const socket = getSocket();
      if (socket) {
        socket.emit('support:join-conversation', { conversationId: convId });
        // Notify the other agent
        socket.emit('support:start-conversation', { conversationId: convId });
      }

      // Refresh list and open the conversation
      await loadInternalConversations();
      const newConv: SupportConversation = {
        id: convId,
        tenant_id: targetAgent.tenant_id || '',
        user_id: user?.id || '',
        user_name: user?.name || user?.email || 'Moi',
        user_email: user?.email || '',
        status: 'assigned',
        assigned_agent_id: targetAgent.id,
        agent_name: targetAgent.name || targetAgent.email,
        ticket_id: null,
        conversation_type: 'internal',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      openConversation(newConv);

      if (data.existing) {
        showToast(TOAST.COMM.CHAT_CONVERSATION_EXISTS(targetAgent.name || targetAgent.email), 'info');
      } else {
        showToast(TOAST.COMM.CHAT_CONVERSATION_STARTED(targetAgent.name || targetAgent.email), 'success');
      }
    } catch (error) {
      logger.error('Error starting internal chat:', error);
      showToast(TOAST.COMM.CHAT_ERROR, 'error');
    }
  };

  // ========== RENDER HELPERS ==========
  const currentConversations = chatTab === 'support' ? conversations : internalConversations;
  const filteredConversations = currentConversations.filter((c) => {
    if (statusFilter === 'all') return true;
    if (chatTab === 'internal' && statusFilter === 'open') return c.status === 'assigned';
    return c.status === statusFilter;
  });

  const filteredAgents = agents.filter(
    (a) =>
      !agentSearch ||
      (a.name || a.email || '').toLowerCase().includes(agentSearch.toLowerCase()) ||
      (a.role || '').toLowerCase().includes(agentSearch.toLowerCase())
  );

  const reloadCurrent = () => {
    if (chatTab === 'support') loadConversations();
    else loadInternalConversations();
  };

  // Helper to get display name for internal conversations
  const getInternalDisplayName = (conv: SupportConversation) => {
    // If I'm the initiator, show the agent name; otherwise show the user name
    if (conv.user_id === user?.id) {
      return conv.agent_name || 'Agent';
    }
    return conv.user_name || conv.user_email || 'Agent';
  };

  const formatTime = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'HH:mm', { locale: fr });
    } catch {
      return '';
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'dd MMM yyyy HH:mm', { locale: fr });
    } catch {
      return '';
    }
  };

  // ========== RENDER ==========
  return (
    <div className="flex-1 flex h-full overflow-hidden">
      {/* ---- LEFT: CONVERSATION LIST ---- */}
      <div
        className={`${showMobileList ? 'flex' : 'hidden'} md:flex flex-col w-full md:w-80 lg:w-96 border-r border-[var(--border)] bg-[var(--bg-surface)]`}
      >
        {/* Header */}
        <div className="p-4 border-b border-[var(--border)]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Headset className="w-5 h-5 text-[var(--primary)]" />
              <h3 className="font-bold text-[var(--text-primary)]">Live Chat</h3>
              <span className={`flex items-center gap-1 text-xs ${isConnected ? 'text-green-500' : 'text-red-500'}`}>
                {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {chatTab === 'internal' && (
                <button
                  onClick={() => setShowNewInternalModal(true)}
                  className="p-1.5 bg-[var(--primary)] text-white hover:bg-[var(--primary-light)] rounded-lg"
                  title="Nouvelle conversation"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={reloadCurrent}
                className="p-1.5 hover:bg-[var(--bg-elevated)] rounded-lg"
                title="Rafraîchir"
              >
                <RefreshCw className={`w-4 h-4 text-[var(--text-secondary)] ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Support / Internal tab switcher */}
          <div className="flex gap-1 mb-3 bg-[var(--bg-elevated)] rounded-lg p-0.5">
            <button
              onClick={() => {
                setChatTab('support');
                setActiveConversation(null);
                setMessages([]);
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
                chatTab === 'support'
                  ? 'bg-[var(--bg-elevated)] text-[var(--primary)] dark:text-[var(--primary)] shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Headset className="w-3.5 h-3.5" /> Support
            </button>
            <button
              onClick={() => {
                setChatTab('internal');
                setActiveConversation(null);
                setMessages([]);
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
                chatTab === 'internal'
                  ? 'bg-[var(--bg-elevated)] text-green-600 dark:text-green-400 shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Users className="w-3.5 h-3.5" /> Équipe
            </button>
          </div>

          {/* Status filter */}
          <div className="flex gap-1">
            {(chatTab === 'support'
              ? [
                  { value: 'open' as const, label: 'En attente' },
                  { value: 'assigned' as const, label: 'En cours' },
                  { value: 'all' as const, label: 'Toutes' },
                ]
              : [
                  { value: 'assigned' as const, label: 'Actives' },
                  { value: 'all' as const, label: 'Toutes' },
                ]
            ).map((f) => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
                  statusFilter === f.value
                    ? chatTab === 'support'
                      ? 'bg-[var(--primary)] text-white'
                      : 'bg-green-600 text-white'
                    : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] dark:hover:bg-slate-700'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-5 h-5 text-[var(--text-muted)] animate-spin" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="text-center py-12 px-4">
              <MessageSquare className="w-10 h-10 text-slate-300 dark:text-[var(--text-secondary)] mx-auto mb-3" />
              <p className="text-sm text-[var(--text-secondary)]">
                {chatTab === 'internal' ? "Aucune conversation d'équipe" : 'Aucune conversation de support'}
              </p>
              {chatTab === 'internal' && (
                <button
                  onClick={() => setShowNewInternalModal(true)}
                  className="mt-3 text-xs text-[var(--primary)] hover:underline flex items-center gap-1 mx-auto"
                >
                  <Plus className="w-3 h-3" /> Démarrer une conversation
                </button>
              )}
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const displayName =
                chatTab === 'internal'
                  ? getInternalDisplayName(conv)
                  : conv.user_name || conv.user_email || 'Utilisateur';
              const isInternal = chatTab === 'internal';

              return (
                <button
                  key={conv.id}
                  onClick={() => openConversation({ ...conv, conversation_type: isInternal ? 'internal' : 'support' })}
                  className={`w-full text-left p-4 border-b border-[var(--border)] border-[var(--border)] tr-hover/50 transition-colors ${
                    activeConversation?.id === conv.id
                      ? 'bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] border-l-2 border-l-blue-500'
                      : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="relative">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center ${isInternal ? 'bg-green-100 dark:bg-green-900/30' : 'bg-slate-200 bg-[var(--bg-elevated)]'}`}
                        >
                          {isInternal ? (
                            <Users className="w-4 h-4 text-green-600" />
                          ) : (
                            <User className="w-4 h-4 text-[var(--text-secondary)]" />
                          )}
                        </div>
                        <div
                          className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[var(--bg-surface)] ${STATUS_CONFIG[conv.status]?.dot || 'bg-slate-400'}`}
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{displayName}</p>
                        <p className="text-xs text-[var(--text-secondary)] truncate">
                          {conv.last_message || 'Nouvelle conversation'}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-[10px] text-[var(--text-muted)]">
                        {formatTime(conv.updated_at || conv.created_at)}
                      </span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full ${STATUS_CONFIG[conv.status]?.bg} ${STATUS_CONFIG[conv.status]?.color}`}
                      >
                        {STATUS_CONFIG[conv.status]?.label}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ---- RIGHT: CHAT AREA ---- */}
      <div className={`${!showMobileList ? 'flex' : 'hidden'} md:flex flex-col flex-1 bg-[var(--bg-elevated)]`}>
        {activeConversation ? (
          <>
            {/* Chat Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-[var(--bg-surface)] border-b border-[var(--border)] shadow-sm">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setShowMobileList(true);
                  }}
                  className="md:hidden p-1"
                  title="Retour à la liste"
                >
                  <ChevronLeft className="w-5 h-5 text-[var(--text-secondary)]" />
                </button>
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center ${activeConversation.conversation_type === 'internal' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)]'}`}
                >
                  {activeConversation.conversation_type === 'internal' ? (
                    <Users className="w-5 h-5 text-green-600" />
                  ) : (
                    <User className="w-5 h-5 text-[var(--primary)]" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-bold text-[var(--text-primary)]">
                    {activeConversation.conversation_type === 'internal'
                      ? getInternalDisplayName(activeConversation)
                      : activeConversation.user_name || activeConversation.user_email || 'Utilisateur'}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                    {activeConversation.conversation_type === 'internal' && (
                      <span className="text-green-600 font-medium">Interne</span>
                    )}
                    <span className={`flex items-center gap-1 ${STATUS_CONFIG[activeConversation.status]?.color}`}>
                      <Circle className="w-2 h-2 fill-current" />
                      {STATUS_CONFIG[activeConversation.status]?.label}
                    </span>
                    <span>•</span>
                    <span>{formatDate(activeConversation.created_at)}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {activeConversation.status !== 'closed' && (
                  <button
                    onClick={() => closeConversation(activeConversation.id)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="Fermer la conversation"
                  >
                    <X className="w-3.5 h-3.5" /> Fermer
                  </button>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {isLoadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <RefreshCw className="w-6 h-6 text-[var(--text-muted)] animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-[var(--text-muted)]">
                  <MessageSquare className="w-10 h-10 mb-2 opacity-50" />
                  <p className="text-sm">Aucun message pour le moment</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isSelf = msg.sender_id === user?.id;
                  const isSystem = msg.sender_role === 'system';

                  if (isSystem) {
                    return (
                      <div key={msg.id} className="flex justify-center">
                        <span className="text-xs text-[var(--text-muted)] bg-[var(--bg-elevated)] px-3 py-1 rounded-full">
                          {msg.message}
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div key={msg.id} className={`flex ${isSelf ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[75%] ${
                          isSelf
                            ? 'bg-[var(--primary)] text-white rounded-2xl rounded-br-md'
                            : 'bg-[var(--bg-elevated)] text-[var(--text-primary)] rounded-2xl rounded-bl-md shadow-sm border border-[var(--border)]'
                        } px-4 py-2.5`}
                      >
                        {!isSelf && (
                          <p className="text-xs font-semibold text-[var(--primary)] dark:text-[var(--primary)] mb-1">
                            {msg.sender_name || 'Utilisateur'}
                          </p>
                        )}
                        <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                        <p
                          className={`text-[10px] mt-1 ${isSelf ? 'text-[var(--primary)]' : 'text-[var(--text-muted)]'}`}
                        >
                          {formatTime(msg.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              {/* Typing indicator */}
              {typingUser && (
                <div className="flex justify-start">
                  <div className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-2xl rounded-bl-md px-4 py-2.5 shadow-sm">
                    <p className="text-xs text-[var(--text-secondary)] italic">{typingUser} est en train d'écrire...</p>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input (only if not closed) */}
            {activeConversation.status !== 'closed' ? (
              <div className="p-3 bg-[var(--bg-surface)] border-t border-[var(--border)]">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => {
                      setMessageInput(e.target.value);
                      // Send typing indicator
                      const socket = getSocket();
                      if (socket && activeConversation) {
                        socket.emit('support:typing', { conversationId: activeConversation.id });
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    className="flex-1 px-4 py-2.5 border border-[var(--border)] rounded-xl bg-[var(--bg-elevated)] text-sm text-[var(--text-primary)] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    placeholder={
                      activeConversation.conversation_type === 'internal' ? 'Message...' : 'Répondre au client...'
                    }
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!messageInput.trim()}
                    title="Envoyer"
                    className="p-2.5 bg-[var(--primary)] text-white rounded-xl hover:bg-[var(--primary-light)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-[var(--bg-elevated)] border-t border-[var(--border)] text-center">
                <p className="text-sm text-[var(--text-secondary)] flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Conversation fermée
                </p>
              </div>
            )}
          </>
        ) : (
          /* No conversation selected */
          <div className="flex-1 flex flex-col items-center justify-center text-[var(--text-muted)] dark:text-[var(--text-secondary)]">
            {chatTab === 'internal' ? (
              <Users className="w-16 h-16 mb-4 opacity-30" />
            ) : (
              <Headset className="w-16 h-16 mb-4 opacity-30" />
            )}
            <h3 className="text-lg font-semibold mb-1">
              {chatTab === 'internal' ? 'Chat Équipe' : 'Support Live Chat'}
            </h3>
            <p className="text-sm">Sélectionnez une conversation pour commencer</p>
            {chatTab === 'internal' && (
              <button
                onClick={() => setShowNewInternalModal(true)}
                className="mt-4 flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
              >
                <Plus className="w-4 h-4" /> Nouvelle conversation
                {/* ---- MODAL: New Internal Conversation ---- */}
                {showNewInternalModal && (
                  <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
                    onClick={() => setShowNewInternalModal(false)}
                  >
                    <div
                      className="bg-[var(--bg-surface)] rounded-xl shadow-2xl w-full max-w-md mx-4 max-h-[70vh] flex flex-col"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
                        <div className="flex items-center gap-2">
                          <Users className="w-5 h-5 text-green-600" />
                          <h3 className="font-bold text-[var(--text-primary)]">Nouvelle conversation</h3>
                        </div>
                        <button
                          onClick={() => setShowNewInternalModal(false)}
                          className="p-1 hover:bg-[var(--bg-elevated)] rounded-lg"
                          title="Fermer"
                        >
                          <X className="w-4 h-4 text-[var(--text-secondary)]" />
                        </button>
                      </div>

                      {/* Search */}
                      <div className="p-3 border-b border-[var(--border)] border-[var(--border)]">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                          <input
                            type="text"
                            value={agentSearch}
                            onChange={(e) => setAgentSearch(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--bg-elevated)] text-sm text-[var(--text-primary)] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                            placeholder="Rechercher un collègue..."
                            autoFocus
                          />
                        </div>
                      </div>

                      {/* Agent list */}
                      <div className="flex-1 overflow-y-auto">
                        {filteredAgents.length === 0 ? (
                          <div className="text-center py-8 text-[var(--text-muted)]">
                            <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">Aucun agent trouvé</p>
                          </div>
                        ) : (
                          filteredAgents.map((agent) => (
                            <button
                              key={agent.id}
                              onClick={() => startInternalChat(agent)}
                              className="w-full text-left p-3 tr-hover/50 border-b border-[var(--border)] border-[var(--border)] transition-colors flex items-center gap-3"
                            >
                              <div className="w-9 h-9 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                                <User className="w-4.5 h-4.5 text-green-600" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                                  {agent.name || agent.email}
                                </p>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-[var(--text-secondary)] truncate">{agent.email}</span>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--bg-elevated)] text-[var(--text-secondary)] font-medium">
                                    {ROLE_LABELS[agent.role?.toUpperCase()] || agent.role}
                                  </span>
                                </div>
                              </div>
                              <MessageSquare className="w-4 h-4 text-green-500 shrink-0" />
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </button>
            )}
            <p className="text-xs mt-2 text-[var(--text-muted)]">
              {filteredConversations.length} conversation{filteredConversations.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
