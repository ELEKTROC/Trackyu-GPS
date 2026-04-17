/**
 * TrackYu Mobile — Module 1 : Activités
 * Sous-rapports : synthese · general · trajets · kilometrage · daily · idle · stopped · offline
 */
import vehiclesApi, { type Vehicle, type Trip } from '../../../../api/vehicles';
import { alertsApi } from '../../../../api/alerts';
import { ReportFilters, ReportResult, getPeriodRange, fmtDate, fmtTime, fmtNum, matchText } from '../types';
import { runWithConcurrency } from '../../../../utils/pLimit';
import { VEHICLE_STATUS_COLORS, VEHICLE_STATUS_LABELS } from '../../../../utils/vehicleStatus';

// ── Helpers internes ───────────────────────────────────────────────────────────

/** "Depuis Xj" / "Depuis Xh" / "Depuis Xm" à partir d'un timestamp ISO */
function fmtSince(lu: string | null | undefined): string {
  if (!lu) return '—';
  const ms = Date.now() - new Date(lu).getTime();
  if (isNaN(ms) || ms < 0) return '—';
  const h = Math.floor(ms / 3_600_000);
  if (h >= 24) return `${Math.floor(h / 24)}j ${h % 24}h`;
  if (h >= 1) return `${h}h ${Math.floor((ms % 3_600_000) / 60_000)}m`;
  return `${Math.floor(ms / 60_000)}m`;
}

function filterVehicles(vehicles: Vehicle[], f: ReportFilters): Vehicle[] {
  return vehicles.filter((v) => {
    if (f.vehicleIds.length && !f.vehicleIds.includes(v.id)) return false;
    if (!matchText(v.clientName, f.client)) return false;
    return true;
  });
}

/** Dates de la période sous forme YYYY-MM-DD[] (max 31) */
function getDatesInRange(start: Date, end: Date): string[] {
  const dates: string[] = [];
  const cur = new Date(start);
  while (cur <= end && dates.length < 31) {
    dates.push(cur.toISOString().split('T')[0]);
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

// ── Rapport Synthèse ───────────────────────────────────────────────────────────

export async function genActivitySynthese(vehicles: Vehicle[], f: ReportFilters): Promise<ReportResult> {
  const list = filterVehicles(vehicles, f);
  const { start, end } = getPeriodRange(f);

  // ── 1. Statuts temps réel ────────────────────────────────────────────────
  const moving = list.filter((v) => v.status === 'moving').length;
  const idle = list.filter((v) => v.status === 'idle').length;
  const stopped = list.filter((v) => v.status === 'stopped').length;
  const offline = list.filter((v) => v.status === 'offline').length;
  const pct = (n: number) => (list.length ? `${Math.round((n / list.length) * 100)}%` : '0%');

  // ── 2. Trajets (période) — max 30 engins ─────────────────────────────────
  const selected30 = list.slice(0, 30);
  type TripAcc = { name: string; dist: number; dur: number; count: number };
  const tripsByVehicle = new Map<string, TripAcc>();

  await runWithConcurrency(
    selected30.map(
      (v) => () =>
        vehiclesApi
          .getTrips(v.id, start.toISOString(), end.toISOString())
          .then((trips) => {
            const acc = trips.reduce(
              (a, t) => ({
                dist: a.dist + (t.distance_km ?? 0),
                dur: a.dur + (t.duration_seconds ?? 0),
                count: a.count + 1,
              }),
              { dist: 0, dur: 0, count: 0 }
            );
            tripsByVehicle.set(v.id, { name: v.name, ...acc });
          })
          .catch(() => {})
    )
  );

  const totalDist = [...tripsByVehicle.values()].reduce((s, a) => s + a.dist, 0);
  const totalTrips = [...tripsByVehicle.values()].reduce((s, a) => s + a.count, 0);
  const totalDurSec = [...tripsByVehicle.values()].reduce((s, a) => s + a.dur, 0);
  const activeVehicles = [...tripsByVehicle.values()].filter((a) => a.count > 0).length;

  // ── 3. Alertes ───────────────────────────────────────────────────────────
  const alertCountByVehicle = new Map<string, { name: string; count: number }>();
  try {
    const alertPage = await alertsApi.getPage(1, 200);
    for (const a of alertPage.data) {
      if (!a.vehicleId) continue;
      const ex = alertCountByVehicle.get(a.vehicleId);
      if (ex) ex.count++;
      else alertCountByVehicle.set(a.vehicleId, { name: a.vehicleName ?? a.vehicleId, count: 1 });
    }
  } catch {
    /* silencieux */
  }

  // ── 4. Helpers ───────────────────────────────────────────────────────────
  const fmtDur = (s: number) => {
    const h = Math.floor(s / 3600),
      m = Math.floor((s % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  // ── 5. Tops ───────────────────────────────────────────────────────────────
  const topKm = [...tripsByVehicle.values()].sort((a, b) => b.dist - a.dist).slice(0, 5);
  const topDrive = [...tripsByVehicle.values()].sort((a, b) => b.dur - a.dur).slice(0, 5);
  const topStopped = list
    .filter((v) => v.status === 'stopped')
    .sort((a, b) => new Date(a.lastUpdate ?? 0).getTime() - new Date(b.lastUpdate ?? 0).getTime())
    .slice(0, 5);
  const topIdle = list
    .filter((v) => v.status === 'idle')
    .sort((a, b) => new Date(a.lastUpdate ?? 0).getTime() - new Date(b.lastUpdate ?? 0).getTime())
    .slice(0, 5);
  const topAlerts = [...alertCountByVehicle.values()].sort((a, b) => b.count - a.count).slice(0, 5);

  // ── 6. Lignes du tableau ──────────────────────────────────────────────────
  const rows: string[][] = [];

  rows.push(['── FLOTTE ──', '']);
  rows.push(['Total engins', String(list.length)]);
  rows.push(['En route', `${moving} (${pct(moving)})`]);
  rows.push(['Ralenti', `${idle} (${pct(idle)})`]);
  rows.push(['Arrêté', `${stopped} (${pct(stopped)})`]);
  rows.push(['Hors ligne', `${offline} (${pct(offline)})`]);

  rows.push(['── PÉRIODE ──', '']);
  rows.push(['Engins analysés (trajets)', `${selected30.length} / ${list.length}`]);
  rows.push(['Engins actifs', String(activeVehicles)]);
  rows.push(['Nb trajets', String(totalTrips)]);
  rows.push(['Distance totale', `${fmtNum(Math.round(totalDist))} km`]);
  rows.push(['Durée totale conduite', fmtDur(totalDurSec)]);
  rows.push(['Distance moy./engin actif', activeVehicles ? `${Math.round(totalDist / activeVehicles)} km` : '—']);

  rows.push(['── TOP KILOMÉTRAGE ──', '']);
  if (topKm.length) topKm.forEach((a, i) => rows.push([`${i + 1}. ${a.name}`, `${Math.round(a.dist)} km`]));
  else rows.push(['Aucune donnée', '—']);

  rows.push(['── TOP TEMPS DE CONDUITE ──', '']);
  if (topDrive.length) topDrive.forEach((a, i) => rows.push([`${i + 1}. ${a.name}`, fmtDur(a.dur)]));
  else rows.push(['Aucune donnée', '—']);

  rows.push(['── TOP ARRÊT ──', '']);
  if (topStopped.length)
    topStopped.forEach((v, i) => rows.push([`${i + 1}. ${v.name}`, `Depuis ${fmtSince(v.lastUpdate)}`]));
  else rows.push(['Aucun arrêt', '—']);

  rows.push(['── TOP RALENTI ──', '']);
  if (topIdle.length) topIdle.forEach((v, i) => rows.push([`${i + 1}. ${v.name}`, `Depuis ${fmtSince(v.lastUpdate)}`]));
  else rows.push(['Aucun ralenti', '—']);

  rows.push(['── TOP ALERTES ──', '']);
  if (topAlerts.length)
    topAlerts.forEach((a, i) => rows.push([`${i + 1}. ${a.name}`, `${a.count} alerte${a.count > 1 ? 's' : ''}`]));
  else rows.push(['Aucune alerte', '—']);

  const mostOffline = list
    .filter((v) => v.status === 'offline')
    .sort((a, b) => new Date(a.lastUpdate ?? 0).getTime() - new Date(b.lastUpdate ?? 0).getTime())
    .slice(0, 3);
  rows.push(['── ANOMALIES (OFFLINE) ──', '']);
  if (mostOffline.length)
    mostOffline.forEach((v, i) => rows.push([`${i + 1}. ${v.name}`, `Depuis ${fmtSince(v.lastUpdate)}`]));
  else rows.push(['Aucune anomalie', '—']);

  return {
    title: 'Synthèse Activités',
    kpis: [
      { label: 'Total', value: String(list.length), color: '#3B82F6' },
      { label: 'En route', value: String(moving), color: VEHICLE_STATUS_COLORS.moving },
      { label: 'Ralenti', value: String(idle), color: VEHICLE_STATUS_COLORS.idle },
      { label: 'Arrêté', value: String(stopped), color: VEHICLE_STATUS_COLORS.stopped },
      { label: 'Hors ligne', value: String(offline), color: VEHICLE_STATUS_COLORS.offline },
      { label: 'Trajets', value: String(totalTrips), color: '#8B5CF6' },
      { label: 'Distance', value: `${fmtNum(Math.round(totalDist))} km`, color: '#0EA5E9' },
    ],
    columns: ['Indicateur', 'Valeur'],
    rows,
    chart: {
      type: 'bar',
      title: 'Répartition des statuts',
      items: [
        { label: 'En route', value: moving, color: VEHICLE_STATUS_COLORS.moving },
        { label: 'Ralenti', value: idle, color: VEHICLE_STATUS_COLORS.idle },
        { label: 'Arrêté', value: stopped, color: VEHICLE_STATUS_COLORS.stopped },
        { label: 'Hors ligne', value: offline, color: VEHICLE_STATUS_COLORS.offline },
      ].filter((i) => i.value > 0),
    },
    note:
      selected30.length < list.length
        ? `Trajets calculés sur ${selected30.length} engins (max 30). Statuts temps réel sur ${list.length} engins.`
        : undefined,
  };
}

// ── Rapport Activité générale ──────────────────────────────────────────────────

export function genActivityGeneral(vehicles: Vehicle[], f: ReportFilters): ReportResult {
  const list = filterVehicles(vehicles, f);
  const moving = list.filter((v) => v.status === 'moving').length;
  const idle = list.filter((v) => v.status === 'idle').length;
  const stopped = list.filter((v) => v.status === 'stopped').length;
  const offline = list.filter((v) => v.status === 'offline').length;

  return {
    title: 'Activité générale',
    kpis: [
      { label: 'Total', value: String(list.length), color: '#3B82F6' },
      { label: 'En route', value: String(moving), color: VEHICLE_STATUS_COLORS.moving },
      { label: 'Ralenti', value: String(idle), color: VEHICLE_STATUS_COLORS.idle },
      { label: 'Arrêté', value: String(stopped), color: VEHICLE_STATUS_COLORS.stopped },
      { label: 'Hors ligne', value: String(offline), color: VEHICLE_STATUS_COLORS.offline },
    ],
    columns: ['Engin', 'Plaque', 'Statut', 'Vitesse', 'Odomètre', 'Carburant', 'Conducteur', 'Dernière MAJ'],
    rows: list.map((v) => [
      v.name,
      v.plate,
      VEHICLE_STATUS_LABELS[v.status] ?? v.status,
      v.speed ? `${v.speed} km/h` : '—',
      v.odometer ? `${fmtNum(v.odometer)} km` : '—',
      v.fuel != null ? `${v.fuel}%` : v.fuelLevel != null ? `${v.fuelLevel}%` : '—',
      v.driver?.name ?? v.driverName ?? '—',
      fmtDate(v.lastUpdate),
    ]),
    chart: {
      type: 'bar',
      title: 'Répartition des statuts',
      items: [
        { label: 'En route', value: moving, color: VEHICLE_STATUS_COLORS.moving },
        { label: 'Ralenti', value: idle, color: VEHICLE_STATUS_COLORS.idle },
        { label: 'Arrêté', value: stopped, color: VEHICLE_STATUS_COLORS.stopped },
        { label: 'Hors ligne', value: offline, color: VEHICLE_STATUS_COLORS.offline },
      ].filter((i) => i.value > 0),
    },
  };
}

// ── Rapport Trajets détaillés ──────────────────────────────────────────────────

export async function genActivityTrajets(vehicles: Vehicle[], f: ReportFilters): Promise<ReportResult> {
  const { start, end } = getPeriodRange(f);
  const selected = filterVehicles(vehicles, f).slice(0, 30);

  const allTrips: (Trip & { _vname: string })[] = [];
  await runWithConcurrency(
    selected.map(
      (v) => () =>
        vehiclesApi
          .getTrips(v.id, start.toISOString(), end.toISOString())
          .then((trips) => allTrips.push(...trips.map((t) => ({ ...t, _vname: v.name }))))
          .catch(() => {})
    )
  );
  allTrips.sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());

  const totalDist = allTrips.reduce((s, t) => s + (t.distance_km ?? 0), 0);
  const avgDist = allTrips.length ? totalDist / allTrips.length : 0;
  const activeVehicles = new Set(allTrips.map((t) => t.object_id)).size;

  const fmtDurMin = (sec: number | null) => {
    if (!sec) return '—';
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return h > 0 ? `${h}h ${m}min` : `${m} min`;
  };

  // Chart: distance par jour (14 derniers jours)
  const dailyMap = new Map<string, number>();
  for (const t of allTrips) {
    const day = t.start_time.split('T')[0];
    dailyMap.set(day, (dailyMap.get(day) ?? 0) + (t.distance_km ?? 0));
  }
  const chartItems = Array.from(dailyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-14)
    .map(([date, dist]) => ({
      label: new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
      value: Math.round(dist),
      color: '#3B82F6',
    }));

  const notes: string[] = [];
  if (selected.length >= 30)
    notes.push('Limité aux 30 premiers engins. Sélectionnez des engins spécifiques pour affiner.');
  if (allTrips.length > 500) notes.push(`${allTrips.length} trajets — privilégiez l'export CSV pour l'ensemble.`);

  return {
    title: 'Trajets détaillés',
    kpis: [
      { label: 'Trajets', value: String(allTrips.length), color: '#3B82F6' },
      { label: 'Distance totale', value: `${fmtNum(Math.round(totalDist))} km`, color: '#22C55E' },
      { label: 'Dist. moy./trajet', value: `${Math.round(avgDist)} km`, color: '#F59E0B' },
      { label: 'Engins actifs', value: String(activeVehicles), color: '#8B5CF6' },
    ],
    columns: [
      'Engin',
      'Conducteur',
      'Départ',
      'Arrivée',
      'Date',
      'H. départ',
      'H. arrivée',
      'Durée',
      'Distance',
      'Vit. max',
      'Vit. moy.',
    ],
    rows: allTrips.map((t) => [
      t._vname,
      t.driver_name ?? '—',
      t.start_address ??
        (t.start_lat ? `https://maps.google.com/?q=${t.start_lat.toFixed(6)},${t.start_lng?.toFixed(6)}` : '—'),
      t.end_address ??
        (t.end_lat ? `https://maps.google.com/?q=${t.end_lat.toFixed(6)},${t.end_lng?.toFixed(6)}` : '—'),
      fmtDate(t.start_time),
      fmtTime(t.start_time),
      t.end_time ? fmtTime(t.end_time) : '—',
      fmtDurMin(t.duration_seconds),
      t.distance_km != null ? `${t.distance_km.toFixed(1)} km` : '—',
      t.max_speed_kmh != null ? `${t.max_speed_kmh} km/h` : '—',
      t.avg_speed_kmh != null ? `${Math.round(t.avg_speed_kmh)} km/h` : '—',
    ]),
    chart: chartItems.length > 0 ? { type: 'bar', title: 'Distance par jour (km)', items: chartItems } : undefined,
    note: notes.length ? notes.join(' ') : undefined,
  };
}

// ── Rapport Kilométrage ────────────────────────────────────────────────────────

export async function genActivityKilometrage(vehicles: Vehicle[], f: ReportFilters): Promise<ReportResult> {
  const { start, end } = getPeriodRange(f);
  const selected = filterVehicles(vehicles, f).slice(0, 30);

  type KmRow = {
    vehicle: Vehicle;
    totalDist: number;
    totalDurSec: number;
    nbTrips: number;
    maxSpeed: number;
    avgSpeed: number;
  };
  const results: KmRow[] = [];

  await runWithConcurrency(
    selected.map((v) => async () => {
      const trips = await vehiclesApi.getTrips(v.id, start.toISOString(), end.toISOString()).catch(() => [] as Trip[]);
      const totalDist = trips.reduce((s, t) => s + (t.distance_km ?? 0), 0);
      const totalDurSec = trips.reduce((s, t) => s + (t.duration_seconds ?? 0), 0);
      const maxSpeed = trips.reduce((m, t) => Math.max(m, t.max_speed_kmh ?? 0), 0);
      // Vitesse moyenne pondérée par la distance
      const avgSpeed = totalDurSec > 0 ? totalDist / (totalDurSec / 3600) : 0;
      results.push({ vehicle: v, totalDist, totalDurSec, nbTrips: trips.length, maxSpeed, avgSpeed });
    })
  );

  results.sort((a, b) => b.totalDist - a.totalDist);

  const active = results.filter((r) => r.totalDist > 0);
  const totalFleet = results.reduce((s, r) => s + r.totalDist, 0);
  const totalDurFleet = results.reduce((s, r) => s + r.totalDurSec, 0);
  const avgPerActive = active.length ? totalFleet / active.length : 0;

  const fmtDur = (s: number) => {
    const h = Math.floor(s / 3600),
      m = Math.floor((s % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  return {
    title: 'Kilométrage par engin',
    kpis: [
      { label: 'Distance totale', value: `${fmtNum(Math.round(totalFleet))} km`, color: '#3B82F6' },
      { label: 'Moy./engin actif', value: `${fmtNum(Math.round(avgPerActive))} km`, color: '#22C55E' },
      { label: 'Engins actifs', value: String(active.length), color: '#F59E0B' },
      { label: 'Sans trajet', value: String(results.length - active.length), color: '#6B7280' },
    ],
    columns: [
      'Engin',
      'Plaque',
      'Distance',
      'Nb trajets',
      'Durée conduite',
      'Vit. max',
      'Vit. moy.',
      'Client',
      'Conducteur',
    ],
    rows: results.map((r) => [
      r.vehicle.name,
      r.vehicle.plate,
      r.totalDist > 0 ? `${fmtNum(Math.round(r.totalDist))} km` : '—',
      r.nbTrips > 0 ? String(r.nbTrips) : '—',
      r.totalDurSec > 0 ? fmtDur(r.totalDurSec) : '—',
      r.maxSpeed > 0 ? `${r.maxSpeed} km/h` : '—',
      r.avgSpeed > 0 ? `${Math.round(r.avgSpeed)} km/h` : '—',
      r.vehicle.clientName ?? '—',
      r.vehicle.driver?.name ?? r.vehicle.driverName ?? '—',
    ]),
    chart: {
      type: 'bar',
      title: `Top ${Math.min(10, active.length)} kilométrage (km)`,
      items: active.slice(0, 10).map((r) => ({
        label: r.vehicle.name.length <= 10 ? r.vehicle.name : r.vehicle.plate,
        value: Math.round(r.totalDist),
        color: '#3B82F6',
      })),
    },
    note:
      selected.length >= 30
        ? `Limité aux 30 premiers engins. Sélectionnez des engins spécifiques pour affiner. Durée totale flotte : ${fmtDur(totalDurFleet)}.`
        : `Durée totale conduite flotte : ${fmtDur(totalDurFleet)}.`,
  };
}

// ── Rapport Distance quotidienne (PIVOT) ───────────────────────────────────────

export async function genActivityDaily(vehicles: Vehicle[], f: ReportFilters): Promise<ReportResult> {
  const { start, end } = getPeriodRange(f);
  const dates = getDatesInRange(start, end);
  const selected = filterVehicles(vehicles, f).slice(0, 20);

  const dayHeaders = dates.map((d) => {
    const dt = new Date(d + 'T12:00:00');
    return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}`;
  });
  const columns = ['Engin', 'Plaque', ...dayHeaders, 'Total (km)'];

  // Collecte ordonnée (évite l'ordre non-déterministe des callbacks concurrents)
  type DailyRow = { vehicle: Vehicle; distByDate: Map<string, number>; total: number };
  const collected: DailyRow[] = [];

  await runWithConcurrency(
    selected.map((v) => async () => {
      const daily = await vehiclesApi
        .getDailyRange(v.id, dates[0], dates[dates.length - 1])
        .catch(() => [] as { date: string; tripsCount: number; totalDistance: number }[]);
      const distByDate = new Map(daily.map((d) => [d.date, d.totalDistance]));
      const total = daily.reduce((s, d) => s + d.totalDistance, 0);
      collected.push({ vehicle: v, distByDate, total });
    })
  );

  // Trier par nom d'engin (ordre stable)
  collected.sort((a, b) => a.vehicle.name.localeCompare(b.vehicle.name));

  // Agréger les totaux par jour après collecte complète
  const dailyTotals = dates.map((d) => collected.reduce((s, r) => s + (r.distByDate.get(d) ?? 0), 0));
  const grandTotal = collected.reduce((s, r) => s + r.total, 0);
  const activeVehicles = collected.filter((r) => r.total > 0).length;
  const activeDays = dailyTotals.filter((t) => t > 0).length;
  const avgPerActiveDay = activeDays ? grandTotal / activeDays : 0;

  const vehicleRows = collected.map((r) => [
    r.vehicle.name,
    r.vehicle.plate,
    ...dates.map((d) => {
      const dist = r.distByDate.get(d) ?? 0;
      return dist > 0 ? `${fmtNum(Math.round(dist))}` : '—';
    }),
    r.total > 0 ? `${fmtNum(Math.round(r.total))}` : '—',
  ]);

  const totalRow = [
    'TOTAL',
    '—',
    ...dailyTotals.map((t) => (t > 0 ? `${fmtNum(Math.round(t))}` : '—')),
    `${fmtNum(Math.round(grandTotal))}`,
  ];

  return {
    title: 'Distance quotidienne',
    kpis: [
      { label: 'Distance totale', value: `${fmtNum(Math.round(grandTotal))} km`, color: '#3B82F6' },
      { label: 'Moy./jour actif', value: `${fmtNum(Math.round(avgPerActiveDay))} km`, color: '#22C55E' },
      { label: 'Jours actifs', value: `${activeDays} / ${dates.length}`, color: '#F59E0B' },
      { label: 'Engins actifs', value: `${activeVehicles} / ${selected.length}`, color: '#8B5CF6' },
    ],
    columns,
    rows: [...vehicleRows, totalRow],
    chart: {
      type: 'bar',
      title: 'Distance totale par jour (km)',
      items: dates
        .map((d, i) => ({
          label: `${String(new Date(d + 'T12:00:00').getDate()).padStart(2, '0')}`,
          value: Math.round(dailyTotals[i]),
          color: '#3B82F6',
        }))
        .filter((_, i) => dailyTotals[i] > 0),
    },
    note: selected.length >= 20 ? 'Limité à 20 engins. Sélectionnez des engins spécifiques pour affiner.' : undefined,
  };
}

// ── Rapport IDLE ───────────────────────────────────────────────────────────────

export function genActivityIdle(vehicles: Vehicle[], f: ReportFilters): ReportResult {
  const all = filterVehicles(vehicles, f);
  const list = all
    .filter((v) => v.status === 'idle')
    .sort((a, b) => new Date(a.lastUpdate ?? 0).getTime() - new Date(b.lastUpdate ?? 0).getTime());
  const pct = all.length ? `${Math.round((list.length / all.length) * 100)}%` : '—';

  return {
    title: 'Engins au ralenti',
    kpis: [
      { label: 'Ralenti', value: String(list.length), color: '#F97316' },
      { label: 'Sur flotte', value: String(all.length), color: '#3B82F6' },
      { label: '% flotte', value: pct, color: '#F59E0B' },
      {
        label: 'Clients',
        value: String(new Set(list.map((v) => v.clientName).filter(Boolean)).size),
        color: '#8B5CF6',
      },
    ],
    columns: ['Engin', 'Plaque', 'Depuis (ralenti)', 'Vitesse', 'Odomètre', 'Carburant', 'Client', 'Conducteur'],
    rows: list.map((v) => [
      v.name,
      v.plate,
      fmtSince(v.lastUpdate),
      v.speed != null ? `${v.speed} km/h` : '—',
      v.odometer ? `${fmtNum(v.odometer)} km` : '—',
      v.fuel != null ? `${v.fuel}%` : v.fuelLevel != null ? `${v.fuelLevel}%` : '—',
      v.clientName ?? '—',
      v.driver?.name ?? v.driverName ?? '—',
    ]),
    note: 'Statuts temps réel. Tri : plus longtemps au ralenti en premier.',
  };
}

// ── Rapport STOPPED ────────────────────────────────────────────────────────────

export function genActivityStopped(vehicles: Vehicle[], f: ReportFilters): ReportResult {
  const all = filterVehicles(vehicles, f);
  const list = all
    .filter((v) => v.status === 'stopped')
    .sort((a, b) => new Date(a.lastUpdate ?? 0).getTime() - new Date(b.lastUpdate ?? 0).getTime());
  const pct = all.length ? `${Math.round((list.length / all.length) * 100)}%` : '—';

  return {
    title: "Engins à l'arrêt",
    kpis: [
      { label: "À l'arrêt", value: String(list.length), color: '#EF4444' },
      { label: 'Sur flotte', value: String(all.length), color: '#3B82F6' },
      { label: '% flotte', value: pct, color: '#F97316' },
      {
        label: 'Clients',
        value: String(new Set(list.map((v) => v.clientName).filter(Boolean)).size),
        color: '#8B5CF6',
      },
    ],
    columns: ['Engin', 'Plaque', 'Depuis (arrêt)', 'Odomètre', 'Carburant', 'Client', 'Conducteur'],
    rows: list.map((v) => [
      v.name,
      v.plate,
      fmtSince(v.lastUpdate),
      v.odometer ? `${fmtNum(v.odometer)} km` : '—',
      v.fuel != null ? `${v.fuel}%` : v.fuelLevel != null ? `${v.fuelLevel}%` : '—',
      v.clientName ?? '—',
      v.driver?.name ?? v.driverName ?? '—',
    ]),
    note: "Statuts temps réel. Tri : plus longtemps à l'arrêt en premier.",
  };
}

// ── Rapport OFFLINE ────────────────────────────────────────────────────────────

export function genActivityOffline(vehicles: Vehicle[], f: ReportFilters): ReportResult {
  const all = filterVehicles(vehicles, f);
  const list = all
    .filter((v) => v.status === 'offline')
    .sort((a, b) => new Date(a.lastUpdate ?? 0).getTime() - new Date(b.lastUpdate ?? 0).getTime());
  const pct = all.length ? `${Math.round((list.length / all.length) * 100)}%` : '—';

  return {
    title: 'Engins hors ligne',
    kpis: [
      { label: 'Hors ligne', value: String(list.length), color: '#6B7280' },
      { label: 'Sur flotte', value: String(all.length), color: '#3B82F6' },
      { label: '% flotte', value: pct, color: '#EF4444' },
      {
        label: 'Clients impactés',
        value: String(new Set(list.map((v) => v.clientName).filter(Boolean)).size),
        color: '#F59E0B',
      },
    ],
    columns: ['Engin', 'Plaque', 'Hors ligne depuis', 'Dernière connexion', 'Odomètre', 'Client', 'Conducteur'],
    rows: list.map((v) => [
      v.name,
      v.plate,
      fmtSince(v.lastUpdate),
      fmtDate(v.lastUpdate),
      v.odometer ? `${fmtNum(v.odometer)} km` : '—',
      v.clientName ?? '—',
      v.driver?.name ?? v.driverName ?? '—',
    ]),
    note: 'Statuts temps réel. Tri : hors ligne depuis le plus longtemps en premier.',
  };
}

// ── Dispatcher Module 1 ────────────────────────────────────────────────────────

export async function generateActivityReport(
  subId: string,
  vehicles: Vehicle[],
  f: ReportFilters
): Promise<ReportResult> {
  switch (subId) {
    case 'synthese':
      return genActivitySynthese(vehicles, f);
    case 'general':
      return genActivityGeneral(vehicles, f);
    case 'trajets':
      return genActivityTrajets(vehicles, f);
    case 'kilometrage':
      return genActivityKilometrage(vehicles, f);
    case 'daily':
      return genActivityDaily(vehicles, f);
    case 'idle':
      return genActivityIdle(vehicles, f);
    case 'stopped':
      return genActivityStopped(vehicles, f);
    case 'offline':
      return genActivityOffline(vehicles, f);
    default:
      throw new Error(`Sous-rapport inconnu : ${subId}`);
  }
}
