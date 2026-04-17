/**
 * TrackYu Mobile — Module 8 : Support
 * synthese · tickets · sla · par-agent · anomalies · par-categorie
 */
import ticketsApi, { Ticket, TicketStatus, TicketPriority } from '../../../../api/tickets';
import { ReportFilters, ReportResult, ChartItem, getPeriodRange, fmtDate, matchText } from '../types';

const STATUS_LABELS: Record<TicketStatus, string> = {
  OPEN: 'Ouvert',
  IN_PROGRESS: 'En cours',
  WAITING_CLIENT: 'Attente client',
  RESOLVED: 'Résolu',
  CLOSED: 'Fermé',
};

const STATUS_COLORS: Record<TicketStatus, string> = {
  OPEN: '#EF4444',
  IN_PROGRESS: '#3B82F6',
  WAITING_CLIENT: '#F59E0B',
  RESOLVED: '#22C55E',
  CLOSED: '#6B7280',
};

const PRIORITY_LABELS: Record<TicketPriority, string> = {
  LOW: 'Faible',
  MEDIUM: 'Moyen',
  HIGH: 'Élevé',
  CRITICAL: 'Critique',
};

const PRIORITY_COLORS: Record<TicketPriority, string> = {
  LOW: '#6B7280',
  MEDIUM: '#3B82F6',
  HIGH: '#F97316',
  CRITICAL: '#EF4444',
};

// SLA targets (heures) par priorité — configurable
const SLA_TARGETS_H: Record<TicketPriority, number> = {
  LOW: 72,
  MEDIUM: 24,
  HIGH: 8,
  CRITICAL: 2,
};

async function fetchAll(f: ReportFilters): Promise<Ticket[]> {
  const page = await ticketsApi.getAll({ limit: 2000 });
  const { start, end } = getPeriodRange(f);
  return page.data.filter((t) => {
    const d = new Date(t.created_at);
    if (d < start || d > end) return false;
    if (!matchText(t.client_name ?? undefined, f.client)) return false;
    return true;
  });
}

function resolutionHours(t: Ticket): number | null {
  if (!['RESOLVED', 'CLOSED'].includes(t.status)) return null;
  const created = new Date(t.created_at).getTime();
  const updated = new Date(t.updated_at).getTime();
  return (updated - created) / 3600000;
}

// ── Synthèse ──────────────────────────────────────────────────────────────────

async function genSupportSynthese(f: ReportFilters): Promise<ReportResult> {
  const list = await fetchAll(f);

  const open = list.filter((t) => t.status === 'OPEN').length;
  const resolved = list.filter((t) => ['RESOLVED', 'CLOSED'].includes(t.status)).length;
  const critical = list.filter((t) => t.priority === 'CRITICAL').length;
  const waitingClient = list.filter((t) => t.status === 'WAITING_CLIENT').length;

  const hours = list.map(resolutionHours).filter((h): h is number => h !== null);
  const avgResolutionH = hours.length > 0 ? Math.round(hours.reduce((s, h) => s + h, 0) / hours.length) : 0;

  const statusChart: ChartItem[] = Object.entries(STATUS_LABELS)
    .map(([key, label]) => ({
      label,
      value: list.filter((t) => t.status === key).length,
      color: STATUS_COLORS[key as TicketStatus] ?? '#6B7280',
    }))
    .filter((i) => i.value > 0);

  return {
    title: 'Synthèse Support',
    kpis: [
      { label: 'Total tickets', value: String(list.length), color: '#3B82F6' },
      { label: 'Ouverts', value: String(open), color: '#EF4444' },
      { label: 'Résolus', value: String(resolved), color: '#22C55E' },
      { label: 'Critiques', value: String(critical), color: '#DC2626' },
      { label: 'Attente client', value: String(waitingClient), color: '#F59E0B' },
      { label: 'Temps résolution moy.', value: avgResolutionH > 0 ? `${avgResolutionH}h` : '—', color: '#8B5CF6' },
    ],
    columns: ['Statut', 'Nb tickets', 'Critiques', 'Élevés'],
    rows: Object.entries(STATUS_LABELS)
      .map(([key, label]) => {
        const sub = list.filter((t) => t.status === key);
        return [
          label,
          String(sub.length),
          String(sub.filter((t) => t.priority === 'CRITICAL').length),
          String(sub.filter((t) => t.priority === 'HIGH').length),
        ];
      })
      .filter((r) => r[1] !== '0'),
    chart: statusChart.length > 0 ? { type: 'pie', title: 'Tickets par statut', items: statusChart } : undefined,
  };
}

// ── Tous les tickets ───────────────────────────────────────────────────────────

async function genSupportTickets(f: ReportFilters): Promise<ReportResult> {
  const list = await fetchAll(f);

  const priorityChart: ChartItem[] = Object.entries(PRIORITY_LABELS)
    .map(([key, label]) => ({
      label,
      value: list.filter((t) => t.priority === key).length,
      color: PRIORITY_COLORS[key as TicketPriority] ?? '#6B7280',
    }))
    .filter((i) => i.value > 0);

  return {
    title: 'Tous les tickets',
    kpis: [
      { label: 'Total', value: String(list.length), color: '#3B82F6' },
      { label: 'Critiques', value: String(list.filter((t) => t.priority === 'CRITICAL').length), color: '#EF4444' },
      {
        label: 'Non résolus',
        value: String(list.filter((t) => !['RESOLVED', 'CLOSED'].includes(t.status)).length),
        color: '#F97316',
      },
    ],
    columns: ['Sujet', 'Client', 'Statut', 'Priorité', 'Catégorie', 'Assigné à', 'Créé le', 'Mis à jour'],
    rows: list.map((t) => [
      t.subject,
      t.client_name ?? '—',
      STATUS_LABELS[t.status] ?? t.status,
      PRIORITY_LABELS[t.priority] ?? t.priority,
      t.category ?? '—',
      t.assigned_user_name ?? t.assigned_to ?? '—',
      fmtDate(t.created_at),
      fmtDate(t.updated_at),
    ]),
    chart: priorityChart.length > 0 ? { type: 'bar', title: 'Tickets par priorité', items: priorityChart } : undefined,
  };
}

// ── SLA ───────────────────────────────────────────────────────────────────────

async function genSupportSLA(f: ReportFilters): Promise<ReportResult> {
  const list = await fetchAll(f);
  const resolved = list.filter((t) => ['RESOLVED', 'CLOSED'].includes(t.status));

  // Compteurs sur la liste complète (pas sur les rows affichées)
  let slaOk = 0;
  let slaKo = 0;
  for (const t of resolved) {
    const hours = resolutionHours(t) ?? 0;
    if (hours <= SLA_TARGETS_H[t.priority]) slaOk++;
    else slaKo++;
  }
  const slaRate = resolved.length > 0 ? Math.round((slaOk / resolved.length) * 100) : 0;

  const rows = resolved.map((t) => {
    const hours = resolutionHours(t) ?? 0;
    const target = SLA_TARGETS_H[t.priority] ?? 24;
    const ok = hours <= target;
    return [
      t.subject,
      t.client_name ?? '—',
      PRIORITY_LABELS[t.priority] ?? t.priority,
      `${Math.round(hours)}h`,
      `${target}h`,
      ok ? 'Respecté' : 'Dépassé',
      fmtDate(t.created_at),
    ];
  });

  const byPriorityChart: ChartItem[] = Object.entries(PRIORITY_LABELS)
    .map(([key, label]) => {
      const sub = resolved.filter((t) => t.priority === key);
      const okCount = sub.filter((t) => {
        const h = resolutionHours(t) ?? 0;
        return h <= SLA_TARGETS_H[t.priority as TicketPriority];
      }).length;
      return {
        label,
        value: sub.length > 0 ? Math.round((okCount / sub.length) * 100) : 0,
        color: PRIORITY_COLORS[key as TicketPriority] ?? '#6B7280',
      };
    })
    .filter((i) => i.value > 0);

  return {
    title: 'Rapport SLA',
    kpis: [
      { label: 'Tickets résolus', value: String(resolved.length), color: '#22C55E' },
      { label: 'SLA respecté', value: String(slaOk), color: '#22C55E' },
      { label: 'SLA dépassé', value: String(slaKo), color: '#EF4444' },
      { label: 'Taux SLA', value: `${slaRate}%`, color: slaRate >= 80 ? '#22C55E' : '#EF4444' },
    ],
    columns: ['Sujet', 'Client', 'Priorité', 'Temps résolution', 'Cible SLA', 'Statut SLA', 'Date création'],
    rows,
    chart:
      byPriorityChart.length > 0
        ? { type: 'bar', title: 'Taux SLA par priorité (%)', items: byPriorityChart }
        : undefined,
    note: `Cibles SLA : Critique=${SLA_TARGETS_H.CRITICAL}h, Élevé=${SLA_TARGETS_H.HIGH}h, Moyen=${SLA_TARGETS_H.MEDIUM}h, Faible=${SLA_TARGETS_H.LOW}h`,
  };
}

// ── Par agent ─────────────────────────────────────────────────────────────────

async function genSupportParAgent(f: ReportFilters): Promise<ReportResult> {
  const list = await fetchAll(f);

  const agentMap = new Map<
    string,
    { open: number; resolved: number; critical: number; avgH: number; countH: number; total: number }
  >();

  for (const t of list) {
    const agent = t.assigned_user_name ?? t.assigned_to ?? 'Non assigné';
    const ex = agentMap.get(agent) ?? { open: 0, resolved: 0, critical: 0, avgH: 0, countH: 0, total: 0 };
    ex.total++;
    if (['OPEN', 'IN_PROGRESS', 'WAITING_CLIENT'].includes(t.status)) ex.open++;
    if (['RESOLVED', 'CLOSED'].includes(t.status)) {
      ex.resolved++;
      const h = resolutionHours(t);
      if (h != null) {
        ex.avgH += h;
        ex.countH++;
      }
    }
    if (t.priority === 'CRITICAL') ex.critical++;
    agentMap.set(agent, ex);
  }

  const rows = Array.from(agentMap.entries()).sort((a, b) => b[1].total - a[1].total);
  const chartItems: ChartItem[] = rows.slice(0, 8).map(([name, v], i) => ({
    label: name.length > 15 ? name.slice(0, 13) + '…' : name,
    value: v.resolved,
    color: ['#22C55E', '#3B82F6', '#8B5CF6', '#F59E0B', '#F97316', '#06B6D4', '#EC4899', '#10B981'][i % 8],
  }));

  return {
    title: 'Tickets par agent',
    kpis: [
      { label: 'Agents actifs', value: String(agentMap.size), color: '#3B82F6' },
      { label: 'Total tickets', value: String(list.length), color: '#8B5CF6' },
    ],
    columns: ['Agent', 'Total', 'Ouverts', 'Résolus', 'Critiques', 'Taux résolution', 'Temps moy. résolution'],
    rows: rows.map(([agent, v]) => [
      agent,
      String(v.total),
      String(v.open),
      String(v.resolved),
      String(v.critical),
      v.total > 0 ? `${Math.round((v.resolved / v.total) * 100)}%` : '0%',
      v.countH > 0 ? `${Math.round(v.avgH / v.countH)}h` : '—',
    ]),
    chart: chartItems.length > 0 ? { type: 'bar', title: 'Tickets résolus par agent', items: chartItems } : undefined,
  };
}

// ── Tickets en anomalie ────────────────────────────────────────────────────────

async function genSupportAnomalies(f: ReportFilters): Promise<ReportResult> {
  const list = await fetchAll(f);
  const now = new Date();

  const anomalies = list.filter((t) => {
    if (['RESOLVED', 'CLOSED'].includes(t.status)) return false;

    const createdAt = new Date(t.created_at).getTime();
    const ageH = (now.getTime() - createdAt) / 3600000;
    const target = SLA_TARGETS_H[t.priority];

    // SLA dépassé ou critique non assigné ou ouvert depuis trop longtemps
    if (ageH > target) return true;
    if (t.priority === 'CRITICAL' && !t.assigned_to) return true;
    if (t.status === 'OPEN' && ageH > 48) return true;
    return false;
  });

  const slaSlaDepasseCount = anomalies.filter((t) => {
    const ageH = (now.getTime() - new Date(t.created_at).getTime()) / 3600000;
    return ageH > SLA_TARGETS_H[t.priority];
  }).length;
  const critiqueNonAssigneCount = list.filter(
    (t) => t.priority === 'CRITICAL' && !t.assigned_to && !['RESOLVED', 'CLOSED'].includes(t.status)
  ).length;
  const ouvertTropLongtempsCount = anomalies.length - slaSlaDepasseCount - critiqueNonAssigneCount;

  const chartItems: ChartItem[] = [
    { label: 'SLA dépassé', value: slaSlaDepasseCount, color: '#EF4444' },
    { label: 'Critique non assigné', value: critiqueNonAssigneCount, color: '#DC2626' },
    { label: 'Ouvert trop longtemps', value: Math.max(0, ouvertTropLongtempsCount), color: '#F97316' },
  ].filter((i) => i.value > 0);

  return {
    title: 'Tickets en anomalie',
    kpis: [
      { label: 'Tickets en anomalie', value: String(anomalies.length), color: '#EF4444' },
      { label: 'SLA dépassés', value: String(slaSlaDepasseCount), color: '#DC2626' },
      { label: 'Critiques non assignés', value: String(critiqueNonAssigneCount), color: '#F97316' },
      {
        label: 'Ouverts > 48h',
        value: String(
          list.filter((t) => t.status === 'OPEN' && (now.getTime() - new Date(t.created_at).getTime()) / 3600000 > 48)
            .length
        ),
        color: '#F59E0B',
      },
    ],
    columns: ['Sujet', 'Client', 'Priorité', 'Statut', 'Assigné', 'Âge (h)', 'Cible SLA', 'Raison'],
    rows: anomalies
      .sort((a, b) => {
        const ORDER: Record<TicketPriority, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
        return ORDER[a.priority] - ORDER[b.priority];
      })
      .map((t) => {
        const ageH = Math.round((now.getTime() - new Date(t.created_at).getTime()) / 3600000);
        const target = SLA_TARGETS_H[t.priority];
        const reason =
          ageH > target
            ? `SLA dépassé (${ageH}h > ${target}h)`
            : t.priority === 'CRITICAL' && !t.assigned_to
              ? 'Critique non assigné'
              : 'Ouvert trop longtemps';
        return [
          t.subject,
          t.client_name ?? '—',
          PRIORITY_LABELS[t.priority] ?? t.priority,
          STATUS_LABELS[t.status] ?? t.status,
          t.assigned_user_name ?? t.assigned_to ?? 'Non assigné',
          String(ageH),
          `${target}h`,
          reason,
        ];
      }),
    chart: chartItems.length > 0 ? { type: 'bar', title: 'Anomalies par type', items: chartItems } : undefined,
  };
}

// ── Par catégorie ─────────────────────────────────────────────────────────────

async function genSupportParCategorie(f: ReportFilters): Promise<ReportResult> {
  const list = await fetchAll(f);

  const catMap = new Map<string, { count: number; resolved: number; critical: number }>();
  for (const t of list) {
    const cat = t.category ?? 'Non catégorisé';
    const ex = catMap.get(cat) ?? { count: 0, resolved: 0, critical: 0 };
    ex.count++;
    if (['RESOLVED', 'CLOSED'].includes(t.status)) ex.resolved++;
    if (t.priority === 'CRITICAL') ex.critical++;
    catMap.set(cat, ex);
  }

  const sorted = Array.from(catMap.entries()).sort((a, b) => b[1].count - a[1].count);
  const chartItems: ChartItem[] = sorted.slice(0, 8).map(([cat, v], i) => ({
    label: cat.length > 18 ? cat.slice(0, 16) + '…' : cat,
    value: v.count,
    color: ['#3B82F6', '#22C55E', '#8B5CF6', '#F59E0B', '#F97316', '#06B6D4', '#EC4899', '#10B981'][i % 8],
  }));

  return {
    title: 'Tickets par catégorie',
    kpis: [
      { label: 'Catégories distinctes', value: String(catMap.size), color: '#3B82F6' },
      { label: 'Total tickets', value: String(list.length), color: '#8B5CF6' },
    ],
    columns: ['Catégorie', 'Total', 'Résolus', 'Critiques', 'Taux résolution'],
    rows: sorted.map(([cat, v]) => [
      cat,
      String(v.count),
      String(v.resolved),
      String(v.critical),
      v.count > 0 ? `${Math.round((v.resolved / v.count) * 100)}%` : '0%',
    ]),
    chart: chartItems.length > 0 ? { type: 'bar', title: 'Tickets par catégorie', items: chartItems } : undefined,
  };
}

// ── Ouverts & En cours ───────────────────────────────────────────────────────

async function genSupportOpen(f: ReportFilters): Promise<ReportResult> {
  const list = (await fetchAll(f)).filter(
    (t) => t.status === 'OPEN' || t.status === 'IN_PROGRESS' || t.status === 'WAITING_CLIENT'
  );

  const priorityChart: ChartItem[] = Object.entries(PRIORITY_LABELS)
    .map(([key, label]) => ({
      label,
      value: list.filter((t) => t.priority === key).length,
      color: PRIORITY_COLORS[key as TicketPriority] ?? '#6B7280',
    }))
    .filter((i) => i.value > 0);

  return {
    title: 'Tickets ouverts & en cours',
    kpis: [
      { label: 'Total actifs', value: String(list.length), color: '#EF4444' },
      { label: 'Ouverts', value: String(list.filter((t) => t.status === 'OPEN').length), color: '#EF4444' },
      { label: 'En cours', value: String(list.filter((t) => t.status === 'IN_PROGRESS').length), color: '#3B82F6' },
      {
        label: 'Attente client',
        value: String(list.filter((t) => t.status === 'WAITING_CLIENT').length),
        color: '#F59E0B',
      },
      { label: 'Critiques', value: String(list.filter((t) => t.priority === 'CRITICAL').length), color: '#DC2626' },
    ],
    columns: ['Sujet', 'Client', 'Statut', 'Priorité', 'Assigné à', 'Créé le'],
    rows: list
      .sort((a, b) => {
        const ORDER: Record<TicketPriority, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
        return ORDER[a.priority] - ORDER[b.priority];
      })
      .map((t) => [
        t.subject,
        t.client_name ?? '—',
        STATUS_LABELS[t.status] ?? t.status,
        PRIORITY_LABELS[t.priority] ?? t.priority,
        t.assigned_user_name ?? t.assigned_to ?? '—',
        fmtDate(t.created_at),
      ]),
    chart:
      priorityChart.length > 0
        ? { type: 'bar', title: 'Tickets actifs par priorité', items: priorityChart }
        : undefined,
  };
}

// ── Résolus & Fermés ──────────────────────────────────────────────────────────

async function genSupportResolved(f: ReportFilters): Promise<ReportResult> {
  const list = (await fetchAll(f)).filter((t) => t.status === 'RESOLVED' || t.status === 'CLOSED');

  const hours = list.map(resolutionHours).filter((h): h is number => h !== null);
  const avgH = hours.length > 0 ? Math.round(hours.reduce((s, h) => s + h, 0) / hours.length) : 0;

  // Résolutions par semaine
  const weekMap = new Map<string, number>();
  for (const t of list) {
    const d = new Date(t.updated_at);
    const year = d.getFullYear();
    const week = Math.ceil(((d.getTime() - new Date(year, 0, 1).getTime()) / 86400000 + 1) / 7);
    const key = `S${String(week).padStart(2, '0')}/${String(year).slice(2)}`;
    weekMap.set(key, (weekMap.get(key) ?? 0) + 1);
  }
  const chartItems: ChartItem[] = Array.from(weekMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([label, value]) => ({ label, value, color: '#22C55E' }));

  return {
    title: 'Tickets résolus & fermés',
    kpis: [
      { label: 'Total résolus', value: String(list.length), color: '#22C55E' },
      { label: 'Résolus', value: String(list.filter((t) => t.status === 'RESOLVED').length), color: '#22C55E' },
      { label: 'Fermés', value: String(list.filter((t) => t.status === 'CLOSED').length), color: '#6B7280' },
      { label: 'Temps résolution moy.', value: avgH > 0 ? `${avgH}h` : '—', color: '#8B5CF6' },
    ],
    columns: ['Sujet', 'Client', 'Statut', 'Priorité', 'Assigné à', 'Créé le', 'Mis à jour', 'Durée'],
    rows: list.map((t) => {
      const h = resolutionHours(t);
      return [
        t.subject,
        t.client_name ?? '—',
        STATUS_LABELS[t.status] ?? t.status,
        PRIORITY_LABELS[t.priority] ?? t.priority,
        t.assigned_user_name ?? t.assigned_to ?? '—',
        fmtDate(t.created_at),
        fmtDate(t.updated_at),
        h !== null ? `${Math.round(h)}h` : '—',
      ];
    }),
    chart: chartItems.length > 0 ? { type: 'bar', title: 'Résolutions par semaine', items: chartItems } : undefined,
  };
}

// ── Par priorité ──────────────────────────────────────────────────────────────

async function genSupportByPriority(f: ReportFilters): Promise<ReportResult> {
  const list = await fetchAll(f);

  const priorityChart = Object.entries(PRIORITY_LABELS)
    .map(([key, label]) => ({
      label,
      value: list.filter((t) => t.priority === key).length,
      color: PRIORITY_COLORS[key as TicketPriority] ?? '#6B7280',
    }))
    .filter((i) => i.value > 0);

  return {
    title: 'Tickets par priorité',
    kpis: Object.entries(PRIORITY_LABELS).map(([key, label]) => ({
      label,
      value: String(list.filter((t) => t.priority === key).length),
      color: PRIORITY_COLORS[key as TicketPriority] ?? '#6B7280',
    })),
    columns: ['Priorité', 'Total', 'Ouverts', 'En cours', 'Résolus', 'SLA cible'],
    rows: Object.entries(PRIORITY_LABELS)
      .map(([key, label]) => {
        const sub = list.filter((t) => t.priority === key);
        return [
          label,
          String(sub.length),
          String(sub.filter((t) => t.status === 'OPEN').length),
          String(sub.filter((t) => t.status === 'IN_PROGRESS').length),
          String(sub.filter((t) => ['RESOLVED', 'CLOSED'].includes(t.status)).length),
          `${SLA_TARGETS_H[key as TicketPriority] ?? '—'}h`,
        ];
      })
      .filter((r) => r[1] !== '0'),
    chart: priorityChart.length > 0 ? { type: 'bar', title: 'Tickets par priorité', items: priorityChart } : undefined,
  };
}

// ── Dispatcher Module 8 ───────────────────────────────────────────────────────

export async function generateSupportReport(subId: string, f: ReportFilters): Promise<ReportResult> {
  switch (subId) {
    case 'synthese':
      return genSupportSynthese(f);
    case 'all':
      return genSupportTickets(f);
    case 'open':
      return genSupportOpen(f);
    case 'resolved':
      return genSupportResolved(f);
    case 'by_priority':
      return genSupportByPriority(f);
    case 'by_agent':
      return genSupportParAgent(f);
    case 'sla':
      return genSupportSLA(f);
    case 'anomalies':
      return genSupportAnomalies(f);
    default:
      throw new Error(`Sous-rapport Support inconnu : ${subId}`);
  }
}
