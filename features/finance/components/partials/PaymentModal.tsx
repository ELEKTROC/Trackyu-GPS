// PaymentModal.tsx - Extracted from AccountingView.tsx
// Modal for creating new incoming payments
// Includes Sprint 2 - Double Validation workflow indicator

import React, { useMemo, useState } from 'react';
import { Plus, Trash2, Paperclip, FileText, AlertTriangle, Shield, Save, Loader2 } from 'lucide-react';
import type { Invoice, Client, Tier, Vehicle, Contract } from '../../../../types';
import { requiresApproval, getApprovalConfig } from '../../../../services/paymentApprovalService';

interface PaymentAllocation {
  invoiceId: string;
  amount: number;
}

interface PaymentFormData {
  clientId: string;
  resellerId: string;
  date: string;
  method: string;
  reference: string;
  amount: number;
  allocations: PaymentAllocation[];
  vehicleId: string;
  contractId: string;
  notes: string;
  attachments: string[];
  // Specific fields by method
  bankName?: string;
  checkNumber?: string;
  transactionId?: string;
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  paymentForm: PaymentFormData;
  setPaymentForm: React.Dispatch<React.SetStateAction<PaymentFormData>>;
  onSubmit: (e: React.FormEvent) => void | Promise<void>;
  onSaveDraft?: () => void;
  // Data sources
  tiers: Tier[];
  clients: Client[];
  invoices: Invoice[];
  vehicles: Vehicle[];
  contracts: Contract[];
  // Allocation helpers
  selectedInvoiceToAdd: string;
  setSelectedInvoiceToAdd: React.Dispatch<React.SetStateAction<string>>;
  totalAllocatedAmount: number;
  onAddAllocation: () => void;
  onRemoveAllocation: (invoiceId: string) => void;
  onUpdateAllocationAmount: (invoiceId: string, amount: number) => void;
  // Formatting
  formatPrice: (value: number) => string;
  // Tenant for approval check
  tenantId?: string;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  paymentForm,
  setPaymentForm,
  onSubmit,
  onSaveDraft,
  tiers,
  clients,
  invoices,
  vehicles,
  contracts,
  selectedInvoiceToAdd,
  setSelectedInvoiceToAdd,
  totalAllocatedAmount,
  onAddAllocation,
  onRemoveAllocation,
  onUpdateAllocationAmount,
  formatPrice,
  tenantId = 'default',
}) => {
  const [isSaving, setIsSaving] = useState(false);

  // Sprint 2: Check if payment requires approval (hooks before early return)
  const needsApproval = useMemo(
    () => requiresApproval({ amount: paymentForm.amount }, tenantId),
    [paymentForm.amount, tenantId]
  );

  const approvalConfig = useMemo(() => getApprovalConfig(tenantId), [tenantId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await onSubmit(e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-[var(--bg-elevated)] rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col">
        <div className="p-4 border-b border-[var(--border)] flex justify-between items-center bg-[var(--bg-elevated)] shrink-0">
          <h3 className="font-bold text-[var(--text-primary)]">Nouveau Paiement Entrant</h3>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-secondary)]">
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* CLIENT & RESELLER */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">Client</label>
              <select
                className="w-full p-2 border border-[var(--border)] rounded-lg bg-[var(--bg-elevated)] text-[var(--text-primary)] text-sm"
                value={paymentForm.clientId}
                onChange={(e) => {
                  const client =
                    tiers.find((t) => t.id === e.target.value) || clients.find((c) => c.id === e.target.value);
                  const resellerId = client && 'clientData' in client ? client.clientData?.resellerId || '' : '';
                  // Keep existing reference (generated server-side by numbering service at modal open)
                  setPaymentForm((prev) => ({
                    ...prev,
                    clientId: e.target.value,
                    resellerId,
                    allocations: [],
                  }));
                }}
                required
              >
                <option value="">Sélectionner un client...</option>
                {tiers
                  .filter((t) => t.type === 'CLIENT')
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">Revendeur</label>
              <input
                type="text"
                className="w-full p-2 border border-[var(--border)] rounded-lg bg-[var(--bg-elevated)] text-[var(--text-secondary)] text-sm cursor-not-allowed font-bold"
                value={
                  tiers.find((r) => r.id === paymentForm.resellerId || r.tenantId === paymentForm.resellerId)?.name ||
                  'Auto-rempli'
                }
                readOnly
                placeholder="Auto-rempli"
              />
            </div>
          </div>

          {/* PAYMENT DETAILS */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">Date</label>
              <input
                type="date"
                className="w-full p-2 border border-[var(--border)] rounded-lg bg-[var(--bg-elevated)] text-[var(--text-primary)] text-sm"
                value={paymentForm.date}
                onChange={(e) => setPaymentForm((prev) => ({ ...prev, date: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">
                Référence (Auto)
              </label>
              <input
                type="text"
                className="w-full p-2 border border-[var(--border)] rounded-lg bg-[var(--bg-elevated)] bg-[var(--bg-surface)] text-[var(--text-secondary)] text-sm cursor-not-allowed"
                value={paymentForm.reference}
                readOnly
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">Méthode</label>
              <select
                className="w-full p-2 border border-[var(--border)] rounded-lg bg-[var(--bg-elevated)] text-[var(--text-primary)] text-sm"
                value={paymentForm.method}
                onChange={(e) => setPaymentForm((prev) => ({ ...prev, method: e.target.value }))}
              >
                <option value="VIREMENT">Virement</option>
                <option value="CHEQUE">Chèque</option>
                <option value="ESPECES">Espèces</option>
                <option value="CB">Carte Bancaire</option>
                <option value="PRELEVEMENT">Prélèvement</option>
                <option value="MOBILE_MONEY">Mobile Money</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">
                Montant Total Reçu
              </label>
              <input
                type="number"
                className="w-full p-2 border border-[var(--border)] rounded-lg bg-[var(--bg-elevated)] text-[var(--text-primary)] text-sm font-bold"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm((prev) => ({ ...prev, amount: parseFloat(e.target.value) }))}
                placeholder="0.00"
                required
              />
            </div>
          </div>

          {/* METHOD SPECIFIC FIELDS */}
          {(paymentForm.method === 'CHEQUE' ||
            paymentForm.method === 'VIREMENT' ||
            paymentForm.method === 'MOBILE_MONEY') && (
            <div className="grid grid-cols-2 gap-4 p-3 bg-[var(--primary-dim)]/50 dark:bg-[var(--primary-dim)] border border-[var(--primary)] dark:border-[var(--primary)]/50 rounded-lg animate-in fade-in slide-in-from-top-1 duration-200">
              {paymentForm.method === 'CHEQUE' && (
                <>
                  <div>
                    <label className="block text-[10px] font-bold text-[var(--primary)] dark:text-[var(--primary)] uppercase mb-1">
                      N° du Chèque
                    </label>
                    <input
                      type="text"
                      className="w-full p-2 border border-[var(--border)] dark:border-[var(--primary)] rounded-lg bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm"
                      value={paymentForm.checkNumber || ''}
                      onChange={(e) => setPaymentForm((prev) => ({ ...prev, checkNumber: e.target.value }))}
                      placeholder="Ex: 1234567"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[var(--primary)] dark:text-[var(--primary)] uppercase mb-1">
                      Banque émettrice
                    </label>
                    <input
                      type="text"
                      className="w-full p-2 border border-[var(--border)] dark:border-[var(--primary)] rounded-lg bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm"
                      value={paymentForm.bankName || ''}
                      onChange={(e) => setPaymentForm((prev) => ({ ...prev, bankName: e.target.value }))}
                      placeholder="Ex: NSIA, SIB..."
                      required
                    />
                  </div>
                </>
              )}
              {(paymentForm.method === 'VIREMENT' || paymentForm.method === 'MOBILE_MONEY') && (
                <>
                  <div>
                    <label className="block text-[10px] font-bold text-[var(--primary)] dark:text-[var(--primary)] uppercase mb-1">
                      {paymentForm.method === 'VIREMENT' ? 'Banque / Origine' : 'Opérateur'}
                    </label>
                    <input
                      type="text"
                      className="w-full p-2 border border-[var(--border)] dark:border-[var(--primary)] rounded-lg bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm"
                      value={paymentForm.bankName || ''}
                      onChange={(e) => setPaymentForm((prev) => ({ ...prev, bankName: e.target.value }))}
                      placeholder={
                        paymentForm.method === 'VIREMENT' ? 'Ex: BOA, ECOBANK...' : 'Ex: Orange Money, MTN...'
                      }
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[var(--primary)] dark:text-[var(--primary)] uppercase mb-1">
                      {paymentForm.method === 'VIREMENT' ? 'Référence Virement' : 'ID Transaction'}
                    </label>
                    <input
                      type="text"
                      className="w-full p-2 border border-[var(--border)] dark:border-[var(--primary)] rounded-lg bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm"
                      value={paymentForm.transactionId || ''}
                      onChange={(e) => setPaymentForm((prev) => ({ ...prev, transactionId: e.target.value }))}
                      placeholder="Ex: TRX-998877"
                      required
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {/* INVOICE SELECTION */}
          <div className="p-4 bg-[var(--bg-elevated)]/50 rounded-lg border border-[var(--border)]">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase">
                Allocation Factures
              </label>
              <span
                className={`text-xs font-bold ${paymentForm.amount - totalAllocatedAmount < 0 ? 'text-red-500' : 'text-green-500'}`}
              >
                Reste à allouer: {formatPrice(paymentForm.amount - totalAllocatedAmount)}
              </span>
            </div>

            <div className="flex gap-2 mb-3">
              <select
                className="flex-1 p-2 border border-[var(--border)] rounded-lg bg-[var(--bg-elevated)] text-[var(--text-primary)] text-sm"
                value={selectedInvoiceToAdd}
                onChange={(e) => setSelectedInvoiceToAdd(e.target.value)}
                disabled={!paymentForm.clientId}
              >
                <option value="">Ajouter une facture à régler...</option>
                {invoices
                  .filter(
                    (i) =>
                      i.clientId === paymentForm.clientId &&
                      (i.status === 'SENT' || i.status === 'OVERDUE' || i.status === 'PARTIALLY_PAID')
                  )
                  .filter((i) => !paymentForm.allocations.find((a) => a.invoiceId === i.id))
                  .map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.number} - Reste: {inv.amount}
                    </option>
                  ))}
              </select>
              <button
                type="button"
                onClick={onAddAllocation}
                disabled={!selectedInvoiceToAdd}
                className="p-2 bg-[var(--primary-dim)] text-[var(--primary)] rounded-lg hover:bg-[var(--primary-dim)] disabled:opacity-50"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            {/* ALLOCATIONS TABLE */}
            {paymentForm.allocations.length > 0 && (
              <div className="border border-[var(--border)] rounded-lg overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-[var(--bg-elevated)] text-xs uppercase text-[var(--text-secondary)]">
                    <tr>
                      <th className="px-3 py-2">Facture</th>
                      <th className="px-3 py-2 text-right">Montant alloué</th>
                      <th className="px-3 py-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)] bg-[var(--bg-surface)]">
                    {paymentForm.allocations.map((alloc) => {
                      const inv = invoices.find((i) => i.id === alloc.invoiceId);
                      return (
                        <tr key={alloc.invoiceId}>
                          <td className="px-3 py-2 font-mono">{inv?.number}</td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              className="w-full text-right bg-transparent border-b border-[var(--border)] focus:border-[var(--primary)] outline-none"
                              value={alloc.amount}
                              onChange={(e) => onUpdateAllocationAmount(alloc.invoiceId, parseFloat(e.target.value))}
                            />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => onRemoveAllocation(alloc.invoiceId)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="bg-[var(--bg-elevated)] font-bold">
                      <td className="px-3 py-2 text-right">TOTAL ALLOUÉ</td>
                      <td className="px-3 py-2 text-right">{formatPrice(totalAllocatedAmount)}</td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* CONTEXT (Vehicle / Contract) */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">
                Véhicule (Plaque)
              </label>
              <select
                className="w-full p-2 border border-[var(--border)] rounded-lg bg-[var(--bg-elevated)] text-[var(--text-primary)] text-sm"
                value={paymentForm.vehicleId}
                onChange={(e) => setPaymentForm((prev) => ({ ...prev, vehicleId: e.target.value }))}
              >
                <option value="">Aucun</option>
                {vehicles
                  .filter((v) => v.clientId === paymentForm.clientId)
                  .map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.plate || v.id})
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">Contrat</label>
              <select
                className="w-full p-2 border border-[var(--border)] rounded-lg bg-[var(--bg-elevated)] text-[var(--text-primary)] text-sm"
                value={paymentForm.contractId}
                onChange={(e) => setPaymentForm((prev) => ({ ...prev, contractId: e.target.value }))}
              >
                <option value="">Aucun</option>
                {contracts
                  .filter((c) => c.clientId === paymentForm.clientId)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.id} - {c.status}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* NOTES & ATTACHMENTS */}
          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">Remarques</label>
            <textarea
              className="w-full p-2 border border-[var(--border)] rounded-lg bg-[var(--bg-elevated)] text-[var(--text-primary)] text-sm h-20 resize-none"
              value={paymentForm.notes}
              onChange={(e) => setPaymentForm((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="Notes internes..."
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">
              Pièces Justificatives
            </label>
            <div className="border-2 border-dashed border-[var(--border)] rounded-lg p-4 text-center opacity-60 cursor-not-allowed">
              <div className="flex flex-col items-center gap-2">
                <Paperclip className="w-6 h-6 text-[var(--text-muted)]" />
                <span className="text-sm text-[var(--text-secondary)]">Upload de fichiers — bientôt disponible</span>
              </div>
            </div>
          </div>

          {/* Sprint 2: Approval Warning */}
          {needsApproval && (
            <div className="p-4 bg-[var(--clr-warning-dim)] border border-[var(--clr-warning-border)] rounded-lg">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-bold text-[var(--clr-warning-strong)]">Double validation requise</p>
                  <p className="text-sm text-orange-600 dark:text-orange-500 mt-1">
                    Ce paiement de <strong>{formatPrice(paymentForm.amount)}</strong> dépasse le seuil de{' '}
                    {formatPrice(approvalConfig.threshold)}. Il devra être approuvé par un responsable avant d'être
                    validé définitivement.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="pt-4 flex justify-end gap-2 border-t border-[var(--border)] mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] rounded-lg text-sm font-bold transition-colors"
            >
              Annuler
            </button>
            {onSaveDraft && (
              <button
                type="button"
                onClick={onSaveDraft}
                disabled={!paymentForm.clientId}
                className="px-4 py-2 bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)] text-[var(--text-primary)] rounded-lg text-sm font-bold transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" /> Enregistrer brouillon
              </button>
            )}
            <button
              type="submit"
              disabled={isSaving || paymentForm.amount <= 0 || !paymentForm.clientId}
              className="px-4 py-2 bg-[var(--primary)] hover:bg-[var(--primary-light)] text-white rounded-lg text-sm font-bold transition-colors shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Enregistrement...
                </>
              ) : needsApproval ? (
                <>
                  <Shield className="w-4 h-4" /> Soumettre pour approbation
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" /> Valider & Générer Reçu
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
