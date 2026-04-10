// EntryModal.tsx - Extracted from AccountingView.tsx
// Modal for creating manual accounting entries (OD)

import React, { useState } from 'react';
import { Trash2, FileText, Loader2 } from 'lucide-react';
import { PLAN_COMPTABLE } from '../../constants';

interface EntryLine {
    account: string;
    label: string;
    debit: number;
    credit: number;
}

interface EntryFormData {
    date: string;
    journalCode: string;
    ref: string;
    label: string;
    lines: EntryLine[];
}

interface EntryModalProps {
    isOpen: boolean;
    onClose: () => void;
    entryForm: EntryFormData;
    setEntryForm: React.Dispatch<React.SetStateAction<EntryFormData>>;
    onSubmit: (e: React.FormEvent) => void | Promise<void>;
    onAddLine: () => void;
    onRemoveLine: (index: number) => void;
    onUpdateLine: (index: number, field: string, value: string | number) => void;
    formatPrice: (value: number) => string;
}

export const EntryModal: React.FC<EntryModalProps> = ({
    isOpen,
    onClose,
    entryForm,
    setEntryForm,
    onSubmit,
    onAddLine,
    onRemoveLine,
    onUpdateLine,
    formatPrice
}) => {
    const [isSaving, setIsSaving] = useState(false);

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

    const totalDebit = entryForm.lines.reduce((sum, l) => sum + (l.debit || 0), 0);
    const totalCredit = entryForm.lines.reduce((sum, l) => sum + (l.credit || 0), 0);
    const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900 shrink-0">
                    <h3 className="font-bold text-slate-800 dark:text-white">Saisie d'Écriture Comptable (OD)</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">✕</button>
                </div>
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
                    <div className="grid grid-cols-4 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Date</label>
                            <input 
                                type="date" 
                                className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white text-sm"
                                value={entryForm.date}
                                onChange={e => setEntryForm(prev => ({ ...prev, date: e.target.value }))}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Journal</label>
                            <select 
                                className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white text-sm"
                                value={entryForm.journalCode}
                                onChange={e => setEntryForm(prev => ({ ...prev, journalCode: e.target.value }))}
                            >
                                <option value="OD">Opérations Diverses (OD)</option>
                                <option value="AN">À Nouveaux (AN)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Référence</label>
                            <input 
                                type="text" 
                                className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white text-sm"
                                value={entryForm.ref}
                                onChange={e => setEntryForm(prev => ({ ...prev, ref: e.target.value }))}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Libellé Global</label>
                            <input 
                                type="text" 
                                className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white text-sm"
                                value={entryForm.label}
                                onChange={e => setEntryForm(prev => ({ ...prev, label: e.target.value }))}
                                placeholder="Ex: Régularisation..."
                            />
                        </div>
                    </div>

                    <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-800 font-bold text-xs uppercase text-slate-500 dark:text-slate-300">
                                <tr>
                                    <th className="px-3 py-2 w-48">Compte</th>
                                    <th className="px-3 py-2">Libellé Ligne</th>
                                    <th className="px-3 py-2 w-32 text-right">Débit</th>
                                    <th className="px-3 py-2 w-32 text-right">Crédit</th>
                                    <th className="px-3 py-2 w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-900">
                                {entryForm.lines.map((line, index) => (
                                    <tr key={index}>
                                        <td className="px-3 py-2">
                                            <select 
                                                className="w-full bg-transparent border-b border-slate-200 dark:border-slate-700 focus:border-blue-500 outline-none font-mono text-xs"
                                                value={line.account}
                                                onChange={e => onUpdateLine(index, 'account', e.target.value)}
                                                required
                                            >
                                                <option value="">Sélectionner...</option>
                                                {PLAN_COMPTABLE.map(acc => (
                                                    <option key={acc.code} value={acc.code}>
                                                        {acc.code} - {acc.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="px-3 py-2">
                                            <input 
                                                type="text" 
                                                list={`suggestions-${index}`}
                                                className="w-full bg-transparent border-b border-slate-200 dark:border-slate-700 focus:border-blue-500 outline-none"
                                                value={line.label}
                                                onChange={e => onUpdateLine(index, 'label', e.target.value)}
                                                placeholder={entryForm.label || "Libellé..."}
                                            />
                                            <datalist id={`suggestions-${index}`}>
                                                {PLAN_COMPTABLE.find(p => p.code === line.account)?.suggestions?.map((s, i) => (
                                                    <option key={i} value={s} />
                                                ))}
                                            </datalist>
                                        </td>
                                        <td className="px-3 py-2">
                                            <input 
                                                type="number" 
                                                className="w-full text-right bg-transparent border-b border-slate-200 dark:border-slate-700 focus:border-blue-500 outline-none font-mono"
                                                value={line.debit || ''}
                                                onChange={e => onUpdateLine(index, 'debit', parseFloat(e.target.value) || 0)}
                                                disabled={line.credit > 0}
                                            />
                                        </td>
                                        <td className="px-3 py-2">
                                            <input 
                                                type="number" 
                                                className="w-full text-right bg-transparent border-b border-slate-200 dark:border-slate-700 focus:border-blue-500 outline-none font-mono"
                                                value={line.credit || ''}
                                                onChange={e => onUpdateLine(index, 'credit', parseFloat(e.target.value) || 0)}
                                                disabled={line.debit > 0}
                                            />
                                        </td>
                                        <td className="px-3 py-2 text-center">
                                            <button type="button" onClick={() => onRemoveLine(index)} className="text-red-500 hover:text-red-700">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-slate-50 dark:bg-slate-800 font-bold text-xs uppercase">
                                <tr>
                                    <td colSpan={2} className="px-3 py-2 text-right">Totaux</td>
                                    <td className="px-3 py-2 text-right font-mono text-slate-800 dark:text-white">
                                        {formatPrice(totalDebit)}
                                    </td>
                                    <td className="px-3 py-2 text-right font-mono text-slate-800 dark:text-white">
                                        {formatPrice(totalCredit)}
                                    </td>
                                    <td></td>
                                </tr>
                                <tr>
                                    <td colSpan={5} className="px-3 py-1 text-center">
                                        {!isBalanced ? (
                                            <span className="text-red-500">Écart: {formatPrice(totalDebit - totalCredit)}</span>
                                        ) : (
                                            <span className="text-green-500">Équilibré</span>
                                        )}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                        <button 
                            type="button"
                            onClick={onAddLine}
                            className="w-full py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold uppercase transition-colors"
                        >
                            + Ajouter une ligne
                        </button>
                    </div>

                    <div className="pt-4 flex justify-end gap-2 border-t border-slate-200 dark:border-slate-700 mt-4">
                        <button 
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-sm font-bold transition-colors"
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving || !isBalanced || entryForm.lines.length === 0}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold transition-colors shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isSaving ? (
                                <><Loader2 className="w-4 h-4 animate-spin" /> Enregistrement...</>
                            ) : (
                                <><FileText className="w-4 h-4" /> Enregistrer l'écriture</>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
