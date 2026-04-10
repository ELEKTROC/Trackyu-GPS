import React, { useState, useEffect, useCallback } from 'react';
import { Palette, Save, Loader2, Globe, Mail, Phone, RefreshCw } from 'lucide-react';
import { Card } from '../../../../components/Card';
import { useToast } from '../../../../contexts/ToastContext';
import { api } from '../../../../services/api';
import { TOAST } from '../../../../constants/toastMessages';
import { mapError } from '../../../../utils/errorMapper';
import { useAuth } from '../../../../contexts/AuthContext';
import { useDataContext } from '../../../../contexts/DataContext';
import { Select } from '../../../../components/form';
import { FormField } from '../../../../components/form/FormField';

interface WhiteLabelConfig {
  domain: string;
  app_name: string;
  logo_url: string;
  favicon_url: string;
  primary_color: string;
  secondary_color: string;
  support_email: string;
  support_phone: string;
  custom_css: string;
}

const DEFAULT_CONFIG: WhiteLabelConfig = {
  domain: '',
  app_name: '',
  logo_url: '',
  favicon_url: '',
  primary_color: '#2563EB',
  secondary_color: '#1E40AF',
  support_email: '',
  support_phone: '',
  custom_css: '',
};

export const WhiteLabelPanel: React.FC = () => {
  const { showToast } = useToast();
  const { user } = useAuth();
  const { tiers: rawTiers = [] } = useDataContext();
  const isSuperAdmin = user?.role === 'SUPERADMIN' || user?.role === 'SUPER_ADMIN';
  
  const [selectedTenantId, setSelectedTenantId] = useState<string>(user?.tenantId || '');
  const [config, setConfig] = useState<WhiteLabelConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const resellers = rawTiers.filter(t => t.type === 'RESELLER');

  const loadConfig = useCallback(async () => {
    try {
      setLoading(true);
      const params = selectedTenantId && isSuperAdmin ? { tenantId: selectedTenantId } : undefined;
      const data = await api.adminFeatures.whiteLabel.get(params);
      if (data && Object.keys(data).length > 0) {
        setConfig({
          domain: data.domain || '',
          app_name: data.app_name || '',
          logo_url: data.logo_url || '',
          favicon_url: data.favicon_url || '',
          primary_color: data.primary_color || '#2563EB',
          secondary_color: data.secondary_color || '#1E40AF',
          support_email: data.support_email || '',
          support_phone: data.support_phone || '',
          custom_css: data.custom_css || '',
        });
      }
    } catch {
      // Config vide par défaut
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadConfig(); }, [loadConfig, selectedTenantId]);

  const handleChange = (field: keyof WhiteLabelConfig, value: string) => {
    setConfig(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const params = selectedTenantId && isSuperAdmin ? { tenantId: selectedTenantId } : undefined;
      await api.adminFeatures.whiteLabel.update(config, params);
      showToast(TOAST.ADMIN.CONFIG_SAVED, 'success');
      setHasChanges(false);
    } catch (error) {
      showToast(mapError(error, 'configuration'), 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--primary)]" />
        <span className="ml-2 text-slate-500">Chargement...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header with save */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">Personnalisation White Label</h3>
          <p className="text-sm text-slate-500">Configurez l'apparence de votre plateforme</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadConfig}
            className="px-3 py-2 text-sm border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 dark:border-slate-700"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-light)] disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Sauvegarder
          </button>
        </div>
      </div>

      {isSuperAdmin && (
        <Card className="p-4 bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] border-[var(--primary)] dark:border-[var(--primary)]/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] rounded-lg">
                <Globe className="w-5 h-5 text-[var(--primary)]" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 dark:text-white">Sélection du Revendeur</h4>
                <p className="text-xs text-slate-500">Gérez la personnalisation d'un revendeur spécifique</p>
              </div>
            </div>
            <div className="w-64">
              <Select
                value={selectedTenantId}
                onChange={e => setSelectedTenantId(e.target.value)}
              >
                <option value={user?.tenantId || ''}>Ma configuration (TrackYu)</option>
                {resellers.map(reseller => (
                  <option key={reseller.id} value={reseller.id}>{reseller.name}</option>
                ))}
              </Select>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Configuration Globale */}
        <Card title="Configuration Globale">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                <Globe className="w-3 h-3 inline mr-1" />
                Nom de l'application
              </label>
              <input
                type="text"
                value={config.app_name}
                onChange={e => handleChange('app_name', e.target.value)}
                placeholder="TrackYu GPS"
                className="w-full p-2 border rounded bg-white dark:bg-slate-900 dark:border-slate-700 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Domaine Principal (CNAME)</label>
              <input
                type="text"
                value={config.domain}
                onChange={e => handleChange('domain', e.target.value)}
                placeholder="app.mondomaine.com"
                className="w-full p-2 border rounded bg-white dark:bg-slate-900 dark:border-slate-700 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                <Mail className="w-3 h-3 inline mr-1" />
                Email support
              </label>
              <input
                type="email"
                value={config.support_email}
                onChange={e => handleChange('support_email', e.target.value)}
                placeholder="support@mondomaine.com"
                className="w-full p-2 border rounded bg-white dark:bg-slate-900 dark:border-slate-700 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                <Phone className="w-3 h-3 inline mr-1" />
                Téléphone support
              </label>
              <input
                type="tel"
                value={config.support_phone}
                onChange={e => handleChange('support_phone', e.target.value)}
                placeholder="+225 XX XX XX XX"
                className="w-full p-2 border rounded bg-white dark:bg-slate-900 dark:border-slate-700 text-sm"
              />
            </div>
          </div>
        </Card>

        {/* Personnalisation visuelle */}
        <Card title="Personnalisation visuelle">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center border border-dashed border-slate-300 dark:border-slate-600 overflow-hidden">
                {config.logo_url ? (
                  <img src={config.logo_url} alt="Logo" className="w-full h-full object-contain" />
                ) : (
                  <Palette className="w-6 h-6 text-slate-400" />
                )}
              </div>
              <div className="flex-1">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">URL du Logo</label>
                <input
                  type="text"
                  value={config.logo_url}
                  onChange={e => handleChange('logo_url', e.target.value)}
                  placeholder="https://..."
                  className="w-full p-2 border rounded bg-white dark:bg-slate-900 dark:border-slate-700 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">URL du Favicon</label>
              <input
                type="text"
                value={config.favicon_url}
                onChange={e => handleChange('favicon_url', e.target.value)}
                placeholder="https://..."
                className="w-full p-2 border rounded bg-white dark:bg-slate-900 dark:border-slate-700 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Couleur Primaire</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={config.primary_color}
                    onChange={e => handleChange('primary_color', e.target.value)}
                    className="w-8 h-8 rounded border cursor-pointer"
                  />
                  <input
                    type="text"
                    value={config.primary_color}
                    onChange={e => handleChange('primary_color', e.target.value)}
                    className="flex-1 p-2 border rounded text-sm bg-white dark:bg-slate-900 dark:border-slate-700"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Couleur Secondaire</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={config.secondary_color}
                    onChange={e => handleChange('secondary_color', e.target.value)}
                    className="w-8 h-8 rounded border cursor-pointer"
                  />
                  <input
                    type="text"
                    value={config.secondary_color}
                    onChange={e => handleChange('secondary_color', e.target.value)}
                    className="flex-1 p-2 border rounded text-sm bg-white dark:bg-slate-900 dark:border-slate-700"
                  />
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* CSS Personnalisé */}
        <Card title="CSS Personnalisé" className="md:col-span-2">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
              CSS additionnel (optionnel)
            </label>
            <textarea
              value={config.custom_css}
              onChange={e => handleChange('custom_css', e.target.value)}
              placeholder={`/* Personnalisation CSS */\n.sidebar { background: #1a1a2e; }\n.header { border-bottom: 2px solid var(--primary); }`}
              rows={6}
              className="w-full p-3 border rounded font-mono text-sm bg-slate-50 dark:bg-slate-900 dark:border-slate-700"
            />
          </div>
        </Card>
      </div>
    </div>
  );
};
