import React, { useState } from 'react';
import {
  X,
  Bell,
  Check,
  AlertTriangle,
  Wrench,
  FileText,
  MessageSquare,
  Fuel,
  ShieldAlert,
  Info,
  ChevronRight,
  Trash2,
  CheckCircle,
  Clock,
  Search,
  Filter,
} from 'lucide-react';
import { useTranslation } from '../../../i18n';

export interface Notification {
  id: string;
  type: 'ALERT' | 'WARNING' | 'INFO' | 'SUCCESS';
  category: 'FLEET' | 'MAINTENANCE' | 'FINANCE' | 'SUPPORT' | 'SYSTEM';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  link?: {
    view: string;
    id?: string;
  };
  meta?: any; // Données contextuelles
}

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
  onAction: (notification: Notification) => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onClearAll,
  onAction,
}) => {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<'ALL' | 'UNREAD' | 'TYPE_ALERT' | 'TYPE_WARNING' | 'TYPE_INFO' | 'TYPE_SUCCESS'>(
    'ALL'
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);

  if (!isOpen) return null;

  // Filtrage combiné (Recherche + Type/Status)
  const filteredNotifications = notifications
    .filter((n) => {
      // Filtre Recherche Texte
      const matchesSearch =
        n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        n.message.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      // Filtre Type/Status
      if (filter === 'UNREAD') return !n.read;
      if (filter === 'TYPE_ALERT') return n.type === 'ALERT';
      if (filter === 'TYPE_WARNING') return n.type === 'WARNING';
      if (filter === 'TYPE_INFO') return n.type === 'INFO';
      if (filter === 'TYPE_SUCCESS') return n.type === 'SUCCESS';

      return true;
    })
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  const unreadCount = notifications.filter((n) => !n.read).length;

  const getIcon = (n: Notification) => {
    switch (n.category) {
      case 'FLEET':
        return n.type === 'ALERT' ? (
          <ShieldAlert className="w-5 h-5 text-red-500" />
        ) : (
          <Fuel className="w-5 h-5 text-orange-500" />
        );
      case 'MAINTENANCE':
        return <Wrench className="w-5 h-5 text-[var(--text-secondary)]" />;
      case 'FINANCE':
        return <FileText className="w-5 h-5 text-[var(--primary)]" />;
      case 'SUPPORT':
        return <MessageSquare className="w-5 h-5 text-purple-500" />;
      case 'SYSTEM':
        return n.type === 'SUCCESS' ? (
          <CheckCircle className="w-5 h-5 text-green-500" />
        ) : (
          <Info className="w-5 h-5 text-[var(--text-muted)]" />
        );
      default:
        return <Bell className="w-5 h-5 text-[var(--text-secondary)]" />;
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = (now.getTime() - date.getTime()) / 1000; // secondes

    if (diff < 60) return t('notifications.time.justNow');
    if (diff < 3600) return t('notifications.time.minutesAgo', { count: Math.floor(diff / 60) });
    if (diff < 86400) return t('notifications.time.hoursAgo', { count: Math.floor(diff / 3600) });
    return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100]" onClick={onClose}></div>

      {/* Panel */}
      <div
        className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-[var(--bg-surface)] shadow-2xl z-[105] border-l border-[var(--border)] flex flex-col animate-in slide-in-from-right duration-300"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {/* Header */}
        <div className="p-4 border-b border-[var(--border)] border-[var(--border)] flex justify-between items-center bg-[var(--bg-elevated)] shrink-0">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Bell className="w-5 h-5 text-[var(--text-primary)]" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[var(--bg-surface)]"></span>
              )}
            </div>
            <h2 className="font-bold text-[var(--text-primary)]">{t('notifications.title')}</h2>
            <span className="bg-[var(--bg-elevated)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] px-2 py-0.5 rounded-full text-xs font-bold">
              {unreadCount}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onMarkAllAsRead}
              title={t('notifications.markAllRead')}
              className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-[var(--bg-surface)] rounded-full text-[var(--text-secondary)] transition-colors"
            >
              <Check className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-[var(--bg-surface)] rounded-full text-[var(--text-secondary)] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search & Advanced Filters Area */}
        <div className="p-3 border-b border-[var(--border)] border-[var(--border)] bg-[var(--bg-surface)] shrink-0 flex flex-col gap-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder={t('notifications.searchPlaceholder')}
                className="w-full pl-9 pr-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all placeholder-slate-400 text-[var(--text-primary)]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button
              onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
              className={`p-2 rounded-lg border transition-colors flex items-center justify-center w-10 h-10 ${
                isFilterMenuOpen
                  ? 'bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] border-[var(--border)] dark:border-[var(--primary)] text-[var(--primary)] dark:text-[var(--primary)]'
                  : 'bg-[var(--bg-elevated)] border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'
              }`}
              title={t('notifications.filtersTitle')}
            >
              <Filter className="w-4 h-4" />
            </button>
          </div>

          {isFilterMenuOpen ? (
            <div className="flex gap-2 overflow-x-auto pb-2 pt-1 animate-in slide-in-from-top-1 fade-in duration-200 custom-scrollbar">
              {[
                { id: 'ALL', label: t('notifications.filters.all') },
                { id: 'TYPE_ALERT', label: t('notifications.filters.alerts') },
                { id: 'TYPE_WARNING', label: t('notifications.filters.warnings') },
                { id: 'TYPE_INFO', label: t('notifications.filters.infos') },
                { id: 'TYPE_SUCCESS', label: t('notifications.filters.success') },
              ].map((type) => (
                <button
                  key={type.id}
                  onClick={() => setFilter(type.id as typeof filter)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border transition-colors ${
                    filter === type.id
                      ? 'bg-[var(--primary)] text-white border-[var(--primary)]'
                      : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] border-[var(--border)] hover:bg-[var(--bg-surface)]'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex gap-2 overflow-x-auto pb-2 pt-1 custom-scrollbar">
              <button
                onClick={() => setFilter('ALL')}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors whitespace-nowrap ${filter === 'ALL' ? 'bg-[var(--primary)] text-white border-[var(--primary)]' : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] border-[var(--border)] hover:bg-[var(--bg-surface)]'}`}
              >
                {t('notifications.filters.all')}
              </button>
              <button
                onClick={() => setFilter('UNREAD')}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors whitespace-nowrap ${filter === 'UNREAD' ? 'bg-[var(--primary)] text-white border-[var(--primary)]' : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] border-[var(--border)] hover:bg-[var(--bg-surface)]'}`}
              >
                {t('notifications.filters.unread')}
              </button>
              <button
                onClick={onClearAll}
                className="ml-auto text-xs text-[var(--text-muted)] hover:text-red-500 flex items-center gap-1 px-2 whitespace-nowrap"
              >
                <Trash2 className="w-3 h-3" /> {t('notifications.clearAll')}
              </button>
            </div>
          )}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-[var(--bg-elevated)] p-2">
          {filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-[var(--text-muted)]">
              <Bell className="w-12 h-12 mb-4 opacity-20" />
              <p className="text-sm">{t('notifications.empty')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredNotifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-4 rounded-xl border shadow-sm transition-all group relative ${
                    !n.read
                      ? 'bg-[var(--bg-surface)] border-[var(--border)] dark:border-[var(--primary)] ring-1 ring-[var(--primary-dim)] dark:ring-[var(--primary-dim)]/30'
                      : 'bg-white/60 bg-[var(--bg-surface)]/60 border-[var(--border)] border-[var(--border)] opacity-75 hover:opacity-100'
                  }`}
                >
                  <div className="flex gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border shadow-sm bg-[var(--bg-elevated)] border-[var(--border)] border-[var(--border)]`}
                    >
                      {getIcon(n)}
                    </div>
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onAction(n)}>
                      <div className="flex justify-between items-start mb-1">
                        <p
                          className={`text-sm font-bold truncate pr-6 ${!n.read ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}
                        >
                          {n.title}
                        </p>
                        <span className="text-[10px] text-[var(--text-muted)] whitespace-nowrap flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {formatTime(n.timestamp)}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed line-clamp-2 mb-2">
                        {n.message}
                      </p>

                      {/* Action Button Contextuel */}
                      {n.link && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onAction(n);
                          }}
                          className="text-[10px] font-bold bg-[var(--bg-elevated)] border border-[var(--border)] px-2 py-1 rounded text-[var(--text-secondary)] hover:text-[var(--primary)] dark:hover:text-[var(--primary)] hover:border-[var(--border)] dark:hover:border-[var(--primary)] transition-colors flex items-center gap-1 w-fit shadow-sm"
                        >
                          {n.category === 'FLEET' && t('notifications.actions.viewVehicle')}
                          {n.category === 'SUPPORT' && t('notifications.actions.openTicket')}
                          {n.category === 'FINANCE' && t('notifications.actions.viewInvoice')}
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    {/* Mark read button (on hover or if unread) */}
                    {!n.read && (
                      <button
                        onClick={() => onMarkAsRead(n.id)}
                        className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center hover:bg-[var(--bg-elevated)] text-[var(--primary)] transition-colors"
                        title={t('notifications.markAsRead')}
                      >
                        <div className="w-2 h-2 bg-[var(--primary-dim)]0 rounded-full group-hover:hidden"></div>
                        <Check className="w-4 h-4 hidden group-hover:block" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};
