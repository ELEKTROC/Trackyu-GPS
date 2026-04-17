/**
 * TrackYu Mobile — Module 7 : Technique
 * synthese · interventions · par-technicien · temps-intervention · par-nature · stock · monitoring
 * maintenance · capteurs · geofencing · eco-driving · poi · pneus · temperature · depenses
 */
import interventionsApi, {
  Intervention,
  InterventionStats,
  STATUS_LABELS,
  STATUS_COLORS,
  InterventionStatus,
} from '../../../../api/interventions';
import vehiclesApi, { Vehicle } from '../../../../api/vehicles';
import maintenanceApi from '../../../../api/maintenanceApi';
import { geofencesApi } from '../../../../api/geofencesApi';
import { ecoDrivingApi } from '../../../../api/ecoDrivingApi';
import tiresApi, { Tire } from '../../../../api/tiresApi';
import { expensesApi } from '../../../../api/expensesApi';
import apiClient from '../../../../api/client';
import { ReportFilters, ReportResult, ChartItem, getPeriodRange, fmtDate, fmtTime, fmtNum, matchText } from '../types';
import { mapWithConcurrency } from '../../../../utils/pLimit';

const PALETTE = [
  '#3B82F6',
  '#22C55E',
  '#8B5CF6',
  '#F59E0B',
  '#F97316',
  '#06B6D4',
  '#EC4899',
  '#10B981',
  '#EF4444',
  '#6B7280',
];

function filterInterventions(list: Intervention[], f: ReportFilters): Intervention[] {
  const { start, end } = getPeriodRange(f);
  return list.filter((i) => {
    const d = new Date(i.scheduledDate);
    if (d < start || d > end) return false;
    if (!matchText(i.clientName, f.client)) return false;
    return true;
  });
}

function durationLabel(minutes: number): string {
  if (!minutes || minutes <= 0) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h${m > 0 ? String(m).padStart(2, '0') : ''}` : `${m}min`;
}

// ── Synthèse ──────────────────────────────────────────────────────────────────

async function genTechniqueSynthese(f: ReportFilters): Promise<ReportResult> {
  const all = await interventionsApi.getAll();
  const list = filterInterventions(all, f);

  const completed = list.filter((i) => i.status === 'COMPLETED').length;
  const pending = list.filter((i) => ['PENDING', 'SCHEDULED'].includes(i.status)).length;
  const avgDuration =
    list.filter((i) => i.duration > 0).length > 0
      ? Math.round(
          list.filter((i) => i.duration > 0).reduce((s, i) => s + i.duration, 0) /
            list.filter((i) => i.duration > 0).length
        )
      : 0;
  const totalCost = list.reduce((s, i) => s + (i.cost ?? 0), 0);

  const statusChart: ChartItem[] = Object.entries(STATUS_LABELS)
    .map(([key, label]) => ({
      label,
      value: list.filter((i) => i.status === key).length,
      color: STATUS_COLORS[key as InterventionStatus] ?? '#6B7280',
    }))
    .filter((i) => i.value > 0);

  return {
    title: 'Synthèse Technique',
    kpis: [
      { label: 'Total interventions', value: String(list.length), color: '#3B82F6' },
      { label: 'Terminées', value: String(completed), color: '#22C55E' },
      { label: 'En attente / planifiées', value: String(pending), color: '#F59E0B' },
      { label: 'Durée moyenne', value: durationLabel(avgDuration), color: '#8B5CF6' },
      { label: 'Coût total (FCFA)', value: fmtNum(totalCost), color: '#F97316' },
      { label: 'Techniciens actifs', value: String(new Set(list.map((i) => i.technicianId)).size), color: '#06B6D4' },
    ],
    columns: ['Statut', 'Nb', 'Durée moy.', 'Coût total (FCFA)'],
    rows: Object.entries(STATUS_LABELS)
      .map(([key, label]) => {
        const sub = list.filter((i) => i.status === key);
        const avgD =
          sub.filter((i) => i.duration > 0).length > 0
            ? Math.round(
                sub.filter((i) => i.duration > 0).reduce((s, i) => s + i.duration, 0) /
                  sub.filter((i) => i.duration > 0).length
              )
            : 0;
        return [label, String(sub.length), durationLabel(avgD), fmtNum(sub.reduce((s, i) => s + (i.cost ?? 0), 0))];
      })
      .filter((r) => r[1] !== '0'),
    chart: statusChart.length > 0 ? { type: 'pie', title: 'Interventions par statut', items: statusChart } : undefined,
  };
}

// ── Toutes les interventions ───────────────────────────────────────────────────

async function genTechniqueInterventions(f: ReportFilters): Promise<ReportResult> {
  const list = filterInterventions(await interventionsApi.getAll(), f);

  // Top 8 clients par nb d'interventions
  const clientMap = new Map<string, number>();
  for (const i of list) {
    const c = i.clientName ?? 'Inconnu';
    clientMap.set(c, (clientMap.get(c) ?? 0) + 1);
  }
  const chartItems: ChartItem[] = Array.from(clientMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([label, value], i) => ({
      label: label.length > 18 ? label.slice(0, 16) + '…' : label,
      value,
      color: ['#3B82F6', '#22C55E', '#8B5CF6', '#F59E0B', '#F97316', '#06B6D4', '#EC4899', '#10B981'][i % 8],
    }));

  return {
    title: 'Toutes les interventions',
    kpis: [
      { label: 'Total', value: String(list.length), color: '#3B82F6' },
      { label: 'Terminées', value: String(list.filter((i) => i.status === 'COMPLETED').length), color: '#22C55E' },
      { label: 'En cours', value: String(list.filter((i) => i.status === 'IN_PROGRESS').length), color: '#F59E0B' },
      { label: 'Annulées', value: String(list.filter((i) => i.status === 'CANCELLED').length), color: '#EF4444' },
    ],
    columns: ['Date', 'Client', 'Technicien', 'Type', 'Nature', 'Statut', 'Engin', 'Plaque', 'Durée', 'Coût (FCFA)'],
    rows: list.map((i) => [
      fmtDate(i.scheduledDate),
      i.clientName ?? '—',
      i.technicianId,
      i.type,
      i.nature ?? '—',
      STATUS_LABELS[i.status] ?? i.status,
      i.vehicleName ?? '—',
      i.licensePlate ?? i.wwPlate ?? '—',
      durationLabel(i.duration),
      i.cost != null ? fmtNum(i.cost) : '—',
    ]),
    chart:
      chartItems.length > 0
        ? { type: 'bar', title: "Top clients par nb d'interventions", items: chartItems }
        : undefined,
  };
}

// ── Par technicien ────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  INSTALLATION: 'Installation',
  DEPANNAGE: 'Dépannage',
  REMPLACEMENT: 'Remplacement',
  RETRAIT: 'Retrait',
  REINSTALLATION: 'Réinstallation',
  TRANSFERT: 'Transfert',
};

async function genTechniqueParTechnicien(f: ReportFilters): Promise<ReportResult> {
  const [all, stats] = await Promise.all([interventionsApi.getAll(), interventionsApi.getStats()]);
  let list = filterInterventions(all, f);

  // Filtre par nom de technicien (recherche partielle insensible à la casse)
  if (f.technicianName?.trim()) {
    const q = f.technicianName.trim().toLowerCase();
    // On filtre d'abord sur le nom résolu depuis stats.byTechnician
    const matchingIds = new Set(
      (stats?.byTechnician ?? []).filter((t) => t.name.toLowerCase().includes(q)).map((t) => t.id)
    );
    list = list.filter((i) => matchingIds.has(i.technicianId) || i.technicianId?.toLowerCase().includes(q));
  }

  // Agrège par technicien — avec compteurs par type
  const techMap = new Map<
    string,
    {
      name: string;
      items: Intervention[];
      total: number;
      installations: number;
      depannages: number;
      completed: number;
      cancelled: number;
      duration: number;
      durationCount: number;
      cost: number;
      assignedClients: Set<string>;
    }
  >();

  for (const i of list) {
    const id = i.technicianId;
    const existing = techMap.get(id) ?? {
      name: id,
      items: [],
      total: 0,
      installations: 0,
      depannages: 0,
      completed: 0,
      cancelled: 0,
      duration: 0,
      durationCount: 0,
      cost: 0,
      assignedClients: new Set(),
    };
    existing.items.push(i);
    existing.total++;
    if (i.type === 'INSTALLATION') existing.installations++;
    else existing.depannages++;
    if (i.status === 'COMPLETED') existing.completed++;
    if (i.status === 'CANCELLED') existing.cancelled++;
    if (i.duration > 0) {
      existing.duration += i.duration;
      existing.durationCount++;
    }
    existing.cost += i.cost ?? 0;
    if (i.clientId) existing.assignedClients.add(i.clientId);
    techMap.set(id, existing);
  }

  // Enrichit avec les noms depuis les stats
  if (stats?.byTechnician) {
    for (const st of stats.byTechnician) {
      if (techMap.has(st.id)) techMap.get(st.id)!.name = st.name;
    }
  }

  const techRows = Array.from(techMap.values()).sort((a, b) => b.total - a.total);
  const chartItems: ChartItem[] = techRows.slice(0, 8).map((t, i) => ({
    label: t.name.length > 15 ? t.name.slice(0, 13) + '…' : t.name,
    value: t.total,
    color: ['#3B82F6', '#22C55E', '#8B5CF6', '#F59E0B', '#F97316', '#06B6D4', '#EC4899', '#10B981'][i % 8],
  }));

  // Structure groupée : 1 groupe par technicien, détails = liste de ses interventions
  const SUMMARY_COLS = [
    'Technicien',
    'Clients',
    'Total',
    'Installations',
    'Dépannages',
    'Terminées',
    'Taux',
    'Durée moy.',
    'Coût (FCFA)',
  ];
  const DETAIL_COLS = ['Date', 'Type', 'Nature', 'Client', 'Statut', 'Engin / Plaque', 'Durée'];

  const groups = techRows.map((t) => ({
    summary: [
      t.name,
      String(t.assignedClients.size),
      String(t.total),
      String(t.installations),
      String(t.depannages),
      String(t.completed),
      t.total > 0 ? `${Math.round((t.completed / t.total) * 100)}%` : '0%',
      t.durationCount > 0 ? durationLabel(Math.round(t.duration / t.durationCount)) : '—',
      fmtNum(t.cost),
    ],
    detailColumns: DETAIL_COLS,
    details: t.items
      .sort((a, b) => (b.scheduledDate ?? '').localeCompare(a.scheduledDate ?? ''))
      .map((i) => [
        fmtDate(i.scheduledDate),
        TYPE_LABELS[i.type] ?? i.type,
        i.nature ?? '—',
        i.clientName ?? '—',
        STATUS_LABELS[i.status] ?? i.status,
        [i.vehicleName, i.licensePlate ?? i.wwPlate].filter(Boolean).join(' · ') || '—',
        durationLabel(i.duration),
      ]),
  }));

  return {
    title: 'Interventions par technicien',
    kpis: [
      { label: 'Techniciens', value: String(techRows.length), color: '#3B82F6' },
      { label: 'Total interventions', value: String(list.length), color: '#8B5CF6' },
      { label: 'Installations', value: String(list.filter((i) => i.type === 'INSTALLATION').length), color: '#22C55E' },
      { label: 'Dépannages', value: String(list.filter((i) => i.type === 'DEPANNAGE').length), color: '#F97316' },
    ],
    columns: SUMMARY_COLS,
    rows: [], // on utilise groups — rows vide pour l'export CSV fallback
    groups,
    chart:
      chartItems.length > 0 ? { type: 'bar', title: 'Interventions par technicien', items: chartItems } : undefined,
  };
}

// ── Temps d'intervention ──────────────────────────────────────────────────────

async function genTechniqueTemps(f: ReportFilters): Promise<ReportResult> {
  const all = await interventionsApi.getAll();
  const list = filterInterventions(all, f).filter((i) => i.status === 'COMPLETED' && i.duration > 0);

  const totalMin = list.reduce((s, i) => s + i.duration, 0);
  const avgMin = list.length > 0 ? Math.round(totalMin / list.length) : 0;

  // Distribution
  const buckets = [
    { label: '<30 min', min: 0, max: 30 },
    { label: '30–60 min', min: 30, max: 60 },
    { label: '1–2h', min: 60, max: 120 },
    { label: '2–4h', min: 120, max: 240 },
    { label: '>4h', min: 240, max: Infinity },
  ];
  const chartItems: ChartItem[] = buckets
    .map((b, i) => ({
      label: b.label,
      value: list.filter((iv) => iv.duration >= b.min && iv.duration < b.max).length,
      color: ['#22C55E', '#3B82F6', '#F59E0B', '#F97316', '#EF4444'][i],
    }))
    .filter((c) => c.value > 0);

  return {
    title: "Temps d'intervention",
    kpis: [
      { label: 'Interventions terminées', value: String(list.length), color: '#22C55E' },
      { label: 'Temps total', value: durationLabel(totalMin), color: '#3B82F6' },
      { label: 'Durée moyenne', value: durationLabel(avgMin), color: '#8B5CF6' },
      { label: 'Durée max', value: durationLabel(Math.max(...list.map((i) => i.duration), 0)), color: '#F97316' },
    ],
    columns: ['Date', 'Client', 'Technicien', 'Nature', 'Engin', 'Début', 'Fin', 'Durée'],
    rows: list.map((i) => [
      fmtDate(i.scheduledDate),
      i.clientName ?? '—',
      i.technicianId,
      i.nature ?? '—',
      i.vehicleName ?? '—',
      i.startTime ? fmtDate(i.startTime) : '—',
      i.endTime ? fmtDate(i.endTime) : '—',
      durationLabel(i.duration),
    ]),
    chart: chartItems.length > 0 ? { type: 'bar', title: 'Distribution des durées', items: chartItems } : undefined,
  };
}

// ── Par type (primaire) / nature (secondaire) ─────────────────────────────────

async function genTechniqueParNature(f: ReportFilters): Promise<ReportResult> {
  let list = filterInterventions(await interventionsApi.getAll(), f);

  // Filtre par type si sélectionné
  if (f.interventionType) {
    list = list.filter((i) => i.type === f.interventionType);
  }

  // Couleurs par type (fixées pour les types connus, palette pour les autres)
  const TYPE_COLORS: Record<string, string> = {
    INSTALLATION: '#22C55E',
    DEPANNAGE: '#F97316',
    REMPLACEMENT: '#3B82F6',
    RETRAIT: '#EF4444',
    REINSTALLATION: '#8B5CF6',
    TRANSFERT: '#06B6D4',
  };

  // Agrège par type → nature
  const typeNatureMap = new Map<
    string,
    Map<string, { count: number; completed: number; duration: number; dCount: number }>
  >();

  for (const i of list) {
    const type = i.type ?? 'AUTRE';
    const nature = i.nature ?? '—';
    if (!typeNatureMap.has(type)) typeNatureMap.set(type, new Map());
    const natMap = typeNatureMap.get(type)!;
    const ex = natMap.get(nature) ?? { count: 0, completed: 0, duration: 0, dCount: 0 };
    ex.count++;
    if (i.status === 'COMPLETED') ex.completed++;
    if (i.duration > 0) {
      ex.duration += i.duration;
      ex.dCount++;
    }
    natMap.set(nature, ex);
  }

  // Types présents dans les données (ordre : connus d'abord, puis autres)
  const KNOWN_ORDER = ['INSTALLATION', 'DEPANNAGE', 'REMPLACEMENT', 'RETRAIT', 'REINSTALLATION', 'TRANSFERT'];
  const presentTypes = [
    ...KNOWN_ORDER.filter((t) => typeNatureMap.has(t)),
    ...Array.from(typeNatureMap.keys()).filter((t) => !KNOWN_ORDER.includes(t)),
  ];

  // KPIs globaux

  // Graphe : 1 barre par type présent
  const chartItems: ChartItem[] = presentTypes
    .map((type, idx) => ({
      label: TYPE_LABELS[type] ?? type,
      value: list.filter((i) => i.type === type).length,
      color: TYPE_COLORS[type] ?? PALETTE[idx % PALETTE.length],
    }))
    .filter((c) => c.value > 0);

  // Structure groupée : 1 groupe par type, détails = natures
  const SUMMARY_COLS = ['Type', 'Total', 'Terminées', 'Taux réussite', 'Durée moy.'];
  const DETAIL_COLS = ['Nature', 'Total', 'Terminées', 'Taux', 'Durée moy.'];

  const groups = presentTypes.map((type, idx) => {
    const natMap = typeNatureMap.get(type)!;
    const typeItems = list.filter((i) => i.type === type);
    const typeDone = typeItems.filter((i) => i.status === 'COMPLETED').length;
    const typeDur = typeItems.filter((i) => i.duration > 0);
    const typeAvgD = typeDur.length > 0 ? Math.round(typeDur.reduce((s, i) => s + i.duration, 0) / typeDur.length) : 0;
    const natures = Array.from(natMap.entries()).sort((a, b) => b[1].count - a[1].count);

    return {
      summary: [
        TYPE_LABELS[type] ?? type,
        String(typeItems.length),
        String(typeDone),
        typeItems.length > 0 ? `${Math.round((typeDone / typeItems.length) * 100)}%` : '0%',
        durationLabel(typeAvgD),
      ],
      detailColumns: DETAIL_COLS,
      details: natures.map(([name, v]) => [
        name,
        String(v.count),
        String(v.completed),
        v.count > 0 ? `${Math.round((v.completed / v.count) * 100)}%` : '0%',
        v.dCount > 0 ? durationLabel(Math.round(v.duration / v.dCount)) : '—',
      ]),
    };
  });

  return {
    title: f.interventionType
      ? `Par type — ${TYPE_LABELS[f.interventionType] ?? f.interventionType}`
      : "Par type d'intervention",
    kpis: [
      { label: 'Total interventions', value: String(list.length), color: '#3B82F6' },
      ...presentTypes.map((type, idx) => ({
        label: TYPE_LABELS[type] ?? type,
        value: String(list.filter((i) => i.type === type).length),
        color: TYPE_COLORS[type] ?? PALETTE[idx % PALETTE.length],
      })),
      { label: 'Natures distinctes', value: String(new Set(list.map((i) => i.nature)).size), color: '#8B5CF6' },
    ],
    columns: SUMMARY_COLS,
    rows: [],
    groups,
    chart: chartItems.length > 0 ? { type: 'bar', title: 'Répartition par type', items: chartItems } : undefined,
  };
}

// ── Stock (matériel) ──────────────────────────────────────────────────────────

async function genTechniqueStock(f: ReportFilters): Promise<ReportResult> {
  const all = await interventionsApi.getAll();
  // Agrège le matériel utilisé depuis les interventions
  const matMap = new Map<string, { count: number; installed: number; removed: number }>();

  for (const i of all) {
    if (!i.material) continue;
    for (const m of i.material) {
      const ex = matMap.get(m) ?? { count: 0, installed: 0, removed: 0 };
      ex.count++;
      if (['INSTALLATION', 'DEPANNAGE'].includes(i.type)) ex.installed++;
      if (['Retrait', 'Désinstallation'].includes(i.nature)) ex.removed++;
      matMap.set(m, ex);
    }

    // Comptes IMEI / SIM installés
    if (i.imei) {
      const ex = matMap.get(`Boitier ${i.imei}`) ?? { count: 0, installed: 0, removed: 0 };
      ex.count++;
      ex.installed++;
      matMap.set(`Boitier ${i.imei}`, ex);
    }
  }

  const sorted = Array.from(matMap.entries()).sort((a, b) => b[1].count - a[1].count);

  const chartItems: ChartItem[] = sorted.slice(0, 10).map(([name, v], i) => ({
    label: name.length > 18 ? name.slice(0, 16) + '…' : name,
    value: v.count,
    color: [
      '#3B82F6',
      '#22C55E',
      '#8B5CF6',
      '#F59E0B',
      '#F97316',
      '#06B6D4',
      '#EC4899',
      '#10B981',
      '#EF4444',
      '#6B7280',
    ][i % 10],
  }));

  return {
    title: 'Stock matériel',
    kpis: [
      { label: 'Références matériel', value: String(matMap.size), color: '#3B82F6' },
      { label: 'Total utilisations', value: String(sorted.reduce((s, [, v]) => s + v.count, 0)), color: '#8B5CF6' },
      { label: 'Installations', value: String(sorted.reduce((s, [, v]) => s + v.installed, 0)), color: '#22C55E' },
      { label: 'Retraits', value: String(sorted.reduce((s, [, v]) => s + v.removed, 0)), color: '#EF4444' },
    ],
    columns: ['Matériel / Référence', 'Utilisations', 'Installations', 'Retraits'],
    rows: sorted.map(([name, v]) => [name, String(v.count), String(v.installed), String(v.removed)]),
    chart: chartItems.length > 0 ? { type: 'bar', title: 'Top 10 matériels utilisés', items: chartItems } : undefined,
    note: 'Données extraites des fiches intervention. Pour un suivi de stock précis, connectez un module WMS.',
  };
}

// ── Monitoring ────────────────────────────────────────────────────────────────

async function genTechniqueMonitoring(vehicles: Vehicle[]): Promise<ReportResult> {
  const now = new Date();

  const offline = vehicles.filter((v) => v.status?.toLowerCase() === 'offline');
  const withIssue = vehicles.filter((v) => {
    const lastUpdate = v.lastUpdate ? new Date(v.lastUpdate) : null;
    if (!lastUpdate) return true;
    const minutesSince = (now.getTime() - lastUpdate.getTime()) / 60000;
    return minutesSince > 60; // Pas de signal depuis +60 min
  });

  const fuelLow = vehicles.filter((v) => (v.fuel ?? 100) < 20);
  const batteryLow = vehicles.filter((v) => {
    const b = v.batteryLevel;
    return b != null && b < 20;
  });

  const statusChart: ChartItem[] = [
    {
      label: 'En ligne',
      value: vehicles.filter((v) => v.status?.toLowerCase() !== 'offline').length,
      color: '#22C55E',
    },
    { label: 'Hors ligne', value: offline.length, color: '#EF4444' },
    { label: 'Sans signal', value: withIssue.length, color: '#F97316' },
  ].filter((i) => i.value > 0);

  return {
    title: 'Monitoring balises',
    kpis: [
      { label: 'Total balises', value: String(vehicles.length), color: '#3B82F6' },
      { label: 'Hors ligne', value: String(offline.length), color: '#EF4444' },
      { label: 'Sans signal +1h', value: String(withIssue.length), color: '#F97316' },
      { label: 'Carburant critique (<20%)', value: String(fuelLow.length), color: '#F59E0B' },
    ],
    columns: ['Engin', 'Plaque', 'Statut', 'Dernier signal', 'Carburant %', 'IMEI'],
    rows: vehicles
      .sort((a, b) => {
        const aOff = a.status?.toLowerCase() === 'offline' ? 0 : 1;
        const bOff = b.status?.toLowerCase() === 'offline' ? 0 : 1;
        return aOff - bOff;
      })
      .map((v) => {
        const lastUpdate = v.lastUpdate ? new Date(v.lastUpdate) : null;
        const minutesSince = lastUpdate ? Math.floor((now.getTime() - lastUpdate.getTime()) / 60000) : null;
        const signal =
          minutesSince != null
            ? minutesSince < 60
              ? `Il y a ${minutesSince}min`
              : `Il y a ${Math.floor(minutesSince / 60)}h`
            : '—';
        return [v.name, v.plate ?? '—', v.status ?? '—', signal, v.fuel != null ? `${v.fuel}%` : '—', v.imei ?? '—'];
      }),
    chart: statusChart.length > 0 ? { type: 'pie', title: 'État des balises', items: statusChart } : undefined,
  };
}

// ── Immobilisations ──────────────────────────────────────────────────────────

async function genTechniqueImmobilisation(vehicles: Vehicle[], f: ReportFilters): Promise<ReportResult> {
  const { start, end } = getPeriodRange(f);

  // Filtre les véhicules selon les filtres actifs
  const filtered = vehicles
    .filter((v) => {
      if (f.vehicleIds.length && !f.vehicleIds.includes(v.id)) return false;
      if (!matchText(v.name, f.client) && !matchText(v.plate, f.client)) return false;
      return true;
    })
    .slice(0, 60); // cap pour éviter trop d'appels API

  // Récupère les alertes IMMOBILIZATION pour chaque véhicule (concurrence limitée à 5)
  const perVehicle = await mapWithConcurrency(filtered, (v) =>
    vehiclesApi
      .getAlerts(v.id, 100, 'IMMOBILIZATION')
      .then((alerts) => alerts.map((a) => ({ ...a, _vehicleName: v.name, _plate: v.plate })))
      .catch(() => [])
  );

  const all = perVehicle
    .flat()
    .filter((a) => {
      const d = new Date(a.created_at);
      return d >= start && d <= end;
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Helpers pour détecter action et statut depuis le message
  const isImmo = (msg: string) => /immobil/i.test(msg) && !/remise|marche/i.test(msg);
  const isSuccess = (a: (typeof all)[0]) =>
    a.success !== undefined ? a.success : !/échec|erreur|fail/i.test(a.message ?? '');

  const immoCount = all.filter((a) => isImmo(a.message ?? '')).length;
  const remiseCount = all.filter((a) => !isImmo(a.message ?? '')).length;
  const successCount = all.filter((a) => isSuccess(a)).length;
  const failCount = all.length - successCount;

  const vehiclesImpliques = new Set(all.map((a) => (a as unknown as { _vehicleName?: string })._vehicleName)).size;

  const chartItems: ChartItem[] = [
    { label: 'Immobilisations', value: immoCount, color: '#EF4444' },
    { label: 'Remises en marche', value: remiseCount, color: '#22C55E' },
    { label: 'Échecs', value: failCount, color: '#6B7280' },
  ].filter((i) => i.value > 0);

  return {
    title: 'Historique Immobilisations',
    kpis: [
      { label: 'Total actions', value: String(all.length), color: '#3B82F6' },
      { label: 'Immobilisations', value: String(immoCount), color: '#EF4444' },
      { label: 'Remises en marche', value: String(remiseCount), color: '#22C55E' },
      { label: 'Succès', value: String(successCount), color: '#22C55E' },
      { label: 'Échecs', value: String(failCount), color: '#6B7280' },
      { label: 'Engins impliqués', value: String(vehiclesImpliques), color: '#8B5CF6' },
    ],
    columns: ['Date', 'Heure', 'Engin', 'Plaque', 'Action', 'Méthode', 'Utilisateur', 'Statut'],
    rows: all.map((a) => {
      const action = isImmo(a.message ?? '') ? 'Immobilisation' : 'Remise en marche';
      const methodMatch = (a.message ?? '').match(/\b(TCP|SMS)\b/i);
      const method = methodMatch ? methodMatch[0].toUpperCase() : '—';
      const user = a.triggered_by ?? a.user_name ?? '—';
      const statut = isSuccess(a) ? '✓ Succès' : '✗ Échec';
      return [
        fmtDate(a.created_at),
        fmtTime(a.created_at),
        (a as unknown as { _vehicleName?: string })._vehicleName ?? '—',
        (a as unknown as { _plate?: string })._plate ?? '—',
        action,
        method,
        user,
        statut,
      ];
    }),
    chart: chartItems.length > 0 ? { type: 'pie', title: "Actions d'immobilisation", items: chartItems } : undefined,
    note: filtered.length >= 60 ? 'Limité aux 60 premiers engins. Affinez avec les filtres.' : undefined,
  };
}

// ── Planning ──────────────────────────────────────────────────────────────────

async function genTechniquePlanning(f: ReportFilters): Promise<ReportResult> {
  const all = await interventionsApi.getAll();
  // Interventions planifiées = PENDING ou SCHEDULED sur la période courante et future
  const { start, end } = getPeriodRange(f);
  let planned = all.filter((i) => {
    if (!['PENDING', 'SCHEDULED', 'EN_ROUTE'].includes(i.status)) return false;
    const d = new Date(i.scheduledDate);
    return d >= start && d <= end;
  });

  // Filtre par client
  if (f.client) {
    const q = f.client.toLowerCase();
    planned = planned.filter((i) => (i.clientName ?? '').toLowerCase().includes(q));
  }

  // Filtre par nom de technicien
  if (f.technicianName?.trim()) {
    const q = f.technicianName.trim().toLowerCase();
    planned = planned.filter((i) => (i.technicianId ?? '').toLowerCase().includes(q));
  }

  // Charge par technicien
  const techMap = new Map<string, number>();
  for (const i of planned) {
    techMap.set(i.technicianId, (techMap.get(i.technicianId) ?? 0) + 1);
  }

  // Répartition par semaine
  const weekMap = new Map<string, number>();
  for (const i of planned) {
    const d = new Date(i.scheduledDate);
    const year = d.getFullYear();
    const week = Math.ceil(((d.getTime() - new Date(year, 0, 1).getTime()) / 86400000 + 1) / 7);
    const key = `S${String(week).padStart(2, '0')} ${year}`;
    weekMap.set(key, (weekMap.get(key) ?? 0) + 1);
  }
  const chartItems: ChartItem[] = Array.from(weekMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(0, 12)
    .map(([label, value], i) => ({
      label,
      value,
      color: ['#3B82F6', '#22C55E', '#8B5CF6', '#F59E0B', '#F97316', '#06B6D4'][i % 6],
    }));

  const urgent = planned.filter((i) => {
    const d = new Date(i.scheduledDate);
    const diff = (d.getTime() - Date.now()) / 86400000;
    return diff <= 2;
  });

  return {
    title: 'Planning des interventions',
    kpis: [
      { label: 'Planifiées', value: String(planned.length), color: '#3B82F6' },
      { label: 'Urgentes (< 2j)', value: String(urgent.length), color: '#EF4444' },
      { label: 'Techniciens mobilisés', value: String(techMap.size), color: '#8B5CF6' },
    ],
    columns: ['Date planifiée', 'Client', 'Technicien', 'Type', 'Nature', 'Statut', 'Engin', 'Plaque'],
    rows: planned
      .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
      .map((i) => [
        fmtDate(i.scheduledDate),
        i.clientName ?? '—',
        i.technicianId,
        TYPE_LABELS[i.type] ?? i.type ?? '—',
        i.nature ?? '—',
        STATUS_LABELS[i.status] ?? i.status,
        i.vehicleName ?? '—',
        i.licensePlate ?? i.wwPlate ?? '—',
      ]),
    chart: chartItems.length > 0 ? { type: 'bar', title: 'Charge par semaine', items: chartItems } : undefined,
  };
}

// ── Qualité signal ────────────────────────────────────────────────────────────

async function genTechniqueSignal(vehicles: Vehicle[]): Promise<ReportResult> {
  const now = new Date();

  type SignalBucket = { label: string; min: number; max: number; color: string };
  const BUCKETS: SignalBucket[] = [
    { label: '< 5 min', min: 0, max: 5, color: '#22C55E' },
    { label: '5–30 min', min: 5, max: 30, color: '#3B82F6' },
    { label: '30–60 min', min: 30, max: 60, color: '#F59E0B' },
    { label: '1–6 h', min: 60, max: 360, color: '#F97316' },
    { label: '> 6 h', min: 360, max: Infinity, color: '#EF4444' },
    { label: 'Jamais', min: -1, max: -1, color: '#6B7280' },
  ];

  interface VehicleSignalRow {
    name: string;
    plate: string;
    minutesSince: number | null;
    bucket: string;
    bucketColor: string;
    status: string;
  }

  const rows: VehicleSignalRow[] = vehicles.map((v) => {
    if (!v.lastUpdate) {
      return {
        name: v.name,
        plate: v.plate ?? '—',
        minutesSince: null,
        bucket: 'Jamais',
        bucketColor: '#6B7280',
        status: v.status ?? '—',
      };
    }
    const minutesSince = (now.getTime() - new Date(v.lastUpdate).getTime()) / 60000;
    const bucket =
      BUCKETS.find((b) => b.min >= 0 && minutesSince >= b.min && minutesSince < b.max) ?? BUCKETS[BUCKETS.length - 1];
    return {
      name: v.name,
      plate: v.plate ?? '—',
      minutesSince,
      bucket: bucket.label,
      bucketColor: bucket.color,
      status: v.status ?? '—',
    };
  });

  const bucketCounts = BUCKETS.map((b) => ({
    label: b.label,
    value: rows.filter((r) => r.bucket === b.label).length,
    color: b.color,
  })).filter((bc) => bc.value > 0);

  const good = rows.filter((r) => r.minutesSince !== null && r.minutesSince < 30).length;
  const degraded = rows.filter((r) => r.minutesSince !== null && r.minutesSince >= 30 && r.minutesSince < 360).length;
  const lost = rows.filter((r) => r.minutesSince === null || r.minutesSince >= 360).length;
  const rateGood = vehicles.length > 0 ? Math.round((good / vehicles.length) * 100) : 0;

  return {
    title: 'Qualité signal',
    kpis: [
      { label: 'Total balises', value: String(vehicles.length), color: '#3B82F6' },
      { label: 'Signal OK (< 30 min)', value: String(good), color: '#22C55E' },
      { label: 'Signal dégradé', value: String(degraded), color: '#F97316' },
      { label: 'Signal perdu (> 6h)', value: String(lost), color: '#EF4444' },
      { label: 'Taux couverture', value: `${rateGood}%`, color: '#8B5CF6' },
    ],
    columns: ['Engin', 'Plaque', 'Statut', 'Dernier signal', 'Ancienneté', 'Qualité'],
    rows: rows
      .sort((a, b) => {
        if (a.minutesSince === null) return -1;
        if (b.minutesSince === null) return 1;
        return b.minutesSince - a.minutesSince;
      })
      .map((r) => {
        const age =
          r.minutesSince === null
            ? 'Jamais'
            : r.minutesSince < 60
              ? `${Math.round(r.minutesSince)} min`
              : r.minutesSince < 1440
                ? `${Math.round(r.minutesSince / 60)} h`
                : `${Math.floor(r.minutesSince / 1440)} j`;
        return [
          r.name,
          r.plate,
          r.status,
          age,
          r.bucket,
          r.bucket === 'Jamais' || (r.minutesSince ?? 999) >= 360
            ? 'Perdu'
            : (r.minutesSince ?? 999) >= 30
              ? 'Dégradé'
              : 'OK',
        ];
      }),
    chart:
      bucketCounts.length > 0
        ? { type: 'bar', title: 'Distribution signal par ancienneté', items: bucketCounts }
        : undefined,
  };
}

// ── Anomalies télématiques ─────────────────────────────────────────────────────

async function genTechniqueTelecomAnomalies(vehicles: Vehicle[], _f: ReportFilters): Promise<ReportResult> {
  const now = new Date();

  interface Anomaly {
    vehicleName: string;
    plate: string;
    type: string;
    detail: string;
    severity: 'CRITIQUE' | 'AVERTISSEMENT';
  }

  const anomalies: Anomaly[] = [];

  for (const v of vehicles) {
    // Jamais vu
    if (!v.lastUpdate) {
      anomalies.push({
        vehicleName: v.name,
        plate: v.plate ?? '—',
        type: 'Pas de signal',
        detail: 'Jamais connecté au serveur',
        severity: 'CRITIQUE',
      });
      continue;
    }

    const hoursSince = (now.getTime() - new Date(v.lastUpdate).getTime()) / 3600000;

    // Signal ancien > 48h
    if (hoursSince > 48) {
      anomalies.push({
        vehicleName: v.name,
        plate: v.plate ?? '—',
        type: 'Signal perdu',
        detail: `Dernier signal il y a ${Math.floor(hoursSince / 24)}j`,
        severity: 'CRITIQUE',
      });
    } else if (hoursSince > 6) {
      anomalies.push({
        vehicleName: v.name,
        plate: v.plate ?? '—',
        type: 'Signal dégradé',
        detail: `Dernier signal il y a ${Math.round(hoursSince)}h`,
        severity: 'AVERTISSEMENT',
      });
    }

    // Anomalie sonde carburant
    if (v.fuel != null && (v.fuel < 0 || v.fuel > 105)) {
      anomalies.push({
        vehicleName: v.name,
        plate: v.plate ?? '—',
        type: 'Anomalie sonde carburant',
        detail: `Valeur hors plage : ${v.fuel}%`,
        severity: 'AVERTISSEMENT',
      });
    }

    // Vitesse aberrante (moteur éteint mais vitesse > 0, ou vitesse > 250)
    if (v.speed != null && v.speed > 250) {
      anomalies.push({
        vehicleName: v.name,
        plate: v.plate ?? '—',
        type: 'Vitesse aberrante',
        detail: `Vitesse GPS : ${Math.round(v.speed)} km/h`,
        severity: 'CRITIQUE',
      });
    }

    // Position 0,0 (balise non localisée)
    if (v.latitude === 0 && v.longitude === 0) {
      anomalies.push({
        vehicleName: v.name,
        plate: v.plate ?? '—',
        type: 'Position invalide',
        detail: 'Coordonnées GPS 0°N 0°E (balise non localisée)',
        severity: 'CRITIQUE',
      });
    }
  }

  const critiques = anomalies.filter((a) => a.severity === 'CRITIQUE').length;
  const avertissements = anomalies.filter((a) => a.severity === 'AVERTISSEMENT').length;

  const typeMap = new Map<string, number>();
  for (const a of anomalies) typeMap.set(a.type, (typeMap.get(a.type) ?? 0) + 1);
  const chartItems: ChartItem[] = Array.from(typeMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([label, value], i) => ({
      label: label.length > 20 ? label.slice(0, 18) + '…' : label,
      value,
      color: ['#EF4444', '#F97316', '#F59E0B', '#6B7280', '#8B5CF6'][i % 5],
    }));

  return {
    title: 'Anomalies télématiques',
    kpis: [
      { label: 'Total anomalies', value: String(anomalies.length), color: '#EF4444' },
      { label: 'Critiques', value: String(critiques), color: '#DC2626' },
      { label: 'Avertissements', value: String(avertissements), color: '#F97316' },
      {
        label: 'Engins sans anomalie',
        value: String(vehicles.length - new Set(anomalies.map((a) => a.vehicleName)).size),
        color: '#22C55E',
      },
    ],
    columns: ['Engin', 'Plaque', 'Type anomalie', 'Sévérité', 'Détail'],
    rows: anomalies
      .sort((a, b) => (a.severity === 'CRITIQUE' ? -1 : 1) - (b.severity === 'CRITIQUE' ? -1 : 1))
      .map((a) => [a.vehicleName, a.plate, a.type, a.severity, a.detail]),
    chart: chartItems.length > 0 ? { type: 'bar', title: 'Anomalies par type', items: chartItems } : undefined,
    note: anomalies.length === 0 ? 'Aucune anomalie télématique détectée sur la flotte.' : undefined,
  };
}

// ── Maintenance ───────────────────────────────────────────────────────────────

async function genTechniqueMaintenance(_vehicles: Vehicle[], _f: ReportFilters): Promise<ReportResult> {
  const rules = await maintenanceApi.getAll();

  const active = rules.filter((r) => r.statut === 'Actif');
  const recurring = rules.filter((r) => r.isRecurring);

  const catMap = new Map<string, { total: number; active: number }>();
  for (const r of rules) {
    const ex = catMap.get(r.category) ?? { total: 0, active: 0 };
    ex.total++;
    if (r.statut === 'Actif') ex.active++;
    catMap.set(r.category, ex);
  }

  const chartItems: ChartItem[] = Array.from(catMap.entries())
    .sort((a, b) => b[1].total - a[1].total)
    .map(([label, v], i) => ({ label, value: v.total, color: PALETTE[i % PALETTE.length] }));

  return {
    title: 'Règles de maintenance',
    kpis: [
      { label: 'Total règles', value: String(rules.length), color: '#3B82F6' },
      { label: 'Actives', value: String(active.length), color: '#22C55E' },
      { label: 'Inactives', value: String(rules.length - active.length), color: '#6B7280' },
      { label: 'Récurrentes', value: String(recurring.length), color: '#8B5CF6' },
    ],
    columns: ['Règle', 'Catégorie', 'Déclencheur', 'Intervalle', 'Récurrente', 'Statut'],
    rows: rules
      .sort((a, b) => (a.statut === 'Actif' ? -1 : 1) - (b.statut === 'Actif' ? -1 : 1))
      .map((r) => [
        r.nom,
        r.category,
        r.type,
        r.intervalle ? `${r.intervalle} ${r.unit ?? ''}`.trim() : '—',
        r.isRecurring ? 'Oui' : 'Non',
        r.statut,
      ]),
    chart: chartItems.length > 0 ? { type: 'bar', title: 'Règles par catégorie', items: chartItems } : undefined,
  };
}

// ── Capteurs & Télémétrie ─────────────────────────────────────────────────────

async function genTechniqueCapteurs(vehicles: Vehicle[], f: ReportFilters): Promise<ReportResult> {
  const filtered = vehicles.filter((v) => {
    if (f.vehicleIds.length && !f.vehicleIds.includes(v.id)) return false;
    if (!matchText(v.name, f.client) && !matchText(v.plate ?? '', f.client)) return false;
    return true;
  });

  const withTemp = filtered.filter((v) => v.temperature != null);
  const withBatt = filtered.filter((v) => v.battery != null);
  const ignOn = filtered.filter((v) => v.ignition === true);
  const battLow = filtered.filter((v) => v.battery != null && v.battery < 12.0);
  const tempHigh = filtered.filter((v) => {
    const t = v.temperature as number | undefined;
    return t != null && t > 80;
  });

  const chartItems: ChartItem[] = [
    { label: 'Ignition ON', value: ignOn.length, color: '#22C55E' },
    { label: 'Ignition OFF', value: filtered.filter((v) => v.ignition === false).length, color: '#6B7280' },
    { label: 'Batterie faible', value: battLow.length, color: '#EF4444' },
    { label: 'Température haute', value: tempHigh.length, color: '#F97316' },
  ].filter((i) => i.value > 0);

  return {
    title: 'Capteurs & Télémétrie',
    kpis: [
      { label: 'Engins avec capteur temp.', value: String(withTemp.length), color: '#3B82F6' },
      { label: 'Engins avec batterie', value: String(withBatt.length), color: '#8B5CF6' },
      { label: 'Ignition active', value: String(ignOn.length), color: '#22C55E' },
      { label: 'Batterie faible (< 12V)', value: String(battLow.length), color: '#EF4444' },
    ],
    columns: ['Engin', 'Plaque', 'Statut', 'Ignition', 'Batterie (V)', 'Température', 'Type sonde'],
    rows: filtered.map((v) => {
      const temp = v.temperature as number | undefined;
      return [
        v.name,
        v.plate ?? '—',
        v.status,
        v.ignition != null ? (v.ignition ? 'ON' : 'OFF') : '—',
        v.battery != null ? `${v.battery.toFixed(1)} V` : '—',
        temp != null ? `${temp}°C` : '—',
        v.fuelSensorType ?? '—',
      ];
    }),
    chart: chartItems.length > 0 ? { type: 'bar', title: 'État des capteurs', items: chartItems } : undefined,
  };
}

// ── Géofencing ────────────────────────────────────────────────────────────────

async function genTechniqueGeofencing(_f: ReportFilters): Promise<ReportResult> {
  const geofences = await geofencesApi.getAll();

  const active = geofences.filter((g) => g.is_active);
  const TYPE_LABELS: Record<string, string> = { CIRCLE: 'Cercle', POLYGON: 'Polygone', ROUTE: 'Route' };

  const typeMap = new Map<string, number>();
  for (const g of geofences) typeMap.set(g.type, (typeMap.get(g.type) ?? 0) + 1);

  const chartItems: ChartItem[] = Array.from(typeMap.entries()).map(([type, value], i) => ({
    label: TYPE_LABELS[type] ?? type,
    value,
    color: PALETTE[i % PALETTE.length],
  }));

  return {
    title: 'Zones de géofencing',
    kpis: [
      { label: 'Total zones', value: String(geofences.length), color: '#3B82F6' },
      { label: 'Actives', value: String(active.length), color: '#22C55E' },
      { label: 'Inactives', value: String(geofences.length - active.length), color: '#6B7280' },
      { label: 'Types distincts', value: String(typeMap.size), color: '#8B5CF6' },
    ],
    columns: ['Nom', 'Type', 'Statut', 'Créée le'],
    rows: geofences
      .sort((a, b) => (a.is_active ? -1 : 1) - (b.is_active ? -1 : 1))
      .map((g) => [g.name, TYPE_LABELS[g.type] ?? g.type, g.is_active ? 'Active' : 'Inactive', fmtDate(g.created_at)]),
    chart: chartItems.length > 0 ? { type: 'pie', title: 'Zones par type', items: chartItems } : undefined,
  };
}

// ── Éco-conduite ──────────────────────────────────────────────────────────────

async function genTechniqueEcoDriving(vehicles: Vehicle[]): Promise<ReportResult> {
  const profiles = await ecoDrivingApi.getAll();

  const active = profiles.filter((p) => p.status === 'ACTIVE');
  const vehiclesCovered = new Set(profiles.flatMap((p) => p.vehicleIds ?? []));
  const allVehicles = profiles.some((p) => p.allVehicles);
  const avgScore =
    profiles.length > 0 ? Math.round(profiles.reduce((s, p) => s + p.targetScore, 0) / profiles.length) : 0;

  const chartItems: ChartItem[] = profiles.slice(0, 8).map((p, i) => ({
    label: p.name.length > 15 ? p.name.slice(0, 13) + '…' : p.name,
    value: p.targetScore,
    color: PALETTE[i % PALETTE.length],
  }));

  return {
    title: 'Profils éco-conduite',
    kpis: [
      { label: 'Total profils', value: String(profiles.length), color: '#3B82F6' },
      { label: 'Actifs', value: String(active.length), color: '#22C55E' },
      {
        label: 'Engins couverts',
        value: allVehicles ? String(vehicles.length) : String(vehiclesCovered.size),
        color: '#8B5CF6',
      },
      { label: 'Score moyen cible', value: avgScore > 0 ? String(avgScore) : '—', color: '#F59E0B' },
    ],
    columns: ['Profil', 'Score cible', 'Vitesse max', 'Accélération', 'Freinage', 'Ralenti max', 'Engins', 'Statut'],
    rows: profiles.map((p) => [
      p.name,
      String(p.targetScore),
      `${p.maxSpeedLimit} km/h`,
      p.harshAccelerationSensitivity,
      p.harshBrakingSensitivity,
      `${p.maxIdlingDuration} min`,
      p.allVehicles ? 'Tous' : String((p.vehicleIds ?? []).length),
      p.status === 'ACTIVE' ? 'Actif' : 'Inactif',
    ]),
    chart: chartItems.length > 0 ? { type: 'bar', title: 'Score cible par profil', items: chartItems } : undefined,
  };
}

// ── Points d'intérêt (POI) ────────────────────────────────────────────────────

interface POI {
  id: string;
  name: string;
  type?: string;
  lat?: number;
  lng?: number;
  latitude?: number;
  longitude?: number;
  description?: string;
  created_at?: string;
}

async function genTechniquePOI(_f: ReportFilters): Promise<ReportResult> {
  let pois: POI[] = [];
  try {
    const res = await apiClient.get('/pois');
    pois = Array.isArray(res.data) ? res.data : Array.isArray(res.data?.data) ? res.data.data : [];
  } catch {
    /* endpoint optionnel */
  }

  const typeMap = new Map<string, number>();
  for (const p of pois) typeMap.set(p.type ?? 'Autre', (typeMap.get(p.type ?? 'Autre') ?? 0) + 1);

  const chartItems: ChartItem[] = Array.from(typeMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([label, value], i) => ({ label, value, color: PALETTE[i % PALETTE.length] }));

  return {
    title: "Points d'intérêt (POI)",
    kpis: [
      { label: 'Total POI', value: String(pois.length), color: '#3B82F6' },
      { label: 'Types distincts', value: String(typeMap.size), color: '#8B5CF6' },
    ],
    columns: ['Nom', 'Type', 'Latitude', 'Longitude', 'Description'],
    rows: pois.map((p) => {
      const lat = p.lat ?? p.latitude;
      const lng = p.lng ?? p.longitude;
      return [
        p.name,
        p.type ?? '—',
        lat != null ? lat.toFixed(6) : '—',
        lng != null ? lng.toFixed(6) : '—',
        p.description ?? '—',
      ];
    }),
    chart: chartItems.length > 0 ? { type: 'bar', title: 'POI par type', items: chartItems } : undefined,
    note: pois.length === 0 ? 'Aucun POI configuré sur cette plateforme.' : undefined,
  };
}

// ── Pneus ─────────────────────────────────────────────────────────────────────

function getWear(t: Tire): number | null {
  if (!t.currentMileage || !t.targetMileage || t.targetMileage <= 0) return null;
  return Math.min(100, Math.round(((t.currentMileage - t.mileageAtMount) / t.targetMileage) * 100));
}

async function genTechniquePneus(vehicles: Vehicle[], _f: ReportFilters): Promise<ReportResult> {
  const tires = await tiresApi.getAll();
  const vehicleMap = new Map(vehicles.map((v) => [v.id, v]));

  const active = tires.filter((t) => t.status === 'Actif');
  const replaced = tires.filter((t) => t.status === 'Remplacé');
  const critical = active.filter((t) => {
    const w = getWear(t);
    return w != null && w >= 80;
  });

  const chartItems: ChartItem[] = [
    { label: 'Normal (<80%)', value: active.length - critical.length, color: '#22C55E' },
    { label: 'Usure critique (≥80%)', value: critical.length, color: '#EF4444' },
    { label: 'Remplacés', value: replaced.length, color: '#6B7280' },
  ].filter((i) => i.value > 0);

  return {
    title: 'Suivi des pneus',
    kpis: [
      { label: 'Total pneus', value: String(tires.length), color: '#3B82F6' },
      { label: 'Actifs', value: String(active.length), color: '#22C55E' },
      { label: 'Usure critique ≥80%', value: String(critical.length), color: '#EF4444' },
      { label: 'Remplacés', value: String(replaced.length), color: '#6B7280' },
    ],
    columns: ['Engin', 'Plaque', 'Position', 'Marque', 'Montage', 'Km montage', 'Km cible', 'Usure', 'Statut'],
    rows: tires
      .sort((a, b) => (getWear(b) ?? 0) - (getWear(a) ?? 0))
      .map((t) => {
        const v = vehicleMap.get(t.vehicleId);
        const wear = getWear(t);
        return [
          v?.name ?? t.vehicleId.slice(0, 8),
          v?.plate ?? '—',
          t.position,
          t.brand ?? '—',
          fmtDate(t.mountDate),
          fmtNum(t.mileageAtMount),
          fmtNum(t.targetMileage),
          wear != null ? `${wear}%` : '—',
          t.status,
        ];
      }),
    chart: chartItems.length > 0 ? { type: 'pie', title: 'État des pneus', items: chartItems } : undefined,
  };
}

// ── Température & Batterie ────────────────────────────────────────────────────

async function genTechniqueTemperature(vehicles: Vehicle[], f: ReportFilters): Promise<ReportResult> {
  const filtered = vehicles.filter((v) => {
    if (f.vehicleIds.length && !f.vehicleIds.includes(v.id)) return false;
    if (!matchText(v.name, f.client) && !matchText(v.plate ?? '', f.client)) return false;
    return true;
  });

  const withTemp = filtered.filter((v) => v.temperature != null);
  const tempCrit = withTemp.filter((v) => (v.temperature ?? 0) > 100);
  const tempHigh = withTemp.filter((v) => {
    const t = v.temperature ?? 0;
    return t > 80 && t <= 100;
  });
  const tempNormal = withTemp.filter((v) => (v.temperature ?? 0) <= 80);
  const battLow = filtered.filter((v) => v.battery != null && v.battery < 12.0);

  const chartItems: ChartItem[] = [
    { label: 'Normal (<80°)', value: tempNormal.length, color: '#22C55E' },
    { label: 'Élevée (80-100°)', value: tempHigh.length, color: '#F59E0B' },
    { label: 'Critique (>100°)', value: tempCrit.length, color: '#EF4444' },
    { label: 'Sans capteur', value: filtered.length - withTemp.length, color: '#6B7280' },
  ].filter((i) => i.value > 0);

  return {
    title: 'Températures & Batterie',
    kpis: [
      { label: 'Engins monitorés', value: String(withTemp.length), color: '#3B82F6' },
      { label: 'Température critique', value: String(tempCrit.length), color: '#EF4444' },
      { label: 'Batterie faible (<12V)', value: String(battLow.length), color: '#F97316' },
      { label: 'Sans capteur temp.', value: String(filtered.length - withTemp.length), color: '#6B7280' },
    ],
    columns: ['Engin', 'Plaque', 'Statut', 'Température', 'Batterie (V)', 'Alerte'],
    rows: filtered
      .sort((a, b) => (b.temperature ?? 0) - (a.temperature ?? 0))
      .map((v) => {
        const temp = v.temperature as number | undefined;
        const batt = v.battery;
        const alert =
          temp != null && temp > 100
            ? 'Temp. critique'
            : temp != null && temp > 80
              ? 'Temp. élevée'
              : batt != null && batt < 12.0
                ? 'Batterie faible'
                : '—';
        return [
          v.name,
          v.plate ?? '—',
          v.status,
          temp != null ? `${temp}°C` : '—',
          batt != null ? `${batt.toFixed(1)} V` : '—',
          alert,
        ];
      }),
    chart:
      chartItems.length > 0 ? { type: 'bar', title: 'Distribution des températures', items: chartItems } : undefined,
    note: withTemp.length === 0 ? 'Aucun capteur de température détecté sur la flotte.' : undefined,
  };
}

// ── Dépenses véhicules (vue technique par engin) ──────────────────────────────

async function genTechniqueDepenses(vehicles: Vehicle[], f: ReportFilters): Promise<ReportResult> {
  const { start, end } = getPeriodRange(f);
  const all = await expensesApi.getAll();

  const filtered = all.filter((e) => {
    const d = new Date(e.date);
    return d >= start && d <= end;
  });

  const vehicleMap = new Map(vehicles.map((v) => [v.id, v]));

  const vehMap = new Map<
    string,
    { name: string; plate: string; total: number; count: number; cats: Record<string, number> }
  >();
  for (const e of filtered) {
    const veh = vehicleMap.get(e.vehicleId);
    const current = vehMap.get(e.vehicleId) ?? {
      name: veh?.name ?? e.vehicleId.slice(0, 8),
      plate: veh?.plate ?? '—',
      total: 0,
      count: 0,
      cats: {},
    };
    current.total += e.amount;
    current.count++;
    current.cats[e.category] = (current.cats[e.category] ?? 0) + e.amount;
    vehMap.set(e.vehicleId, current);
  }

  const sorted = Array.from(vehMap.values()).sort((a, b) => b.total - a.total);
  const totalAmount = sorted.reduce((s, v) => s + v.total, 0);

  const chartItems: ChartItem[] = sorted.slice(0, 8).map((v, i) => ({
    label: v.name.length > 15 ? v.name.slice(0, 13) + '…' : v.name,
    value: v.total,
    color: PALETTE[i % PALETTE.length],
  }));

  return {
    title: 'Dépenses par véhicule',
    kpis: [
      { label: 'Total dépenses (FCFA)', value: fmtNum(totalAmount), color: '#3B82F6' },
      { label: 'Nb opérations', value: String(filtered.length), color: '#8B5CF6' },
      { label: 'Véhicules concernés', value: String(vehMap.size), color: '#22C55E' },
      {
        label: 'Moy. par véhicule',
        value: vehMap.size > 0 ? fmtNum(Math.round(totalAmount / vehMap.size)) : '—',
        color: '#F59E0B',
      },
    ],
    columns: ['Engin', 'Plaque', 'Total (FCFA)', 'Opérations', 'Catégorie principale'],
    rows: sorted.map((v) => {
      const topCat = Object.entries(v.cats).sort((a, b) => b[1] - a[1])[0];
      return [v.name, v.plate, fmtNum(v.total), String(v.count), topCat ? `${topCat[0]} (${fmtNum(topCat[1])})` : '—'];
    }),
    chart: chartItems.length > 0 ? { type: 'bar', title: 'Top 8 engins — coûts totaux', items: chartItems } : undefined,
  };
}

// ── Dispatcher Module 7 ───────────────────────────────────────────────────────

export async function generateTechniqueReport(
  subId: string,
  vehicles: Vehicle[],
  f: ReportFilters
): Promise<ReportResult> {
  switch (subId) {
    case 'synthese':
      return genTechniqueSynthese(f);
    case 'all':
      return genTechniqueInterventions(f);
    case 'by_tech':
      return genTechniqueParTechnicien(f);
    case 'timing':
      return genTechniqueTemps(f);
    case 'by_nature':
      return genTechniqueParNature(f);
    case 'planning':
      return genTechniquePlanning(f);
    case 'stock':
      return genTechniqueStock(f);
    case 'monitoring':
      return genTechniqueMonitoring(vehicles);
    case 'signal':
      return genTechniqueSignal(vehicles);
    case 'telecom_anomalies':
      return genTechniqueTelecomAnomalies(vehicles, f);
    case 'immobilisation':
      return genTechniqueImmobilisation(vehicles, f);
    // ── Nouveaux sous-rapports ──
    case 'maintenance':
      return genTechniqueMaintenance(vehicles, f);
    case 'capteurs':
      return genTechniqueCapteurs(vehicles, f);
    case 'geofencing':
      return genTechniqueGeofencing(f);
    case 'eco_driving':
      return genTechniqueEcoDriving(vehicles);
    case 'poi':
      return genTechniquePOI(f);
    case 'pneus':
      return genTechniquePneus(vehicles, f);
    case 'temperature':
      return genTechniqueTemperature(vehicles, f);
    case 'depenses':
      return genTechniqueDepenses(vehicles, f);
    default:
      throw new Error(`Sous-rapport Technique inconnu : ${subId}`);
  }
}
