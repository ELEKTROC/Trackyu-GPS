import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Send,
  Clock,
  ChevronLeft,
  AlertTriangle,
  CheckCircle,
  Loader2,
  User,
  Headset,
  Bot,
  RefreshCw,
} from 'lucide-react';
import { api } from '../../../services/apiLazy';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import { TOAST } from '../../../constants/toastMessages';
import { mapError } from '../../../utils/errorMapper';
import type { Ticket, TicketMessage } from '../../../types';

// ============================================================================
// STATUS / PRIORITY CONFIG
// ============================================================================
const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  OPEN: {
    label: 'Ouvert',
    color:
      'bg-[var(--primary-dim)] text-[var(--primary)] border-[var(--primary)] dark:bg-[var(--primary-dim)] dark:text-[var(--primary)] dark:border-[var(--primary)]',
    icon: <MessageSquare className="w-3 h-3" />,
  },
  IN_PROGRESS: {
    label: 'En cours',
    color:
      'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700',
    icon: <Loader2 className="w-3 h-3 animate-spin" />,
  },
  WAITING_CLIENT: {
    label: 'En attente de votre réponse',
    color:
      'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700',
    icon: <AlertTriangle className="w-3 h-3" />,
  },
  RESOLVED: {
    label: 'Résolu',
    color:
      'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700',
    icon: <CheckCircle className="w-3 h-3" />,
  },
  CLOSED: {
    label: 'Clôturé',
    color:
      'bg-slate-100 text-[var(--text-secondary)] border-[var(--border)] bg-[var(--bg-elevated)] dark:text-[var(--text-muted)] border-[var(--border)]',
    icon: <CheckCircle className="w-3 h-3" />,
  },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  CRITICAL: { label: 'Critique', color: 'bg-red-100 text-red-700 border-red-300' },
  HIGH: { label: 'Haute', color: 'bg-orange-100 text-orange-700 border-orange-300' },
  MEDIUM: { label: 'Moyenne', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  LOW: { label: 'Basse', color: 'bg-green-100 text-green-700 border-green-300' },
};

const SENDER_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode; align: string }> = {
  CLIENT: {
    label: 'Vous',
    color: 'bg-[var(--primary)] text-white',
    icon: <User className="w-3.5 h-3.5" />,
    align: 'justify-end',
  },
  SUPPORT: {
    label: 'Support',
    color: 'bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border)]',
    icon: <Headset className="w-3.5 h-3.5" />,
    align: 'justify-start',
  },
  SYSTEM: {
    label: 'Système',
    color: 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border)]',
    icon: <Bot className="w-3.5 h-3.5" />,
    align: 'justify-center',
  },
};

// ============================================================================
// COMPONENT
// ============================================================================
export const MyTicketsView: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load tickets
  const loadTickets = async () => {
    setLoading(true);
    try {
      const data = await api.tickets.myTickets();
      setTickets(data);
    } catch (e) {
      showToast(TOAST.CRUD.ERROR_LOAD('tickets'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedTicketId, tickets]);

  const selectedTicket = tickets.find((t) => t.id === selectedTicketId);

  // Send reply
  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedTicketId || sending) return;
    setSending(true);
    try {
      const newMsg = await api.tickets.clientReply(selectedTicketId, replyText.trim());
      // Update local state
      setTickets((prev) =>
        prev.map((t) =>
          t.id === selectedTicketId ? { ...t, messages: [...(t.messages || []), newMsg], updatedAt: new Date() } : t
        )
      );
      setReplyText('');
      showToast(TOAST.SUPPORT.MESSAGE_SENT, 'success');
    } catch (e: unknown) {
      showToast(mapError(e, 'message'), 'error');
    } finally {
      setSending(false);
    }
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return (
      d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) +
      ' à ' +
      d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    );
  };

  const formatDateShort = (date: Date | string) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffH = diffMs / (1000 * 60 * 60);
    if (diffH < 1) return `Il y a ${Math.max(1, Math.round(diffMs / 60000))} min`;
    if (diffH < 24) return `Il y a ${Math.round(diffH)}h`;
    if (diffH < 48) return 'Hier';
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  };

  // ======== EMPTY STATE ========
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-[var(--text-muted)]">
        <Loader2 className="w-8 h-8 animate-spin mb-3" />
        <p>Chargement de vos tickets...</p>
      </div>
    );
  }

  if (tickets.length === 0 && !selectedTicketId) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-[var(--text-muted)]">
        <MessageSquare className="w-16 h-16 mb-4 opacity-20" />
        <p className="text-lg font-medium mb-1">Aucun ticket</p>
        <p className="text-sm">Vous n'avez aucun ticket support pour le moment.</p>
        <p className="text-xs mt-2">Si vous avez besoin d'aide, contactez votre revendeur.</p>
      </div>
    );
  }

  // ======== TICKET DETAIL ========
  if (selectedTicket) {
    const status = STATUS_CONFIG[selectedTicket.status] || STATUS_CONFIG.OPEN;
    const isClosed = selectedTicket.status === 'CLOSED';

    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-[var(--border)]">
          <button
            onClick={() => setSelectedTicketId(null)}
            className="p-2 hover:bg-[var(--bg-elevated)] rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs text-[var(--text-muted)]">{selectedTicket.id}</span>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold uppercase border ${status.color}`}
              >
                {status.icon} {status.label}
              </span>
              {selectedTicket.priority && (
                <span
                  className={`px-1.5 py-0.5 rounded text-xs font-semibold uppercase border ${PRIORITY_CONFIG[selectedTicket.priority]?.color || ''}`}
                >
                  {PRIORITY_CONFIG[selectedTicket.priority]?.label || selectedTicket.priority}
                </span>
              )}
            </div>
            <h3 className="font-semibold text-[var(--text-primary)] truncate">{selectedTicket.subject}</h3>
          </div>
        </div>

        {/* Description */}
        {selectedTicket.description && (
          <div className="mt-3 p-3 bg-[var(--bg-elevated)] rounded-lg text-sm text-[var(--text-secondary)] border border-[var(--border)]">
            {selectedTicket.description}
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto mt-4 space-y-3 pr-1">
          {(selectedTicket.messages || []).length === 0 ? (
            <div className="text-center text-[var(--text-muted)] py-10">
              <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Aucun message dans ce ticket.</p>
              <p className="text-xs mt-1">Envoyez un message pour commencer la conversation.</p>
            </div>
          ) : (
            (selectedTicket.messages || []).map((msg: TicketMessage) => {
              const senderConf = SENDER_CONFIG[msg.sender] || SENDER_CONFIG.SYSTEM;
              const isClient = msg.sender === 'CLIENT';
              const isSystem = msg.sender === 'SYSTEM';

              if (isSystem) {
                return (
                  <div key={msg.id} className="flex justify-center">
                    <div className="px-3 py-1.5 bg-[var(--bg-elevated)] rounded-full text-[11px] text-[var(--text-secondary)] italic max-w-[80%] text-center">
                      {msg.text}
                    </div>
                  </div>
                );
              }

              return (
                <div key={msg.id} className={`flex ${isClient ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] ${isClient ? 'order-1' : 'order-1'}`}>
                    <div className={`flex items-center gap-1.5 mb-1 ${isClient ? 'justify-end' : 'justify-start'}`}>
                      <span className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
                        {senderConf.icon}
                        {senderConf.label}
                      </span>
                      <span className="text-xs text-[var(--text-muted)]">{formatDate(msg.date)}</span>
                    </div>
                    <div
                      className={`px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap ${senderConf.color} ${
                        isClient ? 'rounded-br-md' : 'rounded-bl-md'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Reply Box */}
        {!isClosed ? (
          <div className="mt-3 pt-3 border-t border-[var(--border)]">
            <div className="flex gap-2">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendReply()}
                placeholder="Écrivez votre réponse..."
                className="flex-1 px-4 py-2.5 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl text-sm focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent outline-none"
                disabled={sending}
              />
              <button
                onClick={handleSendReply}
                disabled={!replyText.trim() || sending}
                className="px-4 py-2.5 bg-[var(--primary)] hover:bg-[var(--primary-light)] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl flex items-center gap-2 text-sm font-medium transition-colors"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Envoyer
              </button>
            </div>
            {selectedTicket.status === 'WAITING_CLIENT' && (
              <p className="mt-2 text-xs text-purple-600 dark:text-purple-400 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                L'équipe support attend votre réponse
              </p>
            )}
          </div>
        ) : (
          <div className="mt-3 pt-3 border-t border-[var(--border)]">
            <p className="text-sm text-[var(--text-secondary)] text-center py-2">
              Ce ticket est clôturé. Si le problème persiste, veuillez contacter votre revendeur.
            </p>
          </div>
        )}
      </div>
    );
  }

  // ======== TICKET LIST ========
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Mes tickets support</h2>
          <p className="text-sm text-[var(--text-secondary)]">{tickets.length} ticket(s)</p>
        </div>
        <button
          onClick={loadTickets}
          className="p-2 hover:bg-[var(--bg-elevated)] rounded-lg transition-colors text-[var(--text-secondary)]"
          title="Actualiser"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2">
        {tickets.map((ticket) => {
          const status = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.OPEN;
          const unreadCount = (ticket.messages || []).filter((m) => m.sender === 'SUPPORT').length;
          const lastMessage = (ticket.messages || []).slice(-1)[0];

          return (
            <div
              key={ticket.id}
              onClick={() => setSelectedTicketId(ticket.id)}
              className="p-4 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl cursor-pointer hover:border-[var(--primary)] dark:hover:border-[var(--primary)] hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs text-[var(--text-muted)]">{ticket.id}</span>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold uppercase border ${status.color}`}
                  >
                    {status.icon} {status.label}
                  </span>
                  {ticket.priority && (
                    <span
                      className={`px-1.5 py-0.5 rounded text-xs font-semibold uppercase border ${PRIORITY_CONFIG[ticket.priority]?.color || ''}`}
                    >
                      {PRIORITY_CONFIG[ticket.priority]?.label}
                    </span>
                  )}
                </div>
                <span className="text-xs text-[var(--text-muted)] whitespace-nowrap ml-2">
                  {formatDateShort(ticket.updatedAt || ticket.createdAt)}
                </span>
              </div>

              <p className="font-medium text-sm text-[var(--text-primary)] mb-1 line-clamp-1">{ticket.subject}</p>

              {lastMessage && (
                <p className="text-xs text-[var(--text-secondary)] line-clamp-1 flex items-center gap-1">
                  {lastMessage.sender === 'SUPPORT' ? (
                    <Headset className="w-3 h-3 text-[var(--primary)] shrink-0" />
                  ) : lastMessage.sender === 'CLIENT' ? (
                    <User className="w-3 h-3 text-[var(--text-muted)] shrink-0" />
                  ) : (
                    <Bot className="w-3 h-3 text-[var(--text-muted)] shrink-0" />
                  )}
                  {lastMessage.text}
                </p>
              )}

              <div className="flex items-center gap-3 mt-2 text-xs text-[var(--text-muted)]">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Créé le {new Date(ticket.createdAt).toLocaleDateString('fr-FR')}
                </span>
                {ticket.category && (
                  <span className="px-1.5 py-0.5 bg-[var(--bg-elevated)] rounded text-xs">{ticket.category}</span>
                )}
                <span className="flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" /> {(ticket.messages || []).length}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
