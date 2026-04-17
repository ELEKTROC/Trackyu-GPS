/**
 * TrackYu Mobile — Module 6 : Comptabilité
 * synthese · journal-ventes · journal-encaissements · balance-agee · rapprochement · tva · fec
 */
import { invoicesApi, paymentsApi, Invoice, Payment, INVOICE_STATUS_LABELS } from '../../../../api/financeApi';
import { ReportFilters, ReportResult, ChartItem, getPeriodRange, fmtDate, fmtNum, matchText } from '../types';

function filterInvoices(invoices: Invoice[], f: ReportFilters): Invoice[] {
  const { start, end } = getPeriodRange(f);
  return invoices.filter((inv) => {
    const d = new Date(inv.date);
    if (d < start || d > end) return false;
    if (!matchText(inv.clientName, f.client)) return false;
    return true;
  });
}

function filterPayments(payments: Payment[], f: ReportFilters): Payment[] {
  const { start, end } = getPeriodRange(f);
  return payments.filter((p) => {
    const d = new Date(p.date);
    if (d < start || d > end) return false;
    if (!matchText(p.clientName, f.client)) return false;
    return true;
  });
}

// ── Synthèse ──────────────────────────────────────────────────────────────────

async function genAccountingSynthese(f: ReportFilters): Promise<ReportResult> {
  const [invoices, payments] = await Promise.all([invoicesApi.getAll(), paymentsApi.getAll()]);
  const fi = filterInvoices(invoices, f).filter((i) => i.status !== 'DRAFT' && i.status !== 'CANCELLED');
  const fp = filterPayments(payments, f);

  const totalVentes = fi.reduce((s, i) => s + (i.amountHT ?? i.amount), 0);
  const totalTVA = fi.reduce((s, i) => s + (i.amount - (i.amountHT ?? i.amount)), 0);
  const totalEncaisse = fp.reduce((s, p) => s + p.amount, 0);
  const totalCreances = fi
    .filter((i) => ['SENT', 'OVERDUE', 'PARTIALLY_PAID'].includes(i.status))
    .reduce((s, i) => s + (i.balance ?? i.amount - (i.paidAmount ?? 0)), 0);

  const monthMap = new Map<string, number>();
  for (const inv of fi) {
    const m = inv.date.slice(0, 7);
    monthMap.set(m, (monthMap.get(m) ?? 0) + (inv.amountHT ?? inv.amount));
  }
  const chartItems: ChartItem[] = Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([m, v]) => ({
      label: new Date(m + '-01').toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
      value: v,
      color: '#3B82F6',
    }));

  return {
    title: 'Synthèse Comptabilité',
    kpis: [
      { label: 'Ventes HT (FCFA)', value: fmtNum(totalVentes), color: '#3B82F6' },
      { label: 'TVA collectée (FCFA)', value: fmtNum(totalTVA), color: '#F97316' },
      { label: 'Encaissements (FCFA)', value: fmtNum(totalEncaisse), color: '#22C55E' },
      { label: 'Créances (FCFA)', value: fmtNum(totalCreances), color: '#EF4444' },
      { label: 'Nb écritures ventes', value: String(fi.length), color: '#8B5CF6' },
      { label: 'Nb encaissements', value: String(fp.length), color: '#06B6D4' },
    ],
    columns: ['Indicateur', 'Montant (FCFA)'],
    rows: [
      ["Chiffre d'affaires HT", fmtNum(totalVentes)],
      ['TVA collectée', fmtNum(totalTVA)],
      ['Total TTC facturé', fmtNum(totalVentes + totalTVA)],
      ['Encaissements période', fmtNum(totalEncaisse)],
      ['Créances restantes', fmtNum(totalCreances)],
      ['Taux recouvrement', fi.length > 0 ? `${Math.round((totalEncaisse / (totalVentes + totalTVA)) * 100)}%` : '0%'],
    ],
    chart: chartItems.length > 0 ? { type: 'bar', title: 'Ventes HT par mois', items: chartItems } : undefined,
  };
}

// ── Journal des ventes ─────────────────────────────────────────────────────────

async function genAccountingJournalVentes(f: ReportFilters): Promise<ReportResult> {
  const invoices = await invoicesApi.getAll();
  const list = filterInvoices(invoices, f).filter((i) => i.status !== 'DRAFT');

  // Numéro d'écriture séquentiel
  const sorted = [...list].sort((a, b) => a.date.localeCompare(b.date));

  return {
    title: 'Journal des ventes',
    kpis: [
      { label: 'Nb écritures', value: String(list.length), color: '#3B82F6' },
      {
        label: 'Total HT (FCFA)',
        value: fmtNum(list.reduce((s, i) => s + (i.amountHT ?? i.amount), 0)),
        color: '#8B5CF6',
      },
      {
        label: 'Total TVA (FCFA)',
        value: fmtNum(list.reduce((s, i) => s + (i.amount - (i.amountHT ?? i.amount)), 0)),
        color: '#F97316',
      },
      { label: 'Total TTC (FCFA)', value: fmtNum(list.reduce((s, i) => s + i.amount, 0)), color: '#22C55E' },
    ],
    columns: [
      'N° écriture',
      'Date',
      'N° Facture',
      'Client',
      'Libellé',
      'Compte',
      'Débit HT (FCFA)',
      'TVA (FCFA)',
      'TTC (FCFA)',
      'Statut',
    ],
    rows: sorted.map((inv, idx) => {
      const ht = inv.amountHT ?? inv.amount;
      const tva = inv.amount - ht;
      return [
        String(idx + 1).padStart(4, '0'),
        fmtDate(inv.date),
        inv.number,
        inv.clientName ?? '—',
        inv.subject ?? inv.category ?? 'Vente',
        inv.category === 'INSTALLATION' ? '706100' : inv.category === 'ABONNEMENT' ? '706200' : '706900',
        fmtNum(ht),
        fmtNum(tva),
        fmtNum(inv.amount),
        INVOICE_STATUS_LABELS[inv.status] ?? inv.status,
      ];
    }),
    note: 'Comptes comptables indicatifs — à valider avec votre expert-comptable.',
  };
}

// ── Journal des encaissements ─────────────────────────────────────────────────

async function genAccountingJournalEncaissements(f: ReportFilters): Promise<ReportResult> {
  const payments = await paymentsApi.getAll();
  const list = filterPayments(payments, f);
  const sorted = [...list].sort((a, b) => a.date.localeCompare(b.date));

  const byMethod = new Map<string, number>();
  for (const p of list) {
    const m = p.method ?? 'Autre';
    byMethod.set(m, (byMethod.get(m) ?? 0) + p.amount);
  }
  const chartItems: ChartItem[] = Array.from(byMethod.entries()).map(([m, v], i) => ({
    label: m,
    value: v,
    color: ['#22C55E', '#3B82F6', '#8B5CF6', '#F59E0B', '#F97316'][i % 5],
  }));

  return {
    title: 'Journal des encaissements',
    kpis: [
      { label: 'Nb encaissements', value: String(list.length), color: '#22C55E' },
      { label: 'Total (FCFA)', value: fmtNum(list.reduce((s, p) => s + p.amount, 0)), color: '#3B82F6' },
    ],
    columns: ['N° écriture', 'Date', 'Client', 'Montant (FCFA)', 'Méthode', 'Référence', 'Compte banque'],
    rows: sorted.map((p, idx) => [
      String(idx + 1).padStart(4, '0'),
      fmtDate(p.date),
      p.clientName ?? '—',
      fmtNum(p.amount),
      p.method ?? '—',
      p.reference ?? '—',
      p.method?.toLowerCase().includes('virement')
        ? '512000'
        : p.method?.toLowerCase().includes('wave') || p.method?.toLowerCase().includes('mobile')
          ? '516000'
          : '512000',
    ]),
    chart: chartItems.length > 0 ? { type: 'pie', title: 'Encaissements par méthode', items: chartItems } : undefined,
    note: 'Comptes bancaires indicatifs — à valider avec votre expert-comptable.',
  };
}

// ── Balance âgée ──────────────────────────────────────────────────────────────

async function genAccountingBalanceAgee(f: ReportFilters): Promise<ReportResult> {
  const invoices = await invoicesApi.getAll();
  const unpaid = invoices.filter(
    (i) => ['SENT', 'OVERDUE', 'PARTIALLY_PAID'].includes(i.status) && matchText(i.clientName, f.client)
  );

  const now = new Date();

  function ageSlot(inv: Invoice): string {
    const due = new Date(inv.dueDate);
    const days = Math.floor((now.getTime() - due.getTime()) / 86400000);
    if (days <= 0) return 'Non échu';
    if (days <= 30) return '1–30 jours';
    if (days <= 60) return '31–60 jours';
    if (days <= 90) return '61–90 jours';
    return '+90 jours';
  }

  const slots = ['Non échu', '1–30 jours', '31–60 jours', '61–90 jours', '+90 jours'];
  const slotColors = ['#22C55E', '#F59E0B', '#F97316', '#EF4444', '#7F1D1D'];
  const slotMap = new Map<string, number>();
  for (const s of slots) slotMap.set(s, 0);

  // Agrège par client
  const clientMap = new Map<string, Record<string, number>>();
  for (const inv of unpaid) {
    const client = inv.clientName ?? inv.clientId;
    const slot = ageSlot(inv);
    const balance = inv.balance ?? inv.amount - (inv.paidAmount ?? 0);
    if (!clientMap.has(client)) {
      const init: Record<string, number> = {};
      slots.forEach((s) => (init[s] = 0));
      clientMap.set(client, init);
    }
    clientMap.get(client)![slot] += balance;
    slotMap.set(slot, (slotMap.get(slot) ?? 0) + balance);
  }

  const chartItems: ChartItem[] = slots
    .map((s, i) => ({
      label: s,
      value: slotMap.get(s) ?? 0,
      color: slotColors[i],
    }))
    .filter((i) => i.value > 0);

  return {
    title: 'Balance âgée clients',
    kpis: [
      { label: 'Clients débiteurs', value: String(clientMap.size), color: '#EF4444' },
      {
        label: 'Total impayé (FCFA)',
        value: fmtNum(Array.from(slotMap.values()).reduce((s, v) => s + v, 0)),
        color: '#F97316',
      },
      { label: 'Échu +90j (FCFA)', value: fmtNum(slotMap.get('+90 jours') ?? 0), color: '#DC2626' },
    ],
    columns: ['Client', 'Non échu', '1–30 j', '31–60 j', '61–90 j', '+90 j', 'Total (FCFA)'],
    rows: Array.from(clientMap.entries())
      .map(([client, v]) => {
        const total = Object.values(v).reduce((s, x) => s + x, 0);
        return [
          client,
          fmtNum(v['Non échu'] ?? 0),
          fmtNum(v['1–30 jours'] ?? 0),
          fmtNum(v['31–60 jours'] ?? 0),
          fmtNum(v['61–90 jours'] ?? 0),
          fmtNum(v['+90 jours'] ?? 0),
          fmtNum(total),
        ];
      })
      .sort((a, b) => parseFloat(b[6].replace(/\s/g, '')) - parseFloat(a[6].replace(/\s/g, ''))),
    chart: chartItems.length > 0 ? { type: 'bar', title: 'Créances par ancienneté', items: chartItems } : undefined,
  };
}

// ── Rapprochement bancaire ─────────────────────────────────────────────────────

async function genAccountingRapprochement(f: ReportFilters): Promise<ReportResult> {
  const [invoices, payments] = await Promise.all([invoicesApi.getAll(), paymentsApi.getAll()]);
  const fi = filterInvoices(invoices, f).filter((i) => i.status === 'PAID');
  const fp = filterPayments(payments, f);

  const totalFacture = fi.reduce((s, i) => s + i.amount, 0);
  const totalPaiement = fp.reduce((s, p) => s + p.amount, 0);
  const ecart = totalPaiement - totalFacture;

  // Chart : facturé vs encaissé par mois
  const monthMap = new Map<string, { factured: number; collected: number }>();
  for (const i of fi) {
    const m = i.date.slice(0, 7);
    const e = monthMap.get(m) ?? { factured: 0, collected: 0 };
    e.factured += i.amount;
    monthMap.set(m, e);
  }
  for (const p of fp) {
    const m = p.date.slice(0, 7);
    const e = monthMap.get(m) ?? { factured: 0, collected: 0 };
    e.collected += p.amount;
    monthMap.set(m, e);
  }
  const chartItems: ChartItem[] = Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .flatMap(([m, v]) => {
      const label = new Date(m + '-01').toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
      return [
        { label: `${label} Fact.`, value: v.factured, color: '#3B82F6' },
        { label: `${label} Enc.`, value: v.collected, color: '#22C55E' },
      ];
    })
    .filter((i) => i.value > 0);

  // Lignes triées par date
  const rows = [
    ...fi.map((i) => ['Facture payée', fmtDate(i.date), i.number, i.clientName ?? '—', fmtNum(i.amount), 'Oui']),
    ...fp.map((p) => [
      'Paiement',
      fmtDate(p.date),
      p.reference ?? p.id.slice(0, 8),
      p.clientName ?? '—',
      fmtNum(p.amount),
      p.invoiceIds && p.invoiceIds.length > 0 ? 'Oui' : 'À vérifier',
    ]),
  ].sort((a, b) => a[1].localeCompare(b[1]));

  return {
    title: 'Rapprochement bancaire',
    kpis: [
      { label: 'Factures payées (FCFA)', value: fmtNum(totalFacture), color: '#22C55E' },
      { label: 'Paiements enregistrés (FCFA)', value: fmtNum(totalPaiement), color: '#3B82F6' },
      { label: 'Écart (FCFA)', value: fmtNum(Math.abs(ecart)), color: ecart === 0 ? '#22C55E' : '#EF4444' },
      {
        label: 'Paiements non rapprochés',
        value: String(fp.filter((p) => !p.invoiceIds?.length).length),
        color: '#F97316',
      },
    ],
    columns: ['Type', 'Date', 'Référence', 'Client', 'Montant (FCFA)', 'Rapproché'],
    rows,
    chart:
      chartItems.length > 0 ? { type: 'bar', title: 'Facturé vs Encaissé par mois', items: chartItems } : undefined,
    note:
      ecart !== 0
        ? `Attention : écart de ${fmtNum(Math.abs(ecart))} FCFA détecté entre factures payées et paiements enregistrés.`
        : 'Rapprochement équilibré sur la période.',
  };
}

// ── État TVA ───────────────────────────────────────────────────────────────────

async function genAccountingTVA(f: ReportFilters): Promise<ReportResult> {
  const invoices = await invoicesApi.getAll();
  const list = filterInvoices(invoices, f).filter((i) => !['DRAFT', 'CANCELLED'].includes(i.status));

  const totalHT = list.reduce((s, i) => s + (i.amountHT ?? i.amount), 0);
  const totalTVA = list.reduce((s, i) => s + (i.amount - (i.amountHT ?? i.amount)), 0);
  const totalTTC = totalHT + totalTVA;

  const paid = list.filter((i) => i.status === 'PAID');
  const tvaExigible = paid.reduce((s, i) => s + (i.amount - (i.amountHT ?? i.amount)), 0);

  const rateMap = new Map<number, { ht: number; tva: number; count: number }>();
  for (const inv of list) {
    const rate = inv.vatRate ?? 0;
    const ht = inv.amountHT ?? inv.amount;
    const tva = inv.amount - ht;
    const existing = rateMap.get(rate) ?? { ht: 0, tva: 0, count: 0 };
    rateMap.set(rate, { ht: existing.ht + ht, tva: existing.tva + tva, count: existing.count + 1 });
  }

  const chartItems: ChartItem[] = Array.from(rateMap.entries())
    .map(([rate, v]) => ({
      label: `${rate}%`,
      value: v.tva,
      color: rate === 0 ? '#6B7280' : rate <= 10 ? '#22C55E' : '#F97316',
    }))
    .filter((i) => i.value > 0);

  return {
    title: 'État TVA',
    kpis: [
      { label: 'Base HT (FCFA)', value: fmtNum(totalHT), color: '#3B82F6' },
      { label: 'TVA totale (FCFA)', value: fmtNum(totalTVA), color: '#F97316' },
      { label: 'TVA exigible (factures payées)', value: fmtNum(tvaExigible), color: '#EF4444' },
      { label: 'TTC (FCFA)', value: fmtNum(totalTTC), color: '#8B5CF6' },
    ],
    columns: ['Taux TVA', 'Nb factures', 'Base HT (FCFA)', 'TVA (FCFA)', 'TTC (FCFA)'],
    rows: Array.from(rateMap.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([rate, v]) => [`${rate}%`, String(v.count), fmtNum(v.ht), fmtNum(v.tva), fmtNum(v.ht + v.tva)]),
    chart: chartItems.length > 0 ? { type: 'pie', title: 'TVA par taux', items: chartItems } : undefined,
  };
}

// ── Export FEC ─────────────────────────────────────────────────────────────────

async function genAccountingFEC(f: ReportFilters): Promise<ReportResult> {
  const [invoices, payments] = await Promise.all([invoicesApi.getAll(), paymentsApi.getAll()]);
  const fi = filterInvoices(invoices, f).filter((i) => i.status !== 'DRAFT');
  const fp = filterPayments(payments, f);

  const entries: string[][] = [];

  // Écritures de vente (débit client 411, crédit ventes 706, TVA 44571)
  for (const inv of fi) {
    const ht = inv.amountHT ?? inv.amount;
    const tva = inv.amount - ht;
    const dateStr = inv.date.slice(0, 10).replace(/-/g, '');
    entries.push([
      'VT',
      dateStr,
      inv.number,
      '411000',
      inv.clientName ?? '',
      '',
      fmtNum(inv.amount),
      '0',
      'Facture client',
    ]);
    entries.push(['VT', dateStr, inv.number, '706000', '', '', '0', fmtNum(ht), 'Produit vente']);
    if (tva > 0) entries.push(['VT', dateStr, inv.number, '44571', '', '', '0', fmtNum(tva), 'TVA collectée']);
  }

  // Écritures d'encaissement (débit banque 512, crédit client 411)
  for (const p of fp) {
    const dateStr = p.date.slice(0, 10).replace(/-/g, '');
    entries.push([
      'BQ',
      dateStr,
      p.reference ?? p.id.slice(0, 8),
      '512000',
      '',
      '',
      fmtNum(p.amount),
      '0',
      'Encaissement',
    ]);
    entries.push([
      'BQ',
      dateStr,
      p.reference ?? p.id.slice(0, 8),
      '411000',
      p.clientName ?? '',
      '',
      '0',
      fmtNum(p.amount),
      'Apurement client',
    ]);
  }

  return {
    title: 'Export FEC',
    kpis: [
      { label: 'Lignes ventes', value: String(fi.length * 3), color: '#3B82F6' },
      { label: 'Lignes encaissements', value: String(fp.length * 2), color: '#22C55E' },
      { label: 'Total lignes', value: String(fi.length * 3 + fp.length * 2), color: '#8B5CF6' },
    ],
    columns: ['Journal', 'Date', 'Pièce', 'Compte', 'Tiers', 'Analytique', 'Débit (FCFA)', 'Crédit (FCFA)', 'Libellé'],
    rows: entries,
    note: 'Format FEC indicatif. Les numéros de compte sont à adapter à votre plan comptable. Exportez en CSV pour remise à votre expert-comptable.',
  };
}

// ── Dispatcher Module 6 ───────────────────────────────────────────────────────

export async function generateAccountingReport(subId: string, f: ReportFilters): Promise<ReportResult> {
  switch (subId) {
    case 'synthese':
      return genAccountingSynthese(f);
    case 'sales_journal':
      return genAccountingJournalVentes(f);
    case 'receipts_journal':
      return genAccountingJournalEncaissements(f);
    case 'aged_balance':
      return genAccountingBalanceAgee(f);
    case 'reconciliation':
      return genAccountingRapprochement(f);
    case 'vat_state':
      return genAccountingTVA(f);
    case 'fec_export':
      return genAccountingFEC(f);
    default:
      throw new Error(`Sous-rapport Comptabilité inconnu : ${subId}`);
  }
}
