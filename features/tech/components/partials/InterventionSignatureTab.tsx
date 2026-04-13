/**
 * Signature Tab Partial for InterventionForm
 * Contains: Invoicing, Photos, Signatures
 */

import React from 'react';
import { FileText, Camera, Trash2 } from 'lucide-react';
import type { Intervention, Invoice } from '../../../../types';
import { TOAST } from '../../../../constants/toastMessages';
import { SignaturePad } from '../../../../components/SignaturePad';
import { useCurrency } from '../../../../hooks/useCurrency';

interface SignatureTabProps {
  formData: Partial<Intervention>;
  setFormData: (data: Partial<Intervention>) => void;
  catalogItems: any[];
  technicianSignature: string | null;
  addInvoice: (invoice: Invoice) => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const InterventionSignatureTab: React.FC<SignatureTabProps> = ({
  formData,
  setFormData,
  catalogItems,
  technicianSignature,
  addInvoice,
  showToast,
}) => {
  const { formatPrice } = useCurrency();

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300 h-full flex flex-col">
      {/* Invoicing Section */}
      <div className="bg-[var(--bg-elevated)] p-4 rounded-xl border border-[var(--border)] shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h4 className="section-title flex items-center gap-2">
            <FileText className="w-4 h-4" /> Facturation
          </h4>
          <label className="flex items-center gap-2 cursor-pointer bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] px-3 py-1 rounded-full border border-[var(--primary)] dark:border-[var(--primary)]">
            <input
              type="checkbox"
              checked={formData.updateContract || false}
              onChange={(e) => setFormData({ ...formData, updateContract: e.target.checked })}
              className="w-4 h-4 text-[var(--primary)] rounded border-[var(--border)] focus:ring-[var(--primary)]"
            />
            <span className="text-xs font-bold text-[var(--primary)] dark:text-[var(--primary)] uppercase">
              Mise à jour Contrat
            </span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer bg-[var(--clr-success-dim)] px-3 py-1 rounded-full border border-[var(--clr-success-border)]">
            <input
              type="checkbox"
              checked={formData.generateInvoice || false}
              onChange={(e) => setFormData({ ...formData, generateInvoice: e.target.checked })}
              className="w-4 h-4 text-green-600 rounded border-[var(--border)] focus:ring-green-500"
            />
            <span className="text-xs font-bold text-[var(--clr-success)] uppercase">Générer Facture</span>
          </label>
        </div>

        <div className="space-y-4">
          {/* Invoice Items Table */}
          <div className="border border-[var(--border)] rounded-lg overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-[var(--bg-elevated)] text-[var(--text-secondary)] font-medium">
                <tr>
                  <th className="p-3">Article</th>
                  <th className="p-3 w-24 text-center">Qté</th>
                  <th className="p-3 w-32 text-right">Prix U.</th>
                  <th className="p-3 w-32 text-right">Total</th>
                  <th className="p-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {formData.invoiceItems?.map((item, idx) => (
                  <tr key={idx} className="tr-hover/50">
                    <td className="p-3">{item.description}</td>
                    <td className="p-3 text-center">{item.quantity}</td>
                    <td className="p-3 text-right">{formatPrice(item.unitPrice)}</td>
                    <td className="p-3 text-right font-medium">{formatPrice(item.quantity * item.unitPrice)}</td>
                    <td className="p-3 text-center">
                      <button
                        title="Supprimer l'article"
                        onClick={() => {
                          const newItems = [...(formData.invoiceItems || [])];
                          newItems.splice(idx, 1);
                          const newTotal = newItems.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
                          setFormData({ ...formData, invoiceItems: newItems, cost: newTotal });
                        }}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {(!formData.invoiceItems || formData.invoiceItems.length === 0) && (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-[var(--text-muted)] italic">
                      Aucun article facturé
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot className="bg-[var(--bg-elevated)] font-bold">
                <tr>
                  <td colSpan={3} className="p-3 text-right">
                    Total HT
                  </td>
                  <td className="p-3 text-right text-[var(--primary)]">{formatPrice(formData.cost || 0)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Add Item Select */}
          <div className="flex gap-2">
            <select
              title="Ajouter un article"
              className="flex-1 p-2 border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] text-sm"
              onChange={(e) => {
                const item = catalogItems.find((i) => i.id === e.target.value);
                if (item) {
                  const newItem = {
                    id: item.id,
                    description: item.name,
                    quantity: 1,
                    unitPrice: item.price,
                    total: item.price,
                  };
                  const currentItems = formData.invoiceItems || [];
                  const newItems = [...currentItems, newItem];
                  const newTotal = newItems.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);

                  const shouldUpdateContract =
                    formData.updateContract ||
                    item.includesSubscription ||
                    item.category === 'Package' ||
                    item.category === 'Abonnement';

                  setFormData({
                    ...formData,
                    invoiceItems: newItems,
                    cost: newTotal,
                    updateContract: shouldUpdateContract,
                  });
                  e.target.value = '';
                }
              }}
            >
              <option value="">Ajouter un article du catalogue...</option>
              {catalogItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} - {formatPrice(item.price)}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-[var(--border)] border-[var(--border)]">
            <div className="space-y-1">
              <label className="section-title">Montant Reçu (Espèces)</label>
              <div className="relative">
                <input
                  type="number"
                  className="w-full p-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] text-sm font-mono"
                  value={formData.paymentReceived || ''}
                  onChange={(e) => setFormData({ ...formData, paymentReceived: parseFloat(e.target.value) })}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="space-y-1 flex items-end">
              <label className="flex items-center gap-2 p-2.5 border border-[var(--border)] rounded-lg cursor-pointer tr-hover w-full">
                <input
                  type="checkbox"
                  checked={formData.paymentDeposited || false}
                  onChange={(e) => setFormData({ ...formData, paymentDeposited: e.target.checked })}
                  className="w-4 h-4 text-green-600 rounded border-[var(--border)] focus:ring-green-500"
                />
                <span className="text-sm font-medium text-[var(--text-primary)]">Argent déposé à la caisse</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Photos Section */}
      <div className="bg-[var(--bg-elevated)] p-4 rounded-xl border border-[var(--border)] shadow-sm">
        <h4 className="section-title mb-4 flex items-center gap-2">
          <Camera className="w-4 h-4" /> Photos
        </h4>
        <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
          {formData.photos?.map((photo, idx) => (
            <div
              key={idx}
              className="aspect-square bg-[var(--bg-elevated)] bg-[var(--bg-surface)] rounded-lg border border-[var(--border)] flex items-center justify-center relative group overflow-hidden"
            >
              <img src={photo} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover rounded-lg" />
              <button
                title="Supprimer photo"
                onClick={() => {
                  const newPhotos = [...(formData.photos || [])];
                  newPhotos.splice(idx, 1);
                  setFormData({ ...formData, photos: newPhotos });
                  showToast(TOAST.CRUD.DELETED('Photo'), 'info');
                }}
                className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
          <label className="aspect-square border-2 border-dashed border-[var(--border)] rounded-lg flex flex-col items-center justify-center cursor-pointer tr-hover transition-colors">
            <Camera className="w-4 h-4 text-[var(--text-muted)] mb-1" />
            <span className="text-[10px] text-[var(--text-secondary)]">Ajouter</span>
            <input
              type="file"
              className="hidden"
              accept="image/*"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  const file = e.target.files[0];
                  const url = URL.createObjectURL(file);
                  setFormData({ ...formData, photos: [...(formData.photos || []), url] });
                  showToast(TOAST.CRUD.CREATED('Photo'), 'success');
                }
              }}
            />
          </label>
        </div>
      </div>

      {/* Signatures Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Technician Signature */}
        <div className="bg-[var(--bg-elevated)] p-4 rounded-xl border border-[var(--border)] shadow-sm flex flex-col">
          <h4 className="section-title mb-2 flex items-center gap-2">
            Signature Technicien
            {technicianSignature && (
              <span className="text-[10px] font-normal text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                Auto (profil)
              </span>
            )}
          </h4>
          {formData.signatureTech ? (
            <div className="relative flex-1">
              <img
                src={formData.signatureTech}
                alt="Signature Tech"
                className="w-full h-32 object-contain border border-[var(--border)] rounded bg-white"
              />
              {!technicianSignature && (
                <button
                  onClick={() => setFormData({ ...formData, signatureTech: undefined })}
                  title="Supprimer signature"
                  className="absolute top-0 right-0 p-1 bg-red-100 text-red-600 rounded-bl"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              {technicianSignature && (
                <p className="text-[10px] text-[var(--text-secondary)] mt-1 text-center">
                  Signature récupérée du profil technicien
                </p>
              )}
            </div>
          ) : (
            <SignaturePad onSave={(data) => setFormData({ ...formData, signatureTech: data })} />
          )}
        </div>

        {/* Client Signature */}
        <div className="bg-[var(--bg-elevated)] p-4 rounded-xl border border-[var(--border)] shadow-sm flex flex-col">
          <h4 className="section-title mb-2">Signature Client</h4>
          {formData.signatureClient ? (
            <div className="relative">
              <img
                src={formData.signatureClient}
                alt="Signature Client"
                className="w-full h-32 object-contain border border-[var(--border)] rounded bg-white"
              />
              <button
                onClick={() => setFormData({ ...formData, signatureClient: undefined })}
                title="Supprimer signature"
                className="absolute top-0 right-0 p-1 bg-red-100 text-red-600 rounded-bl"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <SignaturePad onSave={(data) => setFormData({ ...formData, signatureClient: data })} />
          )}
        </div>
      </div>
    </div>
  );
};
