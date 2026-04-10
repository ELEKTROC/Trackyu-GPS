import React, { useState } from 'react';
import { RefreshCw, Database, Server, CheckCircle, AlertTriangle, Clock, Download, Upload, Trash2,RotateCcw } from 'lucide-react';
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
        const keysToRemove = [
            'trackyu_theme_preference',
            'trackyu_notification_prefs',
            'trackyu_sidebar_collapsed'
        ];
        keysToRemove.forEach(k => localStorage.removeItem(k));
        showToast(TOAST.DATA.PREFS_RESET, 'success');
        setTimeout(() => window.location.reload(), 1000);
    };

    return (
        <div className="p-6 w-full space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Synchronisation Système</h2>
                    <p className="text-slate-500 dark:text-slate-400">Gérez la synchronisation des données et l'état du cache local.</p>
                </div>
                <button 
                    onClick={handleSync}
                    disabled={isSyncing}
                    className={`px-4 py-2 bg-blue-600 text-white rounded-lg font-medium flex items-center gap-2 hover:bg-blue-700 transition-all ${isSyncing ? 'opacity-75 cursor-not-allowed' : ''}`}
                >
                    <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? 'Synchronisation...' : 'Synchroniser maintenant'}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <Database className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> Connecté
                        </span>
                    </div>
                    <h3 className="font-bold text-slate-800 dark:text-white mb-1">Base de données</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">PostgreSQL 15.4 (Cluster EU-West)</p>
                    <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 mb-2">
                        <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: '100%' }}></div>
                    </div>
                    <p className="text-xs text-right text-slate-400">Latence: 24ms</p>
                </div>

                <div className="p-6 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                            <Server className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                        </div>
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> Opérationnel
                        </span>
                    </div>
                    <h3 className="font-bold text-slate-800 dark:text-white mb-1">API Gateway</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">v2.5.0 (Production)</p>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span className="flex items-center gap-1"><Upload className="w-3 h-3" /> 1.2k req/s</span>
                        <span className="flex items-center gap-1"><Download className="w-3 h-3" /> 450 req/s</span>
                    </div>
                </div>

                <div className="p-6 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                            <Clock className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                        </div>
                        <span className="text-xs font-mono text-slate-500">
                            {lastSync.toLocaleTimeString('fr-FR')}
                        </span>
                    </div>
                    <h3 className="font-bold text-slate-800 dark:text-white mb-1">Dernière Synchro</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Cache local mis à jour</p>
                    <button className="text-xs text-blue-600 hover:underline">Voir l'historique</button>
                </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
                <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-500" /> Actions de Maintenance
                </h3>
                <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                        <div>
                            <h4 className="font-bold text-sm text-slate-800 dark:text-white">Vider le cache local</h4>
                            <p className="text-xs text-slate-500">Peut résoudre des problèmes d'affichage. Nécessitera un rechargement.</p>
                        </div>
                        <button 
                            onClick={handleClearCache}
                            className="px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                        >
                            Vider
                        </button>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                        <div>
                            <h4 className="font-bold text-sm text-slate-800 dark:text-white">Réinitialiser les préférences</h4>
                            <p className="text-xs text-slate-500">Remet à zéro les configurations d'affichage (colonnes, filtres).</p>
                        </div>
                        <button 
                            onClick={handleResetPrefs}
                            className="px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                        >
                            Réinitialiser
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
