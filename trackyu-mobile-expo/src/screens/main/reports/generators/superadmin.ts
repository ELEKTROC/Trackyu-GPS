/**
 * TrackYu Mobile — Module 10 : Superadmin
 * synthese · par-revendeur · mrr-arr · activite-gps · balises
 */
import { usersApi } from '../../../../api/users';
import { invoicesApi, paymentsApi, contractsApi } from '../../../../api/financeApi';
import ticketsApi from '../../../../api/tickets';
import { Vehicle } from '../../../../api/vehicles';
import { ReportFilters, ReportResult, ChartItem, getPeriodRange, fmtDate, fmtNum, matchText } from '../types';

// ── Synthèse globale ──────────────────────────────────────────────────────────

async function genSuperadminSynthese(vehicles: Vehicle[], f: ReportFilters): Promise<ReportResult> {
  const [users, contracts, invoices, payments, tickets] = await Promise.all([
    usersApi.getAll(),
    contractsApi.getAll(),
    invoicesApi.getAll(),
    paymentsApi.getAll(),
    ticketsApi.getAll({ limit: 2000 }),
  ]);

  const { start, end } = getPeriodRange(f);

  const activeContracts = contracts.filter((c) => c.status === 'ACTIVE');
  const mrr = activeContracts.reduce((s, c) => s + c.monthlyFee, 0);
  const arr = mrr * 12;

  const periodInvoices = invoices.filter((i) => {
    const d = new Date(i.date);
    return d >= start && d <= end && i.status !== 'DRAFT';
  });
  const periodPayments = payments.filter((p) => {
    const d = new Date(p.date);
    return d >= start && d <= end;
  });

  const totalClients = users.filter((u) => u.role === 'CLIENT').length;
  const onlineVehicles = vehicles.filter((v) => v.status?.toLowerCase() !== 'offline').length;

  // Revendeurs uniques
  const resellers = new Set(contracts.map((c) => c.resellerName).filter(Boolean)).size;

  const kpiChart: ChartItem[] = [
    { label: 'En ligne', value: onlineVehicles, color: '#22C55E' },
    { label: 'Hors ligne', value: vehicles.length - onlineVehicles, color: '#EF4444' },
  ].filter((i) => i.value > 0);

  return {
    title: 'Tableau de bord global',
    kpis: [
      { label: 'MRR (FCFA)', value: fmtNum(mrr), color: '#22C55E' },
      { label: 'ARR (FCFA)', value: fmtNum(arr), color: '#3B82F6' },
      { label: 'Contrats actifs', value: String(activeContracts.length), color: '#8B5CF6' },
      { label: 'Clients', value: String(totalClients), color: '#06B6D4' },
      { label: 'Engins tracés', value: String(vehicles.length), color: '#F59E0B' },
      { label: 'Revendeurs', value: String(resellers), color: '#F97316' },
      {
        label: 'CA période (FCFA)',
        value: fmtNum(periodInvoices.reduce((s, i) => s + (i.amountHT ?? i.amount), 0)),
        color: '#EC4899',
      },
      {
        label: 'Encaissé période (FCFA)',
        value: fmtNum(periodPayments.reduce((s, p) => s + p.amount, 0)),
        color: '#10B981',
      },
    ],
    columns: ['Indicateur', 'Valeur'],
    rows: [
      ['MRR', fmtNum(mrr) + ' FCFA'],
      ['ARR', fmtNum(arr) + ' FCFA'],
      ['Contrats actifs', String(activeContracts.length)],
      ['Contrats total', String(contracts.length)],
      ['Clients actifs', String(totalClients)],
      ['Total utilisateurs', String(users.length)],
      ['Engins tracés', String(vehicles.length)],
      ['Engins en ligne', String(onlineVehicles)],
      ['Revendeurs', String(resellers)],
      ['Tickets ouverts', String(tickets.data.filter((t) => !['RESOLVED', 'CLOSED'].includes(t.status)).length)],
      ['CA période HT', fmtNum(periodInvoices.reduce((s, i) => s + (i.amountHT ?? i.amount), 0)) + ' FCFA'],
      ['Encaissé période', fmtNum(periodPayments.reduce((s, p) => s + p.amount, 0)) + ' FCFA'],
    ],
    chart: kpiChart.length > 0 ? { type: 'pie', title: 'État des engins', items: kpiChart } : undefined,
  };
}

// ── Par revendeur ─────────────────────────────────────────────────────────────

async function genSuperadminParRevendeur(f: ReportFilters): Promise<ReportResult> {
  const [contracts] = await Promise.all([contractsApi.getAll()]);

  const resellerMap = new Map<
    string,
    {
      contracts: number;
      active: number;
      vehicles: number;
      mrr: number;
      clients: Set<string>;
      revenue: number;
    }
  >();

  for (const c of contracts) {
    const name = c.resellerName ?? 'Direct';
    if (!matchText(name, f.revendeur)) continue;
    const ex = resellerMap.get(name) ?? {
      contracts: 0,
      active: 0,
      vehicles: 0,
      mrr: 0,
      clients: new Set(),
      revenue: 0,
    };
    ex.contracts++;
    if (c.status === 'ACTIVE') {
      ex.active++;
      ex.mrr += c.monthlyFee;
    }
    ex.vehicles += c.vehicleCount;
    ex.clients.add(c.clientId);
    resellerMap.set(name, ex);
  }

  // Enrichit avec le CA des factures (si resellerName disponible sur les factures — approximatif)
  const sorted = Array.from(resellerMap.entries()).sort((a, b) => b[1].mrr - a[1].mrr);

  const chartItems: ChartItem[] = sorted.slice(0, 8).map(([name, v], i) => ({
    label: name.length > 15 ? name.slice(0, 13) + '…' : name,
    value: v.mrr,
    color: ['#3B82F6', '#22C55E', '#8B5CF6', '#F59E0B', '#F97316', '#06B6D4', '#EC4899', '#10B981'][i % 8],
  }));

  return {
    title: 'Performance par revendeur',
    kpis: [
      { label: 'Revendeurs actifs', value: String(resellerMap.size), color: '#3B82F6' },
      {
        label: 'Contrats actifs',
        value: String(Array.from(resellerMap.values()).reduce((s, v) => s + v.active, 0)),
        color: '#22C55E',
      },
      {
        label: 'Engins total',
        value: String(Array.from(resellerMap.values()).reduce((s, v) => s + v.vehicles, 0)),
        color: '#8B5CF6',
      },
      {
        label: 'MRR total (FCFA)',
        value: fmtNum(Array.from(resellerMap.values()).reduce((s, v) => s + v.mrr, 0)),
        color: '#F59E0B',
      },
    ],
    columns: ['Revendeur', 'Contrats', 'Actifs', 'Clients', 'Engins', 'MRR (FCFA)', 'ARR (FCFA)'],
    rows: sorted.map(([name, v]) => [
      name,
      String(v.contracts),
      String(v.active),
      String(v.clients.size),
      String(v.vehicles),
      fmtNum(v.mrr),
      fmtNum(v.mrr * 12),
    ]),
    chart: chartItems.length > 0 ? { type: 'bar', title: 'MRR par revendeur', items: chartItems } : undefined,
  };
}

// ── MRR / ARR ─────────────────────────────────────────────────────────────────

async function genSuperadminMRR(_f: ReportFilters): Promise<ReportResult> {
  const contracts = await contractsApi.getAll();

  // Evolution MRR sur les 12 derniers mois en simulant l'état actif
  const now = new Date();
  const months: string[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  const mrrByMonth = months.map((m) => {
    // Contrats actifs ce mois-là
    const active = contracts.filter((c) => {
      const start = c.startDate.slice(0, 7) <= m;
      const end = c.endDate ? c.endDate.slice(0, 7) >= m : true;
      return start && end && c.status !== 'TERMINATED';
    });
    return { month: m, mrr: active.reduce((s, c) => s + c.monthlyFee, 0), count: active.length };
  });

  const chartItems: ChartItem[] = mrrByMonth.map((b) => ({
    label: new Date(b.month + '-01').toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
    value: b.mrr,
    color: '#22C55E',
  }));

  const currentMRR = mrrByMonth[mrrByMonth.length - 1]?.mrr ?? 0;
  const prevMRR = mrrByMonth[mrrByMonth.length - 2]?.mrr ?? 0;
  const growth = prevMRR > 0 ? Math.round(((currentMRR - prevMRR) / prevMRR) * 100) : 0;

  // Par cycle de facturation
  const cycleMap = new Map<string, { count: number; mrr: number }>();
  for (const c of contracts.filter((c) => c.status === 'ACTIVE')) {
    const cycle = c.billingCycle;
    const ex = cycleMap.get(cycle) ?? { count: 0, mrr: 0 };
    ex.count++;
    ex.mrr += c.monthlyFee;
    cycleMap.set(cycle, ex);
  }

  return {
    title: 'MRR / ARR',
    kpis: [
      { label: 'MRR actuel (FCFA)', value: fmtNum(currentMRR), color: '#22C55E' },
      { label: 'ARR (FCFA)', value: fmtNum(currentMRR * 12), color: '#3B82F6' },
      {
        label: 'Croissance M/M',
        value: `${growth > 0 ? '+' : ''}${growth}%`,
        color: growth >= 0 ? '#22C55E' : '#EF4444',
      },
      {
        label: 'Contrats actifs',
        value: String(contracts.filter((c) => c.status === 'ACTIVE').length),
        color: '#8B5CF6',
      },
    ],
    columns: ['Mois', 'Contrats actifs', 'MRR (FCFA)', 'ARR (FCFA)', 'Variation'],
    rows: mrrByMonth.map((b, idx) => {
      const prev = idx > 0 ? mrrByMonth[idx - 1].mrr : b.mrr;
      const diff = b.mrr - prev;
      const pct = prev > 0 ? `${diff >= 0 ? '+' : ''}${Math.round((diff / prev) * 100)}%` : '—';
      const label = new Date(b.month + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
      return [label, String(b.count), fmtNum(b.mrr), fmtNum(b.mrr * 12), idx > 0 ? pct : '—'];
    }),
    chart: chartItems.length > 0 ? { type: 'bar', title: 'Évolution MRR (12 mois)', items: chartItems } : undefined,
  };
}

// ── Activité GPS ──────────────────────────────────────────────────────────────

async function genSuperadminActiviteGPS(vehicles: Vehicle[], _f: ReportFilters): Promise<ReportResult> {
  const now = new Date();

  const online = vehicles.filter((v) => v.status?.toLowerCase() !== 'offline');
  const offline = vehicles.filter((v) => v.status?.toLowerCase() === 'offline');
  const moving = vehicles.filter((v) => v.status?.toLowerCase() === 'moving');
  const idle = vehicles.filter((v) => v.status?.toLowerCase() === 'idle');
  const stopped = vehicles.filter((v) => v.status?.toLowerCase() === 'stopped');

  // Signal récent (< 5 min)
  const recentSignal = vehicles.filter((v) => {
    if (!v.lastUpdate) return false;
    const min = (now.getTime() - new Date(v.lastUpdate).getTime()) / 60000;
    return min < 5;
  });

  const statusChart: ChartItem[] = [
    { label: 'En route', value: moving.length, color: '#22C55E' },
    { label: 'Ralenti', value: idle.length, color: '#F59E0B' },
    { label: 'Arrêté', value: stopped.length, color: '#EF4444' },
    { label: 'Hors ligne', value: offline.length, color: '#6B7280' },
  ].filter((i) => i.value > 0);

  // Taux de signal par statut contrat — approximation via véhicules
  return {
    title: 'Activité GPS',
    kpis: [
      { label: 'Engins total', value: String(vehicles.length), color: '#3B82F6' },
      { label: 'En ligne', value: String(online.length), color: '#22C55E' },
      { label: 'Hors ligne', value: String(offline.length), color: '#EF4444' },
      { label: 'Signal récent (<5min)', value: String(recentSignal.length), color: '#06B6D4' },
      { label: 'En route', value: String(moving.length), color: '#8B5CF6' },
      {
        label: 'Taux connexion',
        value: `${vehicles.length > 0 ? Math.round((online.length / vehicles.length) * 100) : 0}%`,
        color: '#F59E0B',
      },
    ],
    columns: ['Engin', 'Plaque', 'Statut', 'Dernier signal', 'Vitesse (km/h)', 'Carburant %', 'Localisation'],
    rows: vehicles
      .sort((a, b) => {
        const order: Record<string, number> = { offline: 0, stopped: 1, idle: 2, moving: 3 };
        return (order[a.status?.toLowerCase() ?? ''] ?? 1) - (order[b.status?.toLowerCase() ?? ''] ?? 1);
      })
      .map((v) => {
        const lastUpdate = v.lastUpdate ? new Date(v.lastUpdate) : null;
        const minutesSince = lastUpdate ? Math.floor((now.getTime() - lastUpdate.getTime()) / 60000) : null;
        const signal =
          minutesSince != null ? (minutesSince < 60 ? `${minutesSince}min` : `${Math.floor(minutesSince / 60)}h`) : '—';
        return [
          v.name,
          v.plate ?? '—',
          v.status ?? '—',
          signal,
          v.speed != null ? String(Math.round(v.speed)) : '—',
          v.fuel != null ? `${v.fuel}%` : '—',
          v.latitude && v.longitude
            ? `https://maps.google.com/?q=${v.latitude.toFixed(6)},${v.longitude.toFixed(6)}`
            : '—',
        ];
      }),
    chart: statusChart.length > 0 ? { type: 'pie', title: 'Répartition des statuts', items: statusChart } : undefined,
  };
}

// ── Balises ────────────────────────────────────────────────────────────────────

async function genSuperadminBalises(vehicles: Vehicle[]): Promise<ReportResult> {
  const now = new Date();

  // Analyse des balises : signal, état, problèmes détectés
  const noSignal = vehicles.filter((v) => !v.lastUpdate);
  const stale24h = vehicles.filter((v) => {
    if (!v.lastUpdate) return true;
    const h = (now.getTime() - new Date(v.lastUpdate).getTime()) / 3600000;
    return h > 24;
  });
  const fuelSensorIssue = vehicles.filter((v) => v.fuel != null && (v.fuel > 100 || v.fuel < 0));

  const signalChart: ChartItem[] = [
    { label: 'Signal OK (<24h)', value: vehicles.length - stale24h.length, color: '#22C55E' },
    { label: 'Signal ancien (>24h)', value: stale24h.filter((v) => !!v.lastUpdate).length, color: '#F97316' },
    { label: 'Jamais vu', value: noSignal.length, color: '#EF4444' },
  ].filter((i) => i.value > 0);

  return {
    title: 'État des balises',
    kpis: [
      { label: 'Total balises', value: String(vehicles.length), color: '#3B82F6' },
      { label: 'Signal OK', value: String(vehicles.length - stale24h.length), color: '#22C55E' },
      { label: 'Sans signal >24h', value: String(stale24h.length), color: '#EF4444' },
      { label: 'Jamais vu', value: String(noSignal.length), color: '#DC2626' },
      { label: 'Anomalie sonde carburant', value: String(fuelSensorIssue.length), color: '#F97316' },
    ],
    columns: ['Engin', 'Plaque', 'Statut', 'Dernier signal', 'Ancienneté signal', 'Carburant %', 'Alerte'],
    rows: vehicles
      .sort((a, b) => {
        const aAge = a.lastUpdate ? new Date(a.lastUpdate).getTime() : 0;
        const bAge = b.lastUpdate ? new Date(b.lastUpdate).getTime() : 0;
        return aAge - bAge; // Les plus anciens en premier
      })
      .map((v) => {
        const lastUpdate = v.lastUpdate ? new Date(v.lastUpdate) : null;
        const hoursAgo = lastUpdate ? Math.floor((now.getTime() - lastUpdate.getTime()) / 3600000) : null;
        const age =
          hoursAgo != null
            ? hoursAgo < 1
              ? '<1h'
              : hoursAgo < 24
                ? `${hoursAgo}h`
                : `${Math.floor(hoursAgo / 24)}j`
            : 'Jamais';

        const alerts: string[] = [];
        if (!v.lastUpdate) alerts.push('Jamais vu');
        else if (hoursAgo != null && hoursAgo > 48) alerts.push('Hors ligne >48h');
        else if (hoursAgo != null && hoursAgo > 24) alerts.push('Sans signal >24h');
        if (v.fuel != null && v.fuel < 10) alerts.push('Carburant critique');
        if (v.fuel != null && (v.fuel > 100 || v.fuel < 0)) alerts.push('Anomalie sonde');

        return [
          v.name,
          v.plate ?? '—',
          v.status ?? '—',
          lastUpdate ? fmtDate(lastUpdate.toISOString()) : 'Jamais',
          age,
          v.fuel != null ? `${v.fuel}%` : '—',
          alerts.length > 0 ? alerts.join(', ') : 'OK',
        ];
      }),
    chart: signalChart.length > 0 ? { type: 'pie', title: 'État des signaux', items: signalChart } : undefined,
  };
}

// ── Dispatcher Module 10 ──────────────────────────────────────────────────────

export async function generateSuperadminReport(
  subId: string,
  vehicles: Vehicle[],
  f: ReportFilters
): Promise<ReportResult> {
  switch (subId) {
    case 'synthese':
      return genSuperadminSynthese(vehicles, f);
    case 'by_tenant':
      return genSuperadminParRevendeur(f);
    case 'mrr':
      return genSuperadminMRR(f);
    case 'gps_activity':
      return genSuperadminActiviteGPS(vehicles, f);
    case 'balises':
      return genSuperadminBalises(vehicles);
    default:
      throw new Error(`Sous-rapport Superadmin inconnu : ${subId}`);
  }
}
