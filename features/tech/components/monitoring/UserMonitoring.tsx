import React, { useState, useMemo } from 'react';
import { useDataContext } from '../../../../contexts/DataContext';
import { Search, FileText, Lock, Shield, AlertCircle, CheckCircle, XCircle, Users, X, LogIn, Activity, Globe } from 'lucide-react';
import { useToast } from '../../../../contexts/ToastContext';
import { useTableSort } from '../../../../hooks/useTableSort';
import { SortableHeader } from '../../../../components/SortableHeader';
import type { User, UserActivity } from '../../../../types';
import { api } from '../../../../services/apiLazy';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface EnhancedUser extends User {
  passwordErrors: number;
  loginCount: number;
  totalActions: number;
  lastActionAt: string | null;
  avgLoginsPerWeek: number;
  mostUsedAction: string | null;
  lastLoginIp?: string | null;
  firstLogin: string | null;
}

interface AuditLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details: any;
  ip_address: string;
  created_at: string;
}

const ACTION_LABELS: Record<string, string> = {
  'CREATE': 'Création',
  'UPDATE': 'Modification',
  'DELETE': 'Suppression',
  'LOGIN': 'Connexion',
  'LOGIN_FAILED': 'Échec connexion',
  'EXPORT': 'Export',
  'IMPORT': 'Import',
};

export const UserMonitoring: React.FC = () => {
  const { users, userActivity } = useDataContext();
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [logsModal, setLogsModal] = useState<{ user: EnhancedUser; logs: AuditLog[] } | null>(null);
  const [confirmReset, setConfirmReset] = useState<EnhancedUser | null>(null);

  const enhancedUsers = useMemo((): EnhancedUser[] => {
    const safeUsers = users || [];

    return safeUsers.filter(u => 
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
    ).map(u => {
        const activity = userActivity?.find((a: UserActivity) => a.userId === u.id);
        return {
            ...u,
            lastLogin: activity?.lastLogin || u.lastLogin,
            passwordErrors: activity?.failedAttempts || 0,
            loginCount: activity?.loginCount || 0,
            totalActions: activity?.totalActions || 0,
            lastActionAt: activity?.lastActionAt || null,
            avgLoginsPerWeek: activity?.avgLoginsPerWeek || 0,
            mostUsedAction: activity?.mostUsedAction || null,
            lastLoginIp: activity?.ipAddress || '',
            firstLogin: activity?.firstLogin || null,
            createdAt: activity?.createdAt || null,
        };
    });
  }, [users, userActivity, searchTerm]);

  // Summary stats
  const stats = useMemo(() => {
    const onlineCount = enhancedUsers.filter(u => {
      if (!u.lastLogin) return false;
      return (Date.now() - new Date(u.lastLogin).getTime()) < 15 * 60 * 1000;
    }).length;
    const totalLogins = enhancedUsers.reduce((sum, u) => sum + u.loginCount, 0);
    const totalActions = enhancedUsers.reduce((sum, u) => sum + u.totalActions, 0);
    const withErrors = enhancedUsers.filter(u => u.passwordErrors > 0).length;
    const neverLoggedIn = enhancedUsers.filter(u => !u.lastLogin).length;
    return { onlineCount, totalLogins, totalActions, withErrors, neverLoggedIn, total: enhancedUsers.length };
  }, [enhancedUsers]);

  const { sortedItems: sortedUsers, sortConfig: userSortConfig, handleSort: handleUserSort } = useTableSort(
    enhancedUsers,
    { key: 'loginCount', direction: 'desc' }
  );

  const handleViewLogs = async (user: EnhancedUser) => {
    setLoadingAction(`VIEW_LOGS-${user.id}`);
    try {
      const logs = await api.userActivity.getLogs(user.id);
      setLogsModal({ user, logs });
    } catch {
      showToast(`Erreur lors du chargement des logs de ${user.name}`, 'error');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleResetPassword = async (user: EnhancedUser) => {
    setLoadingAction(`RESET_PASSWORD-${user.id}`);
    try {
      await api.users.resetPassword(user.id);
      showToast(`Lien de réinitialisation généré pour ${user.name}`, 'success');
    } catch {
      showToast(`Erreur lors de la réinitialisation pour ${user.name}`, 'error');
    } finally {
      setLoadingAction(null);
      setConfirmReset(null);
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    try {
      return format(new Date(date), 'dd/MM/yy HH:mm', { locale: fr });
    } catch { return '-'; }
  };

  const formatRelative = (date: string | null) => {
    if (!date) return 'Jamais';
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true, locale: fr });
    } catch { return '-'; }
  };

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
        <h3 className="font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Shield className="w-5 h-5 text-[var(--primary)]" />
            Suivi des Utilisateurs
            <span className="text-xs font-normal text-[var(--text-muted)] ml-2">({stats.total} utilisateurs)</span>
        </h3>
        <div className="relative w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Rechercher un utilisateur..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg text-sm focus:ring-2 focus:ring-[var(--primary)] outline-none"
          />
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-[var(--clr-success-dim)] border border-[var(--clr-success-border)] rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-[var(--clr-success-strong)]">{stats.onlineCount}</div>
          <div className="text-xs text-green-600 dark:text-green-500 flex items-center justify-center gap-1"><CheckCircle className="w-3 h-3" /> En ligne</div>
        </div>
        <div className="bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] border border-[var(--border)] dark:border-[var(--primary)] rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-[var(--primary)] dark:text-[var(--primary)]">{stats.totalLogins}</div>
          <div className="text-xs text-[var(--primary)] dark:text-[var(--primary)] flex items-center justify-center gap-1"><LogIn className="w-3 h-3" /> Connexions totales</div>
        </div>
        <div className="bg-[var(--clr-info-dim)] border border-[var(--clr-info-border)] rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-[var(--clr-info-strong)]">{stats.totalActions}</div>
          <div className="text-xs text-purple-600 dark:text-purple-500 flex items-center justify-center gap-1"><Activity className="w-3 h-3" /> Actions totales</div>
        </div>
        <div className="bg-[var(--clr-warning-dim)] border border-[var(--clr-warning-border)] rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-[var(--clr-warning-strong)]">{stats.withErrors}</div>
          <div className="text-xs text-orange-600 dark:text-orange-500 flex items-center justify-center gap-1"><AlertCircle className="w-3 h-3" /> Erreurs MDP</div>
        </div>
        <div className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg p-3 text-center">
          <div className="page-title">{stats.neverLoggedIn}</div>
          <div className="text-xs text-[var(--text-secondary)] flex items-center justify-center gap-1"><XCircle className="w-3 h-3" /> Jamais connecté</div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto custom-scrollbar pb-16 lg:pb-0">
        {enhancedUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-[var(--text-muted)]">
            <Users className="w-12 h-12 mb-3 opacity-30" />
            <p className="font-medium text-[var(--text-secondary)]">{searchTerm ? 'Aucun utilisateur trouvé' : 'Aucun utilisateur'}</p>
            <p className="text-sm mt-1">{searchTerm ? 'Essayez un autre terme de recherche' : 'Les utilisateurs du système apparaîtront ici'}</p>
          </div>
        ) : (
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--bg-elevated)] text-[var(--text-secondary)] uppercase font-bold text-xs sticky top-0 z-10">
            <tr>
              <SortableHeader label="Utilisateur" sortKey="name" currentSortKey={userSortConfig.key} currentDirection={userSortConfig.direction} onSort={handleUserSort} />
              <SortableHeader label="Rôle" sortKey="role" currentSortKey={userSortConfig.key} currentDirection={userSortConfig.direction} onSort={handleUserSort} />
              <SortableHeader label="Connexions" sortKey="loginCount" currentSortKey={userSortConfig.key} currentDirection={userSortConfig.direction} onSort={handleUserSort} className="text-center" />
              <SortableHeader label="Moy/Sem" sortKey="avgLoginsPerWeek" currentSortKey={userSortConfig.key} currentDirection={userSortConfig.direction} onSort={handleUserSort} className="text-center" />
              <SortableHeader label="Actions" sortKey="totalActions" currentSortKey={userSortConfig.key} currentDirection={userSortConfig.direction} onSort={handleUserSort} className="text-center" />
              <SortableHeader label="Dernière Connexion" sortKey="lastLogin" currentSortKey={userSortConfig.key} currentDirection={userSortConfig.direction} onSort={handleUserSort} />
              <SortableHeader label="Err. MDP" sortKey="passwordErrors" currentSortKey={userSortConfig.key} currentDirection={userSortConfig.direction} onSort={handleUserSort} className="text-center" />
              <SortableHeader label="Statut" sortKey="status" currentSortKey={userSortConfig.key} currentDirection={userSortConfig.direction} onSort={handleUserSort} />
              <th className="px-3 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {sortedUsers.map((user) => {
              const isOnline = user.lastLogin && (Date.now() - new Date(user.lastLogin).getTime()) < 15 * 60 * 1000;
              return (
              <tr key={user.id} className="tr-hover/50 transition-colors">
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-[var(--border)]'}`} />
                    <div>
                      <div className="font-medium text-[var(--text-primary)]">{user.name}</div>
                      <div className="text-xs text-[var(--text-secondary)]">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2.5">
                    <span className="px-2 py-0.5 rounded bg-[var(--bg-elevated)] text-[var(--text-secondary)] text-xs font-bold">
                        {user.role}
                    </span>
                </td>
                <td className="px-3 py-2.5 text-center">
                  <div className="flex flex-col items-center">
                    <span className="font-bold text-[var(--primary)] dark:text-[var(--primary)] text-base">{user.loginCount}</span>
                  </div>
                </td>
                <td className="px-3 py-2.5 text-center">
                  <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                    user.avgLoginsPerWeek >= 5 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                    user.avgLoginsPerWeek >= 1 ? 'bg-[var(--primary-dim)] text-[var(--primary)] dark:bg-[var(--primary-dim)] dark:text-[var(--primary)]' :
                    'bg-[var(--bg-elevated)] text-[var(--text-secondary)] bg-[var(--bg-elevated)] dark:text-[var(--text-muted)]'
                  }`}>
                    {user.avgLoginsPerWeek}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-center">
                  <div className="flex flex-col items-center">
                    <span className="font-semibold text-[var(--clr-info-strong)]">{user.totalActions}</span>
                    {user.mostUsedAction && (
                      <span className="text-[10px] text-[var(--text-muted)] truncate max-w-[80px]" title={user.mostUsedAction}>
                        {ACTION_LABELS[user.mostUsedAction] || user.mostUsedAction}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex flex-col">
                    <span className="text-[var(--text-primary)] text-xs">{formatRelative(user.lastLogin ?? null)}</span>
                    {user.lastLogin && <span className="text-[10px] text-[var(--text-muted)]">{formatDate(user.lastLogin)}</span>}
                    {user.lastLoginIp && <span className="text-[10px] text-[var(--text-muted)] font-mono flex items-center gap-1"><Globe className="w-2.5 h-2.5" />{user.lastLoginIp}</span>}
                  </div>
                </td>
                <td className="px-3 py-2.5 text-center">
                  {user.passwordErrors > 0 ? (
                    <span className={`font-bold px-1.5 py-0.5 rounded text-xs ${user.passwordErrors > 3 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'}`}>
                        {user.passwordErrors}
                    </span>
                  ) : (
                    <span className="text-[var(--text-muted)]">-</span>
                  )}
                </td>
                <td className="px-3 py-2.5">
                    {user.status === 'Actif' ? (
                        <span className="flex items-center gap-1 text-green-600 text-xs font-bold">
                            <CheckCircle className="w-3 h-3" /> Actif
                        </span>
                    ) : (
                        <span className="flex items-center gap-1 text-red-600 text-xs font-bold">
                            <XCircle className="w-3 h-3" /> {user.status}
                        </span>
                    )}
                </td>
                <td className="px-3 py-2.5 text-right">
                  <div className="flex justify-end gap-1">
                    <button 
                        onClick={() => handleViewLogs(user)}
                        className="p-1.5 hover:bg-[var(--bg-elevated)] rounded text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors disabled:opacity-50" 
                        title="Voir les logs"
                        disabled={loadingAction === `VIEW_LOGS-${user.id}`}
                    >
                        <FileText className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={() => setConfirmReset(user)}
                        className="p-1.5 hover:bg-[var(--bg-elevated)] rounded text-[var(--text-secondary)] hover:text-orange-600 transition-colors disabled:opacity-50" 
                        title="Réinitialiser mot de passe"
                        disabled={loadingAction === `RESET_PASSWORD-${user.id}`}
                    >
                        <Lock className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
        )}
      </div>

      {/* Logs Modal */}
      {logsModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setLogsModal(null)}>
          <div className="bg-[var(--bg-surface)] rounded-xl shadow-xl max-w-3xl w-full max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b border-[var(--border)]">
              <div>
                <h3 className="font-bold text-[var(--text-primary)]">Logs — {logsModal.user.name}</h3>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">{logsModal.user.email} · {logsModal.logs.length} entrées</p>
              </div>
              <button onClick={() => setLogsModal(null)} className="p-1 hover:bg-[var(--bg-elevated)] rounded" title="Fermer"><X className="w-5 h-5" /></button>
            </div>
            {/* User summary in modal */}
            <div className="grid grid-cols-4 gap-3 px-4 pt-3">
              <div className="text-center p-2 bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] rounded-lg">
                <div className="text-lg font-bold text-[var(--primary)] dark:text-[var(--primary)]">{logsModal.user.loginCount}</div>
                <div className="text-[10px] text-[var(--primary)] dark:text-[var(--primary)]">Connexions</div>
              </div>
              <div className="text-center p-2 bg-[var(--clr-info-dim)] rounded-lg">
                <div className="text-lg font-bold text-[var(--clr-info-strong)]">{logsModal.user.totalActions}</div>
                <div className="text-[10px] text-purple-600 dark:text-purple-500">Actions</div>
              </div>
              <div className="text-center p-2 bg-[var(--clr-success-dim)] rounded-lg">
                <div className="text-lg font-bold text-[var(--clr-success-strong)]">{logsModal.user.avgLoginsPerWeek}</div>
                <div className="text-[10px] text-green-600 dark:text-green-500">Moy/Semaine</div>
              </div>
              <div className="text-center p-2 bg-[var(--clr-warning-dim)] rounded-lg">
                <div className="text-lg font-bold text-[var(--clr-warning-strong)]">{logsModal.user.passwordErrors}</div>
                <div className="text-[10px] text-orange-600 dark:text-orange-500">Erreurs MDP</div>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {logsModal.logs.length === 0 ? (
                <p className="text-center text-[var(--text-muted)] py-8">Aucun log trouvé pour cet utilisateur</p>
              ) : (
                <table className="w-full text-sm text-left">
                  <thead className="bg-[var(--bg-elevated)] text-xs text-[var(--text-secondary)] uppercase sticky top-0">
                    <tr>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Action</th>
                      <th className="px-3 py-2">Entité</th>
                      <th className="px-3 py-2">ID</th>
                      <th className="px-3 py-2">IP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {logsModal.logs.map((log: AuditLog) => (
                      <tr key={log.id} className="tr-hover/50">
                        <td className="px-3 py-2 text-xs text-[var(--text-secondary)] whitespace-nowrap">{formatDate(log.created_at)}</td>
                        <td className="px-3 py-2">
                          <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                            log.action === 'LOGIN' ? 'bg-[var(--primary-dim)] text-[var(--primary)] dark:bg-[var(--primary-dim)] dark:text-[var(--primary)]' :
                            log.action === 'LOGIN_FAILED' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                            log.action === 'CREATE' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                            log.action === 'DELETE' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                            'bg-[var(--bg-elevated)] text-[var(--text-secondary)] bg-[var(--bg-elevated)] text-[var(--text-secondary)]'
                          }`}>
                            {ACTION_LABELS[log.action] || log.action}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-[var(--text-secondary)] text-xs">{log.entity_type}</td>
                        <td className="px-3 py-2 text-[10px] text-[var(--text-muted)] font-mono truncate max-w-[120px]" title={log.entity_id}>{log.entity_id ? log.entity_id.substring(0, 8) + '...' : '-'}</td>
                        <td className="px-3 py-2 text-xs text-[var(--text-muted)] font-mono">{log.ip_address || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirm Reset Password Modal */}
      {confirmReset && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setConfirmReset(null)}>
          <div className="bg-[var(--bg-elevated)] rounded-xl shadow-xl max-w-sm w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-orange-100 rounded-full"><Lock className="w-5 h-5 text-orange-600" /></div>
              <h3 className="font-bold text-[var(--text-primary)]">Réinitialiser le mot de passe</h3>
            </div>
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              Êtes-vous sûr de vouloir réinitialiser le mot de passe de <strong>{confirmReset.name}</strong> ({confirmReset.email}) ?
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmReset(null)} className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] rounded-lg">Annuler</button>
              <button 
                onClick={() => handleResetPassword(confirmReset)} 
                className="px-4 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
                disabled={loadingAction === `RESET_PASSWORD-${confirmReset.id}`}
              >
                {loadingAction === `RESET_PASSWORD-${confirmReset.id}` ? 'En cours...' : 'Réinitialiser'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
