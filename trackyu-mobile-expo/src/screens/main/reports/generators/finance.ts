/**
 * TrackYu Mobile — Module 5 : Finance
 * synthese · factures · impayes · paiements · depenses · bilan · contrats · renouvellements
 */
import {
  invoicesApi,
  paymentsApi,
  contractsApi,
  Invoice,
  Payment,
  Contract,
  INVOICE_STATUS_LABELS,
  INVOICE_STATUS_COLORS,
  CONTRACT_STATUS_LABELS,
  CONTRACT_STATUS_COLORS,
  ContractBilling,
} from '../../../../api/financeApi';
import { expensesApi, VehicleExpense } from '../../../../api/expensesApi';
import { ReportFilters, ReportResult, ChartItem, getPeriodRange, fmtDate, fmtNum, matchText } from '../types';

/** Convertit une valeur en nombre sûr — évite NaN/undefined dans les calculs financiers */
const safeNum = (v: unknown): number => {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
};

const BILLING_LABELS: Record<ContractBilling, string> = {
  MONTHLY: 'Mensuel',
  QUARTERLY: 'Trimestriel',
  SEMESTRIAL: 'Semestriel',
  ANNUAL: 'Annuel',
};

function filterInvoices(invoices: Invoice[], f: ReportFilters): Invoice[] {
  const { start, end } = getPeriodRange(f);
  return invoices.filter((inv) => {
    const d = new Date(inv.date);
    if (d < start || d > end) return false;
    if (!matchText(inv.clientName, f.client)) return false;
    // resellerName absent sur Invoice — filtre revendeur non applicable
    return true;
  });
}

function filterPayments(payments: Payment[], f: ReportFilters): Payment[] {
  const { start, end } = getPeriodRange(f);
  return payments.filter((p) => {
    const d = new Date(p.date);
    if (d < start || d > end) return false;
    if (!matchText(p.clientName, f.client)) return false;
    // resellerName absent sur Payment — filtre revendeur non applicable
    return true;
  });
}

// ── Synthèse ──────────────────────────────────────────────────────────────────

async function genFinanceSynthese(f: ReportFilters): Promise<ReportResult> {
  const [invoices, payments, contracts] = await Promise.all([
    invoicesApi.getAll(),
    paymentsApi.getAll(),
    contractsApi.getAll(),
  ]);
  const fi = filterInvoices(invoices, f);
  const fp = filterPayments(payments, f);

  const totalFA = fi.reduce((s, i) => s + safeNum(i.amountHT ?? i.amount), 0);
  const totalPaid = fi.filter((i) => i.status === 'PAID').reduce((s, i) => s + safeNum(i.amount), 0);
  const totalUnpaid = fi
    .filter((i) => ['SENT', 'OVERDUE', 'PARTIALLY_PAID'].includes(i.status))
    .reduce((s, i) => s + safeNum(i.balance ?? safeNum(i.amount) - safeNum(i.paidAmount)), 0);
  const totalPayments = fp.reduce((s, p) => s + safeNum(p.amount), 0);
  const activeContracts = contracts.filter((c) => c.status === 'ACTIVE').length;
  const mrr = contracts.filter((c) => c.status === 'ACTIVE').reduce((s, c) => s + safeNum(c.monthlyFee), 0);

  const statusChart: ChartItem[] = Object.entries(INVOICE_STATUS_LABELS)
    .map(([key, label]) => ({
      label,
      value: fi.filter((i) => i.status === key).length,
      color: INVOICE_STATUS_COLORS[key as keyof typeof INVOICE_STATUS_COLORS] ?? '#6B7280',
    }))
    .filter((i) => i.value > 0);

  return {
    title: 'Synthèse Finance',
    kpis: [
      { label: 'CA facturé HT (FCFA)', value: fmtNum(totalFA), color: '#3B82F6' },
      { label: 'Encaissé (FCFA)', value: fmtNum(totalPaid), color: '#22C55E' },
      { label: 'Impayé (FCFA)', value: fmtNum(totalUnpaid), color: '#EF4444' },
      { label: 'Paiements reçus (FCFA)', value: fmtNum(totalPayments), color: '#8B5CF6' },
      { label: 'Contrats actifs', value: String(activeContracts), color: '#06B6D4' },
      { label: 'MRR (FCFA)', value: fmtNum(mrr), color: '#F59E0B' },
    ],
    columns: ['Statut facture', 'Nb', 'Montant HT (FCFA)'],
    rows: Object.entries(INVOICE_STATUS_LABELS)
      .map(([key, label]) => {
        const sub = fi.filter((i) => i.status === key);
        return [label, String(sub.length), fmtNum(sub.reduce((s, i) => s + safeNum(i.amountHT ?? i.amount), 0))];
      })
      .filter((r) => r[1] !== '0'),
    chart: statusChart.length > 0 ? { type: 'pie', title: 'Répartition par statut', items: statusChart } : undefined,
  };
}

// ── Factures ──────────────────────────────────────────────────────────────────

async function genFinanceFactures(f: ReportFilters): Promise<ReportResult> {
  const invoices = await invoicesApi.getAll();
  const list = filterInvoices(invoices, f);

  const totalHT = list.reduce((s, i) => s + safeNum(i.amountHT ?? i.amount), 0);
  const totalTTC = list.reduce((s, i) => s + safeNum(i.amount), 0);

  const statusChart: ChartItem[] = Object.entries(INVOICE_STATUS_LABELS)
    .map(([key, label]) => ({
      label,
      value: list.filter((i) => i.status === key).length,
      color: INVOICE_STATUS_COLORS[key as keyof typeof INVOICE_STATUS_COLORS] ?? '#6B7280',
    }))
    .filter((i) => i.value > 0);

  return {
    title: 'Factures',
    kpis: [
      { label: 'Total factures', value: String(list.length), color: '#3B82F6' },
      { label: 'Montant HT (FCFA)', value: fmtNum(totalHT), color: '#8B5CF6' },
      { label: 'Montant TTC (FCFA)', value: fmtNum(totalTTC), color: '#06B6D4' },
      { label: 'Payées', value: String(list.filter((i) => i.status === 'PAID').length), color: '#22C55E' },
    ],
    columns: [
      'N° Facture',
      'Client',
      'Objet',
      'Statut',
      'Montant HT (FCFA)',
      'TVA %',
      'TTC (FCFA)',
      'Date',
      'Échéance',
    ],
    rows: list.map((i) => [
      i.number,
      i.clientName ?? '—',
      i.subject ?? '—',
      INVOICE_STATUS_LABELS[i.status] ?? i.status,
      fmtNum(i.amountHT ?? i.amount),
      `${i.vatRate}%`,
      fmtNum(i.amount),
      fmtDate(i.date),
      fmtDate(i.dueDate),
    ]),
    chart: statusChart.length > 0 ? { type: 'bar', title: 'Factures par statut', items: statusChart } : undefined,
  };
}

// ── Impayées ──────────────────────────────────────────────────────────────────

async function genFinanceImpayes(f: ReportFilters): Promise<ReportResult> {
  const invoices = await invoicesApi.getAll();
  const list = filterInvoices(invoices, f).filter((i) => ['SENT', 'OVERDUE', 'PARTIALLY_PAID'].includes(i.status));

  const now = new Date();
  const overdue = list.filter((i) => new Date(i.dueDate) < now && i.status !== 'PAID');
  const totalDue = list.reduce((s, i) => s + (i.balance ?? i.amount - (i.paidAmount ?? 0)), 0);

  const byLevel: ChartItem[] = [
    {
      label: 'Aucune',
      value: list.filter((i) => i.recoveryLevel === 'NONE' || !i.recoveryLevel).length,
      color: '#6B7280',
    },
    { label: 'Niveau 1', value: list.filter((i) => i.recoveryLevel === 'LEVEL_1').length, color: '#F59E0B' },
    { label: 'Niveau 2', value: list.filter((i) => i.recoveryLevel === 'LEVEL_2').length, color: '#F97316' },
    { label: 'Niveau 3', value: list.filter((i) => i.recoveryLevel === 'LEVEL_3').length, color: '#EF4444' },
    { label: 'Contentieux', value: list.filter((i) => i.recoveryLevel === 'LITIGATION').length, color: '#7F1D1D' },
  ].filter((i) => i.value > 0);

  return {
    title: 'Factures impayées',
    kpis: [
      { label: 'Nb impayées', value: String(list.length), color: '#EF4444' },
      { label: 'En retard', value: String(overdue.length), color: '#DC2626' },
      { label: 'Montant dû (FCFA)', value: fmtNum(totalDue), color: '#F97316' },
      {
        label: 'Partiellement payées',
        value: String(list.filter((i) => i.status === 'PARTIALLY_PAID').length),
        color: '#F59E0B',
      },
    ],
    columns: [
      'N° Facture',
      'Client',
      'Statut',
      'Montant TTC (FCFA)',
      'Payé (FCFA)',
      'Restant (FCFA)',
      'Échéance',
      'Recouvrement',
    ],
    rows: list.map((i) => {
      const paid = i.paidAmount ?? 0;
      const balance = safeNum(i.balance ?? safeNum(i.amount) - safeNum(paid));
      return [
        i.number,
        i.clientName ?? '—',
        INVOICE_STATUS_LABELS[i.status] ?? i.status,
        fmtNum(i.amount),
        fmtNum(paid),
        fmtNum(balance),
        fmtDate(i.dueDate),
        i.recoveryLevel ?? 'NONE',
      ];
    }),
    chart: byLevel.length > 0 ? { type: 'bar', title: 'Par niveau de recouvrement', items: byLevel } : undefined,
  };
}

// ── Paiements ─────────────────────────────────────────────────────────────────

async function genFinancePaiements(f: ReportFilters): Promise<ReportResult> {
  const payments = await paymentsApi.getAll();
  const list = filterPayments(payments, f);

  const total = list.reduce((s, p) => s + safeNum(p.amount), 0);

  // Par méthode
  const methodMap = new Map<string, number>();
  for (const p of list) {
    const m = p.method ?? 'Autre';
    methodMap.set(m, (methodMap.get(m) ?? 0) + safeNum(p.amount));
  }
  const chartItems: ChartItem[] = Array.from(methodMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([m, v], i) => ({
      label: m,
      value: v,
      color: ['#22C55E', '#3B82F6', '#8B5CF6', '#F59E0B', '#F97316'][i % 5],
    }));

  return {
    title: 'Paiements',
    kpis: [
      { label: 'Nb paiements', value: String(list.length), color: '#22C55E' },
      { label: 'Total encaissé (FCFA)', value: fmtNum(total), color: '#3B82F6' },
    ],
    columns: ['Date', 'Client', 'Montant (FCFA)', 'Méthode', 'Référence', 'Statut'],
    rows: list.map((p) => [
      fmtDate(p.date),
      p.clientName ?? '—',
      fmtNum(p.amount),
      p.method ?? '—',
      p.reference ?? '—',
      p.status ?? '—',
    ]),
    chart: chartItems.length > 0 ? { type: 'pie', title: 'Encaissements par méthode', items: chartItems } : undefined,
  };
}

// ── Dépenses véhicules ────────────────────────────────────────────────────────

async function genFinanceDepenses(f: ReportFilters): Promise<ReportResult> {
  const { start, end } = getPeriodRange(f);
  const all = await expensesApi.getAll();
  const list = all.filter((e: VehicleExpense) => {
    const d = new Date(e.date);
    return d >= start && d <= end;
  });

  const totalDepenses = list.reduce((s, e) => s + safeNum(e.amount), 0);

  const catMap = new Map<string, number>();
  for (const e of list) catMap.set(e.category, (catMap.get(e.category) ?? 0) + safeNum(e.amount));

  const CAT_COLORS: Record<string, string> = {
    Carburant: '#F97316',
    Péage: '#3B82F6',
    Réparation: '#EF4444',
    Assurance: '#8B5CF6',
    Entretien: '#22C55E',
    Lavage: '#06B6D4',
    Amende: '#DC2626',
    Autre: '#6B7280',
  };

  const chartItems: ChartItem[] = Array.from(catMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([cat, v]) => ({ label: cat, value: v, color: CAT_COLORS[cat] ?? '#6B7280' }));

  return {
    title: 'Dépenses véhicules',
    kpis: [
      { label: 'Total dépenses (FCFA)', value: fmtNum(totalDepenses), color: '#EF4444' },
      { label: 'Nb dépenses', value: String(list.length), color: '#6B7280' },
      { label: 'Carburant (FCFA)', value: fmtNum(catMap.get('Carburant') ?? 0), color: '#F97316' },
      { label: 'Réparation (FCFA)', value: fmtNum(catMap.get('Réparation') ?? 0), color: '#DC2626' },
    ],
    columns: ['Date', 'Catégorie', 'Montant (FCFA)', 'Description'],
    rows: list
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((e) => [fmtDate(e.date), e.category, fmtNum(e.amount), e.description ?? '—']),
    chart: chartItems.length > 0 ? { type: 'bar', title: 'Dépenses par catégorie', items: chartItems } : undefined,
  };
}

// ── Bilan mensuel ─────────────────────────────────────────────────────────────

async function genFinanceBilan(f: ReportFilters): Promise<ReportResult> {
  const [invoices, payments, expenses] = await Promise.all([
    invoicesApi.getAll(),
    paymentsApi.getAll(),
    expensesApi.getAll(),
  ]);

  // 12 derniers mois
  const now = new Date();
  const months: string[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  const bilanMap = new Map<string, { factured: number; collected: number; unpaid: number; depenses: number }>();
  for (const m of months) bilanMap.set(m, { factured: 0, collected: 0, unpaid: 0, depenses: 0 });

  for (const inv of invoices) {
    const m = inv.date.slice(0, 7);
    if (!bilanMap.has(m)) continue;
    const b = bilanMap.get(m)!;
    b.factured += safeNum(inv.amountHT ?? inv.amount);
    if (['SENT', 'OVERDUE', 'PARTIALLY_PAID'].includes(inv.status))
      b.unpaid += safeNum(inv.balance ?? safeNum(inv.amount) - safeNum(inv.paidAmount));
  }
  for (const p of payments) {
    const m = p.date.slice(0, 7);
    if (!bilanMap.has(m)) continue;
    bilanMap.get(m)!.collected += safeNum(p.amount);
  }
  for (const e of expenses as VehicleExpense[]) {
    const m = e.date.slice(0, 7);
    if (!bilanMap.has(m)) continue;
    bilanMap.get(m)!.depenses += safeNum(e.amount);
  }

  const vals = Array.from(bilanMap.values());
  const totalFactured = vals.reduce((s, b) => s + b.factured, 0);
  const totalCollected = vals.reduce((s, b) => s + b.collected, 0);
  const totalUnpaid = vals.reduce((s, b) => s + b.unpaid, 0);
  const totalDepenses = vals.reduce((s, b) => s + b.depenses, 0);

  const chartItems: ChartItem[] = months
    .flatMap((m) => {
      const b = bilanMap.get(m)!;
      const label = new Date(m + '-01').toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
      return [
        { label: `${label} Enc.`, value: b.collected, color: '#22C55E' },
        { label: `${label} Dép.`, value: b.depenses, color: '#EF4444' },
      ];
    })
    .filter((i) => i.value > 0)
    .slice(0, 24);

  return {
    title: 'Bilan mensuel',
    kpis: [
      { label: 'CA facturé HT (FCFA)', value: fmtNum(totalFactured), color: '#3B82F6' },
      { label: 'Encaissé (FCFA)', value: fmtNum(totalCollected), color: '#22C55E' },
      { label: 'Dépenses (FCFA)', value: fmtNum(totalDepenses), color: '#EF4444' },
      {
        label: 'Solde net (FCFA)',
        value: fmtNum(totalCollected - totalDepenses),
        color: totalCollected >= totalDepenses ? '#22C55E' : '#DC2626',
      },
      { label: 'Impayé (FCFA)', value: fmtNum(totalUnpaid), color: '#F97316' },
    ],
    columns: ['Mois', 'Facturé HT (FCFA)', 'Encaissé (FCFA)', 'Dépenses (FCFA)', 'Solde net (FCFA)', 'Impayé (FCFA)'],
    rows: months.map((m) => {
      const b = bilanMap.get(m)!;
      const label = new Date(m + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
      return [
        label,
        fmtNum(b.factured),
        fmtNum(b.collected),
        fmtNum(b.depenses),
        fmtNum(b.collected - b.depenses),
        fmtNum(b.unpaid),
      ];
    }),
    chart:
      chartItems.length > 0
        ? { type: 'bar', title: 'Encaissements vs Dépenses (12 mois)', items: chartItems }
        : undefined,
  };
}

// ── Contrats ──────────────────────────────────────────────────────────────────

async function genFinanceContrats(f: ReportFilters): Promise<ReportResult> {
  const contracts = await contractsApi.getAll();
  const list = contracts.filter((c) => matchText(c.clientName, f.client));

  const active = list.filter((c) => c.status === 'ACTIVE');
  const mrr = active.reduce((s, c) => s + c.monthlyFee, 0);
  const arr = mrr * 12;

  const statusChart: ChartItem[] = Object.entries(CONTRACT_STATUS_LABELS)
    .map(([key, label]) => ({
      label,
      value: list.filter((c) => c.status === key).length,
      color: CONTRACT_STATUS_COLORS[key as keyof typeof CONTRACT_STATUS_COLORS] ?? '#6B7280',
    }))
    .filter((i) => i.value > 0);

  return {
    title: 'Contrats',
    kpis: [
      { label: 'Total contrats', value: String(list.length), color: '#3B82F6' },
      { label: 'Actifs', value: String(active.length), color: '#22C55E' },
      { label: 'MRR (FCFA)', value: fmtNum(mrr), color: '#8B5CF6' },
      { label: 'ARR (FCFA)', value: fmtNum(arr), color: '#F59E0B' },
    ],
    columns: [
      'Référence',
      'Client',
      'Statut',
      'Cycle',
      'Mensualité (FCFA)',
      'Engins',
      'Début',
      'Fin',
      'Auto-renouvellement',
    ],
    rows: list.map((c) => [
      c.contractNumber ?? c.id.slice(0, 8),
      c.clientName ?? '—',
      CONTRACT_STATUS_LABELS[c.status] ?? c.status,
      BILLING_LABELS[c.billingCycle] ?? c.billingCycle,
      fmtNum(c.monthlyFee),
      String(c.vehicleCount),
      fmtDate(c.startDate),
      fmtDate(c.endDate),
      c.autoRenew ? 'Oui' : 'Non',
    ]),
    chart: statusChart.length > 0 ? { type: 'pie', title: 'Statuts des contrats', items: statusChart } : undefined,
  };
}

// ── Renouvellements ───────────────────────────────────────────────────────────

async function genFinanceRenouvellements(f: ReportFilters): Promise<ReportResult> {
  const contracts = await contractsApi.getAll();

  const now = new Date();
  const in90Days = new Date(now.getTime() + 90 * 86400000);

  // Contrats dont la date de fin est dans les 90 prochains jours ou déjà expirés
  const expiring = contracts
    .filter((c) => {
      const end = new Date(c.endDate);
      return end <= in90Days;
    })
    .filter((c) => matchText(c.clientName, f.client));

  const expired = expiring.filter((c) => new Date(c.endDate) < now);
  const in30 = expiring.filter((c) => {
    const d = new Date(c.endDate);
    return d >= now && d <= new Date(now.getTime() + 30 * 86400000);
  });
  const in60 = expiring.filter((c) => {
    const d = new Date(c.endDate);
    return d > new Date(now.getTime() + 30 * 86400000) && d <= new Date(now.getTime() + 60 * 86400000);
  });
  const in90 = expiring.filter((c) => {
    const d = new Date(c.endDate);
    return d > new Date(now.getTime() + 60 * 86400000) && d <= in90Days;
  });

  const horizonChart: ChartItem[] = [
    { label: 'Expiré', value: expired.length, color: '#7F1D1D' },
    { label: '< 30j', value: in30.length, color: '#EF4444' },
    { label: '31-60j', value: in60.length, color: '#F97316' },
    { label: '61-90j', value: in90.length, color: '#F59E0B' },
  ].filter((i) => i.value > 0);

  return {
    title: 'Renouvellements',
    kpis: [
      { label: 'À renouveler (90j)', value: String(expiring.length), color: '#F97316' },
      { label: 'Expirés', value: String(expired.length), color: '#7F1D1D' },
      { label: 'Urgents (<30j)', value: String(in30.length), color: '#EF4444' },
      {
        label: 'Auto-renouvellement actif',
        value: String(contracts.filter((c) => c.autoRenew && c.status === 'ACTIVE').length),
        color: '#22C55E',
      },
    ],
    columns: ['Référence', 'Client', 'Statut', 'Fin contrat', 'Horizon', 'Mensualité (FCFA)', 'Auto-renouv.'],
    rows: expiring
      .sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime())
      .map((c) => {
        const end = new Date(c.endDate);
        const daysLeft = Math.ceil((end.getTime() - now.getTime()) / 86400000);
        const horizon =
          daysLeft < 0
            ? 'Expiré'
            : daysLeft <= 30
              ? `< 30j (${daysLeft}j)`
              : daysLeft <= 60
                ? `31-60j (${daysLeft}j)`
                : `61-90j (${daysLeft}j)`;
        return [
          c.contractNumber ?? c.id.slice(0, 8),
          c.clientName ?? '—',
          CONTRACT_STATUS_LABELS[c.status] ?? c.status,
          fmtDate(c.endDate),
          horizon,
          fmtNum(c.monthlyFee),
          c.autoRenew ? 'Oui' : 'Non',
        ];
      }),
    chart:
      horizonChart.length > 0
        ? { type: 'bar', title: "Contrats par horizon d'expiration", items: horizonChart }
        : undefined,
  };
}

// ── Dispatcher Module 5 ───────────────────────────────────────────────────────

export async function generateFinanceReport(subId: string, f: ReportFilters): Promise<ReportResult> {
  switch (subId) {
    case 'synthese':
      return genFinanceSynthese(f);
    case 'invoices':
      return genFinanceFactures(f);
    case 'overdue':
      return genFinanceImpayes(f);
    case 'payments':
      return genFinancePaiements(f);
    case 'depenses':
      return genFinanceDepenses(f);
    case 'bilan':
      return genFinanceBilan(f);
    case 'contracts':
      return genFinanceContrats(f);
    case 'renewals':
      return genFinanceRenouvellements(f);
    default:
      throw new Error(`Sous-rapport Finance inconnu : ${subId}`);
  }
}
