import React, { useState, useEffect } from 'react';
import type { Client } from '../../../types';
import { Save, X } from 'lucide-react';
import { ClientSchema } from '../../../schemas/clientSchema';
import { z } from 'zod';
import { useToast } from '../../../contexts/ToastContext';
import { TOAST } from '../../../constants/toastMessages';
import { mapError } from '../../../utils/errorMapper';
import { useAuth } from '../../../contexts/AuthContext';
import { useDataContext } from '../../../contexts/DataContext';
import { usePreviewNumber, useGetNextNumber } from '../../../services/numberingService';
import { logger } from '../../../utils/logger';
import { FormField, FormSection, FormGrid, Input, Select } from '../../../components/form';

interface ClientFormProps {
  initialData?: Partial<Client>;
  onSave: (client: Client) => void;
  onCancel: () => void;
}

export const ClientForm: React.FC<ClientFormProps> = ({ initialData, onSave, onCancel }) => {
  const { showToast } = useToast();
  const { user } = useAuth();
  const { tiers } = useDataContext();

  // Numérotation automatique
  const isNew = !initialData?.id;
  const { data: previewNumber, isLoading: isLoadingNumber } = usePreviewNumber('client', isNew);
  const getNextNumber = useGetNextNumber();

  const [formData, setFormData] = useState<Partial<Client>>({
    type: 'B2B',
    status: 'ACTIVE',
    country: 'Sénégal',
    currency: 'XOF',
    paymentTerms: '30 jours',
    ...initialData,
  });

  // Mettre à jour l'ID avec le numéro prévisualisé
  useEffect(() => {
    if (isNew && previewNumber && !formData.id) {
      setFormData((prev) => ({ ...prev, id: previewNumber }));
    }
  }, [isNew, previewNumber, formData.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Pour un nouveau client, générer le numéro définitif
      let finalId = formData.id;
      if (isNew && !finalId) {
        try {
          finalId = await getNextNumber.mutateAsync('client');
        } catch (err) {
          logger.error('Failed to generate client number:', err);
          showToast(TOAST.CRUD.ERROR_CREATE('numéro client'), 'error');
          return;
        }
      }

      // Ensure required fields are present for Zod
      const dataToValidate = {
        ...formData,
        id: finalId || `CLT-${Date.now()}`,
        createdAt: formData.createdAt || new Date(),
        tenantId: formData.tenantId || user?.tenantId || '',
      };

      const validatedData = ClientSchema.parse(dataToValidate);
      onSave(validatedData as Client);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.issues[0];
        showToast(mapError(`${firstError.path.join('.')}: ${firstError.message}`, 'client'), 'error');
      } else {
        showToast(TOAST.VALIDATION.FORM_ERRORS, 'error');
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Identity Section */}
      <FormSection title="Identité">
        <FormGrid columns={3}>
          {/* Numéro Client */}
          <FormField label="N° Client">
            <div className="relative">
              <Input
                value={formData.id || (isLoadingNumber ? 'Chargement...' : 'Nouveau')}
                readOnly
                className="bg-[var(--bg-elevated)] font-mono cursor-not-allowed"
              />
              {isNew && formData.id && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-green-500 font-medium">
                  Auto
                </span>
              )}
            </div>
          </FormField>
          <FormField label="Nom de la société" required>
            <Input
              required
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Acme Corp"
            />
          </FormField>
          <FormField label="Type">
            <Select
              value={formData.type || 'B2B'}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
            >
              <option value="B2B">Entreprise (B2B)</option>
              <option value="B2C">Particulier (B2C)</option>
            </Select>
          </FormField>
          <FormField label="Statut">
            <Select
              value={formData.status || 'ACTIVE'}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
            >
              <option value="ACTIVE">Actif</option>
              <option value="SUSPENDED">Suspendu</option>
              <option value="CHURNED">Perdu</option>
            </Select>
          </FormField>
          <FormField label="Revendeur">
            <Select
              value={formData.resellerId || ''}
              onChange={(e) => {
                const reseller = tiers.find((t) => t.id === e.target.value);
                setFormData({ ...formData, resellerId: e.target.value, resellerName: reseller?.name });
              }}
            >
              <option value="">-- Aucun (Global) --</option>
              {tiers
                .filter((t) => t.type === 'RESELLER')
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
            </Select>
          </FormField>
        </FormGrid>
      </FormSection>

      {/* Contact Section */}
      <FormSection title="Contact Principal">
        <FormGrid columns={3}>
          <FormField label="Nom du contact" required>
            <Input
              required
              value={formData.contactName || ''}
              onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
              placeholder="Ex: John Doe"
            />
          </FormField>
          <FormField label="Email">
            <Input
              type="email"
              value={formData.email || ''}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="email@example.com"
            />
          </FormField>
          <FormField label="Téléphone">
            <Input
              type="tel"
              value={formData.phone || ''}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+221..."
            />
          </FormField>
          <FormField label="Contact Secondaire" className="md:col-span-3">
            <Input
              value={formData.secondContactName || ''}
              onChange={(e) => setFormData({ ...formData, secondContactName: e.target.value })}
              placeholder="Nom du contact secondaire"
            />
          </FormField>
        </FormGrid>
      </FormSection>

      {/* Address Section */}
      <FormSection title="Localisation">
        <FormGrid columns={3}>
          <FormField label="Adresse" className="md:col-span-3">
            <Input
              value={formData.address || ''}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Adresse complète"
            />
          </FormField>
          <FormField label="Ville">
            <Input value={formData.city || ''} onChange={(e) => setFormData({ ...formData, city: e.target.value })} />
          </FormField>
          <FormField label="Pays">
            <Input
              value={formData.country || ''}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
            />
          </FormField>
        </FormGrid>
      </FormSection>

      {/* Commercial Section */}
      <FormSection title="Commercial & Financier">
        <FormGrid columns={3}>
          <FormField label="Plan d'abonnement">
            <Select
              value={formData.subscriptionPlan || 'Standard'}
              onChange={(e) => setFormData({ ...formData, subscriptionPlan: e.target.value })}
            >
              <option value="Basic">Basic</option>
              <option value="Standard">Standard</option>
              <option value="Enterprise">Enterprise</option>
            </Select>
          </FormField>
          <FormField label="Segment">
            <Select
              value={formData.segment || 'Standard'}
              onChange={(e) => setFormData({ ...formData, segment: e.target.value })}
            >
              <option value="Standard">Standard</option>
              <option value="VIP">VIP</option>
              <option value="Grand Compte">Grand Compte</option>
            </Select>
          </FormField>
          <FormField label="Secteur">
            <Input
              value={formData.sector || ''}
              onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
              placeholder="Ex: Transport"
            />
          </FormField>
          <FormField label="Langue">
            <Input
              value={formData.language || 'Français'}
              onChange={(e) => setFormData({ ...formData, language: e.target.value })}
            />
          </FormField>
          <FormField label="Conditions de paiement">
            <Select
              value={formData.paymentTerms || '30 jours fin de mois'}
              onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
            >
              <option value="Comptant">Comptant</option>
              <option value="30 jours fin de mois">30 jours fin de mois</option>
              <option value="60 jours">60 jours</option>
            </Select>
          </FormField>
          <FormField label="Devise">
            <Select
              value={formData.currency || 'XOF'}
              onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
            >
              <option value="XOF">XOF (CFA)</option>
              <option value="EUR">EUR (€)</option>
              <option value="USD">USD ($)</option>
            </Select>
          </FormField>
        </FormGrid>
      </FormSection>

      {/* Account Creation */}
      <div className="bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] p-4 rounded-xl border border-[var(--primary)] dark:border-[var(--primary)]">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.createUserAccount !== false}
            onChange={(e) => setFormData({ ...formData, createUserAccount: e.target.checked })}
            className="w-5 h-5 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
          />
          <div>
            <span className="block text-sm font-bold text-[var(--text-primary)]">Créer un compte utilisateur</span>
            <span className="block text-xs text-[var(--text-secondary)]">
              Un compte sera automatiquement créé avec un mot de passe par défaut.
            </span>
          </div>
        </label>
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t border-[var(--border)] border-[var(--border)] mt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2.5 border border-[var(--border)] rounded-xl text-sm font-bold tr-hover flex items-center gap-2 transition-colors"
        >
          <X className="w-4 h-4" /> Annuler
        </button>
        <button
          type="submit"
          className="px-4 py-2.5 bg-[var(--primary)] text-white rounded-xl text-sm font-bold hover:bg-[var(--primary-light)] flex items-center gap-2 transition-colors"
        >
          <Save className="w-4 h-4" /> Enregistrer
        </button>
      </div>
    </form>
  );
};
