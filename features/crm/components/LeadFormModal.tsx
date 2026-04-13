import React, { useState } from 'react';
import type { Lead, CatalogItem, Tier } from '../../../types';
import { Modal } from '../../../components/Modal';
import { useToast } from '../../../contexts/ToastContext';
import { TOAST } from '../../../constants/toastMessages';
import { mapError } from '../../../utils/errorMapper';
import { useAuth } from '../../../contexts/AuthContext';
import { X, ArrowRight } from 'lucide-react';
import { FormField, FormGrid, Input, Select, Textarea } from '../../../components/form';

interface LeadFormModalProps {
  isOpen: boolean;
  lead: Partial<Lead>;
  catalogItems: CatalogItem[];
  tiers: Tier[];
  onSave: (lead: Lead) => void | Promise<void>;
  onClose: () => void;
  existingLeads?: Lead[];
  /** Mode saisie rapide : 3 champs essentiels, modal compact */
  quickMode?: boolean;
}

export const LeadFormModal: React.FC<LeadFormModalProps> = ({
  isOpen,
  lead: initialLead,
  catalogItems,
  tiers,
  onSave,
  onClose,
  existingLeads = [],
  quickMode = false,
}) => {
  const { showToast } = useToast();
  const { user } = useAuth();
  const [editingLead, setEditingLead] = useState<Partial<Lead>>(initialLead);
  const [expanded, setExpanded] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Reset state when modal opens/closes or when initialLead changes
  React.useEffect(() => {
    setEditingLead(initialLead);
    setHasChanges(false);
    setExpanded(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  /** Update a field and mark form dirty */
  const updateField = (patch: Partial<Lead>) => {
    setEditingLead((prev) => ({ ...prev, ...patch }));
    setHasChanges(true);
  };

  const checkDuplicate = (email: string, companyName: string): string | null => {
    if (email) {
      const emailDuplicate = existingLeads.find(
        (l) => l.id !== editingLead.id && l.email?.toLowerCase() === email.toLowerCase()
      );
      if (emailDuplicate) return `Un lead avec cet email existe déjà: ${emailDuplicate.companyName}`;
    }
    if (companyName) {
      const companyDuplicate = existingLeads.find(
        (l) => l.id !== editingLead.id && l.companyName?.toLowerCase() === companyName.toLowerCase()
      );
      if (companyDuplicate) return `Un lead avec cette société existe déjà: ${companyDuplicate.contactName}`;
    }
    return null;
  };

  const [isSaving, setIsSaving] = useState(false);
  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const duplicateError = checkDuplicate(editingLead.email || '', editingLead.companyName || '');
      if (duplicateError) {
        showToast(TOAST.CRM.LEAD_DUPLICATE_WARNING(duplicateError), 'warning');
      }

      const calculatedValue =
        editingLead.interestedProducts?.reduce((sum, p) => sum + p.price * (p.quantity || 1), 0) ||
        editingLead.potentialValue ||
        0;

      const leadData = {
        id: editingLead.id || `LEAD-${Date.now()}`,
        companyName: editingLead.companyName,
        contactName: editingLead.contactName,
        email: editingLead.email || '',
        phone: editingLead.phone || '',
        status: editingLead.status || 'NEW',
        potentialValue: calculatedValue,
        assignedTo: user?.id || '',
        createdAt: editingLead.createdAt || new Date(),
        interestedProducts: editingLead.interestedProducts || [],
        notes: editingLead.notes || '',
        type: editingLead.type || 'B2B',
        sector: editingLead.sector,
        resellerId: editingLead.resellerId,
        resellerName: editingLead.resellerName,
      };

      if (!leadData.companyName) {
        showToast(TOAST.VALIDATION.REQUIRED_FIELD('nom'), 'error');
        return;
      }

      await onSave(leadData as Lead);
      setHasChanges(false);
    } catch (error) {
      console.error('[LeadForm] Unexpected error:', error);
      showToast(mapError(error, 'lead'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const isQuick = quickMode && !expanded;

  if (isQuick) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Nouveau Lead" maxWidth="max-w-md" isDirty={hasChanges}>
        <div className="space-y-4 p-1">
          <FormField label="Société / Nom" required>
            <Input
              value={editingLead.companyName || ''}
              onChange={(e) => updateField({ companyName: e.target.value })}
              placeholder="Nom de l'entreprise ou du contact"
              autoFocus
            />
          </FormField>
          <FormField label="Contact Principal">
            <Input
              value={editingLead.contactName || ''}
              onChange={(e) => updateField({ contactName: e.target.value })}
              placeholder="Nom du contact"
            />
          </FormField>
          <FormField label="Téléphone">
            <Input
              type="tel"
              value={editingLead.phone || ''}
              onChange={(e) => updateField({ phone: e.target.value })}
              placeholder="0102030405"
            />
          </FormField>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="flex items-center gap-1 text-xs text-[var(--primary)] hover:text-[var(--primary)] font-medium"
            >
              Formulaire complet
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-3 py-2 border border-[var(--border)] rounded-xl text-sm font-bold tr-hover transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 bg-[var(--primary)] text-white rounded-xl text-sm font-bold hover:bg-[var(--primary-light)] transition-colors disabled:opacity-60"
              >
                {isSaving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingLead.id ? 'Modifier le Lead' : 'Nouveau Lead'}
      maxWidth="max-w-6xl"
      isDirty={hasChanges}
    >
      <div className="space-y-4 p-1">
        <FormGrid columns={3}>
          <FormField label="Type de Lead">
            <Select
              value={editingLead.type || 'B2B'}
              onChange={(e) => updateField({ type: e.target.value as 'B2B' | 'B2C' })}
            >
              <option value="B2B">Société (B2B)</option>
              <option value="B2C">Particulier (B2C)</option>
            </Select>
          </FormField>
          <FormField label={editingLead.type === 'B2C' ? 'Nom Complet' : 'Société'} required>
            <Input
              value={editingLead.companyName || ''}
              onChange={(e) => updateField({ companyName: e.target.value })}
              placeholder={editingLead.type === 'B2C' ? 'Nom Prénom' : "Nom de l'entreprise"}
            />
          </FormField>
          <FormField label="Contact Principal" required={editingLead.type === 'B2B'}>
            <Input
              value={editingLead.contactName || ''}
              onChange={(e) => updateField({ contactName: e.target.value })}
              placeholder="Nom du contact"
            />
          </FormField>
          <FormField label="Secteur d'activité">
            <Select value={editingLead.sector || ''} onChange={(e) => updateField({ sector: e.target.value })}>
              <option value="">-- Sélectionner --</option>
              <option value="TRANSPORT">Transport & Logistique</option>
              <option value="BTP">BTP & Construction</option>
              <option value="SERVICES">Services</option>
              <option value="COMMERCE">Commerce & Distribution</option>
              <option value="INDUSTRIE">Industrie</option>
              <option value="AGRICULTURE">Agriculture</option>
              <option value="AUTRE">Autre</option>
            </Select>
          </FormField>
          <FormField label="Email">
            <Input
              type="email"
              value={editingLead.email || ''}
              onChange={(e) => updateField({ email: e.target.value })}
              placeholder="email@exemple.com"
            />
          </FormField>
          <FormField label="Téléphone">
            <Input
              type="tel"
              value={editingLead.phone || ''}
              onChange={(e) => updateField({ phone: e.target.value })}
              placeholder="0102030405"
            />
          </FormField>
          <FormField label="Revendeur">
            <Select
              value={editingLead.resellerId || ''}
              onChange={(e) => {
                const reseller = tiers.find((t) => t.id === e.target.value);
                updateField({ resellerId: e.target.value, resellerName: reseller?.name });
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

        <FormField label="Produits / Services Intéressés">
          <div className="border border-[var(--border)] rounded-xl p-3 bg-[var(--bg-elevated)] space-y-3">
            <Select
              onChange={(e) => {
                const selectedProduct = catalogItems.find((i) => i.id === e.target.value);
                if (selectedProduct) {
                  const newProducts = [...(editingLead.interestedProducts || []), { ...selectedProduct, quantity: 1 }];
                  updateField({ interestedProducts: newProducts });
                }
              }}
              value=""
            >
              <option value="">-- Ajouter un produit --</option>
              {catalogItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({(item.price ?? 0).toLocaleString('fr-FR')})
                </option>
              ))}
            </Select>

            <div className="space-y-2">
              {(editingLead.interestedProducts || []).map((product, idx) => (
                <div
                  key={product.id}
                  className="flex items-center gap-2 bg-[var(--bg-elevated)] p-2.5 rounded-xl border border-[var(--border)]"
                >
                  <div className="flex-1">
                    <div className="text-sm font-bold text-[var(--text-primary)]">{product.name}</div>
                    <div className="text-xs text-[var(--text-secondary)]">
                      {(product.price ?? 0).toLocaleString('fr-FR')} / unité
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      className="w-16 text-center"
                      value={product.quantity || 1}
                      onChange={(e) => {
                        const newProducts = [...(editingLead.interestedProducts || [])];
                        newProducts[idx] = { ...product, quantity: parseInt(e.target.value) || 1 };
                        updateField({ interestedProducts: newProducts });
                      }}
                    />
                    <button
                      onClick={() => {
                        const newProducts = (editingLead.interestedProducts || []).filter((p) => p.id !== product.id);
                        updateField({ interestedProducts: newProducts });
                      }}
                      className="p-1.5 text-red-500 hover:bg-[var(--clr-danger-dim)] rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              {(!editingLead.interestedProducts || editingLead.interestedProducts.length === 0) && (
                <div className="text-center text-xs text-[var(--text-muted)] italic py-2">
                  Aucun produit sélectionné
                </div>
              )}
            </div>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-1 text-right">
            Valeur estimée:{' '}
            <span className="font-bold text-[var(--primary)]">
              {(
                editingLead.interestedProducts?.reduce((sum, p) => sum + p.price * (p.quantity || 1), 0) || 0
              ).toLocaleString()}
            </span>
          </p>
        </FormField>

        <FormField label="Notes">
          <Textarea
            rows={3}
            value={editingLead.notes || ''}
            onChange={(e) => updateField({ notes: e.target.value })}
            placeholder="Notes, besoins spécifiques..."
          />
        </FormField>

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2.5 border border-[var(--border)] rounded-xl text-sm font-bold tr-hover transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2.5 bg-[var(--primary)] text-white rounded-xl text-sm font-bold hover:bg-[var(--primary-light)] transition-colors disabled:opacity-60"
          >
            {isSaving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </Modal>
  );
};
