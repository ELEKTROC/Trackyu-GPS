
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Vehicle } from '../../../types';
import { askFleetAssistant, askFleetAssistantStream } from '../../../services/geminiService';
import { getSocket } from '../../../services/socket';
import { useAuth } from '../../../contexts/AuthContext';
import { API_BASE_URL } from '../../../utils/apiConfig';
import { Send, Bot, User, Headset, ToggleLeft, ToggleRight, WifiOff, Wifi } from 'lucide-react';
import { Card } from '../../../components/Card';
import ReactMarkdown from 'react-markdown';
import { logger } from '../../../utils/logger';

interface AiAssistantProps {
  vehicles: Vehicle[];
}

interface Message {
  role: 'user' | 'ai' | 'support' | 'system';
  text: string;
  timestamp: Date;
  senderName?: string;
}

type Mode = 'ai' | 'human';

export const AiAssistant: React.FC<AiAssistantProps> = ({ vehicles }) => {
  const { user } = useAuth();
  const [mode, setMode] = useState<Mode>('ai');
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', text: 'Bonjour ! Je suis l\'assistant IA TrackYu GPS. Posez-moi une question sur vos véhicules ou basculez en mode Support pour parler à un agent.', timestamp: new Date() }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [aiConversationId, setAiConversationId] = useState<string | undefined>(undefined);
  const [isConnected, setIsConnected] = useState(false);
  const [agentTyping, setAgentTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, agentTyping]);

  // Connexion Socket.IO pour le mode support humain
  useEffect(() => {
    if (mode !== 'human') return;

    const socket = getSocket();
    
    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);
    
    const handleNewMessage = (data: { 
      conversationId: string; 
      senderId: string; 
      senderName: string; 
      senderRole: string; 
      message: string; 
      timestamp: string 
    }) => {
      // Ne pas afficher nos propres messages (déjà ajoutés localement)
      if (data.senderId === user?.id) return;
      
      setMessages(prev => [...prev, {
        role: data.senderRole === 'agent' ? 'support' : 'user',
        text: data.message,
        timestamp: new Date(data.timestamp),
        senderName: data.senderName
      }]);
      setAgentTyping(false);
    };

    const handleTyping = (data: { userId: string; userName: string }) => {
      if (data.userId !== user?.id) {
        setAgentTyping(true);
        // Reset typing indicator après 3s
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setAgentTyping(false), 3000);
      }
    };

    const handleConversationClosed = (data: { conversationId: string; closedBy: string }) => {
      setMessages(prev => [...prev, {
        role: 'system',
        text: `La conversation a été fermée par ${data.closedBy}. Merci pour votre patience !`,
        timestamp: new Date()
      }]);
      setConversationId(null);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('support:new-message', handleNewMessage);
    socket.on('support:typing', handleTyping);
    socket.on('support:conversation-closed', handleConversationClosed);

    setIsConnected(socket.connected);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('support:new-message', handleNewMessage);
      socket.off('support:typing', handleTyping);
      socket.off('support:conversation-closed', handleConversationClosed);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [mode, user?.id]);

  // Démarrer une conversation de support
  const startSupportConversation = useCallback(async () => {
    if (conversationId) return conversationId;
    
    try {
      const token = localStorage.getItem('fleet_token') || localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/ai/support-conversation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });

      if (response.ok) {
        const data = await response.json();
        const newConvId = data.conversationId;
        setConversationId(newConvId);
        
        // Rejoindre la room Socket.IO de cette conversation
        const socket = getSocket();
        socket.emit('support:start-conversation', { conversationId: newConvId });
        
        return newConvId;
      }
    } catch (error) {
      logger.error('Erreur création conversation support:', error);
    }
    
    // Fallback : générer un ID local si le backend n'est pas disponible
    const fallbackId = `local-${Date.now()}`;
    setConversationId(fallbackId);
    return fallbackId;
  }, [conversationId]);

  const handleSwitchMode = () => {
    const newMode = mode === 'ai' ? 'human' : 'ai';
    setMode(newMode);
    
    if (newMode === 'human') {
      setMessages(prev => [...prev, {
        role: 'system',
        text: 'Vous êtes maintenant en mode Support Humain. Un agent sera notifié de votre demande.',
        timestamp: new Date()
      }]);
    } else {
      setMessages(prev => [...prev, {
        role: 'system',
        text: 'Retour au mode Assistant IA. Comment puis-je vous aider ?',
        timestamp: new Date()
      }]);
    }
  };

  const handleSend = async () => {
    if (!query.trim() || isLoading) return;

    const userMsg: Message = { role: 'user', text: query, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    const currentQuery = query;
    setQuery('');
    setIsLoading(true);

    if (mode === 'ai') {
      // Mode IA — Streaming SSE avec fallback classique
      try {
        // Ajouter un message IA vide pour le streaming progressif
        const aiMsgIndex = messages.length + 1; // +1 pour le user msg qu'on vient d'ajouter
        setMessages(prev => [...prev, { role: 'ai', text: '', timestamp: new Date() }]);

        const { fullText, conversationId: newConvId } = await askFleetAssistantStream(
          currentQuery,
          (partialText) => {
            // Mise à jour progressive du dernier message IA
            setMessages(prev => {
              const updated = [...prev];
              const lastAiIdx = updated.length - 1;
              if (updated[lastAiIdx]?.role === 'ai') {
                updated[lastAiIdx] = { ...updated[lastAiIdx], text: partialText };
              }
              return updated;
            });
          },
          aiConversationId
        );

        if (newConvId) setAiConversationId(newConvId);

        // Si le streaming a échoué silencieusement (texte vide), fallback
        if (!fullText) {
          const fallback = await askFleetAssistant(currentQuery);
          setMessages(prev => {
            const updated = [...prev];
            const lastAiIdx = updated.length - 1;
            if (updated[lastAiIdx]?.role === 'ai') {
              updated[lastAiIdx] = { ...updated[lastAiIdx], text: fallback };
            }
            return updated;
          });
        }
      } catch {
        // Fallback : mode non-streaming
        try {
          const response = await askFleetAssistant(currentQuery);
          setMessages(prev => {
            const updated = [...prev];
            const lastAiIdx = updated.length - 1;
            if (updated[lastAiIdx]?.role === 'ai') {
              updated[lastAiIdx] = { ...updated[lastAiIdx], text: response };
            } else {
              updated.push({ role: 'ai', text: response, timestamp: new Date() });
            }
            return updated;
          });
        } catch {
          setMessages(prev => [...prev, { 
            role: 'ai', 
            text: 'Désolé, une erreur est survenue. Veuillez réessayer.', 
            timestamp: new Date() 
          }]);
        }
      }
      setIsLoading(false);
    } else {
      // Mode Support Humain — Envoi via Socket.IO en temps réel
      try {
        const convId = await startSupportConversation();
        const socket = getSocket();
        
        // Sauvegarder le message en DB via le backend
        const token = localStorage.getItem('fleet_token') || localStorage.getItem('token');
        fetch(`${API_BASE_URL}/ai/support-conversation/${convId}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ message: currentQuery })
        }).catch(() => {}); // Fire and forget — le message est aussi émis via socket

        // Émettre le message en temps réel via Socket.IO
        socket.emit('support:send-message', {
          conversationId: convId,
          message: currentQuery,
          senderRole: 'user'
        });

        // Message système si c'est le premier message
        if (!conversationId) {
          setMessages(prev => [...prev, {
            role: 'system',
            text: 'Votre message a été envoyé au support. Un agent vous répondra sous peu.',
            timestamp: new Date()
          }]);
        }
      } catch {
        setMessages(prev => [...prev, {
          role: 'system',
          text: 'Impossible de contacter le support pour le moment. Veuillez réessayer.',
          timestamp: new Date()
        }]);
      }
      setIsLoading(false);
    }
  };

  return (
    <Card className="h-full flex flex-col border-0 shadow-none" title={
        <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
                {mode === 'ai' ? <Bot className="w-5 h-5 text-blue-600" /> : <Headset className="w-5 h-5 text-green-600" />}
                <span className="text-sm font-semibold">{mode === 'ai' ? 'Assistant IA' : 'Support Humain'}</span>
                {mode === 'human' && (
                  <span className="flex items-center gap-1 text-[10px] text-slate-400">
                    {isConnected ? <Wifi className="w-3 h-3 text-green-500" /> : <WifiOff className="w-3 h-3 text-red-400" />}
                    {isConnected ? 'Connecté' : 'Hors ligne'}
                  </span>
                )}
            </div>
            <button 
                onClick={handleSwitchMode}
                className="flex items-center gap-2 text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 px-3 py-1 rounded-full transition-colors"
            >
                {mode === 'ai' ? 'Parler à un humain' : 'Retour à l\'IA'}
                {mode === 'ai' ? <ToggleLeft className="w-4 h-4 text-slate-400" /> : <ToggleRight className="w-4 h-4 text-green-600" />}
            </button>
        </div>
    }>
      <div className="flex-1 overflow-y-auto min-h-[300px] max-h-[400px] p-4 space-y-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg mb-4 custom-scrollbar">
        {messages.map((msg, idx) => {
            const isUser = msg.role === 'user';
            const isSupport = msg.role === 'support';
            const isSystem = msg.role === 'system';
            
            if (isSystem) {
              return (
                <div key={idx} className="flex justify-center">
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded-full">
                    {msg.text}
                  </span>
                </div>
              );
            }
            
            return (
                <div key={idx} className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isUser ? 'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300' : 
                        isSupport ? 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400' : 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                    }`}>
                    {isUser ? <User className="w-4 h-4" /> : isSupport ? <Headset className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </div>
                    <div className={`flex flex-col max-w-[80%] ${isUser ? 'items-end' : 'items-start'}`}>
                        {isSupport && msg.senderName && (
                          <span className="text-[10px] text-green-600 dark:text-green-400 font-medium mb-0.5 px-1">{msg.senderName}</span>
                        )}
                        <div className={`p-3 rounded-lg text-sm shadow-sm ${
                            isUser ? 'bg-blue-600 text-white rounded-tr-none' : 
                            'bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-tl-none'
                        }`}>
                            {(msg.role === 'ai' || msg.role === 'support') ? (
                              <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:my-1 [&>ul]:my-1 [&>ol]:my-1 [&>h1]:text-base [&>h2]:text-sm [&>h3]:text-sm [&>h1]:mt-2 [&>h2]:mt-2 [&>h3]:mt-1">
                                <ReactMarkdown>{msg.text}</ReactMarkdown>
                              </div>
                            ) : msg.text}
                        </div>
                        <span className="text-[10px] text-slate-400 mt-1 px-1">{msg.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                </div>
            );
        })}
        
        {/* Indicateur de frappe (agent ou IA) */}
        {(isLoading || agentTyping) && (
          <div className="flex gap-3">
             <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
               mode === 'human' ? 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400' : 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
             }`}>
              {mode === 'human' ? <Headset className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>
            <div className="p-3 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg shadow-sm rounded-tl-none">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder={mode === 'ai' ? "Posez une question à l'IA..." : "Écrivez au support..."}
          className="w-full pl-4 pr-12 py-3 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
        />
        <button 
          onClick={handleSend}
          disabled={isLoading || !query.trim()}
          className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${mode === 'ai' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'}`}
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </Card>
  );
};
