import React, { useState } from 'react';
import {
  RefreshCw,
  Database,
  Server,
  CheckCircle,
  AlertTriangle,
  Clock,
  Download,
  Upload,
  Trash2,
  RotateCcw,
} from 'lucide-react';
import { useDataContext } from '../../../contexts/DataContext';
import { useToast } from '../../../contexts/ToastContext';
import { TOAST } from '../../../constants/toastMessages';
import { useQueryClient } from '@tanstack/react-query';

export const SyncView: React.FC = () => {
  const { refreshData } = useDataContext();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(new Date());

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await refreshData();
      setLastSync(new Date());
      showToast(TOAST.DATA.SYNC_SUCCESS, 'success');
    } catch (error) {
      showToast(TOAST.DATA.SYNC_ERROR, 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClearCache = () => {
    queryClient.clear();
    showToast(TOAST.DATA.CACHE_CLEARED, 'success');
  };

  const handleResetPrefs = () => {
    const keysToRemove = ['trackyu_theme_preference', 'trackyu_notification_prefs', 'trackyu_sidebar_collapsed'];
    keysToRemove.forEach((k) => localStorage.removeItem(k));
    showToast(TOAST.DATA.PREFS_RESET, 'success');
    setTimeout(() => window.location.reload(), 1000);
  };

  return (
    <div className="p-6 w-full space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="page-title">Synchronisation Système</h2>
          <p className="text-[var(--text-secondary)]">Gérez la synchronisation des données et l'état du cache local.</p>
        </div>
        <button
          onClick={handleSync}
          disabled={isSyncing}
          className={`px-4 py-2 bg-[var(--primary)] text-white rounded-lg font-medium flex items-center gap-2 hover:bg-[var(--primary-light)] transition-all ${isSyncing ? 'opacity-75 cursor-not-allowed' : ''}`}
        >
          <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Synchronisation...' : 'Synchroniser maintenant'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border)] shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] rounded-lg">
              <Database className="w-6 h-6 text-[var(--primary)] dark:text-[var(--primary)]" />
            </div>
            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> Connecté
            </span>
          </div>
          <h3 className="font-bold text-[var(--text-primary)] mb-1">Base de données</h3>
          <p className="text-xs text-[var(--text-secondary)] mb-4">PostgreSQL 15.4 (Cluster EU-West)</p>
          <div className="w-full bg-[var(--bg-elevated)] rounded-full h-1.5 mb-2">
            <div className="bg-[var(--primary-dim)]0 h-1.5 rounded-full" style={{ width: '100%' }}></div>
          </div>
          <p className="text-xs text-right text-[var(--text-muted)]">Latence: 24ms</p>
        </div>

        <div className="p-6 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border)] shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-[var(--clr-info-muted)] rounded-lg">
              <Server className="w-6 h-6 text-[var(--clr-info)]" />
            </div>
            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> Opérationnel
            </span>
          </div>
          <h3 className="font-bold text-[var(--text-primary)] mb-1">API Gateway</h3>
          <p className="text-xs text-[var(--text-secondary)] mb-4">v2.5.0 (Production)</p>
          <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)]">
            <span className="flex items-center gap-1">
              <Upload className="w-3 h-3" /> 1.2k req/s
            </span>
            <span className="flex items-center gap-1">
              <Download className="w-3 h-3" /> 450 req/s
            </span>
          </div>
        </div>

        <div className="p-6 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border)] shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-[var(--clr-warning-muted)] rounded-lg">
              <Clock className="w-6 h-6 text-[var(--clr-warning)]" />
            </div>
            <span className="text-xs font-mono text-[var(--text-secondary)]">
              {lastSync.toLocaleTimeString('fr-FR')}
            </span>
          </div>
          <h3 className="font-bold text-[var(--text-primary)] mb-1">Dernière Synchro</h3>
          <p className="text-xs text-[var(--text-secondary)] mb-4">Cache local mis à jour</p>
          <button className="text-xs text-[var(--primary)] hover:underline">Voir l'historique</button>
        </div>
      </div>

      <div className="bg-[var(--bg-elevated)] rounded-xl p-6 border border-[var(--border)]">
        <h3 className="font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-500" /> Actions de Maintenance
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-[var(--bg-elevated)] rounded-lg border border-[var(--border)]">
            <div>
              <h4 className="font-bold text-sm text-[var(--text-primary)]">Vider le cache local</h4>
              <p className="text-xs text-[var(--text-secondary)]">
                Peut résoudre des problèmes d'affichage. Nécessitera un rechargement.
              </p>
            </div>
            <button
              onClick={handleClearCache}
              className="px-3 py-1.5 border border-[var(--border)] rounded text-xs font-medium hover:bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)] transition-colors"
            >
              Vider
            </button>
          </div>
          <div className="flex items-center justify-between p-4 bg-[var(--bg-elevated)] rounded-lg border border-[var(--border)]">
            <div>
              <h4 className="font-bold text-sm text-[var(--text-primary)]">Réinitialiser les préférences</h4>
              <p className="text-xs text-[var(--text-secondary)]">
                Remet à zéro les configurations d'affichage (colonnes, filtres).
              </p>
            </div>
            <button
              onClick={handleResetPrefs}
              className="px-3 py-1.5 border border-[var(--border)] rounded text-xs font-medium hover:bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)] transition-colors"
            >
              Réinitialiser
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
