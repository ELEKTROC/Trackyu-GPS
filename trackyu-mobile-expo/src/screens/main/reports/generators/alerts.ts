/**
 * TrackYu Mobile — Module 2 : Alertes
 * synthese · all · geofence · notifications
 */
import alertsApi, { type Alert as AlertItem } from '../../../../api/alerts';
import {
  ReportFilters,
  ReportResult,
  ReportGroup,
  ChartItem,
  getPeriodRange,
  fmtDate,
  fmtTime,
  matchText,
} from '../types';

/** Libellés français — couvre les clés backend (lowercase ET uppercase) */
export const TYPE_FR: Record<string, string> = {
  // Clés lowercase (API mobile)
  speed: 'Excès de vitesse',
  geofence: 'Zone géographique',
  fuel: 'Carburant',
  maintenance: 'Maintenance',
  sos: 'SOS Urgence',
  battery: 'Batterie',
  offline: 'Hors ligne',
  // Clés uppercase (API web / backend direct)
  SPEEDING: 'Excès de vitesse',
  GEOFENCE: 'Zone géographique',
  FUEL_LEVEL: 'Niveau carburant',
  FUEL_THEFT: 'Vol de carburant',
  MAINTENANCE: 'Maintenance',
  SOS: 'SOS Urgence',
  IGNITION: 'Moteur',
  IDLING: 'Ralenti excessif',
  BATTERY: 'Batterie',
  TOWING: 'Remorquage',
  JAMMING: 'Brouillage GPS',
  OFFLINE: 'Hors ligne',
  POWER_CUT: 'Coupure alimentation',
  HARSH_BRAKING: 'Freinage brusque',
  HARSH_ACCEL: 'Accélération brusque',
  SHARP_TURN: 'Virage brusque',
  TAMPERING: 'Sabotage boîtier',
  CRASH: 'Accident détecté',
  RULE_VIOLATION: 'Violation de règle',
};

const TYPE_COLOR: Record<string, string> = {
  speed: '#F59E0B',
  SPEEDING: '#F59E0B',
  geofence: '#8B5CF6',
  GEOFENCE: '#8B5CF6',
  fuel: '#F97316',
  FUEL_LEVEL: '#F97316',
  FUEL_THEFT: '#EF4444',
  maintenance: '#22C55E',
  MAINTENANCE: '#22C55E',
  sos: '#EF4444',
  SOS: '#EF4444',
  battery: '#06B6D4',
  BATTERY: '#06B6D4',
  offline: '#6B7280',
  OFFLINE: '#6B7280',
  IGNITION: '#22C55E',
  IDLING: '#F97316',
  TOWING: '#EF4444',
  JAMMING: '#EF4444',
  POWER_CUT: '#EF4444',
  HARSH_BRAKING: '#F59E0B',
  HARSH_ACCEL: '#F59E0B',
  SHARP_TURN: '#F59E0B',
  TAMPERING: '#EF4444',
  CRASH: '#DC2626',
  RULE_VIOLATION: '#EF4444',
};

/** Liste ordonnée pour l'UI du filtre type */
export const ALERT_TYPE_LIST: { key: string; label: string; color: string }[] = [
  { key: 'SPEEDING', label: 'Excès de vitesse', color: '#F59E0B' },
  { key: 'GEOFENCE', label: 'Zone géographique', color: '#8B5CF6' },
  { key: 'FUEL_LEVEL', label: 'Niveau carburant', color: '#F97316' },
  { key: 'FUEL_THEFT', label: 'Vol de carburant', color: '#EF4444' },
  { key: 'MAINTENANCE', label: 'Maintenance', color: '#22C55E' },
  { key: 'SOS', label: 'SOS Urgence', color: '#EF4444' },
  { key: 'IGNITION', label: 'Moteur', color: '#22C55E' },
  { key: 'IDLING', label: 'Ralenti excessif', color: '#F97316' },
  { key: 'BATTERY', label: 'Batterie', color: '#06B6D4' },
  { key: 'TOWING', label: 'Remorquage', color: '#EF4444' },
  { key: 'JAMMING', label: 'Brouillage GPS', color: '#EF4444' },
  { key: 'OFFLINE', label: 'Hors ligne', color: '#6B7280' },
  { key: 'POWER_CUT', label: 'Coupure alimentation', color: '#EF4444' },
  { key: 'HARSH_BRAKING', label: 'Freinage brusque', color: '#F59E0B' },
  { key: 'HARSH_ACCEL', label: 'Accélération brusque', color: '#F59E0B' },
  { key: 'SHARP_TURN', label: 'Virage brusque', color: '#F59E0B' },
  { key: 'TAMPERING', label: 'Sabotage boîtier', color: '#EF4444' },
  { key: 'CRASH', label: 'Accident détecté', color: '#DC2626' },
  { key: 'RULE_VIOLATION', label: 'Violation de règle', color: '#EF4444' },
];
const SEV_FR: Record<string, string> = { critical: 'Critique', warning: 'Attention', info: 'Info' };

function filterAlerts(alerts: AlertItem[], f: ReportFilters) {
  const { start, end } = getPeriodRange(f);
  return alerts.filter((a) => {
    const d = new Date(a.createdAt);
    if (d < start || d > end) return false;
    if (f.vehicleIds.length && !f.vehicleIds.includes(a.vehicleId)) return false;
    if (!matchText(a.vehicleName, f.client)) return false;
    if (f.alertTypes.length && !f.alertTypes.includes(a.type.toUpperCase()) && !f.alertTypes.includes(a.type))
      return false;
    return true;
  });
}

function alertsChartByType(list: AlertItem[]): ChartItem[] {
  return Object.entries(TYPE_FR)
    .map(([key, label]) => ({
      label,
      value: list.filter((a) => a.type === key).length,
      color: TYPE_COLOR[key] ?? '#6B7280',
    }))
    .filter((i) => i.value > 0);
}

// ── Synthèse ──────────────────────────────────────────────────────────────────

async function genAlertsSynthese(f: ReportFilters): Promise<ReportResult> {
  const all = await alertsApi.getAll();
  const list = filterAlerts(all, f);

  const critical = list.filter((a) => a.severity === 'critical').length;
  const unread = list.filter((a) => !a.isRead).length;
  const vehicles = new Set(list.map((a) => a.vehicleId)).size;

  // Tendance : nb alertes par jour sur les 7 derniers jours
  const dailyMap = new Map<string, number>();
  for (const a of list) {
    const day = a.createdAt.split('T')[0];
    dailyMap.set(day, (dailyMap.get(day) ?? 0) + 1);
  }
  const chartItems: ChartItem[] = Array.from(dailyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-14)
    .map(([d, n]) => ({
      label: new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
      value: n,
      color: '#EF4444',
    }));

  return {
    title: 'Synthèse Alertes',
    kpis: [
      { label: 'Total alertes', value: String(list.length), color: '#EF4444' },
      { label: 'Critiques', value: String(critical), color: '#DC2626' },
      { label: 'Non lues', value: String(unread), color: '#F97316' },
      { label: 'Engins touchés', value: String(vehicles), color: '#3B82F6' },
    ],
    columns: ['Type', 'Total', 'Critiques', 'Avertissements', 'Lues', 'Non lues'],
    rows: Object.entries(TYPE_FR)
      .map(([key, label]) => {
        const sub = list.filter((a) => a.type === key);
        return [
          label,
          String(sub.length),
          String(sub.filter((a) => a.severity === 'critical').length),
          String(sub.filter((a) => a.severity === 'warning').length),
          String(sub.filter((a) => a.isRead).length),
          String(sub.filter((a) => !a.isRead).length),
        ];
      })
      .filter((r) => r[1] !== '0'),
    chart: chartItems.length > 0 ? { type: 'bar', title: 'Alertes par jour', items: chartItems } : undefined,
  };
}

// ── Toutes les alertes ────────────────────────────────────────────────────────

async function genAlertsAll(f: ReportFilters): Promise<ReportResult> {
  const all = await alertsApi.getAll();
  const list = filterAlerts(all, f);
  const chartItems = alertsChartByType(list);

  return {
    title: 'Toutes les alertes',
    kpis: [
      { label: 'Total', value: String(list.length), color: '#EF4444' },
      { label: 'Critiques', value: String(list.filter((a) => a.severity === 'critical').length), color: '#DC2626' },
      { label: 'Avertissements', value: String(list.filter((a) => a.severity === 'warning').length), color: '#F59E0B' },
      { label: 'Non lues', value: String(list.filter((a) => !a.isRead).length), color: '#F97316' },
    ],
    columns: [
      'Type',
      'Sévérité',
      'Engin',
      'Plaque',
      'Client',
      'Titre',
      'Date',
      'Heure',
      'Localisation',
      'Canal',
      'Lue',
    ],
    rows: list.map((a) => {
      const loc =
        a.latitude != null && a.longitude != null
          ? `https://maps.google.com/?q=${a.latitude.toFixed(6)},${a.longitude.toFixed(6)}`
          : '—';
      const canaux = [a.pushSent ? 'Push' : null, a.emailSent ? 'Email' : null, a.smsSent ? 'SMS' : null].filter(
        Boolean
      );
      return [
        TYPE_FR[a.type] ?? a.type,
        SEV_FR[a.severity] ?? a.severity,
        a.vehicleName,
        a.vehiclePlate,
        a.clientName ?? '—',
        a.title ?? '—',
        fmtDate(a.createdAt),
        fmtTime(a.createdAt),
        loc,
        canaux.length > 0 ? canaux.join(' · ') : '—',
        a.isRead ? 'Oui' : 'Non',
      ];
    }),
    note: list.length > 500 ? `${list.length} alertes — privilégiez l'export CSV pour l'ensemble.` : undefined,
    chart: chartItems.length > 0 ? { type: 'bar', title: 'Alertes par type', items: chartItems } : undefined,
  };
}

// ── Géofences ─────────────────────────────────────────────────────────────────

async function genAlertsGeofence(f: ReportFilters): Promise<ReportResult> {
  const all = await alertsApi.getAll();
  const list = filterAlerts(all, f).filter((a) => a.type === 'geofence');

  return {
    title: 'Alertes Géofence',
    kpis: [
      { label: 'Événements', value: String(list.length), color: '#8B5CF6' },
      { label: 'Engins', value: String(new Set(list.map((a) => a.vehicleId)).size), color: '#3B82F6' },
      { label: 'Non lues', value: String(list.filter((a) => !a.isRead).length), color: '#F97316' },
      { label: 'Critiques', value: String(list.filter((a) => a.severity === 'critical').length), color: '#EF4444' },
    ],
    columns: ['Engin', 'Plaque', 'Client', 'Message', 'Date', 'Heure', 'Sévérité', 'Lue'],
    rows: list.map((a) => [
      a.vehicleName,
      a.vehiclePlate,
      a.clientName ?? '—',
      a.message ?? '—',
      fmtDate(a.createdAt),
      fmtTime(a.createdAt),
      SEV_FR[a.severity] ?? a.severity,
      a.isRead ? 'Oui' : 'Non',
    ]),
    note: list.length > 500 ? `${list.length} alertes géofence — privilégiez l'export CSV.` : undefined,
  };
}

// ── Statut notifications Push / Email / SMS ────────────────────────────────────

/** Lit le booléen envoi depuis un objet Alert qui peut être en camelCase ou snake_case. */
function getSent(a: AlertItem, channel: 'push' | 'email' | 'sms'): boolean {
  const raw = a as unknown as Record<string, unknown>;
  // camelCase (interface normalisée)
  if (channel === 'push') return !!(raw['pushSent'] ?? raw['push_sent']);
  if (channel === 'email') return !!(raw['emailSent'] ?? raw['email_sent']);
  return !!(raw['smsSent'] ?? raw['sms_sent']);
}

function sentIcon(v: boolean): string {
  return v ? '✅' : '❌';
}

async function genAlertsNotifications(f: ReportFilters): Promise<ReportResult> {
  const all = await alertsApi.getAll();
  const list = filterAlerts(all, f);

  // ── KPIs globaux ────────────────────────────────────────────────────────────
  const pushTotal = list.filter((a) => getSent(a, 'push')).length;
  const emailTotal = list.filter((a) => getSent(a, 'email')).length;
  const smsTotal = list.filter((a) => getSent(a, 'sms')).length;

  // ── Regroupement par plaque ──────────────────────────────────────────────────
  const byPlate = new Map<string, AlertItem[]>();
  for (const a of list) {
    const key = a.vehiclePlate || a.vehicleId;
    if (!byPlate.has(key)) byPlate.set(key, []);
    byPlate.get(key)!.push(a);
  }

  // ── Construction des groupes ─────────────────────────────────────────────────
  const groups: ReportGroup[] = Array.from(byPlate.entries()).map(([, alerts]) => {
    const first = alerts[0];
    const raw = first as unknown as Record<string, unknown>;
    const client = (raw['clientName'] ?? raw['client_name'] ?? '—') as string;
    const branch = (raw['groupName'] ?? raw['group_name'] ?? '—') as string;
    const plate = first.vehiclePlate || '—';
    const vName = first.vehicleName || '—';

    const pushOk = alerts.filter((a) => getSent(a, 'push')).length;
    const emailOk = alerts.filter((a) => getSent(a, 'email')).length;
    const smsOk = alerts.filter((a) => getSent(a, 'sms')).length;
    const total = alerts.length;

    // Colonne Client : préférer client_name, sinon vehicleName comme proxy
    const clientDisplay = client !== '—' ? client : vName;

    const summary: string[] = [
      clientDisplay,
      branch,
      plate,
      String(total),
      pushOk > 0 ? `✅ ${pushOk}/${total}` : `❌ 0/${total}`,
      emailOk > 0 ? `✅ ${emailOk}/${total}` : `❌ 0/${total}`,
      smsOk > 0 ? `✅ ${smsOk}/${total}` : `❌ 0/${total}`,
    ];

    const details: string[][] = alerts.map((a) => [
      TYPE_FR[a.type] ?? a.type,
      a.message ?? '—',
      fmtDate(a.createdAt),
      fmtTime(a.createdAt),
      sentIcon(getSent(a, 'push')),
      sentIcon(getSent(a, 'email')),
      sentIcon(getSent(a, 'sms')),
    ]);

    return {
      summary,
      detailColumns: ['Type', 'Message', 'Date', 'Heure', 'Push', 'Email', 'SMS'],
      details,
    };
  });

  return {
    title: 'Statut Notifications',
    kpis: [
      { label: 'Total alertes', value: String(list.length), color: '#EF4444' },
      { label: 'Push ✅', value: String(pushTotal), color: '#E8771A' },
      { label: 'Email ✅', value: String(emailTotal), color: '#3B82F6' },
      { label: 'SMS ✅', value: String(smsTotal), color: '#22C55E' },
    ],
    columns: ['Client', 'Branche', 'Plaque', 'Alertes', 'Push', 'Email', 'SMS'],
    rows: groups.map((g) => g.summary),
    groups,
  };
}

// ── Dispatcher Module 2 ───────────────────────────────────────────────────────

export async function generateAlertsReport(subId: string, f: ReportFilters): Promise<ReportResult> {
  switch (subId) {
    case 'synthese':
      return genAlertsSynthese(f);
    case 'all':
      return genAlertsAll(f);
    case 'geofence':
      return genAlertsGeofence(f);
    case 'notifications':
      return genAlertsNotifications(f);
    default:
      throw new Error(`Sous-rapport inconnu : ${subId}`);
  }
}
