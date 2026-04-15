import React, { useState, useMemo, useCallback } from 'react';
import { useDataContext } from '../../../contexts/DataContext';
import { Card } from '../../../components/Card';
import type { Budget, Tier } from '../../../types';
import { PLAN_COMPTABLE } from '../constants';
import {
  Plus,
  Trash2,
  Edit2,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Calculator,
  Save,
  X,
  Calendar,
} from 'lucide-react';
import { useCurrency } from '../../../hooks/useCurrency';
import { useTheme } from '../../../contexts/ThemeContext';

interface BudgetViewProps {
  budgets: Budget[];
  journalEntries: any[];
  isSuperAdmin?: boolean;
  resellers?: Tier[];
}

const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

export const BudgetView: React.FC<BudgetViewProps> = ({ budgets, journalEntries, isSuperAdmin, resellers }) => {
  const { formatPrice } = useCurrency();
  const { isDarkMode } = useTheme();
  const { addBudget, updateBudget, deleteBudget } = useDataContext();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Modal & Addition State
  const [isAddLineModalOpen, setIsAddLineModalOpen] = useState(false);
  const [newLineAccount, setNewLineAccount] = useState('');

  // Inline Editing State
  const [editingCell, setEditingCell] = useState<{ id: string; monthIndex: number } | null>(null);
  const [editValue, setEditValue] = useState('');

  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);
  }, []);

  // 1. Group Budgets by Year and Section (6 vs 7)
  const budgetSections = useMemo(() => {
    const yearBudgets = (budgets || []).filter((b) => b.year === selectedYear);

    const charges = yearBudgets.filter((b) => b.accountPrefix.startsWith('6'));
    const produits = yearBudgets.filter((b) => b.accountPrefix.startsWith('7'));

    return { charges, produits };
  }, [budgets, selectedYear]);

  // 2. Calculations (Monthly Totals)
  const calculations = useMemo(() => {
    const monthlyTotals = {
      produits: new Array(12).fill(0),
      charges: new Array(12).fill(0),
      net: new Array(12).fill(0),
    };

    budgetSections.produits.forEach((b) => {
      (b.monthlyAmounts || new Array(12).fill(b.allocatedAmount / 12)).forEach((amt, i) => {
        monthlyTotals.produits[i] += amt;
      });
    });

    budgetSections.charges.forEach((b) => {
      (b.monthlyAmounts || new Array(12).fill(b.allocatedAmount / 12)).forEach((amt, i) => {
        monthlyTotals.charges[i] += amt;
      });
    });

    for (let i = 0; i < 12; i++) {
      monthlyTotals.net[i] = monthlyTotals.produits[i] - monthlyTotals.charges[i];
    }

    const annualTotals = {
      produits: monthlyTotals.produits.reduce((a, b) => a + b, 0),
      charges: monthlyTotals.charges.reduce((a, b) => a + b, 0),
      net: monthlyTotals.net.reduce((a, b) => a + b, 0),
    };

    return { monthlyTotals, annualTotals };
  }, [budgetSections]);

  // 3. Actual vs Budget comparison (charges only — class 6 entries for selected year)
  const overspendAlerts = useMemo(() => {
    const alerts: { category: string; budget: number; reel: number; gap: number }[] = [];

    budgetSections.charges.forEach((b) => {
      const reel = (journalEntries || [])
        .filter((e) => {
          const year = new Date(e.date).getFullYear();
          return year === selectedYear && e.account.startsWith(b.accountPrefix);
        })
        .reduce((sum: number, e: any) => sum + (e.debit || 0), 0);

      if (reel > b.allocatedAmount && b.allocatedAmount > 0) {
        alerts.push({
          category: b.category,
          budget: b.allocatedAmount,
          reel,
          gap: reel - b.allocatedAmount,
        });
      }
    });
    return alerts;
  }, [budgetSections.charges, journalEntries, selectedYear]);

  // 4. Handlers
  const handleCellSave = (budget: Budget, monthIndex: number) => {
    const newValue = parseFloat(editValue) || 0;
    const currentMonthly = budget.monthlyAmounts
      ? [...budget.monthlyAmounts]
      : new Array(12).fill(budget.allocatedAmount / 12);

    currentMonthly[monthIndex] = newValue;
    const newTotal = currentMonthly.reduce((a, b) => a + b, 0);

    updateBudget({
      ...budget,
      monthlyAmounts: currentMonthly,
      allocatedAmount: newTotal,
    });

    setEditingCell(null);
  };

  const handleAddLine = () => {
    if (!newLineAccount) return;

    const accountInfo = PLAN_COMPTABLE.find((a) => a.code === newLineAccount);

    addBudget({
      id: `BUD-${Date.now()}`,
      year: selectedYear,
      category: accountInfo?.label || 'Nouveau Poste',
      accountPrefix: newLineAccount,
      allocatedAmount: 0,
      monthlyAmounts: new Array(12).fill(0),
    } as Budget);

    setIsAddLineModalOpen(false);
    setNewLineAccount('');
  };

  const renderBudgetRow = (budget: Budget) => {
    const amounts = budget.monthlyAmounts || new Array(12).fill(budget.allocatedAmount / 12);

    return (
      <tr key={budget.id} className="tr-hover/50 group transition-colors">
        <td className="sticky left-0 z-10 p-3 bg-[var(--bg-surface)] border-r border-[var(--border)] w-48 min-w-[12rem]">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-sm font-bold text-[var(--text-primary)]">{budget.category}</span>
              <span className="text-[10px] text-[var(--text-secondary)] font-mono">{budget.accountPrefix}</span>
            </div>
            <button
              onClick={() => deleteBudget(budget.id)}
              className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:bg-[var(--clr-danger-dim)] rounded transition-all"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </td>

        {MONTHS.map((_, i) => (
          <td
            key={i}
            className={`p-2 border-r border-[var(--border)] border-[var(--border)] text-center cursor-pointer min-w-[80px] ${editingCell?.id === budget.id && editingCell.monthIndex === i ? 'bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)]' : ''}`}
            onClick={() => {
              setEditingCell({ id: budget.id, monthIndex: i });
              setEditValue(amounts[i].toString());
            }}
          >
            {editingCell?.id === budget.id && editingCell.monthIndex === i ? (
              <input
                autoFocus
                type="number"
                className="w-full bg-[var(--bg-elevated)] border border-[var(--primary)] rounded text-xs p-1 text-center font-bold focus:outline-none"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={() => handleCellSave(budget, i)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCellSave(budget, i);
                  if (e.key === 'Escape') setEditingCell(null);
                }}
              />
            ) : (
              <span className="text-xs font-mono text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
                {amounts[i] === 0 ? '-' : Math.round(amounts[i]).toLocaleString()}
              </span>
            )}
          </td>
        ))}

        <td className="p-3 bg-[var(--bg-elevated)]/50 text-right font-bold text-sm text-[var(--text-primary)] border-l border-[var(--border)] shadow-sm">
          {Math.round(budget.allocatedAmount).toLocaleString()}
        </td>
      </tr>
    );
  };

  return (
    <div className="space-y-6 flex flex-col h-full animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[var(--bg-elevated)] p-4 rounded-xl shadow-sm border border-[var(--border)]">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] rounded-lg">
            <Calculator className="w-6 h-6 text-[var(--primary)]" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-[var(--text-primary)] uppercase tracking-tight">
              Budget d'Exploitation Annuel
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">Janvier à Décembre {selectedYear}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="flex-1 md:flex-none p-2.5 border border-[var(--border)] rounded-lg bg-[var(--bg-elevated)] text-sm font-bold focus:ring-2 focus:ring-[var(--primary)] transition-all outline-none"
          >
            {availableYears.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
          <button
            onClick={() => setIsAddLineModalOpen(true)}
            className="flex-1 md:flex-none bg-[var(--primary)] hover:bg-[var(--primary-light)] text-white px-5 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" /> Ajouter un Compte
          </button>
        </div>
      </div>

      {/* Overspend Alerts */}
      {overspendAlerts.length > 0 && (
        <div className="bg-[var(--clr-danger-dim)] border border-[var(--clr-danger-border)] rounded-xl p-3 flex flex-wrap gap-2 items-center">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          <span className="text-xs font-bold text-[var(--clr-danger-strong)]">Dépassement budgétaire :</span>
          {overspendAlerts.map((a) => (
            <span
              key={a.category}
              className="px-2 py-0.5 bg-red-100 dark:bg-red-900/40 text-[var(--clr-danger-strong)] rounded-full text-xs font-bold"
            >
              {a.category} +{formatPrice(a.gap)}
            </span>
          ))}
        </div>
      )}

      {/* CEP Grid */}
      <div className="flex-1 bg-[var(--bg-elevated)] rounded-xl shadow-sm border border-[var(--border)] flex flex-col overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar overflow-y-auto">
          <table className="w-full border-collapse text-left min-w-[1200px]">
            <thead className="sticky top-0 z-20">
              <tr className="bg-[var(--bg-elevated)] border-b border-[var(--border)] shadow-sm">
                <th className="sticky left-0 z-30 p-4 bg-[var(--bg-elevated)] border-r border-[var(--border)] text-xs font-black text-[var(--text-secondary)] uppercase tracking-widest w-48">
                  Désignation
                </th>
                {MONTHS.map((m) => (
                  <th
                    key={m}
                    className="p-3 text-center text-[10px] font-black text-[var(--text-muted)] uppercase tracking-tighter border-r border-[var(--border)] border-[var(--border)] min-w-[80px]"
                  >
                    {m}
                  </th>
                ))}
                <th className="p-4 bg-[var(--bg-elevated)]/80 text-right text-xs font-black text-[var(--text-secondary)] uppercase tracking-widest border-l border-[var(--border)]">
                  Total Annuel
                </th>
              </tr>
            </thead>

            <tbody>
              {/* Section 1: PRODUITS */}
              <tr className="bg-green-50/50 dark:bg-green-900/5">
                <td
                  colSpan={14}
                  className="p-2 px-4 text-xs font-black text-[var(--clr-success-strong)] flex items-center gap-2"
                >
                  <TrendingUp className="w-3 h-3" /> PRODUITS (PROVISIONS VENTES)
                </td>
              </tr>
              {budgetSections.produits.length === 0 ? (
                <tr>
                  <td colSpan={14} className="p-4 text-center text-xs text-[var(--text-muted)] italic">
                    Aucun compte de produit configuré
                  </td>
                </tr>
              ) : (
                budgetSections.produits.map(renderBudgetRow)
              )}

              {/* Total Produits */}
              <tr className="bg-[var(--clr-success-dim)] font-bold border-t border-[var(--clr-success-border)]">
                <td className="sticky left-0 z-10 p-3 bg-green-50 dark:bg-green-900 border-r border-[var(--clr-success-border)] text-xs font-black text-[var(--clr-success-strong)]">
                  TOTAL PRODUITS (I)
                </td>
                {calculations.monthlyTotals.produits.map((sum, i) => (
                  <td key={i} className="p-3 text-center text-xs font-mono text-[var(--clr-success-strong)]">
                    {sum === 0 ? '-' : Math.round(sum).toLocaleString()}
                  </td>
                ))}
                <td className="p-3 text-right text-sm font-black text-[var(--clr-success-strong)] bg-green-100 dark:bg-green-800/20 border-l border-green-200 dark:border-green-700">
                  {Math.round(calculations.annualTotals.produits).toLocaleString()}
                </td>
              </tr>

              <tr className="h-4"></tr>

              {/* Section 2: CHARGES */}
              <tr className="bg-orange-50/50 dark:bg-orange-900/5">
                <td
                  colSpan={14}
                  className="p-2 px-4 text-xs font-black text-[var(--clr-warning-strong)] flex items-center gap-2"
                >
                  <AlertTriangle className="w-3 h-3" /> CHARGES D'EXPLOITATION
                </td>
              </tr>
              {budgetSections.charges.length === 0 ? (
                <tr>
                  <td colSpan={14} className="p-4 text-center text-xs text-[var(--text-muted)] italic">
                    Aucun compte de charge configuré
                  </td>
                </tr>
              ) : (
                budgetSections.charges.map(renderBudgetRow)
              )}

              {/* Total Charges */}
              <tr className="bg-[var(--clr-warning-dim)] font-bold border-t border-[var(--clr-warning-border)]">
                <td className="sticky left-0 z-10 p-3 bg-orange-50 dark:bg-orange-900 border-r border-[var(--clr-warning-border)] text-xs font-black text-[var(--clr-warning-strong)]">
                  TOTAL CHARGES (II)
                </td>
                {calculations.monthlyTotals.charges.map((sum, i) => (
                  <td key={i} className="p-3 text-center text-xs font-mono text-[var(--clr-warning-strong)]">
                    {sum === 0 ? '-' : Math.round(sum).toLocaleString()}
                  </td>
                ))}
                <td className="p-3 text-right text-sm font-black text-[var(--clr-warning-strong)] bg-orange-100 dark:bg-orange-800/20 border-l border-orange-200 dark:border-orange-700">
                  {Math.round(calculations.annualTotals.charges).toLocaleString()}
                </td>
              </tr>

              <tr className="h-4"></tr>

              {/* RESULTAT NET */}
              <tr
                className="font-bold border-t-2 border-[var(--border-strong)]"
                style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
              >
                <td className="sticky left-0 z-10 p-4 bg-[var(--bg-surface)] border-r border-[var(--border)] text-xs font-black uppercase tracking-widest text-[var(--primary)]">
                  RÉSULTAT NET (I - II)
                </td>
                {calculations.monthlyTotals.net.map((sum, i) => (
                  <td
                    key={i}
                    className={`p-4 text-center text-sm font-mono ${sum < 0 ? 'text-red-400' : 'text-green-400'}`}
                  >
                    {sum === 0 ? '-' : Math.round(sum).toLocaleString()}
                  </td>
                ))}
                <td
                  className={`p-4 text-right text-lg font-black bg-[var(--bg-surface)] border-l border-[var(--border)] ${calculations.annualTotals.net < 0 ? 'text-red-400' : 'text-green-400'}`}
                >
                  {Math.round(calculations.annualTotals.net).toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer Info */}
        <div className="p-3 bg-[var(--bg-elevated)] border-t border-[var(--border)] flex justify-between items-center px-4">
          <div className="flex gap-4 text-[10px] text-[var(--text-secondary)] font-medium">
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-[var(--primary-dim)]0"></div> Cliquez sur une cellule pour éditer
            </span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500"></div> Saisie auto-calculée
            </span>
          </div>
          <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest font-bold italic">
            Compte d'exploitation prévisionnel
          </div>
        </div>
      </div>

      {/* Add Line Modal */}
      {isAddLineModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setIsAddLineModalOpen(false)}
          />
          <div className="relative bg-[var(--bg-surface)] rounded-2xl shadow-2xl p-6 w-full max-w-md border border-[var(--border)] border-[var(--border)] animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-[var(--text-primary)] uppercase tracking-tight flex items-center gap-2">
                <Plus className="w-5 h-5 text-[var(--primary)]" /> Ajouter un poste
              </h3>
              <button
                onClick={() => setIsAddLineModalOpen(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-[var(--text-secondary)] mb-2 tracking-widest">
                  Compte Comptable
                </label>
                <select
                  className="w-full p-3 border-2 border-[var(--border)] border-[var(--border)] rounded-xl bg-[var(--bg-elevated)] text-sm font-bold focus:border-[var(--primary)] focus:outline-none transition-all"
                  value={newLineAccount}
                  onChange={(e) => setNewLineAccount(e.target.value)}
                >
                  <option value="">Sélectionner un compte...</option>
                  <optgroup label="PRODUITS (CLASSE 7)">
                    {PLAN_COMPTABLE.filter((p) => p.code.startsWith('7')).map((p) => (
                      <option key={p.code} value={p.code}>
                        {p.code} - {p.label}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="CHARGES (CLASSE 6)">
                    {PLAN_COMPTABLE.filter((p) => p.code.startsWith('6')).map((p) => (
                      <option key={p.code} value={p.code}>
                        {p.code} - {p.label}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <button
                onClick={handleAddLine}
                disabled={!newLineAccount}
                className="w-full bg-[var(--primary)] hover:bg-[var(--primary-light)] disabled:bg-[var(--bg-elevated)] disabled:text-[var(--text-muted)] text-white p-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-500/20 transition-all mt-4"
              >
                Valider la ligne
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
