import React, { useState, useMemo } from 'react';
import { useDataContext } from '../../../contexts/DataContext';
import { useIsMobile } from '../../../hooks/useIsMobile';
import type { BankTransaction, Tier } from '../../../types';
import { BANK_TRANSACTION_COLUMNS, PLAN_COMPTABLE } from '../constants';
import {
  Plus,
  Search,
  Trash2,
  Edit2,
  CheckCircle,
  Link as LinkIcon,
  Wallet,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  X,
} from 'lucide-react';
import { useCurrency } from '../../../hooks/useCurrency';
import { useTableSort } from '../../../hooks/useTableSort';
import { SortableHeader } from '../../../components/SortableHeader';
import { useConfirmDialog } from '../../../components/ConfirmDialog';

const BANK_TX_CATEGORIES = [
  { id: 'ENCAISSEMENT_CLIENT', label: 'Encaissement client', accountCode: '411100' },
  { id: 'REMBOURSEMENT_RECU', label: 'Remboursement reçu', accountCode: '411100' },
  { id: 'VIREMENT_INTERNE', label: 'Virement interne', accountCode: '512000' },
  { id: 'APPORT', label: 'Apport / Financement', accountCode: '101000' },
  { id: 'REGLEMENT_FOURNISSEUR', label: 'Règlement fournisseur', accountCode: '401100' },
  { id: 'SALAIRES', label: 'Salaires & charges', accountCode: '421000' },
  { id: 'LOYER', label: 'Loyer & charges locatives', accountCode: '610000' },
  { id: 'FRAIS_BANCAIRES', label: 'Frais & commissions bancaires', accountCode: '627000' },
  { id: 'IMPOTS_TAXES', label: 'Impôts & taxes', accountCode: '630000' },
  { id: 'CHARGES_FINANCIERES', label: 'Charges financières', accountCode: '660000' },
  { id: 'INTERETS_RECUS', label: 'Intérêts reçus', accountCode: '768000' },
  { id: 'AUTRE', label: 'Autre', accountCode: '471000' },
];

const PAYMENT_METHODS = [
  { id: 'VIREMENT', label: 'Virement bancaire' },
  { id: 'CHEQUE', label: 'Chèque' },
  { id: 'ESPECES', label: 'Espèces' },
  { id: 'CARTE', label: 'Carte bancaire' },
  { id: 'PRELEVEMENT', label: 'Prélèvement automatique' },
  { id: 'MOBILE', label: 'Mobile Money' },
  { id: 'AUTRE', label: 'Autre' },
];

interface BankReconciliationViewProps {
  bankTransactions: BankTransaction[];
  invoices: any[];
  supplierInvoices: any[];
  isSuperAdmin?: boolean;
  resellers?: Tier[];
}

export const BankReconciliationView: React.FC<BankReconciliationViewProps> = ({
  bankTransactions,
  invoices,
  supplierInvoices,
  isSuperAdmin,
  resellers,
}) => {
  const isMobile = useIsMobile();
  const { formatPrice } = useCurrency();
  const { confirm, ConfirmDialogComponent } = useConfirmDialog();
  const { addBankTransaction, updateBankTransaction, deleteBankTransaction, tiers } = useDataContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Partial<BankTransaction>>({});
  const [reconcileTx, setReconcileTx] = useState<BankTransaction | null>(null);

  const filteredTransactions = (bankTransactions || []).filter((tx) =>
    tx.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const {
    sortedItems: sortedTransactions,
    sortConfig: bankSortConfig,
    handleSort: handleBankSort,
  } = useTableSort(filteredTransactions, { key: 'date', direction: 'desc' });

  // Calcul du solde bancaire théorique
  const bankBalance = useMemo(() => {
    const allTx = bankTransactions || [];
    const totalCredits = allTx.filter((tx) => tx.type === 'CREDIT').reduce((sum, tx) => sum + tx.amount, 0);
    const totalDebits = allTx.filter((tx) => tx.type === 'DEBIT').reduce((sum, tx) => sum + tx.amount, 0);
    const theoreticalBalance = totalCredits - totalDebits;

    // Transactions en attente de rapprochement
    const pendingTx = allTx.filter((tx) => tx.status !== 'RECONCILED');
    const pendingCredits = pendingTx.filter((tx) => tx.type === 'CREDIT').reduce((sum, tx) => sum + tx.amount, 0);
    const pendingDebits = pendingTx.filter((tx) => tx.type === 'DEBIT').reduce((sum, tx) => sum + tx.amount, 0);

    // Transactions rapprochées
    const reconciledTx = allTx.filter((tx) => tx.status === 'RECONCILED');
    const reconciledBalance = reconciledTx.reduce(
      (sum, tx) => sum + (tx.type === 'CREDIT' ? tx.amount : -tx.amount),
      0
    );

    return {
      totalCredits,
      totalDebits,
      theoreticalBalance,
      reconciledBalance,
      pendingCredits,
      pendingDebits,
      pendingCount: pendingTx.length,
      reconciledCount: reconciledTx.length,
    };
  }, [bankTransactions]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTx.id) {
      updateBankTransaction(editingTx as BankTransaction);
    } else {
      addBankTransaction({
        ...editingTx,
        status: 'PENDING',
      } as BankTransaction);
    }
    setIsModalOpen(false);
    setEditingTx({});
  };

  const handleReconcile = (tx: BankTransaction) => {
    updateBankTransaction({ ...tx, status: 'RECONCILED' });
    setReconcileTx(null);
  };

  const getSuggestions = (tx: BankTransaction) => {
    const matches = [];
    // Match Sales Invoices — compare against remaining balance (amount - already paid)
    invoices.forEach((inv) => {
      const remaining = inv.amount - (inv.paidAmount || 0);
      if (remaining > 0 && Math.abs(remaining - tx.amount) < 1) {
        matches.push({ type: 'Facture Client', ref: inv.number, date: inv.date, amount: remaining, id: inv.id });
      }
    });
    // Match Supplier Invoices — compare against remaining balance
    supplierInvoices.forEach((inv) => {
      const remaining = inv.amount - (inv.paidAmount || 0);
      if (remaining > 0 && Math.abs(remaining - tx.amount) < 1) {
        matches.push({
          type: 'Facture Fournisseur',
          ref: inv.reference,
          date: inv.date,
          amount: remaining,
          id: inv.id,
        });
      }
    });
    return matches;
  };

  return (
    <div className="space-y-6">
      {/* KPIs Solde Bancaire - hidden on mobile */}
      {!isMobile && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-[var(--bg-elevated)] p-4 rounded-xl border border-[var(--border)] shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <div className="p-2 bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] rounded-lg">
                <Wallet className="w-5 h-5 text-[var(--primary)]" />
              </div>
              <span className="section-title">Solde Théorique</span>
            </div>
            <p
              className={`text-2xl font-bold ${bankBalance.theoreticalBalance >= 0 ? 'text-[var(--text-primary)]' : 'text-red-600'}`}
            >
              {formatPrice(bankBalance.theoreticalBalance)}
            </p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">Crédits - Débits</p>
          </div>

          <div className="bg-[var(--bg-elevated)] p-4 rounded-xl border border-[var(--border)] shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <span className="section-title">Crédits</span>
            </div>
            <p className="text-2xl font-bold text-green-600">{formatPrice(bankBalance.totalCredits)}</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">Encaissements</p>
          </div>

          <div className="bg-[var(--bg-elevated)] p-4 rounded-xl border border-[var(--border)] shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                <TrendingDown className="w-5 h-5 text-red-600" />
              </div>
              <span className="section-title">Débits</span>
            </div>
            <p className="text-2xl font-bold text-red-600">{formatPrice(bankBalance.totalDebits)}</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">Décaissements</p>
          </div>

          <div className="bg-[var(--bg-elevated)] p-4 rounded-xl border border-[var(--border)] shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <div
                className={`p-2 rounded-lg ${bankBalance.pendingCount > 0 ? 'bg-orange-100 dark:bg-orange-900/20' : 'bg-green-100 dark:bg-green-900/20'}`}
              >
                {bankBalance.pendingCount > 0 ? (
                  <AlertCircle className="w-5 h-5 text-orange-600" />
                ) : (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                )}
              </div>
              <span className="section-title">Rapprochement</span>
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold text-[var(--text-primary)]">{bankBalance.reconciledCount}</p>
              <span className="text-sm text-[var(--text-secondary)]">
                / {bankBalance.reconciledCount + bankBalance.pendingCount}
              </span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              {bankBalance.pendingCount > 0 ? (
                <span className="text-orange-600 font-medium">{bankBalance.pendingCount} en attente</span>
              ) : (
                <span className="text-green-600 font-medium">Tout rapproché ✓</span>
              )}
            </p>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] w-4 h-4" />
          <input
            type="text"
            placeholder="Rechercher une transaction..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button
          onClick={() => {
            setEditingTx({});
            setIsModalOpen(true);
          }}
          className="bg-[var(--primary)] hover:bg-[var(--primary-light)] text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Nouvelle Transaction
        </button>
      </div>

      <div className="bg-[var(--bg-elevated)] rounded-xl shadow-sm border border-[var(--border)] overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-[var(--bg-elevated)] text-xs uppercase text-[var(--text-secondary)] font-bold">
            <tr>
              {BANK_TRANSACTION_COLUMNS.map((col) => {
                if (col.id === 'reseller' && !isSuperAdmin) return null;
                return col.id === 'actions' ? (
                  <th key={col.id} className="px-4 py-3">
                    {col.label}
                  </th>
                ) : (
                  <SortableHeader
                    key={col.id}
                    label={col.label}
                    sortKey={col.id}
                    currentSortKey={bankSortConfig.key}
                    currentDirection={bankSortConfig.direction}
                    onSort={handleBankSort}
                  />
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {sortedTransactions.map((tx) => (
              <tr key={tx.id} className="hover:bg-[var(--bg-elevated)] dark:hover:bg-slate-700/50 transition-colors">
                <td className="px-4 py-3 font-mono">{new Date(tx.date).toLocaleDateString('fr-FR')}</td>
                <td className="px-4 py-3 font-bold text-[var(--text-primary)]">{tx.description}</td>
                <td
                  className={`px-4 py-3 font-mono font-bold ${tx.type === 'CREDIT' ? 'text-green-600' : 'text-red-600'}`}
                >
                  {tx.type === 'CREDIT' ? '+' : '-'}
                  {formatPrice(tx.amount)}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-bold ${
                      tx.type === 'CREDIT' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {tx.type}
                  </span>
                </td>
                {isSuperAdmin && (
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] flex items-center justify-center text-[10px] font-bold text-[var(--primary)]">
                        {(resellers?.find((r) => r.tenantId === tx.tenantId)?.slug || '??').substring(0, 2)}
                      </div>
                      <span className="text-xs text-[var(--text-secondary)]">
                        {resellers?.find((r) => r.tenantId === tx.tenantId)?.name || tx.tenantId || '-'}
                      </span>
                    </div>
                  </td>
                )}
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-bold ${
                      tx.status === 'RECONCILED'
                        ? 'bg-[var(--primary-dim)] text-[var(--primary)]'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {tx.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {tx.status !== 'RECONCILED' && (
                      <button
                        onClick={() => setReconcileTx(tx)}
                        className="p-1 hover:bg-[var(--bg-elevated)] rounded text-[var(--text-secondary)] hover:text-emerald-600"
                        title="Rapprochement Intelligent"
                      >
                        <LinkIcon className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setEditingTx(tx);
                        setIsModalOpen(true);
                      }}
                      className="p-1 hover:bg-[var(--bg-elevated)] rounded text-[var(--text-secondary)] hover:text-[var(--primary)]"
                      aria-label="Modifier la transaction"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={async () => {
                        if (
                          await confirm({
                            message: 'Supprimer cette transaction bancaire ?',
                            variant: 'danger',
                            title: 'Confirmation',
                            confirmLabel: 'Supprimer',
                          })
                        )
                          deleteBankTransaction(tx.id);
                      }}
                      className="p-1 hover:bg-[var(--bg-elevated)] rounded text-[var(--text-secondary)] hover:text-red-600"
                      aria-label="Supprimer la transaction"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredTransactions.length === 0 && (
              <tr>
                <td
                  colSpan={BANK_TRANSACTION_COLUMNS.length}
                  className="px-4 py-8 text-center text-[var(--text-secondary)]"
                >
                  Aucune transaction trouvée
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Reconciliation Modal */}
      {reconcileTx && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-[var(--bg-elevated)] rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="p-4 border-b border-[var(--border)] flex justify-between items-center bg-[var(--bg-elevated)]">
              <h3 className="font-bold text-[var(--text-primary)]">Rapprochement Intelligent</h3>
              <button
                onClick={() => setReconcileTx(null)}
                className="text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] p-4 rounded-lg border border-[var(--primary)] dark:border-[var(--primary)]">
                <p className="text-sm text-[var(--primary)] dark:text-[var(--primary)] font-bold">
                  Transaction Bancaire
                </p>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-[var(--text-primary)]">{reconcileTx.description}</span>
                  <span className="font-mono font-bold">{formatPrice(reconcileTx.amount)}</span>
                </div>
                <div className="text-xs text-[var(--text-secondary)] mt-1">{reconcileTx.date}</div>
              </div>

              <div>
                <h4 className="font-bold text-sm text-[var(--text-secondary)] uppercase mb-2">
                  Suggestions de correspondance
                </h4>
                <div className="space-y-2">
                  {getSuggestions(reconcileTx).map((match) => (
                    <div
                      key={match.id}
                      className="flex justify-between items-center p-3 border border-[var(--border)] rounded-lg hover:bg-[var(--bg-elevated)] dark:hover:bg-slate-700 cursor-pointer"
                      onClick={() => handleReconcile(reconcileTx)}
                    >
                      <div>
                        <div className="font-bold text-[var(--text-primary)]">
                          {match.type} - {match.ref}
                        </div>
                        <div className="text-xs text-[var(--text-secondary)]">{match.date}</div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-mono font-bold text-emerald-600">{formatPrice(match.amount)}</span>
                        <button className="px-3 py-1 bg-emerald-500 text-white text-xs font-bold rounded hover:bg-emerald-600">
                          Lier
                        </button>
                      </div>
                    </div>
                  ))}
                  {getSuggestions(reconcileTx).length === 0 && (
                    <div className="text-center py-8 text-[var(--text-secondary)] italic">
                      Aucune correspondance automatique trouvée.
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-[var(--border)] flex justify-end">
                <button
                  onClick={() => handleReconcile(reconcileTx)}
                  className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] underline"
                >
                  Forcer le rapprochement manuel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit/Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-[var(--bg-surface)] rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-[var(--border)]">
            {/* Header */}
            <div className="px-6 py-4 border-b border-[var(--border)] flex justify-between items-center bg-[var(--bg-elevated)] shrink-0">
              <h3 className="font-bold text-lg text-[var(--text-primary)]">
                {editingTx.id ? 'Modifier la transaction' : 'Nouvelle Transaction Bancaire'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-[var(--bg-elevated)] dark:hover:bg-slate-700 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-[var(--text-secondary)]" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-6">
              <form id="bank-tx-form" onSubmit={handleSave} className="space-y-5">
                {/* Revendeur (super admin, read-only) */}
                {isSuperAdmin && resellers && resellers.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Revendeur</label>
                    <input
                      type="text"
                      readOnly
                      className="w-full p-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] cursor-default"
                      value={resellers.find((r) => r.tenantId === editingTx.tenantId)?.name ?? '—'}
                    />
                  </div>
                )}

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full p-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)]"
                    value={editingTx.description || ''}
                    onChange={(e) => setEditingTx({ ...editingTx, description: e.target.value })}
                    placeholder="Ex: Virement MTN Mobile Money, Loyer mars 2026..."
                    required
                  />
                </div>

                {/* Montant + Sens + Date */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                      Montant <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      className="w-full p-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)]"
                      value={editingTx.amount || ''}
                      onChange={(e) => setEditingTx({ ...editingTx, amount: parseFloat(e.target.value) })}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                      Sens <span className="text-red-500">*</span>
                    </label>
                    <select
                      className="w-full p-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)]"
                      value={editingTx.type || 'DEBIT'}
                      onChange={(e) => setEditingTx({ ...editingTx, type: e.target.value as BankTransaction['type'] })}
                    >
                      <option value="CREDIT">Entrée (Crédit)</option>
                      <option value="DEBIT">Sortie (Débit)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                      Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      className="w-full p-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)]"
                      value={editingTx.date || ''}
                      onChange={(e) => setEditingTx({ ...editingTx, date: e.target.value })}
                      required
                    />
                  </div>
                </div>

                {/* Référence + Mode de paiement */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Référence</label>
                    <input
                      type="text"
                      className="w-full p-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)]"
                      value={editingTx.reference || ''}
                      onChange={(e) => setEditingTx({ ...editingTx, reference: e.target.value })}
                      placeholder="Ex: VIR-2026-0089, CHQ-00142"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                      Mode de paiement
                    </label>
                    <select
                      className="w-full p-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)]"
                      value={editingTx.paymentMethod || ''}
                      onChange={(e) => setEditingTx({ ...editingTx, paymentMethod: e.target.value })}
                    >
                      <option value="">Sélectionner...</option>
                      {PAYMENT_METHODS.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Tiers */}
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                    Tiers (client / fournisseur)
                  </label>
                  <select
                    className="w-full p-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)]"
                    value={editingTx.tierId || ''}
                    onChange={(e) => setEditingTx({ ...editingTx, tierId: e.target.value || undefined })}
                  >
                    <option value="">— Aucun —</option>
                    {(tiers || []).map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Catégorie + Compte comptable */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Catégorie</label>
                    <select
                      className="w-full p-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)]"
                      value={editingTx.category || ''}
                      onChange={(e) => {
                        const cat = BANK_TX_CATEGORIES.find((c) => c.id === e.target.value);
                        setEditingTx({
                          ...editingTx,
                          category: e.target.value || undefined,
                          accountCode: cat?.accountCode || editingTx.accountCode,
                        });
                      }}
                    >
                      <option value="">Sélectionner...</option>
                      {BANK_TX_CATEGORIES.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                      Compte comptable
                      {editingTx.category && (
                        <span className="ml-1 text-xs text-[var(--primary)] font-normal">(auto)</span>
                      )}
                    </label>
                    <select
                      className="w-full p-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)]"
                      value={editingTx.accountCode || ''}
                      onChange={(e) => setEditingTx({ ...editingTx, accountCode: e.target.value || undefined })}
                    >
                      <option value="">— Aucune écriture —</option>
                      {PLAN_COMPTABLE.map((acc) => (
                        <option key={acc.code} value={acc.code}>
                          {acc.code} — {acc.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Notes</label>
                  <textarea
                    rows={2}
                    className="w-full p-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] resize-none"
                    value={editingTx.notes || ''}
                    onChange={(e) => setEditingTx({ ...editingTx, notes: e.target.value })}
                    placeholder="Informations complémentaires..."
                  />
                </div>
              </form>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-[var(--border)] flex justify-end gap-3 bg-[var(--bg-elevated)] shrink-0">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] dark:hover:bg-slate-700 rounded-lg text-sm font-medium transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                form="bank-tx-form"
                className="px-5 py-2 bg-[var(--primary)] hover:bg-[var(--primary-light)] text-white rounded-lg text-sm font-bold transition-colors"
              >
                {editingTx.id ? 'Mettre à jour' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
      <ConfirmDialogComponent />
    </div>
  );
};
