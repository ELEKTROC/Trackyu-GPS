import React, { useState, useEffect, useRef } from 'react';
import { Send, Zap, Clock, MessageSquare, Loader2, Plus } from 'lucide-react';
import { useDataContext } from '../../../contexts/DataContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import { api } from '../../../services/apiLazy';
import type { TicketMessage, Ticket } from '../../../types';
import { TOAST } from '../../../constants/toastMessages';
import { mapError } from '../../../utils/errorMapper';
import { logger } from '../../../utils/logger';
import { useQueryClient } from '@tanstack/react-query';

interface Macro {
  id: string;
  label: string;
  text: string;
  category?: string;
  isActive?: boolean;
}

interface TicketChatPanelProps {
  ticketId: string;
  className?: string;
  readOnly?: boolean;
  onPlanIntervention?: (data: { ticketId: string; clientId: string; type: string; vehicleId?: string }) => void;
}

export const TicketChatPanel: React.FC<TicketChatPanelProps> = ({
  ticketId,
  className = '',
  readOnly = false,
  onPlanIntervention,
}) => {
  const { tickets } = useDataContext();
  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messageInput, setMessageInput] = useState('');
  const [macros, setMacros] = useState<Macro[]>([]);
  const [isLoadingMacros, setIsLoadingMacros] = useState(false);

  const ticket = tickets.find((t) => t.id === ticketId);
  const isClosed = ticket ? ['RESOLVED', 'CLOSED'].includes(ticket.status) : false;

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ticket?.messages?.length]);

  // Fetch Macros
  useEffect(() => {
    const fetchMacros = async () => {
      setIsLoadingMacros(true);
      try {
        const data = await api.adminFeatures.supportSettings.getMacros();
        setMacros(
          data.map((m: any) => ({
            id: m.id,
            label: m.label,
            text: m.text,
            category: m.category,
            isActive: m.is_active !== false,
          }))
        );
      } catch (error) {
        logger.error('Failed to fetch macros:', error);
      } finally {
        setIsLoadingMacros(false);
      }
    };
    fetchMacros();
  }, []);

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !ticketId || isClosed || readOnly) return;

    try {
      const savedMsg = await api.tickets.addMessage(ticketId, {
        sender: 'SUPPORT',
        text: messageInput,
      });

      // Update local cache
      queryClient.setQueryData(['tickets', user?.tenantId], (old: Ticket[] = []) =>
        old.map((t) =>
          t.id === ticketId
            ? {
                ...t,
                messages: [...(t.messages || []), savedMsg],
                updatedAt: new Date(),
              }
            : t
        )
      );

      showToast(TOAST.SUPPORT.MESSAGE_SENT, 'success');
      setMessageInput('');
    } catch (error) {
      logger.error('Failed to send message:', error);
      showToast(TOAST.SUPPORT.MESSAGE_ERROR, 'error');
    }
  };

  const insertMacro = (text: string) => {
    setMessageInput((prev) => prev + (prev ? ' ' : '') + text);
  };

  if (!ticket) {
    return (
      <div className={`flex flex-col items-center justify-center h-full text-[var(--text-muted)] ${className}`}>
        <MessageSquare className="w-12 h-12 mb-4 opacity-20" />
        <p>Ticket introuvable</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full bg-[var(--bg-surface)] ${className}`}>
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 bg-[var(--bg-surface)]/50">
        {ticket.messages && ticket.messages.length > 0 ? (
          ticket.messages.map((msg: TicketMessage) => (
            <div
              key={msg.id}
              className={`flex ${msg.sender === 'SUPPORT' ? 'justify-end' : msg.sender === 'SYSTEM' ? 'justify-center' : 'justify-start'}`}
            >
              {msg.sender === 'SYSTEM' ? (
                <div className="bg-slate-200 bg-[var(--bg-elevated)] px-4 py-1 rounded-full text-[10px] text-[var(--text-secondary)] max-w-[90%] text-center">
                  {msg.text}
                </div>
              ) : (
                <div
                  className={`max-w-[85%] p-3 rounded-xl text-sm ${
                    msg.sender === 'SUPPORT'
                      ? 'bg-[var(--primary)] text-white rounded-tr-none shadow-sm'
                      : 'bg-[var(--bg-elevated)] border border-[var(--border)] rounded-tl-none shadow-sm text-[var(--text-primary)]'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                  <span
                    className={`text-[10px] block mt-1 text-right ${msg.sender === 'SUPPORT' ? 'text-[var(--primary)]' : 'text-[var(--text-muted)]'}`}
                  >
                    {new Date(msg.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-full opacity-30">
            <MessageSquare className="w-12 h-12 mb-2" />
            <p className="text-sm">Aucun message</p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      {!isClosed && !readOnly && (
        <div className="p-4 border-t border-[var(--border)] bg-[var(--bg-elevated)]">
          {/* Macros & Actions */}
          <div className="flex items-center justify-between mb-2">
            {macros.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase flex items-center shrink-0">
                  <Zap className="w-3 h-3 mr-1" /> Macros:
                </span>
                {macros
                  .filter((m) => m.isActive)
                  .map((m) => (
                    <button
                      key={m.id}
                      onClick={() => insertMacro(m.text)}
                      className="px-3 py-1 bg-[var(--bg-elevated)] hover:bg-[var(--primary-dim)] dark:hover:bg-[var(--primary-dim)]/30 text-[var(--text-secondary)] rounded-full text-[10px] whitespace-nowrap transition-colors border border-transparent hover:border-[var(--border)]"
                    >
                      {m.label}
                    </button>
                  ))}
              </div>
            )}

            {onPlanIntervention && !isClosed && (
              <button
                onClick={() =>
                  onPlanIntervention({
                    ticketId: ticket.id,
                    clientId: ticket.clientId,
                    type: ticket.interventionType || 'Installation',
                    vehicleId: ticket.vehicleId,
                  })
                }
                className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all text-[10px] font-bold ring-1 ring-indigo-500/10 shadow-sm whitespace-nowrap ml-auto"
              >
                <Plus className="w-3 h-3" /> Intervention
              </button>
            )}
          </div>

          <div className="relative">
            <textarea
              className="w-full pl-4 pr-12 py-3 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl text-sm resize-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent outline-none transition-all text-[var(--text-primary)]"
              placeholder="Répondre..."
              rows={2}
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
            />
            <button
              onClick={handleSendMessage}
              disabled={!messageInput.trim()}
              className="absolute bottom-3 right-3 p-2 bg-[var(--primary)] text-white rounded-lg disabled:opacity-50 disabled:bg-slate-400 transition-all shadow-md hover:bg-[var(--primary-light)]"
              title="Envoyer le message"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {isClosed && (
        <div className="p-4 bg-[var(--bg-elevated)] border-t border-[var(--border)] text-center text-xs text-[var(--text-secondary)] italic">
          Ce ticket est {ticket.status === 'RESOLVED' ? 'résolu' : 'clôturé'}. Les réponses sont désactivées.
        </div>
      )}
    </div>
  );
};
