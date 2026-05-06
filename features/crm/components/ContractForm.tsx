import React, { useState, useEffect } from 'react';
import type { Contract, Tier } from '../../../types';
import { api } from '../../../services/apiLazy';
import { Save, Calendar } from 'lucide-react';
import { useToast } from '../../../contexts/ToastContext';
import { TOAST } from '../../../constants/toastMessages';
import { FormField, Input, Select, Textarea } from '../../../components/form';

interface ContractFormProps {
  initialData?: Partial<Contract>;
  onSubmit: (data: Partial<Contract>) => void | Promise<void>;
  onCancel: () => void;
}

const normalizeDate = (d?: string) => (d ? d.split('T')[0] : undefined);

export const ContractForm: React.FC<ContractFormProps> = ({ initialData, onSubmit, onCancel }) => {
  const isEditing = !!initialData?.id;
  const { showToast } = useToast();

  const [formData, setFormData] = useState<Partial<Contract>>(() => {
    const defaults: Partial<Contract> = {
      status: 'ACTIVE',
      startDate: new Date().toISOString().split('T')[0],
      autoRenew: true,
    };
    if (!initialData) return defaults;
    return {
      ...defaults,
      ...initialData,
      startDate: normalizeDate(initialData.startDate) || defaults.startDate,
      endDate: initialData.endDate === null ? undefined : normalizeDate(initialData.endDate) || undefined,
    };
  });

  const [clients, setClients] = useState<Tier[]>([]);
  const [resellers, setResellers] = useState<Tier[]>([]);

  useEffect(() => {
    api.tiers
      .list(undefined, true)
      .then((all) => {
        setClients(all.filter((t) => t.type === 'CLIENT'));
        setResellers(all.filter((t) => t.type === 'RESELLER'));
      })
      .catch(() => showToast('Erreur lors du chargement des tiers', 'error'));
  }, []);

  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    if (!isEditing && !formData.resellerId) {
      showToast(TOAST.VALIDATION.REQUIRED_FIELD('revendeur'), 'error');
      return;
    }
    if (!formData.clientId) {
      showToast(TOAST.VALIDATION.REQUIRED_FIELD('client'), 'error');
      return;
    }
    if (formData.endDate && new Date(formData.endDate) <= new Date(formData.startDate!)) {
      showToast(TOAST.VALIDATION.DATE_RANGE_INVALID, 'error');
      return;
    }
    setIsSaving(true);
    try {
      await onSubmit(formData);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Revendeur */}
        <FormField label="Revendeur" required={!isEditing}>
          {isEditing ? (
            <Input
              readOnly
              value={initialData?.resellerName || 'Non défini'}
              className="bg-[var(--bg-elevated)] cursor-not-allowed"
            />
          ) : (
            <Select
              value={formData.resellerId || ''}
              onChange={(e) => {
                const r = resellers.find((r) => r.id === e.target.value);
                setFormData({ ...formData, resellerId: e.target.value, resellerName: r?.name });
              }}
              required
            >
              <option value="">Sélectionner un revendeur...</option>
              <option value="tenant_trackyu">TrackYu System (Système)</option>
              {resellers.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </Select>
          )}
        </FormField>

        {/* Client */}
        <FormField label="Client" required>
          <Select
            value={formData.clientId || ''}
            onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
            required
          >
            <option value="">Sélectionner un client...</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </FormField>

        {/* Objet du contrat */}
        <FormField label="Objet du contrat" className="col-span-2">
          <Input
            value={formData.subject || ''}
            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
            placeholder="Ex : Abonnement tracking GPS véhicules..."
          />
        </FormField>

        {/* Date début */}
        <FormField label="Date de début" required>
          <Input
            type="date"
            value={formData.startDate}
            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            required
          />
        </FormField>

        {/* Date fin */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
              Date de fin
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={!formData.endDate}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    endDate: e.target.checked
                      ? undefined
                      : new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
                    autoRenew: e.target.checked ? true : formData.autoRenew,
                  })
                }
                className="rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
              />
              <span className="text-xs font-medium text-[var(--text-secondary)]">N'expire jamais</span>
            </label>
          </div>
          {formData.endDate ? (
            <Input
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              required
            />
          ) : (
            <div className="w-full px-3 py-2.5 border rounded-xl text-sm bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Contrat sans échéance — renouvelé jusqu'à résiliation
            </div>
          )}
        </div>

        {/* Statut */}
        <FormField label="Statut">
          {isEditing ? (
            <Input
              readOnly
              value={
                {
                  DRAFT: 'Brouillon',
                  ACTIVE: 'Actif',
                  SUSPENDED: 'Suspendu',
                  EXPIRED: 'Expiré',
                  TERMINATED: 'Résilié',
                }[formData.status || 'ACTIVE'] || formData.status
              }
              className="bg-[var(--bg-elevated)] cursor-not-allowed"
            />
          ) : (
            <Select
              value={formData.status || 'ACTIVE'}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as Contract['status'] })}
            >
              <option value="DRAFT">Brouillon</option>
              <option value="ACTIVE">Actif</option>
            </Select>
          )}
        </FormField>

        {/* Renouvellement auto */}
        {formData.endDate && (
          <div className="flex items-center gap-2 self-end pb-2">
            <input
              type="checkbox"
              id="autoRenew"
              checked={!!formData.autoRenew}
              onChange={(e) => setFormData({ ...formData, autoRenew: e.target.checked })}
              className="rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
            />
            <label htmlFor="autoRenew" className="text-sm text-[var(--text-primary)]">
              Renouvellement automatique
            </label>
          </div>
        )}

        {/* Info abonnements */}
        <div className="col-span-2 flex items-start gap-3 p-3 bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] border border-[var(--border)] dark:border-[var(--primary)] rounded-xl">
          <svg
            className="w-4 h-4 mt-0.5 text-[var(--primary)] flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <p className="text-xs font-bold text-[var(--primary)] dark:text-[var(--primary)]">
              Véhicules et tarifs gérés via les Abonnements
            </p>
            <p className="text-xs text-[var(--primary)] dark:text-[var(--primary)] mt-0.5">
              Chaque véhicule est associé à un abonnement individuel avec son propre tarif et cycle de facturation.
            </p>
          </div>
        </div>

        {/* Notes internes */}
        <FormField label="Notes internes" className="col-span-2">
          <Textarea
            rows={3}
            value={formData.notes || ''}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Notes privées sur ce contrat..."
          />
        </FormField>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2.5 text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] rounded-xl transition-colors"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="px-4 py-2.5 bg-[var(--primary)] text-white font-bold rounded-xl hover:bg-[var(--primary-light)] transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {isSaving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </form>
  );
};
