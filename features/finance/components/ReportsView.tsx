import React, { useState, useMemo } from 'react';
import { useDataContext } from '../../../contexts/DataContext';
import { Card } from '../../../components/Card';
import { FileText, Download, Calendar, Filter, PieChart, Scale } from 'lucide-react';
import { generateFEC } from '../../../services/fecService';
import { exportReportData } from '../../../services/exportService';
import { useCurrency } from '../../../hooks/useCurrency';
import { useTableSort } from '../../../hooks/useTableSort';
import { SortableHeader } from '../../../components/SortableHeader';

import type { Tier, JournalEntry } from '../../../types';

interface ReportsViewProps {
  journalEntries: JournalEntry[];
  isSuperAdmin?: boolean;
  resellers?: Tier[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  journalEntries,
  isSuperAdmin,
  resellers
}) => {
  const { formatPrice } = useCurrency();
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportType, setReportType] = useState<'GL' | 'BILAN' | 'RESULTAT' | 'BALANCE' | 'TVA' | null>(null);

  const filteredEntries = journalEntries.filter(entry => 
    entry.date >= startDate && entry.date <= endDate
  );

  const accountRows = useMemo(() => {
    const accounts: Record<string, { debit: number; credit: number }> = {};
    filteredEntries.forEach(e => {
      if (!accounts[e.account]) accounts[e.account] = { debit: 0, credit: 0 };
      accounts[e.account].debit += e.debit;
      accounts[e.account].credit += e.credit;
    });
    return Object.entries(accounts).map(([account, { debit, credit }]) => ({
      account, debit, credit, balance: debit - credit,
    }));
  }, [filteredEntries]);

  const BALANCE_SORT_ACCESSORS: Record<string, (row: any) => any> = {
    soldeDebiteur: (row) => row.balance > 0 ? row.balance : 0,
    soldeCrediteur: (row) => row.balance < 0 ? Math.abs(row.balance) : 0,
  };

  const { sortedItems: sortedAccountRows, sortConfig: balanceSortConfig, handleSort: handleBalanceSort } = useTableSort(
    accountRows,
    { key: 'account', direction: 'asc' },
    BALANCE_SORT_ACCESSORS
  );

  const handleGenerateFEC = () => {
      generateFEC(filteredEntries, `FEC_${startDate}_${endDate}.csv`);
  };

  const exportToCSV = (rows: string[][], filename: string) => {
    // rows[0] = en-têtes, rows[1..] = données
    const filenameBase = filename.replace(/\.csv$/i, '');
    exportReportData(rows[0], rows.slice(1), filenameBase, 'csv');
  };

  const renderTrialBalance = () => {
    const totalDebit = sortedAccountRows.reduce((sum, row) => sum + row.debit, 0);
    const totalCredit = sortedAccountRows.reduce((sum, row) => sum + row.credit, 0);

    if (sortedAccountRows.length === 0) {
        return <div className="text-center py-10 text-slate-500">Aucune écriture sur la période sélectionnée.</div>;
    }

    const handleExport = () => {
        const csvData = [
            ['Compte', 'Débit', 'Crédit', 'Solde Débiteur', 'Solde Créditeur'],
            ...sortedAccountRows.map(row => {
                return [
                    row.account,
                    formatPrice(row.debit),
                    formatPrice(row.credit),
                    row.balance > 0 ? formatPrice(row.balance) : '',
                    row.balance < 0 ? formatPrice(Math.abs(row.balance)) : ''
                ];
            }),
            ['TOTAUX', formatPrice(totalDebit), formatPrice(totalCredit), (totalDebit - totalCredit) > 0 ? formatPrice(totalDebit - totalCredit) : '', (totalDebit - totalCredit) < 0 ? formatPrice(Math.abs(totalDebit - totalCredit)) : '']
        ];
        exportToCSV(csvData, `Balance_${startDate}_${endDate}.csv`);
    };

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-slate-800 dark:text-white">Balance Générale</h3>
            <button 
                onClick={handleExport}
                className="flex items-center gap-2 px-3 py-1.5 text-sm rounded border border-[var(--border)] text-[var(--primary)] bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] dark:border-[var(--primary)] dark:text-[var(--primary)] hover:bg-[var(--primary-dim)] transition-colors"
            >
                <Download className="w-4 h-4" />
                Export CSV
            </button>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-400">
                    <tr>
                        <SortableHeader label="Compte" sortKey="account" currentSortKey={balanceSortConfig.key} currentDirection={balanceSortConfig.direction} onSort={handleBalanceSort} className="px-4 py-3" />
                        <SortableHeader label="Débit" sortKey="debit" currentSortKey={balanceSortConfig.key} currentDirection={balanceSortConfig.direction} onSort={handleBalanceSort} className="px-4 py-3 text-right" />
                        <SortableHeader label="Crédit" sortKey="credit" currentSortKey={balanceSortConfig.key} currentDirection={balanceSortConfig.direction} onSort={handleBalanceSort} className="px-4 py-3 text-right" />
                        <SortableHeader label="Solde Débiteur" sortKey="soldeDebiteur" currentSortKey={balanceSortConfig.key} currentDirection={balanceSortConfig.direction} onSort={handleBalanceSort} className="px-4 py-3 text-right" />
                        <SortableHeader label="Solde Créditeur" sortKey="soldeCrediteur" currentSortKey={balanceSortConfig.key} currentDirection={balanceSortConfig.direction} onSort={handleBalanceSort} className="px-4 py-3 text-right" />
                    </tr>
                </thead>
                <tbody>
                    {sortedAccountRows.map(row => {
                        return (
                            <tr key={row.account} className="bg-white border-b dark:bg-slate-800 dark:border-slate-700">
                                <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{row.account}</td>
                                <td className="px-4 py-3 text-right">{formatPrice(row.debit)}</td>
                                <td className="px-4 py-3 text-right">{formatPrice(row.credit)}</td>
                                <td className="px-4 py-3 text-right font-bold text-emerald-600">{row.balance > 0 ? formatPrice(row.balance) : '-'}</td>
                                <td className="px-4 py-3 text-right font-bold text-red-600">{row.balance < 0 ? formatPrice(Math.abs(row.balance)) : '-'}</td>
                            </tr>
                        );
                    })}
                    <tr className="bg-slate-50 dark:bg-slate-700 font-bold">
                        <td className="px-4 py-3">TOTAUX</td>
                        <td className="px-4 py-3 text-right">{formatPrice(totalDebit)}</td>
                        <td className="px-4 py-3 text-right">{formatPrice(totalCredit)}</td>
                        <td className="px-4 py-3 text-right text-emerald-600">{(totalDebit - totalCredit) > 0 ? formatPrice(totalDebit - totalCredit) : '-'}</td>
                        <td className="px-4 py-3 text-right text-red-600">{(totalDebit - totalCredit) < 0 ? formatPrice(Math.abs(totalDebit - totalCredit)) : '-'}</td>
                    </tr>
                </tbody>
            </table>
        </div>
      </div>
    );
  };

  const renderGeneralLedger = () => {
    // Group by Account
    const accounts: Record<string, typeof filteredEntries> = {};
    filteredEntries.forEach(e => {
      if (!accounts[e.account]) accounts[e.account] = [];
      accounts[e.account].push(e);
    });

    if (Object.keys(accounts).length === 0) {
        return <div className="text-center py-10 text-slate-500">Aucune écriture sur la période sélectionnée.</div>;
    }

    return (
      <div className="space-y-6">
        {Object.entries(accounts).sort().map(([account, entries]) => {
          const totalDebit = entries.reduce((sum, e) => sum + e.debit, 0);
          const totalCredit = entries.reduce((sum, e) => sum + e.credit, 0);
          const balance = totalDebit - totalCredit;

          return (
            <div key={account} className="bg-white dark:bg-slate-800/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-200 dark:border-slate-700">
                <h3 className="font-bold text-slate-800 dark:text-slate-200">Compte {account}</h3>
                <div className="text-sm">
                  <span className="text-slate-500 dark:text-slate-400 mr-4">Débit: {formatPrice(totalDebit)}</span>
                  <span className="text-slate-500 dark:text-slate-400 mr-4">Crédit: {formatPrice(totalCredit)}</span>
                  <span className={balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>
                    Solde: {formatPrice(balance)}
                  </span>
                </div>
              </div>
              <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                <thead>
                  <tr>
                    <th className="pb-2">Date</th>
                    <th className="pb-2">Journal</th>
                    <th className="pb-2">Ref</th>
                    <th className="pb-2">Libellé</th>
                    <th className="pb-2 text-right">Débit</th>
                    <th className="pb-2 text-right">Crédit</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map(entry => (
                    <tr key={entry.id} className="border-t border-slate-200 dark:border-slate-700/50">
                      <td className="py-1">{entry.date}</td>
                      <td className="py-1">{entry.journalCode}</td>
                      <td className="py-1">{entry.ref}</td>
                      <td className="py-1">{entry.label}</td>
                      <td className="py-1 text-right">{entry.debit > 0 ? formatPrice(entry.debit) : '-'}</td>
                      <td className="py-1 text-right">{entry.credit > 0 ? formatPrice(entry.credit) : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    );
  };

  const renderIncomeStatement = () => {
    const expenses = filteredEntries.filter(e => e.account.startsWith('6'));
    const revenue = filteredEntries.filter(e => e.account.startsWith('7'));

    const sumDebit = (entries: typeof filteredEntries) => entries.reduce((acc, e) => acc + (e.debit - e.credit), 0);
    const sumCredit = (entries: typeof filteredEntries) => entries.reduce((acc, e) => acc + (e.credit - e.debit), 0);

    const totalRevenue = sumCredit(revenue);
    const totalExpenses = sumDebit(expenses);
    const result = totalRevenue - totalExpenses;

    const handleExport = () => {
        const csvData = [
            ['Poste', 'Montant'],
            ['CHARGES', ''],
            ['Achats (60)', formatPrice(sumDebit(expenses.filter(e => e.account.startsWith('60'))))],
            ['Services Extérieurs (61/62)', formatPrice(sumDebit(expenses.filter(e => e.account.startsWith('61') || e.account.startsWith('62'))))],
            ['Impôts & Taxes (63)', formatPrice(sumDebit(expenses.filter(e => e.account.startsWith('63'))))],
            ['Charges Personnel (64)', formatPrice(sumDebit(expenses.filter(e => e.account.startsWith('64'))))],
            ['TOTAL CHARGES', formatPrice(totalExpenses)],
            ['', ''],
            ['PRODUITS', ''],
            ['Ventes Marchandises (701)', formatPrice(sumCredit(revenue.filter(e => e.account.startsWith('701'))))],
            ['Prestations Services (706)', formatPrice(sumCredit(revenue.filter(e => e.account.startsWith('706'))))],
            ['Autres Produits (7x)', formatPrice(sumCredit(revenue.filter(e => !e.account.startsWith('701') && !e.account.startsWith('706'))))],
            ['TOTAL PRODUITS', formatPrice(totalRevenue)],
            ['', ''],
            ['RÉSULTAT NET', formatPrice(result)]
        ];
        exportToCSV(csvData, `Compte_Resultat_${startDate}_${endDate}.csv`);
    };

    return (
      <div className="space-y-6">
        <div className="flex justify-end">
            <button 
                onClick={handleExport}
                className="flex items-center gap-2 px-3 py-1.5 text-sm rounded border border-[var(--border)] text-[var(--primary)] bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] dark:border-[var(--primary)] dark:text-[var(--primary)] hover:bg-[var(--primary-dim)] transition-colors"
            >
                <Download className="w-4 h-4" />
                Export CSV
            </button>
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-red-600 dark:text-red-400 border-b border-red-500/30 pb-2">Charges (Classe 6)</h3>
            <div className="flex justify-between p-2 bg-white dark:bg-slate-800/50 rounded border border-slate-200 dark:border-slate-700">
              <span className="text-slate-700 dark:text-slate-300">Achats (60)</span>
              <span className="font-mono text-slate-900 dark:text-white">{formatPrice(sumDebit(expenses.filter(e => e.account.startsWith('60'))))}</span>
            </div>
            <div className="flex justify-between p-2 bg-white dark:bg-slate-800/50 rounded border border-slate-200 dark:border-slate-700">
              <span className="text-slate-700 dark:text-slate-300">Services Extérieurs (61/62)</span>
              <span className="font-mono text-slate-900 dark:text-white">{formatPrice(sumDebit(expenses.filter(e => e.account.startsWith('61') || e.account.startsWith('62'))))}</span>
            </div>
            <div className="flex justify-between p-2 bg-white dark:bg-slate-800/50 rounded border border-slate-200 dark:border-slate-700">
              <span className="text-slate-700 dark:text-slate-300">Impôts & Taxes (63)</span>
              <span className="font-mono text-slate-900 dark:text-white">{formatPrice(sumDebit(expenses.filter(e => e.account.startsWith('63'))))}</span>
            </div>
            <div className="flex justify-between p-2 bg-white dark:bg-slate-800/50 rounded border border-slate-200 dark:border-slate-700">
              <span className="text-slate-700 dark:text-slate-300">Charges Personnel (64)</span>
              <span className="font-mono text-slate-900 dark:text-white">{formatPrice(sumDebit(expenses.filter(e => e.account.startsWith('64'))))}</span>
            </div>
            <div className="flex justify-between p-2 bg-white dark:bg-slate-800/50 rounded font-bold border-t border-slate-200 dark:border-slate-700 mt-2 pt-2">
              <span className="text-slate-900 dark:text-white">Total Charges</span>
              <span className="text-slate-900 dark:text-white">{formatPrice(totalExpenses)}</span>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-bold text-emerald-600 dark:text-emerald-400 border-b border-emerald-500/30 pb-2">Produits (Classe 7)</h3>
            <div className="flex justify-between p-2 bg-white dark:bg-slate-800/50 rounded border border-slate-200 dark:border-slate-700">
              <span className="text-slate-700 dark:text-slate-300">Ventes Marchandises (701)</span>
              <span className="font-mono text-slate-900 dark:text-white">{formatPrice(sumCredit(revenue.filter(e => e.account.startsWith('701'))))}</span>
            </div>
            <div className="flex justify-between p-2 bg-white dark:bg-slate-800/50 rounded border border-slate-200 dark:border-slate-700">
              <span className="text-slate-700 dark:text-slate-300">Prestations Services (706)</span>
              <span className="font-mono text-slate-900 dark:text-white">{formatPrice(sumCredit(revenue.filter(e => e.account.startsWith('706'))))}</span>
            </div>
            <div className="flex justify-between p-2 bg-white dark:bg-slate-800/50 rounded border border-slate-200 dark:border-slate-700">
              <span className="text-slate-700 dark:text-slate-300">Autres Produits (7x)</span>
              <span className="font-mono text-slate-900 dark:text-white">{formatPrice(sumCredit(revenue.filter(e => !e.account.startsWith('701') && !e.account.startsWith('706'))))}</span>
            </div>
            <div className="flex justify-between p-2 bg-white dark:bg-slate-800/50 rounded font-bold border-t border-slate-200 dark:border-slate-700 mt-2 pt-2">
              <span className="text-slate-900 dark:text-white">Total Produits</span>
              <span className="text-slate-900 dark:text-white">{formatPrice(totalRevenue)}</span>
            </div>
          </div>
        </div>

          <div className="flex justify-center mt-8">
          <div className={`px-8 py-4 rounded-xl border ${result >= 0 ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-500 text-emerald-700 dark:text-emerald-400' : 'bg-red-50 dark:bg-red-500/10 border-red-500 text-red-700 dark:text-red-400'}`}>
            <span className="text-xl font-bold mr-4">RÉSULTAT NET :</span>
            <span className="text-2xl font-mono font-bold">{formatPrice(result)}</span>
          </div>
        </div>
      </div>
    );
  };

  const renderBalanceSheet = () => {
    // Improved Balance Sheet Logic
    // Calculate balance per account first
    const accountBalances: Record<string, number> = {};
    filteredEntries.forEach(e => {
        if (!accountBalances[e.account]) accountBalances[e.account] = 0;
        accountBalances[e.account] += (e.debit - e.credit); // Positive = Debit Balance
    });

    // Helper to sum balances for a class prefix
    const sumClass = (prefix: string, type: 'DEBIT' | 'CREDIT') => {
        return Object.entries(accountBalances)
            .filter(([acc, bal]) => acc.startsWith(prefix))
            .reduce((sum, [_, bal]) => {
                if (type === 'DEBIT' && bal > 0) return sum + bal;
                if (type === 'CREDIT' && bal < 0) return sum + Math.abs(bal);
                return sum;
            }, 0);
    };

    // Assets (Actif) - Debit Balances
    const fixedAssets = sumClass('2', 'DEBIT');
    const stocks = sumClass('3', 'DEBIT');
    const receivables = sumClass('4', 'DEBIT'); // Clients & others
    const cash = sumClass('5', 'DEBIT'); // Bank & Cash

    // Liabilities (Passif) - Credit Balances
    const equity = sumClass('1', 'CREDIT');
    const payables = sumClass('4', 'CREDIT'); // Suppliers & others
    const bankOverdrafts = sumClass('5', 'CREDIT'); // Bank overdrafts

    // Result
    const expenses = Object.entries(accountBalances).filter(([acc]) => acc.startsWith('6')).reduce((sum, [_, bal]) => sum + bal, 0);
    const revenue = Object.entries(accountBalances).filter(([acc]) => acc.startsWith('7')).reduce((sum, [_, bal]) => sum + Math.abs(bal), 0); // Revenue is credit balance (negative in our calc), so abs
    const result = revenue - expenses;

    const totalAssets = fixedAssets + stocks + receivables + cash;
    const totalLiabilities = equity + payables + bankOverdrafts + result;

    const handleExport = () => {
        const csvData = [
            ['Poste', 'Montant'],
            ['ACTIF', ''],
            ['Immobilisations (Cl. 2)', formatPrice(fixedAssets)],
            ['Stocks (Cl. 3)', formatPrice(stocks)],
            ['Créances (Cl. 4 Débiteur)', formatPrice(receivables)],
            ['Trésorerie (Cl. 5 Débiteur)', formatPrice(cash)],
            ['TOTAL ACTIF', formatPrice(totalAssets)],
            ['', ''],
            ['PASSIF', ''],
            ['Capitaux Propres (Cl. 1)', formatPrice(equity)],
            ['Dettes (Cl. 4 Créditeur)', formatPrice(payables)],
            ['Découverts Bancaires (Cl. 5 Créditeur)', formatPrice(bankOverdrafts)],
            ['Résultat de l\'exercice', formatPrice(result)],
            ['TOTAL PASSIF', formatPrice(totalLiabilities)]
        ];
        exportToCSV(csvData, `Bilan_${startDate}_${endDate}.csv`);
    };

    return (
      <div className="space-y-6">
        <div className="flex justify-end">
            <button 
                onClick={handleExport}
                className="flex items-center gap-2 px-3 py-1.5 text-sm rounded border border-[var(--border)] text-[var(--primary)] bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] dark:border-[var(--primary)] dark:text-[var(--primary)] hover:bg-[var(--primary-dim)] transition-colors"
            >
                <Download className="w-4 h-4" />
                Export CSV
            </button>
        </div>
        <div className="grid grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-emerald-600 dark:text-emerald-400 border-b border-emerald-500/30 pb-2">Actif</h3>
          <div className="flex justify-between p-2 bg-white dark:bg-slate-800/50 rounded border border-slate-200 dark:border-slate-700">
            <span className="text-slate-700 dark:text-slate-300">Immobilisations (Cl. 2)</span>
            <span className="font-mono text-slate-900 dark:text-white">{formatPrice(fixedAssets)}</span>
          </div>
          <div className="flex justify-between p-2 bg-white dark:bg-slate-800/50 rounded border border-slate-200 dark:border-slate-700">
            <span className="text-slate-700 dark:text-slate-300">Stocks (3)</span>
            <span className="font-mono text-slate-900 dark:text-white">{formatPrice(stocks)}</span>
          </div>
          <div className="flex justify-between p-2 bg-white dark:bg-slate-800/50 rounded border border-slate-200 dark:border-slate-700">
            <span className="text-slate-700 dark:text-slate-300">Créances (40/41)</span>
            <span className="font-mono text-slate-900 dark:text-white">{formatPrice(receivables)}</span>
          </div>
          <div className="flex justify-between p-2 bg-white dark:bg-slate-800/50 rounded border border-slate-200 dark:border-slate-700">
            <span className="text-slate-700 dark:text-slate-300">Trésorerie (5)</span>
            <span className="font-mono text-slate-900 dark:text-white">{formatPrice(cash)}</span>
          </div>
          <div className="flex justify-between p-2 bg-white dark:bg-slate-800/50 rounded font-bold border-t border-slate-200 dark:border-slate-700 mt-2 pt-2">
            <span className="text-slate-900 dark:text-white">TOTAL ACTIF</span>
            <span className="text-slate-900 dark:text-white">{formatPrice(totalAssets)}</span>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-bold text-red-600 dark:text-red-400 border-b border-red-500/30 pb-2">Passif</h3>
          <div className="flex justify-between p-2 bg-white dark:bg-slate-800/50 rounded border border-slate-200 dark:border-slate-700">
            <span className="text-slate-700 dark:text-slate-300">Capitaux Propres (1)</span>
            <span className="font-mono text-slate-900 dark:text-white">{formatPrice(equity)}</span>
          </div>
          <div className="flex justify-between p-2 bg-white dark:bg-slate-800/50 rounded border border-slate-200 dark:border-slate-700">
            <span className="text-slate-700 dark:text-slate-300">Dettes (40/42/43/44)</span>
            <span className="font-mono text-slate-900 dark:text-white">{formatPrice(payables)}</span>
          </div>
          <div className="flex justify-between p-2 bg-white dark:bg-slate-800/50 rounded border border-slate-200 dark:border-slate-700">
            <span className="text-slate-700 dark:text-slate-300">Découverts Bancaires</span>
            <span className="font-mono text-slate-900 dark:text-white">{formatPrice(bankOverdrafts)}</span>
          </div>
          <div className="flex justify-between p-2 bg-white dark:bg-slate-800/50 rounded mt-4 border-t border-slate-200 dark:border-slate-600">
            <span className="font-bold text-slate-900 dark:text-white">Résultat de l'exercice</span>
            <span className={result >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>{formatPrice(result)}</span>
          </div>
           <div className="flex justify-between p-2 bg-slate-100 dark:bg-slate-700/50 rounded font-bold border-t border-slate-200 dark:border-slate-600 mt-4">
            <span className="text-slate-900 dark:text-white">TOTAL PASSIF</span>
            <span className="text-slate-900 dark:text-white">{formatPrice(totalLiabilities)}</span>
          </div>
        </div>
      </div>
      </div>
    );
  };

  const renderVATDeclaration = () => {
    // 1. Collecte (Ventes) - 4457xx
    const collectedVAT = filteredEntries
        .filter(e => e.account.startsWith('4457'))
        .reduce((sum, e) => sum + e.credit - e.debit, 0);

    // 2. Déductible (Achats) - 4456xx
    const deductibleVAT = filteredEntries
        .filter(e => e.account.startsWith('4456'))
        .reduce((sum, e) => sum + e.debit - e.credit, 0);

    const vatToPay = collectedVAT - deductibleVAT;

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">Déclaration de TVA (Estimée)</h3>
                <button 
                    onClick={() => exportToCSV([
                        ['Rubrique', 'Montant'],
                        ['TVA Collectée', formatPrice(collectedVAT)],
                        ['TVA Déductible', formatPrice(deductibleVAT)],
                        ['TVA à Payer', vatToPay > 0 ? formatPrice(vatToPay) : formatPrice(0)],
                        ['Crédit de TVA', vatToPay < 0 ? formatPrice(Math.abs(vatToPay)) : formatPrice(0)]
                    ], `TVA_${startDate}_${endDate}.csv`)}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm rounded border border-[var(--border)] text-[var(--primary)] bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] dark:border-[var(--primary)] dark:text-[var(--primary)] hover:bg-[var(--primary-dim)] transition-colors"
                >
                    <Download className="w-4 h-4" />
                    Export CSV
                </button>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-6 space-y-4">
                <div className="flex justify-between items-center p-4 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                    <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">TVA Collectée (Ventes)</p>
                        <p className="text-xs text-slate-400">Comptes 4457xx</p>
                    </div>
                    <p className="text-xl font-bold text-slate-900 dark:text-white">{formatPrice(collectedVAT)}</p>
                </div>

                <div className="flex justify-between items-center p-4 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                    <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">TVA Déductible (Achats)</p>
                        <p className="text-xs text-slate-400">Comptes 4456xx</p>
                    </div>
                    <p className="text-xl font-bold text-slate-900 dark:text-white">{formatPrice(deductibleVAT)}</p>
                </div>

                <div className={`flex justify-between items-center p-4 rounded border ${vatToPay >= 0 ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800' : 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800'}`}>
                    <div>
                        <p className={`text-sm font-bold ${vatToPay >= 0 ? 'text-red-700 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                            {vatToPay >= 0 ? 'TVA À PAYER' : 'CRÉDIT DE TVA'}
                        </p>
                    </div>
                    <p className={`text-2xl font-bold ${vatToPay >= 0 ? 'text-red-700 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                        {formatPrice(Math.abs(vatToPay))}
                    </p>
                </div>
            </div>
        </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Rapports & États Financiers</h2>
        <div className="flex gap-2">
          <div className="flex items-center bg-white dark:bg-slate-800 rounded-lg p-1 border border-slate-200 dark:border-slate-700">
            <Calendar className="w-4 h-4 text-slate-500 dark:text-slate-400 ml-2" />
            <input 
              type="date" 
              aria-label="Date de début"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent border-none text-sm text-slate-700 dark:text-slate-200 focus:ring-0"
            />
            <span className="text-slate-500">-</span>
            <input 
              type="date" 
              aria-label="Date de fin"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent border-none text-sm text-slate-700 dark:text-slate-200 focus:ring-0"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div 
          className={`cursor-pointer transition-colors rounded-xl ${reportType === 'GL' ? 'ring-2 ring-emerald-500' : ''}`}
          onClick={() => setReportType('GL')}
        >
          <Card className="hover:border-emerald-500 transition-colors h-full">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)]0/20 rounded-lg">
                <FileText className="w-6 h-6 text-[var(--primary)] dark:text-[var(--primary)]" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-200">Grand Livre</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Détail par compte</p>
              </div>
            </div>
          </Card>
        </div>

        <div 
          className={`cursor-pointer transition-colors rounded-xl ${reportType === 'BALANCE' ? 'ring-2 ring-emerald-500' : ''}`}
          onClick={() => setReportType('BALANCE')}
        >
          <Card className="hover:border-emerald-500 transition-colors h-full">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-100 dark:bg-indigo-500/20 rounded-lg">
                <Scale className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-200">Balance</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Synthèse des comptes</p>
              </div>
            </div>
          </Card>
        </div>

        <div 
          className={`cursor-pointer transition-colors rounded-xl ${reportType === 'BILAN' ? 'ring-2 ring-emerald-500' : ''}`}
          onClick={() => setReportType('BILAN')}
        >
          <Card className="hover:border-emerald-500 transition-colors h-full">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 dark:bg-purple-500/20 rounded-lg">
                <Filter className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-200">Bilan</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Actif / Passif</p>
              </div>
            </div>
          </Card>
        </div>

        <div 
          className={`cursor-pointer transition-colors rounded-xl ${reportType === 'RESULTAT' ? 'ring-2 ring-emerald-500' : ''}`}
          onClick={() => setReportType('RESULTAT')}
        >
          <Card className="hover:border-emerald-500 transition-colors h-full">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-pink-100 dark:bg-pink-500/20 rounded-lg">
                <PieChart className="w-6 h-6 text-pink-600 dark:text-pink-400" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-200">Résultat</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Charges / Produits</p>
              </div>
            </div>
          </Card>
        </div>

        <div 
          className={`cursor-pointer transition-colors rounded-xl ${reportType === 'TVA' ? 'ring-2 ring-emerald-500' : ''}`}
          onClick={() => setReportType('TVA')}
        >
          <Card className="hover:border-emerald-500 transition-colors h-full">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-teal-100 dark:bg-teal-500/20 rounded-lg">
                <FileText className="w-6 h-6 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-200">Déclaration TVA</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Collectée / Déductible</p>
              </div>
            </div>
          </Card>
        </div>

        <div 
          className="cursor-pointer transition-colors rounded-xl"
          onClick={handleGenerateFEC}
        >
          <Card className="hover:border-emerald-500 transition-colors h-full">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-100 dark:bg-orange-500/20 rounded-lg">
                <Download className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-200">Export FEC</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Format légal .csv</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 min-h-[400px] shadow-sm">
        {!reportType && (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
            <FileText className="w-16 h-16 mb-4 opacity-20" />
            <p>Sélectionnez un rapport à visualiser</p>
          </div>
        )}
        {reportType === 'GL' && renderGeneralLedger()}
        {reportType === 'BALANCE' && renderTrialBalance()}
        {reportType === 'BILAN' && renderBalanceSheet()}
        {reportType === 'RESULTAT' && renderIncomeStatement()}
        {reportType === 'TVA' && renderVATDeclaration()}
      </div>
    </div>
  );
};
