import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { Card } from '../../../components/Card';
import { useDataContext } from '../../../contexts/DataContext';
import {
  DollarSign,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  FileCheck,
  Lock,
  X,
  History,
  CheckCircle,
  AlertTriangle,
  Download,
} from 'lucide-react';
import { Modal } from '../../../components/Modal';
import { generateCashClosingPDF } from '../../../services/pdfServiceV2';
import { useCurrency } from '../../../hooks/useCurrency';
import { useTenantBranding } from '../../../hooks/useTenantBranding';
import { useTableSort } from '../../../hooks/useTableSort';
import { SortableHeader } from '../../../components/SortableHeader';
import { api } from '../../../services/apiLazy';
import { PLAN_COMPTABLE } from '../constants';

import type { Tier } from '../../../types';

// Type pour les clôtures de caisse
interface CashClosing {
  id: string;
  date: string;
  openingBalance: number;
  closingBalance: number;
  theoreticalBalance: number;
  gap: number;
  entriesCount: number;
  totalIn: number;
  totalOut: number;
  notes: string;
  closedAt: string;
  closedBy?: string;
  tenantId?: string; // Added tenantId support
}

interface CashViewProps {
  journalEntries: any[];
  isSuperAdmin?: boolean;
  resellers?: Tier[];
}

export const CashView: React.FC<CashViewProps> = ({ journalEntries, isSuperAdmin, resellers }) => {
  const isMobile = useIsMobile();
  const { formatPrice } = useCurrency();
  const { branding: tenantBranding } = useTenantBranding();
  const { createGroupedJournalEntry } = useDataContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isClosingModalOpen, setIsClosingModalOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<'DEPOSIT' | 'WITHDRAWAL'>('WITHDRAWAL');
  const [amount, setAmount] = useState('');
  const [label, setLabel] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [reference, setReference] = useState('');
  const [counterpartAccount, setCounterpartAccount] = useState('606000');

  const counterpartOptions = useMemo(
    () =>
      PLAN_COMPTABLE.filter(
        (a) =>
          a.code !== '530000' &&
          (transactionType === 'DEPOSIT'
            ? a.code.startsWith('4') || a.code.startsWith('7')
            : a.code.startsWith('6') || a.code === '401100')
      ),
    [transactionType]
  );

  // Closing State
  const [closingDate, setClosingDate] = useState(new Date().toISOString().split('T')[0]);
  const [actualClosingBalance, setActualClosingBalance] = useState('');
  const [closingNotes, setClosingNotes] = useState('');
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  const [cashClosings, setCashClosings] = useState<CashClosing[]>([]);

  const loadCashClosings = useCallback(async () => {
    try {
      const data = await api.cashClosings.list();
      setCashClosings(data);
    } catch {
      // Fallback to localStorage for offline support
      try {
        const saved = localStorage.getItem('trackyu_cash_closings');
        if (saved) setCashClosings(JSON.parse(saved));
      } catch {
        /* ignore */
      }
    }
  }, []);

  useEffect(() => {
    loadCashClosings();
  }, [loadCashClosings]);

  // Vérifier si une journée est clôturée
  const isDateClosed = (date: string): boolean => {
    return cashClosings.some((c) => c.date === date);
  };

  // Récupérer la clôture d'une date
  const getClosingForDate = (date: string): CashClosing | undefined => {
    return cashClosings.find((c) => c.date === date);
  };

  // Filter for Cash Account (530000)
  const cashEntries = useMemo(() => {
    return journalEntries.filter((entry) => entry.account === '530000');
  }, [journalEntries]);

  const {
    sortedItems: sortedCashEntries,
    sortConfig: cashSortConfig,
    handleSort: handleCashSort,
  } = useTableSort(cashEntries, { key: 'date', direction: 'desc' });

  const balance = useMemo(() => {
    return cashEntries.reduce((acc, entry) => acc + (entry.debit - entry.credit), 0);
  }, [cashEntries]);

  // Calculate Daily Stats for Closing
  const dailyStats = useMemo(() => {
    const entriesForDate = cashEntries.filter((e) => e.date === closingDate);
    const entriesBeforeDate = cashEntries.filter((e) => e.date < closingDate);

    const openingBalance = entriesBeforeDate.reduce((acc, e) => acc + (e.debit - e.credit), 0);
    const totalIn = entriesForDate.reduce((acc, e) => acc + e.debit, 0);
    const totalOut = entriesForDate.reduce((acc, e) => acc + e.credit, 0);
    const theoreticalClosing = openingBalance + totalIn - totalOut;

    return { openingBalance, totalIn, totalOut, theoreticalClosing, entriesForDate };
  }, [cashEntries, closingDate]);

  const handleSubmit = async () => {
    if (!amount || !label) return;

    const numAmount = parseFloat(amount);

    if (transactionType === 'WITHDRAWAL' && numAmount > balance) {
      alert(`Solde insuffisant. Solde actuel : ${formatPrice(balance)}`);
      return;
    }

    const lines =
      transactionType === 'DEPOSIT'
        ? [
            { account_code: '530000', debit: numAmount, credit: 0, description: label },
            { account_code: counterpartAccount, debit: 0, credit: numAmount, description: label },
          ]
        : [
            { account_code: counterpartAccount, debit: numAmount, credit: 0, description: label },
            { account_code: '530000', debit: 0, credit: numAmount, description: label },
          ];

    await createGroupedJournalEntry({
      date,
      description: label,
      reference: reference || undefined,
      journalCode: 'CA',
      lines,
    });

    setIsModalOpen(false);
    setAmount('');
    setLabel('');
    setReference('');
  };

  const handleGenerateClosing = async () => {
    const actual = parseFloat(actualClosingBalance) || 0;
    const gap = actual - dailyStats.theoreticalClosing;

    // Persister la clôture en base via l'API
    try {
      const saved = await api.cashClosings.create({
        date: closingDate,
        openingBalance: dailyStats.openingBalance,
        closingBalance: actual,
        theoreticalBalance: dailyStats.theoreticalClosing,
        gap,
        entriesCount: dailyStats.entriesForDate.length,
        totalIn: dailyStats.totalIn,
        totalOut: dailyStats.totalOut,
        notes: closingNotes || undefined,
      });
      setCashClosings((prev) => [...prev.filter((c) => c.date !== closingDate), saved]);
    } catch {
      // Fallback localStorage si l'API est indisponible
      const newClosing: CashClosing = {
        id: `CLOSE-${Date.now()}`,
        date: closingDate,
        openingBalance: dailyStats.openingBalance,
        closingBalance: actual,
        theoreticalBalance: dailyStats.theoreticalClosing,
        gap,
        entriesCount: dailyStats.entriesForDate.length,
        totalIn: dailyStats.totalIn,
        totalOut: dailyStats.totalOut,
        notes: closingNotes,
        closedAt: new Date().toISOString(),
      };
      const updated = [...cashClosings.filter((c) => c.date !== closingDate), newClosing];
      setCashClosings(updated);
      localStorage.setItem('trackyu_cash_closings', JSON.stringify(updated));
    }

    // Générer PDF via service V2 (avec branding)
    await generateCashClosingPDF(
      {
        date: closingDate,
        openingBalance: dailyStats.openingBalance,
        totalIn: dailyStats.totalIn,
        totalOut: dailyStats.totalOut,
        theoreticalClosing: dailyStats.theoreticalClosing,
        actualClosing: actual,
        gap,
        entries: dailyStats.entriesForDate.map((e) => ({
          ref: e.ref,
          label: e.label,
          debit: e.debit,
          credit: e.credit,
        })),
        notes: closingNotes || undefined,
        formatPrice,
      },
      { branding: tenantBranding || undefined }
    );

    setIsClosingModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header Stats - Hidden on mobile */}
      {!isMobile && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-100 dark:bg-emerald-800 rounded-full">
                <DollarSign className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">Solde Caisse</p>
                <h3 className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{formatPrice(balance)}</h3>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] rounded-full">
                <ArrowUpRight className="w-6 h-6 text-[var(--primary)] dark:text-[var(--primary)]" />
              </div>
              <div>
                <p className="text-sm text-[var(--text-secondary)] font-medium">Total Entrées (Mois)</p>
                <h3 className="page-title">
                  {formatPrice(
                    cashEntries
                      .filter((e) => e.debit > 0 && e.date.startsWith(new Date().toISOString().slice(0, 7)))
                      .reduce((acc, e) => acc + e.debit, 0)
                  )}
                </h3>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-full">
                <ArrowDownLeft className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm text-[var(--text-secondary)] font-medium">Total Sorties (Mois)</p>
                <h3 className="page-title">
                  {formatPrice(
                    cashEntries
                      .filter((e) => e.credit > 0 && e.date.startsWith(new Date().toISOString().slice(0, 7)))
                      .reduce((acc, e) => acc + e.credit, 0)
                  )}
                </h3>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Actions & List */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <h2 className="page-title">Journal de Caisse</h2>
        <div className="flex gap-2 flex-wrap sm:flex-nowrap">
          <button
            onClick={() => setIsHistoryModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-elevated)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)] transition-colors"
          >
            <History className="w-4 h-4" />
            Historique
          </button>
          <button
            onClick={() => setIsClosingModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-elevated)] text-white rounded-lg hover:bg-[var(--bg-elevated)] transition-colors"
          >
            <Lock className="w-4 h-4" />
            Arrêté Journalier
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nouvelle Opération
          </button>
        </div>
      </div>

      <div className="bg-[var(--bg-elevated)] rounded-xl border border-[var(--border)] overflow-x-auto">
        <table className="w-full text-sm text-left text-[var(--text-secondary)] min-w-[600px]">
          <thead className="text-xs text-[var(--text-primary)] uppercase bg-[var(--bg-elevated)] dark:text-[var(--text-muted)]">
            <tr>
              <SortableHeader
                label="Date"
                sortKey="date"
                currentSortKey={cashSortConfig.key}
                currentDirection={cashSortConfig.direction}
                onSort={handleCashSort}
              />
              <SortableHeader
                label="Référence"
                sortKey="reference"
                currentSortKey={cashSortConfig.key}
                currentDirection={cashSortConfig.direction}
                onSort={handleCashSort}
              />
              <SortableHeader
                label="Libellé"
                sortKey="label"
                currentSortKey={cashSortConfig.key}
                currentDirection={cashSortConfig.direction}
                onSort={handleCashSort}
              />
              {isSuperAdmin && <th className="px-6 py-3">Revendeur</th>}
              <SortableHeader
                label="Entrée"
                sortKey="debit"
                currentSortKey={cashSortConfig.key}
                currentDirection={cashSortConfig.direction}
                onSort={handleCashSort}
                className="text-right"
              />
              <SortableHeader
                label="Sortie"
                sortKey="credit"
                currentSortKey={cashSortConfig.key}
                currentDirection={cashSortConfig.direction}
                onSort={handleCashSort}
                className="text-right"
              />
              <th className="px-6 py-3 text-right">Solde Progressif</th>
            </tr>
          </thead>
          <tbody>
            {sortedCashEntries.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-[var(--text-secondary)]">
                  Aucune opération de caisse enregistrée.
                </td>
              </tr>
            ) : (
              // Calculate progressive balance in reverse since we sorted by date desc
              (() => {
                let runningBalance = balance;
                return sortedCashEntries.map((entry, index) => {
                  const currentBalance = runningBalance;
                  // Prepare balance for next row (previous date)
                  runningBalance -= entry.debit - entry.credit;

                  return (
                    <tr
                      key={entry.id}
                      className="bg-[var(--bg-elevated)] border-b border-[var(--border)] hover:bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)]/50"
                    >
                      <td className="px-6 py-4">{entry.date}</td>
                      <td className="px-6 py-4 font-mono text-xs">{entry.ref}</td>
                      <td className="px-6 py-4 font-medium text-[var(--text-primary)]">{entry.label}</td>
                      {isSuperAdmin && (
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] flex items-center justify-center text-[10px] font-bold text-[var(--primary)]">
                              {(resellers?.find((r) => r.tenantId === entry.tenantId)?.slug || '??').substring(0, 2)}
                            </div>
                            <span className="text-xs text-[var(--text-secondary)]">
                              {resellers?.find((r) => r.tenantId === entry.tenantId)?.name || entry.tenantId || '-'}
                            </span>
                          </div>
                        </td>
                      )}
                      <td className="px-6 py-4 text-right text-emerald-600 font-medium">
                        {entry.debit > 0 ? `+${formatPrice(entry.debit)}` : '-'}
                      </td>
                      <td className="px-6 py-4 text-right text-red-600 font-medium">
                        {entry.credit > 0 ? `-${formatPrice(entry.credit)}` : '-'}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-[var(--text-primary)]">
                        {formatPrice(currentBalance)}
                      </td>
                    </tr>
                  );
                });
              })()
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div
            className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm transition-opacity"
            onClick={() => setIsModalOpen(false)}
          />
          <div className="relative bg-[var(--bg-surface)] rounded-xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-[var(--border)]">
            {/* Header */}
            <div className="px-6 py-4 border-b border-[var(--border)] flex justify-between items-center bg-[var(--bg-elevated)]">
              <h3 className="font-bold text-xl text-[var(--text-primary)]">Nouvelle Opération de Caisse</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)] rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-[var(--text-secondary)]" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              <div className="space-y-6 max-w-3xl mx-auto">
                <div className="flex gap-4 p-1 bg-[var(--bg-elevated)] rounded-lg">
                  <button
                    className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${transactionType === 'WITHDRAWAL' ? 'bg-[var(--bg-elevated)] shadow text-red-600' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                    onClick={() => {
                      setTransactionType('WITHDRAWAL');
                      setCounterpartAccount('606000');
                    }}
                  >
                    Sortie (Dépense)
                  </button>
                  <button
                    className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${transactionType === 'DEPOSIT' ? 'bg-[var(--bg-elevated)] shadow text-emerald-600' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                    onClick={() => {
                      setTransactionType('DEPOSIT');
                      setCounterpartAccount('411100');
                    }}
                  >
                    Entrée (Recette)
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Date</label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full p-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Montant</label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full p-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] pl-10"
                        placeholder="0.00"
                      />
                      <DollarSign className="w-4 h-4 absolute left-3 top-3.5 text-[var(--text-muted)]" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Libellé</label>
                  <input
                    type="text"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)]"
                    placeholder="Ex: Achat fournitures bureau"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                    Compte de contrepartie
                  </label>
                  <select
                    value={counterpartAccount}
                    onChange={(e) => setCounterpartAccount(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)]"
                  >
                    {counterpartOptions.map((a) => (
                      <option key={a.code} value={a.code}>
                        {a.code} — {a.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                    Référence (Optionnel)
                  </label>
                  <input
                    type="text"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)]"
                    placeholder="Ex: TICKET-123"
                  />
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-[var(--border)] bg-[var(--bg-elevated)] flex justify-end items-center shrink-0 gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border border-[var(--border)] rounded-lg text-sm font-bold tr-hover transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSubmit}
                className={`px-4 py-2 text-white rounded-lg text-sm font-bold transition-colors ${transactionType === 'DEPOSIT' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      <Modal
        isOpen={isClosingModalOpen}
        onClose={() => setIsClosingModalOpen(false)}
        title="Arrêté de Caisse Journalier"
      >
        <div className="space-y-4">
          {isDateClosed(closingDate) ? (
            <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-orange-800 dark:text-orange-300">Journée déjà clôturée</p>
                <p className="text-xs text-orange-700 dark:text-orange-400 mt-1">
                  Cette journée a été clôturée le{' '}
                  {new Date(getClosingForDate(closingDate)?.closedAt || '').toLocaleString('fr-FR')}. Une nouvelle
                  clôture remplacera la précédente.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] p-4 rounded-lg border border-[var(--primary)] dark:border-[var(--primary)]">
              <p className="text-sm text-[var(--primary)] dark:text-[var(--primary)]">
                Cette opération génère un document PDF officiel récapitulant les mouvements de la journée.
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Date de l'arrêté</label>
            <input
              type="date"
              value={closingDate}
              onChange={(e) => setClosingDate(e.target.value)}
              className="w-full rounded-lg border-[var(--border)] bg-[var(--bg-elevated)]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4 p-4 bg-[var(--bg-elevated)] rounded-lg border border-[var(--border)]">
            <div>
              <p className="text-xs text-[var(--text-secondary)] uppercase font-bold">Solde Ouverture</p>
              <p className="text-lg font-mono font-bold text-[var(--text-primary)]">
                {formatPrice(dailyStats.openingBalance)}
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-secondary)] uppercase font-bold">Solde Théorique</p>
              <p className="text-lg font-mono font-bold text-[var(--primary)] dark:text-[var(--primary)]">
                {formatPrice(dailyStats.theoreticalClosing)}
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-secondary)] uppercase font-bold">Total Entrées</p>
              <p className="text-lg font-mono font-bold text-emerald-600">+{formatPrice(dailyStats.totalIn)}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-secondary)] uppercase font-bold">Total Sorties</p>
              <p className="text-lg font-mono font-bold text-red-600">-{formatPrice(dailyStats.totalOut)}</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
              Solde Réel Constaté (Espèces)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                value={actualClosingBalance}
                onChange={(e) => setActualClosingBalance(e.target.value)}
                className="w-full rounded-lg border-[var(--border)] bg-[var(--bg-elevated)] pl-8 font-bold"
                placeholder="0.00"
              />
              <DollarSign className="w-4 h-4 absolute left-2.5 top-3 text-[var(--text-muted)]" />
            </div>
            {actualClosingBalance && (
              <p
                className={`text-sm mt-1 font-bold ${parseFloat(actualClosingBalance) - dailyStats.theoreticalClosing === 0 ? 'text-emerald-600' : 'text-red-600'}`}
              >
                Écart: {formatPrice(parseFloat(actualClosingBalance) - dailyStats.theoreticalClosing)}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Notes / Observations</label>
            <textarea
              value={closingNotes}
              onChange={(e) => setClosingNotes(e.target.value)}
              className="w-full rounded-lg border-[var(--border)] bg-[var(--bg-elevated)] h-20 resize-none"
              placeholder="Justification d'écart, coupures, etc..."
            />
          </div>

          <div className="pt-4 flex justify-end gap-2">
            <button
              onClick={() => setIsClosingModalOpen(false)}
              className="px-4 py-2 text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] rounded-lg"
            >
              Annuler
            </button>
            <button
              onClick={handleGenerateClosing}
              className="px-4 py-2 bg-[var(--bg-elevated)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-elevated)] flex items-center gap-2"
            >
              <FileCheck className="w-4 h-4" />
              Générer & Signer PDF
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Historique des Clôtures */}
      <Modal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        title="📋 Historique des Clôtures de Caisse"
      >
        <div className="space-y-4">
          {cashClosings.length === 0 ? (
            <div className="text-center py-8">
              <History className="w-12 h-12 mx-auto mb-3 text-[var(--text-muted)]" />
              <p className="text-[var(--text-secondary)]">Aucune clôture enregistrée</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {cashClosings
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((closing) => (
                  <div
                    key={closing.id}
                    className={`p-4 rounded-lg border ${
                      closing.gap === 0
                        ? 'border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-800'
                        : 'border-orange-200 bg-orange-50 dark:bg-orange-900/10 dark:border-orange-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {closing.gap === 0 ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <AlertTriangle className="w-5 h-5 text-orange-600" />
                        )}
                        <span className="font-bold text-[var(--text-primary)]">
                          {new Date(closing.date).toLocaleDateString('fr-FR', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                      <span className="text-xs text-[var(--text-secondary)]">
                        Clôturé à{' '}
                        {new Date(closing.closedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                      <div>
                        <p className="text-xs text-[var(--text-secondary)]">Ouverture</p>
                        <p className="font-mono font-bold">{formatPrice(closing.openingBalance)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[var(--text-secondary)]">Entrées</p>
                        <p className="font-mono font-bold text-green-600">+{formatPrice(closing.totalIn)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[var(--text-secondary)]">Sorties</p>
                        <p className="font-mono font-bold text-red-600">-{formatPrice(closing.totalOut)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[var(--text-secondary)]">Clôture</p>
                        <p className="font-mono font-bold">{formatPrice(closing.closingBalance)}</p>
                      </div>
                    </div>

                    {closing.gap !== 0 && (
                      <div className="mt-2 pt-2 border-t border-orange-200 dark:border-orange-700">
                        <p className="text-sm">
                          <span className="text-orange-700 dark:text-orange-400 font-bold">
                            Écart: {formatPrice(closing.gap)}
                          </span>
                          {closing.notes && (
                            <span className="text-[var(--text-secondary)] ml-2">— {closing.notes}</span>
                          )}
                        </p>
                      </div>
                    )}

                    <div className="flex justify-end mt-2">
                      <button
                        onClick={() => {
                          setClosingDate(closing.date);
                          setActualClosingBalance(closing.closingBalance.toString());
                          setClosingNotes(closing.notes);
                          handleGenerateClosing();
                        }}
                        className="text-xs text-[var(--primary)] hover:text-[var(--primary)] flex items-center gap-1"
                      >
                        <Download className="w-3 h-3" /> Télécharger PDF
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}

          <div className="pt-4 border-t border-[var(--border)] flex justify-end">
            <button
              onClick={() => setIsHistoryModalOpen(false)}
              className="px-4 py-2 bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] rounded-lg font-bold text-sm"
            >
              Fermer
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
