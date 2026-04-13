import React, { useState } from 'react';
import { useDataContext } from '../../../contexts/DataContext';
import {
  Bell,
  MessageSquare,
  Check,
  Trash2,
  Clock,
  AlertTriangle,
  Info,
  CheckCircle,
  Bot,
  User,
  Search,
  MessageCircle,
  Send,
  X,
  Settings,
  Volume2,
  VolumeX,
  Smartphone,
  Vibrate,
  BellRing,
  BellOff,
  Zap,
  MapPin,
  Fuel,
  Wrench,
} from 'lucide-react';
import { Alert } from '../../../types';
import { useNotificationContext } from '../../../contexts/NotificationContext';
import { TicketChatPanel } from '../../support/components/TicketChatPanel';

type Tab = 'notifications' | 'messages' | 'settings';

export const MyNotificationsView: React.FC = () => {
  const { alerts, tickets, markAlertAsRead, addAlertComment } = useDataContext();
  const notifContext = useNotificationContext();
  const [activeTab, setActiveTab] = useState<Tab>('notifications');
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [commentingAlertId, setCommentingAlertId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [isNewMessageModalOpen, setIsNewMessageModalOpen] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);

  // --- NOTIFICATIONS LOGIC ---
  const sortedAlerts = [...alerts].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const filteredAlerts = filter === 'all' ? sortedAlerts : sortedAlerts.filter((a) => !a.isRead);

  const unreadCount = alerts.filter((a) => !a.isRead).length;

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'text-red-600 bg-[var(--clr-danger-dim)] border-red-100 dark:border-red-900/30';
      case 'HIGH':
        return 'text-orange-600 bg-[var(--clr-warning-dim)] border-orange-100 dark:border-orange-900/30';
      case 'MEDIUM':
        return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-100 dark:border-yellow-900/30';
      default:
        return 'text-[var(--primary)] bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] border-[var(--primary)] dark:border-[var(--primary)]/30';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return AlertTriangle;
      case 'HIGH':
        return AlertTriangle;
      case 'MEDIUM':
        return Info;
      default:
        return Bell;
    }
  };

  // --- MESSAGES LOGIC (TICKETS ONLY) ---
  const messages = [
    ...tickets.map((t) => ({
      id: t.id,
      type: 'TICKET',
      name: `Support - ${t.subject}`,
      lastMessage: t.messages[t.messages.length - 1]?.text || 'Nouveau ticket créé',
      time: new Date(t.updatedAt).toLocaleDateString('fr-FR'),
      unread: t.status === 'WAITING_CLIENT' ? 1 : 0,
      avatar: MessageSquare,
      status: t.status,
    })),
  ];

  return (
    <div className="h-full flex flex-col animate-in fade-in duration-500">
      {/* Header */}
      <div className="p-6 border-b border-[var(--border)] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="page-title">Centre de Notifications</h2>
          <p className="text-[var(--text-secondary)]">Gérez vos alertes et vos échanges avec le support</p>
        </div>

        <div className="flex p-1 bg-[var(--bg-elevated)] rounded-lg">
          <button
            onClick={() => setActiveTab('notifications')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'notifications' ? 'bg-[var(--bg-elevated)] text-[var(--primary)] dark:text-[var(--primary)] shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
          >
            <Bell className="w-4 h-4" />
            Notifications
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{unreadCount}</span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('messages')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'messages' ? 'bg-[var(--bg-elevated)] text-[var(--primary)] dark:text-[var(--primary)] shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
          >
            <MessageSquare className="w-4 h-4" />
            Messages
            <span className="bg-[var(--primary-dim)]0 text-white text-xs px-1.5 py-0.5 rounded-full">1</span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'settings' ? 'bg-[var(--bg-elevated)] text-[var(--primary)] dark:text-[var(--primary)] shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
          >
            <Settings className="w-4 h-4" />
            Paramètres
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden bg-[var(--bg-elevated)]/50">
        {/* NOTIFICATIONS TAB */}
        {activeTab === 'notifications' && (
          <div className="h-full flex flex-col w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <div className="flex gap-2">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filter === 'all' ? 'bg-[var(--bg-elevated)] bg-[var(--bg-elevated)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'}`}
                >
                  Tout
                </button>
                <button
                  onClick={() => setFilter('unread')}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filter === 'unread' ? 'bg-[var(--bg-elevated)] bg-[var(--bg-elevated)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'}`}
                >
                  Non lus
                </button>
              </div>
              <div className="flex gap-3">
                <button className="text-xs text-[var(--text-secondary)] hover:text-red-600 transition-colors flex items-center gap-1">
                  <Trash2 className="w-3 h-3" /> Tout effacer
                </button>
                <button className="text-xs text-[var(--primary)] dark:text-[var(--primary)] hover:underline flex items-center gap-1">
                  <Check className="w-3 h-3" /> Tout marquer comme lu
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
              {filteredAlerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-[var(--text-muted)]">
                  <Bell className="w-12 h-12 mb-4 opacity-20" />
                  <p>Aucune notification</p>
                </div>
              ) : (
                filteredAlerts.map((alert) => {
                  const Icon = getSeverityIcon(alert.severity);
                  const colorClass = getSeverityColor(alert.severity);

                  return (
                    <div
                      key={alert.id}
                      className={`bg-[var(--bg-elevated)] p-4 rounded-xl border shadow-sm transition-all hover:shadow-md flex gap-4 ${alert.isRead ? 'border-[var(--border)] opacity-75' : 'border-[var(--border)] dark:border-[var(--primary)] ring-1 ring-[var(--primary)]/10'}`}
                    >
                      <div className={`p-3 rounded-full h-fit ${colorClass}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <h4 className="font-semibold text-[var(--text-primary)] text-sm">{alert.type}</h4>
                          <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(alert.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-[var(--text-secondary)] mt-1">{alert.message}</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {alert.vehicleName && (
                            <span className="text-xs font-mono bg-[var(--bg-elevated)] px-2 py-0.5 rounded text-[var(--text-secondary)]">
                              {alert.vehicleName}
                            </span>
                          )}
                          {alert.vehiclePlate && (
                            <span className="text-xs font-mono bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] px-2 py-0.5 rounded text-[var(--primary)] dark:text-[var(--primary)] border border-[var(--primary)] dark:border-[var(--primary)]/40">
                              {alert.vehiclePlate}
                            </span>
                          )}
                        </div>

                        {/* Dispay existing comment if any */}
                        {alert.comment && (
                          <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/10 border-l-2 border-yellow-400 text-xs text-yellow-800 dark:text-yellow-200 italic">
                            <div className="font-semibold not-italic mb-0.5">Note:</div>
                            {alert.comment}
                          </div>
                        )}

                        {/* Comment Section */}
                        {commentingAlertId === alert.id ? (
                          <div className="mt-3 flex gap-2 animate-in fade-in slide-in-from-top-2">
                            <input
                              type="text"
                              value={commentText}
                              onChange={(e) => setCommentText(e.target.value)}
                              placeholder="Ajouter un commentaire..."
                              className="flex-1 px-3 py-1.5 text-sm bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--primary)] outline-none"
                              autoFocus
                            />
                            <button
                              onClick={() => {
                                if (commentText.trim()) {
                                  addAlertComment(alert.id, commentText);
                                  setCommentingAlertId(null);
                                  setCommentText('');
                                }
                              }}
                              className="p-1.5 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-light)] transition-colors"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setCommentingAlertId(null);
                                setCommentText('');
                              }}
                              className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-secondary)] dark:hover:text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] rounded-lg transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setCommentingAlertId(alert.id)}
                            className="mt-2 text-xs text-[var(--primary)] dark:text-[var(--primary)] hover:underline flex items-center gap-1"
                          >
                            <MessageCircle className="w-3 h-3" /> Commenter
                          </button>
                        )}
                      </div>
                      {!alert.isRead && (
                        <button
                          onClick={() => markAlertAsRead(alert.id)}
                          className="self-center p-2 text-[var(--primary)] hover:bg-[var(--primary-dim)] dark:hover:bg-[var(--primary-dim)] rounded-full transition-colors"
                          title="Marquer comme lu"
                        >
                          <div className="w-2 h-2 bg-[var(--primary)] rounded-full"></div>
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* MESSAGES TAB */}
        {activeTab === 'messages' && (
          <div className="h-full flex flex-col md:flex-row w-full p-6 gap-6">
            {/* Conversation List */}
            <div className="w-full md:w-1/3 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border)] overflow-hidden flex flex-col">
              <div className="p-4 border-b border-[var(--border)] border-[var(--border)] space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-[var(--text-primary)]">Messages</h3>
                  <button
                    className="p-2 text-[var(--primary)] hover:bg-[var(--primary-dim)] dark:hover:bg-[var(--primary-dim)] rounded-lg transition-colors"
                    title="Nouveau message"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    placeholder="Rechercher un message..."
                    className="w-full pl-9 pr-4 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg text-sm focus:ring-2 focus:ring-[var(--primary)] outline-none"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    onClick={() => setSelectedMessageId(msg.id)}
                    className={`p-4 border-b border-slate-50 border-[var(--border)]/50 hover:bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)]/50 cursor-pointer transition-colors group ${selectedMessageId === msg.id ? 'bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] border-l-4 border-l-blue-600' : ''}`}
                  >
                    <div className="flex gap-3">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[var(--primary-dim)] text-[var(--primary)]">
                          <msg.avatar className="w-5 h-5" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline mb-1">
                          <h4 className="font-bold text-sm text-[var(--text-primary)] truncate">{msg.name}</h4>
                          <span className="text-xs text-[var(--text-muted)]">{msg.time}</span>
                        </div>
                        <p className="text-xs text-[var(--text-secondary)] truncate group-hover:text-[var(--text-primary)] dark:group-hover:text-[var(--text-muted)] transition-colors">
                          {msg.lastMessage}
                        </p>
                      </div>
                      {msg.unread > 0 && (
                        <div className="flex flex-col justify-center">
                          <span className="bg-[var(--primary)] text-white text-xs font-semibold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">
                            {msg.unread}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Chat Area */}
            <div className="hidden md:flex flex-1 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border)] flex-col overflow-hidden">
              {selectedMessageId && tickets.find((t) => t.id === selectedMessageId) ? (
                <TicketChatPanel
                  ticketId={selectedMessageId}
                  onPlanIntervention={(_data) => {
                    // This view typically doesn't plan interventions
                  }}
                />
              ) : selectedMessageId === 'ai-chat' ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                  <div className="w-16 h-16 bg-[var(--clr-info-muted)] rounded-full flex items-center justify-center mb-4">
                    <Bot className="w-8 h-8 text-purple-600" />
                  </div>
                  <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">Assistant IA</h3>
                  <p className="text-[var(--text-secondary)] max-w-xs mb-6">
                    Posez vos questions sur vos véhicules ou vos factures.
                  </p>
                  <div className="w-full max-w-md bg-[var(--bg-elevated)] rounded-xl p-4 border border-dashed border-[var(--border)]">
                    <p className="text-sm text-[var(--text-muted)] italic">Interface IA bientôt disponible...</p>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                  <div className="w-16 h-16 bg-[var(--bg-elevated)] rounded-full flex items-center justify-center mb-4">
                    <MessageSquare className="w-8 h-8 text-[var(--text-muted)]" />
                  </div>
                  <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">Sélectionnez une conversation</h3>
                  <p className="text-[var(--text-secondary)] max-w-xs">
                    Choisissez une conversation dans la liste pour afficher l'historique des échanges.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SETTINGS TAB */}
        {activeTab === 'settings' && (
          <div className="h-full overflow-y-auto p-6">
            <div className="w-full space-y-6">
              {/* Permission Banner */}
              {notifContext.permission !== 'granted' && (
                <div className="bg-[var(--clr-caution-dim)] border border-[var(--clr-caution-border)] rounded-xl p-4 flex items-center gap-4">
                  <div className="p-3 bg-amber-100 dark:bg-amber-800 rounded-full">
                    <BellOff className="w-6 h-6 text-[var(--clr-caution)]" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-amber-800 dark:text-amber-200">Notifications désactivées</h4>
                    <p className="text-sm text-[var(--clr-caution)]">
                      Activez les notifications pour recevoir les alertes en temps réel
                    </p>
                  </div>
                  <button
                    onClick={notifContext.requestPermission}
                    className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium text-sm"
                  >
                    Activer
                  </button>
                </div>
              )}

              {notifContext.permission === 'granted' && (
                <div className="bg-[var(--clr-success-dim)] border border-[var(--clr-success-border)] rounded-xl p-4 flex items-center gap-4">
                  <div className="p-3 bg-green-100 dark:bg-green-800 rounded-full">
                    <BellRing className="w-6 h-6 text-[var(--clr-success)]" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-green-800 dark:text-green-200">Notifications activées</h4>
                    <p className="text-sm text-[var(--clr-success)]">Vous recevrez les alertes push en temps réel</p>
                  </div>
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              )}

              {/* General Settings */}
              <div className="bg-[var(--bg-elevated)] rounded-xl border border-[var(--border)] overflow-hidden">
                <div className="p-4 border-b border-[var(--border)] border-[var(--border)]">
                  <h3 className="font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <Settings className="w-5 h-5" /> Paramètres généraux
                  </h3>
                </div>
                <div className="divide-y divide-[var(--border)]">
                  {/* Push Toggle */}
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] rounded-lg">
                        <Smartphone className="w-5 h-5 text-[var(--primary)] dark:text-[var(--primary)]" />
                      </div>
                      <div>
                        <h4 className="font-medium text-[var(--text-primary)]">Notifications Push</h4>
                        <p className="text-xs text-[var(--text-secondary)]">Recevoir les alertes sur votre appareil</p>
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        notifContext.updatePreferences({ pushEnabled: !notifContext.preferences.pushEnabled })
                      }
                      className={`relative w-12 h-6 rounded-full transition-colors ${notifContext.preferences.pushEnabled ? 'bg-[var(--primary)]' : 'bg-[var(--border)] bg-[var(--bg-elevated)]'}`}
                    >
                      <div
                        className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${notifContext.preferences.pushEnabled ? 'translate-x-7' : 'translate-x-1'}`}
                      />
                    </button>
                  </div>

                  {/* Sound Toggle */}
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[var(--clr-info-muted)] rounded-lg">
                        {notifContext.preferences.soundEnabled ? (
                          <Volume2 className="w-5 h-5 text-[var(--clr-info)]" />
                        ) : (
                          <VolumeX className="w-5 h-5 text-[var(--clr-info)]" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-medium text-[var(--text-primary)]">Son</h4>
                        <p className="text-xs text-[var(--text-secondary)]">Jouer un son lors des alertes</p>
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        notifContext.updatePreferences({ soundEnabled: !notifContext.preferences.soundEnabled })
                      }
                      className={`relative w-12 h-6 rounded-full transition-colors ${notifContext.preferences.soundEnabled ? 'bg-purple-600' : 'bg-[var(--border)] bg-[var(--bg-elevated)]'}`}
                    >
                      <div
                        className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${notifContext.preferences.soundEnabled ? 'translate-x-7' : 'translate-x-1'}`}
                      />
                    </button>
                  </div>

                  {/* Volume Slider */}
                  {notifContext.preferences.soundEnabled && (
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-[var(--text-secondary)]">Volume</span>
                        <span className="text-sm font-medium text-[var(--text-primary)]">
                          {notifContext.preferences.soundVolume}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={notifContext.preferences.soundVolume}
                        onChange={(e) => notifContext.updatePreferences({ soundVolume: parseInt(e.target.value) })}
                        className="w-full h-2 bg-[var(--bg-elevated)] bg-[var(--bg-elevated)] rounded-lg appearance-none cursor-pointer accent-purple-600"
                      />
                    </div>
                  )}

                  {/* Vibration Toggle */}
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[var(--clr-warning-muted)] rounded-lg">
                        <Vibrate className="w-5 h-5 text-[var(--clr-warning)]" />
                      </div>
                      <div>
                        <h4 className="font-medium text-[var(--text-primary)]">Vibration</h4>
                        <p className="text-xs text-[var(--text-secondary)]">Vibrer lors des alertes (mobile)</p>
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        notifContext.updatePreferences({ vibrationEnabled: !notifContext.preferences.vibrationEnabled })
                      }
                      className={`relative w-12 h-6 rounded-full transition-colors ${notifContext.preferences.vibrationEnabled ? 'bg-orange-600' : 'bg-[var(--border)] bg-[var(--bg-elevated)]'}`}
                    >
                      <div
                        className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${notifContext.preferences.vibrationEnabled ? 'translate-x-7' : 'translate-x-1'}`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Alert Types */}
              <div className="bg-[var(--bg-elevated)] rounded-xl border border-[var(--border)] overflow-hidden">
                <div className="p-4 border-b border-[var(--border)] border-[var(--border)]">
                  <h3 className="font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" /> Types d'alertes
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">
                    Choisissez les alertes que vous souhaitez recevoir
                  </p>
                </div>
                <div className="divide-y divide-[var(--border)]">
                  {/* Speeding */}
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[var(--clr-danger-muted)] rounded-lg">
                        <Zap className="w-5 h-5 text-[var(--clr-danger)]" />
                      </div>
                      <div>
                        <h4 className="font-medium text-[var(--text-primary)]">Excès de vitesse</h4>
                        <p className="text-xs text-[var(--text-secondary)]">Dépassement des limites configurées</p>
                      </div>
                    </div>
                    <button
                      onClick={() => notifContext.toggleAlertType('SPEEDING')}
                      className={`relative w-12 h-6 rounded-full transition-colors ${notifContext.preferences.alertTypes.SPEEDING ? 'bg-red-600' : 'bg-[var(--border)] bg-[var(--bg-elevated)]'}`}
                    >
                      <div
                        className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${notifContext.preferences.alertTypes.SPEEDING ? 'translate-x-7' : 'translate-x-1'}`}
                      />
                    </button>
                  </div>

                  {/* Geofence */}
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] rounded-lg">
                        <MapPin className="w-5 h-5 text-[var(--primary)] dark:text-[var(--primary)]" />
                      </div>
                      <div>
                        <h4 className="font-medium text-[var(--text-primary)]">Zones géographiques</h4>
                        <p className="text-xs text-[var(--text-secondary)]">Entrée/sortie de géofences</p>
                      </div>
                    </div>
                    <button
                      onClick={() => notifContext.toggleAlertType('GEOFENCE')}
                      className={`relative w-12 h-6 rounded-full transition-colors ${notifContext.preferences.alertTypes.GEOFENCE ? 'bg-[var(--primary)]' : 'bg-[var(--border)] bg-[var(--bg-elevated)]'}`}
                    >
                      <div
                        className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${notifContext.preferences.alertTypes.GEOFENCE ? 'translate-x-7' : 'translate-x-1'}`}
                      />
                    </button>
                  </div>

                  {/* Fuel Level */}
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[var(--clr-caution-muted)] rounded-lg">
                        <Fuel className="w-5 h-5 text-[var(--clr-caution)]" />
                      </div>
                      <div>
                        <h4 className="font-medium text-[var(--text-primary)]">Niveau carburant</h4>
                        <p className="text-xs text-[var(--text-secondary)]">Carburant bas ou vol détecté</p>
                      </div>
                    </div>
                    <button
                      onClick={() => notifContext.toggleAlertType('FUEL_LEVEL')}
                      className={`relative w-12 h-6 rounded-full transition-colors ${notifContext.preferences.alertTypes.FUEL_LEVEL ? 'bg-amber-600' : 'bg-[var(--border)] bg-[var(--bg-elevated)]'}`}
                    >
                      <div
                        className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${notifContext.preferences.alertTypes.FUEL_LEVEL ? 'translate-x-7' : 'translate-x-1'}`}
                      />
                    </button>
                  </div>

                  {/* Fuel Theft */}
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[var(--clr-danger-muted)] rounded-lg">
                        <Fuel className="w-5 h-5 text-[var(--clr-danger)]" />
                      </div>
                      <div>
                        <h4 className="font-medium text-[var(--text-primary)]">Vol de carburant</h4>
                        <p className="text-xs text-[var(--text-secondary)]">Chute brutale du niveau</p>
                      </div>
                    </div>
                    <button
                      onClick={() => notifContext.toggleAlertType('FUEL_THEFT')}
                      className={`relative w-12 h-6 rounded-full transition-colors ${notifContext.preferences.alertTypes.FUEL_THEFT ? 'bg-red-600' : 'bg-[var(--border)] bg-[var(--bg-elevated)]'}`}
                    >
                      <div
                        className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${notifContext.preferences.alertTypes.FUEL_THEFT ? 'translate-x-7' : 'translate-x-1'}`}
                      />
                    </button>
                  </div>

                  {/* Maintenance */}
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[var(--clr-success-muted)] rounded-lg">
                        <Wrench className="w-5 h-5 text-[var(--clr-success)]" />
                      </div>
                      <div>
                        <h4 className="font-medium text-[var(--text-primary)]">Maintenance</h4>
                        <p className="text-xs text-[var(--text-secondary)]">Rappels de maintenance préventive</p>
                      </div>
                    </div>
                    <button
                      onClick={() => notifContext.toggleAlertType('MAINTENANCE')}
                      className={`relative w-12 h-6 rounded-full transition-colors ${notifContext.preferences.alertTypes.MAINTENANCE ? 'bg-green-600' : 'bg-[var(--border)] bg-[var(--bg-elevated)]'}`}
                    >
                      <div
                        className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${notifContext.preferences.alertTypes.MAINTENANCE ? 'translate-x-7' : 'translate-x-1'}`}
                      />
                    </button>
                  </div>

                  {/* SOS */}
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[var(--clr-danger-muted)] rounded-lg animate-pulse">
                        <AlertTriangle className="w-5 h-5 text-[var(--clr-danger)]" />
                      </div>
                      <div>
                        <h4 className="font-medium text-[var(--text-primary)]">SOS / Urgence</h4>
                        <p className="text-xs text-[var(--text-secondary)]">Bouton panique ou accident détecté</p>
                      </div>
                    </div>
                    <button
                      onClick={() => notifContext.toggleAlertType('SOS')}
                      className={`relative w-12 h-6 rounded-full transition-colors ${notifContext.preferences.alertTypes.SOS ? 'bg-red-600' : 'bg-[var(--border)] bg-[var(--bg-elevated)]'}`}
                    >
                      <div
                        className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${notifContext.preferences.alertTypes.SOS ? 'translate-x-7' : 'translate-x-1'}`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Test Notification */}
              <div className="bg-[var(--bg-elevated)] rounded-xl border border-[var(--border)] p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-[var(--text-primary)]">Tester les notifications</h4>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">
                      Envoyer une notification de test pour vérifier vos paramètres
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      notifContext.notify({
                        title: '🔔 Test de notification',
                        body: 'Les notifications fonctionnent correctement !',
                        type: 'INFO',
                        severity: 'MEDIUM',
                      });
                    }}
                    className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-light)] transition-colors font-medium text-sm flex items-center gap-2"
                  >
                    <Bell className="w-4 h-4" />
                    Tester
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
