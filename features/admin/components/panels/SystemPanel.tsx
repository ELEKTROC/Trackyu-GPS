import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '../../../../components/Card';
import { useToast } from '../../../../contexts/ToastContext';
import { api } from '../../../../services/api';
import { TOAST } from '../../../../constants/toastMessages';
import { mapError } from '../../../../utils/errorMapper';
import { SystemMetricsPanel } from '../../../tech/components/monitoring/SystemMetricsPanel';

export const SystemPanel = () => {
    const { showToast } = useToast();
    const queryClient = useQueryClient();
    const [googleMapsKey, setGoogleMapsKey] = useState('');

    const { data: settings } = useQuery({
        queryKey: ['settings'],
        queryFn: api.settings.list
    });

    useEffect(() => {
        if (settings) {
             const keySetting = settings.find((s: { key: string; value: string }) => s.key === 'GOOGLE_MAPS_API_KEY');
             if (keySetting) setGoogleMapsKey(keySetting.value);
        }
    }, [settings]);

    const updateSettingMutation = useMutation({
        mutationFn: ({ key, value }: { key: string, value: string }) => api.settings.update(key, value),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['settings'] });
            showToast(TOAST.ADMIN.CONFIG_SAVED, 'success');
        },
        onError: (error) => {
            showToast(mapError(error, 'clé API'), 'error');
        }
    });

    const handleSaveKey = () => {
        updateSettingMutation.mutate({ key: 'GOOGLE_MAPS_API_KEY', value: googleMapsKey });
    };

    return (
    <div className="space-y-6 animate-in fade-in duration-500">
        {/* Métriques live complètes (CPU, RAM, Disque, Pipeline GPS, Redis, WebSocket) */}
        <SystemMetricsPanel />

        {/* Configuration système */}
        <Card title="Configuration Système">
            <div className="p-4 space-y-4">
                <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Clé API Google Maps (Backend)</label>
                    <div className="flex gap-2">
                        <input 
                            type="password" 
                            value={googleMapsKey} 
                            onChange={(e) => setGoogleMapsKey(e.target.value)}
                            placeholder="AIza..."
                            className="flex-1 p-2 border rounded dark:bg-slate-900 dark:border-slate-700 dark:text-white"
                        />
                        <button 
                            onClick={handleSaveKey}
                            disabled={updateSettingMutation.isPending}
                            className="px-4 py-2 bg-[var(--primary)] text-white rounded font-bold hover:bg-[var(--primary-light)] disabled:opacity-50"
                        >
                            {updateSettingMutation.isPending ? '...' : 'Enregistrer'}
                        </button>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Cette clé est utilisée par le serveur pour le service "Snap-to-Road" (correction de tracé). Elle n'est pas exposée au navigateur.</p>
                </div>
            </div>
        </Card>
    </div>
);
};
