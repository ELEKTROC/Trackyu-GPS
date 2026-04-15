import React, { useState, useEffect } from 'react';
import type { CatalogItem } from '../../../types';
import { useDataContext } from '../../../contexts/DataContext';
import { useToast } from '../../../contexts/ToastContext';
import { TOAST } from '../../../constants/toastMessages';
import { mapError } from '../../../utils/errorMapper';
import { CatalogSchema, type CatalogInput } from '../../../schemas/catalogSchema';
import { SYSCOHADA_ACCOUNTS } from '../../../constants';
import { useCurrency } from '../../../hooks/useCurrency';
import { FormField, Input, Select, Textarea, FormGrid } from '../../../components/form';
import { z } from 'zod';
import { api } from '../../../services/apiLazy';

interface CatalogFormProps {
  initialData?: Partial<CatalogItem>;
  onSave: (item: CatalogItem) => void;
  onCancel: () => void;
}

export const CatalogForm: React.FC<CatalogFormProps> = ({ initialData, onSave, onCancel }) => {
  const { showToast } = useToast();
  const { tiers } = useDataContext();
  const { currency } = useCurrency();
  const deriveType = (category?: string, currentType?: string): 'Produit' | 'Service' => {
    if (category === 'Abonnement' || category === 'Prestation') return 'Service';
    if (category === 'Matériel') return 'Produit';
    return (currentType as 'Produit' | 'Service') || 'Produit';
  };

  const [formData, setFormData] = useState<Partial<CatalogItem>>({
    isSellable: true,
    isPurchasable: false,
    trackStock: false,
    status: 'ACTIVE',
    category: 'Matériel',
    ...initialData,
    // Auto-correction type/catégorie (Abonnement/Prestation → Service, Matériel → Produit)
    type: deriveType(initialData?.category, initialData?.type),
    // Normalise null → undefined pour les champs optionnels (null = PostgreSQL NULL)
    minPrice: initialData?.minPrice ?? undefined,
    maxPrice: initialData?.maxPrice ?? undefined,
    taxRate: initialData?.taxRate ?? 0,
  });

  // Pré-remplir le taux de TVA depuis les paramètres du tenant (création et modification)
  useEffect(() => {
    api.tenants
      .getCurrent()
      .then((tenant: any) => {
        const rate = parseFloat(tenant.taxRate ?? tenant.default_tax_rate ?? tenant.settings?.taxRate ?? '0');
        if (!isNaN(rate)) setFormData((prev) => ({ ...prev, taxRate: rate }));
      })
      .catch(() => {});
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500 * 1024) {
        showToast('Image trop volumineuse (max 500 Ko)', 'error');
        e.target.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({ ...prev, imageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Normalise null → undefined pour tous les champs (PostgreSQL NULL ≠ undefined Zod)
      const sanitized = Object.fromEntries(Object.entries(formData).map(([k, v]) => [k, v === null ? undefined : v]));
      const validatedData = CatalogSchema.parse(sanitized);
      onSave(validatedData as CatalogItem);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('[CatalogForm] Zod validation failed:', JSON.stringify(error.issues, null, 2));
        console.error('[CatalogForm] formData:', JSON.stringify(formData, null, 2));
        error.issues.forEach((err) => {
          showToast(mapError(err.message), 'error');
        });
      } else {
        console.error('[CatalogForm] Unexpected error:', error);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormGrid cols={3}>
        {/* ID & Name */}
        <FormField label="Référence / ID">
          <Input
            value={formData.id || ''}
            onChange={(e) => setFormData({ ...formData, id: e.target.value })}
            placeholder="Auto-généré si vide"
          />
        </FormField>
        <FormField label="Nom de l'article" required className="col-span-2">
          <Input
            required
            value={formData.name || ''}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </FormField>

        {/* Checkboxes */}
        <div className="col-span-3 flex gap-6 p-4 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border)]">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isSellable}
              onChange={(e) => setFormData({ ...formData, isSellable: e.target.checked })}
              className="rounded text-[var(--primary)] focus:ring-[var(--primary)]"
            />
            <span className="text-sm font-medium">Vendable</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isPurchasable}
              onChange={(e) => setFormData({ ...formData, isPurchasable: e.target.checked })}
              className="rounded text-[var(--primary)] focus:ring-[var(--primary)]"
            />
            <span className="text-sm font-medium">Achetable</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.trackStock}
              onChange={(e) => setFormData({ ...formData, trackStock: e.target.checked })}
              className="rounded text-[var(--primary)] focus:ring-[var(--primary)]"
            />
            <span className="text-sm font-medium">Suivre le stock</span>
          </label>
        </div>

        <FormField label="Catégorie">
          <Select
            value={formData.category || 'Matériel'}
            onChange={(e) => {
              const category = e.target.value as CatalogInput['category'];
              let type = formData.type;
              if (category === 'Matériel') type = 'Produit';
              if (category === 'Abonnement' || category === 'Prestation') type = 'Service';
              setFormData({ ...formData, category, type });
            }}
          >
            <option value="Matériel">Matériel</option>
            <option value="Abonnement">Abonnement</option>
            <option value="Prestation">Prestation</option>
            <option value="Package">Package</option>
          </Select>
        </FormField>
        <FormField label="Type">
          <Select
            value={formData.type || 'Produit'}
            onChange={(e) => setFormData({ ...formData, type: e.target.value as CatalogInput['type'] })}
          >
            <option value="Produit">Produit</option>
            <option value="Service">Service</option>
          </Select>
        </FormField>
        <FormField label={`Prix Unitaire (${currency})`} required>
          <Input
            type="number"
            required
            value={formData.price ?? ''}
            onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
          />
        </FormField>
        <FormField label={`Prix Minimum (${currency})`}>
          <Input
            type="number"
            value={formData.minPrice ?? ''}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              setFormData({ ...formData, minPrice: isNaN(v) ? undefined : v });
            }}
          />
        </FormField>
        <FormField label={`Prix Maximum (${currency})`}>
          <Input
            type="number"
            value={formData.maxPrice ?? ''}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              setFormData({ ...formData, maxPrice: isNaN(v) ? undefined : v });
            }}
          />
        </FormField>
        <FormField label="Unité">
          <Input
            placeholder="ex: unité, /mois, forfait"
            value={formData.unit || ''}
            onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
          />
        </FormField>
        <FormField label="TVA (%)">
          <Input
            type="number"
            value={formData.taxRate ?? 0}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              setFormData({ ...formData, taxRate: isNaN(v) ? 0 : v });
            }}
          />
        </FormField>
        <FormField label="Statut (Lecture seule)">
          <Select value={formData.status || 'ACTIVE'} disabled className="bg-[var(--bg-elevated)] cursor-not-allowed">
            <option value="ACTIVE">Actif</option>
            <option value="INACTIVE">Inactif</option>
          </Select>
        </FormField>
        <FormField label="Revendeur">
          <Select
            value={formData.resellerId || ''}
            disabled={!!initialData?.id}
            onChange={(e) => {
              const reseller = tiers.find((r) => r.id === e.target.value);
              setFormData({
                ...formData,
                resellerId: e.target.value,
                resellerName: reseller?.name || (e.target.value === 'tenant_trackyu' ? 'TrackYu System' : undefined),
              });
            }}
            className={initialData?.id ? 'opacity-50 cursor-not-allowed' : ''}
          >
            <option value="">-- Aucun (Global) --</option>
            <option value="tenant_trackyu">TrackYu System (Système)</option>
            {tiers
              .filter((t) => t.type === 'RESELLER')
              .map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
          </Select>
        </FormField>

        {/* Accounting */}
        {formData.isSellable && (
          <FormField label="Compte Vente">
            <Select
              value={formData.accountingAccountSale || ''}
              onChange={(e) => setFormData({ ...formData, accountingAccountSale: e.target.value })}
            >
              <option value="">-- Sélectionner --</option>
              {SYSCOHADA_ACCOUNTS.filter((a) => a.class === '7').map((acc) => (
                <option key={acc.code} value={acc.code}>
                  {acc.code} - {acc.label}
                </option>
              ))}
            </Select>
          </FormField>
        )}

        {formData.isPurchasable && (
          <FormField label="Compte Achat">
            <Select
              value={formData.accountingAccountPurchase || ''}
              onChange={(e) => setFormData({ ...formData, accountingAccountPurchase: e.target.value })}
            >
              <option value="">-- Sélectionner --</option>
              {SYSCOHADA_ACCOUNTS.filter((a) => a.class === '6').map((acc) => (
                <option key={acc.code} value={acc.code}>
                  {acc.code} - {acc.label}
                </option>
              ))}
            </Select>
          </FormField>
        )}

        {/* Image Upload */}
        <FormField label="Image">
          <div className="flex items-center gap-4">
            {formData.imageUrl && (
              <img src={formData.imageUrl} alt="Preview" className="w-12 h-12 object-cover rounded-xl border" />
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="text-sm text-[var(--text-secondary)] file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-[var(--primary-dim)] file:text-[var(--primary)] hover:file:bg-[var(--primary-dim)]"
            />
          </div>
        </FormField>

        <FormField label="Description" className="col-span-3">
          <Textarea
            value={formData.description || ''}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
          />
        </FormField>
      </FormGrid>
      <div className="flex justify-end gap-2 pt-4 border-t border-[var(--border)]">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2.5 text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] rounded-xl transition-colors"
        >
          Annuler
        </button>
        <button
          type="submit"
          className="px-4 py-2.5 bg-[var(--primary)] text-white rounded-xl hover:bg-[var(--primary-light)] transition-colors font-medium"
        >
          Enregistrer
        </button>
      </div>
    </form>
  );
};
