// FinanceTab.tsx - Extracted from AccountingView.tsx
// Financial management tab with payments table and column manager

import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useIsMobile } from '../../../../hooks/useIsMobile';
import { MobileCard, MobileCardList } from '../../../../components/MobileCard';
import { DollarSign, Search, LayoutTemplate, Plus, TrendingUp, Clock, AlertCircle, Coins } from 'lucide-react';
import { Pagination } from '../../../../components/Pagination';
import type { Payment, Client, Tier, Contract, Invoice } from '../../../../types';
import { useTableSort } from '../../../../hooks/useTableSort';
import { SortableHeader } from '../../../../components/SortableHeader';

// Payment columns configuration
export const PAYMENT_COLUMNS = [
  { id: 'date', label: 'Date' },
  { id: 'ref', label: 'Référence' },
  { id: 'reseller', label: 'Revendeur' },
  { id: 'client', label: 'Client' },
  { id: 'contract', label: 'Contrat' },
  { id: 'invoices', label: 'Factures' },
  { id: 'type', label: 'Type' },
  { id: 'method', label: 'Méthode' },
  { id: 'amount', label: 'Montant' },
  { id: 'excess', label: 'Excédent' },
  { id: 'status', label: 'Statut' },
  { id: 'actions', label: 'Actions' },
] as const;

export type PaymentColumnId = (typeof PAYMENT_COLUMNS)[number]['id'];

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
}

interface FinanceTabProps {
  // Data
  payments: Payment[];
  clients: Client[];
  tiers: Tier[];
  contracts: Contract[];
  invoices: Invoice[];
  // Pagination
  paginatedData: Payment[];
  currentPage: number;
  totalPages: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  // Search
  searchTerm: string;
  setSearchTerm: React.Dispatch<React.SetStateAction<string>>;
  // Column visibility
  visiblePaymentColumns: PaymentColumnId[];
  togglePaymentColumn: (columnId: PaymentColumnId) => void;
  // Modal
  onOpenPaymentModal: () => void;
  setPaymentForm: React.Dispatch<React.SetStateAction<PaymentFormData>>;
  // Formatting
  formatPrice: (value: number) => string;
  isSuperAdmin?: boolean;
}

export const FinanceTab: React.FC<FinanceTabProps> = ({
  payments,
  clients,
  tiers,
  contracts,
  invoices,
  paginatedData,
  currentPage,
  totalPages,
  setCurrentPage,
  searchTerm,
  setSearchTerm,
  visiblePaymentColumns,
  togglePaymentColumn,
  onOpenPaymentModal,
  setPaymentForm,
  formatPrice,
  isSuperAdmin,
}) => {
  const isMobile = useIsMobile();
  const [isPaymentColumnMenuOpen, setIsPaymentColumnMenuOpen] = useState(false);
  const paymentColumnMenuRef = useRef<HTMLDivElement>(null);

  const PAYMENT_SORT_ACCESSORS: Record<string, (p: Payment) => any> = {
    date: (p) => p.date,
    client: (p) => {
      const t = tiers.find((t) => t.id === p.clientId) || clients.find((c) => c.id === p.clientId);
      return t?.name || '';
    },
    amount: (p) => p.amount,
    method: (p) => p.method,
    status: (p) => p.status,
    type: (p) => p.type,
    contract: (p) => p.contractId,
    reseller: (p) => {
      const r = tiers.find((t) => t.id === p.resellerId || t.tenantId === p.tenantId);
      return r?.name || '';
    },
  };

  const effectiveColumns = useMemo(() => {
    const cols = [
      { id: 'date', label: 'Date' },
      { id: 'ref', label: 'Référence' },
      ...(isSuperAdmin ? [{ id: 'reseller', label: 'Revendeur' }] : []),
      { id: 'client', label: 'Client' },
      { id: 'contract', label: 'Contrat' },
      { id: 'invoices', label: 'Factures' },
      { id: 'type', label: 'Type' },
      { id: 'method', label: 'Méthode' },
      { id: 'amount', label: 'Montant' },
      { id: 'excess', label: 'Excédent' },
      { id: 'status', label: 'Statut' },
      { id: 'actions', label: 'Actions' },
    ];
    return cols;
  }, [isSuperAdmin]);

  const {
    sortedItems: sortedPayments,
    sortConfig: paymentSortConfig,
    handleSort: handlePaymentSort,
  } = useTableSort(
    paginatedData.filter((p) => p && typeof p === 'object' && p.date && p.clientId),
    { key: 'date', direction: 'desc' },
    PAYMENT_SORT_ACCESSORS
  );

  // KPI Calculations
  const kpiStats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const totalAmount = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

    const thisMonthPayments = payments.filter((p) => {
      const pDate = new Date(p.date);
      return pDate.getMonth() === currentMonth && pDate.getFullYear() === currentYear;
    });
    const thisMonthTotal = thisMonthPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

    const pendingApproval = payments.filter((p) => p.status === 'PENDING_APPROVAL').length;

    // Calculate excess as payment.amount - sum of allocations
    const totalExcess = payments.reduce((sum, p) => {
      const allocatedAmount = (p.allocations || []).reduce((s, a) => s + (a.amount || 0), 0);
      const excess = p.amount - allocatedAmount;
      return sum + (excess > 0 ? excess : 0);
    }, 0);

    return {
      totalAmount,
      thisMonthTotal,
      pendingApproval,
      totalExcess,
    };
  }, [payments]);

  // Close column menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (paymentColumnMenuRef.current && !paymentColumnMenuRef.current.contains(event.target as Node)) {
        setIsPaymentColumnMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleUseExcess = (payment: Payment, excessAmount: number) => {
    const client = tiers.find((t) => t.id === payment.clientId) || clients.find((c) => c.id === payment.clientId);
    const resellerId = client && 'clientData' in client ? client.clientData?.resellerId || '' : '';
    setPaymentForm({
      clientId: payment.clientId || '',
      resellerId,
      date: new Date().toISOString().split('T')[0],
      method: 'EXCESS_USAGE',
      reference: `USE-EXCESS-${payment.reference}`,
      amount: excessAmount,
      allocations: [],
      vehicleId: '',
      contractId: payment.contractId || '',
      notes: `Utilisation de l'excédent du paiement ${payment.reference}`,
      attachments: [],
    });
    onOpenPaymentModal();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 h-full flex flex-col">
      <div className="flex justify-between items-center gap-3">
        <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">Gestion Financière & Paiements</h3>
        <button
          onClick={onOpenPaymentModal}
          className="px-3 py-2 bg-[var(--primary)] hover:bg-[var(--primary-light)] text-white rounded-lg font-bold text-sm transition-colors flex items-center gap-2 shrink-0"
        >
          <DollarSign className="w-4 h-4" />
          <span className="hidden sm:inline">Nouveau Paiement</span>
          <span className="sm:hidden">Paiement</span>
        </button>
      </div>

      {/* KPI Mini-Dashboard - Hidden on mobile */}
      {!isMobile && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-4 text-white shadow-lg shadow-emerald-500/20">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-emerald-100 uppercase">Total Encaissé</p>
                <p className="text-xl font-bold">{formatPrice(kpiStats.totalAmount)}</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white shadow-lg shadow-blue-500/20">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-[var(--primary)] uppercase">Ce mois</p>
                <p className="text-xl font-bold">{formatPrice(kpiStats.thisMonthTotal)}</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-4 text-white shadow-lg shadow-orange-500/20">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-orange-100 uppercase">En attente</p>
                <p className="text-xl font-bold">{kpiStats.pendingApproval}</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white shadow-lg shadow-purple-500/20">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Coins className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-purple-100 uppercase">Excédents</p>
                <p className="text-xl font-bold">{formatPrice(kpiStats.totalExcess)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl overflow-hidden flex flex-col flex-1">
        <div className="p-3 sm:p-4 border-b border-[var(--border)] flex items-center gap-2 bg-[var(--bg-elevated)]">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Rechercher un paiement..."
              className="pl-9 pr-4 py-2 w-full border border-[var(--border)] rounded-lg text-sm bg-[var(--bg-surface)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--primary)] outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* PAYMENT COLUMN MANAGER */}
          <div className="relative" ref={paymentColumnMenuRef}>
            <button
              onClick={() => setIsPaymentColumnMenuOpen(!isPaymentColumnMenuOpen)}
              className={`p-2 border border-[var(--border)] rounded-lg hover:bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] transition-colors ${isPaymentColumnMenuOpen ? 'bg-[var(--bg-elevated)] ring-2 ring-[var(--primary-dim)]' : ''}`}
              title="Gérer les colonnes"
            >
              <LayoutTemplate className="w-4 h-4" />
            </button>
            {isPaymentColumnMenuOpen && (
              <div className="absolute top-full right-0 mt-2 w-48 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg shadow-xl z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="p-2 bg-[var(--bg-elevated)] border-b border-[var(--border)] border-[var(--border)] text-[10px] font-bold text-[var(--text-secondary)] uppercase">
                  Colonnes
                </div>
                <div className="max-h-48 overflow-y-auto custom-scrollbar p-1">
                  {effectiveColumns.map((col) => (
                    <label
                      key={col.id}
                      className="flex items-center gap-2 px-2 py-1.5 hover:bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)] rounded cursor-pointer text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={visiblePaymentColumns.includes(col.id)}
                        onChange={() => togglePaymentColumn(col.id)}
                        className="rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)] bg-[var(--bg-surface)]"
                      />
                      <span className="text-[var(--text-primary)]">{col.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {isMobile ? (
          <MobileCardList bordered={false}>
            {sortedPayments.length === 0 ? (
              <div className="px-4 py-8 text-center text-[var(--text-muted)] text-sm">Aucun paiement trouvé</div>
            ) : (
              sortedPayments.map((payment, i) => {
                const client =
                  tiers.find((t) => t.id === payment.clientId) || clients.find((c) => c.id === payment.clientId);
                return (
                  <MobileCard key={i} borderColor="border-l-blue-500">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[var(--text-primary)] truncate">{client?.name || '-'}</p>
                        <p className="text-xs font-mono text-[var(--text-secondary)]">
                          {payment.reference} · {payment.date}
                        </p>
                      </div>
                      <p className="shrink-0 font-bold font-mono text-[var(--text-primary)] text-sm">
                        {formatPrice(payment.amount)}
                      </p>
                    </div>
                    <div className="mt-1 flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] bg-[var(--bg-elevated)] text-[var(--text-secondary)] px-2 py-0.5 rounded-full">
                        {payment.method}
                      </span>
                      <span className="text-[10px] bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] text-[var(--primary)] dark:text-[var(--primary)] px-2 py-0.5 rounded-full font-bold">
                        {payment.status}
                      </span>
                    </div>
                  </MobileCard>
                );
              })
            )}
          </MobileCardList>
        ) : (
          <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[var(--bg-elevated)] bg-[var(--bg-surface)] sticky top-0 z-10 shadow-sm">
                <tr>
                  {visiblePaymentColumns.includes('date') && (
                    <SortableHeader
                      label="Date"
                      sortKey="date"
                      currentSortKey={paymentSortConfig.key}
                      currentDirection={paymentSortConfig.direction}
                      onSort={handlePaymentSort}
                      className="text-xs font-bold text-[var(--text-secondary)] uppercase border-b border-[var(--border)]"
                    />
                  )}
                  {visiblePaymentColumns.includes('ref') && (
                    <SortableHeader
                      label="Réf."
                      sortKey="ref"
                      currentSortKey={paymentSortConfig.key}
                      currentDirection={paymentSortConfig.direction}
                      onSort={handlePaymentSort}
                      className="text-xs font-bold text-[var(--text-secondary)] uppercase border-b border-[var(--border)]"
                    />
                  )}
                  {visiblePaymentColumns.includes('reseller') && (
                    <SortableHeader
                      label="Revendeur"
                      sortKey="reseller"
                      currentSortKey={paymentSortConfig.key}
                      currentDirection={paymentSortConfig.direction}
                      onSort={handlePaymentSort}
                      className="text-xs font-bold text-[var(--text-secondary)] uppercase border-b border-[var(--border)]"
                    />
                  )}
                  {visiblePaymentColumns.includes('client') && (
                    <SortableHeader
                      label="Client"
                      sortKey="client"
                      currentSortKey={paymentSortConfig.key}
                      currentDirection={paymentSortConfig.direction}
                      onSort={handlePaymentSort}
                      className="text-xs font-bold text-[var(--text-secondary)] uppercase border-b border-[var(--border)]"
                    />
                  )}
                  {visiblePaymentColumns.includes('contract') && (
                    <SortableHeader
                      label="Contrat"
                      sortKey="contract"
                      currentSortKey={paymentSortConfig.key}
                      currentDirection={paymentSortConfig.direction}
                      onSort={handlePaymentSort}
                      className="text-xs font-bold text-[var(--text-secondary)] uppercase border-b border-[var(--border)]"
                    />
                  )}
                  {visiblePaymentColumns.includes('invoices') && (
                    <th className="px-4 py-3 text-xs font-bold text-[var(--text-secondary)] uppercase border-b border-[var(--border)]">
                      Factures
                    </th>
                  )}
                  {visiblePaymentColumns.includes('type') && (
                    <SortableHeader
                      label="Type"
                      sortKey="type"
                      currentSortKey={paymentSortConfig.key}
                      currentDirection={paymentSortConfig.direction}
                      onSort={handlePaymentSort}
                      className="text-xs font-bold text-[var(--text-secondary)] uppercase border-b border-[var(--border)]"
                    />
                  )}
                  {visiblePaymentColumns.includes('method') && (
                    <SortableHeader
                      label="Méthode"
                      sortKey="method"
                      currentSortKey={paymentSortConfig.key}
                      currentDirection={paymentSortConfig.direction}
                      onSort={handlePaymentSort}
                      className="text-xs font-bold text-[var(--text-secondary)] uppercase border-b border-[var(--border)]"
                    />
                  )}
                  {visiblePaymentColumns.includes('amount') && (
                    <SortableHeader
                      label="Montant"
                      sortKey="amount"
                      currentSortKey={paymentSortConfig.key}
                      currentDirection={paymentSortConfig.direction}
                      onSort={handlePaymentSort}
                      className="text-xs font-bold text-[var(--text-secondary)] uppercase border-b border-[var(--border)] text-right"
                    />
                  )}
                  {visiblePaymentColumns.includes('excess') && (
                    <th className="px-4 py-3 text-xs font-bold text-[var(--text-secondary)] uppercase border-b border-[var(--border)] text-right">
                      Excédent
                    </th>
                  )}
                  {visiblePaymentColumns.includes('status') && (
                    <SortableHeader
                      label="Statut"
                      sortKey="status"
                      currentSortKey={paymentSortConfig.key}
                      currentDirection={paymentSortConfig.direction}
                      onSort={handlePaymentSort}
                      className="text-xs font-bold text-[var(--text-secondary)] uppercase border-b border-[var(--border)] text-center"
                    />
                  )}
                  {visiblePaymentColumns.includes('actions') && (
                    <th className="px-4 py-3 text-xs font-bold text-[var(--text-secondary)] uppercase border-b border-[var(--border)] text-center">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] text-sm">
                {sortedPayments.map((payment, i) => {
                  const client =
                    tiers.find((t) => t.id === payment.clientId) || clients.find((c) => c.id === payment.clientId);
                  const contract = contracts.find((c) => c.id === payment.contractId);
                  const allocatedAmount = (payment.allocations || []).reduce((sum, a) => sum + a.amount, 0);
                  const excessAmount = payment.amount - allocatedAmount;

                  return (
                    <tr
                      key={i}
                      className="hover:bg-[var(--primary-dim)] dark:hover:bg-[var(--primary-dim)]/10 transition-colors"
                    >
                      {visiblePaymentColumns.includes('date') && (
                        <td className="px-4 py-2 text-[var(--text-secondary)]">{payment.date}</td>
                      )}
                      {visiblePaymentColumns.includes('ref') && (
                        <td className="px-4 py-2 font-mono text-xs text-[var(--text-secondary)]">
                          {payment.reference}
                        </td>
                      )}
                      {visiblePaymentColumns.includes('reseller') && (
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] flex items-center justify-center text-[10px] font-bold text-[var(--primary)]">
                              {(
                                tiers.find((t) => t.id === payment.resellerId || t.tenantId === payment.tenantId)
                                  ?.slug || '??'
                              ).substring(0, 2)}
                            </div>
                            <span className="text-xs font-medium text-[var(--text-secondary)]">
                              {tiers.find((t) => t.id === payment.resellerId || t.tenantId === payment.tenantId)
                                ?.name ||
                                payment.tenantId ||
                                '-'}
                            </span>
                          </div>
                        </td>
                      )}
                      {visiblePaymentColumns.includes('client') && (
                        <td className="px-4 py-2 font-bold text-[var(--text-primary)]">{client?.name || '-'}</td>
                      )}
                      {visiblePaymentColumns.includes('contract') && (
                        <td className="px-4 py-2 text-[var(--text-secondary)]">{contract?.id || '-'}</td>
                      )}
                      {visiblePaymentColumns.includes('invoices') && (
                        <td className="px-4 py-2 text-[var(--text-secondary)]">
                          <div className="flex flex-wrap gap-1">
                            {(payment.allocations || []).map((a) => {
                              const inv = invoices.find((inv) => inv.id === a.invoiceId);
                              return (
                                <span
                                  key={a.invoiceId}
                                  className="px-1.5 py-0.5 bg-[var(--bg-elevated)] rounded text-[10px] font-mono"
                                >
                                  {inv?.number || a.invoiceId}
                                </span>
                              );
                            })}
                          </div>
                        </td>
                      )}
                      {visiblePaymentColumns.includes('type') && (
                        <td className="px-4 py-2">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-bold ${payment.type === 'INCOMING' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}
                          >
                            {payment.type === 'INCOMING' ? 'Entrant' : 'Sortant'}
                          </span>
                        </td>
                      )}
                      {visiblePaymentColumns.includes('method') && (
                        <td className="px-4 py-2 text-[var(--text-primary)]">{payment.method}</td>
                      )}
                      {visiblePaymentColumns.includes('amount') && (
                        <td className="px-4 py-2 text-right font-mono font-bold text-[var(--text-primary)]">
                          {formatPrice(payment.amount)}
                        </td>
                      )}
                      {visiblePaymentColumns.includes('excess') && (
                        <td className="px-4 py-2 text-right font-mono font-bold text-[var(--clr-warning)]">
                          {excessAmount > 0 ? `${formatPrice(excessAmount)}` : '-'}
                        </td>
                      )}
                      {visiblePaymentColumns.includes('status') && (
                        <td className="px-4 py-2 text-center">
                          <span className="px-2 py-1 bg-[var(--primary-dim)] text-[var(--primary)] dark:bg-[var(--primary-dim)] dark:text-[var(--primary)] rounded text-xs font-bold">
                            {payment.status}
                          </span>
                        </td>
                      )}
                      {visiblePaymentColumns.includes('actions') && (
                        <td className="px-4 py-2 text-center">
                          {excessAmount > 0 && (
                            <button
                              onClick={() => handleUseExcess(payment, excessAmount)}
                              className="p-1 text-[var(--primary)] hover:bg-[var(--primary-dim)] rounded"
                              title="Utiliser l'excédent"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
                {paginatedData.length === 0 && (
                  <tr>
                    <td
                      colSpan={visiblePaymentColumns.length}
                      className="px-4 py-8 text-center text-[var(--text-muted)]"
                    >
                      Aucun paiement trouvé
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* PAGINATION */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages || 1}
          onPageChange={setCurrentPage}
          className="p-3 border-t border-[var(--border)] bg-[var(--bg-surface)]"
        />
      </div>
    </div>
  );
};
