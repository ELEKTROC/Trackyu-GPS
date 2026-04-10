import { JournalEntry } from '../types';
import { PLAN_COMPTABLE } from '../features/finance/constants';

const JOURNAL_LABELS: Record<string, string> = {
  VT: 'Journal des Ventes',
  AC: 'Journal des Achats',
  BQ: 'Journal de Banque',
  CA: 'Journal de Caisse',
  OD: 'Opérations Diverses',
  AN: 'À Nouveaux',
};

export const generateFEC = (entries: JournalEntry[], filename: string = 'export_fec.csv') => {
  // FEC Standard Columns per DGFiP spec
  // JournalCode|JournalLib|EcritureNum|EcritureDate|CompteNum|CompteLib|CompAuxNum|CompAuxLib|PieceRef|PieceDate|EcritureLib|Debit|Credit|EcritureLet|DateLet|ValidDate|Montantdevise|Idevise

  const header = [
    'JournalCode', 'JournalLib', 'EcritureNum', 'EcritureDate',
    'CompteNum', 'CompteLib', 'CompAuxNum', 'CompAuxLib',
    'PieceRef', 'PieceDate', 'EcritureLib',
    'Debit', 'Credit', 'EcritureLet', 'DateLet', 'ValidDate',
    'Montantdevise', 'Idevise'
  ];

  // Sort entries by date then by original order for stable sequential numbering
  const sorted = [...entries].sort((a, b) => {
    const da = new Date(a.date).getTime();
    const db = new Date(b.date).getTime();
    return da - db;
  });

  const rows = sorted.map((entry, index) => {
    const dateObj = new Date(entry.date);
    const formattedDate = dateObj.toISOString().slice(0, 10).replace(/-/g, '');

    let journalCode = entry.journalCode || 'OD';
    if (!entry.journalCode) {
      if (entry.account.startsWith('7') || entry.account.startsWith('41')) journalCode = 'VT';
      else if (entry.account.startsWith('6') || entry.account.startsWith('40')) journalCode = 'AC';
      else if (entry.account.startsWith('5')) journalCode = 'BQ';
    }

    const journalLib = JOURNAL_LABELS[journalCode] || ('Journal ' + journalCode);

    // EcritureNum: sequential integer, zero-padded to 8 digits
    const ecritureNum = String(index + 1).padStart(8, '0');

    // CompteLib: look up in PLAN_COMPTABLE, fallback to generic class label
    const planEntry = PLAN_COMPTABLE.find(p => p.code === entry.account);
    const compteLib = planEntry?.label || ('Compte ' + entry.account);

    return [
      journalCode,
      journalLib,
      ecritureNum,
      formattedDate,
      entry.account,
      compteLib,
      '',            // CompAuxNum
      '',            // CompAuxLib
      entry.ref,
      formattedDate, // PieceDate = EcritureDate
      entry.label,
      entry.debit.toFixed(2).replace('.', ','),
      entry.credit.toFixed(2).replace('.', ','),
      '',            // EcritureLet
      '',            // DateLet
      formattedDate, // ValidDate
      '',            // Montantdevise
      ''             // Idevise
    ].join(';');
  });

  const csvContent = [header.join(';'), ...rows].join('\r\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
