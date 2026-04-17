/**
 * TrackYu Mobile — Module 4 : CRM
 * synthese · leads · performance · quotes · ventes · sales_summary
 */
import crmApi, { Lead, LEAD_STATUS_LABELS, LEAD_STATUS_COLORS } from '../../../../api/crmApi';
import {
  quotesApi,
  invoicesApi,
  Quote,
  Invoice,
  QUOTE_STATUS_LABELS,
  QUOTE_STATUS_COLORS,
} from '../../../../api/financeApi';
import {
  ReportFilters,
  ReportResult,
  ChartItem,
  ReportGroup,
  getPeriodRange,
  fmtDate,
  fmtNum,
  matchText,
} from '../types';

// Statuts factures comptés comme "ventes réalisées"
const VENTE_STATUSES = new Set(['PAID', 'SENT', 'OVERDUE', 'PARTIALLY_PAID']);

function filterLeads(leads: Lead[], f: ReportFilters): Lead[] {
  const { start, end } = getPeriodRange(f);
  return leads.filter((l) => {
    const d = new Date(l.created_at);
    if (d < start || d > end) return false;
    if (!matchText(l.company_name, f.client)) return false;
    // reseller_name absent sur Lead — filtre revendeur non applicable
    return true;
  });
}

function filterQuotes(quotes: Quote[], f: ReportFilters): Quote[] {
  const { start, end } = getPeriodRange(f);
  return quotes.filter((q) => {
    const d = new Date(q.createdAt);
    if (d < start || d > end) return false;
    if (!matchText(q.clientName, f.client)) return false;
    return true;
  });
}

function filterInvoices(invoices: Invoice[], f: ReportFilters): Invoice[] {
  const { start, end } = getPeriodRange(f);
  return invoices.filter((inv) => {
    const d = new Date(inv.date);
    if (d < start || d > end) return false;
    if (!VENTE_STATUSES.has(inv.status)) return false;
    if (!matchText(inv.clientName, f.client)) return false;
    return true;
  });
}

function amountTTC(inv: Invoice): number {
  if (inv.amountHT != null) return inv.amountHT * (1 + (inv.vatRate ?? 0) / 100);
  return inv.amount;
}

// ── Synthèse ──────────────────────────────────────────────────────────────────

async function genCrmSynthese(f: ReportFilters): Promise<ReportResult> {
  const [leads, quotes] = await Promise.all([crmApi.getLeads(), quotesApi.getAll()]);
  const fl = filterLeads(leads, f);
  const fq = filterQuotes(quotes, f);

  const won = fl.filter((l) => l.status === 'WON').length;
  const lost = fl.filter((l) => l.status === 'LOST').length;
  const conversion = fl.length > 0 ? Math.round((won / fl.length) * 100) : 0;
  const pipeline = fl.reduce((s, l) => s + (l.potential_value ?? 0), 0);
  const quotesAccepted = fq.filter((q) => q.status === 'ACCEPTED').length;

  const statusChart: ChartItem[] = Object.entries(LEAD_STATUS_LABELS)
    .map(([key, label]) => ({
      label,
      value: fl.filter((l) => l.status === key).length,
      color: LEAD_STATUS_COLORS[key as keyof typeof LEAD_STATUS_COLORS] ?? '#6B7280',
    }))
    .filter((i) => i.value > 0);

  return {
    title: 'Synthèse CRM',
    kpis: [
      { label: 'Total leads', value: String(fl.length), color: '#3B82F6' },
      { label: 'Gagnés', value: String(won), color: '#22C55E' },
      { label: 'Taux conversion', value: `${conversion}%`, color: '#8B5CF6' },
      { label: 'Pipeline (FCFA)', value: fmtNum(pipeline), color: '#F59E0B' },
      { label: 'Devis envoyés', value: String(fq.length), color: '#06B6D4' },
      { label: 'Devis acceptés', value: String(quotesAccepted), color: '#22C55E' },
    ],
    columns: ['Statut', 'Nb leads', 'Valeur potentielle (FCFA)'],
    rows: Object.entries(LEAD_STATUS_LABELS)
      .map(([key, label]) => {
        const sub = fl.filter((l) => l.status === key);
        const val = sub.reduce((s, l) => s + (l.potential_value ?? 0), 0);
        return [label, String(sub.length), fmtNum(val)];
      })
      .filter((r) => r[1] !== '0'),
    chart: statusChart.length > 0 ? { type: 'pie', title: 'Répartition par statut', items: statusChart } : undefined,
  };
}

// ── Leads ─────────────────────────────────────────────────────────────────────

async function genCrmLeads(f: ReportFilters): Promise<ReportResult> {
  const leads = await crmApi.getLeads();
  const list = filterLeads(leads, f);

  const wonVal = list.filter((l) => l.status === 'WON').reduce((s, l) => s + (l.potential_value ?? 0), 0);

  const statusChart: ChartItem[] = Object.entries(LEAD_STATUS_LABELS)
    .map(([key, label]) => ({
      label,
      value: list.filter((l) => l.status === key).length,
      color: LEAD_STATUS_COLORS[key as keyof typeof LEAD_STATUS_COLORS] ?? '#6B7280',
    }))
    .filter((i) => i.value > 0);

  return {
    title: 'Leads',
    kpis: [
      { label: 'Total', value: String(list.length), color: '#3B82F6' },
      { label: 'Gagnés', value: String(list.filter((l) => l.status === 'WON').length), color: '#22C55E' },
      { label: 'Perdus', value: String(list.filter((l) => l.status === 'LOST').length), color: '#EF4444' },
      { label: 'Valeur gagnée (FCFA)', value: fmtNum(wonVal), color: '#8B5CF6' },
    ],
    columns: ['Entreprise', 'Contact', 'Statut', 'Source', 'Valeur (FCFA)', 'Assigné', 'Date'],
    rows: list.map((l) => [
      l.company_name,
      l.contact_name ?? '—',
      LEAD_STATUS_LABELS[l.status] ?? l.status,
      l.source ?? '—',
      l.potential_value != null ? fmtNum(l.potential_value) : '—',
      l.assigned_to ?? '—',
      fmtDate(l.created_at),
    ]),
    chart: statusChart.length > 0 ? { type: 'bar', title: 'Leads par statut', items: statusChart } : undefined,
  };
}

// ── Devis ─────────────────────────────────────────────────────────────────────

async function genCrmDevis(f: ReportFilters): Promise<ReportResult> {
  const quotes = await quotesApi.getAll();
  const list = filterQuotes(quotes, f);

  const accepted = list.filter((q) => q.status === 'ACCEPTED');
  const totalAccepted = accepted.reduce((s, q) => s + (q.amountHT ?? q.amount), 0);

  const statusChart: ChartItem[] = Object.entries(QUOTE_STATUS_LABELS)
    .map(([key, label]) => ({
      label,
      value: list.filter((q) => q.status === key).length,
      color: QUOTE_STATUS_COLORS[key as keyof typeof QUOTE_STATUS_COLORS] ?? '#6B7280',
    }))
    .filter((i) => i.value > 0);

  return {
    title: 'Devis',
    kpis: [
      { label: 'Total devis', value: String(list.length), color: '#3B82F6' },
      { label: 'Acceptés', value: String(accepted.length), color: '#22C55E' },
      { label: 'Refusés', value: String(list.filter((q) => q.status === 'REJECTED').length), color: '#EF4444' },
      { label: 'Montant accepté (FCFA)', value: fmtNum(totalAccepted), color: '#8B5CF6' },
    ],
    columns: ['N° Devis', 'Client', 'Objet', 'Statut', 'Montant HT (FCFA)', 'Montant TTC (FCFA)', 'Date', 'Validité'],
    rows: list.map((q) => {
      const ht = q.amountHT ?? q.amount;
      const ttc = ht * (1 + (q.vatRate ?? 0) / 100);
      return [
        q.number ?? '—',
        q.clientName ?? '—',
        q.subject ?? '—',
        QUOTE_STATUS_LABELS[q.status] ?? q.status,
        fmtNum(ht),
        fmtNum(Math.round(ttc)),
        fmtDate(q.createdAt),
        q.validUntil ? fmtDate(q.validUntil) : '—',
      ];
    }),
    chart: statusChart.length > 0 ? { type: 'pie', title: 'Statuts des devis', items: statusChart } : undefined,
  };
}

// ── Ventes (par client + par article) ────────────────────────────────────────

async function genCrmVentes(f: ReportFilters): Promise<ReportResult> {
  const invoices = await invoicesApi.getAll();
  const list = filterInvoices(invoices, f);

  // Agrégation par client
  const clientMap = new Map<string, { invoices: Invoice[]; ttc: number }>();
  for (const inv of list) {
    const key = inv.clientName ?? inv.clientId ?? '—';
    const existing = clientMap.get(key) ?? { invoices: [], ttc: 0 };
    existing.invoices.push(inv);
    existing.ttc += amountTTC(inv);
    clientMap.set(key, existing);
  }

  // Agrégation globale par article (tous clients confondus)
  const articleMap = new Map<string, { qty: number; ttc: number }>();
  for (const inv of list) {
    for (const item of inv.items) {
      const key = item.description;
      const ex = articleMap.get(key) ?? { qty: 0, ttc: 0 };
      const ttcUnit = item.price * (1 + (inv.vatRate ?? 0) / 100);
      articleMap.set(key, { qty: ex.qty + item.quantity, ttc: ex.ttc + item.quantity * ttcUnit });
    }
  }

  const totalTTC = list.reduce((s, inv) => s + amountTTC(inv), 0);
  const clientsSorted = Array.from(clientMap.entries()).sort((a, b) => b[1].ttc - a[1].ttc);
  const articlesSorted = Array.from(articleMap.entries()).sort((a, b) => b[1].ttc - a[1].ttc);

  // Rapport groupé : groupe = client, détails = articles facturés à ce client
  const groups: ReportGroup[] = clientsSorted.map(([client, data]) => {
    const clientArticles = new Map<string, { qty: number; ttc: number }>();
    for (const inv of data.invoices) {
      for (const item of inv.items) {
        const ex = clientArticles.get(item.description) ?? { qty: 0, ttc: 0 };
        const ttcUnit = item.price * (1 + (inv.vatRate ?? 0) / 100);
        clientArticles.set(item.description, { qty: ex.qty + item.quantity, ttc: ex.ttc + item.quantity * ttcUnit });
      }
    }
    return {
      summary: [
        client,
        String(data.invoices.length),
        fmtNum(Math.round(data.ttc)),
        `${Math.round((data.ttc / totalTTC) * 100)}%`,
      ],
      detailColumns: ['Article / Service', 'Quantité', 'Montant TTC (FCFA)'],
      details: Array.from(clientArticles.entries())
        .sort((a, b) => b[1].ttc - a[1].ttc)
        .map(([art, v]) => [art, String(v.qty), fmtNum(Math.round(v.ttc))]),
    };
  });

  const PALETTE = [
    '#3B82F6',
    '#8B5CF6',
    '#22C55E',
    '#F59E0B',
    '#EF4444',
    '#06B6D4',
    '#F97316',
    '#EC4899',
    '#10B981',
    '#6366F1',
  ];
  const chartItems: ChartItem[] = articlesSorted.slice(0, 10).map(([name, v], i) => ({
    label: name.length > 16 ? name.slice(0, 15) + '…' : name,
    value: Math.round(v.ttc),
    color: PALETTE[i % 10],
  }));

  return {
    title: 'Ventes',
    kpis: [
      { label: 'Factures', value: String(list.length), color: '#3B82F6' },
      { label: 'Clients', value: String(clientMap.size), color: '#8B5CF6' },
      { label: 'Articles distincts', value: String(articleMap.size), color: '#F59E0B' },
      { label: 'CA TTC (FCFA)', value: fmtNum(Math.round(totalTTC)), color: '#22C55E' },
    ],
    columns: ['Client', 'Nb factures', 'Montant TTC (FCFA)', 'Part (%)'],
    rows: clientsSorted.map(([client, data]) => [
      client,
      String(data.invoices.length),
      fmtNum(Math.round(data.ttc)),
      `${Math.round((data.ttc / totalTTC) * 100)}%`,
    ]),
    groups,
    chart:
      chartItems.length > 0
        ? {
            type: 'bar',
            title: 'Top 10 articles — CA TTC (FCFA)',
            items: chartItems,
          }
        : undefined,
  };
}

// ── Résumé des ventes (journalier / hebdo / mensuel) ─────────────────────────

async function genCrmSalesResume(f: ReportFilters): Promise<ReportResult> {
  const { start, end } = getPeriodRange(f);
  const invoices = await invoicesApi.getAll();
  const list = filterInvoices(invoices, f);

  // Granularité selon amplitude
  const days = (end.getTime() - start.getTime()) / 86_400_000;
  const gran: 'day' | 'week' | 'month' = days <= 14 ? 'day' : days <= 60 ? 'week' : 'month';

  const buckets = new Map<string, { nb: number; ttc: number }>();
  for (const inv of list) {
    const d = new Date(inv.date);
    let key: string;
    if (gran === 'day') key = inv.date.slice(0, 10);
    else if (gran === 'month') key = inv.date.slice(0, 7);
    else {
      // ISO week
      const thu = new Date(d);
      thu.setDate(d.getDate() - ((d.getDay() + 6) % 7) + 3);
      const yr = thu.getFullYear();
      const jan4 = new Date(yr, 0, 4);
      const wk = Math.ceil(((thu.getTime() - jan4.getTime()) / 86_400_000 + jan4.getDay() + 1) / 7);
      key = `${yr}-S${String(wk).padStart(2, '0')}`;
    }
    const ex = buckets.get(key) ?? { nb: 0, ttc: 0 };
    buckets.set(key, { nb: ex.nb + 1, ttc: ex.ttc + amountTTC(inv) });
  }

  const sorted = Array.from(buckets.entries()).sort(([a], [b]) => a.localeCompare(b));
  const totalTTC = sorted.reduce((s, [, v]) => s + v.ttc, 0);
  const totalFact = sorted.reduce((s, [, v]) => s + v.nb, 0);
  const maxTTC = Math.max(...sorted.map(([, v]) => v.ttc), 1);

  const granLabel = gran === 'day' ? 'Jour' : gran === 'week' ? 'Semaine' : 'Mois';

  const chartItems: ChartItem[] = sorted.map(([key, v]) => ({
    label: gran === 'month' ? key.slice(0, 7) : gran === 'week' ? key : key.slice(5),
    value: Math.round(v.ttc),
    color: v.ttc >= maxTTC * 0.8 ? '#22C55E' : v.ttc >= maxTTC * 0.4 ? '#3B82F6' : '#94A3B8',
  }));

  return {
    title: 'Résumé des ventes',
    kpis: [
      { label: 'Total factures', value: String(totalFact), color: '#3B82F6' },
      { label: 'CA TTC (FCFA)', value: fmtNum(Math.round(totalTTC)), color: '#22C55E' },
      {
        label: 'Moy./période',
        value: sorted.length ? fmtNum(Math.round(totalTTC / sorted.length)) : '—',
        color: '#8B5CF6',
      },
      { label: `Nb ${granLabel.toLowerCase()}s`, value: String(sorted.length), color: '#F59E0B' },
    ],
    columns: [granLabel, 'Nb factures', 'Montant TTC (FCFA)', 'Cumul TTC (FCFA)'],
    rows: (() => {
      let cumul = 0;
      return sorted.map(([key, v]) => {
        cumul += v.ttc;
        const label = gran === 'month' ? key : gran === 'week' ? key : key;
        return [label, String(v.nb), fmtNum(Math.round(v.ttc)), fmtNum(Math.round(cumul))];
      });
    })(),
    chart:
      chartItems.length > 0
        ? {
            type: 'bar',
            title: `CA TTC — suivi ${granLabel.toLowerCase()} (FCFA)`,
            items: chartItems,
          }
        : undefined,
  };
}

// ── Performance commerciale ───────────────────────────────────────────────────

async function genCrmPerformance(f: ReportFilters): Promise<ReportResult> {
  const [leads, quotes] = await Promise.all([crmApi.getLeads(), quotesApi.getAll()]);
  const fl = filterLeads(leads, f);
  const fq = filterQuotes(quotes, f);

  // Agrège par commercial assigné
  const agentMap = new Map<
    string,
    { leads: number; won: number; lost: number; revenue: number; quotes: number; quotesAccepted: number }
  >();

  for (const l of fl) {
    const agent = l.assigned_to ?? 'Non assigné';
    const existing = agentMap.get(agent) ?? { leads: 0, won: 0, lost: 0, revenue: 0, quotes: 0, quotesAccepted: 0 };
    existing.leads++;
    if (l.status === 'WON') {
      existing.won++;
      existing.revenue += l.potential_value ?? 0;
    }
    if (l.status === 'LOST') existing.lost++;
    agentMap.set(agent, existing);
  }

  for (const q of fq) {
    // Tentative de rattachement via clientName — approximatif
    const agent = 'Non assigné'; // les devis n'ont pas d'assigné dans le modèle actuel
    const existing = agentMap.get(agent) ?? { leads: 0, won: 0, lost: 0, revenue: 0, quotes: 0, quotesAccepted: 0 };
    existing.quotes++;
    if (q.status === 'ACCEPTED') existing.quotesAccepted++;
    agentMap.set(agent, existing);
  }

  const rows = Array.from(agentMap.entries()).sort((a, b) => b[1].revenue - a[1].revenue);
  const chartItems: ChartItem[] = rows.slice(0, 8).map(([name, v], i) => ({
    label: name.length > 15 ? name.slice(0, 13) + '…' : name,
    value: v.won,
    color: ['#3B82F6', '#22C55E', '#8B5CF6', '#F59E0B', '#F97316', '#06B6D4', '#EC4899', '#10B981'][i % 8],
  }));

  return {
    title: 'Performance commerciale',
    kpis: [
      { label: 'Total leads', value: String(fl.length), color: '#3B82F6' },
      { label: 'Total gagnés', value: String(fl.filter((l) => l.status === 'WON').length), color: '#22C55E' },
      {
        label: 'CA pipeline (FCFA)',
        value: fmtNum(fl.reduce((s, l) => s + (l.potential_value ?? 0), 0)),
        color: '#8B5CF6',
      },
    ],
    columns: ['Commercial', 'Leads', 'Gagnés', 'Perdus', 'Taux conv.', 'CA (FCFA)', 'Devis', 'Devis accept.'],
    rows: rows.map(([name, v]) => [
      name,
      String(v.leads),
      String(v.won),
      String(v.lost),
      v.leads > 0 ? `${Math.round((v.won / v.leads) * 100)}%` : '0%',
      fmtNum(v.revenue),
      String(v.quotes),
      String(v.quotesAccepted),
    ]),
    chart: chartItems.length > 0 ? { type: 'bar', title: 'Leads gagnés par commercial', items: chartItems } : undefined,
  };
}

// ── Dispatcher Module 4 ───────────────────────────────────────────────────────

export async function generateCrmReport(subId: string, f: ReportFilters): Promise<ReportResult> {
  switch (subId) {
    case 'synthese':
      return genCrmSynthese(f);
    case 'leads':
      return genCrmLeads(f);
    case 'quotes':
      return genCrmDevis(f);
    case 'ventes':
      return genCrmVentes(f);
    case 'sales_summary':
      return genCrmSalesResume(f);
    case 'performance':
      return genCrmPerformance(f);
    default:
      throw new Error(`Sous-rapport CRM inconnu : ${subId}`);
  }
}
