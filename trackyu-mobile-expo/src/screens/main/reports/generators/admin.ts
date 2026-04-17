/**
 * TrackYu Mobile — Module 9 : Admin
 * synthese · utilisateurs · activite-users · revendeurs · audit-trail · connexions
 */
import { usersApi, TenantUser } from '../../../../api/users';
import { contractsApi } from '../../../../api/financeApi';
import ticketsApi from '../../../../api/tickets';
import interventionsApi from '../../../../api/interventions';
import auditLogsApi, { AuditAction, AuditEntityType } from '../../../../api/auditLogsApi';
import { Vehicle } from '../../../../api/vehicles';
import { ReportFilters, ReportResult, ChartItem, getPeriodRange, fmtDate, fmtNum, matchText } from '../types';

const ROLE_LABELS: Record<string, string> = {
  CLIENT: 'Client',
  TECH: 'Technicien',
  COMMERCIAL: 'Commercial',
  COMPTABLE: 'Comptable',
  ADMIN: 'Administrateur',
  SUPERADMIN: 'Super Admin',
};

const ROLE_COLORS: Record<string, string> = {
  CLIENT: '#3B82F6',
  TECH: '#22C55E',
  COMMERCIAL: '#8B5CF6',
  COMPTABLE: '#F59E0B',
  ADMIN: '#F97316',
  SUPERADMIN: '#EF4444',
};

async function getUsers(f: ReportFilters): Promise<TenantUser[]> {
  const all = await usersApi.getAll();
  return all.filter((u) => matchText(u.name, f.client) || matchText(u.email, f.client));
}

// ── Synthèse ──────────────────────────────────────────────────────────────────

async function genAdminSynthese(vehicles: Vehicle[], f: ReportFilters): Promise<ReportResult> {
  const [users, contracts, tickets, interventions] = await Promise.all([
    usersApi.getAll(),
    contractsApi.getAll(),
    ticketsApi.getAll({ limit: 2000 }),
    interventionsApi.getAll(),
  ]);

  const { start, end } = getPeriodRange(f);

  const activeUsers = users.filter((u) => u.status === 'Actif').length;
  const clients = users.filter((u) => u.role === 'CLIENT').length;
  const recentLogins = users.filter((u) => {
    if (!u.last_login) return false;
    const d = new Date(u.last_login);
    return d >= start && d <= end;
  }).length;

  const activeContracts = contracts.filter((c) => c.status === 'ACTIVE').length;
  const openTickets = tickets.data.filter((t) => !['RESOLVED', 'CLOSED'].includes(t.status)).length;
  const pendingInterventions = interventions.filter((i) => ['PENDING', 'SCHEDULED'].includes(i.status)).length;

  const roleChart: ChartItem[] = Object.entries(ROLE_LABELS)
    .map(([key, label]) => ({
      label,
      value: users.filter((u) => u.role === key).length,
      color: ROLE_COLORS[key] ?? '#6B7280',
    }))
    .filter((i) => i.value > 0);

  return {
    title: 'Synthèse Admin',
    kpis: [
      { label: 'Utilisateurs actifs', value: String(activeUsers), color: '#22C55E' },
      { label: 'Clients', value: String(clients), color: '#3B82F6' },
      { label: 'Connexions période', value: String(recentLogins), color: '#8B5CF6' },
      { label: 'Contrats actifs', value: String(activeContracts), color: '#06B6D4' },
      { label: 'Engins tracés', value: String(vehicles.length), color: '#F59E0B' },
      { label: 'Tickets ouverts', value: String(openTickets), color: '#EF4444' },
      { label: 'Interventions en attente', value: String(pendingInterventions), color: '#F97316' },
    ],
    columns: ['Rôle', 'Nb utilisateurs', 'Actifs', 'Inactifs'],
    rows: Object.entries(ROLE_LABELS)
      .map(([key, label]) => {
        const sub = users.filter((u) => u.role === key);
        return [
          label,
          String(sub.length),
          String(sub.filter((u) => u.status === 'Actif').length),
          String(sub.filter((u) => u.status !== 'Actif').length),
        ];
      })
      .filter((r) => r[1] !== '0'),
    chart: roleChart.length > 0 ? { type: 'pie', title: 'Utilisateurs par rôle', items: roleChart } : undefined,
  };
}

// ── Utilisateurs ──────────────────────────────────────────────────────────────

async function genAdminUtilisateurs(f: ReportFilters): Promise<ReportResult> {
  const users = await getUsers(f);

  const roleChart: ChartItem[] = Object.entries(ROLE_LABELS)
    .map(([key, label]) => ({
      label,
      value: users.filter((u) => u.role === key).length,
      color: ROLE_COLORS[key] ?? '#6B7280',
    }))
    .filter((i) => i.value > 0);

  return {
    title: 'Utilisateurs',
    kpis: [
      { label: 'Total', value: String(users.length), color: '#3B82F6' },
      { label: 'Actifs', value: String(users.filter((u) => u.status === 'Actif').length), color: '#22C55E' },
      { label: 'Inactifs', value: String(users.filter((u) => u.status !== 'Actif').length), color: '#6B7280' },
      { label: 'Jamais connectés', value: String(users.filter((u) => !u.last_login).length), color: '#F97316' },
    ],
    columns: ['Nom', 'Email', 'Rôle', 'Statut', 'Département', 'Poste', 'Inscription', 'Dernière connexion'],
    rows: users.map((u) => [
      u.name,
      u.email,
      ROLE_LABELS[u.role] ?? u.role,
      u.status,
      u.departement ?? '—',
      u.poste ?? '—',
      fmtDate(u.created_at),
      u.last_login ? fmtDate(u.last_login) : 'Jamais',
    ]),
    chart: roleChart.length > 0 ? { type: 'bar', title: 'Utilisateurs par rôle', items: roleChart } : undefined,
  };
}

// ── Activité utilisateurs ─────────────────────────────────────────────────────

async function genAdminActiviteUsers(f: ReportFilters): Promise<ReportResult> {
  const users = await usersApi.getAll();
  const { start, end } = getPeriodRange(f);

  // Connexions dans la période
  const withLogin = users.filter((u) => {
    if (!u.last_login) return false;
    const d = new Date(u.last_login);
    return d >= start && d <= end;
  });

  const never = users.filter((u) => !u.last_login);
  const inactive30 = users.filter((u) => {
    if (!u.last_login) return false;
    const d = new Date(u.last_login);
    return Date.now() - d.getTime() > 30 * 86400000;
  });

  // Connexions par jour
  const dayMap = new Map<string, number>();
  for (const u of withLogin) {
    const day = u.last_login!.split('T')[0];
    dayMap.set(day, (dayMap.get(day) ?? 0) + 1);
  }
  const chartItems: ChartItem[] = Array.from(dayMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-14)
    .map(([d, n]) => ({
      label: new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
      value: n,
      color: '#3B82F6',
    }));

  return {
    title: 'Activité utilisateurs',
    kpis: [
      { label: 'Connectés sur période', value: String(withLogin.length), color: '#22C55E' },
      { label: 'Jamais connectés', value: String(never.length), color: '#6B7280' },
      { label: 'Inactifs +30 jours', value: String(inactive30.length), color: '#F97316' },
      { label: 'Total utilisateurs', value: String(users.length), color: '#3B82F6' },
    ],
    columns: ['Nom', 'Email', 'Rôle', 'Statut', 'Dernière connexion', 'Jours inactivité'],
    rows: users
      .sort((a, b) => {
        const da = a.last_login ? (Date.now() - new Date(a.last_login).getTime()) / 86400000 : 9999;
        const db = b.last_login ? (Date.now() - new Date(b.last_login).getTime()) / 86400000 : 9999;
        return db - da;
      })
      .map((u) => {
        const lastLogin = u.last_login ? new Date(u.last_login) : null;
        const daysInactive = lastLogin ? Math.floor((Date.now() - lastLogin.getTime()) / 86400000) : null;
        return [
          u.name,
          u.email,
          ROLE_LABELS[u.role] ?? u.role,
          u.status,
          u.last_login ? fmtDate(u.last_login) : 'Jamais',
          daysInactive != null ? String(daysInactive) : 'N/A',
        ];
      }),
    chart: chartItems.length > 0 ? { type: 'bar', title: 'Connexions par jour', items: chartItems } : undefined,
  };
}

// ── Revendeurs ────────────────────────────────────────────────────────────────

async function genAdminRevendeurs(f: ReportFilters): Promise<ReportResult> {
  const contracts = await contractsApi.getAll();

  // Agrège par revendeur
  const resellerMap = new Map<string, { contracts: number; vehicles: number; mrr: number; active: number }>();
  for (const c of contracts) {
    const name = c.resellerName ?? 'Direct';
    if (!matchText(name, f.revendeur)) continue;
    const ex = resellerMap.get(name) ?? { contracts: 0, vehicles: 0, mrr: 0, active: 0 };
    ex.contracts++;
    ex.vehicles += c.vehicleCount;
    ex.mrr += c.monthlyFee;
    if (c.status === 'ACTIVE') ex.active++;
    resellerMap.set(name, ex);
  }

  const sorted = Array.from(resellerMap.entries()).sort((a, b) => b[1].mrr - a[1].mrr);
  const chartItems: ChartItem[] = sorted.slice(0, 8).map(([name, v], i) => ({
    label: name.length > 15 ? name.slice(0, 13) + '…' : name,
    value: v.mrr,
    color: ['#3B82F6', '#22C55E', '#8B5CF6', '#F59E0B', '#F97316', '#06B6D4', '#EC4899', '#10B981'][i % 8],
  }));

  return {
    title: 'Activité revendeurs',
    kpis: [
      { label: 'Revendeurs', value: String(resellerMap.size), color: '#3B82F6' },
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
    columns: ['Revendeur', 'Contrats', 'Actifs', 'Engins', 'MRR (FCFA)'],
    rows: sorted.map(([name, v]) => [name, String(v.contracts), String(v.active), String(v.vehicles), fmtNum(v.mrr)]),
    chart: chartItems.length > 0 ? { type: 'bar', title: 'MRR par revendeur', items: chartItems } : undefined,
  };
}

// ── Helpers audit ─────────────────────────────────────────────────────────────

const ACTION_LABELS: Record<AuditAction, string> = {
  CREATE: 'Création',
  UPDATE: 'Modification',
  DELETE: 'Suppression',
  LOGIN: 'Connexion',
  LOGOUT: 'Déconnexion',
  EXPORT: 'Export',
  IMPORT: 'Import',
  VIEW: 'Consultation',
  SECURITY: 'Sécurité',
};

const ENTITY_LABELS: Record<AuditEntityType, string> = {
  USER: 'Utilisateur',
  VEHICLE: 'Véhicule',
  CLIENT: 'Client',
  INVOICE: 'Facture',
  INTERVENTION: 'Intervention',
  GEOFENCE: 'Géofence',
  DEVICE: 'Dispositif',
  ROLE: 'Rôle',
  SETTINGS: 'Paramètre',
  SESSION: 'Session',
  REPORT: 'Rapport',
};

const ACTION_COLORS: Record<AuditAction, string> = {
  CREATE: '#22C55E',
  UPDATE: '#3B82F6',
  DELETE: '#EF4444',
  LOGIN: '#8B5CF6',
  LOGOUT: '#6B7280',
  EXPORT: '#06B6D4',
  IMPORT: '#F59E0B',
  VIEW: '#A3A3A3',
  SECURITY: '#F97316',
};

function auditStatusLabel(status: string): string {
  if (status === 'SUCCESS') return 'OK';
  if (status === 'FAILURE') return 'ÉCHEC';
  if (status === 'WARNING') return 'AVERT.';
  return status;
}

// ── Audit trail ───────────────────────────────────────────────────────────────

async function genAdminAuditTrail(f: ReportFilters): Promise<ReportResult> {
  const { start, end } = getPeriodRange(f);

  const logs = await auditLogsApi.getAll({
    dateFrom: start.toISOString(),
    dateTo: end.toISOString(),
    limit: 1000,
  });

  // Filtre texte (user / detail)
  const filtered = f.client
    ? logs.filter(
        (l) =>
          matchText(l.userName ?? '', f.client) ||
          matchText(l.userEmail ?? '', f.client) ||
          matchText(l.details ?? '', f.client)
      )
    : logs;

  filtered.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  // Compteurs par action
  const actionMap = new Map<AuditAction, number>();
  for (const l of filtered) actionMap.set(l.action, (actionMap.get(l.action) ?? 0) + 1);

  // Compteurs par entité
  const entityMap = new Map<AuditEntityType, number>();
  for (const l of filtered) entityMap.set(l.entityType, (entityMap.get(l.entityType) ?? 0) + 1);

  const chartItems: ChartItem[] = Array.from(entityMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([key, value]) => ({
      label: ENTITY_LABELS[key] ?? key,
      value,
      color: ['#3B82F6', '#22C55E', '#8B5CF6', '#F59E0B', '#F97316', '#06B6D4', '#EF4444', '#10B981'][
        Object.keys(ENTITY_LABELS).indexOf(key) % 8
      ],
    }));

  const failures = filtered.filter((l) => l.status === 'FAILURE').length;
  const securityEvents = filtered.filter((l) => l.action === 'SECURITY').length;

  return {
    title: "Journal d'audit",
    kpis: [
      { label: 'Événements', value: String(filtered.length), color: '#3B82F6' },
      { label: 'Connexions', value: String(actionMap.get('LOGIN') ?? 0), color: '#8B5CF6' },
      {
        label: 'Modifications',
        value: String((actionMap.get('CREATE') ?? 0) + (actionMap.get('UPDATE') ?? 0) + (actionMap.get('DELETE') ?? 0)),
        color: '#22C55E',
      },
      { label: 'Échecs', value: String(failures), color: '#EF4444' },
      { label: 'Alertes sécu.', value: String(securityEvents), color: '#F97316' },
    ],
    columns: ['Date/Heure', 'Utilisateur', 'Rôle', 'Action', 'Entité', 'Statut', 'IP', 'Détail'],
    rows: filtered.map((l) => [
      fmtDate(l.timestamp),
      l.userName ?? '—',
      l.userRole ?? '—',
      ACTION_LABELS[l.action] ?? l.action,
      ENTITY_LABELS[l.entityType] ?? l.entityType,
      auditStatusLabel(l.status),
      l.ipAddress ?? '—',
      l.details ?? '—',
    ]),
    chart: chartItems.length > 0 ? { type: 'bar', title: 'Événements par entité', items: chartItems } : undefined,
  };
}

// ── Logs système ──────────────────────────────────────────────────────────────

async function genAdminLogs(f: ReportFilters): Promise<ReportResult> {
  const { start, end } = getPeriodRange(f);

  const logs = await auditLogsApi.getAll({
    dateFrom: start.toISOString(),
    dateTo: end.toISOString(),
    limit: 1000,
  });

  logs.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  // Activité par action
  const actionMap = new Map<AuditAction, number>();
  for (const l of logs) actionMap.set(l.action, (actionMap.get(l.action) ?? 0) + 1);

  const chartItems: ChartItem[] = Array.from(actionMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([key, value]) => ({
      label: ACTION_LABELS[key] ?? key,
      value,
      color: ACTION_COLORS[key] ?? '#6B7280',
    }));

  return {
    title: 'Logs système',
    kpis: [
      { label: 'Entrées de log', value: String(logs.length), color: '#3B82F6' },
      { label: 'Connexions', value: String(actionMap.get('LOGIN') ?? 0), color: '#22C55E' },
      { label: 'Créations', value: String(actionMap.get('CREATE') ?? 0), color: '#8B5CF6' },
      { label: 'Suppression', value: String(actionMap.get('DELETE') ?? 0), color: '#EF4444' },
      { label: 'Échecs', value: String(logs.filter((l) => l.status === 'FAILURE').length), color: '#F97316' },
    ],
    columns: ['Date/Heure', 'Utilisateur', 'Action', 'Entité', 'Statut', 'IP', 'User-Agent'],
    rows: logs.map((l) => [
      fmtDate(l.timestamp),
      l.userName ?? l.userEmail ?? '—',
      ACTION_LABELS[l.action] ?? l.action,
      ENTITY_LABELS[l.entityType] ?? l.entityType,
      auditStatusLabel(l.status),
      l.ipAddress ?? '—',
      l.userAgent ? l.userAgent.slice(0, 40) + (l.userAgent.length > 40 ? '…' : '') : '—',
    ]),
    chart: chartItems.length > 0 ? { type: 'bar', title: "Activité par type d'action", items: chartItems } : undefined,
  };
}

// ── Dispatcher Module 9 ───────────────────────────────────────────────────────

export async function generateAdminReport(subId: string, vehicles: Vehicle[], f: ReportFilters): Promise<ReportResult> {
  switch (subId) {
    case 'synthese':
      return genAdminSynthese(vehicles, f);
    case 'users':
      return genAdminUtilisateurs(f);
    case 'user_activity':
      return genAdminActiviteUsers(f);
    case 'resellers':
      return genAdminRevendeurs(f);
    case 'logs':
      return genAdminLogs(f);
    case 'audit':
      return genAdminAuditTrail(f);
    default:
      throw new Error(`Sous-rapport Admin inconnu : ${subId}`);
  }
}
